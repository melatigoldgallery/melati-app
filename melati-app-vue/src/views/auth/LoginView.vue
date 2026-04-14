<template>
  <div class="login-wrapper d-flex align-items-center justify-content-center min-vh-100 bg-light">
    <div class="card shadow-lg border-0 login-card">
      <!-- Header Gold -->
      <div class="login-header text-center py-4 px-3">
        <img
          src="/img/Melati.jfif"
          alt="logo"
          width="72"
          height="72"
          class="rounded-circle mb-2 border border-3 border-white"
        />
        <h4 class="text-white fw-bold mb-0">Melati Gold Shop</h4>
        <small class="text-white-50">Sistem Manajemen Toko</small>
      </div>

      <div class="card-body px-4 py-4">
        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email / Username</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input
                v-model="form.identifier"
                type="text"
                class="form-control"
                placeholder="masukkan email atau username"
                required
                autocomplete="username"
              />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Password</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="alert alert-danger py-2 small">
            <i class="bi bi-exclamation-circle me-1"></i>
            {{ errorMsg }}
          </div>

          <button type="submit" class="btn btn-primary w-100 fw-semibold mt-1" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? "Masuk..." : "Masuk" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = ref({ identifier: "", password: "" });
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");

async function handleLogin() {
  errorMsg.value = "";
  loading.value = true;
  try {
    await auth.login(form.value.identifier, form.value.password);
    const redirect = route.query.redirect || "/dashboard";
    router.push(redirect);
  } catch (err) {
    errorMsg.value = mapFirebaseError(err.code);
  } finally {
    loading.value = false;
  }
}

function mapFirebaseError(code) {
  const map = {
    "auth/invalid-credential": "Email/username atau password salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
    "auth/network-request-failed": "Tidak ada koneksi internet.",
    "auth/user-disabled": "Akun tidak aktif. Hubungi admin.",
    "auth/server-login-config": "Layanan login username belum siap. Hubungi admin sistem.",
    "permission-denied": "Akses login ditolak oleh aturan database. Hubungi admin.",
    "auth/operation-not-allowed": "Metode login belum diaktifkan di Firebase Auth.",
    "auth/username-not-found": "Username tidak ditemukan. Gunakan email atau hubungi admin.",
    "auth/username-no-email": "Username belum ditautkan dengan email login. Hubungi admin.",
  };
  return map[code] || "Terjadi kesalahan. Coba lagi.";
}
</script>

<style scoped>
.login-wrapper {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}
.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  overflow: hidden;
}
.login-header {
  background: linear-gradient(135deg, #c8a96e, #a8894e);
}
.btn-primary {
  background-color: #c8a96e;
  border-color: #c8a96e;
}
.btn-primary:hover {
  background-color: #a8894e;
  border-color: #a8894e;
}
</style>
