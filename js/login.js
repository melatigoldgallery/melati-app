import { verifyPassword } from "./auth/passwordHelper.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  toastMessage.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/**
 * Login user using Firestore authentication
 * @param {string} username - Username
 * @param {string} password - Password (plain text)
 * @returns {Promise<{success: boolean, username?: string, role?: string, message?: string}>}
 */
async function loginWithFirestore(username, password) {
  try {
    // Initialize Firebase Auth with admin account (for SDK access only)
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, "melatigoldshopid@gmail.com", "svmlt116");

    // Get user data from Firestore
    const db = getFirestore();
    const userDocRef = doc(db, "users", username);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.log(`User not found: ${username}`);
      return { success: false, message: "Username tidak ditemukan" };
    }

    const userData = userDocSnap.data();

    // Verify password
    const isPasswordValid = await verifyPassword(password, userData.passwordHash);

    if (!isPasswordValid) {
      console.log("Password verification failed");
      return { success: false, message: "Password salah" };
    }

    console.log(`Login successful for user: ${username}`);
    return {
      success: true,
      username: userData.username,
      role: userData.role,
      displayName: userData.displayName || userData.username,
      permissions: userData.permissions || null,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Terjadi kesalahan saat login" };
  }
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showToast("Mohon isi username dan password");
    return;
  }

  try {
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    const originalButtonText = loginButton ? loginButton.innerHTML : "Login";
    if (loginButton) {
      loginButton.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
      loginButton.disabled = true;
    }

    console.log("Attempting to login with username:", username);

    // Login menggunakan Firestore
    const result = await loginWithFirestore(username, password);

    if (loginButton) {
      loginButton.innerHTML = originalButtonText;
      loginButton.disabled = false;
    }

    if (result.success) {
      console.log("Login successful, redirecting...");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({
          username: result.username,
          role: result.role,
          displayName: result.displayName,
          permissions: result.permissions,
        })
      );
      sessionStorage.setItem("userRole", result.role);
      window.location.href = "dashboard.html";
    } else {
      showToast(result.message || "Username atau password salah. Silakan coba lagi.");
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast("Terjadi kesalahan saat login. Silakan periksa koneksi internet dan coba lagi.");
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    if (loginButton) {
      loginButton.innerHTML = "Login";
      loginButton.disabled = false;
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Toggle password visibility
  const togglePasswordButton = document.querySelector(".toggle-password");
  const passwordInput = document.getElementById("password");

  if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener("click", function () {
      // Toggle tipe input antara 'password' dan 'text'
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Toggle icon antara 'eye' dan 'eye-slash'
      const icon = this.querySelector("i");
      if (type === "password") {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      } else {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    });
  }

  // Kode login lainnya yang sudah ada...
});
