<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-calendar-week me-2 text-info"></i>
        Laporan Stok Harian
      </h4>
    </div>

    <!-- Filter & Actions -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Tanggal</label>
            <input v-model="selectedDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-auto">
            <button class="btn btn-info btn-sm" @click="loadReport" :disabled="loading">
              <i class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
          <div class="col-md-auto ms-auto">
            <button class="btn btn-warning btn-sm" @click="saveSnapshot" :disabled="saving || loading">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-info" role="status"></div>
      <p class="mt-2 text-muted small">Memuat laporan...</p>
    </div>

    <!-- Report Table -->
    <template v-else-if="reportData">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
          <span class="fw-semibold small">
            <i class="bi bi-table me-1"></i>
            Stok Tanggal {{ reportData.date }}
          </span>
          <span class="badge" :class="dataSource === 'saved' ? 'bg-success' : 'bg-secondary'">
            {{ dataSource === "saved" ? "Snapshot Tersimpan" : "Data Live" }}
          </span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px">#</th>
                  <th>Jenis Perhiasan</th>
                  <th class="text-center">Total Fisik</th>
                  <th class="text-center">Stok Komputer</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Detail / Lokasi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(cat, idx) in MAIN_CATEGORIES" :key="cat">
                  <td class="text-muted small align-middle">{{ idx + 1 }}</td>
                  <td class="fw-semibold align-middle">{{ cat }}</td>
                  <td class="text-center fw-bold align-middle">
                    {{ reportData.items[cat]?.total ?? 0 }}
                  </td>
                  <td class="text-center align-middle">
                    {{ reportData.items[cat]?.komputer ?? 0 }}
                  </td>
                  <td class="text-center align-middle">
                    <span class="badge" :class="statusBadgeClass(reportData.items[cat]?.status)">
                      {{ reportData.items[cat]?.status ?? "-" }}
                    </span>
                  </td>
                  <td class="text-center align-middle">
                    <button class="btn btn-outline-primary btn-sm" @click="openBreakdown(cat)">
                      <i class="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-calendar-x display-4 d-block mb-2 opacity-25"></i>
        Pilih tanggal dan klik Tampilkan untuk melihat laporan.
      </div>
    </div>

    <!-- ── Breakdown Modal ── -->
    <div class="modal fade" id="breakdownModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-list-ul me-2 text-primary"></i>
              Detail per Lokasi — {{ breakdownCat }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th>Lokasi</th>
                  <th class="text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(val, label) in breakdownData" :key="label">
                  <td>{{ label }}</td>
                  <td class="text-center fw-bold">{{ val?.quantity ?? val }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  MAIN_CATEGORIES,
  SUB_CATEGORIES,
  fetchAllStockData,
  calcFisikTotal,
  getStockStatus,
  fetchDailyReport,
  saveDailyReport,
} from "@/services/inventory-service";

const { toast, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const saving = ref(false);
const selectedDate = ref(todayStringWITA());
const reportData = ref(null);
const dataSource = ref("");

const breakdownCat = ref("");
const breakdownData = ref({});

// ── Helpers ───────────────────────────────────────────────────────────────
function statusBadgeClass(status) {
  if (!status) return "bg-secondary";
  if (status === "Klop") return "bg-success";
  if (status.startsWith("Kurang")) return "bg-danger";
  return "bg-warning text-dark";
}

// ── Load Report ───────────────────────────────────────────────────────────
async function loadReport() {
  loading.value = true;
  reportData.value = null;

  const SUB_LABEL_MAP = Object.fromEntries(SUB_CATEGORIES.map((s) => [s.key, s.label]));

  try {
    const result = await fetchDailyReport(selectedDate.value);
    if (result.source === "saved") {
      dataSource.value = "saved";
      reportData.value = result.data;
    } else {
      // Compute from live data
      dataSource.value = "live";
      const stockData = await fetchAllStockData();
      const items = {};
      const breakdown = {};

      MAIN_CATEGORIES.forEach((cat) => {
        const fisik = calcFisikTotal(stockData, cat);
        const komputer = parseInt(stockData["stok-komputer"]?.[cat]?.quantity) || 0;
        const { label: status } = getStockStatus(fisik, komputer);
        items[cat] = { total: fisik, komputer, status };
        breakdown[cat] = {};
        SUB_CATEGORIES.forEach((sub) => {
          const item = stockData[sub.key]?.[cat];
          breakdown[cat][SUB_LABEL_MAP[sub.key]] = {
            quantity: item?.quantity || 0,
            details: item?.details || null,
          };
        });
      });

      reportData.value = { date: selectedDate.value, items, breakdown };
    }
  } catch (e) {
    showError("Gagal memuat laporan", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Save Snapshot ─────────────────────────────────────────────────────────
async function saveSnapshot() {
  saving.value = true;
  try {
    const stockData = await fetchAllStockData();
    await saveDailyReport(selectedDate.value, stockData);
    toast("Snapshot berhasil disimpan");
    await loadReport();
  } catch (e) {
    showError("Gagal menyimpan snapshot", e.message);
  } finally {
    saving.value = false;
  }
}

// ── Breakdown Modal ───────────────────────────────────────────────────────
function openBreakdown(cat) {
  breakdownCat.value = cat;
  breakdownData.value = reportData.value?.breakdown?.[cat] || {};
  new Modal(document.getElementById("breakdownModal")).show();
}

onMounted(loadReport);
</script>
