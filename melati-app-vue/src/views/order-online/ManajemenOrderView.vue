<template>
  <div class="container-fluid py-3">
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-bag-check me-2 text-dark"></i>
        Manajemen Order Online
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/order-online/input">Order Online</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Manajemen Order</li>
        </ol>
      </nav>
    </div>

    <div v-if="isInitializing" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Memuat data...</p>
      </div>
    </div>

    <template v-else>
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-th me-2"></i>
            Ringkasan Sistem
          </h2>
        </div>
        <div class="card-body p-4">
          <div class="row g-3">
            <div class="col-md-4">
              <div class="card border-0 bg-light-warning">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Order Online</p>
                      <p class="text-muted small">Belum Diambil</p>
                    </div>
                    <i class="fas fa-hourglass-start fa-2x text-warning opacity-25"></i>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mt-2 gap-2">
                    <h3 class="mb-0">{{ dashboardCards.belumDiambil }}</h3>
                    <span class="summary-status-badge" :class="getSummaryStatusClass(belumDiambilStatusInfo.status)">
                      {{ belumDiambilStatusInfo.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="card border-0 bg-light-info">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Order Online</p>
                      <p class="text-muted small">Sudah Diambil</p>
                    </div>
                    <i class="fas fa-check-circle fa-2x text-info opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.sudahDiambil }}</h3>
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="card border-0 bg-light-success">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <p class="text-muted small mb-1">Order Online</p>
                      <p class="text-muted small">Total Order</p>
                    </div>
                    <i class="fas fa-boxes fa-2x text-success opacity-25"></i>
                  </div>
                  <h3 class="mb-0 mt-2">{{ dashboardCards.totalOrder }}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-light">
          <h2 class="mb-0">
            <i class="fas fa-pen me-2"></i>
            Input Fisik Barang
          </h2>
        </div>
        <div class="card-body p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <small class="text-muted">Menampilkan 6 bulan terakhir + data lama yang belum klop.</small>
            <div class="d-flex align-items-center gap-2">
              <small v-if="!showAllMonths && hiddenOlderKlopCount > 0" class="text-muted">
                {{ hiddenOlderKlopCount }} bulan lama klop disembunyikan
              </small>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleMonthVisibility">
                {{ showAllMonths ? "Tampilkan Fokus 6 Bulan" : "Lihat Semua Bulan" }}
              </button>
            </div>
          </div>

          <div v-if="displayedInputSectionRows.length === 0" class="p-4 text-center text-muted border rounded">
            <p class="mb-0">Belum ada data order online untuk ditampilkan.</p>
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 5%">No</th>
                  <th style="width: 15%">Bulan</th>
                  <th class="text-center" style="width: 13%">Belum Diambil</th>
                  <th style="width: 10%">Fisik Barang</th>
                  <!-- <th class="text-center" style="width: 12%">Sudah Diambil</th> -->
                  <th style="width: 10%">Aksi</th>
                  <th style="width: 15%">Status</th>
                  <th style="width: 20%">Terakhir Update</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in displayedInputSectionRows" :key="`order-${item.bulan}`">
                  <td class="small text-muted">{{ idx + 1 }}</td>
                  <td class="fw-semibold">{{ formatBulanDisplay(item.bulan) }}</td>
                  <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.belumDiambilQty }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.fisikBarangQty }}</span>
                  </td>
                  <!-- <td class="text-center">
                    <span class="badge bg-light text-dark">{{ item.sudahDiambilQty }}</span>
                  </td> -->
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
                      <small v-if="item.lastUpdatedBy" class="text-muted">oleh {{ item.lastUpdatedBy }}</small>
                    </div>
                    <small v-else class="text-muted">-</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showUpdateModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Update Fisik Barang - {{ formatBulanDisplay(modalData.bulan) }}
            </h5>
            <button type="button" class="btn-close" @click="closeUpdateModal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label text-muted small">Data Sistem (Belum Diambil)</label>
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
import { computed, onMounted, ref } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import { fetchOrderOnlineByRangeForManagement } from "@/services/order-online-service";
import {
  formatBulan,
  getOrderOnlineManagementByUser,
  groupOrderByMonth,
  initializeOrderMonthRecord,
  updateOrderFisikBarangQty,
} from "@/services/order-online-management-service";

const authStore = useAuthStore();
const { swal, error: showError } = useAlert();

const ORDER_QUERY_START = "2000-01-01";
const ORDER_QUERY_END = "2099-12-31";

const isInitializing = ref(true);
const isSavingModal = ref(false);
const showUpdateModal = ref(false);
const showAllMonths = ref(false);

const allOrderData = ref([]);
const managementRows = ref([]);

const dashboardCards = ref({
  belumDiambil: 0,
  sudahDiambil: 0,
  totalOrder: 0,
});

const modalData = ref({
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

function getOrderQty(item) {
  const qty = Number(item?.jml);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function extractMonth(tanggal) {
  if (typeof tanggal === "string" && tanggal.length >= 7) {
    return tanggal.slice(0, 7);
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
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function buildInputSectionRows() {
  const systemByMonth = {};
  allOrderData.value.forEach((item) => {
    const bulan = extractMonth(item?.tanggal);
    if (!bulan) return;

    if (!systemByMonth[bulan]) {
      systemByMonth[bulan] = {
        bulan,
        belumDiambilQty: 0,
        sudahDiambilQty: 0,
      };
    }

    const qty = getOrderQty(item);
    if (item?.statusPengambilan === "BELUM_DIAMBIL") {
      systemByMonth[bulan].belumDiambilQty += qty;
    } else if (item?.statusPengambilan === "SUDAH_DIAMBIL") {
      systemByMonth[bulan].sudahDiambilQty += qty;
    }
  });

  const managementByMonth = {};
  managementRows.value.forEach((item) => {
    if (!item?.bulan) return;
    managementByMonth[item.bulan] = item;
  });

  const allMonths = new Set([...Object.keys(systemByMonth), ...Object.keys(managementByMonth)]);

  return Array.from(allMonths)
    .map((bulan) => {
      const systemMonth = systemByMonth[bulan] || { belumDiambilQty: 0, sudahDiambilQty: 0 };
      const managementMonth = managementByMonth[bulan] || {};
      const fisikBarangQty = Number.isFinite(Number(managementMonth.fisikBarangQty))
        ? Number(managementMonth.fisikBarangQty)
        : 0;

      const variance = fisikBarangQty - Number(systemMonth.belumDiambilQty || 0);

      let status = "klop";
      if (variance < 0) status = "kurang";
      if (variance > 0) status = "lebih";

      return {
        bulan,
        belumDiambilQty: Number(systemMonth.belumDiambilQty || 0),
        sudahDiambilQty: Number(systemMonth.sudahDiambilQty || 0),
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

const inputSectionRows = computed(() => buildInputSectionRows());

function formatSummaryStatus(status, variance) {
  const normalized = status || "pending";
  if (normalized === "klop") return "KLOP";
  if (normalized === "kurang") return `KURANG ${Math.abs(Number(variance) || 0)}`;
  if (normalized === "lebih") return `LEBIH ${Math.abs(Number(variance) || 0)}`;
  return "PENDING";
}

function buildDashboardStatusInfo() {
  const activeRows = inputSectionRows.value.filter(
    (row) => Number(row.belumDiambilQty || 0) > 0 || Number(row.fisikBarangQty || 0) > 0,
  );

  if (!activeRows.length) {
    return { status: "pending", label: "PENDING", monthLabel: "Belum ada data" };
  }

  const totalSistemQty = activeRows.reduce((sum, row) => sum + Number(row.belumDiambilQty || 0), 0);
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

const belumDiambilStatusInfo = computed(() => buildDashboardStatusInfo());

const monthFilterThreshold = computed(() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 5, 1);
});

const displayedInputSectionRows = computed(() => {
  if (showAllMonths.value) return inputSectionRows.value;

  return inputSectionRows.value.filter((item) => {
    const monthDate = parseMonthStart(item.bulan);
    if (!monthDate) return true;

    const isOlderThan6Months = monthDate < monthFilterThreshold.value;
    if (!isOlderThan6Months) return true;

    return item.status !== "klop";
  });
});

const hiddenOlderKlopCount = computed(() => {
  if (showAllMonths.value) return 0;

  return inputSectionRows.value.filter((item) => {
    const monthDate = parseMonthStart(item.bulan);
    if (!monthDate) return false;

    const isOlderThan6Months = monthDate < monthFilterThreshold.value;
    return isOlderThan6Months && item.status === "klop";
  }).length;
});

async function loadManagementData() {
  const userId = currentUserId.value;
  if (!userId) {
    managementRows.value = [];
    return;
  }

  const data = await getOrderOnlineManagementByUser(userId);
  managementRows.value = data.orders || [];
}

async function initializeManagementMonths(orderBelumDiambilRows) {
  const userId = currentUserId.value;
  if (!userId) return 0;

  const grouped = groupOrderByMonth(orderBelumDiambilRows, { statusPengambilan: "BELUM_DIAMBIL" });
  const currentMonths = new Map((managementRows.value || []).map((item) => [item.bulan, Number(item.sistemDataQty)]));
  const tasks = [];

  for (const [bulan, monthData] of Object.entries(grouped)) {
    const nextCount = Number(monthData.qty || 0);
    if (currentMonths.has(bulan) && currentMonths.get(bulan) === nextCount) continue;
    tasks.push(initializeOrderMonthRecord(userId, bulan, nextCount));
  }

  if (!tasks.length) return 0;
  await Promise.all(tasks);
  return tasks.length;
}

async function loadDashboardCards() {
  const data = await fetchOrderOnlineByRangeForManagement(ORDER_QUERY_START, ORDER_QUERY_END);
  allOrderData.value = data;

  let belumDiambil = 0;
  let sudahDiambil = 0;
  let totalOrder = 0;
  const belumDiambilRows = [];

  data.forEach((item) => {
    const qty = getOrderQty(item);
    totalOrder += qty;

    if (item.statusPengambilan === "BELUM_DIAMBIL") {
      belumDiambil += qty;
      belumDiambilRows.push(item);
      return;
    }

    if (item.statusPengambilan === "SUDAH_DIAMBIL") {
      sudahDiambil += qty;
    }
  });

  dashboardCards.value = { belumDiambil, sudahDiambil, totalOrder };

  const updates = await initializeManagementMonths(belumDiambilRows);
  if (updates > 0) {
    await loadManagementData();
  }
}

async function refreshDashboard() {
  await loadManagementData();
  await loadDashboardCards();
}

function toggleMonthVisibility() {
  showAllMonths.value = !showAllMonths.value;
}

function openUpdateModal(item) {
  modalData.value = {
    bulan: item.bulan,
    sistemQty: item.belumDiambilQty,
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
    await updateOrderFisikBarangQty(
      userId,
      modalData.value.bulan,
      modalData.value.newQty,
      modalData.value.notes,
      staffName,
      { sistemQty: modalData.value.sistemQty },
    );

    await refreshDashboard();
    closeUpdateModal();
    await swal("Data berhasil diperbarui");
  } catch (error) {
    console.error("Error updating order management data:", error);
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

function getStatusAlertClass(status) {
  const classes = {
    klop: "alert-success",
    kurang: "alert-danger",
    lebih: "alert-warning",
    pending: "alert-light",
  };
  return classes[status] || "alert-light";
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

onMounted(async () => {
  try {
    await refreshDashboard();
  } catch (error) {
    console.error("Error initializing order management view:", error);
  } finally {
    isInitializing.value = false;
  }
});
</script>

<style scoped>
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
</style>
