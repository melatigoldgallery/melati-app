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

        <!-- Language Toggle (Desktop) -->
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
        
        <!-- Language Toggle (Mobile) -->
        <div class="lang-toggle-wrapper d-none d-md-none mb-3">
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

        <!-- Floor Switcher Segmented Control -->
        <div class="floor-switcher-wrapper mt-4 animate-fade-in">
          <div class="floor-switcher-pill">
            <button 
              type="button"
              class="floor-switcher-btn " 
              :class="{ active: selectedFloor === 'L1' }" 
              @click="selectedFloor = 'L1'"
            >
              <i class="fas fa-store me-2"></i> Lantai 1
            </button>
            <button 
              type="button"
              class="floor-switcher-btn" 
              :class="{ active: selectedFloor === 'L2' }" 
              @click="selectedFloor = 'L2'"
            >
              <i class="fas fa-store me-2"></i> Lantai 2
            </button>
          </div>
        </div>

        <p class="subtitle text-muted mt-4 d-none d-md-block" v-html="t('subtitle')"></p>
      </header>

      <!-- Main Options -->
      <main class="container my-auto animate-slide-up">
        <div class="row justify-content-center g-3 g-md-4">
          <!-- Option Jual -->
          <div class="col-12 col-md-5 d-flex align-items-stretch">
            <div class="kiosk-card w-100 text-center">
              <div class="card-icon-wrapper" @click="handleIconTap('jual')" style="cursor: pointer;">
                <i class="fas fa-handshake"></i>
              </div>
              <h2 class="card-title">{{ t('jualTitle') }}</h2>
              <p class="card-desc text-muted mt-2 d-none d-md-block">{{ t('jualDesc') }}</p>
              <div class="next-ticket-container">
                <span class="next-ticket-label">{{ t('queueLabel') }}</span>
                <div class="next-ticket-number">{{ nextJualNumber }}</div>
              </div>
              <button class="btn-action" @click="takeQueue('jual')" :disabled="loading">
                <span>{{ t('takeQueue') }}</span>
                <i class="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>

          <!-- Option Beli -->
          <div class="col-12 col-md-5 d-flex align-items-stretch">
            <div class="kiosk-card w-100 text-center">
              <div class="card-icon-wrapper buy-wrapper" @click="handleIconTap('beli')" style="cursor: pointer;">
                <i class="fas fa-shopping-bag"></i>
              </div>
              <h2 class="card-title">{{ t('beliTitle') }}</h2>
              <p class="card-desc text-muted mt-2 d-none d-md-block">{{ t('beliDesc') }}</p>
              <div class="next-ticket-container">
                <span class="next-ticket-label">{{ t('queueLabel') }}</span>
                <div class="next-ticket-number">{{ nextBeliNumber }}</div>
              </div>
              <button class="btn-action" @click="takeQueue('beli')" :disabled="loading">
                <span>{{ t('takeQueue') }}</span>
                <i class="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Service Pickup Notice -->
        <div class="row justify-content-center m-2 pt-1">
          <div class="col-12 col-md-10">
            <div class="service-notice-banner">
              <i class="fas fa-bell notice-icon"></i>
              <p class="notice-text" v-html="t('serviceNotice')"></p>
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
          <p class="modal-category text-uppercase fw-bold">{{ newTicketType === 'jual' ? t('jualTitle') : t('beliTitle') }}</p>
          
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
    <!-- Reprint Modal Overlay -->
    <Transition name="fade">
      <div v-if="showReprintModal" class="modal-overlay d-flex align-items-center justify-content-center" style="z-index: 11000;">
        <div class="kiosk-modal text-center gold-border p-4" style="max-width: 450px; width: 90%;">
          <div class="mb-4">
            <i class="fas fa-print fs-1 text-warning mb-3"></i>
            <h3 class="modal-label text-uppercase fw-bold" style="font-size: 1.3rem; color: #aa7c11;">Cetak Ulang Antrean</h3>
            <p class="text-muted small">Pilih nomor antrean <strong>{{ reprintQueueType === 'jual' ? 'Jual / Servis' : 'Beli / Tukar Tambah' }}</strong> yang ingin dicetak ulang:</p>
          </div>
          
          <div class="d-flex flex-column gap-3 my-4">
            <button 
              v-for="(ticket, index) in reprintList" 
              :key="index"
              type="button"
              class="btn btn-gold py-3 fw-bold d-flex justify-content-between align-items-center px-4"
              @click="executeReprint(ticket)"
              :disabled="reprinting"
            >
              <span class="fs-4">{{ ticket.queueNumber }}</span>
              <span class="small font-monospace opacity-75" style="font-size: 0.85rem;">{{ ticket.timeStr }}</span>
            </button>
            
            <div v-if="reprintList.length === 0" class="text-muted small py-3">
              Belum ada antrean terbaru untuk dicetak ulang.
            </div>
          </div>
          
          <button 
            type="button" 
            class="btn btn-outline-secondary w-100 py-2.5 fw-bold" 
            @click="showReprintModal = false"
            :disabled="reprinting"
          >
            BATAL
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DEFAULT_FLOOR_ID, normalizeFloorId } from "@/config/floor-config";
import { addCustomerQueue, subscribeQueue, padNumber, incrementPrintCount } from "@/services/antrian-service";
import { isElectron, printJob, getLocalPrinters, getTargetPrinter } from "@/utils/printHelper";

const route = useRoute();
const router = useRouter();

function goBack() {
  router.back();
}
const kioskPhysicalFloor = computed(() => {
  const normalized = normalizeFloorId(route.query.floor, DEFAULT_FLOOR_ID);
  return normalized || DEFAULT_FLOOR_ID;
});

const selectedFloor = ref(kioskPhysicalFloor.value);

const brandName = computed(() => {
  return selectedFloor.value === "L2" ? "Melati Gold Young" : "Melati Gold Shop";
});

// Idle timeout safeguard for kiosk mode
const idleTimer = ref(null);
const IDLE_TIMEOUT_MS = 30000; // 30 seconds

function resetIdleTimer() {
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = setTimeout(() => {
    if (selectedFloor.value !== kioskPhysicalFloor.value) {
      selectedFloor.value = kioskPhysicalFloor.value;
    }
    if (currentLang.value !== "id") {
      currentLang.value = "id";
    }
  }, IDLE_TIMEOUT_MS);
}

function handleUserActivity() {
  resetIdleTimer();
}

const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

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

const showReprintModal = ref(false);
const reprintQueueType = ref("");
const reprintList = ref([]);
const reprinting = ref(false);

const tapTracker = ref({
  jual: { count: 0, lastTime: 0 },
  beli: { count: 0, lastTime: 0 }
});

function handleIconTap(type) {
  const now = Date.now();
  const tracker = tapTracker.value[type];
  
  if (now - tracker.lastTime > 500) {
    tracker.count = 1;
  } else {
    tracker.count++;
  }
  tracker.lastTime = now;
  
  if (tracker.count === 3) {
    tracker.count = 0;
    openReprintModal(type);
  }
}

function openReprintModal(type) {
  reprintQueueType.value = type;
  const rawList = localStorage.getItem(`last_printed_queues_${type}`);
  reprintList.value = rawList ? JSON.parse(rawList) : [];
  showReprintModal.value = true;
}

function saveToReprintHistory(type, ticketNum, dateStr, timeStr) {
  const key = `last_printed_queues_${type}`;
  const raw = localStorage.getItem(key);
  let list = raw ? JSON.parse(raw) : [];
  
  const newItem = {
    queueNumber: ticketNum,
    queueType: type === "jual" ? "Jual / Servis" : "Beli / Tukar Tambah",
    dateStr,
    timeStr,
    floor: selectedFloor.value,
    lang: currentLang.value
  };
  
  list.unshift(newItem);
  if (list.length > 3) {
    list = list.slice(0, 3);
  }
  
  localStorage.setItem(key, JSON.stringify(list));
}

async function executeReprint(ticket) {
  if (reprinting.value) return;
  reprinting.value = true;
  
  try {
    if (isElectronApp.value) {
      const printRes = await printJob("queue", {
        queueNumber: ticket.queueNumber,
        queueType: ticket.queueType,
        dateStr: ticket.dateStr,
        timeStr: ticket.timeStr,
        floor: ticket.floor,
        lang: ticket.lang
      });
      
      if (printRes && printRes.success) {
        try {
          // PENTING: Fitur dinonaktifkan/dikomentari saat ini.
          // Jika diaktifkan nanti, counter akan ditambahkan ke printer fisik kiosk berada (kioskPhysicalFloor)!
          // await incrementPrintCount(kioskPhysicalFloor.value);
        } catch (e) {
          console.warn("Failed to increment print count on reprint:", e);
        }
        showReprintModal.value = false;
      } else {
        alert("Gagal mencetak ulang tiket antrean. Pastikan printer terhubung.");
      }
    } else {
      console.log("Browser mockup print:", ticket);
      showReprintModal.value = false;
    }
  } catch (err) {
    console.error("Reprint execution failed:", err);
  } finally {
    reprinting.value = false;
  }
}

const loading = ref(false);
const showSuccess = ref(false);
const newTicketNumber = ref("");
const newTicketType = ref("");
const printStatus = ref("idle"); // idle, printing, success, error
const countdown = ref(5);
let timer = null;
let audioCtx = null;
let unsubQueue = null;

const isElectronApp = ref(false);

const queueState = ref({
  jual: { lastLetter: 0, lastNumber: 0 },
  beli: { lastLetter: 0, lastNumber: 0 }
});

const currentLang = ref("id");

const t = (key) => {
  const dictionary = {
    id: {
      subtitle: "Selamat datang! Silakan ambil nomor antrian Anda.<br />Sembari menunggu nomor dipanggil, silakan melihat-lihat koleksi perhiasan kami.",
      jualTitle: "JUAL / SERVIS",
      jualDesc: "Untuk pelanggan yang ingin menjual emas atau melakukan servis perhiasan.",
      beliTitle: "BELI / TUKAR TAMBAH",
      beliDesc: "Untuk pelanggan yang ingin membeli atau tukar tambah perhiasan.",
      takeQueue: "Ambil Antrian",
      queueLabel: "Nomor Antrian",
      successLabel: "NOMOR ANTRIAN ANDA",
      closeBtn: "TUTUP",
      infoPrint: "Informasi Pencetakan:",
      statusPrinting: "Sedang mencetak kertas antrian...",
      statusSuccess: "Kertas antrian berhasil dicetak. Silakan ambil tiket Anda!",
      statusError: "Printer tidak aktif / offline. Silakan foto atau catat nomor antrian di atas.",
      serviceNotice: "Pengambilan barang servis yang sudah selesai dapat langsung menuju ke <strong>tempat pengambilan</strong> tanpa perlu mengambil nomor antrian.",
      printerErrorTitle: "SISTEM ANTREAN NON-AKTIF",
      printerOfflineMsg: "Printer antrean terputus atau offline. Silakan hubungi staf toko.",
      paperOutMsg: "Printer antrean mengalami gangguan (kertas habis/error). Silakan hubungi staf toko."
    },
    en: {
      subtitle: "Welcome! Please take your queue number.<br />While waiting for your turn, feel free to browse our beautiful jewelry collections.",
      jualTitle: "SELL / SERVICE",
      jualDesc: "For customers who want to sell gold or request jewelry services.",
      beliTitle: "BUY / TRADE-IN",
      beliDesc: "For customers who want to buy or trade-in jewelry.",
      takeQueue: "Take Ticket",
      queueLabel: "Queue Number",
      successLabel: "YOUR QUEUE NUMBER",
      closeBtn: "CLOSE",
      infoPrint: "Printing Information:",
      statusPrinting: "Printing queue ticket...",
      statusSuccess: "Queue ticket printed successfully. Please take your ticket!",
      statusError: "Printer is offline. Please take a photo or note down the queue number above.",
      serviceNotice: "<strong>Notice:</strong> Customers picking up completed service items can proceed directly to the <strong>pickup counter</strong> without taking a queue number.",
      printerErrorTitle: "QUEUE SYSTEM INACTIVE",
      printerOfflineMsg: "Queue printer is disconnected or offline. Please contact shop staff.",
      paperOutMsg: "Queue printer has encountered an error (out of paper/hardware issue). Please contact shop staff."
    }
  };
  return dictionary[currentLang.value]?.[key] || key;
};

const nextJualNumber = computed(() => {
  const q = queueState.value.jual;
  const letters = ["D", "E"];
  let nextLet = q.lastLetter ?? 0;
  let nextNum = q.lastNumber ?? 0;
  
  if (nextNum === 0) {
    nextLet = 0;
    nextNum = 1;
  } else {
    nextNum++;
    if (nextNum > 50) {
      nextNum = 1;
      nextLet = (nextLet + 1) % 2;
    }
  }
  return letters[nextLet] + padNumber(nextNum);
});

const nextBeliNumber = computed(() => {
  const q = queueState.value.beli;
  const letters = ["A", "B", "C"];
  let nextLet = q.lastLetter ?? 0;
  let nextNum = q.lastNumber ?? 0;
  
  if (nextNum === 0) {
    nextLet = 0;
    nextNum = 1;
  } else {
    nextNum++;
    if (nextNum > 50) {
      nextNum = 1;
      nextLet = (nextLet + 1) % 3;
    }
  }
  return letters[nextLet] + padNumber(nextNum);
});

function subscribeToQueue() {
  if (unsubQueue) unsubQueue();
  unsubQueue = subscribeQueue(selectedFloor.value, (state) => {
    queueState.value = state;
  });
}

onMounted(async () => {
  isElectronApp.value = isElectron();
  subscribeToQueue();
  resetIdleTimer();
  
  // Register inactivity listeners
  window.addEventListener("click", handleUserActivity);
  window.addEventListener("touchstart", handleUserActivity);
});

watch(kioskPhysicalFloor, (newFloor) => {
  selectedFloor.value = newFloor;
});

watch(selectedFloor, () => {
  subscribeToQueue();
  resetIdleTimer();
});

onUnmounted(() => {
  if (unsubQueue) unsubQueue();
  if (timer) clearInterval(timer);
  if (idleTimer.value) clearTimeout(idleTimer.value);
  
  // Clean up inactivity listeners
  window.removeEventListener("click", handleUserActivity);
  window.removeEventListener("touchstart", handleUserActivity);
});

function playNotif() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Play dual-tone success beep
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

async function takeQueue(type) {
  if (loading.value) return;

  loading.value = true;
  printStatus.value = "printing";
  
  try {
    // 1. Generate number in Firebase RTDB
    const ticketNum = await addCustomerQueue(type, selectedFloor.value);
    newTicketNumber.value = ticketNum;
    newTicketType.value = type;
    showSuccess.value = true;
    playNotif();

    // 2. Call print service API
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

    saveToReprintHistory(type, ticketNum, dateStr, timeStr);

    let printed = false;
    let timeoutDuration = 5;

    if (isElectronApp.value) {
      const printRes = await printJob("queue", {
        queueNumber: ticketNum,
        queueType: type === "jual" ? "Jual / Servis" : "Beli / Tukar Tambah",
        dateStr,
        timeStr,
        floor: selectedFloor.value,
        lang: currentLang.value
      });

      if (printRes && printRes.success) {
        printStatus.value = "success";
        printed = true;
        timeoutDuration = 5;
      } else {
        printStatus.value = "error";
        timeoutDuration = 15;
      }
    } else {
      printStatus.value = "success"; // Silent success for UI countdown / flow
      printed = true;
      timeoutDuration = 5;
    }

    if (printed) {
      try {
        // PENTING: Fitur dinonaktifkan/dikomentari saat ini.
        // Jika diaktifkan nanti, counter akan ditambahkan ke printer fisik kiosk berada (kioskPhysicalFloor)!
        // await incrementPrintCount(kioskPhysicalFloor.value);
      } catch (e) {
        console.warn("Failed to increment print count:", e);
      }
    }

    // Start countdown after final print status is resolved
    countdown.value = timeoutDuration;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        closeSuccess();
      }
    }, 1000);

  } catch (err) {
    console.error("Failed to take queue or print:", err);
    printStatus.value = isElectronApp.value ? "error" : "success";
    
    // Start countdown for error (15 seconds)
    countdown.value = isElectronApp.value ? 15 : 5;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        closeSuccess();
      }
    }, 1000);
  } finally {
    loading.value = false;
  }
}

function closeSuccess() {
  if (timer) clearInterval(timer);
  showSuccess.value = false;
  currentLang.value = "id";
  if (selectedFloor.value !== kioskPhysicalFloor.value) {
    selectedFloor.value = kioskPhysicalFloor.value;
  }
  resetIdleTimer();
}
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

/* Blur Orbs for background depth */
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

/* Decorative background shapes */
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

/* Header */
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
  font-size: 1.5rem;
}

/* Kiosk Cards */
.kiosk-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 24px;
  padding: 2.25rem 2rem;
  box-shadow: 0 12px 35px rgba(58, 44, 28, 0.05);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.kiosk-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 25px 50px rgba(184, 152, 7, 0.16);
  border-color: rgba(212, 175, 55, 0.65);
  background: rgba(255, 255, 255, 0.9);
}
.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 75px;
  height: 75px;
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  border-radius: 18px;
  color: white;
  font-size: 2rem;
  box-shadow: 0 10px 20px rgba(157, 126, 45, 0.25);
  margin-bottom: 1.25rem;
  transition: transform 0.3s ease;
}
.card-icon-wrapper.buy-wrapper {
  background: linear-gradient(135deg, #3a2c1c, #634b31);
  box-shadow: 0 10px 20px rgba(58, 44, 28, 0.25);
}
.kiosk-card:hover .card-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}
.card-title {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  color: #3a2c1c;
  font-size: 1.9rem;
}
.card-desc {
  font-size: 1.1rem;
  line-height: 1.6;
}
.btn-action {
  background: #3a2c1c;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.05rem;
  transition: all 0.3s ease;
  align-self: center;
  margin-top: auto;
  width: 90%;
  max-width: 250px;
  border: none;
  cursor: pointer;
}
.kiosk-card:hover .btn-action {
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  color: white;
  box-shadow: 0 8px 16px rgba(157, 126, 45, 0.28);
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

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Keyframe Animations */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}
.animate-slide-up {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleUp {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 767px) {
  .kiosk-page {
    height: auto !important;
    min-height: 100vh;
    position: relative !important;
    overflow: visible !important;
    scroll-behavior: smooth;
  }

  .kiosk-container {
    padding-top: 1.5rem !important;
    padding-bottom: 1.5rem !important;
    min-height: 100vh;
    height: auto !important;
    justify-content: flex-start !important;
  }
  
  .brand-name {
    font-size: clamp(1.6rem, 7vw, 2.2rem);
  }
  
  .logo {
    width: 60px;
    height: 60px;
  }
  
  main.container {
    margin-top: 1.5rem !important;
    margin-bottom: 1.5rem !important;
  }
  
  .kiosk-card {
    padding: 2rem 1.5rem !important;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(58, 44, 28, 0.04);
  }
  
  .card-icon-wrapper {
    width: 64px;
    height: 64px;
    font-size: 1.6rem;
    border-radius: 14px;
    margin-bottom: 1rem;
    box-shadow: 0 6px 12px rgba(157, 126, 45, 0.15);
  }
  
  .card-title {
    font-size: 1.35rem;
    white-space: normal;
  }
  
  .next-ticket-container {
    margin: 1rem 0;
    padding: 0.6rem 1rem;
    border-radius: 14px;
    width: 100%;
  }
  
  .next-ticket-label {
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }
  
  .next-ticket-number {
    font-size: clamp(2rem, 8vw, 2.6rem);
    margin-top: 0.1rem;
  }
  
  .btn-action {
    padding: 10px 20px;
    font-size: 0.95rem;
    border-radius: 10px;
    width: 100%;
    max-width: 250px;
    margin-top: auto;
  }

  .kiosk-modal {
    padding: 2.5rem 1.5rem !important;
    border-radius: 20px;
    width: 95%;
  }
  
  .success-icon {
    font-size: 3.5rem;
    margin-bottom: 1rem !important;
  }
  
  .modal-label {
    font-size: 1rem;
  }
  
  .ticket-number {
    font-size: clamp(3.5rem, 15vw, 4.5rem);
    margin-top: 1rem !important;
    margin-bottom: 1rem !important;
  }
  
  .modal-category {
    font-size: 1.1rem;
  }
}

/* Next Ticket Container */
.next-ticket-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(212, 175, 55, 0.04);
  border: 2px dashed rgba(212, 175, 55, 0.25);
  padding: 0.75rem 1.25rem;
  border-radius: 16px;
  transition: all 0.3s ease;
  margin: 1rem 0;
  width: 100%;
}
.kiosk-card:hover .next-ticket-container {
  background: rgba(212, 175, 55, 0.12);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 8px 20px rgba(157, 126, 45, 0.08);
}
.next-ticket-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #634b31;
  font-weight: 600;
}
.next-ticket-number {
  font-family: "Playfair Display", serif;
  font-weight: 800;
  font-size: 4.5rem;
  color: #9d7e2d;
  line-height: 1.1;
  margin-top: 0.25rem;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(157, 126, 45, 0.15);
}

/* Language Toggle Pill */
.lang-toggle-wrapper {
  z-index: 100;
}
.lang-toggle-pill {
  display: flex;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 20px;
  padding: 4px;
  box-shadow: 0 4px 15px rgba(58, 44, 28, 0.05);
}
.lang-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #634b31;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}
.lang-btn.active {
  background: linear-gradient(135deg, #f9d776, #9d7e2d);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(157, 126, 45, 0.2);
}

/* Floor Switcher Styles */
.floor-switcher-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
  z-index: 99;
}
.floor-switcher-pill {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 28px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(58, 44, 28, 0.06);
  gap: 6px;
  transition: all 0.3s ease;
}
.floor-switcher-pill:hover {
  border-color: rgba(212, 175, 55, 0.6);
  box-shadow: 0 10px 30px rgba(212, 175, 55, 0.12);
}
.floor-switcher-btn {
  border: none;
  background: transparent;
  padding: 12px 28px;
  font-family: "Poppins", sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #634b31;
  border-radius: 26px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.floor-switcher-btn i {
  font-size: 1.15rem;
  transition: transform 0.3s ease;
}
.floor-switcher-btn.active {
  background: linear-gradient(135deg, #3a2c1c, #634b31);
  color: #ffffff;
  box-shadow: 0 6px 15px rgba(58, 44, 28, 0.25);
}
.floor-switcher-btn.active i {
  color: #f9d776;
}
.floor-switcher-btn:hover:not(.active) {
  background: rgba(212, 175, 55, 0.12);
  color: #836720;
}
.floor-switcher-btn:active {
  transform: scale(0.97);
}
@media (max-width: 767px) {
  .floor-switcher-btn {
    padding: 10px 20px;
    font-size: 1.05rem;
  }
}

/* Position Adjustment for Header when toggle is absolute */
header.position-relative {
  padding-top: 1rem;
}
@media (max-width: 768px) {
  header.position-relative {
    padding-top: 0;
  }

.next-ticket-number {
  font-size:3rem ;
}
}

/* Service Notice Banner Styles */
.service-notice-banner {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1.5px dashed rgba(212, 175, 55, 0.45);
  border-radius: 18px;
  padding: 1.1rem 1.75rem;
  box-shadow: 0 8px 30px rgba(58, 44, 28, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  max-width: 960px;
  margin: 1.5rem auto 0;
  transition: all 0.3s ease;
}

.service-notice-banner:hover {
  border-color: rgba(212, 175, 55, 0.8);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 35px rgba(212, 175, 55, 0.12);
  transform: translateY(-2px);
}

.notice-icon {
  font-size: 1.8rem;
  color: #9d7e2d;
  animation: gentle-shake 4s infinite ease-in-out;
}

.notice-text {
  font-size: 1.3rem;
  color: #3a2c1c;
  line-height: 1.55;
  margin-bottom: 0;
  text-align: left;
}

@keyframes gentle-shake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-8deg); }
  20%, 40% { transform: rotate(8deg); }
  50% { transform: rotate(0deg); }
}

@media (max-width: 767px) {
  .service-notice-banner {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem 1rem;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .notice-text {
    text-align: center;
    font-size: 0.85rem;
    line-height: 1.45;
  }
  .notice-icon {
    font-size: 1.4rem;
  }
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
  color: #ad9271;
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

/* Printer Error Banner Styles */
.alert-printer-error {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background: rgba(220, 53, 69, 0.08);
  border: 1.5px solid rgba(220, 53, 69, 0.35);
  border-radius: 18px;
  padding: 1.25rem 2rem;
  max-width: 960px;
  margin: 1.5rem auto 0;
  box-shadow: 0 8px 30px rgba(220, 53, 69, 0.06);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.alert-printer-error:hover {
  background: rgba(220, 53, 69, 0.12);
  border-color: rgba(220, 53, 69, 0.55);
  box-shadow: 0 10px 35px rgba(220, 53, 69, 0.12);
}

.alert-icon-error {
  font-size: 2rem;
  color: #dc3545;
  animation: pulse-glow-error 2s infinite ease-in-out;
}

.alert-content-error {
  text-align: left;
}

.alert-title-error {
  font-size: 1.15rem;
  font-weight: 700;
  color: #842029;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  display: block;
}

.alert-desc-error {
  font-size: 1rem;
  color: #842029;
  margin-bottom: 0;
  opacity: 0.9;
}

/* Disabled action button states */
.btn-action:disabled {
  background: #a8a096 !important;
  color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
  cursor: not-allowed;
  opacity: 0.6;
}

.kiosk-card:hover .btn-action:disabled {
  background: #a8a096 !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

@keyframes pulse-glow-error {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 0px rgba(220, 53, 69, 0));
  }
  50% {
    transform: scale(1.05);
    filter: drop-shadow(0 0 8px rgba(220, 53, 69, 0.6));
  }
}
</style>
