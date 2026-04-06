<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-cart-plus me-2 text-primary"></i>
        Restok Barang
      </h4>
      <button class="btn btn-sm btn-primary" @click="openAddModal">
        <i class="bi bi-plus me-1"></i>
        Tambah Order
      </button>
    </div>

    <!-- Filter -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <div class="row g-2 align-items-center">
          <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">Bulan</label>
            <input v-model="filterBulan" type="month" class="form-control form-control-sm" @change="loadData" />
          </div>
          <div class="col-md-auto d-flex align-items-end gap-2">
            <button
              class="btn btn-success btn-sm"
              @click="sendWhatsApp"
              title="Kirim daftar order ke supplier via WhatsApp"
            >
              <i class="bi bi-whatsapp me-1"></i>
              Kirim ke Supplier
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <template v-else>
      <!-- Tabs -->
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item">
          <button
            class="nav-link"
            :class="activeTab === 'perlu' ? 'active fw-semibold' : ''"
            @click="activeTab = 'perlu'"
          >
            Perlu Restok
            <span class="badge bg-warning text-dark ms-1">{{ perluList.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="activeTab === 'sudah' ? 'active fw-semibold' : ''"
            @click="activeTab = 'sudah'"
          >
            Sudah Restok
            <span class="badge bg-success ms-1">{{ sudahList.length }}</span>
          </button>
        </li>
      </ul>

      <div class="card border-0 shadow-sm rounded-0 rounded-bottom">
        <div class="table-responsive">
          <table class="table table-hover table-sm mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 42px">#</th>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Nama</th>
                <th>Kadar</th>
                <th>Berat</th>
                <th>Panjang</th>
                <th v-if="activeTab === 'sudah'">Tgl Restok</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="currentList.length === 0">
                <td :colspan="activeTab === 'perlu' ? 8 : 9" class="text-center text-muted py-4">
                  <i class="bi bi-inbox display-6 d-block mb-2 opacity-25"></i>
                  Tidak ada data.
                </td>
              </tr>
              <tr v-for="(item, idx) in currentList" :key="item.id">
                <td class="text-muted small align-middle">{{ idx + 1 }}</td>
                <td class="align-middle">{{ item.tanggal }}</td>
                <td class="align-middle">
                  <span class="badge bg-info text-dark">{{ item.jenis }}</span>
                </td>
                <td class="align-middle">{{ item.nama }}</td>
                <td class="align-middle small">{{ item.kadar }}</td>
                <td class="align-middle small">{{ item.berat }}</td>
                <td class="align-middle small">{{ item.panjang }}</td>
                <td v-if="activeTab === 'sudah'" class="align-middle small text-muted">
                  {{ item.tanggalRestok || "-" }}
                </td>
                <td class="text-center align-middle">
                  <div class="btn-group btn-group-sm">
                    <button
                      v-if="activeTab === 'perlu'"
                      class="btn btn-warning"
                      @click="openStatusModal(item)"
                      title="Edit Status"
                    >
                      <i class="bi bi-check-circle me-1"></i>
                      Status
                    </button>
                    <button class="btn btn-outline-primary" @click="openEditModal(item)" title="Edit Data">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" @click="deleteItem(item)" title="Hapus">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── Add Modal ── -->
    <div class="modal fade" id="addRestokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-plus-circle me-2 text-primary"></i>
              Tambah Order Restok
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <label class="form-label small fw-semibold">
                  Tanggal
                  <span class="text-danger">*</span>
                </label>
                <input v-model="addForm.tanggal" type="date" class="form-control form-control-sm" />
              </div>
            </div>
            <div class="table-responsive mb-2">
              <table class="table table-sm table-bordered">
                <thead class="table-light">
                  <tr>
                    <th style="width: 140px">
                      Jenis
                      <span class="text-danger">*</span>
                    </th>
                    <th>
                      Nama
                      <span class="text-danger">*</span>
                    </th>
                    <th style="width: 100px">Kadar</th>
                    <th style="width: 100px">Berat</th>
                    <th style="width: 100px">Panjang</th>
                    <th style="width: 40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in addForm.rows" :key="idx">
                    <td>
                      <select v-model="row.jenis" class="form-select form-select-sm">
                        <option value="">Pilih...</option>
                        <option v-for="j in JENIS_OPTIONS" :key="j" :value="j">{{ j }}</option>
                      </select>
                    </td>
                    <td>
                      <input
                        v-model="row.nama"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="Nama barang"
                      />
                    </td>
                    <td>
                      <input v-model="row.kadar" type="text" class="form-control form-control-sm" placeholder="22K" />
                    </td>
                    <td>
                      <input v-model="row.berat" type="text" class="form-control form-control-sm" placeholder="gr" />
                    </td>
                    <td>
                      <input v-model="row.panjang" type="text" class="form-control form-control-sm" placeholder="cm" />
                    </td>
                    <td class="text-center align-middle">
                      <button
                        class="btn btn-sm btn-outline-danger"
                        @click="removeRow(idx)"
                        :disabled="addForm.rows.length === 1"
                        title="Hapus baris"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button class="btn btn-sm btn-outline-primary" @click="addRow">
              <i class="bi bi-plus me-1"></i>
              Tambah Baris
            </button>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-primary btn-sm" @click="saveAdd" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit Modal ── -->
    <div class="modal fade" id="editRestokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-pencil me-2 text-warning"></i>
              Edit Restok
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label small fw-semibold">Jenis</label>
              <select v-model="editForm.jenis" class="form-select form-select-sm">
                <option v-for="j in JENIS_OPTIONS" :key="j" :value="j">{{ j }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Nama</label>
              <input v-model="editForm.nama" type="text" class="form-control form-control-sm" />
            </div>
            <div class="row g-2">
              <div class="col-4">
                <label class="form-label small fw-semibold">Kadar</label>
                <input v-model="editForm.kadar" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">Berat</label>
                <input v-model="editForm.berat" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">Panjang</label>
                <input v-model="editForm.panjang" type="text" class="form-control form-control-sm" />
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveEdit" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Status Modal ── -->
    <div class="modal fade" id="statusRestokModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-check-circle me-2 text-success"></i>
              Edit Status
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              Ubah status untuk:
              <strong>{{ statusForm.nama }}</strong>
            </p>
            <label class="form-label small fw-semibold">Status</label>
            <select v-model="statusForm.status" class="form-select form-select-sm">
              <option value="perlu">Perlu Restok</option>
              <option value="sudah">Sudah Restok</option>
            </select>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-success btn-sm" @click="saveStatus" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
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
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  JENIS_OPTIONS,
  fetchRestokByMonth,
  addRestokItems,
  updateRestokStatus,
  updateRestokItem,
  deleteRestokItem,
  getSupplierPhone,
} from "@/services/restok-service";

const { toast, error: showError, confirm } = useAlert();
const { todayStringWITA } = useWITA();

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const saving = ref(false);
const activeTab = ref("perlu");
const allItems = ref([]);
const filterBulan = ref(todayStringWITA().substring(0, 7));

// Add modal
const addForm = ref({
  tanggal: todayStringWITA(),
  rows: [{ jenis: "", nama: "", kadar: "", berat: "", panjang: "" }],
});

// Edit modal
const editForm = ref({ id: "", jenis: "", nama: "", kadar: "", berat: "", panjang: "" });

// Status modal
const statusForm = ref({ id: "", nama: "", status: "perlu" });

// ── Computed ──────────────────────────────────────────────────────────────
const perluList = computed(() => allItems.value.filter((i) => i.status === "perlu"));
const sudahList = computed(() => allItems.value.filter((i) => i.status === "sudah"));
const currentList = computed(() => (activeTab.value === "perlu" ? perluList.value : sudahList.value));

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  try {
    allItems.value = await fetchRestokByMonth(filterBulan.value);
  } catch (e) {
    showError("Gagal memuat data", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Add Modal ─────────────────────────────────────────────────────────────
function addRow() {
  addForm.value.rows.push({ jenis: "", nama: "", kadar: "", berat: "", panjang: "" });
}
function removeRow(idx) {
  addForm.value.rows.splice(idx, 1);
}

function openAddModal() {
  addForm.value = {
    tanggal: todayStringWITA(),
    rows: [{ jenis: "", nama: "", kadar: "", berat: "", panjang: "" }],
  };
  new Modal(document.getElementById("addRestokModal")).show();
}

async function saveAdd() {
  if (!addForm.value.tanggal) return toast("Tanggal wajib diisi", "warning");
  const validRows = addForm.value.rows.filter((r) => r.jenis && r.nama.trim());
  if (validRows.length === 0) return toast("Minimal 1 baris valid (jenis + nama)", "warning");

  saving.value = true;
  try {
    await addRestokItems(validRows, addForm.value.tanggal);
    Modal.getInstance(document.getElementById("addRestokModal"))?.hide();
    toast("Order restok berhasil ditambahkan");
    await loadData();
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

// ── Edit Modal ────────────────────────────────────────────────────────────
function openEditModal(item) {
  editForm.value = {
    id: item.id,
    jenis: item.jenis,
    nama: item.nama,
    kadar: item.kadar || "",
    berat: item.berat || "",
    panjang: item.panjang || "",
  };
  new Modal(document.getElementById("editRestokModal")).show();
}

async function saveEdit() {
  if (!editForm.value.jenis || !editForm.value.nama.trim()) return toast("Jenis dan nama wajib diisi", "warning");

  saving.value = true;
  try {
    await updateRestokItem(editForm.value.id, {
      jenis: editForm.value.jenis,
      nama: editForm.value.nama.trim(),
      kadar: editForm.value.kadar,
      berat: editForm.value.berat,
      panjang: editForm.value.panjang,
    });
    Modal.getInstance(document.getElementById("editRestokModal"))?.hide();
    toast("Data berhasil diperbarui");
    await loadData();
  } catch (e) {
    showError("Gagal memperbarui", e.message);
  } finally {
    saving.value = false;
  }
}

// ── Status Modal ──────────────────────────────────────────────────────────
function openStatusModal(item) {
  statusForm.value = { id: item.id, nama: item.nama, status: item.status };
  new Modal(document.getElementById("statusRestokModal")).show();
}

async function saveStatus() {
  saving.value = true;
  try {
    await updateRestokStatus(statusForm.value.id, statusForm.value.status);
    Modal.getInstance(document.getElementById("statusRestokModal"))?.hide();
    toast("Status berhasil diubah");
    await loadData();
  } catch (e) {
    showError("Gagal mengubah status", e.message);
  } finally {
    saving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
async function deleteItem(item) {
  const result = await confirm({
    title: "Hapus Order?",
    text: `Hapus "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`,
    icon: "warning",
  });
  if (!result.isConfirmed) return;
  try {
    await deleteRestokItem(item.id);
    toast("Data berhasil dihapus");
    await loadData();
  } catch (e) {
    showError("Gagal menghapus", e.message);
  }
}

// ── WhatsApp ──────────────────────────────────────────────────────────────
async function sendWhatsApp() {
  const items = perluList.value;
  if (items.length === 0) return toast("Tidak ada item yang perlu restok", "warning");

  const phone = await getSupplierPhone();
  const lines = items.map(
    (i, idx) =>
      `${idx + 1}. ${i.jenis} — ${i.nama}` +
      (i.kadar ? ` (${i.kadar}` : "(") +
      (i.berat ? `, ${i.berat}gr` : "") +
      (i.panjang ? `, ${i.panjang}cm` : "") +
      ")",
  );
  const text = `*ORDER RESTOK — ${filterBulan.value}*\n\n` + lines.join("\n") + `\n\nTotal: ${items.length} item`;

  const url = `https://wa.me/${(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

onMounted(loadData);
</script>
