<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-broadcast me-2 text-warning"></i>
        Setting Promosi
      </h4>
      <a href="/promosi/display" target="_blank" class="btn btn-outline-warning btn-sm">
        <i class="bi bi-eye me-1"></i>
        Pratinjau
      </a>
    </div>

    <!-- Settings Card -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold small py-2">
        <i class="bi bi-gear me-1 text-warning"></i>
        Pengaturan Display
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small">Interval Slide (detik)</label>
            <input
              v-model.number="settings.slideInterval"
              type="number"
              min="5"
              max="120"
              class="form-control form-control-sm"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label small">Efek Transisi</label>
            <select v-model="settings.transitionEffect" class="form-select form-select-sm">
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <div class="col-md-6 d-flex align-items-end gap-3">
            <div class="form-check form-switch mb-0">
              <input v-model="settings.autoPlay" type="checkbox" class="form-check-input" id="autoPlay" />
              <label class="form-check-label small" for="autoPlay">Auto Play</label>
            </div>
            <div class="form-check form-switch mb-0">
              <input v-model="settings.showControls" type="checkbox" class="form-check-input" id="showControls" />
              <label class="form-check-label small" for="showControls">Tampilkan Kontrol</label>
            </div>
            <div class="form-check form-switch mb-0">
              <input v-model="settings.enableAnimation" type="checkbox" class="form-check-input" id="enableAnimation" />
              <label class="form-check-label small" for="enableAnimation">Animasi</label>
            </div>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-warning btn-sm" @click="saveSettings" :disabled="savingSettings">
            <span v-if="savingSettings" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-floppy me-1"></i>
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>

    <!-- Content Table -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-images me-1 text-warning"></i>
          Konten Slide
        </span>
        <button class="btn btn-warning btn-sm" @click="openAdd">
          <i class="bi bi-plus-circle me-1"></i>
          Tambah
        </button>
      </div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>Judul</th>
              <th>Jenis</th>
              <th class="text-center">Urutan</th>
              <th class="text-center">Aktif</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loadingContent">
              <td colspan="5" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-warning"></div>
              </td>
            </tr>
            <tr v-else-if="slides.length === 0">
              <td colspan="5" class="text-center text-muted py-4">Belum ada konten.</td>
            </tr>
            <tr v-for="slide in sortedSlides" :key="slide.id">
              <td class="small">
                <div class="fw-semibold">{{ slide.title }}</div>
                <div v-if="slide.description" class="text-muted" style="font-size: 0.82em">{{ slide.description }}</div>
              </td>
              <td>
                <span class="badge bg-info text-dark">{{ slide.contentType }}</span>
              </td>
              <td class="small text-center">{{ slide.order }}</td>
              <td class="text-center">
                <span :class="['badge', slide.isActive ? 'bg-success' : 'bg-secondary']">
                  {{ slide.isActive ? "Aktif" : "Nonaktif" }}
                </span>
              </td>
              <td class="text-center">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary btn-sm" @click="openEdit(slide)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm" @click="deleteSlide(slide)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal fade" id="slideModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title small fw-bold">{{ editSlide ? "Edit" : "Tambah" }} Slide</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label small">
                  Judul
                  <span class="text-danger">*</span>
                </label>
                <input v-model="slideForm.title" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small">Jenis Konten</label>
                <select v-model="slideForm.contentType" class="form-select form-select-sm">
                  <option value="HTML">HTML</option>
                  <option value="Gambar">Gambar</option>
                  <option value="Video">Video</option>
                </select>
              </div>
              <div class="col-md-1">
                <label class="form-label small">Urutan</label>
                <input v-model.number="slideForm.order" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2 d-flex align-items-end">
                <div class="form-check form-switch">
                  <input v-model="slideForm.isActive" type="checkbox" class="form-check-input" id="slideActive" />
                  <label class="form-check-label small" for="slideActive">Aktif</label>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label small">Deskripsi</label>
                <input v-model="slideForm.description" type="text" class="form-control form-control-sm" />
              </div>

              <!-- HTML content -->
              <div v-if="slideForm.contentType === 'HTML'" class="col-12">
                <label class="form-label small">Konten HTML</label>
                <textarea
                  v-model="slideForm.htmlContent"
                  rows="4"
                  class="form-control form-control-sm font-monospace"
                  placeholder="<h1>Hello</h1>"
                ></textarea>
              </div>

              <!-- Image/Video upload -->
              <div v-if="slideForm.contentType === 'Gambar' || slideForm.contentType === 'Video'" class="col-12">
                <label class="form-label small">File {{ slideForm.contentType }}</label>
                <input
                  type="file"
                  class="form-control form-control-sm"
                  :accept="slideForm.contentType === 'Gambar' ? 'image/*' : 'video/*'"
                  @change="handleFileChange"
                />
                <div v-if="editSlide?.fileUrl" class="small text-muted mt-1">
                  File saat ini:
                  <a :href="editSlide.fileUrl" target="_blank">Lihat</a>
                </div>
                <div v-if="uploadProgress > 0" class="progress mt-1" style="height: 4px">
                  <div class="progress-bar bg-warning" :style="`width:${uploadProgress}%`"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveSlide" :disabled="savingSlide">
              <span v-if="savingSlide" class="spinner-border spinner-border-sm me-1"></span>
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
import { rtdb, storage, auth } from "@/config/firebase";
import { ref as dbRef, get, set, push, remove } from "firebase/database";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useAlert } from "@/composables/useAlert";

const { swal, error: showError, confirm } = useAlert();

// ── Settings ───────────────────────────────────────────────────────────────
const savingSettings = ref(false);
const settings = ref({
  slideInterval: 30,
  transitionEffect: "fade",
  autoPlay: true,
  showControls: true,
  enableAnimation: true,
});

async function loadSettings() {
  try {
    const snap = await get(dbRef(rtdb, "settings/promotion"));
    if (snap.val()) Object.assign(settings.value, snap.val());
  } catch {
    /* use defaults */
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    await set(dbRef(rtdb, "settings/promotion"), { ...settings.value });
    swal("Pengaturan berhasil disimpan");
  } catch (e) {
    showError("Gagal menyimpan pengaturan", e.message);
  } finally {
    savingSettings.value = false;
  }
}

// ── Slides ─────────────────────────────────────────────────────────────────
const loadingContent = ref(true);
const savingSlide = ref(false);
const uploadProgress = ref(0);
const slides = ref([]);
const editSlide = ref(null);
const selectedFile = ref(null);
const slideForm = ref({ title: "", description: "", contentType: "HTML", order: 1, isActive: true, htmlContent: "" });

const sortedSlides = computed(() => [...slides.value].sort((a, b) => a.order - b.order));

async function loadSlides() {
  loadingContent.value = true;
  try {
    const snap = await get(dbRef(rtdb, "content/promotion/customItems"));
    const val = snap.val() || {};
    slides.value = Object.entries(val).map(([id, data]) => ({ id, ...data }));
  } catch (e) {
    showError("Gagal memuat konten", e.message);
  } finally {
    loadingContent.value = false;
  }
}

function openAdd() {
  editSlide.value = null;
  selectedFile.value = null;
  uploadProgress.value = 0;
  slideForm.value = {
    title: "",
    description: "",
    contentType: "HTML",
    order: sortedSlides.value.length + 1,
    isActive: true,
    htmlContent: "",
  };
  Modal.getOrCreateInstance(document.getElementById("slideModal")).show();
}

function openEdit(slide) {
  editSlide.value = slide;
  selectedFile.value = null;
  uploadProgress.value = 0;
  slideForm.value = {
    title: slide.title,
    description: slide.description || "",
    contentType: slide.contentType,
    order: slide.order,
    isActive: slide.isActive ?? true,
    htmlContent: slide.htmlContent || "",
  };
  Modal.getOrCreateInstance(document.getElementById("slideModal")).show();
}

function handleFileChange(e) {
  selectedFile.value = e.target.files[0] || null;
}

function sanitizeFileName(fileName) {
  return String(fileName || "promotion_file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildPromotionStoragePath(fileName, folder = "file") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const safeName = sanitizeFileName(fileName);
  const finalName = `${Date.now()}_${safeName}`;
  return `promotions/${year}/${month}/${folder}/${finalName}`;
}

async function uploadFile(file, folder = "file") {
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) {
    throw new Error("Sesi login berakhir. Silakan login ulang.");
  }

  const filename = buildPromotionStoragePath(file.name, folder);
  const sRef = storageRef(storage, filename);
  const fallbackMime = folder === "video" ? "video/mp4" : "image/jpeg";
  const contentType = file.type || fallbackMime;

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(sRef, file, {
      contentType,
      customMetadata: {
        uploadedBy: currentUser.uid,
        contentType: folder,
      },
    });

    task.on(
      "state_changed",
      (snap) => {
        uploadProgress.value = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ fileUrl: url, filePath: filename });
      },
    );
  });
}

async function saveSlide() {
  if (!slideForm.value.title.trim()) return swal("Judul wajib diisi", "warning");
  savingSlide.value = true;
  try {
    const data = {
      title: slideForm.value.title.trim(),
      description: slideForm.value.description,
      contentType: slideForm.value.contentType,
      order: slideForm.value.order,
      isActive: slideForm.value.isActive,
      type: "custom",
      createdAt: new Date().toISOString(),
    };

    if (slideForm.value.contentType === "HTML") {
      data.htmlContent = slideForm.value.htmlContent;
    } else if (selectedFile.value) {
      const folder = slideForm.value.contentType === "Video" ? "video" : "image";
      const { fileUrl, filePath } = await uploadFile(selectedFile.value, folder);
      data.fileUrl = fileUrl;
      data.filePath = filePath;
      // If editing and there was a previous file, delete it
      if (editSlide.value?.filePath) {
        deleteObject(storageRef(storage, editSlide.value.filePath)).catch(() => {});
      }
    } else if (editSlide.value?.fileUrl) {
      data.fileUrl = editSlide.value.fileUrl;
      data.filePath = editSlide.value.filePath;
    }

    if (editSlide.value) {
      await set(dbRef(rtdb, `content/promotion/customItems/${editSlide.value.id}`), data);
    } else {
      await push(dbRef(rtdb, "content/promotion/customItems"), data);
    }

    Modal.getInstance(document.getElementById("slideModal"))?.hide();
    swal(`Slide berhasil ${editSlide.value ? "diperbarui" : "ditambahkan"}`);
    await loadSlides();
  } catch (e) {
    showError("Gagal menyimpan slide", e.message);
  } finally {
    savingSlide.value = false;
    uploadProgress.value = 0;
  }
}

async function deleteSlide(slide) {
  const r = await confirm({ title: "Hapus Slide?", text: slide.title, icon: "warning" });
  if (!r.isConfirmed) return;
  try {
    if (slide.filePath) deleteObject(storageRef(storage, slide.filePath)).catch(() => {});
    await remove(dbRef(rtdb, `content/promotion/customItems/${slide.id}`));
    swal("Slide berhasil dihapus");
    await loadSlides();
  } catch (e) {
    showError("Gagal menghapus", e.message);
  }
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadSlides()]);
});
</script>
