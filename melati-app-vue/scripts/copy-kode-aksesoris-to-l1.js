import fs from "node:fs";
import admin from "firebase-admin";
import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  boolean: ["apply", "dry-run"],
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
    const batch = db.batch();
    const chunk = snap.docs.slice(i, i + batchSize);

    for (const docSnap of chunk) {
      batch.set(destRef.doc(docSnap.id), docSnap.data(), { merge: true });
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

      const childDestRef = destRef.doc(docSnap.id).collection(childCollection.id);
      // eslint-disable-next-line no-await-in-loop
      await copyCollectionRecursive(childCollection, childDestRef, childLabel, visited);
    }
  }

  return copied;
}

async function main() {
  console.log("🔄 Copy kodeAksesoris to floor-scoped path");
  console.log(`Target floor: ${floorId}`);
  console.log(`Dry run: ${dryRun}, Apply: ${applyChanges}`);

  const sourceRef = db.collection("kodeAksesoris");
  const destRef = db.collection("floors").doc(floorId).collection("kodeAksesoris");

  const copied = await copyCollectionRecursive(sourceRef, destRef, `kodeAksesoris -> floors/${floorId}/kodeAksesoris`);

  console.log(`Completed kodeAksesoris -> floors/${floorId}/kodeAksesoris: ${copied} root documents processed.`);
  console.log(dryRun ? "✅ Dry run complete" : "✅ Copy complete");
}

main().catch((err) => {
  console.error("Copy failed:", err.message || err);
  process.exit(1);
});
