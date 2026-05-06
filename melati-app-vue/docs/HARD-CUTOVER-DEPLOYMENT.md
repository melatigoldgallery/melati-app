# 🚀 Hard Cutover Deployment Checklist

## Pre-Deployment ✅

- [x] Hard cutover helpers implemented (readWithFloorFallback, isFloorMigrated)
- [x] Smoke tests passing (3/3 tests)
- [x] Critical services updated with hard cutover pattern:
  - [x] order-online-service (fetchOrderOnlineByRange + fallback)
  - [x] servis-service (fetchServisByMonth + fallback)
  - [x] stock-service (fetchCatalog, fetchStockItem + fallback)
- [x] Build passing (479 modules)
- [x] Unit tests passing (6/6)
- [x] No syntax or import errors

## Deployment Steps

1. **Deploy Code** (This Build)
   - Push dist/ to production (Firebase Hosting)
   - Update Cloud Functions if needed (already floor-aware)
2. **Verify Floor Data** (First 30 mins)
   - Monitor logs for read failures
   - Check floor-scoped collections have data
   - Verify floor-scoped writes are working
3. **Monitor Cutover** (First 24 hours)
   - Check order/servis/stock reads work correctly
   - Verify no data loss or inconsistency
   - Monitor performance (fallback adds 1 extra query)

4. **Stabilization** (Days 2-7)
   - Confirm floor migration is complete
   - Document any issues
   - Prepare cleanup phase (week 2)

## Post-Deployment (Week 2)

- Remove fallback reads (optional optimization)
- Archive legacy collections (or keep for audit trail)
- Update documentation

## Rollback Plan

If issues found during cutover:

1. Deploy previous build (before hard-cutover)
2. Legacy paths remain unchanged during cutover
3. Floor-scoped read errors won't affect legacy-only systems

## Data Consistency Notes

- Floor-only writes: all new writes go to floor-scoped paths
- Hard cutover read: floor-scoped first, legacy as fallback
- During cutover: legacy remains as backup
- No data loss expected (legacy preserved)

## Services Currently Floor-Aware

✅ order-online-service
✅ servis-service
✅ stock-service
✅ absensi-service (L1)
✅ antrian-service
✅ theme-settings-service
✅ order-online-management-service
✅ servis-management-service
✅ inventory-service
✅ sales-service
✅ mutasi-service
✅ restok-service
✅ Cloud Functions (login, auth, floor validation)

## Files Modified for Hard Cutover

- src/utils/hard-cutover.js (NEW - helpers)
- src/services/order-online-service.js (hard cutover read pattern)
- src/services/servis-service.js (hard cutover read pattern)
- src/services/stock-service.js (hard cutover read pattern)
- tests/hard-cutover.smoke.js (NEW - smoke tests)

## Build Info

- Vite v6.4.2
- Modules: 479 (↑1 from hard-cutover import)
- Bundle size: stable (no significant increase)
- Build time: 6.31s
