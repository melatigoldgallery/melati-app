/**
 * Migration Script: Fix 'tanggal' field format for stockAddition transactions
 *
 * Problem:
 * 1. Data lama tidak punya field 'tanggal'
 * 2. Data dengan format tanggal dd/mm/yyyy (harus ISO string)
 *
 * Solution:
 * - Konversi 'timestamp' → 'tanggal' (ISO string)
 * - Konversi format dd/mm/yyyy → ISO string
 *
 * Usage: Buka file migrate-tambah-aksesoris.html di browser
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

const StockAdditionMigration = {
  stats: {
    total: 0,
    needMigration: 0,
    skipped: 0,
    migrated: 0,
    failed: 0,
    noTanggal: 0,
    wrongFormat: 0,
    errors: [],
  },

  /**
   * Check if tanggal is in valid ISO format
   */
  isValidISOFormat(tanggal) {
    if (!tanggal) return false;

    // Check if it's ISO format (starts with year)
    const isoPattern = /^\d{4}-\d{2}-\d{2}/;
    return isoPattern.test(tanggal);
  },

  /**
   * Convert dd/mm/yyyy to ISO string
   */
  convertDDMMYYYYtoISO(dateStr) {
    try {
      const parts = dateStr.split("/");
      if (parts.length !== 3) return null;

      // parts[0] = day, parts[1] = month, parts[2] = year
      const date = new Date(parts[2], parts[1] - 1, parts[0]);

      if (isNaN(date.getTime())) return null;

      return date.toISOString();
    } catch (error) {
      console.error("Error converting date:", error);
      return null;
    }
  },

  /**
   * Main migration function
   */
  async migrate() {
    console.log("🚀 Starting stockAddition migration: Fix 'tanggal' field format...");
    console.log("=".repeat(70));

    try {
      // Step 1: Get all stockAddition transactions
      console.log("\n📊 Step 1: Fetching stockAddition transactions...");
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const q = query(transRef, where("jenis", "==", "stockAddition"));
      const snapshot = await getDocs(q);

      this.stats.total = snapshot.size;
      console.log(`   Found ${this.stats.total} stockAddition transactions`);

      if (this.stats.total === 0) {
        console.log("\n✅ No stockAddition transactions found!");
        return;
      }

      // Step 2: Analyze and categorize transactions
      console.log("\n🔍 Step 2: Analyzing tanggal field...");
      const transactionsToMigrate = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const tanggal = data.tanggal;

        let needsMigration = false;
        let reason = "";
        let newTanggal = null;

        // Case 1: No tanggal field - convert from timestamp
        if (!tanggal) {
          needsMigration = true;
          reason = "Missing 'tanggal' field";
          this.stats.noTanggal++;

          if (data.timestamp && data.timestamp.toDate) {
            newTanggal = data.timestamp.toDate().toISOString();
          } else {
            newTanggal = new Date().toISOString();
          }
        }
        // Case 2: Wrong format (dd/mm/yyyy) - convert to ISO
        else if (!this.isValidISOFormat(tanggal)) {
          needsMigration = true;
          reason = "Wrong format (dd/mm/yyyy)";
          this.stats.wrongFormat++;

          newTanggal = this.convertDDMMYYYYtoISO(tanggal);

          if (!newTanggal && data.timestamp && data.timestamp.toDate) {
            newTanggal = data.timestamp.toDate().toISOString();
            reason += " - fallback to timestamp";
          }
        }
        // Case 3: Already correct format
        else {
          this.stats.skipped++;
        }

        if (needsMigration && newTanggal) {
          transactionsToMigrate.push({
            id: docSnap.id,
            data: data,
            oldTanggal: tanggal || "N/A",
            newTanggal: newTanggal,
            reason: reason,
          });
        }
      });

      this.stats.needMigration = transactionsToMigrate.length;

      console.log(`   Need migration: ${this.stats.needMigration}`);
      console.log(`     - Missing tanggal field: ${this.stats.noTanggal}`);
      console.log(`     - Wrong format (dd/mm/yyyy): ${this.stats.wrongFormat}`);
      console.log(`   Already correct format: ${this.stats.skipped}`);

      if (transactionsToMigrate.length === 0) {
        console.log("\n✅ All transactions already have correct 'tanggal' format!");
        return;
      }

      // Step 3: Show preview
      console.log("\n⚠️  Step 3: Migration Preview");
      console.log("=".repeat(70));
      console.log(`   Total stockAddition: ${this.stats.total}`);
      console.log(`   Will migrate: ${transactionsToMigrate.length}`);
      console.log(`   Skip (already correct): ${this.stats.skipped}`);
      console.log("=".repeat(70));

      // Show sample data
      console.log("\n📋 Sample data to migrate (first 5):");
      transactionsToMigrate.slice(0, 5).forEach((item, index) => {
        console.log(`\n   ${index + 1}. Doc ID: ${item.id}`);
        console.log(`      Kode: ${item.data.kode}`);
        console.log(`      Nama: ${item.data.nama || item.data.namaBarang}`);
        console.log(`      Reason: ${item.reason}`);
        console.log(`      Old tanggal: ${item.oldTanggal}`);
        console.log(`      → New tanggal: ${item.newTanggal}`);
      });

      // User confirmation
      const confirmed = confirm(
        `\n⚠️  KONFIRMASI MIGRASI\n\n` +
          `Akan migrasi ${transactionsToMigrate.length} transaksi stockAddition.\n\n` +
          `Action:\n` +
          `- Convert missing 'tanggal' from 'timestamp'\n` +
          `- Convert dd/mm/yyyy format to ISO format\n\n` +
          `Lanjutkan?`
      );

      if (!confirmed) {
        console.log("\n❌ Migration dibatalkan oleh user");
        return;
      }

      // Step 4: Migrate in batches
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

            // Update document with new tanggal
            batch.update(docRef, {
              tanggal: item.newTanggal,
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
      console.log("\n" + "=".repeat(70));
      console.log("✅ MIGRATION COMPLETED");
      console.log("=".repeat(70));
      console.log(`   Total stockAddition: ${this.stats.total}`);
      console.log(`   ✅ Migrated: ${this.stats.migrated}`);
      console.log(`      - Missing tanggal: ${this.stats.noTanggal}`);
      console.log(`      - Wrong format: ${this.stats.wrongFormat}`);
      console.log(`   ⏭️  Skipped (already correct): ${this.stats.skipped}`);
      console.log(`   ❌ Failed: ${this.stats.failed}`);
      console.log("=".repeat(70));

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
      const q = query(transRef, where("jenis", "==", "stockAddition"));
      const snapshot = await getDocs(q);

      let correctFormat = 0;
      let wrongFormat = 0;
      let missing = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const tanggal = data.tanggal;

        if (!tanggal) {
          missing++;
          console.log(`   ⚠️  Missing tanggal: ${docSnap.id} (${data.kode})`);
        } else if (!this.isValidISOFormat(tanggal)) {
          wrongFormat++;
          console.log(`   ⚠️  Wrong format: ${docSnap.id} (${data.kode}) - tanggal: ${tanggal}`);
        } else {
          correctFormat++;
        }
      });

      console.log(`\n   Total stockAddition: ${snapshot.size}`);
      console.log(`   ✅ Correct ISO format: ${correctFormat}`);
      console.log(`   ⚠️  Wrong format: ${wrongFormat}`);
      console.log(`   ❌ Missing tanggal: ${missing}`);

      if (wrongFormat === 0 && missing === 0) {
        console.log("\n🎉 Perfect! All stockAddition transactions now have correct 'tanggal' format!");
      } else {
        console.log(`\n⚠️  Warning: ${wrongFormat + missing} transactions still have issues`);
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
    console.log("=".repeat(70));

    try {
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const q = query(transRef, where("jenis", "==", "stockAddition"));
      const snapshot = await getDocs(q);

      let noTanggal = 0;
      let wrongFormat = 0;
      let correctFormat = 0;
      const sampleWrong = [];
      const sampleMissing = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const tanggal = data.tanggal;

        if (!tanggal) {
          noTanggal++;
          if (sampleMissing.length < 3) {
            sampleMissing.push({
              id: docSnap.id,
              kode: data.kode,
              timestamp: data.timestamp,
            });
          }
        } else if (!this.isValidISOFormat(tanggal)) {
          wrongFormat++;
          if (sampleWrong.length < 3) {
            sampleWrong.push({
              id: docSnap.id,
              kode: data.kode,
              oldTanggal: tanggal,
              newTanggal: this.convertDDMMYYYYtoISO(tanggal),
            });
          }
        } else {
          correctFormat++;
        }
      });

      console.log(`\n📊 Statistics:`);
      console.log(`   Total stockAddition: ${snapshot.size}`);
      console.log(`   Need migration: ${noTanggal + wrongFormat}`);
      console.log(`     - Missing tanggal: ${noTanggal}`);
      console.log(`     - Wrong format (dd/mm/yyyy): ${wrongFormat}`);
      console.log(`   Already correct: ${correctFormat}`);

      if (sampleMissing.length > 0) {
        console.log(`\n📋 Sample transactions WITHOUT 'tanggal' field:`);
        sampleMissing.forEach((item, index) => {
          const timestamp = item.timestamp;
          let dateStr = "N/A";

          if (timestamp && timestamp.toDate) {
            const date = timestamp.toDate();
            dateStr = date.toLocaleString("id-ID");
          }

          console.log(`\n   ${index + 1}. ${item.id}`);
          console.log(`      Kode: ${item.kode}`);
          console.log(`      Timestamp: ${dateStr}`);
          console.log(`      → Will add tanggal from timestamp`);
        });
      }

      if (sampleWrong.length > 0) {
        console.log(`\n📋 Sample transactions with WRONG format (dd/mm/yyyy):`);
        sampleWrong.forEach((item, index) => {
          console.log(`\n   ${index + 1}. ${item.id}`);
          console.log(`      Kode: ${item.kode}`);
          console.log(`      Old tanggal: ${item.oldTanggal}`);
          console.log(`      → New tanggal: ${item.newTanggal}`);
        });
      }

      console.log("\n💡 To run actual migration, call: StockAdditionMigration.migrate()");
    } catch (error) {
      console.error("❌ Dry run failed:", error);
    }
  },

  /**
   * Rollback - remove tanggal field (USE WITH CAUTION!)
   */
  async rollback() {
    console.log("⚠️  ROLLBACK MODE - This will remove 'tanggal' field from stockAddition");
    console.log("=".repeat(70));

    const confirmed = confirm(
      `⚠️⚠️⚠️  BAHAYA! ⚠️⚠️⚠️\n\n` +
        `Ini akan MENGHAPUS field 'tanggal' dari SEMUA transaksi stockAddition!\n\n` +
        `Anda yakin ingin rollback?`
    );

    if (!confirmed) {
      console.log("\n❌ Rollback dibatalkan");
      return;
    }

    try {
      const transRef = collection(firestore, "stokAksesorisTransaksi");
      const q = query(transRef, where("jenis", "==", "stockAddition"));
      const snapshot = await getDocs(q);

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
            tanggal: null,
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
window.StockAdditionMigration = StockAdditionMigration;

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║  Migration Script: Fix 'tanggal' format for stockAddition         ║
╠════════════════════════════════════════════════════════════════════╣
║  Available commands:                                               ║
║                                                                    ║
║  1. StockAdditionMigration.dryRun()    - Preview migration        ║
║  2. StockAdditionMigration.migrate()   - Run migration            ║
║  3. StockAdditionMigration.verify()    - Check results            ║
║  4. StockAdditionMigration.rollback()  - Undo migration (DANGER!) ║
║                                                                    ║
║  Recommended: Run dryRun() first to preview changes               ║
╚════════════════════════════════════════════════════════════════════╝
`);

export default StockAdditionMigration;
