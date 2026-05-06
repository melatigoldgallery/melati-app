# Migration Execution Guide - Strategy B (Live: Legacy → Floors/L1)

**Status:** ✅ Ready to Execute  
**Build:** ✅ Passes (479 modules, 6.39s)  
**Functions:** ✅ Code ready (new `migrateToFloorScoped` function added)

---

## 📋 What's Ready

### 1. **Cloud Function: `migrateToFloorScoped`** ✅

- Location: `functions/index.js` (added at end)
- Functionality:
  - Bulk copy from legacy collections to `floors/L1/{collection}`
  - Handles 13 main collections + subcollections (items, servis_items, servis_parts)
  - Batch processing with 500 docs per batch (respects Firestore timeout limits)
  - Progress tracking in `migration_status` collection
  - Error reporting per collection/doc
  - Access control: Admin/Supervisor only

### 2. **Read Logic Update** ✅

- Location: `src/utils/hard-cutover.js`
- New function: `readWithL1Only(floorReader)`
  - For post-migration: Read from L1 only, no fallback
  - Replaces `readWithFloorFallback` after stabilization period
  - Currently code still uses `readWithFloorFallback` (safe during transition)

### 3. **Verification Utility** ✅

- Location: `src/services/migration-verify.js`
- Functions:
  - `verifyAllMigrations(floorId)` - Compare legacy vs floors/L1 counts
  - `spotCheckCollection(name)` - Sample 5 docs per collection
  - `checkDocumentMigration(collection, docId)` - Verify specific doc
  - `printMigrationReport()` - Pretty print results

### 4. **Documentation** ✅

- `docs/MIGRATION-STRATEGY-B.md` - Complete strategy & technical details
- `docs/MIGRATION-LEGACY-TO-FLOOR.md` - Initial analysis

---

## 🚀 Execution Steps

### **PHASE 1: PRE-MIGRATION (Today - 30 minutes)**

#### Step 1.1: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

**Expected Output:**

```
✓ Deploy complete!
✓ Function URL:
  - https://asia-southeast2-{project-id}.cloudfunctions.net/migrateToFloorScoped
```

**Verify:**

```bash
firebase functions:list
# Should show:
# - migrateToFloorScoped (v2, asia-southeast2)
```

#### Step 1.2: Backup Firestore (Recommended)

Backup via Firebase Console:

1. Go to **Firestore** → **Data**
2. Click **⋮** → **Export**
3. Choose destination: Google Cloud Storage (create new bucket if needed)
4. Backup name: `firestore-backup-before-migration-2026-05-04`

Or via CLI:

```bash
gcloud firestore export gs://{backup-bucket}/firestore-backup-2026-05-04 --collection-ids=order_online,servis,penjualanAksesoris,stokAksesorisTransaksi,inventory,attendance,leaveRequests,employees,employeeFaces,settings,antrian,latePermissionCodes,manualOvertime
```

#### Step 1.3: Verify Data State

Before starting, check Firestore Console:

- Order Online: How many documents? (e.g., 300-500)
- Servis: How many? (e.g., 200-400)
- PenjualanAksesoris: How many? (e.g., 500-1000)
- Document these counts for comparison after migration

---

### **PHASE 2: MIGRATION EXECUTION (1-5 minutes)**

#### Step 2.1: Open Web App Console

1. Open production/staging URL in browser
2. Login as Admin or Supervisor (Lt 1)
3. Open DevTools: **F12** → **Console** tab

#### Step 2.2: Execute Migration

```javascript
// Copy-paste into browser console:

import { httpsCallable, getFunctions } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-functions.js";

const functions = getFunctions(window.firebase.app(), "asia-southeast2");
const migrateToFloorScoped = httpsCallable(functions, "migrateToFloorScoped");

migrateToFloorScoped({
  floorId: "L1",
  collections: [
    "order_online",
    "servis",
    "penjualanAksesoris",
    "stokAksesorisTransaksi",
    "inventory",
    "attendance",
    "leaveRequests",
    "employees",
    "employeeFaces",
    "settings",
    "antrian",
    "latePermissionCodes",
    "manualOvertime",
  ],
})
  .then((result) => {
    console.log("✅ Migration Result:", result);
    console.log("Status Doc ID:", result.data.statusDocId);
    console.log("Total Migrated:", result.data.totalDocsMigrated);
    console.log("Total Errors:", result.data.totalErrors);
  })
  .catch((error) => {
    console.error("❌ Migration Failed:", error);
  });
```

**Expected Output:**

```javascript
✅ Migration Result: {
  success: true,
  statusDocId: "migration_1725286800000",
  floorId: "L1",
  collections: [...],
  totalDocsMigrated: 2847,
  totalErrors: 0,
  results: [
    { collectionName: "order_online", migratedCount: 487, errorCount: 0, totalDocs: 487 },
    { collectionName: "servis", migratedCount: 324, errorCount: 0, totalDocs: 324 },
    ...
  ]
}
```

#### Step 2.3: Monitor Progress

While migration is running:

1. Open **Firestore Console**
2. Navigate to `migration_status` collection
3. Find the status doc (e.g., `migration_1725286800000`)
4. Watch `collectionProgress` sub-fields update in real-time

**Expected Progress Timeline:**

- First 30 seconds: Starting, checking permissions
- 30 sec - 2 min: Migrating collections (order_online, servis, penjualanAksesoris, etc)
- 2 - 4 min: Final batches, large collections (stokAksesorisTransaksi)
- 4 - 5 min: Completed, status marked as "completed"

---

### **PHASE 3: VERIFICATION (5-10 minutes)**

#### Step 3.1: Quick Count Check

In browser console, run verification:

```javascript
// Import verification utility (need to do this from app context)
const verifyUrl = new URL("../src/services/migration-verify.js", import.meta.url);

// Alternative: Manual Firestore count check via Console
db.collection("order_online")
  .count()
  .get()
  .then((doc) => console.log("Legacy count:", doc.data().count));
db.collection("floors")
  .doc("L1")
  .collection("order_online")
  .count()
  .get()
  .then((doc) => console.log("L1 count:", doc.data().count));
```

**Expected:**

- Legacy count = L1 count (both ~487 for order_online example)

#### Step 3.2: Verify in Firestore Console

1. Open Firestore Console
2. Check `floors` → `L1` → `order_online`
   - Should see ~487 documents with IDs matching legacy
3. Click one doc to spot-check
   - Data should match legacy version exactly
4. Check subcollections (e.g., `order_online/{docId}/items`)
   - Should see child items migrated

#### Step 3.3: Spot Check Data Integrity

Pick 3-5 orders and verify:

1. Open legacy: `order_online/{orderId}`
2. Compare with floor version: `floors/L1/order_online/{orderId}`
3. Fields should match exactly:
   - orderNo, jml, totalPrice, tanggal, jam, statusPengambilan, statusPembayaran
4. Check subcollection items match

---

### **PHASE 4: FUNCTIONAL TESTING (10-15 minutes)**

#### Test 4.1: Read Operations

```javascript
// Test reading from L1 (should work immediately after migration)
// In any view that displays orders:
1. Navigate to "Laporan Order Online" or "Data Order Online"
2. Should see all migrated orders + any new ones
3. Filter/search should work
4. Details view should load correctly
```

#### Test 4.2: Write Operations (New Data)

```javascript
// Test that new writes go to L1
1. Create a new order online
2. Verify it appears in floors/L1/order_online/{newOrderId}
```

#### Test 4.3: Critical Workflows

Test these features:

- ✅ Input order online → verify in floor path
- ✅ Save servis → verify in floor path
- ✅ Penjualan aksesoris → verify in floor path
- ✅ Attendance check-in → verify in floor path
- ✅ Leave request → verify in floor path
- ✅ Reports load data → should use L1 (via readWithFloorFallback)

#### Test 4.4: Error Scenarios

- Try operations offline → Should work (offline persistence)
- Try with invalid data → Should validate correctly
- Check browser console for errors → Should be clean

---

### **PHASE 5: MONITORING (24 hours)**

#### Step 5.1: Monitor Firestore Logs

1. Firebase Console → Functions → Logs
2. Filter for `migrateToFloorScoped` results
3. Look for any errors or warnings
4. Check Cloud Function execution times

#### Step 5.2: Monitor Application

1. Test order creation (several times)
2. Test order reading (queries, searches, reports)
3. Check browser console for errors
4. Monitor Firestore for write failures

**Check Firestore Quota:**

- Go to Quotas tab
- Monitor read/write/delete ops
- Should see spikes during testing, then normalize

#### Step 5.3: Daily Health Check (1 week)

- Open each major view: Orders, Servis, Inventory, Reports
- Verify data loads correctly
- No console errors
- Performance acceptable

---

## 🔙 Rollback Plan (If Issues Found)

### If Migration Failed:

```bash
# Option 1: Restore from backup (if created in Step 1.2)
# Via Firebase Console:
# 1. Firestore → Import Collections
# 2. Select backup file
# 3. Restore (overwrites current data)

# Option 2: Delete migration, keep legacy (5 minutes)
# In Firebase Console:
# 1. Go to Firestore
# 2. Select 'floors' collection → 'L1'
# 3. Delete problematic sub-collections (order_online, servis, etc)
# 4. System falls back to legacy via readWithFloorFallback
```

### If Read Errors After Migration:

1. Check error in browser console
2. Check if both legacy and L1 exist in Firestore
3. If only L1 exists, try clearing browser cache
4. Reload page and retry

---

## 📊 Success Criteria

✅ Migration considered **SUCCESSFUL** when:

- [ ] **Count Matching**: Legacy count = L1 count for all 13 collections
- [ ] **Subcollections**: All items under orders/servis migrated
- [ ] **Data Integrity**: Spot-checked docs match between legacy and L1
- [ ] **Floor-only Writes**: New orders go to floors/L1
- [ ] **Reads Working**: All reports/queries load data from L1 (via fallback)
- [ ] **No Errors**: Browser console and Firestore logs clean
- [ ] **24-hour Stable**: No issues in monitoring period

---

## 📋 Decision Points (After 1-2 weeks stable)

### Option A: Delete Legacy (Cleanup)

**When ready:** After 1-2 weeks of stable operation

```bash
# Delete legacy path to save storage costs
# Requires code update: Change readWithFloorFallback → readWithL1Only
# Then rebuild and deploy

Risk: No rollback possible
Benefit: Save ~50% storage cost
Timeline: 2-3 hours (test, build, deploy)
```

### Option B: Keep Legacy Forever (Safest)

**Recommended for:** Production with safety concerns

- Keep legacy data as permanent backup
- Additional cost: ~50% storage
- Zero risk: Always can fall back

### Option C: Archive to Backup (Middle Ground)

**When ready:** After 1-2 weeks of stable operation

- Export legacy to Cloud Storage
- Delete legacy from Firestore
- Can restore from export if needed (slower, but cheaper)
- Cost: ~10% storage vs keeping live

---

## 📝 Documents Created

1. **[MIGRATION-STRATEGY-B.md](MIGRATION-STRATEGY-B.md)** - Full strategy, risks, mitigation
2. **[MIGRATION-LEGACY-TO-FLOOR.md](MIGRATION-LEGACY-TO-FLOOR.md)** - Initial analysis
3. **[src/services/migration-verify.js](../src/services/migration-verify.js)** - Verification utilities
4. **[functions/index.js](../../functions/index.js)** - Cloud Function `migrateToFloorScoped`
5. **[src/utils/hard-cutover.js](../src/utils/hard-cutover.js)** - New `readWithL1Only` helper

---

## ⏰ Timeline Summary

```
Today (Pre-Migration): 30 min
  └─ Deploy functions: 2 min
  └─ Backup Firestore: 5 min
  └─ Verify data state: 3 min

Migration Day: 5 min execution
  └─ Execute Cloud Function: 3-5 min
  └─ Verify in Console: 2 min

Testing Day: 25 min
  └─ Quick count check: 2 min
  └─ Firestore Console verification: 5 min
  └─ Spot check data: 5 min
  └─ Functional testing: 15 min

Monitoring: 24 hours (background)
  └─ Check logs hourly: 1 min each
  └─ Test workflows daily: 5 min

Post-Migration (1-2 weeks later):
  └─ Decide on legacy path cleanup: 15 min
```

---

## 🎯 Next Steps (From You)

When ready to execute, confirm:

1. ✅ **Backup created?** (Step 1.2) - Confirm before proceeding
2. ✅ **Data counts verified?** (Step 3.3) - Document baseline
3. ✅ **Testing window available?** (Phase 4) - Need 30-60 min for functional testing
4. ✅ **Off-peak timing?** - Ideal to run during low-traffic hours
5. ✅ **Team notified?** - Any concurrent work that might conflict?

**Confirm these 5 items, then I'll support you through execution!** 🚀
