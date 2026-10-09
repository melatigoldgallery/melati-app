import { createHash } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config.js";

export function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function base64Utf8(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

export function verifyPasswordHash(plainPassword, storedHash) {
  if (!storedHash) return false;

  // Current standard: SHA-256 hex. Keep base64 fallback for older migrated users.
  if (sha256Hex(plainPassword) === storedHash) return true;
  if (base64Utf8(plainPassword) === storedHash) return true;
  return false;
}

export function buildLegacyUid(username) {
  const safe = String(username)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 96);
  return `legacy_${safe || "user"}`;
}

export function buildFloorUserDocId(floorId, username) {
  const safeFloor =
    String(floorId || "")
      .trim()
      .toUpperCase() === "L2"
      ? "L2"
      : "L1";
  const safeUsername = String(username || "")
    .trim()
    .toLowerCase();
  return `${safeFloor}__${safeUsername}`;
}

export function normalizeUserRole(role, fallback = "staff") {
  const raw = String(role || "")
    .trim()
    .toLowerCase();
  const normalizedFallback =
    fallback === null || fallback === undefined ? "staff" : String(fallback).trim().toLowerCase();

  if (!raw) return normalizedFallback;
  if (raw === "staf") return "staff";
  if (raw === "hr") return "hrd";
  return raw;
}

export function isRoleAllowedForFloor(role, floorId) {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (
    String(floorId || "")
      .trim()
      .toUpperCase() === "L2"
  ) {
    if (["staff", "hrd"].includes(normalizedRole)) return false;
    return true;
  }
  return true;
}

export async function resolveCallerRole(request) {
  const authData = request.auth;
  if (!authData?.uid) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const directRole = normalizeUserRole(authData.token?.role, "");
  if (directRole) return directRole;

  const email = String(authData.token?.email || "").trim();
  if (email) {
    try {
      const snap = await db.collection("userRoles").doc(email).get();
      if (snap.exists) {
        return normalizeUserRole(snap.data()?.role, "staff");
      }
    } catch (_) {
      // noop
    }
  }

  return "staff";
}
