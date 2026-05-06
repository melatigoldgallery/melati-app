import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFloorUserDocId,
  getAllowedRolesForFloor,
  getFloorLabel,
  normalizeFloorId,
  parseFloorFromUserDocId,
} from "../src/config/floor-config.js";

test("normalizeFloorId accepts canonical ids", () => {
  assert.equal(normalizeFloorId("l1"), "L1");
  assert.equal(normalizeFloorId(" Lt 2 "), "");
  assert.equal(normalizeFloorId("unknown", "L2"), "L2");
});

test("floor label and roles follow PRD matrix", () => {
  assert.equal(getFloorLabel("L1"), "Lt 1");
  assert.equal(getFloorLabel("L2"), "Lt 2");
  assert.deepEqual(getAllowedRolesForFloor("L1"), ["supervisor", "admin", "staff", "hrd"]);
  assert.deepEqual(getAllowedRolesForFloor("L2"), ["supervisor", "admin"]);
});

test("user doc ids are floor-scoped and parse back", () => {
  const docId = buildFloorUserDocId("L2", "Admin");
  assert.equal(docId, "L2__admin");
  assert.equal(parseFloorFromUserDocId(docId), "L2");
});
