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
  if (snap.exists()) return;

  // Seamless migration: try to read from L2 first because the newest/current data is there
  let initialData = { ...DEFAULT_LAYANAN_TOKO };
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "layananToko");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
    }
  } catch (err) {
    console.warn("Gagal migrasi data layanan dari L2:", err);
  }

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...initialData,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchLayananToko() {
  await ensureLayananToko();
  const snap = await getDoc(getLayananDoc());
  return snap.exists() ? snap.data() : { ...DEFAULT_LAYANAN_TOKO };
}

export async function saveLayananToko(payload, updatedBy = "System") {
  const docRef = getLayananDoc();
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
