<template>
  <div class="container-fluid py-3 stock-page">
    <div class="page-header d-flex justify-content-between align-items-center mb-3">
      <div>
        <h1>
          <i class="bi bi-archive me-2 text-dark"></i>
          Manajemen Stok
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
            <li class="breadcrumb-item"><router-link to="/inventory/manajemen">Inventory</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Manajemen Stok</li>
          </ol>
        </nav>
      </div>
      <div>
        <button class="btn btn-sm btn-success" @click="openQuickScanModal" :disabled="loading">
          <i class="bi bi-qr-code-scan me-1"></i>
          Scan Cepat
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data stok...</p>
    </div>

    <template v-else>
      <!-- Pill Navigation for Aggregate vs Physical Barcode -->
      <div v-if="isBarcodeEnabled" class="d-flex justify-content-center pb-3 mb-4 border-bottom">
        <div class="main-pills-container p-1 bg-light rounded-pill d-inline-flex align-items-center shadow-sm">
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'agregat' }"
            @click="mainTab = 'agregat'"
          >
            <i class="bi bi-grid-3x3-gap fs-6"></i>
            <span>Stok Summary</span>
          </button>
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'lacakFisik' }"
            @click="mainTab = 'lacakFisik'"
          >
            <i class="bi bi-qr-code-scan fs-6"></i>
            <span>Lacak Barang</span>
          </button>
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'klipBarang' }"
            @click="mainTab = 'klipBarang'"
          >
            <i class="bi bi-paperclip fs-6"></i>
            <span>Klip Barcode</span>
          </button>
          <button
            v-if="canAccessDiscrepancy"
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2 position-relative"
            :class="{ 'active': mainTab === 'selisihStok' }"
            @click="mainTab = 'selisihStok'"
          >
            <i class="bi bi-shield-exclamation fs-6"></i>
            <span>Laporan Selisih</span>
            <span
              v-if="unresolvedDiscrepanciesCount > 0"
              class="badge bg-danger rounded-circle p-0 ms-1 d-inline-flex justify-content-center align-items-center"
              style="width: 18px; height: 18px; font-size: 0.65rem; line-height: 1;"
            >
              {{ unresolvedDiscrepanciesCount }}
            </span>
          </button>
        </div>
      </div>

      <!-- Stok Agregat Content -->
      <div v-if="mainTab === 'agregat'">
        <div class="summary-grid mb-3" :style="summaryGridStyle">
          <div v-for="card in summaryCards" :key="card.id" class="summary-grid-item" @click="activeTab = card.id">
            <div class="summary-card" :style="cardStyle(card.id)">
              <div class="summary-title">{{ card.label }}</div>
              <div :class="['summary-value', summaryValueClass(card.id)]">{{ summary[card.id]?.fisik ?? 0 }}</div>
              <small class="summary-status">{{ summary[card.id]?.status.label ?? "-" }}</small>
            </div>
          </div>
        </div>

        <ul v-if="hasTabs" class="nav nav-tabs compact justify-content-center overflow-auto mb-0">
          <li v-for="tab in tabs" :key="tab.id" class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>

        <div v-if="hasTabs" class="card border-0 shadow-sm rounded-0 rounded-bottom">
          <div class="card-body p-0">
            <div v-if="!isComputerTab" class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 44px">No</th>
                    <th>Jenis</th>
                    <th v-if="isBarcodeEnabled" class="text-center">Rincian Barcode</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-center">Aksi</th>
                    <th class="text-center">Riwayat</th>
                    <th class="text-center">Terakhir Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sub, idx) in tableRows" :key="sub.key">
                    <td class="fw-semibold">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ sub.label }}</td>
                    <td v-if="isBarcodeEnabled" class="text-center">
                      <button
                        v-if="sub.key !== 'barang-display' || showRincianColumn"
                        class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                        @click="openBarcodeRincianModal(activeTab, sub)"
                      >
                        <i class="bi bi-qr-code-scan"></i>
                        <span>Lihat</span>
                      </button>
                      <span v-else class="text-muted small">-</span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-success fs-6 px-2">{{ getQty(activeTab, sub.key) }}</span>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-success btn-sm" @click="openUpdateModal(activeTab, sub)">
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-info btn-sm text-white" @click="openHistoryModal(activeTab, sub)">
                        <i class="bi bi-clock-history"></i>
                      </button>
                    </td>
                    <td class="text-center text-muted small">
                      {{ formatDate(getItem(sub.key, activeTab)?.lastUpdated) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="table-light fw-bold">
                    <td :colspan="isBarcodeEnabled ? 3 : 2">Total Fisik</td>
                    <td class="text-center">{{ summary[activeTab]?.fisik ?? 0 }}</td>
                    <td colspan="3" class="text-center">
                      <span class="badge" :class="`bg-${summary[activeTab]?.status.cls ?? 'secondary'}`">
                        {{ summary[activeTab]?.status.label ?? "-" }}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 44px">No</th>
                    <th>Jenis Barang</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-center">Aksi</th>
                    <th class="text-center">Terakhir Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(card, idx) in nonComputerCards" :key="card.id">
                    <td class="fw-semibold">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ card.label }}</td>
                    <td class="text-center">
                      <span class="badge bg-primary fs-6 px-2">{{ getQty(card.id, "stok-komputer") }}</span>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-primary btn-sm" @click="openKomputerModal(card.id)">
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                    </td>
                    <td class="text-center text-muted small">
                      {{ formatDate(getItem("stok-komputer", card.id)?.lastUpdated) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div v-else class="alert alert-warning mb-0">
          Belum ada tab aktif. Silakan aktifkan card di halaman pengaturan.
        </div>

        <!-- Section Panduan & Alur Kerja Pelacakan Stok (Barcode Tracking) -->
        <StockGuideBoard v-if="isBarcodeEnabled" />
      </div>

      <!-- Lacak Fisik (Barcode) Content -->
      <div v-else-if="mainTab === 'lacakFisik'">
        <ul class="nav nav-tabs compact justify-content-center overflow-auto mb-3">
          <li v-if="ENABLE_MUTATION_QUEUE" class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'antrian' }"
              @click="physicalTab = 'antrian'"
            >
              Request Pindah Data
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'log' }"
              @click="physicalTab = 'log'"
            >
              Riwayat Pindah Data
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'opname' }"
              @click="physicalTab = 'opname'"
            >
              Stok Opname Data
            </button>
          </li>
        </ul>

        <div v-if="ENABLE_MUTATION_QUEUE && physicalTab === 'antrian'">
          <MovementQueue />
        </div>
        <div v-else-if="physicalTab === 'log'">
          <MutationLog />
        </div>
        <div v-else-if="physicalTab === 'opname'">
          <StockOpname
            :cards="nonComputerCards"
            :locations="tableRows.filter((r) => r.key !== 'barang-display')"
            :color-types="COLOR_TYPES"
            :color-labels="COLOR_LABELS"
            :hala-types="HALA_TYPES"
            :hala-labels="HALA_LABELS"
            :staff-options="staffOptions"
          />
        </div>
      </div>

      <!-- Klip Barcode Content -->
      <div v-else-if="mainTab === 'klipBarang'">
        <ClipManager
          :staff-options="staffOptions"
          :cards="nonComputerCards"
          :table-rows="tableRows"
          :color-types="COLOR_TYPES"
          :color-labels="COLOR_LABELS"
          :hala-types="HALA_TYPES"
          :hala-labels="HALA_LABELS"
        />
      </div>

      <!-- Laporan Selisih Content -->
      <div v-else-if="mainTab === 'selisihStok' && canAccessDiscrepancy">
        <DiscrepancyDashboard />
      </div>
    </template>

    <!-- Unified Modal for Manual Physical Stock Updates -->
    <StockUpdateModal
      :main-cat="updateForm.mainCat"
      :sub-doc="updateForm.subDoc"
      :sub-label="updateForm.subLabel"
      :quantity="updateForm.quantity"
      :original-details="updateForm.originalDetails"
      :detail-mode="updateForm.detailMode"
      :color-types="COLOR_TYPES"
      :color-labels="COLOR_LABELS"
      :hala-types="HALA_TYPES"
      :hala-labels="HALA_LABELS"
      :staff-options="staffOptions"
      :keterangan-opts="KETERANGAN_OPTS"
      :saving="saving"
      @submit="submitStockUpdate"
    />

    <!-- Unified Modal for Computer Stock Updates -->
    <KomputerUpdateModal
      :main-cat="komputerForm.mainCat"
      :detail-mode="komputerForm.detailMode"
      :quantity="komputerForm.quantity"
      :initial-details="komputerForm.details"
      :detail-types="komputerForm.detailTypes"
      :detail-labels="komputerForm.detailLabels"
      :saving="saving"
      @submit="submitKomputerUpdate"
    />

    <!-- Modal for Barcode Scanning Mutator -->
    <BarcodeUpdateModal
      :main-cat="barcodeForm.mainCat"
      :sub-doc="barcodeForm.subDoc"
      :sub-label="barcodeForm.subLabel"
      :is-quick-scan="barcodeForm.isQuickScan"
      :table-rows="tableRows"
      :staff-options="staffOptions"
      :keterangan-opts="KETERANGAN_OPTS"
      :color-types="COLOR_TYPES"
      :color-labels="COLOR_LABELS"
      :hala-types="HALA_TYPES"
      :hala-labels="HALA_LABELS"
      :active-floor="auth.activeFloor"
      :user-role="auth.userRole"
      :enable-mutation-queue="ENABLE_MUTATION_QUEUE"
      @success="handleBarcodeUpdateSuccess"
    />

    <!-- Modal for Showing Local History Logs -->
    <HistoryModal
      :main-cat="historyInfo.mainCat"
      :sub-label="historyInfo.subLabel"
      :history-list="historyList"
      :color-labels="COLOR_LABELS"
      :hala-labels="HALA_LABELS"
      :active-floor="auth.activeFloor"
    />

    <!-- Modal for Displaying Detailed Barcode Pagination -->
    <BarcodeRincianModal
      :main-cat="rincianForm.mainCat"
      :location="rincianForm.location"
      :location-label="rincianForm.locationLabel"
      :stock-data="stockData"
      :active-floor="auth.activeFloor"
      :user-role="auth.userRole"
      :is-supervisor-or-admin="isSupervisorOrAdmin"
      :color-types="COLOR_TYPES"
      :color-labels="COLOR_LABELS"
      :hala-types="HALA_TYPES"
      :hala-labels="HALA_LABELS"
      @reverted="handleRevertSuccess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";

// Sub-components
import StockGuideBoard from "@/components/inventory/StockGuideBoard.vue";
import StockUpdateModal from "@/components/inventory/StockUpdateModal.vue";
import KomputerUpdateModal from "@/components/inventory/KomputerUpdateModal.vue";
import BarcodeUpdateModal from "@/components/inventory/BarcodeUpdateModal.vue";
import HistoryModal from "@/components/inventory/HistoryModal.vue";
import BarcodeRincianModal from "@/components/inventory/BarcodeRincianModal.vue";

// Barcode-tracking specific components
import MovementQueue from "@/components/inventory/barcode-tracking/MovementQueue.vue";
import MutationLog from "@/components/inventory/barcode-tracking/MutationLog.vue";
import StockOpname from "@/components/inventory/barcode-tracking/StockOpname.vue";
import ClipManager from "@/components/inventory/barcode-tracking/ClipManager.vue";
import DiscrepancyDashboard from "@/components/inventory/barcode-tracking/DiscrepancyDashboard.vue";

import {
  KETERANGAN_OPTS,
  calcFisikTotal,
  fetchAllStockData,
  getStockStatus,
  mergeStockByLatest,
  subscribeStocksRealtime,
  fetchStaffOptions,
  updateKomputerStock,
  updateStockItem,
  getCardDetailMode,
  subscribeBarcodeDiscrepancies,
  verifyAndHealTabStocks,
} from "@/services/inventory-service";
import {
  ensureInventorySettings,
  fetchInventorySettings,
  normalizeInventorySettings,
  subscribeInventorySettings,
} from "@/services/inventory-setting-service";

const { toast, error: showError } = useAlert();
const auth = useAuthStore();

// Toggle approval queue for mutation barcodes
const ENABLE_MUTATION_QUEUE = false;

const loading = ref(false);
const saving = ref(false);
const stockData = ref({});
const staffOptions = ref([]);
const displaySettings = ref(normalizeInventorySettings());
const activeTab = ref("");

const COLOR_TYPES = computed(() => {
  if (displaySettings.value?.colorTypes) {
    return displaySettings.value.colorTypes.map((c) => c.key);
  }
  return ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
});

const COLOR_LABELS = computed(() => {
  if (displaySettings.value?.colorTypes) {
    const labels = {};
    displaySettings.value.colorTypes.forEach((c) => {
      labels[c.key] = c.label;
    });
    return labels;
  }
  return { HIJAU: "Hijau", BIRU: "Biru", PUTIH: "Putih", PINK: "Pink", KUNING: "Kuning" };
});

const HALA_TYPES = computed(() => {
  if (displaySettings.value?.halaTypes) {
    return displaySettings.value.halaTypes.map((c) => c.key);
  }
  return ["KA", "LA", "AN", "CA", "SA", "GA"];
});

const HALA_LABELS = computed(() => {
  if (displaySettings.value?.halaTypes) {
    const labels = {};
    displaySettings.value.halaTypes.forEach((c) => {
      labels[c.key] = c.label;
    });
    return labels;
  }
  return { KA: "Kalung", LA: "Liontin", AN: "Anting", CA: "Cincin", SA: "Giwang", GA: "Gelang" };
});

const CACHE_KEY_PREFIX = "melati-stock-cache-v2";
const CACHE_TTL = 5 * 60 * 1000;
const modalMap = new Map();

let unsubRealtime = null;
let unsubSettings = null;
let unsubDiscrepancies = null;

const mainTab = ref("agregat"); // "agregat" or "lacakFisik"
const physicalTab = ref(ENABLE_MUTATION_QUEUE ? "antrian" : "log"); // "antrian" or "log"

// Modals State Holders
const updateForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  quantity: 0,
  originalDetails: {},
  detailMode: "default",
});

const komputerForm = ref({
  mainCat: "",
  detailMode: "default",
  quantity: 0,
  details: {},
  detailTypes: [],
  detailLabels: {},
});

const barcodeForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  isQuickScan: false,
});

const historyInfo = ref({ mainCat: "", subLabel: "" });
const historyList = ref([]);

const rincianForm = ref({
  mainCat: "",
  location: "",
  locationLabel: "",
});

const isBarcodeEnabled = computed(() => {
  return !!displaySettings.value?.barcodeEnabled;
});

const enabledCards = computed(() => displaySettings.value.cards.filter((card) => card.enabled));
const nonComputerCards = computed(() => enabledCards.value.filter((card) => card.type !== "computer"));
const summaryCards = computed(() => nonComputerCards.value.filter((card) => card.showInSummary !== false));
const tabs = computed(() => enabledCards.value);
const hasTabs = computed(() => tabs.value.length > 0);
const tableRows = computed(() => displaySettings.value.tableRows.filter((row) => row.enabled));
const isComputerTab = computed(() => getCardType(activeTab.value) === "computer");
const showRincianColumn = computed(() => {
  const mode = getCardDetailMode(activeTab.value);
  return mode === "color" || mode === "hala";
});
const isSupervisorOrAdmin = computed(() => ["supervisor", "admin"].includes(auth.userRole?.toLowerCase()));
const canAccessDiscrepancy = computed(() => {
  if (auth.userRole?.toLowerCase() === "supervisor") return true;
  const allowedUsers = displaySettings.value?.discrepancyAccessUsers || [];
  const currentUsername = auth.user?.username || auth.user?.email || "";
  if (!currentUsername) return false;
  return allowedUsers.some(u => String(u).toLowerCase() === currentUsername.toLowerCase());
});
const unresolvedDiscrepanciesCount = ref(0);

const summaryGridStyle = computed(() => {
  const grid = displaySettings.value.summaryGrid || {};
  return {
    "--summary-md-cols": String(grid.md || 2),
    "--summary-lg-cols": String(grid.lg || 3),
    "--summary-xl-cols": String(grid.xl || 3),
    "--summary-gap": `${grid.gap || 12}px`,
  };
});

const summary = computed(() => {
  const out = {};
  nonComputerCards.value.forEach((card) => {
    const cat = card.id;
    const fisik = calcFisikTotal(stockData.value, cat, tableRows.value, getCardDetailMode(cat));
    const komputer = toInt(stockData.value["stok-komputer"]?.[cat]?.quantity);
    out[cat] = {
      fisik,
      komputer,
      status: getStockStatus(fisik, komputer),
    };
  });
  return out;
});

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function getCardById(id) {
  return displaySettings.value.cards.find((card) => card.id === id) || null;
}

function getCardType(id) {
  return getCardById(id)?.type || "simple";
}

function cardStyle(cardId) {
  const card = getCardById(cardId);
  const start = card?.colorStart || "#eef7ff";
  const end = card?.colorEnd || "#8cc8ff";
  return {
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
  };
}

function summaryValueClass(cat) {
  const fisik = toInt(summary.value?.[cat]?.fisik);
  const komputer = toInt(summary.value?.[cat]?.komputer);
  if (fisik < komputer) return "text-danger";
  if (fisik === komputer) return "text-success";
  return "text-primary";
}

function getItem(subDoc, mainCat) {
  return stockData.value[subDoc]?.[mainCat] || null;
}

function getQty(mainCat, subDoc) {
  const item = getItem(subDoc, mainCat);
  if (!item) return 0;
  const detailMode = getCardDetailMode(mainCat);
  if ((detailMode === "color" || detailMode === "hala") && item.details && Object.keys(item.details).length > 0) {
    return Object.values(item.details).reduce((sum, v) => sum + toInt(v), 0);
  }
  return toInt(item.quantity);
}

function formatDate(value) {
  if (!value) return "-";
  let d;
  if (value && typeof value.toDate === "function") d = value.toDate();
  else d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const modal = Modal.getOrCreateInstance(el);
  modal.show();
  modalMap.set(id, modal);
}

function closeModal(id) {
  const modal = modalMap.get(id) || Modal.getInstance(document.getElementById(id));
  modal?.hide();
}

function getCacheFloorId() {
  return String(auth.activeFloor || "").trim().toUpperCase();
}

function getCacheKey() {
  const floorId = getCacheFloorId();
  if (!floorId) return "";
  return `${CACHE_KEY_PREFIX}:${floorId}`;
}

function readCache() {
  const cacheKey = getCacheKey();
  if (!cacheKey) return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    if (parsed.floorId && parsed.floorId !== getCacheFloorId()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  const cacheKey = getCacheKey();
  if (!cacheKey) return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        floorId: getCacheFloorId(),
        timestamp: Date.now(),
        data,
      }),
    );
  } catch {
    // ignore local storage errors
  }
}

function sumDetails(details = {}) {
  return Object.values(details).reduce((sum, v) => sum + toInt(v), 0);
}

function normalizeDetails(details = {}) {
  const normalized = {};
  Object.keys(details).forEach((key) => {
    normalized[key] = toInt(details[key]);
  });
  return normalized;
}

function applyLocalUpdate({ subDoc, mainCat, details = null, quantity = null }) {
  const prevSub = stockData.value[subDoc] || {};
  const prevItem = prevSub[mainCat] || {};
  const nextItem = {
    ...prevItem,
    lastUpdated: new Date().toISOString(),
  };

  if (details) {
    const normalized = normalizeDetails(details);
    nextItem.details = normalized;
    nextItem.quantity = sumDetails(normalized);
  } else if (quantity !== null && quantity !== undefined) {
    nextItem.quantity = toInt(quantity);
    if (prevItem.details) nextItem.details = prevItem.details;
  }

  stockData.value = {
    ...stockData.value,
    [subDoc]: {
      ...prevSub,
      [mainCat]: nextItem,
    },
  };
}

async function loadData({ force = false, silent = false } = {}) {
  if (!silent) loading.value = true;
  try {
    if (!force) {
      const cacheData = readCache();
      if (cacheData) {
        stockData.value = cacheData;
        if (!silent) loading.value = false;
        return;
      }
    }
    stockData.value = await fetchAllStockData(auth.activeFloor);
    writeCache(stockData.value);
  } catch (e) {
    showError("Gagal memuat data stok", e.message);
  } finally {
    if (!silent) loading.value = false;
  }
}

async function loadStaffOptions() {
  try {
    staffOptions.value = await fetchStaffOptions({ floorId: auth.activeFloor });
  } catch {
    staffOptions.value = [];
  }
}

async function syncFloorScopedState() {
  await loadDisplaySettings();
  await loadData({ force: true });
  await loadStaffOptions();
  setupRealtimeListener();
  setupDisplaySettingsRealtime();
}

function ensureActiveTab() {
  const tabIds = tabs.value.map((card) => card.id);
  if (!tabIds.length) {
    activeTab.value = "";
    return;
  }
  if (!tabIds.includes(activeTab.value)) {
    activeTab.value = tabIds[0];
  }
}

function applyDisplaySettings(payload = {}) {
  displaySettings.value = normalizeInventorySettings(payload, auth.activeFloor);
  ensureActiveTab();
}

async function loadDisplaySettings() {
  try {
    await ensureInventorySettings(auth.activeFloor);
    const settings = await fetchInventorySettings(auth.activeFloor);
    applyDisplaySettings(settings);
  } catch (e) {
    showError("Gagal memuat setting manajemen stok", e.message);
  }
}

function setupDisplaySettingsRealtime() {
  if (unsubSettings) unsubSettings();
  unsubSettings = subscribeInventorySettings(
    (data) => {
      applyDisplaySettings(data);
    },
    () => {},
    auth.activeFloor,
  );
}

function setupDiscrepanciesSubscription() {
  if (unsubDiscrepancies) {
    unsubDiscrepancies();
    unsubDiscrepancies = null;
  }
  if (!auth.activeFloor || !canAccessDiscrepancy.value) {
    unresolvedDiscrepanciesCount.value = 0;
    return;
  }
  unsubDiscrepancies = subscribeBarcodeDiscrepancies(
    auth.activeFloor,
    (list) => {
      unresolvedDiscrepanciesCount.value = list.filter((item) => !item.resolved).length;
    },
    (err) => {
      console.error("Gagal mendengarkan selisih stok:", err);
    }
  );
}

watch(
  [() => auth.activeFloor, () => canAccessDiscrepancy.value],
  () => {
    setupDiscrepanciesSubscription();
  },
  { immediate: true }
);

// Watch activeTab to trigger background stock verification and healing
watch(
  () => activeTab.value,
  async (newTab) => {
    if (!newTab || !isBarcodeEnabled.value) return;

    const floorId = auth.activeFloor;
    if (!floorId) return;

    const storageKey = `melati-stock-heal-time-${floorId}-${newTab}`;
    const lastHealTime = localStorage.getItem(storageKey);
    const now = Date.now();
    const threshold = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

    if (!lastHealTime || now - parseInt(lastHealTime, 10) > threshold) {
      console.log(`[Watcher] Triggering background barcode sync check for tab: ${newTab}`);
      verifyAndHealTabStocks(floorId, newTab, stockData.value)
        .then(() => {
          localStorage.setItem(storageKey, String(Date.now()));
        })
        .catch((err) => {
          console.error(`[Watcher Error] Failed to run background verification for ${newTab}:`, err);
        });
    } else {
      console.log(`[Watcher] Verification skipped for tab: ${newTab} (last check was less than 12 hours ago)`);
    }
  }
);

async function refreshData() {
  await loadData({ force: true });
  toast("Data stok diperbarui");
}

function openUpdateModal(mainCat, sub) {
  if (!isBarcodeEnabled.value || sub.key === "barang-display") {
    const detailMode = getCardDetailMode(mainCat);
    const item = getItem(sub.key, mainCat) || {};
    let originalDetails = {};
    let quantity = 0;

    if (detailMode === "color") {
      COLOR_TYPES.value.forEach((k) => {
        originalDetails[k] = toInt(item.details?.[k]);
      });
      if (item.details) {
        Object.keys(item.details).forEach((k) => {
          if (toInt(item.details[k]) > 0 && !COLOR_TYPES.value.includes(k)) {
            originalDetails[k] = toInt(item.details[k]);
          }
        });
      }
    } else if (detailMode === "hala") {
      HALA_TYPES.value.forEach((k) => {
        originalDetails[k] = toInt(item.details?.[k]);
      });
      if (item.details) {
        Object.keys(item.details).forEach((k) => {
          if (toInt(item.details[k]) > 0 && !HALA_TYPES.value.includes(k)) {
            originalDetails[k] = toInt(item.details[k]);
          }
        });
      }
    } else {
      quantity = getQty(mainCat, sub.key);
    }

    updateForm.value = {
      mainCat,
      subDoc: sub.key,
      subLabel: sub.label,
      quantity,
      originalDetails,
      detailMode,
    };
    showModal("stockUpdateModal");
  } else {
    // Open barcode update modal
    barcodeForm.value = {
      mainCat,
      subDoc: sub.key,
      subLabel: sub.label,
      isQuickScan: false,
    };
    showModal("barcodeUpdateModal");
  }
}

function openQuickScanModal() {
  barcodeForm.value = {
    mainCat: "",
    subDoc: "any",
    subLabel: "Scan Cepat",
    isQuickScan: true,
  };
  showModal("barcodeUpdateModal");
}

function openKomputerModal(mainCat) {
  const item = getItem("stok-komputer", mainCat) || { quantity: 0, details: {} };
  const detailMode = getCardDetailMode(mainCat);
  let details = {};
  let quantity = 0;
  let detailTypes = [];
  let detailLabels = {};

  if (detailMode === "color" || detailMode === "hala") {
    const types = detailMode === "hala" ? HALA_TYPES.value : COLOR_TYPES.value;
    const labels = detailMode === "hala" ? HALA_LABELS.value : COLOR_LABELS.value;
    
    types.forEach((k) => {
      details[k] = toInt(item.details?.[k]);
    });
    if (item.details) {
      Object.keys(item.details).forEach((k) => {
        if (toInt(item.details[k]) > 0 && !types.includes(k)) {
          details[k] = toInt(item.details[k]);
        }
      });
    }
    
    detailTypes = types;
    detailLabels = labels;
  } else {
    quantity = toInt(item.quantity);
  }

  komputerForm.value = {
    mainCat,
    detailMode,
    quantity,
    details,
    detailTypes,
    detailLabels,
  };
  showModal("komputerUpdateModal");
}

function openHistoryModal(mainCat, sub) {
  historyInfo.value = {
    mainCat,
    subLabel: sub.label,
  };
  const rawHistory = getItem(sub.key, mainCat)?.history || [];
  historyList.value = rawHistory.filter(h => {
    const petugas = String(h.petugas || "").toLowerCase();
    const keterangan = String(h.keterangan || "").toLowerCase();
    const isSync = petugas.includes("sync") || petugas.includes("desktop") || keterangan.includes("sync") || keterangan.includes("kasir desktop");
    return !isSync;
  });
  showModal("historyModal");
}

function openBarcodeRincianModal(mainCat, sub) {
  rincianForm.value = {
    mainCat,
    location: sub.key,
    locationLabel: sub.label,
  };
  showModal("barcodeRincianModal");
}

async function submitStockUpdate({ quantity: qty, details: dets, petugas, keterangan }) {
  saving.value = true;
  const isDefault = updateForm.value.detailMode === "default";
  try {
    await updateStockItem({
      subDoc: updateForm.value.subDoc,
      mainCat: updateForm.value.mainCat,
      newQuantity: isDefault ? qty : null,
      newDetails: !isDefault ? dets : null,
      petugas,
      keterangan,
      detailType: !isDefault ? updateForm.value.detailMode : "",
      floorId: auth.activeFloor,
    });
    
    if (!isDefault) {
      applyLocalUpdate({
        subDoc: updateForm.value.subDoc,
        mainCat: updateForm.value.mainCat,
        details: dets,
      });
    }
    await loadData({ force: true, silent: true });
    closeModal("stockUpdateModal");
    toast("Stok berhasil diperbarui");
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitKomputerUpdate({ quantity: qty, details: dets }) {
  saving.value = true;
  const isDefault = komputerForm.value.detailMode === "default";
  try {
    await updateKomputerStock({
      mainCat: komputerForm.value.mainCat,
      newQuantity: isDefault ? qty : null,
      newDetails: !isDefault ? dets : null,
      detailType: !isDefault ? komputerForm.value.detailMode : "",
      floorId: auth.activeFloor,
    });
    await loadData({ force: true, silent: true });
    closeModal("komputerUpdateModal");
    toast("Stok komputer diperbarui");
  } catch (e) {
    showError("Gagal update stok komputer", e.message);
  } finally {
    saving.value = false;
  }
}

async function handleBarcodeUpdateSuccess() {
  await loadData({ force: true, silent: true });
}

async function handleRevertSuccess({ category, location, subType }) {
  // Optimistic local stock update for responsive feedback
  const prevSub = stockData.value[location] || {};
  const prevItem = prevSub[category] || {};
  const nextItem = {
    ...prevItem,
    lastUpdated: new Date().toISOString(),
  };
  if (subType && nextItem.details) {
    const curDetailQty = parseInt(nextItem.details[subType], 10) || 0;
    nextItem.details = {
      ...nextItem.details,
      [subType]: Math.max(0, curDetailQty - 1),
    };
    nextItem.quantity = Object.values(nextItem.details).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  } else {
    const curQty = parseInt(nextItem.quantity, 10) || 0;
    nextItem.quantity = Math.max(0, curQty - 1);
  }
  
  stockData.value = {
    ...stockData.value,
    [location]: {
      ...prevSub,
      [category]: nextItem,
    },
  };

  // Sync state from server
  await loadData({ force: true, silent: true });
}

function setupRealtimeListener() {
  if (unsubRealtime) unsubRealtime();
  unsubRealtime = subscribeStocksRealtime((incoming) => {
    stockData.value = mergeStockByLatest(stockData.value, incoming);
    writeCache(stockData.value);
  }, auth.activeFloor);
}

function handleStorageSync(event) {
  const cacheKey = getCacheKey();
  if (!cacheKey || event.key !== cacheKey || !event.newValue) return;
  try {
    const parsed = JSON.parse(event.newValue);
    if (!parsed?.data) return;
    if (parsed.floorId && parsed.floorId !== getCacheFloorId()) return;
    stockData.value = mergeStockByLatest(stockData.value, parsed.data);
  } catch {}
}

async function handleStockReload() {
  await loadData({ force: true, silent: true });
}

onMounted(async () => {
  await syncFloorScopedState();
  window.addEventListener("storage", handleStorageSync);
  window.addEventListener("melati-stock-reload", handleStockReload);
});

watch(
  () => auth.activeFloor,
  async (nextFloor, previousFloor) => {
    if (!nextFloor || nextFloor === previousFloor) return;
    await syncFloorScopedState();
  },
);

onUnmounted(() => {
  if (unsubRealtime) unsubRealtime();
  if (unsubSettings) unsubSettings();
  if (unsubDiscrepancies) unsubDiscrepancies();
  window.removeEventListener("storage", handleStorageSync);
  window.removeEventListener("melati-stock-reload", handleStockReload);
});
</script>

<style scoped>
.stock-page {
  --tab-bg: linear-gradient(135deg, #c4dbf7 0%, #dbe9fc 100%);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--summary-gap, 12px);
}

@media (min-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-md-cols, 2), minmax(0, 1fr));
  }
}

@media (min-width: 992px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-lg-cols, 3), minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-xl-cols, 3), minmax(0, 1fr));
  }
}

.summary-card {
  border-radius: 12px;
  padding: 12px;
  color: #1f2a44;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-title {
  font-size: 0.8rem;
  font-weight: 700;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 800;
}

.summary-status {
  text-transform: uppercase;
  font-weight: 600;
}

.nav-tabs.compact {
  border-bottom: 3px solid #e9ecef;
  background: var(--tab-bg);
  border-radius: 12px 12px 0 0;
  padding: 10px 10px 0;
  justify-content: center;
}

.nav-tabs.compact .nav-link.active {
  background: rgba(255, 255, 255, 0.75);
  border: none;
  border-bottom: 2px solid #3f37c9;
}

.table thead th {
  font-size: 0.83rem;
  text-transform: uppercase;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f3f5f8;
}

.table td,
.table th {
  vertical-align: middle;
}

.table-responsive {
  max-height: none;
}

.main-pills-container {
  background-color: #f1f3f7;
  border: 1px solid #e2e8f0;
}

.main-pill-btn {
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  outline: none;
  background-color: transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-pill-btn:hover:not(.active) {
  color: #1e293b;
  background-color: rgba(0, 0, 0, 0.04) !important;
}

.main-pill-btn.active {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(76, 99, 210, 0.35) !important;
}
</style>
