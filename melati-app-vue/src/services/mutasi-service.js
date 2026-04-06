/**
 * Mutasi Kode Service
 * Reads from penjualanAksesoris (manual) and mutasiKode collections.
 * Writes mutations to mutasiKode collection.
 */
import { collection, doc, getDocs, updateDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";

/** Prefix → jenis barang mapping */
export const JENIS_BARANG = {
  C: "Cincin",
  K: "Kalung",
  L: "Liontin",
  A: "Anting",
  G: "Gelang",
  S: "Giwang",
  Z: "HALA & SDW",
  V: "HALA & SDW",
};

// ── Internal helpers ──────────────────────────────────────────────────────

function formatTimestamp(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split("T")[0];
}

/**
 * Map a single kode string + metadata into a standardised kode item.
 * Returns null if kode is invalid / prefix not in JENIS_BARANG.
 */
function buildKodeItem(kodeText, metadata) {
  const kode = (kodeText || "").trim();
  if (!kode || kode === "-") return null;
  const prefix = kode.charAt(0).toUpperCase();
  if (!(prefix in JENIS_BARANG)) return null;
  return { kode, prefix, jenisNama: JENIS_BARANG[prefix], ...metadata };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Load kode data from mutasiKode (primary) and penjualanAksesoris (fallback).
 * @returns {{ active: Array, mutated: Array }}
 */
export async function fetchKodeData() {
  const [mutasiSnap, penjSnap] = await Promise.all([
    getDocs(query(collection(db, "mutasiKode"), orderBy("timestamp", "desc"))),
    getDocs(
      query(
        collection(db, "penjualanAksesoris"),
        where("jenisPenjualan", "==", "manual"),
        orderBy("timestamp", "desc"),
      ),
    ),
  ]);

  const active = [];
  const mutated = [];

  // Primary: mutasiKode collection
  mutasiSnap.forEach((d) => {
    const data = d.data();
    const item = buildKodeItem(data.kode, {
      id: d.id,
      nama: data.namaBarang || "-",
      kadar: data.kadar || "-",
      berat: data.berat || 0,
      tanggalInput: data.tanggalInput || formatTimestamp(data.timestamp || data.createdAt),
      isMutated: data.isMutated || false,
      tanggalMutasi: data.tanggalMutasi || null,
      mutasiKeterangan: data.mutasiKeterangan || "",
      source: "mutasiKode",
    });
    if (!item) return;
    if (item.isMutated) mutated.push(item);
    else active.push(item);
  });

  // Fallback: penjualanAksesoris if mutasiKode is completely empty
  if (active.length === 0 && mutated.length === 0) {
    penjSnap.forEach((d) => {
      const data = d.data();
      if (!data.items || !Array.isArray(data.items)) return;
      data.items.forEach((item, idx) => {
        const processed = buildKodeItem(item.kodeText, {
          id: `${d.id}_${idx}`,
          nama: item.nama || "-",
          kadar: item.kadar || "-",
          berat: item.berat || 0,
          tanggalInput: data.tanggal || formatTimestamp(data.timestamp),
          isMutated: false,
          tanggalMutasi: null,
          mutasiKeterangan: "",
          source: "penjualanAksesoris",
          penjualanId: d.id,
        });
        if (processed) active.push(processed);
      });
    });
  }

  return { active, mutated };
}

/**
 * Mark a single kode (from mutasiKode collection) as mutated.
 * @param {string} id          - Firestore document ID in mutasiKode
 * @param {string} keterangan  - Mutation reason
 */
export async function mutateSingle(id, keterangan) {
  const today = new Date().toISOString().split("T")[0];
  await updateDoc(doc(db, "mutasiKode", id), {
    isMutated: true,
    tanggalMutasi: today,
    mutasiKeterangan: keterangan,
    lastUpdated: serverTimestamp(),
  });
}

/**
 * Mark multiple kodes as mutated in parallel.
 * @param {string[]} ids       - Array of mutasiKode document IDs
 * @param {string} keterangan  - Mutation reason
 */
export async function mutateBatch(ids, keterangan) {
  await Promise.all(ids.map((id) => mutateSingle(id, keterangan)));
}
