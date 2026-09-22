<template>
  <div :class="['display-page-outer', currentThemeClass, rotationClass]">
    <div class="display-page">
      <!-- Ambient Light Orbs -->
      <div aria-hidden="true" class="ambient-orb orb-top"></div>
      <div aria-hidden="true" class="ambient-orb orb-bottom"></div>

      <!-- Main Totem Card -->
      <main class="totem-main-card">
        <!-- Header Section -->
        <header class="totem-header">
          <!-- Action Bar: Back (Left), Live Clock (Center), Rotate (Right) -->
          <div class="totem-top-bar">
            <div class="top-bar-left">
              <button
                type="button"
                class="kiosk-clean-btn back-btn"
                @click="goBack"
                title="Kembali"
              >
                <i class="bi bi-arrow-left"></i>
                <span class="btn-text ms-1.5">Kembali</span>
              </button>
            </div>

            <div class="top-bar-center">
              <div class="live-clock-pill">
                <span class="clock-date">{{ currentDate }}</span>
                <span class="clock-time">{{ currentTime }}</span>
              </div>
            </div>

            <div class="top-bar-right d-flex align-items-center gap-2">
              <button
                type="button"
                class="kiosk-clean-btn rotate-btn"
                @click="toggleRotation"
                :title="rotationTooltip"
              >
                <i class="bi bi-arrow-repeat"></i>
                <span class="btn-text ms-1.5">{{ rotationLabel }}</span>
              </button>
            </div>
          </div>

          <!-- Luxury Boutique Logo -->
          <div class="logo-inset-box mt-1" @click="handleLogoClick" title="Klik 3x untuk Menu Bar">
            <img
              src="/img/logo.png"
              alt="Melati Gold Shop Logo"
              class="boutique-logo"
              @error="handleLogoError"
            />
          </div>

          <!-- Headline & Tagline -->
          <h1 class="headline-title gold-gradient-text">
            {{ displaySettings.title || 'Harga Emas Hari Ini' }}
          </h1>
          <p class="tagline-subtitle">
            {{ displaySettings.tagline || 'Transparan • Harga dan Kualitas terbaik' }}
          </p>
        </header>

        <!-- Marquee Ribbon (Running Ticker) -->
        <div v-if="tickerItems.length > 0" class="marquee-ribbon">
          <div class="marquee-track">
            <div class="marquee-group">
              <span v-for="(msg, idx) in tickerItems" :key="`t1-${idx}`" class="marquee-item">
                <span class="sparkle-bullet">✦</span> {{ msg }}
              </span>
            </div>
            <div class="marquee-group" aria-hidden="true">
              <span v-for="(msg, idx) in tickerItems" :key="`t2-${idx}`" class="marquee-item">
                <span class="sparkle-bullet">✦</span> {{ msg }}
              </span>
            </div>
          </div>
        </div>

        <!-- Price Table Container (Follows displayhargaold UI & font sizes) -->
        <section class="price-table-container">
          <div class="price-card-wrapper shadow-lg">
            <div class="table-responsive">
              <table class="table display-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th class="text-center col-kadar">KADAR</th>
                    <th class="text-center col-harga-jual">HARGA PER GRAM</th>
                    <th class="text-center col-buyback">
                      BUYBACK
                      <div class="header-sub-text">(JUAL KEMBALI)</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Loading State -->
                  <tr v-if="loading" class="text-center">
                    <td colspan="3" class="py-5">
                      <div class="spinner-border text-gold-spinner" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                      <div class="mt-2 text-muted fs-5">Memuat harga emas terkini...</div>
                    </td>
                  </tr>

                  <!-- Empty State -->
                  <tr v-else-if="!displaySettings.items || displaySettings.items.length === 0" class="text-center">
                    <td colspan="3" class="py-5 text-muted fs-5">
                      Belum ada data harga emas yang dikonfigurasi.
                    </td>
                  </tr>

                  <!-- Price Rows Matrix -->
                  <tr 
                    v-else
                    v-for="(item, idx) in displaySettings.items" 
                    :key="item.id || idx"
                    class="price-row"
                  >
                    <!-- Kadar Column (Gold Coin Radial Badge from DisplayHargaView) -->
                    <td class="text-center cell-kadar">
                      <div class="kadar-badge-container">
                        <div class="gold-coin-radial">
                          {{ getKadarDetails(item.kadar).kadarText }}
                        </div>
                      </div>
                    </td>

                    <!-- Harga Jual Column (Normal & Branded) -->
                    <td class="cell-harga-jual">
                      <div class="jual-price-container">
                        <!-- Normal Price -->
                        <div class="price-box price-box-normal">
                          <span class="price-value">{{ formatRupiah(item.hargaNormal) }}</span>
                        </div>

                        <!-- Branded Price (Purple Background Glowing Styling) -->
                        <div 
                          v-if="item.hasBranded" 
                          class="price-box price-box-branded-purple"
                        >
                          <span class="price-value-branded">{{ formatRupiah(item.hargaBranded) }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Buyback Column -->
                    <td class="text-center cell-buyback">
                      <div class="price-box price-box-buyback">
                        <span class="price-value-buyback-wrapper">
                          <span class="price-value">{{ formatRupiah(item.hargaBuyback) }}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Assurance & Policy Footer -->
        <footer class="totem-footer">
          <div class="policy-frosted-card">
            <div
              v-for="(note, nIdx) in (displaySettings.notes || [])"
              :key="nIdx"
              class="policy-item"
            >
              <span class="policy-icon">
                <i :class="getNoteIcon(nIdx, note)"></i>
              </span>
              <div class="policy-text">
                <strong v-if="nIdx === 0" class="highlight-assurance">{{ note }}</strong>
                <span v-else class="secondary-note">{{ note }}</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { 
  DEFAULT_HARGA_DISPLAY_SETTINGS, 
  subscribeHargaDisplaySettings 
} from "@/services/harga-display-service";

const router = useRouter();

const displaySettings = ref({ ...DEFAULT_HARGA_DISPLAY_SETTINGS });
const loading = ref(true);
const currentTime = ref("");
const currentDate = ref("");

// Theme State
const currentThemeClass = computed(() => {
  return (displaySettings.value.theme || "dark") === "light" ? "theme-light" : "theme-dark";
});

// Screen Rotation State: '0' | '90' | '-90'
const rotationDeg = ref("0");

const rotationClass = computed(() => {
  if (rotationDeg.value === "90") return "rotate-90";
  if (rotationDeg.value === "-90" || rotationDeg.value === "270") return "rotate-270";
  return "rotate-0";
});

const rotationLabel = computed(() => {
  if (rotationDeg.value === "90") return "90° Kanan";
  if (rotationDeg.value === "-90" || rotationDeg.value === "270") return "90° Kiri";
  return "0° Normal";
});

const rotationTooltip = computed(() => {
  return `Rotasi Tampilan TV (Sekarang: ${rotationLabel.value}). Klik untuk memutar.`;
});

function toggleRotation() {
  if (rotationDeg.value === "0") {
    rotationDeg.value = "90";
  } else if (rotationDeg.value === "90") {
    rotationDeg.value = "-90";
  } else {
    rotationDeg.value = "0";
  }
  localStorage.setItem("harga_display_rotation", rotationDeg.value);
}

function loadSavedRotation() {
  const saved = localStorage.getItem("harga_display_rotation");
  if (saved && ["0", "90", "-90", "270"].includes(saved)) {
    rotationDeg.value = saved;
  }
}

// Ticker Messages computed list
const tickerItems = computed(() => {
  if (displaySettings.value.tickerMessages && displaySettings.value.tickerMessages.length > 0) {
    return displaySettings.value.tickerMessages.filter(Boolean);
  }
  return DEFAULT_HARGA_DISPLAY_SETTINGS.tickerMessages;
});

// Kadar badge & detail resolver
function getKadarDetails(kadarStr) {
  const raw = String(kadarStr || "").trim();
  const digitsOnly = raw.replace(/\D/g, "");
  const num = parseInt(digitsOnly, 10);
  const isFav = num === 17 || raw.toUpperCase().includes("700") || raw.toUpperCase().includes("70%");

  return {
    kadarText: raw || "GOLD",
    isFav,
  };
}

// Automatic icon selector for each note
function getNoteIcon(idx, noteText = "") {
  const lower = String(noteText || "").toLowerCase();
  if (lower.includes("buyback") || lower.includes("terbaik") || lower.includes("rusak") || lower.includes("garansi")) {
    return "bi bi-patch-check-fill";
  }
  if (lower.includes("potongan") || lower.includes("kadar") || lower.includes("syarat") || lower.includes("diskon")) {
    return "bi bi-shield-check";
  }
  if (lower.includes("pasar") || lower.includes("dunia") || lower.includes("berubah") || lower.includes("sewaktu")) {
    return "bi bi-graph-up-arrow";
  }
  const defaultIcons = ["bi bi-patch-check-fill", "bi bi-shield-check", "bi bi-info-circle-fill", "bi bi-stars"];
  return defaultIcons[idx % defaultIcons.length];
}

let clockInterval = null;
let unsubscribeSettings = null;

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/dashboard");
  }
}

function updateBoutiqueClock() {
  const now = new Date();
  const optionsDate = { weekday: "long", day: "numeric", month: "short", year: "numeric" };
  currentDate.value = now.toLocaleDateString("id-ID", optionsDate).toUpperCase();
  
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  currentTime.value = `${hours}:${minutes}:${seconds} WIB`;
}

function formatRupiah(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function handleLogoError(event) {
  if (event.target.src.includes("logo.png")) {
    event.target.src = "/img/Melati.jfif";
  }
}

let logoClickCount = 0;
let logoClickTimeout = null;

function handleLogoClick() {
  logoClickCount++;
  if (logoClickCount >= 3) {
    logoClickCount = 0;
    if (logoClickTimeout) clearTimeout(logoClickTimeout);
    if (window.electronAPI && window.electronAPI.toggleMenuBar) {
      window.electronAPI.toggleMenuBar();
    }
    return;
  }
  if (logoClickTimeout) clearTimeout(logoClickTimeout);
  logoClickTimeout = setTimeout(() => {
    logoClickCount = 0;
  }, 1000);
}

onMounted(() => {
  loadSavedRotation();
  updateBoutiqueClock();
  clockInterval = setInterval(updateBoutiqueClock, 1000);

  unsubscribeSettings = subscribeHargaDisplaySettings(
    (data) => {
      displaySettings.value = data;
      loading.value = false;
    },
    (err) => {
      console.error("Gagal memuat harga display:", err);
      loading.value = false;
    }
  );
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (unsubscribeSettings) unsubscribeSettings();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;1,600&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap");

/* ==========================================================================
   THEME DESIGN TOKENS
   ========================================================================== */
.theme-dark {
  --bg-page: radial-gradient(circle at 50% 12%, #141724 0%, #090A0F 60%, #050608 100%);
  --text-main: #e7e5e4;
  --text-title: linear-gradient(135deg, #FFF1C5 0%, #F3E5AB 25%, #D4AF37 55%, #AA7C11 100%);
  --text-subtitle: rgba(223, 202, 134, 0.88);
  --btn-color: rgba(85, 74, 38, 0.548);
  --btn-hover-color: #f3e5ab;
  --btn-hover-bg: rgba(212, 175, 55, 0.12);
  --orb-top: rgba(212, 175, 55, 0.14);
  --orb-bottom: rgba(184, 146, 40, 0.12);
  --card-bg: rgba(12, 15, 22, 0.95);
  --card-border: rgba(212, 175, 55, 0.32);
  --card-shadow: 0 28px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(212, 175, 55, 0.08);
  --header-border: rgba(212, 175, 55, 0.22);
  --clock-bg: rgba(20, 24, 36, 0.92);
  --clock-border: rgba(212, 175, 55, 0.32);
  --clock-date: #d6d3d1;
  --clock-time: #f3e5ab;
  --logo-bg: linear-gradient(to bottom, #181c28, #10131d);
  --logo-border: transparent;
  --logo-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08);
  --logo-filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.25));
  --ticker-bg: rgba(18, 22, 34, 0.92);
  --ticker-border: rgba(212, 175, 55, 0.32);
  --ticker-text: #f5eed8;
  
  /* Table Container & Header Tokens */
  --table-card-bg: rgba(14, 18, 28, 0.95);
  --table-card-border: rgba(212, 175, 55, 0.32);
  --th-bg: linear-gradient(180deg, rgba(28, 34, 52, 0.98) 0%, rgba(18, 22, 36, 0.98) 100%);
  --th-color: #fce788;
  --th-subcolor: #f9d776;
  --th-border: 2px solid rgba(212, 175, 55, 0.4);
  --row-border: rgba(212, 175, 55, 0.18);
  --row-hover-bg: rgba(212, 175, 55, 0.08);

  /* Gold Coin Badge Tokens (DisplayHargaView) */
  --coin-bg: radial-gradient(circle at 35% 30%, #FFEBAA 0%, #E5C158 50%, #A0751A 100%);
  --coin-color: #0c0a09;
  --coin-border: rgba(253, 230, 138, 0.65);
  --coin-shadow: 0 4px 14px rgba(212, 175, 55, 0.45);

  /* Price Box Tokens (Normal & Buyback Uniform Color) */
  --price-box-bg: rgba(22, 28, 44, 0.95);
  --price-box-border: rgba(212, 175, 55, 0.35);
  --price-box-shadow: 0 4px 15px rgba(0, 0, 0, 0.45);
  --price-value-color: #ffffff;

  /* Footer Tokens */
  --footer-border: rgba(212, 175, 55, 0.22);
  --footer-bg: linear-gradient(145deg, rgba(22, 26, 36, 0.88) 0%, rgba(14, 17, 24, 0.92) 100%);
  --footer-card-border: rgba(212, 175, 55, 0.22);
  --footer-text: #d6d3d1;
  --footer-icon: #facc15;
  --footer-highlight: #FFF1C5;
  --spinner-color: #d4af37;
}

.theme-light {
  --bg-page: radial-gradient(circle at 50% 8%, #FFFFFF 0%, #FAF8F5 45%, #F4EFE6 100%);
  --text-main: #292524;
  --text-title: linear-gradient(135deg, #684803 0%, #B89228 35%, #D4AF37 55%, #8B6508 100%);
  --text-subtitle: rgba(90, 64, 9, 0.88);
  --btn-color: rgba(219, 207, 141, 0.45);
  --btn-hover-color: #78350f;
  --btn-hover-bg: rgba(184, 146, 40, 0.12);
  --orb-top: rgba(212, 175, 55, 0.16);
  --orb-bottom: rgba(235, 220, 177, 0.38);
  --card-bg: rgba(250, 248, 245, 0.92);
  --card-border: rgba(212, 175, 55, 0.42);
  --card-shadow: 0 24px 60px rgba(180, 140, 70, 0.16);
  --header-border: rgba(212, 175, 55, 0.22);
  --clock-bg: rgba(255, 255, 255, 0.95);
  --clock-border: rgba(212, 175, 55, 0.38);
  --clock-date: #44403c;
  --clock-time: #997519;
  --logo-bg: #ffffff;
  --logo-border: rgba(212, 175, 55, 0.32);
  --logo-shadow: 0 4px 16px rgba(184, 134, 11, 0.08);
  --logo-filter: drop-shadow(0 2px 6px rgba(212, 175, 55, 0.15));
  --ticker-bg: rgba(255, 255, 255, 0.88);
  --ticker-border: rgba(212, 175, 55, 0.38);
  --ticker-text: #292524;

  /* Table Container & Header Tokens */
  --table-card-bg: rgba(255, 255, 255, 0.92);
  --table-card-border: rgba(212, 175, 55, 0.38);
  --th-bg: linear-gradient(180deg, rgba(252, 249, 242, 0.98) 0%, rgba(245, 239, 226, 0.98) 100%);
  --th-color: #78350f;
  --th-subcolor: #997519;
  --th-border: 2px solid rgba(212, 175, 55, 0.38);
  --row-border: rgba(212, 175, 55, 0.22);
  --row-hover-bg: rgba(212, 175, 55, 0.08);

  /* Gold Coin Badge Tokens (DisplayHargaView) */
  --coin-bg: radial-gradient(circle at 35% 30%, #FDF4D8 0%, #E5C158 52%, #997519 100%);
  --coin-color: #1c1917;
  --coin-border: rgba(255, 255, 255, 0.8);
  --coin-shadow: 0 3px 12px rgba(184, 134, 11, 0.3);

  /* Price Box Tokens (Normal & Buyback Uniform Color) */
  --price-box-bg: rgba(248, 245, 238, 0.95);
  --price-box-border: rgba(212, 175, 55, 0.45);
  --price-box-shadow: 0 4px 14px rgba(184, 134, 11, 0.12);
  --price-value-color: #292524;

  /* Footer Tokens */
  --footer-border: rgba(212, 175, 55, 0.28);
  --footer-bg: rgba(255, 255, 255, 0.88);
  --footer-card-border: rgba(212, 175, 55, 0.3);
  --footer-text: #44403c;
  --footer-icon: #b45309;
  --footer-highlight: #1c1917;
  --spinner-color: #997519;
}

/* ==========================================================================
   Base Layout & Fullscreen Container
   ========================================================================== */
.display-page-outer {
  width: 100vw;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  font-family: "Poppins", "Plus Jakarta Sans", sans-serif;
  background: var(--bg-page);
  color: var(--text-main);
  user-select: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.display-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  padding: 0.85rem 1.4rem 1.5rem;
  position: relative;
  box-sizing: border-box;
}

/* Scrollbar Customization */
.display-page-outer::-webkit-scrollbar,
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.display-page-outer::-webkit-scrollbar-track,
::-webkit-scrollbar-track {
  background: transparent;
}
.display-page-outer::-webkit-scrollbar-thumb,
::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.3);
  border-radius: 10px;
}
.display-page-outer::-webkit-scrollbar-thumb:hover,
::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 175, 55, 0.6);
}

/* Rotation System (90° & 270°) */
.display-page-outer.rotate-90,
.display-page-outer.rotate-270 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.display-page-outer.rotate-90 .display-page {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vh;
  height: 100vw;
  transform: translate(-50%, -50%) rotate(90deg);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.85rem 1.25rem 1.5rem;
}

.display-page-outer.rotate-270 .display-page {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vh;
  height: 100vw;
  transform: translate(-50%, -50%) rotate(-90deg);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.85rem 1.25rem 1.5rem;
}

/* Ambient Light Orbs */
.ambient-orb {
  position: absolute;
  pointer-events: none;
  border-radius: 9999px;
  z-index: 0;
}
.orb-top {
  top: -8rem;
  left: 50%;
  transform: translateX(-50%);
  width: 55rem;
  height: 25rem;
  filter: blur(140px);
  background-color: var(--orb-top);
}
.orb-bottom {
  bottom: -8rem;
  left: 50%;
  transform: translateX(-50%);
  width: 55rem;
  height: 25rem;
  filter: blur(140px);
  background-color: var(--orb-bottom);
}

/* Totem Card Container */
.totem-main-card {
  width: 100%;
  max-width: 1650px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  padding: 1.2rem 1.8rem;
  position: relative;
  z-index: 10;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-sizing: border-box;
  gap: 0.85rem;
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
}

/* Top Header & Bar */
.totem-header {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 0.5rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--header-border);
}

.totem-top-bar {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 0.35rem;
}

.top-bar-left { display: flex; justify-content: flex-start; }
.top-bar-center { display: flex; justify-content: center; }
.top-bar-right { display: flex; justify-content: flex-end; }

/* Control Buttons */
.kiosk-clean-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.8rem;
  border: none;
  background: transparent;
  box-shadow: none;
  border-radius: 9999px;
  font-size: clamp(0.85rem, 1.1vw, 1.05rem);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
  color: var(--btn-color);
  opacity: 0.7;
}

.kiosk-clean-btn:hover {
  opacity: 1;
  color: var(--btn-hover-color);
  background: var(--btn-hover-bg);
  transform: translateY(-1px) scale(1.04);
}

/* Live Clock Pill */
.live-clock-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 1.25rem;
  border-radius: 9999px;
  font-size: clamp(0.9rem, 1.25vw, 1.15rem);
  background: var(--clock-bg);
  border: 1px solid var(--clock-border);
}

@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.25); }
}

.clock-date {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--clock-date);
}


.clock-time {
  font-weight: 800;
  font-family: monospace;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
  color: var(--clock-time);
}

/* Boutique Logo Inset */
.logo-inset-box {
  margin-top: 50px;
  padding: 10px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.boutique-logo {
  height: clamp(6.5rem, 14vw, 11rem);
  max-height: 175px;
  object-fit: contain;
  filter: var(--logo-filter);
}

/* Headline & Tagline */
.headline-title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 3.6vw, 3.4rem);
  font-weight: 800;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.45rem;
  margin-bottom: 0;
}

.gold-gradient-text {
  background: var(--text-title);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tagline-subtitle {
  font-size: clamp(0.88rem, 1.2vw, 1.2rem);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-top: 0.25rem;
  margin-bottom: 0;
  color: var(--text-subtitle);
}

/* Marquee Ribbon */
.marquee-ribbon {
  position: relative;
  z-index: 10;
  width: 100%;
  margin: 0.25rem 0 0.5rem;
  overflow: hidden;
  border-radius: 9999px;
  padding: 0.65rem 0;
  flex-shrink: 0;
  background: var(--ticker-bg);
  border: 1px solid var(--ticker-border);
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marqueeScroll 28s linear infinite;
}

.marquee-ribbon:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marqueeScroll {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

.marquee-group {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.marquee-item {
  display: inline-flex;
  align-items: center;
  margin: 0 1.8rem;
  font-size: clamp(0.95rem, 1.35vw, 1.3rem);
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ticker-text);
}

.sparkle-bullet {
  font-size: 1.05rem;
  font-weight: 900;
  margin-right: 0.5rem;
  color: #d4af37;
}

/* ==========================================================================
   PRICE TABLE SECTION (THEMED BACKGROUND & OVERRIDES BOOTSTRAP WHITE BG)
   ========================================================================== */
.price-table-container {
  width: 100%;
  position: relative;
  z-index: 10;
  margin: 0.35rem 0;
}

.price-card-wrapper {
  background: var(--table-card-bg);
  border-radius: 16px;
  overflow: hidden;
  border: 1.5px solid var(--table-card-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.table-responsive {
  border-radius: 16px;
  overflow: hidden;
  background: transparent !important;
}

/* Override Bootstrap .table default white backgrounds */
.display-table {
  color: var(--text-main) !important;
  width: 100%;
  border-collapse: collapse;
  background-color: transparent !important;
  --bs-table-bg: transparent !important;
  --bs-table-accent-bg: transparent !important;
  --bs-table-striped-bg: transparent !important;
  --bs-table-hover-bg: transparent !important;
  --bs-table-color: var(--text-main) !important;
}

.display-table > :not(caption) > * > * {
  background-color: transparent !important;
  color: var(--text-main) !important;
  box-shadow: none !important;
}

.display-table tbody,
.display-table tbody tr,
.display-table tbody td {
  background-color: transparent !important;
  background: transparent !important;
}

/* ENLARGED TABLE HEADER (Playfair Display 800) */
.display-table thead th {
  background: var(--th-bg) !important;
  color: var(--th-color) !important;
  font-family: "Playfair Display", serif;
  font-size: clamp(1.4rem, 2.3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: 1.5px;
  padding: 1.2rem 1rem;
  border-bottom: var(--th-border) !important;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  text-align: center;
  vertical-align: middle;
}

.header-sub-text {
  font-size: 0.75em;
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: var(--th-subcolor);
  opacity: 0.9;
  letter-spacing: 1px;
  margin-top: 2px;
}

/* Table Rows & Columns Proportion */
.price-row {
  border-bottom: 1px solid var(--row-border) !important;
  transition: background-color 0.25s ease;
}

.price-row:hover {
  background-color: var(--row-hover-bg) !important;
}

/* 1. Kadar Column (14% Width, Gold Coin Radial Badge) */
.cell-kadar {
  padding: 1.1rem 0.6rem;
  width: 14%;
  vertical-align: middle;
}

.kadar-badge-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gold-coin-radial {
  width: clamp(3.8rem, 6vw, 5.5rem);
  height: clamp(3.8rem, 6vw, 5.5rem);
  border-radius: 9999px;
  font-family: "Cinzel", "Playfair Display", serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 2.4vw, 2.3rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--coin-bg);
  color: var(--coin-color);
  border: 1.5px solid var(--coin-border);
  box-shadow: var(--coin-shadow);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
}

/* 2. Harga Jual Column (54% Width) */
.cell-harga-jual {
  padding: 1.1rem 1.2rem;
  width: 54%;
  vertical-align: middle;
}

.jual-price-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
  justify-content: center;
  width: 100%;
}

/* Unified Price Box Style (Matches DisplayHargaView Theme) */
.price-box {
  display: flex;
  flex-direction: column;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  text-align: center;
  background: var(--price-box-bg);
  border: 1.5px solid var(--price-box-border);
  box-shadow: var(--price-box-shadow);
}

/* Normal Price Box & Buyback Box (Uniform Colors) */
.price-box-normal,
.price-box-buyback {
  background: var(--price-box-bg);
  border: 1.5px solid var(--price-box-border);
}

/* 3. Buyback Column (32% Width) */
.cell-buyback {
  padding: 1.1rem 1.2rem;
  width: 32%;
  vertical-align: middle;
}

.price-box-buyback {
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.price-value-buyback-wrapper {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.35rem;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
}

/* Large Price Value Digits (displayhargaold Size) */
.price-value {
  font-family: "Poppins", "Plus Jakarta Sans", sans-serif;
  font-size: clamp(1.5rem, 3.2vw, 3.2rem);
  font-weight: 700;
  color: var(--price-value-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

/* Branded Price Box (Royal Purple Background Glowing Styling) */
.price-box-branded-purple {
  background: linear-gradient(135deg, #6b21a8 0%, #4c1d95 60%, #3b0764 100%);
  border: 1.5px solid #c084fc;
  box-shadow: 0 6px 20px rgba(147, 51, 234, 0.45);
  animation: purplePulse 4s infinite alternate;
}

@keyframes purplePulse {
  0% {
    box-shadow: 0 4px 15px rgba(147, 51, 234, 0.35);
  }
  100% {
    box-shadow: 0 8px 25px rgba(168, 85, 247, 0.65);
  }
}

.price-label-branded {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #fef08a;
  font-weight: 700;
  margin-bottom: 2px;
}

.price-value-branded {
  font-family: "Poppins", "Plus Jakarta Sans", sans-serif;
  font-size: clamp(1.5rem, 3.2vw, 3.1rem);
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  line-height: 1.2;
}

/* ==========================================================================
   ASSURANCE & POLICY FOOTER
   ========================================================================== */
.totem-footer {
  position: relative;
  z-index: 10;
  width: 100%;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  flex-shrink: 0;
  border-top: 1px solid var(--footer-border);
}

.policy-frosted-card {
  border-radius: 20px;
  padding: 1.1rem 1.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background: var(--footer-bg);
  border: 1px solid var(--footer-card-border);
  color: var(--footer-text);
}

.policy-item {
  display: flex;
  align-items: flex-start;
  gap: 0.95rem;
  line-height: 1.45;
}

.policy-icon {
  font-size: clamp(1.6rem, 2.5vw, 2.4rem);
  flex-shrink: 0;
  margin-top: 0.05rem;
  color: var(--footer-icon);
}

.policy-text { flex: 1; }

.highlight-assurance {
  font-size: clamp(1.2rem, 1.85vw, 1.85rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--footer-highlight);
}

.secondary-note {
  font-size: clamp(1.05rem, 1.55vw, 1.55rem);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.text-gold-spinner {
  color: var(--spinner-color);
}

/* ==========================================================================
   SCREEN ROTATION & RESPONSIVE TV STYLING
   ========================================================================== */
@media (orientation: portrait) {
  .cell-kadar {
    padding: 0.75rem 0.4rem;
  }
  .cell-harga-jual {
    padding: 0.75rem 0.5rem;
  }
  .cell-buyback {
    padding: 0.75rem 0.5rem;
  }
  .gold-coin-radial {
    width: clamp(2.8rem, 4.8vh, 3.8rem);
    height: clamp(2.8rem, 4.8vh, 3.8rem);
    font-size: clamp(1.15rem, 2.2vh, 1.65rem);
  }
  .jual-price-container {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .price-box {
    min-width: 100%;
    padding: 0.5rem 0.7rem;
  }
  .price-value,
  .price-value-branded {
    font-size: clamp(1.4rem, 3.2vw, 2.4rem);
  }
  .policy-frosted-card {
    padding: 0.8rem 1.2rem;
  }
}

@media (max-width: 768px) {
  .totem-top-bar {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 0.5rem;
  }
  .top-bar-left { grid-column: 1; grid-row: 1; }
  .top-bar-right { grid-column: 2; grid-row: 1; }
  .top-bar-center { grid-column: 1 / span 2; grid-row: 2; }
  .totem-main-card {
    padding: 1rem;
    border-radius: 20px;
  }
  .jual-price-container {
    flex-direction: column;
  }
  .price-box {
    min-width: 100%;
  }
}

@media (max-width: 540px) {
  .kiosk-clean-btn .btn-text {
    display: none;
  }
  .gold-coin-radial {
    width: 3rem;
    height: 3rem;
    font-size: 1.1rem;
  }
  .price-value,
  .price-value-branded {
    font-size: 1.3rem;
  }
}
</style>
