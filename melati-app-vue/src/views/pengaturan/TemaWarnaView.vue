<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-palette2 me-2 text-dark"></i>
        Pengaturan Tema Warna
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/users">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Tema Warna</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <div class="card border-0 shadow-sm">
        <div class="card-header">
          <h2>
            <i class="fas fa-fill-drip me-2"></i>
            Konfigurasi Gradient UI
          </h2>
        </div>

        <div class="card-body p-3 p-md-4">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <template v-else>
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <div class="theme-panel">
                  <h6 class="fw-semibold mb-2">Background Sidebar</h6>
                  <div class="row g-2">
                    <div class="col-4">
                      <label class="form-label small mb-1">Start</label>
                      <input
                        v-model="form.sidebarStart"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                    <div class="col-4">
                      <label class="form-label small mb-1">Middle</label>
                      <input
                        v-model="form.sidebarMid"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                    <div class="col-4">
                      <label class="form-label small mb-1">End</label>
                      <input
                        v-model="form.sidebarEnd"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                  </div>
                  <div class="theme-preview mt-2" :style="sidebarPreviewStyle">Preview Sidebar</div>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <div class="theme-panel">
                  <h6 class="fw-semibold mb-2">Tombol Tampilkan</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label class="form-label small mb-1">Start</label>
                      <input
                        v-model="form.tampilkanBtnStart"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                    <div class="col-6">
                      <label class="form-label small mb-1">End</label>
                      <input
                        v-model="form.tampilkanBtnEnd"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                  </div>
                  <div class="mt-2">
                    <button class="btn btn-sm btn-tampilkan" type="button">Tampilkan</button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <div class="theme-panel">
                  <h6 class="fw-semibold mb-2">Card Title Halaman Antrian</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label class="form-label small mb-1">Start</label>
                      <input
                        v-model="form.antrianCardHeaderStart"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                    <div class="col-6">
                      <label class="form-label small mb-1">End</label>
                      <input
                        v-model="form.antrianCardHeaderEnd"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                  </div>
                  <div class="theme-preview mt-2" :style="antrianHeaderPreviewStyle">Preview Card Header</div>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <div class="theme-panel">
                  <h6 class="fw-semibold mb-2">Aksen Elemen Tambahan</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label class="form-label small mb-1">Start</label>
                      <input
                        v-model="form.surfaceAccentStart"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                    <div class="col-6">
                      <label class="form-label small mb-1">End</label>
                      <input
                        v-model="form.surfaceAccentEnd"
                        type="color"
                        class="form-control form-control-color w-100"
                        @input="applyPreview"
                      />
                    </div>
                  </div>
                  <div class="theme-preview mt-2" :style="accentPreviewStyle">Preview Accent</div>
                </div>
              </div>
            </div>

            <div class="meta-info mt-3 mb-3">
              <i class="fas fa-clock me-1"></i>
              Terakhir update:
              <strong>{{ formattedLastUpdated }}</strong>
              <span class="mx-1">|</span>
              Oleh:
              <strong>{{ form.updatedBy || "-" }}</strong>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary" :disabled="saving" @click="saveSettings">
                <i class="fas fa-save me-2"></i>
                {{ saving ? "Menyimpan..." : "Simpan Pengaturan" }}
              </button>
              <button class="btn btn-outline-secondary" :disabled="saving" @click="resetToDefault">
                <i class="fas fa-undo me-2"></i>
                Reset Default
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { getActiveFloor } from "@/config/floor-config";
import {
  DEFAULT_THEME_APPEARANCE_SETTINGS,
  applyThemeAppearanceToDocument,
  ensureThemeAppearanceSettings,
  fetchThemeAppearanceSettings,
  normalizeThemeAppearanceSettings,
  saveThemeAppearanceSettings,
} from "@/services/theme-settings-service";

const auth = useAuthStore();
const activeFloor = ref("");

const loading = ref(true);
const saving = ref(false);

const form = reactive({ ...DEFAULT_THEME_APPEARANCE_SETTINGS });

const formattedLastUpdated = computed(() => {
  if (!form.lastUpdated) return "Belum pernah";
  const date = new Date(form.lastUpdated);
  if (Number.isNaN(date.getTime())) return "Belum pernah";
  return date.toLocaleString("id-ID");
});

const sidebarPreviewStyle = computed(() => ({
  background: `linear-gradient(180deg, ${form.sidebarStart} 0%, ${form.sidebarMid} 50%, ${form.sidebarEnd} 100%)`,
}));

const antrianHeaderPreviewStyle = computed(() => ({
  background: `linear-gradient(135deg, ${form.antrianCardHeaderStart} 0%, ${form.antrianCardHeaderEnd} 100%)`,
}));

const accentPreviewStyle = computed(() => ({
  background: `linear-gradient(135deg, ${form.surfaceAccentStart} 0%, ${form.surfaceAccentEnd} 100%)`,
}));

function applySettings(payload = {}) {
  const normalized = normalizeThemeAppearanceSettings(payload);
  form.sidebarStart = normalized.sidebarStart;
  form.sidebarMid = normalized.sidebarMid;
  form.sidebarEnd = normalized.sidebarEnd;
  form.tampilkanBtnStart = normalized.tampilkanBtnStart;
  form.tampilkanBtnEnd = normalized.tampilkanBtnEnd;
  form.antrianCardHeaderStart = normalized.antrianCardHeaderStart;
  form.antrianCardHeaderEnd = normalized.antrianCardHeaderEnd;
  form.surfaceAccentStart = normalized.surfaceAccentStart;
  form.surfaceAccentEnd = normalized.surfaceAccentEnd;
  form.lastUpdated = normalized.lastUpdated;
  form.updatedBy = normalized.updatedBy;
}

function getPayload() {
  return {
    sidebarStart: form.sidebarStart,
    sidebarMid: form.sidebarMid,
    sidebarEnd: form.sidebarEnd,
    tampilkanBtnStart: form.tampilkanBtnStart,
    tampilkanBtnEnd: form.tampilkanBtnEnd,
    antrianCardHeaderStart: form.antrianCardHeaderStart,
    antrianCardHeaderEnd: form.antrianCardHeaderEnd,
    surfaceAccentStart: form.surfaceAccentStart,
    surfaceAccentEnd: form.surfaceAccentEnd,
  };
}

function applyPreview() {
  applyThemeAppearanceToDocument(getPayload());
}

async function loadSettings() {
  loading.value = true;
  try {
    const floorId = activeFloor.value || getActiveFloor();
    await ensureThemeAppearanceSettings(floorId);
    const data = await fetchThemeAppearanceSettings(floorId);
    applySettings(data);
    applyThemeAppearanceToDocument(data);
  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: "error",
      title: "Gagal Memuat",
      text: "Pengaturan tema tidak dapat dimuat.",
    });
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  try {
    saving.value = true;
    const floorId = activeFloor.value || getActiveFloor();
    const payload = getPayload();
    await saveThemeAppearanceSettings(
      payload,
      auth.user?.email || auth.user?.username || auth.userRole || "System",
      floorId,
    );
    applyThemeAppearanceToDocument(payload);
    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Pengaturan tema warna berhasil disimpan untuk lantai ini.",
      timer: 1500,
      showConfirmButton: false,
    });
    await loadSettings();
  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: "Terjadi kesalahan saat menyimpan pengaturan tema.",
    });
  } finally {
    saving.value = false;
  }
}

async function resetToDefault() {
  const result = await Swal.fire({
    icon: "question",
    title: "Reset ke Default?",
    text: "Semua warna akan dikembalikan ke tema bawaan untuk lantai ini.",
    showCancelButton: true,
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  const floorId = activeFloor.value || getActiveFloor();
  const payload = { ...DEFAULT_THEME_APPEARANCE_SETTINGS };
  applySettings(payload);
  applyThemeAppearanceToDocument(payload);
  await saveThemeAppearanceSettings(
    payload,
    auth.user?.email || auth.user?.username || auth.userRole || "System",
    floorId,
  );

  await Swal.fire({
    icon: "success",
    title: "Tema Direset",
    text: "Tema warna kembali ke nilai default untuk lantai ini.",
    timer: 1400,
    showConfirmButton: false,
  });

  await loadSettings();
}

onMounted(() => {
  activeFloor.value = getActiveFloor();
  loadSettings();
});
</script>

<style scoped>
.theme-panel {
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 0.9rem;
  background: #fff;
}

.theme-preview {
  min-height: 44px;
  border-radius: 8px;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.meta-info {
  font-size: 0.86rem;
  color: #6c757d;
}
</style>
