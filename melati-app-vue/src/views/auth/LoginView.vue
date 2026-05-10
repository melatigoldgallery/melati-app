<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-overlay"></div>

    <main class="login-shell">
      <section class="login-card" :aria-label="`Form Login ${brandName}`">
        <div class="brand-ribbon" aria-hidden="true">{{ brandRibbonText }}</div>

        <header class="login-header">
          <img :alt="`Logo ${brandName}`" src="/img/Melati.jfif" width="72" height="72" class="brand-logo" />
          <h1 class="brand-title">{{ brandName }}</h1>
          <p class="brand-subtitle">Sistem Manajemen Toko</p>
        </header>

        <section v-if="!selectedFloor" class="floor-picker" aria-label="Pilih lantai operasional">
          <div class="picker-head">
            <p class="floor-picker-title mb-1">Pilih Lantai Operasional</p>
            <p class="floor-picker-subtitle mb-0">Pilih lantai kerja Anda untuk melanjutkan proses login.</p>
          </div>
          <div class="floor-grid mt-4">
            <button type="button" class="floor-tile text-center" @click="selectFloor('L1')">
              <span class="floor-tile-icon text-center"><i class="bi bi-building-fill"></i></span>
              <span class="floor-tile-title">Lantai 1</span>
              <span class="floor-tile-note">Melati Gold Shop</span>
            </button>
            <button type="button" class="floor-tile text-center" @click="selectFloor('L2')">
              <span class="floor-tile-icon text-center"><i class="bi bi-building"></i></span>
              <span class="floor-tile-title">Lantai 2</span>
              <span class="floor-tile-note">Melati Gold Young</span>
            </button>
          </div>
        </section>

        <form v-else class="login-form" @submit.prevent="handleLogin">
          <div class="floor-switcher" role="group" aria-label="Ganti lantai">
            <div class="floor-switcher-head">
              <span class="floor-switcher-label">Akses Lantai: {{ floorLabel }}</span>
              <button type="button" class="floor-reset-link d-none d-md-block" @click="selectedFloor = ''">
                Pilih Lantai
              </button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="identifier">Email / Username</label>
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true"><i class="bi bi-person"></i></span>
              <input
                id="identifier"
                v-model="form.identifier"
                type="text"
                class="field-input"
                placeholder="Masukkan email atau username"
                required
                autocomplete="username"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="password">Password</label>
            <div class="field-wrap">
              <span class="field-icon" aria-hidden="true"><i class="bi bi-lock"></i></span>
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="field-input"
                placeholder="Masukkan password"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="error-box" role="alert" aria-live="polite">
            <i class="bi bi-exclamation-circle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="login-button" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? "Masuk..." : "Masuk" }}
            <i v-if="!loading" class="bi bi-arrow-right"></i>
          </button>
        </form>

        <footer class="login-footer mt-5">&copy; 2026 {{ brandName }}. All rights reserved.</footer>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getFloorLabel, normalizeFloorId } from "@/config/floor-config";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = ref({ identifier: "", password: "" });
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref("");
const selectedFloor = ref("");
const floorLabel = computed(() => getFloorLabel(selectedFloor.value || "L1"));
const effectiveFloor = computed(() => selectedFloor.value || "L1");
const brandName = computed(() => (effectiveFloor.value === "L2" ? "Melati Gold Young" : "Melati Gold Shop"));
const brandRibbonText = computed(() => (effectiveFloor.value === "L2" ? "MELATI YOUNG" : "MELATI GOLD"));

const mobileMediaQuery = window.matchMedia("(max-width: 767.98px)");

function selectFloor(floorId) {
  selectedFloor.value = normalizeFloorId(floorId);
  errorMsg.value = "";
}

function handleMediaQueryChange(e) {
  if (e.matches) {
    // Mobile: auto-select L1
    selectedFloor.value = "L1";
  } else {
    // Desktop: show floor picker
    selectedFloor.value = "";
  }
}

onMounted(() => {
  // Initial state based on current viewport
  if (mobileMediaQuery.matches) {
    selectedFloor.value = "L1";
  }

  // Listen for viewport changes (resize, dev tools toggle, etc.)
  mobileMediaQuery.addEventListener("change", handleMediaQueryChange);
});

onUnmounted(() => {
  // Cleanup: remove listener to prevent memory leaks
  mobileMediaQuery.removeEventListener("change", handleMediaQueryChange);
});

async function handleLogin() {
  errorMsg.value = "";
  loading.value = true;
  try {
    await auth.login(form.value.identifier, form.value.password, selectedFloor.value);
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
    "auth/floor-required": "Pilih lantai terlebih dahulu.",
    "auth/floor-user-mismatch": "Akun tidak terdaftar untuk lantai yang dipilih.",
    "auth/floor-role-not-allowed": "Role akun tidak diizinkan untuk lantai yang dipilih.",
  };
  return map[code] || "Terjadi kesalahan. Coba lagi.";
}
</script>

<style scoped>
.floor-picker-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-900);
}

.floor-picker-subtitle {
  font-size: 0.83rem;
  color: var(--ink-700);
}

.picker-head {
  margin-bottom: 14px;
}

.floor-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.floor-tile {
  border: 1px solid #d5deeb;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.floor-tile:hover {
  transform: translateY(-2px);
  border-color: #e0ae19;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.floor-tile-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffe8a3 0%, #f2bf3b 100%);
  color: #3e2d00;
  margin-bottom: 4px;
}

.floor-tile-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink-900);
}

.floor-tile-note {
  font-size: 0.77rem;
  color: #5f6878;
}

.floor-switcher {
  border: 1px solid #dbe4f0;
  border-radius: 12px;
  padding: 10px;
  background: linear-gradient(145deg, #ffffff 0%, #f6f9fc 100%);
  margin-bottom: 2px;
}

.floor-switcher-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.floor-reset-link {
  border: 0;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 600;
  color: #59667a;
  text-decoration: underline;
}

.floor-switcher-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #334155;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.login-page {
  --gold-primary: #ffd447;
  --gold-secondary: #b68617;
  --ink-900: #0f172a;
  --ink-700: #334155;
  --surface: rgba(255, 255, 255, 0.96);
  --surface-line: rgba(15, 23, 42, 0.14);

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1000px 600px at 80% -100px, rgba(255, 215, 0, 0.25), transparent 70%),
    radial-gradient(800px 500px at -10% 120%, rgba(255, 193, 7, 0.18), transparent 70%),
    linear-gradient(135deg, #000000 0%, #0d0d0d 60%, #111111 100%);
}

.login-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.6)),
    repeating-linear-gradient(
      0deg,
      rgba(255, 215, 0, 0.05) 0px,
      rgba(255, 215, 0, 0.05) 1px,
      transparent 1px,
      transparent 16px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(255, 215, 0, 0.05) 0px,
      rgba(255, 215, 0, 0.05) 1px,
      transparent 1px,
      transparent 16px
    );
}

.login-shell {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: var(--surface);
  backdrop-filter: blur(10px);
  border: 1px solid var(--surface-line);
  box-shadow:
    0 18px 50px rgba(6, 12, 22, 0.26),
    0 0 0 3px rgba(255, 212, 71, 0.12);
  padding: 22px 18px 18px;
  min-height: 450px;
  display: flex;
  flex-direction: column;
}

.brand-ribbon {
  position: absolute;
  top: 30px;
  right: -36px;
  transform: rotate(45deg);
  background: linear-gradient(135deg, var(--gold-primary), var(--gold-secondary));
  color: #111;
  font-weight: 700;
  letter-spacing: 0.6px;
  padding: 5px 64px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  text-transform: uppercase;
  font-size: 10px;
  pointer-events: none;
}

.login-header {
  text-align: center;
  margin-bottom: 14px;
}

.brand-logo {
  border-radius: 50%;
  border: 3px solid #fff;
  filter: drop-shadow(0 6px 16px rgba(255, 212, 71, 0.24)) saturate(1.06);
}

.brand-title {
  margin: 10px 0 4px;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 700;
  color: var(--ink-900);
  text-shadow: 0 1px 0 rgba(255, 212, 71, 0.2);
}

.brand-subtitle {
  margin: 0;
  color: var(--ink-700);
  font-size: 0.92rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.field-label {
  font-weight: 600;
  font-size: 0.87rem;
  color: #202938;
  margin-top: 2px;
}

.field-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #cad2df;
  border-radius: 12px;
  background: #fff;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.field-wrap:focus-within {
  border-color: #e0ae19;
  box-shadow: 0 0 0 3px rgba(255, 212, 71, 0.24);
}

.field-icon {
  color: var(--gold-secondary);
  width: 40px;
  text-align: center;
  font-size: 0.95rem;
}

.field-input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink-900);
  padding: 12px 10px 12px 0;
  font-size: 0.86rem;
}

.field-input::placeholder {
  color: #8a94a8;
}

.toggle-password {
  border: 0;
  background: transparent;
  color: var(--gold-secondary);
  width: 42px;
  cursor: pointer;
}

.error-box {
  margin-top: 2px;
  border-radius: 10px;
  border: 1px solid rgba(220, 53, 69, 0.25);
  background: rgba(220, 53, 69, 0.08);
  color: #b02a37;
  padding: 10px 12px;
  font-size: 0.84rem;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.login-button {
  margin-top: 4px;
  border: 1px solid var(--gold-secondary);
  border-radius: 12px;
  padding: 8px 12px;
  width: 100%;
  font-weight: 700;
  background: linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-secondary) 100%);
  color: #111;
  box-shadow: 0 10px 30px rgba(255, 212, 71, 0.34);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 34px rgba(255, 212, 71, 0.48);
}

.login-button:active:not(:disabled) {
  transform: translateY(-1px);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-button .bi-arrow-right {
  margin-left: 6px;
}

.login-footer {
  margin-top: 16px;
  color: #5f6878;
  font-size: 0.76rem;
  text-align: center;
}

@media (min-width: 768px) {
  .login-page {
    padding: 28px;
  }

  .floor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .login-card {
    max-width: 400px;
    padding: 28px 24px 20px;
    border-radius: 20px;
  }

  .brand-title {
    font-size: 1.5rem;
  }

  .brand-ribbon {
    right: -52px;
    font-size: 10.5px;
  }

  .field-label {
    font-size: 0.9rem;
  }

  .field-input {
    font-size: 0.9rem;
  }
}

@media (min-width: 1100px) {
  .login-card {
    max-width: 400px;
  }

  .brand-title {
    font-size: 1.6rem;
  }
}
</style>
