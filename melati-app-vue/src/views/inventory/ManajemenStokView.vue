<template>
  <div class="container-fluid py-3 stock-page">
    <div class="page-header d-flex justify-content-between align-items-center mb-3">
      <div class="">
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
      <div class="">
        <button class="btn btn-sm btn-outline-secondary" @click="refreshData" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data stok...</p>
    </div>

    <template v-else>
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
                  <th v-if="showRincianColumn" class="text-center">Rincian</th>
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
                  <td v-if="showRincianColumn" class="text-center">
                    <button
                      v-if="hasDetails(activeTab, sub.key)"
                      class="btn btn-outline-primary btn-sm"
                      @click="openDetailModal(activeTab, sub)"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <span v-else class="text-muted">-</span>
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
                  <td :colspan="showRincianColumn ? 3 : 2">Total Fisik</td>
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
    </template>

    <div class="modal fade" id="simpleUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <form @submit.prevent="submitSimpleUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${simpleForm.mainCat} - ${simpleForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jumlah</label>
                <input
                  v-model.number="simpleForm.quantity"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  required
                />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="simpleForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`simple-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="simpleForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="typedUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form @submit.prevent="submitTypedUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update {{ typedForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${typedForm.mainCat} - ${typedForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Warna</th>
                      <th class="text-center">Stok Saat Ini</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ct in COLOR_TYPES" :key="ct">
                      <td>{{ COLOR_LABELS[ct] }}</td>
                      <td class="text-center">{{ typedForm.original[ct] ?? 0 }}</td>
                      <td>
                        <input
                          v-model.number="typedForm.details[ct]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="typedForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`typed-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="typedForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="halaUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form @submit.prevent="submitHalaUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update {{ halaForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${halaForm.mainCat} - ${halaForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Jenis Perhiasan</th>
                      <th class="text-center">Stok Saat Ini</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ht in HALA_TYPES" :key="ht">
                      <td>{{ HALA_LABELS[ht] }}</td>
                      <td class="text-center">{{ halaForm.original[ht] ?? 0 }}</td>
                      <td>
                        <input
                          v-model.number="halaForm.details[ht]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="halaForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`hala-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="halaForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="komputerUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <form @submit.prevent="submitKomputerUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok Komputer</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis Barang</label>
                <input class="form-control form-control-sm" :value="komputerForm.mainCat" readonly />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jumlah</label>
                <input
                  v-model.number="komputerForm.quantity"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  required
                />
              </div>
              <small class="text-muted">Update stok komputer tidak mencatat riwayat.</small>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-primary btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="komputerColorModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <form @submit.prevent="submitKomputerColorUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok Komputer {{ komputerColorForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>{{ komputerDetailLabel }}</th>
                      <th>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ct in komputerDetailTypes" :key="ct">
                      <td>{{ komputerDetailLabels[ct] || ct }}</td>
                      <td>
                        <input
                          v-model.number="komputerColorForm.details[ct]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-primary btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="historyModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">Riwayat - {{ historyInfo.mainCat }} / {{ historyInfo.subLabel }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <div v-if="historyList.length === 0" class="text-center text-muted py-3">Belum ada riwayat.</div>
            <div v-else class="table-responsive">
              <table class="table table-sm table-striped mb-0">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Staff</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in historyList.slice(0, 10)" :key="i">
                    <td>{{ i + 1 }}</td>
                    <td>{{ formatDate(h.date) }}</td>
                    <td>{{ formatHistoryQty(h) }}</td>
                    <td>{{ h.petugas || "-" }}</td>
                    <td>{{ formatHistoryNote(h) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <small v-if="historyList.length > 10" class="text-muted">Menampilkan 10 riwayat terbaru.</small>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="detailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">Rincian - {{ detailInfo.mainCat }} / {{ detailInfo.subLabel }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Jenis</th>
                  <th class="text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(qty, key) in detailData" :key="key">
                  <td>{{ getTypeLabel(detailInfo.mainCat, key) }}</td>
                  <td class="text-center fw-bold">{{ qty }}</td>
                </tr>
                <tr v-if="Object.keys(detailData).length === 0">
                  <td colspan="2" class="text-center text-muted">Tidak ada detail</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import {
  COLOR_LABELS,
  COLOR_TYPES,
  HALA_LABELS,
  HALA_TYPES,
  KETERANGAN_OPTS,
  calcFisikTotal,
  fetchAllStockData,
  fetchDailyReport,
  getStockStatus,
  mergeStockByLatest,
  saveDailyReport,
  subscribeStocksRealtime,
  fetchStaffOptions,
  updateKomputerStock,
  updateStockItem,
} from "@/services/inventory-service";
import {
  ensureInventorySettings,
  fetchInventorySettings,
  normalizeInventorySettings,
  subscribeInventorySettings,
} from "@/services/inventory-setting-service";

const { toast, error: showError } = useAlert();
const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const stockData = ref({});
const staffOptions = ref([]);
const displaySettings = ref(normalizeInventorySettings());
const activeTab = ref("");

const CACHE_KEY_PREFIX = "melati-stock-cache-v2";
const CACHE_TTL = 5 * 60 * 1000;
const modalMap = new Map();

let unsubRealtime = null;
let unsubSettings = null;
let snapshotTimer = null;

const simpleForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  quantity: 0,
  petugas: "",
  keterangan: "",
});

const typedForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  details: {},
  original: {},
  petugas: "",
  keterangan: "",
});

const halaForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  details: {},
  original: {},
  petugas: "",
  keterangan: "",
});

const komputerForm = ref({
  mainCat: "",
  quantity: 0,
});

const komputerColorForm = ref({
  mainCat: "",
  detailType: "",
  details: {},
});

const historyInfo = ref({ mainCat: "", subLabel: "" });
const historyList = ref([]);
const detailInfo = ref({ mainCat: "", subLabel: "" });
const detailData = ref({});

const enabledCards = computed(() => displaySettings.value.cards.filter((card) => card.enabled));
const nonComputerCards = computed(() => enabledCards.value.filter((card) => card.type !== "computer"));
const summaryCards = computed(() => nonComputerCards.value.filter((card) => card.showInSummary !== false));
const tabs = computed(() => enabledCards.value);
const hasTabs = computed(() => tabs.value.length > 0);
const tableRows = computed(() => displaySettings.value.tableRows.filter((row) => row.enabled));
const isComputerTab = computed(() => getCardType(activeTab.value) === "computer");
const showRincianColumn = computed(() => isColorType(activeTab.value) || isHalaType(activeTab.value));
const komputerDetailTypes = computed(() => {
  if (komputerColorForm.value.detailType === "hala") return HALA_TYPES;
  if (komputerColorForm.value.detailType === "color") return COLOR_TYPES;
  return [];
});
const komputerDetailLabels = computed(() => {
  if (komputerColorForm.value.detailType === "hala") return HALA_LABELS;
  if (komputerColorForm.value.detailType === "color") return COLOR_LABELS;
  return {};
});
const komputerDetailLabel = computed(() => (komputerColorForm.value.detailType === "hala" ? "Jenis" : "Warna"));
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

function getCardDetailMode(id) {
  const card = getCardById(id);
  const mode = String(card?.detailMode || "")
    .trim()
    .toLowerCase();
  if (mode === "color" || mode === "hala" || mode === "default") return mode;
  if (card?.type === "color") return "color";
  if (card?.type === "hala") return "hala";
  return "default";
}

function isColorType(id) {
  return getCardDetailMode(id) === "color";
}

function isHalaType(id) {
  return getCardDetailMode(id) === "hala";
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

function hasDetails(mainCat, subDoc) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode !== "color" && detailMode !== "hala") return false;
  const item = getItem(subDoc, mainCat);
  return !!(item?.details && Object.keys(item.details).length > 0);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getTypeLabel(mainCat, key) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color") return COLOR_LABELS[key] || key;
  if (detailMode === "hala") return HALA_LABELS[key] || key;
  return key;
}

function formatHistoryQty(record) {
  if (record.oldQuantity !== undefined && record.newQuantity !== undefined) {
    return `${toInt(record.oldQuantity)} -> ${toInt(record.newQuantity)}`;
  }
  return `${toInt(record.quantity)}`;
}

function formatHistoryNote(record) {
  const base = (record.keterangan || "-").toUpperCase();
  if (!record.items || !Array.isArray(record.items) || !record.items.length) return base;
  const summaryText = record.items
    .filter((it) => toInt(it.quantity) !== 0)
    .map((it) => `${it.jewelryName || it.jewelryType}: ${toInt(it.oldQuantity)} -> ${toInt(it.newQuantity)}`)
    .join(", ");
  if (!summaryText) return base;
  return `${summaryText} | ${base}`;
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
  return String(auth.activeFloor || "")
    .trim()
    .toUpperCase();
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
    // ignore quota or parse errors
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

async function loadData({ force = false } = {}) {
  loading.value = true;
  try {
    if (!force) {
      const cacheData = readCache();
      if (cacheData) {
        stockData.value = cacheData;
        loading.value = false;
        return;
      }
    }

    stockData.value = await fetchAllStockData(auth.activeFloor);
    writeCache(stockData.value);
  } catch (e) {
    showError("Gagal memuat data stok", e.message);
  } finally {
    loading.value = false;
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
    () => {
      // ignore listener runtime errors
    },
    auth.activeFloor,
  );
}

async function refreshData() {
  await loadData({ force: true });
  toast("Data stok diperbarui");
}

function openUpdateModal(mainCat, sub) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color") {
    const item = getItem(sub.key, mainCat) || {};
    const details = {};
    COLOR_TYPES.forEach((k) => {
      details[k] = toInt(item.details?.[k]);
    });
    typedForm.value = {
      mainCat,
      subDoc: sub.key,
      subLabel: sub.label,
      details: { ...details },
      original: { ...details },
      petugas: "",
      keterangan: "",
    };
    showModal("typedUpdateModal");
    return;
  }

  if (detailMode === "hala") {
    const item = getItem(sub.key, mainCat) || {};
    const details = {};
    HALA_TYPES.forEach((k) => {
      details[k] = toInt(item.details?.[k]);
    });
    halaForm.value = {
      mainCat,
      subDoc: sub.key,
      subLabel: sub.label,
      details: { ...details },
      original: { ...details },
      petugas: "",
      keterangan: "",
    };
    showModal("halaUpdateModal");
    return;
  }

  simpleForm.value = {
    mainCat,
    subDoc: sub.key,
    subLabel: sub.label,
    quantity: getQty(mainCat, sub.key),
    petugas: "",
    keterangan: "",
  };
  showModal("simpleUpdateModal");
}

function openKomputerModal(mainCat) {
  const item = getItem("stok-komputer", mainCat) || { quantity: 0, details: {} };
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color" || detailMode === "hala") {
    const detailType = detailMode;
    const types = detailMode === "hala" ? HALA_TYPES : COLOR_TYPES;
    const details = {};
    types.forEach((k) => {
      details[k] = toInt(item.details?.[k]);
    });
    komputerColorForm.value = {
      mainCat,
      detailType,
      details,
    };
    showModal("komputerColorModal");
    return;
  }

  komputerForm.value = {
    mainCat,
    quantity: toInt(item.quantity),
  };
  showModal("komputerUpdateModal");
}

function openHistoryModal(mainCat, sub) {
  historyInfo.value = {
    mainCat,
    subLabel: sub.label,
  };
  historyList.value = getItem(sub.key, mainCat)?.history || [];
  showModal("historyModal");
}

function openDetailModal(mainCat, sub) {
  detailInfo.value = {
    mainCat,
    subLabel: sub.label,
  };
  detailData.value = getItem(sub.key, mainCat)?.details || {};
  showModal("detailModal");
}

function hasTypedChanges(details, original) {
  return Object.keys(details || {}).some((key) => toInt(details[key]) !== toInt(original?.[key]));
}

async function submitSimpleUpdate() {
  if (!simpleForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!simpleForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: simpleForm.value.subDoc,
      mainCat: simpleForm.value.mainCat,
      newQuantity: toInt(simpleForm.value.quantity),
      newDetails: null,
      petugas: simpleForm.value.petugas.trim(),
      keterangan: simpleForm.value.keterangan,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("simpleUpdateModal");
    toast("Stok berhasil diperbarui");
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitTypedUpdate() {
  if (!typedForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!typedForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");
  if (!hasTypedChanges(typedForm.value.details, typedForm.value.original)) {
    return toast("Tidak ada perubahan data", "warning");
  }

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: typedForm.value.subDoc,
      mainCat: typedForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...typedForm.value.details },
      petugas: typedForm.value.petugas.trim(),
      keterangan: typedForm.value.keterangan,
      detailType: "color",
      floorId: auth.activeFloor,
    });
    applyLocalUpdate({
      subDoc: typedForm.value.subDoc,
      mainCat: typedForm.value.mainCat,
      details: { ...typedForm.value.details },
    });
    await loadData({ force: true });
    closeModal("typedUpdateModal");
    toast(`Update ${typedForm.value.mainCat} berhasil`);
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitHalaUpdate() {
  if (!halaForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!halaForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");
  if (!hasTypedChanges(halaForm.value.details, halaForm.value.original)) {
    return toast("Tidak ada perubahan data", "warning");
  }

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: halaForm.value.subDoc,
      mainCat: halaForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...halaForm.value.details },
      petugas: halaForm.value.petugas.trim(),
      keterangan: halaForm.value.keterangan,
      detailType: "hala",
      floorId: auth.activeFloor,
    });
    applyLocalUpdate({
      subDoc: halaForm.value.subDoc,
      mainCat: halaForm.value.mainCat,
      details: { ...halaForm.value.details },
    });
    await loadData({ force: true });
    closeModal("halaUpdateModal");
    toast(`Update ${halaForm.value.mainCat} berhasil`);
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitKomputerUpdate() {
  saving.value = true;
  try {
    await updateKomputerStock({
      mainCat: komputerForm.value.mainCat,
      newQuantity: toInt(komputerForm.value.quantity),
      newDetails: null,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("komputerUpdateModal");
    toast("Stok komputer diperbarui");
  } catch (e) {
    showError("Gagal update stok komputer", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitKomputerColorUpdate() {
  saving.value = true;
  try {
    await updateKomputerStock({
      mainCat: komputerColorForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...komputerColorForm.value.details },
      detailType: komputerColorForm.value.detailType,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("komputerColorModal");
    toast("Stok komputer diperbarui");
  } catch (e) {
    showError("Gagal update stok komputer", e.message);
  } finally {
    saving.value = false;
  }
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
  } catch {
    // ignore malformed storage payload
  }
}

function getNowWita() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 60 * 60000);
}

function formatDateKey(dateObj) {
  const d = new Date(dateObj);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function scheduleNextDailySnapshot() {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  const now = getNowWita();
  const target = new Date(now);
  target.setHours(0, 5, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  snapshotTimer = setTimeout(async () => {
    try {
      await saveDailyReport(formatDateKey(getNowWita()), stockData.value, auth.activeFloor);
    } catch {
      // ignore snapshot runtime errors
    } finally {
      scheduleNextDailySnapshot();
    }
  }, delay);
}

async function initDailySnapshots() {
  try {
    const now = getNowWita();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = formatDateKey(yesterday);
    const yReport = await fetchDailyReport(yesterdayKey, auth.activeFloor);
    if (yReport.source === "none") {
      await saveDailyReport(yesterdayKey, stockData.value, auth.activeFloor);
    }

    const todayKey = formatDateKey(now);
    const today005 = new Date(now);
    today005.setHours(0, 5, 0, 0);
    if (now >= today005) {
      const tReport = await fetchDailyReport(todayKey, auth.activeFloor);
      if (tReport.source === "none") {
        await saveDailyReport(todayKey, stockData.value, auth.activeFloor);
      }
    }
  } catch {
    // ignore bootstrap snapshot errors
  } finally {
    scheduleNextDailySnapshot();
  }
}

onMounted(async () => {
  await syncFloorScopedState();
  window.addEventListener("storage", handleStorageSync);
  await initDailySnapshots();
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
  if (snapshotTimer) clearTimeout(snapshotTimer);
  window.removeEventListener("storage", handleStorageSync);
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
  max-height: 580px;
}

.modal-header {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%);
  color: #fff;
}

.modal-header .btn-close {
  filter: invert(1);
}
</style>
