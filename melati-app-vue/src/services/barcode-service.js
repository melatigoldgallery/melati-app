import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

export const PREFIX_TO_CATEGORY = {
  C: "CINCIN",
  K: "KALUNG",
  L: "LIONTIN",
  A: "ANTING",
  G: "GELANG",
  S: "GIWANG",
  Z: "HALA & SDW",
  V: "HALA & SDW",
};

export function parseBarcodes(text) {
  if (!text) return [];
  return text.split(/[\s\n,;]+/).map(b => b.trim().toUpperCase()).filter(Boolean);
}

export function parseBarcodeDetails(code, data) {
  const prefix = code.charAt(0).toUpperCase();
  let mainCat = PREFIX_TO_CATEGORY[prefix] || null;
  let subType = null;
  let namaBarang = "";
  let kadar = "-";
  let berat = 0;
  
  if (data) {
    namaBarang = data.namaBarang || data.nama || "";
    kadar = data.kadar || "-";
    berat = Number(data.berat) || 0;
    
    const nama = namaBarang.toLowerCase();
    if (!mainCat) {
      if (data.jenisNama) {
        const mapped = String(data.jenisNama).toUpperCase();
        if (mapped.includes("KENDARI")) mainCat = "KENDARI & EMAS BALI";
        else if (mapped.includes("BERLIAN")) mainCat = "BERLIAN";
        else if (mapped.includes("HALA")) mainCat = "HALA & SDW";
        else mainCat = mapped;
      }
    }
    
    if (mainCat === "KALUNG" || mainCat === "LIONTIN") {
      if (nama.includes("hijau")) subType = "HIJAU";
      else if (nama.includes("biru")) subType = "BIRU";
      else if (nama.includes("pink")) subType = "PINK";
      else if (nama.includes("kuning")) subType = "KUNING";
      else subType = "PUTIH";
    } else if (mainCat === "HALA & SDW" || mainCat === "KENDARI & EMAS BALI") {
      const lowerCode = code.toLowerCase();
      if (lowerCode.includes("-ka-") || lowerCode.includes("ka")) subType = "KA";
      else if (lowerCode.includes("-la-") || lowerCode.includes("la")) subType = "LA";
      else if (lowerCode.includes("-an-") || lowerCode.includes("an")) subType = "AN";
      else if (lowerCode.includes("-ca-") || lowerCode.includes("ca")) subType = "CA";
      else if (lowerCode.includes("-sa-") || lowerCode.includes("sa")) subType = "SA";
      else if (lowerCode.includes("-ga-") || lowerCode.includes("ga")) subType = "GA";
      else subType = "KA";
    }
  }
  
  if (!mainCat) {
    mainCat = "CINCIN";
  }
  
  return { mainCat, subType, namaBarang, kadar, berat };
}

export async function checkBarcodesStatus(barcodes, floorId) {
  const callable = httpsCallable(functions, "checkBarcodesStatus");
  const res = await callable({ barcodes, floorId });
  return res.data;
}

export async function executeBarcodeMutation({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride }) {
  const callable = httpsCallable(functions, "executeBarcodeMutation");
  const res = await callable({ barcodes, origin, destination, pemindah, notes, floorId, defaultDetailType, category, allowCategoryOverride });
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