<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-calendar3 me-2 text-warning"></i>Laporan Kehadiran
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
            <label class="form-label small fw-semibold mb-1">Shift</label>
            <select v-model="filter.shift" class="form-select form-select-sm">
              <option value="">Semua Shift</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
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
          <div class="col-md-auto">
            <button class="btn btn-warning btn-sm" @click="loadReport" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="rows.length > 0" class="row g-2 mb-3">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-4 fw-bold text-primary">{{ rows.length }}</div>
          <div class="small text-muted">Total Absensi</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-4 fw-bold text-success">{{ countBy('Tepat Waktu') }}</div>
          <div class="small text-muted">Tepat Waktu</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-4 fw-bold text-danger">{{ countBy('Terlambat') }}</div>
          <div class="small text-muted">Terlambat</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-4 fw-bold text-warning">{{ countBy('Izin Terlambat') }}</div>
          <div class="small text-muted">Izin Terlambat</div>
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
              <th>Tanggal</th>
              <th>Shift</th>
              <th>Masuk</th>
              <th>Keluar</th>
              <th>Status</th>
              <th>Telat (mnt)</th>
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
              <td class="small">{{ r.date }}</td>
              <td class="small">{{ r.shift }}</td>
              <td class="small">{{ formatTs(r.timeIn) }}</td>
              <td class="small">{{ r.timeOut ? formatTs(r.timeOut) : '-' }}</td>
              <td><span class="badge" :class="statusBadge(r.status)">{{ r.status }}</span></td>
              <td class="small text-center">{{ r.lateMinutes || 0 }}</td>
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
import { fetchAttendanceByRange } from "@/services/absensi-service";

const { error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const loading = ref(false);
const rows = ref([]);

const today = todayStringWITA();
const firstOfMonth = today.substring(0, 7) + "-01";
const filter = ref({ startDate: firstOfMonth, endDate: today, shift: "", status: "" });

function statusBadge(s) {
  if (s === "Tepat Waktu") return "bg-success";
  if (s === "Terlambat") return "bg-danger";
  return "bg-warning text-dark";
}

function countBy(status) {
  return rows.value.filter((r) => r.status === status).length;
}

function formatTs(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

async function loadReport() {
  loading.value = true;
  try {
    let data = await fetchAttendanceByRange(filter.value.startDate, filter.value.endDate);
    if (filter.value.shift) data = data.filter((r) => r.shift === filter.value.shift);
    if (filter.value.status) data = data.filter((r) => r.status === filter.value.status);
    rows.value = data.sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    showError("Gagal memuat laporan", e.message);
  } finally {
    loading.value = false;
  }
}

async function exportExcel() {
  const XLSX = (await import("xlsx")).default || (await import("xlsx"));
  const wsData = [
    ["#", "Nama", "Tanggal", "Shift", "Jam Masuk", "Jam Keluar", "Status", "Terlambat (mnt)"],
    ...rows.value.map((r, i) => [
      i + 1, r.name, r.date, r.shift,
      formatTs(r.timeIn), r.timeOut ? formatTs(r.timeOut) : "-",
      r.status, r.lateMinutes || 0,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
  XLSX.writeFile(wb, `laporan-kehadiran-${filter.value.startDate}-${filter.value.endDate}.xlsx`);
}
</script>
