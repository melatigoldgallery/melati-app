<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-list-ul me-2 text-warning"></i>
        Data Penjualan
      </h4>
      <div class="d-flex gap-2 align-items-center">
        <input v-model="filterStart" type="date" class="form-control form-control-sm" style="width: 155px" />
        <span class="text-muted small">s/d</span>
        <input v-model="filterEnd" type="date" class="form-control form-control-sm" style="width: 155px" />
        <button @click="loadData" class="btn btn-primary btn-sm">
          <i class="bi bi-search me-1"></i>
          Cari
        </button>
      </div>
    </div>

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
          <div class="small text-muted mt-1">Total Item</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-3">
          <div class="h4 fw-bold text-info mb-0">{{ uniqueSales }}</div>
          <div class="small text-muted mt-1">Sales Aktif</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-table me-1"></i>
          Daftar Transaksi
        </span>
        <div class="input-group input-group-sm" style="width: 220px">
          <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
          <input v-model="searchText" type="text" class="form-control" placeholder="Cari..." />
        </div>
      </div>
      <div class="card-body p-0">
        <div v-if="store.isLoading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!filteredTransactions.length" class="text-center py-5 text-muted">
          <i class="bi bi-inbox display-4 d-block mb-2 opacity-25"></i>
          Belum ada data transaksi
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light sticky-top">
              <tr>
                <th class="text-center" style="width: 42px">No</th>
                <th>Tanggal</th>
                <th>Sales</th>
                <th>Customer</th>
                <th>Items</th>
                <th class="text-end">Total</th>
                <th>Status</th>
                <th class="text-center" style="width: 90px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(trx, idx) in filteredTransactions" :key="trx.id">
                <tr @click="toggleExpand(trx.id)" style="cursor: pointer">
                  <td class="text-center text-muted small">{{ idx + 1 }}</td>
                  <td class="small">{{ trx.tanggal }}</td>
                  <td class="small fw-semibold">{{ trx.salesName }}</td>
                  <td class="small text-muted">{{ trx.customerName || "—" }}</td>
                  <td class="small">{{ (trx.items ?? []).length }} item</td>
                  <td class="text-end small fw-semibold text-primary">{{ formatCurrency(trx.totalHarga) }}</td>
                  <td>
                    <span class="badge" :class="statusClass(trx.statusPembayaran)">
                      {{ trx.statusPembayaran || trx.metodePembayaran || "—" }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button
                      @click.stop="printTransaction(trx)"
                      class="btn btn-sm btn-outline-secondary py-0 px-1 me-1"
                      title="Cetak"
                    >
                      <i class="bi bi-printer small"></i>
                    </button>
                    <button
                      @click.stop="confirmDelete(trx)"
                      class="btn btn-sm btn-outline-danger py-0 px-1"
                      title="Hapus"
                    >
                      <i class="bi bi-trash3 small"></i>
                    </button>
                  </td>
                </tr>
                <!-- Expand: item detail -->
                <tr v-if="expandedId === trx.id" class="bg-light">
                  <td colspan="8" class="p-0">
                    <div class="p-3">
                      <table class="table table-sm table-bordered mb-0">
                        <thead class="table-secondary">
                          <tr>
                            <th>No</th>
                            <th>Kode</th>
                            <th>Nama</th>
                            <th class="text-center">Qty</th>
                            <th class="text-end">Harga</th>
                            <th class="text-end">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(item, i) in trx.items ?? []" :key="i">
                            <td>{{ i + 1 }}</td>
                            <td class="text-primary fw-semibold">{{ item.kodeText || item.kode }}</td>
                            <td>{{ item.namaBarang }}</td>
                            <td class="text-center">{{ item.qty }}</td>
                            <td class="text-end">{{ formatCurrency(item.harga) }}</td>
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

    <!-- Delete confirmation modal -->
    <AppModal v-model="showDeleteModal" title="Hapus Transaksi" size="sm">
      <template #default>
        <p class="mb-1">Hapus transaksi ini?</p>
        <p class="text-muted small">Stok barang akan dikembalikan secara otomatis.</p>
        <p v-if="deleteTarget" class="fw-semibold">
          {{ deleteTarget.tanggal }} — {{ deleteTarget.salesName }} — {{ formatCurrency(deleteTarget.totalHarga) }}
        </p>
        <!-- Supervisor password required -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAccessoriesStore } from "@/stores/accessories";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";

const store = useAccessoriesStore();
const { toast, error: showError } = useAlert();

// ─── State ───────────────────────────────────────────────────────────────────
const today = new Date();
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const filterStart = ref(todayISO);
const filterEnd = ref(todayISO);
const searchText = ref("");
const expandedId = ref(null);
const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const supervisorPass = ref("");
const isDeleting = ref(false);

// ─── Computed ─────────────────────────────────────────────────────────────────
const transactions = computed(() => store.transactions);

const filteredTransactions = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return transactions.value;
  return transactions.value.filter(
    (t) =>
      (t.salesName ?? "").toLowerCase().includes(q) ||
      (t.customerName ?? "").toLowerCase().includes(q) ||
      (t.items ?? []).some((i) => (i.kodeText ?? i.kode ?? "").toLowerCase().includes(q)),
  );
});

const totalPendapatan = computed(() => transactions.value.reduce((s, t) => s + (t.totalHarga ?? 0), 0));
const totalItem = computed(() =>
  transactions.value.reduce((s, t) => s + (t.items ?? []).reduce((si, i) => si + (i.qty ?? 1), 0), 0),
);
const uniqueSales = computed(() => new Set(transactions.value.map((t) => t.salesName)).size);

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadData() {
  // Switch from live listener to getDocs for historical range
  store.stopTodayListener();
  if (filterStart.value === todayISO && filterEnd.value === todayISO) {
    store.startTodayListener();
  } else {
    await store.loadTransactions(filterStart.value, filterEnd.value);
  }
}

async function loadMore() {
  await store.loadTransactions(filterStart.value, filterEnd.value, true);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function confirmDelete(trx) {
  deleteTarget.value = trx;
  supervisorPass.value = "";
  showDeleteModal.value = true;
}

async function executeDelete() {
  if (!supervisorPass.value) {
    toast("Password supervisor wajib diisi", "warning");
    return;
  }
  isDeleting.value = true;
  try {
    const valid = await store.verifySupervisor(supervisorPass.value);
    if (!valid) {
      toast("Password supervisor salah", "error");
      return;
    }

    await store.removeTransaction(deleteTarget.value.id, deleteTarget.value);
    showDeleteModal.value = false;
    toast("Transaksi berhasil dihapus dan stok dipulihkan", "success");
  } catch (err) {
    showError("Gagal menghapus transaksi", err.message);
  } finally {
    isDeleting.value = false;
  }
}

// ─── Print ────────────────────────────────────────────────────────────────────
function printTransaction(trx) {
  toast("Fitur cetak akan tersedia segera", "info");
}

// ─── Cross-tab sync ───────────────────────────────────────────────────────────
async function handleStockSync(e) {
  if (e.key !== "stokAksesorisChanged") return;
  try {
    const { kodes } = JSON.parse(e.newValue);
    await Promise.all(kodes.map((k) => store.refreshSingleStock(k)));
  } catch (_) {
    /* silent */
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  store.startTodayListener();
  window.addEventListener("storage", handleStockSync);
});

onUnmounted(() => {
  store.stopTodayListener();
  window.removeEventListener("storage", handleStockSync);
});
</script>
