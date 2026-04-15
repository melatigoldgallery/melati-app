import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export const DEFAULT_THEME_APPEARANCE_SETTINGS = Object.freeze({
  sidebarStart: "#667eea",
  sidebarMid: "#667eea",
  sidebarEnd: "#002975",
  tampilkanBtnStart: "#3f37c9",
  tampilkanBtnEnd: "#4361ee",
  antrianCardHeaderStart: "#3f37c9",
  antrianCardHeaderEnd: "#4361ee",
  surfaceAccentStart: "#3f37c9",
  surfaceAccentEnd: "#4361ee",
  lastUpdated: null,
  updatedBy: "System",
});

const THEME_SETTINGS_DOC_REF = doc(db, "settings", "themeAppearance");

function normalizeHexColor(value, fallback) {
  const hex = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  return fallback;
}

export function normalizeThemeAppearanceSettings(raw = {}) {
  return {
    ...DEFAULT_THEME_APPEARANCE_SETTINGS,
    sidebarStart: normalizeHexColor(raw.sidebarStart, DEFAULT_THEME_APPEARANCE_SETTINGS.sidebarStart),
    sidebarMid: normalizeHexColor(raw.sidebarMid, DEFAULT_THEME_APPEARANCE_SETTINGS.sidebarMid),
    sidebarEnd: normalizeHexColor(raw.sidebarEnd, DEFAULT_THEME_APPEARANCE_SETTINGS.sidebarEnd),
    tampilkanBtnStart: normalizeHexColor(raw.tampilkanBtnStart, DEFAULT_THEME_APPEARANCE_SETTINGS.tampilkanBtnStart),
    tampilkanBtnEnd: normalizeHexColor(raw.tampilkanBtnEnd, DEFAULT_THEME_APPEARANCE_SETTINGS.tampilkanBtnEnd),
    antrianCardHeaderStart: normalizeHexColor(
      raw.antrianCardHeaderStart,
      DEFAULT_THEME_APPEARANCE_SETTINGS.antrianCardHeaderStart,
    ),
    antrianCardHeaderEnd: normalizeHexColor(
      raw.antrianCardHeaderEnd,
      DEFAULT_THEME_APPEARANCE_SETTINGS.antrianCardHeaderEnd,
    ),
    surfaceAccentStart: normalizeHexColor(raw.surfaceAccentStart, DEFAULT_THEME_APPEARANCE_SETTINGS.surfaceAccentStart),
    surfaceAccentEnd: normalizeHexColor(raw.surfaceAccentEnd, DEFAULT_THEME_APPEARANCE_SETTINGS.surfaceAccentEnd),
    lastUpdated: raw.lastUpdated || null,
    updatedBy: raw.updatedBy || "System",
  };
}

export function applyThemeAppearanceToDocument(rawSettings = {}, rootElement = document.documentElement) {
  if (!rootElement || !rootElement.style || typeof rootElement.style.setProperty !== "function") return;

  const settings = normalizeThemeAppearanceSettings(rawSettings);
  const cssVariables = {
    "--theme-sidebar-start": settings.sidebarStart,
    "--theme-sidebar-mid": settings.sidebarMid,
    "--theme-sidebar-end": settings.sidebarEnd,
    "--theme-tampilkan-start": settings.tampilkanBtnStart,
    "--theme-tampilkan-end": settings.tampilkanBtnEnd,
    "--theme-antrian-card-header-start": settings.antrianCardHeaderStart,
    "--theme-antrian-card-header-end": settings.antrianCardHeaderEnd,
    "--theme-surface-accent-start": settings.surfaceAccentStart,
    "--theme-surface-accent-end": settings.surfaceAccentEnd,
  };

  Object.entries(cssVariables).forEach(([key, value]) => {
    rootElement.style.setProperty(key, value);
  });
}

export async function ensureThemeAppearanceSettings() {
  const snap = await getDoc(THEME_SETTINGS_DOC_REF);
  if (snap.exists()) return;

  await setDoc(
    THEME_SETTINGS_DOC_REF,
    {
      ...DEFAULT_THEME_APPEARANCE_SETTINGS,
      lastUpdated: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || "System (Initial)",
    },
    { merge: true },
  );
}

export async function fetchThemeAppearanceSettings() {
  const snap = await getDoc(THEME_SETTINGS_DOC_REF);
  const source = snap.exists() ? snap.data() : DEFAULT_THEME_APPEARANCE_SETTINGS;
  return normalizeThemeAppearanceSettings(source);
}

export async function saveThemeAppearanceSettings(payload, updatedBy = "System") {
  const normalized = normalizeThemeAppearanceSettings(payload);
  await setDoc(
    THEME_SETTINGS_DOC_REF,
    {
      ...normalized,
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedBy || auth.currentUser?.email || "System",
    },
    { merge: true },
  );
}

export function subscribeThemeAppearanceSettings(onData, onError) {
  return onSnapshot(
    THEME_SETTINGS_DOC_REF,
    (snap) => {
      const source = snap.exists() ? snap.data() : DEFAULT_THEME_APPEARANCE_SETTINGS;
      onData(normalizeThemeAppearanceSettings(source));
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    },
  );
}
