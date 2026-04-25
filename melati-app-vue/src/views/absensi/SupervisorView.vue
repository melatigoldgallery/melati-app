<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-person-check me-2 text-dark"></i>
        Status Pengajuan Izin
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/absensi/kehadiran">Absensi</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Status Pengajuan</li>
        </ol>
      </nav>
    </div>

    <!-- Stats Cards -->
    <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
      <span class="text-muted fw-semibold small text-uppercase">Statistik Pengajuan</span>
      <div class="d-flex align-items-center gap-2">
        <span
          v-if="loadingAll"
          class="spinner-border spinner-border-sm text-secondary"
          style="width: 14px; height: 14px"
        ></span>
        <label class="small text-muted mb-0">Bulan:</label>
        <input
          type="month"
          v-model="statsMonth"
          class="form-control form-control-sm"
          style="width: auto"
          :disabled="loadingAll"
        />
      </div>
    </div>
    <div class="row g-2 mb-4">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-3">
          <div
            class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-2"
            style="width: 42px; height: 42px"
          >
            <i class="fas fa-clipboard-list text-primary"></i>
          </div>
          <div class="fs-4 fw-bold text-primary">{{ stats.total }}</div>
          <div class="small text-muted">Total Pengajuan</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-3">
          <div
            class="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-2"
            style="width: 42px; height: 42px"
          >
            <i class="fas fa-check-circle text-success"></i>
          </div>
          <div class="fs-4 fw-bold text-success">{{ stats.approved }}</div>
          <div class="small text-muted">Disetujui</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-3">
          <div
            class="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-2"
            style="width: 42px; height: 42px"
          >
            <i class="fas fa-times-circle text-danger"></i>
          </div>
          <div class="fs-4 fw-bold text-danger">{{ stats.rejected }}</div>
          <div class="small text-muted">Ditolak</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-3">
          <div
            class="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-2"
            style="width: 42px; height: 42px"
          >
            <i class="fas fa-clock text-warning"></i>
          </div>
          <div class="fs-4 fw-bold text-warning">{{ pendingList.length }}</div>
          <div class="small text-muted">Menunggu</div>
        </div>
      </div>
    </div>

    <!-- Main Card with Tabs -->
    <div class="card shadow-sm mb-4">
      <div class="card-header p-3">
        <ul class="nav nav-tabs card-header-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link" :class="{ active: activeTab === 'pending' }" @click="switchTab('pending')">
              <i class="fas fa-clock me-1"></i>
              Menunggu Persetujuan
              <span v-if="pendingList.length > 0" class="badge bg-warning text-dark ms-1">
                {{ pendingList.length }}
              </span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" :class="{ active: activeTab === 'all' }" @click="switchTab('all')">
              <i class="fas fa-list me-1"></i>
              Semua Pengajuan
            </button>
          </li>
        </ul>
      </div>

      <div class="card-body p-3">
        <!-- ── TAB: PENDING ─────────────────────────────────────────────── -->
        <div v-show="activeTab === 'pending'">
          <!-- Search + page size for pending -->
          <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div class="input-group input-group-sm" style="max-width: 300px">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input
                v-model="pendingSearch"
                type="text"
                class="form-control"
                placeholder="Cari nama / ID..."
                @input="pendingPage = 1"
              />
            </div>
            <select
              v-model="pendingPageSize"
              class="form-select form-select-sm"
              style="width: auto"
              @change="pendingPage = 1"
            >
              <option :value="10">10 / hal</option>
              <option :value="25">25 / hal</option>
              <option :value="50">50 / hal</option>
            </select>
          </div>

          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Tanggal Izin</th>
                  <th>Alasan</th>
                  <th>Info Pengganti</th>
                  <th class="text-center">Surat Izin</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingPending">
                  <td colspan="7" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-warning me-2"></div>
                    Memuat data...
                  </td>
                </tr>
                <tr v-else-if="filteredPendingList.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-check-circle me-2 text-success"></i>
                    {{
                      pendingSearch ? "Tidak ada hasil pencarian." : "Tidak ada pengajuan yang menunggu persetujuan."
                    }}
                  </td>
                </tr>
                <tr v-for="req in paginatedPendingList" :key="req.id">
                  <td class="small text-muted">{{ req.employeeId || "-" }}</td>
                  <td class="small fw-medium">{{ req.name || "-" }}</td>
                  <td class="small">{{ formatPendingDate(req) }}</td>
                  <td
                    class="small text-muted"
                    style="max-width: 180px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
                    :title="req.reason || ''"
                  >
                    {{ req.reason || "-" }}
                  </td>
                  <td class="small" v-html="getReplacementInfo(req)"></td>
                  <td class="text-center">
                    <button
                      v-if="hasMedicalCert(req)"
                      class="btn btn-info btn-xs"
                      @click="viewMedicalCert(req.id)"
                      title="Lihat Surat"
                    >
                      <i class="fas fa-file-medical me-1"></i>
                      Lihat Surat
                    </button>
                    <span v-else class="text-muted small">-</span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex gap-1 justify-content-center flex-wrap">
                      <button
                        class="btn btn-success btn-xs"
                        @click="approvePending(req)"
                        :disabled="respondingId === req.id"
                      >
                        <span v-if="respondingId === req.id" class="spinner-border spinner-border-sm"></span>
                        <i v-else class="fas fa-check"></i>
                        Setuju
                      </button>
                      <button
                        class="btn btn-danger btn-xs"
                        @click="rejectPending(req)"
                        :disabled="respondingId === req.id"
                      >
                        <i class="fas fa-times"></i>
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination Pending -->
          <div
            v-if="pendingTotalPages > 1"
            class="d-flex justify-content-between align-items-center px-2 py-2 border-top"
          >
            <small class="text-muted">
              {{ (pendingPage - 1) * pendingPageSize + 1 }}–{{
                Math.min(pendingPage * pendingPageSize, filteredPendingList.length)
              }}
              dari {{ filteredPendingList.length }} data
            </small>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: pendingPage === 1 }">
                  <button class="page-link" @click="pendingPage = 1"><i class="fas fa-angle-double-left"></i></button>
                </li>
                <li class="page-item" :class="{ disabled: pendingPage === 1 }">
                  <button class="page-link" @click="pendingPage--"><i class="fas fa-angle-left"></i></button>
                </li>
                <li v-if="pendingPageNumbers[0] > 1" class="page-item disabled"><span class="page-link">…</span></li>
                <li v-for="p in pendingPageNumbers" :key="p" class="page-item" :class="{ active: p === pendingPage }">
                  <button class="page-link" @click="pendingPage = p">{{ p }}</button>
                </li>
                <li
                  v-if="pendingPageNumbers[pendingPageNumbers.length - 1] < pendingTotalPages"
                  class="page-item disabled"
                >
                  <span class="page-link">…</span>
                </li>
                <li class="page-item" :class="{ disabled: pendingPage === pendingTotalPages }">
                  <button class="page-link" @click="pendingPage++"><i class="fas fa-angle-right"></i></button>
                </li>
                <li class="page-item" :class="{ disabled: pendingPage === pendingTotalPages }">
                  <button class="page-link" @click="pendingPage = pendingTotalPages">
                    <i class="fas fa-angle-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <!-- ── TAB: SEMUA ───────────────────────────────────────────────── -->
        <div v-show="activeTab === 'all'">
          <!-- Filter + Search + Refresh -->
          <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
            <div>
              <label class="form-label small fw-semibold mb-1">Status Penggantian</label>
              <select
                v-model="replacementFilter"
                class="form-select form-select-sm"
                style="min-width: 180px"
                @change="allPage = 1"
              >
                <option value="">Semua Status</option>
                <option value="Belum Diganti">Belum Diganti</option>
                <option value="Sudah Diganti">Sudah Diganti</option>
                <option value="Tidak Perlu Diganti">Tidak Perlu Diganti</option>
              </select>
            </div>
            <div>
              <label class="form-label small fw-semibold mb-1">Cari</label>
              <input
                v-model="allSearch"
                type="text"
                class="form-control form-control-sm"
                placeholder="Nama / ID..."
                style="min-width: 160px"
                @input="allPage = 1"
              />
            </div>
            <div class="d-flex gap-2 align-items-end">
              <div>
                <label class="form-label small fw-semibold mb-1">Baris</label>
                <select
                  v-model="allPageSize"
                  class="form-select form-select-sm"
                  style="width: auto"
                  @change="allPage = 1"
                >
                  <option :value="10">10 / hal</option>
                  <option :value="25">25 / hal</option>
                  <option :value="50">50 / hal</option>
                </select>
              </div>
              <button
                class="btn btn-outline-secondary btn-sm"
                @click="refreshAll"
                :disabled="loadingAll"
                title="Refresh data"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingAll }"></i>
                Refresh
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Tanggal Izin</th>
                  <th>Alasan</th>
                  <th>Info Pengganti</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Status Ganti</th>
                  <th class="text-center">Aksi</th>
                  <th class="text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingAll">
                  <td colspan="9" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-warning me-2"></div>
                    Memuat data...
                  </td>
                </tr>
                <tr v-else-if="displayedAllRows.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle me-2"></i>
                    Tidak ada data dengan filter tersebut.
                  </td>
                </tr>
                <tr
                  v-for="(row, i) in paginatedAllRows"
                  :key="`${row._id}-${row._dayIndex ?? 'single'}`"
                  :class="{ 'first-day-row': row._isMultiDay && row._isFirstDay }"
                >
                  <td class="small text-muted">{{ row.employeeId || "-" }}</td>
                  <td class="small fw-medium">{{ row.name || "-" }}</td>
                  <td class="small">
                    {{ row._formattedDate }}
                    <span v-if="row._isMultiDay" class="badge bg-info ms-1">
                      Hari {{ row._dayIndex + 1 }}/{{ row._totalDays }}
                    </span>
                  </td>
                  <td class="small" style="max-width: 220px">
                    <div class="text-muted text-truncate-1" :title="row.reason || ''">{{ row.reason || "-" }}</div>
                    <div
                      v-if="isRejectedStatus(row.status) && row.rejectedReason"
                      class="text-danger-emphasis fst-italic mt-1 text-truncate-1"
                      :title="row.rejectedReason"
                    >
                      Alasan ditolak: {{ row.rejectedReason }}
                    </div>
                  </td>
                  <td class="small">{{ row._replacementInfo }}</td>
                  <td class="text-center">
                    <span class="badge" :class="statusBadge(row.status)">{{ row.status }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="replacementStatusBadge(row._dayStatus)">{{ row._dayStatus }}</span>
                  </td>
                  <td class="text-center">
                    <div class="d-flex gap-1 justify-content-center">
                      <button
                        v-if="canToggleReplacement(row)"
                        class="btn btn-xs"
                        :class="row._dayStatus === 'Sudah Diganti' ? 'btn-danger' : 'btn-success'"
                        @click="toggleReplacementStatus(row)"
                        :disabled="togglingId === `${row._id}-${row._dayIndex}`"
                      >
                        <span
                          v-if="togglingId === `${row._id}-${row._dayIndex}`"
                          class="spinner-border spinner-border-sm"
                        ></span>
                        <span v-else>{{ row._dayStatus === "Sudah Diganti" ? "Batalkan" : "Sudah Diganti" }}</span>
                      </button>
                      <button
                        v-if="row._isFirstDay && hasMedicalCert(row)"
                        class="btn btn-info btn-xs"
                        @click="viewMedicalCert(row._id)"
                        title="Lihat Surat Keterangan Sakit"
                      >
                        <i class="fas fa-file-medical me-1"></i>
                        Lihat Surat
                      </button>
                      <span
                        v-if="!canToggleReplacement(row) && !(row._isFirstDay && hasMedicalCert(row))"
                        class="text-muted small"
                      >
                        -
                      </span>
                    </div>
                  </td>
                  <td class="text-center">
                    <button
                      v-if="row._isFirstDay"
                      class="btn btn-outline-danger btn-xs"
                      @click="deletePending({ id: row._id, name: row.name })"
                      :disabled="deletingPendingId === row._id || respondingId === row._id"
                      title="Hapus pengajuan"
                    >
                      <span v-if="deletingPendingId === row._id" class="spinner-border spinner-border-sm"></span>
                      <i v-else class="fas fa-trash"></i>
                    </button>
                    <span v-else class="text-muted small">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination All -->
          <div v-if="allTotalPages > 1" class="d-flex justify-content-between align-items-center px-2 py-2 border-top">
            <small class="text-muted">
              {{ (allPage - 1) * allPageSize + 1 }}–{{ Math.min(allPage * allPageSize, displayedAllRows.length) }} dari
              {{ displayedAllRows.length }} data
            </small>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: allPage === 1 }">
                  <button class="page-link" @click="allPage = 1"><i class="fas fa-angle-double-left"></i></button>
                </li>
                <li class="page-item" :class="{ disabled: allPage === 1 }">
                  <button class="page-link" @click="allPage--"><i class="fas fa-angle-left"></i></button>
                </li>
                <li v-if="allPageNumbers[0] > 1" class="page-item disabled"><span class="page-link">…</span></li>
                <li v-for="p in allPageNumbers" :key="p" class="page-item" :class="{ active: p === allPage }">
                  <button class="page-link" @click="allPage = p">{{ p }}</button>
                </li>
                <li v-if="allPageNumbers[allPageNumbers.length - 1] < allTotalPages" class="page-item disabled">
                  <span class="page-link">…</span>
                </li>
                <li class="page-item" :class="{ disabled: allPage === allTotalPages }">
                  <button class="page-link" @click="allPage++"><i class="fas fa-angle-right"></i></button>
                </li>
                <li class="page-item" :class="{ disabled: allPage === allTotalPages }">
                  <button class="page-link" @click="allPage = allTotalPages">
                    <i class="fas fa-angle-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Surat Keterangan Sakit -->
    <div class="modal fade" id="medicalCertModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 520px">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title mb-0">
              <i class="fas fa-file-medical me-2 text-info"></i>
              Surat Keterangan Sakit
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center p-3">
            <div v-if="medicalCertLoading" class="py-4">
              <div class="spinner-border text-primary"></div>
              <p class="mt-2 small text-muted">Memuat dokumen...</p>
            </div>
            <template v-else-if="medicalCertFile">
              <img
                v-if="medicalCertFile.isImage"
                :src="medicalCertFile.url"
                alt="Surat Keterangan Sakit"
                style="max-width: 100%; max-height: 420px; object-fit: contain; border-radius: 6px"
              />
              <template v-else-if="medicalCertFile.isPdf">
                <embed
                  :src="medicalCertFile.url"
                  type="application/pdf"
                  width="100%"
                  height="380px"
                  style="border-radius: 6px"
                />
              </template>
              <p v-else class="text-muted small mb-2">Format file tidak dapat ditampilkan.</p>
              <div class="mt-2">
                <a
                  :href="medicalCertFile.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-outline-primary btn-sm"
                >
                  <i class="fas fa-external-link-alt me-1"></i>
                  Buka di Tab Baru
                </a>
              </div>
            </template>
            <p v-else class="text-muted py-3 small">Tidak ada surat keterangan sakit.</p>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import {
  subscribePendingLeaves,
  updateLeaveStatus,
  deleteLeaveRequest,
  fetchAllLeaves,
  fetchLeaveById,
  updateLeaveReplacementStatus,
} from "@/services/absensi-service";

const auth = useAuthStore();

// ── State ──────────────────────────────────────────────────────────────────
const loadingPending = ref(true);
const loadingAll = ref(false);
const pendingList = ref([]);
const allLeaves = ref([]);

const activeTab = ref("pending");
const replacementFilter = ref("");

function todayYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const statsMonth = ref(todayYearMonth());

const pendingSearch = ref("");
const allSearch = ref("");

const respondingId = ref(null); // ID yang sedang approve/reject
const togglingId = ref(null); // `id-dayIndex` yang sedang toggle replacement
const deletingPendingId = ref(null);

const medicalCertLoading = ref(false);
const medicalCertFile = ref(null);

let unsubPending = null;

// ── Computed: Stats ────────────────────────────────────────────────────────
const stats = computed(() => ({
  total: allLeaves.value.length,
  approved: allLeaves.value.filter((r) => r.status === "Approved" || r.status === "Disetujui").length,
  rejected: allLeaves.value.filter((r) => r.status === "Rejected" || r.status === "Ditolak").length,
}));

// ── Computed: Filtered Pending ─────────────────────────────────────────────
const filteredPendingList = computed(() => {
  const term = pendingSearch.value.toLowerCase().trim();
  if (!term) return [...pendingList.value].sort((a, b) => new Date(b.submitDate || 0) - new Date(a.submitDate || 0));
  return pendingList.value
    .filter((r) => (r.name || "").toLowerCase().includes(term) || (r.employeeId || "").toLowerCase().includes(term))
    .sort((a, b) => new Date(b.submitDate || 0) - new Date(a.submitDate || 0));
});

// ── Computed: Expanded All Rows (multi-day expansion) ─────────────────────
/**
 * Mirrors updateLeaveHistoryTable() / search results in supervisor.js.
 * Expands multi-day leaves into N rows, one per day, preserving dayIndex.
 */
const expandedAllRows = computed(() => {
  const rows = [];
  for (const record of allLeaves.value) {
    const hasMC = hasMedicalCert(record);
    const isCuti = record.leaveType === "cuti";
    const isMultiDay = record.leaveStartDate && record.leaveEndDate && record.leaveStartDate !== record.leaveEndDate;
    // noReplacement: surat dokter, cuti, atau jenis pengganti = "tidak" / kosong
    const noReplacement = hasMC || isCuti || !record.replacementType || record.replacementType === "tidak";

    // Derive replacement info at record level
    const replacementInfo = getReplacementInfo(record);

    if (!isMultiDay) {
      // Single-day row
      const replacementStatus = noReplacement ? "Tidak Perlu Diganti" : record.replacementStatus || "Belum Diganti";
      let formattedDate = record.leaveDate || record.leaveStartDate || "-";
      if (typeof formattedDate === "string" && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedDate = new Date(formattedDate + "T00:00:00").toLocaleDateString("id-ID");
      }
      rows.push({
        ...record,
        _id: record.id,
        _isMultiDay: false,
        _isFirstDay: true,
        _dayIndex: null,
        _totalDays: 1,
        _dayStatus: replacementStatus,
        _formattedDate: formattedDate,
        _replacementInfo: replacementInfo,
      });
    } else {
      // Multi-day: expand per day
      const start = new Date(record.leaveStartDate + "T00:00:00");
      const end = new Date(record.leaveEndDate + "T00:00:00");
      const dayDiff = Math.round((end - start) / 86400000) + 1;
      const statusArr = noReplacement
        ? Array(dayDiff).fill("Tidak Perlu Diganti")
        : record.replacementStatusArray || Array(dayDiff).fill("Belum Diganti");

      for (let i = 0; i < dayDiff; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + i);
        const dayStatus = statusArr[i] || "Belum Diganti";

        // Per-day replacement info
        let dayInfo = replacementInfo;
        if (!hasMC && record.replacementType === "libur" && record.replacementDetails?.dates?.[i]) {
          dayInfo = `Ganti libur pada ${record.replacementDetails.dates[i].formattedDate}`;
        } else if (
          !hasMC &&
          (record.replacementType === "jam" || record.replacementType === "lembur") &&
          record.replacementDetails
        ) {
          dayInfo = getReplacementJamText(record.replacementDetails, record.replacementType);
        }

        rows.push({
          ...record,
          _id: record.id,
          _isMultiDay: true,
          _isFirstDay: i === 0,
          _dayIndex: i,
          _totalDays: dayDiff,
          _dayStatus: dayStatus,
          _formattedDate: cur.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
          _replacementInfo: dayInfo,
        });
      }
    }
  }
  return rows;
});

/** Filter and search on expanded rows — 0 extra Firestore reads */
const displayedAllRows = computed(() => {
  let rows = expandedAllRows.value;

  // Client-side replacement filter
  if (replacementFilter.value) {
    const f = replacementFilter.value;
    rows = rows.filter((r) => {
      if (r.status !== "Approved" && r.status !== "Disetujui") return false;
      return r._dayStatus === f;
    });
  }

  // Name / ID search
  const term = allSearch.value.toLowerCase().trim();
  if (term) {
    rows = rows.filter(
      (r) => (r.name || "").toLowerCase().includes(term) || (r.employeeId || "").toLowerCase().includes(term),
    );
  }

  return rows;
});

// ── Pagination: Pending ───────────────────────────────────────────────────
const pendingPage = ref(1);
const pendingPageSize = ref(10);
const pendingTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredPendingList.value.length / pendingPageSize.value)),
);
const pendingPageNumbers = computed(() => buildPageNumbers(pendingPage.value, pendingTotalPages.value));
const paginatedPendingList = computed(() => {
  const start = (pendingPage.value - 1) * pendingPageSize.value;
  return filteredPendingList.value.slice(start, start + pendingPageSize.value);
});

// ── Pagination: All ───────────────────────────────────────────────────────
const allPage = ref(1);
const allPageSize = ref(10);
const allTotalPages = computed(() => Math.max(1, Math.ceil(displayedAllRows.value.length / allPageSize.value)));
const allPageNumbers = computed(() => buildPageNumbers(allPage.value, allTotalPages.value));
const paginatedAllRows = computed(() => {
  const start = (allPage.value - 1) * allPageSize.value;
  return displayedAllRows.value.slice(start, start + allPageSize.value);
});

function buildPageNumbers(cur, total) {
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) range.push(i);
  return range;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function hasMedicalCert(record) {
  return !!record.replacementDetails?.medicalCertificateFile?.url;
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

function getReplacementJamText(details, type = "jam") {
  const prefix = type === "lembur" ? "Lembur" : "Ganti";
  if (!details) return type === "lembur" ? "Lembur" : "Ganti jam";

  const rawValue =
    details.timeValue ??
    details.hours ??
    details.value ??
    (typeof details.formattedValue === "string" ? Number(details.formattedValue.split(" ")[0]) : null);
  const unit = details.timeUnit || (details.formattedValue?.includes("menit") ? "menit" : "jam");
  const date = details.date || details.formattedDate;
  const formattedDate = formatDateId(date);

  if (rawValue && formattedDate) return `${prefix} ${rawValue} ${unit} pada ${formattedDate}`;
  if (rawValue) return `${prefix} ${rawValue} ${unit}`;
  if (formattedDate) return `${prefix} pada ${formattedDate}`;
  return type === "lembur" ? "Lembur" : "Ganti jam";
}

/** Mirrors getReplacementInfo() from supervisor.js */
function getReplacementInfo(record) {
  if (hasMedicalCert(record)) return "Tidak perlu ganti (ada surat dokter)";
  if (!record.replacementType || record.replacementType === "tidak") return "Tidak perlu diganti";
  if (record.replacementType === "libur") {
    const isMultiDay = record.leaveStartDate && record.leaveEndDate && record.leaveStartDate !== record.leaveEndDate;
    const d = record.replacementDetails;
    if (d?.dates?.length > 0) return d.dates.map((dt) => `Ganti libur pada ${dt.formattedDate}`).join("<br>");
    if (d?.formattedDate) return `Ganti libur pada ${d.formattedDate}`;
    return isMultiDay ? "Ganti libur (multi-hari)" : "Ganti libur";
  }
  if (record.replacementType === "jam" || record.replacementType === "lembur") {
    return getReplacementJamText(record.replacementDetails, record.replacementType);
  }
  return "-";
}

function formatPendingDate(req) {
  let date = req.leaveDate || req.leaveStartDate || "-";
  if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    date = new Date(date + "T00:00:00").toLocaleDateString("id-ID");
  }
  if (req.leaveStartDate && req.leaveEndDate && req.leaveStartDate !== req.leaveEndDate) {
    const start = new Date(req.leaveStartDate + "T00:00:00").toLocaleDateString("id-ID");
    const end = new Date(req.leaveEndDate + "T00:00:00").toLocaleDateString("id-ID");
    return `${start} — ${end}`;
  }
  return date;
}

function canToggleReplacement(row) {
  if (row.status !== "Approved" && row.status !== "Disetujui") return false;
  if (hasMedicalCert(row)) return false;
  if (row._dayStatus === "Tidak Perlu Diganti") return false;
  return true;
}

function statusBadge(s) {
  if (s === "Disetujui" || s === "Approved") return "bg-success";
  if (s === "Ditolak" || s === "Rejected") return "bg-danger";
  return "bg-warning text-dark";
}

function isRejectedStatus(status) {
  return status === "Ditolak" || status === "Rejected";
}

function replacementStatusBadge(s) {
  if (s === "Sudah Diganti") return "bg-success";
  if (s === "Tidak Perlu Diganti") return "bg-secondary";
  return "bg-warning text-dark";
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
  const el = document.getElementById(id);
  return el ? Modal.getOrCreateInstance(el) : null;
}

// ── Tab Switching ──────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab.value = tab;
}

// ── Load All Leaves by Month (single source of truth) ─────────────────────
async function loadAllByMonth(month) {
  loadingAll.value = true;
  try {
    let data = await fetchAllLeaves();
    // Client-side month filter — 0 extra Firestore index needed, 1 read per month change
    data = data.filter((r) => {
      const d = r.leaveStartDate || r.leaveDate;
      return d && d.startsWith(month);
    });
    allLeaves.value = data;
    allPage.value = 1;
  } catch (e) {
    showSwal("danger", `Gagal memuat data: ${e.message}`);
  } finally {
    loadingAll.value = false;
  }
}

async function refreshAll() {
  await loadAllByMonth(statsMonth.value);
}

watch(statsMonth, (newMonth) => {
  loadAllByMonth(newMonth);
});

// ── Approve / Reject Pending ───────────────────────────────────────────────
/**
 * Mirrors updateSingleLeaveStatus() + approvePending logic from supervisor.js.
 * After approve: remove from pendingList, add to allLeaves if filter === "Belum Diganti".
 */
async function approvePending(req) {
  respondingId.value = req.id;
  try {
    await updateLeaveStatus(req.id, "Disetujui", auth.user?.uid || "");
    // Reflect in allLeaves immediately (subscription auto-syncs pendingList)
    const allIdx = allLeaves.value.findIndex((r) => r.id === req.id);
    if (allIdx !== -1) {
      allLeaves.value[allIdx] = { ...allLeaves.value[allIdx], status: "Disetujui" };
    } else {
      const d = req.leaveStartDate || req.leaveDate;
      if (d && d.startsWith(statsMonth.value)) {
        allLeaves.value.unshift({ ...req, status: "Disetujui" });
      }
    }
    showSwal("success", "Pengajuan izin berhasil disetujui!");
  } catch (e) {
    showSwal("danger", "Terjadi kesalahan saat menyetujui pengajuan izin.");
  } finally {
    respondingId.value = null;
  }
}

async function rejectPending(req) {
  const rejectPrompt = await Swal.fire({
    icon: "warning",
    title: "Tolak Pengajuan Izin",
    input: "textarea",
    inputLabel: `Alasan penolakan untuk ${req.name || "staf ini"}`,
    inputPlaceholder: "Tulis alasan penolakan...",
    inputAttributes: {
      "aria-label": "Alasan penolakan",
      maxlength: "300",
    },
    showCancelButton: true,
    confirmButtonText: "Tolak",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    inputValidator: (value) => {
      if (!String(value || "").trim()) return "Alasan penolakan wajib diisi.";
      return null;
    },
  });

  if (!rejectPrompt.isConfirmed) return;

  const rejectedReason = String(rejectPrompt.value || "").trim();
  respondingId.value = req.id;
  try {
    await updateLeaveStatus(req.id, "Ditolak", auth.user?.uid || "", { rejectedReason });
    // Reflect in allLeaves immediately (subscription auto-syncs pendingList)
    const allIdx = allLeaves.value.findIndex((r) => r.id === req.id);
    if (allIdx !== -1) {
      allLeaves.value[allIdx] = { ...allLeaves.value[allIdx], status: "Ditolak", rejectedReason };
    }
    showSwal("success", "Pengajuan izin berhasil ditolak.");
  } catch (e) {
    showSwal("danger", "Terjadi kesalahan saat menolak pengajuan izin.");
  } finally {
    respondingId.value = null;
  }
}

async function deletePending(req) {
  if (!req?.id) return;

  const result = await Swal.fire({
    icon: "warning",
    title: "Hapus Pengajuan?",
    text: `Pengajuan izin dari ${req.name || "staf ini"} akan dihapus permanen.`,
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
  });

  if (!result.isConfirmed) return;

  deletingPendingId.value = req.id;
  try {
    await deleteLeaveRequest(req.id);
    pendingList.value = pendingList.value.filter((r) => r.id !== req.id);
    allLeaves.value = allLeaves.value.filter((r) => r.id !== req.id);
    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Pengajuan izin berhasil dihapus.",
      confirmButtonColor: "#198754",
    });
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Gagal",
      text: e.message || "Gagal menghapus pengajuan izin.",
      confirmButtonColor: "#dc3545",
    });
  } finally {
    deletingPendingId.value = null;
  }
}

// ── Toggle Replacement Status ──────────────────────────────────────────────
/**
 * Mirrors updateSingleReplacementStatus() from supervisor.js.
 * Toggle "Sudah Diganti" ↔ "Belum Diganti", update local state, remove if no longer matches filter.
 */
async function toggleReplacementStatus(row) {
  const key = `${row._id}-${row._dayIndex}`;
  togglingId.value = key;
  const newStatus = row._dayStatus === "Sudah Diganti" ? "Belum Diganti" : "Sudah Diganti";

  try {
    await updateLeaveReplacementStatus(row._id, newStatus, row._dayIndex);

    // Update local allLeaves state
    const recIdx = allLeaves.value.findIndex((r) => r.id === row._id);
    if (recIdx !== -1) {
      const record = { ...allLeaves.value[recIdx] };
      const isMultiDay = record.leaveStartDate && record.leaveEndDate && record.leaveStartDate !== record.leaveEndDate;

      if (isMultiDay && row._dayIndex !== null) {
        const arr = [...(record.replacementStatusArray || Array(row._totalDays).fill("Belum Diganti"))];
        arr[row._dayIndex] = newStatus;
        record.replacementStatusArray = arr;
        record.replacementStatus = arr.every((s) => s === "Sudah Diganti") ? "Sudah Diganti" : "Belum Diganti";
      } else {
        record.replacementStatus = newStatus;
      }

      allLeaves.value[recIdx] = record;
      // displayedAllRows recomputes automatically via Vue reactivity
    }

    showSwal("success", `Status ganti diubah menjadi "${newStatus}"`);
  } catch (e) {
    showSwal("danger", `Gagal mengubah status ganti: ${e.message}`);
  } finally {
    togglingId.value = null;
  }
}

// ── View Medical Certificate ───────────────────────────────────────────────
async function viewMedicalCert(id) {
  medicalCertFile.value = null;
  medicalCertLoading.value = true;
  nextTick(() => getModal("medicalCertModal")?.show());

  try {
    // Look in local state first (pending or all)
    let record = pendingList.value.find((r) => r.id === id) || allLeaves.value.find((r) => r.id === id);
    if (!record) record = await fetchLeaveById(id);

    const fileInfo = record?.replacementDetails?.medicalCertificateFile;
    if (!fileInfo?.url) {
      showSwal("warning", "Tidak ada URL surat keterangan sakit yang tersedia");
      getModal("medicalCertModal")?.hide();
      return;
    }

    medicalCertFile.value = {
      url: fileInfo.url,
      isImage: fileInfo.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif)$/i.test(fileInfo.url),
      isPdf: fileInfo.type === "application/pdf" || /\.pdf$/i.test(fileInfo.url),
    };
  } catch (e) {
    showSwal("danger", `Gagal memuat surat: ${e.message}`);
    getModal("medicalCertModal")?.hide();
  } finally {
    medicalCertLoading.value = false;
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  unsubPending = subscribePendingLeaves((data) => {
    pendingList.value = data;
    loadingPending.value = false;
  });
  loadAllByMonth(statsMonth.value);
});

onUnmounted(() => {
  unsubPending?.();
});
</script>

<style scoped>
.btn-xs {
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  line-height: 1.2;
}

.text-truncate-1 {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.first-day-row {
  background-color: rgba(13, 110, 253, 0.04) !important;
}
</style>
