<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-archive me-2 text-warning"></i>
        Laporan Stok Aksesoris
      </h4>
    </div>

    <!-- Filter -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Jenis Laporan</label>
            <select v-model="filter.jenis" class="form-select form-select-sm">
              <option value="kotak-aksesoris">Kotak &amp; Aksesoris</option>
              <option value="silver">Silver</option>
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
            <button @click="loadReport" :disabled="isLoading" class="btn btn-primary btn-sm">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>
              Tampilkan
            </button>
            <button @click="exportExcel" :disabled="!reportData.length" class="btn btn-success btn-sm">
              <i class="bi bi-file-earmark-excel me-1"></i>
              Excel
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
          <span v-if="reportData.length" class="text-muted">({{ displayRows.length }} item)</span>
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
          <!-- Search -->
          <div class="p-2 border-bottom">
            <input v-model="search" type="text" class="form-control form-control-sm" style="max-width:280px" placeholder="Cari kode / nama..." />
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th class="text-center" style="width:42px">No</th>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th class="text-center">Stok Awal</th>
                  <th class="text-center">Tambah</th>
                  <th class="text-center">Laku</th>
                  <th class="text-center">Free</th>
                  <th class="text-center">Ganti Lock</th>
                  <th class="text-center">Return</th>
                  <th class="text-center fw-semibold text-primary">Stok Akhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in displayRows" :key="row.kode">
                  <td class="text-center text-muted small">{{ idx + 1 }}</td>
                  <td class="small fw-semibold text-primary">{{ row.kode }}</td>
                  <td class="small">{{ row.nama }}</td>
                  <td class="small text-center">{{ row.stokAwal }}</td>
                  <td class="small text-center text-success">{{ row.tambah || '—' }}</td>
                  <td class="small text-center text-danger">{{ row.laku || '—' }}</td>
                  <td class="small text-center text-muted">{{ row.free || '—' }}</td>
                  <td class="small text-center text-muted">{{ row.gantiLock || '—' }}</td>
                  <td class="small text-center text-warning">{{ row.return || '—' }}</td>
                  <td class="small text-center fw-bold" :class="row.stokAkhir > 0 ? 'text-primary' : 'text-secondary'">
                    {{ row.stokAkhir }}
                  </td>
                </tr>
              </tbody>
            </table>
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
          <span v-if="reportData.length" class="text-muted">({{ displayRows.length }} item)</span>
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
          <div class="p-2 border-bottom">
            <input v-model="search" type="text" class="form-control form-control-sm" style="max-width:280px" placeholder="Cari kode / nama..." />
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th class="text-center" style="width:42px">No</th>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th class="text-center">Kadar</th>
                  <th class="text-center">Berat (gr)</th>
                  <th class="text-center">Stok Awal</th>
                  <th class="text-center">Tambah</th>
                  <th class="text-center">Laku</th>
                  <th class="text-center">Lock</th>
                  <th class="text-center">Return</th>
                  <th class="text-center fw-semibold text-primary">Stok Akhir</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in displayRows" :key="row.kode">
                  <td class="text-center text-muted small">{{ idx + 1 }}</td>
                  <td class="small fw-semibold text-primary">{{ row.kode }}</td>
                  <td class="small">{{ row.nama }}</td>
                  <td class="small text-center">{{ row.kadar ?? '—' }}</td>
                  <td class="small text-center">{{ row.berat ?? '—' }}</td>
                  <td class="small text-center">{{ row.stokAwal }}</td>
                  <td class="small text-center text-success">{{ row.tambah || '—' }}</td>
                  <td class="small text-center text-danger">{{ row.laku || '—' }}</td>
                  <td class="small text-center text-muted">{{ row.gantiLock || '—' }}</td>
                  <td class="small text-center text-warning">{{ row.return || '—' }}</td>
                  <td class="small text-center fw-bold" :class="row.stokAkhir > 0 ? 'text-primary' : 'text-secondary'">
                    {{ row.stokAkhir }}
                  </td>
                </tr>
              </tbody>
              <!-- Silver totals -->
              <tfoot class="table-secondary fw-semibold">
                <tr>
                  <td colspan="5" class="text-end small">TOTAL:</td>
                  <td class="text-center small">{{ silverTotals.stokAwal }}</td>
                  <td class="text-center small">{{ silverTotals.tambah }}</td>
                  <td class="text-center small">{{ silverTotals.laku }}</td>
                  <td class="text-center small">{{ silverTotals.gantiLock }}</td>
                  <td class="text-center small">{{ silverTotals.return }}</td>
                  <td class="text-center small">{{ silverTotals.stokAkhir }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { fetchStockReport } from "@/services/stock-service";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";

const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const filter = ref({ jenis: "kotak-aksesoris", start: todayStringWITA(), end: todayStringWITA() });
const isLoading = ref(false);
const reportData = ref([]);
const search = ref("");

// ── Computed rows filtered by jenis & search ─────────────────────────────
const displayRows = computed(() => {
  let rows = reportData.value.filter((r) => {
    if (filter.value.jenis === "silver") return r.kategori === "silver";
    return r.kategori === "kotak" || r.kategori === "aksesoris";
  });
  if (search.value) {
    const q = search.value.toLowerCase();
    rows = rows.filter((r) => r.kode.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q));
  }
  return rows;
});

const silverTotals = computed(() => {
  return displayRows.value.reduce(
    (acc, r) => {
      acc.stokAwal += r.stokAwal;
      acc.tambah += r.tambah;
      acc.laku += r.laku;
      acc.gantiLock += r.gantiLock;
      acc.return += r.return;
      acc.stokAkhir += r.stokAkhir;
      return acc;
    },
    { stokAwal: 0, tambah: 0, laku: 0, gantiLock: 0, return: 0, stokAkhir: 0 },
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

// ── Export Excel ─────────────────────────────────────────────────────────
async function exportExcel() {
  const { utils, writeFileXLSX } = await import("xlsx");
  const isSilver = filter.value.jenis === "silver";

  const rows = displayRows.value;
  const header = isSilver
    ? ["No", "Kode", "Nama", "Kadar", "Berat (gr)", "Stok Awal", "Tambah", "Laku", "Lock", "Return", "Stok Akhir"]
    : ["No", "Kode", "Nama", "Stok Awal", "Tambah", "Laku", "Free", "Ganti Lock", "Return", "Stok Akhir"];

  const data = rows.map((r, idx) =>
    isSilver
      ? [idx + 1, r.kode, r.nama, r.kadar ?? "", r.berat ?? "", r.stokAwal, r.tambah, r.laku, r.gantiLock, r.return, r.stokAkhir]
      : [idx + 1, r.kode, r.nama, r.stokAwal, r.tambah, r.laku, r.free, r.gantiLock, r.return, r.stokAkhir],
  );

  const ws = utils.aoa_to_sheet([header, ...data]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Laporan Stok");
  const filename = `laporan-stok-${filter.value.jenis}-${filter.value.start}-${filter.value.end}.xlsx`;
  writeFileXLSX(wb, filename);
}

onMounted(() => {
  // intentionally no auto-load — user clicks Tampilkan
});
</script>
