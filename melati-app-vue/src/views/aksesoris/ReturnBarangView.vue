<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-arrow-return-left me-2 text-dark"></i>
        Return Barang
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Return Barang</li>
        </ol>
      </nav>
    </div>

    <!-- Form Input -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom">
        <span>
          <i class="bi bi-pencil-square me-2 text-primary"></i>
          Input Return
        </span>
      </div>
      <div class="card-body">
        <div class="row g-2 mb-3">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Tanggal Return
              <span class="text-danger">*</span>
            </label>
            <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Kasir
              <span class="text-danger">*</span>
            </label>
            <select v-model="form.kasir" class="form-select form-select-sm">
              <option value="">-- Pilih Kasir --</option>
              <option v-for="s in salesList" :key="s.id" :value="s.nama">{{ s.nama }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Jenis Return
              <span class="text-danger">*</span>
            </label>
            <select v-model="form.jenis" class="form-select form-select-sm">
              <option value="">-- Pilih Jenis --</option>
              <option value="kotak">Kotak</option>
              <option value="aksesoris">Aksesoris</option>
              <option v-if="!isL2Floor" value="silver">Silver</option>
            </select>
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button @click="openPilihBarang" :disabled="!form.jenis" class="btn btn-outline-primary btn-sm">
              <i class="bi bi-box-seam me-1"></i>
              Pilih Kode
            </button>
          </div>
        </div>

        <!-- Return item table -->
        <div class="table-responsive mb-2">
          <table class="table table-sm table-bordered mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 42px">No</th>
                <th style="width: 140px">Kode</th>
                <th>Nama Barang</th>
                <th style="width: 120px">Jumlah Return</th>
                <th>Keterangan</th>
                <th style="width: 60px" class="text-center">Aksi</th>
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
                <td class="small align-middle">{{ row.kode }}</td>
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
            <i class="bi bi-x-circle me-1"></i>
            Batal
          </button>
        </div>
      </div>
    </div>

    <!-- Riwayat -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-clock-history me-1"></i>
          Riwayat Return
        </span>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <input v-model="histStart" type="date" class="form-control form-control-sm" style="width: 150px" />
          <span class="text-muted small">s/d</span>
          <input v-model="histEnd" type="date" class="form-control form-control-sm" style="width: 150px" />
          <button @click="loadHistory" class="btn btn-primary btn-sm">
            <i class="bi bi-search me-1"></i>
            Cari
          </button>
          <button @click="printLaporan" :disabled="!history.length" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-printer me-1"></i>
            Print
          </button>
          <button @click="exportExcel" :disabled="!history.length" class="btn btn-outline-success btn-sm">
            <i class="bi bi-file-earmark-excel me-1"></i>
            Excel
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
                <th class="text-center" style="width: 50px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.id">
                <td class="small">{{ h.tanggal }}</td>
                <td class="small">{{ h.kasir || "—" }}</td>
                <td class="small">{{ h.jenisReturn || "—" }}</td>
                <td class="small">{{ h.kode }}</td>
                <td class="small">{{ h.nama }}</td>
                <td class="small text-center">{{ h.jumlah }}</td>
                <td class="small text-muted">{{ h.keterangan || "—" }}</td>
                <td class="text-center">
                  <button @click="confirmDeleteReturn(h)" class="btn btn-sm btn-outline-danger py-0 px-1" title="Hapus">
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- AppModal: Pilih Barang -->
    <AppModal v-model="showPickModal" title="Pilih Barang" size="sm" max-width="400px">
      <input
        v-model="modalSearch"
        type="text"
        class="form-control form-control-sm mb-2"
        placeholder="Cari kode / nama..."
      />
      <div v-if="isLoadingCodes" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary"></div>
      </div>
      <div v-else class="table-responsive" style="max-height: 360px; overflow-y: auto">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light sticky-top">
            <tr>
              <th>Kode</th>
              <th>Nama</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredModalItems"
              :key="item.kode || item.text"
              @click="pickItem(item)"
              style="cursor: pointer"
            >
              <td class="small">{{ item.kode || item.text }}</td>
              <td class="small">{{ item.nama }}</td>
            </tr>
            <tr v-if="!filteredModalItems.length">
              <td colspan="2" class="text-center text-muted small py-3">Tidak ada barang</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button class="btn btn-secondary btn-sm" @click="showPickModal = false">Tutup</button>
      </template>
    </AppModal>

    <!-- AppModal: Konfirmasi Hapus Return -->
    <AppModal v-model="showDeleteReturnModal" title="Hapus Data Return">
      <p class="mb-2 small">
        Hapus return
        <strong>{{ deleteReturnTarget?.kode }}</strong>
        ({{ deleteReturnTarget?.nama }}) &times;{{ deleteReturnTarget?.jumlah }}?
      </p>
      <p class="text-warning small">
        <i class="bi bi-exclamation-triangle me-1"></i>
        Stok akan ditambahkan kembali.
      </p>
      <div class="mb-2">
        <label class="form-label small fw-semibold">
          Kode Akses Hapus Return
          <span class="text-danger">*</span>
        </label>
        <input
          v-model="deleteSupervisorPass"
          type="password"
          class="form-control form-control-sm"
          placeholder="Masukkan kode akses"
        />
      </div>
      <template #footer>
        <button class="btn btn-secondary btn-sm" @click="showDeleteReturnModal = false">Batal</button>
        <button class="btn btn-danger btn-sm" @click="executeDeleteReturn" :disabled="isDeletingReturn">
          <span v-if="isDeletingReturn" class="spinner-border spinner-border-sm me-1"></span>
          Hapus
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAccessoriesStore } from "@/stores/accessories";
import {
  processReturn,
  deleteReturn,
  fetchTransactionHistory,
  fetchKodesByKategori,
  verifyDeleteReturnPassword,
} from "@/services/stock-service";
import { fetchSalesList } from "@/services/sales-service";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import AppModal from "@/components/common/AppModal.vue";

const store = useAccessoriesStore();
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");
const { swal, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── Form ─────────────────────────────────────────────────────────────────────
const form = ref({ tanggal: todayStringWITA(), kasir: "", jenis: "" });
const returnRows = ref([]);
const isSaving = ref(false);
const salesList = ref([]);

// ── Pick modal ──────────────────────────────────────────────────────────────
const showPickModal = ref(false);
const modalSearch = ref("");
const modalCatalog = ref([]);
const isLoadingCodes = ref(false);

const filteredModalItems = computed(() => {
  const q = modalSearch.value.toLowerCase();
  if (!q) return modalCatalog.value;
  return modalCatalog.value.filter(
    (i) => (i.kode || i.text || "").toLowerCase().includes(q) || (i.nama || "").toLowerCase().includes(q),
  );
});

async function openPilihBarang() {
  modalSearch.value = "";
  showPickModal.value = true;
  isLoadingCodes.value = true;
  try {
    modalCatalog.value = await fetchKodesByKategori(form.value.jenis);
  } catch (e) {
    showError("Gagal memuat kode", e.message);
  } finally {
    isLoadingCodes.value = false;
  }
}

function pickItem(item) {
  const kode = item.kode || item.text || "";
  if (!returnRows.value.find((r) => r.kode === kode)) {
    returnRows.value.push({ kode, nama: item.nama, jumlah: 1, keterangan: "" });
  }
  showPickModal.value = false;
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
    const items = validRows.map((r) => ({ kode: r.kode, nama: r.nama, jumlah: r.jumlah, keterangan: r.keterangan }));
    await processReturn(items, { tanggal: form.value.tanggal, kasir: form.value.kasir, jenis: form.value.jenis });
    await Promise.all(items.map((i) => store.refreshSingleStock(i.kode)));
    store.notifyStockChanged(items.map((i) => i.kode));
    swal(`Return ${items.reduce((s, i) => s + i.jumlah, 0)} item berhasil disimpan`);
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

// ── Delete return ──────────────────────────────────────────────────────────
const showDeleteReturnModal = ref(false);
const deleteReturnTarget = ref(null);
const deleteSupervisorPass = ref("");
const isDeletingReturn = ref(false);

function confirmDeleteReturn(record) {
  deleteReturnTarget.value = record;
  deleteSupervisorPass.value = "";
  showDeleteReturnModal.value = true;
}

async function executeDeleteReturn() {
  if (!deleteSupervisorPass.value) {
    swal("Kode akses wajib diisi", "warning");
    return;
  }
  isDeletingReturn.value = true;
  try {
    const valid = await verifyDeleteReturnPassword(deleteSupervisorPass.value);
    if (!valid) {
      swal("Kode akses salah", "error");
      return;
    }
    await deleteReturn(deleteReturnTarget.value.id, deleteReturnTarget.value);
    await store.refreshSingleStock(deleteReturnTarget.value.kode);
    store.notifyStockChanged([deleteReturnTarget.value.kode]);
    showDeleteReturnModal.value = false;
    swal("Data return berhasil dihapus", "success");
    await loadHistory();
  } catch (e) {
    showError("Gagal Menghapus Return", e.message);
  } finally {
    isDeletingReturn.value = false;
  }
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

// ── Print Laporan ─────────────────────────────────────────────────────────────
function printLaporan() {
  if (!history.value.length) return;
  const rows = history.value
    .map(
      (h, i) => `<tr>
        <td>${i + 1}</td>
        <td>${h.tanggal}</td>
        <td>${h.kasir || "-"}</td>
        <td>${h.jenisReturn || "-"}</td>
        <td>${h.kode}</td>
        <td>${h.nama || "-"}</td>
        <td style="text-align:center">${h.jumlah}</td>
        <td>${h.keterangan || "-"}</td>
      </tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><title>Laporan Return Barang</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px}
    th{background:#f0f0f0}h3{margin-bottom:8px}</style></head>
    <body><h3>Riwayat Return Barang Aksesoris</h3>
    <p>Periode: ${histStart.value} s/d ${histEnd.value}</p>
    <table><thead><tr><th>No</th><th>Tanggal</th><th>Kasir</th><th>Jenis</th><th>Kode</th><th>Nama</th><th>Jumlah</th><th>Keterangan</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    showError("Pop-up Diblokir", "Izinkan pop-up untuk mencetak laporan.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

// ── Export Excel (CSV) ───────────────────────────────────────────────────────
function exportExcel() {
  if (!history.value.length) return;
  const headers = ["No", "Tanggal", "Kasir", "Jenis Return", "Kode", "Nama", "Jumlah", "Keterangan"];
  const rows = history.value.map((h, i) => [
    i + 1,
    h.tanggal,
    h.kasir || "",
    h.jenisReturn || "",
    h.kode,
    `"${(h.nama || "").replace(/"/g, '""')}"`,
    h.jumlah,
    `"${(h.keterangan || "").replace(/"/g, '""')}"`,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `return-${histStart.value}-sd-${histEnd.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchSalesList().then((list) => (salesList.value = list)), loadHistory()]);
});
</script>
