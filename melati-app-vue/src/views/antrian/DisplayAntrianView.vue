<template>
  <div class="display-page" style="user-select: none">
    <!-- Decorative Elements -->
    <div class="gold-decoration top-left"></div>
    <div class="gold-decoration bottom-right"></div>

    <!-- Header -->
    <header class="header">
      <div class="container">
        <div class="row align-items-center justify-content-between">
          <div class="col-md-6">
            <div class="logo-container">
              <img src="/img/Melati.jfif" alt="Logo" class="logo gold-shimmer" />
              <h1 class="brand-name">{{ brandName }}</h1>
            </div>
          </div>
          <div class="col-md-6 d-flex justify-content-end align-items-center">
            <div class="date-time">
              <div class="current-date">{{ currentDate }}</div>
              <div class="d-flex align-items-center gap-3">
                <div class="current-time">{{ currentTime }}</div>
                <div class="display-promosi">
                  <a href="/promosi/display" class="text-decoration-none">
                    <i class="fas fa-desktop text-white fs-2" title="Display Promosi"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container-fluid" style="max-width: 1850px; margin: 0 auto">
      <!-- Page Title -->
      <div class="page-title mb-4">
        <h1>ANTRIAN PELAYANAN</h1>
      </div>

      <div class="row g-4 mt-1">
        <!-- Column 1: Jual Perhiasan -->
        <div class="col-12 col-lg-6">
          <div class="section-title text-center mb-3">
            <h2>JUAL EMAS / SERVIS</h2>
          </div>
          <div class="row g-2 justify-content-center align-items-stretch">
            <!-- Current Queue Card -->
            <div :class="['col-12', showJualMissed ? 'col-md-6' : 'col-md-12']">
              <div class="queue-card card-current gold-border">
                <div class="queue-card-header">
                  <h1 :class="{ 'queue-card-title--compact': showJualMissed }">SEDANG DILAYANI</h1>
                </div>
                <div class="queue-card-body">
                  <Transition name="queue-change" mode="out-in">
                    <div :key="jualCurrentDisplay" class="queue-number active">
                      {{ jualCurrentDisplay }}
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- Missed Queue Card -->
            <Transition name="card-fade">
              <div v-if="showJualMissed" class="col-12 col-md-6">
                <div class="queue-card card-delayed gold-border">
                  <div class="queue-card-header queue-card-header-delayed">
                    <h1 class="queue-card-title--compact">ANTRIAN TERLEWAT</h1>
                  </div>
                  <div class="queue-card-body">
                    <div class="queue-number text-xl">
                      {{ jualMissedDisplay }}
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Column 2: Beli / Tukar Tambah -->
        <div class="col-12 col-lg-6">
          <div class="section-title text-center mb-3">
            <h2>BELI / TUKAR TAMBAH</h2>
          </div>
          <div class="row g-2 justify-content-center align-items-stretch">
            <!-- Current Queue Card -->
            <div :class="['col-12', showBeliMissed ? 'col-md-6' : 'col-md-12']">
              <div class="queue-card card-current gold-border">
                <div class="queue-card-header">
                  <h1 :class="{ 'queue-card-title--compact': showBeliMissed }">SEDANG DILAYANI</h1>
                </div>
                <div class="queue-card-body">
                  <Transition name="queue-change" mode="out-in">
                    <div :key="beliCurrentDisplay" class="queue-number active">
                      {{ beliCurrentDisplay }}
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- Missed Queue Card -->
            <Transition name="card-fade">
              <div v-if="showBeliMissed" class="col-12 col-md-6">
                <div class="queue-card card-delayed gold-border">
                  <div class="queue-card-header queue-card-header-delayed">
                    <h1 class="queue-card-title--compact">ANTRIAN TERLEWAT</h1>
                  </div>
                  <div class="queue-card-body">
                    <div class="queue-number text-xl">
                      {{ beliMissedDisplay }}
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div class="elegant-divider my-4"></div>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="row justify-content-center align-items-center" style="min-height: 80px">
          <div class="col-auto">
            <p class="footer-text mb-0">&copy; 2026 Melati Gold Shop. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { DEFAULT_FLOOR_ID, normalizeFloorId } from "@/config/floor-config";
import { subscribeQueue, formatQueue } from "@/services/antrian-service";

const currentTime = ref("");
const currentDate = ref("");

const jualState = ref({ currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [] });
const beliState = ref({ currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [] });

const currentShift = computed(() => {
  const timeStr = currentTime.value;
  if (!timeStr) return "morning";
  const parts = timeStr.split(/[:\.]/);
  const hour = Number(parts[0]);
  return hour < 14 ? "morning" : "afternoon";
});

// Emptiness checks for circular queues
const isJualEmpty = computed(() => {
  const q = jualState.value;
  if (q.lastNumber === 0) return true;
  const currentIdx = (q.currentLetter ?? 0) * 50 + q.currentNumber;
  const lastIdx = (q.lastLetter ?? 0) * 50 + q.lastNumber;
  const nextAfterLast = (lastIdx % 100) + 1;
  return currentIdx === nextAfterLast;
});

const isBeliEmpty = computed(() => {
  const q = beliState.value;
  if (q.lastNumber === 0) return true;
  const currentIdx = (q.currentLetter ?? 0) * 50 + q.currentNumber;
  const lastIdx = (q.lastLetter ?? 0) * 50 + q.lastNumber;
  const nextAfterLast = (lastIdx % 150) + 1;
  return currentIdx === nextAfterLast;
});

// Computed displays for Jual
const jualCurrentDisplay = computed(() => {
  if (isJualEmpty.value) {
    if (jualState.value.lastNumber === 0) return "D01";
    return "-";
  }
  const { currentLetter, currentNumber } = jualState.value;
  const letters = ["D", "E"];
  const letter = letters[currentLetter ?? 0] || "D";
  return formatQueue(letter, currentNumber);
});

const jualNextDisplay = computed(() => {
  if (isJualEmpty.value) return "-";
  const { currentLetter, currentNumber, lastLetter, lastNumber } = jualState.value;
  const currentIdx = (currentLetter ?? 0) * 50 + currentNumber;
  const lastIdx = (lastLetter ?? 0) * 50 + lastNumber;
  if (currentIdx === lastIdx) return "-";
  
  let nextNum = currentNumber + 1;
  let nextLet = currentLetter ?? 0;
  if (nextNum > 50) {
    nextNum = 1;
    nextLet = (nextLet + 1) % 2;
  }
  const letters = ["D", "E"];
  return formatQueue(letters[nextLet] || "D", nextNum);
});

const jualMissedDisplay = computed(() => {
  const missed = jualState.value.missedQueue.filter(v => v);
  return missed.length > 0 ? missed.join(", ") : "-";
});
const showJualMissed = computed(() => jualState.value.missedQueue.filter(v => v).length > 0);

// Computed displays for Beli
const beliCurrentDisplay = computed(() => {
  if (isBeliEmpty.value) {
    if (beliState.value.lastNumber === 0) return "A01";
    return "-";
  }
  const { currentLetter, currentNumber } = beliState.value;
  const letters = ["A", "B", "C"];
  const letter = letters[currentLetter ?? 0] || "A";
  return formatQueue(letter, currentNumber);
});

const beliNextDisplay = computed(() => {
  if (isBeliEmpty.value) return "-";
  const { currentLetter, currentNumber, lastLetter, lastNumber } = beliState.value;
  const currentIdx = (currentLetter ?? 0) * 50 + currentNumber;
  const lastIdx = (lastLetter ?? 0) * 50 + lastNumber;
  if (currentIdx === lastIdx) return "-";
  
  let nextNum = currentNumber + 1;
  let nextLet = currentLetter ?? 0;
  if (nextNum > 50) {
    nextNum = 1;
    nextLet = (nextLet + 1) % 3;
  }
  const letters = ["A", "B", "C"];
  return formatQueue(letters[nextLet] || "A", nextNum);
});

const beliMissedDisplay = computed(() => {
  const missed = beliState.value.missedQueue.filter(v => v);
  return missed.length > 0 ? missed.join(", ") : "-";
});
const showBeliMissed = computed(() => beliState.value.missedQueue.filter(v => v).length > 0);

const route = useRoute();
const activeFloor = computed(() => {
  const normalized = normalizeFloorId(route.query.floor, DEFAULT_FLOOR_ID);
  return normalized || DEFAULT_FLOOR_ID;
});

const brandName = computed(() => {
  return activeFloor.value === "L2" ? "Melati Gold Young" : "Melati Gold Shop";
});

let clockInterval = null;
let audioCtx = null;
let unsubscribeQueue = null;
let prevJualCurrentStr = "";
let prevBeliCurrentStr = "";

function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("id-ID");
  currentDate.value = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function playNotif() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  subscribeToQueue();
});

watch([activeFloor, currentShift], () => {
  subscribeToQueue();
});

function subscribeToQueue() {
  if (unsubscribeQueue) unsubscribeQueue();
  unsubscribeQueue = subscribeQueue(activeFloor.value, (state) => {
    jualState.value = state.jual;
    beliState.value = state.beli;
    
    // Check if displays have changed
    const curJualStr = jualCurrentDisplay.value;
    const curBeliStr = beliCurrentDisplay.value;
    
    const changed = 
      (prevJualCurrentStr !== "" && curJualStr !== "-" && curJualStr !== prevJualCurrentStr) ||
      (prevBeliCurrentStr !== "" && curBeliStr !== "-" && curBeliStr !== prevBeliCurrentStr);

    if (changed) {
      playNotif();
    }
    prevJualCurrentStr = curJualStr;
    prevBeliCurrentStr = curBeliStr;
  });
}

onUnmounted(() => {
  clearInterval(clockInterval);
  if (unsubscribeQueue) unsubscribeQueue();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap");

.display-page {
  font-family: "Poppins", sans-serif;
  background-color: #f9f5eb;
  color: #3a2c1c;
  overflow-x: hidden;
  min-height: 100vh;
  padding-bottom: 100px;
  position: relative;
}

/* ── Decorative Elements ─────────────────────────────────────────────────── */
.gold-decoration {
  position: fixed;
  opacity: 0.08;
  z-index: 0;
  pointer-events: none;
}
.gold-decoration.top-left {
  top: 10%;
  left: 5%;
  width: 200px;
  height: 200px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='%23d4af37' d='M50,0 L100,50 L50,100 L0,50 Z'/></svg>");
  background-repeat: no-repeat;
  transform: rotate(15deg);
}
.gold-decoration.bottom-right {
  bottom: 10%;
  right: 5%;
  width: 250px;
  height: 250px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle fill='%23d4af37' cx='50' cy='50' r='50'/></svg>");
  background-repeat: no-repeat;
  transform: rotate(-10deg);
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.header {
  background: linear-gradient(135deg, #9d7e2d, #3a2c1c);
  padding: 1rem 0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
}
.header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #d4af37, transparent);
}
.logo-container {
  display: flex;
  align-items: center;
}
.logo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d4af37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}
.gold-shimmer {
  position: relative;
  overflow: hidden;
}
.gold-shimmer::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: rotate(30deg);
  animation: shimmer 4s infinite;
}
@keyframes shimmer {
  0% {
    transform: rotate(30deg) translateX(-100%);
  }
  100% {
    transform: rotate(30deg) translateX(100%);
  }
}
.brand-name {
  margin-left: 1rem;
  font-family: "Playfair Display", serif;
  font-weight: 700;
  font-size: 3rem;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  margin-bottom: 0;
}
.date-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #ffffff;
}
.current-date {
  font-size: 2rem;
  font-weight: 500;
  font-family: "Playfair Display", serif;
}
.current-time {
  font-size: 2rem;
  font-weight: 700;
  color: #f9d776;
}
.display-promosi a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: transparent;
  border-radius: 50%;
  transition: all 0.3s ease;
}
.display-promosi a:hover {
  background: rgba(212, 175, 55, 0.4);
}

/* ── Main / Page Title ────────────────────────────────────────────────────── */
main {
  padding: 0;
  min-height: calc(100vh - 250px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.page-title {
  text-align: center;
  position: relative;
  padding-bottom: 1rem;
}
.page-title h1 {
  font-family: "Poppins", sans-serif;
  font-size: 4rem;
  font-weight: 700;
  color: #3a2c1c;
  margin-bottom: 0;
}
.page-title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #d4af37, transparent);
}

.section-title h2 {
  font-family: "Playfair Display", serif;
  font-size: 3.4rem;
  font-weight: 700;
  color: #3a2c1c;
  margin-bottom: 0;
  position: relative;
  display: inline-block;
  padding-bottom: 5px;
}
.section-title h2::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 15%;
  right: 15%;
  height: 2px;
  background: #d4af37;
}

/* ── Queue Cards ─────────────────────────────────────────────────────────── */
.queue-card {
  border-radius: 15px;
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  width: 100%;
  height: clamp(200px, 48vh, 420px);
  border: none;
  position: relative;
  box-shadow: 0 15px 30px rgba(184, 152, 7, 0.2);
  display: flex;
  flex-direction: column;
}
.queue-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}
.queue-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}
.card-current::before {
  background: linear-gradient(90deg, #f9d776, #9d7e2d);
}
.card-next::before {
  background: linear-gradient(90deg, #9d7e2d, #f9d776);
}
.card-delayed::before {
  background: linear-gradient(90deg, #ff9800, #ff6d00);
}

/* ── Card Header ─────────────────────────────────────────────────────────── */
.queue-card-header {
  background-color: #ffffff;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}
.queue-card-header-delayed {
  background-color: #fff8e1;
  border-bottom-color: #ffcc02;
}
.queue-card-header h1 {
  font-family: "Playfair Display", serif;
  font-size: clamp(1.4rem, 2.5vw, 3.2rem);
  font-weight: bold;
  margin: 0;
  color: #3a2c1c;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.queue-card-header h1.queue-card-title--compact {
  font-size: clamp(1.15rem, 2vw, 2.5rem);
}

/* ── Card Body ───────────────────────────────────────────────────────────── */
.queue-card-body {
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  flex: 1;
}

/* ── Queue Number ────────────────────────────────────────────────────────── */
.queue-number {
  font-family: "Playfair Display", serif;
  font-weight: 700;
  color: #3a2c1c;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  height: 100%;
  line-height: 1.1;
  word-wrap: break-word;
  overflow-wrap: break-word;
  transition: font-size 0.3s ease;
  font-size: clamp(5rem, 30vh, 16rem);
}
.queue-number::after {
  content: "";
  position: absolute;
  bottom: -0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 3px;
  background: #d4af37;
  border-radius: 3px;
}
.queue-number.active {
  animation: numberPulse 2s infinite;
  color: #342709;
}

/* Font size utilities for delayed card */
.queue-number.text-xl {
  font-size: clamp(4rem, 26vh, 12rem);
}

/* ── Gold Border ─────────────────────────────────────────────────────────── */
.gold-border {
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(45deg, #d4af37, #f9d776, #d4af37) border-box;
  border: 1px solid transparent;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.footer {
  background: linear-gradient(135deg, #3a2c1c, #9d7e2d);
  color: #ffffff;
  text-align: center;
  position: fixed;
  bottom: 0;
  width: 100%;
  z-index: 100;
}
.footer::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #d4af37, transparent);
}
.footer-text {
  font-family: "Playfair Display", serif;
  font-size: 1.5rem;
}

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes numberPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* Vue Transitions */
.queue-change-enter-active {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.queue-change-leave-active {
  animation: popOut 0.2s ease-in;
}
@keyframes popIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes popOut {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(1.1);
    opacity: 0;
  }
}
.card-fade-enter-active,
.card-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

</style>
