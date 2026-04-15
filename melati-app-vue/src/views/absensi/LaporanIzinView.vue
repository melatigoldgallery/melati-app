<template>
  <div class="page-content">
    <!-- Page Header -->
    <div class="page-header">
      <h1>
        <i class="bi bi-calendar3 me-2 text-dark"></i>
        Laporan Izin Bulanan
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/absensi/kehadiran">Absensi</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Izin</li>
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
          <div class="row g-2 align-items-end report-filter-row">
            <div class="col-6 col-md-2">
              <label class="form-label small fw-semibold mb-1">Bulan</label>
              <select v-model="filter.month" class="form-select form-select-sm">
                <option v-for="(nm, idx) in monthNames" :key="idx" :value="idx + 1">{{ nm }}</option>
              </select>
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label small fw-semibold mb-1">Tahun</label>
              <select v-model="filter.year" class="form-select form-select-sm">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
            <div class="col-12 col-md-auto">
              <button class="btn btn-tampilkan btn-sm" @click="loadReport" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="fas fa-search me-1"></i>
                Tampilkan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div v-if="allRows.length > 0" class="row g-2 mb-4 d-none d-md-flex">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-primary bg-opacity-10 p-3">
                <i class="fas fa-file-alt text-primary fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-primary">{{ allRows.length }}</div>
                <div class="small text-muted">Total Pengajuan</div>
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
                <div class="fs-4 fw-bold text-success">{{ countByStatus("Disetujui") }}</div>
                <div class="small text-muted">Disetujui</div>
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
                <div class="fs-4 fw-bold text-danger">{{ countByStatus("Ditolak") }}</div>
                <div class="small text-muted">Ditolak</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div class="rounded-circle bg-warning bg-opacity-10 p-3">
                <i class="fas fa-clock text-warning fs-5"></i>
              </div>
              <div>
                <div class="fs-4 fw-bold text-warning">{{ countByStatus("Menunggu Persetujuan") }}</div>
                <div class="small text-muted">Menunggu</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Table Card -->
      <div class="card mb-4">
        <div class="card-header">
          <h2>
            <i class="fas fa-table me-2"></i>
            Data Izin
          </h2>
        </div>
        <div class="card-header report-table-toolbar d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div v-if="allRows.length > 0" class="report-actions d-none d-md-flex gap-2">
            <button class="btn btn-success btn-sm" style="font-size: 0.7rem" @click="exportExcel">
              <i class="fas fa-file-excel me-1"></i>
              Excel
            </button>
            <button class="btn btn-danger btn-sm" style="font-size: 0.7rem" @click="exportPDF">
              <i class="fas fa-file-pdf me-1"></i>
              PDF
            </button>
          </div>

          <div v-if="allRows.length > 0" class="d-flex gap-2 flex-wrap align-items-center report-table-filters">
            <select v-model="filterType" class="form-select form-select-sm compact-select" @change="currentPage = 1">
              <option value="all">Semua Jenis Pengganti</option>
              <option value="libur">Ganti Libur</option>
              <option value="jam">Ganti Jam</option>
              <option value="tidak">Tidak Perlu Diganti</option>
            </select>
            <select v-model="filterStatus" class="form-select form-select-sm compact-select" @change="currentPage = 1">
              <option value="all">Semua Status Ganti</option>
              <option value="belum">Belum Diganti</option>
              <option value="sudah">Sudah Diganti</option>
            </select>

            <div class="input-group input-group-sm report-search-input">
              <span class="input-group-text">
                <i class="fas fa-search"></i>
              </span>
              <input
                v-model.trim="searchQuery"
                type="search"
                class="form-control"
                placeholder="Cari nama, alasan, tanggal..."
                @input="currentPage = 1"
              />
            </div>
          </div>
        </div>
        <div class="card-body px-2 report-table-body">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 60px">No</th>
                  <th>Nama</th>
                  <th>Tanggal Izin</th>
                  <th>Alasan</th>
                  <th>Jenis Pengganti</th>
                  <th>Detail Pengganti</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Status Ganti</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-warning"></div>
                  </td>
                </tr>
                <tr v-else-if="displayedTableRows.length === 0">
                  <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle me-2"></i>
                    Tidak ada data izin untuk periode yang dipilih.
                  </td>
                </tr>
                <tr v-for="(row, i) in paginatedRows" :key="i">
                  <td class="mobile-small">{{ row.rowNo }}</td>
                  <td class="mobile-small fw-medium">{{ row.name }}</td>
                  <td class="mobile-small" style="max-width: 100px">
                    <div class="text-truncate-cell" :title="row.leaveDate || ''">{{ row.leaveDate }}</div>
                  </td>
                  <td
                    class="mobile-small"
                    style="max-width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
                    :title="row.reason || ''"
                  >
                    {{ row.reason }}
                  </td>
                  <td class="mobile-small">{{ row.replacementTypeLabel }}</td>
                  <td class="mobile-small" style="max-width: 140px">
                    <div class="text-truncate-cell" :title="row.replacementInfo || ''">{{ row.replacementInfo }}</div>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="statusBadge(row.status)">{{ row.status }}</span>
                    <div
                      v-if="isRejectedStatus(row.status) && row.rejectedReason"
                      class="mobile-small text-danger mt-1 text-truncate-1"
                      :title="row.rejectedReason"
                    >
                      Alasan ditolak: {{ row.rejectedReason }}
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="replacementStatusBadge(row.replacementStatus)">
                      {{ row.replacementStatus }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="d-flex justify-content-between align-items-center px-3 py-2 border-top report-pagination"
          >
            <div class="d-flex align-items-center justify-content-between report-pagination-meta gap-2">
              <select
                v-model="pageSize"
                class="form-select form-select-sm"
                style="width: auto; font-size: small"
                @change="currentPage = 1"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <small class="text-muted report-pagination-text">
                Menampilkan {{ (currentPage - 1) * pageSize + 1 }}–{{
                  Math.min(currentPage * pageSize, displayedTableRows.length)
                }}
                dari {{ displayedTableRows.length }} data
              </small>
            </div>
            <nav aria-label="Pagination">
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage = 1" :disabled="currentPage === 1">
                    <i class="fas fa-angle-double-left"></i>
                  </button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage--" :disabled="currentPage === 1">
                    <i class="fas fa-angle-left"></i>
                  </button>
                </li>
                <li v-if="pageNumbers[0] > 1" class="page-item disabled">
                  <span class="page-link">…</span>
                </li>
                <li v-for="p in pageNumbers" :key="p" class="page-item" :class="{ active: p === currentPage }">
                  <button class="page-link" @click="currentPage = p">{{ p }}</button>
                </li>
                <li v-if="pageNumbers[pageNumbers.length - 1] < totalPages" class="page-item disabled">
                  <span class="page-link">…</span>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage++" :disabled="currentPage === totalPages">
                    <i class="fas fa-angle-right"></i>
                  </button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage = totalPages" :disabled="currentPage === totalPages">
                    <i class="fas fa-angle-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Swal from "sweetalert2";
import { fetchLeavesByRange } from "@/services/absensi-service";

// ── State ──────────────────────────────────────────────────────────────────
const loading = ref(false);
const allRows = ref([]);

const now = new Date();
const filter = ref({ month: now.getMonth() + 1, year: now.getFullYear() });

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const filterType = ref("all");
const filterStatus = ref("all");
const searchQuery = ref("");

// ── Pagination ─────────────────────────────────────────────────────────────
const currentPage = ref(1);
const pageSize = ref(10);

/** Build flat table rows — handles multi-day logic same as laporan-izin.js */
const tableRows = computed(() => {
  const rows = [];
  let rowNo = 1;

  for (const leave of allRows.value) {
    const hasMedicalCert = leave.leaveType === "sakit" && !!leave.replacementDetails?.hasMedicalCertificate;
    const isCuti = leave.leaveType === "cuti";
    const isMultiDay = leave.leaveStartDate && leave.leaveEndDate && leave.leaveStartDate !== leave.leaveEndDate;
    // noReplacement: surat dokter, cuti, atau jenis pengganti = "tidak" / kosong
    const noReplacement = hasMedicalCert || isCuti || !leave.replacementType || leave.replacementType === "tidak";

    const replacementTypeLabel = (() => {
      if (hasMedicalCert) return "Ada Surat DC";
      if (isCuti) return "Cuti";
      if (leave.replacementType === "libur") return "Ganti Libur";
      if (leave.replacementType === "jam") return "Ganti Jam";
      if (leave.replacementType === "tidak") return "Tidak Perlu Diganti";
      return "-";
    })();

    const replacementInfo = (() => {
      if (hasMedicalCert || isCuti) return "Tidak perlu diganti";
      if (leave.replacementType === "libur") {
        const d = leave.replacementDetails;
        if (d?.dates?.length > 0) return d.dates.map((x) => x.formattedDate || x.date).join(", ");
        if (d?.formattedDate) return d.formattedDate;
        return "-";
      }
      if (leave.replacementType === "jam") {
        const d = leave.replacementDetails;
        if (!d) return "-";
        const val = d.timeValue || d.value || d.hours || "";
        const unit = d.timeUnit || d.unit || "jam";
        const tgl = d.formattedDate || (d.date ? new Date(d.date).toLocaleDateString("id-ID") : "-");
        return val ? `${val} ${unit} pada ${tgl}` : "-";
      }
      return "-";
    })();

    const baseReplacementStatus = noReplacement ? "Tidak Perlu Diganti" : leave.replacementStatus || "Belum Diganti";

    if (!isMultiDay || hasMedicalCert || isCuti) {
      // Single baris
      const leaveDate = (() => {
        if (isMultiDay) {
          const s = new Date(leave.leaveStartDate + "T00:00:00");
          const e = new Date(leave.leaveEndDate + "T00:00:00");
          const days = Math.round((e - s) / 86400000) + 1;
          return (
            s.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
            " - " +
            e.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) +
            ` (${days} hari)`
          );
        }
        if (
          leave.leaveDate &&
          typeof leave.leaveDate === "string" &&
          leave.leaveDate.includes("-") &&
          !leave.leaveDate.includes("s/d")
        ) {
          return new Date(leave.leaveDate + "T00:00:00").toLocaleDateString("id-ID");
        }
        return leave.leaveDate || leave.leaveStartDate || "-";
      })();

      rows.push({
        id: leave.id,
        rowNo: rowNo++,
        name: leave.name || "-",
        leaveDate,
        reason: leave.reason || "-",
        rejectedReason: leave.rejectedReason || "",
        replacementTypeLabel,
        replacementInfo,
        status: leave.status || "Menunggu Persetujuan",
        replacementStatus: baseReplacementStatus,
        _replacementType: leave.replacementType || "",
        _replacementStatusRaw: baseReplacementStatus,
      });
    } else {
      // Multi-day: satu baris per hari
      const startDate = new Date(leave.leaveStartDate + "T00:00:00");
      const endDate = new Date(leave.leaveEndDate + "T00:00:00");
      const dayDiff = Math.round((endDate - startDate) / 86400000) + 1;
      const statusArray = noReplacement
        ? Array(dayDiff).fill("Tidak Perlu Diganti")
        : leave.replacementStatusArray || Array(dayDiff).fill("Belum Diganti");
      const currentRowNo = rowNo++;

      for (let i = 0; i < dayDiff; i++) {
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + i);
        const formattedDay = cur.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const dayStatus = statusArray[i] || "Belum Diganti";
        let dayInfo = replacementInfo;
        if (leave.replacementType === "libur" && leave.replacementDetails?.dates?.[i]) {
          dayInfo = leave.replacementDetails.dates[i].formattedDate || leave.replacementDetails.dates[i].date;
        }

        rows.push({
          id: leave.id,
          rowNo: `${currentRowNo} (${i + 1}/${dayDiff})`,
          name: leave.name || "-",
          leaveDate: formattedDay,
          reason: leave.reason || "-",
          rejectedReason: leave.rejectedReason || "",
          replacementTypeLabel,
          replacementInfo: dayInfo,
          status: leave.status || "Menunggu Persetujuan",
          replacementStatus: dayStatus,
          _replacementType: leave.replacementType || "",
          _replacementStatusRaw: dayStatus,
        });
      }
    }
  }

  return rows;
});

const displayedTableRows = computed(() => {
  let rows = tableRows.value;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    rows = rows.filter((r) => {
      return [r.name, r.leaveDate, r.reason, r.replacementTypeLabel, r.replacementInfo, r.status, r.replacementStatus]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }

  if (filterType.value !== "all") {
    rows = rows.filter((r) => r._replacementType === filterType.value);
  }
  if (filterStatus.value !== "all") {
    rows = rows.filter((r) => {
      const s = (r._replacementStatusRaw || "").toLowerCase();
      if (filterStatus.value === "sudah") return s.includes("sudah");
      if (filterStatus.value === "belum") return s.includes("belum") || s === "";
      return true;
    });
  }
  return rows;
});

const totalPages = computed(() => Math.max(1, Math.ceil(displayedTableRows.value.length / pageSize.value)));

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return displayedTableRows.value.slice(start, start + pageSize.value);
});

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) range.push(i);
  return range;
});

// ── Helpers ────────────────────────────────────────────────────────────────
function statusBadge(s) {
  if (s === "Disetujui" || s === "Approved") return "bg-success";
  if (s === "Ditolak" || s === "Rejected") return "bg-danger";
  return "bg-warning text-dark";
}

function isRejectedStatus(status) {
  return status === "Ditolak" || status === "Rejected";
}

function replacementStatusBadge(s) {
  if (!s || s === "Belum Diganti") return "bg-warning text-dark";
  if (s === "Sudah Diganti") return "bg-success";
  return "bg-secondary";
}

function countByStatus(status) {
  return allRows.value.filter(
    (r) =>
      r.status === status ||
      (status === "Disetujui" && r.status === "Approved") ||
      (status === "Ditolak" && r.status === "Rejected"),
  ).length;
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

// ── Load Report ────────────────────────────────────────────────────────────
async function loadReport() {
  loading.value = true;
  try {
    const m = filter.value.month;
    const y = filter.value.year;
    const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
    const data = await fetchLeavesByRange(firstDay, lastDay);
    allRows.value = data.sort((a, b) => (a.leaveStartDate || "").localeCompare(b.leaveStartDate || ""));
    filterType.value = "all";
    filterStatus.value = "all";
    currentPage.value = 1;
  } catch (e) {
    showSwal("danger", `Gagal memuat laporan: ${e.message}`);
  } finally {
    loading.value = false;
  }
}

// ── Export Excel ───────────────────────────────────────────────────────────
async function exportExcel() {
  const XLSX = (await import("xlsx")).default || (await import("xlsx"));
  const wsData = [
    ["Laporan Izin Bulanan"],
    ["Melati Gold Shop"],
    [`Periode: ${monthNames[filter.value.month - 1]} ${filter.value.year}`],
    [],
    ["#", "Nama", "Tanggal Izin", "Alasan", "Jenis Pengganti", "Detail Pengganti", "Status", "Status Ganti"],
    ...displayedTableRows.value.map((r) => [
      r.rowNo,
      r.name,
      r.leaveDate,
      r.reason,
      r.replacementTypeLabel,
      r.replacementInfo,
      r.status,
      r.replacementStatus,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Izin");
  XLSX.writeFile(wb, `laporan-izin-${monthNames[filter.value.month - 1]}-${filter.value.year}.xlsx`);
}

// ── Export PDF ─────────────────────────────────────────────────────────────
async function exportPDF() {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Laporan Izin Bulanan", 14, 15);
  doc.setFontSize(11);
  doc.text("Melati Gold Shop", 14, 22);
  doc.setFontSize(10);
  doc.text(`Periode: ${monthNames[filter.value.month - 1]} ${filter.value.year}`, 14, 29);

  autoTable(doc, {
    startY: 35,
    head: [["No", "Nama", "Tanggal Izin", "Alasan", "Jenis Pengganti", "Detail Pengganti", "Status", "Status Ganti"]],
    body: displayedTableRows.value.map((r) => [
      r.rowNo,
      r.name,
      r.leaveDate,
      r.reason,
      r.replacementTypeLabel,
      r.replacementInfo,
      r.status,
      r.replacementStatus,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [255, 180, 0] },
    columnStyles: {
      1: { cellWidth: 20 },
      2: { cellWidth: 28 },
      3: { cellWidth: 100 },
      4: { cellWidth: 28 },
      5: { cellWidth: 35 },
      6: { cellWidth: 18 },
      8: { cellWidth: 28 },
    },
  });

  doc.save(`laporan-izin-${monthNames[filter.value.month - 1]}-${filter.value.year}.pdf`);
}
</script>

<style scoped>
.page-header h1 {
  font-size: clamp(1.1rem, 1.8vw, 1.6rem);
  line-height: 1.25;
}

.card-header h2 {
  margin: 0;
  font-size: clamp(0.95rem, 1.4vw, 1.15rem);
  line-height: 1.3;
}

.report-table-toolbar {
  padding: 0.75rem 0.95rem;
}

.report-actions .btn {
  min-width: 84px;
}

.report-table-filters {
  margin-left: auto;
}

.report-table-filters .compact-select {
  min-width: 190px;
  width: 190px;
}

.report-search-input {
  width: 300px;
}

.report-search-input .input-group-text,
.report-search-input .form-control {
  font-size: 0.8rem;
}

.report-table-body .table {
  font-size: 0.8rem;
}

.report-table-body .table thead th {
  font-weight: 700;
}

.text-truncate-1 {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 220px;
  margin-inline: auto;
}

.text-truncate-cell {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 220px;
}

.mobile-small {
  font-size: inherit;
}

@media (max-width: 767.98px) {
  .page-header {
    margin-bottom: 0.8rem;
  }

  .page-header h1 {
    font-size: 1.1rem;
    margin-bottom: 0.3rem;
  }

  .breadcrumb {
    margin-bottom: 0;
    font-size: 0.74rem;
  }

  .card {
    border-radius: 12px;
  }

  .card-header {
    padding: 0.72rem 0.85rem;
  }

  .card-body {
    padding: 0.85rem;
  }

  .report-filter-row .form-label {
    font-size: 0.76rem;
  }

  .report-filter-row .form-select,
  .report-filter-row .btn {
    min-height: 2.35rem;
    font-size: 0.86rem;
  }

  .report-filter-row .btn {
    width: 100%;
  }

  .report-table-filters .compact-select {
    width: 100%;
    font-size: 0.8rem;
  }

  .report-search-input {
    width: 100%;
  }

  .data-count-badge {
    font-size: 0.72rem;
  }

  .report-table-body {
    padding-left: 0.45rem !important;
    padding-right: 0.45rem !important;
  }

  .table {
    font-size: 0.78rem;
  }

  .table th,
  .table td {
    padding: 0.45rem 0.35rem;
    white-space: nowrap;
  }

  .text-truncate-cell,
  .text-truncate-1 {
    max-width: 160px;
  }

  .mobile-small {
    font-size: 0.875em;
  }

  .report-pagination {
    flex-direction: column;
    align-items: stretch !important;
    gap: 0.65rem;
    padding-left: 0.55rem !important;
    padding-right: 0.55rem !important;
  }

  .report-pagination-text {
    font-size: 0.72rem;
    line-height: 1.35;
  }

  .pagination {
    justify-content: center;
    flex-wrap: wrap;
  }

  .page-link {
    padding: 0.22rem 0.5rem;
    font-size: 0.78rem;
  }
}
</style>
