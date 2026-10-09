/**
 * Firebase Cloud Functions Entry Point (Aggregator)
 * Melati Gold Gallery - Backend
 * 
 * Pola Arsitektur: Flat / Named Modules
 * Seluruh implementasi logika didelegasikan ke services/ dan helpers/
 */

// 1. Authentication Service
export { loginWithUsername } from "./services/auth.js";

// 2. Barcode Tracking & Physical Stock Mutation Service
export {
  checkBarcodesStatus,
  executeBarcodeMutation,
  submitBarcodeMoveRequest,
  processBarcodeMoveRequest,
  scheduledArchiveInactiveBarcodes,
  manualArchiveInactiveBarcodes,
  deleteSingleBarcode,
  revertSingleBarcode,
  revertMutationLog,
} from "./services/barcodes.js";

// 3. Desktop Cashier MySQL Sync Service
export {
  syncDesktopSales,
  syncDesktopVoid,
} from "./services/desktop-sync.js";

// 4. Daily Stock Snapshots & Periodic Reports Service
export {
  scheduledCreateDailySnapshot,
  ensureYesterdaySnapshotOnFirstTxFloor,
  scheduledCreateDailyStockReports,
  saveDailySnapshot,
  backfillSnapshots,
  migrateToFloorScoped,
} from "./services/snapshots.js";

// 5. System Maintenance & Cleanup Service
export { maintenanceMonthlyCleanup } from "./services/maintenance.js";

// 6. Media & Text-to-Speech Service
export { getSpeechTTS } from "./services/media.js";
