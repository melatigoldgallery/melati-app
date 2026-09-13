<template>
  <div
    id="featureUpdateModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="featureUpdateModalLabel"
    aria-hidden="true"
    ref="modalRef"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content border-0 shadow">
        <!-- Modal Header -->
        <div class="modal-header bg-light py-3 border-bottom d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <div class="icon-box bg-primary text-white rounded-3 p-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
              <i class="bi bi-clock-history fs-5"></i>
            </div>
            <div>
              <h5 class="modal-title fw-bold mb-0 text-dark" id="featureUpdateModalLabel">
                Riwayat Update Fitur
              </h5>
              <small class="text-muted" style="font-size: 0.78rem;">
                Catatan pembaruan dan rilis fitur sistem aplikasi
              </small>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body p-3 p-md-4">
          <!-- Top Action / Form Toggle -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1.5 rounded-pill fw-semibold">
              <i class="bi bi-layers me-1"></i> Total {{ updates.length }} Pembaruan
            </span>

            <button
              v-if="isSupervisor && !isFormOpen"
              class="btn btn-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1 shadow-sm px-3"
              @click="openAddForm"
            >
              <i class="bi bi-plus-circle"></i>
              <span>Tambah Update</span>
            </button>
          </div>

          <!-- Add / Edit Inline Form Card -->
          <div v-if="isFormOpen" class="card border border-primary-subtle bg-primary-subtle bg-opacity-10 mb-4 shadow-sm">
            <div class="card-header bg-white py-2 fw-semibold d-flex justify-content-between align-items-center border-bottom">
              <span class="text-primary d-flex align-items-center gap-1.5 small">
                <i :class="editingId ? 'bi bi-pencil-square' : 'bi bi-plus-circle'"></i>
                {{ editingId ? 'Edit Catatan Update Fitur' : 'Tambah Catatan Update Baru' }}
              </span>
              <button type="button" class="btn-close btn-sm" @click="closeForm"></button>
            </div>
            <div class="card-body p-3">
              <form @submit.prevent="submitForm">
                <div class="row g-2.5 mb-2">
                  <div class="col-md-5">
                    <label class="form-label small fw-bold mb-1">Tanggal Rilis Fitur <span class="text-danger">*</span></label>
                    <input
                      v-model="formData.date"
                      type="date"
                      class="form-control form-control-sm"
                      required
                    />
                  </div>
                  <div class="col-md-7">
                    <label class="form-label small fw-bold mb-1">Kategori / Tag</label>
                    <input
                      v-model="formData.category"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Contoh: Mutasi Barcode, Monitoring Sales, Audio"
                    />
                  </div>
                </div>

                <div class="mb-2">
                  <label class="form-label small fw-bold mb-1">Judul Pembaruan <span class="text-danger">*</span></label>
                  <input
                    v-model="formData.title"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Contoh: Sinkronisasi Otomatis Penjualan Manual"
                    required
                  />
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold mb-1">Deskripsi Detail Fitur <span class="text-danger">*</span></label>
                  <textarea
                    v-model="formData.description"
                    class="form-control form-control-sm"
                    rows="3"
                    placeholder="Jelaskan detail fungsi, alur, dan manfaat dari pembaruan fitur..."
                    required
                  ></textarea>
                </div>

                <div class="d-flex justify-content-end gap-2">
                  <button type="button" class="btn btn-light btn-sm" @click="closeForm">
                    Batal
                  </button>
                  <button type="submit" class="btn btn-primary btn-sm fw-semibold px-3" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-check2-circle me-1"></i>
                    {{ editingId ? 'Simpan Perubahan' : 'Simpan Update' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary spinner-border-sm" role="status"></div>
            <div class="small text-muted mt-2">Memuat riwayat fitur...</div>
          </div>

          <!-- Empty State -->
          <div v-else-if="updates.length === 0" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
            <p class="small mb-0">Belum ada riwayat update fitur.</p>
          </div>

          <!-- Timeline Changelog List (Sorted Descending) -->
          <div v-else class="timeline-list d-flex flex-column gap-3">
            <div
              v-for="(item, idx) in updates"
              :key="item.id || idx"
              class="card border-0 shadow-sm rounded-3 overflow-hidden transition-all timeline-card"
            >
              <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-1.5 flex-wrap">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="badge bg-primary text-white fw-bold px-2.5 py-1 font-monospace">
                      <i class="bi bi-calendar3 me-1"></i>
                      {{ formatDisplayDate(item.date) }}
                    </span>
                    <span v-if="item.category" class="badge bg-secondary-subtle text-secondary border px-2 py-0.5 small">
                      {{ item.category }}
                    </span>
                  </div>

                  <!-- Edit / Delete Actions (Supervisor Only) -->
                  <div v-if="isSupervisor" class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-secondary btn-sm py-0 px-2"
                      @click="openEditForm(item)"
                      title="Edit Update"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm py-0 px-2"
                      @click="confirmDelete(item)"
                      title="Hapus Update"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <h6 class="fw-bold text-dark mb-1 mt-1">
                  {{ item.title || 'Pembaruan Fitur' }}
                </h6>

                <p class="text-muted small mb-0 line-height-base" style="white-space: pre-line;">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer bg-light py-2 border-top">
          <button type="button" class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">
            Tutup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import { 
  DEFAULT_FEATURE_UPDATES,
  subscribeFeatureUpdates, 
  saveFeatureUpdates 
} from "@/services/feature-update-service";

const { toast, error: showError, confirm } = useAlert();
const auth = useAuthStore();

const isSupervisor = computed(() => {
  return auth.userRole?.toLowerCase() === "supervisor";
});

const modalRef = ref(null);
const updates = ref([...DEFAULT_FEATURE_UPDATES]);
const loading = ref(true);
const saving = ref(false);
const isFormOpen = ref(false);
const editingId = ref(null);

const formData = ref({
  date: new Date().toISOString().split("T")[0],
  title: "",
  category: "Mutasi Barcode",
  description: "",
});

let unsubscribe = null;

function formatDisplayDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${day} ${months[monthIdx] || parts[1]} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
  } catch (e) {
    console.error("Format date error:", e);
  }
  return dateStr;
}

function openAddForm() {
  if (!isSupervisor.value) return;
  editingId.value = null;
  formData.value = {
    date: new Date().toISOString().split("T")[0],
    title: "",
    category: "",
    description: "",
  };
  isFormOpen.value = true;
}

function openEditForm(item) {
  if (!isSupervisor.value) return;
  editingId.value = item.id;
  formData.value = {
    date: item.date || new Date().toISOString().split("T")[0],
    title: item.title || "",
    category: item.category || "",
    description: item.description || "",
  };
  isFormOpen.value = true;
}

function closeForm() {
  isFormOpen.value = false;
  editingId.value = null;
}

async function submitForm() {
  if (!isSupervisor.value) {
    showError("Aksi hanya diizinkan untuk supervisor.");
    return;
  }

  if (!formData.value.title.trim() || !formData.value.description.trim()) {
    showError("Judul dan deskripsi pembaruan wajib diisi.");
    return;
  }

  saving.value = true;
  try {
    let updatedList = [...updates.value];

    if (editingId.value) {
      // Edit existing
      updatedList = updatedList.map((item) => {
        if (item.id === editingId.value) {
          return {
            ...item,
            date: formData.value.date,
            title: formData.value.title.trim(),
            category: formData.value.category.trim(),
            description: formData.value.description.trim(),
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });
    } else {
      // Add new
      const newItem = {
        id: `update-${Date.now()}`,
        date: formData.value.date,
        title: formData.value.title.trim(),
        category: formData.value.category.trim() || "General",
        description: formData.value.description.trim(),
        createdAt: new Date().toISOString(),
      };
      updatedList.unshift(newItem);
    }

    await saveFeatureUpdates(updatedList);
    toast(editingId.value ? "Catatan update berhasil diperbarui." : "Catatan update berhasil ditambahkan.");
    closeForm();
  } catch (err) {
    console.error("Gagal menyimpan update fitur:", err);
    showError("Gagal menyimpan catatan: " + (err.message || err));
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(item) {
  if (!isSupervisor.value) {
    showError("Aksi hanya diizinkan untuk supervisor.");
    return;
  }

  const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus catatan update "${item.title}"?`, {
    title: "Konfirmasi Hapus Update",
    confirmText: "Hapus",
    cancelText: "Batal",
    type: "danger",
  });

  if (!isConfirmed) return;

  try {
    const updatedList = updates.value.filter((u) => u.id !== item.id);
    await saveFeatureUpdates(updatedList);
    toast("Catatan update berhasil dihapus.");
  } catch (err) {
    console.error("Gagal menghapus update fitur:", err);
    showError("Gagal menghapus catatan: " + (err.message || err));
  }
}

function show() {
  if (modalRef.value) {
    const modalInstance = Modal.getOrCreateInstance(modalRef.value);
    modalInstance.show();
  }
}

function hide() {
  if (modalRef.value) {
    const modalInstance = Modal.getOrCreateInstance(modalRef.value);
    modalInstance.hide();
  }
}

defineExpose({
  show,
  hide,
});

onMounted(() => {
  unsubscribe = subscribeFeatureUpdates((data) => {
    updates.value = data;
    loading.value = false;
  }, (err) => {
    console.error("Feature updates subscription error:", err);
    loading.value = false;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped>
.timeline-card {
  border-left: 3.5px solid #0d6efd !important;
  background-color: #ffffff;
}

.timeline-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px);
}

.line-height-base {
  line-height: 1.55;
}
</style>
