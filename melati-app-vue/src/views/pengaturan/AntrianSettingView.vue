<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-bullseye me-2 text-dark"></i>
        Setting Pengumuman Penutupan Antrian
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/users">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Penutupan Antrian</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <div class="card settings-card">
        <div class="settings-header p-3">
          <h5 class="mb-0">
            <i class="fas fa-bullhorn me-2"></i>
            Konfigurasi Pengumuman Penutupan
          </h5>
        </div>

        <div class="settings-body p-3 p-md-4">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <template v-else>
            <div class="row g-3 mb-3">
              <div class="col-12">
                <div class="card border-0 shadow-sm">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h6 class="mb-1 fw-semibold">Aktifkan Auto Play</h6>
                        <p class="text-muted small mb-0">
                          Jika aktif, Admin Antrian akan memutar pengumuman otomatis sesuai jam yang disimpan.
                        </p>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.6rem">
                        <input
                          v-model="form.enabled"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="width: 1.4em; height: 0.95em; cursor: pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-12">
                <div class="card border-0 shadow-sm">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <h6 class="mb-1 fw-semibold">Batas Klik Pengingat Antrian</h6>
                        <p class="text-muted small mb-0">
                          Jika aktif, tombol Pengingat Antrian dibatasi berdasarkan nilai yang Anda atur.
                        </p>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.6rem">
                        <input
                          v-model="form.reminderLimitEnabled"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="width: 1.4em; height: 0.95em; cursor: pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Batas Pemanggilan</label>
                <input
                  v-model.number="form.reminderLimitMaxCalls"
                  type="number"
                  min="1"
                  max="20"
                  class="form-control"
                  :disabled="!form.reminderLimitEnabled"
                  @keydown.enter.prevent="saveSettings"
                />
                <small class="text-muted">Rentang 1 sampai 20 kali.</small>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Batas Durasi (detik)</label>
                <input
                  v-model.number="form.reminderLimitWindowSeconds"
                  type="number"
                  min="10"
                  max="3600"
                  class="form-control"
                  :disabled="!form.reminderLimitEnabled"
                  @keydown.enter.prevent="saveSettings"
                />
                <small class="text-muted">Rentang 10 sampai 3600 detik.</small>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Jam Auto Play</label>
                <input v-model="form.time" type="time" class="form-control" @keydown.enter.prevent="saveSettings" />
                <small class="text-muted">Format 24 jam. Contoh: 20:55</small>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Jumlah Pengulangan</label>
                <input
                  v-model.number="form.repeat"
                  type="number"
                  min="1"
                  max="5"
                  class="form-control"
                  @keydown.enter.prevent="saveSettings"
                />
                <small class="text-muted">Rentang 1 sampai 5 kali.</small>
              </div>

              <div class="col-12">
                <label class="form-label fw-semibold">Teks Pengumuman</label>
                <textarea
                  v-model="form.message"
                  rows="4"
                  class="form-control"
                  placeholder="Tulis pesan pengumuman penutupan..."
                ></textarea>
                <small class="text-muted">Pesan ini dipakai untuk play manual dan auto play.</small>
              </div>
            </div>

            <div class="meta-info mb-3">
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
              <button class="btn btn-success" :disabled="previewing" @click="testPlay">
                <i class="fas fa-play me-2"></i>
                {{ previewing ? "Memutar..." : "Tes Play Sekarang" }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import {
  DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
  ensureClosingAnnouncementSettings,
  fetchClosingAnnouncementSettings,
  normalizeClosingAnnouncementSettings,
  saveClosingAnnouncementSettings,
  subscribeClosingAnnouncementSettings,
} from "@/services/antrian-closing-service";
import { isAudioBusy, playClosingAnnouncement, primeAudioPlayback } from "@/services/audio-service";

const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const previewing = ref(false);
const form = reactive({ ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS });

let unsubscribeSettings = null;

const formattedLastUpdated = computed(() => {
  if (!form.lastUpdated) return "Belum pernah";
  const date = new Date(form.lastUpdated);
  if (Number.isNaN(date.getTime())) return "Belum pernah";
  return date.toLocaleString("id-ID");
});

function applySettings(payload = {}) {
  const normalized = normalizeClosingAnnouncementSettings(payload);
  form.enabled = normalized.enabled;
  form.time = normalized.time;
  form.repeat = normalized.repeat;
  form.reminderLimitEnabled = normalized.reminderLimitEnabled;
  form.reminderLimitMaxCalls = normalized.reminderLimitMaxCalls;
  form.reminderLimitWindowSeconds = normalized.reminderLimitWindowSeconds;
  form.message = normalized.message;
  form.lastUpdated = normalized.lastUpdated;
  form.updatedBy = normalized.updatedBy;
}

function isValidTime(value) {
  return /^(\d{2}):(\d{2})$/.test(String(value || ""));
}

function getSavePayload() {
  return {
    enabled: !!form.enabled,
    time: String(form.time || "").trim(),
    repeat: Number(form.repeat),
    reminderLimitEnabled: !!form.reminderLimitEnabled,
    reminderLimitMaxCalls: Number(form.reminderLimitMaxCalls),
    reminderLimitWindowSeconds: Number(form.reminderLimitWindowSeconds),
    message: String(form.message || "").trim(),
  };
}

async function saveSettings() {
  const payload = getSavePayload();

  if (!isValidTime(payload.time)) {
    await Swal.fire({
      icon: "error",
      title: "Jam Tidak Valid",
      text: "Silakan isi jam auto play dengan format yang benar.",
    });
    return;
  }

  if (!payload.message) {
    await Swal.fire({
      icon: "error",
      title: "Pesan Kosong",
      text: "Teks pengumuman tidak boleh kosong.",
    });
    return;
  }

  if (!Number.isFinite(payload.repeat) || payload.repeat < 1 || payload.repeat > 5) {
    await Swal.fire({
      icon: "error",
      title: "Pengulangan Tidak Valid",
      text: "Jumlah pengulangan harus di antara 1 sampai 5.",
    });
    return;
  }

  if (
    !Number.isFinite(payload.reminderLimitMaxCalls) ||
    payload.reminderLimitMaxCalls < 1 ||
    payload.reminderLimitMaxCalls > 20
  ) {
    await Swal.fire({
      icon: "error",
      title: "Batas Pemanggilan Tidak Valid",
      text: "Batas pemanggilan harus di antara 1 sampai 20.",
    });
    return;
  }

  if (
    !Number.isFinite(payload.reminderLimitWindowSeconds) ||
    payload.reminderLimitWindowSeconds < 10 ||
    payload.reminderLimitWindowSeconds > 3600
  ) {
    await Swal.fire({
      icon: "error",
      title: "Batas Durasi Tidak Valid",
      text: "Batas durasi harus di antara 10 sampai 3600 detik.",
    });
    return;
  }

  try {
    saving.value = true;
    await saveClosingAnnouncementSettings(
      payload,
      auth.user?.email || auth.user?.username || auth.userRole || "System",
    );
    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Pengaturan penutupan antrian berhasil disimpan.",
      timer: 1600,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error(error);
    await Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: "Terjadi kesalahan saat menyimpan pengaturan.",
    });
  } finally {
    saving.value = false;
  }
}

async function resetToDefault() {
  const result = await Swal.fire({
    icon: "question",
    title: "Reset ke Default?",
    text: "Nilai form akan dikembalikan ke pengaturan bawaan.",
    showCancelButton: true,
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
  });
  if (!result.isConfirmed) return;

  applySettings(DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS);
}

async function testPlay() {
  const message = String(form.message || "").trim();
  if (!message) {
    await Swal.fire({ icon: "error", title: "Pesan Kosong", text: "Isi teks pengumuman terlebih dahulu." });
    return;
  }

  if (isAudioBusy()) {
    await Swal.fire({
      icon: "info",
      title: "Audio Sedang Diputar",
      text: "Tunggu audio yang sedang berjalan selesai terlebih dahulu.",
    });
    return;
  }

  try {
    previewing.value = true;
    primeAudioPlayback();
    const ok = await playClosingAnnouncement(message);
    if (!ok) {
      await Swal.fire({
        icon: "warning",
        title: "Tidak Dapat Memutar",
        text: "Browser menolak auto-play. Coba klik halaman lalu ulangi tes.",
      });
    }
  } catch (error) {
    console.error(error);
    await Swal.fire({ icon: "error", title: "Gagal Play", text: "Terjadi kesalahan saat memutar pengumuman." });
  } finally {
    previewing.value = false;
  }
}

onMounted(async () => {
  try {
    await ensureClosingAnnouncementSettings();
    const data = await fetchClosingAnnouncementSettings();
    applySettings(data);

    unsubscribeSettings = subscribeClosingAnnouncementSettings((liveData) => {
      applySettings(liveData);
    });
  } catch (error) {
    console.error(error);
    await Swal.fire({ icon: "error", title: "Gagal Memuat", text: "Pengaturan penutupan antrian gagal dimuat." });
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  if (unsubscribeSettings) unsubscribeSettings();
});
</script>

<style scoped>
.settings-card {
  border: none;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.settings-header {
  background: linear-gradient(135deg, #eaf2ff 0%, #878787 100%);
}

.settings-body {
  background: #fff;
}

.meta-info {
  font-size: 0.9rem;
  color: #6c757d;
}
</style>
