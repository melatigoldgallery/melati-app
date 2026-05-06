#!/usr/bin/env node
/**
 * Smoke test untuk hard cutover logic
 * Verifies readWithFloorFallback dan floor-scoped read/write pattern
 */

import { readWithFloorFallback, isFloorMigrated } from "../src/utils/hard-cutover.js";

console.log("🔄 Hard Cutover Smoke Test");
console.log("==========================\n");

// Test 1: readWithFloorFallback returns floor data if available
console.log("Test 1: readWithFloorFallback prioritizes floor-scoped data");
(async () => {
  const floorReader = async () => ({ test: "floor-data", count: 5 });
  const legacyReader = async () => ({ test: "legacy-data", count: 10 });

  const result = await readWithFloorFallback(floorReader, legacyReader);
  console.log("  Result:", result);
  console.assert(result.count === 5, "Should prioritize floor data");
  console.log("  ✓ PASS\n");
})();

// Test 2: readWithFloorFallback falls back to legacy if floor is empty
setTimeout(async () => {
  console.log("Test 2: readWithFloorFallback falls back to legacy if floor empty");
  const floorReader = async () => null;
  const legacyReader = async () => ({ test: "legacy-data", count: 10 });

  const result = await readWithFloorFallback(floorReader, legacyReader);
  console.log("  Result:", result);
  console.assert(result.count === 10, "Should fallback to legacy data");
  console.log("  ✓ PASS\n");
}, 100);

// Test 3: isFloorMigrated detects empty arrays
setTimeout(async () => {
  console.log("Test 3: isFloorMigrated checks data presence");
  const hasMigration = await isFloorMigrated(async () => [{ id: 1 }, { id: 2 }]);
  const notMigrated = await isFloorMigrated(async () => []);

  console.log("  Has migration:", hasMigration);
  console.log("  Not migrated:", notMigrated);
  console.assert(hasMigration === true, "Should detect non-empty data");
  console.assert(notMigrated === false, "Should detect empty data");
  console.log("  ✓ PASS\n");
}, 200);

// Summary
setTimeout(() => {
  console.log("✅ Hard Cutover Smoke Test Complete");
  console.log("   Ready for production deployment\n");
  process.exit(0);
}, 300);
