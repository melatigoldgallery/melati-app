<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-archive me-2 text-dark"></i>
        Laporan Stok Aksesoris
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Stok</li>
        </ol>
      </nav>
    </div>

    <!-- Filter -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header">
        <h2>
          <i class="fas fa-filter me-2"></i>
          Filter Laporan
        </h2>
      </div>
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Jenis Laporan</label>
            <select v-model="filter.jenis" class="form-select form-select-sm">
              <option value="kotak-aksesoris">Kotak &amp; Aksesoris</option>
              <option v-if="!isL2Floor" value="silver">Silver</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal Awal</label>
            <input v-model="filter.start" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal Akhir</label>
            <input v-model="filter.end" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button @click="loadReport" :disabled="isLoading" class="btn btn-tampilkan btn-sm">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kotak & Aksesoris table -->
    <div v-if="filter.jenis === 'kotak-aksesoris'" class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom py-2">
        <span class="fw-semibold small">
          <i class="bi bi-boxes me-1"></i>
          Data Stok Kotak &amp; Aksesoris
          <span v-if="reportData.length" class="text-muted">({{ filteredRows.length }} item)</span>
        </span>
      </div>
      <div class="card-body p-0">
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!reportData.length" class="text-center py-5 text-muted small">
          <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
          Pilih tanggal dan klik Tampilkan
        </div>
        <div v-else>
          <!-- Search + Export -->
          <div class="p-2 border-bottom d-flex align-items-center justify-content-between">
            <div class="d-flex gap-2">
              <button @click="exportExcel" :disabled="!reportData.length" class="btn btn-success btn-sm">
                <i class="bi bi-file-earmark-excel me-1"></i>
                Excel
              </button>
              <button @click="exportPdf" :disabled="!reportData.length" class="btn btn-danger btn-sm">
                <i class="bi bi-file-earmark-pdf me-1"></i>
                PDF
              </button>
            </div>
            <input
              v-model="search"
              type="text"
              class="form-control form-control-sm"
              style="max-width: 280px"
              placeholder="Cari kode / nama..."
            />
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 table-striped">
              <thead class="table-light sticky-top">
                <tr>
                  <th class="text-center" style="width: 42px">No</th>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th class="text-center">Stok Awal</th>
                  <th class="text-center">Tambah</th>
                  <th class="text-center">Laku</th>
                  <th class="text-center">Free</th>
                  <th class="text-center">Ganti Lock</th>
                  <th class="text-center">Return</th>
                  <th class="text-center">Stok Akhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in displayRows" :key="row.kode">
                  <td class="text-center text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                  <td class="small">{{ row.kode }}</td>
                  <td class="small">{{ row.nama }}</td>
                  <td class="small text-center">{{ row.stokAwal }}</td>
                  <td class="small text-center">{{ row.tambah || "0" }}</td>
                  <td class="small text-center">{{ row.laku || "0" }}</td>
                  <td class="small text-center">{{ row.free || "0" }}</td>
                  <td class="small text-center">{{ row.gantiLock || "0" }}</td>
                  <td class="small text-center">{{ row.return || "0" }}</td>
                  <td class="small text-center fw-bold" :class="row.stokAkhir > 0 ? 'text-primary' : 'text-secondary'">
                    {{ row.stokAkhir }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div class="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <div class="d-flex align-items-center gap-2">
              <small class="text-muted">Tampilkan</small>
              <select
                v-model="pageSize"
                @change="currentPage = 1"
                class="form-select form-select-sm"
                style="width: 70px"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <small class="text-muted">dari {{ filteredRows.length }} data</small>
            </div>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage = 1">&laquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage--">&lsaquo;</button>
                </li>
                <li v-for="p in totalPages" :key="p" class="page-item" :class="{ active: p === currentPage }">
                  <button class="page-link" @click="currentPage = p">{{ p }}</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage++">&rsaquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage = totalPages">&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Silver table -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom py-2">
        <span class="fw-semibold small">
          <i class="bi bi-gem me-1"></i>
          Data Stok Silver
          <span v-if="reportData.length" class="text-muted">({{ filteredRows.length }} item)</span>
        </span>
      </div>
      <div class="card-body p-0">
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!reportData.length" class="text-center py-5 text-muted small">
          <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
          Pilih tanggal dan klik Tampilkan
        </div>
        <div v-else>
          <div class="p-2 border-bottom d-flex align-items-center justify-content-between">
            <div class="d-flex gap-2">
              <button @click="exportExcel" :disabled="!reportData.length" class="btn btn-success btn-sm">
                <i class="bi bi-file-earmark-excel me-1"></i>
                Excel
              </button>
              <button @click="exportPdf" :disabled="!reportData.length" class="btn btn-danger btn-sm">
                <i class="bi bi-file-earmark-pdf me-1"></i>
                PDF
              </button>
            </div>
            <input
              v-model="search"
              type="text"
              class="form-control form-control-sm"
              style="max-width: 280px"
              placeholder="Cari kode / nama..."
            />
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 table-striped">
              <thead class="table-light sticky-top">
                <tr>
                  <th class="text-center" style="width: 42px">No</th>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th class="text-center">Stok Awal</th>
                  <th class="text-center">Tambah Stok</th>
                  <th class="text-center">Laku</th>
                  <th class="text-center">Lock</th>
                  <th class="text-center">Return</th>
                  <th class="text-center">Stok Akhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in displayRows" :key="row.kode">
                  <td class="text-center text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                  <td class="small">{{ row.kode }}</td>
                  <td class="small">{{ row.nama }}</td>
                  <td class="small text-center">
                    {{ row.stokAwal }}
                    <br />
                    <small class="text-muted">{{ ((row.stokAwal || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                  <td class="small text-center text-success">
                    {{ row.tambah || 0 }}
                    <br />
                    <small class="text-muted">{{ ((row.tambah || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                  <td class="small text-center text-danger">
                    {{ row.laku || 0 }}
                    <br />
                    <small class="text-muted">{{ ((row.laku || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                  <td class="small text-center text-muted">
                    {{ row.gantiLock || 0 }}
                    <br />
                    <small class="text-muted">{{ ((row.gantiLock || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                  <td class="small text-center text-warning">
                    {{ row.return || 0 }}
                    <br />
                    <small class="text-muted">{{ ((row.return || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                  <td class="small text-center fw-bold" :class="row.stokAkhir > 0 ? 'text-primary' : 'text-secondary'">
                    {{ row.stokAkhir }}
                    <br />
                    <small class="text-muted">{{ ((row.stokAkhir || 0) * (row.berat || 0)).toFixed(2) }} gr</small>
                  </td>
                </tr>
              </tbody>
              <!-- Silver totals -->
              <tfoot class="table-secondary fw-semibold">
                <tr>
                  <td colspan="3" class="text-end small">TOTAL:</td>
                  <td class="text-center small">
                    {{ silverTotals.stokAwal }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.stokAwalGr.toFixed(2) }} gr</small>
                  </td>
                  <td class="text-center small">
                    {{ silverTotals.tambah }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.tambahGr.toFixed(2) }} gr</small>
                  </td>
                  <td class="text-center small">
                    {{ silverTotals.laku }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.lakuGr.toFixed(2) }} gr</small>
                  </td>
                  <td class="text-center small">
                    {{ silverTotals.gantiLock }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.gantiLockGr.toFixed(2) }} gr</small>
                  </td>
                  <td class="text-center small">
                    {{ silverTotals.return }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.returnGr.toFixed(2) }} gr</small>
                  </td>
                  <td class="text-center small">
                    {{ silverTotals.stokAkhir }}
                    <br />
                    <small class="fw-normal">{{ silverTotals.stokAkhirGr.toFixed(2) }} gr</small>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <!-- Pagination -->
          <div class="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <div class="d-flex align-items-center gap-2">
              <small class="text-muted">Tampilkan</small>
              <select
                v-model="pageSize"
                @change="currentPage = 1"
                class="form-select form-select-sm"
                style="width: 70px"
              >
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
              <small class="text-muted">dari {{ filteredRows.length }} data</small>
            </div>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage = 1">&laquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <button class="page-link" @click="currentPage--">&lsaquo;</button>
                </li>
                <li v-for="p in totalPages" :key="p" class="page-item" :class="{ active: p === currentPage }">
                  <button class="page-link" @click="currentPage = p">{{ p }}</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage++">&rsaquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                  <button class="page-link" @click="currentPage = totalPages">&raquo;</button>
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
import { ref, computed, watch, onMounted } from "vue";
import { fetchStockReport } from "@/services/stock-service";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";

const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");
const exportFloorLabel = computed(() => (isL2Floor.value ? "Melati Atas" : "Melati Bawah"));
const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const todayDefault = todayStringWITA();
const filter = ref({ jenis: "kotak-aksesoris", start: todayDefault, end: todayDefault });
const isLoading = ref(false);
const reportData = ref([]);
const search = ref("");
const currentPage = ref(1);
const pageSize = ref(25);

// ── Computed rows filtered by jenis & search ─────────────────────────────
const filteredRows = computed(() => {
  let rows = reportData.value.filter((r) => {
    if (filter.value.jenis === "silver") return r.kategori === "silver";
    return r.kategori === "kotak" || r.kategori === "aksesoris";
  });
  if (search.value) {
    const q = search.value.toLowerCase();
    rows = rows.filter((r) => r.kode.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q));
  }
  // Match original sort: kotak first, then aksesoris, then sort by kode within each group
  if (filter.value.jenis === "kotak-aksesoris") {
    rows = [...rows].sort((a, b) => {
      if (a.kategori !== b.kategori) return a.kategori === "kotak" ? -1 : 1;
      return a.kode.localeCompare(b.kode);
    });
  }
  return rows;
});

const totalPages = computed(() => Math.ceil(filteredRows.value.length / pageSize.value) || 1);

const displayRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

// Reset to page 1 when filter or search changes
watch([search, () => filter.value.jenis, reportData], () => {
  currentPage.value = 1;
});

const silverTotals = computed(() => {
  return displayRows.value.reduce(
    (acc, r) => {
      const berat = r.berat || 0;
      acc.stokAwal += r.stokAwal || 0;
      acc.stokAwalGr += (r.stokAwal || 0) * berat;
      acc.tambah += r.tambah || 0;
      acc.tambahGr += (r.tambah || 0) * berat;
      acc.laku += r.laku || 0;
      acc.lakuGr += (r.laku || 0) * berat;
      acc.gantiLock += r.gantiLock || 0;
      acc.gantiLockGr += (r.gantiLock || 0) * berat;
      acc.return += r.return || 0;
      acc.returnGr += (r.return || 0) * berat;
      acc.stokAkhir += r.stokAkhir || 0;
      acc.stokAkhirGr += (r.stokAkhir || 0) * berat;
      return acc;
    },
    {
      stokAwal: 0,
      stokAwalGr: 0,
      tambah: 0,
      tambahGr: 0,
      laku: 0,
      lakuGr: 0,
      gantiLock: 0,
      gantiLockGr: 0,
      return: 0,
      returnGr: 0,
      stokAkhir: 0,
      stokAkhirGr: 0,
    },
  );
});

// ── Load ─────────────────────────────────────────────────────────────────
async function loadReport() {
  if (!filter.value.start) {
    showError("Tanggal diperlukan", "Isi tanggal awal terlebih dahulu.");
    return;
  }
  if (filter.value.end < filter.value.start) filter.value.end = filter.value.start;
  isLoading.value = true;
  search.value = "";
  try {
    reportData.value = await fetchStockReport(filter.value.start, filter.value.end);
  } catch (e) {
    showError("Gagal Memuat Laporan", e.message);
  } finally {
    isLoading.value = false;
  }
}

// ── Export PDF ──────────────────────────────────────────────────────────
async function exportPdf() {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const isSilver = filter.value.jenis === "silver";
  const rows = displayRows.value;

  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const title = isSilver ? "Laporan Stok Silver" : "Laporan Stok Kotak & Aksesoris";
  const dateRange =
    filter.value.start === filter.value.end ? filter.value.start : `${filter.value.start} s/d ${filter.value.end}`;

  // Title block (matches original: title + shop name + date)
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(exportFloorLabel.value, doc.internal.pageSize.getWidth() / 2, 22, { align: "center" });
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(dateRange, doc.internal.pageSize.getWidth() / 2, 28, { align: "center" });

  if (isSilver) {
    const head = [["No", "Kode", "Nama", "Stok Awal", "Tambah", "Laku", "Lock", "Return", "Stok Akhir"]];
    const body = rows.map((r, idx) => [
      idx + 1,
      r.kode,
      r.nama,
      `${r.stokAwal || 0}\n${((r.stokAwal || 0) * (r.berat || 0)).toFixed(2)} gr`,
      `${r.tambah || 0}\n${((r.tambah || 0) * (r.berat || 0)).toFixed(2)} gr`,
      `${r.laku || 0}\n${((r.laku || 0) * (r.berat || 0)).toFixed(2)} gr`,
      `${r.gantiLock || 0}\n${((r.gantiLock || 0) * (r.berat || 0)).toFixed(2)} gr`,
      `${r.return || 0}\n${((r.return || 0) * (r.berat || 0)).toFixed(2)} gr`,
      `${r.stokAkhir || 0}\n${((r.stokAkhir || 0) * (r.berat || 0)).toFixed(2)} gr`,
    ]);
    // Footer row totals
    const t = silverTotals.value;
    const foot = [
      [
        "",
        "",
        "TOTAL:",
        `${t.stokAwal}\n${t.stokAwalGr.toFixed(2)} gr`,
        `${t.tambah}\n${t.tambahGr.toFixed(2)} gr`,
        `${t.laku}\n${t.lakuGr.toFixed(2)} gr`,
        `${t.gantiLock}\n${t.gantiLockGr.toFixed(2)} gr`,
        `${t.return}\n${t.returnGr.toFixed(2)} gr`,
        `${t.stokAkhir}\n${t.stokAkhirGr.toFixed(2)} gr`,
      ],
    ];
    autoTable(doc, {
      head,
      body,
      foot,
      startY: 33,
      styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
      headStyles: { fillColor: [52, 73, 94], halign: "center", fontSize: 8 },
      footStyles: { fillColor: [224, 224, 224], textColor: 0, halign: "center", fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 20 },
        2: { halign: "left", cellWidth: 45 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
      },
      didParseCell(data) {
        if (data.section === "foot" && data.column.index === 2) {
          data.cell.styles.halign = "right";
        }
      },
    });
  } else {
    const head = [["No", "Kode", "Nama", "Stok Awal", "Tambah", "Laku", "Free", "Ganti Lock", "Return", "Stok Akhir"]];
    const body = rows.map((r, idx) => [
      idx + 1,
      r.kode,
      r.nama,
      r.stokAwal,
      r.tambah || 0,
      r.laku || 0,
      r.free || 0,
      r.gantiLock || 0,
      r.return || 0,
      r.stokAkhir,
    ]);
    autoTable(doc, {
      head,
      body,
      startY: 33,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [52, 73, 94], halign: "center", fontSize: 8 },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 18 },
        2: { halign: "left", cellWidth: 45 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
      },
    });
  }

  doc.save(`laporan-stok-${filter.value.jenis}-${filter.value.start}-${filter.value.end}.pdf`);
}

// ── Export Excel ─────────────────────────────────────────────────────────
async function exportExcel() {
  const { utils, writeFileXLSX } = await import("xlsx");
  const isSilver = filter.value.jenis === "silver";

  const rows = displayRows.value;
  const header = isSilver
    ? [
        "No",
        "Kode",
        "Nama",
        "Stok Awal",
        "Stok Awal (gr)",
        "Tambah Stok",
        "Tambah (gr)",
        "Laku",
        "Laku (gr)",
        "Lock",
        "Lock (gr)",
        "Return",
        "Return (gr)",
        "Stok Akhir",
        "Stok Akhir (gr)",
      ]
    : ["No", "Kode", "Nama", "Stok Awal", "Tambah Stok", "Laku", "Free", "Ganti Lock", "Return", "Stok Akhir"];

  const data = rows.map((r, idx) =>
    isSilver
      ? [
          idx + 1,
          r.kode,
          r.nama,
          r.stokAwal,
          `${((r.stokAwal || 0) * (r.berat || 0)).toFixed(2)} gr`,
          r.tambah,
          `${((r.tambah || 0) * (r.berat || 0)).toFixed(2)} gr`,
          r.laku,
          `${((r.laku || 0) * (r.berat || 0)).toFixed(2)} gr`,
          r.gantiLock,
          `${((r.gantiLock || 0) * (r.berat || 0)).toFixed(2)} gr`,
          r.return,
          `${((r.return || 0) * (r.berat || 0)).toFixed(2)} gr`,
          r.stokAkhir,
          `${((r.stokAkhir || 0) * (r.berat || 0)).toFixed(2)} gr`,
        ]
      : [idx + 1, r.kode, r.nama, r.stokAwal, r.tambah, r.laku, r.free, r.gantiLock, r.return, r.stokAkhir],
  );

  const ws = utils.aoa_to_sheet([header, ...data]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Laporan Stok");
  const filename = `laporan-stok-${filter.value.jenis}-${filter.value.start}-${filter.value.end}.xlsx`;
  writeFileXLSX(wb, filename);
}

onMounted(() => {
  // Ensure date inputs always start at today's date.
  const today = todayStringWITA();
  filter.value.start = today;
  filter.value.end = today;
});
</script>
