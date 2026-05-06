/**
 * Stock Service — Aksesoris
 * Handles Firestore atomic transactions for sales & stock management.
 */
import {
  doc,
  collection,
  runTransaction,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { verifyStoredSecret } from "@/utils/security";
import { floorCollection, floorDoc } from "./floor-scope";
import { getActiveFloor, normalizeFloorId } from "@/config/floor-config";

/**
 * Process sale atomically:
 * 1. Read & validate stock from computed report (legacy-compatible)
 * 2. Create penjualanAksesoris document
 * 3. Write stokAksesorisTransaksi log per item
 *
 * @param {Array}  cartItems      - [{ kode, kodeText, namaBarang, qty, harga, subtotal, tipe }]
 * @param {Object} transactionData - Header fields (tanggal, sales, metodePembayaran, etc.)
 * @returns {string} The new sale document ID
 */
export async function processSale(cartItems, transactionData, floorId = "") {
  const stockLines = [];

  cartItems.forEach((item) => {
    if (item.tipe !== "manual" && item.kode && item.kode !== "-") {
      stockLines.push({
        source: "sale",
        kode: item.kode,
        qty: item.qty ?? 1,
        kategori: item.tipe ?? null,
        item,
      });
    }
  });

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const stockRows = await fetchStockReport(todayStr, todayStr, floorId);
  const rowsByKode = new Map();
  stockRows.forEach((row) => {
    const key = row.kode;
    if (!rowsByKode.has(key)) rowsByKode.set(key, []);
    rowsByKode.get(key).push(row);
  });

  function selectStockRow(kode, kategori = null) {
    const candidates = rowsByKode.get(kode) || [];
    if (!candidates.length) return null;
    if (kategori) {
      const matched = candidates.find((r) => (r.kategori || "").toLowerCase() === kategori.toLowerCase());
      if (matched) return matched;
    }
    return candidates[0];
  }

  const resolvedLines = stockLines.map((line) => {
    const row = selectStockRow(line.kode, line.kategori);
    if (!row) {
      if (line.source === "lock") throw new Error(`Stok kode lock "${line.kode}" tidak cukup`);
      throw new Error(`Barang "${line.kode}" tidak ditemukan di katalog`);
    }
    const key = `${line.kode}::${(row.kategori || line.kategori || "").toLowerCase()}`;
    return {
      ...line,
      stockKey: key,
      available: Number(row.stokAkhir ?? 0),
    };
  });

  const requestByKey = new Map();
  resolvedLines.forEach((line) => {
    if (!requestByKey.has(line.stockKey)) {
      requestByKey.set(line.stockKey, { requestedQty: 0, sample: line });
    }
    const bucket = requestByKey.get(line.stockKey);
    bucket.requestedQty += Number(line.qty || 0);
  });

  requestByKey.forEach((bucket) => {
    const { sample, requestedQty } = bucket;
    if (sample.available < requestedQty) {
      if (sample.source === "lock") throw new Error(`Stok kode lock "${sample.kode}" tidak cukup`);
      throw new Error(`Stok "${sample.kode}" tidak cukup (tersedia: ${sample.available}, diminta: ${requestedQty})`);
    }
  });

  let saleId = null;

  await runTransaction(db, async (txn) => {
    const saleRef = doc(floorCollection(db, "penjualanAksesoris", floorId));
    saleId = saleRef.id;
    txn.set(saleRef, {
      ...transactionData,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const runningStock = new Map();
    resolvedLines.forEach((line) => {
      if (!runningStock.has(line.stockKey)) runningStock.set(line.stockKey, line.available);
    });

    resolvedLines.forEach((line) => {
      const qty = Number(line.qty || 0);
      const before = runningStock.get(line.stockKey) ?? 0;
      const after = before - qty;
      const logRef = doc(floorCollection(db, "stokAksesorisTransaksi", floorId));

      if (line.source === "lock") {
        txn.set(logRef, {
          kode: line.kode,
          nama: `Ganti lock untuk ${line.item.namaBarang}`,
          jenis: "gantiLock",
          jumlah: qty,
          stokSebelum: before,
          stokSesudah: after,
          kodeTransaksi: saleId,
          tanggal: transactionData.tanggal,
          sales: transactionData.salesName ?? "",
          timestamp: serverTimestamp(),
        });
      } else {
        const jenis = transactionData.metodePembayaran === "FREE" ? "free" : "laku";
        txn.set(logRef, {
          kode: line.kode,
          nama: line.item.namaBarang,
          jenis,
          jumlah: qty,
          stokSebelum: before,
          stokSesudah: after,
          kodeTransaksi: saleId,
          tanggal: transactionData.tanggal,
          jam: transactionData.jam ?? "",
          sales: transactionData.salesName ?? "",
          keterangan: line.item.keterangan ?? "",
          timestamp: serverTimestamp(),
        });
      }

      runningStock.set(line.stockKey, after);
    });
  });

  return saleId;
}

/**
 * Delete sale and restore stock atomically.
 * @param {string} saleId
 * @param {Object} saleData - Existing sale document data (items array required)
 */
export async function deleteSale(saleId, saleData, floorId = "") {
  const txLogSnap = await getDocs(
    query(floorCollection(db, "stokAksesorisTransaksi", floorId), where("kodeTransaksi", "==", saleId), limit(1000)),
  );

  const refsToDelete = new Map();
  txLogSnap.docs.forEach((d) => refsToDelete.set(d.ref.path, d.ref));

  // Legacy fallback: old records may not have kodeTransaksi.
  // In that case, locate stock logs from the same day by kode+jenis(+jumlah) and delete them.
  if (txLogSnap.empty) {
    const txDate = (() => {
      const ts = saleData?.timestamp;
      if (ts && typeof ts.toDate === "function") return ts.toDate();
      if (ts?.seconds) return new Date(ts.seconds * 1000);
      if (ts instanceof Date) return ts;
      if (saleData?.tanggal) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(saleData.tanggal)) {
          return new Date(`${saleData.tanggal}T00:00:00`);
        }
        const parts = String(saleData.tanggal).split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        }
      }
      return null;
    })();

    if (txDate) {
      const startOfDay = new Date(txDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(txDate);
      endOfDay.setHours(23, 59, 59, 999);

      const daySnap = await getDocs(
        query(
          floorCollection(db, "stokAksesorisTransaksi", floorId),
          where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
          where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
          orderBy("timestamp", "desc"),
          limit(2000),
        ),
      );

      const targets = [];
      const metode = String(saleData?.metodePembayaran || saleData?.metodeBayar || "").toLowerCase();
      (saleData.items ?? []).forEach((item) => {
        if (item?.tipe === "manual") {
          if (item?.kodeLock && item.kodeLock !== "-") {
            targets.push({
              kode: item.kodeLock,
              jenis: "gantiLock",
              jumlah: Number(item.qty ?? item.jumlah ?? 1) || 1,
            });
          }
          return;
        }

        const kode = item?.kode || item?.kodeText;
        if (!kode || kode === "-") return;
        targets.push({
          kode,
          jenis: metode === "free" ? "free" : "laku",
          jumlah: Number(item.qty ?? item.jumlah ?? 1) || 1,
        });
      });

      const candidates = daySnap.docs.filter((d) => {
        const data = d.data();
        if (saleData?.salesName && data.sales && data.sales !== saleData.salesName) return false;
        return true;
      });

      const used = new Set();
      targets.forEach((target) => {
        let foundIdx = candidates.findIndex((d, idx) => {
          if (used.has(idx)) return false;
          const data = d.data();
          return (
            data.kode === target.kode &&
            data.jenis === target.jenis &&
            Number(data.jumlah || 0) === Number(target.jumlah || 0)
          );
        });

        if (foundIdx === -1) {
          foundIdx = candidates.findIndex((d, idx) => {
            if (used.has(idx)) return false;
            const data = d.data();
            return data.kode === target.kode && data.jenis === target.jenis;
          });
        }

        // Legacy fallback for documents with incomplete fields
        // (e.g. only sales + kode without jenis).
        if (foundIdx === -1) {
          foundIdx = candidates.findIndex((d, idx) => {
            if (used.has(idx)) return false;
            const data = d.data();
            return data.kode === target.kode && Number(data.jumlah || 0) === Number(target.jumlah || 0);
          });
        }

        if (foundIdx === -1) {
          foundIdx = candidates.findIndex((d, idx) => {
            if (used.has(idx)) return false;
            const data = d.data();
            return data.kode === target.kode;
          });
        }

        if (foundIdx !== -1) {
          used.add(foundIdx);
          const ref = candidates[foundIdx].ref;
          refsToDelete.set(ref.path, ref);
        }
      });
    }
  }

  await runTransaction(db, async (txn) => {
    // Single source of truth is stokAksesorisTransaksi.
    // So delete the original stock logs tied to this sale, do not create reverse logs.
    refsToDelete.forEach((ref) => txn.delete(ref));

    // ── Delete sale document (also remove legacy copy) ─────────────────────
    txn.delete(floorDoc(db, "penjualanAksesoris", saleId, floorId));
  });
}

/**
 * Fetch all active catalog items (stokAksesoris where isActive==true).
 * @returns {Array}
 */
export async function fetchCatalog(floorId = "") {
  const resolvedFloor = normalizeFloorId(floorId || getActiveFloor());
  const docs = await getDocs(floorCollection(db, "stokAksesoris", resolvedFloor)).then((s) => s.docs);
  return docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch single stokAksesoris document by kode (document ID).
 * @param {string} kode
 * @returns {Object|null}
 */
export async function fetchStockItem(kode, floorId = "") {
  const resolvedFloor = normalizeFloorId(floorId || getActiveFloor());
  const snap = await getDoc(floorDoc(db, "stokAksesoris", kode, resolvedFloor));
  if (!snap || !snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Load transactions for a date range with optional cursor pagination.
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 * @param {number} pageLimit
 * @param {Object|null} lastDoc - Firestore cursor
 * @returns {{ docs: Array, lastDoc: Object|null, hasMore: boolean }}
 */
export async function fetchTransactions(startDate, endDate, pageLimit = 200, lastDoc = null, floorId = "") {
  const { startAfter } = await import("firebase/firestore");

  // Use timestamp range — same index as old dataPenjualan.js.
  // Single-field orderBy on the same field used in where() → no composite index needed.
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59.999");

  const constraints = [
    where("timestamp", ">=", Timestamp.fromDate(start)),
    where("timestamp", "<=", Timestamp.fromDate(end)),
    orderBy("timestamp", "desc"),
    limit(pageLimit),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(floorCollection(db, "penjualanAksesoris", floorId), ...constraints));
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    docs,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageLimit,
  };
}

/**
 * Update supervisor password verification.
 * @param {string} inputPassword - Plain text input from user
 * @returns {boolean}
 */
export async function verifySupervisorPassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return false;
  const data = snap.data();
  const candidates = [data.supervisorPassword, data.deleteDataPenjualan, data.editDataPenjualan].filter(Boolean);
  if (!candidates.length) return false;
  return candidates.some((stored) => verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true }));
}

/**
 * Verify access code for deleting return history.
 * Primary source: settings/passwords.deleteRiwayatReturn
 * @param {string} inputPassword
 * @returns {boolean}
 */
export async function verifyDeleteReturnPassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return verifyStoredSecret(inputPassword, "smlt116");
  const data = snap.data() || {};
  const stored =
    data.deleteRiwayatReturn ?? data.deleteDataPenjualan ?? data.supervisorPassword ?? data.deleteServis ?? "smlt116";
  return verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
}

/**
 * Verify access code for deleting tambah barang history.
 * Primary source: settings/passwords.deleteRiwayatTambahBarang
 * @param {string} inputPassword
 * @returns {boolean}
 */
export async function verifyDeleteTambahBarangPassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return verifyStoredSecret(inputPassword, "smlt116");
  const data = snap.data() || {};
  const stored =
    data.deleteRiwayatTambahBarang ??
    data.deleteDataPenjualan ??
    data.supervisorPassword ??
    data.deleteServis ??
    "smlt116";
  return verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
}

/**
 * Add stock for one or more items (Tambah Barang).
 * Increments stokAksesoris.stok and writes log entries (jenis: "tambah").
 *
 * Supports two document structures:
 *   - New-style: stokAksesoris/{kode}  (doc ID = kode)
 *   - Legacy:    stokAksesoris/{autoId} with field kode == kode
 * Never creates a new document — throws if kode is not registered.
 *
 * @param {Array}  items - [{ kode, nama, jumlah, kategori }]
 * @param {Object} data  - { tanggal: "YYYY-MM-DD", kasir: string }
 */
export async function addStock(items, data, floorId = "") {
  // Pre-resolve document refs outside the transaction so we can run queries.
  // 1. Check direct ref (new-style: doc ID = kode)
  // 2. Fallback: query by kode field (legacy: auto-generated doc ID)
  // 3. Not found → throw — never create a doc here
  const resolvedRefs = await Promise.all(
    items.map(async (item) => {
      const directRef = floorDoc(db, "stokAksesoris", item.kode, floorId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return directRef;

      const legacySnap = await getDocs(
        query(floorCollection(db, "stokAksesoris", floorId), where("kode", "==", item.kode), limit(1)),
      );
      if (!legacySnap.empty) return legacySnap.docs[0].ref;

      throw new Error(
        `Kode "${item.kode}" belum terdaftar di stok. Tambahkan kode melalui Kelola Kode terlebih dahulu.`,
      );
    }),
  );

  await runTransaction(db, async (txn) => {
    const snaps = await Promise.all(resolvedRefs.map((ref) => txn.get(ref)));

    items.forEach((item, idx) => {
      const snap = snaps[idx];
      if (!snap.exists()) {
        throw new Error(`Kode "${item.kode}" tidak ditemukan.`);
      }

      txn.update(resolvedRefs[idx], { stok: increment(item.jumlah), updatedAt: serverTimestamp() });

      const logRef = doc(floorCollection(db, "stokAksesorisTransaksi", floorId));
      txn.set(logRef, {
        kode: item.kode,
        nama: item.nama,
        jenis: "tambah",
        jumlah: item.jumlah,
        tanggal: data.tanggal,
        kasir: data.kasir,
        kategori: item.kategori,
        timestamp: serverTimestamp(),
      });
    });
  });
}

/**
 * Fetch master codes from kodeAksesoris/kategori/{jenis} subcollection.
 * @param {string} jenis - "kotak" | "aksesoris" | "silver"
 * @returns {Array} [{kode, nama, kadar, berat, ...}]
 */
export async function fetchKodesByKategori(jenis, floorId = "") {
  const snap = await getDocs(collection(floorDoc(db, "kodeAksesoris", "kategori", floorId), jenis));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.text || a.kode || "").localeCompare(b.text || b.kode || ""));
}

/**
 * Fetch stok items by kategori with stok > 0 only.
 * Source of truth is stokAksesoris collection (not master kode).
 * Used for printing/display where we only want items actually in stock.
 * @param {string} jenis - "kotak" | "aksesoris" | "silver"
 * @param {string} floorId - optional floor ID
 * @returns {Array} [{id, kode, nama, kadar, berat, stok, kategori, ...}]
 */
export async function fetchKodeWithStockByKategori(jenis, floorId = "") {
  const resolvedFloor = normalizeFloorId(floorId || getActiveFloor());

  // Query stokAksesoris (source of truth for stok) filtered by kategori
  const stokSnap = await getDocs(
    query(floorCollection(db, "stokAksesoris", resolvedFloor), where("kategori", "==", jenis)),
  );

  // Filter stok > 0 and map to result
  const result = stokSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((item) => (item.stok || 0) > 0)
    .sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));

  return result;
}

/**
 * Process return (decrement stock).
 * Writes log entries (jenis: "return") per item.
 * Supports both new-style (doc ID = kode) and legacy (auto-id + kode field) stokAksesoris docs.
 * @param {Array}  items - [{ kode, nama, jumlah, kategori, keterangan }]
 * @param {Object} data  - { tanggal: "YYYY-MM-DD", kasir: string, jenis: "kotak"|"aksesoris"|"silver" }
 */
export async function processReturn(items, data, floorId = "") {
  const resolvedRefs = await Promise.all(
    items.map(async (item) => {
      const directRef = floorDoc(db, "stokAksesoris", item.kode, floorId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return directRef;

      const legacySnap = await getDocs(
        query(floorCollection(db, "stokAksesoris", floorId), where("kode", "==", item.kode), limit(1)),
      );
      if (!legacySnap.empty) return legacySnap.docs[0].ref;

      throw new Error(`Barang "${item.kode}" tidak ditemukan di katalog`);
    }),
  );

  await runTransaction(db, async (txn) => {
    const snaps = await Promise.all(resolvedRefs.map((ref) => txn.get(ref)));

    items.forEach((item, idx) => {
      const snap = snaps[idx];
      if (!snap.exists()) throw new Error(`Barang "${item.kode}" tidak ditemukan di katalog`);
      txn.update(resolvedRefs[idx], { stok: increment(-item.jumlah), updatedAt: serverTimestamp() });

      const logRef = doc(floorCollection(db, "stokAksesorisTransaksi", floorId));
      txn.set(logRef, {
        kode: item.kode,
        nama: item.nama,
        jenis: "return",
        jumlah: item.jumlah,
        tanggal: data.tanggal,
        kasir: data.kasir,
        jenisReturn: data.jenis,
        keterangan: item.keterangan || "",
        timestamp: serverTimestamp(),
      });
    });
  });
}

/**
 * Delete a single return transaction and undo the stock change.
 * Supports both new-style (doc ID = kode) and legacy (auto-id + kode field) stokAksesoris docs.
 * @param {string} txId  - stokAksesorisTransaksi document ID
 * @param {{kode:string, jumlah:number}} data - fields from the return record
 */
export async function deleteReturn(txId, data, floorId = "") {
  // Resolve stock ref before transaction — support legacy docs
  const directRef = floorDoc(db, "stokAksesoris", data.kode, floorId);
  const directSnap = await getDoc(directRef);
  let stockRef;
  if (directSnap.exists()) {
    stockRef = directRef;
  } else {
    const legacySnap = await getDocs(
      query(floorCollection(db, "stokAksesoris", floorId), where("kode", "==", data.kode), limit(1)),
    );
    if (!legacySnap.empty) {
      stockRef = legacySnap.docs[0].ref;
    } else {
      throw new Error(`Barang "${data.kode}" tidak ditemukan di katalog`);
    }
  }

  await runTransaction(db, async (txn) => {
    const txRef = floorDoc(db, "stokAksesorisTransaksi", txId, floorId);
    const txSnap = await txn.get(txRef);
    if (!txSnap.exists()) throw new Error("Data return tidak ditemukan");
    txn.update(stockRef, { stok: increment(Math.abs(data.jumlah)), updatedAt: serverTimestamp() });
    txn.delete(txRef);
  });
}

/**
 * Fetch transaction history from stokAksesorisTransaksi.
 * Handles two tanggal formats:
 *   - New Vue docs: "YYYY-MM-DD"
 *   - Legacy old-system docs: ISO string "YYYY-MM-DDTHH:mm:ss.sssZ" (UTC)
 *     → old system stored local midnight (WITA UTC+8) so UTC date may be 1 day earlier
 * @param {string}      startDate  YYYY-MM-DD
 * @param {string}      endDate    YYYY-MM-DD
 * @param {string|null} jenisFilter  Optional: single jenis value (e.g., "tambah", "return")
 * @returns {Array}
 */
export async function fetchTransactionHistory(startDate, endDate, jenisFilter = null, floorId = "") {
  // Expand query bounds to capture legacy ISO strings:
  // Lower: 1 day before (old system stored WITA midnight as UTC prev-day 16:00)
  // Upper: append "\uf8ff" to catch ISO strings beyond plain date string
  const d = new Date(startDate);
  d.setDate(d.getDate() - 1);
  const queryStart = d.toISOString().substring(0, 10);

  const snap = await getDocs(
    query(
      floorCollection(db, "stokAksesorisTransaksi", floorId),
      where("tanggal", ">=", queryStart),
      where("tanggal", "<=", endDate + "\uf8ff"),
      orderBy("tanggal", "desc"),
      limit(1000),
    ),
  );

  // Normalize tanggal: convert legacy ISO string to WITA date (UTC+8)
  const toWITADate = (t) => {
    if (!t) return "";
    if (t.includes("T")) {
      try {
        return new Date(new Date(t).getTime() + 8 * 3600 * 1000).toISOString().substring(0, 10);
      } catch {
        return t.substring(0, 10);
      }
    }
    return t;
  };

  let docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => {
      const t = toWITADate(d.tanggal);
      return t >= startDate && t <= endDate;
    });

  return jenisFilter ? docs.filter((d) => d.jenis === jenisFilter) : docs;
}

/**
 * Update sale metadata (non-destructive: keterangan, metodePembayaran only).
 * Does NOT touch stock or stokAksesorisTransaksi.
 * @param {string} saleId
 * @param {Object} updates - Allowed: metodePembayaran, keterangan, customerName, customerPhone
 */
export async function updateSale(saleId, updates, floorId = "") {
  const { updateDoc } = await import("firebase/firestore");
  const allowedFields = ["metodePembayaran", "keterangan", "customerName", "customerPhone", "statusPembayaran"];
  const safeUpdates = {};
  allowedFields.forEach((f) => {
    if (updates[f] !== undefined) safeUpdates[f] = updates[f];
  });
  await updateDoc(floorDoc(db, "penjualanAksesoris", saleId, floorId), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Full update for a sale (allows editing items, salesName, totalHarga, etc.).
 * Does NOT touch stock or stokAksesorisTransaksi.
 * @param {string} saleId
 * @param {Object} updates - Any penjualanAksesoris fields (items, salesName, totalHarga, etc.)
 */
export async function updateSaleFull(saleId, updates, floorId = "") {
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(floorDoc(db, "penjualanAksesoris", saleId, floorId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Verify edit access password from settings/passwords.editDataPenjualan.
 * @param {string} inputPassword
 * @returns {boolean}
 */
export async function verifyEditPassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return verifyStoredSecret(inputPassword, "admin123");
  const stored = snap.data().editDataPenjualan ?? "admin123";
  return verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
}

/**
 * Fetch aggregated stock report for a date range.
 * Returns merged catalog + transaction aggregates.
 * stokAwal is back-calculated: stokAwal = stokAkhir - tambah + laku + free + gantiLock + return
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate   YYYY-MM-DD
 * @returns {Array}
 */
export async function fetchStockReport(startDate, endDate, floorId = "") {
  // ── Timestamp bounds ──────────────────────────────────────────────────────
  const startTs = Timestamp.fromDate(
    (() => {
      const d = new Date(startDate);
      d.setHours(0, 0, 0, 0);
      return d;
    })(),
  );
  const endTs = Timestamp.fromDate(
    (() => {
      const d = new Date(endDate);
      d.setHours(23, 59, 59, 999);
      return d;
    })(),
  );
  const afterTs = Timestamp.fromDate(
    (() => {
      const d = new Date(endDate);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    })(),
  );

  // ── Snapshot date key: day before startDate in "DD/MM/YYYY" (UTC) ────────
  const prevDay = new Date(startDate);
  prevDay.setUTCDate(prevDay.getUTCDate() - 1);
  const snapshotDateKey = [
    String(prevDay.getUTCDate()).padStart(2, "0"),
    String(prevDay.getUTCMonth() + 1).padStart(2, "0"),
    prevDay.getUTCFullYear(),
  ].join("/");

  // ── Fetch catalog, snapshot, and period transactions in parallel ──────────
  const [catalogSnap, snapshotSnap, txSnap] = await Promise.all([
    getDocs(floorCollection(db, "stokAksesoris", floorId)),
    getDocs(query(floorCollection(db, "dailyStockSnapshot", floorId), where("date", "==", snapshotDateKey))),
    getDocs(
      query(
        floorCollection(db, "stokAksesorisTransaksi", floorId),
        where("timestamp", ">=", startTs),
        where("timestamp", "<=", endTs),
        orderBy("timestamp", "asc"),
        limit(5000),
      ),
    ),
  ]);

  const catalog = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ── Build stokAwal map from snapshot (if available) ───────────────────────
  let stokAwalMap = null; // null = no snapshot, fall back to back-calculation
  if (!snapshotSnap.empty) {
    const snapshotData = snapshotSnap.docs[0].data();
    if (snapshotData.stockData && Array.isArray(snapshotData.stockData)) {
      stokAwalMap = new Map();
      snapshotData.stockData.forEach((item) => {
        if (item.kode) stokAwalMap.set(item.kode, item.stokAkhir || 0);
      });
    }
  }

  // ── Aggregate period transactions per kode ────────────────────────────────
  function aggregateTx(docs) {
    const map = new Map();
    docs.forEach((d) => {
      const data = d.data();
      const kode = data.kode;
      if (!map.has(kode)) map.set(kode, { tambah: 0, laku: 0, free: 0, gantiLock: 0, return: 0 });
      const agg = map.get(kode);
      switch (data.jenis) {
        case "tambah":
        case "stockAddition":
          agg.tambah += data.jumlah || 0;
          break;
        case "laku":
          agg.laku += data.jumlah || 0;
          break;
        case "free":
          agg.free += data.jumlah || 0;
          break;
        case "gantiLock":
          agg.gantiLock += data.jumlah || 0;
          break;
        case "return":
          agg.return += data.jumlah || 0;
          break;
      }
    });
    return map;
  }

  const txByKode = aggregateTx(txSnap.docs);

  // ── If no snapshot: fetch transactions AFTER period for back-calculation ──
  let txAfterKode = new Map();
  if (!stokAwalMap) {
    const txAfterSnap = await getDocs(
      query(
        floorCollection(db, "stokAksesorisTransaksi", floorId),
        where("timestamp", ">=", afterTs),
        orderBy("timestamp", "asc"),
        limit(5000),
      ),
    );
    txAfterKode = aggregateTx(txAfterSnap.docs);
  }

  // ── Build result ──────────────────────────────────────────────────────────
  return catalog.map((item) => {
    const agg = txByKode.get(item.kode) || { tambah: 0, laku: 0, free: 0, gantiLock: 0, return: 0 };

    let stokAwal, stokAkhir;
    if (stokAwalMap) {
      // Forward calculation from snapshot
      stokAwal = stokAwalMap.get(item.kode) ?? 0;
      stokAkhir = Math.max(0, stokAwal + agg.tambah - agg.laku - agg.free - agg.gantiLock - agg.return);
    } else {
      // Back-calculation fallback from current stok
      const aggAfter = txAfterKode.get(item.kode) || { tambah: 0, laku: 0, free: 0, gantiLock: 0, return: 0 };
      const stokNow = item.stok ?? 0;
      stokAkhir = Math.max(
        0,
        stokNow - aggAfter.tambah + aggAfter.laku + aggAfter.free + aggAfter.gantiLock + aggAfter.return,
      );
      stokAwal = Math.max(0, stokAkhir - agg.tambah + agg.laku + agg.free + agg.gantiLock + agg.return);
    }

    return {
      kode: item.kode,
      nama: item.nama,
      kategori: (item.kategori || "").toLowerCase(),
      kadar: item.kadar ?? null,
      berat: item.berat ?? null,
      tambah: agg.tambah,
      laku: agg.laku,
      free: agg.free,
      gantiLock: agg.gantiLock,
      return: agg.return,
      stokAwal,
      stokAkhir,
    };
  });
}

/**
 * Fetch a Map of kode -> current stokAkhir for today.
 * Uses the same snapshot + delta logic as fetchStockReport.
 * @returns {Map<string, number>}
 */
export async function fetchCurrentStockMap(floorId = "") {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const items = await fetchStockReport(todayStr, todayStr, floorId);
  return new Map(items.map((i) => [i.kode, i.stokAkhir]));
}

/**
 * Fetch sales catalog with computed current stock (legacy-equivalent logic).
 * Keeps UI stock aligned with snapshot+today-delta calculation used in old page.
 * @returns {Array}
 */
export async function fetchSalesCatalogWithComputedStock(floorId = "") {
  const [items, stockMap] = await Promise.all([fetchCatalog(floorId), fetchCurrentStockMap(floorId)]);
  return items.map((item) => ({
    ...item,
    stok: stockMap.get(item.kode) ?? item.stok ?? 0,
  }));
}
