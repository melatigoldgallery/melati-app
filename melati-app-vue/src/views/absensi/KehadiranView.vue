<template>
  <div class="page-content">
    <!-- Page Header -->
    <div class="page-header">
      <h1>
        <i class="bi bi-people me-2 text-dark"></i>
        Sistem Absensi Staff
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Absensi</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <!-- Shift Info Card -->
      <div class="card shift-info-card mb-0">
        <div class="card-header">
          <h2>
            <i class="fas fa-clock"></i>
            Informasi Jadwal Kerja
          </h2>
        </div>
        <div class="card-body">
          <div class="shift-info-container">
            <div class="shift-item">
              <div class="shift-icon morning"><i class="fas fa-sun"></i></div>
              <div class="shift-details">
                <h3>Staff - Shift Pagi</h3>
                <p>
                  <i class="fas fa-sign-in-alt"></i>
                  Masuk:
                  <strong>08:45</strong>
                </p>
                <p>
                  <i class="fas fa-sign-out-alt"></i>
                  Pulang:
                  <strong>16:30</strong>
                </p>
              </div>
            </div>
            <div class="shift-item">
              <div class="shift-icon afternoon"><i class="fas fa-moon"></i></div>
              <div class="shift-details">
                <h3>Staff - Shift Sore</h3>
                <p>
                  <i class="fas fa-sign-in-alt"></i>
                  Masuk:
                  <strong>14:20</strong>
                </p>
                <p>
                  <i class="fas fa-sign-out-alt"></i>
                  Pulang:
                  <strong>Setelah Closing</strong>
                </p>
              </div>
            </div>
            <div class="shift-item">
              <div class="shift-icon morning ob"><i class="fas fa-broom"></i></div>
              <div class="shift-details">
                <h3>OB - Shift Pagi</h3>
                <p>
                  <i class="fas fa-sign-in-alt"></i>
                  Masuk:
                  <strong>07:30</strong>
                </p>
                <p>
                  <i class="fas fa-sign-out-alt"></i>
                  Pulang:
                  <strong>16:00</strong>
                </p>
              </div>
            </div>
            <div class="shift-item">
              <div class="shift-icon afternoon ob"><i class="fas fa-broom"></i></div>
              <div class="shift-details">
                <h3>OB - Shift Sore</h3>
                <p>
                  <i class="fas fa-sign-in-alt"></i>
                  Masuk:
                  <strong>13:45</strong>
                </p>
                <p>
                  <i class="fas fa-sign-out-alt"></i>
                  Pulang:
                  <strong>Setelah Closing</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-cards m-0">
        <div class="stat-card">
          <div class="stat-card-icon bg-primary"><i class="fas fa-user-check"></i></div>
          <div class="stat-card-info">
            <h3>{{ stats.present }}</h3>
            <p>Hadir Hari Ini</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon bg-danger"><i class="fas fa-user-clock"></i></div>
          <div class="stat-card-info stat-card-info-detail">
            <div class="stat-card-main">
              <h3>{{ stats.late }}</h3>
              <p>Terlambat</p>
            </div>
            <button class="btn btn-danger btn-sm stat-detail-btn" @click="showLateDetail">Detail</button>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon bg-info"><i class="fas fa-hourglass-half"></i></div>
          <div class="stat-card-info stat-card-info-detail">
            <div class="stat-card-main">
              <h3>{{ stats.latePermission }}</h3>
              <p>Izin Terlambat</p>
            </div>
            <button class="btn btn-info btn-sm stat-detail-btn" @click="showLatePermissionDetail">Detail</button>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon bg-success"><i class="fas fa-clipboard-list"></i></div>
          <div class="stat-card-info stat-card-info-detail">
            <div class="stat-card-main">
              <h3>{{ stats.leave }}</h3>
              <p>Izin Libur</p>
            </div>
            <button class="btn btn-success btn-sm stat-detail-btn" @click="showLeaveDetail">Detail</button>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon bg-secondary"><i class="fas fa-business-time"></i></div>
          <div class="stat-card-info stat-card-info-detail">
            <div class="stat-card-main">
              <h3>
                <span v-if="jamReplacementLoading" class="spinner-border spinner-border-sm"></span>
                <span v-else>{{ jamReplacementStaffCount }}</span>
              </h3>
              <p>Ganti Jam</p>
            </div>
            <button
              class="btn btn-secondary btn-sm stat-detail-btn"
              :disabled="jamReplacementLoading"
              @click="showJamReplacementDetail"
            >
              Detail
            </button>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon bg-warning"><i class="fas fa-user-plus"></i></div>
          <div class="stat-card-info stat-card-info-detail">
            <div class="stat-card-main">
              <h3>
                <span v-if="overtimeLoading" class="spinner-border spinner-border-sm"></span>
                <span v-else>{{ overtimeStaffCount }}</span>
              </h3>
              <p>Lembur</p>
            </div>
            <button
              class="btn btn-warning btn-sm stat-detail-btn"
              :disabled="overtimeLoading"
              @click="showOvertimeDetail"
            >
              Detail
            </button>
          </div>
        </div>
      </div>

      <!-- Scanner Card -->
      <div class="card scanner-card">
        <div class="card-header">
          <h2 class="mb-0">
            <i class="fas fa-qrcode"></i>
            Scan Barcode Kehadiran
          </h2>
        </div>

        <div class="alert alert-info m-2">
          <div class="d-flex align-items-center">
            <i class="fas fa-calendar-day me-2"></i>
            <div>
              <strong>Absensi Hari Ini:</strong>
              {{ todayStr }}
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="scanner-container">
            <!-- Scan Type Selector -->
            <div class="scan-type-selector mb-0">
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" id="scanTypeIn" v-model="scanType" value="in" />
                <label class="form-check-label" for="scanTypeIn">
                  <i class="fas fa-sign-in-alt text-success"></i>
                  Masuk
                </label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input" type="radio" id="scanTypeOut" v-model="scanType" value="out" />
                <label class="form-check-label" for="scanTypeOut">
                  <i class="fas fa-sign-out-alt text-danger"></i>
                  Pulang
                </label>
              </div>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="radio"
                  id="scanTypeLatePerm"
                  v-model="scanType"
                  value="latepermission"
                />
                <label class="form-check-label" for="scanTypeLatePerm">
                  <i class="fas fa-hourglass-half text-info"></i>
                  Izin Terlambat
                </label>
              </div>
            </div>

            <!-- Shift Selector -->
            <div class="shift-selector mb-0">
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="radio"
                  id="shiftMorning"
                  v-model="selectedShift"
                  value="morning"
                />
                <label class="form-check-label" for="shiftMorning">Shift Pagi</label>
              </div>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="radio"
                  id="shiftAfternoon"
                  v-model="selectedShift"
                  value="afternoon"
                />
                <label class="form-check-label" for="shiftAfternoon">Shift Sore</label>
              </div>
            </div>

            <!-- Shift Warning -->
            <div class="alert alert-warning mb-3">
              <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div>
                  <strong>Perhatian!</strong>
                  Pastikan memilih scan masuk atau pulang dan shift yang sesuai dengan jadwal kerja Anda:
                  <ul class="mb-0 mt-1">
                    <li>
                      <strong>Shift Pagi:</strong>
                      Staff (08:45), OB (07:30)
                    </li>
                    <li>
                      <strong>Shift Sore:</strong>
                      Staff (14:20), OB (13:45)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Scanner Input -->
            <div class="scanner-input-group">
              <input
                ref="barcodeInputRef"
                v-model="barcodeText"
                type="text"
                class="form-control"
                placeholder="Scan barcode disini..."
                @keydown="onBarcodeKeydown"
                autofocus
              />
              <button class="btn btn-primary" @click="submitBarcode" :disabled="processing">
                <span v-if="processing" class="spinner-border spinner-border-sm"></span>
                <i v-else class="fas fa-paper-plane"></i>
              </button>
            </div>

            <!-- Late Permission Form (conditional) -->
            <div v-if="scanType === 'latepermission'" class="mt-3">
              <div class="form-group">
                <label for="latePermissionCode">
                  <i class="fas fa-key"></i>
                  Kode Verifikasi:
                </label>
                <input
                  type="text"
                  id="latePermissionCode"
                  v-model="latePermissionCode"
                  class="form-control"
                  placeholder="Masukkan kode verifikasi dari HRD"
                />
              </div>
            </div>

            <!-- Scan Result -->
            <div :class="['scan-result', scanResult.type]" :style="{ display: scanResult.visible ? 'block' : 'none' }">
              <strong>{{ scanResult.name }}</strong>
              <div>{{ scanResult.message }}</div>
            </div>
          </div>

          <!-- Scanner Animation -->
          <div class="scanner-animation d-flex justify-content-center align-items-center">
            <div class="scanner-line"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  findEmployeeByCode,
  fetchAttendanceSettings,
  subscribeAttendanceSettings,
  subscribeTodayAttendance,
  subscribeTodayLeaves,
  subscribeTodayJamReplacements,
  subscribeManualOvertimeByDate,
  recordCheckIn,
  recordCheckOut,
  recordLatePermission,
  computeCheckInStatus,
  autoDetectScanTypeAndShift,
  getFaceDescriptor,
} from "@/services/absensi-service";
import { useWITA } from "@/composables/useWITA";
import Swal from "sweetalert2";

const { todayStringWITA } = useWITA();
const todayStr = todayStringWITA();

// -- Refs ------------------------------------------------------------------
const barcodeInputRef = ref(null);

// -- State -----------------------------------------------------------------
const barcodeText = ref("");
const scanType = ref("in");
const selectedShift = ref("morning");
const latePermissionCode = ref("");
const processing = ref(false);

// Scan result display
const scanResult = ref({ visible: false, type: "", name: "", message: "" });

// Stats
const todayList = ref([]);
const leaveList = ref([]);
const jamReplacementList = ref([]);
const manualOvertimeList = ref([]);
const jamReplacementLoading = ref(true);
const overtimeLoading = ref(true);
let unsubAttend = null;
let unsubLeave = null;
let unsubJamReplacement = null;
let unsubManualOvertime = null;
let unsubSettings = null;

// Settings
const settings = ref({});

// Barcode scanner detection (port dari sistem-absensi.js)
let barcodeBuffer = "";
let lastKeyTime = 0;
let isBarcodeScanner = false;
let scannerTimeout = null;
let lastEnterTime = 0;
const SCANNER_CHAR_DELAY = 50; // ms kecepatan scanner
const SCANNER_DONE_DELAY = 500; // ms jeda selesai scan
const ENTER_DEBOUNCE = 1000; // ms debounce Enter
const FACE_MATCH_THRESHOLD = 0.5;
const SUCCESS_AUDIO_FILE = "/audio/notifOn.mp3";
const ERROR_AUDIO_FILE = "/audio/failed.mp3";
const SOUND_ENABLED = true;
const MODAL_FONT_SIZE = "13px";

let faceApiLib = null;
let faceModelsLoaded = false;
let faceVideoStream = null;
let indonesianVoice = null;
// Guard for stale HMR/runtime references from older speech code.
let testUtterance = null;

// -- Computed Stats ---------------------------------------------------------
const stats = computed(() => {
  const present = todayList.value.length;
  const late = todayList.value.filter((r) => r.status === "Terlambat").length;
  const latePermission = todayList.value.filter((r) => r.status === "Izin Terlambat").length;
  const leave = new Set(
    leaveList.value
      .filter((r) => r.replacementType === "libur" || (r.replacementType === "tidak" && r.leaveType === "sakit"))
      .map((r) => String(r.employeeId || r.id)),
  ).size;
  return { present, late, latePermission, leave };
});

const leaveDetails = computed(() =>
  leaveList.value
    .filter((r) => r.replacementType === "libur" || (r.replacementType === "tidak" && r.leaveType === "sakit"))
    .map((r) => ({
      id: r.id,
      employeeId: r.employeeId || "-",
      name: r.name || "-",
      reason: r.reason || "-",
      leaveDate:
        r.leaveStartDate && r.leaveEndDate
          ? r.leaveStartDate === r.leaveEndDate
            ? new Date(r.leaveStartDate + "T00:00:00").toLocaleDateString("id-ID")
            : `${new Date(r.leaveStartDate + "T00:00:00").toLocaleDateString("id-ID")} - ${new Date(r.leaveEndDate + "T00:00:00").toLocaleDateString("id-ID")}`
          : r.leaveDate || "-",
    })),
);

const lateDetails = computed(() =>
  todayList.value
    .filter((r) => r.status === "Terlambat")
    .map((r) => ({
      id: r.id,
      employeeId: r.employeeId || "-",
      name: r.name || "-",
      shift: r.shift === "afternoon" ? "Shift Sore" : "Shift Pagi",
      timeIn: r.timeIn || null,
      lateMinutes: Number(r.lateMinutes) || 0,
    })),
);

const latePermissionDetails = computed(() =>
  todayList.value
    .filter((r) => r.status === "Izin Terlambat" || r.latePermission === true)
    .map((r) => ({
      id: r.id,
      employeeId: r.employeeId || "-",
      name: r.name || "-",
      shift: r.shift === "afternoon" ? "Shift Sore" : "Shift Pagi",
      timeIn: r.timeIn || null,
      latePermissionAt: r.latePermissionAt || null,
      note: r.latePermissionCode ? "Izin terlambat tervalidasi" : "Izin terlambat",
    })),
);

const jamReplacementDetails = computed(() =>
  jamReplacementList.value.map((r) => {
    const d = r.replacementDetails || {};
    const value = d.timeValue ?? d.value ?? d.hours ?? "";
    const unit = d.timeUnit || d.unit || (String(d.formattedValue || "").includes("menit") ? "menit" : "jam");
    const duration = value ? `${value} ${unit}` : d.formattedValue || "-";
    return {
      id: r.id,
      employeeId: r.employeeId || "-",
      name: r.name || "-",
      duration,
      reason: r.reason || "-",
    };
  }),
);

const jamReplacementStaffCount = computed(() => {
  const unique = new Set(jamReplacementDetails.value.map((r) => String(r.employeeId || r.id)));
  return unique.size;
});

function getReplacementHours(details) {
  if (!details) return 0;

  let value = Number(details.timeValue ?? details.value ?? details.hours ?? 0);
  let unit = details.timeUnit || details.unit || "";

  if (!value && typeof details.formattedValue === "string") {
    const match = details.formattedValue.match(/(\d+(?:[.,]\d+)?)/);
    if (match) value = Number(match[1].replace(",", "."));
    if (!unit) unit = details.formattedValue.toLowerCase().includes("menit") ? "menit" : "jam";
  }

  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "menit" ? value / 60 : value;
}

const overtimeDetails = computed(() => {
  const autoRows = jamReplacementList.value
    .filter((r) => getReplacementHours(r.replacementDetails) >= 8)
    .map((r) => ({
      key: `auto-${r.id}`,
      employeeId: r.employeeId || "",
      name: r.name || "-",
      reason: r.reason || "Ganti jam disetujui (>= 8 jam)",
    }));

  const manualRows = manualOvertimeList.value.map((r) => ({
    key: `manual-${r.id}`,
    employeeId: r.employeeId || "",
    name: r.name || "-",
    reason: r.reason || "Internal Shifting",
  }));

  return [...autoRows, ...manualRows];
});

const overtimeStaffCount = computed(() => {
  const unique = new Set(
    overtimeDetails.value.map((r) => (r.employeeId ? `id-${r.employeeId}` : `name-${String(r.name).toLowerCase()}`)),
  );
  return unique.size;
});

// -- Scan Result Helper -----------------------------------------------------
let resultTimer = null;
function showScanResult(type, name, message, duration = 3500) {
  if (resultTimer) clearTimeout(resultTimer);
  scanResult.value = { visible: true, type, name, message };
  resultTimer = setTimeout(() => {
    scanResult.value.visible = false;
  }, duration);
}

function getNotificationSpeechText(type, staffName = "", customText = "") {
  if (customText) return customText;

  switch (type) {
    case "success-in":
      return staffName ? `Oke ${staffName}` : "Oke";
    case "success-out":
      return staffName ? `${staffName} pulang` : "Pulang";
    case "already-in":
      return staffName ? `${staffName} sudah absen` : "Sudah absen";
    case "already-out":
      return staffName ? `${staffName} sudah absen pulang` : "Sudah absen pulang";
    case "late":
      return staffName ? `${staffName} terlambat` : "Terlambat";
    case "late-permission":
      return staffName ? `${staffName} izin terlambat` : "Izin terlambat";
    case "not-found":
      return "Barcode tidak terdaftar";
    case "error":
      return "Terjadi kesalahan";
    default:
      return type;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setCompactModalFont(popup) {
  if (popup) popup.style.fontSize = MODAL_FONT_SIZE;
}

function formatFirestoreTime(value) {
  if (!value) return "-";

  let date = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (Number.isFinite(value?.seconds)) {
    date = new Date(value.seconds * 1000);
  } else {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

async function showLateDetail() {
  const rows = lateDetails.value;
  if (rows.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Belum Ada Data",
      text: "Belum ada staf yang terlambat hari ini.",
      confirmButtonColor: "#f8961e",
      didOpen: setCompactModalFont,
    });
    return;
  }

  const htmlRows = rows
    .map(
      (r, i) => `
        <tr>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${i + 1}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.name)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.employeeId)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.shift)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(formatFirestoreTime(r.timeIn))}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(`${r.lateMinutes} menit`)}</td>
        </tr>
      `,
    )
    .join("");

  await Swal.fire({
    title: `Detail Terlambat (${todayStr})`,
    width: 940,
    html: `
      <div style="text-align:left; margin-bottom:8px; font-size:13px; color:#64748b;">
        Total data: <strong>${rows.length}</strong>
      </div>
      <div style="max-height: 380px; overflow: auto; border:1px solid #e2e8f0; border-radius:10px;">
        <table class="table table-sm table-striped mb-0 modal-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0;">
          <colgroup>
            <col style="width:56px;" />
            <col style="width:220px;" />
            <col style="width:130px;" />
            <col style="width:120px;" />
            <col style="width:110px;" />
            <col />
          </colgroup>
          <thead>
            <tr style="position:sticky; top:0; background:#f8fafc; z-index:1;">
              <th class="text-start" style="width:56px;">No</th>
              <th class="text-start">Nama Staf</th>
              <th class="text-start" style="width:130px;">ID</th>
              <th class="text-start" style="width:120px;">Shift</th>
              <th class="text-start" style="width:110px;">Jam Masuk</th>
              <th class="text-start">Keterlambatan</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#f8961e",
    didOpen: setCompactModalFont,
  });
}

async function showLatePermissionDetail() {
  const rows = latePermissionDetails.value;
  if (rows.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Belum Ada Data",
      text: "Belum ada staf dengan izin terlambat hari ini.",
      confirmButtonColor: "#f8961e",
      didOpen: setCompactModalFont,
    });
    return;
  }

  const htmlRows = rows
    .map(
      (r, i) => `
        <tr>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${i + 1}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.name)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.employeeId)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.shift)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(formatFirestoreTime(r.timeIn))}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.note)}</td>
        </tr>
      `,
    )
    .join("");

  await Swal.fire({
    title: `Detail Izin Terlambat (${todayStr})`,
    width: 940,
    html: `
      <div style="text-align:left; margin-bottom:8px; font-size:13px; color:#64748b;">
        Total data: <strong>${rows.length}</strong>
      </div>
      <div style="max-height: 380px; overflow: auto; border:1px solid #e2e8f0; border-radius:10px;">
        <table class="table table-sm table-striped mb-0 modal-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0;">
          <colgroup>
            <col style="width:56px;" />
            <col style="width:220px;" />
            <col style="width:130px;" />
            <col style="width:120px;" />
            <col style="width:110px;" />
            <col />
          </colgroup>
          <thead>
            <tr style="position:sticky; top:0; background:#f8fafc; z-index:1;">
              <th class="text-start" style="width:56px;">No</th>
              <th class="text-start">Nama Staf</th>
              <th class="text-start" style="width:130px;">ID</th>
              <th class="text-start" style="width:120px;">Shift</th>
              <th class="text-start" style="width:110px;">Jam Masuk</th>
              <th class="text-start">Keterangan</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#f8961e",
    didOpen: setCompactModalFont,
  });
}

async function showJamReplacementDetail() {
  if (jamReplacementLoading.value) return;

  const rows = jamReplacementDetails.value;
  if (rows.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Belum Ada Data",
      text: "Belum ada staf yang terjadwal ganti jam hari ini.",
      confirmButtonColor: "#f8961e",
      didOpen: setCompactModalFont,
    });
    return;
  }

  const htmlRows = rows
    .map(
      (r, i) => `
        <tr>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${i + 1}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.name)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.employeeId)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.duration)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.reason)}</td>
        </tr>
      `,
    )
    .join("");

  await Swal.fire({
    title: `Detail Ganti Jam (${todayStr})`,
    width: 940,
    html: `
      <div style="text-align:left; margin-bottom:8px; font-size:13px; color:#64748b;">
        Total data: <strong>${rows.length}</strong>
      </div>
      <div style="max-height: 380px; overflow: auto; border:1px solid #e2e8f0; border-radius:10px;">
        <table class="table table-sm table-striped mb-0 modal-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0;">
          <colgroup>
            <col style="width:56px;" />
            <col style="width:220px;" />
            <col style="width:140px;" />
            <col style="width:130px;" />
            <col />
          </colgroup>
          <thead>
            <tr style="position:sticky; top:0; background:#f8fafc; z-index:1;">
              <th class="text-start" style="width:56px;">No</th>
              <th class="text-start">Nama Sales</th>
              <th class="text-start" style="width:140px;">ID</th>
              <th class="text-start" style="width:130px;">Durasi</th>
              <th class="text-start">Alasan</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#f8961e",
    didOpen: setCompactModalFont,
  });
}

async function showLeaveDetail() {
  const rows = leaveDetails.value;
  if (rows.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Belum Ada Data",
      text: "Tidak ada data izin libur hari ini.",
      confirmButtonColor: "#f8961e",
      didOpen: setCompactModalFont,
    });
    return;
  }

  const htmlRows = rows
    .map(
      (r, i) => `
        <tr>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${i + 1}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.name)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.employeeId)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.leaveDate)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.reason)}</td>
        </tr>
      `,
    )
    .join("");

  await Swal.fire({
    title: `Detail Izin Libur (${todayStr})`,
    width: 940,
    html: `
      <div style="text-align:left; margin-bottom:8px; font-size:13px; color:#64748b;">
        Total data: <strong>${rows.length}</strong>
      </div>
      <div style="max-height: 380px; overflow: auto; border:1px solid #e2e8f0; border-radius:10px;">
        <table class="table table-sm table-striped mb-0 modal-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0;">
          <colgroup>
            <col style="width:56px;" />
            <col style="width:180px;" />
            <col style="width:140px;" />
            <col style="width:190px;" />
            <col />
          </colgroup>
          <thead>
            <tr style="position:sticky; top:0; background:#f8fafc; z-index:1;">
              <th class="text-start" style="width:56px;">No</th>
              <th class="text-start">Nama Sales</th>
              <th class="text-start" style="width:140px;">ID</th>
              <th class="text-start" style="width:190px;">Tanggal Izin</th>
              <th class="text-start">Alasan Izin</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#f8961e",
    didOpen: setCompactModalFont,
  });
}

async function showOvertimeDetail() {
  if (overtimeLoading.value) return;

  const rows = overtimeDetails.value;
  if (rows.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Belum Ada Data",
      text: "Belum ada staf lembur hari ini.",
      confirmButtonColor: "#f8961e",
      didOpen: setCompactModalFont,
    });
    return;
  }

  const htmlRows = rows
    .map(
      (r, i) => `
        <tr>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${i + 1}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.name)}</td>
          <td class="text-start" style="vertical-align:top; white-space:normal; word-break:break-word;">${escapeHtml(r.reason)}</td>
        </tr>
      `,
    )
    .join("");

  await Swal.fire({
    title: `Detail Staf Lembur (${todayStr})`,
    width: 820,
    html: `
      <div style="text-align:left; margin-bottom:8px; font-size:13px; color:#64748b;">
        Total data: <strong>${rows.length}</strong>
      </div>
      <div style="max-height: 380px; overflow: auto; border:1px solid #e2e8f0; border-radius:10px;">
        <table class="table table-sm table-striped mb-0 modal-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0;">
          <colgroup>
            <col style="width:56px;" />
            <col style="width:220px;" />
            <col />
          </colgroup>
          <thead>
            <tr style="position:sticky; top:0; background:#f8fafc; z-index:1;">
              <th class="text-start" style="width:56px;">No</th>
              <th class="text-start">Nama Staf</th>
              <th class="text-start">Alasan Lembur</th>
            </tr>
          </thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#f8961e",
    didOpen: setCompactModalFont,
  });
}

function initSpeechSynthesis() {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser");
    return;
  }

  const findIndonesianVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((voice) => voice.lang.includes("id-ID") || voice.lang.includes("id"));
    const msVoice = voices.find((voice) => voice.lang.includes("ms-MY") || voice.lang.includes("ms"));
    indonesianVoice = idVoice || msVoice || voices.find((v) => v.default) || voices[0] || null;
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    findIndonesianVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = findIndonesianVoice;
  }
}

function playAttendanceNotification(type, staffName = "", customText = "") {
  if (!SOUND_ENABLED) return;

  const speechText = getNotificationSpeechText(type, staffName, customText);
  const useErrorTone = type === "error" || type === "not-found";
  const audioFile = useErrorTone ? ERROR_AUDIO_FILE : SUCCESS_AUDIO_FILE;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const speakText = () => {
    if (!speechText || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "id-ID";
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1.2;
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.onstart = () => {
      console.log("Speech started:", utterance.text);
    };
    utterance.onend = () => {
      console.log("Speech ended");
    };
    utterance.onerror = (event) => {
      console.error("Speech error:", event);
    };

    window.speechSynthesis.speak(utterance);

    // Workaround agar speech tetap lanjut di browser tertentu.
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 100);
  };

  try {
    const openingAudio = new Audio(audioFile);
    openingAudio.volume = 0.7;
    openingAudio.onended = () => {
      setTimeout(speakText, 100);
    };
    openingAudio.onerror = () => {
      speakText();
    };
    openingAudio.play().catch(() => {
      speakText();
    });
  } catch {
    speakText();
  }
}

// -- Auto-set radio berdasarkan waktu --------------------------------------
function autoSetRadio() {
  const detected = autoDetectScanTypeAndShift();
  if (detected) {
    scanType.value = detected.scanType;
    selectedShift.value = detected.shift;
  }
}

function isFaceVerificationRequired(scanMode, shift) {
  const cfg = settings.value?.faceVerification;
  if (!cfg?.enabled) return false;
  if (scanMode === "in") return !!cfg.rules?.checkIn?.[shift];
  if (scanMode === "out") return !!cfg.rules?.checkOut?.[shift];
  return false;
}

async function loadFaceApiLibrary() {
  if (faceApiLib) return faceApiLib;

  await new Promise((resolve, reject) => {
    const existing = document.getElementById("face-api-script");
    if (existing) {
      if (window.faceapi) {
        resolve();
        return;
      }
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "face-api-script";
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  faceApiLib = window.faceapi;
  return faceApiLib;
}

async function ensureFaceModelsLoaded() {
  const faceapi = await loadFaceApiLibrary();
  if (faceModelsLoaded) return faceapi;

  const modelUrl = "/face-api/models";
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
  ]);

  faceModelsLoaded = true;
  return faceapi;
}

async function startFaceCamera(videoElement) {
  if (faceVideoStream) {
    faceVideoStream.getTracks().forEach((t) => t.stop());
    faceVideoStream = null;
  }

  faceVideoStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user",
    },
  });

  videoElement.srcObject = faceVideoStream;
  await videoElement.play();
}

function stopFaceCamera() {
  if (faceVideoStream) {
    faceVideoStream.getTracks().forEach((t) => t.stop());
    faceVideoStream = null;
  }
}

async function verifyFaceForEmployee(employee) {
  let videoElement = null;
  let modalActive = true;
  let verificationPassed = false;

  const getFaceVerifyErrorMessage = (error) => {
    const msg = String(error?.message || "");
    if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
      return "Akses kamera ditolak. Izinkan kamera lalu coba lagi.";
    }
    if (msg.includes("Requested device not found") || msg.includes("NotFoundError")) {
      return "Perangkat kamera tidak ditemukan.";
    }
    if (msg.includes("Could not start video source") || msg.includes("NotReadableError")) {
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
    }
    if (msg.includes("face-api") || msg.includes("loadFromUri") || msg.includes("Failed to fetch")) {
      return "Model verifikasi wajah gagal dimuat. Cek koneksi/model files lalu coba lagi.";
    }
    return msg || "Terjadi kesalahan verifikasi wajah.";
  };

  const result = await Swal.fire({
    title: `Verifikasi Wajah - ${employee.name}`,
    html: `
      <div class="text-start">
        <p class="mb-2 small text-muted">Posisikan wajah di depan kamera, lalu klik Verifikasi.</p>
        <video id="faceVerificationVideo" autoplay muted playsinline style="width:100%;border-radius:8px;background:#111;"></video>
        <div id="faceVerificationStatus" class="small mt-2 text-muted">Menyiapkan kamera...</div>
      </div>
    `,
    width: 520,
    showCancelButton: true,
    showConfirmButton: false,
    cancelButtonText: "Batal",
    allowOutsideClick: false,
    didOpen: async () => {
      try {
        const statusEl = document.getElementById("faceVerificationStatus");
        if (statusEl) statusEl.textContent = "Menyiapkan kamera...";

        await ensureFaceModelsLoaded();
        if (!modalActive) return;

        videoElement = document.getElementById("faceVerificationVideo");
        await startFaceCamera(videoElement);
        if (!modalActive) return;

        if (statusEl) statusEl.textContent = "Mendeteksi wajah...";

        const faceapi = await ensureFaceModelsLoaded();
        if (!modalActive) return;

        const stored = await getFaceDescriptor(employee.employeeId, {
          docId: employee.id,
          barcode: employee.barcode,
        });
        if (!stored) {
          throw new Error("Data wajah karyawan belum terdaftar.");
        }

        const detections = await faceapi
          .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!detections.length) {
          throw new Error("Wajah tidak terdeteksi.");
        }
        if (detections.length > 1) {
          throw new Error("Terdeteksi lebih dari satu wajah.");
        }

        const distance = faceapi.euclideanDistance(detections[0].descriptor, stored);
        const similarity = 1 - distance;
        if (similarity < FACE_MATCH_THRESHOLD) {
          throw new Error(`Wajah tidak cocok (${Math.round(similarity * 100)}%).`);
        }

        if (statusEl) statusEl.textContent = `Verifikasi berhasil (${Math.round(similarity * 100)}%).`;
        verificationPassed = true;

        if (modalActive) {
          setTimeout(() => {
            if (Swal.isVisible()) Swal.close();
          }, 500);
        }
      } catch (error) {
        const statusEl = document.getElementById("faceVerificationStatus");
        const message = getFaceVerifyErrorMessage(error);
        if (statusEl) statusEl.textContent = `Verifikasi gagal: ${message} (silakan coba lagi).`;
        if (Swal.isVisible()) {
          setTimeout(() => {
            if (Swal.isVisible()) Swal.close();
          }, 1200);
        }
      }

      return undefined;
    },
    willClose: () => {
      modalActive = false;
      stopFaceCamera();
    },
  });

  return verificationPassed;
}

// -- Barcode Scanner Detection ----------------------------------------------
function onBarcodeKeydown(e) {
  const now = Date.now();

  // Detect scanner: characters arrive very fast
  if (lastKeyTime && now - lastKeyTime < SCANNER_CHAR_DELAY) {
    isBarcodeScanner = true;
  } else if (now - lastKeyTime > SCANNER_CHAR_DELAY) {
    isBarcodeScanner = false;
  }
  lastKeyTime = now;

  // Reset scanner timeout
  if (scannerTimeout) clearTimeout(scannerTimeout);
  scannerTimeout = setTimeout(() => {
    isBarcodeScanner = false;
  }, SCANNER_DONE_DELAY);

  // Handle Enter
  if (e.key === "Enter") {
    e.preventDefault();
    const currentTime = Date.now();
    if (currentTime - lastEnterTime < ENTER_DEBOUNCE) return;
    lastEnterTime = currentTime;
    submitBarcode({ source: isBarcodeScanner ? "scanner" : "manual" });
  }
}

// -- Submit Barcode ---------------------------------------------------------
async function submitBarcode({ source = "manual" } = {}) {
  const code = barcodeText.value.trim();
  if (!code || processing.value) return;

  const requiresFace = isFaceVerificationRequired(scanType.value, selectedShift.value);

  // Default mode: barcode-only when face verification is active.
  if (requiresFace && source !== "scanner") {
    showScanResult("warning", "Mode Barcode Aktif", "Saat verifikasi wajah aktif, input manual tidak diizinkan.");
    return;
  }

  // Validate late permission code when required
  if (scanType.value === "latepermission" && !latePermissionCode.value.trim()) {
    showScanResult("error", "Input Tidak Lengkap", "Masukkan kode verifikasi dari HRD terlebih dahulu.");
    return;
  }

  processing.value = true;
  barcodeText.value = "";

  try {
    const employee = await findEmployeeByCode(code);
    if (!employee) {
      showScanResult("error", "Tidak Ditemukan", "ID/barcode tidak terdaftar dalam sistem.");
      playAttendanceNotification("not-found");
      return;
    }

    if (requiresFace) {
      const verified = await verifyFaceForEmployee(employee);
      if (!verified) {
        showScanResult("error", employee.name, "Verifikasi wajah dibatalkan atau gagal.");
        playAttendanceNotification("error", "", "Verifikasi wajah gagal");
        return;
      }
    }

    await processAttendance(employee, { faceVerified: requiresFace ? true : false });
  } catch (e) {
    showScanResult("error", "Error", e.message || "Terjadi kesalahan sistem.");
    playAttendanceNotification("error");
  } finally {
    processing.value = false;
    setTimeout(() => barcodeInputRef.value?.focus(), 100);
  }
}

// -- Process Attendance -----------------------------------------------------
async function processAttendance(employee, options = {}) {
  const today = todayStr;
  const existing = todayList.value.find((r) => r.employeeId === employee.employeeId);
  const shift = selectedShift.value;
  const type = scanType.value;

  if (type === "latepermission") {
    if (!existing) {
      showScanResult("error", employee.name, "Belum ada data absensi masuk hari ini.");
      playAttendanceNotification("error", "", `${employee.name} belum absen masuk`);
      return;
    }
    if (existing.latePermission) {
      showScanResult("warning", employee.name, "Izin terlambat sudah dicatat sebelumnya.");
      playAttendanceNotification("late-permission", employee.name, `${employee.name} sudah izin terlambat`);
      return;
    }

    // Format wajib: YYYYMMDD-XX (XX = 2 digit terakhir employeeId)
    const inputCode = latePermissionCode.value.trim();
    const dateFormatted = today.replace(/-/g, "");
    const expectedCode = `${dateFormatted}-${String(employee.employeeId || "").slice(-2)}`;
    if (inputCode !== expectedCode) {
      showScanResult("error", employee.name, `Kode verifikasi tidak valid. Gunakan format ${expectedCode}.`);
      playAttendanceNotification("error", "", "Kode verifikasi tidak valid");
      return;
    }

    await recordLatePermission(existing.id, latePermissionCode.value.trim());
    latePermissionCode.value = "";
    showScanResult("success", employee.name, "Izin Terlambat.");
    playAttendanceNotification("late-permission", employee.name, `Oke, ${employee.name} izin terlambat`);
    return;
  }

  if (type === "in") {
    if (existing) {
      showScanResult("warning", employee.name, "Sudah absen masuk hari ini.");
      playAttendanceNotification("already-in", employee.name);
      return;
    }
    const faceVerificationRequired = isFaceVerificationRequired("in", shift);
    const { status, lateMinutes } = computeCheckInStatus(settings.value, new Date(), {
      shift,
      employeeType: employee.type || "staff",
    });
    await recordCheckIn({
      employeeId: employee.employeeId,
      name: employee.name,
      type: employee.type || "staff",
      shift,
      date: today,
      status,
      lateMinutes,
      faceVerified: faceVerificationRequired ? !!options.faceVerified : false,
      faceVerificationRequired,
    });
    const msg = status === "Terlambat" ? `Terlambat ${lateMinutes} menit` : "Tepat Waktu";
    showScanResult("success", employee.name, `Absen Masuk ${msg}`);
    playAttendanceNotification(status === "Terlambat" ? "late" : "success-in", employee.name);
    return;
  }

  if (type === "out") {
    if (!existing) {
      showScanResult("warning", employee.name, "Belum absen masuk. Silakan absen masuk dulu.");
      playAttendanceNotification("error", "", `${employee.name} belum absen masuk`);
      return;
    }
    if (existing.timeOut) {
      showScanResult("warning", employee.name, "Sudah absen pulang hari ini.");
      playAttendanceNotification("already-out", employee.name);
      return;
    }
    const faceVerificationRequired = isFaceVerificationRequired("out", shift);
    await recordCheckOut(existing.id, {
      faceVerificationRequiredOut: faceVerificationRequired,
      faceVerifiedOut: faceVerificationRequired ? !!options.faceVerified : false,
    });
    showScanResult("success", employee.name, "Absen Pulang Selamat pulang!");
    playAttendanceNotification("success-out", employee.name);
  }
}

// -- Lifecycle --------------------------------------------------------------
onMounted(async () => {
  autoSetRadio();
  initSpeechSynthesis();

  // Preload audio notifikasi untuk mengurangi jeda saat scan pertama.
  try {
    const successAudio = new Audio(SUCCESS_AUDIO_FILE);
    successAudio.preload = "auto";
    successAudio.load();

    const errorAudio = new Audio(ERROR_AUDIO_FILE);
    errorAudio.preload = "auto";
    errorAudio.load();
  } catch {
    // Ignore preload errors; fallback tetap berjalan saat notifikasi diputar.
  }

  try {
    settings.value = await fetchAttendanceSettings();
  } catch {
    /* use defaults */
  }

  unsubSettings = subscribeAttendanceSettings((data) => {
    settings.value = data;
  });

  unsubAttend = subscribeTodayAttendance(todayStr, (data) => {
    todayList.value = data;
  });

  unsubLeave = subscribeTodayLeaves(todayStr, (data) => {
    leaveList.value = data;
  });

  unsubJamReplacement = subscribeTodayJamReplacements(todayStr, (data) => {
    jamReplacementList.value = data;
    jamReplacementLoading.value = false;
  });

  unsubManualOvertime = subscribeManualOvertimeByDate(todayStr, (data) => {
    manualOvertimeList.value = data;
    overtimeLoading.value = false;
  });

  setTimeout(() => barcodeInputRef.value?.focus(), 200);
});

onUnmounted(() => {
  if (unsubAttend) unsubAttend();
  if (unsubLeave) unsubLeave();
  if (unsubJamReplacement) unsubJamReplacement();
  if (unsubManualOvertime) unsubManualOvertime();
  if (unsubSettings) unsubSettings();
  stopFaceCamera();
  if (scannerTimeout) clearTimeout(scannerTimeout);
  if (resultTimer) clearTimeout(resultTimer);
});
</script>

<style scoped>
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stats-cards .stat-card {
  min-width: 0;
}

.stat-card-info-detail {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  width: 100%;
}

.stat-card-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-card-main h3 {
  margin-bottom: 2px;
}

.stat-card-main p {
  margin-bottom: 0;
}

.stat-detail-btn {
  flex-shrink: 0;
  min-width: 74px;
  padding-inline: 0.7rem;
}

@media (min-width: 993px) {
  .stat-card-info-detail {
    min-height: 54px;
  }

  .stat-detail-btn {
    min-width: 82px;
  }
}

@media (max-width: 992px) {
  .stats-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 576px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}

.shift-details h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 4px;
}
.shift-details p {
  font-size: 0.8rem;
  color: var(--gray-600, #6c757d);
  margin-bottom: 2px;
}
.shift-icon.ob {
  opacity: 0.85;
}
.scan-result.warning {
  display: block;
  background-color: rgba(248, 150, 30, 0.1);
  border: 1px solid var(--warning-color, #f8961e);
  color: var(--warning-color, #f8961e);
}
.scan-result.success {
  display: block;
}
.scan-result.error {
  display: block;
}
</style>
