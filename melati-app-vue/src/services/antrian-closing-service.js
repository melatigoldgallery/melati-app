import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { floorDoc } from "@/services/floor-scope";

export const DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS = Object.freeze({
  enabled: true,
  time: "20:55",
  repeat: 2,
  reminderLimitEnabled: true,
  reminderLimitMaxCalls: 2,
  reminderLimitWindowSeconds: 60,
  message:
    "Kepada pelanggan Melati, kami informasikan, toko akan tutup pada jam 9 malam. Silakan melanjutkan berbelanja dan kami akan membantu hingga selesai. Terima kasih atas perhatiannya",
  lastUpdated: null,
  updatedBy: "System",
  ttsProvider: "translate",
  ttsVoiceName: "id-ID-Wavenet-A",
  ttsPitch: 0.0,
  ttsRate: 0.85,
});

function getClosingSettingsDoc(floorId = "") {
  return floorDoc(db, "settings", "antrianClosingAnnouncement", floorId);
}

function isValidTimeFormat(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function normalizeRepeat(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.repeat;
  return Math.max(1, Math.min(5, Math.floor(n)));
}

function normalizeReminderMaxCalls(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitMaxCalls;
  return Math.max(1, Math.min(20, Math.floor(n)));
}

function normalizeReminderWindowSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitWindowSeconds;
  return Math.max(10, Math.min(3600, Math.floor(n)));
}

function normalizeMessage(value) {
  const text = String(value || "").trim();
  return text || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.message;
}

export function normalizeClosingAnnouncementSettings(raw = {}) {
  return {
    ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
    enabled: raw.enabled !== false,
    time: isValidTimeFormat(raw.time) ? raw.time : DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.time,
    repeat: normalizeRepeat(raw.repeat),
    reminderLimitEnabled: raw.reminderLimitEnabled !== false,
    reminderLimitMaxCalls: normalizeReminderMaxCalls(raw.reminderLimitMaxCalls),
    reminderLimitWindowSeconds: normalizeReminderWindowSeconds(raw.reminderLimitWindowSeconds),
    message: normalizeMessage(raw.message),
    lastUpdated: raw.lastUpdated || null,
    updatedBy: raw.updatedBy || "System",
    ttsProvider: raw.ttsProvider || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.ttsProvider,
    ttsVoiceName: raw.ttsVoiceName || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.ttsVoiceName,
    ttsPitch: typeof raw.ttsPitch === "number" ? raw.ttsPitch : DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.ttsPitch,
    ttsRate: typeof raw.ttsRate === "number" ? raw.ttsRate : DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.ttsRate,
  };
}

export async function ensureClosingAnnouncementSettings(floorId = "") {
  const docRef = getClosingSettingsDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  const now = new Date().toISOString();
  await setDoc(
    docRef,
    {
      ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
      lastUpdated: now,
      updatedBy: auth.currentUser?.email || "System (Initial)",
    },
    { merge: true },
  );
}

export async function fetchClosingAnnouncementSettings(floorId = "") {
  const snap = await getDoc(getClosingSettingsDoc(floorId));
  return normalizeClosingAnnouncementSettings(snap.exists() ? snap.data() : DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS);
}

export async function saveClosingAnnouncementSettings(payload, updatedBy = "System", floorId = "") {
  const normalized = normalizeClosingAnnouncementSettings(payload);
  await setDoc(
    getClosingSettingsDoc(floorId),
    {
      ...normalized,
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedBy || auth.currentUser?.email || "System",
    },
    { merge: true },
  );
}

export function subscribeClosingAnnouncementSettings(callback, floorId = "") {
  return onSnapshot(getClosingSettingsDoc(floorId), (snap) => {
    const data = snap.exists() ? snap.data() : DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS;
    callback(normalizeClosingAnnouncementSettings(data));
  });
}
