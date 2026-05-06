import { arrayUnion, Timestamp, doc, getDoc, getDocs, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "@/config/firebase";
import { floorSegmentsWithFloorId } from "@/services/floor-scope";
import { calculateReconciliationStatus, getSafeQty } from "@/utils/floor-math";

const CACHE_TTL = 5 * 60 * 1000;
const managementCache = {
  data: null,
  timestamp: 0,
  lastKey: "",
};

function isCacheValid() {
  return managementCache.data && Date.now() - managementCache.timestamp < CACHE_TTL;
}

function getOrderQty(item) {
  const rawQty = Number(item?.jml);
  return Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
}

export async function getOrderOnlineManagementByUser(userId, floorId = "") {
  const cacheKey = `${floorId}_${userId}_orders`;
  if (isCacheValid() && managementCache.lastKey === cacheKey) {
    return managementCache.data;
  }

  const monthsRef = collection(db, ...floorSegmentsWithFloorId(floorId, "order_online_management", userId, "orders"));
  const snapshot = await getDocs(monthsRef);

  const results = {
    orders: snapshot.docs.map((d) => ({
      id: d.id,
      bulan: d.data().bulan,
      fisikBarangQty: d.data().fisikBarangQty || 0,
      sistemDataQty: d.data().sistemDataQty || 0,
      status: d.data().status || "pending",
      variance: d.data().variance || 0,
      lastUpdatedBy: d.data().lastUpdatedBy || "",
      lastUpdatedAt: d.data().lastUpdatedAt || null,
      updateNotes: d.data().updateNotes || "",
      history: d.data().history || [],
    })),
  };

  managementCache.data = results;
  managementCache.timestamp = Date.now();
  managementCache.lastKey = cacheKey;

  return results;
}

export async function initializeOrderMonthRecord(userId, bulan, sistemQty, floorId = "") {
  const safeSistemQty = getSafeQty(sistemQty, 0);
  const docRef = doc(db, ...floorSegmentsWithFloorId(floorId, "order_online_management", userId, "orders", bulan));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    await setDoc(
      docRef,
      {
        bulan,
        fisikBarangQty: 0,
        sistemDataQty: safeSistemQty,
        status: "pending",
        variance: -safeSistemQty,
        lastUpdatedBy: "system",
        lastUpdatedAt: Timestamp.now(),
        updateNotes: "Auto-initialized",
        history: [
          {
            timestamp: Timestamp.now(),
            fisikQtyBefore: 0,
            fisikQtyAfter: 0,
            status: "pending",
            variance: -safeSistemQty,
            updatedBy: "system",
            notes: "Initial creation from order online data",
          },
        ],
      },
      { merge: true },
    );
  } else {
    const currentData = docSnap.data() || {};
    const currentSistemQty = getSafeQty(currentData.sistemDataQty, 0);
    if (currentSistemQty !== safeSistemQty) {
      const fisikQty = getSafeQty(currentData.fisikBarangQty, 0);
      const { status, variance } = calculateReconciliationStatus(fisikQty, safeSistemQty);

      await updateDoc(docRef, {
        sistemDataQty: safeSistemQty,
        status,
        variance,
        lastUpdatedAt: Timestamp.now(),
      });
    }
  }

  managementCache.data = null;
  return true;
}

export async function updateOrderFisikBarangQty(userId, bulan, newQty, notes, currentUser, options = {}, floorId = "") {
  const safeNewQty = Number.isFinite(Number(newQty)) ? Number(newQty) : 0;
  const docRef = doc(db, ...floorSegmentsWithFloorId(floorId, "order_online_management", userId, "orders", bulan));
  const docSnap = await getDoc(docRef);
  const currentData = docSnap.data() || {};

  const oldQty = getSafeQty(currentData.fisikBarangQty, 0);
  const fallbackSistemQty = getSafeQty(options?.sistemQty, 0);
  const sistemQty = getSafeQty(currentData.sistemDataQty, fallbackSistemQty);

  const { status: newStatus, variance: newVariance } = calculateReconciliationStatus(safeNewQty, sistemQty);
  const historyEntry = {
    timestamp: Timestamp.now(),
    fisikQtyBefore: oldQty,
    fisikQtyAfter: safeNewQty,
    status: newStatus,
    variance: newVariance,
    updatedBy: currentUser || "",
    notes: notes || "",
  };

  await setDoc(
    docRef,
    {
      bulan,
      fisikBarangQty: safeNewQty,
      sistemDataQty: sistemQty,
      status: newStatus,
      variance: newVariance,
      lastUpdatedBy: currentUser || "",
      lastUpdatedAt: Timestamp.now(),
      updateNotes: notes || "",
      history: arrayUnion(historyEntry),
    },
    { merge: true },
  );

  managementCache.data = null;
  return { success: true, status: newStatus, variance: newVariance };
}

export function groupOrderByMonth(orderData = [], options = {}) {
  const statusFilter = options.statusPengambilan || "";
  const grouped = {};

  orderData.forEach((item) => {
    if (statusFilter && item?.statusPengambilan !== statusFilter) return;

    const tanggal = item?.tanggal;
    let bulan = "";
    if (typeof tanggal === "string" && tanggal.length >= 7) {
      bulan = tanggal.slice(0, 7);
    } else if (tanggal?.toDate) {
      const date = tanggal.toDate();
      bulan = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!bulan) return;
    if (!grouped[bulan]) {
      grouped[bulan] = { bulan, qty: 0, items: [] };
    }

    const qty = getOrderQty(item);
    grouped[bulan].qty += qty;
    grouped[bulan].items.push(item);
  });

  return grouped;
}

export function formatBulan(bulanStr) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const [year, month] = String(bulanStr || "").split("-");
  const monthIndex = Number(month) - 1;
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return bulanStr || "-";
  return `${months[monthIndex]} ${year}`;
}
