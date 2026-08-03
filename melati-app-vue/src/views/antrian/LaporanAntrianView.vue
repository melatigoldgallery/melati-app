<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0 d-flex align-items-center gap-2">
        <i class="bi bi-bar-chart-line text-warning"></i>Analisis Antrian
        <span class="badge bg-light text-dark border small" style="font-size: 0.8rem; font-weight: 500;">
          Lantai {{ activeFloor }}
        </span>
      </h4>
      <div class="d-flex gap-2">
        <select v-model="selectedYear" @change="loadAnalytics" class="form-select form-select-sm" style="width:auto">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
        <select v-model="selectedMonth" @change="loadAnalytics" class="form-select form-select-sm" style="width:auto">
          <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
        </select>
        <button class="btn btn-outline-danger btn-sm" @click="doResetAnalytics">
          <i class="bi bi-trash me-1"></i>Reset
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-3 fw-bold text-warning">{{ kpi.todayTotal }}</div>
          <div class="small text-muted">Hari Ini</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-3 fw-bold text-primary">{{ kpi.weekTotal }}</div>
          <div class="small text-muted">Minggu Ini</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-3 fw-bold text-success">{{ kpi.monthTotal }}</div>
          <div class="small text-muted">Bulan Ini</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="fs-3 fw-bold text-info">{{ kpi.peakHour !== null ? kpi.peakHour + ':00' : '-' }}</div>
          <div class="small text-muted">Jam Tersibuk</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
    </div>

    <div v-else class="row g-3">
      <!-- Hourly Chart -->
      <div class="col-md-7">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
            <span class="fw-semibold small">Distribusi Per Jam</span>
            <select v-model="hourlyPeriod" @change="buildCharts" class="form-select form-select-sm" style="width:auto">
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>
          <div class="card-body">
            <canvas ref="hourlyChartEl" height="200"></canvas>
          </div>
        </div>
      </div>

      <!-- Daily Chart -->
      <div class="col-md-5">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
            <span class="fw-semibold small">Distribusi Per Hari</span>
            <select v-model="dailyPeriod" @change="buildCharts" class="form-select form-select-sm" style="width:auto">
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>
          <div class="card-body">
            <canvas ref="dailyChartEl" height="200"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import { fetchAnalyticsByMonth, resetAnalytics, LETTERS_MAP } from "@/services/antrian-service";
import Chart from "chart.js/auto";

const auth = useAuthStore();
const activeFloor = computed(() => auth.activeFloor || "L1");

const { error: showError, confirm } = useAlert();

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);
const loading = ref(false);
const entries = ref([]);
const hourlyPeriod = ref("today");
const dailyPeriod = ref("week");

const yearOptions = computed(() => {
  const y = now.getFullYear();
  return [y - 1, y, y + 1];
});

function monthName(m) {
  return new Date(2000, m - 1, 1).toLocaleString("id-ID", { month: "long" });
}

// ── KPI ────────────────────────────────────────────────────────────────────
const kpi = computed(() => {
  const today = now;
  const todayDate = today.getDate();
  const todayDay = today.getDay();
  const todayTotal = entries.value.filter((e) => e.date === todayDate && e.month === selectedMonth.value).length;
  const weekTotal = entries.value.filter((e) => {
    const d = new Date(e.year, e.month - 1, e.date);
    return (today - d) / 86400000 < 7;
  }).length;
  const monthTotal = entries.value.filter((e) => e.month === selectedMonth.value).length;
  const hourCounts = Array(24).fill(0);
  entries.value.forEach((e) => hourCounts[e.hour]++);
  const maxH = Math.max(...hourCounts);
  const peakHour = maxH > 0 ? hourCounts.indexOf(maxH) : null;
  return { todayTotal, weekTotal, monthTotal, peakHour };
});

// ── Letter Distribution ────────────────────────────────────────────────────
const letterDist = computed(() => {
  const dist = { J: 0, B: 0 };
  entries.value.forEach((e) => {
    const letter = e.queueNumber?.[0];
    if (["B", "C"].includes(letter)) dist.B++;
    else if (["A", "D", "E", "F"].includes(letter)) dist.J++;
  });
  return dist;
});

// ── Charts ─────────────────────────────────────────────────────────────────
const hourlyChartEl = ref(null);
const dailyChartEl = ref(null);
let hourlyChart = null;
let dailyChart = null;

function filteredByPeriod(period) {
  const today = now;
  if (period === "today") {
    return entries.value.filter((e) => e.date === today.getDate() && e.month === selectedMonth.value);
  }
  if (period === "week") {
    return entries.value.filter((e) => {
      const d = new Date(e.year, e.month - 1, e.date);
      return (today - d) / 86400000 < 7;
    });
  }
  return entries.value; // month
}

function buildCharts() {
  const hourlyData = Array(24).fill(0);
  filteredByPeriod(hourlyPeriod.value).forEach((e) => hourlyData[e.hour]++);

  const dayData = Array(7).fill(0);
  filteredByPeriod(dailyPeriod.value).forEach((e) => dayData[e.day]++);
  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  if (hourlyChart) hourlyChart.destroy();
  if (hourlyChartEl.value) {
    hourlyChart = new Chart(hourlyChartEl.value, {
      type: "bar",
      data: {
        labels: Array.from({ length: 24 }, (_, i) => i + ":00"),
        datasets: [{ label: "Antrian", data: hourlyData, backgroundColor: "#ffc107" }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    });
  }

  if (dailyChart) dailyChart.destroy();
  if (dailyChartEl.value) {
    dailyChart = new Chart(dailyChartEl.value, {
      type: "line",
      data: {
        labels: dayLabels,
        datasets: [{ label: "Antrian", data: dayData, borderColor: "#ffc107", backgroundColor: "rgba(255,193,7,0.2)", fill: true, tension: 0.3 }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    });
  }
}

async function loadAnalytics() {
  loading.value = true;
  try {
    entries.value = await fetchAnalyticsByMonth(selectedYear.value, selectedMonth.value, activeFloor.value);
    buildCharts();
  } catch (e) {
    showError("Gagal memuat analitik", e.message);
  } finally {
    loading.value = false;
  }
}

async function doResetAnalytics() {
  const r = await confirm({ title: "Reset Analitik?", text: `Hapus semua data analitik bulan ${monthName(selectedMonth.value)} ${selectedYear.value}?`, icon: "warning" });
  if (!r.isConfirmed) return;
  try {
    await resetAnalytics(selectedYear.value, selectedMonth.value, activeFloor.value);
    entries.value = [];
    buildCharts();
  } catch (e) { showError("Gagal reset", e.message); }
}

watch(activeFloor, () => {
  loadAnalytics();
});

onMounted(loadAnalytics);
onBeforeUnmount(() => { hourlyChart?.destroy(); dailyChart?.destroy(); });
</script>

