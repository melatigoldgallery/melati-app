import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { db, admin, SNAPSHOT_FLOORS } from "../config.js";
import { resolveCallerRole } from "../helpers/auth-helpers.js";
import { toWitaParts, formatYmd } from "../helpers/date-helpers.js";
import { parseBarcodeCategoryAndType, executeMutationLogic } from "../helpers/barcode-helpers.js";

export const checkBarcodesStatus = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!role) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { barcodes = [], floorId = "L1" } = request.data || {};
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      return { results: [] };
    }

    const uniqueBarcodes = [...new Set(barcodes.map(b => (typeof b === 'string' ? b : b.barcode || '').trim().toUpperCase()))].filter(Boolean);
    const barcodeRefs = uniqueBarcodes.map(bc => db.collection("floors").doc(floorId).collection("barcodes").doc(bc));

    const snaps = await db.getAll(...barcodeRefs);

    const missingIndices = [];
    snaps.forEach((snap, idx) => {
      if (!snap.exists) {
        missingIndices.push(idx);
      }
    });

    let historySnaps = [];
    if (missingIndices.length > 0) {
      const historyRefs = missingIndices.map(idx => 
        db.collection("floors").doc(floorId).collection("barcodesHistory").doc(uniqueBarcodes[idx])
      );
      historySnaps = await db.getAll(...historyRefs);
    }

    let historySnapIdx = 0;
    const results = snaps.map((snap, i) => {
      const barcode = uniqueBarcodes[i];
      if (!snap.exists) {
        const histSnap = historySnaps[historySnapIdx++];
        if (histSnap && histSnap.exists) {
          const data = histSnap.data();
          return {
            barcode,
            exists: true,
            isArchived: true,
            location: data.location || "",
            in_display: !!data.in_display,
            in_mutasi: !!data.in_mutasi,
            category: data.category || "",
            detailType: data.detailType || ""
          };
        }
        return { barcode, exists: false, status: "new" };
      }
      const data = snap.data();
      return { 
        barcode, 
        exists: true, 
        isArchived: false,
        location: data.location || "",
        in_display: !!data.in_display,
        in_mutasi: !!data.in_mutasi,
        category: data.category || "",
        detailType: data.detailType || ""
      };
    });

    return { results };
  }
);

export const executeBarcodeMutation = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin", "input", "staff"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Membutuhkan izin petugas atau supervisor.");
    }

    const { 
      floorId = "L1", 
      barcodes = [], 
      origin,
      destination, 
      pemindah, 
      notes = "",
      defaultDetailType = "",
      category = "",
      allowCategoryOverride = false
    } = request.data || {};

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      throw new HttpsError("invalid-argument", "Daftar barcode kosong.");
    }
    if (!destination || !pemindah) {
      throw new HttpsError("invalid-argument", "Lokasi tujuan dan petugas wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);

    await db.runTransaction(async (t) => {
      await executeMutationLogic(t, dbFloorRef, barcodes, destination, pemindah, notes, origin || "any", defaultDetailType, category, allowCategoryOverride);
    });

    return { success: true };
  }
);

export const submitBarcodeMoveRequest = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!role) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { 
      floorId = "L1", 
      barcodes = [], 
      origin = "any",
      destination, 
      pemindah, 
      notes = "",
      defaultDetailType = "",
      category = "",
      allowCategoryOverride = false
    } = request.data || {};

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      throw new HttpsError("invalid-argument", "Daftar barcode kosong.");
    }
    if (!destination || !pemindah) {
      throw new HttpsError("invalid-argument", "Lokasi tujuan dan petugas wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    
    const uniqueBarcodes = [...new Set(barcodes.map(b => (typeof b === 'string' ? b : b.barcode || '').trim().toUpperCase()))].filter(Boolean);
    const barcodeRefs = uniqueBarcodes.map(bc => dbFloorRef.collection("barcodes").doc(bc));

    const snaps = await db.getAll(...barcodeRefs);

    const missingIndices = [];
    snaps.forEach((snap, idx) => {
      if (!snap.exists) {
        missingIndices.push(idx);
      }
    });

    let historySnaps = [];
    if (missingIndices.length > 0) {
      const historyRefs = missingIndices.map(idx => 
        dbFloorRef.collection("barcodesHistory").doc(uniqueBarcodes[idx])
      );
      historySnaps = await db.getAll(...historyRefs);
    }

    let historySnapIdx = 0;
    const finalBarcodes = [];
    
    snaps.forEach((snap, i) => {
      const bc = uniqueBarcodes[i];
      if (snap.exists) {
        const data = snap.data();
        if (data.in_mutasi) {
          throw new HttpsError("failed-precondition", `Barcode ${bc} terkunci (sudah laku/mutasi).`);
        }
        finalBarcodes.push({
          barcode: bc,
          category: allowCategoryOverride ? (category || data.category) : data.category,
          detailType: allowCategoryOverride ? (defaultDetailType || data.detailType || null) : data.detailType,
          origin: data.location || destination
        });
      } else {
        const histSnap = historySnaps[historySnapIdx++];
        if (histSnap && histSnap.exists) {
          const data = histSnap.data();
          finalBarcodes.push({
            barcode: bc,
            category: data.category,
            detailType: data.detailType || null,
            origin: data.location || destination
          });
        } else {
          const parsed = parseBarcodeCategoryAndType(bc);
          finalBarcodes.push({
            barcode: bc,
            category: category || parsed.mainCat,
            detailType: defaultDetailType || parsed.subType || null,
            origin: destination // Base registration
          });
        }
      }
    });

    const resolvedOrigins = [...new Set(finalBarcodes.map(b => b.origin))];
    const requestOrigin = resolvedOrigins.length === 1 ? resolvedOrigins[0] : "any";

    const reqRef = dbFloorRef.collection("barcodeMoveRequests").doc();
    await reqRef.set({
      id: reqRef.id,
      pemindah,
      origin: requestOrigin,
      destination,
      barcodes: finalBarcodes,
      status: "pending",
      notes,
      defaultDetailType,
      allowCategoryOverride,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
      processedBy: ""
    });

    return { success: true, requestId: reqRef.id };
  }
);

export const processBarcodeMoveRequest = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin", "input"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Membutuhkan izin supervisor atau input.");
    }

    const { 
      floorId = "L1", 
      requestId, 
      status, 
      processor 
    } = request.data || {};

    if (!requestId || !["approved", "rejected"].includes(status)) {
      throw new HttpsError("invalid-argument", "Parameter tidak valid.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const reqRef = dbFloorRef.collection("barcodeMoveRequests").doc(requestId);

    await db.runTransaction(async (t) => {
      const reqSnap = await t.get(reqRef);
      if (!reqSnap.exists) {
        throw new HttpsError("not-found", "Request tidak ditemukan.");
      }
      
      const reqData = reqSnap.data();
      if (reqData.status !== "pending") {
        throw new HttpsError("failed-precondition", "Request sudah diproses.");
      }

      if (status === "approved") {
        await executeMutationLogic(
          t, 
          dbFloorRef, 
          reqData.barcodes, 
          reqData.destination, 
          reqData.pemindah, 
          reqData.notes || "Approved via queue", 
          reqData.origin || "any",
          reqData.defaultDetailType || "",
          "",
          reqData.allowCategoryOverride || false
        );
      }

      t.update(reqRef, {
        status,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: processor || "System"
      });
    });

    return { success: true };
  }
);

async function performBarcodeArchiving(floorId, daysThreshold = 30) {
  const dbFloorRef = db.collection("floors").doc(floorId);
  const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  logger.info(`Archiving inactive barcodes for floor ${floorId} older than ${thresholdDate.toISOString()}`);

  const snap = await dbFloorRef.collection("barcodes")
    .where("location", "in", ["laku", "mutasi"])
    .where("lastUpdated", "<", thresholdDate)
    .limit(500)
    .get();

  if (snap.empty) {
    logger.info(`No inactive barcodes to archive for floor ${floorId}.`);
    return 0;
  }

  const batchWriter = db.bulkWriter();
  let count = 0;

  snap.forEach((doc) => {
    const data = doc.data();
    const barcodeId = doc.id;
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(barcodeId);
    
    // Copy to barcodesHistory
    batchWriter.set(historyRef, {
      ...data,
      archivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Delete from active barcodes
    batchWriter.delete(doc.ref);
    count++;
  });

  await batchWriter.close();
  logger.info(`Successfully archived ${count} barcodes for floor ${floorId}.`);
  return count;
}

export const scheduledArchiveInactiveBarcodes = onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM WITA everyday
    timeZone: "Asia/Makassar", // WITA
    region: "asia-southeast2",
    memory: "512MiB",
  },
  async (event) => {
    for (const floorId of SNAPSHOT_FLOORS) {
      try {
        await performBarcodeArchiving(floorId, 30);
      } catch (err) {
        logger.error(`Error archiving barcodes for floor ${floorId}:`, err);
      }
    }
  }
);

export const manualArchiveInactiveBarcodes = onCall(
  { region: "asia-southeast2", memory: "512MiB" },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["admin", "supervisor"].includes(role)) {
      throw new HttpsError("permission-denied", "Hanya admin/supervisor yang dapat menjalankan pembersihan arsip.");
    }

    const floorId = String(request.data?.floorId || "L1").trim().toUpperCase();
    const days = parseInt(request.data?.days, 10);
    const thresholdDays = isNaN(days) ? 30 : days;

    if (!["L1", "L2"].includes(floorId)) {
      throw new HttpsError("invalid-argument", "floorId tidak valid.");
    }

    const count = await performBarcodeArchiving(floorId, thresholdDays);
    return { ok: true, archivedCount: count };
  }
);

export const deleteSingleBarcode = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (role !== "supervisor") {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor.");
    }

    const { barcodeId, floorId = "L1" } = request.data || {};
    if (!barcodeId) {
      throw new HttpsError("invalid-argument", "barcodeId wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const barcodeRef = dbFloorRef.collection("barcodes").doc(barcodeId.trim().toUpperCase());
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(barcodeId.trim().toUpperCase());

    const cleanBarcodeId = barcodeId.trim().toUpperCase();
    const qSingle = dbFloorRef.collection("barcodeMutationLogs").where("barcode", "==", cleanBarcodeId);
    const qBulk = dbFloorRef.collection("barcodeMutationLogs").where("barcodeIds", "array-contains", cleanBarcodeId);

    const [snapSingle, snapBulk] = await Promise.all([qSingle.get(), qBulk.get()]);

    await db.runTransaction(async (t) => {
      const snap = await t.get(barcodeRef);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Barcode tidak ditemukan.");
      }

      const data = snap.data();
      const cat = data.category;
      const loc = data.location;
      const detailType = data.detailType || null;

      // Read stock document
      const stockRef = dbFloorRef.collection("stocks").doc(loc);
      const stockSnap = await t.get(stockRef);
      const stockData = stockSnap.exists ? stockSnap.data() : {};

      const existing = stockData[cat] || { quantity: 0, lastUpdated: null, history: [] };
      const currentQty = parseInt(existing.quantity, 10) || 0;
      const newQty = Math.max(0, currentQty - 1);

      const updatedCategory = {
        quantity: newQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(existing.history) ? [...existing.history] : []
      };

      updatedCategory.history.unshift({
        date: new Date().toISOString(),
        action: "Kurangi",
        quantity: 1,
        oldQuantity: currentQty,
        newQuantity: newQty,
        petugas: "Supervisor",
        keterangan: `Hapus Barcode Satuan: ${barcodeId}`
      });
      if (updatedCategory.history.length > 25) {
        updatedCategory.history = updatedCategory.history.slice(0, 25);
      }

      if (detailType) {
        const existingDetails = existing.details || {};
        const updatedDetails = { ...existingDetails };
        const currentTypeQty = parseInt(existingDetails[detailType], 10) || 0;
        updatedDetails[detailType] = Math.max(0, currentTypeQty - 1);
        updatedCategory.details = updatedDetails;
      }

      const updatedStockData = {
        ...stockData,
        [cat]: updatedCategory
      };

      // Perform writes
      t.set(stockRef, updatedStockData, { merge: true });
      t.delete(barcodeRef);
      t.delete(historyRef);

      // Clean up single mutation logs
      snapSingle.docs.forEach((doc) => {
        t.delete(doc.ref);
      });

      // Clean up bulk mutation logs
      snapBulk.docs.forEach((doc) => {
        const data = doc.data() || {};
        const barcodeIds = Array.isArray(data.barcodeIds) ? data.barcodeIds.filter(id => id !== cleanBarcodeId) : [];
        const barcodes = Array.isArray(data.barcodes) ? data.barcodes.filter(b => b.barcode !== cleanBarcodeId) : [];

        if (barcodeIds.length === 0) {
          t.delete(doc.ref);
        } else {
          const updateData = {
            barcodeIds,
            barcodes,
          };
          if (barcodeIds.length === 1) {
            updateData.barcode = barcodes[0].barcode;
            updateData.category = barcodes[0].category;
            updateData.detailType = barcodes[0].detailType || null;
            updateData.origin = barcodes[0].origin;
          } else {
            updateData.barcode = `GABUNGAN (${barcodeIds.length} BARANG)`;
          }
          t.update(doc.ref, updateData);
        }
      });

      // Write to dailyStockLogs
      const dateStr = formatYmd(toWitaParts(new Date()));
      const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
      t.set(dailyLogRef, {
        date: dateStr,
        logs: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: loc,
          action: "kurangi",
          before: currentQty,
          after: newQty,
          quantity: 1,
          userName: "Supervisor",
          keterangan: `Hapus Barcode Satuan: ${barcodeId}`
        })
      }, { merge: true });
    });

    return { success: true };
  }
);

export const revertSingleBarcode = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor atau Admin.");
    }

    const { barcodeId, floorId = "L1" } = request.data || {};
    if (!barcodeId) {
      throw new HttpsError("invalid-argument", "barcodeId wajib diisi.");
    }

    const cleanBarcodeId = barcodeId.trim().toUpperCase();
    const dbFloorRef = db.collection("floors").doc(floorId);
    
    // Ambil info barcode saat ini terlebih dahulu
    const barcodeRef = dbFloorRef.collection("barcodes").doc(cleanBarcodeId);
    const snapBarcode = await barcodeRef.get();
    if (!snapBarcode.exists) {
      throw new HttpsError("not-found", "Barcode tidak ditemukan.");
    }
    const barcodeData = snapBarcode.data();
    const currentLoc = barcodeData.location;
    const cat = barcodeData.category;
    const detailType = barcodeData.detailType || null;

    // Ambil log mutasi terbaru yang meletakkan barcode di lokasi saat ini
    const qSingle = dbFloorRef.collection("barcodeMutationLogs").where("barcode", "==", cleanBarcodeId).where("destination", "==", currentLoc);
    const qBulk = dbFloorRef.collection("barcodeMutationLogs").where("barcodeIds", "array-contains", cleanBarcodeId).where("destination", "==", currentLoc);
    const [snapSingle, snapBulk] = await Promise.all([qSingle.get(), qBulk.get()]);

    const allLogs = [];
    snapSingle.docs.forEach(d => allLogs.push({ ref: d.ref, data: d.data() }));
    snapBulk.docs.forEach(d => {
      if (!allLogs.some(l => l.ref.id === d.id)) {
        allLogs.push({ ref: d.ref, data: d.data() });
      }
    });

    // Urutkan berdasarkan waktu mutasi terbaru
    allLogs.sort((a, b) => {
      const aTime = a.data.timestamp ? a.data.timestamp.toMillis() : 0;
      const bTime = b.data.timestamp ? b.data.timestamp.toMillis() : 0;
      return bTime - aTime;
    });

    let latestLog = allLogs[0] || null;
    let foundOrigin = null;
    if (latestLog) {
      const bcEntry = Array.isArray(latestLog.data.barcodes) ? latestLog.data.barcodes.find(b => b.barcode === cleanBarcodeId) : null;
      foundOrigin = bcEntry ? bcEntry.origin : (latestLog.data.origin || null);
    }

    const isRevert = foundOrigin && foundOrigin !== currentLoc;
    const petugasName = role === "admin" ? "Admin" : "Supervisor";

    await db.runTransaction(async (t) => {
      // 1. Ambil semua data stok yang diperlukan di awal transaksi (Reads)
      const currentStockRef = dbFloorRef.collection("stocks").doc(currentLoc);
      const originStockRef = isRevert ? dbFloorRef.collection("stocks").doc(foundOrigin) : null;
      
      const reads = [t.get(currentStockRef)];
      if (originStockRef) {
        reads.push(t.get(originStockRef));
      }
      const snaps = await Promise.all(reads);
      const currentStockSnap = snaps[0];
      const originStockSnap = isRevert ? snaps[1] : null;

      const currentStockData = currentStockSnap.exists ? currentStockSnap.data() : {};
      const originStockData = (originStockSnap && originStockSnap.exists) ? originStockSnap.data() : {};

      // 2. Lakukan perhitungan perubahan stok
      // Selalu kurangi stok lokasi saat ini (-1)
      const currentCatData = currentStockData[cat] || { quantity: 0, history: [] };
      const currentQty = parseInt(currentCatData.quantity, 10) || 0;
      const newCurrentQty = Math.max(0, currentQty - 1);
      
      const updatedCurrentCat = {
        quantity: newCurrentQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(currentCatData.history) ? [...currentCatData.history] : []
      };
      
      updatedCurrentCat.history.unshift({
        date: new Date().toISOString(),
        action: "Kurangi",
        quantity: 1,
        oldQuantity: currentQty,
        newQuantity: newCurrentQty,
        petugas: petugasName,
        keterangan: isRevert 
          ? `Batal Pemindahan Barcode ${cleanBarcodeId} kembali ke ${foundOrigin}`
          : `Hapus Barcode Satuan (Batalkan): ${cleanBarcodeId}`
      });
      if (updatedCurrentCat.history.length > 25) updatedCurrentCat.history = updatedCurrentCat.history.slice(0, 25);
      
      if (detailType) {
        const details = currentCatData.details || {};
        const typeQty = parseInt(details[detailType], 10) || 0;
        updatedCurrentCat.details = { ...details, [detailType]: Math.max(0, typeQty - 1) };
      }

      let originQty = 0;
      let newOriginQty = 0;
      let updatedOriginCat = null;

      if (isRevert) {
        // Tambahkan stok lokasi asal (+1)
        const originCatData = originStockData[cat] || { quantity: 0, history: [] };
        originQty = parseInt(originCatData.quantity, 10) || 0;
        newOriginQty = originQty + 1;
        
        updatedOriginCat = {
          quantity: newOriginQty,
          lastUpdated: new Date().toISOString(),
          history: Array.isArray(originCatData.history) ? [...originCatData.history] : []
        };
        
        updatedOriginCat.history.unshift({
          date: new Date().toISOString(),
          action: "Tambah",
          quantity: 1,
          oldQuantity: originQty,
          newQuantity: newOriginQty,
          petugas: petugasName,
          keterangan: `Batal Pemindahan Barcode ${cleanBarcodeId} kembali dari ${currentLoc}`
        });
        if (updatedOriginCat.history.length > 25) updatedOriginCat.history = updatedOriginCat.history.slice(0, 25);
        
        if (detailType) {
          const details = originCatData.details || {};
          const typeQty = parseInt(details[detailType], 10) || 0;
          updatedOriginCat.details = { ...details, [detailType]: typeQty + 1 };
        }
      }

      // 3. Eksekusi semua penulisan database (Writes)
      // Update stok saat ini
      t.set(currentStockRef, { ...currentStockData, [cat]: updatedCurrentCat }, { merge: true });

      if (isRevert) {
        // Update stok lokasi asal
        t.set(originStockRef, { ...originStockData, [cat]: updatedOriginCat }, { merge: true });

        // Kembalikan lokasi barcode ke origin
        t.set(barcodeRef, {
          location: foundOrigin,
          in_display: foundOrigin === "barang-display",
          in_mutasi: ["mutasi", "laku"].includes(foundOrigin),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        // Hapus dokumen barcode dari active list & history (jika ada)
        t.delete(barcodeRef);
        t.delete(dbFloorRef.collection("barcodesHistory").doc(cleanBarcodeId));
      }

      // Bersihkan dokumen log mutasi lama
      if (latestLog) {
        const logData = latestLog.data;
        const barcodeIds = Array.isArray(logData.barcodeIds) ? logData.barcodeIds.filter(id => id !== cleanBarcodeId) : [];
        const barcodes = Array.isArray(logData.barcodes) ? logData.barcodes.filter(b => b.barcode !== cleanBarcodeId) : [];

        if (barcodeIds.length === 0) {
          t.delete(latestLog.ref);
        } else {
          const updateData = { barcodeIds, barcodes };
          if (barcodeIds.length === 1) {
            updateData.barcode = barcodes[0].barcode;
            updateData.category = barcodes[0].category;
            updateData.detailType = barcodes[0].detailType || null;
            updateData.origin = barcodes[0].origin;
          } else {
            updateData.barcode = `GABUNGAN (${barcodeIds.length} BARANG)`;
          }
          t.update(latestLog.ref, updateData);
        }
      }

      // Catat logs harian (dailyStockLogs)
      const dateStr = formatYmd(toWitaParts(new Date()));
      const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
      const dailyLogs = [
        {
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: currentLoc,
          action: "kurangi",
          before: currentQty,
          after: newCurrentQty,
          quantity: 1,
          userName: petugasName,
          keterangan: isRevert 
            ? `Batal Pemindahan Barcode: ${cleanBarcodeId}`
            : `Hapus Barcode Satuan (Batalkan): ${cleanBarcodeId}`
        }
      ];

      if (isRevert) {
        dailyLogs.push({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: foundOrigin,
          action: "tambah",
          before: originQty,
          after: newOriginQty,
          quantity: 1,
          userName: petugasName,
          keterangan: `Batal Pemindahan Barcode: ${cleanBarcodeId}`
        });
      }

      t.set(dailyLogRef, {
        date: dateStr,
        logs: admin.firestore.FieldValue.arrayUnion(...dailyLogs)
      }, { merge: true });
    });

    return { success: true };
  }
);

export const revertMutationLog = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (role !== "supervisor") {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor.");
    }

    const { logId, floorId = "L1" } = request.data || {};
    if (!logId) {
      throw new HttpsError("invalid-argument", "logId wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const logRef = dbFloorRef.collection("barcodeMutationLogs").doc(logId);

    await db.runTransaction(async (t) => {
      const logSnap = await t.get(logRef);
      if (!logSnap.exists) {
        throw new HttpsError("not-found", "Log mutasi tidak ditemukan.");
      }

      const logData = logSnap.data();
      const barcodes = logData.barcodes || [];
      const destination = logData.destination;

      if (barcodes.length === 0) {
        throw new HttpsError("failed-precondition", "Tidak ada barcode di dalam log ini.");
      }

      // Collect target locations for stocks update
      const targetLocations = new Set([destination]);
      barcodes.forEach(b => {
        if (b.origin) targetLocations.add(b.origin);
      });

      const stockLocationList = Array.from(targetLocations);
      const stockRefs = stockLocationList.map(loc => dbFloorRef.collection("stocks").doc(loc));
      const stockSnaps = await Promise.all(stockRefs.map(ref => t.get(ref)));

      const stockDataMap = {};
      stockLocationList.forEach((loc, idx) => {
        stockDataMap[loc] = stockSnaps[idx].exists ? stockSnaps[idx].data() : {};
      });

      // Calculate stock adjustments
      // We are REVERTING, so we do the opposite of the mutation:
      // - Decrement 'destination' by 1 for each barcode
      // - If origin !== destination, increment 'origin' by 1 for each barcode
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

      for (const b of barcodes) {
        const barcodeId = b.barcode.trim().toUpperCase();
        const origin = b.origin || destination;
        const category = b.category;
        const detailType = b.detailType;

        if (origin !== destination) {
          addChange(destination, category, detailType, -1);
          addChange(origin, category, detailType, 1);
          
          // Revert barcode location to origin
          const bcRef = dbFloorRef.collection("barcodes").doc(barcodeId);
          t.set(bcRef, {
            location: origin,
            in_display: origin === "barang-display",
            in_mutasi: ["mutasi", "laku"].includes(origin),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          // It was a new registration, so delete it
          addChange(destination, category, detailType, -1);
          const bcRef = dbFloorRef.collection("barcodes").doc(barcodeId);
          t.delete(bcRef);
        }
      }

      // Apply changes to stocks
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
            updatedCategory.history.unshift({
              date: new Date().toISOString(),
              action: diffQty > 0 ? "Tambah" : "Kurangi",
              quantity: Math.abs(diffQty),
              oldQuantity: currentQty,
              newQuantity: newQty,
              petugas: "Supervisor",
              keterangan: `Pembatalan Sesi Mutasi/Upload (Log ID: ${logId})`
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
              userName: "Supervisor",
              keterangan: `Pembatalan Sesi Mutasi/Upload (Log ID: ${logId})`
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

      // Delete the log document itself
      t.delete(logRef);
    });

    return { success: true };
  }
);
