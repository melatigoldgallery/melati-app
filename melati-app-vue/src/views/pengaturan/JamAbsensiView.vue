<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-alarm me-2 text-dark"></i>
        Setting Jam Absensi
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/users">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Jam Absensi</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <div class="card settings-card">
        <div class="settings-header p-3">
          <h5 class="mb-0">
            <i class="fas fa-cog me-2"></i>
            Pengaturan Sistem Absensi
          </h5>
        </div>

        <div class="settings-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <template v-else>
            <div class="time-input-group">
              <div class="section-header mb-4">
                <h6 class="mb-1">
                  <i class="fas fa-clock me-2"></i>
                  Batas Jam Keterlambatan
                </h6>
                <p class="text-muted small mb-0">
                  Atur waktu maksimal toleransi keterlambatan untuk setiap tipe karyawan dan shift
                </p>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <div class="employee-type-card h-100">
                    <div class="card-header-custom">
                      <i class="fas fa-user me-2"></i>
                      <span>STAFF</span>
                    </div>
                    <div class="card-body-custom">
                      <div class="row g-3">
                        <div class="col-md-6">
                          <div class="time-field">
                            <label>
                              <i class="fas fa-sun text-warning"></i>
                              Shift Pagi
                            </label>
                            <input
                              v-model="form.staff.morning"
                              type="time"
                              class="form-control"
                              @keydown.enter.prevent="save"
                            />
                            <small>
                              <i class="fas fa-info-circle"></i>
                              Masuk: 08:45
                            </small>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="time-field">
                            <label>
                              <i class="fas fa-moon text-info"></i>
                              Shift Sore
                            </label>
                            <input
                              v-model="form.staff.afternoon"
                              type="time"
                              class="form-control"
                              @keydown.enter.prevent="save"
                            />
                            <small>
                              <i class="fas fa-info-circle"></i>
                              Masuk: 14:20
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="employee-type-card h-100">
                    <div class="card-header-custom">
                      <i class="fas fa-broom me-2"></i>
                      <span>OFFICE BOY</span>
                    </div>
                    <div class="card-body-custom">
                      <div class="row g-3">
                        <div class="col-md-6">
                          <div class="time-field">
                            <label>
                              <i class="fas fa-sun text-warning"></i>
                              Shift Pagi
                            </label>
                            <input
                              v-model="form.ob.morning"
                              type="time"
                              class="form-control"
                              @keydown.enter.prevent="save"
                            />
                            <small>
                              <i class="fas fa-info-circle"></i>
                              Masuk: 07:30
                            </small>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="time-field">
                            <label>
                              <i class="fas fa-moon text-info"></i>
                              Shift Sore
                            </label>
                            <input
                              v-model="form.ob.afternoon"
                              type="time"
                              class="form-control"
                              @keydown.enter.prevent="save"
                            />
                            <small>
                              <i class="fas fa-info-circle"></i>
                              Masuk: 13:45
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="time-input-group">
              <div class="section-header mb-4">
                <h6 class="mb-1">
                  <i class="fas fa-face-smile me-2"></i>
                  Verifikasi Wajah
                </h6>
                <p class="text-muted small mb-0">Kontrol keamanan sistem absensi dengan verifikasi wajah karyawan</p>
              </div>

              <div class="master-toggle-section mb-4">
                <div class="card border-0 shadow-sm">
                  <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                      <div class="flex-grow-1">
                        <h6 class="mb-2 fw-bold">
                          <i class="fas fa-power-off text-primary me-2"></i>
                          Master Control
                        </h6>
                        <p class="text-muted small mb-0">Aktifkan atau nonaktifkan seluruh sistem verifikasi wajah</p>
                      </div>
                      <div class="form-check form-switch" style="font-size: 1.8rem">
                        <input
                          v-model="form.faceVerification.enabled"
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          style="width: 1.5em; height: 1em; cursor: pointer"
                          @change="onMasterToggleChange"
                        />
                      </div>
                    </div>

                    <div class="status-indicator">
                      <div v-if="form.faceVerification.enabled" class="badge-container bg-success-subtle">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        <span class="text-success fw-semibold">Verifikasi Wajah AKTIF</span>
                      </div>
                      <div v-else class="badge-container bg-danger-subtle">
                        <i class="fas fa-times-circle text-danger me-2"></i>
                        <span class="text-danger fw-semibold">Verifikasi Wajah NONAKTIF</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="form.faceVerification.enabled" class="rules-section">
                <h6 class="mb-3 fw-semibold">
                  <i class="fas fa-sliders-h text-primary me-2"></i>
                  Konfigurasi Aktivasi
                </h6>
                <p class="text-muted small mb-3">Tentukan kapan verifikasi wajah akan diminta saat proses absensi</p>

                <div class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th width="30%" class="fw-semibold">Tipe Scan</th>
                        <th width="35%" class="text-center fw-semibold">
                          <i class="fas fa-sun text-warning me-1"></i>
                          Shift Pagi
                        </th>
                        <th width="35%" class="text-center fw-semibold">
                          <i class="fas fa-moon text-info me-1"></i>
                          Shift Sore
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="ps-3">
                          <div class="d-flex align-items-center">
                            <div class="icon-box bg-success-subtle me-2">
                              <i class="fas fa-sign-in-alt text-success"></i>
                            </div>
                            <span class="fw-medium">Scan Masuk</span>
                          </div>
                        </td>
                        <td class="text-center">
                          <div class="form-check form-switch d-inline-flex align-items-center">
                            <input
                              v-model="form.faceVerification.rules.checkIn.morning"
                              class="form-check-input me-2"
                              type="checkbox"
                              style="cursor: pointer"
                            />
                            <label class="form-check-label">Aktif</label>
                          </div>
                        </td>
                        <td class="text-center">
                          <div class="form-check form-switch d-inline-flex align-items-center">
                            <input
                              v-model="form.faceVerification.rules.checkIn.afternoon"
                              class="form-check-input me-2"
                              type="checkbox"
                              style="cursor: pointer"
                            />
                            <label class="form-check-label">Aktif</label>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td class="ps-3">
                          <div class="d-flex align-items-center">
                            <div class="icon-box bg-danger-subtle me-2">
                              <i class="fas fa-sign-out-alt text-danger"></i>
                            </div>
                            <span class="fw-medium">Scan Pulang</span>
                          </div>
                        </td>
                        <td class="text-center">
                          <div class="form-check form-switch d-inline-flex align-items-center">
                            <input
                              v-model="form.faceVerification.rules.checkOut.morning"
                              class="form-check-input me-2"
                              type="checkbox"
                              style="cursor: pointer"
                            />
                            <label class="form-check-label">Aktif</label>
                          </div>
                        </td>
                        <td class="text-center">
                          <div class="form-check form-switch d-inline-flex align-items-center">
                            <input
                              v-model="form.faceVerification.rules.checkOut.afternoon"
                              class="form-check-input me-2"
                              type="checkbox"
                              style="cursor: pointer"
                            />
                            <label class="form-check-label">Aktif</label>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="alert alert-info border-0 shadow-sm mb-0">
                  <div class="d-flex">
                    <i class="fas fa-lightbulb fs-5 me-3 text-info"></i>
                    <div>
                      <h6 class="alert-heading mb-2">Rekomendasi Keamanan</h6>
                      <ul class="mb-0 small ps-3">
                        <li class="mb-1">
                          <strong>Disarankan:</strong>
                          Aktifkan untuk
                          <strong>Scan Masuk Shift Pagi</strong>
                          untuk keamanan maksimal
                        </li>
                        <li class="mb-1">Jika master toggle OFF, semua verifikasi wajah akan otomatis di-bypass</li>
                        <li class="mb-0">
                          Perubahan berlaku
                          <strong>real-time</strong>
                          di semua perangkat absensi
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="alert alert-warning border-0 shadow-sm mb-0">
                <div class="d-flex">
                  <i class="fas fa-exclamation-triangle fs-5 me-3 text-warning"></i>
                  <div>
                    <h6 class="alert-heading mb-2">Peringatan Keamanan</h6>
                    <p class="mb-0">
                      Verifikasi wajah saat ini
                      <strong>dinonaktifkan</strong>
                      . Semua proses absensi akan dilakukan
                      <strong>TANPA verifikasi wajah</strong>
                      . Aktifkan kembali untuk meningkatkan keamanan sistem absensi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
              <button type="button" class="btn btn-outline-secondary px-4" :disabled="saving" @click="resetToDefault">
                <i class="fas fa-undo-alt me-2"></i>
                Reset ke Default
              </button>
              <button type="button" class="btn btn-primary px-4 shadow-sm" :disabled="saving" @click="save">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="fas fa-save me-2"></i>
                Simpan Pengaturan
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="loading-overlay" :class="{ active: saving }">
      <div class="text-center">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted mb-0">Menyimpan pengaturan...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from "vue";
import Swal from "sweetalert2";
import { useAlert } from "@/composables/useAlert";
import {
  ensureAttendanceSettings,
  fetchAttendanceSettings,
  saveAttendanceSettings,
  subscribeAttendanceSettings,
} from "@/services/absensi-service";

const { error: showError } = useAlert();

const DEFAULT_SETTINGS = {
  staff: { morning: "09:00", afternoon: "14:21" },
  ob: { morning: "07:31", afternoon: "13:46" },
  faceVerification: {
    enabled: true,
    rules: {
      checkIn: { morning: true, afternoon: false },
      checkOut: { morning: false, afternoon: false },
    },
  },
};

const loading = ref(true);
const saving = ref(false);
const form = reactive(structuredClone(DEFAULT_SETTINGS));

let unsubscribeSettings = null;

function applySettings(payload = {}) {
  const s = {
    ...DEFAULT_SETTINGS,
    ...payload,
    staff: { ...DEFAULT_SETTINGS.staff, ...(payload.staff || {}) },
    ob: { ...DEFAULT_SETTINGS.ob, ...(payload.ob || {}) },
    faceVerification: {
      ...DEFAULT_SETTINGS.faceVerification,
      ...(payload.faceVerification || {}),
      rules: {
        ...DEFAULT_SETTINGS.faceVerification.rules,
        ...(payload.faceVerification?.rules || {}),
        checkIn: {
          ...DEFAULT_SETTINGS.faceVerification.rules.checkIn,
          ...(payload.faceVerification?.rules?.checkIn || {}),
        },
        checkOut: {
          ...DEFAULT_SETTINGS.faceVerification.rules.checkOut,
          ...(payload.faceVerification?.rules?.checkOut || {}),
        },
      },
    },
  };

  form.staff.morning = s.staff.morning;
  form.staff.afternoon = s.staff.afternoon;
  form.ob.morning = s.ob.morning;
  form.ob.afternoon = s.ob.afternoon;
  form.faceVerification.enabled = !!s.faceVerification.enabled;
  form.faceVerification.rules.checkIn.morning = !!s.faceVerification.rules.checkIn.morning;
  form.faceVerification.rules.checkIn.afternoon = !!s.faceVerification.rules.checkIn.afternoon;
  form.faceVerification.rules.checkOut.morning = !!s.faceVerification.rules.checkOut.morning;
  form.faceVerification.rules.checkOut.afternoon = !!s.faceVerification.rules.checkOut.afternoon;
}

function timeToMinutes(timeValue) {
  const [h, m] = String(timeValue || "")
    .split(":")
    .map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function validateInputs() {
  const required = [form.staff.morning, form.staff.afternoon, form.ob.morning, form.ob.afternoon];
  if (required.some((v) => !v)) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Semua field waktu harus diisi!",
    });
    return false;
  }

  const staffMorning = timeToMinutes(form.staff.morning);
  const staffAfternoon = timeToMinutes(form.staff.afternoon);
  const obMorning = timeToMinutes(form.ob.morning);
  const obAfternoon = timeToMinutes(form.ob.afternoon);

  if (staffAfternoon <= staffMorning) {
    Swal.fire({
      icon: "warning",
      title: "Waktu Tidak Valid",
      text: "Jam shift sore Staff harus lebih besar dari shift pagi!",
    });
    return false;
  }

  if (obAfternoon <= obMorning) {
    Swal.fire({
      icon: "warning",
      title: "Waktu Tidak Valid",
      text: "Jam shift sore OB harus lebih besar dari shift pagi!",
    });
    return false;
  }

  return true;
}

function buildFaceVerificationSummary(faceVerification) {
  if (!faceVerification.enabled) {
    return '<p class="text-danger"><i class="fas fa-times-circle"></i> <strong>NONAKTIF</strong> - Semua absensi tanpa verifikasi wajah</p>';
  }

  const activeRules = [];
  if (faceVerification.rules.checkIn.morning)
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Masuk - Shift Pagi</li>');
  if (faceVerification.rules.checkIn.afternoon)
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Masuk - Shift Sore</li>');
  if (faceVerification.rules.checkOut.morning)
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Pulang - Shift Pagi</li>');
  if (faceVerification.rules.checkOut.afternoon)
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Pulang - Shift Sore</li>');

  if (!activeRules.length) {
    return '<p class="text-warning"><i class="fas fa-exclamation-circle"></i> <strong>AKTIF</strong> tapi tidak ada rule yang dicentang</p>';
  }

  return `
    <p class="text-success mb-2"><i class="fas fa-check-circle"></i> <strong>AKTIF</strong> untuk:</p>
    <ul class="mb-0">${activeRules.join("")}</ul>
  `;
}

function buildPayload(updatedBy = "Admin") {
  const now = new Date().toISOString();
  return {
    staff: {
      morning: form.staff.morning,
      afternoon: form.staff.afternoon,
    },
    ob: {
      morning: form.ob.morning,
      afternoon: form.ob.afternoon,
    },
    faceVerification: {
      enabled: form.faceVerification.enabled,
      rules: {
        checkIn: {
          morning: form.faceVerification.rules.checkIn.morning,
          afternoon: form.faceVerification.rules.checkIn.afternoon,
        },
        checkOut: {
          morning: form.faceVerification.rules.checkOut.morning,
          afternoon: form.faceVerification.rules.checkOut.afternoon,
        },
      },
      lastUpdated: now,
      updatedBy,
    },
    lastUpdated: now,
    updatedBy,
  };
}

async function onMasterToggleChange(event) {
  if (event.target.checked) return;
  const result = await Swal.fire({
    icon: "warning",
    title: "Nonaktifkan Verifikasi Wajah?",
    text: "Semua absensi akan diproses TANPA verifikasi wajah. Anda yakin?",
    showCancelButton: true,
    confirmButtonText: "Ya, Nonaktifkan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
  });
  if (!result.isConfirmed) {
    form.faceVerification.enabled = true;
  }
}

async function save() {
  if (saving.value || !validateInputs()) return;
  saving.value = true;
  const payload = buildPayload("Admin");

  try {
    await saveAttendanceSettings(payload);
    // Stop overlay before showing success modal to avoid blocking SweetAlert.
    saving.value = false;
    const fvSummary = buildFaceVerificationSummary(payload.faceVerification);
    await Swal.fire({
      icon: "success",
      title: "Berhasil!",
      html: `
        <div class="text-start">
          <p><strong>Pengaturan telah disimpan:</strong></p>
          <h6 class="mt-3 mb-2">Jam Absensi:</h6>
          <ul style="list-style: none; padding-left: 0;">
            <li><i class="fas fa-user text-primary"></i> Staff Pagi: <strong>${payload.staff.morning}</strong></li>
            <li><i class="fas fa-user text-primary"></i> Staff Sore: <strong>${payload.staff.afternoon}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Pagi: <strong>${payload.ob.morning}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Sore: <strong>${payload.ob.afternoon}</strong></li>
          </ul>
          <h6 class="mt-3 mb-2">Verifikasi Wajah:</h6>
          ${fvSummary}
          <p class="text-muted mt-3 mb-0">
            <small><i class="fas fa-sync-alt"></i> Perubahan berlaku real-time di semua perangkat</small>
          </p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "OK",
    });
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

async function resetToDefault() {
  if (saving.value) return;
  const result = await Swal.fire({
    icon: "question",
    title: "Reset ke Default?",
    html: `
      <p>Anda akan mereset pengaturan ke nilai default:</p>
      <ul style="list-style: none; padding-left: 0;">
        <li><i class="fas fa-user text-primary"></i> Staff Pagi: <strong>${DEFAULT_SETTINGS.staff.morning}</strong></li>
        <li><i class="fas fa-user text-primary"></i> Staff Sore: <strong>${DEFAULT_SETTINGS.staff.afternoon}</strong></li>
        <li><i class="fas fa-broom text-info"></i> OB Pagi: <strong>${DEFAULT_SETTINGS.ob.morning}</strong></li>
        <li><i class="fas fa-broom text-info"></i> OB Sore: <strong>${DEFAULT_SETTINGS.ob.afternoon}</strong></li>
      </ul>
    `,
    showCancelButton: true,
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
  });

  if (!result.isConfirmed) return;

  saving.value = true;
  try {
    const payload = {
      ...DEFAULT_SETTINGS,
      faceVerification: {
        ...DEFAULT_SETTINGS.faceVerification,
        lastUpdated: new Date().toISOString(),
        updatedBy: "Admin (Reset)",
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: "Admin (Reset)",
    };
    await saveAttendanceSettings(payload);
    // Stop overlay before showing success modal to avoid blocking SweetAlert.
    saving.value = false;
    await Swal.fire({
      icon: "success",
      title: "Reset Berhasil!",
      text: "Pengaturan telah dikembalikan ke nilai default",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (e) {
    showError("Gagal reset", e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    await ensureAttendanceSettings();
    const initial = await fetchAttendanceSettings();
    applySettings(initial);
    unsubscribeSettings = subscribeAttendanceSettings((settings) => {
      applySettings(settings);
      loading.value = false;
    });
  } catch (e) {
    showError("Gagal memuat pengaturan", e.message);
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (unsubscribeSettings) unsubscribeSettings();
});
</script>

<style scoped>
.settings-card {
  border: none;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.settings-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 0.95rem;
}

.settings-header h5 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
}

.settings-body {
  padding: 2rem;
}

.section-header h6 {
  color: #2c3e50;
  font-weight: 700;
  font-size: 1rem;
}

.time-input-group {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e9ecef;
}

.employee-type-card {
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e9ecef;
  transition: all 0.3s ease;
}

.employee-type-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.card-header-custom {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 1.25rem;
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.card-body-custom {
  padding: 1.25rem;
}

.time-field label {
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.time-field input {
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  padding: 0.625rem 0.875rem;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  font-weight: 500;
}

.time-field input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.15);
}

.time-field small {
  color: #6c757d;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
}

.loading-overlay.active {
  display: flex;
}

.master-toggle-section .card {
  transition: all 0.3s ease;
}

.master-toggle-section .card:hover {
  transform: translateY(-2px);
}

.form-check-input:checked {
  background-color: #667eea;
  border-color: #667eea;
}

.form-check-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25);
}

.table-hover tbody tr:hover {
  background-color: rgba(102, 126, 234, 0.05);
}

.icon-box {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.bg-success-subtle {
  background-color: rgba(25, 135, 84, 0.1);
}

.bg-danger-subtle {
  background-color: rgba(220, 53, 69, 0.1);
}

.badge-container {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
}

.rules-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .settings-body {
    padding: 1rem;
  }
}
</style>
