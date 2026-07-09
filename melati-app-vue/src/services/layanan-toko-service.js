import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "@/config/firebase";
import { DEFAULT_LAYANAN_TOKO } from "@/config/toko-defaults";

function getLayananDoc() {
  return doc(db, "settings", "layananToko");
}

export async function ensureLayananToko() {
  const docRef = getLayananDoc();
  const snap = await getDoc(docRef);

  // If global document exists and was already migrated/initialized, return it immediately
  if (snap.exists() && snap.data().migratedFromL2) {
    return snap.data();
  }

  // Seamless migration: try to read from L2 first to migrate it to global
  let initialData = { ...DEFAULT_LAYANAN_TOKO };
  let migrated = false;
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "layananToko");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
      migrated = true;
    }
  } catch (err) {
    console.warn("Gagal migrasi data layanan dari L2:", err);
  }

  const now = new Date().toISOString();
  const finalData = {
    ...initialData,
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial/Migration)",
  };

  await setDoc(docRef, finalData);
  if (migrated) {
    console.log("Sukses migrasi data layanan toko dari L2 ke Global");
  }
  return finalData;
}

export async function fetchLayananToko() {
  return await ensureLayananToko();
}

export async function saveLayananToko(payload, updatedBy = "System") {
  const docRef = getLayananDoc();
  const now = new Date().toISOString();
  await setDoc(docRef, {
    ongkosServis: payload.ongkosServis || [],
    barangBisaServis: payload.barangBisaServis || [],
    barangTidakBisaServis: payload.barangTidakBisaServis || [],
    hargaAksesoris: payload.hargaAksesoris || [],
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

export async function uploadLayananImage(file, category, onProgress) {
  const cleanName = String(file.name || "image.jpg")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}_${cleanName}`;
  const path = `layanan/${category}/${uniqueName}`;
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
