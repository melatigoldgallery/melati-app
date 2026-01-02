import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { hashPassword } from "../auth/passwordHelper.js";
import { db, auth } from "../configFirebase.js";

let allUsers = [];
let userModalInstance;
let deleteModalInstance;
let userToDelete = null;

// Initialize
document.addEventListener("DOMContentLoaded", async function () {
  userModalInstance = new bootstrap.Modal(document.getElementById("userModal"));
  deleteModalInstance = new bootstrap.Modal(document.getElementById("deleteModal"));

  // Authenticate first
  try {
    await signInWithEmailAndPassword(auth, "melatigoldshopid@gmail.com", "svmlt116");
    await loadUsers();
  } catch (error) {
    console.error("Auth error:", error);
    showToast("Gagal mengautentikasi", "error");
  }

  // Change password checkbox handler
  document.getElementById("changePassword").addEventListener("change", function () {
    const passwordGroup = document.getElementById("passwordGroup");
    const confirmGroup = document.getElementById("confirmPasswordGroup");
    const passwordField = document.getElementById("password");
    const confirmField = document.getElementById("confirmPassword");

    if (this.checked) {
      passwordGroup.style.display = "block";
      confirmGroup.style.display = "block";
      passwordField.required = true;
      confirmField.required = true;
    } else {
      passwordGroup.style.display = "none";
      confirmGroup.style.display = "none";
      passwordField.required = false;
      confirmField.required = false;
      passwordField.value = "";
      confirmField.value = "";
    }
  });
});

// Load all users
async function loadUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    allUsers = [];
    snapshot.forEach((doc) => {
      allUsers.push({ id: doc.id, ...doc.data() });
    });

    renderUsersTable(allUsers);
    updateStats(allUsers);
  } catch (error) {
    console.error("Error loading users:", error);
    showToast("Gagal memuat data user", "error");
  }
}

// Render users table
function renderUsersTable(users) {
  const tbody = document.getElementById("usersTableBody");

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data user</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
    <tr>
      <td><strong>${user.username}</strong></td>
      <td>${user.displayName || "-"}</td>
      <td><span class="role-badge role-${user.role}">${getRoleLabel(user.role)}</span></td>
      <td>${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString("id-ID") : "-"}</td>
      <td>
        ${
          user.username === "supervisor"
            ? '<span class="badge bg-secondary">Protected</span>'
            : `
          <button class="btn btn-sm btn-warning" onclick="openEditModal('${user.username}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${user.username}')">
            <i class="fas fa-trash"></i>
          </button>
        `
        }
      </td>
    </tr>
  `
    )
    .join("");
}

// Update stats
function updateStats(users) {
  document.getElementById("totalUsers").textContent = users.length;
  document.getElementById("totalAdmin").textContent = users.filter(
    (u) => u.role === "admin" || u.role === "admin_custom"
  ).length;
  document.getElementById("totalStaff").textContent = users.filter((u) => u.role === "staf").length;
}

// Get role label
function getRoleLabel(role) {
  const labels = {
    admin: "Admin",
    admin_custom: "Admin Custom",
    staf: "Staff",
  };
  return labels[role] || role;
}

// Search users
window.searchUsers = function () {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allUsers.filter((user) => user.username.toLowerCase().includes(searchTerm));
  renderUsersTable(filtered);
};

// Open add modal
window.openAddModal = function () {
  document.getElementById("modalTitle").textContent = "Tambah User";
  document.getElementById("editMode").value = "false";
  document.getElementById("userForm").reset();
  document.getElementById("username").readOnly = false;
  document.getElementById("changePasswordCheck").style.display = "none";
  document.getElementById("passwordGroup").style.display = "block";
  document.getElementById("confirmPasswordGroup").style.display = "block";
  document.getElementById("password").required = true;
  document.getElementById("confirmPassword").required = true;
  userModalInstance.show();
};

// Open edit modal
window.openEditModal = async function (username) {
  try {
    const userDoc = await getDoc(doc(db, "users", username));
    if (!userDoc.exists()) {
      showToast("User tidak ditemukan", "error");
      return;
    }

    const userData = userDoc.data();
    document.getElementById("modalTitle").textContent = "Edit User";
    document.getElementById("editMode").value = "true";
    document.getElementById("originalUsername").value = username;
    document.getElementById("username").value = userData.username;
    document.getElementById("username").readOnly = true;
    document.getElementById("displayName").value = userData.displayName || "";
    document.getElementById("role").value = userData.role;
    document.getElementById("changePasswordCheck").style.display = "block";
    document.getElementById("changePassword").checked = false;
    document.getElementById("passwordGroup").style.display = "none";
    document.getElementById("confirmPasswordGroup").style.display = "none";
    document.getElementById("password").required = false;
    document.getElementById("confirmPassword").required = false;

    userModalInstance.show();
  } catch (error) {
    console.error("Error loading user:", error);
    showToast("Gagal memuat data user", "error");
  }
};

// Save user (create or update)
window.saveUser = async function () {
  const editMode = document.getElementById("editMode").value === "true";
  const username = document.getElementById("username").value.trim();
  const displayName = document.getElementById("displayName").value.trim();
  const role = document.getElementById("role").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validation
  if (!username || username.length < 3) {
    showToast("Username minimal 3 karakter", "error");
    return;
  }

  if (username.includes(" ")) {
    showToast("Username tidak boleh mengandung spasi", "error");
    return;
  }

  if (!role) {
    showToast("Role harus dipilih", "error");
    return;
  }

  // Password validation (only if adding or changing password)
  const needPassword = !editMode || document.getElementById("changePassword").checked;
  if (needPassword) {
    if (!password || password.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Password dan konfirmasi tidak cocok", "error");
      return;
    }
  }

  try {
    const saveButton = event.target;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Menyimpan...';

    const userData = {
      username: username,
      displayName: displayName,
      role: role,
      updatedAt: new Date(),
    };

    if (needPassword) {
      userData.passwordHash = await hashPassword(password);
    }

    if (editMode) {
      // Update
      const originalUsername = document.getElementById("originalUsername").value;
      await updateDoc(doc(db, "users", originalUsername), userData);
      showToast("User berhasil diperbarui", "success");
    } else {
      // Create
      // Check if username exists
      const existingUser = await getDoc(doc(db, "users", username));
      if (existingUser.exists()) {
        showToast("Username sudah digunakan", "error");
        saveButton.disabled = false;
        saveButton.textContent = "Simpan";
        return;
      }

      userData.createdAt = new Date();
      await setDoc(doc(db, "users", username), userData);
      showToast("User berhasil ditambahkan", "success");
    }

    userModalInstance.hide();
    await loadUsers();
  } catch (error) {
    console.error("Error saving user:", error);
    showToast("Gagal menyimpan user", "error");
  }
};

// Open delete modal
window.openDeleteModal = function (username) {
  if (username === "supervisor") {
    showToast("Tidak dapat menghapus akun supervisor", "error");
    return;
  }

  userToDelete = username;
  document.getElementById("deleteUsername").textContent = username;
  deleteModalInstance.show();
};

// Confirm delete
window.confirmDelete = async function () {
  if (!userToDelete) return;

  try {
    await deleteDoc(doc(db, "users", userToDelete));
    showToast("User berhasil dihapus", "success");
    deleteModalInstance.hide();
    userToDelete = null;
    await loadUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
    showToast("Gagal menghapus user", "error");
  }
};

// Check password strength
window.checkPasswordStrength = function () {
  const password = document.getElementById("password").value;
  const strengthBar = document.getElementById("strengthBar");
  const strengthText = document.getElementById("strengthText");

  let strength = 0;
  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;

  strengthBar.style.width = strength + "%";
  strengthBar.className = "progress-bar";

  if (strength < 50) {
    strengthBar.classList.add("strength-weak");
    strengthText.textContent = "Lemah";
  } else if (strength < 75) {
    strengthBar.classList.add("strength-medium");
    strengthText.textContent = "Sedang";
  } else {
    strengthBar.classList.add("strength-strong");
    strengthText.textContent = "Kuat";
  }
};

// Show toast notification
function showToast(message, type = "info") {
  // Simple alert for now - can be replaced with better toast library
  if (type === "error") {
    alert("❌ " + message);
  } else if (type === "success") {
    alert("✅ " + message);
  } else {
    alert("ℹ️ " + message);
  }
}
