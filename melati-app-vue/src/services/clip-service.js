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
