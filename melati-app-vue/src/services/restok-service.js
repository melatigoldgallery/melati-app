/**
 * Restok Barang Service
 * Collection: restokBarang
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";

export const JENIS_OPTIONS = ["KALUNG", "LIONTIN", "ANTING", "CINCIN", "GELANG", "GIWANG"];

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetch restok items for a given month string (YYYY-MM).
 * @param {string} monthStr - e.g. "2024-06"
 * @returns {Array}
 */
export async function fetchRestokByMonth(monthStr) {
  const [year, month] = monthStr.split("-");
  const start = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  const q = query(
    collection(db, "restokBarang"),
    where("tanggal", ">=", start),
    where("tanggal", "<=", end),
    orderBy("tanggal", "desc"),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Mutations ─────────────────────────────────────────────────────────────

/**
 * Add multiple restok order rows in one batch.
 * @param {Array}  rows    - [{ jenis, nama, kadar, berat, panjang }]
 * @param {string} tanggal - YYYY-MM-DD
 */
export async function addRestokItems(rows, tanggal) {
  await Promise.all(
    rows.map((row) =>
      addDoc(collection(db, "restokBarang"), {
        tanggal,
        jenis: row.jenis,
        nama: row.nama,
        kadar: row.kadar || "",
        berat: row.berat || "",
        panjang: row.panjang || "",
        status: "perlu",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

/**
 * Update restok status to "perlu" or "sudah".
 * Sets tanggalRestok automatically when status becomes "sudah".
 * @param {string} id
 * @param {string} newStatus
 */
export async function updateRestokStatus(id, newStatus) {
  const updateData = { status: newStatus, updatedAt: serverTimestamp() };
  if (newStatus === "sudah") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    updateData.tanggalRestok = `${yyyy}-${mm}-${dd}`;
  }
  await updateDoc(doc(db, "restokBarang", id), updateData);
}

/**
 * Update restok item data fields.
 * @param {string} id
 * @param {Object} data - partial fields to update
 */
export async function updateRestokItem(id, data) {
  await updateDoc(doc(db, "restokBarang", id), { ...data, updatedAt: serverTimestamp() });
}

/**
 * Delete a restok item permanently.
 * @param {string} id
 */
export async function deleteRestokItem(id) {
  await deleteDoc(doc(db, "restokBarang", id));
}

/**
 * Get supplier WhatsApp phone from settings/whatsapp.
 * @returns {string}
 */
export async function getSupplierPhone() {
  const snap = await getDoc(doc(db, "settings", "whatsapp"));
  return snap.exists() ? snap.data().supplierPhone || "" : "";
}
