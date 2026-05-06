/**
 * Migration Verification Utility
 * Verify that legacy collections have been properly migrated to floors/{floorId}
 * Strategy B: Compare legacy vs floors/L1, ensure counts match, keep legacy as backup
 */

import {
  collection,
  getDocs,
  query,
  limit,
  getDoc,
  doc,
  writeBatch,
  orderBy,
  startAfter,
  documentId,
  setDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";

export const MIGRATION_TARGETS = {
  manualOvertime: { sourceCollections: ["manualOvertime"] },
  mutasiKode: { sourceCollections: ["mutasiKode"] },
  orderBarang: { sourceCollections: ["orderBarang"] },
  order_online: { sourceCollections: ["order_online"] },
  order_online_management: { sourceCollections: ["order_online_management"] },
  penjualanAksesoris: { sourceCollections: ["penjualanAksesoris"] },
  restokBarang: { sourceCollections: ["restokBarang"] },
  salesStaff: { sourceCollections: ["salesStaff"] },
  servis: { sourceCollections: ["servis"] },
  servis_management: { sourceCollections: ["servis_management"] },
  settings: { sourceCollections: ["settings"] },
  stocks: { sourceCollections: ["stocks"] },
  stokAksesoris: { sourceCollections: ["stokAksesoris"] },
  stokAksesorisTransaksi: { sourceCollections: ["stokAksesorisTransaksi", "stokSksesorisTransaksi"] },
  systemLocks: { sourceCollections: ["systemLocks"] },
  users: { sourceCollections: ["users"] },
  attendance: { sourceCollections: ["attendance"] },
  dailyStockSnapshot: { sourceCollections: ["dailyStockSnapshot"] },
  daily_stock_reports: { sourceCollections: ["daily_stock_reports"] },
  employeeFaces: { sourceCollections: ["employeeFaces"] },
  employees: { sourceCollections: ["employees"] },
  kodeAksesoris: { sourceCollections: ["kodeAksesoris"] },
  latePermissionCodes: { sourceCollections: ["latePermissionCodes"] },
  leaveRequests: { sourceCollections: ["leaveRequests", "leaveRequest"] },
  maintenanceLogs: { sourceCollections: ["maintenanceLogs"] },
};

export const MIGRATION_COLLECTIONS = Object.keys(MIGRATION_TARGETS);

function getTargetConfig(collectionName) {
  return MIGRATION_TARGETS[collectionName] || { sourceCollections: [collectionName] };
}

async function countSourceCollectionDocs(sourceCollections) {
  const refsMap = new Map();
  for (const sourceCollectionName of sourceCollections) {
    const snap = await getDocs(collection(db, sourceCollectionName));
    snap.docs.forEach((d) => {
      refsMap.set(d.ref.path, d.ref);
    });
  }
  return refsMap.size;
}

export const SUBCOLLECTION_CONFIG = {
  order_online: ["items"],
  servis: ["servis_items", "servis_parts"],
};

/**
 * Count documents in a collection
 */
async function countCollectionDocs(collectionRef) {
  try {
    const snap = await getDocs(collectionRef);
    return snap.size;
  } catch (err) {
    console.error("Count error:", err.message);
    return -1;
  }
}

/**
 * Verify single collection migration
 */
export async function verifyCollectionMigration(collectionName, floorId = "L1") {
  try {
    const config = getTargetConfig(collectionName);
    const legacyCount = await countSourceCollectionDocs(config.sourceCollections);
    const floorRef = collection(db, "floors", floorId, collectionName);

    const floorCount = await countCollectionDocs(floorRef);

    const matched = legacyCount === floorCount && legacyCount >= 0;

    return {
      collection: collectionName,
      sourceCollections: config.sourceCollections,
      legacyCount,
      floorCount,
      matched,
      status: matched ? "✅ OK" : "❌ MISMATCH",
      migrationRatio: legacyCount > 0 ? `${Math.round((floorCount / legacyCount) * 100)}%` : "N/A",
    };
  } catch (err) {
    return {
      collection: collectionName,
      legacyCount: -1,
      floorCount: -1,
      matched: false,
      status: "❌ ERROR",
      error: err.message,
    };
  }
}

/**
 * Verify all collections migration
 */
export async function verifyAllMigrations(floorId = "L1", collections = MIGRATION_COLLECTIONS) {
  const results = [];
  let totalLegacy = 0;
  let totalFloor = 0;
  let totalMatched = 0;

  console.log(`\n🔍 Migration Verification Report (Floor: ${floorId})\n`);
  console.log("Collection Name | Legacy Count | Floor Count | Match? | Migration %");
  console.log("─".repeat(80));

  for (const collectionName of collections) {
    // eslint-disable-next-line no-await-in-loop
    const result = await verifyCollectionMigration(collectionName, floorId);
    results.push(result);

    totalLegacy += result.legacyCount;
    totalFloor += result.floorCount;
    if (result.matched) totalMatched += 1;

    const legacyStr = result.legacyCount.toString().padEnd(12);
    const floorStr = result.floorCount.toString().padEnd(11);
    const matchStr = result.matched ? "✅" : "❌";
    const ratioStr = result.migrationRatio.padEnd(12);

    console.log(`${result.collection.padEnd(16)} | ${legacyStr} | ${floorStr} | ${matchStr} | ${ratioStr}`);
  }

  console.log("─".repeat(80));
  console.log(
    `Total: ${results.length} collections | ${totalLegacy} legacy | ${totalFloor} floor | ${totalMatched} matched\n`,
  );

  return {
    summary: {
      floorId,
      totalCollections: results.length,
      totalMatched,
      totalLegacyDocs: totalLegacy,
      totalFloorDocs: totalFloor,
      overallMatch: totalMatched === results.length && totalLegacy === totalFloor,
      verifiedAt: new Date().toISOString(),
    },
    details: results,
  };
}

/**
 * Spot check: Get first N docs from legacy and floor for manual comparison
 */
export async function spotCheckCollection(collectionName, floorId = "L1", sampleSize = 5) {
  try {
    const legacyRef = collection(db, collectionName);
    const floorRef = collection(db, "floors", floorId, collectionName);

    const legacySnap = await getDocs(query(legacyRef, limit(sampleSize)));
    const floorSnap = await getDocs(query(floorRef, limit(sampleSize)));

    const legacySamples = legacySnap.docs.map((d) => ({
      id: d.id,
      data: d.data(),
    }));

    const floorSamples = floorSnap.docs.map((d) => ({
      id: d.id,
      data: d.data(),
    }));

    return {
      collection: collectionName,
      legacySampleCount: legacySamples.length,
      floorSampleCount: floorSamples.length,
      legacySamples,
      floorSamples,
      docIdsMatched: legacySamples.every((lDoc) => floorSamples.some((fDoc) => fDoc.id === lDoc.id)),
    };
  } catch (err) {
    return {
      collection: collectionName,
      error: err.message,
    };
  }
}

/**
 * Check if a specific document exists in both legacy and floor paths
 */
export async function checkDocumentMigration(collectionName, docId, floorId = "L1") {
  try {
    const legacyDocRef = doc(db, collectionName, docId);
    const floorDocRef = doc(db, "floors", floorId, collectionName, docId);

    const legacySnap = await getDoc(legacyDocRef);
    const floorSnap = await getDoc(floorDocRef);

    return {
      collection: collectionName,
      docId,
      legacyExists: legacySnap.exists(),
      floorExists: floorSnap.exists(),
      bothExist: legacySnap.exists() && floorSnap.exists(),
      dataMatches:
        legacySnap.exists() &&
        floorSnap.exists() &&
        JSON.stringify(legacySnap.data()) === JSON.stringify(floorSnap.data()),
    };
  } catch (err) {
    return {
      collection: collectionName,
      docId,
      error: err.message,
    };
  }
}

/**
 * Console helper: Pretty print verification report
 */
export function printMigrationReport(report) {
  const { summary, details } = report;

  console.log("\n📊 MIGRATION VERIFICATION REPORT");
  console.log("═".repeat(80));
  console.log(`Floor: ${summary.floorId}`);
  console.log(`Collections: ${summary.totalCollections}`);
  console.log(`Matched: ${summary.totalMatched}/${summary.totalCollections}`);
  console.log(`Legacy Docs: ${summary.totalLegacyDocs}`);
  console.log(`Floor Docs: ${summary.totalFloorDocs}`);
  console.log(`Status: ${summary.overallMatch ? "✅ MIGRATION SUCCESS" : "❌ MIGRATION INCOMPLETE"}`);
  console.log(`Verified: ${summary.verifiedAt}`);
  console.log("═".repeat(80));

  if (!summary.overallMatch) {
    console.log("\n⚠️  MISMATCHES DETECTED:");
    details.forEach((d) => {
      if (!d.matched) {
        console.log(`   - ${d.collection}: ${d.legacyCount} (legacy) vs ${d.floorCount} (floor)`);
      }
    });
  }

  console.log("");
}

/**
 * Export report as JSON
 */
export async function exportMigrationReport(floorId = "L1") {
  const report = await verifyAllMigrations(floorId);
  const json = JSON.stringify(report, null, 2);
  console.log(json);
  return report;
}

/**
 * Find docs that exist in legacy but not in floor-scoped path
 */
export async function findMissingDocs(collectionName, sourceCollections, floorId = "L1") {
  const missing = [];

  for (const sourceCol of sourceCollections) {
    const snap = await getDocs(collection(db, sourceCol));
    for (const sourceDoc of snap.docs) {
      const floorDocRef = doc(db, "floors", floorId, collectionName, sourceDoc.id);
      const floorDocSnap = await getDoc(floorDocRef);
      if (!floorDocSnap.exists()) {
        missing.push({
          collection: collectionName,
          sourceCollection: sourceCol,
          docId: sourceDoc.id,
          sourceDataKeys: Object.keys(sourceDoc.data()),
        });
      }
    }
  }

  return missing;
}

/**
 * Get sample user structure from legacy or floor collection
 */
export async function getSampleUserStructure(sourceCollection = "users") {
  try {
    const snap = await getDocs(collection(db, sourceCollection));
    if (!snap.empty) {
      return {
        docId: snap.docs[0].id,
        data: snap.docs[0].data(),
      };
    }
    return null;
  } catch (err) {
    console.error("Error getting sample user:", err);
    return null;
  }
}

/**
 * SHA256 hash for password (matching Cloud Function logic)
 */
export function sha256Hex(value) {
  // Browser-compatible SHA256 using SubtleCrypto
  return (async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(value));
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  })();
}

/**
 * Create user supervisor for a floor with hashed password and full access
 */
export async function createFloorSupervisor(floorId, username = "supervisor", plainPassword = "spvmlt116") {
  try {
    const userId = `${floorId}_${username}`;

    // Generate password hash (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(plainPassword);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Full page access for supervisor
    const pagesAccess = {
      "antrian/admin": true,
      "antrian/display": true,
      "absensi/kehadiran": true,
      "absensi/laporan": true,
      "servis/input": true,
      "servis/data": true,
      "servis/laporan": true,
      "order-online/terima": true,
      "order-online/laporan": true,
      "aksesoris/penjualan": true,
      "aksesoris/laporan-penjualan": true,
      "inventory/manajemen": true,
      "inventory/mutasi": true,
      "inventory/laporan": true,
      "promosi/buat": true,
      "promosi/laporan": true,
      "pengaturan/general": true,
      "pengaturan/users": true,
      "pengaturan/roles": true,
    };

    const userData = {
      username,
      passwordHash,
      floorId,
      role: "supervisor",
      active: true,
      status: "active",
      email: `${username}@melati-${floorId.toLowerCase()}.local`,
      displayName: `Supervisor ${floorId}`,
      name: `Supervisor ${floorId}`,
      pagesAccess,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userRef = doc(db, "floors", floorId, "users", userId);
    await setDoc(userRef, userData, { merge: false });

    return {
      success: true,
      userId,
      message: `Supervisor created for ${floorId} with password hash`,
    };
  } catch (err) {
    console.error("Error creating supervisor:", err);
    throw err;
  }
}

/**
 * Re-migrate collection with full overwrite (not merge) for consistency
 */
export async function remigrationFull(collectionName, sourceCollections, floorId = "L1", batchSize = 300) {
  const targetBasePath = `floors/${floorId}/${collectionName}`;
  let totalWritten = 0;
  let batches = 0;

  for (const sourceCollectionName of sourceCollections) {
    let lastDoc = null;

    while (true) {
      const constraints = [orderBy(documentId()), limit(batchSize)];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));

      const snap = await getDocs(query(collection(db, sourceCollectionName), ...constraints));
      if (snap.empty) break;

      const batch = writeBatch(db);
      for (const sourceDoc of snap.docs) {
        batch.set(doc(db, targetBasePath, sourceDoc.id), sourceDoc.data());
        totalWritten += 1;
      }
      await batch.commit();
      batches += 1;
      lastDoc = snap.docs[snap.docs.length - 1];

      if (snap.size < batchSize) break;
    }
  }

  return { collectionName, floorId, totalWritten, batches };
}

/**
 * Client-side migration helper for large collections.
 */
export async function migrateCollectionClientSide(collectionName, floorId = "L1", batchSize = 200) {
  const sourceCollections = getTargetConfig(collectionName).sourceCollections;
  const targetRef = collection(db, "floors", floorId, collectionName);
  let totalWritten = 0;
  let batches = 0;

  for (const sourceCollectionName of sourceCollections) {
    let lastDoc = null;

    while (true) {
      const constraints = [orderBy(documentId()), limit(batchSize)];
      if (lastDoc) constraints.splice(1, 0, startAfter(lastDoc));

      const snap = await getDocs(query(collection(db, sourceCollectionName), ...constraints));
      if (snap.empty) break;

      const batch = writeBatch(db);
      for (const sourceDoc of snap.docs) {
        batch.set(doc(targetRef, sourceDoc.id), sourceDoc.data(), { merge: true });
        totalWritten += 1;
      }
      await batch.commit();
      batches += 1;
      lastDoc = snap.docs[snap.docs.length - 1];

      if (snap.size < batchSize) break;
    }
  }

  return {
    collection: collectionName,
    floorId,
    sourceCollections,
    totalWritten,
    batches,
  };
}
