const FLOOR_STORAGE_KEY = "activeFloor";

export const FLOOR_IDS = ["L1", "L2"];
export const DEFAULT_FLOOR_ID = "L1";

const FLOOR_LABELS = {
  L1: "Lt 1",
  L2: "Lt 2",
};

const FLOOR_ROLE_MATRIX = {
  L1: ["supervisor", "admin", "staff", "hrd"],
  L2: ["supervisor", "admin"],
};

export function normalizeFloorId(value, fallback = "") {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (FLOOR_IDS.includes(raw)) return raw;
  return fallback ? normalizeFloorId(fallback, "") : "";
}

export function getFloorLabel(floorId) {
  const normalized = normalizeFloorId(floorId, DEFAULT_FLOOR_ID);
  return FLOOR_LABELS[normalized] || normalized;
}

export function setActiveFloor(floorId) {
  const normalized = normalizeFloorId(floorId);
  if (!normalized) throw new Error("Floor tidak valid");
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(FLOOR_STORAGE_KEY, normalized);
  }
  return normalized;
}

export function clearActiveFloor() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(FLOOR_STORAGE_KEY);
  }
}

export function getActiveFloor({ fallback = "" } = {}) {
  if (typeof sessionStorage === "undefined") return normalizeFloorId(fallback);
  const normalized = normalizeFloorId(sessionStorage.getItem(FLOOR_STORAGE_KEY));
  if (normalized) return normalized;
  return normalizeFloorId(fallback);
}

export function requireActiveFloor() {
  const floorId = getActiveFloor();
  if (!floorId) {
    throw new Error("Lantai belum dipilih. Silakan pilih Lt 1 atau Lt 2.");
  }
  return floorId;
}

export function getAllowedRolesForFloor(floorId) {
  const normalized = normalizeFloorId(floorId, DEFAULT_FLOOR_ID);
  return FLOOR_ROLE_MATRIX[normalized] || FLOOR_ROLE_MATRIX[DEFAULT_FLOOR_ID];
}

export function isRoleAllowedForFloor(role, floorId) {
  return getAllowedRolesForFloor(floorId).includes(String(role || "").trim().toLowerCase());
}

export function normalizeUsername(value) {
  return String(value || "").trim();
}

export function buildFloorUserDocId(floorId, username) {
  const normalizedFloor = normalizeFloorId(floorId, DEFAULT_FLOOR_ID);
  const normalizedUsername = normalizeUsername(username).toLowerCase();
  if (!normalizedUsername) return `${normalizedFloor}__user`;
  return `${normalizedFloor}__${normalizedUsername}`;
}

export function parseFloorFromUserDocId(docId) {
  const match = /^([Ll][12])__/.exec(String(docId || ""));
  if (!match) return "";
  return normalizeFloorId(match[1]);
}

