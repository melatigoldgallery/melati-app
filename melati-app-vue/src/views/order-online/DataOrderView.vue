<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-table me-2 text-dark"></i>
        Data Order Online
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/order-online/input">Order Online</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Data Order</li>
        </ol>
      </nav>
    </div>

    <!-- Filter Card -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold py-2">
        <span>
          <i class="bi bi-funnel me-1 text-dark"></i>
          Filter Data
        </span>
      </div>
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Dari</label>
            <input v-model="filterStartDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Sampai</label>
            <input v-model="filterEndDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="filterStatus" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="BELUM_DIAMBIL">Belum Diambil</option>
              <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-md-auto">
            <button class="btn btn-tampilkan btn-sm" :disabled="loading" @click="loadData">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data order online...</p>
    </div>

    <!-- Data Table -->
    <div v-else-if="hasLoaded" class="card border-0 shadow-sm">
      <div class="card-header bg-white fw-semibold py-2">
        <span>
          <i class="bi bi-list-ul me-1 text-dark"></i>
          Daftar Order Online
        </span>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light small">
            <tr>
              <th style="width: 42px">No</th>
              <th style="min-width: 130px">Tanggal / Jam</th>
              <th style="min-width: 140px">Admin</th>
              <th style="min-width: 140px">Customer</th>
              <th style="min-width: 110px">Kontak</th>
              <th style="min-width: 140px">Barang</th>
              <th style="width: 110px" class="text-start">Harga</th>
              <th style="min-width: 140px">Handle / Waktu</th>
              <th style="width: 90px" class="text-center">Bukti</th>
              <th style="min-width: 160px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0">
              <td colspan="10" class="text-center text-muted py-5">
                <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
                Tidak ada data order online.
              </td>
            </tr>
            <tr v-for="(row, index) in rows" :key="row.id">
              <td class="small text-muted fw-semibold">{{ index + 1 }}</td>
              <td class="small">
                <div>{{ formatOrderDateTime(row.tanggal, row.jam) }}</div>
              </td>
              <td class="small">
                <div>{{ row.namaAdmin || row.namaSales || "-" }}</div>
              </td>
              <td class="small">
                <div>{{ row.namaCustomer }}</div>
              </td>
              <td class="small">{{ row.kontak }}</td>
              <td class="small">{{ row.namaBarang }}</td>
              <td class="small text-start">Rp {{ formatCurrency(row.harga) }}</td>
              <td class="small">
                <div v-if="row.namaStafHandle" class="text-dark">{{ row.namaStafHandle }}</div>
                <div v-else class="text-muted">-</div>
                <div class="text-muted" style="font-size: 0.75rem">{{ row.waktuPengambilan ? formatDisplayDateTime(row.waktuPengambilan) : "-" }}</div>
              </td>
              <td class="text-center">
                <a v-if="row.buktiPengambilanUrl" :href="row.buktiPengambilanUrl" target="_blank" rel="noopener" class="btn btn-outline-info btn-sm py-0 px-1" title="Lihat bukti">
                  <i class="bi bi-image"></i>
                </a>
                <span v-else class="text-muted small">-</span>
              </td>
              <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                  <button class="btn btn-warning btn-sm py-0 px-2" @click="openStatusModal(row)" title="Update status pengambilan">
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <button class="btn btn-primary btn-sm py-0 px-2" @click="openEditModal(row)" title="Edit data">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-danger btn-sm py-0 px-2" @click="deleteRow(row)" title="Hapus data">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-search display-5 d-block mb-2 opacity-25"></i>
        Pilih filter lalu klik Tampilkan untuk melihat data order online.
      </div>
    </div>

    <!-- Update Status Modal -->
    <div id="statusUpdateModal" class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-arrow-repeat me-2"></i>
              Update Status Pengambilan
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div v-if="selectedRow" class="modal-body">
            <div class="alert alert-light border mb-3">
              <div class="fw-semibold small">{{ selectedRow.namaCustomer }}</div>
              <div class="text-muted small">{{ selectedRow.namaBarang }}</div>
              <div class="text-muted" style="font-size: 0.75rem">{{ formatOrderDateTime(selectedRow.tanggal, selectedRow.jam) }}</div>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold mb-2">Status Pengambilan</label>
                <select v-model="modalForm.statusPengambilan" class="form-select form-select-sm">
                  <option value="BELUM_DIAMBIL">Belum Diambil</option>
                  <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold mb-2">Nama Staf Handle</label>
                <input v-model="modalForm.namaStafHandle" type="text" class="form-control form-control-sm" placeholder="Nama staf" />
              </div>
            </div>

            <div v-if="modalForm.statusPengambilan === 'SUDAH_DIAMBIL'" class="mt-3">
              <label class="form-label small fw-semibold mb-2">Bukti Pengambilan</label>
              <input ref="proofFileInput" type="file" class="form-control form-control-sm" accept="image/*" @change="onProofChange" />
              <div v-if="modalForm.existingBuktiUrl" class="small text-muted mt-2">
                Bukti saat ini: <a :href="modalForm.existingBuktiUrl" target="_blank" rel="noopener" class="text-info">lihat file</a>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal" :disabled="savingStatus">Batal</button>
            <button type="button" class="btn btn-warning btn-sm" @click="saveStatus" :disabled="savingStatus">
              <span v-if="savingStatus" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div id="editOrderModal" class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Edit Data Order
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div v-if="selectedRow" class="modal-body">
            <div class="alert alert-light border mb-3">
              <div class="fw-semibold small">{{ selectedRow.namaCustomer }}</div>
              <div class="text-muted small">{{ selectedRow.namaBarang }}</div>
              <div class="text-muted" style="font-size: 0.75rem">{{ formatOrderDateTime(selectedRow.tanggal, selectedRow.jam) }}</div>
            </div>

            <div class="row g-2">
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Tanggal</label>
                <input v-model="editForm.tanggal" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Nama Admin</label>
                <input v-model="editForm.namaAdmin" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Nama Customer</label>
                <input v-model="editForm.namaCustomer" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Kontak</label>
                <input v-model="editForm.kontak" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-semibold mb-1">Nama Barang</label>
                <input v-model="editForm.namaBarang" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Jumlah</label>
                <input v-model.number="editForm.jml" type="number" min="1" class="form-control form-control-sm text-center" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Berat</label>
                <input v-model="editForm.berat" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Karat</label>
                <input v-model="editForm.karat" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Harga</label>
                <input v-model.number="editForm.harga" type="number" min="0" class="form-control form-control-sm text-end" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal" :disabled="savingEdit">Batal</button>
            <button type="button" class="btn btn-primary btn-sm" @click="saveEdit" :disabled="savingEdit">
              <span v-if="savingEdit" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { Modal } from "bootstrap";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  deleteOrderOnline,
  fetchOrderOnlineByRange,
  formatOrderDateTime,
  updateOrderOnlineData,
  updateOrderPickup,
  uploadOrderProof,
} from "@/services/order-online-service";

const auth = useAuthStore();
const { confirm, error: showError, swal } = useAlert();
const { todayStringWITA, nowWITA } = useWITA();

const filterStartDate = ref(todayStringWITA());
const filterEndDate = ref(todayStringWITA());
const filterStatus = ref("");
const rows = ref([]);
const loading = ref(false);
const hasLoaded = ref(false);

const selectedRow = ref(null);
const savingStatus = ref(false);
const savingEdit = ref(false);
const proofFileInput = ref(null);
const proofFile = ref(null);

const editForm = reactive({
  tanggal: "",
  namaAdmin: "",
  namaCustomer: "",
  kontak: "",
  namaBarang: "",
  jml: 1,
  berat: "",
  karat: "",
  harga: 0,
});

const modalForm = reactive({
  statusPengambilan: "BELUM_DIAMBIL",
  namaStafHandle: "",
  existingBuktiUrl: "",
});

function formatCurrency(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString("id-ID") : "0";
}

function formatDisplayDateTime(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

async function loadData() {
  try {
    loading.value = true;
    rows.value = await fetchOrderOnlineByRange(filterStartDate.value, filterEndDate.value, filterStatus.value);
    hasLoaded.value = true;
  } catch (error) {
    showError("Gagal memuat data order online", error?.message || "Silakan coba lagi.");
  } finally {
    loading.value = false;
  }
}

function openStatusModal(row) {
  selectedRow.value = row;
  modalForm.statusPengambilan = row.statusPengambilan || "BELUM_DIAMBIL";
  modalForm.namaStafHandle = row.namaStafHandle || auth.currentUser?.displayName || auth.currentUser?.username || "";
  modalForm.existingBuktiUrl = row.buktiPengambilanUrl || "";
  proofFile.value = null;
  if (proofFileInput.value) proofFileInput.value.value = "";
  
  new Modal(document.getElementById("statusUpdateModal")).show();
}

function openEditModal(row) {
  selectedRow.value = row;
  editForm.tanggal = row.tanggal || todayStringWITA();
  editForm.namaAdmin = row.namaAdmin || row.namaSales || auth.currentUser?.displayName || auth.currentUser?.username || "";
  editForm.namaCustomer = row.namaCustomer || "";
  editForm.kontak = row.kontak || "";
  editForm.namaBarang = row.namaBarang || "";
  editForm.jml = Number(row.jml || 1);
  editForm.berat = row.berat ?? "";
  editForm.karat = row.karat || "";
  editForm.harga = Number(row.harga || 0);

  new Modal(document.getElementById("editOrderModal")).show();
}

function onProofChange(event) {
  proofFile.value = event.target.files?.[0] || null;
}

async function saveStatus() {
  if (!selectedRow.value) return;

  try {
    savingStatus.value = true;

    const updates = {
      statusPengambilan: modalForm.statusPengambilan,
      namaStafHandle: modalForm.namaStafHandle,
      updatedBy: auth.currentUser?.username || auth.currentUser?.displayName || modalForm.namaStafHandle,
    };

    if (modalForm.statusPengambilan === "SUDAH_DIAMBIL") {
      const existingUrl = modalForm.existingBuktiUrl;
      if (!existingUrl && !proofFile.value) {
        throw new Error("Bukti pengambilan wajib diunggah saat status sudah diambil");
      }

      let proofResult = null;
      if (proofFile.value) {
        proofResult = await uploadOrderProof(proofFile.value, {
          orderNo: selectedRow.value.orderNo,
          docId: selectedRow.value.id,
        });
      }

      updates.waktuPengambilan = selectedRow.value.waktuPengambilan || `${nowWITA().toISOString().slice(0, 10)} ${nowWITA().toTimeString().slice(0, 5)}`;
      updates.buktiPengambilanUrl = proofResult?.url || existingUrl;
      updates.buktiPengambilanPath = proofResult?.path || selectedRow.value.buktiPengambilanPath || "";
    } else {
      updates.waktuPengambilan = "";
      updates.buktiPengambilanUrl = "";
      updates.buktiPengambilanPath = "";
    }

    await updateOrderPickup(selectedRow.value.id, updates);
    await updateOrderOnlineData(selectedRow.value.id, { ...selectedRow.value, ...updates });

    await swal("Data order online berhasil diperbarui", "success");
    Modal.getInstance(document.getElementById("statusUpdateModal"))?.hide();
    await loadData();
  } catch (error) {
    showError("Gagal menyimpan perubahan", error?.message || "Silakan cek kembali data yang diisi.");
  } finally {
    savingStatus.value = false;
  }
}

async function saveEdit() {
  if (!selectedRow.value) return;

  try {
    savingEdit.value = true;

    await updateOrderOnlineData(selectedRow.value.id, {
      ...editForm,
      updatedBy: auth.currentUser?.username || auth.currentUser?.displayName || editForm.namaAdmin,
    });

    await swal("Data order online berhasil diperbarui", "success");
    Modal.getInstance(document.getElementById("editOrderModal"))?.hide();
    await loadData();
  } catch (error) {
    showError("Gagal menyimpan edit data", error?.message || "Silakan cek kembali data yang diisi.");
  } finally {
    savingEdit.value = false;
  }
}

async function deleteRow(row) {
  const result = await confirm({
    title: "Hapus data order online?",
    text: `${row.namaCustomer} - ${row.namaBarang}`,
    confirmText: "Ya, hapus",
  });
  if (!result.isConfirmed) return;

  try {
    await deleteOrderOnline(row.id);
    await swal("Data order online berhasil dihapus", "success");
    await loadData();
  } catch (error) {
    showError("Gagal menghapus data", error?.message || "Silakan coba lagi.");
  }
}
</script>
