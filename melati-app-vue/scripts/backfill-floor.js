#!/usr/bin/env node
/*
  Backfill legacy Firestore collection into floors/{floorId}/{collection}/{docId}

  Usage:
    node scripts/backfill-floor.js --collection=users --floorField=floor --defaultFloor=Lt%201 --batchSize=500 --dryRun

  Requirements:
    - Install dependencies: npm i firebase-admin minimist
    - Provide credentials via GOOGLE_APPLICATION_CREDENTIALS env or set FIREBASE_SERVICE_ACCOUNT to a service-account JSON path.
*/

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const argv = require("minimist")(process.argv.slice(2));

const collection = argv.collection || argv.c;
const floorField = argv.floorField || argv.f || "floor";
const defaultFloor = argv.defaultFloor || argv.d || "";
const dryRun = argv.dryRun || argv["dry-run"] || false;
const batchSize = parseInt(argv.batchSize || argv.b || 500, 10);

if (!collection) {
  console.error("Missing --collection argument. Example: --collection=users");
  process.exit(1);
}

function initFirebase() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    // Use default credentials (GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
  }
}

initFirebase();
const db = admin.firestore();

async function processBatch(startAfterId) {
  let q = db.collection(collection).orderBy(admin.firestore.FieldPath.documentId()).limit(batchSize);
  if (startAfterId) q = q.startAfter(startAfterId);

  const snap = await q.get();
  if (snap.empty) return null;

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;
    const maybeFloor = data[floorField];
    const floorId = maybeFloor || defaultFloor;

    if (!floorId) {
      console.warn(`Skipping ${id}: no '${floorField}' field and no --defaultFloor provided`);
      continue;
    }

    const destPath = `floors/${floorId}/${collection}/${id}`;
    if (dryRun) {
      console.log(`[dry] ${id} -> ${destPath}`);
    } else {
      await db.doc(destPath).set(data, { merge: true });
      console.log(`Copied ${id} -> ${destPath}`);
    }
  }

  return snap.docs[snap.docs.length - 1].id;
}

(async () => {
  console.log(
    `Starting backfill: collection='${collection}' floorField='${floorField}' defaultFloor='${defaultFloor}' dryRun=${dryRun} batchSize=${batchSize}`,
  );
  let cursor = argv.startAfter || null;
  let processed = 0;

  while (true) {
    const lastId = await processBatch(cursor);
    if (!lastId) break;
    cursor = lastId;
    processed += batchSize;
  }

  console.log("Backfill complete");
  process.exit(0);
})().catch((err) => {
  console.error("Backfill failed", err);
  process.exit(1);
});
