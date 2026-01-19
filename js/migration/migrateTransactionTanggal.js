/**
 * Migration Script: Add 'tanggal' field to old transactions
 *
 * Problem: Data transaksi lama hanya punya field 'timestamp', tidak punya 'tanggal'
 * Solution: Konversi 'timestamp' → 'tanggal' (ISO string) untuk semua data lama
 *
 * Usage: Buka file ini di browser console atau jalankan via node
 */

import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { firestore } from "../configFirebase.js";

const MigrationScript = {
  stats: {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  },

  /**
   * Main migration function
   */
  async migrate() {
    console.log("🚀 Starting migration: Add 'tanggal' field to transactions...");
    console.log("=".repeat(60));

    try {
      // Step 1: Get all transactions
      console.log("\n📊 Step 1: Fetching all transactions...");
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const snapshot = await getDocs(transRef);

      this.stats.total = snapshot.size;
      console.log(`   Found ${this.stats.total} transactions`);

      // Step 2: Filter transactions without 'tanggal' field
      console.log("\n🔍 Step 2: Filtering transactions without 'tanggal' field...");
      const transactionsToMigrate = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Check if 'tanggal' field is missing
        if (!data.tanggal) {
          transactionsToMigrate.push({
            id: docSnap.id,
            data: data,
          });
        } else {
          this.stats.skipped++;
        }
      });

      console.log(`   Need migration: ${transactionsToMigrate.length}`);
      console.log(`   Already have 'tanggal': ${this.stats.skipped}`);

      if (transactionsToMigrate.length === 0) {
        console.log("\n✅ No migration needed! All transactions already have 'tanggal' field.");
        return;
      }

      // Step 3: Confirm migration
      console.log("\n⚠️  Step 3: Migration Preview");
      console.log("=".repeat(60));
      console.log(`   Total transactions: ${this.stats.total}`);
      console.log(`   Will migrate: ${transactionsToMigrate.length}`);
      console.log(`   Skip (already have tanggal): ${this.stats.skipped}`);
      console.log("=".repeat(60));

      // Show sample data
      console.log("\n📋 Sample data to migrate (first 3):");
      transactionsToMigrate.slice(0, 3).forEach((item, index) => {
        const timestamp = item.data.timestamp;
        let tanggalValue = "N/A";

        if (timestamp && timestamp.toDate) {
          const date = timestamp.toDate();
          tanggalValue = date.toISOString();
        }

        console.log(`\n   ${index + 1}. Doc ID: ${item.id}`);
        console.log(`      Kode: ${item.data.kode}`);
        console.log(`      Jenis: ${item.data.jenis}`);
        console.log(`      Timestamp: ${timestamp ? timestamp.toDate().toLocaleString("id-ID") : "N/A"}`);
        console.log(`      → Will add tanggal: ${tanggalValue}`);
      });

      // User confirmation
      const confirmed = confirm(
        `\n⚠️  KONFIRMASI MIGRASI\n\n` +
          `Akan migrasi ${transactionsToMigrate.length} transaksi.\n\n` +
          `Action: Menambahkan field 'tanggal' (ISO string) dari field 'timestamp'.\n\n` +
          `Lanjutkan?`
      );

      if (!confirmed) {
        console.log("\n❌ Migration dibatalkan oleh user");
        return;
      }

      // Step 4: Migrate in batches (max 500 per batch)
      console.log("\n🔄 Step 4: Migrating data in batches...");
      const batchSize = 500;
      const batches = Math.ceil(transactionsToMigrate.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, transactionsToMigrate.length);
        const batchItems = transactionsToMigrate.slice(start, end);

        console.log(`\n   Batch ${i + 1}/${batches}: Processing ${batchItems.length} documents...`);

        const batch = writeBatch(firestore);
        let batchSuccess = 0;

        batchItems.forEach((item) => {
          try {
            const docRef = doc(firestore, "stokAksesorisTransaksi", item.id);

            // Convert timestamp to tanggal (ISO string)
            let tanggalValue = new Date().toISOString(); // fallback to today

            if (item.data.timestamp && item.data.timestamp.toDate) {
              const date = item.data.timestamp.toDate();
              tanggalValue = date.toISOString();
            }

            // Update document
            batch.update(docRef, {
              tanggal: tanggalValue,
            });

            batchSuccess++;
          } catch (error) {
            console.error(`   ❌ Error preparing doc ${item.id}:`, error);
            this.stats.failed++;
            this.stats.errors.push({
              id: item.id,
              error: error.message,
            });
          }
        });

        // Commit batch
        try {
          await batch.commit();
          this.stats.migrated += batchSuccess;
          console.log(`   ✅ Batch ${i + 1} committed: ${batchSuccess} documents updated`);
        } catch (error) {
          console.error(`   ❌ Batch ${i + 1} failed:`, error);
          this.stats.failed += batchSuccess;
          this.stats.errors.push({
            batch: i + 1,
            error: error.message,
          });
        }

        // Small delay between batches
        if (i < batches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Step 5: Summary
      console.log("\n" + "=".repeat(60));
      console.log("✅ MIGRATION COMPLETED");
      console.log("=".repeat(60));
      console.log(`   Total transactions: ${this.stats.total}`);
      console.log(`   ✅ Migrated: ${this.stats.migrated}`);
      console.log(`   ⏭️  Skipped (already have tanggal): ${this.stats.skipped}`);
      console.log(`   ❌ Failed: ${this.stats.failed}`);
      console.log("=".repeat(60));

      if (this.stats.errors.length > 0) {
        console.log("\n❌ Errors:");
        this.stats.errors.forEach((err, index) => {
          console.log(`   ${index + 1}. ${err.id || `Batch ${err.batch}`}: ${err.error}`);
        });
      }

      // Verify migration
      console.log("\n🔍 Verifying migration...");
      await this.verify();
    } catch (error) {
      console.error("\n❌ Migration failed:", error);
      throw error;
    }
  },

  /**
   * Verify migration results
   */
  async verify() {
    try {
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const snapshot = await getDocs(transRef);

      let withTanggal = 0;
      let withoutTanggal = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.tanggal) {
          withTanggal++;
        } else {
          withoutTanggal++;
          console.log(`   ⚠️  Missing tanggal: ${docSnap.id} (${data.kode}, ${data.jenis})`);
        }
      });

      console.log(`\n   Total: ${snapshot.size}`);
      console.log(`   ✅ With tanggal: ${withTanggal}`);
      console.log(`   ❌ Without tanggal: ${withoutTanggal}`);

      if (withoutTanggal === 0) {
        console.log("\n🎉 Perfect! All transactions now have 'tanggal' field!");
      } else {
        console.log(`\n⚠️  Warning: ${withoutTanggal} transactions still missing 'tanggal' field`);
      }
    } catch (error) {
      console.error("❌ Verification failed:", error);
    }
  },

  /**
   * Dry run - preview without making changes
   */
  async dryRun() {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("=".repeat(60));

    try {
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const snapshot = await getDocs(transRef);

      let needMigration = 0;
      let alreadyHave = 0;
      const sampleData = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (!data.tanggal) {
          needMigration++;
          if (sampleData.length < 5) {
            sampleData.push({
              id: docSnap.id,
              kode: data.kode,
              jenis: data.jenis,
              timestamp: data.timestamp,
            });
          }
        } else {
          alreadyHave++;
        }
      });

      console.log(`\n📊 Statistics:`);
      console.log(`   Total transactions: ${snapshot.size}`);
      console.log(`   Need migration: ${needMigration}`);
      console.log(`   Already have tanggal: ${alreadyHave}`);

      if (sampleData.length > 0) {
        console.log(`\n📋 Sample transactions without 'tanggal' field:`);
        sampleData.forEach((item, index) => {
          const timestamp = item.timestamp;
          let dateStr = "N/A";

          if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            dateStr = date.toLocaleString("id-ID");
          }

          console.log(`\n   ${index + 1}. ${item.id}`);
          console.log(`      Kode: ${item.kode}`);
          console.log(`      Jenis: ${item.jenis}`);
          console.log(`      Timestamp: ${dateStr}`);
        });
      }

      console.log("\n💡 To run actual migration, call: MigrationScript.migrate()");
    } catch (error) {
      console.error("❌ Dry run failed:", error);
    }
  },

  /**
   * Rollback - remove tanggal field (USE WITH CAUTION!)
   */
  async rollback() {
    console.log("⚠️  ROLLBACK MODE - This will remove 'tanggal' field");
    console.log("=".repeat(60));

    const confirmed = confirm(
      `⚠️⚠️⚠️  BAHAYA! ⚠️⚠️⚠️\n\n` +
        `Ini akan MENGHAPUS field 'tanggal' dari SEMUA transaksi!\n\n` +
        `Anda yakin ingin rollback?`
    );

    if (!confirmed) {
      console.log("\n❌ Rollback dibatalkan");
      return;
    }

    try {
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const snapshot = await getDocs(transRef);

      console.log(`\n🔄 Rolling back ${snapshot.size} documents...`);

      const batchSize = 500;
      const batches = Math.ceil(snapshot.size / batchSize);
      let processed = 0;

      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(firestore);
        const start = i * batchSize;
        const docs = snapshot.docs.slice(start, start + batchSize);

        docs.forEach((docSnap) => {
          const docRef = doc(firestore, "stokAksesorisTransaksi", docSnap.id);
          batch.update(docRef, {
            tanggal: null, // Remove field (or use deleteField())
          });
        });

        await batch.commit();
        processed += docs.length;
        console.log(`   Processed: ${processed}/${snapshot.size}`);
      }

      console.log("\n✅ Rollback completed");
    } catch (error) {
      console.error("❌ Rollback failed:", error);
    }
  },
};

// Auto-export untuk digunakan di console
window.MigrationScript = MigrationScript;

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Migration Script: Add 'tanggal' field to transactions        ║
╠════════════════════════════════════════════════════════════════╣
║  Available commands:                                           ║
║                                                                ║
║  1. MigrationScript.dryRun()    - Preview migration           ║
║  2. MigrationScript.migrate()   - Run migration               ║
║  3. MigrationScript.verify()    - Check results               ║
║  4. MigrationScript.rollback()  - Undo migration (DANGER!)    ║
║                                                                ║
║  Recommended: Run dryRun() first to preview changes           ║
╚════════════════════════════════════════════════════════════════╝
`);

export default MigrationScript;
