<template>
  <div class="kiosk-page">
    <!-- Background Wrapper to prevent horizontal overflow -->
    <div class="kiosk-background-wrapper">
      <!-- Blur Orbs for modern glassmorphic background -->
      <div class="blur-circle gold-blur"></div>
      <div class="blur-circle dark-blur"></div>

      <!-- Decorative Elements -->
      <div class="gold-decoration top-left"></div>
      <div class="gold-decoration bottom-right"></div>
    </div>

    <div class="kiosk-container container-fluid d-flex flex-column justify-content-between py-4">
      <!-- Header -->
      <header class="text-center mt-3 animate-fade-in position-relative">
        <!-- Back Button (Arrow Left) -->
        <button 
          type="button" 
          class="back-btn-kiosk position-absolute start-0 top-0 mt-2 ms-3 d-flex align-items-center justify-content-center"
          @click="goBack"
          title="Kembali"
        >
          <i class="fas fa-arrow-left"></i>
        </button>

        <!-- Language Toggle -->
        <div class="lang-toggle-wrapper position-absolute end-0 top-0 mt-2 me-3 d-none d-md-block">
          <div class="lang-toggle-pill">
            <button 
              type="button"
              class="lang-btn" 
              :class="{ active: currentLang === 'id' }" 
              @click="currentLang = 'id'"
            >
              Bahasa
            </button>
            <button 
              type="button"
              class="lang-btn" 
              :class="{ active: currentLang === 'en' }" 
              @click="currentLang = 'en'"
            >
              English
            </button>
          </div>
        </div>
        
        <div class="lang-toggle-wrapper d-block d-md-none mb-3 text-center">
          <div class="lang-toggle-pill d-inline-flex">
            <button 
              type="button"
              class="lang-btn" 
              :class="{ active: currentLang === 'id' }" 
              @click="currentLang = 'id'"
            >
              Bahasa
            </button>
            <button 
              type="button"
              class="lang-btn" 
              :class="{ active: currentLang === 'en' }" 
              @click="currentLang = 'en'"
            >
              English
            </button>
          </div>
        </div>

        <div class="logo-container justify-content-center" style="cursor: pointer" @click="handleLogoClick">
          <img src="/img/Melati.jfif" alt="Logo" class="logo gold-shimmer" />
          <h1 class="brand-name">{{ brandName }}</h1>
        </div>
        <p class="subtitle text-muted mt-2" v-html="t('subtitle')"></p>
      </header>

      <!-- Main Options Grid (Single Card) -->
      <main class="container my-auto animate-slide-up">
        <div class="row justify-content-center g-3 g-md-4">
          <!-- Option A: Layanan Umum -->
          <div class="col-12 col-md-8 col-lg-5 d-flex align-items-stretch">
            <div class="kiosk-card w-100 text-center">
              <div class="card-icon-wrapper">
                <i class="fas fa-users"></i>
              </div>
              <h2 class="card-title">{{ t('titleA') }}</h2>
              <p class="card-desc text-muted mt-2 d-none d-md-block">{{ t('descA') }}</p>
              <button class="btn-action w-100" @click="takeQueue(0)" :disabled="loading">
                <span>{{ t('takeQueue') }}</span>
                <i class="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="text-center mb-2 text-muted animate-fade-in">
        <p class="mb-0 font-monospace small">&copy; 2026 Melati Gold Shop. All rights reserved.</p>
      </footer>
    </div>

    <!-- Success Modal Overlay -->
    <Transition name="fade">
      <div v-if="showSuccess" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="kiosk-modal text-center gold-border p-5">
          <div class="success-icon mb-4">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3 class="modal-label">{{ t('successLabel') }}</h3>
          <div class="ticket-number my-4">{{ newTicketNumber }}</div>
          <p class="modal-category text-uppercase fw-bold">{{ getCategoryLabel(newTicketIndex) }}</p>
          
          <div v-if="isElectronApp" class="alert alert-warning mt-4 text-start small border-0 shadow-sm">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="fas fa-info-circle text-warning fs-5"></i>
              <strong>{{ t('infoPrint') }}</strong>
            </div>
            <div v-if="printStatus === 'printing'" class="text-muted">
              <span class="spinner-border spinner-border-sm me-2 text-warning" role="status"></span>
              {{ t('statusPrinting') }}
            </div>
            <div v-else-if="printStatus === 'success'" class="text-success">
              <i class="fas fa-print me-2"></i> {{ t('statusSuccess') }}
            </div>
            <div v-else class="text-danger">
              <i class="fas fa-exclamation-triangle me-2"></i> {{ t('statusError') }}
            </div>
          </div>

          <div class="countdown-bar mt-4">
            <div class="countdown-fill" :style="{ width: (countdown / 5) * 100 + '%' }"></div>
          </div>
          <button class="btn btn-gold w-100 mt-4 py-3 fw-bold" @click="closeSuccess">
            {{ t('closeBtn') }} ({{ countdown }}s)
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { addCustomerQueue } from "@/services/antrian-service-legacy";
import { isElectron, printJob } from "@/utils/printHelper";

const props = defineProps({
  activeFloor: {
    type: String,
    default: "L1"
  }
});

const router = useRouter();

function goBack() {
  router.back();
}

const brandName = computed(() => {
  return props.activeFloor === "L2" ? "Melati Gold Young" : "Melati Gold Shop";
});

let logoClickCount = 0;
let logoClickTimeout = null;

function handleLogoClick() {
  logoClickCount++;
  if (logoClickCount >= 3) {
    logoClickCount = 0;
    if (logoClickTimeout) {
      clearTimeout(logoClickTimeout);
      logoClickTimeout = null;
    }
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

const loading = ref(false);
const showSuccess = ref(false);
const newTicketNumber = ref("");
const newTicketIndex = ref(0);
const printStatus = ref("idle");
const countdown = ref(5);
const isElectronApp = ref(false);
let timer = null;
let audioCtx = null;

const currentLang = ref("id");

const t = (key) => {
  const dictionary = {
    id: {
      subtitle: "Selamat datang! Silakan ambil nomor antrian Anda.<br />Sembari menunggu nomor dipanggil, silakan melihat-lihat koleksi perhiasan cantik kami.",
      titleA: "LAYANAN ANTRIAN",
      descA: "Silakan tekan tombol di bawah untuk mengambil nomor antrean Anda.",
      titleB: "PRIORITAS",
      descB: "Layanan khusus untuk Lansia, Ibu Hamil, Penyandang Disabilitas, atau Ibu dengan Balita.",
      titleC: "SERVIS / REPARASI",
      descC: "Untuk pencucian perhiasan, patri, pasang batu, atau perbaikan perhiasan.",
      titleD: "JUAL EMAS",
      descD: "Untuk pelanggan yang ingin menjual kembali perhiasan emasnya ke toko.",
      takeQueue: "Ambil Antrian",
      queueLabel: "Nomor Antrian",
      successLabel: "NOMOR ANTRIAN ANDA",
      closeBtn: "TUTUP",
      infoPrint: "Informasi Pencetakan:",
      statusPrinting: "Sedang mencetak kertas antrian...",
      statusSuccess: "Kertas antrian berhasil dicetak. Silakan ambil tiket Anda!",
      statusError: "Printer tidak aktif / offline. Silakan foto atau catat nomor antrian di atas."
    },
    en: {
      subtitle: "Welcome! Please take your queue number.<br />While waiting for your turn, feel free to browse our beautiful jewelry collections.",
      titleA: "GET TICKET",
      descA: "Please press the button below to get your queue ticket.",
      titleB: "PRIORITY",
      descB: "Special service for elderly, pregnant women, disabled, or mothers with toddlers.",
      titleC: "REPAIR / SERVICE",
      descC: "For jewelry cleaning, soldering, stone setting, or jewelry repairs.",
      titleD: "SELL GOLD",
      descD: "For customers who want to sell gold jewelry back to the shop.",
      takeQueue: "Take Ticket",
      queueLabel: "Queue Number",
      successLabel: "YOUR QUEUE NUMBER",
      closeBtn: "CLOSE",
      infoPrint: "Printing Information:",
      statusPrinting: "Printing queue ticket...",
      statusSuccess: "Queue ticket printed successfully. Please take your ticket!",
      statusError: "Printer is offline. Please take a photo or note down the queue number above."
    }
  };
  return dictionary[currentLang.value]?.[key] || key;
};

const categoryLabels = ["Antrean", "Khusus / Prioritas", "Servis / Reparasi", "Pembelian Emas"];
const getCategoryLabel = (index) => categoryLabels[index] || "Umum";

function playNotif() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    console.warn("Audio play failed:", e);
  }
}

async function takeQueue(letterIndex) {
  if (loading.value) return;
  loading.value = true;
  printStatus.value = "printing";
  
  try {
    // 1. Generate number in RTDB
    const ticketNum = await addCustomerQueue(letterIndex, props.activeFloor);
    newTicketNumber.value = ticketNum;
    newTicketIndex.value = letterIndex;
    showSuccess.value = true;
    playNotif();
    
    // Start countdown
    countdown.value = 5;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        closeSuccess();
      }
    }, 1000);

    // 2. Call print job if Electron
    if (isElectronApp.value) {
      const dateObj = new Date();
      const dateStr = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      const timeStr = dateObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const res = await printJob("queue", {
        queueNumber: ticketNum,
        queueType: getCategoryLabel(letterIndex),
        dateStr,
        timeStr,
        floor: props.activeFloor,
        lang: currentLang.value,
        isLegacy: true
      });

      if (res && res.success) {
        printStatus.value = "success";
      } else {
        printStatus.value = "error";
      }
    } else {
      printStatus.value = "success"; // silent
    }
  } catch (err) {
    console.error("Failed to take legacy queue or print:", err);
    printStatus.value = isElectronApp.value ? "error" : "success";
  } finally {
    loading.value = false;
  }
}

function closeSuccess() {
  if (timer) clearInterval(timer);
  showSuccess.value = false;
}

onMounted(() => {
  isElectronApp.value = isElectron();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap");

.kiosk-page {
  font-family: "Poppins", sans-serif;
  background-color: #f9f5eb;
  color: #3a2c1c;
  height: 100vh;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  z-index: 9999;
}

.kiosk-container {
  height: 100%;
  position: relative;
  z-index: 10;
}

.kiosk-background-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.blur-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  z-index: 1;
  opacity: 0.12;
  pointer-events: none;
}
.gold-blur {
  top: -10%;
  right: 10%;
  width: 450px;
  height: 450px;
  background: #d4af37;
}
.dark-blur {
  bottom: -10%;
  left: 10%;
  width: 550px;
  height: 550px;
  background: #3a2c1c;
}

.gold-decoration {
  position: fixed;
  opacity: 0.05;
  z-index: 2;
  pointer-events: none;
}
.gold-decoration.top-left {
  top: 5%;
  left: -2%;
  width: 250px;
  height: 250px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%23d4af37' d='M50,0 L100,50 L50,100 L0,50 Z'/></svg>");
  background-repeat: no-repeat;
  transform: rotate(15deg);
}
.gold-decoration.bottom-right {
  bottom: 5%;
  right: -2%;
  width: 300px;
  height: 300px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle fill='%23d4af37' cx='50' cy='50' r='50'/></svg>");
  background-repeat: no-repeat;
  transform: rotate(-10deg);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.logo {
  width: 75px;
  height: 75px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d4af37;
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.35);
}
.brand-name {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  font-size: 3rem;
  color: #3a2c1c;
  margin-bottom: 0;
}
.subtitle {
  font-size: 1.15rem;
}

/* Kiosk Cards - 4 Columns */
.kiosk-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 24px;
  padding: 2.2rem 1.8rem;
  box-shadow: 0 12px 35px rgba(58, 44, 28, 0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.kiosk-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 25px 50px rgba(184, 152, 7, 0.14);
  border-color: rgba(212, 175, 55, 0.65);
  background: rgba(255, 255, 255, 0.9);
}

.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  border-radius: 18px;
  color: white;
  font-size: 2rem;
  box-shadow: 0 8px 16px rgba(157, 126, 45, 0.22);
  margin-bottom: 1.5rem;
  transition: transform 0.3s ease;
}
.card-icon-wrapper.priority-wrapper {
  background: linear-gradient(135deg, #3f51b5, #1a237e);
  box-shadow: 0 8px 16px rgba(26, 35, 126, 0.22);
}
.card-icon-wrapper.service-wrapper {
  background: linear-gradient(135deg, #4caf50, #1b5e20);
  box-shadow: 0 8px 16px rgba(27, 94, 32, 0.22);
}
.card-icon-wrapper.buyback-wrapper {
  background: linear-gradient(135deg, #ff9800, #e65100);
  box-shadow: 0 8px 16px rgba(230, 81, 0, 0.22);
}
.kiosk-card:hover .card-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.card-title {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  color: #3a2c1c;
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
}
.card-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  min-height: 75px;
  margin-bottom: 1.5rem;
}

.btn-action {
  background: #3a2c1c;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  align-self: center;
  margin-top: auto;
  width: 100%;
  border: none;
  cursor: pointer;
}
.kiosk-card:hover .btn-action {
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  color: white;
  box-shadow: 0 6px 12px rgba(157, 126, 45, 0.25);
}
.btn-action:active:not(:disabled) {
  transform: scale(0.96);
}
.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gold-border {
  border-radius: 24px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(135deg, #d4af37, #f9d776, #d4af37) border-box;
  border: 2px solid transparent;
}

/* Modal Success */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(58, 44, 28, 0.5);
  backdrop-filter: blur(10px);
  z-index: 10000;
}
.kiosk-modal {
  background: #ffffff;
  width: 90%;
  max-width: 500px;
  border-radius: 24px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}
.success-icon {
  font-size: 5rem;
  color: #9d7e2d;
  animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-label {
  font-size: 1.15rem;
  letter-spacing: 2px;
  color: #634b31;
  font-weight: 600;
}
.ticket-number {
  font-family: "Playfair Display", serif;
  font-size: 6.5rem;
  font-weight: 700;
  color: #3a2c1c;
  line-height: 1;
}
.modal-category {
  font-size: 1.25rem;
  color: #9d7e2d;
  letter-spacing: 1px;
}

/* Countdown bar */
.countdown-bar {
  width: 100%;
  height: 5px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}
.countdown-fill {
  height: 100%;
  background: #9d7e2d;
  transition: width 1s linear;
}

.btn-gold {
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  transition: opacity 0.2s ease;
}
.btn-gold:hover {
  opacity: 0.9;
}

.lang-toggle-wrapper {
  z-index: 15;
}
.lang-toggle-pill {
  background: rgba(58, 44, 28, 0.08);
  border-radius: 30px;
  padding: 3px;
  display: flex;
}
.lang-btn {
  background: transparent;
  border: none;
  color: #634b31;
  padding: 6px 16px;
  border-radius: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.lang-btn.active {
  background: #3a2c1c;
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(58, 44, 28, 0.15);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes scaleUp {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes shimmer {
  0% { left: -150%; }
  50% { left: 150%; }
  100% { left: 150%; }
}

/* Kiosk Back Button Styles */
.back-btn-kiosk {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ad9271; /* Dark color for light background contrast */
  font-size: 1.1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.back-btn-kiosk:hover {
  background: rgba(212, 175, 55, 0.15);
  color: #836720;
  border-color: rgba(212, 175, 55, 0.7);
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(212, 175, 55, 0.2);
}

.back-btn-kiosk:active {
  transform: scale(0.95);
}
</style>
