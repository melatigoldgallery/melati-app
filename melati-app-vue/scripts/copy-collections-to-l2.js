import fs from "node:fs";
import admin from "firebase-admin";
import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  boolean: ["apply", "dry-run"],
  string: ["sourceServiceAccount", "destServiceAccount", "sourceProjectId", "destProjectId", "collections", "floorId"],
  default: {
    floorId: "L2",
    collections:
      "dailyStockSnapshot,daily_stock_logs,daily_stock_reports,kodeAksesoris,mutasiKode,penjualanAksesoris,stocks,stokAksesoris,stokAksesorisTransaksi,stokSksesorisTransaksi",
    "dry-run": false,
  },
});

const floorId = String(args.floorId || "L2").trim() || "L2";
const requestedCollections = String(args.collections || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const applyChanges = Boolean(args.apply);
const dryRun = Boolean(args["dry-run"]);
const sourceServiceAccountPath = args.sourceServiceAccount;
const destServiceAccountPath = args.destServiceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!sourceServiceAccountPath) {
  console.error("Missing source service account JSON. Provide --sourceServiceAccount <path>.");
  process.exit(1);
}

if (!destServiceAccountPath) {
  console.error(
    "Missing destination service account JSON. Provide --destServiceAccount <path> or set GOOGLE_APPLICATION_CREDENTIALS.",
  );
  process.exit(1);
}

function readServiceAccount(serviceAccountPath, label) {
  try {
    const raw = fs.readFileSync(serviceAccountPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${label} service account JSON:`, err.message || err);
    process.exit(1);
  }
}

const sourceServiceAccount = readServiceAccount(sourceServiceAccountPath, "source");
const destServiceAccount = readServiceAccount(destServiceAccountPath, "destination");

const sourceApp = admin.initializeApp(
  {
    credential: admin.credential.cert(sourceServiceAccount),
    projectId: args.sourceProjectId || sourceServiceAccount.project_id,
  },
  "source-app",
);

const destApp = admin.initializeApp(
  {
    credential: admin.credential.cert(destServiceAccount),
    projectId: args.destProjectId || destServiceAccount.project_id,
  },
  "dest-app",
);

const sourceDb = sourceApp.firestore();
const destDb = destApp.firestore();

const COLLECTION_ALIASES = {
  stokSksesorisTransaksi: "stokAksesorisTransaksi",
};

function resolveSourceCollectionName(requestedName) {
  return requestedCollections.find((item) => item.toLowerCase() === requestedName.toLowerCase()) || requestedName;
}

function resolveDestinationCollectionName(sourceName) {
  return COLLECTION_ALIASES[sourceName] || sourceName;
}

function buildCollectionPairs(collectionNames) {
  return collectionNames.map((name) => {
    const sourceName = resolveSourceCollectionName(name);
    const destinationName = resolveDestinationCollectionName(sourceName);
    return { sourceName, destinationName };
  });
}

function destCollection(collectionName) {
  return destDb.collection("floors").doc(floorId).collection(collectionName);
}

async function copyCollectionRecursive(sourceCollectionRef, destinationCollectionRef, label, visited = new Set()) {
  const sourcePath = sourceCollectionRef.path;
  if (visited.has(sourcePath)) return 0;
  visited.add(sourcePath);

  const snap = await sourceCollectionRef.get();
  if (snap.empty) {
    console.log(`No documents found in ${label}.`);
    return 0;
  }

  console.log(`Found ${snap.size} documents in ${label}.`);

  if (!applyChanges || dryRun) {
    console.log(`Dry run only for ${label}. Re-run with --apply to write into floors/${floorId}/${label}.`);
    return snap.size;
  }

  const batchSize = 400;
  let copied = 0;

  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = destDb.batch();
    const chunk = snap.docs.slice(i, i + batchSize);

    for (const docSnap of chunk) {
      batch.set(destinationCollectionRef.doc(docSnap.id), docSnap.data(), { merge: true });
    }

    await batch.commit();
    copied += chunk.length;
    console.log(`Copied ${copied}/${snap.size} for ${label}...`);
  }

  for (const docSnap of snap.docs) {
    const childCollections = await docSnap.ref.listCollections();
    for (const childCollection of childCollections) {
      const childLabel = `${label}/${docSnap.id}/${childCollection.id}`;
      const childSourcePath = childCollection.path;
      if (visited.has(childSourcePath)) continue;

      const childDestinationRef = destinationCollectionRef.doc(docSnap.id).collection(childCollection.id);
      // eslint-disable-next-line no-await-in-loop
      await copyCollectionRecursive(childCollection, childDestinationRef, childLabel, visited);
    }
  }

  return copied;
}

async function copyRootCollection(sourceName, destinationName) {
  const sourceCollectionRef = sourceDb.collection(sourceName);
  const destinationCollectionRef = destCollection(destinationName);

  const copied = await copyCollectionRecursive(
    sourceCollectionRef,
    destinationCollectionRef,
    `${sourceName} -> floors/${floorId}/${destinationName}`,
  );

  console.log(`Completed ${sourceName} -> ${destinationName}: ${copied} root documents processed.`);
  return copied;
}

async function main() {
  const collectionPairs = buildCollectionPairs(requestedCollections);

  console.log("Cross-project floor copy to L2");
  console.log(`Source project: ${sourceServiceAccount.project_id}`);
  console.log(`Destination project: ${destServiceAccount.project_id}`);
  console.log(`Target floor: ${floorId}`);
  console.log(
    `Collections: ${collectionPairs
      .map(
        (pair) => `${pair.sourceName}${pair.sourceName === pair.destinationName ? "" : ` => ${pair.destinationName}`}`,
      )
      .join(", ")}`,
  );
  console.log(dryRun ? "Mode: dry-run" : applyChanges ? "Mode: apply" : "Mode: preview");

  if (!applyChanges) {
    console.log("No changes will be written until you re-run with --apply.");
  }

  let total = 0;
  for (const { sourceName, destinationName } of collectionPairs) {
    // eslint-disable-next-line no-await-in-loop
    total += await copyRootCollection(sourceName, destinationName);
  }

  console.log(`Finished. Root documents processed: ${total}`);
}

main().catch((err) => {
  console.error("Copy failed:", err.message || err);
  process.exit(1);
});
