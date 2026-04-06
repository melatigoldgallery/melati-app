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

/**
 * Process sale atomically:
 * 1. Read & validate stock for each item
 * 2. Decrement stokAksesoris.stok
 * 3. Create penjualanAksesoris document
 * 4. Write stokAksesorisTransaksi log per item
 *
 * @param {Array}  cartItems      - [{ kode, kodeText, namaBarang, qty, harga, subtotal, tipe }]
 * @param {Object} transactionData - Header fields (tanggal, sales, metodePembayaran, etc.)
 * @returns {string} The new sale document ID
 */
export async function processSale(cartItems, transactionData) {
  // Only aksesoris/kotak/silver items have real stock; 'manual' items may have kodeLock
  const stockItems = cartItems.filter((item) => item.tipe !== "manual" && item.kode && item.kode !== "-");
  const lockItems = cartItems.filter((item) => item.tipe === "manual" && item.kodeLock && item.kodeLock !== "-");
  const allStockKodes = [...stockItems.map((i) => i.kode), ...lockItems.map((i) => i.kodeLock)];

  let saleId = null;

  await runTransaction(db, async (txn) => {
    // ── 1. Read current stock for all affected items ──────────────────────
    const stockRefs = allStockKodes.map((kode) => doc(db, "stokAksesoris", kode));
    const stockSnaps = await Promise.all(stockRefs.map((ref) => txn.get(ref)));

    // ── 2. Validate stock availability ────────────────────────────────────
    stockItems.forEach((item) => {
      const idx = allStockKodes.indexOf(item.kode);
      const snap = stockSnaps[idx];
      if (!snap.exists()) throw new Error(`Barang "${item.kode}" tidak ditemukan di katalog`);
      const available = snap.data().stok ?? 0;
      if (available < item.qty) {
        throw new Error(`Stok "${item.kode}" tidak cukup (tersedia: ${available}, diminta: ${item.qty})`);
      }
    });
    lockItems.forEach((item) => {
      const idx = allStockKodes.indexOf(item.kodeLock);
      const snap = stockSnaps[idx];
      if (snap.exists()) {
        const available = snap.data().stok ?? 0;
        if (available < (item.qty ?? 1)) {
          throw new Error(`Stok kode lock "${item.kodeLock}" tidak cukup`);
        }
      }
    });

    // ── 3. Write penjualanAksesoris document ──────────────────────────────
    const saleRef = doc(collection(db, "penjualanAksesoris"));
    saleId = saleRef.id;
    txn.set(saleRef, {
      ...transactionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ── 4. Decrement stok & write log for stock items ─────────────────────
    stockItems.forEach((item, _i) => {
      const idx = allStockKodes.indexOf(item.kode);
      const snap = stockSnaps[idx];
      const stokSebelum = snap.data().stok ?? 0;
      const stokSesudah = stokSebelum - item.qty;

      txn.update(stockRefs[idx], {
        stok: increment(-item.qty),
        updatedAt: serverTimestamp(),
      });

      const logRef = doc(collection(db, "stokAksesorisTransaksi"));
      const jenis = transactionData.metodePembayaran === "FREE" ? "free" : "laku";
      txn.set(logRef, {
        kode: item.kode,
        nama: item.namaBarang,
        jenis,
        jumlah: item.qty,
        stokSebelum,
        stokSesudah,
        kodeTransaksi: saleId,
        tanggal: transactionData.tanggal,
        sales: transactionData.salesName ?? "",
        timestamp: serverTimestamp(),
      });
    });

    // ── 5. Decrement stok & write log for lock items ──────────────────────
    lockItems.forEach((item) => {
      const idx = allStockKodes.indexOf(item.kodeLock);
      const snap = stockSnaps[idx];
      if (!snap.exists()) return;
      const stokSebelum = snap.data().stok ?? 0;
      const qty = item.qty ?? 1;
      const stokSesudah = stokSebelum - qty;

      txn.update(stockRefs[idx], {
        stok: increment(-qty),
        updatedAt: serverTimestamp(),
      });

      const logRef = doc(collection(db, "stokAksesorisTransaksi"));
      txn.set(logRef, {
        kode: item.kodeLock,
        nama: `Ganti lock untuk ${item.namaBarang}`,
        jenis: "gantiLock",
        jumlah: qty,
        stokSebelum,
        stokSesudah,
        kodeTransaksi: saleId,
        tanggal: transactionData.tanggal,
        sales: transactionData.salesName ?? "",
        timestamp: serverTimestamp(),
      });
    });
  });

  return saleId;
}

/**
 * Delete sale and restore stock atomically.
 * @param {string} saleId
 * @param {Object} saleData - Existing sale document data (items array required)
 */
export async function deleteSale(saleId, saleData) {
  const cartItems = saleData.items ?? [];
  const stockItems = cartItems.filter((item) => item.tipe !== "manual" && item.kode && item.kode !== "-");
  const lockItems = cartItems.filter((item) => item.tipe === "manual" && item.kodeLock && item.kodeLock !== "-");
  const allKodes = [...stockItems.map((i) => i.kode), ...lockItems.map((i) => i.kodeLock)];

  await runTransaction(db, async (txn) => {
    const stockRefs = allKodes.map((kode) => doc(db, "stokAksesoris", kode));

    // ── Restore stok ──────────────────────────────────────────────────────
    stockItems.forEach((item) => {
      const idx = allKodes.indexOf(item.kode);
      txn.update(stockRefs[idx], {
        stok: increment(item.qty),
        updatedAt: serverTimestamp(),
      });
    });
    lockItems.forEach((item) => {
      const idx = allKodes.indexOf(item.kodeLock);
      const qty = item.qty ?? 1;
      txn.update(stockRefs[idx], {
        stok: increment(qty),
        updatedAt: serverTimestamp(),
      });
    });

    // ── Delete sale document ──────────────────────────────────────────────
    txn.delete(doc(db, "penjualanAksesoris", saleId));
  });

  // Write restore-log entries outside transaction (OK — logs are non-critical)
  const restorePromises = [
    ...stockItems.map((item) =>
      addDoc(collection(db, "stokAksesorisTransaksi"), {
        kode: item.kode,
        nama: item.namaBarang,
        jenis: "tambah",
        jumlah: item.qty,
        kodeTransaksi: saleId,
        tanggal: saleData.tanggal ?? "",
        sales: saleData.salesName ?? "",
        timestamp: serverTimestamp(),
        keterangan: `Restore: hapus transaksi ${saleId}`,
      }),
    ),
    ...lockItems.map((item) =>
      addDoc(collection(db, "stokAksesorisTransaksi"), {
        kode: item.kodeLock,
        nama: `Restore lock untuk ${item.namaBarang}`,
        jenis: "tambah",
        jumlah: item.qty ?? 1,
        kodeTransaksi: saleId,
        tanggal: saleData.tanggal ?? "",
        sales: saleData.salesName ?? "",
        timestamp: serverTimestamp(),
        keterangan: `Restore: hapus transaksi ${saleId}`,
      }),
    ),
  ];
  await Promise.all(restorePromises);
}

/**
 * Fetch all active catalog items (stokAksesoris where isActive==true).
 * @returns {Array}
 */
export async function fetchCatalog() {
  const snap = await getDocs(query(collection(db, "stokAksesoris"), where("isActive", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch single stokAksesoris document by kode (document ID).
 * @param {string} kode
 * @returns {Object|null}
 */
export async function fetchStockItem(kode) {
  const snap = await getDoc(doc(db, "stokAksesoris", kode));
  if (!snap.exists()) return null;
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
export async function fetchTransactions(startDate, endDate, pageLimit = 200, lastDoc = null) {
  const { startAfter } = await import("firebase/firestore");
  const constraints = [
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate),
    orderBy("tanggal", "desc"),
    orderBy("createdAt", "desc"),
    limit(pageLimit),
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, "penjualanAksesoris"), ...constraints));
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
export async function verifySupervisorPassword(inputPassword) {
  const snap = await getDoc(doc(db, "settings", "passwords"));
  if (!snap.exists()) return false;
  return snap.data().supervisorPassword === inputPassword;
}

/**
 * Add stock for one or more items (Tambah Barang).
 * Increments stokAksesoris.stok and writes log entries (jenis: "tambah").
 * @param {Array}  items - [{ kode, nama, jumlah, kategori }]
 * @param {Object} data  - { tanggal: "YYYY-MM-DD", kasir: string }
 */
export async function addStock(items, data) {
  await runTransaction(db, async (txn) => {
    const stockRefs = items.map((item) => doc(db, "stokAksesoris", item.kode));
    const snaps = await Promise.all(stockRefs.map((ref) => txn.get(ref)));

    items.forEach((item, idx) => {
      const snap = snaps[idx];
      if (!snap.exists()) throw new Error(`Barang "${item.kode}" tidak ditemukan di katalog`);
      txn.update(stockRefs[idx], { stok: increment(item.jumlah), updatedAt: serverTimestamp() });

      const logRef = doc(collection(db, "stokAksesorisTransaksi"));
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
 * Process return (increment stock back).
 * Writes log entries (jenis: "return") per item.
 * @param {Array}  items - [{ kode, nama, jumlah, kategori, keterangan }]
 * @param {Object} data  - { tanggal: "YYYY-MM-DD", kasir: string, jenis: "kotak"|"aksesoris"|"silver" }
 */
export async function processReturn(items, data) {
  await runTransaction(db, async (txn) => {
    const stockRefs = items.map((item) => doc(db, "stokAksesoris", item.kode));
    const snaps = await Promise.all(stockRefs.map((ref) => txn.get(ref)));

    items.forEach((item, idx) => {
      const snap = snaps[idx];
      if (!snap.exists()) throw new Error(`Barang "${item.kode}" tidak ditemukan di katalog`);
      txn.update(stockRefs[idx], { stok: increment(item.jumlah), updatedAt: serverTimestamp() });

      const logRef = doc(collection(db, "stokAksesorisTransaksi"));
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
 * Fetch transaction history from stokAksesorisTransaksi.
 * @param {string}      startDate  YYYY-MM-DD
 * @param {string}      endDate    YYYY-MM-DD
 * @param {string|null} jenisFilter  Optional: single jenis value (e.g., "tambah", "return")
 * @returns {Array}
 */
export async function fetchTransactionHistory(startDate, endDate, jenisFilter = null) {
  const snap = await getDocs(
    query(
      collection(db, "stokAksesorisTransaksi"),
      where("tanggal", ">=", startDate),
      where("tanggal", "<=", endDate),
      orderBy("tanggal", "desc"),
      limit(500),
    ),
  );
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return jenisFilter ? docs.filter((d) => d.jenis === jenisFilter) : docs;
}

/**
 * Fetch aggregated stock report for a date range.
 * Returns merged catalog + transaction aggregates.
 * stokAwal is back-calculated: stokAwal = stokAkhir - tambah + laku + free + gantiLock - return
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate   YYYY-MM-DD
 * @returns {Array}
 */
export async function fetchStockReport(startDate, endDate) {
  const [catalogSnap, txSnap] = await Promise.all([
    getDocs(query(collection(db, "stokAksesoris"), where("isActive", "==", true))),
    getDocs(
      query(
        collection(db, "stokAksesorisTransaksi"),
        where("tanggal", ">=", startDate),
        where("tanggal", "<=", endDate),
        orderBy("tanggal", "asc"),
        limit(5000),
      ),
    ),
  ]);

  const catalog = catalogSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Aggregate transactions per kode
  const txByKode = new Map();
  txSnap.docs.forEach((d) => {
    const data = d.data();
    const kode = data.kode;
    if (!txByKode.has(kode)) txByKode.set(kode, { tambah: 0, laku: 0, free: 0, gantiLock: 0, return: 0 });
    const agg = txByKode.get(kode);
    switch (data.jenis) {
      case "tambah":
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

  return catalog.map((item) => {
    const agg = txByKode.get(item.kode) || { tambah: 0, laku: 0, free: 0, gantiLock: 0, return: 0 };
    const stokAkhir = item.stok ?? 0;
    // Back-calculate stok awal from current stock
    const stokAwal = Math.max(0, stokAkhir - agg.tambah + agg.laku + agg.free + agg.gantiLock - agg.return);
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
