# Migration Strategy B: Legacy → Floors/L1 (Keep Backup)

**Status:** Ready to Execute  
**Data Volume:** ~3000 docs max per collection (not evenly distributed)  
**Target:** L1 only (L2 is empty, data isolated)  
**Approach:** Copy legacy → floors/L1, keep legacy as backup

---

## 📊 Collections to Migrate

| Collection             | Approx Docs | Subcollections             | Priority | Notes                    |
| ---------------------- | ----------- | -------------------------- | -------- | ------------------------ |
| order_online           | ~300-500    | items                      | P1       | Has child docs           |
| servis                 | ~200-400    | servis_items, servis_parts | P1       | Has child docs           |
| penjualanAksesoris     | ~500-1000   | -                          | P1       | Many transaction records |
| stokAksesorisTransaksi | ~1000-2000  | -                          | P1       | Stock history            |
| inventory              | ~100-300    | -                          | P2       | Catalog data             |
| attendance             | ~500-1000   | -                          | P2       | Employee attendance      |
| leaveRequests          | ~100-200    | -                          | P2       | Leave history            |
| employees              | ~50-100     | -                          | P2       | Master data              |
| employeeFaces          | ~50-100     | -                          | P2       | Face recognition data    |
| settings               | ~10-20      | -                          | P2       | Config/settings          |
| antrian                | ~100-200    | -                          | P3       | Queue data               |
| latePermissionCodes    | ~50-100     | -                          | P3       | Attendance codes         |
| manualOvertime         | ~50-100     | -                          | P3       | Overtime records         |

---

## 🔄 Migration Phases

### Phase 1: Pre-Migration (Today)

- ✅ Backup firestore via console export (manual or via Cloud Function)
- ✅ Deploy new Cloud Function `migrateToFloorScoped`
- ✅ Update read logic to prioritize L1

### Phase 2: Bulk Migration (Single execution)

- Execute Cloud Function with batching (500 docs per batch to avoid timeout)
- Progress tracking via Firestore collection `migration_status`
- Handle subcollections specially (order_online/items, servis/\*, etc)

### Phase 3: Verification

- Count check: legacy vs floors/L1 per collection
- Sample spot check (first 10, last 10 docs per collection)
- Test read operations via UI

### Phase 4: Validation (Ongoing)

- Monitor for errors in Firestore logs
- Keep legacy path unchanged for 1 week (safety period)
- After confirmation, can delete legacy (optional Phase 5)

---

## 🔧 Code Changes Needed

### 1. Cloud Function: `migrateToFloorScoped`

```javascript
// Location: functions/index.js

exports.migrateToFloorScoped = onCall(async (request) => {
  // Input: { collections: ['order_online', 'servis', ...], floorId: 'L1', batchSize: 500 }
  // Output: { success, migratedCount, errors }
  // For each collection:
  // - Get all docs from legacy path
  // - Batch write to floors/L1/{collection}
  // - Handle subcollections (order_online/items, servis/*)
  // - Track progress in migration_status collection
  // - Return results per collection
});
```

### 2. Update Read Logic

**Current:** `readWithFloorFallback(floorReader, legacyReader)` tries floor, falls back to legacy

**New:** Prioritize L1, then fallback to legacy

```javascript
// In hard-cutover.js
// Add new function: readWithL1Priority(floorId, legacySnap, collectionName)
// - Always try floors/L1/{collection} first (after migration)
// - Only fallback to legacy if L1 is empty (for initial reads during migration)
```

### 3. Update Security Rules

**Current:** Allow all authenticated users to read/write all collections

**After Migration:** Will add floors/\* path rules explicitly

```
match /floors/{floorId}/{collection}/{document=**} {
  allow read: if request.auth != null && request.auth.token.floor == floorId;
  allow write: if request.auth != null && hasRole(['admin', 'supervisor']);
}
```

---

## 📝 Collections Detail & Dependencies

### Group A: Order-related (P1 - migrate first)

- **order_online**
  - Parent docs: ~300-500
  - Child subcollection: `items/` (~2-5 items per order)
  - Total docs: ~1000-3000
  - Migration: Parent first, then children

- **penjualanAksesoris**
  - Parent docs: ~500-1000
  - No subcollections
  - Migration: Straightforward

- **stokAksesorisTransaksi**
  - Parent docs: ~1000-2000
  - No subcollections
  - Migration: Straightforward (can be slow due to volume)

### Group B: Service-related (P1 - migrate first)

- **servis**
  - Parent docs: ~200-400
  - Child subcollections: `servis_items/`, `servis_parts/` (~3-10 per service)
  - Total docs: ~500-2500
  - Migration: Parent first, then children

### Group C: Employee data (P2 - migrate second)

- **employees**
  - Parent docs: ~50-100
  - No subcollections
  - Migration: Simple

- **employeeFaces**
  - Parent docs: ~50-100
  - No subcollections
  - Migration: Simple

- **attendance**
  - Parent docs: ~500-1000
  - No subcollections
  - Migration: Straightforward

- **leaveRequests**
  - Parent docs: ~100-200
  - No subcollections
  - Migration: Straightforward

### Group D: Configuration (P2/P3 - migrate last)

- **settings**
  - Parent docs: ~10-20 (usually small number of config docs)
  - Migration: Simple

- **antrian**, **latePermissionCodes**, **manualOvertime**
  - Parent docs: ~50-200 each
  - Migration: Simple

---

## ⚠️ Migration Risks & Mitigations

| Risk                                | Mitigation                                       |
| ----------------------------------- | ------------------------------------------------ |
| Timeout (large batch)               | Use batch size 500, retry logic                  |
| Partial migration failure           | Track progress per collection, resume capability |
| Read inconsistency during migration | Dual-read from both legacy & L1, merge results   |
| Subcollection loss                  | Special handling per parent doc, verify count    |
| Security rule blocking              | Ensure Cloud Function runs as service account    |
| Data duplication                    | Verify both exist, then keep legacy as backup    |

---

## 🚀 Execution Checklist

```
PRE-MIGRATION:
- [ ] Backup Firestore via Cloud Storage export
- [ ] Create Cloud Function migrateToFloorScoped
- [ ] Update readWithL1Priority helper
- [ ] Test Cloud Function on dev data (mock data in dev collection)

MIGRATION DAY:
- [ ] Check no active writes to legacy path (close app if needed)
- [ ] Execute migrateToFloorScoped({ collections: [...], floorId: 'L1', batchSize: 500 })
- [ ] Monitor Firebase Function logs
- [ ] Verify progress in migration_status collection

POST-MIGRATION:
- [ ] Verify collection counts match
- [ ] Spot check 10 docs per collection
- [ ] Test order creation → verify written to both L1 and legacy
- [ ] Test order read → verify reading from L1 first
- [ ] Monitor error logs for 24 hours

CLEANUP (After 1 week if stable):
- [ ] Delete legacy path (optional, if all stable)
- [ ] Remove fallback logic from code
- [ ] Update security rules to force floors/* path
```

---

## 📋 Data Migration Logic (Pseudo-code)

```javascript
async function migrateToFloorScoped({ collections, floorId = "L1", batchSize = 500 }) {
  const results = {};

  for (const collectionName of collections) {
    try {
      results[collectionName] = await migrateCollection(collectionName, floorId, batchSize);
    } catch (error) {
      results[collectionName] = { success: false, error: error.message };
    }
  }

  return results;
}

async function migrateCollection(collectionName, floorId, batchSize) {
  const legacyDocs = await getAllDocsFromLegacy(collectionName);
  const totalDocs = legacyDocs.length;
  let migratedCount = 0;
  let errors = [];

  // Batch write in chunks of 500 to avoid timeout
  for (let i = 0; i < legacyDocs.length; i += batchSize) {
    const batch = [];
    const chunk = legacyDocs.slice(i, i + batchSize);

    for (const doc of chunk) {
      // For parent docs, copy to floors/{floorId}/{collection}/{docId}
      const floorDocRef = db.doc(`floors/${floorId}/${collectionName}/${doc.id}`);
      batch.push(floorDocRef.set(doc.data()));

      // For collections with subcollections, copy those too
      if (SUBCOLLECTIONS[collectionName]) {
        for (const subCollName of SUBCOLLECTIONS[collectionName]) {
          const subDocs = await getAllSubDocs(collectionName, doc.id, subCollName);
          for (const subDoc of subDocs) {
            const floorSubDocRef = db.doc(`floors/${floorId}/${collectionName}/${doc.id}/${subCollName}/${subDoc.id}`);
            batch.push(floorSubDocRef.set(subDoc.data()));
          }
        }
      }
    }

    // Execute batch write
    try {
      await Promise.all(batch);
      migratedCount += chunk.length;
      updateMigrationStatus(collectionName, migratedCount, totalDocs);
    } catch (error) {
      errors.push({ batch: i / batchSize, error: error.message });
    }
  }

  return {
    success: errors.length === 0,
    collectionName,
    migratedCount,
    totalDocs,
    errors,
  };
}
```

---

## 📊 Verification Plan

After migration, run verification:

```javascript
async function verifyMigration(floorId = "L1") {
  const report = {};

  for (const collectionName of MIGRATION_COLLECTIONS) {
    const legacyCount = await countDocs(collectionName);
    const floorCount = await countDocs(`floors/${floorId}/${collectionName}`);

    report[collectionName] = {
      legacyCount,
      floorCount,
      matched: legacyCount === floorCount,
      status: legacyCount === floorCount ? "✅ OK" : "❌ MISMATCH",
    };
  }

  return report;
}
```

---

## 💾 Keep Backup Strategy (Strategy B)

After migration successful:

- **Keep legacy path intact** for 1-2 weeks (safety period)
- **Write new data to floors/L1 only** during stabilization
- **Read from L1 first**, fallback to legacy if missing
- **Monitor errors** - if issues found, can revert

After stabilization period (1-2 weeks):

- Option 1: Keep legacy permanently (double storage cost, but safest)
- Option 2: Delete legacy path (cleanup, reduce cost)
- Option 3: Archive legacy path to Firestore export (cheapest, slower access)

---

## 🎯 Success Criteria

✅ Migration successful when:

1. All collections migrated to floors/L1 (count matches legacy)
2. All subcollections intact (items under order_online, etc)
3. New writes go to floors/L1 only
4. Reads prioritize floors/L1, fallback to legacy if empty
5. No errors in Firestore logs during 24-hour monitoring period
6. UI tests pass (can read, write, query orders/services/etc)
