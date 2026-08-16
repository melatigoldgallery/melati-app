<template>
  <div class="discrepancy-dashboard">

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
            class="btn-refresh-custom" 
            @click="loadData" 
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise" :class="{ 'spinner-spin': loading }"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bg-white px-3 pb-3 border-bottom">
        <ul class="custom-tabs-nav">
          <li class="custom-tab-item">
            <button 
              class="custom-tab-btn unresolved" 
              :class="{ active: currentTab === 'unresolved' }"
              @click="currentTab = 'unresolved'"
            >
              <i class="bi bi-exclamation-circle-fill"></i>
              <span>Belum Selesai</span>
              <span class="badge-count">{{ unresolvedList.length }}</span>
            </button>
          </li>
          <li class="custom-tab-item">
            <button 
              class="custom-tab-btn resolved" 
              :class="{ active: currentTab === 'resolved' }"
              @click="currentTab = 'resolved'"
            >
              <i class="bi bi-check-circle-fill"></i>
              <span>Selesai</span>
            </button>
          </li>
          <li class="custom-tab-item">
            <button 
              class="custom-tab-btn salesEvaluation" 
              :class="{ active: currentTab === 'salesEvaluation' }"
              @click="currentTab = 'salesEvaluation'"
            >
              <i class="bi bi-person-badge-fill"></i>
              <span>Evaluasi</span>
            </button>
          </li>
          <li class="custom-tab-item">
            <button 
              class="custom-tab-btn syncStats" 
              :class="{ active: currentTab === 'syncStats' }"
              @click="currentTab = 'syncStats'"
            >
              <i class="bi bi-arrow-repeat"></i>
              <span>Riwayat Sinkronisasi</span>
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

          <!-- Sync Stats Tab -->
          <div v-else-if="currentTab === 'syncStats'" class="p-3">
            <!-- Filter & Action Controls -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 bg-light p-3 rounded-3">
              <div class="d-flex align-items-center gap-2">
                <label class="form-label mb-0 fw-semibold text-muted small">Tanggal Transaksi:</label>
                <input 
                  type="date" 
                  v-model="selectedDate" 
                  class="form-control form-control-sm border shadow-sm px-3" 
                  style="width: 170px;" 
                />
                <button 
                  class="btn btn-sm btn-primary rounded-2 px-3 hover-lift shadow-sm" 
                  @click="loadSyncStats" 
                  :disabled="syncStatsLoading"
                >
                  <i class="bi bi-search me-1"></i>
                  Tampilkan
                </button>
              </div>
              <div class="text-muted small" v-if="syncStatsData">
                <i class="bi bi-clock-history me-1"></i>
                Update Terakhir: {{ formatDate(syncStatsData.lastSyncedAt) }}
              </div>
            </div>

            <!-- Loading Stats State -->
            <div v-if="syncStatsLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted small">Memuat riwayat sinkronisasi...</p>
            </div>

            <!-- Stats Content -->
            <template v-else>
              <div v-if="!syncStatsData" class="text-center py-5 text-muted">
                <div class="mb-3 text-secondary">
                  <i class="bi bi-calendar-event fs-1"></i>
                </div>
                <h6 class="fw-semibold mb-1">Silakan Pilih Tanggal</h6>
                <p class="small mb-0 text-muted">Pilih tanggal transaksi desktop app lalu klik tombol "Tampilkan" untuk melihat data.</p>
              </div>

              <div v-else>
                <!-- Mini Summary Cards -->
                <div class="row g-2 mb-4">
                  <div class="col-md-3">
                    <div class="card border border-light-subtle rounded-3 bg-white shadow-sm p-3">
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <span class="text-muted small fw-semibold uppercase-label">Pcs Penjualan</span>
                          <h4 class="mb-0 fw-bold mt-1 text-primary">{{ syncStatsData.salesCount || 0 }}</h4>
                        </div>
                        <div class="bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                          <i class="bi bi-cart"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="card border border-light-subtle rounded-3 bg-white shadow-sm p-3">
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <span class="text-muted small fw-semibold uppercase-label">Sukses Cocok</span>
                          <h4 class="mb-0 fw-bold mt-1 text-success">{{ syncStatsData.salesMatched || 0 }}</h4>
                        </div>
                        <div class="bg-success-subtle text-success rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                          <i class="bi bi-check-circle"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="card border border-light-subtle rounded-3 bg-white shadow-sm p-3">
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <span class="text-muted small fw-semibold uppercase-label">Selisih Lokasi</span>
                          <h4 class="mb-0 fw-bold mt-1 text-warning">{{ syncStatsData.salesDiscrepancy || 0 }}</h4>
                        </div>
                        <div class="bg-warning-subtle text-warning rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                          <i class="bi bi-exclamation-triangle"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="card border border-light-subtle rounded-3 bg-white shadow-sm p-3">
                      <div class="d-flex align-items-center justify-content-between">
                        <div>
                          <span class="text-muted small fw-semibold uppercase-label">Pcs Void</span>
                          <h4 class="mb-0 fw-bold mt-1 text-danger">{{ syncStatsData.voidCount || 0 }}</h4>
                        </div>
                        <div class="bg-danger-subtle text-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                          <i class="bi bi-x-circle"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Detailed Table -->
                <div v-if="filteredSyncItems.length === 0" class="text-center py-5">
                  <i class="bi bi-search fs-3 text-muted mb-2 d-block"></i>
                  <h6 class="fw-semibold text-dark">Data tidak ditemukan</h6>
                  <p class="text-muted small mb-0">Coba gunakan kata kunci pencarian yang lain.</p>
                </div>

                <div v-else>
                  <div class="table-responsive border rounded-3 overflow-hidden">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th class="ps-3" style="width: 5%">No</th>
                          <th style="width: 20%">Tanggal & Jam</th>
                          <th style="width: 15%">Barcode</th>
                          <th style="width: 20%">Sales / Void Oleh</th>
                          <th style="width: 20%">Faktur Invoice</th>
                          <th class="pe-3" style="width: 20%">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in paginatedSyncItems" :key="item.id || idx" class="data-row">
                          <td class="ps-3 fw-semibold text-muted small">
                            {{ (statsPage - 1) * statsPerPage + idx + 1 }}
                          </td>
                          <td class="small text-muted">
                            {{ formatDate(item.timestamp) }}
                          </td>
                          <td>
                            <span class="barcode-badge">{{ item.barcode }}</span>
                          </td>
                          <td>
                            <span class="text-dark small fw-semibold">
                              {{ item.status === 'voided' ? item.dihapus_oleh : item.salesName }}
                            </span>
                          </td>
                          <td>
                            <span class="text-dark small font-monospace">{{ item.invoice_no }}</span>
                          </td>
                          <td class="pe-3">
                            <span v-if="item.status === 'matched'" class="badge bg-success-subtle text-success border px-2 py-1 small">
                              Cocok
                            </span>
                            <span v-else-if="item.status === 'discrepancy'" class="badge bg-warning-subtle text-warning border px-2 py-1 small" :title="`Lokasi di Web: ${getSubDocLabel(item.webLocation)}`">
                              Selisih ({{ getSubDocLabel(item.webLocation) }})
                            </span>
                            <span v-else-if="item.status === 'voided'" class="badge bg-danger-subtle text-danger border px-2 py-1 small">
                              Voided
                            </span>
                            <span v-else class="badge bg-secondary-subtle text-secondary border px-2 py-1 small" :title="`Alasan: ${item.reason}`">
                              Dilewati
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Pagination Controls -->
                  <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 px-1">
                    <div class="d-flex align-items-center gap-3 flex-wrap">
                      <span class="text-muted small">
                        Menampilkan {{ filteredSyncItems.length > 0 ? (statsPage - 1) * statsPerPage + 1 : 0 }} - {{ Math.min(statsPage * statsPerPage, filteredSyncItems.length) }} dari {{ filteredSyncItems.length }} data
                      </span>
                      <div class="d-flex align-items-center gap-2">
                        <span class="text-muted small text-nowrap">Baris per halaman:</span>
                        <select 
                          v-model="statsPerPage" 
                          class="form-select form-select-sm border shadow-sm" 
                          style="width: 75px; height: 31px; padding-top: 2px; padding-bottom: 2px;"
                        >
                          <option :value="10">10</option>
                          <option :value="25">25</option>
                          <option :value="50">50</option>
                          <option :value="100">100</option>
                        </select>
                      </div>
                    </div>
                    <nav aria-label="Page navigation" v-if="totalStatsPages > 1">
                      <ul class="pagination pagination-sm mb-0">
                        <li class="page-item" :class="{ disabled: statsPage === 1 }">
                          <button class="page-link" @click="statsPage--" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                          </button>
                        </li>
                        <li 
                          v-for="page in totalStatsPages" 
                          :key="page" 
                          class="page-item" 
                          :class="{ active: statsPage === page }"
                        >
                          <button class="page-link" @click="statsPage = page">{{ page }}</button>
                        </li>
                        <li class="page-item" :class="{ disabled: statsPage === totalStatsPages }">
                          <button class="page-link" @click="statsPage++" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Unresolved & Resolved Tabs -->
          <div v-else>
            <div v-if="filteredList.length === 0" class="text-center py-5 px-3">
              <div class="empty-state-icon bg-light-success text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                <i class="bi bi-check-lg fs-3"></i>
              </div>
              <h6 class="fw-semibold text-dark mb-1">Tidak Ada Selisih!</h6>
              <p class="text-muted small mb-0">Semua penjualan desktop app tercatat cocok dengan data web app.</p>
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
                      <span class="badge bg-light-subtle text-danger border px-2 py-1 small text-uppercase">
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
import { fetchBarcodeDiscrepancies, resolveBarcodeDiscrepancy, fetchBarcodeCategory, fetchDailySyncStatsByDate, fetchStaffOptions } from "@/services/inventory-service";
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

async function loadData({ silent = false } = {}) {
  if (!auth.activeFloor) return;
  if (!silent) loading.value = true;
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
    if (!silent) loading.value = false;
  }
}

async function handleResolve(item) {
  let staffList = [];
  try {
    staffList = await fetchStaffOptions({ floorId: auth.activeFloor });
  } catch (err) {
    console.error("Gagal memuat staff:", err);
  }

  const staffOptionsHtml = staffList
    .map(name => `<option value="${name}">${name}</option>`)
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "Selesaikan Selisih Stok",
    html: `
      <div class="text-start">
        <p class="small text-muted mb-3">Selesaikan selisih barcode <b>${item.barcode}</b>.</p>
        
        <div class="mb-3">
          <label class="form-label small fw-bold text-secondary">Nama Sales</label>
          <select id="swal-sales-select" class="form-select form-select-sm border-2 rounded-2">
            <option value="">-- Pilih Nama Sales --</option>
            ${staffOptionsHtml}
          </select>
        </div>
        
        <div class="mb-2">
          <label class="form-label small fw-bold text-secondary">Keterangan / Alasan</label>
          <textarea id="swal-note-input" class="form-control form-control-sm border-2 rounded-2" rows="2" placeholder="Tulis keterangan (misal: Display terjual, lupa mutasi)..."></textarea>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Selesaikan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#198754",
    preConfirm: () => {
      const salesSelect = document.getElementById("swal-sales-select");
      const noteInput = document.getElementById("swal-note-input");
      
      const sales = salesSelect ? salesSelect.value.trim() : "";
      const note = noteInput ? noteInput.value.trim() : "";
      
      if (!sales) {
        Swal.showValidationMessage("Nama Sales wajib dipilih!");
        return false;
      }
      if (!note) {
        Swal.showValidationMessage("Keterangan wajib diisi!");
        return false;
      }
      return { sales, note };
    }
  });

  if (!formValues) return;
  const { sales, note } = formValues;

  actioning.value = true;
  try {
    const floorId = auth.activeFloor;

    await resolveBarcodeDiscrepancy({
      floorId,
      discrepancyId: item.id,
      resolvedBy: sales,
      note
    });

    // Optimistic local update to instantly refresh UI
    unresolvedList.value = unresolvedList.value.filter(u => u.id !== item.id);
    const resolvedItem = {
      ...item,
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: sales,
      resolutionNote: note
    };
    resolvedList.value = [resolvedItem, ...resolvedList.value];

    toast("Berhasil menyelesaikan laporan selisih.");
    
    // Background sync without loader
    setTimeout(async () => {
      await loadData({ silent: true });
    }, 800);
  } catch (e) {
    showError("Gagal memproses resolusi", e.message);
  } finally {
    actioning.value = false;
  }
}

const selectedDate = ref(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" }));
const syncStatsLoading = ref(false);
const syncStatsData = ref(null);
const statsPage = ref(1);
const statsPerPage = ref(10);

const filteredSyncItems = computed(() => {
  if (!syncStatsData.value || !Array.isArray(syncStatsData.value.items)) return [];
  const q = searchQuery.value.trim().toLowerCase();
  const items = syncStatsData.value.items;
  if (!q) return items;
  return items.filter(item => 
    (item.barcode && item.barcode.toLowerCase().includes(q)) ||
    (item.invoice_no && item.invoice_no.toLowerCase().includes(q)) ||
    (item.salesName && item.salesName.toLowerCase().includes(q)) ||
    (item.dihapus_oleh && item.dihapus_oleh.toLowerCase().includes(q))
  );
});

const paginatedSyncItems = computed(() => {
  const start = (statsPage.value - 1) * statsPerPage.value;
  return filteredSyncItems.value.slice(start, start + statsPerPage.value);
});

const totalStatsPages = computed(() => {
  return Math.ceil(filteredSyncItems.value.length / statsPerPage.value) || 1;
});

// Reset page back to 1 if per page size changes
watch(statsPerPage, () => {
  statsPage.value = 1;
});

async function loadSyncStats() {
  if (!auth.activeFloor || !selectedDate.value) return;
  syncStatsLoading.value = true;
  syncStatsData.value = null;
  statsPage.value = 1;
  try {
    const floorId = auth.activeFloor;
    const res = await fetchDailySyncStatsByDate(floorId, selectedDate.value);
    syncStatsData.value = res;
    if (!res) {
      toast("Tidak ada data sinkronisasi untuk tanggal ini.");
    }
  } catch (e) {
    showError("Gagal memuat data sinkronisasi", e.message);
  } finally {
    syncStatsLoading.value = false;
  }
}

watch(searchQuery, () => {
  if (currentTab.value === 'syncStats') {
    statsPage.value = 1;
  }
});

watch(() => auth.activeFloor, () => {
  loadData();
  if (currentTab.value === 'syncStats') {
    loadSyncStats();
  } else {
    syncStatsData.value = null;
  }
});

watch(currentTab, (newTab) => {
  if (newTab === 'syncStats') {
    loadSyncStats();
  }
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

/* Segmented Control Tabs */
.custom-tabs-nav {
  display: flex;
  gap: 6px;
  padding: 6px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 14px;
  width: fit-content;
  margin-bottom: 0;
  padding-left: 6px;
  padding-right: 6px;
}
.custom-tab-item {
  list-style: none;
}
.custom-tab-btn {
  background: transparent;
  border: none;
  color: #6c757d;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
}
.custom-tab-btn i {
  font-size: 0.95rem;
  opacity: 0.85;
}
.custom-tab-btn:hover {
  color: #212529;
  background-color: rgba(0, 0, 0, 0.04);
}
.custom-tab-btn.active {
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
.custom-tab-btn.active.unresolved {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}
.custom-tab-btn.active.resolved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}
.custom-tab-btn.active.salesEvaluation {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}
.custom-tab-btn.active.syncStats {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
.custom-tab-btn .badge-count {
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-weight: 700;
}
.custom-tab-btn:not(.active) .badge-count {
  background-color: #f1f3f5;
  border: 1px solid #dee2e6;
  color: #495057;
}

/* Custom Refresh Button */
.btn-refresh-custom {
  background: #ffffff;
  border: 1px solid #dee2e6;
  color: #495057;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}
.btn-refresh-custom:hover:not(:disabled) {
  color: #0d6efd;
  background-color: #f8f9fa;
  border-color: #c5dcfa;
  box-shadow: 0 4px 10px rgba(13, 110, 253, 0.08);
  transform: translateY(-1px);
}
.btn-refresh-custom:active:not(:disabled) {
  transform: translateY(0);
}
.btn-refresh-custom:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-refresh-custom .bi-arrow-clockwise {
  font-size: 1rem;
  transition: transform 0.3s ease;
}
.btn-refresh-custom:hover:not(:disabled) .bi-arrow-clockwise {
  transform: rotate(45deg);
}
</style>
