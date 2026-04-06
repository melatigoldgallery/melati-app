<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-gem me-2 text-warning"></i>
        Penjualan Aksesoris
      </h4>
      <span class="badge bg-secondary fs-6">{{ todayDate }}</span>
    </div>

    <div class="row g-3">
      <!-- ── Left: Form Input ── -->
      <div class="col-lg-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white fw-semibold border-bottom">
            <i class="bi bi-pencil-square me-2 text-primary"></i>
            Input Transaksi
          </div>
          <div class="card-body">
            <!-- Sales & Jenis Penjualan -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">
                  Sales
                  <span class="text-danger">*</span>
                </label>
                <select v-model="form.salesName" class="form-select form-select-sm">
                  <option value="">-- Pilih Sales --</option>
                  <option v-for="s in salesList" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Jenis Penjualan</label>
                <select v-model="form.tipe" class="form-select form-select-sm">
                  <option value="aksesoris">Aksesoris</option>
                  <option value="kotak">Kotak</option>
                  <option value="silver">Silver</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            <!-- Customer -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">Nama Customer</label>
                <input
                  v-model="form.customerName"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Opsional"
                />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">No. HP</label>
                <input
                  v-model="form.customerPhone"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Opsional"
                />
              </div>
            </div>

            <!-- Tanggal & Metode Bayar -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">Tanggal</label>
                <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Metode Bayar</label>
                <select v-model="form.metodePembayaran" class="form-select form-select-sm">
                  <option value="TUNAI">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="QRIS">QRIS</option>
                  <option value="DP">DP</option>
                  <option value="FREE">Free</option>
                </select>
              </div>
            </div>

            <!-- DP Fields -->
            <div v-if="form.metodePembayaran === 'DP'" class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">
                  Nominal DP
                  <span class="text-danger">*</span>
                </label>
                <input
                  v-model.number="form.nominalDP"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  placeholder="0"
                />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Sisa Pembayaran</label>
                <input
                  :value="formatCurrency(sisaPembayaran)"
                  type="text"
                  class="form-control form-control-sm"
                  readonly
                />
              </div>
            </div>

            <!-- Jumlah Bayar & Kembalian (non-DP, non-FREE) -->
            <div v-if="form.metodePembayaran !== 'DP' && form.metodePembayaran !== 'FREE'" class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">Jumlah Bayar</label>
                <input
                  v-model.number="form.jumlahBayar"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  placeholder="0"
                />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Kembalian</label>
                <input
                  :value="formatCurrency(kembalian)"
                  type="text"
                  class="form-control form-control-sm bg-light"
                  readonly
                />
              </div>
            </div>

            <hr class="my-2" />

            <!-- Item Search & Add -->
            <div class="mb-2">
              <label class="form-label small fw-semibold">Cari Barang</label>
              <div class="input-group input-group-sm">
                <input
                  v-model="searchQuery"
                  @input="onSearchInput"
                  @keydown.enter.prevent="onSearchEnter"
                  type="text"
                  class="form-control"
                  placeholder="Ketik kode atau nama..."
                  autocomplete="off"
                />
                <button @click="clearSearch" class="btn btn-outline-secondary">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <!-- Autocomplete dropdown -->
              <div v-if="suggestions.length && searchQuery" class="position-relative">
                <ul
                  class="list-group position-absolute w-100 shadow z-3"
                  style="top: 0; max-height: 220px; overflow-y: auto"
                >
                  <li
                    v-for="item in suggestions"
                    :key="item.kode"
                    @click="selectSuggestion(item)"
                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center small py-2"
                    style="cursor: pointer"
                  >
                    <div>
                      <span class="fw-semibold text-primary me-2">{{ item.kode }}</span>
                      <span>{{ item.nama }}</span>
                    </div>
                    <span class="badge" :class="item.stok > 0 ? 'bg-success' : 'bg-danger'">
                      Stok: {{ item.stok ?? 0 }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Per-item fields for selected item -->
            <div v-if="selectedItem" class="border rounded p-2 mb-2 bg-light">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small">
                  <span class="text-primary">{{ selectedItem.kode }}</span>
                  — {{ selectedItem.nama }}
                </span>
                <span class="badge" :class="selectedItem.stok > 0 ? 'bg-success' : 'bg-danger'">
                  Stok: {{ selectedItem.stok ?? 0 }}
                </span>
              </div>

              <div class="row g-2">
                <div class="col-4">
                  <label class="form-label small">Qty</label>
                  <input v-model.number="itemForm.qty" type="number" min="1" class="form-control form-control-sm" />
                </div>
                <div class="col-4" v-if="form.tipe !== 'silver'">
                  <label class="form-label small">Harga</label>
                  <input v-model.number="itemForm.harga" type="number" min="0" class="form-control form-control-sm" />
                </div>
                <!-- Silver fields -->
                <template v-if="form.tipe === 'silver'">
                  <div class="col-4">
                    <label class="form-label small">Kadar</label>
                    <input
                      v-model="itemForm.kadar"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="misal: 750"
                    />
                  </div>
                  <div class="col-4">
                    <label class="form-label small">Berat (gr)</label>
                    <input
                      v-model.number="itemForm.berat"
                      type="number"
                      step="0.01"
                      min="0"
                      class="form-control form-control-sm"
                    />
                  </div>
                  <div class="col-4">
                    <label class="form-label small">Hrg/gr</label>
                    <input
                      v-model.number="itemForm.hargaPerGram"
                      type="number"
                      min="0"
                      class="form-control form-control-sm"
                    />
                  </div>
                </template>
              </div>
              <button @click="addToCart" class="btn btn-primary btn-sm w-100 mt-2">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah ke Keranjang
              </button>
            </div>

            <!-- Manual item form -->
            <div v-if="form.tipe === 'manual'" class="border rounded p-2 mb-2 bg-light">
              <p class="small fw-semibold mb-2">Item Manual</p>
              <div class="row g-2">
                <div class="col-6">
                  <label class="form-label small">
                    Nama Barang
                    <span class="text-danger">*</span>
                  </label>
                  <input v-model="manualForm.namaBarang" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-6">
                  <label class="form-label small">Kode Lock</label>
                  <input
                    v-model="manualForm.kodeLock"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Opsional"
                  />
                </div>
                <div class="col-4">
                  <label class="form-label small">
                    Kadar
                    <span class="text-danger">*</span>
                  </label>
                  <input v-model="manualForm.kadar" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-4">
                  <label class="form-label small">
                    Berat (gr)
                    <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model.number="manualForm.berat"
                    type="number"
                    step="0.01"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-4">
                  <label class="form-label small">
                    Total Harga
                    <span class="text-danger">*</span>
                  </label>
                  <input v-model.number="manualForm.totalHarga" type="number" class="form-control form-control-sm" />
                </div>
              </div>
              <button @click="addManualToCart" class="btn btn-outline-primary btn-sm w-100 mt-2">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Right: Cart Table ── -->
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white fw-semibold border-bottom d-flex justify-content-between align-items-center">
            <span>
              <i class="bi bi-cart3 me-2 text-warning"></i>
              Keranjang
            </span>
            <span v-if="cart.items.value.length" class="badge bg-secondary">{{ cart.items.value.length }} item</span>
          </div>
          <div class="card-body p-0">
            <div v-if="!cart.items.value.length" class="text-center py-5 text-muted">
              <i class="bi bi-cart-x display-4 d-block mb-2 opacity-25"></i>
              Keranjang kosong
            </div>
            <div v-else class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="text-center" style="width: 36px">No</th>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th class="text-center">Qty</th>
                    <th class="text-end">Harga</th>
                    <th class="text-end">Subtotal</th>
                    <th class="text-center" style="width: 40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in cart.items.value" :key="index">
                    <td class="text-center text-muted small">{{ index + 1 }}</td>
                    <td class="fw-semibold small text-primary">{{ item.kodeText }}</td>
                    <td class="small">{{ item.namaBarang }}</td>
                    <td class="text-center small">{{ item.qty }}</td>
                    <td class="text-end small">{{ formatCurrency(item.harga) }}</td>
                    <td class="text-end small fw-semibold">{{ formatCurrency(item.subtotal) }}</td>
                    <td class="text-center">
                      <button @click="cart.removeItem(index)" class="btn btn-sm btn-outline-danger py-0 px-1">
                        <i class="bi bi-trash3 small"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="table-light fw-bold">
                    <td colspan="5" class="text-end">Total:</td>
                    <td class="text-end text-primary">{{ formatCurrency(cart.total.value) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div
            v-if="cart.items.value.length"
            class="card-footer bg-white d-flex justify-content-between align-items-center"
          >
            <button @click="cart.clearCart()" class="btn btn-sm btn-outline-danger">
              <i class="bi bi-trash me-1"></i>
              Kosongkan
            </button>
            <button @click="openConfirmModal" class="btn btn-primary btn-sm">
              <i class="bi bi-check-circle me-1"></i>
              Simpan Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Confirm Modal ── -->
    <AppModal v-model="showConfirm" title="Konfirmasi Transaksi" size="lg">
      <template #default>
        <div class="row g-3">
          <div class="col-md-6">
            <p class="mb-1 small text-muted">Sales</p>
            <p class="fw-semibold">{{ form.salesName }}</p>
          </div>
          <div class="col-md-6">
            <p class="mb-1 small text-muted">Tanggal</p>
            <p class="fw-semibold">{{ form.tanggal }}</p>
          </div>
          <div class="col-md-6">
            <p class="mb-1 small text-muted">Metode Bayar</p>
            <p class="fw-semibold">{{ form.metodePembayaran }}</p>
          </div>
          <div class="col-md-6">
            <p class="mb-1 small text-muted">Total</p>
            <p class="fw-semibold text-primary fs-5">{{ formatCurrency(cart.total.value) }}</p>
          </div>
          <div v-if="form.customerName" class="col-md-6">
            <p class="mb-1 small text-muted">Customer</p>
            <p class="fw-semibold">{{ form.customerName }}</p>
          </div>
        </div>
        <hr />
        <div class="table-responsive">
          <table class="table table-sm table-bordered mb-0">
            <thead class="table-light">
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Nama</th>
                <th class="text-center">Qty</th>
                <th class="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in cart.items.value" :key="i">
                <td>{{ i + 1 }}</td>
                <td class="text-primary fw-semibold">{{ item.kodeText }}</td>
                <td>{{ item.namaBarang }}</td>
                <td class="text-center">{{ item.qty }}</td>
                <td class="text-end">{{ formatCurrency(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button @click="showConfirm = false" class="btn btn-secondary btn-sm me-2">Batal</button>
        <button @click="submitTransaction" :disabled="isSaving" class="btn btn-primary btn-sm">
          <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
          Simpan
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { getDocs, query, collection, where, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAccessoriesStore } from "@/stores/accessories";
import { useCart } from "@/composables/useCart";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";

const store = useAccessoriesStore();
const cart = useCart();
const { toast, confirm, error: showError } = useAlert();

// ─── Reactive state ──────────────────────────────────────────────────────────
const today = new Date();
const todayDate = today.toLocaleDateString("id-ID", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

// Sales list (can be extended to load from Firestore)
const salesList = ref([]);

const form = reactive({
  salesName: "",
  tipe: "aksesoris",
  tanggal: todayISO,
  customerName: "",
  customerPhone: "",
  metodePembayaran: "TUNAI",
  nominalDP: 0,
  jumlahBayar: 0,
});

const itemForm = reactive({ qty: 1, harga: 0, kadar: "", berat: 0, hargaPerGram: 0 });
const manualForm = reactive({ namaBarang: "", kodeLock: "", kadar: "", berat: 0, totalHarga: 0 });

const searchQuery = ref("");
const selectedItem = ref(null);
const suggestions = ref([]);
const showConfirm = ref(false);
const isSaving = ref(false);

// ─── Computed ────────────────────────────────────────────────────────────────
const sisaPembayaran = computed(() => Math.max(0, cart.total.value - (form.nominalDP ?? 0)));
const kembalian = computed(() => Math.max(0, (form.jumlahBayar ?? 0) - cart.total.value));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID").format(val ?? 0);
}

// ─── Search / Autocomplete ────────────────────────────────────────────────────
function onSearchInput() {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    suggestions.value = [];
    return;
  }
  suggestions.value = store.activeItems
    .filter((item) => item.kode?.toLowerCase().includes(q) || item.nama?.toLowerCase().includes(q))
    .slice(0, 8);
}

function onSearchEnter() {
  if (suggestions.value.length === 1) selectSuggestion(suggestions.value[0]);
  else if (suggestions.value.length > 1) {
    // highlight first
    selectSuggestion(suggestions.value[0]);
  }
}

function selectSuggestion(item) {
  selectedItem.value = item;
  searchQuery.value = `${item.kode} — ${item.nama}`;
  suggestions.value = [];
  itemForm.qty = 1;
  itemForm.harga = item.hargaJual ?? 0;
  itemForm.kadar = "";
  itemForm.berat = 0;
  itemForm.hargaPerGram = 0;
}

function clearSearch() {
  searchQuery.value = "";
  suggestions.value = [];
  selectedItem.value = null;
}

// ─── Cart actions ────────────────────────────────────────────────────────────
function addToCart() {
  if (!selectedItem.value) return;
  const item = selectedItem.value;
  if (form.tipe !== "silver" && form.tipe !== "manual") {
    if (item.stok !== undefined && (item.stok ?? 0) < itemForm.qty) {
      toast(`Stok ${item.kode} tidak cukup (tersedia: ${item.stok ?? 0})`, "warning");
      return;
    }
    cart.addItem({
      tipe: form.tipe,
      kode: item.kode,
      kodeText: item.kode,
      namaBarang: item.nama,
      qty: itemForm.qty,
      harga: itemForm.harga,
      subtotal: itemForm.qty * itemForm.harga,
    });
  } else if (form.tipe === "silver") {
    if (!itemForm.kadar || itemForm.berat <= 0) {
      toast("Kadar dan berat wajib diisi untuk Silver", "warning");
      return;
    }
    const totalBerat = itemForm.berat * itemForm.qty;
    cart.addItem({
      tipe: "silver",
      kode: item.kode,
      kodeText: item.kode,
      namaBarang: item.nama,
      qty: itemForm.qty,
      harga: itemForm.hargaPerGram,
      hargaPerGram: itemForm.hargaPerGram,
      kadar: itemForm.kadar,
      berat: itemForm.berat,
      totalBerat,
      subtotal: totalBerat * itemForm.hargaPerGram,
    });
  }
  clearSearch();
}

function addManualToCart() {
  if (!manualForm.namaBarang || !manualForm.kadar || manualForm.berat <= 0 || manualForm.totalHarga <= 0) {
    toast("Isi semua field yang wajib untuk item manual", "warning");
    return;
  }
  cart.addItem({
    tipe: "manual",
    kode: "-",
    kodeText: "-",
    namaBarang: manualForm.namaBarang,
    qty: 1,
    harga: manualForm.totalHarga,
    subtotal: manualForm.totalHarga,
    kodeLock: manualForm.kodeLock || null,
    kadar: manualForm.kadar,
    berat: manualForm.berat,
  });
  Object.assign(manualForm, { namaBarang: "", kodeLock: "", kadar: "", berat: 0, totalHarga: 0 });
}

// ─── Submit ───────────────────────────────────────────────────────────────────
function openConfirmModal() {
  if (!form.salesName) {
    toast("Pilih nama sales terlebih dahulu", "warning");
    return;
  }
  if (!cart.items.value.length) {
    toast("Keranjang masih kosong", "warning");
    return;
  }
  if (form.metodePembayaran === "DP" && (!form.nominalDP || form.nominalDP <= 0)) {
    toast("Nominal DP wajib diisi", "warning");
    return;
  }
  showConfirm.value = true;
}

async function submitTransaction() {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    const cartItems = cart.serializeItems();
    const transactionData = {
      jenisPenjualan: form.tipe,
      tanggal: form.tanggal,
      salesName: form.salesName,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      metodePembayaran: form.metodePembayaran,
      totalHarga: cart.total.value,
      items: cartItems,
      status: "SELESAI",
    };
    if (form.metodePembayaran === "DP") {
      transactionData.nominalDP = form.nominalDP;
      transactionData.sisaPembayaran = sisaPembayaran.value;
      transactionData.statusPembayaran = `DP ${formatCurrency(form.nominalDP)}`;
    } else if (form.metodePembayaran === "FREE") {
      transactionData.statusPembayaran = "Free";
    } else {
      transactionData.jumlahBayar = form.jumlahBayar;
      transactionData.kembalian = kembalian.value;
      transactionData.statusPembayaran = "Lunas";
    }

    await store.saveTransaction(cartItems, transactionData);
    showConfirm.value = false;
    cart.clearCart();
    toast("Transaksi berhasil disimpan!", "success");
  } catch (err) {
    showError("Gagal menyimpan transaksi", err.message);
  } finally {
    isSaving.value = false;
  }
}

// ─── Cross-tab stock sync ────────────────────────────────────────────────────
async function handleStockSync(e) {
  if (e.key !== "stokAksesorisChanged") return;
  try {
    const { kodes } = JSON.parse(e.newValue);
    await Promise.all(kodes.map((k) => store.refreshSingleStock(k)));
  } catch (_) {
    /* silent */
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.loadCatalog();
  // Load active sales staff from Firestore
  try {
    const q = query(collection(db, "salesStaff"), where("status", "==", "active"), orderBy("nama", "asc"));
    const snap = await getDocs(q);
    salesList.value = snap.docs.map((d) => d.data().nama);
  } catch (_) {
    salesList.value = [];
  }
  window.addEventListener("storage", handleStockSync);
});

onUnmounted(() => {
  window.removeEventListener("storage", handleStockSync);
});
</script>
