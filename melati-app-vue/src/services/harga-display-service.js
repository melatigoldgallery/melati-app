import { 
  addDoc, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  limit, 
  onSnapshot, 
  orderBy, 
  query, 
  setDoc 
} from "firebase/firestore";
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

export function getHargaDisplayDoc() {
  return doc(db, "settings", "hargaDisplay");
}

export function getHargaDisplayHistoryCol() {
  return collection(db, "settings", "hargaDisplay", "history");
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

export function calculateHargaDiff(previousItems = [], nextItems = []) {
  const changes = [];
  const prevMap = new Map();

  (previousItems || []).forEach((item, index) => {
    const key = item.id || item.kadar || `item-${index}`;
    prevMap.set(key, item);
  });

  const nextMap = new Map();
  (nextItems || []).forEach((item, index) => {
    const key = item.id || item.kadar || `item-${index}`;
    nextMap.set(key, item);
  });

  // Check updated and added items
  (nextItems || []).forEach((nextItem, index) => {
    const key = nextItem.id || nextItem.kadar || `item-${index}`;
    const prevItem = prevMap.get(key) || (previousItems || []).find((p) => p.kadar && p.kadar === nextItem.kadar);

    if (!prevItem) {
      changes.push({
        type: "added",
        kadar: nextItem.kadar || `Kadar #${index + 1}`,
        id: nextItem.id,
        hargaNormal: { before: 0, after: Number(nextItem.hargaNormal) || 0, diff: Number(nextItem.hargaNormal) || 0 },
        hargaBranded: { before: 0, after: Number(nextItem.hargaBranded) || 0, diff: Number(nextItem.hargaBranded) || 0 },
        hargaBuyback: { before: 0, after: Number(nextItem.hargaBuyback) || 0, diff: Number(nextItem.hargaBuyback) || 0 },
        hasBranded: { before: false, after: Boolean(nextItem.hasBranded) },
      });
    } else {
      const prevNormal = Number(prevItem.hargaNormal) || 0;
      const nextNormal = Number(nextItem.hargaNormal) || 0;
      const prevBranded = Number(prevItem.hargaBranded) || 0;
      const nextBranded = Number(nextItem.hargaBranded) || 0;
      const prevBuyback = Number(prevItem.hargaBuyback) || 0;
      const nextBuyback = Number(nextItem.hargaBuyback) || 0;
      const prevHasBranded = Boolean(prevItem.hasBranded);
      const nextHasBranded = Boolean(nextItem.hasBranded);

      const isNormalChanged = prevNormal !== nextNormal;
      const isBrandedChanged = prevBranded !== nextBranded || prevHasBranded !== nextHasBranded;
      const isBuybackChanged = prevBuyback !== nextBuyback;
      const isKadarNameChanged = String(prevItem.kadar || "").trim() !== String(nextItem.kadar || "").trim();

      if (isNormalChanged || isBrandedChanged || isBuybackChanged || isKadarNameChanged) {
        changes.push({
          type: "modified",
          kadar: nextItem.kadar || prevItem.kadar || `Kadar #${index + 1}`,
          oldKadar: prevItem.kadar,
          id: nextItem.id || prevItem.id,
          hargaNormal: {
            before: prevNormal,
            after: nextNormal,
            diff: nextNormal - prevNormal,
          },
          hargaBranded: {
            before: prevBranded,
            after: nextBranded,
            diff: nextBranded - prevBranded,
          },
          hargaBuyback: {
            before: prevBuyback,
            after: nextBuyback,
            diff: nextBuyback - prevBuyback,
          },
          hasBranded: {
            before: prevHasBranded,
            after: nextHasBranded,
          },
        });
      }
    }
  });

  // Check removed items
  (previousItems || []).forEach((prevItem, index) => {
    const key = prevItem.id || prevItem.kadar || `item-${index}`;
    const existsInNext = nextMap.has(key) || (nextItems || []).some((n) => n.kadar && n.kadar === prevItem.kadar);
    if (!existsInNext) {
      changes.push({
        type: "removed",
        kadar: prevItem.kadar || `Kadar #${index + 1}`,
        id: prevItem.id,
        hargaNormal: { before: Number(prevItem.hargaNormal) || 0, after: 0, diff: -(Number(prevItem.hargaNormal) || 0) },
        hargaBranded: { before: Number(prevItem.hargaBranded) || 0, after: 0, diff: -(Number(prevItem.hargaBranded) || 0) },
        hargaBuyback: { before: Number(prevItem.hargaBuyback) || 0, after: 0, diff: -(Number(prevItem.hargaBuyback) || 0) },
        hasBranded: { before: Boolean(prevItem.hasBranded), after: false },
      });
    }
  });

  return changes;
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

export async function fetchHargaDisplayHistory(limitCount = 50) {
  try {
    const colRef = getHargaDisplayHistoryCol();
    const q = query(colRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    const historyList = [];
    snap.forEach((docSnap) => {
      historyList.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });
    return historyList;
  } catch (err) {
    console.warn("fetchHargaDisplayHistory ordered query failed, trying fallback:", err);
    try {
      const colRef = getHargaDisplayHistoryCol();
      const snap = await getDocs(colRef);
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return list.slice(0, limitCount);
    } catch (fallbackErr) {
      console.error("Fallback fetch history failed:", fallbackErr);
      return [];
    }
  }
}

export async function saveHargaDisplaySettings(payload, updatedBy = "", note = "") {
  const docRef = getHargaDisplayDoc();
  const currentSnap = await getDoc(docRef);
  const previousData = currentSnap.exists()
    ? normalizeHargaDisplaySettings(currentSnap.data())
    : DEFAULT_HARGA_DISPLAY_SETTINGS;

  const normalized = normalizeHargaDisplaySettings(payload);
  const now = new Date().toISOString();
  const staff = updatedBy || auth.currentUser?.email || auth.currentUser?.displayName || "System";

  const priceChanges = calculateHargaDiff(previousData.items || [], normalized.items || []);

  const finalData = {
    ...normalized,
    lastUpdated: now,
    updatedBy: staff,
  };

  await setDoc(docRef, finalData);

  // Record audit log entry in history subcollection
  try {
    const historyCol = getHargaDisplayHistoryCol();
    const historyEntry = {
      timestamp: now,
      updatedBy: staff,
      note: String(note || "").trim(),
      changes: priceChanges,
      totalChanges: priceChanges.length,
      themeChanged: previousData.theme !== normalized.theme,
      titleChanged: previousData.title !== normalized.title,
      snapshotBefore: previousData.items || [],
      snapshotAfter: normalized.items || [],
    };
    await addDoc(historyCol, historyEntry);
  } catch (historyErr) {
    console.warn("Gagal mencatat audit log riwayat harga display:", historyErr);
  }

  return {
    ...finalData,
    priceChanges,
  };
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
