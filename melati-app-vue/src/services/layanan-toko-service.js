import { getDoc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/config/firebase";
import { floorDoc, scopeStoragePath } from "@/services/floor-scope";
import { getActiveFloor } from "@/config/floor-config";
import { DEFAULT_LAYANAN_TOKO } from "@/config/toko-defaults";

function getLayananDoc(floorId = "") {
  const activeFloor = floorId || getActiveFloor();
  if (!activeFloor) {
    throw new Error("Floor tidak aktif. Gagal memuat layanan toko.");
  }
  return floorDoc(db, "settings", "layananToko", activeFloor);
}

export async function ensureLayananToko(floorId = "") {
  const docRef = getLayananDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...DEFAULT_LAYANAN_TOKO,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchLayananToko(floorId = "") {
  await ensureLayananToko(floorId);
  const snap = await getDoc(getLayananDoc(floorId));
  return snap.exists() ? snap.data() : { ...DEFAULT_LAYANAN_TOKO };
}

export async function saveLayananToko(payload, updatedBy = "System", floorId = "") {
  const docRef = getLayananDoc(floorId);
  const now = new Date().toISOString();
  await setDoc(docRef, {
    ongkosServis: payload.ongkosServis || [],
    barangBisaServis: payload.barangBisaServis || [],
    barangTidakBisaServis: payload.barangTidakBisaServis || [],
    hargaAksesoris: payload.hargaAksesoris || [],
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

export async function uploadLayananImage(file, category, onProgress, floorId = "") {
  const cleanName = String(file.name || "image.jpg")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}_${cleanName}`;
  const path = scopeStoragePath(`layanan/${category}/${uniqueName}`, floorId);
  const fileRef = storageRef(storage, path);

  const task = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

export async function deleteLayananImage(path) {
  if (!path) return;
  try {
    const fileRef = storageRef(storage, path);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Gagal menghapus gambar dari storage:", error);
  }
}
