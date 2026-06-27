import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { DEFAULT_STORE_PROFILE, DEFAULT_STORE_SOP } from "@/config/toko-defaults";

function getProfileDoc() {
  return doc(db, "settings", "storeProfile");
}

function getSOPDoc() {
  return doc(db, "settings", "storeSOP");
}

// ── Profil Toko Services ───────────────────────────────────────────────────

export async function ensureStoreProfile() {
  const docRef = getProfileDoc();
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  // Seamless migration: try to read from L2 first because the newest/current data is there
  let initialData = { ...DEFAULT_STORE_PROFILE };
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "storeProfile");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
    }
  } catch (err) {
    console.warn("Gagal migrasi data profil toko dari L2:", err);
  }

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...initialData,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchStoreProfile() {
  await ensureStoreProfile();
  const snap = await getDoc(getProfileDoc());
  return snap.exists() ? snap.data() : { ...DEFAULT_STORE_PROFILE };
}

export async function saveStoreProfile(payload, updatedBy = "System") {
  const docRef = getProfileDoc();
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

export async function ensureStoreSOP() {
  const docRef = getSOPDoc();
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  // Seamless migration: try to read from L2 first because the newest/current data is there
  let initialData = { ...DEFAULT_STORE_SOP };
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "storeSOP");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
    }
  } catch (err) {
    console.warn("Gagal migrasi data SOP toko dari L2:", err);
  }

  const now = new Date().toISOString();
  await setDoc(docRef, {
    ...initialData,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchStoreSOP() {
  await ensureStoreSOP();
  const snap = await getDoc(getSOPDoc());
  return snap.exists() ? snap.data() : { ...DEFAULT_STORE_SOP };
}

export async function saveStoreSOP(payload, updatedBy = "System") {
  const docRef = getSOPDoc();
  const now = new Date().toISOString();
  await setDoc(docRef, {
    staffSOP: payload.staffSOP || "",
    goldKnowledge: payload.goldKnowledge || "",
    diamondKnowledge: payload.diamondKnowledge || "",
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}
