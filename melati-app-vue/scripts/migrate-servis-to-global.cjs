#!/usr/bin/env node
/**
 * Migration Script: Move servis data from floor-scoped to global collection
 * 
 * This script:
 * 1. Copies all documents from floors/{floorId}/servis to servis (global)
 * 2. Adds floorId field to each document for audit trail
 * 3. Optionally deletes original floor-scoped data (with --cleanup flag)
 * 
 * Usage:
 *   node scripts/migrate-servis-to-global.js --apply
 *   node scripts/migrate-servis-to-global.js --apply --cleanup
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const shouldCleanup = args.includes('--cleanup');

if (!shouldApply) {
  console.log('🔍 DRY RUN MODE - Use --apply flag to execute migration');
}

// Initialize Firebase Admin
const serviceAccountPath = path.join(
  process.env.USERPROFILE || process.env.HOME,
  'Downloads/sistem-antrian-76aa8-firebase-adminsdk-fbsvc-0e7e73faec.json'
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function migrateServisToGlobal() {
  console.log('Starting servis migration to global collection...\n');

  let totalMigrated = 0;
  let errors = 0;

  const floors = ['L1', 'L2'];

  for (const floorId of floors) {
    console.log(`\n📦 Processing floor: ${floorId}`);

    try {
      const floorServisRef = db.collection('floors').doc(floorId).collection('servis');
      const floorServisSnap = await floorServisRef.get();

      if (floorServisSnap.empty) {
        console.log(`  ✓ No servis documents in ${floorId}`);
        continue;
      }

      const docs = floorServisSnap.docs;
      console.log(`  Found ${docs.length} documents to migrate`);

      for (const docSnap of docs) {
        const docId = docSnap.id;
        const docData = docSnap.data();

        try {
          // Add floorId to the document
          const dataToMigrate = {
            ...docData,
            floorId: floorId,
            migratedAt: admin.firestore.Timestamp.now(),
            migratedFrom: `floors/${floorId}/servis`,
          };

          if (shouldApply) {
            await db.collection('servis').doc(docId).set(dataToMigrate, { merge: true });
            console.log(`  ✓ Migrated: ${docId}`);
          } else {
            console.log(`  [DRY RUN] Would migrate: ${docId} with floorId=${floorId}`);
          }

          totalMigrated++;
        } catch (error) {
          console.error(`  ✗ Error migrating ${docId}:`, error.message);
          errors++;
        }
      }

      // Cleanup if requested
      if (shouldApply && shouldCleanup) {
        console.log(`\n🧹 Cleaning up floor-scoped data for ${floorId}...`);
        for (const docSnap of docs) {
          try {
            await floorServisRef.doc(docSnap.id).delete();
            console.log(`  ✓ Deleted: ${docSnap.id}`);
          } catch (error) {
            console.error(`  ✗ Error deleting ${docSnap.id}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing floor ${floorId}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Migration Summary:`);
  console.log(`   Total documents processed: ${totalMigrated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Mode: ${shouldApply ? (shouldCleanup ? 'APPLY + CLEANUP' : 'APPLY') : 'DRY RUN'}`);
  console.log('='.repeat(60));

  if (!shouldApply) {
    console.log('\n💡 To execute migration, run: npm run migrate:servis -- --apply');
    if (!shouldCleanup) {
      console.log('💡 To also cleanup floor-scoped data, add --cleanup flag');
    }
  }

  process.exit(errors > 0 ? 1 : 0);
}

migrateServisToGlobal().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
