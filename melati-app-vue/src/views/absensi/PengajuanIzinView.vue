<template>
  <div class="page-content">
    <!-- Page Header -->
    <div class="page-header">
      <h1>
        <i class="bi bi-journal-plus me-2 text-dark"></i>
        Pengajuan Izin Staff
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/absensi/kehadiran">Absensi</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Pengajuan Izin</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <!-- Feedback Alert -->
      <div
        v-if="feedback.visible"
        class="alert feedback-popup"
        :class="`alert-${feedback.bsType}`"
        :style="{ borderLeft: `5px solid ${feedback.borderColor}` }"
        v-html="feedback.message"
      ></div>

      <!-- Form Card -->
      <div class="card">
        <div class="card-header">
          <h2>
            <i class="fas fa-file-alt"></i>
            Form Pengajuan Izin
          </h2>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <!-- Employee ID -->
            <div class="col-md-4">
              <label class="form-label">ID Karyawan</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-id-card"></i></span>
                <input
                  v-model="employeeIdInput"
                  type="text"
                  class="form-control"
                  placeholder="Masukkan ID Karyawan"
                  @keydown.enter="lookupEmployee"
                />
                <span v-if="lookingUp" class="input-group-text">
                  <span class="spinner-border spinner-border-sm"></span>
                </span>
              </div>
              <div class="form-text">Masukkan ID karyawan yang terdaftar di sistem</div>
              <div v-if="employee" class="mt-1">
                <span class="badge bg-success">{{ employee.name }}</span>
              </div>
            </div>

            <!-- Start Date -->
            <div class="col-md-4">
              <label class="form-label">Tanggal Mulai Izin</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-calendar-alt"></i></span>
                <input v-model="form.leaveStartDate" type="date" class="form-control" />
              </div>
              <div class="form-text">Untuk izin 1 hari, isi tanggal yang sama</div>
            </div>

            <!-- End Date -->
            <div class="col-md-4">
              <label class="form-label">Tanggal Selesai Izin</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-calendar-alt"></i></span>
                <input v-model="form.leaveEndDate" type="date" class="form-control" :min="form.leaveStartDate" />
              </div>
            </div>

            <!-- Reason -->
            <div class="col-12 col-md-4 ">
              <label class="form-label">Alasan Izin</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-comment-alt"></i></span>
                <textarea
                  v-model="form.reason"
                  class="form-control"
                  rows="3"
                  placeholder="Jelaskan alasan izin Anda secara detail"
                ></textarea>
              </div>
            </div>

            <!-- Leave Type -->
            <div class="col-md-4">
              <label class="form-label">Jenis Izin</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-tag"></i></span>
                <select v-model="form.leaveType" class="form-select">
                  <option value="" disabled>Pilih Jenis Izin</option>
                  <option value="normal">Selain Sakit &amp; Cuti</option>
                  <option value="sakit">Izin Sakit</option>
                  <option value="cuti">Cuti</option>
                </select>
              </div>
              <div class="form-text">Pilih jenis izin yang sesuai</div>
            </div>

            <!-- Replacement Type -->
            <div class="col-md-4">
              <label class="form-label">Jenis Pengganti</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-exchange-alt"></i></span>
                <select v-model="form.replacementType" class="form-select" :disabled="replacementDisabled">
                  <option value="" disabled>Pilih Jenis Pengganti</option>
                  <option value="libur" :disabled="form.leaveType === 'cuti'">Ganti Libur</option>
                  <option value="jam" :disabled="form.leaveType === 'cuti'">Ganti Jam</option>
                  <option
                    value="tidak"
                    :disabled="form.leaveType === 'normal' || (form.leaveType === 'sakit' && !hasMedicalCert)"
                  >
                    Tidak Perlu Diganti
                  </option>
                </select>
              </div>
              <div class="form-text">Pilih bagaimana Anda akan mengganti waktu izin</div>
            </div>

            <!-- Sick Leave Section -->
            <div v-if="form.leaveType === 'sakit'" class="col-12">
              <div class="card mt-1">
                <div class="card-body">
                  <h6 class="mb-3">
                    <i class="fas fa-file-medical me-2"></i>
                    Detail Surat Keterangan Sakit
                  </h6>
                  <div class="mb-3">
                    <div class="form-check">
                      <input
                        v-model="hasMedicalCert"
                        type="checkbox"
                        class="form-check-input"
                        id="hasMedicalCertificate"
                      />
                      <label class="form-check-label" for="hasMedicalCertificate">
                        Saya memiliki surat keterangan sakit
                      </label>
                    </div>
                  </div>
                  <div v-if="hasMedicalCert" class="mb-3">
                    <label class="form-label">Unggah Surat Keterangan Sakit</label>
                    <input
                      type="file"
                      class="form-control"
                      accept="image/jpeg,image/png,image/jpg,image/heic,image/heif,application/pdf"
                      @change="onMedicalFileChange"
                    />
                    <div class="form-text">
                      Format yang diterima: JPG, PNG, HEIC, PDF (Maks. 2MB, gambar dikonversi ke JPG)
                    </div>
                    <div v-if="uploadProgress > 0 && uploadProgress < 100" class="progress mt-2">
                      <div
                        class="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        :style="{ width: uploadProgress + '%' }"
                      ></div>
                    </div>
                    <!-- File Preview -->
                    <div v-if="medicalFile" class="mt-2 card">
                      <div class="card-body p-2">
                        <div class="d-flex align-items-center">
                          <i class="fas fa-file-medical me-2 text-primary"></i>
                          <span>{{ medicalFile.name }}</span>
                          <button
                            type="button"
                            class="btn btn-sm btn-link text-danger ms-auto"
                            @click="removeMedicalFile"
                          >
                            <i class="fas fa-times"></i>
                            Hapus
                          </button>
                        </div>
                        <div v-if="medicalFilePreview && medicalFile.type.startsWith('image/')" class="mt-2">
                          <img :src="medicalFilePreview" class="img-fluid img-thumbnail" style="max-height: 150px" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cuti Section -->
            <div v-if="form.leaveType === 'cuti'" class="col-12">
              <div class="card mt-1">
                <div class="card-body">
                  <h6 class="mb-3">
                    <i class="fas fa-umbrella-beach me-2"></i>
                    Detail Cuti
                  </h6>
                  <div class="mb-3">
                    <label class="form-label">Jenis Cuti</label>
                    <div class="form-check">
                      <input
                        v-model="cutiType"
                        class="form-check-input"
                        type="radio"
                        name="leaveTypeRadio"
                        id="specialLeave"
                        value="special"
                      />
                      <label class="form-check-label" for="specialLeave">Cuti Khusus</label>
                    </div>
                  </div>
                  <div v-if="cutiType === 'special'" class="mb-3">
                    <label class="form-label">Alasan Cuti Khusus</label>
                    <select v-model="specialLeaveDetail" class="form-select">
                      <option value="" disabled>Pilih Alasan Cuti Khusus</option>
                      <option value="marriage">Pernikahan</option>
                      <option value="childbirth">Kelahiran Anak</option>
                      <option value="bereavement">Kedukaan</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Replacement Libur Section -->
            <div v-if="form.replacementType === 'libur'" class="col-12">
              <div class="card mt-0">
                <div class="card-body">
                  <h6 class="mb-3">
                    <i class="fas fa-calendar-day me-2"></i>
                    Detail Ganti Libur
                  </h6>
                  <div v-if="replacementDates.length > 1" class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Anda mengajukan izin untuk
                    <strong>{{ replacementDates.length }} hari</strong>
                    . Silakan pilih tanggal ganti libur untuk setiap hari.
                  </div>
                  <div v-for="(rd, i) in replacementDates" :key="i" class="mb-3">
                    <label class="form-label">
                      <strong>{{ rd.leaveFormatted }}</strong>
                    </label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="fas fa-calendar-check"></i></span>
                      <input v-model="rd.replacementDate" type="date" class="form-control" />
                    </div>
                    <div class="form-text text-muted">
                      Pilih tanggal pengganti untuk izin tanggal {{ rd.leaveDate }}
                    </div>
                  </div>
                  <div v-if="replacementDates.length === 0" class="text-muted small">
                    Isi tanggal mulai dan selesai izin terlebih dahulu.
                  </div>
                </div>
              </div>
            </div>

            <!-- Replacement Jam Section -->
            <div v-if="form.replacementType === 'jam'" class="col-12">
              <div class="card mt-2">
                <div class="card-body">
                  <h6 class="mb-3">
                    <i class="fas fa-clock me-2"></i>
                    Detail Ganti Waktu
                  </h6>
                  <div class="mb-3">
                    <label class="form-label">Tanggal Ganti Waktu</label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="fas fa-calendar-check"></i></span>
                      <input v-model="replacementJam.date" type="date" class="form-control" />
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Durasi Pengganti</label>
                    <div class="input-group">
                      <span class="input-group-text"><i class="fas fa-hourglass-half"></i></span>
                      <input
                        v-model.number="replacementJam.value"
                        type="number"
                        class="form-control"
                        :max="replacementJam.unit === 'jam' ? 12 : 300"
                        min="1"
                        placeholder="Masukkan durasi"
                      />
                      <select v-model="replacementJam.unit" class="form-select" style="max-width: 100px">
                        <option value="jam">jam</option>
                        <option value="menit">menit</option>
                      </select>
                    </div>
                    <div class="form-text">
                      {{ replacementJam.unit === "jam" ? "Maksimal 12 jam per hari" : "Maksimal 300 menit per hari" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="col-12 d-flex gap-2 mt-2">
              <button class="btn btn-sm btn-primary" @click="submitForm" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="fas fa-paper-plane me-2"></i>
                Ajukan Izin
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click="resetForm" :disabled="submitting">
                <i class="fas fa-undo me-2"></i>
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Information Card -->
      <div class="card">
        <div class="card-header">
          <h2>
            <i class="fas fa-info-circle"></i>
            Informasi Pengajuan Izin
          </h2>
        </div>
        <div class="card-body">
          <div class="alert alert-info">
            <h6 class="alert-heading">
              <i class="fas fa-lightbulb me-2"></i>
              Petunjuk Pengajuan:
            </h6>
            <ul class="mb-0">
              <li>Pastikan alasan izin dijelaskan dengan detail</li>
              <li>Pengajuan akan segera diproses oleh HRD melati</li>
              <li>Status pengajuan dapat dilihat di menu "Laporan Izin"</li>
            </ul>
          </div>
          <div class="row mt-4 d-flex ">
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="fas fa-calendar-day me-2 text-primary"></i>
                    Ganti Libur
                  </h5>
                  <p class="card-text">
                    Digunakan untuk mengganti hari izin dengan bekerja di hari libur Anda. Pastikan tanggal pengganti
                    sudah dikonfirmasi dengan HRD.
                  </p>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">
                    <i class="fas fa-clock me-2 text-primary"></i>
                    Ganti Jam
                  </h5>
                  <p class="card-text">
                    Digunakan untuk mengganti jam kerja dengan bekerja lebih lama di hari yang ditentukan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import Swal from "sweetalert2";
import { useWITA } from "@/composables/useWITA";
import {
  findEmployeeByCode,
  submitLeaveRequest,
  uploadMedicalCertificate,
} from "@/services/absensi-service";

const { todayStringWITA } = useWITA();

// ── Employee ──────────────────────────────────────────────────────────────
const employeeIdInput = ref("");
const lookingUp = ref(false);
const employee = ref(null);
let lookupDebounceTimer = null;
let lookupRequestCounter = 0;

// ── Form ──────────────────────────────────────────────────────────────────
const form = ref({
  leaveStartDate: todayStringWITA(),
  leaveEndDate: todayStringWITA(),
  leaveType: "",
  replacementType: "",
  reason: "",
});

// ── Conditional state ─────────────────────────────────────────────────────
const hasMedicalCert = ref(false);
const medicalFile = ref(null);
const medicalFilePreview = ref(null);
const uploadProgress = ref(0);
const cutiType = ref("");
const specialLeaveDetail = ref("");
const replacementDates = ref([]); // [{ leaveDate, leaveFormatted, replacementDate }]
const replacementJam = ref({ date: "", value: "", unit: "jam" });

// ── Submission ────────────────────────────────────────────────────────────
const submitting = ref(false);

// ── Feedback ──────────────────────────────────────────────────────────────
const feedback = ref({ visible: false, bsType: "success", borderColor: "#198754", message: "" });
let feedbackTimer = null;

function showFeedback(type, message, autoHide = true) {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  const map = {
    success: { bsType: "success", borderColor: "#198754" },
    error: { bsType: "danger", borderColor: "#dc3545" },
    warning: { bsType: "warning", borderColor: "#ffc107" },
    info: { bsType: "info", borderColor: "#0dcaf0" },
  };
  feedback.value = { visible: true, message, ...(map[type] || map.info) };
  if (autoHide) {
    feedbackTimer = setTimeout(() => (feedback.value.visible = false), 5000);
  }
}

// ── Computed ──────────────────────────────────────────────────────────────
const replacementDisabled = computed(
  () => form.value.leaveType === "cuti" || (form.value.leaveType === "sakit" && hasMedicalCert.value),
);

// ── Watchers ──────────────────────────────────────────────────────────────

/** Reset conditional state when leaveType changes. */
watch(
  () => form.value.leaveType,
  (val) => {
    form.value.replacementType = val === "cuti" ? "tidak" : "";
    hasMedicalCert.value = false;
    medicalFile.value = null;
    medicalFilePreview.value = null;
    cutiType.value = "";
    specialLeaveDetail.value = "";
  },
);

/** Auto-set replacementType when medical cert checkbox changes. */
watch(hasMedicalCert, (val) => {
  if (form.value.leaveType === "sakit") {
    form.value.replacementType = val ? "tidak" : "";
  }
  if (!val) {
    medicalFile.value = null;
    medicalFilePreview.value = null;
    uploadProgress.value = 0;
  }
});

/** Rebuild replacement dates array when dates or replacementType changes. */
watch(
  [() => form.value.leaveStartDate, () => form.value.leaveEndDate, () => form.value.replacementType],
  () => {
    if (form.value.replacementType !== "libur" || !form.value.leaveStartDate || !form.value.leaveEndDate) {
      replacementDates.value = [];
      return;
    }
    const start = new Date(form.value.leaveStartDate + "T00:00:00");
    const end = new Date(form.value.leaveEndDate + "T00:00:00");
    if (start > end) {
      replacementDates.value = [];
      return;
    }

    const cur = new Date(start);
    const newDates = [];
    while (cur <= end) {
      const dateStr = cur.toISOString().split("T")[0];
      const existing = replacementDates.value.find((d) => d.leaveDate === dateStr);
      newDates.push({
        leaveDate: dateStr,
        leaveFormatted: cur.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        replacementDate: existing?.replacementDate ?? "",
      });
      cur.setDate(cur.getDate() + 1);
    }
    replacementDates.value = newDates;
  },
  { immediate: true },
);

// ── Employee lookup ───────────────────────────────────────────────────────
async function lookupEmployee(silentNotFound = false) {
  const code = employeeIdInput.value.trim();
  if (code.length < 6) return;
  const requestId = ++lookupRequestCounter;
  lookingUp.value = true;
  try {
    const emp = await findEmployeeByCode(code);
    if (requestId !== lookupRequestCounter) return;
    if (!emp) {
      if (!silentNotFound) showFeedback("error", "ID Karyawan tidak ditemukan!");
      employee.value = null;
      return;
    }
    employee.value = emp;
  } catch (e) {
    showFeedback("error", `Gagal mencari karyawan: ${e.message}`);
  } finally {
    lookingUp.value = false;
  }
}

/** Auto verify employee ID when user finishes typing (min 6 chars). */
watch(employeeIdInput, (val) => {
  if (lookupDebounceTimer) clearTimeout(lookupDebounceTimer);

  const code = (val || "").trim();
  if (code.length < 6) {
    employee.value = null;
    return;
  }

  lookupDebounceTimer = setTimeout(() => {
    lookupEmployee(true);
  }, 400);
});

// ── File handling ─────────────────────────────────────────────────────────
function getFileExtension(name = "") {
  const clean = String(name || "").trim();
  if (!clean.includes(".")) return "";
  return clean.split(".").pop().toLowerCase();
}

function isPdfFile(file) {
  return file?.type === "application/pdf" || getFileExtension(file?.name) === "pdf";
}

function isSupportedImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = getFileExtension(file?.name);
  const allowedType = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];
  const allowedExt = ["jpg", "jpeg", "png", "heic", "heif"];
  return allowedType.includes(type) || allowedExt.includes(ext);
}

async function normalizeImageToJpg(file, maxWidth = 1200, quality = 0.78) {
  if (!file || !isSupportedImageFile(file)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Browser tidak dapat membaca file gambar ini."));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    let { width, height } = img;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Gagal mengubah gambar ke JPG."));
            return;
          }
          resolve(b);
        },
        "image/jpeg",
        quality,
      );
    });

    const baseName = String(file.name || "surat-sakit").replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function onMedicalFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) {
    medicalFile.value = null;
    medicalFilePreview.value = null;
    return;
  }

  try {
    if (isPdfFile(file)) {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Ukuran file PDF melebihi 2MB. Silakan pilih file yang lebih kecil.");
      }
      medicalFile.value = file;
      medicalFilePreview.value = null;
      return;
    }

    if (!isSupportedImageFile(file)) {
      throw new Error("Format file tidak didukung. Gunakan JPG, PNG, HEIC, atau PDF.");
    }

    const isHeicLike =
      ["heic", "heif"].includes(getFileExtension(file.name)) ||
      ["image/heic", "image/heif"].includes(String(file.type || "").toLowerCase());
    const normalized = await normalizeImageToJpg(file, 1200, isHeicLike ? 0.72 : 0.78);

    if (normalized.size > 2 * 1024 * 1024) {
      throw new Error("Ukuran gambar setelah konversi masih di atas 2MB. Gunakan gambar dengan resolusi lebih kecil.");
    }

    medicalFile.value = normalized;
    const reader = new FileReader();
    reader.onload = (ev) => (medicalFilePreview.value = ev.target.result);
    reader.readAsDataURL(normalized);
  } catch (error) {
    medicalFile.value = null;
    medicalFilePreview.value = null;
    e.target.value = "";
    showFeedback("error", error?.message || "Gagal memproses file surat sakit.");
  }
}

function removeMedicalFile() {
  medicalFile.value = null;
  medicalFilePreview.value = null;
  uploadProgress.value = 0;
}

// ── Validation ────────────────────────────────────────────────────────────
function validate() {
  if (!employee.value) {
    showFeedback("error", "Masukkan ID karyawan terlebih dahulu!");
    return false;
  }
  if (!form.value.leaveStartDate || !form.value.leaveEndDate) {
    showFeedback("error", "Tanggal mulai dan selesai wajib diisi!");
    return false;
  }
  if (new Date(form.value.leaveStartDate) > new Date(form.value.leaveEndDate)) {
    showFeedback("error", "Tanggal mulai tidak boleh lebih besar dari tanggal selesai!");
    return false;
  }
  if (!form.value.reason.trim()) {
    showFeedback("error", "Alasan izin wajib diisi!");
    return false;
  }
  if (!form.value.leaveType) {
    showFeedback("error", "Pilih jenis izin terlebih dahulu!");
    return false;
  }
  if (!form.value.replacementType) {
    showFeedback("error", "Pilih jenis pengganti terlebih dahulu!");
    return false;
  }
  if (form.value.replacementType === "libur") {
    const hasEmpty = replacementDates.value.some((rd) => !rd.replacementDate);
    if (hasEmpty) {
      showFeedback("error", "Mohon isi semua tanggal ganti libur!");
      return false;
    }
  }
  if (form.value.replacementType === "jam") {
    if (!replacementJam.value.date || !replacementJam.value.value) {
      showFeedback("error", "Mohon lengkapi tanggal dan durasi pengganti!");
      return false;
    }
    const v = Number(replacementJam.value.value);
    if (replacementJam.value.unit === "jam" && v > 12) {
      showFeedback("error", "Jumlah jam maksimal adalah 12 jam per hari!");
      return false;
    }
    if (replacementJam.value.unit === "menit" && v > 300) {
      showFeedback("error", "Jumlah menit maksimal adalah 300 menit per hari!");
      return false;
    }
  }
  return true;
}

// ── Submit ────────────────────────────────────────────────────────────────
async function submitForm() {
  if (!validate()) return;

  submitting.value = true;
  uploadProgress.value = 0;

  try {
    const emp = employee.value;
    const { leaveStartDate, leaveEndDate, leaveType, replacementType, reason } = form.value;
    const dayCount = Math.round((new Date(leaveEndDate) - new Date(leaveStartDate)) / 86400000) + 1;

    // Build replacementDetails
    let replacementDetails = { type: replacementType, needReplacement: replacementType !== "tidak" };
    let medicalCertInfo = null;

    if (leaveType === "sakit") {
      replacementDetails.hasMedicalCertificate = hasMedicalCert.value;
      if (hasMedicalCert.value && medicalFile.value) {
        showFeedback("info", '<i class="fas fa-upload me-2"></i> Mengunggah surat keterangan sakit...', false);
        let fileToUpload = medicalFile.value;
        if (fileToUpload.type.startsWith("image/")) {
          try {
            const quality = fileToUpload.size > 1024 * 1024 ? 0.72 : 0.8;
            fileToUpload = await normalizeImageToJpg(fileToUpload, 1200, quality);
          } catch (err) {
            throw new Error(err?.message || "Gagal menyiapkan gambar surat sakit sebelum upload.");
          }
        }
        if (fileToUpload.size > 2 * 1024 * 1024) {
          throw new Error("Ukuran file surat sakit melebihi 2MB setelah diproses.");
        }
        medicalCertInfo = await uploadMedicalCertificate(
          fileToUpload,
          emp.employeeId,
          emp.name,
          (p) => (uploadProgress.value = p),
        );
      }
      replacementDetails.medicalCertificateFile = medicalCertInfo;
    } else if (leaveType === "cuti") {
      replacementDetails = {
        type: "cuti",
        needReplacement: false,
        cutiType: cutiType.value,
        specialReason: specialLeaveDetail.value,
      };
    }

    if (replacementType === "libur") {
      replacementDetails.dates = replacementDates.value.map((rd) => ({
        date: rd.replacementDate,
        formattedDate: new Date(rd.replacementDate).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }));
    } else if (replacementType === "jam") {
      const v = Number(replacementJam.value.value);
      replacementDetails.date = replacementJam.value.date;
      replacementDetails.timeUnit = replacementJam.value.unit;
      replacementDetails.timeValue = v;
      replacementDetails.formattedValue = `${v} ${replacementJam.value.unit}`;
    }

    const startParts = leaveStartDate.split("-");
    await submitLeaveRequest({
      employeeId: emp.employeeId,
      name: emp.name,
      leaveStartDate,
      leaveEndDate,
      leaveDate:
        dayCount > 1
          ? `${new Date(leaveStartDate).toLocaleDateString("id-ID")} s/d ${new Date(leaveEndDate).toLocaleDateString("id-ID")}`
          : new Date(leaveStartDate).toLocaleDateString("id-ID"),
      rawLeaveDate: leaveStartDate,
      month: parseInt(startParts[1]),
      year: parseInt(startParts[0]),
      reason: reason.trim(),
      leaveType,
      replacementType,
      replacementDetails,
      isMultiDay: dayCount > 1,
      dayCount,
      submissionDate: new Date().toISOString(),
    });

    resetForm();
    await Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Pengajuan izin berhasil diajukan.",
      confirmButtonColor: "#f8961e",
      timer: 3000,
      timerProgressBar: true,
    });
  } catch (e) {
    await Swal.fire({
      icon: "error",
      title: "Gagal!",
      text: e.message || "Terjadi kesalahan. Silakan coba lagi.",
      confirmButtonColor: "#f8961e",
    });
  } finally {
    submitting.value = false;
    uploadProgress.value = 0;
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────
function resetForm() {
  form.value = {
    leaveStartDate: todayStringWITA(),
    leaveEndDate: todayStringWITA(),
    leaveType: "",
    replacementType: "",
    reason: "",
  };
  hasMedicalCert.value = false;
  medicalFile.value = null;
  medicalFilePreview.value = null;
  uploadProgress.value = 0;
  cutiType.value = "";
  specialLeaveDetail.value = "";
  replacementDates.value = [];
  replacementJam.value = { date: "", value: "", unit: "jam" };
  feedback.value.visible = false;
}

</script>

<style scoped>
.feedback-popup {
  position: sticky;
  top: 20px;
  z-index: 1050;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  font-weight: 500;
}

.page-header h1 {
  font-size: clamp(1.15rem, 1.8vw, 1.65rem);
  line-height: 1.25;
}

.card-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  line-height: 1.3;
}

.form-label {
  font-weight: 600;
}

.form-text {
  font-size: 0.82rem;
  line-height: 1.35;
}

@media (max-width: 767.98px) {
  .page-content {
    font-size: 0.92rem;
  }

  .page-header {
    margin-bottom: 0.75rem;
  }

  .page-header h1 {
    font-size: 1.1rem;
    margin-bottom: 0.35rem;
  }

  .breadcrumb {
    margin-bottom: 0;
    font-size: 0.74rem;
  }

  .card {
    border-radius: 12px;
  }

  .card-header {
    padding: 0.72rem 0.9rem;
  }

  .card-header h2 {
    font-size: 0.98rem;
  }

  .card-body {
    padding: 0.9rem;
  }

  .form-label {
    font-size: 0.84rem;
    margin-bottom: 0.3rem;
  }

  .form-control,
  .form-select,
  .input-group-text,
  .form-check-label,
  .btn,
  .alert,
  .card-text {
    font-size: 0.86rem;
  }

  .form-control,
  .form-select {
    min-height: 2.45rem;
  }

  textarea.form-control {
    min-height: 96px;
  }

  .form-text {
    font-size: 0.73rem;
  }

  .card-title {
    font-size: 0.96rem;
  }

  .card-text {
    line-height: 1.45;
  }

  .d-flex.gap-2.mt-0 {
    flex-direction: column;
  }

  .d-flex.gap-2.mt-0 .btn {
    width: 100%;
  }

  .feedback-popup {
    top: 12px;
    padding: 12px;
    margin-bottom: 14px;
    font-size: 0.86rem;
  }
}
</style>
