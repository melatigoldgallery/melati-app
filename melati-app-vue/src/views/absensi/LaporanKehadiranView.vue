<template>
  <div class="page-content">
    <!-- Page Header -->
    <div class="page-header">
      <h1>
        <i class="bi bi-calendar-check me-2 text-dark"></i>
        Laporan Kehadiran
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/absensi/kehadiran">Absensi</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Kehadiran</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <!-- Filter Card -->
      <div class="card mb-4">
        <div class="card-header">
          <h2>
            <i class="fas fa-filter me-2"></i>
            Filter Laporan
          </h2>
        </div>
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Dari</label>
              <input v-model="filter.startDate" type="date" class="form-control form-control-sm" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Sampai</label>
              <input v-model="filter.endDate" type="date" class="form-control form-control-sm" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Shift</label>
              <select v-model="filter.shift" class="form-select form-select-sm">
                <option value="">Semua Shift</option>
                <option value="morning">Pagi</option>
                <option value="afternoon">Sore</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Status</label>
              <select v-model="filter.status" class="form-select form-select-sm">
                <option value="">Semua Status</option>
                <option value="Tepat Waktu">Tepat Waktu</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin Terlambat">Izin Terlambat</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold mb-1">Tipe Karyawan</label>
              <select v-model="filter.empType" class="form-select form-select-sm">
                <option value="">Semua Tipe</option>
                <option value="staff">Staff</option>
                <option value="ob">Office Boy</option>
              </select>
            </div>
            <div class="col-md-auto">
              <button class="btn btn-primary btn-sm" @click="loadReport" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="fas fa-search me-1"></i>
                Tampilkan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div v-if="filteredRows.length > 0" class="row g-2 mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-primary bg-opacity-10 p-3">
                <i class="fas fa-users text-primary fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-primary">{{ filteredRows.length }}</div>
                <div class="small text-muted">Total Absensi</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-success bg-opacity-10 p-3">
                <i class="fas fa-check-circle text-success fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-success">{{ countBy("Tepat Waktu") }}</div>
                <div class="small text-muted">Tepat Waktu</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-danger bg-opacity-10 p-3">
                <i class="fas fa-times-circle text-danger fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-danger">{{ countBy("Terlambat") }}</div>
                <div class="small text-muted">Terlambat</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-info bg-opacity-10 p-3">
                <i class="fas fa-clock text-info fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-info">{{ countBy("Izin Terlambat") }}</div>
                <div class="small text-muted">Izin Terlambat</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="filteredRows.length > 0" class="d-flex justify-content-between mb-3">
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" @click="exportExcel">
            <i class="fas fa-file-excel me-1"></i>
            Export Excel
          </button>
          <button class="btn btn-danger btn-sm" @click="exportPDF">
            <i class="fas fa-file-pdf me-1"></i>
            Export PDF
          </button>
        </div>
        <button v-if="isSupervisor" class="btn btn-outline-danger btn-sm" @click="showDeleteConfirm">
          <i class="fas fa-trash-alt me-1"></i>
          Hapus Data
        </button>
      </div>

      <!-- Table Card -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h2>
            <i class="fas fa-table me-2"></i>
            Data Kehadiran
          </h2>
          <span v-if="filteredRows.length > 0" class="badge bg-secondary">
            {{ filteredRows.length }} data • Halaman {{ currentPage }}/{{ totalPages }}
          </span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>No</th>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Shift</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Durasi</th>
                  <th style="width: 200px">Status</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="11" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-warning" role="status"></div>
                  </td>
                </tr>
                <tr v-else-if="displayRows.length === 0">
                  <td colspan="11" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle me-2"></i>
                    Tidak ada data kehadiran untuk periode yang dipilih.
                  </td>
                </tr>
                <tr v-for="(r, i) in displayRows" :key="r.id">
                  <td class="small">{{ i + 1 }}</td>
                  <td class="small text-muted">{{ r.employeeId || "-" }}</td>
                  <td class="small fw-medium">{{ r.name }}</td>
                  <td class="small">{{ r.date }}</td>
                  <td class="small">{{ formatEmployeeType(r.type) }}</td>
                  <td class="small">{{ formatShift(r.shift) }}</td>
                  <td class="small">{{ formatTs(r.timeIn) }}</td>
                  <td class="small">{{ r.timeOut ? formatTs(r.timeOut) : "-" }}</td>
                  <td class="small">{{ calculateWorkDuration(r.timeIn, r.timeOut) }}</td>
                  <td class="">
                    <div class="d-flex justify-content-start gap-2">
                      <span class="badge status-badge" :class="statusBadge(r.status)">{{ r.status }}</span>
                      <span v-if="r.lateMinutes" class="text-muted small ms-1">({{ r.lateMinutes }} mnt)</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-outline-warning btn-xs me-1" @click="openEditWithPassword(r)" title="Edit">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-xs" @click="showDeleteConfirmRow(r)" title="Hapus">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredRows.length > 0" class="card-footer d-flex justify-content-between align-items-center gap-3">
          <div class="text-muted small">
            Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} -
            {{ Math.min(currentPage * itemsPerPage, filteredRows.length) }} dari {{ filteredRows.length }} data
          </div>
          <nav aria-label="Page navigation">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button
                  class="page-link"
                  @click="currentPage = 1"
                  :disabled="currentPage === 1"
                  title="Halaman pertama"
                >
                  <i class="fas fa-angles-left"></i>
                </button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button
                  class="page-link"
                  @click="currentPage--"
                  :disabled="currentPage === 1"
                  title="Halaman sebelumnya"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
              </li>

              <li v-for="page in visiblePages" :key="page" class="page-item" :class="{ active: page === currentPage }">
                <button class="page-link" @click="currentPage = page">{{ page }}</button>
              </li>

              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button
                  class="page-link"
                  @click="currentPage++"
                  :disabled="currentPage === totalPages"
                  title="Halaman berikutnya"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button
                  class="page-link"
                  @click="currentPage = totalPages"
                  :disabled="currentPage === totalPages"
                  title="Halaman terakhir"
                >
                  <i class="fas fa-angles-right"></i>
                </button>
              </li>
            </ul>
          </nav>
          <select v-model.number="itemsPerPage" class="form-select form-select-sm" style="width: 100px">
            <option :value="5">5 item</option>
            <option :value="10">10 item</option>
            <option :value="20">20 item</option>
            <option :value="50">50 item</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Modal: Password ───────────────────────────────────────────── -->
    <div class="modal fade" id="passwordModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="fas fa-lock me-2"></i>
              Konfirmasi Password
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Perhatian!</strong>
              Anda akan mengedit data kehadiran.
            </div>
            <div class="mb-3">
              <label class="form-label">Masukkan Kode Akses Edit:</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-key"></i></span>
                <input
                  :type="showPwd ? 'text' : 'password'"
                  v-model="adminPassword"
                  class="form-control"
                  :class="{ 'is-invalid': pwdError }"
                  placeholder="Kode akses edit"
                  @keypress.enter="confirmPassword"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showPwd = !showPwd">
                  <i :class="showPwd ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
                <div class="invalid-feedback">{{ pwdError }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning" @click="confirmPassword">
              <i class="fas fa-unlock me-2"></i>
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Edit ───────────────────────────────────────────────── -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-edit me-2"></i>
              Edit Data Kehadiran
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="editForm">
            <div class="row mb-3">
              <div class="col-6">
                <p class="text-muted mb-0 small">ID Karyawan</p>
                <p class="fw-bold">{{ editForm.employeeId }}</p>
              </div>
              <div class="col-6">
                <p class="text-muted mb-0 small">Nama</p>
                <p class="fw-bold">{{ editForm.name }}</p>
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <p class="text-muted mb-0 small">Tanggal</p>
                <p class="fw-bold">{{ editForm.date }}</p>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Shift</label>
                <select v-model="editForm.shift" class="form-select form-select-sm">
                  <option value="morning">Pagi</option>
                  <option value="afternoon">Sore</option>
                </select>
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">
                  Waktu Masuk
                  <span class="text-danger">*</span>
                </label>
                <input v-model="editForm.timeInStr" type="time" class="form-control form-control-sm" />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Waktu Pulang</label>
                <input v-model="editForm.timeOutStr" type="time" class="form-control form-control-sm" />
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">
                  Status
                  <span class="text-danger">*</span>
                </label>
                <select v-model="editForm.status" class="form-select form-select-sm" @change="onEditStatusChange">
                  <option value="Tepat Waktu">Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Izin Terlambat">Izin Terlambat</option>
                </select>
              </div>
              <div v-if="editForm.status === 'Terlambat' || editForm.status === 'Izin Terlambat'" class="col-6">
                <label class="form-label small fw-semibold">Menit Terlambat</label>
                <input
                  v-model.number="editForm.lateMinutes"
                  type="number"
                  min="0"
                  max="480"
                  class="form-control form-control-sm"
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-primary" @click="saveEdit" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="fas fa-save me-1"></i>
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Delete Confirm ─────────────────────────────────────── -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Konfirmasi Hapus Data
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-circle me-2"></i>
              <strong>Perhatian!</strong>
              Tindakan ini tidak dapat dibatalkan.
            </div>
            <p>
              Anda yakin ingin menghapus semua data kehadiran periode
              <strong>{{ filter.startDate }}</strong>
              s/d
              <strong>{{ filter.endDate }}</strong>
              ?
            </p>
            <p class="text-muted small">
              Data yang dihapus tidak dapat dikembalikan. Pastikan Anda telah mengekspor data terlebih dahulu.
            </p>
            <div class="mb-0">
              <label class="form-label small fw-semibold">Kode Akses Hapus</label>
              <input
                v-model="deletePassword"
                type="password"
                class="form-control form-control-sm"
                :class="{ 'is-invalid': deletePwdError }"
                placeholder="Masukkan kode akses"
                @keypress.enter="deleteData"
              />
              <div class="invalid-feedback">{{ deletePwdError }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-danger" @click="deleteData" :disabled="deleting">
              <span v-if="deleting" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="fas fa-trash-alt me-1"></i>
              Ya, Hapus Data
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Delete Row Confirm ────────────────────────────────── -->
    <div class="modal fade" id="deleteRowModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Konfirmasi Hapus Data
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" v-if="deleteRowRecord">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-circle me-2"></i>
              <strong>Perhatian!</strong>
              Tindakan ini tidak dapat dibatalkan.
            </div>
            <p>Anda yakin ingin menghapus data kehadiran:</p>
            <div class="row mb-3">
              <div class="col-6">
                <p class="text-muted mb-1 small">Nama</p>
                <p class="fw-bold">{{ deleteRowRecord.name }}</p>
              </div>
              <div class="col-6">
                <p class="text-muted mb-1 small">Tanggal</p>
                <p class="fw-bold">{{ deleteRowRecord.date }}</p>
              </div>
            </div>
            <p class="text-muted small">Data yang dihapus tidak dapat dikembalikan.</p>
            <div class="mb-0">
              <label class="form-label small fw-semibold">Kode Akses Hapus</label>
              <input
                v-model="deleteRowPassword"
                type="password"
                class="form-control form-control-sm"
                :class="{ 'is-invalid': deleteRowPwdError }"
                placeholder="Masukkan kode akses"
                @keypress.enter="deleteRowData"
              />
              <div class="invalid-feedback">{{ deleteRowPwdError }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-danger" @click="deleteRowData" :disabled="deleting">
              <span v-if="deleting" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="fas fa-trash-alt me-1"></i>
              Ya, Hapus Data
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { useWITA } from "@/composables/useWITA";
import {
  fetchAttendanceByRange,
  updateAttendanceRecord,
  deleteAttendanceByDateRange,
  deleteAttendanceRecord,
  verifyEditLaporanKehadiranPassword,
  verifyDeleteLaporanKehadiranPassword,
} from "@/services/absensi-service";

const auth = useAuthStore();
const { todayStringWITA } = useWITA();

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const allRows = ref([]);

const today = todayStringWITA();
const filter = ref({ startDate: today, endDate: today, shift: "", status: "", empType: "" });

// Password modal
const adminPassword = ref("");
const showPwd = ref(false);
const pwdError = ref("");
const pendingEditRow = ref(null);
const pendingEditIndex = ref(null);
const deletePassword = ref("");
const deleteRowPassword = ref("");
const deletePwdError = ref("");
const deleteRowPwdError = ref("");

// Edit modal
const editForm = ref(null);

// Delete row modal
const deleteRowRecord = ref(null);
const deleteRowIndex = ref(null);

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

// ── Computed ───────────────────────────────────────────────────────────────
const isSupervisor = computed(() => auth.userRole === "supervisor");

const filteredRows = computed(() => {
  if (!filter.value.empType) return allRows.value;
  return allRows.value.filter((r) => (r.type || "").toLowerCase() === filter.value.empType);
});

const totalPages = computed(() => Math.ceil(filteredRows.value.length / itemsPerPage.value));

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredRows.value.slice(start, end);
});

const displayRows = computed(() => paginatedRows.value);

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

// ── Helpers ────────────────────────────────────────────────────────────────
function statusBadge(s) {
  if (s === "Tepat Waktu") return "bg-success";
  if (s === "Terlambat") return "bg-danger";
  return "bg-warning text-dark";
}

function countBy(status) {
  return filteredRows.value.filter((r) => r.status === status).length;
}

function formatTs(ts) {
  if (!ts) return "-";
  let d;
  if (ts && typeof ts.toDate === "function") d = ts.toDate();
  else if (ts && ts._seconds) d = new Date(ts._seconds * 1000);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function tsToTimeStr(ts) {
  if (!ts) return "";
  let d;
  if (ts && typeof ts.toDate === "function") d = ts.toDate();
  else if (ts && ts._seconds) d = new Date(ts._seconds * 1000);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toTimeString().substring(0, 5);
}

function formatShift(shift) {
  if (shift === "morning") return "Pagi";
  if (shift === "afternoon") return "Sore";
  return shift || "-";
}

function formatEmployeeType(type) {
  const typeMap = { staff: "Staff", ob: "Office Boy" };
  return typeMap[type] || type || "-";
}

function calculateWorkDuration(timeIn, timeOut) {
  if (!timeIn || !timeOut) return "-";
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end - start;
  if (diffMs < 0) return "-";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${minutes}m`;
}

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

function getModal(id) {
  const element = document.getElementById(id);
  if (!element) return null;
  return Modal.getOrCreateInstance(element);
}

// ── Load Report ────────────────────────────────────────────────────────────
async function loadReport() {
  if (!filter.value.startDate || !filter.value.endDate) {
    showSwal("warning", "Silakan pilih rentang tanggal terlebih dahulu.");
    return;
  }
  loading.value = true;
  currentPage.value = 1; // Reset to first page
  try {
    const data = await fetchAttendanceByRange(
      filter.value.startDate,
      filter.value.endDate,
      filter.value.shift || undefined,
      filter.value.status || undefined,
    );
    allRows.value = data.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  } catch (e) {
    showSwal("danger", `Gagal memuat laporan: ${e.message}`);
  } finally {
    loading.value = false;
  }
}

// ── Edit (with password) ───────────────────────────────────────────────────
function openEditWithPassword(row) {
  const filterStart = filteredRows.value.findIndex((r) => r.id === row.id);

  pendingEditRow.value = row;
  pendingEditIndex.value = filterStart !== -1 ? allRows.value.findIndex((r) => r.id === row.id) : 0;
  adminPassword.value = "";
  pwdError.value = "";
  showPwd.value = false;
  nextTick(() => getModal("passwordModal")?.show());
}

async function confirmPassword() {
  const password = String(adminPassword.value ?? "").trim();
  adminPassword.value = password;
  if (!password) {
    pwdError.value = "Kode akses wajib diisi.";
    return;
  }

  try {
    const valid = await verifyEditLaporanKehadiranPassword(password);
    if (!valid) {
      pwdError.value = "Kode akses salah.";
      return;
    }
  } catch (e) {
    pwdError.value = "Gagal memverifikasi kode akses. Coba lagi.";
    showSwal("danger", `Gagal memverifikasi kode akses: ${e.message}`);
    return;
  }
  pwdError.value = "";
  getModal("passwordModal")?.hide();
  nextTick(() => {
    const row = pendingEditRow.value;
    editForm.value = {
      id: row.id,
      employeeId: row.employeeId || "-",
      name: row.name || "-",
      date: row.date || "-",
      shift: row.shift || "morning",
      timeInStr: tsToTimeStr(row.timeIn),
      timeOutStr: row.timeOut ? tsToTimeStr(row.timeOut) : "",
      status: row.status || "Tepat Waktu",
      lateMinutes: row.lateMinutes || 0,
    };
    getModal("editModal")?.show();
  });
}

function onEditStatusChange() {
  if (editForm.value && editForm.value.status === "Tepat Waktu") {
    editForm.value.lateMinutes = 0;
  }
}

async function saveEdit() {
  const f = editForm.value;
  if (!f.timeInStr || !f.status || !f.shift) {
    showSwal("warning", "Waktu masuk, shift, dan status harus diisi.");
    return;
  }

  saving.value = true;
  try {
    const baseDate = new Date(f.date + "T00:00:00");

    const [hIn, mIn] = f.timeInStr.split(":").map(Number);
    const timeIn = new Date(baseDate);
    timeIn.setHours(hIn, mIn, 0, 0);

    const updateData = {
      timeIn,
      shift: f.shift,
      status: f.status,
      lateMinutes: f.status === "Terlambat" || f.status === "Izin Terlambat" ? f.lateMinutes || 0 : null,
    };

    if (f.timeOutStr) {
      const [hOut, mOut] = f.timeOutStr.split(":").map(Number);
      const timeOut = new Date(baseDate);
      timeOut.setHours(hOut, mOut, 0, 0);
      if (timeOut <= timeIn) timeOut.setDate(timeOut.getDate() + 1);
      updateData.timeOut = timeOut;
    } else {
      updateData.timeOut = null;
    }

    await updateAttendanceRecord(f.id, updateData);

    // Update local row
    const idx = pendingEditIndex.value;
    if (idx !== null && allRows.value[idx]) {
      Object.assign(allRows.value[idx], updateData);
    }

    getModal("editModal")?.hide();
    // Adjust pagination if necessary
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
    showSwal("success", "Data kehadiran berhasil diperbarui.");
  } catch (e) {
    showSwal("danger", `Gagal memperbarui data: ${e.message}`);
  } finally {
    saving.value = false;
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
function showDeleteConfirm() {
  deletePassword.value = "";
  deletePwdError.value = "";
  getModal("deleteModal")?.show();
}

async function deleteData() {
  deletePwdError.value = "";
  const password = String(deletePassword.value ?? "").trim();
  deletePassword.value = password;
  if (!password) {
    deletePwdError.value = "Kode akses wajib diisi.";
    return;
  }

  try {
    const valid = await verifyDeleteLaporanKehadiranPassword(password);
    if (!valid) {
      deletePwdError.value = "Kode akses salah.";
      return;
    }
  } catch (e) {
    deletePwdError.value = "Gagal memverifikasi kode akses. Coba lagi.";
    showSwal("danger", `Gagal memverifikasi kode akses: ${e.message}`);
    return;
  }

  deleting.value = true;
  try {
    const count = await deleteAttendanceByDateRange(filter.value.startDate, filter.value.endDate);
    allRows.value = [];
    currentPage.value = 1;
    getModal("deleteModal")?.hide();
    deletePassword.value = "";
    deletePwdError.value = "";
    showSwal("success", `Berhasil menghapus ${count} data kehadiran.`);
  } catch (e) {
    showSwal("danger", `Gagal menghapus data: ${e.message}`);
  } finally {
    deleting.value = false;
  }
}

// ── Delete Single Row ──────────────────────────────────────────────
function showDeleteConfirmRow(row) {
  deleteRowRecord.value = row;
  deleteRowIndex.value = allRows.value.findIndex((r) => r.id === row.id);
  deleteRowPassword.value = "";
  deleteRowPwdError.value = "";
  nextTick(() => getModal("deleteRowModal")?.show());
}

async function deleteRowData() {
  if (deleteRowRecord.value === null) return;

  deleteRowPwdError.value = "";
  const password = String(deleteRowPassword.value ?? "").trim();
  deleteRowPassword.value = password;
  if (!password) {
    deleteRowPwdError.value = "Kode akses wajib diisi.";
    return;
  }

  try {
    const valid = await verifyDeleteLaporanKehadiranPassword(password);
    if (!valid) {
      deleteRowPwdError.value = "Kode akses salah.";
      return;
    }
  } catch (e) {
    deleteRowPwdError.value = "Gagal memverifikasi kode akses. Coba lagi.";
    showSwal("danger", `Gagal memverifikasi kode akses: ${e.message}`);
    return;
  }

  deleting.value = true;
  try {
    const recordId = deleteRowRecord.value.id;

    // Delete the record using the service
    await deleteAttendanceRecord(recordId);

    // Remove from local array
    const idx = deleteRowIndex.value;
    if (idx !== null && allRows.value[idx]) {
      allRows.value.splice(idx, 1);
    }

    getModal("deleteRowModal")?.hide();
    // Adjust pagination if necessary
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
    deleteRowPassword.value = "";
    deleteRowPwdError.value = "";
    showSwal("success", "Data kehadiran berhasil dihapus.");
  } catch (e) {
    showSwal("danger", `Gagal menghapus data: ${e.message}`);
  } finally {
    deleting.value = false;
  }
}

// ── Export Excel ───────────────────────────────────────────────────────────
async function exportExcel() {
  const XLSX = (await import("xlsx")).default || (await import("xlsx"));
  const wsData = [
    ["Laporan Kehadiran"],
    ["Melati Gold Shop"],
    [`Periode: ${filter.value.startDate} s/d ${filter.value.endDate}`],
    [],
    [
      "No",
      "ID Karyawan",
      "Nama",
      "Tanggal",
      "Tipe Karyawan",
      "Shift",
      "Jam Masuk",
      "Jam Keluar",
      "Durasi Kerja",
      "Status",
    ],
    ...displayRows.value.map((r, i) => [
      i + 1,
      r.employeeId || "-",
      r.name,
      r.date,
      formatEmployeeType(r.type),
      formatShift(r.shift),
      formatTs(r.timeIn),
      r.timeOut ? formatTs(r.timeOut) : "-",
      calculateWorkDuration(r.timeIn, r.timeOut),
      r.lateMinutes ? `${r.status} (${r.lateMinutes} mnt)` : r.status,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
  XLSX.writeFile(wb, `laporan-kehadiran-${filter.value.startDate}-${filter.value.endDate}.xlsx`);
}

// ── Export PDF ─────────────────────────────────────────────────────────────
async function exportPDF() {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Laporan Kehadiran", 14, 15);
  doc.setFontSize(11);
  doc.text("Melati Gold Shop", 14, 22);
  doc.setFontSize(10);
  doc.text(`Periode: ${filter.value.startDate} s/d ${filter.value.endDate}`, 14, 29);

  autoTable(doc, {
    startY: 35,
    head: [["No", "ID", "Nama", "Tanggal", "Tipe", "Shift", "Masuk", "Keluar", "Durasi", "Status"]],
    body: displayRows.value.map((r, i) => [
      i + 1,
      r.employeeId || "-",
      r.name,
      r.date,
      formatEmployeeType(r.type),
      formatShift(r.shift),
      formatTs(r.timeIn),
      r.timeOut ? formatTs(r.timeOut) : "-",
      calculateWorkDuration(r.timeIn, r.timeOut),
      r.lateMinutes ? `${r.status} (${r.lateMinutes} mnt)` : r.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [255, 180, 0] },
  });

  doc.save(`laporan-kehadiran-${filter.value.startDate}-${filter.value.endDate}.pdf`);
}
</script>

<style scoped>
.btn-xs {
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  line-height: 1.2;
}

.status-badge {
  display: inline-block;
  min-width: 85px;
  text-align: center;
  white-space: nowrap;
  font-size: 0.8rem;
  padding: 0.35rem 0.5rem;
}
</style>
