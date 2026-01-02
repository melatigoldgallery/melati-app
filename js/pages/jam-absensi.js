// Import Firebase modules
import { db } from "../configFirebase.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Constants
const SETTINGS_DOC = "settings/attendanceThresholds";
const DEFAULT_SETTINGS = {
  staff: { morning: "09:00", afternoon: "14:21" },
  ob: { morning: "07:31", afternoon: "13:46" },
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
    }
  );
}

/**
 * Update UI with current settings
 */
function updateUI(settings) {
  // Update input fields
  staffMorningInput.value = settings.staff.morning;
  staffAfternoonInput.value = settings.staff.afternoon;
  obMorningInput.value = settings.ob.morning;
  obAfternoonInput.value = settings.ob.afternoon;
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
    lastUpdated: new Date().toISOString(),
    updatedBy: "Admin",
  };

  try {
    const settingsRef = doc(db, "settings", "attendanceThresholds");
    await setDoc(settingsRef, newSettings);

    loadingOverlay.classList.remove("active");

    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      html: `
        <div class="text-start">
          <p><strong>Pengaturan jam absensi telah disimpan:</strong></p>
          <ul style="list-style: none; padding-left: 0;">
            <li><i class="fas fa-user text-primary"></i> Staff Pagi: <strong>${newSettings.staff.morning}</strong></li>
            <li><i class="fas fa-user text-primary"></i> Staff Sore: <strong>${newSettings.staff.afternoon}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Pagi: <strong>${newSettings.ob.morning}</strong></li>
            <li><i class="fas fa-broom text-info"></i> OB Sore: <strong>${newSettings.ob.afternoon}</strong></li>
          </ul>
          <p class="text-muted mb-0"><small>Perubahan berlaku di semua perangkat secara real-time</small></p>
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

    // Add event listeners
    saveBtn.addEventListener("click", saveSettings);
    resetBtn.addEventListener("click", resetToDefault);

    // Add Enter key support for inputs
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
