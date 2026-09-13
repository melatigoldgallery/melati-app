import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export const DEFAULT_FEATURE_UPDATES = Object.freeze([
  {
    id: "update-1726243200000-1",
    date: "2026-09-13",
    title: "Sinkronisasi Otomatis Penjualan Manual",
    description: "Sinkronisasi setiap penjualan manual (mutasi staff / kode bermasalah) otomatis masuk ke lokasi manual jadi jika ada manual tidak perlu memindahkan barcode (sudah otomatis). Ketika sudah dimutasi divisi input tetap memindahkan barcode ke sudah mutasi di halaman mutasi kode.",
    category: "Mutasi Barcode",
    author: "System",
  },
  {
    id: "update-1726243200000-2",
    date: "2026-09-13",
    title: "Audio Feedback Perpindahan Data Barcode",
    description: "Menambahkan fitur suara berhasil / gagal update perpindahan data barcode.",
    category: "Audio & UX",
    author: "System",
  },
  {
    id: "update-1725667200000",
    date: "2026-09-07",
    title: "Display Nama Sales Tidak Scan Barcode",
    description: "Menambahkan fitur display nama sales tidak scan barcode.",
    category: "Monitoring Sales",
    author: "System",
  },
]);

function getFeatureUpdatesDoc() {
  return doc(db, "settings", "featureUpdates");
}

export function sortFeatureUpdatesDescending(items = []) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    // If same date, sort by ID or creation order
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

export function normalizeFeatureUpdates(raw = {}) {
  const list = Array.isArray(raw.updates) && raw.updates.length > 0
    ? raw.updates.map((item, idx) => ({
        id: item.id || `update-${Date.now()}-${idx}`,
        date: String(item.date || new Date().toISOString().split("T")[0]).trim(),
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        category: String(item.category || "General").trim(),
        author: String(item.author || "System").trim(),
        createdAt: item.createdAt || new Date().toISOString(),
      }))
    : [...DEFAULT_FEATURE_UPDATES];

  return sortFeatureUpdatesDescending(list);
}

export async function fetchFeatureUpdates() {
  try {
    const snap = await getDoc(getFeatureUpdatesDoc());
    if (snap.exists()) {
      return normalizeFeatureUpdates(snap.data());
    }
    // If not exists yet, initialize with default
    await saveFeatureUpdates(DEFAULT_FEATURE_UPDATES);
    return sortFeatureUpdatesDescending(DEFAULT_FEATURE_UPDATES);
  } catch (error) {
    console.error("Gagal mengambil riwayat update fitur:", error);
    return sortFeatureUpdatesDescending(DEFAULT_FEATURE_UPDATES);
  }
}

export function subscribeFeatureUpdates(callback, errorCallback) {
  return onSnapshot(
    getFeatureUpdatesDoc(),
    (snap) => {
      if (snap.exists()) {
        callback(normalizeFeatureUpdates(snap.data()));
      } else {
        callback(sortFeatureUpdatesDescending(DEFAULT_FEATURE_UPDATES));
      }
    },
    (err) => {
      console.error("Listener error riwayat update fitur:", err);
      if (errorCallback) errorCallback(err);
    }
  );
}

export async function saveFeatureUpdates(updatesList = []) {
  const cleanList = sortFeatureUpdatesDescending(
    updatesList.map((item, idx) => ({
      id: item.id || `update-${Date.now()}-${idx}`,
      date: String(item.date || new Date().toISOString().split("T")[0]).trim(),
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
      category: String(item.category || "General").trim(),
      author: String(item.author || auth.currentUser?.displayName || auth.currentUser?.email || "Staff").trim(),
      createdAt: item.createdAt || new Date().toISOString(),
    }))
  );

  const payload = {
    updates: cleanList,
    lastUpdated: new Date().toISOString(),
    updatedBy: auth.currentUser?.displayName || auth.currentUser?.email || "User",
  };

  await setDoc(getFeatureUpdatesDoc(), payload, { merge: true });
  return cleanList;
}
