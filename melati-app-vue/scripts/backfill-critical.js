#!/usr/bin/env node
/**
 * Backfill critical collections to floor-scoped paths during cutover phase.
 */

import admin from "firebase-admin";
import minimist from "minimist";

const argv = minimist(process.argv.slice(2));

const CRITICAL_COLLECTIONS = [
  { name: "penjualanAksesoris", floorField: "floorId" },
  { name: "stokAksesorisTransaksi", floorField: "floorId" },
  { name: "order_online", floorField: "floorId" },
  { name: "servis", floorField: "floorId" },
  { name: "setting_tema", floorField: "floorId" },
  { name: "antrian_closing_settings", floorField: "floorId" },
];

const collection = argv.collection || argv.c;
const defaultFloor = argv.defaultFloor || argv.d || "L1";
const batchSize = parseInt(argv.batchSize || argv.b || 100, 10);
const dryRun = argv.dryRun || argv["dry-run"] || false;

function normalizeFloor(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (["L1", "L2"].includes(raw)) return raw;
  return defaultFloor;
}

function initFirebase() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: "sistem-antrian-76aa8",
    });
  }
}

async function backfillCollection(collectionConfig) {
  const { name: collectionName, floorField } = collectionConfig;
  let totalCopied = 0;
  let totalSkipped = 0;

  console.log(`\n📦 Backfilling collection: ${collectionName}`);
  console.log(`   Floor field: ${floorField}, Default floor: ${defaultFloor}, Dry run: ${dryRun}`);

  const db = admin.firestore();
  let query = db.collection(collectionName).limit(batchSize);
  let lastDoc = null;

  while (true) {
    if (lastDoc) {
      query = db.collection(collectionName).startAfter(lastDoc).limit(batchSize);
    }

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const data = doc.data();
      const docId = doc.id;

      let floorId = data[floorField];
      if (!floorId && data.floorId) {
        floorId = data.floorId;
      } else if (!floorId) {
        floorId = defaultFloor;
      }

      floorId = normalizeFloor(floorId);
      if (!floorId) {
        console.log(`   ⊘ Skipped ${docId}: could not resolve floor`);
        totalSkipped++;
        continue;
      }

      const destPath = `floors/${floorId}/${collectionName}/${docId}`;

      if (dryRun) {
        console.log(`   [DRY] ${docId} → ${destPath}`);
      } else {
        try {
          await db.doc(destPath).set(data, { merge: true });
          console.log(`   ✓ Copied ${docId} → ${destPath}`);
        } catch (err) {
          console.error(`   ✗ Error copying ${docId}:`, err.message);
          totalSkipped++;
          continue;
        }
      }

      totalCopied++;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
  }

  console.log(`   → Total copied: ${totalCopied}, Skipped: ${totalSkipped}`);
  return totalCopied;
}

async function main() {
  console.log("🔄 Floor Scoped Backfill Script");
  console.log("================================\n");

  initFirebase();

  if (collection) {
    const found = CRITICAL_COLLECTIONS.find((c) => c.name === collection);
    if (!found) {
      console.error(`Collection ${collection} not found in critical list.`);
      process.exit(1);
    }
    await backfillCollection(found);
  } else {
    let totalGlobal = 0;
    for (const cfg of CRITICAL_COLLECTIONS) {
      const count = await backfillCollection(cfg);
      totalGlobal += count;
    }
    console.log(`\n📊 Total backfilled: ${totalGlobal}`);
  }

  console.log(dryRun ? "\n✅ Dry run complete. Review the output above." : "\n✅ Backfill complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Backfill failed", err);
  process.exit(1);
});
