<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-bar-chart me-2 text-dark"></i>
        Laporan Servis
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/servis/input">Servis</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Servis</li>
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
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Awal</label>
            <input v-model="filterStart" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Akhir</label>
            <input v-model="filterEnd" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Servis</label>
            <select v-model="statusServisFilter" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="Belum Selesai">Belum Selesai</option>
              <option value="Sudah Selesai">Sudah Selesai</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="statusPengambilanFilter" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="Belum Diambil">Belum Diambil</option>
              <option value="Sudah Diambil">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Jenis</label>
            <select v-model="jenisFilter" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="servis">Servis</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Metode Pengambilan</label>
            <select v-model="returnOwnerFilter" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="return_owner">Return Owner</option>
              <option value="non_return_owner">Non Return Owner</option>
            </select>
          </div>
          <div class="col-md-auto">
            <button class="btn btn-tampilkan btn-sm" @click="loadData" :disabled="loading">
              <i class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat laporan...</p>
    </div>

    <template v-else-if="items.length > 0">
      <!-- Summary Cards -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Total Pekerjaan</div>
            <div class="fs-4 fw-bold text-primary">{{ filteredItems.length }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Total Pendapatan</div>
            <div class="fs-5 fw-bold text-success">Rp {{ totalPendapatan.toLocaleString("id-ID") }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Sudah Selesai</div>
            <div class="fs-4 fw-bold text-success">{{ selesaiCount }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Belum Selesai</div>
            <div class="fs-4 fw-bold text-warning">{{ filteredItems.length - selesaiCount }}</div>
          </div>
        </div>
      </div>

      <!-- By Jenis Servis Summary -->
      <div class="row g-2 mb-3">
        <div class="col-md-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white fw-semibold py-2">
              <span>
                <i class="bi bi-grid-3x3-gap-fill me-1"></i>
                Rekap per Jenis Servis
              </span>
            </div>
            <div class="card-body p-2">
              <div class="row g-2">
                <div
                  v-for="(columnRows, colIdx) in byJenisColumns"
                  :key="`jenis-col-${colIdx}`"
                  :class="byJenisColumns.length > 1 ? 'col-md-6' : 'col-12'"
                >
                  <table class="table table-sm mb-0">
                    <thead class="table-primary">
                      <tr>
                        <th>Jenis</th>
                        <th class="text-center">Jumlah</th>
                        <th class="text-end">Total Ongkos</th>
                      </tr>
                    </thead>
                    <tbody class="table-body-compact">
                      <tr v-if="!columnRows.length">
                        <td colspan="3" class="text-center text-muted">Belum ada data</td>
                      </tr>
                      <tr v-for="row in columnRows" :key="row.jenis">
                        <td>{{ row.jenis }}</td>
                        <td class="text-center fw-bold">{{ row.count }}</td>
                        <td class="text-end">Rp {{ row.total.toLocaleString("id-ID") }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white fw-semibold py-2">
              <span>
                <i class="bi bi-clipboard2-check-fill me-1"></i>
                Rekap per Status Pengambilan
              </span>
            </div>
            <div class="card-body p-2">
              <table class="table table-sm mb-0">
                <thead class="table-primary">
                  <tr>
                    <th>Status Pengambilan</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-end">Total Ongkos</th>
                  </tr>
                </thead>
                <tbody class="table-body-compact">
                  <tr v-for="(row, status) in byPengambilan" :key="status">
                    <td>{{ status }}</td>
                    <td class="text-center fw-bold">{{ row.count }}</td>
                    <td class="text-end">Rp {{ row.total.toLocaleString("id-ID") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-table me-1"></i>
            Detail Servis
          </span>

          <div class="col-md-auto ms-auto d-flex gap-2 align-items-end">
            <button
              v-if="filteredItems.length > 0"
              class="btn btn-success btn-sm"
              @click="exportReport"
              :disabled="exporting"
            >
              <span
                v-if="exporting"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              <i v-else class="bi bi-file-earmark-zip me-1"></i>
              {{ exporting ? exportProgressText || "Mengekspor..." : "Export ZIP (Excel + Foto)" }}
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 42px">#</th>
                <th>Tanggal</th>
                <th>Customer</th>
                <th>Barang</th>
                <th>Jenis</th>
                <th class="text-center">Status Servis</th>
                <th class="text-end">Ongkos</th>
              </tr>
            </thead>
            <tbody class="table-body-compact">
              <tr v-for="(item, idx) in paginatedItems" :key="item.id">
                <td class="small text-muted align-middle">{{ (page - 1) * pageSize + idx + 1 }}</td>
                <td class="small align-middle">{{ formatTanggal(item.tanggal) }}</td>
                <td class="align-middle">{{ item.namaCustomer }}</td>
                <td class="small align-middle">{{ item.namaBarang }}</td>
                <td class="align-middle">
                  <span class="badge bg-light text-dark border small">
                    {{
                      item.jenisInput === "custom"
                        ? "CUSTOM"
                        : item.jenisServis || item.detailBarang?.[0]?.jenisServis || "-"
                    }}
                  </span>
                </td>
                <td class="text-center align-middle">
                  <span
                    class="badge"
                    :class="item.statusServis === 'Sudah Selesai' ? 'bg-success' : 'bg-warning text-dark'"
                  >
                    {{ item.statusServis }}
                  </span>
                </td>
                <td class="text-end align-middle small fw-semibold">
                  Rp {{ Number(item.totalOngkos || item.ongkos || 0).toLocaleString("id-ID") }}
                </td>
              </tr>
            </tbody>
            <tfoot class="table-light fw-bold">
              <tr>
                <td colspan="6" class="text-end">Total Pendapatan:</td>
                <td class="text-end text-success">Rp {{ totalPendapatan.toLocaleString("id-ID") }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div v-if="!filteredItems.length" class="text-center text-muted py-4 border-top">
          Tidak ada data sesuai filter status.
        </div>
        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="d-flex align-items-center justify-content-between px-3 py-2 border-top flex-wrap gap-2"
        >
          <span class="small text-muted">
            Menampilkan {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filteredItems.length) }} dari
            {{ filteredItems.length }}
          </span>
          <div class="d-flex gap-3 align-items-center">
            <span class="text-muted" style="font-size: 0.75rem">Halaman {{ page }} dari {{ totalPages }}</span>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" :class="{ disabled: page === 1 }">
                  <button class="page-link" @click="page = 1">&laquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: page === 1 }">
                  <button class="page-link" @click="page--">&lsaquo;</button>
                </li>
                <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === page }">
                  <button class="page-link" @click="page = p">{{ p }}</button>
                </li>
                <li class="page-item" :class="{ disabled: page === totalPages }">
                  <button class="page-link" @click="page++">&rsaquo;</button>
                </li>
                <li class="page-item" :class="{ disabled: page === totalPages }">
                  <button class="page-link" @click="page = totalPages">&raquo;</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-bar-chart display-4 d-block mb-2 opacity-25"></i>
        Pilih periode dan klik Tampilkan untuk melihat laporan.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { fetchServisByRange, JENIS_SERVIS_OPTIONS } from "@/services/servis-service";

const { error: showError, swal } = useAlert();
const { todayStringWITA } = useWITA();

// ── Date helper ───────────────────────────────────────────────────────────
function formatTanggal(val) {
  if (!val) return "-";
  return String(val).substring(0, 10);
}

// ── Default to current month ──────────────────────────────────────────────
function currentMonthStart() {
  const t = todayStringWITA();
  return `${t.substring(0, 7)}-01`;
}
function currentMonthEnd() {
  const t = todayStringWITA();
  const [y, m] = t.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${t.substring(0, 7)}-${String(last).padStart(2, "0")}`;
}

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const items = ref([]);
const filterStart = ref(currentMonthStart());
const filterEnd = ref(currentMonthEnd());
const statusServisFilter = ref("Sudah Selesai");
const statusPengambilanFilter = ref("Belum Diambil");
const jenisFilter = ref("servis");
const returnOwnerFilter = ref("");
const exporting = ref(false);
const exportProgressText = ref("");

// Pagination
const page = ref(1);
const pageSize = 25;

// ── Computed ──────────────────────────────────────────────────────────────
const filteredItems = computed(() =>
  items.value.filter((i) => {
    const matchesStatusServis = statusServisFilter.value ? i.statusServis === statusServisFilter.value : true;
    const matchesStatusPengambilan = statusPengambilanFilter.value
      ? i.statusPengambilan === statusPengambilanFilter.value
      : true;
    const matchesJenis = jenisFilter.value ? (i.jenisInput || "servis") === jenisFilter.value : true;
    const isReturnOwner = i.metodePengambilan === "return_owner";
    const matchesReturnOwner =
      returnOwnerFilter.value === "return_owner"
        ? isReturnOwner
        : returnOwnerFilter.value === "non_return_owner"
          ? !isReturnOwner
          : true;
    return matchesStatusServis && matchesStatusPengambilan && matchesJenis && matchesReturnOwner;
  }),
);

const totalPendapatan = computed(() =>
  filteredItems.value.reduce((s, i) => s + Number(i.totalOngkos || i.ongkos || 0), 0),
);

const selesaiCount = computed(() => filteredItems.value.filter((i) => i.statusServis === "Sudah Selesai").length);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)));

const paginatedItems = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredItems.value.slice(start, start + pageSize);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const cur = page.value;
  const pages = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i);
  return pages;
});

const byJenisEntries = computed(() => {
  const map = new Map();
  filteredItems.value.forEach((item) => {
    const jenis =
      item.jenisInput === "custom" ? "CUSTOM" : item.jenisServis || item.detailBarang?.[0]?.jenisServis || "LAINNYA";
    if (!map.has(jenis)) map.set(jenis, { jenis, count: 0, total: 0 });
    const row = map.get(jenis);
    row.count++;
    row.total += Number(item.totalOngkos || item.ongkos || 0);
  });
  return [...map.values()];
});

const byJenisColumns = computed(() => {
  const rows = byJenisEntries.value;
  if (rows.length <= 10) return [rows];
  const midpoint = Math.ceil(rows.length / 2);
  return [rows.slice(0, midpoint), rows.slice(midpoint)];
});

const byPengambilan = computed(() => {
  const map = {};
  filteredItems.value.forEach((item) => {
    const status = item.statusPengambilan || "Belum Diambil";
    if (!map[status]) map[status] = { count: 0, total: 0 };
    map[status].count++;
    map[status].total += Number(item.totalOngkos || item.ongkos || 0);
  });
  return map;
});

watch([statusServisFilter, statusPengambilanFilter, jenisFilter, returnOwnerFilter], () => {
  page.value = 1;
});

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  if (!filterStart.value || !filterEnd.value) return;
  loading.value = true;
  items.value = [];
  page.value = 1;
  try {
    items.value = await fetchServisByRange(filterStart.value, filterEnd.value);
  } catch (e) {
    showError("Gagal memuat laporan", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Export Excel + ZIP Foto ───────────────────────────────────────────────
function formatWaktuPengambilan(val) {
  if (!val) return "-";
  try {
    let d;
    if (typeof val?.toDate === "function") d = val.toDate();
    else if (typeof val?.seconds === "number") d = new Date(val.seconds * 1000);
    else d = new Date(val);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID");
  } catch {
    return "-";
  }
}

function sanitizeName(value, fallback = "customer") {
  const cleaned = String(value || fallback)
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
  return (cleaned || fallback).substring(0, 30);
}

function getPhotoExtension(url) {
  try {
    const withoutQuery = String(url || "").split("?")[0];
    const fileName = decodeURIComponent(withoutQuery.split("/").pop() || "");
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex > -1) return fileName.substring(dotIndex);
    return ".jpg";
  } catch {
    return ".jpg";
  }
}

function getPhotoFileName(item) {
  const photoUrl = getExportPhotoUrl(item);
  if (!photoUrl) return "-";
  const customer = sanitizeName(item.namaCustomer, "customer");
  const hp = sanitizeName(item.noHp || "nohp", "nohp");
  const ext = getPhotoExtension(photoUrl);
  return `${customer}_${hp}${ext}`;
}

function getExportPhotoUrl(item) {
  return item?.buktiPengambilanLiteUrl || item?.buktiPengambilanUrl || "";
}

function getDownloadConcurrency(total) {
  const conn =
    typeof navigator !== "undefined"
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null;

  if (conn?.saveData) return Math.min(2, total);
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return Math.min(2, total);
  if (conn?.effectiveType === "3g") return Math.min(3, total);

  return Math.min(8, total);
}

async function fetchPhotoBlobWithRetry(url, maxRetry = 1) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetry) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Gagal mengunduh foto");
}

function getItemJenis(item) {
  return item.jenisInput === "custom" ? "CUSTOM" : item.jenisServis || item.detailBarang?.[0]?.jenisServis || "-";
}

function getItemNamaBarang(item) {
  if (item.namaBarang) return item.namaBarang;
  const details = item.jenisInput === "custom" ? item.detailBarangCustom || [] : item.detailBarang || [];
  const names = details.map((d) => d?.namaBarang).filter(Boolean);
  return names.length ? names.join(" / ") : "-";
}

function getItemOngkos(item) {
  if (item.totalOngkos != null) return Number(item.totalOngkos);
  return Number(item.ongkos || 0);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportReport() {
  const source = filteredItems.value;
  if (!source.length) {
    await swal("Tidak ada data untuk diekspor", "warning");
    return;
  }

  exporting.value = true;
  exportProgressText.value = "Membuat Excel...";

  try {
    const xlsx = await import("xlsx");
    const { utils, write } = xlsx;
    const exportBaseName = `laporan-servis-${filterStart.value}_${filterEnd.value}`;

    const header = [
      "No",
      "Tanggal",
      "Sales",
      "Nama Customer",
      "No HP",
      "Nama Barang",
      "Jenis",
      "Status Servis",
      "Status Pengambilan",
      "Handle Pengambilan",
      "Waktu Pengambilan",
      "Total Ongkos",
      "Nama File Foto",
    ];

    const rows = source.map((item, idx) => [
      idx + 1,
      formatTanggal(item.tanggal),
      item.sales || item.namaSales || "-",
      item.namaCustomer || "-",
      item.noHp || "-",
      getItemNamaBarang(item),
      getItemJenis(item),
      item.statusServis || "-",
      item.statusPengambilan || "-",
      item.stafHandle || "-",
      formatWaktuPengambilan(item.waktuPengambilan),
      getItemOngkos(item),
      getPhotoFileName(item),
    ]);

    const worksheet = utils.aoa_to_sheet([
      ["Laporan Servis"],
      [`Periode: ${filterStart.value} s/d ${filterEnd.value}`],
      [],
      header,
      ...rows,
    ]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Laporan Servis");

    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
    const excelBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const dataWithPhotos = source.filter((item) => getExportPhotoUrl(item));

    if (!dataWithPhotos.length) {
      triggerDownload(excelBlob, `${exportBaseName}.xlsx`);
      await swal("File Excel berhasil diunduh (tanpa foto)", "success");
      return;
    }

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file(`${exportBaseName}.xlsx`, excelBlob);
    const photoFolder = zip.folder("bukti-pengambilan");

    let successCount = 0;
    let failedCount = 0;
    let processedCount = 0;
    const totalPhotos = dataWithPhotos.length;
    const batchSize = getDownloadConcurrency(totalPhotos);

    const downloadPhoto = async (item) => {
      try {
        const photoBlob = await fetchPhotoBlobWithRetry(getExportPhotoUrl(item), 1);
        photoFolder.file(getPhotoFileName(item), photoBlob);
        successCount++;
      } catch {
        failedCount++;
      } finally {
        processedCount++;
        exportProgressText.value = `Mengunduh foto... (${processedCount}/${totalPhotos})`;
      }
    };

    exportProgressText.value = `Mengunduh foto... (0/${totalPhotos})`;
    for (let i = 0; i < totalPhotos; i += batchSize) {
      const batch = dataWithPhotos.slice(i, i + batchSize);
      await Promise.all(batch.map((item) => downloadPhoto(item)));
    }

    exportProgressText.value = "Membuat file ZIP...";
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true });
    triggerDownload(zipBlob, `${exportBaseName}.zip`);

    if (failedCount > 0) {
      await swal(`ZIP berhasil diunduh. ${successCount} foto berhasil, ${failedCount} foto gagal.`, "warning");
    } else {
      await swal(`ZIP berhasil diunduh dengan ${successCount} foto bukti.`, "success");
    }
  } catch (e) {
    showError("Gagal mengekspor laporan", e?.message || String(e));
  } finally {
    exporting.value = false;
    exportProgressText.value = "";
  }
}
</script>

<style scoped>
.table-body-compact {
  font-size: 0.82rem;
}
</style>
