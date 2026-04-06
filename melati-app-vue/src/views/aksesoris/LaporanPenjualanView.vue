<template>
  <div class="container-fluid py-3">
    <!-- Header & Filter -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-bar-chart-line me-2 text-warning"></i>
        Laporan Penjualan
      </h4>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <input v-model="filterStart" type="date" class="form-control form-control-sm" style="width: 155px" />
        <span class="text-muted small">s/d</span>
        <input v-model="filterEnd" type="date" class="form-control form-control-sm" style="width: 155px" />
        <button @click="loadReport" :disabled="store.isLoading" class="btn btn-primary btn-sm">
          <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-search me-1"></i>
          Tampilkan
        </button>
        <button @click="exportExcel" class="btn btn-success btn-sm">
          <i class="bi bi-file-earmark-excel me-1"></i>
          Excel
        </button>
      </div>
    </div>

    <div v-if="!hasLoaded" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5 text-muted">
        <i class="bi bi-bar-chart display-4 d-block mb-2 opacity-25"></i>
        Pilih periode dan klik Tampilkan
      </div>
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h4 fw-bold text-primary mb-0">{{ transactions.length }}</div>
            <div class="small text-muted mt-1">Total Transaksi</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h5 fw-bold text-success mb-0">{{ formatCurrency(totalPendapatan) }}</div>
            <div class="small text-muted mt-1">Total Pendapatan</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h4 fw-bold text-warning mb-0">{{ totalItem }}</div>
            <div class="small text-muted mt-1">Total Item Terjual</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h5 fw-bold text-info mb-0">{{ formatCurrency(avgPerTransaction) }}</div>
            <div class="small text-muted mt-1">Rata-rata/Transaksi</div>
          </div>
        </div>
      </div>

      <!-- Rekap per Sales -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold border-bottom py-2">
          <i class="bi bi-person-lines-fill me-2 text-info"></i>
          Rekap per Sales
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>No</th>
                  <th>Sales</th>
                  <th class="text-center">Transaksi</th>
                  <th class="text-end">Total</th>
                  <th class="text-end">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in rekapSales" :key="row.sales">
                  <td class="text-muted small">{{ i + 1 }}</td>
                  <td class="fw-semibold">{{ row.sales }}</td>
                  <td class="text-center">{{ row.count }}</td>
                  <td class="text-end text-success fw-semibold">{{ formatCurrency(row.total) }}</td>
                  <td class="text-end text-muted small">{{ formatCurrency(row.avg) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Detail Transaksi -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
          <span class="fw-semibold small">
            <i class="bi bi-table me-1"></i>
            Detail Transaksi
          </span>
          <div class="input-group input-group-sm" style="width: 220px">
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input v-model="searchText" type="text" class="form-control" placeholder="Cari..." />
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th class="text-center" style="width: 42px">No</th>
                  <th @click="sortBy('tanggal')" style="cursor: pointer">
                    Tanggal
                    <i class="bi" :class="sortIcon('tanggal')"></i>
                  </th>
                  <th @click="sortBy('salesName')" style="cursor: pointer">
                    Sales
                    <i class="bi" :class="sortIcon('salesName')"></i>
                  </th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th @click="sortBy('totalHarga')" class="text-end" style="cursor: pointer">
                    Total
                    <i class="bi" :class="sortIcon('totalHarga')"></i>
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(trx, idx) in filteredSorted" :key="trx.id">
                  <tr @click="toggleExpand(trx.id)" style="cursor: pointer">
                    <td class="text-center text-muted small">{{ idx + 1 }}</td>
                    <td class="small">{{ trx.tanggal }}</td>
                    <td class="small fw-semibold">{{ trx.salesName }}</td>
                    <td class="small text-muted">{{ trx.customerName || "—" }}</td>
                    <td class="small">{{ (trx.items ?? []).length }}</td>
                    <td class="text-end small fw-semibold text-primary">{{ formatCurrency(trx.totalHarga) }}</td>
                    <td>
                      <span class="badge" :class="statusClass(trx.statusPembayaran)">
                        {{ trx.statusPembayaran || trx.metodePembayaran || "—" }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="expandedId === trx.id" class="bg-light">
                    <td colspan="7" class="p-0">
                      <div class="p-3">
                        <table class="table table-sm table-bordered mb-0">
                          <thead class="table-secondary">
                            <tr>
                              <th>No</th>
                              <th>Kode</th>
                              <th>Nama</th>
                              <th class="text-center">Qty</th>
                              <th class="text-end">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(item, j) in trx.items ?? []" :key="j">
                              <td>{{ j + 1 }}</td>
                              <td class="text-primary fw-semibold">{{ item.kodeText || item.kode }}</td>
                              <td>{{ item.namaBarang }}</td>
                              <td class="text-center">{{ item.qty }}</td>
                              <td class="text-end">{{ formatCurrency(item.subtotal) }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="store.hasMoreTransactions" class="card-footer bg-white text-center py-2">
          <button @click="loadMore" :disabled="store.isLoading" class="btn btn-outline-primary btn-sm">
            <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1"></span>
            Muat Lebih Banyak
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAccessoriesStore } from "@/stores/accessories";
import { useAlert } from "@/composables/useAlert";

const store = useAccessoriesStore();
const { toast } = useAlert();

// ─── State ───────────────────────────────────────────────────────────────────
const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const filterStart = ref(firstOfMonth);
const filterEnd = ref(todayISO);
const searchText = ref("");
const expandedId = ref(null);
const hasLoaded = ref(false);
const sortCol = ref("tanggal");
const sortDir = ref("desc");

// ─── Computed ─────────────────────────────────────────────────────────────────
const transactions = computed(() => store.transactions);

const totalPendapatan = computed(() => transactions.value.reduce((s, t) => s + (t.totalHarga ?? 0), 0));
const totalItem = computed(() =>
  transactions.value.reduce((s, t) => s + (t.items ?? []).reduce((si, i) => si + (i.qty ?? 1), 0), 0),
);
const avgPerTransaction = computed(() =>
  transactions.value.length ? Math.round(totalPendapatan.value / transactions.value.length) : 0,
);

const rekapSales = computed(() => {
  const map = new Map();
  transactions.value.forEach((t) => {
    const s = t.salesName || "?";
    if (!map.has(s)) map.set(s, { sales: s, count: 0, total: 0 });
    const row = map.get(s);
    row.count++;
    row.total += t.totalHarga ?? 0;
  });
  return [...map.values()]
    .map((r) => ({ ...r, avg: r.count ? Math.round(r.total / r.count) : 0 }))
    .sort((a, b) => b.total - a.total);
});

const filteredSorted = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  let data = transactions.value;
  if (q) {
    data = data.filter(
      (t) =>
        (t.salesName ?? "").toLowerCase().includes(q) ||
        (t.customerName ?? "").toLowerCase().includes(q) ||
        (t.items ?? []).some((i) => (i.kodeText ?? i.kode ?? "").toLowerCase().includes(q)),
    );
  }
  return [...data].sort((a, b) => {
    let av = a[sortCol.value] ?? "";
    let bv = b[sortCol.value] ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir.value === "asc" ? -1 : 1;
    if (av > bv) return sortDir.value === "asc" ? 1 : -1;
    return 0;
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID").format(val ?? 0);
}

function statusClass(status) {
  if (!status) return "bg-secondary";
  const s = status.toLowerCase();
  if (s.includes("lunas")) return "bg-success";
  if (s.includes("dp")) return "bg-warning text-dark";
  if (s.includes("free")) return "bg-info text-dark";
  return "bg-secondary";
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function sortBy(col) {
  if (sortCol.value === col) sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortCol.value = col;
    sortDir.value = "asc";
  }
}

function sortIcon(col) {
  if (sortCol.value !== col) return "bi-arrow-down-up opacity-25";
  return sortDir.value === "asc" ? "bi-arrow-up" : "bi-arrow-down";
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function loadReport() {
  store.stopTodayListener();
  await store.loadTransactions(filterStart.value, filterEnd.value);
  hasLoaded.value = true;
}

async function loadMore() {
  await store.loadTransactions(filterStart.value, filterEnd.value, true);
}

function exportExcel() {
  if (!transactions.value.length) {
    toast("Tidak ada data untuk diekspor", "warning");
    return;
  }
  // Build CSV
  const header = ["No", "Tanggal", "Sales", "Customer", "Item", "Total", "Status"];
  const rows = transactions.value.map((t, i) => [
    i + 1,
    t.tanggal,
    t.salesName,
    t.customerName ?? "",
    (t.items ?? []).length,
    t.totalHarga,
    t.statusPembayaran ?? t.metodePembayaran ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-penjualan-${filterStart.value}-${filterEnd.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("File CSV berhasil diunduh", "success");
}
</script>
