/**
 * Servis Management Service
 * Collection: servis_management
 * Handles reconciliation data between system and physical inventory
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { calculateReconciliationStatus, getSafeQty } from "@/utils/floor-math";

export const DEFAULT_MANAGEMENT_USER = "legacy_admin";

/**
 * Cleanup legacy documents (legacy_supervisor, legacy_adminyoung) in servis_management
 */
export async function cleanupLegacyServisManagementDocs() {
  const targets = ["legacy_supervisor", "legacy_adminyoung"];
  const tipes = ["servis", "custom"];

  for (const userId of targets) {
    try {
      for (const tipe of tipes) {
        const subColRef = collection(db, "servis_management", userId, tipe);
        const snapshot = await getDocs(subColRef);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, "servis_management", userId, tipe, d.id));
        }
      }
      await deleteDoc(doc(db, "servis_management", userId));
      console.log(`[servis_management] Successfully cleaned up legacy document: ${userId}`);
    } catch (e) {
      console.warn(`[servis_management] Cleanup note for ${userId}:`, e?.message || e);
    }
  }
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const managementCache = {
  data: null,
  timestamp: 0,
  lastKey: "",
};

/**
 * Check if cache is still valid
 */
function isCacheValid() {
  return managementCache.data && Date.now() - managementCache.timestamp < CACHE_TTL;
}

/**
 * Get all servis_management documents for user
 * Implements Strategy 1 & 2: Batch query + Local caching
 */
export async function getServisManagementByUser(userId, tipe = null) {
  // Return cached data if valid
  const cacheKey = `${userId}_${tipe || "all"}`;
  if (isCacheValid() && managementCache.lastKey === cacheKey) {
    return managementCache.data;
  }

  try {
    const results = {};
    // Get both servis and custom if tipe is null
    const tipeList = tipe ? [tipe] : ["servis", "custom"];

    for (const t of tipeList) {
      const monthsRef = collection(db, "servis_management", userId, t);
      const snapshot = await getDocs(monthsRef);

      results[t] = snapshot.docs.map((d) => ({
        id: d.id,
        bulan: d.data().bulan,
        tipe: t,
        fisikBarangQty: d.data().fisikBarangQty || 0,
        sistemDataQty: d.data().sistemDataQty || 0,
        status: d.data().status || "pending",
        variance: d.data().variance || 0,
        lastUpdatedBy: d.data().lastUpdatedBy,
        lastUpdatedAt: d.data().lastUpdatedAt,
        updateNotes: d.data().updateNotes,
        history: d.data().history || [],
      }));
    }

    // Cache the results
    managementCache.data = results;
    managementCache.timestamp = Date.now();
    managementCache.lastKey = cacheKey;

    return results;
  } catch (error) {
    console.error("Error fetching servis management data:", error);
    throw error;
  }
}

/**
 * Update fisik barang quantity for a month
 * Implements: Update logic with history tracking
 */
export async function updateFisikBarangQty(userId, tipe, bulan, newQty, notes, currentUser, options = {}) {
  try {
    const docRef = doc(db, "servis_management", userId, tipe, bulan);

    // Get current document
    const docSnap = await getDoc(docRef);
    const currentData = docSnap.data() || {};
    const oldQty = getSafeQty(currentData.fisikBarangQty, 0);
    const fallbackSistemQty = getSafeQty(options?.sistemQty, 0);
    const sistemQty = getSafeQty(currentData.sistemDataQty, fallbackSistemQty);

    // Calculate new status and variance
    const { status: newStatus, variance: newVariance } = calculateReconciliationStatus(newQty, sistemQty);

    // Create history entry
    const historyEntry = {
      timestamp: Timestamp.now(),
      fisikQtyBefore: oldQty,
      fisikQtyAfter: newQty,
      status: newStatus,
      variance: newVariance,
      updatedBy: currentUser || "",
      notes: notes || "",
    };

    // Update document
    await setDoc(docRef, {
      bulan,
      tipe,
      fisikBarangQty: newQty,
      sistemDataQty: sistemQty,
      status: newStatus,
      variance: newVariance,
      lastUpdatedBy: currentUser || "",
      lastUpdatedAt: Timestamp.now(),
      updateNotes: notes,
      history: arrayUnion(historyEntry),
    });

    // Invalidate cache
    managementCache.data = null;

    return {
      success: true,
      status: newStatus,
      variance: newVariance,
    };
  } catch (error) {
    console.error("Error updating fisik barang:", error);
    throw error;
  }
}

/**
 * Get or create servis_management document for month
 * Initialize with sistem count
 */
export async function initializeMonthRecord(userId, tipe, bulan, sistemQty) {
  try {
    const docRef = doc(db, "servis_management", userId, tipe, bulan);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Create new record
      await setDoc(
        docRef,
        {
          bulan,
          tipe,
          fisikBarangQty: 0,
          sistemDataQty: sistemQty,
          status: "pending",
          variance: sistemQty,
          lastUpdatedBy: "system",
          lastUpdatedAt: Timestamp.now(),
          updateNotes: "Auto-initialized",
          history: [
            {
              timestamp: Timestamp.now(),
              fisikQtyBefore: 0,
              fisikQtyAfter: 0,
              status: "pending",
              variance: sistemQty,
              updatedBy: "system",
              notes: "Initial creation from servis data",
            },
          ],
        },
        { merge: true },
      );
    } else {
      // Update sistem count if it changed
      const currentData = docSnap.data();
      if (currentData.sistemDataQty !== sistemQty) {
        const fisikQty = getSafeQty(currentData.fisikBarangQty, 0);
        const { status, variance } = calculateReconciliationStatus(fisikQty, sistemQty);

        await updateDoc(docRef, {
          sistemDataQty: sistemQty,
          status,
          variance,
          lastUpdatedAt: Timestamp.now(),
        });
      }
    }

    // Invalidate cache
    managementCache.data = null;

    return true;
  } catch (error) {
    console.error("Error initializing month record:", error);
    throw error;
  }
}

/**
 * Get history for a month
 * Lazy-loaded from existing data
 */
export function getMonthHistory(managementData, bulan, tipe) {
  if (!managementData[tipe]) return [];

  const monthData = managementData[tipe].find((m) => m.bulan === bulan);
  return monthData?.history || [];
}

/**
 * Format month from bulan string (2025-01) to display format
 */
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

  const [year, month] = bulanStr.split("-");
  return `${months[parseInt(month) - 1]} ${year}`;
}

/**
 * Get last 24 months in YYYY-MM format
 */
export function getLast24Months() {
  const months = [];
  const today = new Date();

  for (let i = 23; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }

  return months;
}

/**
 * Group servis data by month for display
 */
export function groupServisByMonth(servisData) {
  const grouped = {};

  servisData.forEach((item) => {
    // Extract month from tanggal (format: YYYY-MM-DD or similar)
    const tanggal = item.tanggal;
    let bulan;

    if (typeof tanggal === "string") {
      bulan = tanggal.substring(0, 7); // "2025-01"
    } else if (tanggal?.toDate) {
      const date = tanggal.toDate();
      bulan = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!bulan) return;

    if (!grouped[bulan]) {
      grouped[bulan] = {
        bulan,
        count: 0,
        items: [],
      };
    }

    grouped[bulan].count++;
    grouped[bulan].items.push(item);
  });

  return grouped;
}

/**
 * Invalidate cache
 */
export function invalidateCache() {
  managementCache.data = null;
}
