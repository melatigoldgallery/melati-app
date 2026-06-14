import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { getActiveFloor, normalizeFloorId } from "@/config/floor-config";
import { floorDoc } from "@/services/floor-scope";

const DEFAULT_CARD_PRESETS = {
  KALUNG: { type: "color", detailMode: "color", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  LIONTIN: { type: "color", detailMode: "color", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  ANTING: { type: "simple", detailMode: "default", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  CINCIN: { type: "simple", detailMode: "default", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  GELANG: { type: "simple", detailMode: "default", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  GIWANG: { type: "simple", detailMode: "default", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  "HALA & SDW": { type: "hala", detailMode: "hala", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  BERLIAN: { type: "simple", detailMode: "default", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  "KENDARI & EMAS BALI": { type: "hala", detailMode: "hala", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  "STOK KOMPUTER": { type: "computer", detailMode: "default", colorStart: "#e3f2fd", colorEnd: "#90caf9" },
};

const DEFAULT_TABLE_ROWS = [
  { key: "brankas", label: "Stok Brankas", order: 1, enabled: true },
  { key: "posting", label: "Belum Posting", order: 2, enabled: true },
  { key: "barang-display", label: "Display", order: 3, enabled: true },
  { key: "barang-rusak", label: "Rusak", order: 4, enabled: true },
  { key: "batu-lepas", label: "Batu Lepas", order: 5, enabled: true },
  { key: "manual", label: "Manual", order: 6, enabled: true },
  { key: "admin", label: "Admin", order: 7, enabled: true },
  { key: "DP", label: "DP", order: 8, enabled: true },
  { key: "lainnya", label: "Lainnya", order: 9, enabled: true },
];

const DEFAULT_COLOR_TYPES = [
  { key: "HIJAU", label: "Hijau" },
  { key: "BIRU", label: "Biru" },
  { key: "PUTIH", label: "Putih" },
  { key: "PINK", label: "Pink" },
  { key: "KUNING", label: "Kuning" },
];

const DEFAULT_HALA_TYPES = [
  { key: "KA", label: "KA" },
  { key: "LA", label: "LA" },
  { key: "AN", label: "AN" },
  { key: "CA", label: "CA" },
  { key: "SA", label: "SA" },
  { key: "GA", label: "GA" },
];

let currentSettings = null;

export function getCachedSettings() {
  return currentSettings;
}

const CARD_TYPES = new Set(["simple", "color", "hala", "computer"]);
const DETAIL_MODES = new Set(["default", "color", "hala"]);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_SUMMARY_GRID = Object.freeze({
  md: 2,
  lg: 3,
  xl: 3,
  gap: 12,
});

function getFloorDefaultDetailMode(floorId, cardId) {
  const normalizedFloor = normalizeFloorId(floorId);
  if (normalizedFloor === "L1") {
    if (cardId === "KALUNG" || cardId === "LIONTIN") return "color";
    if (cardId === "HALA & SDW" || cardId === "KENDARI & EMAS BALI") return "hala";
  }
  return "default";
}

function getSettingsDoc(floorId = "") {
  const activeFloor = floorId || getActiveFloor();
  if (!activeFloor) {
    throw new Error("Floor tidak dipilih. Tidak dapat membaca pengaturan manajemen stok.");
  }
  return floorDoc(db, "settings", "inventoryManajemen", activeFloor);
}

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeColor(value, fallback) {
  const normalized = String(value || "").trim();
  if (HEX_COLOR_RE.test(normalized)) return normalized.toLowerCase();
  return fallback;
}

function normalizeDetailMode(value, fallback = "default") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (DETAIL_MODES.has(normalized)) return normalized;
  return fallback;
}

function normalizeOrder(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

function normalizeIntRange(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
}

function normalizeSummaryGrid(input = {}) {
  return {
    md: normalizeIntRange(input.md, DEFAULT_SUMMARY_GRID.md, 1, 4),
    lg: normalizeIntRange(input.lg, DEFAULT_SUMMARY_GRID.lg, 1, 6),
    xl: normalizeIntRange(input.xl, DEFAULT_SUMMARY_GRID.xl, 1, 7),
    gap: normalizeIntRange(input.gap, DEFAULT_SUMMARY_GRID.gap, 6, 28),
  };
}

function normalizeCard(input = {}, fallback = {}, index = 0, floorId = "") {
  const fallbackId = normalizeText(fallback.id || "", `CARD_${index + 1}`);
  const id = normalizeText(input.id, fallbackId).toUpperCase();
  const label = normalizeText(input.label, fallback.label || id);
  const preset = DEFAULT_CARD_PRESETS[id] || {};
  const type = CARD_TYPES.has(input.type) ? input.type : fallback.type || preset.type || "simple";
  const detailMode = normalizeDetailMode(
    input.detailMode,
    getFloorDefaultDetailMode(floorId, id) || preset.detailMode || "default",
  );

  return {
    id,
    label,
    type,
    detailMode: type === "computer" ? "default" : detailMode,
    enabled: input.enabled !== false,
    showInSummary: type === "computer" ? false : input.showInSummary !== false,
    order: normalizeOrder(input.order, normalizeOrder(fallback.order, index + 1)),
    colorStart: normalizeColor(input.colorStart, fallback.colorStart || preset.colorStart || "#eef7ff"),
    colorEnd: normalizeColor(input.colorEnd, fallback.colorEnd || preset.colorEnd || "#8cc8ff"),
  };
}

function normalizeTableRow(input = {}, fallback = {}, index = 0) {
  const fallbackKey = normalizeText(fallback.key || "", `jenis-${index + 1}`);
  const key = normalizeText(input.key, fallbackKey);
  return {
    key,
    label: normalizeText(input.label, fallback.label || key),
    enabled: input.enabled !== false,
    order: normalizeOrder(input.order, normalizeOrder(fallback.order, index + 1)),
  };
}

export function buildDefaultInventorySettings(floorId = "") {
  const cards = Object.keys(DEFAULT_CARD_PRESETS).map((id, index) => {
    const preset = DEFAULT_CARD_PRESETS[id];
    return {
      id,
      label: id,
      type: preset.type,
      detailMode: getFloorDefaultDetailMode(floorId, id) || preset.detailMode || "default",
      enabled: true,
      showInSummary: preset.type !== "computer",
      order: index + 1,
      colorStart: preset.colorStart,
      colorEnd: preset.colorEnd,
    };
  });

  return {
    cards,
    tableRows: [...DEFAULT_TABLE_ROWS],
    summaryGrid: { ...DEFAULT_SUMMARY_GRID },
    colorTypes: [...DEFAULT_COLOR_TYPES],
    halaTypes: [...DEFAULT_HALA_TYPES],
    lastUpdated: null,
    updatedBy: "System",
  };
}

export function normalizeInventorySettings(raw = {}, floorId = "") {
  const defaults = buildDefaultInventorySettings(floorId);
  const candidateCards = Array.isArray(raw.cards) && raw.cards.length ? raw.cards : defaults.cards;
  const cardMap = new Map();

  candidateCards.forEach((card, index) => {
    const normalized = normalizeCard(card, defaults.cards[index] || {}, index, floorId);
    if (!normalized.id || cardMap.has(normalized.id)) return;
    cardMap.set(normalized.id, normalized);
  });

  if (!cardMap.size) {
    defaults.cards.forEach((card) => {
      cardMap.set(card.id, card);
    });
  }

  if (![...cardMap.values()].some((card) => card.type === "computer")) {
    const computer = defaults.cards.find((card) => card.type === "computer");
    cardMap.set(computer.id, computer);
  }

  const cards = [...cardMap.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "id"));
  cards.forEach((card, index) => {
    card.order = index + 1;
  });

  const candidateRows = Array.isArray(raw.tableRows) && raw.tableRows.length ? raw.tableRows : defaults.tableRows;
  const rowMap = new Map();
  candidateRows.forEach((row, index) => {
    const normalized = normalizeTableRow(row, defaults.tableRows[index] || {}, index);
    const rowKey = String(normalized.key || "");
    if (!rowKey || rowMap.has(rowKey)) return;
    rowMap.set(rowKey, normalized);
  });

  if (!rowMap.size) {
    defaults.tableRows.forEach((row) => {
      rowMap.set(row.key, row);
    });
  }

  const tableRows = [...rowMap.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "id"));
  tableRows.forEach((row, index) => {
    row.order = index + 1;
  });

  const result = {
    cards,
    tableRows,
    summaryGrid: normalizeSummaryGrid(raw.summaryGrid || defaults.summaryGrid),
    colorTypes: Array.isArray(raw.colorTypes)
      ? raw.colorTypes.map(c => ({
          key: String(c.key || "").trim().toUpperCase(),
          label: String(c.label || "").trim()
        })).filter(c => c.key)
      : defaults.colorTypes,
    halaTypes: Array.isArray(raw.halaTypes)
      ? raw.halaTypes.map(h => ({
          key: String(h.key || "").trim().toUpperCase(),
          label: String(h.label || "").trim()
        })).filter(h => h.key)
      : defaults.halaTypes,
    lastUpdated: raw.lastUpdated || null,
    updatedBy: raw.updatedBy || "System",
  };

  currentSettings = result;
  return result;
}

export async function ensureInventorySettings(floorId = "") {
  const docRef = getSettingsDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  await setDoc(docRef, {
    ...buildDefaultInventorySettings(floorId),
    lastUpdated: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchInventorySettings(floorId = "") {
  const snap = await getDoc(getSettingsDoc(floorId));
  const source = snap.exists() ? snap.data() : buildDefaultInventorySettings(floorId);
  return normalizeInventorySettings(source, floorId);
}

export async function saveInventorySettings(payload, updatedBy = "System", floorId = "") {
  const normalized = normalizeInventorySettings(payload, floorId);
  await setDoc(getSettingsDoc(floorId), {
    ...normalized,
    lastUpdated: new Date().toISOString(),
    updatedBy: updatedBy || auth.currentUser?.email || "System",
  });
}

export function subscribeInventorySettings(onData, onError, floorId = "") {
  return onSnapshot(
    getSettingsDoc(floorId),
    (snap) => {
      const source = snap.exists() ? snap.data() : buildDefaultInventorySettings(floorId);
      onData(normalizeInventorySettings(source, floorId));
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    },
  );
}
