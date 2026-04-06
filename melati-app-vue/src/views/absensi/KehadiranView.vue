<template>
  <div class="kehadiran-page" @keydown="onKeyDown" tabindex="0" ref="pageRef">
    <div class="row g-0 min-vh-100">
      <!-- Main Scanner Panel -->
      <div class="col-md-8 d-flex flex-column align-items-center justify-content-center bg-dark text-white p-4">
        <!-- Logo / Title -->
        <div class="mb-3 text-center">
          <img src="/img/Melati.jfif" alt="Melati" class="rounded-circle mb-2" style="width:64px;height:64px;object-fit:cover" onerror="this.style.display='none'" />
          <h4 class="fw-bold mb-0">Sistem Absensi</h4>
          <p class="text-muted small mb-0">Melati Gold Shop</p>
        </div>

        <!-- Face Camera -->
        <div class="position-relative mb-3" style="width:320px;max-width:100%">
          <video
            ref="videoRef"
            autoplay
            muted
            playsinline
            class="rounded shadow"
            style="width:100%;height:240px;object-fit:cover;background:#111"
          ></video>
          <canvas ref="overlayRef" class="position-absolute top-0 start-0" style="width:100%;height:100%;pointer-events:none"></canvas>
          <div v-if="faceStatus" class="position-absolute bottom-0 start-0 end-0 text-center pb-1">
            <span class="badge" :class="faceStatus === 'Wajah terdeteksi' ? 'bg-success' : 'bg-secondary'">
              {{ faceStatus }}
            </span>
          </div>
          <div v-if="!cameraActive" class="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center">
            <button class="btn btn-outline-light btn-sm" @click="startCamera">
              <i class="bi bi-camera-video me-1"></i>Aktifkan Kamera
            </button>
          </div>
          <div v-if="faceLoading" class="position-absolute top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center bg-dark bg-opacity-75 rounded">
            <div class="text-center">
              <div class="spinner-border spinner-border-sm text-light mb-1"></div>
              <div class="small text-light">Memuat model wajah...</div>
            </div>
          </div>
        </div>

        <!-- Barcode Input -->
        <div class="w-100" style="max-width:320px">
          <label class="form-label small text-muted mb-1">ID / Barcode Karyawan</label>
          <div class="input-group">
            <input
              ref="barcodeInput"
              v-model="barcodeText"
              type="text"
              class="form-control form-control-sm text-center"
              placeholder="Scan atau ketik ID..."
              @keydown.enter="processBarcodeInput"
              autofocus
            />
            <button class="btn btn-warning btn-sm" @click="processBarcodeInput" :disabled="processing">
              <span v-if="processing" class="spinner-border spinner-border-sm"></span>
              <i v-else class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>

        <!-- Scan Type -->
        <div class="d-flex gap-3 mt-2">
          <div v-for="st in SCAN_TYPES" :key="st.value" class="form-check">
            <input :id="`st-${st.value}`" v-model="scanType" type="radio" :value="st.value" class="form-check-input" />
            <label :for="`st-${st.value}`" class="form-check-label small text-light">{{ st.label }}</label>
          </div>
        </div>

        <!-- Current Time -->
        <div class="mt-3 text-center">
          <div class="fs-4 fw-bold text-warning">{{ currentTime }}</div>
          <div class="text-muted small">{{ currentDate }}</div>
        </div>

        <!-- Result Display -->
        <div v-if="result" class="mt-3 w-100" style="max-width:320px">
          <div
            class="alert mb-0 text-center"
            :class="{
              'alert-success': result.type === 'success',
              'alert-warning': result.type === 'warning',
              'alert-danger': result.type === 'error',
            }"
          >
            <div class="fw-bold">{{ result.name }}</div>
            <div class="small">{{ result.message }}</div>
          </div>
        </div>
      </div>

      <!-- Sidebar: Today's Attendance -->
      <div class="col-md-4 bg-light border-start p-3 overflow-auto" style="max-height:100vh">
        <h6 class="fw-bold mb-2">
          <i class="bi bi-list-check me-1 text-success"></i>Kehadiran Hari Ini
        </h6>
        <div class="small text-muted mb-2">{{ todayStr }} — {{ todayList.length }} karyawan</div>

        <div v-for="rec in todayList" :key="rec.id" class="card border-0 shadow-sm mb-2 p-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-semibold small">{{ rec.name }}</div>
              <div class="text-muted" style="font-size:0.72rem">{{ rec.shift === "morning" ? "Pagi" : "Sore" }}</div>
            </div>
            <span
              class="badge"
              :class="rec.status === 'Tepat Waktu' ? 'bg-success' : rec.status === 'Terlambat' ? 'bg-warning text-dark' : 'bg-info'"
            >{{ rec.status }}</span>
          </div>
          <div class="row g-0 mt-1" style="font-size:0.72rem">
            <div class="col-6 text-muted">
              Masuk: <strong>{{ formatTs(rec.timeIn) }}</strong>
            </div>
            <div class="col-6 text-muted">
              Keluar: <strong>{{ rec.timeOut ? formatTs(rec.timeOut) : "–" }}</strong>
            </div>
          </div>
        </div>

        <div v-if="todayList.length === 0" class="text-center text-muted py-4">
          <i class="bi bi-inbox display-6 d-block mb-1 opacity-25"></i>
          Belum ada absensi hari ini.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useWITA } from "@/composables/useWITA";
import {
  findEmployeeByCode,
  fetchAttendanceSettings,
  subscribeTodayAttendance,
  recordCheckIn,
  recordCheckOut,
  fetchAllFaceDescriptors,
  computeCheckInStatus,
  detectShift,
} from "@/services/absensi-service";

const { todayStringWITA } = useWITA();

const SCAN_TYPES = [
  { value: "in", label: "Masuk" },
  { value: "out", label: "Keluar" },
];

// ── Refs ──────────────────────────────────────────────────────────────────
const pageRef = ref(null);
const videoRef = ref(null);
const overlayRef = ref(null);
const barcodeInput = ref(null);

// ── State ─────────────────────────────────────────────────────────────────
const barcodeText = ref("");
const scanType = ref("in");
const processing = ref(false);
const result = ref(null);

// Time
const currentTime = ref("");
const currentDate = ref("");
const todayStr = todayStringWITA();

// Today's list
const todayList = ref([]);
let unsubscribe = null;

// Face recognition
const cameraActive = ref(false);
const faceLoading = ref(false);
const faceStatus = ref("");
let faceApiLoaded = false;
let faceDescriptors = {};
let scanInterval = null;
let settings = {};

// ── Time Display ──────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  currentDate.value = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTs(ts) {
  if (!ts) return "–";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "id-ID";
  window.speechSynthesis.speak(u);
}

function showResult(type, name, message, duration = 3000) {
  result.value = { type, name, message };
  setTimeout(() => (result.value = null), duration);
}

// ── Barcode Processing ────────────────────────────────────────────────────
async function processBarcodeInput() {
  const code = barcodeText.value.trim();
  if (!code || processing.value) return;

  processing.value = true;
  barcodeText.value = "";

  try {
    const employee = await findEmployeeByCode(code);
    if (!employee) {
      showResult("error", "Tidak Ditemukan", "ID tidak terdaftar");
      speak("Barcode tidak terdaftar");
      return;
    }

    await processAttendance(employee);
  } catch (e) {
    showResult("error", "Error", e.message);
    speak("Terjadi kesalahan");
  } finally {
    processing.value = false;
    setTimeout(() => barcodeInput.value?.focus(), 100);
  }
}

async function processAttendance(employee) {
  const today = todayStr;
  const todayRecords = todayList.value;
  const existing = todayRecords.find((r) => r.employeeId === employee.employeeId);

  if (scanType.value === "in") {
    if (existing) {
      showResult("warning", employee.name, "Sudah absen masuk hari ini");
      speak(`${employee.name} sudah absen`);
      return;
    }
    const { status, lateMinutes } = computeCheckInStatus(settings);
    const shift = detectShift();
    await recordCheckIn({
      employeeId: employee.employeeId,
      name: employee.name,
      type: employee.type || "staff",
      shift,
      date: today,
      status,
      lateMinutes,
      faceVerified: false,
    });
    const msg = status === "Terlambat" ? `Terlambat ${lateMinutes} menit` : "Tepat Waktu";
    showResult("success", employee.name, `Absen Masuk — ${msg}`);
    speak(status === "Terlambat" ? `${employee.name} terlambat` : `Oke ${employee.name}`);
  } else {
    // Check-out
    if (!existing) {
      showResult("warning", employee.name, "Belum absen masuk. Silakan absen masuk dulu.");
      speak(`${employee.name} belum absen masuk`);
      return;
    }
    if (existing.timeOut) {
      showResult("warning", employee.name, "Sudah absen keluar hari ini");
      speak(`${employee.name} sudah absen pulang`);
      return;
    }
    await recordCheckOut(existing.id);
    showResult("success", employee.name, "Absen Keluar — Selamat pulang!");
    speak(`${employee.name} pulang`);
  }
}

// ── Keyboard → barcode accumulator ───────────────────────────────────────
function onKeyDown(e) {
  if (e.target === barcodeInput.value) return; // already handled by v-model
}

// ── Face Recognition ──────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      cameraActive.value = true;
      await loadFaceModels();
    }
  } catch {
    faceStatus.value = "Kamera tidak tersedia";
  }
}

function loadFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve(window.faceapi);
    const existing = document.getElementById("face-api-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.faceapi));
      return;
    }
    const script = document.createElement("script");
    script.id = "face-api-script";
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload = () => resolve(window.faceapi);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadFaceModels() {
  if (faceApiLoaded) return;
  faceLoading.value = true;
  try {
    const faceapi = await loadFaceApiScript();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/face-api/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/face-api/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/face-api/models"),
    ]);
    faceApiLoaded = true;
    faceDescriptors = await fetchAllFaceDescriptors();
    startFaceScan();
  } catch (e) {
    faceStatus.value = "Gagal load model";
    console.warn("Face API load error:", e);
  } finally {
    faceLoading.value = false;
  }
}

function startFaceScan() {
  scanInterval = setInterval(async () => {
    if (!videoRef.value || !faceApiLoaded) return;
    try {
      const faceapi = window.faceapi;
      if (!faceapi) return;
      const detections = await faceapi
        .detectAllFaces(videoRef.value, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        faceStatus.value = "";
        return;
      }
      if (detections.length > 1) {
        faceStatus.value = "Terlalu banyak wajah";
        return;
      }

      faceStatus.value = "Wajah terdeteksi";
      const desc = detections[0].descriptor;

      // Match against known descriptors
      let bestMatch = null;
      let bestDist = 0.5; // threshold
      for (const [empId, known] of Object.entries(faceDescriptors)) {
        const dist = faceapi.euclideanDistance(desc, known);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = empId;
        }
      }

      if (bestMatch && !processing.value) {
        processing.value = true;
        clearInterval(scanInterval);
        try {
          const employee = await findEmployeeByCode(bestMatch);
          if (employee) {
            await processAttendance({ ...employee, _faceVerified: true });
          }
        } finally {
          processing.value = false;
          // Restart scan after 3 seconds
          setTimeout(() => startFaceScan(), 3000);
        }
      }
    } catch {
      // silent
    }
  }, 1000);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  updateClock();
  const clockInterval = setInterval(updateClock, 1000);

  // Load settings
  try { settings = await fetchAttendanceSettings(); } catch { /* use defaults */ }

  // Today's attendance subscription
  unsubscribe = subscribeTodayAttendance(todayStr, (data) => {
    todayList.value = data;
  });

  // Focus barcode input
  setTimeout(() => barcodeInput.value?.focus(), 200);

  // Cleanup on unmount
  oneCleanup = () => {
    clearInterval(clockInterval);
    if (unsubscribe) unsubscribe();
    clearInterval(scanInterval);
    if (videoRef.value?.srcObject) {
      videoRef.value.srcObject.getTracks().forEach((t) => t.stop());
    }
  };
});

let oneCleanup = null;
onUnmounted(() => oneCleanup?.());
</script>

<style scoped>
.kehadiran-page {
  min-height: 100vh;
  outline: none;
}
</style>
