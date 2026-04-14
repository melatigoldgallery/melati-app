<template>
  <div class="container-fluid py-3">
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-arrow-left-right me-2 text-dark"></i>
        Mutasi Kode
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/inventory/manajemen">Inventory</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Mutasi Kode</li>
        </ol>
      </nav>
    </div>
    <div class="d-flex justify-content-end align-items-center mb-3">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="refreshData"
        :disabled="loading || processing"
      >
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <h6 class="mb-0 fw-semibold">
          <i class="bi bi-funnel me-2"></i>
          Filter Kode
        </h6>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3 col-lg-2">
            <label for="filterJenis" class="form-label">Jenis Barang</label>
            <select id="filterJenis" v-model="filterJenis" class="form-select">
              <option value="">Semua Jenis</option>
              <option value="C">Cincin (C)</option>
              <option value="K">Kalung (K)</option>
              <option value="L">Liontin (L)</option>
              <option value="A">Anting (A)</option>
              <option value="G">Gelang (G)</option>
              <option value="S">Giwang (S)</option>
              <option value="Z">HALA (Z)</option>
              <option value="V">HALA (V)</option>
            </select>
          </div>
          <div class="col-md-4 col-lg-3">
            <label for="searchKode" class="form-label">Cari Kode</label>
            <input
              id="searchKode"
              v-model="searchText"
              type="text"
              class="form-control"
              placeholder="Masukkan kode..."
            />
          </div>
        </div>
      </div>
    </div>

    <ul class="nav nav-tabs mb-3" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="activeTab === 'active' ? 'active' : ''"
          @click="switchTab('active')"
        >
          <i class="bi bi-check-circle me-2"></i>
          Kode Aktif
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="activeTab === 'mutated' ? 'active' : ''"
          @click="switchTab('mutated')"
        >
          <i class="bi bi-arrow-left-right me-2"></i>
          Kode Sudah Dimutasi
        </button>
      </li>
    </ul>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-info" role="status"></div>
      <p class="small text-muted mt-2 mb-0">Memuat data kode...</p>
    </div>

    <template v-else>
      <div v-show="activeTab === 'active'" class="card mb-0">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h6 class="mb-0 fw-semibold">
            <i class="bi bi-list-ul me-2"></i>
            Daftar Kode Aktif
          </h6>
          <button
            type="button"
            class="btn btn-success btn-sm"
            @click="openMutasiModal()"
            :disabled="selectedActiveIds.size === 0"
          >
            <i class="bi bi-arrow-left-right me-2"></i>
            Mutasi Terpilih
            <span v-if="selectedActiveIds.size > 0">({{ selectedActiveIds.size }})</span>
          </button>
        </div>

        <div class="card-body">
          <div class="table-container">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 kode-table" id="tableActiveKode">
                <thead class="table-primary">
                  <tr>
                    <th style="width: 5%">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="allActiveSelected"
                        @change="toggleSelectAllActive"
                      />
                    </th>
                    <th style="width: 11%">Tanggal Input</th>
                    <th style="width: 9%">Kode</th>
                    <th style="width: 8%">Sales</th>
                    <th style="width: 20%">Nama Barang</th>
                    <th style="width: 9%">Kadar</th>
                    <th style="width: 9%">Berat</th>
                    <th style="width: 19%">Keterangan</th>
                    <th style="width: 10%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredActive.length === 0">
                    <td colspan="9" class="text-center">Tidak ada data kode</td>
                  </tr>
                  <tr v-for="item in filteredActive" :key="item.id">
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="selectedActiveIds.has(item.id)"
                        @change="toggleSelectItem('active', item.id)"
                      />
                    </td>
                    <td>{{ item.tanggalInput || "-" }}</td>
                    <td>{{ item.kode }}</td>
                    <td>{{ item.sales || "-" }}</td>
                    <td class="text-truncate-cell" :title="item.nama">{{ item.nama }}</td>
                    <td>{{ item.kadar }}</td>
                    <td>{{ item.berat }}</td>
                    <td class="text-truncate-cell" :title="item.keterangan || '-'">{{ item.keterangan || "-" }}</td>
                    <td class="aksi-cell">
                      <div class="d-flex flex-wrap gap-1">
                        <button type="button" class="btn btn-info btn-sm" @click="openDetailModal(item, 'active')">
                          <i class="bi bi-info-circle"></i>
                        </button>
                        <button
                          v-if="currentDataSource === 'mutasiKode'"
                          type="button"
                          class="btn btn-warning btn-sm"
                          @click="openMutasiModal(item.id)"
                        >
                          <i class="bi bi-arrow-left-right"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-3 mb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span class="badge bg-primary">{{ filteredActive.length }}</span>
              kode aktif ditemukan
            </div>
            <button type="button" class="btn btn-outline-success btn-sm" @click="exportActiveKodes">
              <i class="bi bi-file-earmark-spreadsheet me-2"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'mutated'" class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h6 class="mb-0 fw-semibold">
            <i class="bi bi-list-ul me-2"></i>
            Daftar Kode Sudah Dimutasi
          </h6>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-warning btn-sm"
              @click="confirmRestoreSelected"
              :disabled="selectedMutatedIds.size === 0 || currentDataSource !== 'mutasiKode'"
            >
              <i class="bi bi-arrow-counterclockwise me-2"></i>
              Kembalikan Terpilih
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              @click="openValidasiDeleteModal"
              :disabled="selectedMutatedIds.size === 0 || currentDataSource !== 'mutasiKode'"
            >
              <i class="bi bi-trash me-2"></i>
              Hapus Terpilih
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="table-container">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 kode-table" id="tableMutatedKode">
                <thead class="table-light">
                  <tr>
                    <th style="width: 4%">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="allMutatedSelected"
                        @change="toggleSelectAllMutated"
                      />
                    </th>
                    <th style="width: 10%">Tanggal Input</th>
                    <th style="width: 9%">Kode</th>
                    <th style="width: 7%">Sales</th>
                    <th style="width: 19%">Nama Barang</th>
                    <th style="width: 6%">Kadar</th>
                    <th style="width: 6%">Berat</th>
                    <th style="width: 11%">Tanggal Mutasi</th>
                    <th style="width: 18%">Keterangan</th>
                    <th style="width: 10%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredMutated.length === 0">
                    <td colspan="10" class="text-center">Tidak ada data kode</td>
                  </tr>
                  <tr v-for="item in filteredMutated" :key="item.id">
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        :checked="selectedMutatedIds.has(item.id)"
                        @change="toggleSelectItem('mutated', item.id)"
                      />
                    </td>
                    <td>{{ item.tanggalInput || "-" }}</td>
                    <td>{{ item.kode }}</td>
                    <td>{{ item.sales || "-" }}</td>
                    <td class="text-truncate-cell" :title="item.nama">{{ item.nama }}</td>
                    <td>{{ item.kadar }}</td>
                    <td>{{ item.berat }}</td>
                    <td>{{ item.tanggalMutasi || "-" }}</td>
                    <td class="text-truncate-cell" :title="item.keterangan || '-'">{{ item.keterangan || "-" }}</td>
                    <td class="aksi-cell">
                      <div class="d-flex flex-wrap gap-1">
                        <button type="button" class="btn btn-info btn-sm" @click="openDetailModal(item, 'mutated')">
                          <i class="bi bi-info-circle"></i>
                        </button>
                        <button
                          v-if="currentDataSource === 'mutasiKode'"
                          type="button"
                          class="btn btn-secondary btn-sm"
                          @click="confirmRestoreSingle(item.id)"
                        >
                          <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span class="badge bg-secondary">{{ filteredMutated.length }}</span>
              kode sudah dimutasi
            </div>
            <button type="button" class="btn btn-outline-success btn-sm" @click="exportMutatedKodes">
              <i class="bi bi-file-earmark-spreadsheet me-2"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </template>

    <div class="modal fade" id="kodeDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content border-0">
          <div class="modal-header bg-primary text-white border-0 py-3">
            <h5 class="modal-title">
              <i class="bi bi-tag me-2"></i>
              Detail Kode Barang
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" v-if="detailItem">
            <div class="row g-2 mb-3 px-2">
              <div class="col-md-4">
                <div class="border-start border-4 border-primary ps-3 py-2">
                  <small class="text-muted d-block">KODE</small>
                  <div class="h5 fw-bold mb-0">{{ detailItem.kode }}</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border-start border-4 border-primary ps-3 py-2">
                  <small class="text-muted d-block">SALES</small>
                  <div class="h5 fw-bold mb-0">{{ detailItem.sales || "-" }}</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="border-start border-4 border-primary ps-3 py-2">
                  <small class="text-muted d-block">JENIS</small>
                  <div class="h5 fw-bold mb-0">{{ detailItem.jenisNama }}</div>
                </div>
              </div>
            </div>

            <div class="mb-3 px-2 py-3 bg-light rounded">
              <h6 class="text-secondary mb-3">
                <i class="bi bi-box me-2"></i>
                Informasi Barang
              </h6>
              <div class="mb-3">
                <label class="form-label small text-muted mb-2">Nama Barang</label>
                <input type="text" class="form-control form-control-sm" :value="detailItem.nama" readonly />
              </div>
              <div class="row g-2 mb-3">
                <div class="col-md-6">
                  <label class="form-label small text-muted mb-2">Kadar</label>
                  <input type="text" class="form-control form-control-sm" :value="detailItem.kadar" readonly />
                </div>
                <div class="col-md-6">
                  <label class="form-label small text-muted mb-2">Berat (gr)</label>
                  <input type="text" class="form-control form-control-sm" :value="detailItem.berat" readonly />
                </div>
              </div>
              <div class="mb-0">
                <label class="form-label small text-muted mb-2">Keterangan</label>
                <textarea
                  class="form-control form-control-sm"
                  rows="2"
                  readonly
                  :value="detailItem.keterangan || '-'"
                />
              </div>
            </div>

            <div class="mb-3 p-3 bg-light rounded">
              <small class="text-muted d-block mb-2">TANGGAL INPUT</small>
              <strong>{{ detailItem.tanggalInput || "-" }}</strong>
            </div>

            <div v-if="detailType === 'mutated'" class="mb-3 px-2 py-3 bg-light rounded">
              <h6 class="text-secondary mb-3">
                <i class="bi bi-arrow-left-right me-2"></i>
                Informasi Mutasi
              </h6>
              <div class="row g-2 mb-3">
                <div class="col-md-6">
                  <label class="form-label small text-muted mb-2">Tanggal Mutasi</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    :value="detailItem.tanggalMutasi || '-'"
                    readonly
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label small text-muted mb-2">Status</label>
                  <div class="pt-1">
                    <span class="badge bg-secondary small">Sudah Dimutasi</span>
                  </div>
                </div>
              </div>
              <div class="mb-0">
                <label class="form-label small text-muted mb-2">Keterangan Mutasi</label>
                <textarea
                  class="form-control form-control-sm"
                  rows="2"
                  readonly
                  :value="detailItem.mutasiKeterangan || '-'"
                />
              </div>
            </div>

            <div v-if="detailType === 'mutated' && detailHistory.length > 0" class="mb-0 px-2 py-3 bg-light rounded">
              <h6 class="text-secondary mb-3">
                <i class="bi bi-clock-history me-2"></i>
                Riwayat Mutasi
              </h6>
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Status</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(history, idx) in detailHistory" :key="idx">
                      <td class="text-muted">{{ history.tanggal || "-" }}</td>
                      <td>
                        <span class="badge bg-secondary">{{ history.status || "-" }}</span>
                      </td>
                      <td>{{ history.keterangan || "-" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer bg-light border-top py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
              <i class="bi bi-x-lg me-1"></i>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="mutasiModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Mutasi Kode</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="saveMutasi">
            <div class="modal-body">
              <div class="mb-3">
                <label for="tanggalMutasi" class="form-label">Tanggal Mutasi</label>
                <input id="tanggalMutasi" v-model="tanggalMutasi" type="text" class="form-control" readonly />
              </div>
              <div class="mb-3">
                <label for="keteranganMutasi" class="form-label">Keterangan Mutasi</label>
                <textarea
                  id="keteranganMutasi"
                  v-model="keteranganMutasi"
                  class="form-control"
                  rows="3"
                  placeholder="Masukkan keterangan mutasi"
                />
              </div>
              <div class="mb-0">
                <label class="form-label">Kode yang akan dimutasi:</label>
                <ul class="list-group">
                  <li
                    v-for="item in selectedItemsForMutasi"
                    :key="item.id"
                    class="list-group-item d-flex justify-content-between align-items-center"
                  >
                    {{ item.kode }} - {{ item.nama }}
                    <span class="badge bg-primary rounded-pill">{{ item.jenisNama }}</span>
                  </li>
                  <li v-if="selectedItemsForMutasi.length === 0" class="list-group-item text-muted text-center">
                    Tidak ada kode yang dipilih
                  </li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="processing">
                <span v-if="processing" class="spinner-border spinner-border-sm me-2"></span>
                Konfirmasi Mutasi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="modalValidasiHapus" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="bi bi-shield-lock me-2"></i>
              Validasi Penghapusan Data
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="submitValidasiDelete">
            <div class="modal-body">
              <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Peringatan!</strong>
                Anda akan menghapus
                <span>{{ pendingDeleteItems.length }}</span>
                kode secara permanen. Tindakan ini tidak dapat dibatalkan.
              </div>

              <div class="mb-3">
                <label for="validasiPassword" class="form-label">
                  <i class="bi bi-lock me-1"></i>
                  Kode Akses Hapus
                </label>
                <div class="input-group">
                  <input
                    id="validasiPassword"
                    v-model="validasiPassword"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    placeholder="Masukkan kode akses"
                    required
                    autocomplete="current-password"
                  />
                  <button class="btn btn-outline-secondary" type="button" @click="showPassword = !showPassword">
                    <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
              </div>

              <div v-if="validasiError" class="alert alert-danger mb-0">
                <i class="bi bi-x-circle me-2"></i>
                {{ validasiError }}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-danger" :disabled="processing">
                <span v-if="processing" class="spinner-border spinner-border-sm me-2"></span>
                Konfirmasi Hapus
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Swal from "sweetalert2";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import {
  clearAllCache,
  clearOldCache,
  deleteSelectedKodes,
  exportToExcel,
  fetchKodeData,
  filterKodeData,
  getCurrentDateDDMMYYYY,
  getTodayCacheInfo,
  loadCacheFromStorage,
  mutateSelectedKodes,
  restoreSelectedKodes,
  setupRealtimeListener,
  verifyDeleteMutasiKodePassword,
} from "@/services/mutasi-service";

const { error: showError, success, toast } = useAlert();

const loading = ref(false);
const processing = ref(false);
const activeTab = ref("active");
const filterJenis = ref("");
const searchText = ref("");
const kodeData = ref({ active: [], mutated: [] });
const currentDataSource = ref("mutasiKode");
const cacheBadgeText = ref("");

const selectedActiveIds = ref(new Set());
const selectedMutatedIds = ref(new Set());

const detailItem = ref(null);
const detailType = ref("active");

const tanggalMutasi = ref(getCurrentDateDDMMYYYY());
const keteranganMutasi = ref("");

const pendingDeleteItems = ref([]);
const validasiPassword = ref("");
const validasiError = ref("");
const showPassword = ref(false);

let cleanupTimer = null;
let unsubscribeListener = null;
let detailModal = null;
let mutasiModal = null;
let validasiModal = null;

const sourceText = computed(() =>
  currentDataSource.value === "penjualanAksesoris" ? "Transaksi Penjualan" : "Mutasi Kode",
);

const filteredActive = computed(() => {
  const mutatedIds = new Set((kodeData.value.mutated || []).map((i) => i.id));
  const activeBase = (kodeData.value.active || []).filter((i) => !mutatedIds.has(i.id) && !i.isMutated);
  return filterKodeData(activeBase, filterJenis.value, searchText.value);
});

const filteredMutated = computed(() =>
  filterKodeData(kodeData.value.mutated || [], filterJenis.value, searchText.value),
);

const allActiveSelected = computed(
  () => filteredActive.value.length > 0 && filteredActive.value.every((item) => selectedActiveIds.value.has(item.id)),
);
const allMutatedSelected = computed(
  () =>
    filteredMutated.value.length > 0 && filteredMutated.value.every((item) => selectedMutatedIds.value.has(item.id)),
);

const selectedItemsForMutasi = computed(() => {
  const ids = selectedActiveIds.value;
  return (kodeData.value.active || []).filter((item) => ids.has(item.id));
});

const detailHistory = computed(() =>
  Array.isArray(detailItem.value?.mutasiHistory) ? detailItem.value.mutasiHistory : [],
);

function switchTab(tab) {
  activeTab.value = tab;
  selectedActiveIds.value = new Set();
  selectedMutatedIds.value = new Set();
}

function updateCacheBadge() {
  const cacheInfo = getTodayCacheInfo();
  if (!cacheInfo) {
    cacheBadgeText.value = "";
    return;
  }

  const formatted = new Date(cacheInfo.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  cacheBadgeText.value = `Cache (${formatted})`;
}

async function loadData(forceRefresh = false) {
  loading.value = true;
  selectedActiveIds.value = new Set();
  selectedMutatedIds.value = new Set();

  try {
    const result = await fetchKodeData({ forceRefresh });
    kodeData.value = result.data;
    currentDataSource.value = result.source;
    updateCacheBadge();
    setupListener();
  } catch (e) {
    showError("Gagal memuat data kode", e?.message || "Terjadi kesalahan");
  } finally {
    loading.value = false;
  }
}

function setupListener() {
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
  }

  unsubscribeListener = setupRealtimeListener({
    source: currentDataSource.value,
    initialData: kodeData.value,
    onUpdate: (newData) => {
      kodeData.value = newData;
      updateCacheBadge();
    },
    onError: () => {
      setTimeout(() => {
        loadData(true);
      }, 5000);
    },
  });
}

function toggleSelectItem(type, id) {
  if (type === "active") {
    const next = new Set(selectedActiveIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedActiveIds.value = next;
    return;
  }

  const next = new Set(selectedMutatedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedMutatedIds.value = next;
}

function toggleSelectAllActive(e) {
  const isChecked = e.target.checked;
  if (!isChecked) {
    selectedActiveIds.value = new Set();
    return;
  }

  const next = new Set();
  filteredActive.value.forEach((item) => next.add(item.id));
  selectedActiveIds.value = next;
}

function toggleSelectAllMutated(e) {
  const isChecked = e.target.checked;
  if (!isChecked) {
    selectedMutatedIds.value = new Set();
    return;
  }

  const next = new Set();
  filteredMutated.value.forEach((item) => next.add(item.id));
  selectedMutatedIds.value = next;
}

function openDetailModal(item, type) {
  detailItem.value = item;
  detailType.value = type;
  detailModal?.show();
}

function openMutasiModal(singleId = null) {
  if (singleId) {
    selectedActiveIds.value = new Set([singleId]);
  }

  if (selectedActiveIds.value.size === 0) {
    toast("Pilih kode yang akan dimutasi terlebih dahulu", "info");
    return;
  }

  tanggalMutasi.value = getCurrentDateDDMMYYYY();
  keteranganMutasi.value = "";
  mutasiModal?.show();
}

async function saveMutasi() {
  if (!tanggalMutasi.value || !keteranganMutasi.value.trim()) {
    toast("Tanggal dan keterangan mutasi harus diisi", "warning");
    return;
  }

  const selectedItems = kodeData.value.active.filter((item) => selectedActiveIds.value.has(item.id));
  if (selectedItems.length === 0) {
    toast("Tidak ada kode yang dipilih", "warning");
    return;
  }

  processing.value = true;
  try {
    await mutateSelectedKodes({
      selectedItems,
      currentDataSource: currentDataSource.value,
      tanggalMutasi: tanggalMutasi.value,
      keteranganMutasi: keteranganMutasi.value.trim(),
    });

    mutasiModal?.hide();
    selectedActiveIds.value = new Set();
    await loadData(true);
    success(`${selectedItems.length} kode berhasil dimutasi`);
  } catch (e) {
    showError("Gagal memutasi kode", e?.message || "Terjadi kesalahan");
  } finally {
    processing.value = false;
  }
}

async function confirmRestoreSelected() {
  if (selectedMutatedIds.value.size === 0) {
    toast("Pilih kode yang akan dikembalikan terlebih dahulu", "info");
    return;
  }

  const result = await Swal.fire({
    title: "Konfirmasi",
    text: "Apakah Anda yakin ingin mengembalikan kode yang dipilih ke status aktif?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya",
    cancelButtonText: "Batal",
    confirmButtonColor: "#0d6efd",
    cancelButtonColor: "#6c757d",
  });

  if (!result.isConfirmed) return;

  const selectedItems = kodeData.value.mutated.filter((item) => selectedMutatedIds.value.has(item.id));
  if (selectedItems.length === 0) return;

  processing.value = true;
  try {
    await restoreSelectedKodes(selectedItems);
    selectedMutatedIds.value = new Set();
    await loadData(true);
    success(`${selectedItems.length} kode berhasil dikembalikan`);
  } catch (e) {
    showError("Gagal mengembalikan kode", e?.message || "Terjadi kesalahan");
  } finally {
    processing.value = false;
  }
}

function confirmRestoreSingle(id) {
  selectedMutatedIds.value = new Set([id]);
  confirmRestoreSelected();
}

function openValidasiDeleteModal() {
  if (currentDataSource.value !== "mutasiKode") {
    toast("Hapus kode hanya dapat dilakukan pada data arsip.", "info");
    return;
  }

  const selectedItems = kodeData.value.mutated.filter((item) => selectedMutatedIds.value.has(item.id));
  if (selectedItems.length === 0) {
    toast("Tidak ada kode yang dipilih", "warning");
    return;
  }

  pendingDeleteItems.value = selectedItems;
  validasiPassword.value = "";
  validasiError.value = "";
  showPassword.value = false;
  validasiModal?.show();
}

async function submitValidasiDelete() {
  if (!validasiPassword.value) {
    validasiError.value = "Kode akses wajib diisi";
    return;
  }

  processing.value = true;
  validasiError.value = "";

  try {
    const valid = await verifyDeleteMutasiKodePassword(validasiPassword.value);
    if (!valid) {
      validasiError.value = "Kode akses tidak valid";
      return;
    }

    await deleteSelectedKodes(pendingDeleteItems.value);
    validasiModal?.hide();
    selectedMutatedIds.value = new Set();
    pendingDeleteItems.value = [];
    await loadData(true);
    success("Kode berhasil dihapus");
  } catch (e) {
    validasiError.value = e?.message || "Terjadi kesalahan saat menghapus data";
  } finally {
    processing.value = false;
  }
}

function exportActiveKodes() {
  if (filteredActive.value.length === 0) {
    toast("Tidak ada data untuk di-export", "info");
    return;
  }

  try {
    exportToExcel(filteredActive.value, "Kode_Aktif", "Kode Aktif", currentDataSource.value);
    toast("Export data aktif berhasil", "success");
  } catch (e) {
    showError("Gagal export data aktif", e?.message || "Terjadi kesalahan");
  }
}

function exportMutatedKodes() {
  if (filteredMutated.value.length === 0) {
    toast("Tidak ada data untuk di-export", "info");
    return;
  }

  try {
    exportToExcel(filteredMutated.value, "Kode_Dimutasi", "Kode Dimutasi", currentDataSource.value);
    toast("Export data mutasi berhasil", "success");
  } catch (e) {
    showError("Gagal export data mutasi", e?.message || "Terjadi kesalahan");
  }
}

async function refreshData() {
  try {
    clearAllCache();
    await loadData(true);
    success("Data berhasil diperbarui");
  } catch (e) {
    showError("Gagal memperbarui data", e?.message || "Terjadi kesalahan");
  }
}

function cleanup() {
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

onMounted(async () => {
  detailModal = new Modal(document.getElementById("kodeDetailModal"));
  mutasiModal = new Modal(document.getElementById("mutasiModal"));
  validasiModal = new Modal(document.getElementById("modalValidasiHapus"));

  loadCacheFromStorage();

  await loadData();
  cleanupTimer = setInterval(clearOldCache, 30 * 60 * 1000);
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<style scoped>
.table-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #edf1f5;
  border-radius: 0.65rem;
}

.kode-table {
  table-layout: fixed;
  font-size: 0.82rem;
}

.kode-table thead th {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #343a41;
  white-space: nowrap;
  padding: 0.56rem 0.5rem;
}

.kode-table tbody td {
  padding: 0.52rem 0.5rem;
}

.kode-table :deep(.btn.btn-sm) {
  padding: 0.18rem 0.42rem;
  font-size: 0.73rem;
}

.text-truncate-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.aksi-cell {
  white-space: nowrap;
}

@media (max-width: 991.98px) {
  .kode-table {
    font-size: 0.78rem;
  }

  .kode-table thead th {
    font-size: 0.68rem;
  }
}
</style>
