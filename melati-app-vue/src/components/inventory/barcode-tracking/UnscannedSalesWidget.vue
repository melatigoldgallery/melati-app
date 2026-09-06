<template>
  <div class="unscanned-sales-widget card border-0 shadow-sm rounded-3 overflow-hidden h-100 d-flex flex-column">
    <!-- Header -->
    <div class="card-header bg-white border-0 pt-3 pb-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div class="d-flex align-items-center gap-2">
        <div class="icon-box bg-danger-subtle text-danger rounded-2 p-2 d-flex align-items-center justify-content-center" style="width: 34px; height: 34px;">
          <i class="bi bi-person-exclamation fs-5"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-bold text-dark fs-6">Data Staff Tidak Scan Barcode</h6>
          <small class="text-muted" style="font-size: 0.75rem;">Penjualan Desktop tanpa Scan Web</small>
        </div>
      </div>

      <!-- Timeframe Selector Pill -->
      <div class="btn-group btn-group-sm p-1 bg-light rounded-pill border" role="group">
        <button
          type="button"
          class="btn rounded-pill px-3 py-1 fw-bold btn-xs"
          :class="timeframe === 'today' ? 'btn-danger text-white shadow-sm' : 'btn-light text-secondary'"
          @click="timeframe = 'today'"
        >
          Hari Ini
        </button>
        <button
          type="button"
          class="btn rounded-pill px-3 py-1 fw-bold btn-xs"
          :class="timeframe === 'month' ? 'btn-danger text-white shadow-sm' : 'btn-light text-secondary'"
          @click="timeframe = 'month'"
        >
          Bulan Ini
        </button>
      </div>
    </div>

    <!-- Card Body -->
    <div class="card-body p-3 d-flex flex-column gap-3 flex-grow-1 overflow-hidden">
      <!-- Summary Badges -->
      <div class="row g-2 flex-shrink-0">
        <div class="col-6">
          <div class="p-2 rounded-3 bg-danger-subtle border border-danger-subtle text-center">
            <span class="d-block text-muted-dark fw-semibold" style="font-size: 0.7rem;">Tidak Scan Hari Ini</span>
            <span class="fs-5 fw-bold text-danger">{{ statsToday.totalItems }}</span>
            <small class="d-block text-muted" style="font-size: 0.65rem;">({{ statsToday.totalSales }} Staff)</small>
          </div>
        </div>
        <div class="col-6">
          <div class="p-2 rounded-3 bg-warning-subtle border border-warning-subtle text-center">
            <span class="d-block text-muted-dark fw-semibold" style="font-size: 0.7rem;">Tidak Scan Bulan Ini</span>
            <span class="fs-5 fw-bold text-warning-emphasis">{{ statsMonth.totalItems }}</span>
            <small class="d-block text-muted" style="font-size: 0.65rem;">({{ statsMonth.totalSales }} Staff)</small>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="combinedSalesList.length === 0" class="text-center py-4 my-auto">
        <div class="bg-success-subtle text-success rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
          <i class="bi bi-check-lg fs-3"></i>
        </div>
        <h6 class="fw-bold text-dark mb-1 fs-6">Semua Sales Disiplin Scan!</h6>
        <p class="text-muted small mb-0" style="font-size: 0.75rem;">
          Tidak ada catatan selisih scan barcode bulan ini.
        </p>
      </div>

      <template v-else>
        <!-- Modern Chart Container -->
        <div class="chart-container position-relative rounded-3 p-2 bg-light border flex-shrink-0 d-flex justify-content-center align-items-center" style="height: 165px; contain: layout style;">
          <div v-if="activeSalesList.length === 0" class="text-center text-muted my-auto py-2">
            <i class="bi bi-bar-chart-line fs-3 d-block text-secondary mb-1 opacity-50"></i>
            <span class="small fw-semibold">Tidak ada grafik data {{ timeframe === 'today' ? 'hari ini' : 'bulan ini' }}</span>
          </div>
          <div v-else :style="chartWrapperStyle" class="position-relative w-100 h-100">
            <canvas ref="chartCanvasRef"></canvas>
          </div>
        </div>

        <!-- Sales Evaluation Ranking List (Always shows month data) -->
        <div class="sales-list-wrapper border rounded-3 overflow-auto flex-grow-1" style="flex: 1 1 0; min-height: 150px;">
          <table class="table table-hover align-middle mb-0" style="font-size: 0.8rem;">
            <thead class="table-light sticky-top" style="z-index: 2;">
              <tr>
                <th class="ps-3 py-2" style="width: 40%">Nama Sales</th>
                <th class="text-center py-2" style="width: 25%">Hari Ini</th>
                <th class="text-center py-2" style="width: 25%">Bulan Ini</th>
                <th class="text-end pe-3 py-2" style="width: 10%">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sales, idx) in combinedSalesList" :key="sales.name" class="data-row">
                <td class="ps-3 fw-semibold text-dark">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge rounded-circle p-1 d-inline-flex justify-content-center align-items-center"
                          :class="hasUnresolved(sales) ? 'bg-danger text-white' : 'bg-secondary text-white'"
                          style="width: 18px; height: 18px; font-size: 0.65rem;"
                          :title="hasUnresolved(sales) ? 'Belum diselesaikan' : 'Sudah diselesaikan'">
                      {{ idx + 1 }}
                    </span>
                    <span>{{ sales.name }}</span>
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill px-2 py-1" :class="sales.todayCount > 0 ? 'bg-danger' : 'bg-light text-muted border'">
                    {{ sales.todayCount }}
                  </span>
                </td>
                <td class="text-center">
                  <span class="badge rounded-pill px-2 py-1" :class="sales.monthCount > 0 ? 'bg-warning text-dark' : 'bg-light text-muted border'">
                    {{ sales.monthCount }}
                  </span>
                </td>
                <td class="text-end pe-3">
                  <button
                    class="btn btn-xs btn-outline-danger rounded-pill px-2 py-0"
                    style="font-size: 0.7rem;"
                    @click="openDetailModal(sales)"
                    title="Lihat Rincian Barcode"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Modal Detail Sales Unscanned Barcodes -->
    <div class="modal fade" id="unscannedDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-3">
          <div class="modal-header bg-light border-0 py-3">
            <h6 class="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              <i class="bi bi-person-badge text-danger"></i>
              <span>Detail Tidak Scan Barcode: {{ selectedSales?.name }}</span>
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-0" style="max-height: 60vh; overflow-y: auto;">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" style="font-size: 0.8rem;">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="ps-3">Detected At</th>
                    <th>Barcode</th>
                    <th>No. Faktur</th>
                    <th>Lokasi Web</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedSales?.items" :key="item.id">
                    <td class="ps-3 text-muted small">{{ formatDate(item.detectedAt) }}</td>
                    <td><span class="badge bg-light text-dark border font-monospace">{{ item.barcode }}</span></td>
                    <td class="fw-semibold text-dark">{{ item.invoice_no || '-' }}</td>
                    <td><span class="badge bg-secondary-subtle text-secondary border">{{ item.webLocation || 'display' }}</span></td>
                    <td>
                      <span v-if="item.resolved" class="badge bg-success-subtle text-success border">Selesai</span>
                      <span v-else class="badge bg-danger-subtle text-danger border">Belum Selesai</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer bg-light border-0 py-2">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-3" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, shallowRef, nextTick } from "vue";
import Chart from "chart.js/auto";
import { Modal } from "bootstrap";
import { useBarcodeDiscrepancies } from "@/composables/useBarcodeDiscrepancies";

const { discrepancies } = useBarcodeDiscrepancies();

const timeframe = ref("today"); // 'today' | 'month'
const chartCanvasRef = ref(null);
const chartInstance = shallowRef(null);
const selectedSales = ref(null);

// Date Helpers (WITA / Local Date string)
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isSameMonth(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

function parseItemDate(item) {
  if (!item) return null;
  const val = item.detectedAt || item.tanggalPenjualan;
  if (!val) return null;
  if (val.toDate && typeof val.toDate === "function") return val.toDate();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Stats Today
const statsToday = computed(() => {
  const now = new Date();
  const todayItems = discrepancies.value.filter((item) => {
    const d = parseItemDate(item);
    return d && isSameDay(d, now);
  });

  const salesMap = {};
  todayItems.forEach((item) => {
    const sName = item.namaSales || "Tanpa Nama";
    salesMap[sName] = (salesMap[sName] || 0) + 1;
  });

  return {
    totalItems: todayItems.length,
    totalSales: Object.keys(salesMap).length,
    salesMap,
  };
});

// Stats Month
const statsMonth = computed(() => {
  const now = new Date();
  const monthItems = discrepancies.value.filter((item) => {
    const d = parseItemDate(item);
    return d && isSameMonth(d, now);
  });

  const salesMap = {};
  monthItems.forEach((item) => {
    const sName = item.namaSales || "Tanpa Nama";
    salesMap[sName] = (salesMap[sName] || 0) + 1;
  });

  return {
    totalItems: monthItems.length,
    totalSales: Object.keys(salesMap).length,
    salesMap,
  };
});

// Combined list of sales for ranking table & chart
const combinedSalesList = computed(() => {
  const now = new Date();
  const salesData = {};

  discrepancies.value.forEach((item) => {
    const d = parseItemDate(item);
    if (!d) return;

    const sName = item.namaSales || "Tanpa Nama";
    if (!salesData[sName]) {
      salesData[sName] = {
        name: sName,
        todayCount: 0,
        monthCount: 0,
        items: [],
      };
    }

    if (isSameMonth(d, now)) {
      salesData[sName].monthCount++;
      salesData[sName].items.push(item);
      if (isSameDay(d, now)) {
        salesData[sName].todayCount++;
      }
    }
  });

  return Object.values(salesData).sort((a, b) => {
    const aUnresolved = hasUnresolved(a) ? 1 : 0;
    const bUnresolved = hasUnresolved(b) ? 1 : 0;
    if (bUnresolved !== aUnresolved) return bUnresolved - aUnresolved;
    return b.todayCount - a.todayCount || b.monthCount - a.monthCount;
  });
});

function hasUnresolved(sales) {
  if (!sales || !Array.isArray(sales.items)) return false;
  return sales.items.some((item) => !item.resolved);
}

// Active list based on timeframe
const activeSalesList = computed(() => {
  if (timeframe.value === "today") {
    return combinedSalesList.value.filter((s) => s.todayCount > 0);
  }
  return combinedSalesList.value.filter((s) => s.monthCount > 0);
});

// Dynamic wrapper style to keep bars centered & close together when few items exist
const chartWrapperStyle = computed(() => {
  const count = activeSalesList.value.length;
  if (count === 0) return { width: "100%", height: "100%" };
  if (count === 1) return { width: "26%", height: "100%", margin: "0 auto" };
  if (count === 2) return { width: "44%", height: "100%", margin: "0 auto" };
  if (count === 3) return { width: "60%", height: "100%", margin: "0 auto" };
  if (count === 4) return { width: "75%", height: "100%", margin: "0 auto" };
  if (count === 5) return { width: "88%", height: "100%", margin: "0 auto" };
  return { width: "100%", height: "100%" };
});

// Chart initialization and update
function initOrUpdateChart() {
  if (activeSalesList.value.length === 0) {
    if (chartInstance.value) {
      chartInstance.value.destroy();
      chartInstance.value = null;
    }
    return;
  }
  if (!chartCanvasRef.value) return;

  const labels = activeSalesList.value.map((s) => s.name);
  const dataValues = activeSalesList.value.map((s) =>
    timeframe.value === "today" ? s.todayCount : s.monthCount
  );

  const barColor = timeframe.value === "today" ? "rgba(220, 53, 69, 0.85)" : "rgba(255, 193, 7, 0.85)";
  const borderColor = timeframe.value === "today" ? "#dc3545" : "#ffc107";

  const categoryPct = 0.75;
  const barPct = 0.8;

  if (chartInstance.value) {
    chartInstance.value.data.labels = labels;
    chartInstance.value.data.datasets[0].data = dataValues;
    chartInstance.value.data.datasets[0].backgroundColor = barColor;
    chartInstance.value.data.datasets[0].borderColor = borderColor;
    chartInstance.value.data.datasets[0].categoryPercentage = categoryPct;
    chartInstance.value.data.datasets[0].barPercentage = barPct;
    chartInstance.value.update("none");
    return;
  }

  chartInstance.value = new Chart(chartCanvasRef.value, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tidak Scan Barcode",
          data: dataValues,
          backgroundColor: barColor,
          borderColor: borderColor,
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 32,
          categoryPercentage: categoryPct,
          barPercentage: barPct,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} barang tidak scan`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0, font: { size: 10 } },
          grid: { color: "rgba(0, 0, 0, 0.05)" },
        },
        x: {
          ticks: { font: { size: 10 } },
          grid: { display: false },
        },
      },
    },
  });
}

function openDetailModal(sales) {
  selectedSales.value = sales;
  const el = document.getElementById("unscannedDetailModal");
  if (el) {
    const modal = Modal.getOrCreateInstance(el);
    modal.show();
  }
}

function formatDate(val) {
  if (!val) return "-";
  let d;
  if (val.toDate) d = val.toDate();
  else d = new Date(val);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

watch([activeSalesList, timeframe], () => {
  nextTick(() => {
    initOrUpdateChart();
  });
});

onMounted(() => {
  nextTick(() => {
    initOrUpdateChart();
  });
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
});
</script>

<style scoped>
.unscanned-sales-widget {
  background: #ffffff;
}

.btn-xs {
  font-size: 0.72rem;
  line-height: 1.2;
}

.data-row:hover {
  background-color: rgba(220, 53, 69, 0.03);
}

.sales-list-wrapper::-webkit-scrollbar {
  width: 5px;
}

.sales-list-wrapper::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.sales-list-wrapper::-webkit-scrollbar-thumb {
  background: #dc3545;
  border-radius: 4px;
}

.sales-list-wrapper::-webkit-scrollbar-thumb:hover {
  background: #bb2d3b;
}
</style>
