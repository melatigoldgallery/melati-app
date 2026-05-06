<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-list-ul me-2 text-dark"></i>
        Data Penjualan
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Data Penjualan</li>
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
        <div class="d-flex justify-content-start">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <input v-model="filterDate" type="date" class="form-control form-control-sm" style="width: 160px" />
            <select v-model="filterJenis" class="form-select form-select-sm" style="width: 150px">
              <option value="">Semua Jenis</option>
              <option value="aksesoris">Aksesoris</option>
              <option value="kotak">Kotak</option>
              <option v-if="!isL2Floor" value="silver">Silver</option>
              <option value="manual">Manual</option>
            </select>
            <select v-model="filterSales" class="form-select form-select-sm" style="width: 150px">
              <option value="">Semua Sales</option>
              <option v-for="s in salesOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <button @click="loadData" class="btn btn-tampilkan btn-sm">
              <i class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary cards -->
    <div v-if="hasLoaded" class="row g-3 mb-3">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="h4 fw-bold text-primary mb-0">{{ visibleTransactions.length }}</div>
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
          <div class="small text-muted mt-1">Total Item</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="h5 fw-bold text-info mb-0">
            {{ formatCurrency(silverStats.totalHarga) }} / {{ silverStats.totalBerat }} gr
          </div>
          <div class="small text-muted mt-1">Penjualan Silver</div>
        </div>
      </div>
    </div>

    <!-- Filter row -->
    <div class="d-flex gap-2 mb-3 flex-wrap align-items-center"></div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div
        class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2 flex-wrap gap-2"
      >
        <span class="fw-semibold small">
          <i class="bi bi-table me-1"></i>
          Daftar Transaksi
        </span>
        <div class="d-flex gap-2 align-items-center">
          <div class="input-group input-group-sm" style="width: 200px">
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input
              v-model="searchText"
              type="search"
              class="form-control"
              placeholder="Cari..."
              name="transaction-search"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              :readonly="searchInputLocked"
              @focus="unlockSearchInput"
              @mousedown="unlockSearchInput"
              @touchstart="unlockSearchInput"
            />
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div v-if="store.isLoading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!hasLoaded" class="text-center py-5 text-muted">
          <i class="bi bi-search display-4 d-block mb-2 opacity-25"></i>
          Klik tombol Tampilkan untuk memuat data
        </div>
        <div v-else-if="!flattenedRows.length" class="text-center py-5 text-muted">
          <i class="bi bi-inbox display-4 d-block mb-2 opacity-25"></i>
          Belum ada data transaksi
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover table-bordered mb-0">
            <thead class="table-primary sticky-top">
              <tr>
                <th class="text-center" style="width: 40px">No</th>
                <th>Tanggal</th>
                <th>Jam</th>
                <th class="text-center">Sales</th>
                <th class="text-center">Jenis</th>
                <th>Kode</th>
                <th>Nama Barang</th>
                <th class="text-center">Pcs</th>
                <th class="text-center">Gr</th>
                <th class="text-center">Kadar</th>
                <th class="text-end">Harga</th>
                <th class="text-center" style="width: 100px">Status</th>
                <th>Keterangan</th>
                <th class="text-center" style="width: 90px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in paginatedRows" :key="`${row.trx.id}-${idx}`">
                <td class="text-center text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                <td class="small">{{ displayTanggal(row.trx) }}</td>
                <td class="small text-muted">{{ displayJam(row.trx) }}</td>
                <td class="text-center small">{{ row.trx.salesName || "—" }}</td>
                <td class="text-center small">{{ row.trx.jenisPenjualan || "—" }}</td>
                <td class="small">
                  {{ row.item ? row.item.kodeText || row.item.kode || "—" : "—" }}
                </td>
                <td class="small">{{ row.item ? row.item.namaBarang || row.item.nama || "—" : "—" }}</td>
                <td class="text-center small">{{ row.item ? (row.item.qty ?? row.item.jumlah ?? 1) : "—" }}</td>
                <td class="text-center small">{{ row.item ? (row.item.totalBerat ?? row.item.berat ?? "—") : "—" }}</td>
                <td class="text-center small">{{ row.item ? row.item.kadar || "—" : "—" }}</td>
                <td class="text-end small fw-semibold">
                  {{
                    formatCurrency(
                      row.item ? (row.item.subtotal ?? row.item.totalHarga ?? row.item.harga ?? 0) : row.trx.totalHarga,
                    )
                  }}
                </td>
                <td class="text-center small">
                  <span class="badge" :class="statusClass(getStatusText(row.trx))">
                    <template v-if="getStatusInfo(row.trx).line2">
                      <div>{{ getStatusInfo(row.trx).line1 }}</div>
                      <div>{{ getStatusInfo(row.trx).line2 }}</div>
                    </template>
                    <template v-else>
                      {{ getStatusInfo(row.trx).line1 }}
                    </template>
                  </span>
                </td>
                <td class="small text-muted" style="max-width: 120px; white-space: normal; word-break: break-word">
                  {{ row.item ? row.item.keterangan || "" : row.trx.keterangan || "" }}
                </td>
                <td class="text-center small">
                  <button
                    @click="openPrintChoice(row.trx)"
                    :disabled="isPrinting"
                    class="btn btn-sm btn-warning py-0 px-1 me-1"
                    title="Cetak Ulang"
                  >
                    <span v-if="isPrinting && printingTransactionId === row.trx.id" class="spinner-border spinner-border-sm"></span>
                    <i v-else class="bi bi-printer"></i>
                  </button>
                  <button @click="openEditVerify(row.trx)" class="btn btn-sm btn-primary py-0 px-1 me-1" title="Edit">
                    <i class="bi bi-pencil small"></i>
                  </button>
                  <button @click="confirmDelete(row.trx)" class="btn btn-sm btn-danger py-0 px-1" title="Hapus">
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Footer: pagination + load more -->
      <div class="card-footer bg-white d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
        <div class="d-flex align-items-center gap-1">
          <span class="small text-muted">Tampil</span>
          <select v-model="pageSize" class="form-select form-select-sm" style="width: 72px">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <template v-if="flattenedRows.length">
            {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, flattenedRows.length) }} dari
            {{ flattenedRows.length }}
          </template>
        </div>
        <nav v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="currentPage--">‹</button>
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
              <button class="page-link" @click="currentPage++">›</button>
            </li>
          </ul>
        </nav>
        <button
          v-if="hasLoaded && store.hasMoreTransactions"
          @click="loadMore"
          :disabled="store.isLoading"
          class="btn btn-outline-primary btn-sm"
        >
          <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1"></span>
          Muat Lebih Banyak
        </button>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <AppModal v-model="showDeleteModal" title="Hapus Transaksi" size="md">
      <template #default>
        <p class="mb-1">Hapus transaksi ini?</p>
        <p class="text-muted small">Stok barang akan dikembalikan secara otomatis.</p>
        <p v-if="deleteTarget" class="fw-semibold">
          {{ deleteTarget.tanggal }} / {{ deleteTarget.salesName }} / {{ formatCurrency(deleteTarget.totalHarga) }}
        </p>
        <div v-if="deleteTarget" class="alert alert-info small py-2 mb-3">
          <i class="bi bi-info-circle me-1"></i>
          <template v-if="getRestorableItems(deleteTarget).length > 0">
            <strong>{{ getRestorableItems(deleteTarget).length }} item</strong>
            akan dikembalikan ke stok.
          </template>
          <template v-else>Stok tidak dapat dikembalikan (penjualan manual tanpa kode lock).</template>
        </div>
        <div class="mt-3">
          <label class="form-label small fw-semibold">
            Password Supervisor
            <span class="text-danger">*</span>
          </label>
          <input
            v-model="supervisorPass"
            type="password"
            class="form-control form-control-sm"
            placeholder="Masukkan password"
            @keyup.enter="executeDelete"
          />
        </div>
      </template>
      <template #footer>
        <button @click="showDeleteModal = false" class="btn btn-secondary btn-sm me-2">Batal</button>
        <button @click="executeDelete" :disabled="isDeleting" class="btn btn-danger btn-sm">
          <span v-if="isDeleting" class="spinner-border spinner-border-sm me-1"></span>
          Hapus
        </button>
      </template>
    </AppModal>

    <!-- Edit verify modal -->
    <AppModal v-model="showEditVerifyModal" title="Verifikasi Akses Edit" size="md">
      <template #default>
        <div class="mb-3">
          <label class="form-label small fw-semibold">
            Kode Akses Edit
            <span class="text-danger">*</span>
          </label>
          <input
            v-model="editVerifyPass"
            type="password"
            class="form-control form-control-sm"
            placeholder="Masukkan kode akses"
            @keyup.enter="verifyAndOpenEdit"
          />
          <div class="form-text small">Masukkan kode akses untuk mengedit data transaksi penjualan.</div>
        </div>
      </template>
      <template #footer>
        <button @click="showEditVerifyModal = false" class="btn btn-secondary btn-sm me-2">Batal</button>
        <button @click="verifyAndOpenEdit" :disabled="isVerifyingEdit" class="btn btn-primary btn-sm">
          <span v-if="isVerifyingEdit" class="spinner-border spinner-border-sm me-1"></span>
          Verifikasi
        </button>
      </template>
    </AppModal>

    <!-- Edit modal -->
    <AppModal v-model="showEditModal" title="Edit Transaksi" size="lg">
      <template #default>
        <div v-if="editTarget">
          <div class="alert alert-info small py-2 mb-3">
            <i class="bi bi-info-circle me-1"></i>
            Jenis penjualan selain manual hanya bisa edit nama customer, nomor tlp, dan harga.
          </div>
          <div class="row g-2 mb-3">
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Sales</label>
              <input v-model="editForm.salesName" type="text" class="form-control form-control-sm" readonly />
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Nama Customer</label>
              <input v-model="editForm.customerName" type="text" class="form-control form-control-sm" />
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Nomor Customer</label>
              <input v-model="editForm.customerPhone" type="text" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Items editing -->
          <div v-for="(item, i) in editItems" :key="i" class="border rounded p-3 mb-3">
            <div class="fw-semibold small mb-2 text-secondary">Item {{ i + 1 }}</div>
            <div class="row g-2">
              <!-- Kode -->
              <div class="col-md-1">
                <label class="form-label small">Kode</label>
                <input
                  v-model="item.kode"
                  type="text"
                  class="form-control form-control-sm"
                  :readonly="!isManualEdit"
                />
              </div>
              <div class="col-md-5">
                <label class="form-label small">Nama Barang</label>
                <input v-model="item.namaBarang" type="text" class="form-control form-control-sm" :readonly="!isManualEdit" />
              </div>
              <!-- Kode Lock (manual only) -->
              <div v-if="editTarget.jenisPenjualan === 'manual'" class="col-md-2">
                <label class="form-label small">Kode Lock</label>
                <input :value="item.kodeLock" type="text" class="form-control form-control-sm" readonly />
              </div>
              <!-- Qty -->
              <div class="col-md-1">
                <label class="form-label small">Jml</label>
                <input v-model.number="item.qty" type="number" min="1" class="form-control form-control-sm" :readonly="!isManualEdit" />
              </div>
              <div class="col-md-1">
                <label class="form-label small">Kadar</label>
                <input v-model="item.kadar" type="text" class="form-control form-control-sm" :readonly="!isManualEdit" />
              </div>
              <div class="col-md-2">
                <label class="form-label small">Berat</label>
                <input v-model="item.berat" type="text" class="form-control form-control-sm" :readonly="!isManualEdit" />
              </div>
              <div class="col-md-2">
                <label class="form-label small">Harga / Subtotal</label>
                <input
                  :value="formatCurrency(item.subtotal)"
                  @change="onItemHargaChange($event, i)"
                  type="text"
                  class="form-control form-control-sm text-end"
                />
              </div>
                <!-- Keterangan (manual only) -->
                <div v-if="editTarget.jenisPenjualan === 'manual'" class="col-md-10">
                  <label class="form-label small">Keterangan</label>
                  <input v-model="item.keterangan" class="form-control form-control-sm" rows="2"></input>
                </div>
            </div>
          </div>

          <!-- Total recalculated -->
          <div class="text-end fw-semibold">
            Total:
            <span class="text-primary">{{ formatCurrency(editTotalHarga) }}</span>
          </div>
        </div>
      </template>
      <template #footer>
        <button @click="showEditModal = false" class="btn btn-secondary btn-sm me-2">Batal</button>
        <button @click="saveEdit" :disabled="isSavingEdit" class="btn btn-primary btn-sm">
          <span v-if="isSavingEdit" class="spinner-border spinner-border-sm me-1"></span>
          Simpan
        </button>
      </template>
    </AppModal>

    <!-- Print choice modal -->
    <AppModal v-model="showPrintChoiceModal" title="Cetak Ulang Transaksi" size="sm">
      <template #default>
        <p class="text-muted small mb-3">Pilih jenis cetakan:</p>
        <div class="d-grid gap-2">
          <button @click="doPrint('receipt')" :disabled="isPrinting" class="btn btn-primary">
            <span v-if="isPrinting && printingType === 'receipt'" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-receipt me-2"></i>
            Struk Kasir
          </button>
          <button @click="doPrint('invoice')" :disabled="isPrinting" class="btn btn-success">
            <span v-if="isPrinting && printingType === 'invoice'" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-file-earmark-text me-2"></i>
            Invoice Customer
          </button>
        </div>
      </template>
      <template #footer>
        <button @click="showPrintChoiceModal = false" :disabled="isPrinting" class="btn btn-secondary btn-sm">Tutup</button>
      </template>
    </AppModal>

    <!-- Print offline modal -->
    <PrintFailedModal
      v-model="showPrintOfflineModal"
      failed-title="Gagal Cetak Invoice / Struk"
      :message="printOfflineMessage"
      :retrying="isPrinting"
      @retry="retryPrint"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useAccessoriesStore } from "@/stores/accessories";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";
import PrintFailedModal from "@/components/common/PrintFailedModal.vue";
import { getSafeAmount, resolveReprintReceiptPayment } from "@/utils/print-payment";

const store = useAccessoriesStore();
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");
const { swal, error: showError } = useAlert();

// --- State -------------------------------------------------------------------
const today = new Date();
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const filterDate = ref(todayISO);
const filterJenis = ref("");
const filterSales = ref("");
const searchText = ref("");
const searchInputLocked = ref(true);
const hasLoaded = ref(false);

// Pagination
const pageSize = ref(25);
const currentPage = ref(1);

// Delete state
const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const supervisorPass = ref("");
const isDeleting = ref(false);

// Edit verify state
const showEditVerifyModal = ref(false);
const editVerifyPass = ref("");
const isVerifyingEdit = ref(false);
const pendingEditTarget = ref(null);

// Edit state
const showEditModal = ref(false);
const editTarget = ref(null);
const editForm = ref({ salesName: "", customerName: "", customerPhone: "", metodePembayaran: "", keterangan: "" });
const editItems = ref([]);
const isSavingEdit = ref(false);

// Print state
const showPrintChoiceModal = ref(false);
const printChoiceTarget = ref(null);
const showPrintOfflineModal = ref(false);
const printOfflineMessage = ref("Pastikan printing service sudah dijalankan di komputer ini.");
const failedPrintContext = ref(null);
const isPrinting = ref(false);
const printingType = ref("receipt");
const printingTransactionId = ref(null);
const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

// --- Computed -----------------------------------------------------------------
// Normalize: gantiLock → manual, and unify salesName (old docs store `sales`, new docs store both)
const transactions = computed(() =>
  store.transactions.map((t) => {
    const base = { ...t, salesName: t.salesName || t.sales || "" };
    if (base.jenisPenjualan === "gantiLock") {
      return { ...base, jenisPenjualan: "manual", isGantiLock: true };
    }
    return base;
  }),
);

const visibleTransactions = computed(() => (hasLoaded.value ? transactions.value : []));

const salesOptions = computed(() => {
  const set = new Set(visibleTransactions.value.map((t) => t.salesName).filter(Boolean));
  return [...set].sort();
});

const filteredTransactions = computed(() => {
  let data = visibleTransactions.value;
  if (filterJenis.value) {
    data = data.filter((t) => (t.jenisPenjualan ?? "").toLowerCase() === filterJenis.value);
  }
  if (filterSales.value) {
    data = data.filter((t) => t.salesName === filterSales.value);
  }
  const q = searchText.value.trim().toLowerCase();
  if (!q) return data;
  return data.filter(
    (t) =>
      (t.salesName ?? "").toLowerCase().includes(q) ||
      (t.customerName ?? "").toLowerCase().includes(q) ||
      (t.items ?? []).some((i) => (i.kodeText ?? i.kode ?? "").toLowerCase().includes(q)),
  );
});

const totalPendapatan = computed(() => visibleTransactions.value.reduce((s, t) => s + getTransactionRevenue(t), 0));
const totalItem = computed(() =>
  visibleTransactions.value.reduce(
    (s, t) => s + (t.items ?? []).reduce((si, i) => si + (i.qty ?? i.jumlah ?? 1), 0),
    0,
  ),
);
const uniqueSales = computed(() => new Set(visibleTransactions.value.map((t) => t.salesName).filter(Boolean)).size);

const silverStats = computed(() => {
  const silverTrx = visibleTransactions.value.filter((t) => t.jenisPenjualan === "silver");
  const totalHarga = silverTrx.reduce((s, t) => s + getTransactionRevenue(t), 0);
  const totalBerat = silverTrx.reduce(
    (s, t) => s + (t.items ?? []).reduce((si, i) => si + parseFloat(i.totalBerat ?? i.berat ?? 0), 0),
    0,
  );
  return { totalHarga, totalBerat: totalBerat % 1 === 0 ? totalBerat : parseFloat(totalBerat.toFixed(2)) };
});

const editTotalHarga = computed(() => editItems.value.reduce((s, i) => s + (i.subtotal ?? 0), 0));
const isManualEdit = computed(() => (editTarget.value?.jenisPenjualan ?? "") === "manual");

// Flatten all items from all transactions into individual rows (same as old dataPenjualan table)
const flattenedRows = computed(() => {
  const rows = [];
  filteredTransactions.value.forEach((trx) => {
    const items = trx.items ?? [];
    if (items.length === 0) {
      rows.push({ trx, item: null });
    } else {
      items.forEach((item) => rows.push({ trx, item }));
    }
  });
  return rows;
});

const totalPages = computed(() => Math.max(1, Math.ceil(flattenedRows.value.length / pageSize.value)));

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return flattenedRows.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (cur > 3) pages.push("...");
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
  if (cur < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

// Reset to page 1 when any filter changes
watch([filterDate, filterJenis, filterSales, searchText, pageSize], () => {
  currentPage.value = 1;
});

watch(filterDate, () => {
  hasLoaded.value = false;
  store.stopTodayListener();
  store.transactions = [];
});

// --- Helpers ------------------------------------------------------------------
function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID").format(val ?? 0);
}

function parseCurrency(str) {
  return parseInt(
    String(str ?? "")
      .replace(/\./g, "")
      .replace(/[^0-9]/g, "") || "0",
  );
}

function getMetode(trx) {
  return String(trx?.metodePembayaran || trx?.metodeBayar || "").toLowerCase();
}

function getTransactionRevenue(trx) {
  const total = Number(trx?.totalHarga ?? 0);
  const metode = getMetode(trx);

  if (metode === "free") return 0;

  if (metode === "dp") {
    const nominalDP = Number(trx?.nominalDP ?? 0);
    if (nominalDP >= total) return 0;

    const sisaField = Number(trx?.sisaPembayaran);
    const sisa = Number.isFinite(sisaField) ? sisaField : total - nominalDP;
    return Math.max(0, sisa);
  }

  return Math.max(0, total);
}

function getStatusText(trx) {
  return getStatusInfo(trx).text;
}

function getStatusInfo(trx) {
  const metode = getMetode(trx);
  const base = trx?.statusPembayaran || trx?.metodePembayaran || trx?.metodeBayar || "—";

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

    const sisaField = Number(trx?.sisaPembayaran);
    const sisa = Number.isFinite(sisaField) ? Math.max(0, sisaField) : Math.max(0, total - nominalDP);
    const line2 = `sisa ${formatCurrency(sisa)}`;
    return { line1, line2, text: `${line1} ${line2}` };
  }

  return { line1: base, line2: "", text: base };
}

function statusClass(status) {
  if (!status) return "bg-secondary";
  const s = status.toLowerCase();
  if (s.includes("lunas")) return "bg-success";
  if (s.includes("dp")) return "bg-warning text-muted";
  if (s.includes("free") || s.includes("gratis")) return "bg-info text-muted";
  return "bg-secondary";
}

function getTimestampDate(trx) {
  const ts = trx.timestamp;
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (ts instanceof Date) return ts;
  return null;
}

function displayTanggal(trx) {
  // Prefer tanggal string, derive from timestamp if missing
  if (trx.tanggal) {
    // Normalize YYYY-MM-DD → DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(trx.tanggal)) {
      const [y, m, d] = trx.tanggal.split("-");
      return `${d}/${m}/${y}`;
    }
    return trx.tanggal; // already dd/mm/yyyy or other
  }
  const d = getTimestampDate(trx);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function displayJam(trx) {
  if (trx.jam) return trx.jam;
  const d = getTimestampDate(trx);
  if (!d) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function getRestorableItems(trx) {
  if (!trx) return [];
  if (["aksesoris", "kotak", "silver"].includes(trx.jenisPenjualan)) {
    return trx.items ?? [];
  }
  if (trx.jenisPenjualan === "manual") {
    return (trx.items ?? []).filter((i) => i.kodeLock && i.kodeLock !== "-");
  }
  return [];
}

function unlockSearchInput() {
  if (!searchInputLocked.value) return;
  searchInputLocked.value = false;
}

// --- Data loading -------------------------------------------------------------
async function loadData() {
  store.stopTodayListener();
  hasLoaded.value = false;
  store.transactions = [];

  if (filterDate.value === todayISO) {
    store.startTodayListener(); // todayISO passed implicitly — store defaults to today
    hasLoaded.value = true;
  } else {
    // Stop any live listener and do a one-shot load for non-today dates
    await store.loadTransactions(filterDate.value, filterDate.value);
    hasLoaded.value = true;
  }
}

async function loadMore() {
  await store.loadTransactions(filterDate.value, filterDate.value, true);
}

// --- Delete -------------------------------------------------------------------
function confirmDelete(trx) {
  deleteTarget.value = trx;
  supervisorPass.value = "";
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!supervisorPass.value) {
    swal("Password supervisor wajib diisi", "warning");
    return;
  }
  isDeleting.value = true;
  try {
    const valid = await store.verifySupervisor(supervisorPass.value);
    if (!valid) {
      swal("Password supervisor salah", "error");
      return;
    }
    await store.removeTransaction(deleteTarget.value.id, deleteTarget.value);
    showDeleteModal.value = false;
    swal("Transaksi berhasil dihapus dan stok dipulihkan", "success");
  } catch (err) {
    showError("Gagal menghapus transaksi", err.message);
  } finally {
    isDeleting.value = false;
  }
}

// --- Edit verify --------------------------------------------------------------
function openEditVerify(trx) {
  pendingEditTarget.value = trx;
  editVerifyPass.value = "";
  showEditVerifyModal.value = true;
}

async function verifyAndOpenEdit() {
  if (!editVerifyPass.value) {
    swal("Kode akses wajib diisi", "warning");
    return;
  }
  isVerifyingEdit.value = true;
  try {
    const valid = await store.verifyEditAccess(editVerifyPass.value);
    if (!valid) {
      swal("Kode akses salah", "error");
      editVerifyPass.value = "";
      return;
    }
    showEditVerifyModal.value = false;
    openEditModal(pendingEditTarget.value);
    pendingEditTarget.value = null;
  } catch (err) {
    showError("Gagal verifikasi", err.message);
  } finally {
    isVerifyingEdit.value = false;
  }
}

// --- Edit ---------------------------------------------------------------------
function openEditModal(trx) {
  editTarget.value = trx;
  editForm.value = {
    salesName: trx.salesName ?? trx.sales ?? "",
    customerName: trx.customerName ?? "",
    customerPhone: trx.customerPhone ?? trx.customerNumber ?? "",
    metodePembayaran: trx.metodePembayaran ?? "TUNAI",
    keterangan: trx.keterangan ?? "",
  };
  // Build editable items
  editItems.value = (trx.items ?? []).map((item) => ({
    kode: item.kodeText || item.kode || "",
    kodeLock: item.kodeLock || "-",
    qty: item.qty ?? item.jumlah ?? 1,
    namaBarang: item.namaBarang || item.nama || "",
    kadar: item.kadar || "",
    berat: item.totalBerat || item.berat || "",
    subtotal: item.subtotal ?? item.totalHarga ?? item.harga ?? 0,
    keterangan: item.keterangan || "",
    tipe: item.tipe || "",
    _raw: item,
  }));
  showEditModal.value = true;
}

function onItemHargaChange(event, i) {
  editItems.value[i].subtotal = parseCurrency(event.target.value);
  // Reformat the input display
  event.target.value = formatCurrency(editItems.value[i].subtotal);
}

async function saveEdit() {
  isSavingEdit.value = true;
  try {
    const updatedItems = editItems.value.map((ei) => {
      const parsedSubtotal = Number(ei.subtotal ?? 0);
      const safeSubtotal = Number.isFinite(parsedSubtotal) ? Math.max(0, parsedSubtotal) : 0;

      if (isManualEdit.value) {
        const parsedQty = Number(ei.qty ?? 1);
        const safeQty = Number.isFinite(parsedQty) ? Math.max(1, parsedQty) : 1;
        return {
          ...ei._raw,
          // New format fields
          kodeText: ei.kode,
          kode: ei.kode,
          namaBarang: ei.namaBarang,
          qty: safeQty,
          kadar: ei.kadar,
          totalBerat: ei.berat,
          subtotal: safeSubtotal,
          harga: safeSubtotal,
          keterangan: ei.keterangan,
          // Keep backwards-compat fields too
          kodeLock: ei.kodeLock,
          nama: ei.namaBarang,
          jumlah: safeQty,
          berat: ei.berat,
          totalHarga: safeSubtotal,
        };
      }

      const rawKode = ei._raw?.kodeText ?? ei._raw?.kode ?? ei.kode;
      const rawNama = ei._raw?.namaBarang ?? ei._raw?.nama ?? ei.namaBarang;
      const parsedRawQty = Number(ei._raw?.qty ?? ei._raw?.jumlah ?? 1);
      const rawQty = Number.isFinite(parsedRawQty) ? Math.max(1, parsedRawQty) : 1;
      const rawKadar = ei._raw?.kadar ?? "";
      const rawBerat = ei._raw?.totalBerat ?? ei._raw?.berat ?? "";
      const rawKeterangan = ei._raw?.keterangan ?? ei.keterangan ?? "";
      const rawKodeLock = ei._raw?.kodeLock ?? ei.kodeLock ?? "-";

      return {
        ...ei._raw,
        // Keep identity and quantity immutable for non-manual edits
        kodeText: rawKode,
        kode: rawKode,
        namaBarang: rawNama,
        qty: rawQty,
        kadar: rawKadar,
        totalBerat: rawBerat,
        subtotal: safeSubtotal,
        harga: safeSubtotal,
        keterangan: rawKeterangan,
        // Keep backwards-compat fields too
        kodeLock: rawKodeLock,
        nama: rawNama,
        jumlah: rawQty,
        berat: rawBerat,
        totalHarga: safeSubtotal,
      };
    });

    const updates = {
      customerName: editForm.value.customerName,
      customerPhone: editForm.value.customerPhone,
      customerNumber: editForm.value.customerPhone,
      items: updatedItems,
      totalHarga: updatedItems.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0),
    };

    await store.updateTransactionFull(editTarget.value.id, updates);
    showEditModal.value = false;
    swal("Transaksi berhasil diperbarui", "success");
  } catch (err) {
    showError("Gagal memperbarui transaksi", err.message);
  } finally {
    isSavingEdit.value = false;
  }
}

// --- Print --------------------------------------------------------------------

function mapPrintItem(item) {
  const rawQty = Number(item?.qty ?? item?.jumlah ?? 1);
  const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
  const totalHarga = getSafeAmount(item?.subtotal ?? item?.totalHarga ?? item?.harga);

  return {
    nama: item?.namaBarang || item?.nama || "",
    kode: item?.kodeText || item?.kode || "",
    kadar: item?.kadar || "-",
    berat: item?.totalBerat ?? item?.berat ?? "-",
    qty,
    jumlah: qty,
    harga: totalHarga,
    subtotal: totalHarga,
    totalHarga,
    keterangan: item?.keterangan || "",
  };
}

async function postPrintRequest(endpoint, data) {
  const res = await fetch(`${PRINT_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = `Print gagal (${res.status})`;
    try {
      const errorBody = await res.json();
      message = errorBody?.error || errorBody?.message || message;
    } catch (_) {
      // ignore parse error, keep fallback message
    }
    throw new Error(message);
  }

  const result = await res.json();
  if (!result.success) throw new Error(result.error || "Print gagal");
  return result;
}

function shouldSplitInvoiceByItem(items) {
  return items.length > 1;
}

async function reprintInvoicePerItem(endpoint, baseData, items) {
  let successCount = 0;
  let failedCount = 0;
  let lastErrorMessage = "";

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    try {
      await postPrintRequest(endpoint, {
        ...baseData,
        items: [item],
        totalHarga: getSafeAmount(item.totalHarga),
        notes: item.keterangan || "",
      });
      successCount += 1;
    } catch (error) {
      failedCount += 1;
      lastErrorMessage = error?.message || "Print gagal";
    }

    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return { successCount, failedCount, lastErrorMessage };
}

function openPrintChoice(trx) {
  if (isPrinting.value) return;
  printChoiceTarget.value = trx;
  showPrintChoiceModal.value = true;
}

async function doPrint(type) {
  printingType.value = type;
  showPrintChoiceModal.value = false;
  await reprintTransaction(printChoiceTarget.value, type);
}

async function reprintTransaction(trx, type = "receipt") {
  if (isPrinting.value) return;
  isPrinting.value = true;
  printingType.value = type;
  printingTransactionId.value = trx?.id || null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const health = await fetch(`${PRINT_BASE}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!health.ok) throw new Error("unhealthy");

    const transactionType = (trx.jenisPenjualan ?? "").toUpperCase();
    const items = (trx.items ?? []).map(mapPrintItem);
    if (!items.length) throw new Error("Tidak ada item untuk dicetak");

    const endpoint = type === "invoice" ? "/api/print/invoice" : "/api/print/receipt";
    const { jumlahBayar, kembalian } = resolveReprintReceiptPayment(trx);
    const baseData = {
      transactionId: trx.id,
      transactionType,
      tanggal: trx.tanggal,
      jam: trx.jam ?? "",
      sales: trx.salesName ?? "",
      customerName: trx.customerName ?? "",
      customerPhone: trx.customerPhone ?? "",
      metodeBayar: trx.metodePembayaran ?? "",
      nominalDP: trx.nominalDP ?? 0,
      sisaPembayaran: trx.sisaPembayaran ?? 0,
      jumlahBayar,
      kembalian,
      notes: trx.keterangan || "",
    };

    if (type !== "invoice" || !shouldSplitInvoiceByItem(items)) {
      const mergedNotes =
        trx.keterangan ||
        items
          .map((item) => item.keterangan || "")
          .filter(Boolean)
          .join("; ");

      await postPrintRequest(endpoint, {
        ...baseData,
        items,
        totalHarga: getSafeAmount(trx.totalHarga),
        notes: mergedNotes,
      });
      swal(type === "invoice" ? "Invoice dikirim ke printer" : "Struk dikirim ke printer", "success");
      return;
    }

    const { successCount, failedCount, lastErrorMessage } = await reprintInvoicePerItem(endpoint, baseData, items);

    if (failedCount > 0) {
      if (successCount > 0) {
        swal(`${successCount} invoice berhasil, ${failedCount} gagal`, "warning");
        return;
      }
      throw new Error(lastErrorMessage || "Semua invoice gagal dicetak");
    }

    swal(`${successCount} invoice dikirim ke printer`, "success");
  } catch (err) {
    failedPrintContext.value = { trx, type };
    printOfflineMessage.value = err?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
    showPrintOfflineModal.value = true;
  } finally {
    isPrinting.value = false;
    printingTransactionId.value = null;
  }
}

async function retryPrint() {
  const payload = failedPrintContext.value;
  if (!payload?.trx) return;
  showPrintOfflineModal.value = false;
  await reprintTransaction(payload.trx, payload.type || "receipt");
}

// --- Cross-tab sync -----------------------------------------------------------
async function handleStockSync(e) {
  if (e.key !== "stokAksesorisChanged") return;
  try {
    const { kodes } = JSON.parse(e.newValue);
    await Promise.all(kodes.map((k) => store.refreshSingleStock(k)));
  } catch (_) {
    /* silent */
  }
}

// --- Lifecycle ----------------------------------------------------------------
onMounted(() => {
  window.addEventListener("storage", handleStockSync);
});

onUnmounted(() => {
  store.stopTodayListener();
  window.removeEventListener("storage", handleStockSync);
});
</script>

<style scoped>
/* Optimize table display for compact data visualization */
.table-responsive .table {
  font-size: 0.85rem;
  margin-bottom: 0;
}

.table-responsive .table th,
.table-responsive .table td {
  padding: 0.45rem 0.25rem;
  vertical-align: middle;
}

.table-responsive .table tbody tr {
  line-height: 1.2;
}

.table-responsive .btn-sm {
  padding: 0.2rem 0.4rem;
  font-size: 0.70rem;
}
</style>
