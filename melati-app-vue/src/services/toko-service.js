import { getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { floorDoc } from "@/services/floor-scope";
import { getActiveFloor } from "@/config/floor-config";
import { DEFAULT_STORE_PROFILE, DEFAULT_STORE_SOP } from "@/config/toko-defaults";

function getProfileDoc(floorId = "") {
  const activeFloor = floorId || getActiveFloor();
  if (!activeFloor) {
    throw new Error("Floor tidak aktif. Gagal memuat profil toko.");
  }
  return floorDoc(db, "settings", "storeProfile", activeFloor);
}

function getSOPDoc(floorId = "") {
  const activeFloor = floorId || getActiveFloor();
  if (!activeFloor) {
    throw new Error("Floor tidak aktif. Gagal memuat SOP toko.");
  }
  return floorDoc(db, "settings", "storeSOP", activeFloor);
}

// ── Profil Toko Services ───────────────────────────────────────────────────

export async function ensureStoreProfile(floorId = "") {
  const docRef = getProfileDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...DEFAULT_STORE_PROFILE,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchStoreProfile(floorId = "") {
  await ensureStoreProfile(floorId);
  const snap = await getDoc(getProfileDoc(floorId));
  return snap.exists() ? snap.data() : { ...DEFAULT_STORE_PROFILE };
}

export async function saveStoreProfile(payload, updatedBy = "System", floorId = "") {
  const docRef = getProfileDoc(floorId);
  const now = new Date().toISOString();
  await setDoc(docRef, {
    about: payload.about || "",
    mission: payload.mission || "",
    values: payload.values || "",
    team: payload.team || "",
    rightsAndObligations: payload.rightsAndObligations || "",
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

// ── SOP Services ───────────────────────────────────────────────────────────

export async function ensureStoreSOP(floorId = "") {
  const docRef = getSOPDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...DEFAULT_STORE_SOP,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchStoreSOP(floorId = "") {
  await ensureStoreSOP(floorId);
  const snap = await getDoc(getSOPDoc(floorId));
  return snap.exists() ? snap.data() : { ...DEFAULT_STORE_SOP };
}

export async function saveStoreSOP(payload, updatedBy = "System", floorId = "") {
  const docRef = getSOPDoc(floorId);
  const now = new Date().toISOString();
  await setDoc(docRef, {
    staffSOP: payload.staffSOP || "",
    goldKnowledge: payload.goldKnowledge || "",
    diamondKnowledge: payload.diamondKnowledge || "",
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}
