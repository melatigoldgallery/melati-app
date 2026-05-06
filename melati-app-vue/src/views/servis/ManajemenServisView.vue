<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-box-seam me-2 text-dark"></i>
        Manajemen Servis & Custom
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
                  <div class="d-flex justify-content-between align-items-center mt-2 gap-2">
                    <h3 class="mb-0">{{ dashboardCards.servisSudahSelesai }}</h3>
                    <span class="summary-status-badge" :class="getSummaryStatusClass(servisSelesaiStatusInfo.status)">
                      {{ servisSelesaiStatusInfo.label }}
                    </span>
                  </div>
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
                  <div class="d-flex justify-content-between align-items-center mt-2 gap-2">
                    <h3 class="mb-0">{{ dashboardCards.customSudahSelesai }}</h3>
                    <span class="summary-status-badge" :class="getSummaryStatusClass(customSelesaiStatusInfo.status)">
                      {{ customSelesaiStatusInfo.label }}
                    </span>
                  </div>
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
        </div>
      </div>

      <!-- SECTION 2: Input Fisik Barang -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-pen me-2"></i>
            Input Fisik Barang
          </h2>
        </div>
        <div class="card-body p-4">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Tipe</label>
              <div class="d-flex gap-3">
                <div class="form-check">
                  <input
                    id="inputTipeServis"
                    v-model="selectedInputType"
                    type="radio"
                    name="inputTipe"
                    class="form-check-input"
                    value="servis"
                  />
                  <label class="form-check-label" for="inputTipeServis">Servis</label>
                </div>
                <div class="form-check">
                  <input
                    id="inputTipeCustom"
                    v-model="selectedInputType"
                    type="radio"
                    name="inputTipe"
                    class="form-check-input"
                    value="custom"
                  />
                  <label class="form-check-label" for="inputTipeCustom">Custom</label>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <small class="text-muted">Menampilkan seluruh bulan yang punya data servis atau manajemen.</small>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleMonthVisibility">
                {{ showAllMonths ? "Fokus 6 Bulan Terakhir" : "Lihat Semua Bulan" }}
              </button>
            </div>
          </div>

          <div v-if="displayedInputSectionRows.length === 0" class="p-4 text-center text-muted border rounded">
            <p class="mb-0">Belum ada data untuk tipe {{ capitalizeFirst(selectedInputType) }}.</p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 5%">No</th>
                  <th style="width: 12%">Bulan</th>
                  <th class="text-center" style="width: 12%">Belum Selesai</th>
                  <th class="text-center" style="width: 20%">Sudah Selesai & Belum Diambil</th>
                  <th style="width: 10%">Fisik Barang</th>
                  <th style="width: 10%">Aksi</th>
                  <th style="width: 16%">Status</th>
                  <th style="width: 15%">Terakhir Update</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in displayedInputSectionRows" :key="`${selectedInputType}-${item.bulan}`">
                  <td class="small text-muted">{{ idx + 1 }}</td>
                  <td class="fw-semibold">{{ formatBulanDisplay(item.bulan) }}</td>
                  <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.belumSelesaiQty }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.selesaiBelumDiambilQty }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.fisikBarangQty }}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-success" @click="openUpdateModal(item)">
                      <i class="bi bi-pencil me-1"></i>
                      Update
                    </button>
                  </td>
                  <td>
                    <span class="badge" :class="getStatusBadgeClass(item.status)">
                      {{ getStatusLabel(item.status) }}
                      {{ item.status !== "klop" ? `(${item.variance > 0 ? "+" : ""}${item.variance})` : "" }}
                    </span>
                  </td>
                  <td>
                    <div v-if="item.lastUpdatedAt">
                      <div class="small">{{ formatTimestamp(item.lastUpdatedAt) }}</div>
                      <small class="text-muted" v-if="item.lastUpdatedBy">oleh {{ item.lastUpdatedBy }}</small>
                    </div>
                    <small v-else class="text-muted">-</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SECTION 3: Jadwal Hitung Fisik Barang -->
      <div class="card border-0 shadow-sm mb-4 schedule-board">
        <div class="schedule-hero p-4 p-md-5">
          <div class="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
            <div>
              <p class="schedule-kicker mb-2">Operasional Pagi</p>
              <h2 class="schedule-title mb-2">
                <i class="bi bi-calendar-week me-2"></i>
                Jadwal Hitung Fisik Barang Servis
              </h2>
              <p class="schedule-subtitle mb-0">
                Pengecekan dilakukan saat toko baru buka pagi, sebelum alur servis harian dimulai.
              </p>
            </div>
            <div class="schedule-today-pill">
              <small class="d-block text-uppercase">Penanggung jawab hari ini</small>
              <strong>{{ todayScheduleLabel }}</strong>
            </div>
          </div>
        </div>
        <div class="card-body p-4">
          <div class="custom-duty-note mb-3">
            <i class="bi bi-person-badge me-2"></i>
            <strong>Hitung fisik custom:</strong>
            ditangani oleh
            <strong>admin yang shift pagi</strong>
            pada hari tersebut.
          </div>

          <div class="row g-3">
            <div v-for="item in physicalCountSchedule" :key="item.key" class="col-12 col-md-6 col-xl-4">
              <article class="schedule-day-card h-100" :class="{ 'is-today': item.key === todayScheduleKey }">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="schedule-day-name">{{ item.day }}</span>
                  <i :class="['schedule-day-icon', item.icon]"></i>
                </div>
                <p class="schedule-team mb-1">{{ item.team }}</p>
                <p class="schedule-focus mb-0">{{ item.focus }}</p>
              </article>
            </div>
          </div>

          <div class="schedule-notes mt-4">
            <h3 class="schedule-notes-title mb-2">
              <i class="bi bi-journal-check me-2"></i>
              Catatan Operasional
            </h3>
            <ul class="mb-0 ps-3">
              <li>
                Jika tim yang bertugas berhalangan, boleh meminta bantuan tim lain agar hitung fisik tetap berjalan.
              </li>
              <li>Untuk barang custom, penanggung jawab hitung fisik adalah admin yang shift pagi di hari itu.</li>
              <li>
                Hasil hitung wajib langsung diinput di bagian
                <strong>Input Fisik Barang</strong>
                pada hari yang sama.
              </li>
              <li>
                Jika ada selisih kurang/lebih, tulis alasan di kolom catatan update dan koordinasikan ke supervisor.
              </li>
              <li>
                Pisahkan alur hitung antara jenis
                <strong>servis</strong>
                dan
                <strong>custom</strong>
                agar rekonsiliasi tidak tercampur.
              </li>
            </ul>
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
              <label class="form-label fw-semibold">Nama Staff</label>
              <input
                v-model="modalData.staffName"
                type="text"
                class="form-control"
                placeholder="Masukkan nama staff"
                required
              />
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import {
  getServisManagementByUser,
  updateFisikBarangQty,
  initializeMonthRecord,
  formatBulan,
  groupServisByMonth,
  invalidateCache as invalidateManagementCache,
} from "@/services/servis-management-service.js";
import { fetchServisByMonth, fetchServisByRange } from "@/services/servis-service";

const authStore = useAuthStore();
const { swal, error: showError } = useAlert();

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

const selectedInputType = ref("servis");
const showAllMonths = ref(false);

const showUpdateModal = ref(false);
const isSavingModal = ref(false);
const isDashboardLoading = ref(false);
const RECENT_MONTH_WINDOW = 6;

const modalData = ref({
  tipe: "",
  bulan: "",
  sistemQty: 0,
  currentQty: 0,
  currentStatus: "pending",
  currentVariance: 0,
  newQty: 0,
  staffName: "",
  notes: "",
});

const currentUserId = computed(() => authStore.currentUser?.uid || authStore.user?.uid || "");
const physicalCountSchedule = Object.freeze([
  {
    key: "senin",
    day: "Senin",
    team: "Tim Kalung",
    focus: "Pemeriksaan menyeluruh seluruh barang servis dan cocokkan dengan data sistem.",
    icon: "bi bi-link-45deg",
  },
  {
    key: "selasa",
    day: "Selasa",
    team: "Tim Liontin",
    focus: "Lanjutkan hitung semua jenis barang servis, pastikan jumlah fisik akurat.",
    icon: "bi bi-gem",
  },
  {
    key: "rabu",
    day: "Rabu",
    team: "Tim Anting",
    focus: "Verifikasi seluruh item servis lintas kategori sebelum jam operasional ramai.",
    icon: "bi bi-stars",
  },
  {
    key: "kamis",
    day: "Kamis",
    team: "Tim Cincin",
    focus: "Hitung total fisik seluruh barang servis dan catat selisih bila ada.",
    icon: "bi bi-circle",
  },
  {
    key: "jumat",
    day: "Jumat",
    team: "Tim Gelang",
    focus: "Lakukan cross-check data fisik dan sistem untuk semua jenis servis.",
    icon: "bi bi-brightness-high",
  },
  {
    key: "sabtu",
    day: "Sabtu",
    team: "Tim Giwang",
    focus: "Pastikan seluruh barang servis terhitung lengkap sebelum operasional penuh.",
    icon: "bi bi-record-circle",
  },
  {
    key: "minggu",
    day: "Minggu",
    team: "Tim Hala",
    focus: "Rekap akhir pekan: hitung semua jenis barang servis dan update hasilnya.",
    icon: "bi bi-clipboard2-check",
  },
]);
const dayIndexToKey = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const todayScheduleKey = computed(() => dayIndexToKey[new Date().getDay()] || "");
const todayScheduleLabel = computed(() => {
  const todayItem = physicalCountSchedule.find((item) => item.key === todayScheduleKey.value);
  return todayItem ? `${todayItem.day} - ${todayItem.team}` : "-";
});

function buildInputSectionRowsByType(tipe) {
  const systemByMonth = {};
  allServisData.value.forEach((item) => {
    if (!matchesJenisInput(item, tipe)) return;

    const bulan = extractMonth(item.tanggal);
    if (!bulan) return;

    if (!systemByMonth[bulan]) {
      systemByMonth[bulan] = {
        bulan,
        belumSelesaiQty: 0,
        selesaiBelumDiambilQty: 0,
      };
    }

    if (item.statusServis === "Belum Selesai") {
      systemByMonth[bulan].belumSelesaiQty += 1;
    }

    if (item.statusServis === "Sudah Selesai" && item.statusPengambilan === "Belum Diambil") {
      systemByMonth[bulan].selesaiBelumDiambilQty += 1;
    }
  });

  const managementByMonth = {};
  (managementData.value[tipe] || []).forEach((item) => {
    if (!item?.bulan) return;
    managementByMonth[item.bulan] = item;
  });

  const allMonths = new Set([...Object.keys(systemByMonth), ...Object.keys(managementByMonth)]);

  return Array.from(allMonths)
    .map((bulan) => {
      const managementMonth = managementByMonth[bulan] || {};
      const systemMonth = systemByMonth[bulan];
      const fallbackSistemQty = Number.isFinite(Number(managementMonth.sistemDataQty))
        ? Number(managementMonth.sistemDataQty)
        : 0;

      const belumSelesaiQty = Number.isFinite(Number(systemMonth?.belumSelesaiQty))
        ? Number(systemMonth.belumSelesaiQty)
        : 0;
      const sistemBelumDiambilQty = Number.isFinite(Number(systemMonth?.selesaiBelumDiambilQty))
        ? Number(systemMonth.selesaiBelumDiambilQty)
        : fallbackSistemQty;

      const fisikBarangQty = Number.isFinite(Number(managementMonth.fisikBarangQty))
        ? Number(managementMonth.fisikBarangQty)
        : 0;
      const variance = fisikBarangQty - sistemBelumDiambilQty;

      let status = "klop";
      if (sistemBelumDiambilQty > fisikBarangQty) status = "kurang";
      if (sistemBelumDiambilQty < fisikBarangQty) status = "lebih";

      return {
        bulan,
        belumSelesaiQty,
        selesaiBelumDiambilQty: sistemBelumDiambilQty,
        fisikBarangQty,
        status,
        variance,
        lastUpdatedAt: managementMonth.lastUpdatedAt || null,
        lastUpdatedBy: managementMonth.lastUpdatedBy || "",
        updateNotes: managementMonth.updateNotes || "",
      };
    })
    .sort((a, b) => new Date(`${b.bulan}-01`) - new Date(`${a.bulan}-01`));
}

function formatSummaryStatus(status, variance) {
  const normalized = status || "pending";
  if (normalized === "klop") return "KLOP";
  if (normalized === "kurang") return `KURANG ${Math.abs(Number(variance) || 0)}`;
  if (normalized === "lebih") return `LEBIH ${Math.abs(Number(variance) || 0)}`;
  return "PENDING";
}

function buildDashboardStatusInfo(tipe) {
  const rows = buildInputSectionRowsByType(tipe);
  const activeRows = rows.filter(
    (row) => Number(row.selesaiBelumDiambilQty || 0) > 0 || Number(row.fisikBarangQty || 0) > 0,
  );

  if (!activeRows.length) {
    return { status: "pending", label: "PENDING", monthLabel: "Belum ada data" };
  }

  const totalSistemQty = activeRows.reduce((sum, row) => sum + Number(row.selesaiBelumDiambilQty || 0), 0);
  const totalFisikQty = activeRows.reduce((sum, row) => sum + Number(row.fisikBarangQty || 0), 0);
  const variance = totalFisikQty - totalSistemQty;

  let status = "klop";
  if (variance < 0) status = "kurang";
  if (variance > 0) status = "lebih";

  return {
    status,
    label: formatSummaryStatus(status, variance),
    monthLabel: `Akumulasi ${activeRows.length} bulan aktif`,
  };
}

const inputSectionRows = computed(() => {
  const tipe = selectedInputType.value;
  return buildInputSectionRowsByType(tipe);
});

const servisSelesaiStatusInfo = computed(() => buildDashboardStatusInfo("servis"));
const customSelesaiStatusInfo = computed(() => buildDashboardStatusInfo("custom"));

const monthFilterThreshold = computed(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 5, 1);
});

const displayedInputSectionRows = computed(() => {
  if (showAllMonths.value) return inputSectionRows.value;

  return inputSectionRows.value.filter((item) => {
    const monthDate = parseMonthStart(item.bulan);
    if (!monthDate) return true;

    const isRecentMonth = monthDate >= monthFilterThreshold.value;
    return isRecentMonth || Number(item.selesaiBelumDiambilQty || 0) > 0 || Number(item.fisikBarangQty || 0) > 0;
  });
});

const hiddenOlderKlopCount = computed(() => {
  if (showAllMonths.value) return 0;

  return inputSectionRows.value.filter((item) => {
    const monthDate = parseMonthStart(item.bulan);
    if (!monthDate) return false;

    const isOlderThan6Months = monthDate < monthFilterThreshold.value;
    return (
      isOlderThan6Months && Number(item.selesaiBelumDiambilQty || 0) === 0 && Number(item.fisikBarangQty || 0) === 0
    );
  }).length;
});

function extractMonth(tanggal) {
  if (typeof tanggal === "string" && tanggal.length >= 7) {
    return tanggal.substring(0, 7);
  }

  if (tanggal?.toDate) {
    const date = tanggal.toDate();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  return "";
}

function parseMonthStart(bulan) {
  if (!bulan || typeof bulan !== "string") return null;

  const [yearRaw, monthRaw] = bulan.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;

  return new Date(year, month - 1, 1);
}

function matchesJenisInput(item, jenisFilter) {
  // Keep this identical to DataServisView filter:
  // (i.jenisInput || "servis") === filterJenis
  return (item?.jenisInput || "servis") === jenisFilter;
}

function formatYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecentWindowRange() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - (RECENT_MONTH_WINDOW - 1), 1);

  return {
    start: formatYmd(startDate),
    end: formatYmd(endDate),
    startMonthDate: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
  };
}

function getLegacyActiveMonths(startMonthDate) {
  const monthSet = new Set();
  const sourceRows = [...(managementData.value.servis || []), ...(managementData.value.custom || [])];

  for (const row of sourceRows) {
    const monthDate = parseMonthStart(row?.bulan);
    if (!monthDate) continue;
    if (monthDate >= startMonthDate) continue;
    const sistemDataQty = Number(row?.sistemDataQty || 0);
    const hasActiveSystemQty = Number.isFinite(sistemDataQty) && sistemDataQty > 0;
    const needsRecheck = row?.status !== "klop" || hasActiveSystemQty;
    if (!needsRecheck) continue;
    monthSet.add(row.bulan);
  }

  return Array.from(monthSet);
}

async function fetchDashboardServisData() {
  const range = getRecentWindowRange();
  const recentData = await fetchServisByRange(range.start, range.end);
  const legacyMonths = getLegacyActiveMonths(range.startMonthDate);

  if (!legacyMonths.length) return recentData;

  const legacyChunks = await Promise.all(
    legacyMonths.map((bulan) => {
      const [yearRaw, monthRaw] = String(bulan).split("-");
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      if (!Number.isInteger(year) || !Number.isInteger(month)) return Promise.resolve([]);
      return fetchServisByMonth(year, month);
    }),
  );

  const mergedById = new Map();
  for (const item of recentData) {
    mergedById.set(item.id, item);
  }
  for (const chunk of legacyChunks) {
    for (const item of chunk) {
      mergedById.set(item.id, item);
    }
  }

  return Array.from(mergedById.values());
}

async function loadDashboardCards() {
  if (isDashboardLoading.value) return;
  isDashboardLoading.value = true;
  try {
    // Fast path: recent window + legacy non-klop months only.
    const data = await fetchDashboardServisData();
    const activeServisData = data.filter(
      (d) => d.statusServis === "Belum Selesai" || d.statusServis === "Sudah Selesai",
    );
    allServisData.value = activeServisData;

    let servisBelumSelesai = 0;
    let servisSudahSelesai = 0;
    let servisSudahDiambil = 0;
    let customBelumSelesai = 0;
    let customSudahSelesai = 0;
    let customSudahDiambil = 0;

    const sudahSelesaiServis = [];
    const sudahSelesaiCustom = [];

    for (const item of activeServisData) {
      const isServis = matchesJenisInput(item, "servis");
      const isCustom = !isServis;

      if (item.statusServis === "Belum Selesai") {
        if (isServis) servisBelumSelesai += 1;
        if (isCustom) customBelumSelesai += 1;
        continue;
      }

      if (item.statusServis !== "Sudah Selesai") continue;

      if (item.statusPengambilan === "Belum Diambil") {
        if (isServis) {
          servisSudahSelesai += 1;
          sudahSelesaiServis.push(item);
        }
        if (isCustom) {
          customSudahSelesai += 1;
          sudahSelesaiCustom.push(item);
        }
      }

      if (item.statusPengambilan === "Sudah Diambil") {
        if (isServis) servisSudahDiambil += 1;
        if (isCustom) customSudahDiambil += 1;
      }
    }

    dashboardCards.value = {
      servisBelumSelesai,
      servisSudahSelesai,
      servisSudahDiambil,
      customBelumSelesai,
      customSudahSelesai,
      customSudahDiambil,
    };

    const [servisUpdates, customUpdates] = await Promise.all([
      initializeManagementMonths(sudahSelesaiServis, "servis"),
      initializeManagementMonths(sudahSelesaiCustom, "custom"),
    ]);

    // Reload management data only when there is real change in month snapshot.
    if (servisUpdates + customUpdates > 0) {
      await loadManagementData(true);
    }
  } catch (error) {
    console.error("Error loading dashboard cards:", error);
  } finally {
    isDashboardLoading.value = false;
  }
}

async function initializeManagementMonths(servisData, tipe) {
  const userId = currentUserId.value;
  if (!userId) return 0;

  const grouped = groupServisByMonth(servisData);
  const currentMonths = new Map(
    (managementData.value[tipe] || []).map((item) => [item.bulan, Number(item.sistemDataQty)]),
  );
  const tasks = [];

  for (const [bulan, monthData] of Object.entries(grouped)) {
    const nextCount = Number(monthData.count || 0);
    if (currentMonths.has(bulan) && currentMonths.get(bulan) === nextCount) continue;
    tasks.push(initializeMonthRecord(userId, tipe, bulan, nextCount));
  }

  if (!tasks.length) return 0;
  await Promise.all(tasks);
  return tasks.length;
}

async function loadManagementData(forceRefresh = false) {
  const userId = currentUserId.value;

  if (!userId) {
    if (forceRefresh) invalidateManagementCache();
    managementData.value = { servis: [], custom: [] };
    return;
  }

  try {
    if (forceRefresh) invalidateManagementCache();
    const data = await getServisManagementByUser(userId);
    managementData.value = {
      servis: data.servis || [],
      custom: data.custom || [],
    };
  } catch (error) {
    console.error("Error loading management data:", error);
  }
}

async function refreshDashboard() {
  try {
    await loadManagementData(true);
    await loadDashboardCards();
  } catch (error) {
    console.error("Error refreshing dashboard:", error);
  }
}

function handleStorageSync(e) {
  if (e.key !== "servisDataChanged") return;
  refreshDashboard();
}

function toggleMonthVisibility() {
  showAllMonths.value = !showAllMonths.value;
}

function openUpdateModal(item) {
  modalData.value = {
    tipe: selectedInputType.value,
    bulan: item.bulan,
    sistemQty: item.selesaiBelumDiambilQty,
    currentQty: item.fisikBarangQty,
    currentStatus: item.status,
    currentVariance: item.variance,
    newQty: item.fisikBarangQty,
    staffName: "",
    notes: item.updateNotes || "",
  };

  showUpdateModal.value = true;
}

function closeUpdateModal() {
  showUpdateModal.value = false;
}

async function handleUpdateFisikBarang() {
  if (modalData.value.newQty === undefined || modalData.value.newQty === null || modalData.value.newQty < 0) {
    await swal("Jumlah pcs harus diisi dan tidak boleh negatif", "warning");
    return;
  }

  const staffName = String(modalData.value.staffName || "").trim();
  if (!staffName) {
    await swal("Nama staff harus diisi", "warning");
    return;
  }

  const userId = currentUserId.value;
  if (!userId) {
    await showError("User tidak ditemukan", "Silakan login ulang.");
    return;
  }

  isSavingModal.value = true;

  try {
    await updateFisikBarangQty(
      userId,
      modalData.value.tipe,
      modalData.value.bulan,
      modalData.value.newQty,
      modalData.value.notes,
      staffName,
      { sistemQty: modalData.value.sistemQty },
    );

    await loadManagementData(true);
    closeUpdateModal();

    await swal("Data berhasil diperbarui");
  } catch (error) {
    console.error("Error updating data:", error);
    await showError("Gagal memperbarui data", error?.message || "");
  } finally {
    isSavingModal.value = false;
  }
}

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

function getSummaryStatusClass(status) {
  const classes = {
    klop: "status-klop",
    kurang: "status-kurang",
    lebih: "status-lebih",
    pending: "status-pending",
  };
  return classes[status] || "status-pending";
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
  const value = String(str || "");
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

onMounted(async () => {
  try {
    // Load management snapshot first so first paint is not blocked by full servis query.
    await loadManagementData(true);
  } catch (error) {
    console.error("Error initializing component:", error);
  } finally {
    isInitializing.value = false;
  }

  window.addEventListener("storage", handleStorageSync);
  await loadDashboardCards();
});

onUnmounted(() => {
  window.removeEventListener("storage", handleStorageSync);
});
</script>

<style scoped>
.schedule-board {
  --schedule-bg-start: #f4f8ff;
  --schedule-bg-end: #fff5e9;
  --schedule-accent: #146c94;
  --schedule-accent-soft: #dceef7;
  --schedule-border: #dfe8f0;
  overflow: hidden;
}

.schedule-hero {
  background: linear-gradient(130deg, var(--schedule-bg-start) 0%, #eff4ff 48%, var(--schedule-bg-end) 100%);
  border-bottom: 1px solid var(--schedule-border);
}

.schedule-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b7b8f;
}

.schedule-title {
  font-size: 1.38rem;
  font-weight: 700;
  color: #1f2d3d;
}

.schedule-subtitle {
  font-size: 0.92rem;
  color: #4f6074;
}

.schedule-today-pill {
  border: 1px solid #d4e2f0;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  min-width: 225px;
  backdrop-filter: blur(2px);
  color: #1f2d3d;
}

.schedule-day-card {
  border: 1px solid var(--schedule-border);
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  background: #ffffff;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}

.schedule-day-card:hover {
  transform: translateY(-1px);
  border-color: #bdd3e5;
  box-shadow: 0 8px 22px rgba(22, 76, 125, 0.08);
}

.schedule-day-card.is-today {
  border-color: var(--schedule-accent);
  box-shadow:
    0 0 0 1px var(--schedule-accent),
    0 10px 26px rgba(20, 108, 148, 0.14);
  background: linear-gradient(160deg, #ffffff 0%, #f6fbff 100%);
}

.schedule-day-name {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #73879c;
}

.schedule-day-icon {
  font-size: 1.15rem;
  color: var(--schedule-accent);
}

.schedule-team {
  font-size: 1.02rem;
  font-weight: 700;
  color: #1d2b3f;
}

.schedule-focus {
  font-size: 0.84rem;
  color: #5e6f84;
}

.schedule-notes {
  border: 1px solid var(--schedule-border);
  border-radius: 0.95rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 1rem 1rem 1.05rem;
}

.schedule-notes-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1d2b3f;
}

.schedule-notes ul {
  color: #3f5062;
}

.schedule-notes li + li {
  margin-top: 0.4rem;
}

.custom-duty-note {
  border: 1px solid #b9d6f2;
  background: linear-gradient(180deg, #eef6ff 0%, #f8fbff 100%);
  color: #1f3f5e;
  border-radius: 0.75rem;
  padding: 0.62rem 0.8rem;
  font-size: 0.84rem;
}

.summary-status-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 0.22rem 0.58rem;
  border: 1px solid transparent;
}

.summary-status-badge.status-klop {
  background-color: #d7f4e5;
  border-color: #90d2b2;
  color: #0f5132;
}

.summary-status-badge.status-kurang {
  background-color: #fce2e2;
  border-color: #f2b3b8;
  color: #842029;
}

.summary-status-badge.status-lebih {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.summary-status-badge.status-pending {
  background-color: #edf1f4;
  border-color: #d4dbe2;
  color: #51606f;
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

@media (max-width: 575px) {
  .schedule-title {
    font-size: 1.15rem;
  }

  .schedule-today-pill {
    min-width: 100%;
  }
}
</style>
