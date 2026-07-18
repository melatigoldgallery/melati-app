<template>
  <div class="mutation-log card border-0 shadow-sm rounded-3 overflow-hidden">
    <div class="card-header bg-white border-0 py-3">
      <div class="d-flex flex-column gap-3">
        <!-- Title Section -->
        <div class="d-flex align-items-center">
          <div class="icon-box bg-light-info rounded-3 me-2 p-2 text-info">
            <i class="bi bi-clock-history fs-5"></i>
          </div>
          <div>
            <h6 class="mb-0 fw-bold text-dark">Log Mutasi Fisik</h6>
            <small class="text-muted small">Riwayat perpindahan barcode</small>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Row Layout) -->
        <div class="row g-2 align-items-center mt-1">
          <!-- Dropdown Filter Col -->
          <div class="col-auto">
            <div class="input-group input-group-sm shadow-xs rounded-2 border" style="width: 160px; height: 32px;">
              <span class="input-group-text bg-white border-0 text-muted pe-1">
                <i class="bi bi-funnel fs-7"></i>
              </span>
              <select 
                v-model="selectedCategory" 
                class="form-select border-0 ps-1 bg-white custom-select-clean small fw-semibold text-dark" 
                @change="currentPage = 1"
              >
                <option v-for="cat in availableCategories" :key="cat" :value="cat">
                  {{ formatCategory(cat) }}
                </option>
              </select>
            </div>
          </div>

          <!-- Search Input & Button Col -->
          <div class="col-auto">
            <form @submit.prevent="handleSearch" class="d-flex gap-2" style="width: 280px; height: 32px;">
              <div class="input-group input-group-sm shadow-xs rounded-2 border">
                <span class="input-group-text bg-white border-0 text-muted pe-1">
                  <i class="bi bi-search fs-7"></i>
                </span>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="form-control border-0 ps-1 small" 
                  placeholder="Cari satu barcode..." 
                />
                <button v-if="searchQuery" type="button" class="btn btn-link text-decoration-none border-0 text-muted px-2 py-0 d-flex align-items-center justify-content-center" @click="clearSearch">
                  <i class="bi bi-x text-dark"></i>
                </button>
              </div>
              <button type="submit" class="btn btn-sm btn-primary px-3 rounded-2 hover-lift fw-semibold shadow-xs d-flex align-items-center justify-content-center" :disabled="loading" style="height: 32px;">
                Cari
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div class="card-body p-0">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-info" role="status"></div>
        <p class="mt-2 text-muted small">Memuat log mutasi...</p>
      </div>

      <div v-else-if="filteredLogs.length === 0" class="text-center py-5 px-3">
        <div class="empty-state-icon bg-light-secondary text-secondary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
          <i class="bi bi-journal-x fs-3"></i>
        </div>
        <h6 class="fw-semibold text-dark mb-1">Tidak Ada Data</h6>
        <p class="text-muted small mb-0">
          {{ logs.length === 0 ? "Tidak ditemukan riwayat mutasi barcode." : "Tidak ditemukan riwayat mutasi barcode untuk jenis yang dipilih." }}
        </p>
      </div>

      <div v-else>
        <!-- Search Timeline Info Banner (Instead of inline timeline) -->
        <div v-if="isSearchMode && filteredLogs.length > 0" class="px-4 py-3 bg-light-subtle border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-primary fs-7 monospace px-3 py-2">{{ searchedBarcode }}</span>
            <span v-if="selectedCategory" class="text-muted small">Ditemukan {{ filteredLogs.length }} dari {{ logs.length }} riwayat mutasi.</span>
            <span v-else class="text-muted small">Ditemukan {{ logs.length }} riwayat mutasi.</span>
          </div>
          <button 
            type="button" 
            class="btn btn-sm btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-1.5 hover-lift"
            @click="openTimelineModal"
          >
            <i class="bi bi-clock-history"></i>
            <span>Lihat Timeline Lacak</span>
          </button>
        </div>

        <!-- Table View -->
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3" style="width: 12%">Waktu</th>
                <th style="width: 18%">Barcode</th>
                <th style="width: 10%">Kategori</th>
                <th>Rute Perpindahan</th>
                <th style="width: 12%">Staff</th>
                <th style="width: 10%">Status</th>
                <th :class="isSupervisorOnly ? 'text-start' : 'pe-3'" style="width: 15%">Catatan</th>
                <th v-if="isSupervisorOnly" class="pe-3 text-end" style="width: 12%">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in paginatedLogs" :key="log.id" :class="{ 'table-danger-subtle': isStopLocation(log.destination) }" class="log-row">
                <td class="ps-3 text-muted small">
                  {{ formatDate(log.timestamp) }}
                </td>
                <td class="monospace fw-bold text-primary small text-nowrap">
                  <template v-if="log.barcodes && log.barcodes.length > 1">
                    <button 
                      type="button" 
                      class="btn btn-link btn-sm p-0 monospace fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1 align-baseline text-nowrap"
                      data-bs-toggle="modal"
                      data-bs-target="#bulkDetailModal"
                      @click="openBulkDetail(log)"
                    >
                      <i class="bi bi-layers text-secondary"></i>
                      <span>Gabungan ({{ log.barcodes.length }} Barang)</span>
                    </button>
                  </template>
                  <template v-else>
                    {{ log.barcode }}
                  </template>
                </td>
                <td>
                  <span class="small fw-semibold">{{ log.category || "-" }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 d-inline-block text-truncate text-center" style="width: 130px;">
                      {{ getSubDocLabel(log.origin) }}
                    </span>
                    <i class="bi bi-arrow-right text-muted small flex-shrink-0"></i>
                    <span class="badge d-inline-block text-truncate text-center" :class="isStopLocation(log.destination) ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-primary-subtle text-primary border'" style="width: 130px;">
                      {{ getSubDocLabel(log.destination) }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="small fw-semibold text-dark d-block">{{ log.pemindah }}</span>
                </td>
                <td>
                  <span class="badge" :class="log.status === 'rejected' ? 'bg-danger' : 'bg-success'">
                    {{ log.status || 'approved' }}
                  </span>
                </td>
                <td :class="isSupervisorOnly ? 'text-start' : 'pe-3'" class="text-muted small italic">
                  {{ log.notes || "-" }}
                </td>
                <td v-if="isSupervisorOnly" class="pe-3 text-end">
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-xs px-2 py-0.5 rounded-pill transition-all d-inline-flex align-items-center gap-1 align-middle border-0"
                    @click="handleRevertLog(log.id)"
                    :disabled="revertingLogId === log.id"
                  >
                    <span v-if="revertingLogId === log.id" class="spinner-border spinner-border-sm" role="status" style="width: 0.75rem; height: 0.75rem;"></span>
                    <i v-else class="bi bi-arrow-counterclockwise fs-7"></i>
                    <span>Batalkan</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center px-4 py-3 border-top bg-light-subtle">
          <div class="small text-muted">
            Menampilkan <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong> - 
            <strong>{{ Math.min(currentPage * pageSize, filteredLogs.length) }}</strong> dari 
            <strong>{{ filteredLogs.length }}</strong> riwayat mutasi.
          </div>
          <nav aria-label="Page navigation">
            <ul class="pagination pagination-sm mb-0 align-items-center gap-1">
              <!-- Previous Button -->
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button 
                  type="button" 
                  class="page-link rounded-circle d-flex align-items-center justify-content-center p-0 border-0" 
                  style="width: 32px; height: 32px;"
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                >
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>

              <!-- Page Number Buttons -->
              <li 
                v-for="p in totalPages" 
                :key="p" 
                class="page-item" 
                :class="{ active: currentPage === p }"
              >
                <button 
                  type="button" 
                  class="page-link rounded-circle d-flex align-items-center justify-content-center p-0 border-0" 
                  style="width: 32px; height: 32px; font-weight: 600;"
                  @click="currentPage = p"
                >
                  {{ p }}
                </button>
              </li>

              <!-- Next Button -->
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button 
                  type="button" 
                  class="page-link rounded-circle d-flex align-items-center justify-content-center p-0 border-0" 
                  style="width: 32px; height: 32px;"
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                >
                  <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>

    <!-- Modal Detail Bulk Barcode (Teleported to body) -->
    <Teleport to="body">
      <div class="modal fade" id="bulkDetailModal" tabindex="-1" aria-hidden="true" ref="bulkDetailModalRef">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-header py-3 bg-primary text-white border-0 d-flex justify-content-between align-items-center">
              <h6 class="modal-title fw-bold mb-0">
                <i class="bi bi-list-check me-2"></i>
                Detail Perpindahan Gabungan ({{ selectedLog?.barcodes?.length || 0 }} Barang)
              </h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body bg-light-subtle">
              <div v-if="selectedLog" class="mb-3">
                <div class="row g-2 bg-light rounded-2 small">
                  <div class="col-3"><strong>Waktu:</strong> {{ formatDate(selectedLog.timestamp) }}</div>
                  <div class="col-3"><strong>Petugas:</strong> {{ selectedLog.pemindah }}</div>
                  <div class="col-6 text-end d-flex justify-content-end"><button 
                      type="button" 
                      class="btn btn-secondary  btn-sm rounded-pill px-2 py-1 d-flex align-items-center gap-2"
                      style="font-size: 0.8rem;"
                      @click="copyAllBarcodes"
                      :disabled="!selectedLog?.barcodes?.length"
                    >
                      <i class="bi" :class="copiedAll ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
                      <span>{{ copiedAll ? 'Copied' : 'Copy Barcode' }}</span>
                    </button>
                  </div>                  
                </div>
                <div class="row g-2 mb-3 bg-light rounded-2 small">
                  <div class="col-3"><strong>Tujuan:</strong> {{ getSubDocLabel(selectedLog.destination) }}</div>
                  <div class="col-4" v-if="selectedLog.notes"><strong>Catatan:</strong> {{ selectedLog.notes }}</div>
                </div>
                
 

                <div class="table-responsive border border-light rounded-4 shadow-sm bg-white custom-scrollbar" style="max-height: 350px; overflow-y: auto;">
                  <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.85rem;">
                    <thead class="table-secondary">
                      <tr>
                        <th class="ps-3" style="width: 60px;">No</th>
                        <th>Barcode</th>
                        <th>Detail/Warna</th>
                        <th class="pe-3">Asal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in paginatedDetailBarcodes" :key="item.barcode">
                        <td class="ps-3 text-muted">{{ (detailPage - 1) * detailPageSize + idx + 1 }}</td>
                        <td class="monospace fw-bold text-primary">{{ item.barcode }}</td>
                        <td>
                          <span class="badge bg-light text-dark border">
                            {{ item.detailType || '-' }}
                          </span>
                        </td>
                        <td class="pe-3 text-muted">{{ getSubDocLabel(item.origin) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Pagination Controls client-side -->
                <div v-if="selectedLog.barcodes.length > detailPageSize" class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                  <button
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                    :disabled="detailPage === 1"
                    @click="detailPage--"
                  >
                    <i class="bi bi-chevron-left"></i>
                    Sebelumnya
                  </button>
                  <span class="small fw-bold text-secondary">Halaman {{ detailPage }} dari {{ totalDetailPages }}</span>
                  <button
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                    :disabled="detailPage >= totalDetailPages"
                    @click="detailPage++"
                  >
                    Berikutnya
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Modal Timeline Lacak Barcode (Teleported to body) -->
      <div class="modal fade" id="timelineModal" tabindex="-1" aria-hidden="true" ref="timelineModalRef">
        <div class="modal-dialog modal-dialog-centered modal-md">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-header py-3 bg-gradient-primary text-white border-0">
              <h6 class="modal-title fw-bold d-flex align-items-center gap-2">
                <i class="bi bi-clock-history"></i>
                <span>Timeline Lacak Barcode</span>
              </h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4 bg-light-subtle custom-scrollbar" style="max-height: 500px; overflow-y: auto;">
              <div class="text-center mb-4">
                <span class="text-muted small d-block mb-1">KODE BARCODE</span>
                <h4 class="text-primary monospace fw-bold mb-0">{{ searchedBarcode }}</h4>
              </div>

              <div v-if="sortedLogsForTimeline.length === 0" class="text-center py-4 text-muted small">
                Tidak ada riwayat untuk barcode ini.
              </div>
              <div v-else class="timeline-custom-modal ps-3 border-start position-relative ms-2">
                <div 
                  v-for="(log, idx) in sortedLogsForTimeline" 
                  :key="log.id" 
                  class="timeline-item-modal position-relative pb-4"
                >
                  <div class="timeline-dot-modal" :class="getTimelineDotClass(log, idx === 0)"></div>
                  <div class="timeline-card-modal p-3 bg-white border border-light-subtle rounded-3 shadow-sm-hover transition-all text-start">
                    <!-- Route Flow (Asal -> Tujuan) -->
                    <div class="d-flex align-items-center gap-2 mb-2.5 flex-wrap">
                      <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 small fw-bold">
                        {{ getSubDocLabel(getBarcodeOriginInLog(log, searchedBarcode)) }}
                      </span>
                      <i class="bi bi-arrow-right text-muted fs-6"></i>
                      <span class="badge px-2 py-1 small fw-bold" :class="isStopLocation(log.destination) ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-primary-subtle text-primary border'">
                        {{ getSubDocLabel(log.destination) }}
                      </span>
                      
                      <!-- Status Badge -->
                      <span v-if="log.destination === 'laku'" class="badge bg-success text-white px-2 py-1 rounded-pill ms-1" style="font-size: 0.65rem;">
                        <i class="bi bi-check-circle me-1"></i>Terjual
                      </span>
                      <span v-else-if="log.destination === 'mutasi'" class="badge bg-danger text-white px-2 py-1 rounded-pill ms-1" style="font-size: 0.65rem;">
                        <i class="bi bi-arrow-left-right me-1"></i>Mutasi Keluar
                      </span>
                    </div>

                    <!-- Staff & Time Info -->
                    <div class="d-flex justify-content-between align-items-center text-muted small border-top pt-2" style="font-size: 0.78rem;">
                      <div>
                        <i class="bi bi-person me-1"></i>
                        <span>Petugas: <strong>{{ log.pemindah }}</strong></span>
                      </div>
                      <div>
                        <i class="bi bi-clock me-1"></i>
                        <span>{{ formatDate(log.timestamp) }}</span>
                      </div>
                    </div>

                    <!-- Notes -->
                    <div v-if="log.notes" class="mt-2 p-2 bg-light rounded text-muted italic small border-start border-3 border-warning" style="font-size: 0.75rem;">
                      <i class="bi bi-chat-left-text me-1"></i> "{{ log.notes }}"
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer py-2 border-0 bg-light-subtle">
              <button type="button" class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal">
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { Modal } from "bootstrap";
import { revertMutationLog } from "@/services/barcode-service";
import { subscribeInventorySettings } from "@/services/inventory-setting-service";

const auth = useAuthStore();
const { toast, error: showError, confirm } = useAlert();
const isSupervisorOnly = computed(() => auth.userRole?.toLowerCase() === "supervisor");
const revertingLogId = ref("");

async function handleRevertLog(logId) {
  const result = await confirm({
    title: "Batalkan Sesi?",
    text: "Semua barcode yang ditambahkan/dipindahkan pada sesi ini akan dihapus/di-revert massal, dan stok fisik dipulihkan otomatis.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Batalkan",
    cancelButtonText: "Batal"
  });

  if (!result.isConfirmed) return;

  revertingLogId.value = logId;
  try {
    await revertMutationLog({ logId, floorId: auth.activeFloor });
    toast("Sesi mutasi berhasil dibatalkan dan stok dipulihkan.");
  } catch (e) {
    showError("Gagal membatalkan sesi mutasi", e.message);
  } finally {
    revertingLogId.value = "";
  }
}

const logs = ref([]);
const loading = ref(false);
const searchQuery = ref("");
const searchedBarcode = ref("");
const isSearchMode = ref(false);

const selectedCategory = ref("KALUNG");
const activeCards = ref([]);

const availableCategories = computed(() => {
  return activeCards.value;
});

const filteredLogs = computed(() => {
  if (isSearchMode.value) return logs.value;
  if (!selectedCategory.value) return logs.value;
  return logs.value.filter(log => {
    const logCat = (log.category || "").toUpperCase().trim();
    return logCat === selectedCategory.value.toUpperCase().trim();
  });
});

function formatCategory(cat) {
  if (!cat) return "";
  const upper = cat.toUpperCase();
  if (upper === "HALA & SDW") return "Hala & SDW";
  if (upper === "KENDARI & EMAS BALI") return "Kendari & Emas Bali";
  return cat.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

const selectedLog = ref(null);
const copiedAll = ref(false);

async function copyAllBarcodes() {
  if (!selectedLog.value?.barcodes) return;
  const barcodeList = selectedLog.value.barcodes.map(b => b.barcode).join("\n");
  try {
    await navigator.clipboard.writeText(barcodeList);
    copiedAll.value = true;
    toast("Semua barcode berhasil disalin ke clipboard", "success");
    setTimeout(() => {
      copiedAll.value = false;
    }, 2000);
  } catch (err) {
    showError("Gagal menyalin barcode", err.message);
  }
}

const currentPage = ref(1);
const pageSize = ref(20);

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / pageSize.value);
});

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredLogs.value.slice(start, start + pageSize.value);
});

const detailPage = ref(1);
const detailPageSize = 10;
const bulkDetailModalRef = ref(null);
let bulkModalInstance = null;
const timelineModalRef = ref(null);
let timelineModalInstance = null;

const totalDetailPages = computed(() => {
  if (!selectedLog.value?.barcodes) return 0;
  return Math.ceil(selectedLog.value.barcodes.length / detailPageSize);
});

const paginatedDetailBarcodes = computed(() => {
  if (!selectedLog.value?.barcodes) return [];
  const start = (detailPage.value - 1) * detailPageSize;
  return selectedLog.value.barcodes.slice(start, start + detailPageSize);
});

function openBulkDetail(log) {
  selectedLog.value = log;
  detailPage.value = 1;
  if (!bulkModalInstance && bulkDetailModalRef.value) {
    bulkModalInstance = Modal.getOrCreateInstance(bulkDetailModalRef.value);
  }
  bulkModalInstance?.show();
}

function openTimelineModal() {
  if (!timelineModalInstance && timelineModalRef.value) {
    timelineModalInstance = Modal.getOrCreateInstance(timelineModalRef.value);
  }
  timelineModalInstance?.show();
}

function getBarcodeOriginInLog(log, barcode) {
  if (log.barcodes && Array.isArray(log.barcodes)) {
    const item = log.barcodes.find(b => b.barcode === barcode);
    if (item) return item.origin;
  }
  return log.origin;
}

const sortedLogsForTimeline = computed(() => {
  // Sort timeline logs from oldest to newest for chronological flow
  return [...logs.value].sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return timeA - timeB;
  });
});

function isStopLocation(loc) {
  return ["mutasi", "laku"].includes(loc);
}

function getTimelineDotClass(log, isFirst) {
  if (isStopLocation(log.destination)) return 'bg-danger shadow-danger';
  if (isFirst) return 'bg-success shadow-success';
  return 'bg-primary shadow-primary';
}

function getSubDocLabel(key) {
  const map = {
    'brankas': 'Stok Brankas',
    'posting': 'Belum Posting',
    'barang-display': 'Display',
    'barang-rusak': 'Rusak',
    'batu-lepas': 'Batu Lepas',
    'manual': 'Manual',
    'admin': 'Admin',
    'DP': 'DP',
    'lainnya': 'Lainnya',
    'mutasi': 'Mutasi',
    'laku': 'Terjual',
    'sistem_baru': 'Awal Input'
  };
  return map[key] || key;
}

function formatDate(value) {
  if (!value) return "-";
  let d;
  if (value.toDate) d = value.toDate();
  else d = new Date(value);
  
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

let unsubLogs = null;

async function loadLogs() {
  loading.value = true;
  isSearchMode.value = false;
  currentPage.value = 1;
  logs.value = [];
  
  if (unsubLogs) unsubLogs();
  
  try {
    const q = query(
      collection(db, "floors", auth.activeFloor, "barcodeMutationLogs"),
      orderBy("timestamp", "desc"),
      limit(500)
    );
    
    unsubLogs = onSnapshot(q, (snaps) => {
      logs.value = snaps.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loading.value = false;
    }, (e) => {
      showError("Gagal memuat log mutasi", e.message);
      loading.value = false;
    });
  } catch (e) {
    showError("Gagal memuat log mutasi", e.message);
    loading.value = false;
  }
}

async function handleSearch() {
  const queryVal = searchQuery.value.trim().toUpperCase();
  currentPage.value = 1;
  if (!queryVal) {
    await loadLogs();
    return;
  }

  if (unsubLogs) unsubLogs();
  loading.value = true;
  isSearchMode.value = true;
  searchedBarcode.value = queryVal;
  try {
    const qSingle = query(
      collection(db, "floors", auth.activeFloor, "barcodeMutationLogs"),
      where("barcode", "==", queryVal)
    );
    const qBulk = query(
      collection(db, "floors", auth.activeFloor, "barcodeMutationLogs"),
      where("barcodeIds", "array-contains", queryVal)
    );

    const [snapSingle, snapBulk] = await Promise.all([
      getDocs(qSingle),
      getDocs(qBulk)
    ]);

    const logMap = new Map();
    [...snapSingle.docs, ...snapBulk.docs].forEach(doc => {
      logMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const combined = Array.from(logMap.values()).sort((a, b) => {
      const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return timeB - timeA;
    });

    logs.value = combined;
    if (combined.length > 0) {
      setTimeout(() => {
        openTimelineModal();
      }, 50);
    }
  } catch (e) {
    showError("Gagal melacak barcode", e.message);
  } finally {
    loading.value = false;
  }
}

let unsubSettings = null;

onMounted(() => {
  loadLogs();
  
  unsubSettings = subscribeInventorySettings((settings) => {
    activeCards.value = (settings.cards || [])
      .filter(card => card.enabled && card.type !== "computer")
      .map(card => card.id);
      
    if (activeCards.value.length > 0) {
      if (!selectedCategory.value || !activeCards.value.includes(selectedCategory.value)) {
        if (activeCards.value.includes("KALUNG")) {
          selectedCategory.value = "KALUNG";
        } else {
          selectedCategory.value = activeCards.value[0];
        }
      }
    }
  }, (err) => {
    console.error("Gagal berlangganan pengaturan manajemen stok:", err.message);
  }, auth.activeFloor);
});

onUnmounted(() => {
  if (unsubLogs) unsubLogs();
  if (unsubSettings) unsubSettings();
});

function clearSearch() {
  searchQuery.value = "";
  if (activeCards.value.includes("KALUNG")) {
    selectedCategory.value = "KALUNG";
  } else if (activeCards.value.length > 0) {
    selectedCategory.value = activeCards.value[0];
  }
  loadLogs();
}
</script>

<style scoped>
.icon-box {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-light-info {
  background-color: rgba(13, 202, 240, 0.1);
}
.bg-light-secondary {
  background-color: rgba(108, 117, 125, 0.1);
}
.monospace {
  font-family: monospace;
}
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}
.table-danger-subtle {
  background-color: rgba(220, 53, 69, 0.03) !important;
}
.log-row {
  transition: background-color 0.15s ease;
}
.log-row:hover {
  background-color: rgba(248, 249, 250, 0.8) !important;
}

/* Timeline CSS */
.timeline-container {
  margin-top: 15px;
}
.timeline-item {
  min-height: 60px;
}
.timeline-dot {
  position: absolute;
  left: -21px;
  top: 4px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 2px solid #fff;
}
.shadow-primary {
  box-shadow: 0 0 0 3px rgba(63, 55, 201, 0.25);
}
.shadow-success {
  box-shadow: 0 0 0 3px rgba(25, 135, 84, 0.25);
}
.shadow-danger {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
}
.timeline-content {
  border-radius: 8px;
}
.italic {
  font-style: italic;
}
/* Force reload cache */

.modal-header {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%);
  color: #fff;
}

.modal-header .btn-close {
  filter: invert(1);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.25);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.45);
}

/* Timeline modal styling */
.timeline-custom-modal {
  border-left: 2px solid #e2e8f0 !important;
  padding-left: 18px;
}

.timeline-item-modal {
  position: relative;
}

.timeline-dot-modal {
  position: absolute;
  left: -24px;
  top: 15px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  z-index: 2;
}

.timeline-card-modal {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
}

.shadow-sm-hover {
  transition: all 0.2s ease-in-out;
}

.shadow-sm-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}
.custom-select-clean {
  cursor: pointer;
  outline: none;
  box-shadow: none !important;
}
.custom-select-clean:focus {
  background-color: #fff;
}
</style>