<template>
  <div class="discrepancy-dashboard">
    <!-- Summary Cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-3 bg-glass-warning overflow-hidden">
          <div class="card-body p-4 d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted small fw-semibold uppercase-label">Selisih Aktif</span>
              <h2 class="mb-0 fw-bold mt-1 text-warning-emphasis">{{ unresolvedCount }}</h2>
            </div>
            <div class="stat-icon bg-light-warning rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-exclamation-triangle fs-3 text-warning"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-3 bg-glass-info overflow-hidden">
          <div class="card-body p-4 d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted small fw-semibold uppercase-label">Selisih Hari Ini</span>
              <h2 class="mb-0 fw-bold mt-1 text-info-emphasis">{{ todayCount }}</h2>
            </div>
            <div class="stat-icon bg-light-info rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-clock-history fs-3 text-info"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-3 bg-glass-success overflow-hidden">
          <div class="card-body p-4 d-flex align-items-center justify-content-between">
            <div>
              <span class="text-muted small fw-semibold uppercase-label">Terselesaikan</span>
              <h2 class="mb-0 fw-bold mt-1 text-success-emphasis">{{ resolvedCount }}</h2>
            </div>
            <div class="stat-icon bg-light-success rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-check2-circle fs-3 text-success"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
      <!-- Card Header -->
      <div class="card-header bg-white border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div class="d-flex align-items-center">
          <div class="icon-box bg-light-danger rounded-3 me-2 p-2 text-danger">
            <i class="bi bi-shield-exclamation fs-5"></i>
          </div>
          <div>
            <h6 class="mb-0 fw-bold text-dark">Laporan Selisih Stok</h6>
            <small class="text-muted">Aplikasi Desktop vs Web</small>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <!-- Search input -->
          <div class="input-group input-group-sm" style="max-width: 250px;">
            <span class="input-group-text bg-light border-0"><i class="bi bi-search text-muted"></i></span>
            <input 
              v-model="searchQuery" 
              type="text" 
              class="form-control bg-light border-0 search-input" 
              placeholder="Barcode / No Faktur..."
            />
          </div>

          <button 
            class="btn btn-sm btn-outline-primary rounded-2 px-3 hover-lift" 
            @click="loadData" 
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise me-1" :class="{ 'spinner-spin': loading }"></i>
            Refresh
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bg-white px-3 border-bottom">
        <ul class="nav nav-tabs border-0">
          <li class="nav-item">
            <button 
              class="nav-link px-3 py-2 border-0 fw-semibold" 
              :class="{ active: currentTab === 'unresolved' }"
              @click="currentTab = 'unresolved'"
            >
              Belum Selesai ({{ unresolvedList.length }})
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link px-3 py-2 border-0 fw-semibold" 
              :class="{ active: currentTab === 'resolved' }"
              @click="currentTab = 'resolved'"
            >
              Selesai
            </button>
          </li>
          <li class="nav-item">
            <button 
              class="nav-link px-3 py-2 border-0 fw-semibold" 
              :class="{ active: currentTab === 'salesEvaluation' }"
              @click="currentTab = 'salesEvaluation'"
            >
              Evaluasi
            </button>
          </li>
        </ul>
      </div>

      <!-- Table Body -->
      <div class="card-body p-0">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted small">Memuat data selisih...</p>
        </div>

        <template v-else>
          <!-- Sales Evaluation Tab -->
          <div v-if="currentTab === 'salesEvaluation'">
            <div v-if="salesEvaluation.length === 0" class="text-center py-5 px-3">
              <div class="empty-state-icon bg-light-success text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                <i class="bi bi-check-lg fs-3"></i>
              </div>
              <h6 class="fw-semibold text-dark mb-1">Tidak Ada Data Sales!</h6>
              <p class="text-muted small mb-0">Belum ada riwayat selisih yang tercatat.</p>
            </div>
            
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3" style="width: 30%">Nama Sales</th>
                    <th class="text-center" style="width: 20%">Selisih Aktif (Unresolved)</th>
                    <th class="text-center" style="width: 20%">Terselesaikan (Resolved)</th>
                    <th class="text-center" style="width: 20%">Total Selisih</th>
                    <th class="text-center pe-3" style="width: 10%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sales in salesEvaluation" :key="sales.name" class="data-row">
                    <td class="ps-3 fw-semibold text-dark">
                      {{ sales.name }}
                    </td>
                    <td class="text-center">
                      <span class="badge bg-danger rounded-pill px-3 py-1" style="min-width: 40px;">
                        {{ sales.unresolvedCount }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-success rounded-pill px-3 py-1" style="min-width: 40px;">
                        {{ sales.resolvedCount }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-secondary rounded-pill px-3 py-1" style="min-width: 40px;">
                        {{ sales.totalCount }}
                      </span>
                    </td>
                    <td class="text-end pe-3">
                      <button 
                        class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 hover-lift d-inline-flex align-items-center gap-1"
                        @click="showSalesDetails(sales)"
                      >
                        <i class="bi bi-clock-history"></i>
                        <span>Riwayat</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Unresolved & Resolved Tabs -->
          <div v-else>
            <div v-if="filteredList.length === 0" class="text-center py-5 px-3">
              <div class="empty-state-icon bg-light-success text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                <i class="bi bi-check-lg fs-3"></i>
              </div>
              <h6 class="fw-semibold text-dark mb-1">Tidak Ada Selisih!</h6>
              <p class="text-muted small mb-0">Semua penjualan kasir tercatat cocok dengan display web.</p>
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3" style="width: 12%">Detected At</th>
                    <th style="width: 10%">Barcode</th>
                    <th style="width: 10%">Jenis</th>
                    <th style="width: 12%">No. Faktur</th>
                    <th style="width: 10%">Tanggal Jual</th>
                    <th style="width: 10%">Lokasi di Web</th>
                    <th style="width: 10%">Sales</th>
                    <th v-if="currentTab === 'resolved'" style="width: 20%">Keterangan</th>
                    <th v-if="currentTab === 'unresolved' && isSupervisor" class="text-center pe-3" style="width: 10%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredList" :key="item.id" class="data-row">
                    <!-- Detected At -->
                    <td class="ps-3 text-muted small">
                      {{ formatDate(item.detectedAt) }}
                    </td>
                    <!-- Barcode -->
                    <td>
                      <span class="barcode-badge">{{ item.barcode }}</span>
                    </td>
                    <!-- Jenis -->
                    <td>
                      <span class="badge bg-info-subtle text-info border px-2 py-1 small text-uppercase">
                        {{ item.category || '-' }}
                      </span>
                    </td>
                    <!-- Invoice No -->
                    <td>
                      <span class="text-dark small fw-semibold">{{ item.invoice_no }}</span>
                    </td>
                    <!-- Tanggal Penjualan -->
                    <td class="small text-muted">
                      {{ formatDate(item.tanggalPenjualan) }}
                    </td>
                    <!-- Web Location -->
                    <td>
                      <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 small">
                        {{ getSubDocLabel(item.webLocation) }}
                      </span>
                    </td>
                    <!-- Sales Name -->
                    <td>
                      <span class="text-dark small">{{ item.namaSales }}</span>
                    </td>
                    <!-- Catatan Resolusi (Resolved Tab only) -->
                    <td v-if="currentTab === 'resolved'">
                      <div class="small">
                        <span class="fw-bold text-dark">{{ item.resolvedBy }}</span>: 
                        <span class="text-muted italic">{{ item.resolutionNote || '-' }}</span>
                        <span class="d-block text-muted-xs font-monospace mt-1">Selesai: {{ formatDate(item.resolvedAt) }}</span>
                      </div>
                    </td>
                    <!-- Actions (Unresolved Tab & Supervisor only) -->
                    <td v-if="currentTab === 'unresolved' && isSupervisor" class="text-center pe-3">
                      <button 
                        class="btn btn-sm btn-success rounded-pill px-3 py-1 text-white shadow-sm hover-lift d-flex align-items-center gap-1"
                        @click="handleResolve(item)"
                        :disabled="actioning"
                      >
                        <i class="bi bi-check-circle"></i>
                        Selesaikan
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal Detail Riwayat Sales -->
    <div class="modal fade" id="salesDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-3">
          <div class="modal-header bg-light border-0 py-3">
            <h5 class="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              <i class="bi bi-person-badge text-primary"></i>
              <span>Riwayat Selisih Stok: {{ selectedSales?.name }}</span>
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0" style="max-height: 70vh; overflow-y: auto;">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="ps-3" style="width: 12%">Detected At</th>
                    <th style="width: 10%">Barcode</th>
                    <th style="width: 10%">Jenis</th>
                    <th style="width: 15%">No. Faktur</th>
                    <th style="width: 12%">Tanggal Jual</th>
                    <th style="width: 10%">Lokasi Web</th>
                    <th style="width: 10%">Status</th>
                    <th style="width: 25%">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedSales?.items" :key="item.id">
                    <td class="ps-3 text-muted small">
                      {{ formatDate(item.detectedAt) }}
                    </td>
                    <td>
                      <span class="barcode-badge">{{ item.barcode }}</span>
                    </td>
                    <td>
                      <span class="badge bg-danger-subtle text-danger border px-2 py-1 small text-uppercase">
                        {{ item.category || '-' }}
                      </span>
                    </td>
                    <td>
                      <span class="text-dark small fw-semibold">{{ item.invoice_no }}</span>
                    </td>
                    <td class="small text-muted">
                      {{ formatDate(item.tanggalPenjualan) }}
                    </td>
                    <td>
                      <span class="badge bg-secondary-subtle text-secondary border px-2 py-1 small">
                        {{ getSubDocLabel(item.webLocation) }}
                      </span>
                    </td>
                    <td>
                      <span v-if="item.resolved" class="badge bg-success-subtle text-success border px-2 py-1 small">
                        Selesai
                      </span>
                      <span v-else class="badge bg-danger-subtle text-danger border px-2 py-1 small">
                        Belum Selesai
                      </span>
                    </td>
                    <td>
                      <div v-if="item.resolved" class="small">
                        <span class="fw-bold text-dark">{{ item.resolvedBy }}</span>: 
                        <span class="text-muted italic">{{ item.resolutionNote || '-' }}</span>
                        <span class="d-block text-muted-xs font-monospace mt-1">Selesai: {{ formatDate(item.resolvedAt) }}</span>
                      </div>
                      <span v-else class="text-muted small">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer bg-light border-0 py-2">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-3" data-bs-dismiss="modal">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { fetchBarcodeDiscrepancies, resolveBarcodeDiscrepancy, fetchBarcodeCategory } from "@/services/inventory-service";
import Swal from "sweetalert2";
import { Modal } from "bootstrap";

const auth = useAuthStore();
const { toast, error: showError } = useAlert();

const currentTab = ref("unresolved");
const loading = ref(false);
const actioning = ref(false);
const searchQuery = ref("");

const unresolvedList = ref([]);
const resolvedList = ref([]);

const isSupervisor = computed(() => {
  return ["supervisor", "admin"].includes(auth.userRole?.toLowerCase());
});

// Load statistics count
const unresolvedCount = computed(() => unresolvedList.value.length);
const resolvedCount = computed(() => resolvedList.value.length);

const todayCount = computed(() => {
  const todayStr = new Date().toDateString();
  const allList = [...unresolvedList.value, ...resolvedList.value];
  return allList.filter(item => {
    let d;
    if (item.detectedAt?.toDate) d = item.detectedAt.toDate();
    else d = new Date(item.detectedAt);
    return d.toDateString() === todayStr;
  }).length;
});

const currentList = computed(() => {
  return currentTab.value === "unresolved" ? unresolvedList.value : resolvedList.value;
});

const selectedSales = ref(null);

const salesEvaluation = computed(() => {
  const map = {};
  const allDiscrepancies = [...unresolvedList.value, ...resolvedList.value];
  
  allDiscrepancies.forEach(item => {
    const salesName = item.namaSales || "Tanpa Nama";
    if (!map[salesName]) {
      map[salesName] = {
        name: salesName,
        unresolvedCount: 0,
        resolvedCount: 0,
        totalCount: 0,
        items: []
      };
    }
    map[salesName].totalCount++;
    if (item.resolved) {
      map[salesName].resolvedCount++;
    } else {
      map[salesName].unresolvedCount++;
    }
    map[salesName].items.push(item);
  });
  
  return Object.values(map).sort((a, b) => b.unresolvedCount - a.unresolvedCount || b.totalCount - a.totalCount);
});

function showSalesDetails(sales) {
  selectedSales.value = sales;
  const el = document.getElementById("salesDetailModal");
  if (el) {
    const modal = Modal.getOrCreateInstance(el);
    modal.show();
  }
}

const filteredList = computed(() => {
  if (!searchQuery.value) return currentList.value;
  const q = searchQuery.value.trim().toLowerCase();
  return currentList.value.filter(item => 
    (item.barcode && item.barcode.toLowerCase().includes(q)) ||
    (item.invoice_no && item.invoice_no.toLowerCase().includes(q)) ||
    (item.namaSales && item.namaSales.toLowerCase().includes(q))
  );
});

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
    'laku': 'Terjual'
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

async function loadData() {
  if (!auth.activeFloor) return;
  loading.value = true;
  try {
    const floorId = auth.activeFloor;
    const unresolvedPromise = fetchBarcodeDiscrepancies({ floorId, resolved: false });
    const resolvedPromise = fetchBarcodeDiscrepancies({ floorId, resolved: true });
    
    const [unresolved, resolved] = await Promise.all([unresolvedPromise, resolvedPromise]);
    
    // Fetch categories in parallel
    const allItems = [...unresolved, ...resolved];
    const uniqueBarcodes = [...new Set(allItems.map(i => i.barcode).filter(Boolean))];
    
    const categoryMap = {};
    await Promise.all(uniqueBarcodes.map(async (barcode) => {
      categoryMap[barcode] = await fetchBarcodeCategory(floorId, barcode);
    }));
    
    unresolved.forEach(item => {
      item.category = categoryMap[item.barcode] || "-";
    });
    resolved.forEach(item => {
      item.category = categoryMap[item.barcode] || "-";
    });
    
    unresolvedList.value = unresolved;
    resolvedList.value = resolved;
  } catch (e) {
    showError("Gagal memuat data selisih", e.message);
  } finally {
    loading.value = false;
  }
}

async function handleResolve(item) {
  const { value: note } = await Swal.fire({
    title: "Pindahkan Barcode?",
    html: `
      <div class="text-start">
        <p class="small text-muted">Aksi ini akan mengubah status barcode <b>${item.barcode}</b> menjadi 'Terjual' (laku) dan mengurangi stok dari lokasi <b>${getSubDocLabel(item.webLocation)}</b> di web.</p>
      </div>
    `,
    input: "text",
    inputPlaceholder: "Tulis keterangan (misal: Display terjual, lupa mutasi)...",
    showCancelButton: true,
    confirmButtonText: "Selesaikan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#198754",
    inputValidator: (value) => {
      if (!value) {
        return "Catatan resolusi wajib diisi!";
      }
    }
  });

  if (!note) return;

  actioning.value = true;
  try {
    const floorId = auth.activeFloor;
    const username = auth.currentUser?.username || auth.currentUser?.email || "Supervisor";

    await resolveBarcodeDiscrepancy({
      floorId,
      discrepancyId: item.id,
      resolvedBy: username,
      note
    });

    toast("Berhasil menyelesaikan laporan selisih.");
    await loadData();
  } catch (e) {
    showError("Gagal memproses resolusi", e.message);
  } finally {
    actioning.value = false;
  }
}

watch(() => auth.activeFloor, () => {
  loadData();
});

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.uppercase-label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.7rem;
}
.stat-icon {
  width: 50px;
  height: 50px;
}
.bg-glass-warning {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
  border: 1px solid rgba(255, 193, 7, 0.15) !important;
}
.bg-glass-info {
  background: linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%);
  border: 1px solid rgba(13, 110, 253, 0.15) !important;
}
.bg-glass-success {
  background: linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(25, 135, 84, 0.05) 100%);
  border: 1px solid rgba(25, 135, 84, 0.15) !important;
}
.bg-light-warning {
  background-color: rgba(255, 193, 7, 0.15);
}
.bg-light-info {
  background-color: rgba(13, 110, 253, 0.15);
}
.bg-light-success {
  background-color: rgba(25, 135, 84, 0.15);
}
.bg-light-danger {
  background-color: rgba(220, 53, 69, 0.1);
}
.icon-box {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.barcode-badge {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #212529;
  font-family: monospace;
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
}
.search-input {
  transition: all 0.2s ease;
}
.search-input:focus {
  background-color: #fff !important;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
}
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.data-row {
  transition: background-color 0.15s ease;
}
.data-row:hover {
  background-color: rgba(248, 249, 250, 0.8) !important;
}
.spinner-spin {
  animation: spin 1s linear infinite;
}
.italic {
  font-style: italic;
}
.text-muted-xs {
  font-size: 0.7rem;
  color: #6c757d;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
