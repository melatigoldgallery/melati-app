// Import Firebase modules
import { db } from "../configFirebase.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Constants
const SETTINGS_DOC = "settings/attendanceThresholds";
const DEFAULT_SETTINGS = {
  staff: { morning: "09:00", afternoon: "14:21" },
  ob: { morning: "07:31", afternoon: "13:46" },
  faceVerification: {
    enabled: true,
    rules: {
      checkIn: {
        morning: true,
        afternoon: false,
      },
      checkOut: {
        morning: false,
        afternoon: false,
      },
    },
  },
};

// Global state
let currentSettings = null;
let settingsListener = null;

// DOM Elements
const staffMorningInput = document.getElementById("staffMorningTime");
const staffAfternoonInput = document.getElementById("staffAfternoonTime");
const obMorningInput = document.getElementById("obMorningTime");
const obAfternoonInput = document.getElementById("obAfternoonTime");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const loadingOverlay = document.getElementById("loadingOverlay");

// Face Verification DOM Elements
const fvMasterToggle = document.getElementById("fvMasterToggle");
const fvDetailedRules = document.getElementById("fvDetailedRules");
const fvBypassWarning = document.getElementById("fvBypassWarning");
const fvStatusBadge = document.getElementById("fvStatusBadge");
const fvStatusBadgeOff = document.getElementById("fvStatusBadgeOff");
const fvCheckInMorning = document.getElementById("fvCheckInMorning");
const fvCheckInAfternoon = document.getElementById("fvCheckInAfternoon");
const fvCheckOutMorning = document.getElementById("fvCheckOutMorning");
const fvCheckOutAfternoon = document.getElementById("fvCheckOutAfternoon");

/**
 * Initialize real-time listener for settings
 */
function initRealtimeListener() {
  const settingsRef = doc(db, "settings", "attendanceThresholds");

  settingsListener = onSnapshot(
    settingsRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        currentSettings = docSnapshot.data();
      } else {
        currentSettings = DEFAULT_SETTINGS;
      }
      updateUI(currentSettings);
    },
    (error) => {
      console.error("Error listening to settings:", error);
      Swal.fire({
        icon: "error",
        title: "Koneksi Error",
        text: "Gagal memuat pengaturan. Pastikan koneksi internet Anda stabil.",
      });
    },
  );
}

/**
 * Update UI with current settings
 */
function updateUI(settings) {
  // Update threshold input fields
  staffMorningInput.value = settings.staff.morning;
  staffAfternoonInput.value = settings.staff.afternoon;
  obMorningInput.value = settings.ob.morning;
  obAfternoonInput.value = settings.ob.afternoon;

  // Update face verification UI
  if (settings.faceVerification) {
    const fv = settings.faceVerification;

    // Master toggle
    fvMasterToggle.checked = fv.enabled;

    // Rules
    if (fv.rules) {
      fvCheckInMorning.checked = fv.rules.checkIn.morning;
      fvCheckInAfternoon.checked = fv.rules.checkIn.afternoon;
      fvCheckOutMorning.checked = fv.rules.checkOut.morning;
      fvCheckOutAfternoon.checked = fv.rules.checkOut.afternoon;
    }

    // Update visibility
    updateFaceVerificationVisibility(fv.enabled);
  }
}

/**
 * Update face verification visibility based on master toggle
 */
function updateFaceVerificationVisibility(isEnabled) {
  if (isEnabled) {
    fvDetailedRules.style.display = "block";
    fvBypassWarning.style.display = "none";
    fvStatusBadge.style.display = "inline-block";
    fvStatusBadgeOff.style.display = "none";
  } else {
    fvDetailedRules.style.display = "none";
    fvBypassWarning.style.display = "block";
    fvStatusBadge.style.display = "none";
    fvStatusBadgeOff.style.display = "inline-block";
  }
}

/**
 * Validate time inputs
 */
function validateInputs() {
  const staffMorning = staffMorningInput.value;
  const staffAfternoon = staffAfternoonInput.value;
  const obMorning = obMorningInput.value;
  const obAfternoon = obAfternoonInput.value;

  if (!staffMorning || !staffAfternoon || !obMorning || !obAfternoon) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Semua field waktu harus diisi!",
    });
    return false;
  }

  // Validate afternoon > morning for each type
  const staffMorningTime = new Date(`1970-01-01T${staffMorning}`);
  const staffAfternoonTime = new Date(`1970-01-01T${staffAfternoon}`);
  const obMorningTime = new Date(`1970-01-01T${obMorning}`);
  const obAfternoonTime = new Date(`1970-01-01T${obAfternoon}`);

  if (staffAfternoonTime <= staffMorningTime) {
    Swal.fire({
      icon: "warning",
      title: "Waktu Tidak Valid",
      text: "Jam shift sore Staff harus lebih besar dari shift pagi!",
    });
    return false;
  }

  if (obAfternoonTime <= obMorningTime) {
    Swal.fire({
      icon: "warning",
      title: "Waktu Tidak Valid",
      text: "Jam shift sore OB harus lebih besar dari shift pagi!",
    });
    return false;
  }

  return true;
}

/**
 * Save settings to Firestore
 */
async function saveSettings() {
  if (!validateInputs()) return;

  loadingOverlay.classList.add("active");
  saveBtn.disabled = true;

  const newSettings = {
    staff: {
      morning: staffMorningInput.value,
      afternoon: staffAfternoonInput.value,
    },
    ob: {
      morning: obMorningInput.value,
      afternoon: obAfternoonInput.value,
    },
    faceVerification: {
      enabled: fvMasterToggle.checked,
      rules: {
        checkIn: {
          morning: fvCheckInMorning.checked,
          afternoon: fvCheckInAfternoon.checked,
        },
        checkOut: {
          morning: fvCheckOutMorning.checked,
          afternoon: fvCheckOutAfternoon.checked,
        },
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: "Admin",
    },
    lastUpdated: new Date().toISOString(),
    updatedBy: "Admin",
  };

  try {
    const settingsRef = doc(db, "settings", "attendanceThresholds");
    await setDoc(settingsRef, newSettings);

    loadingOverlay.classList.remove("active");

    // Build face verification summary
    const fvSummary = buildFaceVerificationSummary(newSettings.faceVerification);

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      html: `
        <div class="text-start">
          <p><strong>Pengaturan telah disimpan:</strong></p>
          
          <h6 class="mt-3 mb-2">Jam Absensi:</h6>
          <ul style="list-style: none; padding-left: 0;">
            <li><i class="fas fa-user text-primary"></i> Staff Pagi: <strong>${newSettings.staff.morning}</strong></li>
            <li><i class="fas fa-user text-primary"></i> Staff Sore: <strong>${newSettings.staff.afternoon}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Pagi: <strong>${newSettings.ob.morning}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Sore: <strong>${newSettings.ob.afternoon}</strong></li>
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
  } catch (error) {
    console.error("Error saving settings:", error);
    loadingOverlay.classList.remove("active");

    Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: "Terjadi kesalahan saat menyimpan pengaturan. Silakan coba lagi.",
      footer: `<small>Error: ${error.message}</small>`,
    });
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Build face verification summary for success message
 */
function buildFaceVerificationSummary(fv) {
  if (!fv.enabled) {
    return '<p class="text-danger"><i class="fas fa-times-circle"></i> <strong>NONAKTIF</strong> - Semua absensi tanpa verifikasi wajah</p>';
  }

  const activeRules = [];

  if (fv.rules.checkIn.morning) {
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Masuk - Shift Pagi</li>');
  }
  if (fv.rules.checkIn.afternoon) {
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Masuk - Shift Sore</li>');
  }
  if (fv.rules.checkOut.morning) {
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Pulang - Shift Pagi</li>');
  }
  if (fv.rules.checkOut.afternoon) {
    activeRules.push('<li><i class="fas fa-check text-success"></i> Scan Pulang - Shift Sore</li>');
  }

  if (activeRules.length === 0) {
    return '<p class="text-warning"><i class="fas fa-exclamation-circle"></i> <strong>AKTIF</strong> tapi tidak ada rule yang dicentang</p>';
  }

  return `
    <p class="text-success mb-2"><i class="fas fa-check-circle"></i> <strong>AKTIF</strong> untuk:</p>
    <ul class="mb-0">${activeRules.join("")}</ul>
  `;
}

/**
 * Reset to default settings
 */
function resetToDefault() {
  Swal.fire({
    icon: "question",
    title: "Reset ke Default?",
    html: `
      <p>Anda akan mereset pengaturan ke nilai default:</p>
      <ul style="list-style: none; padding-left: 0;">
        <li><i class="fas fa-user text-primary"></i> Staff Pagi: <strong>09:00</strong></li>
        <li><i class="fas fa-user text-primary"></i> Staff Sore: <strong>14:21</strong></li>
        <li><i class="fas fa-broom text-info"></i> OB Pagi: <strong>07:31</strong></li>
        <li><i class="fas fa-broom text-info"></i> OB Sore: <strong>13:46</strong></li>
      </ul>
    `,
    showCancelButton: true,
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
  }).then(async (result) => {
    if (result.isConfirmed) {
      loadingOverlay.classList.add("active");

      try {
        const settingsRef = doc(db, "settings", "attendanceThresholds");
        await setDoc(settingsRef, {
          ...DEFAULT_SETTINGS,
          lastUpdated: new Date().toISOString(),
          updatedBy: "Admin (Reset)",
        });

        loadingOverlay.classList.remove("active");

        Swal.fire({
          icon: "success",
          title: "Reset Berhasil!",
          text: "Pengaturan telah dikembalikan ke nilai default",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Error resetting settings:", error);
        loadingOverlay.classList.remove("active");

        Swal.fire({
          icon: "error",
          title: "Gagal Reset",
          text: "Terjadi kesalahan saat reset pengaturan",
        });
      }
    }
  });
}

/**
 * Initialize page
 */
async function initPage() {
  try {
    // Load initial settings
    const settingsRef = doc(db, "settings", "attendanceThresholds");
    const docSnapshot = await getDoc(settingsRef);

    if (docSnapshot.exists()) {
      currentSettings = docSnapshot.data();
    } else {
      currentSettings = DEFAULT_SETTINGS;
      // Create default settings if not exists
      await setDoc(settingsRef, {
        ...DEFAULT_SETTINGS,
        lastUpdated: new Date().toISOString(),
        updatedBy: "System (Initial)",
      });
    }

    updateUI(currentSettings);

    // Start real-time listener
    initRealtimeListener();

    // Add event listeners for save and reset
    saveBtn.addEventListener("click", saveSettings);
    resetBtn.addEventListener("click", resetToDefault);

    // Face Verification Master Toggle event listener
    fvMasterToggle.addEventListener("change", (e) => {
      updateFaceVerificationVisibility(e.target.checked);

      // If turning OFF, show confirmation
      if (!e.target.checked) {
        Swal.fire({
          icon: "warning",
          title: "Nonaktifkan Verifikasi Wajah?",
          text: "Semua absensi akan diproses TANPA verifikasi wajah. Anda yakin?",
          showCancelButton: true,
          confirmButtonText: "Ya, Nonaktifkan",
          cancelButtonText: "Batal",
          confirmButtonColor: "#dc3545",
        }).then((result) => {
          if (!result.isConfirmed) {
            // Revert toggle
            e.target.checked = true;
            updateFaceVerificationVisibility(true);
          }
        });
      }
    });

    // Add Enter key support for time inputs
    [staffMorningInput, staffAfternoonInput, obMorningInput, obAfternoonInput].forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveSettings();
      });
    });
  } catch (error) {
    console.error("Error initializing page:", error);
    Swal.fire({
      icon: "error",
      title: "Error Inisialisasi",
      text: "Gagal memuat halaman. Silakan refresh browser Anda.",
    });
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (settingsListener) {
    settingsListener();
  }
});

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initPage);
