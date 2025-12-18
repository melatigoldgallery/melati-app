# Deploy Firestore Composite Indexes

## Phase 3 Optimization - Composite Index Deployment

### Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized
- Authentication with Firebase account

### Deployment Steps

#### 1. Deploy Indexes to Firestore

```bash
firebase deploy --only firestore:indexes
```

#### 2. Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** > **Indexes** tab
4. Verify these indexes are created:

**servis Collection Indexes:**

- `tanggal (ASC) + statusServis (ASC) + statusPengambilan (ASC)`
- `tanggal (DESC) + statusServis (ASC)`
- `tanggal (DESC) + statusPengambilan (ASC)`

#### 3. Index Build Time

- Small dataset (<1000 docs): ~1-5 minutes
- Medium dataset (1000-10000 docs): ~5-15 minutes
- Large dataset (>10000 docs): ~15-60 minutes

**Status:** Check "Building" → "Enabled" in Firebase Console

### Performance Impact

| Query Type              | Before Index | After Index |
| ----------------------- | ------------ | ----------- |
| Date range only         | ~200ms       | ~150ms      |
| Date + 1 status filter  | ~300ms       | ~100ms      |
| Date + 2 status filters | ~400ms       | ~80ms       |

**Reads Optimization:**

- Client-side filtering: Fetch ALL → Filter (100 reads → 100 reads)
- Server-side filtering: Fetch FILTERED → Done (100 reads → 20 reads)

### Testing After Deployment

1. Open laporan-servis.html
2. Open DevTools Console
3. Select month + apply filters
4. Look for log: `✓ Filtered query: X records (Y reads)`
5. Verify Y < X (server-side filtering working)

### Troubleshooting

**Error: "The query requires an index"**

- Solution: Wait for index build to complete
- Check Firebase Console > Indexes > Status = "Enabled"

**Error: "PERMISSION_DENIED"**

- Solution: Check firestore.rules allows read access
- Verify authentication is working

**Slow query after deployment**

- Solution: Clear cache `smartServisCache.clearAll()`
- Refresh browser and test again

### Rollback (if needed)

```bash
# Remove from firestore.indexes.json
# Then deploy
firebase deploy --only firestore:indexes
```

---

**Estimated Total Time:** 5-15 minutes
**Status Check:** Firebase Console > Firestore > Indexes
