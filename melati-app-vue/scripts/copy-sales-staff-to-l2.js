import fs from "node:fs";
import admin from "firebase-admin";
import minimist from "minimist";

const args = minimist(process.argv.slice(2), {
  boolean: ["apply", "dry-run"],
  string: ["serviceAccount", "projectId"],
  default: { "dry-run": false },
});

const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = args.projectId;
const applyChanges = Boolean(args.apply);

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

async function copySalesStaffToL2() {
  const srcRef = db.collection("salesStaff");
  const destRef = db.collection("floors").doc("L2").collection("salesStaff");

  const snap = await srcRef.get();
  if (snap.empty) {
    console.log("No documents found in salesStaff.");
    return;
  }

  const docs = snap.docs;
  console.log(`Found ${docs.length} documents in salesStaff.`);

  if (!applyChanges) {
    console.log("Dry run only. Re-run with --apply to write into floors/L2/salesStaff.");
    return;
  }

  const batchSize = 400;
  let copied = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    chunk.forEach((docSnap) => {
      batch.set(destRef.doc(docSnap.id), docSnap.data());
    });

    await batch.commit();
    copied += chunk.length;
    console.log(`Copied ${copied}/${docs.length}...`);
  }

  console.log("Copy complete: floors/L2/salesStaff updated.");
}

copySalesStaffToL2().catch((err) => {
  console.error("Copy failed:", err.message || err);
  process.exit(1);
});
