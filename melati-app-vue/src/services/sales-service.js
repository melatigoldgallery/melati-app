/**
 * Sales Service — Kelola Sales Staff
 * CRUD operations for the salesStaff Firestore collection (floor-scoped).
 */
import { getDocs, doc, query, orderBy, serverTimestamp, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { floorCollection, floorDoc } from "./floor-scope";

const COLLECTION_NAME = "salesStaff";

/**
 * Fetch all sales staff ordered by name.
 * @returns {Array}
 */
export async function fetchSalesList() {
  const snap = await getDocs(query(floorCollection(db, COLLECTION_NAME), orderBy("nama", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add new sales staff.
 * @param {{ nama: string, status: "active"|"inactive" }} data
 * @returns {string} new document ID
 */
export async function addSalesStaff(data) {
  const floorRef = doc(floorCollection(db, COLLECTION_NAME));
  await setDoc(
    floorRef,
    {
      nama: data.nama.toUpperCase().trim(),
      status: data.status || "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return floorRef.id;
}

/**
 * Update sales staff.
 * @param {string} id
 * @param {{ nama: string, status: string }} data
 */
export async function updateSalesStaff(id, data) {
  const floorRef = floorDoc(db, COLLECTION_NAME, id);
  await updateDoc(floorRef, {
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
  const floorRef = floorDoc(db, COLLECTION_NAME, id);
  await deleteDoc(floorRef);
}
