import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export const DEFAULT_HARGA_DISPLAY_SETTINGS = Object.freeze({
  title: "HARGA EMAS HARI INI",
  subtitle: "Melati Gold Shop",
  items: [
    {
      id: "1",
      kadar: "6K",
      hasBranded: false,
      hargaNormal: 750000,
      hargaBranded: 0,
      hargaBuyback: 620000,
    },
    {
      id: "2",
      kadar: "8K",
      hasBranded: true,
      hargaNormal: 1010000,
      hargaBranded: 1020000,
      hargaBuyback: 850000,
    },
    {
      id: "3",
      kadar: "16K",
      hasBranded: true,
      hargaNormal: 1250000,
      hargaBranded: 1270000,
      hargaBuyback: 1050000,
    },
    {
      id: "4",
      kadar: "17K",
      hasBranded: true,
      hargaNormal: 1320000,
      hargaBranded: 1350000,
      hargaBuyback: 1120000,
    },
    {
      id: "5",
      kadar: "24K",
      hasBranded: false,
      hargaNormal: 1750000,
      hargaBranded: 0,
      hargaBuyback: 1550000,
    },
  ],
  notes: [
    "Harga dapat berubah sewaktu-waktu dan untuk model perhiasan tertentu harga berbeda.",
    "Harga jual kembali (buyback) diterima dengan harga terbaik untuk perhiasan dengan kondisi bagus/tanpa kerusakan (tidak penyok, putus, patah atau ada bekas patri).",
    "Harga buyback sudah termasuk potongan.",
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

  return {
    title: String(raw.title || DEFAULT_HARGA_DISPLAY_SETTINGS.title).trim(),
    subtitle: String(raw.subtitle || DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle).trim(),
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
