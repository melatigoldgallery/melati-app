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

            <button class="btn btn-warning" :disabled="saving || loading" @click="saveSnapshot">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-save me-2"></i>
              Simpan Snapshot
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

              <tr v-for="(cat, idx) in MAIN_CATEGORIES" v-else :key="cat">
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
            <h5 class="modal-title">Detail Per Warna</h5>
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Modal } from "bootstrap";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { MAIN_CATEGORIES, fetchAllStockData } from "@/services/inventory-service";

const { toast, error: showError } = useAlert();
const { todayStringWITA, nowWITA } = useWITA();

const SUMMARY_CATEGORIES = [
  "brankas",
  "posting",
  "barang-display",
  "barang-rusak",
  "batu-lepas",
  "manual",
  "admin",
  "contoh-custom",
  "DP",
];

const REVERSE_CATEGORY_MAPPING = {
  brankas: "Stok Brankas",
  posting: "Belum Posting",
  "barang-display": "Display",
  "barang-rusak": "Rusak",
  "batu-lepas": "Batu Lepas",
  manual: "Manual",
  admin: "Admin",
  DP: "DP",
  "contoh-custom": "Contoh Custom",
};

const COLOR_TYPES = ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
const COLOR_LABELS = { HIJAU: "Hijau", BIRU: "Biru", PUTIH: "Putih", PINK: "Pink", KUNING: "Kuning" };
const HALA_TYPES = ["KA", "LA", "AN", "CA", "SA", "GA"];
const HALA_LABELS = { KA: "Kalung", LA: "Liontin", AN: "Anting", CA: "Cincin", SA: "Giwang", GA: "Gelang" };
const JEWELRY_TYPED_CATEGORIES = ["HALA & SDW", "KENDARI & EMAS BALI"];

const loading = ref(false);
const saving = ref(false);
const exporting = ref(false);
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

const activeDetailCat = ref("");
const warnaEditable = ref(false);
const warnaRows = ref([]);
const warnaModalLabel = ref("Warna");

const dailyDataCache = ref({});
const stockDataSnapshot = ref({});
const lastStockFetchAt = ref(0);
const STOCK_SNAPSHOT_TTL = 60000;
let stockFetchPromise = null;
let autoSnapshotTimer = null;

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

function formatDateKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
  return mainCat === "KALUNG" || mainCat === "LIONTIN" || JEWELRY_TYPED_CATEGORIES.includes(mainCat);
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

  MAIN_CATEGORIES.forEach((mainCat) => {
    const item = rawData?.items?.[mainCat] || { total: 0, komputer: 0, status: "-" };
    normalized.items[mainCat] = {
      total: toInt(item.total),
      komputer: toInt(item.komputer),
      status: item.status || "-",
    };

    const sourceBreakdown = rawData?.breakdown?.[mainCat] || {};
    normalized.breakdown[mainCat] = {};
    SUMMARY_CATEGORIES.forEach((catKey) => {
      const fallbackLabel = REVERSE_CATEGORY_MAPPING[catKey];
      const node = sourceBreakdown[catKey] || sourceBreakdown[fallbackLabel] || {};
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
    const stockData = await fetchAllStockData();
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

  MAIN_CATEGORIES.forEach((mainCat) => {
    let totalAcrossAllDocs = 0;
    breakdown[mainCat] = {};

    SUMMARY_CATEGORIES.forEach((catKey) => {
      const node = sourceStockData?.[catKey]?.[mainCat];
      if (!node) {
        breakdown[mainCat][catKey] = { total: 0 };
        return;
      }

      let total = 0;
      let details = null;
      if (node.details && typeof node.details === "object") {
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

async function saveSnapshotByDate(dateKey, { backfilled = false } = {}) {
  const live = await getStockSnapshot({ force: true });
  const snap = computeCurrentSummarySnapshot(live);
  const docRef = doc(db, "daily_stock_reports", dateKey);
  await setDoc(
    docRef,
    {
      date: dateKey,
      createdAt: new Date().toISOString(),
      items: snap.items,
      breakdown: snap.breakdown,
      ...(backfilled ? { backfilled: true } : {}),
    },
    { merge: true },
  );
}

async function ensureYesterdaySnapshotIfMissing() {
  const now = nowWITA();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = formatDateKey(yesterday);
  if (!yesterdayKey) return;
  const docRef = doc(db, "daily_stock_reports", yesterdayKey);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await saveSnapshotByDate(yesterdayKey, { backfilled: true });
    toast("Snapshot kemarin (backfill) dibuat dengan breakdown lengkap");
  }
}

async function ensureTodaySnapshotIfPassed() {
  const now = nowWITA();
  const cutoff = new Date(now);
  cutoff.setHours(23, 0, 0, 0);
  if (now >= cutoff) {
    const key = formatDateKey(now);
    if (!key) return;
    const docRef = doc(db, "daily_stock_reports", key);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await saveSnapshotByDate(key);
      toast("Snapshot otomatis dibuat dengan breakdown lengkap");
    }
  }
}

function scheduleAutoSnapshot() {
  const now = nowWITA();
  const target = new Date(now);
  target.setHours(23, 0, 0, 0);
  if (now > target) target.setDate(target.getDate() + 1);
  const delay = Math.max(1000, target.getTime() - now.getTime());
  autoSnapshotTimer = window.setTimeout(async () => {
    try {
      const now2 = nowWITA();
      const key = formatDateKey(now2);
      if (key) {
        await saveSnapshotByDate(key);
        toast("Snapshot otomatis terekam 23:00 WITA");
      }
    } catch (err) {
      showError("Gagal snapshot otomatis", err?.message || "");
    } finally {
      scheduleAutoSnapshot();
    }
  }, delay);
}

async function loadReport() {
  if (!selectedDate.value) return;
  loading.value = true;

  try {
    const docRef = doc(db, "daily_stock_reports", selectedDate.value);
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

async function saveSnapshot() {
  if (!selectedDate.value) return;
  saving.value = true;
  try {
    await saveSnapshotByDate(selectedDate.value);
    toast("Snapshot berhasil disimpan");
    await loadReport();
  } catch (err) {
    showError("Gagal menyimpan snapshot", err?.message || "");
  } finally {
    saving.value = false;
  }
}

function openDetailJenis(mainCat) {
  if (!reportData.value) return;

  activeMainCat.value = mainCat;
  showDetailEye.value = categoryUsesDetails(mainCat);
  showEditAction.value = selectedDate.value !== todayKey.value;

  const rows = SUMMARY_CATEGORIES.map((catKey) => {
    const qty = toInt(reportData.value?.breakdown?.[mainCat]?.[catKey]?.total);
    return {
      catKey,
      label: REVERSE_CATEGORY_MAPPING[catKey] || catKey,
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

  if (mainCat === "KALUNG" || mainCat === "LIONTIN") {
    warnaModalLabel.value = "Warna";
    return COLOR_TYPES.map((type) => ({
      key: type,
      label: COLOR_LABELS[type],
      value: toInt(hasDetail ? breakdownNode.details[type] : isToday ? liveDetails[type] : 0),
      editable,
    }));
  }

  if (JEWELRY_TYPED_CATEGORIES.includes(mainCat)) {
    warnaModalLabel.value = "Jenis";
    return HALA_TYPES.map((type) => ({
      key: type,
      label: HALA_LABELS[type],
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
    if (
      activeMainCat.value === "KALUNG" ||
      activeMainCat.value === "LIONTIN" ||
      JEWELRY_TYPED_CATEGORIES.includes(activeMainCat.value)
    ) {
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

    const newMainTotal = SUMMARY_CATEGORIES.reduce((sum, catKey) => {
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

    const docRef = doc(db, "daily_stock_reports", selectedDate.value);
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

function groupLogsByMainCategory(logDocs) {
  const locations = [...SUMMARY_CATEGORIES];
  const grouped = {};
  MAIN_CATEGORIES.forEach((cat) => {
    grouped[cat] = [];
  });

  const dateMap = new Map();
  logDocs.forEach((docData) => {
    const logs = Array.isArray(docData.logs) ? docData.logs : [];
    logs.forEach((log) => {
      const mainCat = log.jenis;
      const location = log.lokasi;
      if (!MAIN_CATEGORIES.includes(mainCat) || !locations.includes(location)) return;
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
          const ket = log.keterangan || "";
          const qty = Math.abs(after - before);
          return `stok awal ${before} ${user} ${action} ${qty} : ${ket}`;
        })
        .join("\n");
      total += row[loc];
    });
    row.TOTAL = total;
    grouped[entry.mainCat].push(row);
  });

  MAIN_CATEGORIES.forEach((cat) => {
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
    const reportQ = query(
      collection(db, "daily_stock_reports"),
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

    const logsQ = query(
      collection(db, "daily_stock_logs"),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc"),
    );
    const logsSnap = await getDocs(logsQ);
    const logsData = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const groupedLogs = groupLogsByMainCategory(logsData);

    const { utils, writeFileXLSX } = await import("xlsx");

    const headers = [
      "Tanggal",
      "DP",
      "Admin",
      "Brankas",
      "Display",
      "Rusak",
      "Batu Lepas",
      "Manual",
      "Custom",
      "Posting",
      "TOTAL",
      "Komputer",
      "Status",
    ];

    const wsRows = [["LAPORAN STOK DETAIL BULANAN"], [`Bulan: ${monthYear}`], []];

    MAIN_CATEGORIES.forEach((mainCat) => {
      wsRows.push([mainCat]);
      wsRows.push(headers);
      reports.forEach((rep) => {
        const b = rep.breakdown?.[mainCat] || {};
        const total = SUMMARY_CATEGORIES.reduce((sum, key) => sum + toInt(b[key]?.total), 0);
        const item = rep.items?.[mainCat] || {};
        wsRows.push([
          rep.date,
          toInt(b.DP?.total),
          toInt(b.admin?.total),
          toInt(b.brankas?.total),
          toInt(b["barang-display"]?.total),
          toInt(b["barang-rusak"]?.total),
          toInt(b["batu-lepas"]?.total),
          toInt(b.manual?.total),
          toInt(b["contoh-custom"]?.total),
          toInt(b.posting?.total),
          total,
          toInt(item.komputer),
          item.status || "-",
        ]);
      });
      wsRows.push([]);
    });

    const ws = utils.aoa_to_sheet(wsRows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Laporan Stok Detail");

    const logHeaders = ["Tanggal"];
    SUMMARY_CATEGORIES.forEach((cat) => {
      logHeaders.push(REVERSE_CATEGORY_MAPPING[cat], `${REVERSE_CATEGORY_MAPPING[cat]} Ket`);
    });
    logHeaders.push("TOTAL");

    const logRows = [["LAPORAN STOK DETAIL BULANAN MELATI BAWAH"], [`Bulan: ${monthYear}`], []];

    MAIN_CATEGORIES.forEach((mainCat) => {
      const rows = groupedLogs[mainCat] || [];
      if (!rows.length) return;
      logRows.push([mainCat]);
      logRows.push(logHeaders);
      rows.forEach((row) => {
        const values = [row.Tanggal];
        SUMMARY_CATEGORIES.forEach((cat) => {
          values.push(toInt(row[cat]), row[`${cat}_ket`] || "");
        });
        values.push(toInt(row.TOTAL));
        logRows.push(values);
      });
      logRows.push([]);
    });

    const ws2 = utils.aoa_to_sheet(logRows);
    utils.book_append_sheet(wb, ws2, "Laporan Stok Detail Bulanan");

    writeFileXLSX(wb, `Laporan_Stok_Detail_${monthYear.replace(" ", "_")}.xlsx`);
    toast("Export berhasil");
  } catch (err) {
    showError("Gagal export", err?.message || "");
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  detailJenisModalInstance = new Modal(detailJenisModalEl.value);
  warnaModalInstance = new Modal(warnaModalEl.value);

  try {
    await ensureYesterdaySnapshotIfMissing();
    await ensureTodaySnapshotIfPassed();
  } catch {
    // skip auto-ensure if no permission
  }

  scheduleAutoSnapshot();
  await getStockSnapshot();
  await loadReport();
});

onBeforeUnmount(() => {
  if (autoSnapshotTimer) {
    clearTimeout(autoSnapshotTimer);
    autoSnapshotTimer = null;
  }
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
