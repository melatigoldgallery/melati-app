<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-bar-chart me-2 text-warning"></i>Laporan Servis
      </h4>
    </div>

    <!-- Filter -->
    <div class="card border-0 shadow-sm mb-3">
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
          <div class="col-md-auto">
            <button class="btn btn-warning btn-sm" @click="loadData" :disabled="loading">
              <i class="bi bi-search me-1"></i>Tampilkan
            </button>
          </div>
          <div class="col-md-auto ms-auto d-flex gap-2 align-items-end">
            <button
              v-if="items.length > 0"
              class="btn btn-success btn-sm"
              @click="exportExcel"
            >
              <i class="bi bi-file-earmark-spreadsheet me-1"></i>Export Excel
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
            <div class="fs-4 fw-bold text-primary">{{ items.length }}</div>
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
            <div class="fs-4 fw-bold text-warning">{{ items.length - selesaiCount }}</div>
          </div>
        </div>
      </div>

      <!-- By Jenis Servis Summary -->
      <div class="row g-2 mb-3">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white small fw-semibold py-2">Rekap per Jenis Servis</div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Jenis</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-end">Total Ongkos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, jenis) in byJenis" :key="jenis">
                    <td>{{ jenis }}</td>
                    <td class="text-center fw-bold">{{ row.count }}</td>
                    <td class="text-end">Rp {{ row.total.toLocaleString("id-ID") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-white small fw-semibold py-2">Rekap per Status Pembayaran</div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Status</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, status) in byPembayaran" :key="status">
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
        <div class="card-header bg-white fw-semibold py-2 small">
          <i class="bi bi-table me-1"></i>Detail Servis ({{ items.length }} data)
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:42px">#</th>
                <th>Tanggal</th>
                <th>Customer</th>
                <th>Barang</th>
                <th>Jenis</th>
                <th class="text-center">Status Servis</th>
                <th class="text-end">Ongkos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in items" :key="item.id">
                <td class="small text-muted align-middle">{{ idx + 1 }}</td>
                <td class="small align-middle">{{ item.tanggal }}</td>
                <td class="align-middle">{{ item.namaCustomer }}</td>
                <td class="small align-middle">{{ item.namaBarang }}</td>
                <td class="align-middle">
                  <span class="badge bg-light text-dark border small">
                    {{ item.jenisInput === "custom" ? "CUSTOM" : (item.jenisServis || item.detailBarang?.[0]?.jenisServis || "-") }}
                  </span>
                </td>
                <td class="text-center align-middle">
                  <span
                    class="badge"
                    :class="item.statusServis === 'Sudah Selesai' ? 'bg-success' : 'bg-warning text-dark'"
                  >{{ item.statusServis }}</span>
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
import { ref, computed } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { fetchServisByRange, JENIS_SERVIS_OPTIONS, statusPembayaranLabel } from "@/services/servis-service";

const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

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

// ── Computed ──────────────────────────────────────────────────────────────
const totalPendapatan = computed(() =>
  items.value.reduce((s, i) => s + Number(i.totalOngkos || i.ongkos || 0), 0),
);

const selesaiCount = computed(() => items.value.filter((i) => i.statusServis === "Sudah Selesai").length);

const byJenis = computed(() => {
  const map = {};
  items.value.forEach((item) => {
    const jenis = item.jenisInput === "custom"
      ? "CUSTOM"
      : (item.jenisServis || item.detailBarang?.[0]?.jenisServis || "LAINNYA");
    if (!map[jenis]) map[jenis] = { count: 0, total: 0 };
    map[jenis].count++;
    map[jenis].total += Number(item.totalOngkos || item.ongkos || 0);
  });
  return map;
});

const byPembayaran = computed(() => {
  const map = {};
  items.value.forEach((item) => {
    const details = item.jenisInput === "custom" ? item.detailBarangCustom : item.detailBarang;
    if (Array.isArray(details)) {
      details.forEach((d) => {
        const label = statusPembayaranLabel(d.statusPembayaran) || "LAINNYA";
        if (!map[label]) map[label] = { count: 0, total: 0 };
        map[label].count++;
        map[label].total += Number(d.ongkos || 0);
      });
    } else {
      // No detail array - use root-level info
      const label = "LUNAS";
      if (!map[label]) map[label] = { count: 0, total: 0 };
      map[label].count++;
      map[label].total += Number(item.totalOngkos || item.ongkos || 0);
    }
  });
  return map;
});

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  if (!filterStart.value || !filterEnd.value) return;
  loading.value = true;
  items.value = [];
  try {
    items.value = await fetchServisByRange(filterStart.value, filterEnd.value);
  } catch (e) {
    showError("Gagal memuat laporan", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Export Excel ──────────────────────────────────────────────────────────
async function exportExcel() {
  const { utils, writeFileXLSX } = await import("xlsx");
  const rows = items.value.map((item, idx) => ({
    No: idx + 1,
    Tanggal: item.tanggal,
    Customer: item.namaCustomer,
    "No HP": item.noHp,
    Barang: item.namaBarang,
    Jenis: item.jenisInput === "custom" ? "CUSTOM" : (item.jenisServis || item.detailBarang?.[0]?.jenisServis || "-"),
    Sales: item.namaSales,
    "Status Servis": item.statusServis,
    "Status Pengambilan": item.statusPengambilan,
    "Total Ongkos": Number(item.totalOngkos || item.ongkos || 0),
  }));
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Laporan Servis");
  writeFileXLSX(wb, `laporan-servis-${filterStart.value}_${filterEnd.value}.xlsx`);
}
</script>