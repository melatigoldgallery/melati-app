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
      <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2 small">Memuat pengaturan antrean...</p>
      </div>

      <template v-else>

        <div class="row g-4">
          <!-- Kolom Kiri: Mode Antrean & Pengumuman Penutupan (col-lg-8) -->
          <div class="col-lg-8 col-12">
            <!-- Card 1: Konfigurasi Mode Antrean -->
            <div class="card settings-card mb-4 border-0">
              <div class="settings-header p-3 text-white">
                <h5 class="mb-0 text-white">
                  <i class="fas fa-toggle-on me-2"></i>
                  Mode Sistem Antrean (Lantai: {{ auth.activeFloor || 'L1' }})
                </h5>
              </div>
              <div class="settings-body p-3 p-md-4">
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-semibold">Pilih Mode Antrean</label>
                    <select v-model="generalForm.queueMode" class="form-select">
                      <option value="legacy">Antrean V1 (Legacy - 1 Kategori Gabungan)</option>
                      <option value="split">Antrean V2 (Split - Kolom Jual & Beli Terpisah)</option>
                    </select>
                    <small class="text-muted mt-1 d-block">
                      <strong>Legacy Mode (V1)</strong> menggunakan 1 loket gabungan (kategori A-D).
                      <br />
                      <strong>Split Mode (V2)</strong> memisahkan loket pemanggilan antara transaksi Jual (kategori D-E) dan Beli (kategori A-C).
                    </small>
                  </div>

                  <!-- Hybrid Mode Toggle -->
                  <div class="col-12 border-top pt-3 mt-3">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 class="mb-0 fw-semibold">Aktifkan Pemanggilan Hybrid</h6>
                        <small class="text-muted">
                          Mengizinkan admin memanggil nomor berikutnya meskipun tidak ada tiket antrean yang diambil dari kiosk.
                        </small>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.4rem">
                        <input
                          v-model="generalForm.hybridMode"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="cursor: pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2: Konfigurasi Pengumuman Penutupan -->
            <div class="card settings-card mb-4 border-0">
              <div class="settings-header p-3 text-white">
                <h5 class="mb-0 text-white">
                  <i class="fas fa-bullhorn me-2"></i>
                  Konfigurasi Pengumuman Penutupan
                </h5>
              </div>

              <div class="settings-body p-3 p-md-4">
                <div class="row g-3">
                  <!-- Auto Play Switch (Inline & Compact) -->
                  <div class="col-12 border-bottom pb-3 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 class="mb-0 fw-semibold">Aktifkan Auto Play</h6>
                        <small class="text-muted">Admin Antrian memutar pengumuman otomatis sesuai jam.</small>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.4rem">
                        <input
                          v-model="form.enabled"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="cursor: pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Conditionally show Auto Play details -->
                  <template v-if="form.enabled">
                    <div class="col-md-6 animate-fade-in">
                      <label class="form-label fw-semibold">Jam Auto Play</label>
                      <input v-model="form.time" type="time" class="form-control" @keydown.enter.prevent="saveSettings" />
                      <small class="text-muted">Format 24 jam (Contoh: 20:55)</small>
                    </div>

                    <div class="col-md-6 animate-fade-in">
                      <label class="form-label fw-semibold">Jumlah Pengulangan</label>
                      <input
                        v-model.number="form.repeat"
                        type="number"
                        min="1"
                        max="5"
                        class="form-control"
                        @keydown.enter.prevent="saveSettings"
                      />
                      <small class="text-muted">Jumlah pengulangan (1-5 kali).</small>
                    </div>
                  </template>

                  <!-- Reminder Limits Switch (Inline & Compact) -->
                  <div class="col-12 border-bottom pb-3 pt-2 mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 class="mb-0 fw-semibold">Batas Klik Pengingat Antrian</h6>
                        <small class="text-muted">Membatasi frekuensi pemanggilan tombol Pengingat Antrian.</small>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.4rem">
                        <input
                          v-model="form.reminderLimitEnabled"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="cursor: pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Conditionally show Reminder Limit details -->
                  <template v-if="form.reminderLimitEnabled">
                    <div class="col-md-6 animate-fade-in">
                      <label class="form-label fw-semibold">Batas Pemanggilan</label>
                      <input
                        v-model.number="form.reminderLimitMaxCalls"
                        type="number"
                        min="1"
                        max="20"
                        class="form-control"
                        @keydown.enter.prevent="saveSettings"
                      />
                      <small class="text-muted">Maksimal klik (1-20 kali).</small>
                    </div>

                    <div class="col-md-6 animate-fade-in">
                      <label class="form-label fw-semibold">Batas Durasi (detik)</label>
                      <input
                        v-model.number="form.reminderLimitWindowSeconds"
                        type="number"
                        min="10"
                        max="3600"
                        class="form-control"
                        @keydown.enter.prevent="saveSettings"
                      />
                      <small class="text-muted">Rentang durasi (10-3600 detik).</small>
                    </div>
                  </template>

                  <!-- Message text -->
                  <div class="col-12 pt-2 pb-3">
                    <label class="form-label fw-semibold">Teks Pengumuman</label>
                    <textarea
                      v-model="form.message"
                      rows="3"
                      class="form-control"
                      placeholder="Tulis pesan pengumuman penutupan..."
                    ></textarea>
                    <small class="text-muted">Pesan ini digunakan untuk pemutaran manual dan otomatis.</small>
                  </div>
                </div>

                <div class="meta-info mb-0 pt-3 border-top">
                  <i class="fas fa-clock me-1"></i>
                  Terakhir update:
                  <strong>{{ formattedLastUpdated }}</strong>
                  <span class="mx-2">|</span>
                  Oleh:
                  <strong>{{ form.updatedBy || "-" }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Kuota Pelayanan & TTS (col-lg-4) -->
          <div class="col-lg-4 col-12">
            <!-- Card 3: Kuota Pelayanan -->
            <div class="card settings-card mb-4 border-0">
              <div class="settings-header p-3 text-white">
                <h5 class="mb-0 text-white">
                  <i class="fas fa-users-cog me-2"></i>
                  Kuota Pelayanan (Lantai: {{ auth.activeFloor || 'L1' }})
                </h5>
              </div>
              <div class="settings-body p-3 p-md-4">
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-semibold">Kuota Shift Pagi</label>
                    <input
                      v-model.number="quotaForm.morningJualQuota"
                      type="number"
                      min="1"
                      max="10"
                      class="form-control"
                    />
                    <small class="text-muted">Jumlah default staff Jual pagi.</small>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-semibold">Kuota Shift Sore</label>
                    <input
                      v-model.number="quotaForm.afternoonJualQuota"
                      type="number"
                      min="1"
                      max="10"
                      class="form-control"
                    />
                    <small class="text-muted">Jumlah default staff Jual sore.</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 4: TTS Config -->
            <div class="card settings-card border-0">
              <div class="settings-header p-3 text-white">
                <h5 class="mb-0 text-white">
                  <i class="fas fa-microphone me-2"></i>
                  Pengisi Suara (TTS)
                </h5>
              </div>
              <div class="settings-body p-3 p-md-4">
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-semibold">Layanan TTS</label>
                    <select v-model="form.ttsProvider" class="form-select">
                      <option value="translate">Google Translate Gratis</option>
                      <option value="google_cloud">Google Cloud (Premium)</option>
                    </select>
                  </div>
                  
                  <template v-if="form.ttsProvider === 'google_cloud'">
                    <div class="col-12 animate-fade-in">
                      <label class="form-label fw-semibold">Jenis Suara (ID)</label>
                      <select v-model="form.ttsVoiceName" class="form-select">
                        <option value="id-ID-Standard-A">id-ID-Standard-A (Wanita)</option>
                        <option value="id-ID-Standard-D">id-ID-Standard-D (Wanita)</option>
                        <option value="id-ID-Standard-B">id-ID-Standard-B (Pria)</option>
                        <option value="id-ID-Standard-C">id-ID-Standard-C (Pria)</option>
                        <option value="id-ID-Wavenet-A">id-ID-Wavenet-A (Wanita - Premium)</option>
                        <option value="id-ID-Wavenet-D">id-ID-Wavenet-D (Wanita - Premium)</option>
                        <option value="id-ID-Wavenet-B">id-ID-Wavenet-B (Pria - Premium)</option>
                        <option value="id-ID-Wavenet-C">id-ID-Wavenet-C (Pria - Premium)</option>
                        <option value="id-ID-Neural2-F">id-ID-Neural2-F (Wanita - Ultra Premium)</option>
                        <option value="id-ID-Neural2-B">id-ID-Neural2-B (Pria - Ultra Premium)</option>
                      </select>
                    </div>
                    <div class="col-12 animate-fade-in">
                      <label class="form-label fw-semibold">Pitch ({{ form.ttsPitch >= 0 ? '+' : '' }}{{ form.ttsPitch }} ST)</label>
                      <div class="d-flex align-items-center gap-2">
                        <input
                          v-model.number="form.ttsPitch"
                          type="range"
                          min="-5.0"
                          max="5.0"
                          step="0.1"
                          class="form-range flex-grow-1"
                        />
                        <button class="btn btn-outline-secondary btn-sm" @click="resetTtsPitch">Reset</button>
                      </div>
                    </div>
                    <div class="col-12 animate-fade-in">
                      <label class="form-label fw-semibold">Kecepatan ({{ form.ttsRate }}x)</label>
                      <div class="d-flex align-items-center gap-2">
                        <input
                          v-model.number="form.ttsRate"
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          class="form-range flex-grow-1"
                        />
                        <button class="btn btn-outline-secondary btn-sm" @click="resetTtsRate">Reset</button>
                      </div>
                    </div>
                  </template>
                </div>
                <div class="d-flex justify-content-start mt-3 pt-3 border-top">
                  <button class="btn btn-success w-100 fw-semibold shadow-sm" :disabled="previewing" @click="testTtsVoice">
                    <i class="fas fa-play me-2"></i>
                    Tes Suara Terpilih
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons at bottom -->
        <div class="d-flex flex-wrap gap-2 mt-4 justify-content-between align-items-center bg-white p-3 rounded shadow-sm border">
          <div class="d-flex gap-2">
            <button class="btn btn-primary fw-semibold px-4 py-2" :disabled="saving" @click="saveSettings">
              <i class="fas fa-save me-2"></i>
              {{ saving ? "Menyimpan..." : "Simpan Pengaturan" }}
            </button>
            <button class="btn btn-outline-secondary fw-semibold px-3 py-2" :disabled="saving" @click="resetToDefault">
              <i class="fas fa-undo me-2"></i>
              Reset Default
            </button>
          </div>
          <div>
            <button class="btn btn-success fw-semibold px-3 py-2" :disabled="previewing" @click="testPlay">
              <i class="fas fa-play me-2"></i>
              {{ previewing ? "Memutar..." : "Tes Play Sekarang" }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import Swal from "sweetalert2";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthStore } from "@/stores/auth";
import {
  DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
  ensureClosingAnnouncementSettings,
  fetchClosingAnnouncementSettings,
  normalizeClosingAnnouncementSettings,
  saveClosingAnnouncementSettings,
  subscribeClosingAnnouncementSettings,
} from "@/services/antrian-closing-service";
import {
  fetchQueueQuotaSettings,
  saveQueueQuotaSettings,
  fetchQueueGeneralSettings,
  saveQueueGeneralSettings,
} from "@/services/antrian-service";
import { isAudioBusy, playClosingAnnouncement, primeAudioPlayback, speak } from "@/services/audio-service";

const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const previewing = ref(false);
const form = reactive({ ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS });

const quotaForm = reactive({ morningJualQuota: 2, afternoonJualQuota: 3 });
const generalForm = reactive({ queueMode: "legacy", hybridMode: false });

function resetTtsPitch() {
  form.ttsPitch = 0.0;
}

function resetTtsRate() {
  form.ttsRate = 0.85;
}

async function testTtsVoice() {
  if (isAudioBusy()) return;
  try {
    previewing.value = true;
    primeAudioPlayback();
    await speak(
      "Satu dua tiga, tes suara pengumuman antrean toko emas melati.",
      null,
      1.2,
      {
        provider: form.ttsProvider,
        voiceName: form.ttsVoiceName,
        pitch: form.ttsPitch,
        rate: form.ttsRate
      }
    );
  } finally {
    previewing.value = false;
  }
}

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
  form.ttsProvider = normalized.ttsProvider;
  form.ttsVoiceName = normalized.ttsVoiceName;
  form.ttsPitch = normalized.ttsPitch;
  form.ttsRate = normalized.ttsRate;

  // Sync settings page's local fallback storage immediately
  localStorage.setItem("google_tts_provider", normalized.ttsProvider);
  localStorage.setItem("google_tts_voice_name", normalized.ttsVoiceName);
  localStorage.setItem("google_tts_pitch", String(normalized.ttsPitch));
  localStorage.setItem("google_tts_rate", String(normalized.ttsRate));
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
    ttsProvider: form.ttsProvider,
    ttsVoiceName: form.ttsVoiceName,
    ttsPitch: Number(form.ttsPitch),
    ttsRate: Number(form.ttsRate),
  };
}

async function loadAllSettings() {
  try {
    const floorId = auth.activeFloor || "L1";

    const quotaData = await fetchQueueQuotaSettings(floorId);
    quotaForm.morningJualQuota = quotaData.morningJualQuota || 2;
    quotaForm.afternoonJualQuota = quotaData.afternoonJualQuota || 3;

    const generalData = await fetchQueueGeneralSettings(floorId);
    generalForm.queueMode = generalData.queueMode || "legacy";
    generalForm.hybridMode = generalData.hybridMode || false;
  } catch (error) {
    console.error("Failed to load floor-scoped settings", error);
  }
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
    
    const floorId = auth.activeFloor || "L1";
    // Save Closing Announcement settings
    await saveClosingAnnouncementSettings(
      payload,
      auth.user?.email || auth.user?.username || auth.userRole || "System",
      floorId
    );

    // Save Quota settings
    await saveQueueQuotaSettings(floorId, {
      morningJualQuota: Number(quotaForm.morningJualQuota) || 2,
      afternoonJualQuota: Number(quotaForm.afternoonJualQuota) || 3
    });

    // Save General Queue Mode and Hybrid settings
    await saveQueueGeneralSettings(floorId, {
      queueMode: generalForm.queueMode,
      hybridMode: !!generalForm.hybridMode
    });

    await Swal.fire({
      icon: "success",
      title: "Berhasil",
      text: "Seluruh pengaturan antrian berhasil disimpan.",
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
  
  quotaForm.morningJualQuota = 2;
  quotaForm.afternoonJualQuota = 3;
  generalForm.queueMode = "legacy";
  generalForm.hybridMode = false;
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
    const floorId = auth.activeFloor || "L1";
    await ensureClosingAnnouncementSettings(floorId);
    const data = await fetchClosingAnnouncementSettings(floorId);
    applySettings(data);

    unsubscribeSettings = subscribeClosingAnnouncementSettings((liveData) => {
      applySettings(liveData);
    }, floorId);

    await loadAllSettings();
  } catch (error) {
    console.error(error);
    await Swal.fire({ icon: "error", title: "Gagal Memuat", text: "Pengaturan penutupan antrian gagal dimuat." });
  } finally {
    loading.value = false;
  }
});

watch(() => auth.activeFloor, async (newFloor) => {
  if (!newFloor) return;
  loading.value = true;
  await loadAllSettings();
  
  if (unsubscribeSettings) unsubscribeSettings();
  try {
    await ensureClosingAnnouncementSettings(newFloor);
    const data = await fetchClosingAnnouncementSettings(newFloor);
    applySettings(data);

    unsubscribeSettings = subscribeClosingAnnouncementSettings((liveData) => {
      applySettings(liveData);
    }, newFloor);
  } catch (error) {
    console.error("Failed to re-subscribe closing settings on floor change", error);
  }
  loading.value = false;
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
  background: linear-gradient(135deg, #9d7e2d 0%, #3a2c1c 100%);
}

.settings-body {
  background: #fff;
}

.meta-info {
  font-size: 0.9rem;
  color: #6c757d;
}
</style>
