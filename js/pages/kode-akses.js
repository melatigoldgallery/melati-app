import { auth, firestore, authService } from "../configFirebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Definisi password dengan deskripsi
const PASSWORD_DEFINITIONS = {
  editDataPenjualan: {
    label: "Edit Data Penjualan",
    desc: "Kode akses untuk mengedit transaksi penjualan aksesoris",
    icon: "fa-edit",
    color: "primary",
  },
  deleteDataPenjualan: {
    label: "Hapus Data Penjualan",
    desc: "Kode akses untuk menghapus transaksi penjualan aksesoris",
    icon: "fa-trash-alt",
    color: "danger",
  },
  editServis: {
    label: "Edit Data Servis",
    desc: "Kode akses untuk mengedit data servis dan custom",
    icon: "fa-wrench",
    color: "warning",
  },
  deleteServis: {
    label: "Hapus Data Servis",
    desc: "Kode akses untuk menghapus data servis dan custom",
    icon: "fa-times-circle",
    color: "danger",
  },
};

class KodeAksesManager {
  constructor() {
    this.passwords = {};
    this.currentEditKey = null;
    this.currentUser = null;
  }

  async init() {
    try {
      // Wait for auth state to be ready
      this.currentUser = await this.waitForAuth();

      if (!this.currentUser) {
        console.log("⚠️ No authenticated user, redirecting to login");
        window.location.href = "index.html";
        return;
      }

      console.log("✅ User authenticated:", this.currentUser.email);

      this.setupEventListeners();
      await this.loadPasswords();
      this.renderPasswordList();

      document.getElementById("loadingIndicator").style.display = "none";
      document.getElementById("passwordCard").style.display = "block";

      console.log("✅ Kode Akses Manager initialized");
    } catch (error) {
      console.error("Error initializing:", error);
      this.showAlert("Gagal memuat halaman: " + error.message, "error");
    }
  }

  // Wait for Firebase Auth to be ready
  waitForAuth() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  setupEventListeners() {
    // Edit password button
    document.getElementById("btnSavePassword").addEventListener("click", () => this.updatePassword());

    // Toggle password visibility (new password)
    document.getElementById("togglePassword").addEventListener("click", () => {
      const input = document.getElementById("newPassword");
      const icon = document.querySelector("#togglePassword i");
      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });

    // Enter key handlers
    document.getElementById("oldPassword").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("newPassword").focus();
      }
    });

    document.getElementById("newPassword").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("confirmPassword").focus();
      }
    });

    document.getElementById("confirmPassword").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.updatePassword();
      }
    });

    // Close modal handlers
    $("#editPasswordModal").on("hidden.bs.modal", () => {
      this.currentEditKey = null;
      document.getElementById("oldPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    });

    // Auto focus
    $("#editPasswordModal").on("shown.bs.modal", () => {
      document.getElementById("oldPassword").focus();
    });
  }

  async loadPasswords() {
    try {
      const docRef = doc(firestore, "settings", "passwords");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.passwords = docSnap.data();
        console.log("✅ Passwords loaded from Firestore");
      } else {
        // Initialize dengan default passwords
        this.passwords = {
          editDataPenjualan: "admin123",
          deleteDataPenjualan: "smlt116",
          editServis: "admin123",
          deleteServis: "smlt116",
          lastUpdated: Timestamp.now(),
          updatedBy: this.currentUser.email,
        };

        // Save to Firestore
        await setDoc(docRef, this.passwords);
        console.log("✅ Default passwords initialized");
      }
    } catch (error) {
      console.error("Error loading passwords:", error);
      throw error;
    }
  }

  renderPasswordList() {
    const tbody = document.getElementById("passwordList");
    tbody.innerHTML = "";

    Object.keys(PASSWORD_DEFINITIONS).forEach((key) => {
      const def = PASSWORD_DEFINITIONS[key];
      const lastUpdated = this.passwords.lastUpdated
        ? this.formatDate(this.passwords.lastUpdated)
        : "Belum pernah diubah";
      const updatedBy = this.passwords.updatedBy || "System";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="d-flex align-items-center">
            <div class="me-3">
              <i class="fas ${def.icon} fa-2x text-${def.color}"></i>
            </div>
            <div>
              <strong>${def.label}</strong>
            </div>
          </div>
        </td>
        <td>
          <div class="function-description">${def.desc}</div>
        </td>
        <td>
          <div class="last-updated">
            <i class="far fa-clock me-1"></i>${lastUpdated}
            <br>
            <small class="text-muted">oleh: ${updatedBy}</small>
          </div>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary" onclick="kodeAksesApp.showEditPasswordModal('${key}')">
            <i class="fas fa-edit me-1"></i>Ubah
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  showEditPasswordModal(key) {
    this.currentEditKey = key;
    const def = PASSWORD_DEFINITIONS[key];

    document.getElementById("editPasswordFunctionLabel").textContent = def.label;
    document.getElementById("editPasswordFunctionDesc").textContent = def.desc;

    // Reset inputs
    document.getElementById("oldPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    $("#editPasswordModal").modal("show");
  }

  async updatePassword() {
    const oldPassword = document.getElementById("oldPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    // ✅ CRITICAL: Verify currentEditKey is set
    if (!this.currentEditKey) {
      this.showAlert("Terjadi kesalahan: Tidak ada kode akses yang dipilih untuk diubah", "error");
      $("#editPasswordModal").modal("hide");
      return;
    }

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      this.showAlert("Semua field harus diisi!", "warning");
      return;
    }

    // ✅ Verify old password
    const currentPassword = this.passwords[this.currentEditKey];
    if (!currentPassword) {
      this.showAlert("Kode akses tidak ditemukan di sistem", "error");
      return;
    }

    if (oldPassword !== currentPassword) {
      this.showAlert("Kode akses lama salah! Periksa kembali kode akses yang sekarang.", "error");
      document.getElementById("oldPassword").value = "";
      document.getElementById("oldPassword").focus();
      return;
    }

    if (newPassword.length < 6) {
      this.showAlert("Kode akses baru minimal 6 karakter!", "warning");
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showAlert("Kode akses baru dan konfirmasi tidak cocok!", "warning");
      return;
    }

    // Check if new password same as old
    if (newPassword === oldPassword) {
      this.showAlert("Kode akses baru tidak boleh sama dengan kode akses lama!", "warning");
      return;
    }

    // Jangan izinkan password yang terlalu lemah
    if (newPassword === "123456" || newPassword === "password" || newPassword === "admin") {
      this.showAlert("Kode akses terlalu lemah! Gunakan kombinasi yang lebih aman.", "warning");
      return;
    }

    // ✅ Store key before closing modal
    const keyToUpdate = this.currentEditKey;

    try {
      // ✅ Use stored key instead of this.currentEditKey (which might be null after modal close)
      console.log(`🔑 Updating password for key: ${keyToUpdate}`);

      // Update password
      const docRef = doc(firestore, "settings", "passwords");
      const updateData = {
        [keyToUpdate]: newPassword,
        lastUpdated: Timestamp.now(),
        updatedBy: this.currentUser.email,
      };

      console.log("📝 Update data:", updateData);

      await updateDoc(docRef, updateData);

      // Update local data
      this.passwords[keyToUpdate] = newPassword;
      this.passwords.lastUpdated = Timestamp.now();
      this.passwords.updatedBy = this.currentUser.email;

      // Close modal
      $("#editPasswordModal").modal("hide");

      this.renderPasswordList();

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Kode akses ${PASSWORD_DEFINITIONS[keyToUpdate].label} berhasil diubah`,
        timer: 2500,
        showConfirmButton: false,
      });

      console.log(`✅ Password updated successfully for: ${keyToUpdate}`);
    } catch (error) {
      console.error("Error updating password:", error);
      this.showAlert("Gagal mengubah kode akses: " + error.message, "error");
    }
  }

  formatDate(timestamp) {
    try {
      let date;
      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return "Tidak diketahui";
      }

      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return date.toLocaleDateString("id-ID", options);
    } catch (error) {
      return "Tidak diketahui";
    }
  }

  showAlert(message, type = "info") {
    const iconMap = {
      success: "success",
      error: "error",
      warning: "warning",
      info: "info",
    };

    Swal.fire({
      icon: iconMap[type] || "info",
      title: type === "error" ? "Error!" : type === "success" ? "Berhasil!" : "Perhatian",
      text: message,
      confirmButtonText: "OK",
      confirmButtonColor: "#0d6efd",
    });
  }
}

// Initialize
let kodeAksesApp;
$(document).ready(async function () {
  try {
    kodeAksesApp = new KodeAksesManager();
    await kodeAksesApp.init();
    window.kodeAksesApp = kodeAksesApp; // Export to global
  } catch (error) {
    console.error("Failed to initialize:", error);
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Gagal memuat halaman: " + error.message,
    });
  }
});

export default KodeAksesManager;
