/**
 * Sales Service — Kelola Sales Staff
 * CRUD operations for the salesStaff Firestore collection.
 */
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";

/**
 * Fetch all sales staff ordered by name.
 * @returns {Array}
 */
export async function fetchSalesList() {
  const snap = await getDocs(query(collection(db, "salesStaff"), orderBy("nama", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add new sales staff.
 * @param {{ nama: string, status: "active"|"inactive" }} data
 * @returns {string} new document ID
 */
export async function addSalesStaff(data) {
  const ref = await addDoc(collection(db, "salesStaff"), {
    nama: data.nama.toUpperCase().trim(),
    status: data.status || "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update sales staff.
 * @param {string} id
 * @param {{ nama: string, status: string }} data
 */
export async function updateSalesStaff(id, data) {
  await updateDoc(doc(db, "salesStaff", id), {
    nama: data.nama.toUpperCase().trim(),
    status: data.status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete sales staff.
 * @param {string} id
 */
export async function deleteSalesStaff(id) {
  await deleteDoc(doc(db, "salesStaff", id));
}
