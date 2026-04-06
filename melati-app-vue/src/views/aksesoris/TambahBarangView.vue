<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-plus-circle me-2 text-warning"></i>
        Tambah Barang Aksesoris
      </h4>
    </div>

    <!-- Form Input -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom">
        <i class="bi bi-boxes me-2 text-primary"></i>
        Data Penambahan Stok
      </div>
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal <span class="text-danger">*</span></label>
            <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Kasir <span class="text-danger">*</span></label>
            <input
              v-model="form.kasir"
              type="text"
              class="form-control form-control-sm"
              placeholder="Nama kasir"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Jenis Aksesoris <span class="text-danger">*</span></label>
            <select v-model="form.jenis" class="form-select form-select-sm" @change="onJenisChange">
              <option value="">-- Pilih Jenis --</option>
              <option value="kotak">Kotak Perhiasan</option>
              <option value="aksesoris">Aksesoris Perhiasan</option>
              <option value="silver">Silver</option>
            </select>
          </div>
        </div>

        <!-- Item table -->
        <div class="table-responsive mb-2">
          <table class="table table-sm table-bordered mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:42px">No</th>
                <th style="width:220px">Kode Barang</th>
                <th>Nama Barang</th>
                <th style="width:120px">Jumlah</th>
                <th style="width:60px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in inputRows" :key="idx">
                <td class="text-center text-muted small align-middle">{{ idx + 1 }}</td>
                <td>
                  <select
                    v-model="row.kode"
                    class="form-select form-select-sm"
                    @change="onKodeChange(row)"
                  >
                    <option value="">-- Pilih Kode --</option>
                    <option
                      v-for="item in filteredCatalog"
                      :key="item.kode"
                      :value="item.kode"
                      :data-nama="item.nama"
                    >{{ item.kode }}</option>
                  </select>
                </td>
                <td>
                  <input
                    v-model="row.nama"
                    type="text"
                    class="form-control form-control-sm"
                    readonly
                    placeholder="Otomatis"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="form-control form-control-sm"
                    min="1"
                    placeholder="0"
                  />
                </td>
                <td class="text-center align-middle">
                  <button
                    v-if="inputRows.length > 1"
                    @click="removeRow(idx)"
                    class="btn btn-sm btn-outline-danger py-0 px-1"
                  >
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="table-light fw-semibold">
                <td colspan="3" class="text-end small">Total Item:</td>
                <td class="small">{{ totalJumlah }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="d-flex gap-2">
          <button @click="addRow" :disabled="!form.jenis" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-plus-lg me-1"></i> Tambah Baris
          </button>
          <button @click="simpanData" :disabled="isSaving" class="btn btn-primary btn-sm">
            <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-save me-1"></i>
            Simpan Data
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
          <i class="bi bi-clock-history me-1"></i>
          Riwayat Penambahan Stok
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
                <th>Kode</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th class="text-center">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td class="small">{{ h.tanggal }}</td>
                <td class="small">{{ h.kasir || '—' }}</td>
                <td class="small fw-semibold text-primary">{{ h.kode }}</td>
                <td class="small">{{ h.nama }}</td>
                <td class="small">{{ h.kategori }}</td>
                <td class="small text-center">{{ h.jumlah }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAccessoriesStore } from "@/stores/accessories";
import { addStock, fetchTransactionHistory } from "@/services/stock-service";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";

const store = useAccessoriesStore();
const { toast, error: showError, confirm } = useAlert();
const { todayStringWITA } = useWITA();

// ── Form ─────────────────────────────────────────────────────────────────────
const form = ref({ tanggal: todayStringWITA(), kasir: "", jenis: "" });

function defaultRow() {
  return { kode: "", nama: "", jumlah: null };
}
const inputRows = ref([defaultRow()]);

const filteredCatalog = computed(() => {
  if (!form.value.jenis) return [];
  return store.activeItems.filter((item) => (item.kategori || "").toLowerCase() === form.value.jenis);
});

const totalJumlah = computed(() => inputRows.value.reduce((s, r) => s + (r.jumlah || 0), 0));

function onJenisChange() {
  inputRows.value = [defaultRow()];
}

function onKodeChange(row) {
  const item = store.activeItems.find((c) => c.kode === row.kode);
  row.nama = item ? item.nama : "";
}

function addRow() {
  inputRows.value.push(defaultRow());
}

function removeRow(idx) {
  inputRows.value.splice(idx, 1);
}

// ── Simpan ─────────────────────────────────────────────────────────────────
const isSaving = ref(false);

async function simpanData() {
  if (!form.value.tanggal || !form.value.kasir || !form.value.jenis) {
    showError("Data Belum Lengkap", "Tanggal, kasir, dan jenis harus diisi.");
    return;
  }
  const validRows = inputRows.value.filter((r) => r.kode && r.jumlah > 0);
  if (!validRows.length) {
    showError("Data Kosong", "Tambahkan minimal satu baris dengan kode dan jumlah.");
    return;
  }

  const items = validRows.map((r) => ({ kode: r.kode, nama: r.nama, jumlah: r.jumlah, kategori: form.value.jenis }));

  isSaving.value = true;
  try {
    await addStock(items, { tanggal: form.value.tanggal, kasir: form.value.kasir });

    // Refresh affected catalog entries
    await Promise.all(items.map((i) => store.refreshSingleStock(i.kode)));
    store.notifyStockChanged(items.map((i) => i.kode));

    toast(`${items.reduce((s, i) => s + i.jumlah, 0)} item berhasil ditambahkan`);
    resetForm();
    await loadHistory();
  } catch (e) {
    showError("Gagal Menyimpan", e.message);
  } finally {
    isSaving.value = false;
  }
}

function resetForm() {
  form.value = { tanggal: todayStringWITA(), kasir: form.value.kasir, jenis: "" };
  inputRows.value = [defaultRow()];
}

// ── Riwayat ───────────────────────────────────────────────────────────────
const histStart = ref(todayStringWITA());
const histEnd = ref(todayStringWITA());
const history = ref([]);
const histLoading = ref(false);

async function loadHistory() {
  histLoading.value = true;
  try {
    history.value = await fetchTransactionHistory(histStart.value, histEnd.value, "tambah");
  } catch (e) {
    showError("Gagal memuat riwayat", e.message);
  } finally {
    histLoading.value = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.loadCatalog();
  await loadHistory();
});
</script>
