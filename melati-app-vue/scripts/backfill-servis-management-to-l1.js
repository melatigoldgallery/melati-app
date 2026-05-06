import fs from "node:fs";
import admin from "firebase-admin";
import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  boolean: ["apply", "dry-run"],
  string: ["serviceAccount", "projectId", "sourceCollection", "floorId", "users"],
  default: {
    "dry-run": false,
    sourceCollection: "servis_management",
    floorId: "L1",
  },
});

const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = args.projectId;
const sourceCollectionName = String(args.sourceCollection || "servis_management").trim();
const floorId = String(args.floorId || "L1")
  .trim()
  .toUpperCase();
const applyChanges = Boolean(args.apply);
const dryRun = Boolean(args["dry-run"]);
const requestedUsers = String(args.users || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!serviceAccountPath) {
  console.error("Missing service account JSON. Provide --serviceAccount <path> or set GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

if (!sourceCollectionName) {
  console.error("Missing --sourceCollection value.");
  process.exit(1);
}

if (!["L1", "L2"].includes(floorId)) {
  console.error("floorId must be L1 or L2.");
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

function targetDocRef(userId) {
  return db.collection("floors").doc(floorId).collection(sourceCollectionName).doc(userId);
}

async function copyDocumentTree(sourceDocRef, destinationDocRef, stats) {
  const sourceSnap = await sourceDocRef.get();
  if (sourceSnap.exists && applyChanges && !dryRun) {
    await destinationDocRef.set(sourceSnap.data(), { merge: true });
    stats.written += 1;
    console.log(`[copy] ${sourceDocRef.path} -> ${destinationDocRef.path}`);
  } else {
    console.log(`[dry] ${sourceDocRef.path} -> ${destinationDocRef.path}`);
  }

  const childCollections = await sourceDocRef.listCollections();
  for (const childCollectionRef of childCollections) {
    const childDestCollectionRef = destinationDocRef.collection(childCollectionRef.id);
    const childSnap = await childCollectionRef.get();

    for (const childDoc of childSnap.docs) {
      // eslint-disable-next-line no-await-in-loop
      await copyDocumentTree(childDoc.ref, childDestCollectionRef.doc(childDoc.id), stats);
    }
  }
}

async function main() {
  console.log("Servis management backfill to floor-scoped path");
  console.log(`Source collection: ${sourceCollectionName}`);
  console.log(`Target floor: ${floorId}`);
  console.log(`Mode: ${dryRun ? "dry-run" : applyChanges ? "apply" : "preview"}`);

  const userIds = requestedUsers.length > 0 ? requestedUsers : ["legacy_admin", "supervisor"];
  console.log(`User docs: ${userIds.join(", ")}`);

  const stats = { scanned: 0, written: 0, skipped: 0 };

  for (const userId of userIds) {
    const sourceDocRef = db.collection(sourceCollectionName).doc(userId);
    stats.scanned += 1;
    // eslint-disable-next-line no-await-in-loop
    await copyDocumentTree(sourceDocRef, targetDocRef(userId), stats);
  }

  console.log(`Completed. Root docs processed: ${stats.scanned}, written: ${stats.written}, skipped: ${stats.skipped}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err.message || err);
  process.exit(1);
});
