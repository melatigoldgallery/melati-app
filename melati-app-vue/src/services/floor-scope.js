import { collection, doc } from "firebase/firestore";
import { ref as dbRef } from "firebase/database";
import { normalizeFloorId, requireActiveFloor } from "@/config/floor-config";

function resolveFloorId(floorId) {
  if (floorId) {
    const normalized = normalizeFloorId(floorId);
    if (!normalized) throw new Error("Floor tidak valid");
    return normalized;
  }
  return requireActiveFloor();
}

// ── Firestore Helpers ──────────────────────────────────────────────────────

export function floorSegments(...segments) {
  const floorId = resolveFloorId();
  return ["floors", floorId, ...segments];
}

export function floorSegmentsWithFloorId(floorId, ...segments) {
  return ["floors", resolveFloorId(floorId), ...segments];
}

export function floorCollection(db, collectionName, floorId = "") {
  return collection(db, ...["floors", resolveFloorId(floorId), collectionName]);
}

export function floorDoc(db, collectionName, docId, floorId = "") {
  return doc(db, ...["floors", resolveFloorId(floorId), collectionName, docId]);
}

export function floorSubCollection(db, collectionName, docId, subCollectionName, floorId = "") {
  return collection(db, ...["floors", resolveFloorId(floorId), collectionName, docId, subCollectionName]);
}

// ── Realtime Database Helpers ──────────────────────────────────────────────

export function floorDataPath(...segments) {
  const floorId = resolveFloorId();
  return `floorData/${floorId}/${segments.join("/")}`;
}

export function floorDataRef(rtdb, ...pathSegments) {
  return dbRef(rtdb, floorDataPath(...pathSegments));
}

// ── Storage Helpers ───────────────────────────────────────────────────────

export function scopeStoragePath(path, floorId = "") {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return `floors/${resolveFloorId(floorId)}/${cleanPath}`;
}
