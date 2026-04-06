<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-arrow-return-left me-2 text-warning"></i>
        Return Barang
      </h4>
    </div>

    <!-- Form Input -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom">
        <i class="bi bi-pencil-square me-2 text-primary"></i>
        Input Return
      </div>
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal Return <span class="text-danger">*</span></label>
            <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Kasir <span class="text-danger">*</span></label>
            <select v-model="form.kasir" class="form-select form-select-sm">
              <option value="">-- Pilih Kasir --</option>
              <option v-for="s in salesList" :key="s.id" :value="s.nama">{{ s.nama }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Jenis Return <span class="text-danger">*</span></label>
            <select v-model="form.jenis" class="form-select form-select-sm">
              <option value="">-- Pilih Jenis --</option>
              <option value="kotak">Kotak</option>
              <option value="aksesoris">Aksesoris</option>
              <option value="silver">Silver</option>
            </select>
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button
              @click="openPilihBarang"
              :disabled="!form.jenis"
              class="btn btn-outline-primary btn-sm"
            >
              <i class="bi bi-box-seam me-1"></i> Pilih Barang
            </button>
          </div>
        </div>

        <!-- Return item table -->
        <div class="table-responsive mb-2">
          <table class="table table-sm table-bordered mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:42px">No</th>
                <th style="width:140px">Kode</th>
                <th>Nama Barang</th>
                <th style="width:120px">Jumlah Return</th>
                <th>Keterangan</th>
                <th style="width:60px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!returnRows.length">
                <td colspan="6" class="text-center text-muted small py-3">
                  Klik "Pilih Barang" untuk menambahkan item return
                </td>
              </tr>
              <tr v-for="(row, idx) in returnRows" :key="idx">
                <td class="text-center text-muted small align-middle">{{ idx + 1 }}</td>
                <td class="small fw-semibold text-primary align-middle">{{ row.kode }}</td>
                <td class="small align-middle">{{ row.nama }}</td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="form-control form-control-sm"
                    min="1"
                    placeholder="0"
                  />
                </td>
                <td>
                  <input
                    v-model="row.keterangan"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Opsional"
                  />
                </td>
                <td class="text-center align-middle">
                  <button @click="removeReturnRow(idx)" class="btn btn-sm btn-outline-danger py-0 px-1">
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex gap-2">
          <button @click="simpanReturn" :disabled="isSaving || !returnRows.length" class="btn btn-primary btn-sm">
            <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-save me-1"></i>
            Simpan Return
          </button>
          <button @click="resetForm" class="btn btn-secondary btn-sm">
            <i class="bi bi-x-circle me-1"></i> Batal
          </button>
        </div>
      </div>
    </div>

    <!-- Riwayat -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-clock-history me-1"></i> Riwayat Return
        </span>
        <div class="d-flex gap-2 align-items-center">
          <input v-model="histStart" type="date" class="form-control form-control-sm" style="width:150px" />
          <span class="text-muted small">s/d</span>
          <input v-model="histEnd" type="date" class="form-control form-control-sm" style="width:150px" />
          <button @click="loadHistory" class="btn btn-primary btn-sm">
            <i class="bi bi-search me-1"></i> Cari
          </button>
        </div>
      </div>
      <div class="card-body p-0">
        <div v-if="histLoading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!history.length" class="text-center py-4 text-muted small">
          <i class="bi bi-inbox display-6 d-block mb-1 opacity-25"></i>
          Belum ada riwayat
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light sticky-top">
              <tr>
                <th>Tanggal</th>
                <th>Kasir</th>
                <th>Jenis</th>
                <th>Kode</th>
                <th>Nama</th>
                <th class="text-center">Jumlah</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td class="small">{{ h.tanggal }}</td>
                <td class="small">{{ h.kasir || '—' }}</td>
                <td class="small">{{ h.jenisReturn || '—' }}</td>
                <td class="small fw-semibold text-primary">{{ h.kode }}</td>
                <td class="small">{{ h.nama }}</td>
                <td class="small text-center">{{ h.jumlah }}</td>
                <td class="small text-muted">{{ h.keterangan || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Modal Pilih Barang ── -->
    <div
      class="modal fade"
      id="modalPilihBarang"
      tabindex="-1"
      aria-labelledby="modalPilihBarangLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h5 class="modal-title small fw-semibold" id="modalPilihBarangLabel">
              <i class="bi bi-box-seam me-2"></i> Pilih Barang — {{ form.jenis }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <input
              v-model="modalSearch"
              type="text"
              class="form-control form-control-sm mb-2"
              placeholder="Cari kode / nama..."
            />
            <div class="table-responsive" style="max-height:360px; overflow-y:auto">
              <table class="table table-sm table-hover mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th class="text-center">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in filteredModalItems"
                    :key="item.kode"
                    @click="pickItem(item)"
                    style="cursor:pointer"
                  >
                    <td class="small fw-semibold text-primary">{{ item.kode }}</td>
                    <td class="small">{{ item.nama }}</td>
                    <td class="small text-center">{{ item.stok }}</td>
                  </tr>
                  <tr v-if="!filteredModalItems.length">
                    <td colspan="3" class="text-center text-muted small py-3">Tidak ada barang</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Modal } from "bootstrap";
import { useAccessoriesStore } from "@/stores/accessories";
import { processReturn, fetchTransactionHistory } from "@/services/stock-service";
import { fetchSalesList } from "@/services/sales-service";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";

const store = useAccessoriesStore();
const { toast, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── Form ─────────────────────────────────────────────────────────────────────
const form = ref({ tanggal: todayStringWITA(), kasir: "", jenis: "" });
const returnRows = ref([]);
const isSaving = ref(false);
const salesList = ref([]);

// ── Modal ──────────────────────────────────────────────────────────────────
const modalSearch = ref("");
let bsModal = null;

const catalogForJenis = computed(() => {
  if (!form.value.jenis) return [];
  return store.activeItems.filter((item) => (item.kategori || "").toLowerCase() === form.value.jenis);
});

const filteredModalItems = computed(() => {
  const q = modalSearch.value.toLowerCase();
  return q
    ? catalogForJenis.value.filter((i) => i.kode.toLowerCase().includes(q) || i.nama.toLowerCase().includes(q))
    : catalogForJenis.value;
});

function openPilihBarang() {
  modalSearch.value = "";
  if (!bsModal) bsModal = new Modal(document.getElementById("modalPilihBarang"));
  bsModal.show();
}

function pickItem(item) {
  // Prevent duplicate
  if (!returnRows.value.find((r) => r.kode === item.kode)) {
    returnRows.value.push({ kode: item.kode, nama: item.nama, jumlah: 1, keterangan: "" });
  }
  bsModal.hide();
}

function removeReturnRow(idx) {
  returnRows.value.splice(idx, 1);
}

// ── Simpan ────────────────────────────────────────────────────────────────
async function simpanReturn() {
  if (!form.value.tanggal || !form.value.kasir || !form.value.jenis) {
    showError("Data Belum Lengkap", "Tanggal, kasir, dan jenis harus diisi.");
    return;
  }
  const validRows = returnRows.value.filter((r) => r.jumlah > 0);
  if (!validRows.length) {
    showError("Data Kosong", "Isi jumlah return untuk semua item.");
    return;
  }

  isSaving.value = true;
  try {
    const items = validRows.map((r) => ({
      kode: r.kode,
      nama: r.nama,
      jumlah: r.jumlah,
      keterangan: r.keterangan,
    }));
    await processReturn(items, { tanggal: form.value.tanggal, kasir: form.value.kasir, jenis: form.value.jenis });

    // Refresh affected catalog entries
    await Promise.all(items.map((i) => store.refreshSingleStock(i.kode)));
    store.notifyStockChanged(items.map((i) => i.kode));

    toast(`Return ${items.reduce((s, i) => s + i.jumlah, 0)} item berhasil disimpan`);
    resetForm();
    await loadHistory();
  } catch (e) {
    showError("Gagal Menyimpan Return", e.message);
  } finally {
    isSaving.value = false;
  }
}

function resetForm() {
  form.value = { tanggal: todayStringWITA(), kasir: form.value.kasir, jenis: "" };
  returnRows.value = [];
}

// ── Riwayat ───────────────────────────────────────────────────────────────
const histStart = ref(todayStringWITA());
const histEnd = ref(todayStringWITA());
const history = ref([]);
const histLoading = ref(false);

async function loadHistory() {
  histLoading.value = true;
  try {
    history.value = await fetchTransactionHistory(histStart.value, histEnd.value, "return");
  } catch (e) {
    showError("Gagal memuat riwayat", e.message);
  } finally {
    histLoading.value = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([store.loadCatalog(), fetchSalesList().then((list) => (salesList.value = list))]);
  await loadHistory();
});
</script>
