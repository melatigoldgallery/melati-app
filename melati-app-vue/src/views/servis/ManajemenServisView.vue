<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-box-seam me-2 text-dark"></i>
        Manajemen Servis
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/servis/input">Servis</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Manajemen Servis</li>
        </ol>
      </nav>
    </div>

    <!-- Loading State -->
    <div v-if="isInitializing" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Memuat data...</p>
      </div>
    </div>

    <template v-else>
      <!-- SECTION 1: Dashboard Cards - Ringkasan Sistem -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-th me-2"></i>
            Ringkasan Sistem
          </h2>
        </div>
        <div class="card-body p-4">
          <div class="row g-3">
            <!-- Servis Cards -->
            <div class="col-md-4">
              <div class="card border-0 bg-light-warning">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Servis</p>
                      <p class="text-muted small">Belum Selesai</p>
                    </div>
                    <i class="fas fa-hourglass-start fa-2x text-warning opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.servisBelumSelesai }}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Servis</p>
                      <p class="text-muted small">Sudah Selesai & Belum Diambil</p>
                    </div>
                    <i class="fas fa-box fa-2x text-info opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.servisSudahSelesai }}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Servis</p>
                      <p class="text-muted small">Sudah Diambil</p>
                    </div>
                    <i class="fas fa-check-circle fa-2x text-success opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.servisSudahDiambil }}</h3>
                </div>
              </div>
            </div>

            <!-- Custom Cards -->
            <div class="col-md-4">
              <div class="card border-0 bg-light-warning">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Custom</p>
                      <p class="text-muted small">Belum Selesai</p>
                    </div>
                    <i class="fas fa-hourglass-start fa-2x text-warning opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.customBelumSelesai }}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Custom</p>
                      <p class="text-muted small">Sudah Selesai & Belum Diambil</p>
                    </div>
                    <i class="fas fa-box fa-2x text-info opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.customSudahSelesai }}</h3>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 bg-light-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Custom</p>
                      <p class="text-muted small">Sudah Diambil</p>
                    </div>
                    <i class="fas fa-check-circle fa-2x text-success opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.customSudahDiambil }}</h3>
                </div>
              </div>
            </div>
          </div>

          <!-- Refresh Button -->
          <div class="mt-3 text-center">
            <button class="btn btn-outline-primary btn-sm" @click="refreshDashboard">
              <i class="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- SECTION 2: Input Fisik Barang -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-pen me-2"></i>
            Input Fisik Barang
          </h2>
        </div>
        <div class="card-body p-4">
          <form @submit.prevent="handleSaveForm">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-semibold">Bulan</label>
                <select v-model="formData.bulan" class="form-select" required>
                  <option value="">-- Pilih Bulan --</option>
                  <option v-for="bulan in availableMonths" :key="bulan" :value="bulan">
                    {{ formatBulanDisplay(bulan) }}
                  </option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold">Tipe</label>
                <div class="d-flex gap-3">
                  <div class="form-check">
                    <input
                      id="tipeServis"
                      v-model="formData.tipe"
                      type="radio"
                      name="tipe"
                      class="form-check-input"
                      value="servis"
                      required
                    />
                    <label class="form-check-label" for="tipeServis">Servis</label>
                  </div>
                  <div class="form-check">
                    <input
                      id="tipeCustom"
                      v-model="formData.tipe"
                      type="radio"
                      name="tipe"
                      class="form-check-input"
                      value="custom"
                      required
                    />
                    <label class="form-check-label" for="tipeCustom">Custom</label>
                  </div>
                </div>
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold">Jumlah Pcs</label>
                <input
                  v-model.number="formData.jumlahPcs"
                  type="number"
                  class="form-control"
                  min="0"
                  required
                  placeholder="0"
                />
              </div>

              <div class="col-12">
                <label class="form-label fw-semibold">Catatan (Opsional)</label>
                <textarea
                  v-model="formData.catatan"
                  class="form-control"
                  rows="2"
                  placeholder="Misal: 2 pcs hilang, perlu verifikasi..."
                ></textarea>
              </div>

              <div class="col-12 d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" @click="resetForm">
                  <i class="bi bi-x-circle me-1"></i>
                  Batal
                </button>
                <button type="submit" class="btn btn-primary" :disabled="isSavingForm">
                  <span v-if="isSavingForm" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-circle me-1"></i>
                  Simpan
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- SECTION 3: Reconciliation Tabs -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-clipboard-list me-2"></i>
            Reconciliation
          </h2>
        </div>

        <!-- Tabs Navigation -->
        <ul class="nav nav-tabs border-0 px-4" role="tablist">
          <li class="nav-item" role="presentation">
            <button
              id="tab-servis"
              class="nav-link"
              :class="{ active: activeTab === 'servis' }"
              type="button"
              role="tab"
              aria-controls="servis-content"
              :aria-selected="activeTab === 'servis'"
              @click="activeTab = 'servis'"
            >
              <i class="fas fa-box me-1"></i>
              Servis (Belum Diambil)
              <span class="badge bg-primary ms-1">{{ managementData.servis?.length || 0 }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button
              id="tab-custom"
              class="nav-link"
              :class="{ active: activeTab === 'custom' }"
              type="button"
              role="tab"
              aria-controls="custom-content"
              :aria-selected="activeTab === 'custom'"
              @click="activeTab = 'custom'"
            >
              <i class="fas fa-star me-1"></i>
              Custom (Belum Diambil)
              <span class="badge bg-primary ms-1">{{ managementData.custom?.length || 0 }}</span>
            </button>
          </li>
        </ul>

        <div class="card-body p-0">
          <!-- Servis Tab Content -->
          <div v-show="activeTab === 'servis'" class="tab-pane fade show active">
            <div v-if="managementData.servis?.length === 0" class="p-4 text-center text-muted">
              <p>Belum ada data servis.</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 5%">No</th>
                    <th style="width: 15%">Bulan</th>
                    <th style="width: 15%">Data Sistem</th>
                    <th style="width: 15%">Fisik Barang</th>
                    <th style="width: 20%">Status</th>
                    <th style="width: 30%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in paginatedServis" :key="`servis-${item.bulan}`">
                    <td class="small text-muted">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ formatBulanDisplay(item.bulan) }}</td>
                    <td class="text-center">
                      <span class="badge bg-light text-dark">{{ item.sistemDataQty }}</span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-light text-dark">{{ item.fisikBarangQty }}</span>
                      <br />
                      <small class="text-muted" v-if="item.lastUpdatedAt">
                        {{ formatLastUpdate(item.lastUpdatedAt) }}
                      </small>
                    </td>
                    <td>
                      <span class="badge" :class="getStatusBadgeClass(item.status)">
                        {{ getStatusLabel(item.status) }}
                        {{ item.status !== "klop" ? `(${item.variance > 0 ? "+" : ""}${item.variance})` : "" }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-sm btn-outline-primary me-1"
                        @click="openUpdateModal('servis', item.bulan)"
                      >
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                      <button class="btn btn-sm btn-outline-info" @click="openHistoryModal('servis', item.bulan)">
                        <i class="bi bi-clock-history me-1"></i>
                        Riwayat
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Custom Tab Content -->
          <div v-show="activeTab === 'custom'" class="tab-pane fade show">
            <div v-if="managementData.custom?.length === 0" class="p-4 text-center text-muted">
              <p>Belum ada data custom.</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 5%">No</th>
                    <th style="width: 15%">Bulan</th>
                    <th style="width: 15%">Data Sistem</th>
                    <th style="width: 15%">Fisik Barang</th>
                    <th style="width: 20%">Status</th>
                    <th style="width: 30%">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in paginatedCustom" :key="`custom-${item.bulan}`">
                    <td class="small text-muted">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ formatBulanDisplay(item.bulan) }}</td>
                    <td class="text-center">
                      <span class="badge bg-light text-dark">{{ item.sistemDataQty }}</span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-light text-dark">{{ item.fisikBarangQty }}</span>
                      <br />
                      <small class="text-muted" v-if="item.lastUpdatedAt">
                        {{ formatLastUpdate(item.lastUpdatedAt) }}
                      </small>
                    </td>
                    <td>
                      <span class="badge" :class="getStatusBadgeClass(item.status)">
                        {{ getStatusLabel(item.status) }}
                        {{ item.status !== "klop" ? `(${item.variance > 0 ? "+" : ""}${item.variance})` : "" }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-sm btn-outline-primary me-1"
                        @click="openUpdateModal('custom', item.bulan)"
                      >
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                      <button class="btn btn-sm btn-outline-info" @click="openHistoryModal('custom', item.bulan)">
                        <i class="bi bi-clock-history me-1"></i>
                        Riwayat
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- UPDATE MODAL (FR-5) -->
    <div v-if="showUpdateModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Update Fisik Barang - {{ formatBulanDisplay(modalData.bulan) }} ({{ capitalizeFirst(modalData.tipe) }})
            </h5>
            <button type="button" class="btn-close" @click="closeUpdateModal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label text-muted small">Data Sistem</label>
              <div class="alert alert-info mb-0">
                <strong>{{ modalData.sistemQty }}</strong>
                pcs
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label text-muted small">Fisik Barang Saat Ini</label>
              <div class="alert alert-light mb-0">
                <strong>{{ modalData.currentQty }}</strong>
                pcs
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label text-muted small">Status</label>
              <div :class="['alert', 'mb-0', getStatusAlertClass(modalData.currentStatus)]">
                <strong>{{ getStatusLabel(modalData.currentStatus) }}</strong>
                {{
                  modalData.currentStatus !== "pending"
                    ? `(${modalData.currentVariance > 0 ? "+" : ""}${modalData.currentVariance})`
                    : ""
                }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Jumlah Pcs Fisik Baru</label>
              <input
                v-model.number="modalData.newQty"
                type="number"
                class="form-control form-control-lg"
                min="0"
                required
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Catatan</label>
              <textarea
                v-model="modalData.notes"
                class="form-control"
                rows="3"
                placeholder="Misal: 2 pcs hilang, verifikasi sudah dilakukan..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeUpdateModal">Batal</button>
            <button type="button" class="btn btn-primary" @click="handleUpdateFisikBarang" :disabled="isSavingModal">
              <span v-if="isSavingModal" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-circle me-1"></i>
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- HISTORY MODAL -->
    <div v-if="showHistoryModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Riwayat - {{ formatBulanDisplay(modalData.bulan) }} ({{ capitalizeFirst(modalData.tipe) }})
            </h5>
            <button type="button" class="btn-close" @click="closeHistoryModal"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalData.history?.length === 0" class="text-center text-muted py-4">
              <p>Belum ada riwayat perubahan.</p>
            </div>
            <div v-else class="timeline">
              <div v-for="(entry, idx) in modalData.history" :key="idx" class="timeline-item mb-3 pb-3 border-bottom">
                <div class="d-flex gap-2">
                  <div
                    class="timeline-marker"
                    style="
                      width: 32px;
                      height: 32px;
                      border-radius: 50%;
                      background: #e9ecef;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-shrink: 0;
                    "
                  >
                    <i class="bi bi-check-circle-fill text-success" style="font-size: 18px"></i>
                  </div>
                  <div class="flex-grow-1">
                    <p class="mb-1">
                      <strong>{{ entry.fisikQtyBefore }} pcs → {{ entry.fisikQtyAfter }} pcs</strong>
                    </p>
                    <p class="small text-muted mb-1">
                      <i class="bi bi-person-circle me-1"></i>
                      {{ entry.updatedBy }}
                    </p>
                    <p class="small text-muted mb-2">
                      <i class="bi bi-clock me-1"></i>
                      {{ formatTimestamp(entry.timestamp) }}
                    </p>
                    <div v-if="entry.notes" class="alert alert-light py-2 px-3 small mb-0">
                      {{ entry.notes }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeHistoryModal">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { collection, getDocs, where, query } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  getServisManagementByUser,
  updateFisikBarangQty,
  initializeMonthRecord,
  getMonthHistory,
  formatBulan,
  getLast24Months,
  groupServisByMonth,
} from "@/services/servis-management-service.js";

// ────────────────────────────────────────────────────────────────────────────
// Stores & Router
// ────────────────────────────────────────────────────────────────────────────
const authStore = useAuthStore();
const router = useRouter();

// ────────────────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────────────────
const isInitializing = ref(true);
const dashboardCards = ref({
  servisBelumSelesai: 0,
  servisSudahSelesai: 0,
  servisSudahDiambil: 0,
  customBelumSelesai: 0,
  customSudahSelesai: 0,
  customSudahDiambil: 0,
});

const allServisData = ref([]);
const managementData = ref({
  servis: [],
  custom: [],
});

const activeTab = ref("servis");

// Form Data
const formData = ref({
  bulan: "",
  tipe: "servis",
  jumlahPcs: 0,
  catatan: "",
});

const isSavingForm = ref(false);

// Modal Data
const showUpdateModal = ref(false);
const showHistoryModal = ref(false);
const isSavingModal = ref(false);

const modalData = ref({
  tipe: "",
  bulan: "",
  sistemQty: 0,
  currentQty: 0,
  currentStatus: "",
  currentVariance: 0,
  newQty: 0,
  notes: "",
  history: [],
});

// ────────────────────────────────────────────────────────────────────────────
// Computed Properties
// ────────────────────────────────────────────────────────────────────────────

const availableMonths = computed(() => getLast24Months());

const paginatedServis = computed(() => {
  return managementData.value.servis?.sort((a, b) => new Date(b.bulan) - new Date(a.bulan)) || [];
});

const paginatedCustom = computed(() => {
  return managementData.value.custom?.sort((a, b) => new Date(b.bulan) - new Date(a.bulan)) || [];
});

// ────────────────────────────────────────────────────────────────────────────
// Methods - Dashboard
// ────────────────────────────────────────────────────────────────────────────

async function loadDashboardCards() {
  try {
    // Strategy 1: Batch single query instead of 6 separate queries
    const servisRef = collection(db, "servis");

    // Query: Belum Selesai + Sudah Selesai
    const q = query(servisRef, where("statusServis", "in", ["Belum Selesai", "Sudah Selesai"]));

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    allServisData.value = data;

    // Client-side grouping (Strategy 1)
    const belumSelesaiServis = data.filter((d) => d.statusServis === "Belum Selesai" && d.jenisInput !== "custom");
    const sudahSelesaiServis = data.filter(
      (d) => d.statusServis === "Sudah Selesai" && d.statusPengambilan === "Belum Diambil" && d.jenisInput !== "custom",
    );
    const sudahDiambilServis = data.filter(
      (d) => d.statusServis === "Sudah Selesai" && d.statusPengambilan === "Sudah Diambil" && d.jenisInput !== "custom",
    );

    const belumSelesaiCustom = data.filter((d) => d.statusServis === "Belum Selesai" && d.jenisInput === "custom");
    const sudahSelesaiCustom = data.filter(
      (d) => d.statusServis === "Sudah Selesai" && d.statusPengambilan === "Belum Diambil" && d.jenisInput === "custom",
    );
    const sudahDiambilCustom = data.filter(
      (d) => d.statusServis === "Sudah Selesai" && d.statusPengambilan === "Sudah Diambil" && d.jenisInput === "custom",
    );

    dashboardCards.value = {
      servisBelumSelesai: belumSelesaiServis.length,
      servisSudahSelesai: sudahSelesaiServis.length,
      servisSudahDiambil: sudahDiambilServis.length,
      customBelumSelesai: belumSelesaiCustom.length,
      customSudahSelesai: sudahSelesaiCustom.length,
      customSudahDiambil: sudahDiambilCustom.length,
    };

    // Initialize months in management collection if needed
    await initializeManagementMonths(sudahSelesaiServis, "servis");
    await initializeManagementMonths(sudahSelesaiCustom, "custom");
  } catch (error) {
    console.error("Error loading dashboard cards:", error);
  }
}

async function initializeManagementMonths(servisData, tipe) {
  const grouped = groupServisByMonth(servisData);

  for (const [bulan, monthData] of Object.entries(grouped)) {
    await initializeMonthRecord(authStore.userId, tipe, bulan, monthData.count);
  }
}

async function loadManagementData() {
  try {
    const data = await getServisManagementByUser(authStore.userId);
    managementData.value = data;
  } catch (error) {
    console.error("Error loading management data:", error);
  }
}

async function refreshDashboard() {
  try {
    await loadDashboardCards();
    await loadManagementData();
  } catch (error) {
    console.error("Error refreshing dashboard:", error);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Methods - Form
// ────────────────────────────────────────────────────────────────────────────

async function handleSaveForm() {
  if (!formData.value.bulan || !formData.value.tipe) {
    alert("Bulan dan Tipe harus dipilih");
    return;
  }

  isSavingForm.value = true;

  try {
    await updateFisikBarangQty(
      authStore.userId,
      formData.value.tipe,
      formData.value.bulan,
      formData.value.jumlahPcs,
      formData.value.catatan,
      authStore.userEmail,
    );

    // Refresh data
    await loadManagementData();
    resetForm();

    // Show success message
    alert("Data fisik barang berhasil disimpan!");
  } catch (error) {
    console.error("Error saving form:", error);
    alert("Gagal menyimpan data: " + error.message);
  } finally {
    isSavingForm.value = false;
  }
}

function resetForm() {
  formData.value = {
    bulan: "",
    tipe: "servis",
    jumlahPcs: 0,
    catatan: "",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Methods - Modal
// ────────────────────────────────────────────────────────────────────────────

async function openUpdateModal(tipe, bulan) {
  try {
    const monthData = managementData.value[tipe].find((m) => m.bulan === bulan) || {};

    modalData.value = {
      tipe,
      bulan,
      sistemQty: monthData.sistemDataQty || 0,
      currentQty: monthData.fisikBarangQty || 0,
      currentStatus: monthData.status || "pending",
      currentVariance: monthData.variance || 0,
      newQty: monthData.fisikBarangQty || 0,
      notes: monthData.updateNotes || "",
      history: monthData.history || [],
    };

    showUpdateModal.value = true;
  } catch (error) {
    console.error("Error opening update modal:", error);
  }
}

function closeUpdateModal() {
  showUpdateModal.value = false;
}

async function handleUpdateFisikBarang() {
  if (modalData.value.newQty === undefined || modalData.value.newQty === null) {
    alert("Jumlah pcs harus diisi");
    return;
  }

  isSavingModal.value = true;

  try {
    await updateFisikBarangQty(
      authStore.userId,
      modalData.value.tipe,
      modalData.value.bulan,
      modalData.value.newQty,
      modalData.value.notes,
      authStore.userEmail,
    );

    // Refresh data
    await loadManagementData();
    closeUpdateModal();

    alert("Data berhasil diperbarui!");
  } catch (error) {
    console.error("Error updating data:", error);
    alert("Gagal memperbarui data: " + error.message);
  } finally {
    isSavingModal.value = false;
  }
}

async function openHistoryModal(tipe, bulan) {
  try {
    const monthData = managementData.value[tipe].find((m) => m.bulan === bulan) || {};

    modalData.value = {
      tipe,
      bulan,
      history: monthData.history || [],
    };

    showHistoryModal.value = true;
  } catch (error) {
    console.error("Error opening history modal:", error);
  }
}

function closeHistoryModal() {
  showHistoryModal.value = false;
}

// ────────────────────────────────────────────────────────────────────────────
// Helper Methods
// ────────────────────────────────────────────────────────────────────────────

function formatBulanDisplay(bulanStr) {
  return formatBulan(bulanStr);
}

function getStatusLabel(status) {
  const labels = {
    klop: "Klop",
    kurang: "Kurang",
    lebih: "Lebih",
    pending: "Pending",
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = {
    klop: "bg-success",
    kurang: "bg-danger",
    lebih: "bg-warning text-dark",
    pending: "bg-secondary",
  };
  return classes[status] || "bg-light text-dark";
}

function getStatusAlertClass(status) {
  const classes = {
    klop: "alert-success",
    kurang: "alert-danger",
    lebih: "alert-warning",
    pending: "alert-light",
  };
  return classes[status] || "alert-light";
}

function formatLastUpdate(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins}m lalu`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d lalu`;

  return date.toLocaleDateString("id-ID");
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    await loadDashboardCards();
    await loadManagementData();
  } catch (error) {
    console.error("Error initializing component:", error);
  } finally {
    isInitializing.value = false;
  }
});
</script>

<style scoped>
.timeline {
  position: relative;
  padding-left: 20px;
}

.timeline-item {
  position: relative;
}

.timeline-item::before {
  content: "";
  position: absolute;
  left: -20px;
  top: 30px;
  width: 2px;
  height: calc(100% + 20px);
  background-color: #dee2e6;
}

.timeline-item:last-child::before {
  display: none;
}

.modal.show {
  display: block;
}

.bg-light-warning {
  background-color: #fff3cd;
}

.bg-light-info {
  background-color: #d1ecf1;
}

.bg-light-success {
  background-color: #d4edda;
}
</style>
