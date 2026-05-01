<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-bar-chart me-2 text-dark"></i>
        Laporan Order Online
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/order-online/input">Order Online</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Order</li>
        </ol>
      </nav>
    </div>

    <!-- Filter Card -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold py-2">
        <span>
          <i class="bi bi-funnel me-1 text-dark"></i>
          Filter Laporan
        </span>
      </div>
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Awal</label>
            <input v-model="filterStartDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Akhir</label>
            <input v-model="filterEndDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="filterStatus" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="BELUM_DIAMBIL">Belum Diambil</option>
              <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-md-auto">
            <button class="btn btn-tampilkan btn-sm" :disabled="loading" @click="loadData">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat laporan order online...</p>
    </div>

    <!-- Report View -->
    <template v-else-if="hasLoaded && rows.length > 0">
      <!-- Summary Cards -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Total Order</div>
            <div class="fs-4 fw-bold text-primary">{{ rows.length }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Total Nilai</div>
            <div class="fs-5 fw-bold text-success">Rp {{ totalNilai.toLocaleString("id-ID") }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Sudah Diambil</div>
            <div class="fs-4 fw-bold text-success">{{ sudahDiambilCount }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center p-2">
            <div class="small text-muted">Belum Diambil</div>
            <div class="fs-4 fw-bold text-warning">{{ rows.length - sudahDiambilCount }}</div>
          </div>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold py-2">
          <span>
            <i class="bi bi-list-ul me-1 text-dark"></i>
            Detail Laporan ({{ rows.length }} data)
          </span>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 42px">#</th>
                <th style="min-width: 130px">Tanggal / Jam</th>
                <th style="min-width: 140px">Customer</th>
                <th style="min-width: 110px">Kontak</th>
                <th style="min-width: 140px">Barang</th>
                <th style="width: 130px" class="text-end">Harga</th>
                <th style="width: 140px" class="text-center">Status Pengambilan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in rows" :key="row.id">
                <td class="small text-muted fw-semibold">{{ index + 1 }}</td>
                <td class="small">
                  <div>{{ formatOrderDateTime(row.tanggal, row.jam) }}</div>
                </td>
                <td class="fw-semibold">{{ row.namaCustomer }}</td>
                <td class="small text-muted">{{ row.kontak }}</td>
                <td class="small">{{ row.namaBarang }}</td>
                <td class="text-end small fw-semibold">Rp {{ formatCurrency(row.harga) }}</td>
                <td class="text-center">
                  <span class="badge" :class="row.statusPengambilan === 'SUDAH_DIAMBIL' ? 'bg-success' : 'bg-warning text-dark'">
                    {{ displayStatus(row.statusPengambilan) }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot class="table-light fw-bold">
              <tr>
                <td colspan="5" class="text-end">Total Nilai:</td>
                <td class="text-end text-success">Rp {{ totalNilai.toLocaleString("id-ID") }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-bar-chart display-5 d-block mb-2 opacity-25"></i>
        Pilih filter lalu klik Tampilkan untuk melihat laporan order online.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { fetchOrderOnlineByRange, formatOrderDateTime } from "@/services/order-online-service";

const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const filterStartDate = ref(todayStringWITA());
const filterEndDate = ref(todayStringWITA());
const filterStatus = ref("");
const rows = ref([]);
const loading = ref(false);
const hasLoaded = ref(false);

const totalNilai = computed(() => {
  return rows.value.reduce((sum, row) => sum + Number(row.harga || 0), 0);
});

const sudahDiambilCount = computed(() => {
  return rows.value.filter((row) => row.statusPengambilan === "SUDAH_DIAMBIL").length;
});

function formatCurrency(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString("id-ID") : "0";
}

function displayStatus(status) {
  if (status === "SUDAH_DIAMBIL") return "Sudah Diambil";
  if (status === "BELUM_DIAMBIL") return "Belum Diambil";
  return status || "-";
}

async function loadData() {
  try {
    loading.value = true;
    rows.value = await fetchOrderOnlineByRange(filterStartDate.value, filterEndDate.value, filterStatus.value);
    hasLoaded.value = true;
  } catch (error) {
    showError("Gagal memuat laporan order online", error?.message || "Silakan coba lagi.");
  } finally {
    loading.value = false;
  }
}
</script>
