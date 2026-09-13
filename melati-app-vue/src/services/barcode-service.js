import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { query, where, getDocs, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import { floorCollection } from "./floor-scope";
import { resolveCategoryFromPrefix } from "./mutasi-service";

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

export function parseBarcodes(text) {
  if (!text) return [];
  return text.split(/[\s\n,;]+/).map(b => b.trim().toUpperCase()).filter(Boolean);
}

export function parseBarcodeDetails(code, data) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const resolved = resolveCategoryFromPrefix(
    cleanCode,
    data?.namaBarang || data?.nama || "",
    data?.jenisPrefix || ""
  );

  return {
    mainCat: resolved.mainCat,
    subType: resolved.detailType,
    namaBarang: data?.namaBarang || data?.nama || "",
    kadar: data?.kadar || "-",
    berat: Number(data?.berat) || 0,
  };
}

export async function checkBarcodesStatus(barcodes, floorId) {
  const callable = httpsCallable(functions, "checkBarcodesStatus");
  const res = await callable({ barcodes, floorId });
  return res.data;
}

async function autoResolveDiscrepancies(floorId, barcodeIds, destination, pemindah) {
  if (!barcodeIds || barcodeIds.length === 0) return;
  try {
    const colRef = floorCollection(db, "barcodeDiscrepancies", floorId);
    const batch = writeBatch(db);
    let hasUpdates = false;

    for (const barcode of barcodeIds) {
      const q = query(
        colRef,
        where("barcode", "==", barcode),
        where("resolved", "==", false)
      );
      const snaps = await getDocs(q);
      snaps.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          resolved: true,
          resolvedAt: Timestamp.now(),
          resolvedBy: pemindah || "System (Auto)",
          resolutionNote: "sudah dipindah"
        });
        hasUpdates = true;
      });
    }

    if (hasUpdates) {
      await batch.commit();
      console.log(`Auto resolved discrepancy for barcodes: ${barcodeIds.join(", ")}`);
    }
  } catch (e) {
    console.error("Gagal auto-resolve discrepancy:", e);
  }
}

export async function executeBarcodeMutation({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride }) {
  const callable = httpsCallable(functions, "executeBarcodeMutation");
  const res = await callable({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride });
  
  if (res.data?.success && ["barang-display", "laku", "mutasi"].includes(destination)) {
    const barcodeIds = barcodes.map(b => typeof b === "string" ? b : b.barcode).filter(Boolean);
    autoResolveDiscrepancies(floorId, barcodeIds, destination, pemindah).catch(console.error);
  }
  
  return res.data;
}

export async function submitBarcodeMoveRequest({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride }) {
  const callable = httpsCallable(functions, "submitBarcodeMoveRequest");
  const res = await callable({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride });
  return res.data;
}

export async function processBarcodeMoveRequest({ requestId, status, processor, floorId }) {
  const callable = httpsCallable(functions, "processBarcodeMoveRequest");
  const res = await callable({ requestId, status, processor, floorId });
  return res.data;
}

export async function deleteSingleBarcode({ barcodeId, floorId }) {
  const callable = httpsCallable(functions, "deleteSingleBarcode");
  const res = await callable({ barcodeId, floorId });
  return res.data;
}

export async function revertSingleBarcode({ barcodeId, floorId }) {
  const callable = httpsCallable(functions, "revertSingleBarcode");
  const res = await callable({ barcodeId, floorId });
  return res.data;
}

export async function revertMutationLog({ logId, floorId }) {
  const callable = httpsCallable(functions, "revertMutationLog");
  const res = await callable({ logId, floorId });
  return res.data;
}

// Force reload cache