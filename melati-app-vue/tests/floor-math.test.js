import test from "node:test";
import assert from "node:assert/strict";
import { calculateReconciliationStatus, getSafeQty } from "../src/utils/floor-math.js";

test("getSafeQty returns numeric fallback on invalid input", () => {
  assert.equal(getSafeQty("12"), 12);
  assert.equal(getSafeQty("abc", 7), 7);
});

test("calculateReconciliationStatus matches klop/kurang/lebih rules", () => {
  assert.deepEqual(calculateReconciliationStatus(5, 5), { status: "klop", variance: 0 });
  assert.deepEqual(calculateReconciliationStatus(3, 5), { status: "kurang", variance: -2 });
  assert.deepEqual(calculateReconciliationStatus(7, 5), { status: "lebih", variance: 2 });
});
