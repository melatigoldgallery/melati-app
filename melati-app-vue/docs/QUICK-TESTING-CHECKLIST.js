#!/usr/bin/env node
/**
 * Quick Testing Guide: Hard Cutover Verification
 * Run this after starting dev server (npm.cmd run dev)
 *
 * Execute steps in browser console to test hard cutover logic
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         HARD CUTOVER TESTING - Browser Console Guide         ║
╚═══════════════════════════════════════════════════════════════╝

📌 Prerequisites:
   1. npm.cmd run dev (in terminal)
   2. Open http://localhost:5173/login
   3. Login with floor selection (L1)
   4. Navigate to a module (Order/Servis/Stock)
   5. Open Browser Console (F12 → Console tab)

═══════════════════════════════════════════════════════════════

🧪 TEST 1: Check Active Floor (Console)
─────────────────────────────────────────────────────────────

// Run this in console:
sessionStorage.getItem('activeFloor')

Expected: "L1" or "L2"
If empty: Floor selection not working → go back to login


═══════════════════════════════════════════════════════════════

🧪 TEST 2: Verify readWithFloorFallback Helper (Console)
─────────────────────────────────────────────────────────────

// Check if hard-cutover module is loaded:
window.__hardCutoverLoaded__ = true

// Simulate hard cutover (try floor, fallback legacy)
const testFloor = async () => {
  const floorReader = async () => ({ source: 'floor', count: 5 });
  const legacyReader = async () => ({ source: 'legacy', count: 10 });
  
  // Import from hard-cutover.js
  const { readWithFloorFallback } = await import('/src/utils/hard-cutover.js');
  const result = await readWithFloorFallback(floorReader, legacyReader);
  
  console.log('✅ Hard cutover helper works!');
  console.log('Result:', result);
  return result;
};

testFloor();

Expected: { source: 'floor', count: 5 }
This shows floor data is prioritized ✅


═══════════════════════════════════════════════════════════════

🧪 TEST 3: Monitor Order Fetch (Servis Console Logs)
─────────────────────────────────────────────────────────────

1. Navigate to "Data Pesanan" or Order page
2. Open Network Tab (F12 → Network)
3. Look for Firestore queries:
   - Query 1: floors/L1/order_online/{range}
   - If returns data: ✅ Hard cutover SUCCESS
   - If empty: Falls back to order_online/{range}

Check Console Logs:
✅ Should NOT see "Floor read failed" (or it's OK - fallback working)
✅ Should see orders loaded within 1-2 seconds


═══════════════════════════════════════════════════════════════

🧪 TEST 4: Monitor Servis Fetch (Servis Console Logs)
─────────────────────────────────────────────────────────────

1. Navigate to "Data Servis"
2. Open Network Tab (F12 → Network)
3. Look for Firestore queries:
   - Query 1: floors/L1/servis WHERE tanggal >= X AND tanggal <= Y
   - If returns data: ✅ Hard cutover SUCCESS
   - If empty: Falls back to servis query

Check:
✅ Servis list appears (from floor OR legacy - both work)
✅ No duplicate entries


═══════════════════════════════════════════════════════════════

🧪 TEST 5: Fallback Behavior (Test Legacy Read)
─────────────────────────────────────────────────────────────

Scenario: Test fallback if floor-scoped is empty

1. Create old data in legacy path only:
   - Firestore Console → Create order_online/old-order-123
   - Fill with data (tanggal, jam, etc.)

2. In dev server:
   - Navigate to Order page
   - Date filter to include that date
   - ✅ Should see old order (read from legacy fallback)

This proves readWithFloorFallback is working! 🎉


═══════════════════════════════════════════════════════════════

🧪 TEST 6: Performance Check (Console Timing)
─────────────────────────────────────────────────────────────

// Measure fetch time
console.time('fetchOrders');

// Trigger order fetch (navigate to order page)
// Then in console:

console.timeEnd('fetchOrders');

Expected: 
⚡ < 500ms = Excellent
⚡ 500-1000ms = Good (fallback may have occurred)
⚡ > 1000ms = Slow (investigate network/query)


═══════════════════════════════════════════════════════════════

✅ TESTING COMPLETE IF ALL PASS:

[✓] Floor selection works
[✓] readWithFloorFallback helper functional
[✓] Orders load with hard cutover
[✓] Servis loads with hard cutover
[✓] Fallback read works for legacy data
[✓] Performance acceptable

🚀 READY FOR PRODUCTION DEPLOYMENT

═══════════════════════════════════════════════════════════════

❌ TROUBLESHOOTING:

If Orders Don't Load:
  → Check Network tab for Firestore errors
  → Verify floors/L1/order_online exists
  → Check floorId is passed correctly

If Hard Cutover Not Prioritizing Floor:
  → Add console.log in readWithFloorFallback()
  → Verify floor data exists (not empty array)
  → Check floorId parameter is correct (L1 not l1)

═══════════════════════════════════════════════════════════════
`);
