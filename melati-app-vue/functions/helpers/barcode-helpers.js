import { HttpsError } from "firebase-functions/v2/https";
import { admin } from "../config.js";
import { toWitaParts, formatYmd } from "./date-helpers.js";

export const PREFIX_TO_CATEGORY = {
  C: "CINCIN",
  K: "KALUNG",
  L: "LIONTIN",
  A: "ANTING",
  G: "GELANG",
  S: "GIWANG",
  Z: "HALA & SDW",
  V: "HALA & SDW",
  B: "BERLIAN",
};

export function parseBarcodeCategoryAndType(code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const prefix2 = cleanCode.slice(0, 2);
  const prefix = cleanCode.charAt(0);
  
  let mainCat = "CINCIN";
  if (prefix2 === "HL") {
    mainCat = "HALA & SDW";
  } else if (prefix2 === "KL") {
    mainCat = "KENDARI & EMAS BALI";
  } else if (prefix2 === "BL") {
    mainCat = "BERLIAN";
  } else {
    mainCat = PREFIX_TO_CATEGORY[prefix] || "CINCIN";
  }
  
  let subType = null;
  
  // Generic dynamic subtype parser based on code structure (e.g. TE-CA-01 -> CA)
  if (cleanCode.includes("-")) {
    const parts = cleanCode.split("-");
    if (parts.length >= 3) {
      subType = parts[parts.length - 2];
    }
  }

  // Fallback to legacy checks if subtype is not resolved dynamically
  if (!subType) {
    if (mainCat === "KALUNG" || mainCat === "LIONTIN") {
      const lower = cleanCode.toLowerCase();
      if (lower.includes("hijau")) subType = "HIJAU";
      else if (lower.includes("biru")) subType = "BIRU";
      else if (lower.includes("pink")) subType = "PINK";
      else if (lower.includes("kuning")) subType = "KUNING";
      else subType = "PUTIH";
    } else if (mainCat === "HALA & SDW" || mainCat === "KENDARI & EMAS BALI" || mainCat === "BERLIAN") {
      const lower = cleanCode.toLowerCase();
      if (lower.includes("-ka-") || lower.includes("ka")) subType = "KA";
      else if (lower.includes("-la-") || lower.includes("la")) subType = "LA";
      else if (lower.includes("-an-") || lower.includes("an")) subType = "AN";
      else if (lower.includes("-ca-") || lower.includes("ca")) subType = "CA";
      else if (lower.includes("-sa-") || lower.includes("sa")) subType = "SA";
      else if (lower.includes("-ga-") || lower.includes("ga")) subType = "GA";
      else subType = "KA";
    }
  }
  
  return { mainCat, subType };
}

export async function executeMutationLogic(t, dbFloorRef, barcodes, destination, petugas, notes, origin = "any", defaultDetailType = "", defaultCategory = "", allowCategoryOverride = false, bypassLockCheck = false, logCollection = "") {
  const barcodeIds = barcodes.map(b => (typeof b === 'string' ? b : b.barcode).trim().toUpperCase());
  const barcodeRefs = barcodeIds.map(id => dbFloorRef.collection("barcodes").doc(id));
  
  // Step 1: Read all barcode documents inside the transaction
  const barcodeSnaps = await Promise.all(barcodeRefs.map(ref => t.get(ref)));

  const barcodeDetails = [];
  const targetLocations = new Set([destination]);

  // 1. Validation and origin resolution phase
  barcodeSnaps.forEach((snap, idx) => {
    const id = barcodeIds[idx];
    let category, detailType, resolvedOrigin, exists;
    const originalItem = barcodes[idx];
    const inputDetailType = typeof originalItem === 'object' ? originalItem.detailType : null;
    const inputCategory = typeof originalItem === 'object' ? originalItem.category : null;
    
    let oldCategory = null;
    let oldDetailType = null;
    
    const parsed = parseBarcodeCategoryAndType(id);
    
    if (snap.exists) {
      exists = true;
      const data = snap.data();
      oldCategory = data.category;
      oldDetailType = data.detailType;
      resolvedOrigin = data.location || destination;
      
      category = allowCategoryOverride ? (inputCategory || defaultCategory || data.category) : (data.category || defaultCategory || parsed.mainCat);
      detailType = allowCategoryOverride ? (inputDetailType || defaultDetailType || data.detailType) : (data.detailType || defaultDetailType || parsed.subType);
      
      if (data.in_mutasi && !bypassLockCheck) {
        throw new HttpsError("failed-precondition", `Barcode ${id} terkunci (sudah laku/mutasi).`);
      }
    } else {
      exists = false;
      category = inputCategory || defaultCategory || parsed.mainCat;
      detailType = inputDetailType || defaultDetailType || parsed.subType;
      resolvedOrigin = destination; // Base registration
      oldCategory = category;
      oldDetailType = detailType;
    }
    
    targetLocations.add(resolvedOrigin);
    barcodeDetails.push({ 
      id, 
      category, 
      detailType, 
      resolvedOrigin, 
      exists,
      oldCategory,
      oldDetailType
    });
  });

  // Step 2: Read all required stocks documents inside the transaction
  const stockLocationList = Array.from(targetLocations);
  const stockRefs = stockLocationList.map(loc => dbFloorRef.collection("stocks").doc(loc));
  const stockSnaps = await Promise.all(stockRefs.map(ref => t.get(ref)));

  const stockDataMap = {};
  stockLocationList.forEach((loc, idx) => {
    stockDataMap[loc] = stockSnaps[idx].exists ? stockSnaps[idx].data() : {};
  });

  // Step 2b: Read all clipCodes inside the transaction to check for auto-cleanup
  const clipDocsToUpdate = [];
  const isPostingDest = ["posting", "belum-posting", "belum_posting"].includes(destination);
  if (!isPostingDest) {
    const clipCodesRef = dbFloorRef.collection("clipCodes");
    const clipCodesSnap = await t.get(clipCodesRef);
    clipCodesSnap.forEach((clipSnap) => {
      const clipData = clipSnap.data();
      const clipBarcodes = clipData.barcodes || [];
      const hasMovedBarcodes = clipBarcodes.some(bc => barcodeIds.includes(bc));
      
      if (hasMovedBarcodes) {
        const cleanBarcodes = clipBarcodes.filter(bc => !barcodeIds.includes(bc));
        clipDocsToUpdate.push({
          ref: clipSnap.ref,
          barcodes: cleanBarcodes
        });
      }
    });
  }

  // Step 3: Accumulate stock changes
  const changes = {};
  const addChange = (loc, cat, type, diff) => {
    if (!changes[loc]) changes[loc] = {};
    if (!changes[loc][cat]) changes[loc][cat] = { quantity: 0, details: {} };
    changes[loc][cat].quantity += diff;
    if (type) {
      if (!changes[loc][cat].details[type]) changes[loc][cat].details[type] = 0;
      changes[loc][cat].details[type] += diff;
    }
  };

  barcodeDetails.forEach((info) => {
    if (info.resolvedOrigin !== destination || info.oldCategory !== info.category || info.oldDetailType !== info.detailType) {
      addChange(info.resolvedOrigin, info.oldCategory, info.oldDetailType, -1);
      addChange(destination, info.category, info.detailType, 1);
    } else if (!info.exists) {
      addChange(destination, info.category, info.detailType, 1);
    }
  });

  // Step 4: Perform all database writes
  // Update barcode documents
  barcodeDetails.forEach((info) => {
    const ref = dbFloorRef.collection("barcodes").doc(info.id);
    const updateData = {
      barcode: info.id,
      category: info.category,
      detailType: info.detailType || null,
      location: destination,
      in_display: destination === "barang-display",
      in_mutasi: ["mutasi", "laku"].includes(destination),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    if (!info.exists) {
      updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    t.set(ref, updateData, { merge: true });

    // Ensure we delete it from history since it is now active again
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(info.id);
    t.delete(historyRef);
  });

  // Update clip codes (auto-cleanup moved barcodes)
  clipDocsToUpdate.forEach((item) => {
    t.update(item.ref, {
      barcodes: item.barcodes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Write single history log document for the transaction
  const isSync = (String(petugas || "") + " " + String(notes || "")).toLowerCase().includes("sync") 
    || (String(petugas || "") + " " + String(notes || "")).toLowerCase().includes("desktop");
  const targetCollection = logCollection || (isSync ? "desktopSyncLogs" : "barcodeMutationLogs");
  const logRef = dbFloorRef.collection(targetCollection).doc();
  const logData = {
    id: logRef.id,
    barcodeIds: barcodeDetails.map(info => info.id),
    barcodes: barcodeDetails.map(info => ({
      barcode: info.id,
      category: info.category,
      detailType: info.detailType || null,
      origin: info.exists ? info.resolvedOrigin : "sistem_baru",
    })),
    destination,
    pemindah: petugas,
    status: "approved",
    notes: notes || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  // For compatibility with single barcode logs
  if (barcodeDetails.length === 1) {
    logData.barcode = barcodeDetails[0].id;
    logData.category = barcodeDetails[0].category;
    logData.detailType = barcodeDetails[0].detailType || null;
    logData.origin = barcodeDetails[0].exists ? barcodeDetails[0].resolvedOrigin : "sistem_baru";
  } else {
    logData.barcode = `GABUNGAN (${barcodeDetails.length} BARANG)`;
    logData.category = barcodeDetails[0].category; // Transactions are always per-category

    const uniqueTypes = [...new Set(barcodeDetails.map(info => info.detailType).filter(Boolean))];
    logData.detailType = uniqueTypes.length === 1 ? uniqueTypes[0] : null;

    const uniqueOrigins = [...new Set(barcodeDetails.map(info => info.exists ? info.resolvedOrigin : "sistem_baru"))];
    logData.origin = uniqueOrigins.length === 1 ? uniqueOrigins[0] : "MIXED";
  }

  t.set(logRef, logData);

  // Apply aggregated stock changes
  for (const loc of Object.keys(changes)) {
    const data = stockDataMap[loc] || {};
    const locChanges = changes[loc];
    const updatedData = { ...data };
    
    for (const cat of Object.keys(locChanges)) {
      const existing = data[cat] || { quantity: 0, lastUpdated: null, history: [] };
      const currentQty = parseInt(existing.quantity, 10) || 0;
      const diffQty = locChanges[cat].quantity;
      const newQty = Math.max(0, currentQty + diffQty);
      
      const updatedCategory = {
        quantity: newQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(existing.history) ? [...existing.history] : []
      };
      
      if (diffQty !== 0) {
        const relevantBarcodes = barcodeDetails
          .filter(info => 
            (info.category === cat || info.oldCategory === cat) && 
            (info.resolvedOrigin === loc || destination === loc)
          );

        const truncatedBarcodes = relevantBarcodes.slice(0, 10).map(info => ({
          barcode: info.id,
          detailType: info.detailType || info.oldDetailType || ""
        }));

        const historyOrigin = diffQty < 0 ? loc : (relevantBarcodes[0]?.exists ? relevantBarcodes[0].resolvedOrigin : "sistem_baru");
        const historyDest = destination;

        updatedCategory.history.unshift({
          date: new Date().toISOString(),
          action: diffQty > 0 ? "Tambah" : "Kurangi",
          quantity: Math.abs(diffQty),
          oldQuantity: currentQty,
          newQuantity: newQty,
          petugas,
          keterangan: notes || "Mutasi Barcode",
          barcodes: truncatedBarcodes,
          totalBarcodesCount: relevantBarcodes.length,
          origin: historyOrigin,
          destination: historyDest
        });
        if (updatedCategory.history.length > 25) {
          updatedCategory.history = updatedCategory.history.slice(0, 25);
        }
      }
      
      const existingDetails = existing.details || {};
      const updatedDetails = { ...existingDetails };
      const catDetailsChanges = locChanges[cat].details;
      
      for (const type of Object.keys(catDetailsChanges)) {
        const currentTypeQty = parseInt(existingDetails[type], 10) || 0;
        const diffTypeQty = catDetailsChanges[type];
        updatedDetails[type] = Math.max(0, currentTypeQty + diffTypeQty);
      }
      
      if (Object.keys(updatedDetails).length > 0) {
        updatedCategory.details = updatedDetails;
      }
      
      updatedData[cat] = updatedCategory;
    }
    
    const stockRef = dbFloorRef.collection("stocks").doc(loc);
    t.set(stockRef, updatedData, { merge: true });
  }

  // Write dailyStockLogs
  const dateStr = formatYmd(toWitaParts(new Date()));
  const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
  const dailyLogs = [];
  
  for (const loc of Object.keys(changes)) {
    const locChanges = changes[loc];
    const data = stockDataMap[loc] || {};
    for (const cat of Object.keys(locChanges)) {
      const diffQty = locChanges[cat].quantity;
      if (diffQty !== 0) {
        const existing = data[cat] || { quantity: 0 };
        const beforeQty = parseInt(existing.quantity, 10) || 0;
        const afterQty = Math.max(0, beforeQty + diffQty);
        
        dailyLogs.push({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: loc,
          action: diffQty > 0 ? "tambah" : "kurangi",
          before: beforeQty,
          after: afterQty,
          quantity: Math.abs(diffQty),
          userName: petugas,
          keterangan: notes || "Mutasi Barcode"
        });
      }
    }
  }

  if (dailyLogs.length > 0) {
    t.set(dailyLogRef, {
      date: dateStr,
      logs: admin.firestore.FieldValue.arrayUnion(...dailyLogs)
    }, { merge: true });
  }
}
