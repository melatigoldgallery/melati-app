<template>
  <div :class="['display-page-outer', rotationClass]">
    <div class="display-page" style="user-select: none">
      <!-- Decorative Background Elements -->
      <div class="gold-decoration top-left"></div>
      <div class="gold-decoration bottom-right"></div>
      <div class="purple-glow top-right"></div>

      <!-- Top Header -->
      <header class="header">
        <div class="container-fluid px-4 px-md-5">
          <div class="row align-items-center justify-content-between">
            <div class="col-md-7 col-12 d-flex align-items-center">
              <!-- Logo & Brand -->
              <div class="logo-container" style="cursor: pointer" @click="handleLogoClick">
                <img src="/img/Melati.jfif" alt="Melati Logo" class="logo gold-shimmer" />
                <div class="brand-text ms-3">
                  <h1 class="brand-name">{{ displaySettings.subtitle || 'Melati Gold Shop' }}</h1>
                </div>
              </div>
            </div>

            <div class="col-md-5 col-12 d-flex justify-content-end align-items-center mt-2 mt-md-0">
              <!-- Rotation Control Button for Smart TV / Kiosk (Sebelah Kiri Date-Time) -->
              <button
                type="button"
                class="rotate-btn-kiosk me-3"
                @click="toggleRotation"
                :title="rotationTooltip"
              >
                <i class="bi bi-arrow-repeat me-1"></i>
                <span class="rotate-label">{{ rotationLabel }}</span>
              </button>

              <div class="date-time text-end">
                <div class="current-date">{{ currentDate }}</div>
                <div class="current-time">{{ currentTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-container">
        <!-- Title Banner -->
        <div class="container-fluid max-w-1600 px-3 px-md-4">
          <div class="page-title position-relative text-center my-3 my-md-4">
            <!-- Back Button (Pojok Kiri Atas Title) -->
            <button 
              type="button" 
              class="back-btn-kiosk position-absolute start-0 top-50 translate-middle-y"
              @click="goBack"
              title="Kembali"
            >
              <i class="bi bi-arrow-left"></i>
            </button>

            <h1 class="mb-0">{{ displaySettings.title || 'HARGA EMAS HARI INI' }}</h1>
            <div class="title-divider mt-2"></div>
          </div>
        </div>

        <!-- Price Table Container -->
        <div class="container-fluid max-w-1600 px-3 px-md-4">
          <div class="price-card-wrapper gold-border shadow-lg">
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
                  <tr v-if="loading" class="text-center">
                    <td colspan="3" class="py-5">
                      <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="!displaySettings.items || displaySettings.items.length === 0" class="text-center">
                    <td colspan="3" class="py-5 text-muted">Belum ada data harga emas.</td>
                  </tr>
                  <tr 
                    v-for="(item, idx) in displaySettings.items" 
                    :key="item.id || idx"
                    class="price-row"
                  >
                    <!-- Kadar Column -->
                    <td class="text-center cell-kadar">
                      <div class="kadar-badge">
                        {{ item.kadar }}
                      </div>
                    </td>

                    <!-- Harga Jual Column (Normal & Branded) -->
                    <td class="cell-harga-jual">
                      <div class="jual-price-container">
                        <!-- Normal Price -->
                        <div class="price-box price-box-normal">
                          <span class="price-value">{{ formatRupiah(item.hargaNormal) }}</span>
                        </div>

                        <!-- Branded Price (PURPLE Background Styling) -->
                        <div 
                          v-if="item.hasBranded" 
                          class="price-box price-box-branded-purple"
                        >
                          <span class="price-label-branded">Branded
                          </span>
                          <span class="price-value-branded">{{ formatRupiah(item.hargaBranded) }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Buyback Column -->
                    <td class="text-center cell-buyback">
                      <div class="price-box price-box-buyback">
                        <span class="price-value-buyback-wrapper">
                          <span class="price-value-buyback">{{ formatRupiah(item.hargaBuyback) }}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notes / Disclaimer Footer -->
          <div class="notes-card gold-border mt-4 p-3 p-md-4">
            <div class="d-flex align-items-center mb-3">
              <i class="bi bi-info-circle-fill text-warning fs-3 me-2"></i>
              <h3 class="notes-title mb-0">CATATAN & KETENTUAN</h3>
            </div>
            <ul class="notes-list mb-0 ps-3">
              <li v-for="(note, nIdx) in displaySettings.notes" :key="nIdx">
                {{ note }}
              </li>
            </ul>
          </div>
        </div>
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

let clockInterval = null;
let unsubscribeSettings = null;

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/dashboard");
  }
}

function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  currentDate.value = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRupiah(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
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
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  unsubscribeSettings = subscribeHargaDisplaySettings((data) => {
    displaySettings.value = data;
    loading.value = false;
  }, (err) => {
    console.error("Gagal memuat harga display:", err);
    loading.value = false;
  });
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (unsubscribeSettings) unsubscribeSettings();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap");

.display-page-outer {
  width: 100%;
  min-height: 100vh;
  background-color: #120e0a;
  overflow: hidden;
}

/* Rotasi Tampilan Fullscreen 90 derajat & 270 derajat */
.display-page-outer.rotate-90 {
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
}

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
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
}

.display-page {
  font-family: "Poppins", sans-serif;
  background-color: #120e0a;
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.18), transparent 70%),
    radial-gradient(circle at 100% 100%, rgba(107, 33, 168, 0.25), transparent 60%);
  color: #f9f5eb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 2rem;
}

.max-w-1600 {
  max-width: 1650px;
  margin: 0 auto;
}

/* Decorative background elements */
.gold-decoration {
  position: fixed;
  opacity: 0.06;
  z-index: 0;
  pointer-events: none;
}
.gold-decoration.top-left {
  top: 5%;
  left: 2%;
  width: 220px;
  height: 220px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%23d4af37' d='M50,0 L100,50 L50,100 L0,50 Z'/></svg>");
  background-repeat: no-repeat;
}
.gold-decoration.bottom-right {
  bottom: 8%;
  right: 3%;
  width: 260px;
  height: 260px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle fill='%23d4af37' cx='50' cy='50' r='50'/></svg>");
}
.purple-glow.top-right {
  position: fixed;
  top: -100px;
  right: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, transparent 70%);
  z-index: 0;
  pointer-events: none;
}

/* Header */
.header {
  background: linear-gradient(135deg, #2b1f13 0%, #17110c 100%);
  border-bottom: 2px solid rgba(212, 175, 55, 0.4);
  padding: 0.9rem 0;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 10;
}
.logo-container {
  display: flex;
  align-items: center;
}
.logo {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d4af37;
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.6);
}
.brand-name {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  font-size: clamp(1.8rem, 2.8vw, 2.6rem);
  color: #ffffff;
  margin-bottom: 0;
  line-height: 1.1;
}
.date-time {
  color: #ffffff;
  white-space: nowrap;
}
.current-date {
  font-size: clamp(1.1rem, 1.8vw, 1.5rem);
  font-weight: 500;
  font-family: "Playfair Display", serif;
  color: #e5e7eb;
  white-space: nowrap;
}
.current-time {
  font-size: clamp(1.5rem, 2.5vw, 2.2rem);
  font-weight: 700;
  color: #f9d776;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* Main Title */
.page-title h1 {
  font-family: "Playfair Display", serif;
  font-size: clamp(2.2rem, 4.5vw, 3.8rem);
  font-weight: 800;
  color: #fef08a;
  text-shadow: 0 4px 15px rgba(212, 175, 55, 0.35);
  letter-spacing: 1.5px;
  margin-bottom: 0.4rem;
}
.title-divider {
  width: 180px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #d4af37, #d4af37, transparent);
  margin: 0 auto;
}

/* Price Card & Gold Border */
.gold-border {
  background: rgba(26, 20, 15, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1.5px solid rgba(212, 175, 55, 0.45);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45);
}

.table-responsive {
  border-radius: 16px;
  overflow: hidden;
}

.display-table {
  color: #f9f5eb;
}

/* ENLARGED TABLE HEADER FONT SIZE & PADDING FOR SMART TV */
.display-table thead th {
  background: linear-gradient(135deg, #332616 0%, #2c2215 100%);
  color: #fce788;
  font-family: "Playfair Display", serif;
  font-size: clamp(1.4rem, 2.3vw, 2.2rem);
  font-weight: 800;
  letter-spacing: 1.5px;
  padding: 1.2rem 1rem;
  border-bottom: 3px solid rgba(212, 175, 55, 0.5);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  text-align: center;
  vertical-align: middle;
}

.header-sub-text {
  font-size: 0.75em;
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  color: #f9d776;
  opacity: 0.9;
  letter-spacing: 1px;
  margin-top: 2px;
} 

.price-row {
  border-bottom: 1px solid rgba(141, 110, 7, 0.438);
  transition: background-color 0.25s ease;
}
.price-row:hover {
  background-color: rgba(212, 175, 55, 0.06);
}

/* Kadar Column (Smaller Width) */
.cell-kadar {
  padding: 1.1rem 0.6rem;
  width: 14%;
}
.kadar-badge {
  display: inline-block;
  font-family: "Playfair Display", serif;
  font-size: clamp(1.6rem, 2.8vw, 2.25rem);
  font-weight: 800;
  color: #fce788;
  background: linear-gradient(135deg, #614523 0%, #1e170e 100%);
  padding: 0.45rem 1.4rem;
  border-radius: 14px;
  box-shadow: 0 5px 18px rgba(212, 175, 55, 0.35);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

/* Harga Jual Column */
.cell-harga-jual {
  padding: 1.1rem 1.2rem;
  width: 54%;
}
.jual-price-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
  justify-content: center;
  width: 100%;
}

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
}

.price-box-normal {
  background: rgba(255, 255, 255, 0.75); 
  border: 3px solid rgba(182, 145, 24, 0.658);
}

/* PURPLE BACKGROUND STYLING FOR BRANDED PRICE */
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

.price-label {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #313131;
  font-weight: 600;
}

.price-label-branded {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #fef08a;
  font-weight: 700;
}

.price-value {
  font-family: "Poppins", sans-serif;
  font-size: clamp(1.5rem, 3.2vw, 3rem);
  font-weight: 700;
  color: #313131;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
 
.price-value-branded {
  font-family: "Poppins", sans-serif;
  font-size: clamp(1.5rem, 3.2vw, 2.9rem);
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Buyback Column */
.cell-buyback {
  padding: 1.1rem 1.2rem;
  width: 32%;
}
.price-box-buyback {
  background: rgba(255, 255, 255, 0.75);
  border: 3px solid rgba(47, 138, 5, 0.596);
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
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
.price-value-buyback {
  font-family: "Poppins", sans-serif;
  font-size: clamp(1.5rem, 3.2vw, 2.7rem);
  font-weight: 800;
  color: #027d08;
  text-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ENLARGED NOTES CARD FONT SIZE */
.notes-card {
  background: rgba(20, 15, 11, 0.92);
}
.notes-title {
  font-family: "Playfair Display", serif;
  font-size: clamp(1.35rem, 2.5vw, 2.2rem);
  font-weight: 800;
  color: #f9d776;
  letter-spacing: 1px;
}
.notes-list li {
  color: #e5e7eb;
  font-size: clamp(1.15rem, 1.8vw, 1.8rem);
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

/* Kiosk Back Button */
.back-btn-kiosk {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #6b5102;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
}
.back-btn-kiosk:hover {
  background: rgba(255, 249, 230, 0.795);
  transform: scale(1.08);
}

/* Rotation Button */
.rotate-btn-kiosk {
  height: 38px;
  padding: 0 1rem;
  border-radius: 20px;
  border:none;
  background: transparent;
  color: #161101;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
.rotate-btn-kiosk:hover {
  background: rgba(212, 175, 55, 0.35);
  color: #ffffff;
  transform: scale(1.05);
}

/* Portrait TV Optimization */
@media (orientation: portrait) {
  .display-page {
    min-height: 100vh;
    height: auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 2rem;
  }
  .cell-kadar {
    padding: 0.75rem 0.4rem;
  }
  .cell-harga-jual {
    padding: 0.75rem 0.5rem;
  }
  .cell-buyback {
    padding: 0.75rem 0.5rem;
  }
  .kadar-badge {
    font-size: clamp(1.4rem, 3.2vw, 2.4rem);
    padding: 0.45rem 1.3rem;
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
  .price-value-branded,
  .price-value-buyback {
    font-size: clamp(1.4rem, 3.2vw, 2.4rem);
  }
  .notes-card {
    margin-top: 1rem !important;
    padding: 0.8rem 1.2rem !important;
  }
  .notes-title {
    font-size: clamp(1.2rem, 2vw, 1.6rem);
  }
  .notes-list li {
    font-size: clamp(1rem, 1.5vw, 1.35rem);
    margin-bottom: 0.35rem;
  }
}

@media (max-width: 768px) {
  .jual-price-container {
    flex-direction: column;
  }
  .price-box {
    min-width: 100%;
  }
  .cell-kadar, .cell-harga-jual, .cell-buyback {
    padding: 0.75rem 0.5rem;
  }
  .rotate-label {
    display: none;
  }
}
</style>
