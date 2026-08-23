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

  // If global document exists and was already migrated/initialized, return it immediately
  if (snap.exists() && snap.data().migratedFromL2) {
    return snap.data();
  }

  // Seamless migration: try to read from L2 first to migrate it to global
  let initialData = { ...DEFAULT_STORE_PROFILE };
  let migrated = false;
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "storeProfile");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
      migrated = true;
    }
  } catch (err) {
    console.warn("Gagal migrasi data profil toko dari L2:", err);
  }

  const now = new Date().toISOString();
  const finalData = {
    ...initialData,
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial/Migration)",
  };

  await setDoc(docRef, finalData);
  if (migrated) {
    console.log("Sukses migrasi data profil toko dari L2 ke Global");
  }
  return finalData;
}

export async function fetchStoreProfile() {
  return await ensureStoreProfile();
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
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

// ── SOP Services ───────────────────────────────────────────────────────────

export async function ensureStoreSOP() {
  const docRef = getSOPDoc();
  const snap = await getDoc(docRef);

  // If global document exists and was already migrated/initialized, return it immediately
  if (snap.exists() && snap.data().migratedFromL2) {
    return snap.data();
  }

  // Seamless migration: try to read from L2 first to migrate it to global
  let initialData = { ...DEFAULT_STORE_SOP };
  let migrated = false;
  try {
    const legacyDocRef = doc(db, "floors", "L2", "settings", "storeSOP");
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      initialData = legacySnap.data();
      migrated = true;
    }
  } catch (err) {
    console.warn("Gagal migrasi data SOP toko dari L2:", err);
  }

  const now = new Date().toISOString();
  const finalData = {
    ...initialData,
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: auth.currentUser?.email || "System (Initial/Migration)",
  };

  await setDoc(docRef, finalData);
  if (migrated) {
    console.log("Sukses migrasi data SOP toko dari L2 ke Global");
  }
  return finalData;
}

export async function fetchStoreSOP() {
  return await ensureStoreSOP();
}

export async function saveStoreSOP(payload, updatedBy = "System") {
  const docRef = getSOPDoc();
  const now = new Date().toISOString();
  await setDoc(docRef, {
    staffSOP: payload.staffSOP || "",
    goldKnowledge: payload.goldKnowledge || "",
    diamondKnowledge: payload.diamondKnowledge || "",
    opsSOP: payload.opsSOP || "",
    migratedFromL2: true,
    lastUpdated: now,
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}
