<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-database-gear me-2 text-dark"></i>
        Maintenance Database
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/users">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Maintenance</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <div class="card maintenance-card mb-3">
        <div class="card-header p-3">
          <h5 class="mb-0">
            <i class="bi bi-shield-exclamation me-2"></i>
            Penghapusan Data Per Bulan
          </h5>
        </div>
        <div class="card-body">
          <div class="alert alert-warning mb-3">
            Fitur ini hanya untuk data bulan lampau. Jalankan Analisa dulu, lalu lanjutkan hapus jika jumlah data sudah
            sesuai.
          </div>

          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label fw-semibold">Periode Bulan</label>
              <input v-model="selectedMonth" type="month" class="form-control" :max="maxAllowedMonth" />
            </div>
            <div class="col-md-8">
              <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-outline-secondary" @click="selectAllDeletable">
                  <i class="bi bi-check2-square me-1"></i>
                  Pilih Semua
                </button>
                <button class="btn btn-outline-secondary" @click="clearSelection">
                  <i class="bi bi-x-square me-1"></i>
                  Kosongkan Pilihan
                </button>
                <button class="btn btn-primary" :disabled="runningDryRun" @click="runDryRun">
                  <span v-if="runningDryRun" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-search me-1"></i>
                  Analisa Data
                </button>
              </div>
            </div>
          </div>

          <div class="row g-3 mt-1">
            <div v-for="item in collectionOptions" :key="item.key" class="col-md-6 col-xl-4">
              <label class="collection-item">
                <div class="d-flex align-items-start gap-2">
                  <input
                    :value="item.key"
                    type="checkbox"
                    class="form-check-input mt-1"
                    :checked="selectedCollections.includes(item.key)"
                    :disabled="!item.deletable"
                    @change="toggleCollection(item.key, $event.target.checked)"
                  />
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2">
                      <strong>{{ item.label }}</strong>
                      <span v-if="!item.deletable" class="badge text-bg-secondary">Monitor</span>
                    </div>
                    <small class="text-muted d-block">{{ item.description }}</small>
                    <small v-if="item.reason" class="text-danger d-block">{{ item.reason }}</small>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="card maintenance-card" v-if="analysisResult">
        <div class="card-header p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 class="mb-0">
            <i class="bi bi-bar-chart-line me-2"></i>
            Hasil Analisa
          </h5>
          <span class="badge text-bg-dark">{{ analysisResult.month }}</span>
        </div>
        <div class="card-body">
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <div class="summary-box">
                <div class="summary-label">Total Dokumen Terdeteksi</div>
                <div class="summary-value text-primary">{{ analysisResult.totalMatched || 0 }}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="summary-box">
                <div class="summary-label">Total Terhapus</div>
                <div class="summary-value text-danger">{{ analysisResult.totalDeleted || 0 }}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="summary-box">
                <div class="summary-label">Mode</div>
                <div class="summary-value text-dark">{{ analysisResult.action }}</div>
              </div>
            </div>
          </div>

          <div class="table-responsive mb-3">
            <table class="table table-sm align-middle">
              <thead class="table-light">
                <tr>
                  <th>Koleksi</th>
                  <th>Status</th>
                  <th class="text-end">Terdeteksi</th>
                  <th class="text-end">Terhapus</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in analysisResult.results || []" :key="row.key">
                  <td class="fw-semibold">{{ row.label }}</td>
                  <td>
                    <span :class="statusBadgeClass(row.status)">{{ row.status }}</span>
                  </td>
                  <td class="text-end">{{ row.matchedCount || 0 }}</td>
                  <td class="text-end">{{ row.deletedCount || 0 }}</td>
                  <td class="small text-muted">{{ row.reason || "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="alert alert-info mb-3" v-if="analysisResult.action === 'dryRun'">
            Analisa memakai aggregate count di server untuk menekan read dari sisi client.
          </div>

          <div v-if="analysisResult.action === 'dryRun'" class="delete-panel">
            <label class="form-label fw-semibold">Konfirmasi Hapus</label>
            <input
              v-model="confirmText"
              type="text"
              class="form-control"
              :placeholder="`Ketik HAPUS ${selectedMonth}`"
            />
            <small class="text-muted d-block mt-1">
              Wajib ketik persis:
              <strong>HAPUS {{ selectedMonth }}</strong>
            </small>

            <button class="btn btn-danger mt-3" :disabled="!canExecute || runningDelete" @click="runExecute">
              <span v-if="runningDelete" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-trash me-1"></i>
              Hapus Data Bulan {{ selectedMonth }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useAlert } from "@/composables/useAlert";
import {
  MAINTENANCE_COLLECTIONS,
  getDefaultMaintenanceSelection,
  maintenanceDryRun,
  maintenanceExecute,
} from "@/services/maintenance-service";

const { confirm, error: showError, toast, success } = useAlert();

const collectionOptions = MAINTENANCE_COLLECTIONS;
const selectedMonth = ref(getPreviousMonth());
const selectedCollections = ref(getDefaultMaintenanceSelection());
const analysisResult = ref(null);
const runningDryRun = ref(false);
const runningDelete = ref(false);
const confirmText = ref("");

const maxAllowedMonth = computed(() => getPreviousMonth());

const canExecute = computed(() => {
  if (!analysisResult.value || analysisResult.value.action !== "dryRun") return false;
  if (analysisResult.value.month !== selectedMonth.value) return false;
  if ((analysisResult.value.totalMatched || 0) === 0) return false;
  return confirmText.value.trim() === `HAPUS ${selectedMonth.value}`;
});

function getPreviousMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toggleCollection(key, checked) {
  if (checked) {
    if (!selectedCollections.value.includes(key)) selectedCollections.value.push(key);
    return;
  }
  selectedCollections.value = selectedCollections.value.filter((item) => item !== key);
}

function selectAllDeletable() {
  selectedCollections.value = collectionOptions.filter((item) => item.deletable).map((item) => item.key);
}

function clearSelection() {
  selectedCollections.value = [];
}

function statusBadgeClass(status) {
  if (status === "ready") return "badge text-bg-primary";
  if (status === "deleted") return "badge text-bg-danger";
  if (status === "skipped") return "badge text-bg-secondary";
  if (status === "empty") return "badge text-bg-light";
  return "badge text-bg-dark";
}

async function runDryRun() {
  if (!selectedMonth.value) {
    showError("Bulan belum dipilih", "Silakan pilih bulan terlebih dahulu.");
    return;
  }
  if (!selectedCollections.value.length) {
    showError("Koleksi kosong", "Pilih minimal satu koleksi.");
    return;
  }

  try {
    runningDryRun.value = true;
    analysisResult.value = await maintenanceDryRun(selectedMonth.value, selectedCollections.value);
    confirmText.value = "";
    toast("Analisa selesai", "success");
  } catch (e) {
    showError("Analisa gagal", e.message || "Terjadi kesalahan.");
  } finally {
    runningDryRun.value = false;
  }
}

async function runExecute() {
  if (!canExecute.value) return;

  const result = await confirm({
    title: "Hapus Data Bulanan?",
    text: `Data bulan ${selectedMonth.value} akan dihapus permanen.`,
    confirmText: "Ya, hapus",
  });
  if (!result.isConfirmed) return;

  try {
    runningDelete.value = true;
    analysisResult.value = await maintenanceExecute(selectedMonth.value, selectedCollections.value);
    await success(`Penghapusan selesai. Total terhapus: ${analysisResult.value.totalDeleted || 0}`);
  } catch (e) {
    showError("Penghapusan gagal", e.message || "Terjadi kesalahan.");
  } finally {
    runningDelete.value = false;
  }
}
</script>

<style scoped>
.maintenance-card {
  border: none;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.card-header {
  background: linear-gradient(135deg, #eef2ff 0%, #f8f9fa 100%);
}

.collection-item {
  display: block;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 0.75rem;
  height: 100%;
}

.summary-box {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 0.75rem;
  height: 100%;
}

.summary-label {
  font-size: 0.78rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.2;
}

.delete-panel {
  border-top: 1px dashed #ced4da;
  padding-top: 1rem;
}
</style>
