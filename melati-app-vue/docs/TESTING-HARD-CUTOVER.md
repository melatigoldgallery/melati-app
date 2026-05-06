# Testing Strategy: Hard Cutover Migration

## 1️⃣ Level 1: Unit Tests (DONE ✅)

Tests untuk helpers & configuration logic yang pure (tidak butuh Firebase connection).

### Run Unit Tests

```bash
npm.cmd test
```

**Output:**

- ✅ floor-config tests (4/4) — Floor ID validation, label, roles, user doc ID parsing
- ✅ floor-math tests (2/2) — Reconciliation status calculation
- ✅ Hard cutover smoke tests (3/3) — readWithFloorFallback logic

**Expected:**

- 6/6 tests passing
- Duration: ~1.6s
- No errors

## 2️⃣ Level 2: Build Validation (DONE ✅)

Tests untuk production bundle compilation.

### Run Production Build

```bash
npm.cmd run build
```

**Output:**

- ✅ Vite v6.4.2 building
- ✅ 479 modules transformed
- ✅ dist/ artifacts created
- ✅ No syntax/import errors

**Validates:**

- All floor-scoped imports work
- readWithFloorFallback integrated correctly
- Hard cutover logic compiles
- No circular dependencies

## 3️⃣ Level 3: Dev Server Testing (IMPORTANT - DO NEXT)

Tests aplikasi dengan floor-scoped reads + fallback logic di dev environment.

### Start Dev Server

```bash
npm.cmd run dev
```

**What to test in browser:**

### Test A: Login & Floor Selection

1. Open http://localhost:5173/login
2. Select "Lt 1" (L1 floor)
3. Enter username & password
4. ✅ Should see floor badge "Lt 1" di header
5. Check browser console — no floor-related errors

**Expected:**

- Login succeeds with floor selection
- Active floor persists in session
- No "Lantai belum dipilih" errors

### Test B: Order Online (fetchOrderOnlineByRange hard cutover)

1. Navigate to "Data Pesanan" or "Manajemen Order"
2. Select date range (e.g., last 7 days)
3. Click "Load" or auto-load orders
4. ✅ Orders should appear from floor-scoped OR legacy path

**What happens internally:**

```
readWithFloorFallback(
  floorReader: floors/L1/order_online/...  ← tries this first
  legacyReader: order_online/...            ← fallback if empty
)
```

**Check in Console:**

- No "Could not read order" errors
- Network tab shows 1-2 Firestore queries
- Orders loaded within 1-2 seconds

### Test C: Servis Management (fetchServisByMonth hard cutover)

1. Navigate to "Data Servis"
2. View current month data (should load automatically)
3. ✅ Servis items should appear

**What happens internally:**

```
readWithFloorFallback(
  floorReader: floors/L1/servis/... WHERE tanggal between X and Y
  legacyReader: servis/... WHERE tanggal between X and Y
)
```

**Check:**

- Servis list loads without delay
- Date filtering works
- No duplicate entries (means fallback logic working correctly)

### Test D: Stock/Aksesoris Sales (fetchCatalog hard cutover)

1. Navigate to "Penjualan Aksesoris"
2. Click "Tambah Item" to open catalog
3. ✅ Catalog items should appear in dropdown

**What happens internally:**

```
readWithFloorFallback(
  floorReader: floors/L1/stokAksesoris/{kode}
  legacyReader: stokAksesoris/{kode}
)
```

**Check:**

- Catalog loads quickly (<1s)
- Can select items from list
- Item details show correctly

### Test E: Create New Transaction (Floor-Only Verification)

1. **In Order Module:** Create new order
   - Fill form → Click Save
   - ✅ Should create in floors/L1/order_online/{id}

2. **In Servis Module:** Create new servis entry
   - Fill form → Click Save
   - ✅ Should create in floors/L1/servis/{id}

**How to verify in Firestore Console:**

```
1. Open Firebase Console
2. Go to Firestore Database
3. Check floors/L1/order_online/{docId} exists
```

## 4️⃣ Level 4: Firestore Console Verification (RECOMMENDED)

Direct database inspection to confirm floor-scoped data.

### Check Floor Writes

```
1. Open Firebase Console → Firestore Database
2. Navigate to: floors/L1/order_online
   - Should see recent orders created today

3. Verify timestamps and fields look correct
```

### Check Floor-Scoped Reads Work

```
1. In Console, check:
   floors/L1/servis — should have recent entries
   floors/L1/stokAksesorisTransaksi — should have recent logs

2. Verify no errors creating docs
```

## 5️⃣ Level 5: Monitoring Post-Deployment

After deploying to production, monitor these metrics:

### Real-Time Logs

```bash
# In Firebase Console: Cloud Functions Logs
# Monitor for errors:
- "Could not read floor data" → fallback activated
- Network timeouts → performance issue
```

### Data Consistency Metrics

```
Check daily:
- Count docs in floors/L1/* collections

Alert if:
- Floor counts drop unexpectedly or stop increasing
```

## 🧪 Testing Checklist

### Before Production Deploy

- [ ] npm.cmd test — all 6/6 passing
- [ ] npm.cmd run build — 479 modules, no errors
- [ ] Dev server: Login with floor selection works
- [ ] Dev server: Order fetch shows data (hard cutover)
- [ ] Dev server: Servis fetch shows data (hard cutover)
- [ ] Dev server: Stock catalog loads (hard cutover)
- [ ] Dev server: New transaction creates in floors path
- [ ] Firestore Console: Verify floor-path data

### After Production Deploy

- [ ] Monitor Cloud Function logs (first 1 hour)
- [ ] Check order/servis data loads correctly (first 3 hours)
- [ ] Verify no "fallback to legacy" errors (first 24 hours)

## 🔍 Debugging Tips

### If Orders Not Loading

```
Browser Console:
1. Type: await fetch('/.../api/orders')
2. Check network tab for errors
3. Look for "Could not read floor" messages

Firestore Console:
1. Check floors/L1/order_online exists
2. Manually query to see if data is there
```

### If Floor Writes Not Working

```
Firestore Console:
1. Create new document in dev server
2. Check floors/L1/order_online/{id}
3. If missing → check network errors in console
```

### If Hard Cutover Not Prioritizing Floor

```
Browser Console (in service):
1. Add console.log in readWithFloorFallback()
2. See which reader executed (floor or legacy)
3. If always falling back:
   → Floor collection is empty (OK during cutover)
   → Or floorId not passed correctly
```

## Performance Baseline (Expected)

**Single Read Operation:**

- Floor-scoped read: 50-200ms (Firestore network latency)
- Fallback to legacy: +50-200ms (if floor is empty)
- Total with hard cutover: ~100-300ms (acceptable)

**Batch Operations (Order List):**

- 50 items, floor-scoped: ~300-500ms
- Fallback if needed: ~600-1000ms (rare)

**Report Queries (Servis Management):**

- Monthly reconciliation: ~500-800ms
- With fallback: ~1-1.5s (acceptable for reports)

## Timeline

```
| Phase      | Duration | What to Test              |
|------------|----------|---------------------------|
| Dev Server | 1-2 hours| Login, reads, floor-only writes |
| Staging*   | 4-8 hours| Full user journey         |
| Prod Deploy| Ongoing  | Monitor logs & metrics    |
| Week 2     | Cleanup  | Remove fallback (optional)|

* Staging = production-like environment with real data
```

---

**Start with:** Dev server testing (Level 3) to verify hard cutover logic works locally before production deployment.
