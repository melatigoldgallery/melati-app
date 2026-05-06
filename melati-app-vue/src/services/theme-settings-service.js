import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { floorDoc } from "@/services/floor-scope";
import { getActiveFloor } from "@/config/floor-config";

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

function getThemeSettingsDoc(floorId = "") {
  // Always use floor-scoped path - no fallback to global
  // This ensures L1 and L2 have completely isolated theme settings
  const activeFloor = floorId || getActiveFloor();
  if (!activeFloor) {
    throw new Error("Floor tidak dipilih. Tidak dapat membaca pengaturan tema.");
  }
  return floorDoc(db, "settings", "themeAppearance", activeFloor);
}

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

export async function ensureThemeAppearanceSettings(floorId = "") {
  const docRef = getThemeSettingsDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  // Only write to floor-scoped path - no global write
  await setDoc(docRef, {
    ...DEFAULT_THEME_APPEARANCE_SETTINGS,
    lastUpdated: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchThemeAppearanceSettings(floorId = "") {
  // Always read from floor-scoped path only - no fallback to global
  const snap = await getDoc(getThemeSettingsDoc(floorId));
  const source = snap.exists() ? snap.data() : DEFAULT_THEME_APPEARANCE_SETTINGS;
  return normalizeThemeAppearanceSettings(source);
}

export async function saveThemeAppearanceSettings(payload, updatedBy = "System", floorId = "") {
  const normalized = normalizeThemeAppearanceSettings(payload);
  // Only write to floor-scoped path - no global write
  // This ensures L1 and L2 themes are completely isolated
  await setDoc(getThemeSettingsDoc(floorId), {
    ...normalized,
    lastUpdated: new Date().toISOString(),
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

export function subscribeThemeAppearanceSettings(onData, onError, floorId = "") {
  // Subscribe to floor-scoped theme settings only
  return onSnapshot(
    getThemeSettingsDoc(floorId),
    (snap) => {
      const source = snap.exists() ? snap.data() : DEFAULT_THEME_APPEARANCE_SETTINGS;
      onData(normalizeThemeAppearanceSettings(source));
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    },
  );
}

export function resetThemeAppearanceToDefault(rootElement = document.documentElement) {
  // Reset all theme CSS variables to default (used on logout)
  if (!rootElement || !rootElement.style || typeof rootElement.style.setProperty !== "function") return;

  const cssVariables = [
    "--theme-sidebar-start",
    "--theme-sidebar-mid",
    "--theme-sidebar-end",
    "--theme-tampilkan-start",
    "--theme-tampilkan-end",
    "--theme-antrian-card-header-start",
    "--theme-antrian-card-header-end",
    "--theme-surface-accent-start",
    "--theme-surface-accent-end",
  ];

  cssVariables.forEach((key) => {
    rootElement.style.removeProperty(key);
  });
}
