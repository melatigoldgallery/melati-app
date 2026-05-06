import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { getActiveFloor } from "@/config/floor-config";
import { floorDoc } from "@/services/floor-scope";

const DEFAULT_CARD_PRESETS = {
  KALUNG: { type: "color", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  LIONTIN: { type: "color", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  ANTING: { type: "simple", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  CINCIN: { type: "simple", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  GELANG: { type: "simple", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  GIWANG: { type: "simple", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  "HALA & SDW": { type: "hala", colorStart: "#eef7ff", colorEnd: "#8cc8ff" },
  BERLIAN: { type: "simple", colorStart: "#f1f8e9", colorEnd: "#b7ea72" },
  "KENDARI & EMAS BALI": { type: "hala", colorStart: "#fff3e0", colorEnd: "#ffd06d" },
  "STOK KOMPUTER": { type: "computer", colorStart: "#e3f2fd", colorEnd: "#90caf9" },
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

const CARD_TYPES = new Set(["simple", "color", "hala", "computer"]);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_SUMMARY_GRID = Object.freeze({
  md: 2,
  lg: 3,
  xl: 3,
  gap: 12,
});

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

function normalizeCard(input = {}, fallback = {}, index = 0) {
  const fallbackId = normalizeText(fallback.id || "", `CARD_${index + 1}`);
  const id = normalizeText(input.id, fallbackId).toUpperCase();
  const label = normalizeText(input.label, fallback.label || id);
  const preset = DEFAULT_CARD_PRESETS[id] || {};
  const type = CARD_TYPES.has(input.type) ? input.type : fallback.type || preset.type || "simple";

  return {
    id,
    label,
    type,
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

export function buildDefaultInventorySettings() {
  const cards = Object.keys(DEFAULT_CARD_PRESETS).map((id, index) => {
    const preset = DEFAULT_CARD_PRESETS[id];
    return {
      id,
      label: id,
      type: preset.type,
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
    lastUpdated: null,
    updatedBy: "System",
  };
}

export function normalizeInventorySettings(raw = {}) {
  const defaults = buildDefaultInventorySettings();
  const candidateCards = Array.isArray(raw.cards) && raw.cards.length ? raw.cards : defaults.cards;
  const cardMap = new Map();

  candidateCards.forEach((card, index) => {
    const normalized = normalizeCard(card, defaults.cards[index] || {}, index);
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

  return {
    cards,
    tableRows,
    summaryGrid: normalizeSummaryGrid(raw.summaryGrid || defaults.summaryGrid),
    lastUpdated: raw.lastUpdated || null,
    updatedBy: raw.updatedBy || "System",
  };
}

export async function ensureInventorySettings(floorId = "") {
  const docRef = getSettingsDoc(floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) return;

  await setDoc(docRef, {
    ...buildDefaultInventorySettings(),
    lastUpdated: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || "System (Initial)",
  });
}

export async function fetchInventorySettings(floorId = "") {
  const snap = await getDoc(getSettingsDoc(floorId));
  const source = snap.exists() ? snap.data() : buildDefaultInventorySettings();
  return normalizeInventorySettings(source);
}

export async function saveInventorySettings(payload, updatedBy = "System", floorId = "") {
  const normalized = normalizeInventorySettings(payload);
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
      const source = snap.exists() ? snap.data() : buildDefaultInventorySettings();
      onData(normalizeInventorySettings(source));
    },
    (error) => {
      if (typeof onError === "function") onError(error);
    },
  );
}
