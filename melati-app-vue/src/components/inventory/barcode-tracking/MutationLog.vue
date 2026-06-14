<template>
  <div class="mutation-log card border-0 shadow-sm rounded-3 overflow-hidden">
    <div class="card-header bg-white border-0 py-3">
      <div class="row align-items-center g-3">
        <div class="col-sm-6 d-flex align-items-center">
          <div class="icon-box bg-light-info rounded-3 me-2 p-2 text-info">
            <i class="bi bi-clock-history fs-5"></i>
          </div>
          <div>
            <h6 class="mb-0 fw-bold text-dark">Log Mutasi Fisik</h6>
            <small class="text-muted small">Riwayat perpindahan barcode</small>
          </div>
        </div>
        <div class="col-sm-6">
          <form @submit.prevent="handleSearch" class="d-flex gap-2 justify-content-sm-end">
            <div class="input-group input-group-sm" style="max-width: 280px;">
              <span class="input-group-text bg-white text-muted border-end-0">
                <i class="bi bi-search"></i>
              </span>
              <input 
                v-model="searchQuery" 
                type="text" 
                class="form-control border-start-0 ps-0" 
                placeholder="Cari satu kode barcode..." 
              />
              <button v-if="searchQuery" type="button" class="btn btn-outline-secondary border" @click="clearSearch">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <button type="submit" class="btn btn-sm btn-primary px-3 rounded-2 hover-lift" :disabled="loading">
              Cari
            </button>
          </form>
        </div>
      </div>
    </div>

    <div class="card-body p-0">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-info" role="status"></div>
        <p class="mt-2 text-muted small">Memuat log mutasi...</p>
      </div>

      <div v-else-if="logs.length === 0" class="text-center py-5 px-3">
        <div class="empty-state-icon bg-light-secondary text-secondary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
          <i class="bi bi-journal-x fs-3"></i>
        </div>
        <h6 class="fw-semibold text-dark mb-1">Tidak Ada Data</h6>
        <p class="text-muted small mb-0">Tidak ditemukan riwayat mutasi barcode.</p>
      </div>

      <div v-else>
        <!-- Search Timeline Mode (Only when searching specific barcode) -->
        <div v-if="isSearchMode && logs.length > 0" class="px-4 py-3 bg-light-subtle border-bottom">
          <h6 class="text-dark fw-bold small mb-3">Timeline Lacak Barcode: <span class="text-primary monospace fs-5">{{ searchedBarcode }}</span></h6>
          <div class="timeline-container ps-3 border-start">
            <div 
              v-for="(log, idx) in sortedLogsForTimeline" 
              :key="log.id" 
              class="timeline-item position-relative pb-4"
            >
              <div class="timeline-dot" :class="getTimelineDotClass(log, idx === 0)"></div>
              <div class="timeline-content ms-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="small fw-bold text-dark">{{ getSubDocLabel(log.destination) }}</span>
                  <span v-if="isStopLocation(log.destination)" class="badge bg-danger rounded-pill px-2 py-0.5" style="font-size: 0.65rem;">
                    <i class="bi bi-shield-lock me-1"></i>Tracking Berhenti
                  </span>
                  <small class="text-muted ms-auto" style="font-size: 0.75rem;">{{ formatDate(log.timestamp) }}</small>
                </div>
                <p class="text-muted small mb-0">
                  Dipindahkan oleh <span class="fw-semibold text-dark">{{ log.pemindah }}</span> dari <span class="fw-semibold text-dark">{{ getSubDocLabel(getBarcodeOriginInLog(log, searchedBarcode)) }}</span>.
                  <span v-if="log.notes" class="text-muted italic d-block mt-1 small bg-light p-1 rounded">"{{ log.notes }}"</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3" style="width: 15%">Waktu</th>
                <th style="width: 12%">Barcode</th>
                <th style="width: 12%">Kategori</th>
                <th>Rute Perpindahan</th>
                <th style="width: 15%">Staff</th>
                <th style="width: 10%">Status</th>
                <th class="pe-3" style="width: 20%">Catatan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id" :class="{ 'table-danger-subtle': isStopLocation(log.destination) }" class="log-row">
                <td class="ps-3 text-muted small">
                  {{ formatDate(log.timestamp) }}
                </td>
                <td class="monospace fw-bold text-primary small">
                  <template v-if="log.barcodes && log.barcodes.length > 1">
                    <button 
                      type="button" 
                      class="btn btn-link btn-sm p-0 monospace fw-bold text-primary text-decoration-none d-inline-flex align-items-center gap-1 align-baseline"
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
                    <span class="badge bg-secondary-subtle text-secondary border px-2 py-1">{{ getSubDocLabel(log.origin) }}</span>
                    <i class="bi bi-arrow-right text-muted small"></i>
                    <span class="badge" :class="isStopLocation(log.destination) ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-primary-subtle text-primary border'">
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
                <td class="pe-3 text-muted small italic">
                  {{ log.notes || "-" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!isSearchMode" class="text-center py-2 border-top bg-light">
          <small class="text-muted">Menampilkan maks. 50 riwayat mutasi terbaru.</small>
        </div>
      </div>
    </div>

    <!-- Modal Detail Bulk Barcode (Teleported to body) -->
    <Teleport to="body">
      <div class="modal fade" id="bulkDetailModal" tabindex="-1" aria-hidden="true" ref="bulkDetailModalRef">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg rounded-3">
            <div class="modal-header py-3 bg-primary text-white border-0">
              <h6 class="modal-title fw-bold">
                <i class="bi bi-list-check me-2"></i>
                Detail Perpindahan Gabungan ({{ selectedLog?.barcodes?.length || 0 }} Barang)
              </h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
              <div v-if="selectedLog" class="mb-3">
                <div class="row g-2 mb-3 bg-light p-2 rounded-2 small text-muted">
                  <div class="col-6"><strong>Waktu:</strong> {{ formatDate(selectedLog.timestamp) }}</div>
                  <div class="col-6"><strong>Petugas:</strong> {{ selectedLog.pemindah }}</div>
                  <div class="col-6"><strong>Tujuan:</strong> {{ getSubDocLabel(selectedLog.destination) }}</div>
                  <div class="col-12" v-if="selectedLog.notes"><strong>Catatan:</strong> {{ selectedLog.notes }}</div>
                </div>

                <div class="table-responsive border rounded-3 overflow-hidden" style="max-height: 250px;">
                  <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.85rem;">
                    <thead class="table-light">
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
                <div v-if="selectedLog.barcodes.length > detailPageSize" class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                  <button
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3"
                    :disabled="detailPage === 1"
                    @click="detailPage--"
                  >
                    <i class="bi bi-chevron-left me-1"></i>
                    Sebelumnya
                  </button>
                  <span class="small fw-semibold text-muted">Halaman {{ detailPage }} dari {{ totalDetailPages }}</span>
                  <button
                    class="btn btn-sm btn-outline-secondary rounded-pill px-3"
                    :disabled="detailPage >= totalDetailPages"
                    @click="detailPage++"
                  >
                    Berikutnya
                    <i class="bi bi-chevron-right ms-1"></i>
                  </button>
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

const auth = useAuthStore();
const { error: showError } = useAlert();

const logs = ref([]);
const loading = ref(false);
const searchQuery = ref("");
const searchedBarcode = ref("");
const isSearchMode = ref(false);

const selectedLog = ref(null);
const detailPage = ref(1);
const detailPageSize = 10;
const bulkDetailModalRef = ref(null);
let bulkModalInstance = null;

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
  return ["barang-display", "mutasi", "laku"].includes(loc);
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
  
  if (unsubLogs) unsubLogs();
  
  try {
    const q = query(
      collection(db, "floors", auth.activeFloor, "barcodeMutationLogs"),
      orderBy("timestamp", "desc"),
      limit(50)
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

onUnmounted(() => {
  if (unsubLogs) unsubLogs();
});

async function handleSearch() {
  const queryVal = searchQuery.value.trim().toUpperCase();
  if (!queryVal) {
    await loadLogs();
    return;
  }

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
  } catch (e) {
    showError("Gagal melacak barcode", e.message);
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = "";
  loadLogs();
}

onMounted(() => {
  loadLogs();
});
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
</style>