<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-people me-2 text-warning"></i>
        Kelola Sales
      </h4>
      <button @click="openModal()" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i> Tambah Sales
      </button>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-person-lines-fill me-1"></i>
          Daftar Sales ({{ salesList.length }})
        </span>
        <div class="input-group input-group-sm" style="width:220px">
          <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
          <input v-model="search" type="text" class="form-control" placeholder="Cari nama..." />
        </div>
      </div>
      <div class="card-body p-0">
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!filteredList.length" class="text-center py-5 text-muted">
          <i class="bi bi-inbox display-4 d-block mb-2 opacity-25"></i>
          Belum ada data sales
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light sticky-top">
              <tr>
                <th class="text-center" style="width:42px">No</th>
                <th>Nama Sales</th>
                <th style="width:130px">Status</th>
                <th style="width:160px">Tanggal Dibuat</th>
                <th class="text-center" style="width:110px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in filteredList" :key="s.id">
                <td class="text-center text-muted small align-middle">{{ idx + 1 }}</td>
                <td class="fw-semibold small align-middle">{{ s.nama }}</td>
                <td class="align-middle">
                  <span
                    class="badge"
                    :class="s.status === 'active' ? 'bg-success' : 'bg-secondary'"
                  >
                    {{ s.status === "active" ? "Aktif" : "Tidak Aktif" }}
                  </span>
                </td>
                <td class="small text-muted align-middle">{{ formatDate(s.createdAt) }}</td>
                <td class="text-center align-middle">
                  <button @click="openModal(s)" class="btn btn-sm btn-outline-warning py-0 px-2 me-1" title="Edit">
                    <i class="bi bi-pencil small"></i>
                  </button>
                  <button @click="confirmDelete(s)" class="btn btn-sm btn-outline-danger py-0 px-2" title="Hapus">
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Modal Tambah / Edit ── -->
    <div
      class="modal fade"
      id="salesModal"
      tabindex="-1"
      aria-labelledby="salesModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold" id="salesModalLabel">
              <i class="bi bi-person-plus me-2"></i>
              {{ modalMode === "add" ? "Tambah Sales" : "Edit Sales" }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label small fw-semibold">
                Nama Sales <span class="text-danger">*</span>
              </label>
              <input
                v-model="modalForm.nama"
                type="text"
                class="form-control"
                placeholder="Masukkan nama sales"
                autocomplete="off"
              />
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Status</label>
              <select v-model="modalForm.status" class="form-select">
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button @click="saveSales" :disabled="isSaving" class="btn btn-primary btn-sm">
              <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal Konfirmasi Hapus ── -->
    <div
      class="modal fade"
      id="deleteModal"
      tabindex="-1"
      aria-labelledby="deleteModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title" id="deleteModalLabel">
              <i class="bi bi-exclamation-triangle me-2"></i> Konfirmasi Hapus
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body small">
            Hapus sales <strong>{{ deleteTarget?.nama }}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button @click="doDelete" :disabled="isSaving" class="btn btn-danger btn-sm">
              <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash3 me-1"></i>
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Modal } from "bootstrap";
import { fetchSalesList, addSalesStaff, updateSalesStaff, deleteSalesStaff } from "@/services/sales-service";
import { useAlert } from "@/composables/useAlert";

const { toast, error: showError } = useAlert();

// ── State ─────────────────────────────────────────────────────────────────
const salesList = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const search = ref("");

const filteredList = computed(() => {
  const q = search.value.toLowerCase();
  return q ? salesList.value.filter((s) => s.nama.toLowerCase().includes(q)) : salesList.value;
});

// ── Load ─────────────────────────────────────────────────────────────────
async function loadSales() {
  isLoading.value = true;
  try {
    salesList.value = await fetchSalesList();
  } catch (e) {
    showError("Gagal memuat data sales", e.message);
  } finally {
    isLoading.value = false;
  }
}

// ── Modal (add/edit) ───────────────────────────────────────────────────────
const modalMode = ref("add");
const modalForm = ref({ nama: "", status: "active" });
const modalEditId = ref(null);
let salesModal = null;

function openModal(sales = null) {
  if (!salesModal) salesModal = new Modal(document.getElementById("salesModal"));
  if (sales) {
    modalMode.value = "edit";
    modalEditId.value = sales.id;
    modalForm.value = { nama: sales.nama, status: sales.status || "active" };
  } else {
    modalMode.value = "add";
    modalEditId.value = null;
    modalForm.value = { nama: "", status: "active" };
  }
  salesModal.show();
}

async function saveSales() {
  const nama = modalForm.value.nama.trim();
  if (!nama) {
    showError("Nama Diperlukan", "Nama sales tidak boleh kosong.");
    return;
  }
  // Duplicate check
  const existing = salesList.value.find(
    (s) => s.nama === nama.toUpperCase() && s.id !== modalEditId.value,
  );
  if (existing) {
    showError("Duplikat", "Nama sales sudah ada.");
    return;
  }

  isSaving.value = true;
  try {
    if (modalMode.value === "add") {
      await addSalesStaff({ nama, status: modalForm.value.status });
    } else {
      await updateSalesStaff(modalEditId.value, { nama, status: modalForm.value.status });
    }
    toast(modalMode.value === "add" ? "Sales berhasil ditambahkan" : "Sales berhasil diupdate");
    salesModal.hide();
    await loadSales();
  } catch (e) {
    showError("Gagal Menyimpan", e.message);
  } finally {
    isSaving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
const deleteTarget = ref(null);
let deleteModal = null;

function confirmDelete(sales) {
  deleteTarget.value = sales;
  if (!deleteModal) deleteModal = new Modal(document.getElementById("deleteModal"));
  deleteModal.show();
}

async function doDelete() {
  if (!deleteTarget.value) return;
  isSaving.value = true;
  try {
    await deleteSalesStaff(deleteTarget.value.id);
    toast(`Sales ${deleteTarget.value.nama} dihapus`);
    deleteModal.hide();
    await loadSales();
  } catch (e) {
    showError("Gagal Menghapus", e.message);
  } finally {
    isSaving.value = false;
    deleteTarget.value = null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

onMounted(loadSales);
</script>
