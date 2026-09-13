import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { floorCollection, floorDoc } from "./floor-scope";

export const CATEGORY_TO_PREFIX = {
  "KALUNG": "KA",
  "LIONTIN": "LA",
  "ANTING": "AN",
  "CINCIN": "CA",
  "GELANG": "GA",
  "GIWANG": "SA",
  "HALA & SDW": "HL",
};

/**
 * Mendeteksi jenis/kategori barang berdasarkan prefix barcode dan konfigurasi cards dinamis
 */
export function detectCategoryByPrefix(barcode, cards = []) {
  const clean = String(barcode || "").trim().toUpperCase();
  if (!clean) return null;

  // Ekstrak prefix 2 huruf dan 1 huruf
  const lettersOnly = clean.replace(/[^A-Z]/g, "");
  const p2 = lettersOnly.substring(0, 2);
  const p1 = lettersOnly.substring(0, 1);

  // 1. Cek terhadap konfigurasi cards dinamis dari settings
  if (Array.isArray(cards) && cards.length > 0) {
    // Prioritaskan kecocokan prefix 2 huruf
    if (p2) {
      const match2 = cards.find(
        (c) => Array.isArray(c.prefixes) && c.prefixes.includes(p2)
      );
      if (match2) {
        return { categoryId: match2.id, label: match2.label || match2.id, matchedPrefix: p2 };
      }
    }
    // Fallback ke kecocokan prefix 1 huruf
    if (p1) {
      const match1 = cards.find(
        (c) => Array.isArray(c.prefixes) && c.prefixes.includes(p1)
      );
      if (match1) {
        return { categoryId: match1.id, label: match1.label || match1.id, matchedPrefix: p1 };
      }
    }
  }

  // 2. Fallback aturan standar perhiasan jika cards belum diset
  if (p2 === "HL" || p1 === "Z" || p1 === "V") {
    return { categoryId: "HALA & SDW", label: "Hala & SDW", matchedPrefix: p2 || p1 };
  }
  if (p2 === "KL") {
    return { categoryId: "KENDARI & EMAS BALI", label: "Kendari & Emas Bali", matchedPrefix: "KL" };
  }
  if (p2 === "BL" || p1 === "B") {
    return { categoryId: "BERLIAN", label: "Berlian", matchedPrefix: p2 || p1 };
  }
  if (p1 === "C") return { categoryId: "CINCIN", label: "Cincin", matchedPrefix: p2 || "C" };
  if (p1 === "K") return { categoryId: "KALUNG", label: "Kalung", matchedPrefix: p2 || "K" };
  if (p1 === "L") return { categoryId: "LIONTIN", label: "Liontin", matchedPrefix: p2 || "L" };
  if (p1 === "A") return { categoryId: "ANTING", label: "Anting", matchedPrefix: p2 || "A" };
  if (p1 === "G") return { categoryId: "GELANG", label: "Gelang", matchedPrefix: p2 || "G" };
  if (p1 === "S") return { categoryId: "GIWANG", label: "Giwang", matchedPrefix: p2 || "S" };

  return null;
}

/**
 * Memvalidasi apakah sekumpulan barcode cocok dengan kategori klip target
 */
export function validateBarcodesForCategory(barcodes = [], targetCategoryId = "", cards = []) {
  const target = String(targetCategoryId || "").trim().toUpperCase();
  const invalidItems = [];

  for (const rawBc of barcodes) {
    const bc = String(rawBc || "").trim().toUpperCase();
    if (!bc) continue;
    const detected = detectCategoryByPrefix(bc, cards);
    if (detected && detected.categoryId && detected.categoryId !== target) {
      invalidItems.push({
        barcode: bc,
        detectedCategory: detected.label || detected.categoryId,
        expectedCategory: target,
        prefix: detected.matchedPrefix,
      });
    }
  }

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
  };
}

/**
 * Gets prefix for a category card ID/label dynamically
 */
export function getCategoryPrefix(cardId) {
  const id = String(cardId || "").toUpperCase().trim();
  if (CATEGORY_TO_PREFIX[id]) return CATEGORY_TO_PREFIX[id];
  
  if (id.includes("KALUNG")) return "KA";
  if (id.includes("LIONTIN")) return "LA";
  if (id.includes("ANTING")) return "AN";
  if (id.includes("CINCIN")) return "CA";
  if (id.includes("GELANG")) return "GA";
  if (id.includes("GIWANG")) return "SA";
  if (id.includes("HALA")) return "HL";

  // Fallback: take first 2 alphanumeric characters
  const clean = id.replace(/[^A-Z0-9]/g, "");
  if (clean.length >= 2) {
    return clean.substring(0, 2);
  }
  return id.substring(0, 2) || "XX";
}

/**
 * Subscribes to real-time updates of clip codes under a specific floor
 */
export function subscribeClips(floorId, onUpdate, onError) {
  const colRef = floorCollection(db, "clipCodes", floorId);
  return onSnapshot(
    colRef,
    (snap) => {
      const clips = [];
      snap.forEach((doc) => {
        clips.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      // Sort alphabetically by code
      clips.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
      onUpdate(clips);
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    }
  );
}

/**
 * Creates a new clip code document in Firestore
 */
export async function createClip(floorId, { code, type, category, barcodes = [] }) {
  const colRef = floorCollection(db, "clipCodes", floorId);
  
  // Enforce uniqueness (case-insensitive check)
  const q = query(colRef, where("code", "==", code));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`Klip dengan kode "${code}" sudah terdaftar.`);
  }

  const docRef = await addDoc(colRef, {
    code,
    type,
    category,
    barcodes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing clip code document in Firestore
 */
export async function updateClip(floorId, clipId, { code, type, category, barcodes }) {
  const colRef = floorCollection(db, "clipCodes", floorId);
  const docRef = floorDoc(db, "clipCodes", clipId, floorId);

  if (code) {
    // Enforce uniqueness of new code
    const q = query(colRef, where("code", "==", code));
    const snap = await getDocs(q);
    const existing = snap.docs.find((d) => d.id !== clipId);
    if (existing) {
      throw new Error(`Klip dengan kode "${code}" sudah terdaftar.`);
    }
  }

  const updateData = {};
  if (code !== undefined) updateData.code = code;
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (barcodes !== undefined) updateData.barcodes = barcodes;
  updateData.updatedAt = serverTimestamp();

  await updateDoc(docRef, updateData);
}

/**
 * Deletes a clip code document from Firestore
 */
export async function deleteClip(floorId, clipId) {
  const docRef = floorDoc(db, "clipCodes", clipId, floorId);
  await deleteDoc(docRef);
}
