<template>
  <div class="container-fluid py-3">
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-calendar-day me-2 text-dark"></i>
        Laporan Stok Harian
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/inventory/manajemen">Inventory</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Harian</li>
        </ol>
      </nav>
    </div>

    <div class="card border-0 shadow-sm" id="daily-stock-report-card">
      <div class="card-header d-flex justify-content-between align-items-center py-2 bg-primary text-white">
        <h2 class="fs-6 mb-0">
          <i class="bi bi-calendar-day me-2"></i>
          Laporan Stok Harian
        </h2>
        <small class="text-white-50">{{ statusInfo }}</small>
      </div>

      <div class="card-body">
        <div class="row g-2 align-items-end mb-3">
          <div class="col-md-3 col-sm-6">
            <label class="form-label">Tanggal</label>
            <input v-model="selectedDate" :max="todayKey" type="date" class="form-control" />
          </div>

          <div class="col-md-5 col-sm-6 d-flex gap-2 mt-3 flex-wrap">
            <button class="btn btn-tampilkan" :disabled="loading" @click="loadReport">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-eye me-2"></i>
              Tampilkan
            </button>
          </div>

          <div class="col-md-4 text-end small text-muted">
            <i v-if="createdAtText" class="bi bi-clock me-1"></i>
            {{ createdAtText }}
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-sm table-bordered table-striped align-middle mb-0" id="daily-report-table">
            <thead class="table-light">
              <tr>
                <th style="width: 60px">No</th>
                <th>Jenis</th>
                <th class="text-center" style="width: 120px">Lihat Detail</th>
                <th class="text-center" style="width: 140px">Jumlah Barang</th>
                <th class="text-center" style="width: 140px">Data Komputer</th>
                <th class="text-center" style="width: 200px">Status Akhir</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-4">
                  <i class="bi bi-arrow-repeat spin me-2"></i>
                  Memuat data...
                </td>
              </tr>

              <tr v-else-if="!reportData">
                <td colspan="6" class="text-center text-muted py-4">Pilih tanggal lalu klik Tampilkan</td>
              </tr>

              <tr v-for="(cat, idx) in enabledMainCategories" v-else :key="cat">
                <td class="text-center fw-bold text-muted">{{ idx + 1 }}</td>
                <td class="fw-semibold">{{ cat }}</td>
                <td class="text-center">
                  <button class="btn btn-outline-primary btn-sm" @click="openDetailJenis(cat)">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
                <td class="text-center">
                  <span class="badge bg-success">{{ itemOf(cat).total }}</span>
                </td>
                <td class="text-center">
                  <span class="badge bg-primary">{{ itemOf(cat).komputer }}</span>
                </td>
                <td class="text-center fw-semibold" :class="statusClass(itemOf(cat).status)">
                  {{ itemOf(cat).status }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card mt-4 border-0 shadow-sm">
      <div class="card-header p-2 bg-success text-white">
        <h6 class="mb-0">
          <i class="bi bi-file-earmark-excel me-2"></i>
          Export Laporan Detail Bulanan
        </h6>
      </div>
      <div class="card-body">
        <p class="text-muted mb-3">
          Export laporan stok detail per tanggal dengan breakdown dokumen dan detail logs perubahan stok.
        </p>

        <div class="row align-items-end g-2">
          <div class="col-md-3">
            <label class="form-label fw-semibold">Pilih Bulan</label>
            <input v-model="exportMonth" type="month" class="form-control" />
          </div>
          <div class="col-md-3">
            <button class="btn btn-success" :disabled="exporting" @click="handleExportDetailBulanan">
              <span v-if="exporting" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-download me-2"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>

    <div ref="detailJenisModalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h5 class="modal-title">Detail {{ activeMainCat }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>{{ activeMainCat || "-" }}</strong>
              </div>
              <div class="small text-muted">Tanggal: {{ selectedDate || "-" }}</div>
            </div>

            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Kategori</th>
                    <th class="text-center" style="width: 120px">Jumlah</th>
                    <th v-if="showDetailEye" class="text-center" style="width: 120px">Detail</th>
                    <th v-if="showEditAction" class="text-center" style="width: 120px">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailJenisRows" :key="row.catKey">
                    <td>{{ row.label }}</td>
                    <td class="text-center">{{ row.qty }}</td>
                    <td v-if="showDetailEye" class="text-center">
                      <button class="btn btn-outline-secondary btn-sm" @click="openWarnaModal(row.catKey, false)">
                        <i class="bi bi-eye"></i>
                      </button>
                    </td>
                    <td v-if="showEditAction" class="text-center">
                      <button class="btn btn-outline-primary btn-sm" @click="openWarnaModal(row.catKey, true)">
                        <i class="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th class="text-center">{{ detailJenisTotal }}</th>
                    <th
                      v-if="showDetailEye || showEditAction"
                      :colspan="(showDetailEye ? 1 : 0) + (showEditAction ? 1 : 0)"
                    ></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="warnaModalEl" class="modal fade" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ warnaModalTitle }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead class="table-light">
                  <tr>
                    <th>{{ warnaModalLabel }}</th>
                    <th class="text-center" style="width: 140px">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="warnaRows.length === 0">
                    <td colspan="2" class="text-center text-muted py-4">
                      Data rincian tidak tersedia untuk tanggal ini.
                    </td>
                  </tr>
                  <tr v-for="row in warnaRows" :key="row.key">
                    <td>{{ row.label }}</td>
                    <td class="text-center">
                      <input
                        v-if="warnaEditable"
                        v-model.number="row.value"
                        min="0"
                        type="number"
                        class="form-control form-control-sm"
                      />
                      <span v-else>{{ row.value }}</span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th class="text-center">{{ warnaTotal }}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div class="modal-footer" v-if="warnaEditable">
            <button class="btn btn-primary" :disabled="savingWarna" @click="saveWarnaEdit">
              <span v-if="savingWarna" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-save me-2"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { Modal } from "bootstrap";
import { collection, getDoc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import { floorDoc, floorCollection } from "@/services/floor-scope";
import { useAuthStore } from "@/stores/auth";
import { db } from "@/config/firebase";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { MAIN_CATEGORIES, SUB_CATEGORIES, fetchAllStockData } from "@/services/inventory-service";
import { fetchInventorySettings } from "@/services/inventory-setting-service";

const { toast, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const SUMMARY_CATEGORIES = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.tableRows)) {
    return dynamicSettings.value.tableRows.filter((row) => row.enabled).map((row) => row.key);
  }
  return SUB_CATEGORIES.map((sub) => sub.key);
});

const REVERSE_CATEGORY_MAPPING = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.tableRows)) {
    return Object.fromEntries(
      dynamicSettings.value.tableRows.filter((row) => row.enabled).map((row) => [row.key, row.label])
    );
  }
  return Object.fromEntries(SUB_CATEGORIES.map((sub) => [sub.key, sub.label]));
});

const COLOR_TYPES = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.colorTypes)) {
    return dynamicSettings.value.colorTypes.map((c) => c.key);
  }
  return ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
});

const COLOR_LABELS = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.colorTypes)) {
    return Object.fromEntries(dynamicSettings.value.colorTypes.map((c) => [c.key, c.label]));
  }
  return { HIJAU: "Hijau", BIRU: "Biru", PUTIH: "Putih", PINK: "Pink", KUNING: "Kuning" };
});

const HALA_TYPES = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.halaTypes)) {
    return dynamicSettings.value.halaTypes.map((h) => h.key);
  }
  return ["KA", "LA", "AN", "CA", "SA", "GA"];
});

const HALA_LABELS = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.halaTypes)) {
    return Object.fromEntries(dynamicSettings.value.halaTypes.map((h) => [h.key, h.label]));
  }
  return { KA: "Kalung", LA: "Liontin", AN: "Anting", CA: "Cincin", SA: "Giwang", GA: "Gelang" };
});

const DEFAULT_SUB_LABELS = {
  brankas: "Stok Brankas",
  posting: "Belum Posting",
  "barang-display": "Display",
  "barang-rusak": "Rusak",
  "batu-lepas": "Batu Lepas",
  manual: "Manual",
  admin: "Admin",
  DP: "DP",
  lainnya: "Lainnya",
};

const JEWELRY_TYPED_CATEGORIES = ["HALA & SDW", "KENDARI & EMAS BALI"];
const LEGACY_LOG_TEXT_LIMIT = 30000;
const SUMMARY_COLUMN_COLORS = {
  brankas: "#e3f2fd",
  posting: "#e8f5e9",
  "barang-display": "#fff3e0",
  "barang-rusak": "#fce4ec",
  "batu-lepas": "#ede7f6",
  manual: "#f3e5f5",
  admin: "#e0f7fa",
  DP: "#f9fbe7",
  lainnya: "#efebe9",
};

const loading = ref(false);
const exporting = ref(false);
const dynamicSettings = ref(null);

function getCardDetailMode(mainCat) {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.cards)) {
    const card = dynamicSettings.value.cards.find(c => c.id === mainCat);
    if (card) {
      const mode = String(card.detailMode || "").trim().toLowerCase();
      if (mode === "color" || mode === "hala" || mode === "default") return mode;
      if (card.type === "color") return "color";
      if (card.type === "hala") return "hala";
      return "default";
    }
  }
  // Fallback to static defaults
  if (mainCat === "KALUNG" || mainCat === "LIONTIN") return "color";
  if (["HALA & SDW", "KENDARI & EMAS BALI"].includes(mainCat)) return "hala";
  return "default";
}

const enabledMainCategories = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.cards)) {
    return dynamicSettings.value.cards
      .filter((card) => card.enabled && card.showInSummary)
      .map((card) => card.id);
  }
  return MAIN_CATEGORIES;
});

const activeMainCategories = computed(() => {
  if (dynamicSettings.value && Array.isArray(dynamicSettings.value.cards)) {
    return dynamicSettings.value.cards.filter((card) => card.enabled).map((card) => card.id);
  }
  return MAIN_CATEGORIES;
});
const savingWarna = ref(false);
const selectedDate = ref(todayStringWITA());
const reportData = ref(null);
const dataSource = ref("-");
const createdAtText = ref("");
const statusInfo = ref("");
const exportMonth = ref(todayStringWITA().slice(0, 7));

const detailJenisModalEl = ref(null);
const warnaModalEl = ref(null);
let detailJenisModalInstance = null;
let warnaModalInstance = null;

const activeMainCat = ref("");
const detailJenisRows = ref([]);
const detailJenisTotal = ref(0);
const showDetailEye = ref(false);
const showEditAction = ref(false);
const isTodaySelection = computed(() => selectedDate.value === todayKey.value);

const warnaModalTitle = computed(() => {
  if (warnaModalLabel.value === "Warna") return "Detail Per Warna";
  if (warnaModalLabel.value === "Jenis") return "Detail Per Jenis Perhiasan";
  return "Detail Rincian";
});

const activeDetailCat = ref("");
const warnaEditable = ref(false);
const warnaRows = ref([]);
const warnaModalLabel = ref("Warna");

const dailyDataCache = ref({});
const stockDataSnapshot = ref({});
const lastStockFetchAt = ref(0);
const STOCK_SNAPSHOT_TTL = 60000;
let stockFetchPromise = null;
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");

const todayKey = computed(() => todayStringWITA());
const warnaTotal = computed(() => warnaRows.value.reduce((sum, row) => sum + (parseInt(row.value, 10) || 0), 0));

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function formatDateTime(dateLike) {
  if (!dateLike) return "";
  if (typeof dateLike === "string") {
    const d = new Date(dateLike);
    if (!Number.isNaN(d.getTime())) return `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID")}`;
    return dateLike;
  }
  if (typeof dateLike?.toDate === "function") {
    const d = dateLike.toDate();
    return `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID")}`;
  }
  return "";
}

function itemOf(cat) {
  return reportData.value?.items?.[cat] || { total: 0, komputer: 0, status: "-" };
}

function statusClass(status = "") {
  if (String(status).toLowerCase().includes("klop")) return "text-success";
  if (String(status).toLowerCase().startsWith("kurang")) return "text-danger";
  if (String(status).toLowerCase().startsWith("lebih")) return "text-primary";
  return "text-secondary";
}

function categoryUsesDetails(mainCat) {
  const mode = getCardDetailMode(mainCat);
  return mode === "color" || mode === "hala";
}

function normalizeBreakdownNode(node = {}) {
  if (typeof node.total !== "undefined") {
    return {
      total: toInt(node.total),
      details: node.details || null,
    };
  }

  const quantity = toInt(node.quantity);
  const details = node.details || null;
  if (details && typeof details === "object") {
    const total = Object.values(details).reduce((sum, value) => sum + toInt(value), 0);
    return { total: total || quantity, details };
  }
  return { total: quantity, details: null };
}

function normalizeReport(rawData, dateKey) {
  const normalized = {
    date: rawData?.date || dateKey,
    createdAt: rawData?.createdAt || null,
    items: {},
    breakdown: {},
  };

  activeMainCategories.value.forEach((mainCat) => {
    const item = rawData?.items?.[mainCat] || { total: 0, komputer: 0, status: "-" };
    normalized.items[mainCat] = {
      total: toInt(item.total),
      komputer: toInt(item.komputer),
      status: item.status || "-",
    };

    const sourceBreakdown = rawData?.breakdown?.[mainCat] || {};
    normalized.breakdown[mainCat] = {};
    SUMMARY_CATEGORIES.value.forEach((catKey) => {
      const fallbackLabel = REVERSE_CATEGORY_MAPPING.value[catKey];
      const defaultLabel = DEFAULT_SUB_LABELS[catKey];
      const node = sourceBreakdown[catKey] || sourceBreakdown[fallbackLabel] || sourceBreakdown[defaultLabel] || {};
      normalized.breakdown[mainCat][catKey] = normalizeBreakdownNode(node);
    });
  });

  return normalized;
}

async function getStockSnapshot({ force = false } = {}) {
  const now = Date.now();
  const hasCache = Object.keys(stockDataSnapshot.value).length > 0;
  if (!force && hasCache && now - lastStockFetchAt.value < STOCK_SNAPSHOT_TTL) {
    return stockDataSnapshot.value;
  }
  if (stockFetchPromise) return stockFetchPromise;

  stockFetchPromise = (async () => {
    const stockData = await fetchAllStockData(activeFloor.value);
    stockDataSnapshot.value = stockData;
    lastStockFetchAt.value = Date.now();
    stockFetchPromise = null;
    return stockDataSnapshot.value;
  })();

  return stockFetchPromise;
}

function computeCurrentSummarySnapshot(sourceStockData) {
  const items = {};
  const breakdown = {};

  activeMainCategories.value.forEach((mainCat) => {
    let totalAcrossAllDocs = 0;
    breakdown[mainCat] = {};

    const detailMode = getCardDetailMode(mainCat);
    const useDetails = detailMode === "color" || detailMode === "hala";

    SUMMARY_CATEGORIES.value.forEach((catKey) => {
      const node = sourceStockData?.[catKey]?.[mainCat];
      if (!node) {
        breakdown[mainCat][catKey] = { total: 0 };
        return;
      }

      let total = 0;
      let details = null;
      if (useDetails && node.details && typeof node.details === "object" && Object.keys(node.details).length > 0) {
        details = { ...node.details };
        total = Object.values(details).reduce((sum, val) => sum + toInt(val), 0);
      } else {
        total = toInt(node.quantity);
      }

      breakdown[mainCat][catKey] = details ? { total, details } : { total };
      totalAcrossAllDocs += total;
    });

    const komputer = toInt(sourceStockData?.["stok-komputer"]?.[mainCat]?.quantity);
    let status = "Klop";
    if (totalAcrossAllDocs < komputer) status = `Kurang ${komputer - totalAcrossAllDocs}`;
    else if (totalAcrossAllDocs > komputer) status = `Lebih ${totalAcrossAllDocs - komputer}`;

    items[mainCat] = { total: totalAcrossAllDocs, komputer, status };
  });

  return { date: selectedDate.value, createdAt: null, items, breakdown };
}

async function saveSnapshotByDate(dateKey, reason = "manual") {
  const callable = httpsCallable(functions, "saveDailySnapshot");
  const res = await callable({
    scope: "floor",
    floorId: activeFloor.value,
    dateYmd: dateKey,
    reason,
  });
  return res?.data || {};
}

async function loadReport() {
  if (!selectedDate.value) return;
  loading.value = true;

  try {
    const docRef = floorDoc(db, "daily_stock_reports", selectedDate.value, activeFloor.value);
    const snap = await getDoc(docRef);

    let normalized;
    if (snap.exists()) {
      dataSource.value = "saved";
      normalized = normalizeReport(snap.data(), selectedDate.value);
    } else {
      dataSource.value = "live";
      const live = await getStockSnapshot();
      normalized = normalizeReport(computeCurrentSummarySnapshot(live), selectedDate.value);
    }

    reportData.value = normalized;
    dailyDataCache.value[selectedDate.value] = normalized;
    statusInfo.value = dataSource.value === "saved" ? "Snapshot tersimpan" : "Data live";
    createdAtText.value = normalized.createdAt ? `Snapshot: ${formatDateTime(normalized.createdAt)}` : "";
  } catch (err) {
    showError("Gagal memuat laporan", err?.message || "");
  } finally {
    loading.value = false;
  }
}

function openDetailJenis(mainCat) {
  if (!reportData.value) return;

  activeMainCat.value = mainCat;
  showDetailEye.value = categoryUsesDetails(mainCat);
  showEditAction.value = selectedDate.value !== todayKey.value;

  const rows = SUMMARY_CATEGORIES.value.map((catKey) => {
    const qty = toInt(reportData.value?.breakdown?.[mainCat]?.[catKey]?.total);
    return {
      catKey,
      label: REVERSE_CATEGORY_MAPPING.value[catKey] || catKey,
      qty,
    };
  });

  detailJenisRows.value = rows;
  detailJenisTotal.value = rows.reduce((sum, row) => sum + row.qty, 0);
  detailJenisModalInstance?.show();
}

function buildDetailRowsForCategory(mainCat, catKey, editable) {
  const breakdownNode = reportData.value?.breakdown?.[mainCat]?.[catKey] || {};
  const hasDetail = breakdownNode.details && typeof breakdownNode.details === "object";
  const hasBreakdownData = hasDetail || typeof breakdownNode.total !== "undefined";
  const liveNode = stockDataSnapshot.value?.[catKey]?.[mainCat] || {};
  const liveDetails = liveNode.details || {};
  const isToday = selectedDate.value === todayKey.value;

  if (!hasBreakdownData && !isToday) {
    warnaModalLabel.value = "Rincian";
    return [];
  }

  const detailMode = getCardDetailMode(mainCat);

  if (detailMode === "color") {
    warnaModalLabel.value = "Warna";
    const baseTypes = [...COLOR_TYPES.value];
    if (hasDetail && breakdownNode.details) {
      Object.keys(breakdownNode.details).forEach((k) => {
        if (toInt(breakdownNode.details[k]) > 0 && !baseTypes.includes(k)) {
          baseTypes.push(k);
        }
      });
    } else if (isToday && liveDetails) {
      Object.keys(liveDetails).forEach((k) => {
        if (toInt(liveDetails[k]) > 0 && !baseTypes.includes(k)) {
          baseTypes.push(k);
        }
      });
    }
    return baseTypes.map((type) => ({
      key: type,
      label: COLOR_LABELS.value[type] || `${type} (Lainnya)`,
      value: toInt(hasDetail ? breakdownNode.details[type] : isToday ? liveDetails[type] : 0),
      editable,
    }));
  }

  if (detailMode === "hala") {
    warnaModalLabel.value = "Jenis";
    const baseTypes = [...HALA_TYPES.value];
    if (hasDetail && breakdownNode.details) {
      Object.keys(breakdownNode.details).forEach((k) => {
        if (toInt(breakdownNode.details[k]) > 0 && !baseTypes.includes(k)) {
          baseTypes.push(k);
        }
      });
    } else if (isToday && liveDetails) {
      Object.keys(liveDetails).forEach((k) => {
        if (toInt(liveDetails[k]) > 0 && !baseTypes.includes(k)) {
          baseTypes.push(k);
        }
      });
    }
    return baseTypes.map((type) => ({
      key: type,
      label: HALA_LABELS.value[type] || `${type} (Lainnya)`,
      value: toInt(hasDetail ? breakdownNode.details[type] : isToday ? liveDetails[type] : 0),
      editable,
    }));
  }

  warnaModalLabel.value = "Total";
  const fallbackQty = isToday ? toInt(liveNode.quantity) : 0;
  return [
    {
      key: "total",
      label: "Total",
      value: toInt(breakdownNode.total) || fallbackQty,
      editable,
    },
  ];
}

function openWarnaModal(catKey, editable) {
  activeDetailCat.value = catKey;
  warnaEditable.value = editable;
  warnaRows.value = buildDetailRowsForCategory(activeMainCat.value, catKey, editable);
  warnaModalInstance?.show();
}

async function saveWarnaEdit() {
  if (!warnaEditable.value || !activeMainCat.value || !activeDetailCat.value || !reportData.value) return;

  savingWarna.value = true;
  try {
    const payload = { total: 0 };
    const detailMode = getCardDetailMode(activeMainCat.value);
    if (detailMode === "color" || detailMode === "hala") {
      const details = {};
      let sum = 0;
      warnaRows.value.forEach((row) => {
        const value = Math.max(0, toInt(row.value));
        details[row.key] = value;
        sum += value;
      });
      payload.total = sum;
      payload.details = details;
    } else {
      payload.total = Math.max(0, toInt(warnaRows.value[0]?.value));
    }

    reportData.value.breakdown[activeMainCat.value][activeDetailCat.value] = payload;

    const newMainTotal = SUMMARY_CATEGORIES.value.reduce((sum, catKey) => {
      return sum + toInt(reportData.value.breakdown[activeMainCat.value][catKey]?.total);
    }, 0);

    const komputer = toInt(reportData.value.items[activeMainCat.value]?.komputer);
    let status = "Klop";
    if (newMainTotal > komputer) status = `Lebih ${newMainTotal - komputer}`;
    else if (newMainTotal < komputer) status = `Kurang ${komputer - newMainTotal}`;

    reportData.value.items[activeMainCat.value] = { total: newMainTotal, komputer, status };

    detailJenisRows.value = detailJenisRows.value.map((row) => {
      if (row.catKey !== activeDetailCat.value) return row;
      return { ...row, qty: payload.total };
    });
    detailJenisTotal.value = detailJenisRows.value.reduce((sum, row) => sum + toInt(row.qty), 0);

    const docRef = floorDoc(db, "daily_stock_reports", selectedDate.value, activeFloor.value);
    await setDoc(
      docRef,
      {
        date: selectedDate.value,
        createdAt: new Date().toISOString(),
        breakdown: {
          [activeMainCat.value]: {
            [activeDetailCat.value]: payload,
          },
        },
        items: {
          [activeMainCat.value]: {
            total: newMainTotal,
            komputer,
            status,
          },
        },
      },
      { merge: true },
    );

    dailyDataCache.value[selectedDate.value] = reportData.value;
    toast("Perubahan tersimpan");
    warnaModalInstance?.hide();
  } catch (err) {
    showError("Gagal menyimpan perubahan", err?.message || "");
  } finally {
    savingWarna.value = false;
  }
}

function safeCellText(value, maxLen = LEGACY_LOG_TEXT_LIMIT) {
  const text = String(value || "");
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)} ...[dipotong]`;
}

function toExcelSafeSheetName(name, fallback = "Sheet") {
  const invalidChars = /[\\/*?:[\]]/g;
  const clean = String(name || "")
    .replace(invalidChars, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fallback).slice(0, 31);
}

function makeUniqueSheetName(name, usedNames, fallback = "Sheet") {
  const base = toExcelSafeSheetName(name, fallback);
  let candidate = base;
  let idx = 2;
  while (usedNames.has(candidate)) {
    const suffix = `_${idx}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    idx += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function normalizeExportCategoriesFromCards(cards = []) {
  const nonComputer = cards
    .filter((card) => card?.enabled !== false)
    .filter((card) => String(card?.type || "").toLowerCase() !== "computer")
    .filter((card) => card?.showInSummary !== false)
    .map((card) => ({
      id: String(card?.id || "")
        .trim()
        .toUpperCase(),
      label: String(card?.label || card?.id || "")
        .trim()
        .toUpperCase(),
      order: Number(card?.order || 0),
    }))
    .filter((card) => card.id);

  const uniqueById = new Map();
  nonComputer.forEach((card, index) => {
    if (uniqueById.has(card.id)) return;
    uniqueById.set(card.id, { ...card, order: card.order || index + 1 });
  });

  return [...uniqueById.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "id"))
    .map((card) => ({ id: card.id, label: card.label || card.id }));
}

async function resolveExportCategories() {
  if (dynamicSettings.value) {
    const fromSettings = normalizeExportCategoriesFromCards(dynamicSettings.value.cards || []);
    if (fromSettings.length) return fromSettings;
  }
  try {
    const settings = await fetchInventorySettings(activeFloor.value);
    const fromSettings = normalizeExportCategoriesFromCards(settings?.cards || []);
    if (fromSettings.length) return fromSettings;
  } catch (_) {
    // fallback to static categories if settings cannot be read
  }
  return MAIN_CATEGORIES.map((cat) => ({ id: cat, label: cat }));
}

async function fetchLogsWithFallback(startDate, endDate) {
  try {
    const logsQ = query(
      floorCollection(db, "dailyStockLogs", activeFloor.value),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const logsSnap = await getDocs(logsQ);
    return logsSnap.docs.map((d) => {
      const data = d.data() || {};
      return { id: d.id, ...data };
    });
  } catch (_) {
    return [];
  }
}

function groupLogsByMainCategory(logDocs, categories = activeMainCategories.value) {
  const locations = [...SUMMARY_CATEGORIES.value];
  const categorySet = new Set(categories);
  const grouped = {};
  categories.forEach((cat) => {
    grouped[cat] = [];
  });

  const dateMap = new Map();
  logDocs.forEach((docData) => {
    const logs = Array.isArray(docData.logs) ? docData.logs : [];
    logs.forEach((log) => {
      const mainCat = String(log.jenis || "")
        .trim()
        .toUpperCase();
      const location = log.lokasi;
      if (!categorySet.has(mainCat) || !locations.includes(location)) return;
      const key = `${mainCat}_${docData.date}`;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: docData.date, mainCat, data: {} });
      }
      const entry = dateMap.get(key);
      if (!entry.data[location]) {
        entry.data[location] = { after: 0, logs: [] };
      }
      entry.data[location].after = toInt(log.after);
      entry.data[location].logs.push(log);
    });
  });

  dateMap.forEach((entry) => {
    const row = { Tanggal: entry.date };
    let total = 0;
    locations.forEach((loc) => {
      const locData = entry.data[loc];
      if (!locData) {
        row[loc] = 0;
        row[`${loc}_ket`] = "";
        return;
      }
      row[loc] = toInt(locData.after);
      row[`${loc}_ket`] = locData.logs
        .map((log) => {
          const before = toInt(log.before);
          const after = toInt(log.after);
          const action = log.action || "update";
          const user = log.userName || "user";
          let ket = log.keterangan || "";
          ket = ket.replace(/Pembatalan Mutasi Barcode/g, "Batal Pemindahan Barcode");
          ket = ket.replace(/PEMBATALAN MUTASI BARCODE/g, "BATAL PEMINDAHAN BARCODE");
          const qty = Math.abs(after - before);
          return safeCellText(`stok awal ${before} ${user} ${action} ${qty} : ${ket}`);
        })
        .join("\n");
      total += row[loc];
    });
    row.TOTAL = total;
    grouped[entry.mainCat].push(row);
  });

  categories.forEach((cat) => {
    grouped[cat].sort((a, b) => a.Tanggal.localeCompare(b.Tanggal));
  });
  return grouped;
}

function monthNameInd(month, year) {
  const names = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${names[month - 1]} ${year}`;
}

function hexToArgb(hex, fallback = "FFF5F5F5") {
  const normalized = String(hex || "")
    .trim()
    .replace("#", "")
    .toUpperCase();
  if (/^[0-9A-F]{6}$/.test(normalized)) return `FF${normalized}`;
  return fallback;
}

function buildReportLookup(reports = [], categoryIds = []) {
  const lookup = new Map();
  const dates = new Set();

  reports.forEach((rep) => {
    const dateKey = String(rep?.date || "")
      .trim()
      .slice(0, 10);
    if (!dateKey) return;
    dates.add(dateKey);

    categoryIds.forEach((cat) => {
      const item = rep?.items?.[cat] || {};
      const breakdown = rep?.breakdown?.[cat] || {};
      const breakdownTotals = {};
      SUMMARY_CATEGORIES.value.forEach((catKey) => {
        breakdownTotals[catKey] = toInt(breakdown?.[catKey]?.total);
      });
      lookup.set(`${cat}::${dateKey}`, {
        hasReport: true,
        total: toInt(item.total),
        komputer: toInt(item.komputer),
        status: item.status || "-",
        breakdownTotals,
      });
    });
  });

  return {
    lookup,
    dates: [...dates].sort((a, b) => a.localeCompare(b)),
  };
}

function buildCategoryRowsForExport(mainCat, groupedRows = [], reportDates = [], reportLookup = new Map()) {
  const byDate = new Map(
    groupedRows.map((row) => [
      String(row?.Tanggal || "")
        .trim()
        .slice(0, 10),
      row,
    ]),
  );

  const dateKeys = [...new Set([...reportDates, ...[...byDate.keys()].filter(Boolean)])].sort((a, b) => a.localeCompare(b));
  if (!dateKeys.length) return [];

  return dateKeys.map((dateKey) => {
    const base = { Tanggal: dateKey };
    const reportMeta = reportLookup.get(`${mainCat}::${dateKey}`) || {};

    SUMMARY_CATEGORIES.value.forEach((catKey) => {
      const reportValue = toInt(reportMeta?.breakdownTotals?.[catKey]);
      base[catKey] = reportMeta?.hasReport ? reportValue : toInt(byDate.get(dateKey)?.[catKey]);
      base[`${catKey}_ket`] = safeCellText(byDate.get(dateKey)?.[`${catKey}_ket`] || "");
    });

    base.TOTAL = reportMeta?.hasReport
      ? toInt(reportMeta.total)
      : SUMMARY_CATEGORIES.value.reduce((sum, catKey) => sum + toInt(base[catKey]), 0);
    base.KOMPUTER = reportMeta?.hasReport ? toInt(reportMeta.komputer) : "";
    base.STATUS = reportMeta?.hasReport ? reportMeta.status || "-" : "-";
    return base;
  });
}

function downloadExcelBuffer(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function applyCategoryHeaderStyle(cell, argbColor) {
  cell.font = { bold: true, color: { argb: "FF222222" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbColor } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top: { style: "thin", color: { argb: "FFBDBDBD" } },
    left: { style: "thin", color: { argb: "FFBDBDBD" } },
    bottom: { style: "thin", color: { argb: "FFBDBDBD" } },
    right: { style: "thin", color: { argb: "FFBDBDBD" } },
  };
}

function applyCategoryBodyStyle(cell, argbColor, { isKet = false } = {}) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argbColor } };
  cell.alignment = {
    vertical: "top",
    horizontal: isKet ? "left" : "center",
    wrapText: !!isKet,
  };
  cell.border = {
    top: { style: "thin", color: { argb: "FFE0E0E0" } },
    left: { style: "thin", color: { argb: "FFE0E0E0" } },
    bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
    right: { style: "thin", color: { argb: "FFE0E0E0" } },
  };
}

function statusFillArgb(statusText) {
  const status = String(statusText || "")
    .trim()
    .toLowerCase();
  if (status.includes("klop")) return "FFC8E6C9";
  if (status.includes("kurang") || status.includes("minus")) return "FFFFCDD2";
  if (status.includes("lebih")) return "FFFFE0B2";
  return "FFF5F5F5";
}

async function handleExportDetailBulanan() {
  if (!exportMonth.value) {
    toast("Pilih bulan yang akan diexport", "error");
    return;
  }

  const [year, month] = exportMonth.value.split("-");
  const startDate = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  const monthYear = monthNameInd(parseInt(month, 10), parseInt(year, 10));

  exporting.value = true;
  try {
    const exportCategories = await resolveExportCategories();
    const categoryIds = exportCategories.map((c) => c.id);

    const reportQ = query(
      floorCollection(db, "daily_stock_reports", activeFloor.value),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const reportSnap = await getDocs(reportQ);

    if (reportSnap.empty) {
      toast(`Tidak ada data untuk bulan ${monthYear}`, "error");
      return;
    }

    const reports = reportSnap.docs.map((d) => normalizeReport(d.data(), d.id));
    const { lookup: reportLookup, dates: reportDates } = buildReportLookup(reports, categoryIds);

    const logsData = await fetchLogsWithFallback(startDate, endDate);
    const groupedLogs = groupLogsByMainCategory(logsData, categoryIds);

    const excelModule = await import("exceljs");
    const ExcelJS = excelModule?.default?.Workbook ? excelModule.default : excelModule;
    const workbook = new ExcelJS.Workbook();
    const usedSheetNames = new Set();

    const summaryHeaders = [
      "Tanggal",
      ...SUMMARY_CATEGORIES.value.map((key) => REVERSE_CATEGORY_MAPPING.value[key] || key),
      "TOTAL",
      "Komputer",
      "Status",
    ];

    const summarySheetName = makeUniqueSheetName("Laporan Stok Detail", usedSheetNames);
    const summaryWs = workbook.addWorksheet(summarySheetName);
    summaryWs.addRow(["LAPORAN STOK DETAIL BULANAN"]);
    summaryWs.addRow([`Bulan: ${monthYear}`]);
    summaryWs.addRow([]);
    exportCategories.forEach((category) => {
      const mainCat = category.id;
      summaryWs.addRow([category.label || mainCat]);
      summaryWs.addRow(summaryHeaders);
      reports.forEach((rep) => {
        const b = rep.breakdown?.[mainCat] || {};
        const total = SUMMARY_CATEGORIES.value.reduce((sum, key) => sum + toInt(b[key]?.total), 0);
        const item = rep.items?.[mainCat] || {};
        const row = [
          rep.date,
          ...SUMMARY_CATEGORIES.value.map((key) => toInt(b[key]?.total)),
          total,
          toInt(item.komputer),
          item.status || "-",
        ];
        summaryWs.addRow(row);
      });
      summaryWs.addRow([]);
    });
    summaryWs.getColumn(1).width = 14;
    for (let i = 2; i <= summaryHeaders.length; i += 1) {
      summaryWs.getColumn(i).width = i === summaryHeaders.length ? 20 : 14;
    }

    const logHeaders = [
      "Tanggal",
      ...SUMMARY_CATEGORIES.value.flatMap((cat) => [REVERSE_CATEGORY_MAPPING.value[cat], `${REVERSE_CATEGORY_MAPPING.value[cat]} Ket`]),
      "TOTAL",
      "Komputer",
      "Status",
    ];

    exportCategories.forEach((category) => {
      const mainCat = category.id;
      const sheetName = makeUniqueSheetName(category.label || mainCat, usedSheetNames, `Sheet_${mainCat}`);
      const wsCat = workbook.addWorksheet(sheetName);
      wsCat.addRow(["LAPORAN STOK DETAIL BULANAN"]);
      wsCat.addRow([`Bulan: ${monthYear}`]);
      wsCat.addRow([`Jenis: ${category.label || mainCat}`]);
      wsCat.addRow([]);
      wsCat.addRow(logHeaders);

      const rows = buildCategoryRowsForExport(mainCat, groupedLogs[mainCat] || [], reportDates, reportLookup);
      if (!rows.length) {
        const placeholder = ["Tidak ada data", ...new Array(logHeaders.length - 1).fill("")];
        wsCat.addRow(placeholder);
      } else {
        rows.forEach((row) => {
          wsCat.addRow([
            row.Tanggal,
            ...SUMMARY_CATEGORIES.value.flatMap((cat) => [toInt(row[cat]), safeCellText(row[`${cat}_ket`] || "")]),
            toInt(row.TOTAL),
            row.KOMPUTER === "" ? "" : toInt(row.KOMPUTER),
            row.STATUS || "-",
          ]);
        });
      }

      wsCat.getColumn(1).width = 14;
      let colCursor = 2;
      SUMMARY_CATEGORIES.value.forEach((catKey) => {
        wsCat.getColumn(colCursor).width = 12;
        wsCat.getColumn(colCursor + 1).width = 36;

        const argb = hexToArgb(SUMMARY_COLUMN_COLORS[catKey], "FFF1F1F1");
        applyCategoryHeaderStyle(wsCat.getCell(5, colCursor), argb);
        applyCategoryHeaderStyle(wsCat.getCell(5, colCursor + 1), argb);

        const lastRow = wsCat.rowCount;
        for (let rowIndex = 6; rowIndex <= lastRow; rowIndex += 1) {
          applyCategoryBodyStyle(wsCat.getCell(rowIndex, colCursor), argb);
          applyCategoryBodyStyle(wsCat.getCell(rowIndex, colCursor + 1), argb, { isKet: true });
        }
        colCursor += 2;
      });

      const totalCol = 2 + SUMMARY_CATEGORIES.value.length * 2;
      const komputerCol = totalCol + 1;
      const statusCol = totalCol + 2;

      wsCat.getColumn(totalCol).width = 11;
      wsCat.getColumn(komputerCol).width = 11;
      wsCat.getColumn(statusCol).width = 18;

      applyCategoryHeaderStyle(wsCat.getCell(5, 1), "FFECEFF1");
      applyCategoryHeaderStyle(wsCat.getCell(5, totalCol), "FFE0E0E0");
      applyCategoryHeaderStyle(wsCat.getCell(5, komputerCol), "FFD1C4E9");
      applyCategoryHeaderStyle(wsCat.getCell(5, statusCol), "FFC8E6C9");

      const lastDataRow = wsCat.rowCount;
      for (let rowIndex = 6; rowIndex <= lastDataRow; rowIndex += 1) {
        applyCategoryBodyStyle(wsCat.getCell(rowIndex, 1), "FFF5F5F5");
        applyCategoryBodyStyle(wsCat.getCell(rowIndex, totalCol), "FFF5F5F5");
        applyCategoryBodyStyle(wsCat.getCell(rowIndex, komputerCol), "FFEDE7F6");
        const statusCell = wsCat.getCell(rowIndex, statusCol);
        applyCategoryBodyStyle(statusCell, statusFillArgb(statusCell.value || ""));
      }

      wsCat.views = [{ state: "frozen", ySplit: 5 }];
    });

    const outputBuffer = await workbook.xlsx.writeBuffer();
    downloadExcelBuffer(outputBuffer, `Laporan_Stok_Detail_${monthYear.replace(" ", "_")}.xlsx`);
    toast("Export berhasil");
  } catch (err) {
    showError("Gagal export", err?.message || "");
  } finally {
    exporting.value = false;
  }
}

async function loadDynamicSettings() {
  try {
    const settings = await fetchInventorySettings(activeFloor.value);
    dynamicSettings.value = settings;
  } catch (e) {
    console.error("Gagal load dynamic settings di laporan harian:", e);
  }
}

watch(activeFloor, async () => {
  await loadDynamicSettings();
  await getStockSnapshot({ force: true });
  await loadReport();
});

onMounted(async () => {
  detailJenisModalInstance = new Modal(detailJenisModalEl.value);
  warnaModalInstance = new Modal(warnaModalEl.value);

  await loadDynamicSettings();
  await getStockSnapshot();
  await loadReport();
});
</script>

<style scoped>
#daily-report-table {
  font-size: 0.9rem;
}

#daily-report-table .badge {
  font-size: 0.85rem;
  padding: 0.35rem 0.8rem;
}

#daily-stock-report-card {
  border-radius: 12px;
  overflow: hidden;
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  #daily-report-table {
    font-size: 0.8rem;
  }
}
</style>
