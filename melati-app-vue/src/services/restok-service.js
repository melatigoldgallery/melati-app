/**
 * Restok Barang Service
 * Collection: restokBarang
 */
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { floorCollection, floorDoc } from "./floor-scope";

export const JENIS_OPTIONS = ["KALUNG", "LIONTIN", "ANTING", "CINCIN", "GELANG", "GIWANG"];

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetch restok items for a given month string (YYYY-MM).
 * @param {string} monthStr - e.g. "2024-06"
 * @returns {Array}
 */
export async function fetchRestokByMonth(monthStr, floorId = "") {
  const [year, month] = monthStr.split("-");
  const start = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  const q = query(
    floorCollection(db, "restokBarang", floorId),
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
export async function addRestokItems(rows, tanggal, floorId = "") {
  await Promise.all(
    rows.map((row) =>
      (() => {
        const floorRef = doc(floorCollection(db, "restokBarang", floorId));
        return setDoc(
          floorRef,
          {
            tanggal,
            jenis: row.jenis,
            nama: row.nama,
            kadar: row.kadar || "",
            berat: row.berat || "",
            panjang: row.panjang || "",
            status: "perlu",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      })(),
    ),
  );
}

/**
 * Update restok status to "perlu" or "sudah".
 * Sets tanggalRestok automatically when status becomes "sudah".
 * @param {string} id
 * @param {string} newStatus
 * @param {string} floorId
 */
export async function updateRestokStatus(id, newStatus, floorId = "") {
  const updateData = { status: newStatus, updatedAt: serverTimestamp() };
  if (newStatus === "sudah") {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    updateData.tanggalRestok = `${yyyy}-${mm}-${dd}`;
  }
  const floorRef = floorDoc(db, "restokBarang", id, floorId);
  await updateDoc(floorRef, updateData);
}

/**
 * Update restok item data fields.
 * @param {string} id
 * @param {Object} data - partial fields to update
 */
export async function updateRestokItem(id, data, floorId = "") {
  const floorRef = floorDoc(db, "restokBarang", id, floorId);
  await updateDoc(floorRef, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Delete a restok item permanently.
 * @param {string} id
 */
export async function deleteRestokItem(id, floorId = "") {
  const floorRef = floorDoc(db, "restokBarang", id, floorId);
  await deleteDoc(floorRef);
}

/**
 * Get supplier WhatsApp phone from settings/whatsapp.
 * @returns {string}
 */
export async function getSupplierPhone(floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "whatsapp", floorId));
  return snap.exists() ? snap.data().supplierPhone || "" : "";
}
