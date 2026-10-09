import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export { admin };

export const WITA_OFFSET = "+08:00";
export const WITA_MS = 8 * 60 * 60 * 1000;
export const LOCK_TTL_MS = 10 * 60 * 1000;
export const ENABLE_GLOBAL_SNAPSHOT_COMPAT = false;
export const SNAPSHOT_FLOORS = ["L1", "L2"];
