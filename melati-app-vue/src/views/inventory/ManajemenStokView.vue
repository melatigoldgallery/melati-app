<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-archive me-2 text-warning"></i>
        Manajemen Stok Brankas
      </h4>
      <button class="btn btn-sm btn-outline-secondary" @click="loadData" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data stok...</p>
    </div>

    <template v-else>
      <!-- Summary Cards -->
      <div class="row g-2 mb-3">
        <div
          v-for="cat in MAIN_CATEGORIES"
          :key="cat"
          class="col-6 col-md-4 col-lg-2"
          style="cursor: pointer"
          @click="activeTab = cat"
        >
          <div
            class="card border-2 shadow-sm text-center p-2 h-100"
            :class="activeTab === cat ? 'border-warning' : 'border-0'"
          >
            <div class="small fw-semibold text-truncate mb-1" :title="cat">{{ cat }}</div>
            <div class="fs-5 fw-bold">{{ summary[cat]?.fisik ?? 0 }}</div>
            <span
              class="badge mt-1"
              :class="`bg-${summary[cat]?.status.cls ?? 'secondary'}`"
              style="font-size: 0.68rem"
            >
              {{ summary[cat]?.status.label ?? "-" }}
            </span>
          </div>
        </div>
      </div>

      <!-- Category Tabs -->
      <ul class="nav nav-tabs flex-nowrap overflow-auto mb-0">
        <li v-for="cat in MAIN_CATEGORIES" :key="cat" class="nav-item">
          <button
            class="nav-link text-nowrap small"
            :class="activeTab === cat ? 'active fw-semibold' : ''"
            @click="activeTab = cat"
          >
            {{ cat }}
          </button>
        </li>
      </ul>

      <!-- Tab Content Table -->
      <div class="card border-0 shadow-sm rounded-0 rounded-bottom">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px">#</th>
                  <th>Lokasi</th>
                  <th class="text-center">Jumlah</th>
                  <th class="text-center">Rincian</th>
                  <th class="text-center">Riwayat</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sub, idx) in SUB_CATEGORIES" :key="sub.key">
                  <td class="text-muted small align-middle">{{ idx + 1 }}</td>
                  <td class="fw-semibold align-middle">{{ sub.label }}</td>
                  <td class="text-center align-middle">
                    <span class="badge bg-success fs-6 px-2">{{ getQty(activeTab, sub.key) }}</span>
                  </td>
                  <td class="text-center align-middle">
                    <button
                      v-if="hasDetails(activeTab, sub.key)"
                      class="btn btn-outline-primary btn-sm"
                      @click="openDetailModal(activeTab, sub)"
                      title="Lihat rincian"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <span v-else class="text-muted small">—</span>
                  </td>
                  <td class="text-center align-middle">
                    <button
                      class="btn btn-outline-info btn-sm"
                      @click="openHistoryModal(activeTab, sub)"
                      title="Lihat riwayat"
                    >
                      <i class="bi bi-clock-history"></i>
                    </button>
                  </td>
                  <td class="text-center align-middle">
                    <button class="btn btn-success btn-sm" @click="openEditModal(activeTab, sub.key, sub.label)">
                      <i class="bi bi-pencil me-1"></i>
                      Update
                    </button>
                  </td>
                </tr>

                <!-- Stok Komputer row -->
                <tr class="table-secondary">
                  <td class="text-muted small align-middle">—</td>
                  <td class="fw-bold align-middle">Stok Komputer</td>
                  <td class="text-center align-middle">
                    <span class="badge bg-primary fs-6 px-2">{{ getQty(activeTab, "stok-komputer") }}</span>
                  </td>
                  <td class="text-center align-middle">—</td>
                  <td class="text-center align-middle">—</td>
                  <td class="text-center align-middle">
                    <button
                      class="btn btn-primary btn-sm"
                      @click="openEditModal(activeTab, 'stok-komputer', 'Stok Komputer')"
                    >
                      <i class="bi bi-pencil me-1"></i>
                      Update
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="table-light fw-bold">
                  <td colspan="2">Total Fisik</td>
                  <td class="text-center">{{ summary[activeTab]?.fisik ?? 0 }}</td>
                  <td colspan="3" class="text-center">
                    <span class="badge fs-6" :class="`bg-${summary[activeTab]?.status.cls ?? 'secondary'}`">
                      {{ summary[activeTab]?.status.label ?? "-" }}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Update Modal ── -->
    <div class="modal fade" id="editStokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-pencil-square me-2 text-success"></i>
              Update Stok —
              <span class="text-warning">{{ editForm.mainCat }}</span>
              /
              {{ editForm.subLabel }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 mb-3">
              <div class="col-md-5">
                <label class="form-label small fw-semibold">
                  Petugas
                  <span class="text-danger">*</span>
                </label>
                <input
                  v-model="editForm.petugas"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Nama petugas"
                />
              </div>
              <div class="col-md-5">
                <label class="form-label small fw-semibold">
                  Keterangan
                  <span class="text-danger">*</span>
                </label>
                <select v-model="editForm.keterangan" class="form-select form-select-sm">
                  <option value="">-- Pilih keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>

            <!-- Simple quantity (ANTING, CINCIN, GELANG, GIWANG, BERLIAN, stok-komputer) -->
            <div v-if="!TYPED_CATS.includes(editForm.mainCat) && !HALA_CATS.includes(editForm.mainCat)" class="mb-2">
              <label class="form-label small fw-semibold">Jumlah</label>
              <input
                v-model.number="editForm.quantity"
                type="number"
                min="0"
                class="form-control form-control-sm"
                style="max-width: 140px"
              />
            </div>

            <!-- Color typed: KALUNG / LIONTIN -->
            <div v-else-if="TYPED_CATS.includes(editForm.mainCat)" class="mb-2">
              <label class="form-label small fw-semibold">Detail per Warna</label>
              <div class="row g-2">
                <div v-for="ct in COLOR_TYPES" :key="ct" class="col-4 col-md-2">
                  <label class="form-label small text-muted mb-0">{{ COLOR_LABELS[ct] }}</label>
                  <input
                    v-model.number="editForm.details[ct]"
                    type="number"
                    min="0"
                    class="form-control form-control-sm text-center"
                  />
                </div>
              </div>
              <div class="mt-2 text-end small fw-semibold text-muted">Total: {{ colorTotal }}</div>
            </div>

            <!-- HALA types: HALA & SDW / KENDARI & EMAS BALI -->
            <div v-else class="mb-2">
              <label class="form-label small fw-semibold">Detail per Jenis Perhiasan</label>
              <div class="row g-2">
                <div v-for="ht in HALA_TYPES" :key="ht" class="col-4 col-md-2">
                  <label class="form-label small text-muted mb-0">{{ HALA_LABELS[ht] }}</label>
                  <input
                    v-model.number="editForm.details[ht]"
                    type="number"
                    min="0"
                    class="form-control form-control-sm text-center"
                  />
                </div>
              </div>
              <div class="mt-2 text-end small fw-semibold text-muted">Total: {{ halaTotal }}</div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-success btn-sm" @click="saveEdit" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── History Modal ── -->
    <div class="modal fade" id="historyStokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-clock-history me-2 text-info"></i>
              Riwayat — {{ historyInfo.mainCat }} / {{ historyInfo.subLabel }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <div v-if="historyList.length === 0" class="text-center text-muted py-3">Belum ada riwayat.</div>
            <ul v-else class="list-group list-group-flush">
              <li v-for="(h, i) in historyList" :key="i" class="list-group-item p-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span
                    class="badge"
                    :class="
                      h.action === 'Tambah' ? 'bg-success' : h.action === 'Kurangi' ? 'bg-warning text-dark' : 'bg-info'
                    "
                  >
                    {{ h.action }}
                  </span>
                  <small class="text-muted">{{ h.date?.substring(0, 10) ?? "-" }}</small>
                </div>
                <small class="text-muted">{{ h.petugas }} — {{ h.keterangan }} (qty: {{ h.quantity }})</small>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Detail Modal ── -->
    <div class="modal fade" id="detailStokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-list-ul me-2 text-primary"></i>
              Rincian — {{ detailInfo.mainCat }} / {{ detailInfo.subLabel }}
            </h6>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import {
  MAIN_CATEGORIES,
  SUB_CATEGORIES,
  COLOR_TYPES,
  HALA_TYPES,
  COLOR_LABELS,
  HALA_LABELS,
  TYPED_CATS,
  HALA_CATS,
  fetchAllStockData,
  calcFisikTotal,
  getStockStatus,
  updateStockItem,
} from "@/services/inventory-service";

const { toast, error: showError } = useAlert();

const KETERANGAN_OPTS = ["restok", "dipajang", "salah update", "sudah posting", "mutasi", "diperbaiki", "laku"];

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const saving = ref(false);
const stockData = ref({});
const activeTab = ref(MAIN_CATEGORIES[0]);

// Edit modal
const editForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  quantity: 0,
  details: {},
  petugas: "",
  keterangan: "",
});

// History modal
const historyInfo = ref({ mainCat: "", subLabel: "" });
const historyList = ref([]);

// Detail modal
const detailInfo = ref({ mainCat: "", subLabel: "" });
const detailData = ref({});

// ── Computed ──────────────────────────────────────────────────────────────
const summary = computed(() => {
  const s = {};
  MAIN_CATEGORIES.forEach((cat) => {
    const fisik = calcFisikTotal(stockData.value, cat);
    const komputer = parseInt(stockData.value["stok-komputer"]?.[cat]?.quantity) || 0;
    s[cat] = { fisik, komputer, status: getStockStatus(fisik, komputer) };
  });
  return s;
});

const colorTotal = computed(() => COLOR_TYPES.reduce((s, k) => s + (parseInt(editForm.value.details[k]) || 0), 0));
const halaTotal = computed(() => HALA_TYPES.reduce((s, k) => s + (parseInt(editForm.value.details[k]) || 0), 0));

// ── Helpers ───────────────────────────────────────────────────────────────
function getQty(mainCat, subDoc) {
  const item = stockData.value[subDoc]?.[mainCat];
  if (!item) return 0;
  if (item.details && Object.keys(item.details).length > 0) {
    return Object.values(item.details).reduce((s, v) => s + (parseInt(v) || 0), 0);
  }
  return parseInt(item.quantity) || 0;
}

function hasDetails(mainCat, subDoc) {
  const item = stockData.value[subDoc]?.[mainCat];
  return !!(item?.details && Object.keys(item.details).length > 0);
}

function getTypeLabel(mainCat, key) {
  if (TYPED_CATS.includes(mainCat)) return COLOR_LABELS[key] || key;
  if (HALA_CATS.includes(mainCat)) return HALA_LABELS[key] || key;
  return key;
}

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  try {
    stockData.value = await fetchAllStockData();
  } catch (e) {
    showError("Gagal memuat data stok", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Modal: Edit ───────────────────────────────────────────────────────────
function openEditModal(mainCat, subDoc, subLabel) {
  const item = stockData.value[subDoc]?.[mainCat] || {};
  editForm.value = {
    mainCat,
    subDoc,
    subLabel,
    quantity: item.quantity || 0,
    details: item.details ? { ...item.details } : {},
    petugas: "",
    keterangan: "",
  };

  // Ensure typed keys are pre-populated
  if (TYPED_CATS.includes(mainCat)) {
    COLOR_TYPES.forEach((k) => {
      if (editForm.value.details[k] === undefined) editForm.value.details[k] = 0;
    });
  } else if (HALA_CATS.includes(mainCat)) {
    HALA_TYPES.forEach((k) => {
      if (editForm.value.details[k] === undefined) editForm.value.details[k] = 0;
    });
  }

  new Modal(document.getElementById("editStokModal")).show();
}

async function saveEdit() {
  if (!editForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!editForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");

  const isTyped = TYPED_CATS.includes(editForm.value.mainCat) || HALA_CATS.includes(editForm.value.mainCat);

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: editForm.value.subDoc,
      mainCat: editForm.value.mainCat,
      newQuantity: isTyped ? null : editForm.value.quantity,
      newDetails: isTyped ? { ...editForm.value.details } : null,
      petugas: editForm.value.petugas.trim(),
      keterangan: editForm.value.keterangan,
    });
    await loadData();
    Modal.getInstance(document.getElementById("editStokModal"))?.hide();
    toast("Stok berhasil diperbarui");
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

// ── Modal: History ────────────────────────────────────────────────────────
function openHistoryModal(mainCat, sub) {
  historyInfo.value = { mainCat, subLabel: sub.label };
  historyList.value = stockData.value[sub.key]?.[mainCat]?.history || [];
  new Modal(document.getElementById("historyStokModal")).show();
}

// ── Modal: Detail ─────────────────────────────────────────────────────────
function openDetailModal(mainCat, sub) {
  detailInfo.value = { mainCat, subLabel: sub.label };
  detailData.value = stockData.value[sub.key]?.[mainCat]?.details || {};
  new Modal(document.getElementById("detailStokModal")).show();
}

onMounted(loadData);
</script>
