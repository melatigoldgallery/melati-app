<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-sliders me-2 text-dark"></i>
        Manajemen Absensi
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/absensi/kehadiran">Absensi</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Manajemen Absensi</li>
        </ol>
      </nav>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-header p-3">
        <ul class="nav nav-tabs card-header-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link" :class="{ active: activeTab === 'headcount' }" @click="activeTab = 'headcount'">
              <i class="fas fa-user-clock me-1"></i>
              Lembur Headcount
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" :class="{ active: activeTab === 'code' }" @click="activeTab = 'code'">
              <i class="fas fa-key me-1"></i>
              Kode Verifikasi
            </button>
          </li>
        </ul>
      </div>

      <div class="card-body">
        <div v-show="activeTab === 'headcount'">
          <div class="row g-2 align-items-end">
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Tanggal</label>
              <input v-model="overtimeDate" type="date" class="form-control form-control-sm" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Nama Staf</label>
              <input
                v-model="overtimeName"
                type="text"
                class="form-control form-control-sm"
                placeholder="Masukkan nama staf"
              />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold mb-1">Alasan</label>
              <input v-model="overtimeReason" type="text" class="form-control form-control-sm" />
            </div>
            <div class="col-md-1 d-grid">
              <button class="btn btn-primary btn-sm" @click="saveManualOvertime" :disabled="overtimeSaving">
                <span v-if="overtimeSaving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </div>

          <div class="border-top pt-3 mt-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h6 class="mb-0">
                <i class="fas fa-history me-2 text-secondary"></i>
                Riwayat Headcount
              </h6>
            </div>

            <div class="row g-2 align-items-end">
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Tanggal Mulai</label>
                <input v-model="historyStartDate" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Tanggal Akhir</label>
                <input v-model="historyEndDate" type="date" class="form-control form-control-sm" />
              </div>
            </div>

            <div class="table-responsive mt-3">
              <table class="table table-sm table-striped mb-0">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama Staf</th>
                    <th>Alasan</th>
                    <th>Dibuat Oleh</th>
                    <th class="text-center" style="width: 90px">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="headcountHistory.length === 0">
                    <td colspan="5" class="text-center text-muted py-3">
                      Belum ada riwayat headcount pada rentang ini.
                    </td>
                  </tr>
                  <tr v-for="row in headcountHistory" :key="row.id">
                    <td>{{ formatDateId(row.date) }}</td>
                    <td>{{ row.name || "-" }}</td>
                    <td>{{ row.reason || "Penambahan Headcount" }}</td>
                    <td class="text-muted">{{ row.createdBy || "-" }}</td>
                    <td class="text-center">
                      <button
                        class="btn btn-outline-danger btn-xs"
                        @click="deleteManualOvertime(row)"
                        :disabled="deletingOvertimeId === row.id"
                        title="Hapus data headcount"
                      >
                        <span v-if="deletingOvertimeId === row.id" class="spinner-border spinner-border-sm"></span>
                        <i v-else class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'code'">
          <div class="row g-2 align-items-end">
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Tanggal</label>
              <input v-model="codeDate" type="date" class="form-control form-control-sm" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Shift</label>
              <select v-model="codeShift" class="form-select form-select-sm">
                <option value="morning">Shift Pagi</option>
                <option value="afternoon">Shift Sore</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">ID Sales (Wajib)</label>
              <input
                v-model="codeEmployeeId"
                type="text"
                class="form-control form-control-sm"
                placeholder="Contoh: EMP123"
              />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold mb-1">Nama Sales</label>
              <input
                v-model="codeEmployeeName"
                type="text"
                class="form-control form-control-sm"
                placeholder="Nama sales"
              />
            </div>
            <div class="col-md-1 d-grid">
              <button class="btn btn-primary btn-sm text-white" @click="generateLateCode" :disabled="codeGenerating">
                <span v-if="codeGenerating" class="spinner-border spinner-border-sm"></span>
                <span v-else>Buat</span>
              </button>
            </div>
          </div>

          <div class="border-top pt-3 mt-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h6 class="mb-0">
                <i class="fas fa-history me-2 text-secondary"></i>
                Data Kode Verifikasi
              </h6>
            </div>

            <div class="row g-2 align-items-end">
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Tanggal Mulai</label>
                <input v-model="codeStartDate" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Tanggal Akhir</label>
                <input v-model="codeEndDate" type="date" class="form-control form-control-sm" />
              </div>
            </div>

            <div class="table-responsive mt-3">
              <table class="table table-sm table-striped mb-0">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Shift</th>
                    <th>Pengguna</th>
                    <th>Status</th>
                    <th>Sudah Digunakan Oleh</th>
                    <th>Waktu Digunakan</th>
                    <th class="text-center" style="width: 90px">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="latePermissionCodes.length === 0">
                    <td colspan="7" class="text-center text-muted py-3">Belum ada kode pada rentang tanggal ini.</td>
                  </tr>
                  <tr v-for="row in latePermissionCodes" :key="row.id">
                    <td class="fw-semibold" style="letter-spacing: 0.5px">{{ row.code || row.id }}</td>
                    <td>{{ row.shift === "afternoon" ? "Shift Sore" : "Shift Pagi" }}</td>
                    <td>
                      <span v-if="row.employeeId || row.employeeName">
                        {{ row.employeeName || "-" }}
                        <span class="text-muted">({{ row.employeeId || "-" }})</span>
                      </span>
                      <span v-else class="text-muted">Umum</span>
                    </td>
                    <td>
                      <span class="badge" :class="row.used ? 'bg-success' : 'bg-warning text-dark'">
                        {{ row.used ? "Sudah Digunakan" : "Belum Digunakan" }}
                      </span>
                    </td>
                    <td>{{ row.usedByName || "-" }}</td>
                    <td>{{ formatDateTimeId(row.usedAt) }}</td>
                    <td class="text-center">
                      <button
                        class="btn btn-outline-danger btn-xs"
                        @click="deleteLateCode(row)"
                        :disabled="deletingCodeId === row.id"
                        title="Hapus kode"
                      >
                        <span v-if="deletingCodeId === row.id" class="spinner-border spinner-border-sm"></span>
                        <i v-else class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import {
  addManualOvertimeEntry,
  deleteManualOvertimeEntry,
  subscribeManualOvertimeByDate,
  subscribeManualOvertimeByDateRange,
  createLatePermissionCode,
  subscribeLatePermissionCodesByDateRange,
  deleteLatePermissionCode,
} from "@/services/absensi-service";

const auth = useAuthStore();

function todayDateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const overtimeDate = ref(todayDateLocal());
const overtimeName = ref("");
const overtimeReason = ref("Penambahan Headcount");
const overtimeSaving = ref(false);
const overtimeManualList = ref([]);
const deletingOvertimeId = ref(null);

const historyStartDate = ref(todayDateLocal());
const historyEndDate = ref(todayDateLocal());
const headcountHistory = ref([]);

const codeDate = ref(todayDateLocal());
const codeShift = ref("morning");
const codeEmployeeId = ref("");
const codeEmployeeName = ref("");
const codeNote = ref("");
const codeDataFilter = ref("");
const codeStartDate = ref(todayDateLocal());
const codeEndDate = ref(todayDateLocal());
const codeGenerating = ref(false);
const latePermissionCodesRaw = ref([]);
const deletingCodeId = ref(null);

const latePermissionCodes = computed(() => {
  const keyword = codeDataFilter.value.trim().toUpperCase();
  if (!keyword) return latePermissionCodesRaw.value;

  return latePermissionCodesRaw.value.filter((row) => {
    const codeValue = String(row.code || row.id || "").toUpperCase();
    return codeValue.includes(keyword);
  });
});

const activeTab = ref("headcount");

let unsubOvertimeManual = null;
let unsubHeadcountHistory = null;
let unsubLatePermissionCodes = null;

function showSwal(type, message) {
  const iconMap = {
    success: "success",
    warning: "warning",
    danger: "error",
    info: "info",
  };
  const titleMap = {
    success: "Berhasil",
    warning: "Perhatian",
    danger: "Gagal",
    info: "Informasi",
  };

  return Swal.fire({
    icon: iconMap[type] || "info",
    title: titleMap[type] || "Informasi",
    text: message,
    confirmButtonText: "OK",
  });
}

function formatDateId(dateStr) {
  if (!dateStr) return "";
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return dateStr;
}

function formatDateTimeId(value) {
  if (!value) return "-";

  let date = null;
  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (Number.isFinite(value?.seconds)) {
    date = new Date(value.seconds * 1000);
  } else {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function subscribeManualOvertime() {
  if (!overtimeDate.value) return;
  if (unsubOvertimeManual) unsubOvertimeManual();
  unsubOvertimeManual = subscribeManualOvertimeByDate(overtimeDate.value, (rows) => {
    overtimeManualList.value = rows;
  });
}

function subscribeHeadcountHistory() {
  if (!historyStartDate.value || !historyEndDate.value) return;
  if (unsubHeadcountHistory) unsubHeadcountHistory();

  const start = historyStartDate.value <= historyEndDate.value ? historyStartDate.value : historyEndDate.value;
  const end = historyStartDate.value <= historyEndDate.value ? historyEndDate.value : historyStartDate.value;

  unsubHeadcountHistory = subscribeManualOvertimeByDateRange(start, end, (rows) => {
    headcountHistory.value = rows;
  });
}

async function saveManualOvertime() {
  const name = overtimeName.value.trim();
  const date = overtimeDate.value;
  const reason = overtimeReason.value.trim() || "Penambahan Headcount";

  if (!date || !name) {
    showSwal("warning", "Tanggal dan nama staf wajib diisi.");
    return;
  }

  overtimeSaving.value = true;
  try {
    await addManualOvertimeEntry({
      date,
      name,
      reason,
      createdBy: auth.user?.uid || "",
    });
    overtimeName.value = "";
    overtimeReason.value = "Penambahan Headcount";
    showSwal("success", "Data lembur manual berhasil disimpan.");
  } catch (e) {
    showSwal("danger", `Gagal menyimpan data lembur manual: ${e.message}`);
  } finally {
    overtimeSaving.value = false;
  }
}

async function deleteManualOvertime(row) {
  if (!row?.id) return;

  const result = await Swal.fire({
    icon: "warning",
    title: "Hapus Data Lembur?",
    text: `Data lembur untuk ${row.name || "staf ini"} akan dihapus permanen.`,
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
  });

  if (!result.isConfirmed) return;

  deletingOvertimeId.value = row.id;
  try {
    await deleteManualOvertimeEntry(row.id);
    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Data lembur manual berhasil dihapus.",
      confirmButtonColor: "#198754",
    });
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Gagal",
      text: e.message || "Gagal menghapus data lembur manual.",
      confirmButtonColor: "#dc3545",
    });
  } finally {
    deletingOvertimeId.value = null;
  }
}

function subscribeLatePermissionCodes() {
  if (!codeStartDate.value || !codeEndDate.value) return;
  if (unsubLatePermissionCodes) unsubLatePermissionCodes();

  const start = codeStartDate.value <= codeEndDate.value ? codeStartDate.value : codeEndDate.value;
  const end = codeStartDate.value <= codeEndDate.value ? codeEndDate.value : codeStartDate.value;

  unsubLatePermissionCodes = subscribeLatePermissionCodesByDateRange(start, end, (rows) => {
    latePermissionCodesRaw.value = rows;
  });
}

async function generateLateCode() {
  if (!codeDate.value) {
    showSwal("warning", "Tanggal kode verifikasi wajib diisi.");
    return;
  }
  if (!codeEmployeeId.value.trim()) {
    showSwal("warning", "ID Sales wajib diisi.");
    return;
  }

  codeGenerating.value = true;
  try {
    const code = await createLatePermissionCode({
      date: codeDate.value,
      shift: codeShift.value,
      employeeId: codeEmployeeId.value.trim(),
      employeeName: codeEmployeeName.value.trim(),
      note: codeNote.value.trim(),
      createdBy: auth.user?.uid || "",
    });

    await Swal.fire({
      icon: "success",
      title: "Kode Berhasil Dibuat",
      html: `
        <div class="small text-muted mb-1">Simpan kode ini untuk staf terkait:</div>
        <div class="fw-bold fs-4" style="letter-spacing:1px;">${code}</div>
        <div class="small text-muted mt-2">Tanggal: ${formatDateId(codeDate.value)} | Shift: ${codeShift.value === "afternoon" ? "Shift Sore" : "Shift Pagi"}</div>
      `,
      confirmButtonText: "OK",
    });
  } catch (e) {
    showSwal("danger", `Gagal membuat kode verifikasi: ${e.message}`);
  } finally {
    codeGenerating.value = false;
  }
}

async function deleteLateCode(row) {
  if (!row?.id) return;

  const result = await Swal.fire({
    icon: "warning",
    title: "Hapus Kode Verifikasi?",
    text: `Kode ${row.code || row.id} akan dihapus permanen.`,
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
  });

  if (!result.isConfirmed) return;

  deletingCodeId.value = row.id;
  try {
    await deleteLatePermissionCode(row.id);
    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Kode verifikasi berhasil dihapus.",
      confirmButtonColor: "#198754",
    });
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Gagal",
      text: e.message || "Gagal menghapus kode verifikasi.",
      confirmButtonColor: "#dc3545",
    });
  } finally {
    deletingCodeId.value = null;
  }
}

watch(overtimeDate, () => {
  subscribeManualOvertime();
});

watch([codeStartDate, codeEndDate], () => {
  subscribeLatePermissionCodes();
});

watch([historyStartDate, historyEndDate], () => {
  subscribeHeadcountHistory();
});

onMounted(() => {
  subscribeManualOvertime();
  subscribeHeadcountHistory();
  subscribeLatePermissionCodes();
});

onUnmounted(() => {
  unsubOvertimeManual?.();
  unsubHeadcountHistory?.();
  unsubLatePermissionCodes?.();
});
</script>

<style scoped>
.btn-xs {
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  line-height: 1.2;
}
</style>
