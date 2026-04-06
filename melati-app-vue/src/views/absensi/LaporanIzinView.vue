<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-clipboard-data me-2 text-warning"></i>Laporan Izin
      </h4>
      <button class="btn btn-outline-success btn-sm" @click="exportExcel" :disabled="rows.length === 0">
        <i class="bi bi-file-earmark-excel me-1"></i>Export Excel
      </button>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
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
            <label class="form-label small fw-semibold mb-1">Status</label>
            <select v-model="filter.status" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="Menunggu Persetujuan">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
          <div class="col-md-auto">
            <button class="btn btn-warning btn-sm" @click="loadReport" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Tanggal Mulai</th>
              <th>Tanggal Selesai</th>
              <th>Jenis</th>
              <th>Alasan</th>
              <th>Pengganti</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-warning" role="status"></div>
              </td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="8" class="text-center text-muted py-4">Tidak ada data.</td>
            </tr>
            <tr v-for="(r, i) in rows" :key="r.id">
              <td class="small">{{ i + 1 }}</td>
              <td class="small">{{ r.name }}</td>
              <td class="small">{{ r.leaveStartDate }}</td>
              <td class="small">{{ r.leaveEndDate }}</td>
              <td><span class="badge bg-info text-dark">{{ r.leaveType }}</span></td>
              <td class="small text-muted" style="max-width:200px">{{ r.reason }}</td>
              <td class="small">{{ r.replacementType }}</td>
              <td class="text-center">
                <span class="badge" :class="statusBadge(r.status)">{{ r.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { fetchLeavesByRange } from "@/services/absensi-service";

const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const loading = ref(false);
const rows = ref([]);

const today = todayStringWITA();
const filter = ref({ startDate: today.substring(0, 7) + "-01", endDate: today, status: "" });

function statusBadge(s) {
  if (s === "Disetujui") return "bg-success";
  if (s === "Ditolak") return "bg-danger";
  return "bg-warning text-dark";
}

async function loadReport() {
  loading.value = true;
  try {
    let data = await fetchLeavesByRange(filter.value.startDate, filter.value.endDate);
    if (filter.value.status) data = data.filter((r) => r.status === filter.value.status);
    rows.value = data.sort((a, b) => a.leaveStartDate.localeCompare(b.leaveStartDate));
  } catch (e) {
    showError("Gagal memuat laporan", e.message);
  } finally {
    loading.value = false;
  }
}

async function exportExcel() {
  const XLSX = (await import("xlsx")).default || (await import("xlsx"));
  const wsData = [
    ["#", "Nama", "Tanggal Mulai", "Tanggal Selesai", "Jenis", "Alasan", "Pengganti", "Status"],
    ...rows.value.map((r, i) => [
      i + 1, r.name, r.leaveStartDate, r.leaveEndDate,
      r.leaveType, r.reason, r.replacementType, r.status,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Izin");
  XLSX.writeFile(wb, `laporan-izin-${filter.value.startDate}-${filter.value.endDate}.xlsx`);
}
</script>
