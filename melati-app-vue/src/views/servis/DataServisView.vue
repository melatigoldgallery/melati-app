<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-table me-2 text-warning"></i>Data Servis
      </h4>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Bulan</label>
            <input v-model="filterBulan" type="month" class="form-control form-control-sm" @change="onMonthChange" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Servis</label>
            <select v-model="filterStatus" class="form-select form-select-sm" @change="applyFilters">
              <option value="">Semua</option>
              <option value="Belum Selesai">Belum Selesai</option>
              <option value="Sudah Selesai">Sudah Selesai</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="filterPengambilan" class="form-select form-select-sm" @change="applyFilters">
              <option value="">Semua</option>
              <option value="Belum Diambil">Belum Diambil</option>
              <option value="Sudah Diambil">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Cari</label>
            <input
              v-model="searchText"
              type="search"
              class="form-control form-control-sm"
              placeholder="Cari nama customer..."
            />
          </div>
          <div class="col-md-auto ms-auto d-flex align-items-end">
            <span class="small text-muted">{{ filteredList.length }} data</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data servis...</p>
    </div>

    <!-- Table -->
    <div v-else class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th style="width:42px">#</th>
              <th>Tanggal</th>
              <th>Customer</th>
              <th>No HP</th>
              <th>Barang / Jenis</th>
              <th class="text-center">Status Servis</th>
              <th class="text-center">Pengambilan</th>
              <th class="text-end">Ongkos</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredList.length === 0">
              <td colspan="9" class="text-center text-muted py-5">
                <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
                Tidak ada data servis.
              </td>
            </tr>
            <tr v-for="(item, idx) in filteredList" :key="item.id">
              <td class="text-muted small align-middle">{{ idx + 1 }}</td>
              <td class="align-middle small">{{ item.tanggal }}</td>
              <td class="align-middle fw-semibold">{{ item.namaCustomer }}</td>
              <td class="align-middle small">{{ item.noHp }}</td>
              <td class="align-middle small">
                <div>{{ item.namaBarang }}</div>
                <span class="badge bg-light text-dark border">
                  {{ item.jenisInput === "custom" ? "CUSTOM" : (item.jenisServis || item.detailBarang?.[0]?.jenisServis || "-") }}
                </span>
              </td>
              <td class="text-center align-middle">
                <span class="badge" :class="statusServisBadge(item.statusServis)">
                  {{ item.statusServis }}
                </span>
              </td>
              <td class="text-center align-middle">
                <span class="badge" :class="statusPengambilanBadge(item.statusPengambilan)">
                  {{ item.statusPengambilan }}
                </span>
              </td>
              <td class="text-end align-middle small fw-semibold">
                Rp {{ Number(item.totalOngkos || item.ongkos || 0).toLocaleString("id-ID") }}
              </td>
              <td class="text-center align-middle">
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-outline-warning"
                    @click="openStatusModal(item)"
                    title="Update Status"
                  ><i class="bi bi-arrow-repeat"></i></button>
                  <button
                    v-if="item.statusServis === 'Sudah Selesai' && item.noHp"
                    class="btn btn-outline-success"
                    @click="sendWA(item)"
                    title="Kirim WhatsApp"
                  ><i class="bi bi-whatsapp"></i></button>
                  <button
                    class="btn btn-outline-primary"
                    @click="rePrint(item)"
                    title="Cetak ulang"
                  ><i class="bi bi-printer"></i></button>
                  <button
                    class="btn btn-outline-secondary"
                    @click="openEditModal(item)"
                    title="Edit (perlu password)"
                  ><i class="bi bi-pencil"></i></button>
                  <button
                    class="btn btn-outline-danger"
                    @click="confirmDelete(item)"
                    title="Hapus (perlu password)"
                  ><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Status Modal ── -->
    <div class="modal fade" id="statusModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-arrow-repeat me-1 text-warning"></i>Update Status
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              Customer: <strong>{{ statusForm.namaCustomer }}</strong><br/>
              Barang: {{ statusForm.namaBarang }}
            </p>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Status Servis</label>
              <select v-model="statusForm.statusServis" class="form-select form-select-sm">
                <option value="Belum Selesai">Belum Selesai</option>
                <option value="Sudah Selesai">Sudah Selesai</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Status Pengambilan</label>
              <select v-model="statusForm.statusPengambilan" class="form-select form-select-sm">
                <option value="Belum Diambil">Belum Diambil</option>
                <option value="Sudah Diambil">Sudah Diambil</option>
              </select>
            </div>
            <div v-if="statusForm.statusPengambilan === 'Sudah Diambil'" class="mb-2">
              <label class="form-label small fw-semibold">Nama Staf Handle</label>
              <input v-model="statusForm.stafHandle" type="text" class="form-control form-control-sm" placeholder="Nama staf" />
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveStatus" :disabled="statusSaving">
              <span v-if="statusSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit Modal ── -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-pencil me-1 text-primary"></i>Edit Data Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Password step -->
            <div v-if="!editUnlocked">
              <p class="small text-muted mb-2">Masukkan password supervisor untuk melanjutkan.</p>
              <input
                v-model="editPassword"
                type="password"
                class="form-control form-control-sm"
                placeholder="Password supervisor"
                @keydown.enter="unlockEdit"
              />
            </div>
            <!-- Edit form after unlock -->
            <div v-else>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Tanggal</label>
                  <input v-model="editForm.tanggal" type="date" class="form-control form-control-sm" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Nama Sales</label>
                  <input v-model="editForm.namaSales" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Nama Customer</label>
                  <input v-model="editForm.namaCustomer" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">No HP</label>
                  <input v-model="editForm.noHp" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Nama Barang</label>
                  <input v-model="editForm.namaBarang" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Total Ongkos</label>
                  <input v-model.number="editForm.totalOngkos" type="number" class="form-control form-control-sm" />
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button v-if="!editUnlocked" class="btn btn-primary btn-sm" @click="unlockEdit" :disabled="editUnlocking">
              <span v-if="editUnlocking" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-unlock me-1"></i>Verifikasi
            </button>
            <button v-else class="btn btn-primary btn-sm" @click="saveEdit" :disabled="editSaving">
              <span v-if="editSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Delete Password Modal ── -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold text-danger">
              <i class="bi bi-trash me-1"></i>Hapus Data Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Hapus data servis <strong>{{ deleteTarget?.namaCustomer }}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <input
              v-model="deletePassword"
              type="password"
              class="form-control form-control-sm"
              placeholder="Password supervisor"
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-danger btn-sm" @click="doDelete" :disabled="deleteSaving">
              <span v-if="deleteSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash me-1"></i>Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  fetchServisByMonth,
  subscribeServisByMonth,
  updateServisStatus,
  updateServisData,
  deleteServis,
  verifySupervisorPassword,
  printServisSlip,
  buildWhatsAppUrl,
  getCachedServis,
  setCachedServis,
  invalidateCachedServis,
  statusServisBadge,
  statusPengambilanBadge,
} from "@/services/servis-service";

const { toast, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const allItems = ref([]);
const filterBulan = ref(todayStringWITA().substring(0, 7));
const filterStatus = ref("");
const filterPengambilan = ref("");
const searchText = ref("");

let unsubscribe = null;

// Status modal
const statusSaving = ref(false);
const statusForm = ref({ id: "", namaCustomer: "", namaBarang: "", statusServis: "", statusPengambilan: "", stafHandle: "" });

// Edit modal
const editUnlocked = ref(false);
const editUnlocking = ref(false);
const editSaving = ref(false);
const editPassword = ref("");
const editForm = ref({ id: "", tanggal: "", namaSales: "", namaCustomer: "", noHp: "", namaBarang: "", totalOngkos: 0 });

// Delete modal
const deleteTarget = ref(null);
const deletePassword = ref("");
const deleteSaving = ref(false);

// ── Computed ──────────────────────────────────────────────────────────────
const filteredList = computed(() => {
  let list = allItems.value;
  if (filterStatus.value) list = list.filter((i) => i.statusServis === filterStatus.value);
  if (filterPengambilan.value) list = list.filter((i) => i.statusPengambilan === filterPengambilan.value);
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase();
    list = list.filter(
      (i) =>
        (i.namaCustomer || "").toLowerCase().includes(q) ||
        (i.namaBarang || "").toLowerCase().includes(q),
    );
  }
  return list;
});

// ── Helpers ───────────────────────────────────────────────────────────────
function isCurrentMonth(bulanStr) {
  const now = todayStringWITA();
  return bulanStr === now.substring(0, 7);
}

function applyFilters() { /* filters are computed */ }

// ── Data Loading ──────────────────────────────────────────────────────────
function cleanupListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

async function loadData(bulanStr) {
  cleanupListener();
  loading.value = true;

  const [yearStr, monthStr] = bulanStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const isCurrent = isCurrentMonth(bulanStr);

  try {
    if (isCurrent) {
      // Real-time for current month
      unsubscribe = subscribeServisByMonth(year, month, (data) => {
        allItems.value = data;
        setCachedServis(year, month, data);
        loading.value = false;
      });
    } else {
      // Cache-first for past months
      const cached = getCachedServis(year, month);
      if (cached) {
        allItems.value = cached;
      } else {
        const data = await fetchServisByMonth(year, month);
        setCachedServis(year, month, data);
        allItems.value = data;
      }
      loading.value = false;
    }
  } catch (e) {
    showError("Gagal memuat data", e.message);
    loading.value = false;
  }
}

function onMonthChange() {
  loadData(filterBulan.value);
}

// ── Status Modal ──────────────────────────────────────────────────────────
function openStatusModal(item) {
  statusForm.value = {
    id: item.id,
    namaCustomer: item.namaCustomer,
    namaBarang: item.namaBarang,
    statusServis: item.statusServis,
    statusPengambilan: item.statusPengambilan,
    stafHandle: item.stafHandle || "",
  };
  new Modal(document.getElementById("statusModal")).show();
}

async function saveStatus() {
  statusSaving.value = true;
  try {
    const updates = {
      statusServis: statusForm.value.statusServis,
      statusPengambilan: statusForm.value.statusPengambilan,
    };
    if (statusForm.value.statusPengambilan === "Sudah Diambil") {
      updates.stafHandle = statusForm.value.stafHandle;
      updates.waktuPengambilan = new Date().toISOString();
    } else {
      updates.stafHandle = null;
      updates.waktuPengambilan = null;
    }
    await updateServisStatus(statusForm.value.id, updates);

    // Invalidate cache
    const [y, m] = filterBulan.value.split("-").map(Number);
    invalidateCachedServis(y, m);

    Modal.getInstance(document.getElementById("statusModal"))?.hide();
    toast("Status berhasil diperbarui");
    // If not current month, reload manually
    if (!isCurrentMonth(filterBulan.value)) loadData(filterBulan.value);
  } catch (e) {
    showError("Gagal memperbarui status", e.message);
  } finally {
    statusSaving.value = false;
  }
}

// ── Edit Modal ────────────────────────────────────────────────────────────
function openEditModal(item) {
  editUnlocked.value = false;
  editPassword.value = "";
  editForm.value = {
    id: item.id,
    tanggal: item.tanggal,
    namaSales: item.namaSales,
    namaCustomer: item.namaCustomer,
    noHp: item.noHp,
    namaBarang: item.namaBarang,
    totalOngkos: item.totalOngkos || item.ongkos || 0,
  };
  new Modal(document.getElementById("editModal")).show();
}

async function unlockEdit() {
  if (!editPassword.value) return toast("Password wajib diisi", "warning");
  editUnlocking.value = true;
  try {
    await verifySupervisorPassword(editPassword.value);
    editUnlocked.value = true;
  } catch (e) {
    showError("Verifikasi gagal", e.message);
  } finally {
    editUnlocking.value = false;
  }
}

async function saveEdit() {
  editSaving.value = true;
  try {
    await updateServisData(editForm.value.id, {
      tanggal: editForm.value.tanggal,
      namaSales: editForm.value.namaSales,
      namaCustomer: editForm.value.namaCustomer,
      noHp: editForm.value.noHp,
      namaBarang: editForm.value.namaBarang,
      totalOngkos: editForm.value.totalOngkos,
      ongkos: editForm.value.totalOngkos,
    });
    const [y, m] = filterBulan.value.split("-").map(Number);
    invalidateCachedServis(y, m);
    Modal.getInstance(document.getElementById("editModal"))?.hide();
    toast("Data berhasil diperbarui");
    if (!isCurrentMonth(filterBulan.value)) loadData(filterBulan.value);
  } catch (e) {
    showError("Gagal memperbarui data", e.message);
  } finally {
    editSaving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
function confirmDelete(item) {
  deleteTarget.value = item;
  deletePassword.value = "";
  new Modal(document.getElementById("deleteModal")).show();
}

async function doDelete() {
  if (!deletePassword.value) return toast("Password wajib diisi", "warning");
  deleteSaving.value = true;
  try {
    await verifySupervisorPassword(deletePassword.value);
    await deleteServis(deleteTarget.value.id);
    const [y, m] = filterBulan.value.split("-").map(Number);
    invalidateCachedServis(y, m);
    Modal.getInstance(document.getElementById("deleteModal"))?.hide();
    toast("Data servis berhasil dihapus");
    if (!isCurrentMonth(filterBulan.value)) loadData(filterBulan.value);
  } catch (e) {
    showError("Gagal menghapus", e.message);
  } finally {
    deleteSaving.value = false;
  }
}

// ── WA & Print ────────────────────────────────────────────────────────────
function sendWA(item) {
  const url = buildWhatsAppUrl(item);
  if (url) window.open(url, "_blank");
  else toast("Nomor HP tidak tersedia", "warning");
}

function rePrint(item) {
  printServisSlip(item).catch(() => {});
}

// ── Cross-tab sync ────────────────────────────────────────────────────────
function handleStorageSync(e) {
  if (e.key === "servisDataChanged") {
    const { month, year } = JSON.parse(e.newValue || "{}");
    if (!month || !year) return;
    const [y, m] = filterBulan.value.split("-").map(Number);
    invalidateCachedServis(year, month);
    if (year === y && month === m && !isCurrentMonth(filterBulan.value)) {
      loadData(filterBulan.value);
    }
  }
}

onMounted(() => {
  loadData(filterBulan.value);
  window.addEventListener("storage", handleStorageSync);
});

onUnmounted(() => {
  cleanupListener();
  window.removeEventListener("storage", handleStorageSync);
});
</script>
