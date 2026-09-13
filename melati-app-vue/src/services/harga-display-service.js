import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export const DEFAULT_HARGA_DISPLAY_SETTINGS = Object.freeze({
  theme: "dark", // 'dark' | 'light'
  title: "HARGA EMAS HARI INI",
  subtitle: "Melati Gold Shop",
  tagline: "Transparan • Harga dan Kualitas terbaik",
  tickerMessages: [
    "MENYEDIAKAN PERHIASAN MODEL TERBARU YANG ELEGAN DAN STYLISH",
    "GARANSI PEMASANGAN BATU UKURAN KECIL SELAMANYA",
    "BARANG MODEL TERTENTU HARGA BERBEDA (BRANDED)",
  ],
  items: [
    {
      id: "1",
      kadar: "18K",
      hasBranded: false,
      hargaNormal: 2125000,
      hargaBranded: 0,
      hargaBuyback: 1868000,
    },
    {
      id: "2",
      kadar: "17K",
      hasBranded: true,
      hargaNormal: 2050000,
      hargaBranded: 2170000,
      hargaBuyback: 1800000,
    },
    {
      id: "3",
      kadar: "16K",
      hasBranded: true,
      hargaNormal: 1850000,
      hargaBranded: 1870000,
      hargaBuyback: 1620000,
    },
    {
      id: "4",
      kadar: "9K",
      hasBranded: false,
      hargaNormal: 1250000,
      hargaBranded: 0,
      hargaBuyback: 1020000,
    },
    {
      id: "5",
      kadar: "8K",
      hasBranded: true,
      hargaNormal: 1150000,
      hargaBranded: 1160000,
      hargaBuyback: 935000,
    },
  ],
  notes: [
    "HARGA BUYBACK DITERIMA DENGAN HARGA TERBAIK selama barang tidak ada kerusakan (putus, patah, penyok, bekas patri, dsb).",
    "Harga buyback sudah termasuk potongan 10% / 15% (kadar muda). Harga dapat berubah sewaktu-waktu mengikuti pergerakan pasar emas dunia.",
  ],
  lastUpdated: null,
  updatedBy: "System",
});

function getHargaDisplayDoc() {
  return doc(db, "settings", "hargaDisplay");
}

export function normalizeHargaDisplaySettings(raw = {}) {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item, index) => ({
        id: item.id || `kadar-${index + 1}`,
        kadar: String(item.kadar || "").trim() || `Kadar ${index + 1}`,
        hasBranded: Boolean(item.hasBranded),
        hargaNormal: Number(item.hargaNormal) || 0,
        hargaBranded: Number(item.hargaBranded) || 0,
        hargaBuyback: Number(item.hargaBuyback) || 0,
      }))
    : DEFAULT_HARGA_DISPLAY_SETTINGS.items;

  let notes = Array.isArray(raw.notes) && raw.notes.length > 0
    ? raw.notes.map((n) => String(n || "").trim()).filter(Boolean)
    : [...DEFAULT_HARGA_DISPLAY_SETTINGS.notes];

  const mandatoryNote = "Harga buyback sudah termasuk potongan";
  const hasPotonganNote = notes.some((n) => n.toLowerCase().includes("potongan"));
  if (!hasPotonganNote) {
    notes.push(mandatoryNote);
  }

  const tickerMessages = Array.isArray(raw.tickerMessages) && raw.tickerMessages.length > 0
    ? raw.tickerMessages.map((t) => String(t || "").trim()).filter(Boolean)
    : [...DEFAULT_HARGA_DISPLAY_SETTINGS.tickerMessages];

  const theme = raw.theme === "light" ? "light" : "dark";

  return {
    theme,
    title: String(raw.title || DEFAULT_HARGA_DISPLAY_SETTINGS.title).trim(),
    subtitle: String(raw.subtitle || DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle).trim(),
    tagline: String(raw.tagline || DEFAULT_HARGA_DISPLAY_SETTINGS.tagline).trim(),
    tickerMessages,
    items,
    notes,
    lastUpdated: raw.lastUpdated || null,
    updatedBy: raw.updatedBy || "System",
  };
}

export async function ensureHargaDisplaySettings() {
  const docRef = getHargaDisplayDoc();
  const snap = await getDoc(docRef);
  if (snap.exists()) return normalizeHargaDisplaySettings(snap.data());

  const now = new Date().toISOString();
  const initialData = {
    ...DEFAULT_HARGA_DISPLAY_SETTINGS,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  };

  await setDoc(docRef, initialData);
  return normalizeHargaDisplaySettings(initialData);
}

export async function fetchHargaDisplaySettings() {
  return await ensureHargaDisplaySettings();
}

export async function saveHargaDisplaySettings(payload, updatedBy = "") {
  const docRef = getHargaDisplayDoc();
  const normalized = normalizeHargaDisplaySettings(payload);
  const now = new Date().toISOString();

  const finalData = {
    ...normalized,
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  };

  await setDoc(docRef, finalData);
  return finalData;
}

export function subscribeHargaDisplaySettings(onData, onError) {
  const docRef = getHargaDisplayDoc();
  return onSnapshot(
    docRef,
    (snap) => {
      const source = snap.exists() ? snap.data() : DEFAULT_HARGA_DISPLAY_SETTINGS;
      if (typeof onData === "function") {
        onData(normalizeHargaDisplaySettings(source));
      }
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    }
  );
}
