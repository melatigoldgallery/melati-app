import fs from "node:fs";
import admin from "firebase-admin";
import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  boolean: ["apply", "dry-run", "replace"],
  string: ["serviceAccount", "projectId", "floorId"],
  default: {
    "dry-run": false,
    floorId: "L1",
  },
});

const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = args.projectId;
const floorId =
  String(args.floorId || "L1")
    .trim()
    .toUpperCase() || "L1";
const applyChanges = Boolean(args.apply);
const dryRun = Boolean(args["dry-run"]);
const replaceTarget = Boolean(args.replace);

// 22 global collections to copy
const globalCollections = [
  "attendance",
  "leaveRequests",
  "latePermissionCodes",
  "manualOvertime",
  "dailyStockSnapshot",
  "daily_stock_logs",
  "daily_stock_reports",
  "employeeFaces",
  "employees",
  "mutasiKode",
  "orderBarang",
  "order_online",
  "order_online_management",
  "penjualanAksesoris",
  "restokBarang",
  "salesStaff",
  "settings",
  "stocks",
  "stokAksesoris",
  "stokAksesorisTransaksi",
];

if (!serviceAccountPath) {
  console.error("Missing service account JSON. Provide --serviceAccount <path> or set GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

let serviceAccount = null;
try {
  const raw = fs.readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error("Failed to read service account JSON:", err.message || err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: projectId || serviceAccount.project_id,
});

const db = admin.firestore();

async function copyCollectionRecursive(sourceRef, destRef, label, visited = new Set()) {
  if (visited.has(sourceRef.path)) return 0;
  visited.add(sourceRef.path);

  const snap = await sourceRef.get();
  if (snap.empty) {
    console.log(`  └─ No documents found in ${label}.`);
    return 0;
  }

  console.log(`  ├─ Found ${snap.size} documents in ${label}.`);

  if (!applyChanges || dryRun) {
    console.log(`  │  └─ [DRY RUN] Would copy to ${destRef.path}`);
    return snap.size;
  }

  const batchSize = 400;
  let copied = 0;

  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = snap.docs.slice(i, i + batchSize);

    for (const docSnap of chunk) {
      batch.set(destRef.doc(docSnap.id), docSnap.data(), { merge: true });
    }

    await batch.commit();
    copied += chunk.length;
    console.log(`  │  ├─ Copied ${copied}/${snap.size} docs...`);
  }

  // Handle subcollections recursively
  for (const docSnap of snap.docs) {
    const childCollections = await docSnap.ref.listCollections();
    for (const childCollection of childCollections) {
      const childLabel = `${label}/${docSnap.id}/${childCollection.id}`;
      const childSourcePath = childCollection.path;
      if (visited.has(childSourcePath)) continue;

      const childDestRef = destRef.doc(docSnap.id).collection(childCollection.id);
      // eslint-disable-next-line no-await-in-loop
      await copyCollectionRecursive(childCollection, childDestRef, childLabel, visited);
    }
  }

  return copied;
}

async function clearDestinationCollection(collectionRef, collectionName) {
  if (!applyChanges || dryRun) {
    console.log(`  │  └─ [DRY RUN] Would clear floors/${floorId}/${collectionName} before copy`);
    return;
  }

  console.log(`  │  └─ Clearing floors/${floorId}/${collectionName} before copy...`);
  await db.recursiveDelete(collectionRef);
  console.log(`  │  └─ Cleared floors/${floorId}/${collectionName}`);
}

async function main() {
  console.log("🔄 Copy Global Collections to Floor-Scoped Path\n");
  console.log(`📍 Target: floors/${floorId}`);
  console.log(
    `⚙️  Mode: ${dryRun ? "DRY RUN (no changes)" : applyChanges ? "APPLY (write data)" : "DRY RUN (default)"}`,
  );
  console.log(`🔁 Replace target first: ${replaceTarget ? "yes" : "no"}`);
  console.log(`📦 Collections to copy: ${globalCollections.length}\n`);

  const startTime = Date.now();
  const stats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    collections: {},
  };

  for (const collectionName of globalCollections) {
    try {
      console.log(`📚 ${collectionName}`);
      const sourceRef = db.collection(collectionName);
      const destRef = db.collection("floors").doc(floorId).collection(collectionName);

      if (replaceTarget) {
        await clearDestinationCollection(destRef, collectionName);
      }

      const copied = await copyCollectionRecursive(sourceRef, destRef, collectionName);

      stats.collections[collectionName] = { status: "✅ success", count: copied };
      stats.succeeded++;
      stats.total += copied;
      console.log(`  └─ ✅ Completed: ${copied} root documents\n`);
    } catch (err) {
      console.error(`  └─ ❌ Failed: ${err.message || err}\n`);
      stats.collections[collectionName] = { status: "❌ failed", error: err.message };
      stats.failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📦 Total documents copied: ${stats.total}`);
  console.log(`✅ Successful collections: ${stats.succeeded}/${globalCollections.length}`);
  console.log(`❌ Failed collections: ${stats.failed}/${globalCollections.length}`);
  console.log(`🎯 Target path: floors/${floorId}/*`);
  console.log("=".repeat(60));

  if (dryRun) {
    console.log("\n💡 This was a DRY RUN. Re-run with --apply to write data.");
  }

  if (stats.failed > 0) {
    console.log("\n⚠️  Some collections failed. Check errors above.");
    process.exit(1);
  }

  console.log("\n✨ Copy operation complete!");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message || err);
  process.exit(1);
});
