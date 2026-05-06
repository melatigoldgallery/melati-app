<template>
  <div class="container-fluid py-3">
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-bar-chart-line me-2 text-dark"></i>
        Laporan Penjualan
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Laporan Penjualan</li>
        </ol>
      </nav>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header">
        <h2>
          <i class="fas fa-filter me-2"></i>
          Filter Laporan
        </h2>
      </div>
      <div class="card-body">
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <input v-model="filterStart" type="date" class="form-control form-control-sm" style="width: 155px" />
          <span class="text-muted small">s/d</span>
          <input v-model="filterEnd" type="date" class="form-control form-control-sm" style="width: 155px" />
          <select v-model="filterJenis" class="form-select form-select-sm" style="width: 150px">
            <option value="all">Semua Jenis</option>
            <option value="aksesoris">Aksesoris</option>
            <option value="kotak">Kotak</option>
            <option v-if="!isL2Floor" value="silver">Silver</option>
            <option value="manual">Manual</option>
          </select>
          <select v-model="filterSales" class="form-select form-select-sm" style="width: 150px">
            <option value="all">Semua Sales</option>
            <option v-for="sales in salesOptions" :key="sales" :value="sales">{{ sales }}</option>
          </select>
          <select v-model="reportType" class="form-select form-select-sm" style="width: 160px">
            <option value="rekap">Rekap (Per Kode)</option>
            <option value="detail">Detail (Per Transaksi)</option>
          </select>
          <button @click="loadReport()" :disabled="store.isLoading" class="btn btn-tampilkan btn-sm">
            <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-search me-1"></i>
            Tampilkan
          </button>
        </div>

        <div class="d-flex align-items-center flex-wrap gap-3 mt-2 small">
          <span v-if="cacheIndicatorText" class="text-muted">
            <i class="bi bi-database me-1"></i>
            {{ cacheIndicatorText }}
          </span>
          <span v-if="showUpdateIndicator" class="text-success">
            <i class="bi bi-arrow-repeat me-1"></i>
            Data telah diperbarui secara real-time
          </span>
        </div>
      </div>
    </div>

    <div v-if="!hasLoaded" class="card border-0 shadow-sm">
      <div class="card-body text-center py-5 text-muted">
        <i class="bi bi-bar-chart display-4 d-block mb-2 opacity-25"></i>
        Pilih periode dan klik Tampilkan
      </div>
    </div>

    <template v-else>
      <div class="row g-3 mb-3">
        <div :class="isL2Floor ? 'col-6 col-md-4' : 'col-6 col-md-3'">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h4 fw-bold text-primary mb-0">{{ filteredTransactions.length }}</div>
            <div class="small text-muted mt-1">Total Transaksi</div>
          </div>
        </div>
        <div :class="isL2Floor ? 'col-6 col-md-4' : 'col-6 col-md-3'">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h5 fw-bold text-success mb-0">{{ formatCurrency(summaryTotals.harga) }}</div>
            <div class="small text-muted mt-1">Total Pendapatan</div>
          </div>
        </div>
        <div :class="isL2Floor ? 'col-6 col-md-4' : 'col-6 col-md-3'">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h4 fw-bold text-warning mb-0">{{ summaryTotals.pcs }}</div>
            <div class="small text-muted mt-1">Total Item Terjual</div>
          </div>
        </div>
        <div v-if="!isL2Floor" class="col-6 col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="h5 fw-bold text-info mb-0">{{ silverSummary.hargaLabel }} / {{ silverSummary.beratLabel }}</div>
            <div class="small text-muted mt-1">Total Penjualan Silver (Harga/Berat)</div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold border-bottom py-2">
          <span class="fw-semibold">
            <i class="bi bi-table me-2 text-dark"></i>
            {{ reportType === "rekap" ? "Laporan Rekap" : "Laporan Detail" }}
          </span>
        </div>
        <div
          class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2 flex-wrap gap-2"
        >
          <div class="d-flex gap-2">
            <button
              @click="exportExcel"
              :disabled="!hasLoaded"
              class="btn btn-success btn-sm"
              style="font-size: 0.7rem"
            >
              <i class="bi bi-file-earmark-excel me-1"></i>
              Excel
            </button>
            <button @click="exportPdf" :disabled="!hasLoaded" class="btn btn-danger btn-sm" style="font-size: 0.7rem">
              <i class="bi bi-file-earmark-pdf me-1"></i>
              PDF
            </button>
          </div>
          <div class="input-group input-group-sm" style="width: 240px">
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input v-model="searchText" type="text" class="form-control" placeholder="Cari..." />
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-hover table-bordered mb-0">
              <thead class="table-primary sticky-top">
                <tr>
                  <th class="text-center" style="width: 48px">No</th>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Sales</th>
                  <th class="text-center">Jenis</th>
                  <th>Kode</th>
                  <th>Nama Barang</th>
                  <th class="text-center">Pcs</th>
                  <th class="text-center">Gr</th>
                  <th class="text-center">Kadar</th>
                  <th class="text-end">Harga</th>
                  <th class="text-center" style="width: 100px">Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!paginatedRows.length">
                  <td colspan="13" class="text-center text-muted py-4">Tidak ada data untuk filter saat ini</td>
                </tr>
                <tr v-for="(row, idx) in paginatedRows" :key="`${row.key}-${idx}`">
                  <td class="text-center text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                  <td class="small">{{ row.tanggal }}</td>
                  <td class="small text-muted">{{ row.jam }}</td>
                  <td class="small fw-semibold">{{ row.sales }}</td>
                  <td class="text-center">
                    <span>{{ row.jenis || "-" }}</span>
                  </td>
                  <td class="small">{{ row.kode }}</td>
                  <td class="small">{{ row.nama }}</td>
                  <td class="text-center">{{ row.pcs }}</td>
                  <td class="text-center">{{ row.gr }}</td>
                  <td class="text-center">{{ row.kadar }}</td>
                  <td class="text-end small fw-semibold">{{ row.hargaLabel }}</td>
                  <td class="text-center">
                    <span class="badge" :class="statusClass(row.status)">
                      <template v-if="row.statusLine2">
                        <div>{{ row.statusLine1 }}</div>
                        <div>{{ row.statusLine2 }}</div>
                      </template>
                      <template v-else>
                        {{ row.statusLine1 || row.status || "-" }}
                      </template>
                    </span>
                  </td>
                  <td class="small text-muted">{{ row.keterangan || "-" }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="table-light fw-semibold">
                  <td colspan="7" class="text-end">TOTAL</td>
                  <td class="text-center">{{ tableTotals.pcs }}</td>
                  <td class="text-center">{{ tableTotals.beratLabel }}</td>
                  <td></td>
                  <td class="text-end">Rp {{ formatCurrency(summaryTotals.harga) }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="card-footer bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-2">
          <div class="d-flex align-items-center gap-2 small text-muted">
            <select v-model.number="pageSize" class="form-select form-select-sm" style="width: 90px">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <template v-if="totalRows > 0">
              {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalRows) }} dari
              {{ totalRows }}
            </template>
          </div>
          <nav v-if="totalPages > 1">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <button class="page-link" @click="currentPage = Math.max(1, currentPage - 1)">‹</button>
              </li>
              <li
                v-for="p in visiblePages"
                :key="p"
                class="page-item"
                :class="{ active: p === currentPage, disabled: p === '...' }"
              >
                <button class="page-link" @click="typeof p === 'number' && (currentPage = p)">{{ p }}</button>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <button class="page-link" @click="currentPage = Math.min(totalPages, currentPage + 1)">›</button>
              </li>
            </ul>
          </nav>
          <button
            v-if="store.hasMoreTransactions"
            @click="loadMore"
            :disabled="store.isLoading"
            class="btn btn-outline-primary btn-sm"
          >
            <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1"></span>
            Muat Lebih Banyak
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { floorCollection } from "@/services/floor-scope";
import { useAuthStore } from "@/stores/auth";
import { db } from "@/config/firebase";
import { useAlert } from "@/composables/useAlert";
import { useAccessoriesStore } from "@/stores/accessories";

const store = useAccessoriesStore();
const { swal } = useAlert();
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");

const today = new Date();
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const CACHE_TTL_TODAY = 30 * 60 * 1000;
const CACHE_TTL_STANDARD = 60 * 60 * 1000;

const filterStart = ref(todayISO);
const filterEnd = ref(todayISO);
const filterJenis = ref("all");
const filterSales = ref("all");
const reportType = ref("rekap");
const searchText = ref("");
const hasLoaded = ref(false);
const cacheIndicatorText = ref("");
const showUpdateIndicator = ref(false);
const currentPage = ref(1);
const pageSize = ref(25);

let realtimeUnsub = null;
let hideIndicatorTimer = null;
let isRealtimeReloading = false;

const transactions = computed(() => store.transactions ?? []);

const filteredTransactions = computed(() => {
  let data = [...transactions.value];

  if (filterJenis.value !== "all") {
    data = data.filter((t) => normalizeJenis(t.jenisPenjualan) === filterJenis.value);
  }

  if (filterSales.value !== "all") {
    data = data.filter((t) => getSalesName(t) === filterSales.value);
  }

  data.sort((a, b) => getTransactionDate(b) - getTransactionDate(a));
  return data;
});

const summaryTotals = computed(() => computeTotals(filteredTransactions.value));

const silverSummary = computed(() => {
  let harga = 0;
  let berat = 0;

  filteredTransactions.value.forEach((trx) => {
    if (normalizeJenis(trx.jenisPenjualan) !== "silver") return;

    harga += getTransactionRevenue(trx);

    (trx.items ?? []).forEach((item) => {
      berat += getItemBerat(item);
    });
  });

  return {
    harga,
    berat,
    hargaLabel: `${formatCurrency(harga)}`,
    beratLabel: berat > 0 ? `${berat.toFixed(2)}` : "-",
  };
});

const salesOptions = computed(() => {
  const set = new Set();
  transactions.value.forEach((t) => {
    const s = getSalesName(t);
    if (s && s !== "-") set.add(s);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
});

const rekapRows = computed(() => buildRekapRows(filteredTransactions.value));
const detailRows = computed(() => buildDetailRows(filteredTransactions.value));
const activeRowsRaw = computed(() => (reportType.value === "detail" ? detailRows.value : rekapRows.value));

const activeRows = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return activeRowsRaw.value;

  return activeRowsRaw.value.filter((row) => {
    const haystack = [
      row.tanggal,
      row.jam,
      row.sales,
      row.jenis,
      row.kode,
      row.nama,
      row.kadar,
      row.status,
      row.keterangan,
      String(row.pcs),
      String(row.harga),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});

const tableTotals = computed(() => {
  let pcs = 0;
  let berat = 0;
  let harga = 0;
  let hasBerat = false;

  activeRows.value.forEach((row) => {
    pcs += row.pcs;
    harga += row.harga;
    if (row.berat > 0 && row.jenisRaw !== "kotak") {
      berat += row.berat;
      hasBerat = true;
    }
  });

  return {
    pcs,
    berat,
    harga,
    beratLabel: hasBerat ? `${berat.toFixed(2)} gr` : "-",
    hargaLabel: `Rp ${formatCurrency(harga)}`,
  };
});

const totalRows = computed(() => activeRows.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return activeRows.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const curr = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (curr > 3) pages.push("...");
  const start = Math.max(2, curr - 1);
  const end = Math.min(total - 1, curr + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (curr < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

watch([searchText, reportType, filterJenis, filterSales, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, (val) => {
  if (currentPage.value > val) currentPage.value = val;
});

watch([filterEnd, hasLoaded], () => {
  if (hasLoaded.value) setupRealtimeListener();
});

onBeforeUnmount(() => {
  clearRealtimeListener();
  if (hideIndicatorTimer) clearTimeout(hideIndicatorTimer);
});

function parseTimestampValue(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts === "object" && ts.seconds) return new Date(ts.seconds * 1000);
  return null;
}

function getTransactionDate(trx) {
  const fromTs = parseTimestampValue(trx?.timestamp);
  if (fromTs) return fromTs;
  if (trx?.tanggal) {
    const raw = String(trx.tanggal);
    if (raw.includes("/")) {
      const [d, m, y] = raw.split("/");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
}

function formatDateId(date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatTimeId(date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getTanggal(trx) {
  const d = getTransactionDate(trx);
  if (d.getTime() > 0) return formatDateId(d);
  return trx?.tanggal || "-";
}

function getJam(trx) {
  const d = parseTimestampValue(trx?.timestamp);
  if (d) return formatTimeId(d);
  return trx?.jam || "-";
}

function getSalesName(trx) {
  return trx?.salesName || trx?.sales || "-";
}

function normalizeJenis(jenis) {
  if (!jenis) return "";
  if (jenis === "gantiLock") return "manual";
  return String(jenis).toLowerCase();
}

function getStatusText(trx) {
  return getStatusInfo(trx).text;
}

function getStatusInfo(trx) {
  const status = trx?.statusPembayaran || trx?.metodePembayaran || trx?.metodeBayar || "Lunas";
  const metode = getMetode(trx);
  if (metode === "free") return { line1: "Gratis", line2: "", text: "Gratis" };
  if (metode === "dp") {
    const total = Number(trx?.totalHarga ?? 0);
    const nominalDP = Number(trx?.nominalDP ?? 0);
    const line1 = `DP ${formatCurrency(Math.max(0, nominalDP))}`;
    if (nominalDP > total) {
      const kembalian = nominalDP - total;
      const line2 = `kembalian ${formatCurrency(kembalian)}`;
      return { line1, line2, text: `${line1} ${line2}` };
    }
    const sisa = getDPRemaining(trx);
    const line2 = `sisa ${formatCurrency(sisa)}`;
    return { line1, line2, text: `${line1} ${line2}` };
  }
  return { line1: status, line2: "", text: status };
}

function getStatusGroupKey(trx) {
  const metode = getMetode(trx);
  if (metode === "free") return "gratis";
  if (metode === "dp") return "dp";

  const status = trx?.statusPembayaran || trx?.metodePembayaran || trx?.metodeBayar || "Lunas";
  return String(status).trim().toLowerCase() || "lunas";
}

function getMetode(trx) {
  return String(trx?.metodeBayar || trx?.metodePembayaran || "").toLowerCase();
}

function getDPRemaining(trx) {
  const totalHargaTransaksi = Number(trx?.totalHarga ?? 0);
  const nominalDP = Number(trx?.nominalDP ?? 0);

  if (nominalDP >= totalHargaTransaksi) return 0;

  const sisaField = Number(trx?.sisaPembayaran);
  if (Number.isFinite(sisaField)) return Math.max(0, sisaField);

  return Math.max(0, totalHargaTransaksi - nominalDP);
}

function getTransactionRevenue(trx) {
  const total = Number(trx?.totalHarga ?? 0);
  const metode = getMetode(trx);

  if (metode === "free") return 0;

  if (metode === "dp") {
    const nominalDP = Number(trx?.nominalDP ?? 0);
    if (nominalDP >= total) return 0;
    return getDPRemaining(trx);
  }

  return Math.max(0, total);
}

function getItemKode(item) {
  return item?.kodeText || item?.kode || item?.barcode || "-";
}

function getItemNama(item) {
  return item?.namaBarang || item?.nama || "-";
}

function getItemQty(item) {
  const val = Number(item?.qty ?? item?.jumlah ?? 1);
  return Number.isFinite(val) ? val : 1;
}

function getItemBerat(item) {
  const val = Number(item?.totalBerat ?? item?.berat ?? 0);
  return Number.isFinite(val) ? val : 0;
}

function getItemKadar(item) {
  return item?.kadar || "-";
}

function getItemHarga(item) {
  let harga = Number(item?.subtotal ?? item?.totalHarga ?? item?.harga ?? 0);
  if (!Number.isFinite(harga)) harga = 0;
  return harga;
}

function computeTotals(data) {
  let pcs = 0;
  let berat = 0;
  let harga = 0;

  data.forEach((trx) => {
    harga += getTransactionRevenue(trx);

    (trx.items ?? []).forEach((item) => {
      pcs += getItemQty(item);
      if (normalizeJenis(trx.jenisPenjualan) !== "kotak") {
        berat += getItemBerat(item);
      }
    });
  });

  return { pcs, berat, harga };
}

function rowObject(base) {
  return {
    ...base,
    hargaLabel: `Rp ${formatCurrency(base.harga)}`,
    gr: base.berat > 0 ? `${base.berat.toFixed(2)} gr` : "-",
  };
}

function getExportStatusText(row) {
  const line1 = row?.statusLine1 || row?.status || "-";
  const line2 = row?.statusLine2 || "";
  return line2 ? `${line1} ${line2}` : line1;
}

function buildDetailRows(data) {
  const rows = [];

  data.forEach((trx) => {
    const tanggal = getTanggal(trx);
    const jam = getJam(trx);
    const sales = getSalesName(trx);
    const jenisRaw = normalizeJenis(trx.jenisPenjualan) || "-";
    const statusInfo = getStatusInfo(trx);
    const trxKey = trx.id || `${tanggal}-${sales}-${jam}`;

    (trx.items ?? []).forEach((item, idx) => {
      rows.push(
        rowObject({
          key: `${trxKey}-${idx}`,
          tanggal,
          jam,
          sales,
          jenis: jenisRaw,
          jenisRaw,
          kode: getItemKode(item),
          nama: getItemNama(item),
          pcs: getItemQty(item),
          berat: getItemBerat(item),
          kadar: getItemKadar(item),
          harga: getItemHarga(item),
          status: statusInfo.text,
          statusLine1: statusInfo.line1,
          statusLine2: statusInfo.line2,
          keterangan: item?.keterangan || trx?.keterangan || "",
        }),
      );
    });
  });

  return rows;
}

function buildRekapRows(data) {
  const rows = [];
  const summaryMap = new Map();

  data.forEach((trx) => {
    const tanggal = getTanggal(trx);
    const jenisRaw = normalizeJenis(trx.jenisPenjualan) || "-";
    const statusInfo = getStatusInfo(trx);
    const statusGroupKey = getStatusGroupKey(trx);

    (trx.items ?? []).forEach((item, idx) => {
      const kode = getItemKode(item);
      const nama = getItemNama(item);
      const pcs = getItemQty(item);
      const berat = getItemBerat(item);
      const harga = getItemHarga(item);
      const kadar = getItemKadar(item);
      const keterangan = item?.keterangan || trx?.keterangan || "";

      if (jenisRaw === "manual") {
        rows.push(
          rowObject({
            key: `${trx.id || tanggal}-m-${idx}`,
            tanggal,
            jam: "-",
            sales: "-",
            jenis: jenisRaw,
            jenisRaw,
            kode,
            nama,
            pcs,
            berat,
            kadar,
            harga,
            status: statusInfo.text,
            statusLine1: statusInfo.line1,
            statusLine2: statusInfo.line2,
            keterangan,
          }),
        );
      } else {
        const aggregateKey = `${jenisRaw}::${kode}::${statusGroupKey}`;

        if (!summaryMap.has(aggregateKey)) {
          summaryMap.set(aggregateKey, {
            key: `aggr-${aggregateKey}`,
            tanggal,
            jam: "-",
            sales: "-",
            jenis: jenisRaw,
            jenisRaw,
            kode,
            nama,
            pcs: 0,
            berat: 0,
            kadar,
            harga: 0,
            status: statusInfo.text,
            statusLine1: statusInfo.line1,
            statusLine2: statusInfo.line2,
            keterangan,
          });
        }

        const row = summaryMap.get(aggregateKey);
        row.pcs += pcs;
        row.harga += harga;
        if (jenisRaw !== "kotak") row.berat += berat;
        if (tanggal !== "-") row.tanggal = tanggal;
      }
    });
  });

  return [...rows, ...[...summaryMap.values()].map((r) => rowObject(r))];
}

function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID").format(val ?? 0);
}

function statusClass(status) {
  if (!status) return "bg-secondary";
  const s = String(status).toLowerCase();
  if (s.includes("lunas")) return "bg-success";
  if (s.includes("dp")) return "bg-warning text-muted";
  if (s.includes("free") || s.includes("gratis")) return "bg-info text-muted";
  return "bg-secondary";
}

function getCacheKey() {
  return `salesData_${activeFloor.value}_${filterStart.value}_to_${filterEnd.value}`;
}

function isTodayIncluded() {
  return filterEnd.value === todayISO;
}

function getCacheTTL() {
  return isTodayIncluded() ? CACHE_TTL_TODAY : CACHE_TTL_STANDARD;
}

function loadFromCache() {
  try {
    const key = getCacheKey();
    const raw = localStorage.getItem(key);
    const ts = Number(localStorage.getItem(`${key}_timestamp`) || 0);

    if (!raw || !ts) return null;
    if (Date.now() - ts > getCacheTTL()) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToCache(data) {
  try {
    const key = getCacheKey();
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch {
    // noop
  }
}

function clearCurrentCache() {
  const key = getCacheKey();
  localStorage.removeItem(key);
  localStorage.removeItem(`${key}_timestamp`);
}

async function loadReport(forceRefresh = false) {
  if (filterEnd.value < filterStart.value) {
    swal("Tanggal akhir harus lebih besar atau sama dengan tanggal mulai", "warning");
    return;
  }

  store.stopTodayListener();
  clearRealtimeListener();
  showUpdateIndicator.value = false;

  if (!forceRefresh) {
    const cached = loadFromCache();
    if (cached && Array.isArray(cached)) {
      store.transactions = cached;
      store.hasMoreTransactions = false;
      hasLoaded.value = true;
      cacheIndicatorText.value = `Menggunakan data cache (${filterStart.value} - ${filterEnd.value})`;
      setupRealtimeListener();
      return;
    }
  }

  cacheIndicatorText.value = "";
  await store.loadTransactions(filterStart.value, filterEnd.value);
  saveToCache(store.transactions);
  hasLoaded.value = true;
  setupRealtimeListener();
}

async function loadMore() {
  await store.loadTransactions(filterStart.value, filterEnd.value, true);
  saveToCache(store.transactions);
}

async function refreshReportDataOnly() {
  cacheIndicatorText.value = "";
  await store.loadTransactions(filterStart.value, filterEnd.value);
  saveToCache(store.transactions);
  hasLoaded.value = true;
}

function setupRealtimeListener() {
  clearRealtimeListener();
  if (!isTodayIncluded()) return;

  const startOfDay = new Date(`${todayISO}T00:00:00`);
  const endOfDay = new Date(`${todayISO}T23:59:59.999`);

  const q = query(
    floorCollection(db, "penjualanAksesoris", activeFloor.value),
    where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
    where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
    orderBy("timestamp", "desc"),
  );

  let isFirstSnapshot = true;

  realtimeUnsub = onSnapshot(q, async (snap) => {
    if (!hasLoaded.value || snap.metadata.hasPendingWrites || isRealtimeReloading) return;

    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return;
    }

    const hasActualChanges = snap
      .docChanges()
      .some((change) => change.type === "added" || change.type === "modified" || change.type === "removed");
    if (!hasActualChanges) return;

    isRealtimeReloading = true;
    try {
      clearCurrentCache();
      await refreshReportDataOnly();
      showUpdateIndicator.value = true;

      if (hideIndicatorTimer) clearTimeout(hideIndicatorTimer);
      hideIndicatorTimer = setTimeout(() => {
        showUpdateIndicator.value = false;
      }, 3000);
    } catch (error) {
      swal(error?.message || "Gagal memuat ulang data real-time", "warning");
    } finally {
      isRealtimeReloading = false;
    }
  });
}

function clearRealtimeListener() {
  if (realtimeUnsub) {
    realtimeUnsub();
    realtimeUnsub = null;
  }
}

async function exportExcel() {
  if (!activeRows.value.length) {
    swal("Tidak ada data untuk diekspor", "warning");
    return;
  }

  if (reportType.value === "detail") {
    await exportDetailToExcel();
  } else {
    await exportRekapToExcel();
  }
}

async function exportRekapToExcel() {
  const { utils, writeFileXLSX } = await import("xlsx");
  const jenis = filterJenis.value;
  const isKotak = jenis === "kotak";
  const isAll = jenis === "all";

  const rows = rekapRows.value.map((r) => {
    const status = getExportStatusText(r);
    if (isKotak) {
      return [r.jenis, r.kode, r.nama, r.pcs, "-", "-", r.hargaLabel, status];
    }
    if (isAll) {
      return [
        r.jenis,
        r.kode,
        r.nama,
        r.pcs,
        r.berat > 0 ? r.berat.toFixed(2) : "-",
        r.kadar,
        r.hargaLabel,
        status,
        r.keterangan,
      ];
    }
    return [r.jenis, r.kode, r.nama, r.pcs, r.berat > 0 ? r.berat.toFixed(2) : "-", r.kadar, r.hargaLabel, status];
  });

  const headers = isKotak
    ? ["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status"]
    : isAll
      ? ["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status", "Keterangan"]
      : ["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status"];

  const titleRows = [
    ["LAPORAN PENJUALAN MELATI BAWAH"],
    [filterJenis.value === "all" ? "SEMUA JENIS" : filterJenis.value.toUpperCase()],
    [`${filterStart.value} - ${filterEnd.value}`],
    [],
  ];

  const totalPcs = rekapRows.value.reduce((sum, r) => sum + r.pcs, 0);
  const totalBerat = rekapRows.value.reduce((sum, r) => sum + (r.jenisRaw === "kotak" ? 0 : r.berat), 0);
  const totalHarga = rekapRows.value.reduce((sum, r) => sum + r.harga, 0);

  const totalRow = isKotak
    ? ["TOTAL", "", "", totalPcs, "-", "-", `Rp ${formatCurrency(totalHarga)}`, ""]
    : isAll
      ? ["TOTAL", "", "", totalPcs, totalBerat.toFixed(2), "", `Rp ${formatCurrency(totalHarga)}`, "", ""]
      : ["TOTAL", "", "", totalPcs, totalBerat.toFixed(2), "", `Rp ${formatCurrency(totalHarga)}`, ""];

  const ws = utils.aoa_to_sheet([...titleRows, headers, ...rows, [], totalRow]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Laporan Penjualan");
  writeFileXLSX(wb, `laporan-penjualan-${filterStart.value}-${filterEnd.value}.xlsx`);
  swal("File Excel berhasil diunduh", "success");
}

async function exportDetailToExcel() {
  const { utils, writeFileXLSX } = await import("xlsx");

  const rows = detailRows.value.map((r) => [
    r.tanggal,
    r.jam,
    r.sales,
    r.jenis,
    r.kode,
    r.nama,
    r.pcs,
    r.berat > 0 ? r.berat.toFixed(2) : 0,
    r.kadar,
    r.harga,
    getExportStatusText(r),
    r.keterangan,
  ]);

  rows.push([]);
  rows.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    tableTotals.value.pcs,
    tableTotals.value.berat.toFixed(2),
    "",
    tableTotals.value.harga,
    "",
    "",
  ]);

  const headers = [
    "Tanggal",
    "Jam",
    "Sales",
    "Jenis",
    "Kode",
    "Nama Barang",
    "Pcs",
    "Gr",
    "Kadar",
    "Harga",
    "Status",
    "Keterangan",
  ];
  const titleRows = [
    ["LAPORAN PENJUALAN DETAIL - MELATI BAWAH"],
    [filterJenis.value === "all" ? "SEMUA JENIS" : filterJenis.value.toUpperCase()],
    [`${filterStart.value} - ${filterEnd.value}`],
    [],
  ];

  const ws = utils.aoa_to_sheet([...titleRows, headers, ...rows]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Laporan Detail");
  writeFileXLSX(wb, `laporan-penjualan-detail-${filterStart.value}-${filterEnd.value}.xlsx`);
  swal("File Excel berhasil diunduh", "success");
}

async function exportPdf() {
  if (!activeRows.value.length) {
    swal("Tidak ada data untuk diekspor", "warning");
    return;
  }

  if (reportType.value === "detail") {
    await exportDetailToPdf();
  } else {
    await exportRekapToPdf();
  }
}

async function exportRekapToPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF("landscape", "mm", "a4");

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("LAPORAN PENJUALAN MELATI BAWAH", 148.5, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(`${filterStart.value} - ${filterEnd.value}`, 148.5, 22, { align: "center" });

  const jenis = filterJenis.value;
  const isKotak = jenis === "kotak";
  const isAll = jenis === "all";

  const body = rekapRows.value.map((r) => {
    const status = getExportStatusText(r);
    if (isKotak) return [r.jenis, r.kode, r.nama, r.pcs, "-", "-", r.hargaLabel, status];
    if (isAll) {
      return [
        r.jenis,
        r.kode,
        r.nama,
        r.pcs,
        r.berat > 0 ? r.berat.toFixed(2) : "-",
        r.kadar,
        r.hargaLabel,
        status,
        r.keterangan,
      ];
    }
    return [r.jenis, r.kode, r.nama, r.pcs, r.berat > 0 ? r.berat.toFixed(2) : "-", r.kadar, r.hargaLabel, status];
  });

  const totalPcs = rekapRows.value.reduce((sum, r) => sum + r.pcs, 0);
  const totalBerat = rekapRows.value.reduce((sum, r) => sum + (r.jenisRaw === "kotak" ? 0 : r.berat), 0);
  const totalHarga = rekapRows.value.reduce((sum, r) => sum + r.harga, 0);

  body.push(
    isKotak
      ? ["TOTAL", "", "", totalPcs, "-", "-", `Rp ${formatCurrency(totalHarga)}`, ""]
      : isAll
        ? ["TOTAL", "", "", totalPcs, totalBerat.toFixed(2), "", `Rp ${formatCurrency(totalHarga)}`, "", ""]
        : ["TOTAL", "", "", totalPcs, totalBerat.toFixed(2), "", `Rp ${formatCurrency(totalHarga)}`, ""],
  );

  const headers = isKotak
    ? [["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status"]]
    : isAll
      ? [["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status", "Keterangan"]]
      : [["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Status"]];

  autoTable(doc, {
    startY: 28,
    head: headers,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      8: { cellWidth: 30 },
    },
  });

  doc.save(`laporan-penjualan-${filterStart.value}-${filterEnd.value}.pdf`);
  swal("File PDF berhasil diunduh", "success");
}

async function exportDetailToPdf() {
  if (filterStart.value === filterEnd.value) {
    await exportDetailToPdfSingleDate();
  } else {
    await exportDetailToPdfDateRange();
  }
}

async function exportDetailToPdfSingleDate() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF("landscape", "mm", "a4");

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("LAPORAN PENJUALAN DETAIL - MELATI BAWAH", 148.5, 12, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Tanggal: ${filterStart.value}`, 148.5, 20, { align: "center" });

  const body = detailRows.value.map((r) => [
    r.jam,
    r.sales,
    r.jenis,
    r.kode,
    r.nama,
    r.pcs,
    r.berat.toFixed(2),
    r.kadar,
    r.hargaLabel,
    getExportStatusText(r),
    r.keterangan,
  ]);
  body.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    tableTotals.value.pcs,
    tableTotals.value.berat.toFixed(2),
    "",
    tableTotals.value.hargaLabel,
    "",
    "",
  ]);

  autoTable(doc, {
    startY: 26,
    head: [["Jam", "Sales", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Status", "Keterangan"]],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      9: { cellWidth: 18 },
    },
  });

  doc.save(`laporan-penjualan-detail-${filterStart.value}-${filterEnd.value}.pdf`);
  swal("File PDF berhasil diunduh", "success");
}

async function exportDetailToPdfDateRange() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF("landscape", "mm", "a4");

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("LAPORAN PENJUALAN DETAIL - MELATI BAWAH", 148.5, 12, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Tanggal: ${filterStart.value} - ${filterEnd.value}`, 148.5, 20, { align: "center" });

  const sorted = [...detailRows.value].sort((a, b) => {
    const da = new Date(a.tanggal.split("/").reverse().join("-"));
    const db = new Date(b.tanggal.split("/").reverse().join("-"));
    return da - db;
  });

  const body = sorted.map((r) => [
    r.tanggal,
    r.jam,
    r.sales,
    r.jenis,
    r.kode,
    r.nama,
    r.pcs,
    r.berat.toFixed(2),
    r.kadar,
    r.hargaLabel,
    getExportStatusText(r),
    r.keterangan,
  ]);
  body.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    tableTotals.value.pcs,
    tableTotals.value.berat.toFixed(2),
    "",
    tableTotals.value.hargaLabel,
    "",
    "",
  ]);

  autoTable(doc, {
    startY: 26,
    head: [
      [
        "Tanggal",
        "Jam",
        "Sales",
        "Jenis",
        "Kode",
        "Nama Barang",
        "Pcs",
        "Gr",
        "Kadar",
        "Harga",
        "Status",
        "Keterangan",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: {
      10: { cellWidth: 18 },
    },
  });

  doc.save(`laporan-penjualan-detail-${filterStart.value}-${filterEnd.value}.pdf`);
  swal("File PDF berhasil diunduh", "success");
}
</script>
