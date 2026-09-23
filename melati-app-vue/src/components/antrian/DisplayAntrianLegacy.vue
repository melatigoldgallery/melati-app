<template>
  <div class="display-page">
    <!-- Ambient Background Lighting -->
    <div class="ambient-glow top-glow"></div>
    <div class="ambient-glow bottom-left-glow"></div>
    <div class="ambient-glow bottom-right-glow"></div>

    <!-- BEGIN: HeaderSection -->
    <header class="display-header">
      <!-- Brand identity & emblem -->
      <div class="header-left">
        <div
          class="logo-emblem-outer"
          @click="handleLogoClick"
          title="Melati Gold"
        >
          <div class="logo-emblem-inner">
            <img src="/img/Melati.jfif" alt="Logo" class="logo-img" />
          </div>
        </div>

        <div class="brand-titles">
          <h1 class="brand-name">{{ brandName }}</h1>
        </div>
      </div>

      <!-- Live Date Widget -->
      <div class="header-right">
        <div class="date-text">{{ currentDate }}</div>
      </div>
    </header>
    <!-- END: HeaderSection -->

    <!-- BEGIN: MainQueueBoard -->
    <main class="main-board">
      <!-- Card 1: Sedang Dilayani -->
      <section class="queue-lane">
        <div class="lane-top-stripe"></div>

        <!-- Lane Category Header -->
        <div class="lane-header-wrapper">
          <div class="lane-header-row">
            <div class="lane-info-left">
              <div class="lane-icon-badge">
                <i class="fas fa-user-check"></i>
              </div>
              <div>
                <span class="lane-subtitle">Pelayanan Antrian</span>
                <h2 class="lane-title">SEDANG DILAYANI</h2>
              </div>
            </div>

            <!-- Optional Missed Queue Indicator Badge -->
            <div v-if="missedDisplay !== '-'" class="missed-alert-badge">
              <i class="fas fa-exclamation-circle"></i>
              <span>Terlewat: {{ missedDisplay }}</span>
            </div>
          </div>
        </div>

        <!-- Massive Center Calling Number Display -->
        <div class="number-center-container">
          <Transition name="queue-change" mode="out-in">
            <div :key="currentDisplay" class="number-wrapper">
              <span class="queue-number-text">
                {{ currentDisplay }}
              </span>
            </div>
          </Transition>
        </div>

        <!-- Delayed Queue Preview Footer -->
        <div class="lane-footer">
          <span class="next-label">
            <i class="fas fa-pause-circle text-gold"></i>
            Antrian Tertunda:
          </span>
          <div class="next-numbers-row">
            <template v-if="delayedQueues.length > 0">
              <span
                v-for="(num, idx) in delayedQueues"
                :key="num"
                class="next-num-badge"
                :class="{ 'next-num-primary': idx === 0, 'next-num-secondary': idx > 0 }"
              >
                {{ num }}
              </span>
            </template>
            <span v-else class="next-num-empty">-</span>
          </div>
        </div>
      </section>

      <!-- Card 2: Akan Dipanggil -->
      <section class="queue-lane">
        <div class="lane-top-stripe stripe-next"></div>

        <!-- Lane Category Header -->
        <div class="lane-header-wrapper">
          <div class="lane-header-row">
            <div class="lane-info-left">
              <div class="lane-icon-badge">
                <i class="fas fa-clock"></i>
              </div>
              <div>
                <span class="lane-subtitle">Pelayanan Antrian</span>
                <h2 class="lane-title">AKAN DIPANGGIL</h2>
              </div>
            </div>
          </div>
        </div>

        <!-- Massive Center Next Number Display -->
        <div class="number-center-container">
          <Transition name="queue-change" mode="out-in">
            <div :key="nextDisplay" class="number-wrapper">
              <span class="queue-number-text">
                {{ nextDisplay }}
              </span>
            </div>
          </Transition>
        </div>

        <!-- Upcoming Queue Preview Footer -->
        <div class="lane-footer">
          <span class="next-label">
            <i class="fas fa-clock text-gold"></i>
            Antrian Berikutnya:
          </span>
          <div class="next-numbers-row">
            <template v-if="nextThreeQueues.length > 0">
              <span
                v-for="(num, idx) in nextThreeQueues"
                :key="num"
                class="next-num-badge"
                :class="{ 'next-num-primary': idx === 0, 'next-num-secondary': idx > 0 }"
              >
                {{ num }}
              </span>
            </template>
            <span v-else class="next-num-empty">-</span>
          </div>
        </div>
      </section>
    </main>
    <!-- END: MainQueueBoard -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { DEFAULT_FLOOR_ID, normalizeFloorId } from "@/config/floor-config";
import { subscribeQueue, formatQueue } from "@/services/antrian-service-legacy";

const props = defineProps({
  activeFloor: {
    type: String,
    default: "",
  },
});

const currentDisplay = ref("-");
const nextDisplay = ref("-");
const missedDisplay = ref("-");
const currentDate = ref("");
const queueState = ref({ currentLetter: 0, currentNumber: 1, delayedQueue: [], skipList: [], missedQueue: [] });

// Upcoming 3 queues for Akan Dipanggil lane
const nextThreeQueues = computed(() => {
  const q = queueState.value;
  if (!q.currentNumber) return [];
  const LETTERS = ["A", "B", "C", "D"];
  const list = [];
  let curNum = Math.max(1, Number(q.currentNumber) || 1);
  let curLet = q.currentLetter ?? 0;
  
  for (let i = 0; i < 3; i++) {
    curNum++;
    if (curNum > 99) {
      curNum = 1;
      curLet = (curLet + 1) % LETTERS.length;
    }
    const qStr = formatQueue(curLet, curNum);
    if (!q.skipList?.includes(qStr)) {
      list.push(qStr);
    }
  }
  return list;
});

// Delayed queues for Sedang Dilayani lane
const delayedQueues = computed(() => {
  const delayed = (queueState.value.delayedQueue || []).filter(Boolean);
  return delayed.slice(0, 3);
});

const route = useRoute();

const activeFloor = computed(() => {
  const rawFloor = props.activeFloor || route.query.floor || DEFAULT_FLOOR_ID;
  const normalized = normalizeFloorId(rawFloor, DEFAULT_FLOOR_ID);
  return normalized || DEFAULT_FLOOR_ID;
});

const brandName = computed(() => {
  return activeFloor.value === "L2" ? "Melati Gold Young" : "Melati Gold Shop";
});

let clockInterval = null;
let audioCtx = null;
let unsubscribeQueue = null;
let prevDisplay = "-";

function updateClock() {
  const now = new Date();
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

function getCurrentServingDisplay(letterIndex, number) {
  const safeNumber = Math.max(1, Number(number) || 1);
  return formatQueue(letterIndex, safeNumber > 1 ? safeNumber - 1 : 1);
}

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

function subscribeToQueue() {
  if (unsubscribeQueue) unsubscribeQueue();
  unsubscribeQueue = subscribeQueue(activeFloor.value, (state) => {
    queueState.value = state;
    const newDisplay = getCurrentServingDisplay(state.currentLetter, state.currentNumber);
    if (prevDisplay !== "-" && newDisplay !== prevDisplay) {
      playNotif();
    }
    prevDisplay = newDisplay;
    currentDisplay.value = newDisplay;

    nextDisplay.value = formatQueue(state.currentLetter, Math.max(1, Number(state.currentNumber) || 1));

    // Missed queue
    const missed = (state.missedQueue || []).filter(Boolean);
    missedDisplay.value = missed.length > 0 ? missed.join(", ") : "-";
  });
}

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  subscribeToQueue();
});

watch(activeFloor, () => {
  subscribeToQueue();
});

onUnmounted(() => {
  clearInterval(clockInterval);
  if (unsubscribeQueue) unsubscribeQueue();
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&display=swap");

/* ── Fullscreen Page Container ─────────────────────────────────────────────── */
.display-page {
  height: 100vh;
  width: 100vw;
  background-color: #FAF7F2;
  color: #201b18;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  user-select: none;
  box-sizing: border-box;
}

/* ── Ambient Background Lighting ──────────────────────────────────────────── */
.ambient-glow {
  position: fixed;
  pointer-events: none;
  z-index: 0;
  border-radius: 50%;
}
.top-glow {
  top: -10%;
  left: 50%;
  transform: translateX(-50%);
  width: 60vw;
  height: 30vh;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.14) 0%, transparent 70%);
}
.bottom-left-glow {
  bottom: 5%;
  left: 5%;
  width: 35vw;
  height: 35vh;
  background: radial-gradient(circle, rgba(184, 134, 11, 0.09) 0%, transparent 70%);
}
.bottom-right-glow {
  bottom: 5%;
  right: 5%;
  width: 35vw;
  height: 35vh;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.09) 0%, transparent 70%);
}

/* ── Header Section ───────────────────────────────────────────────────────── */
.display-header {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1.5px solid rgba(212, 175, 55, 0.35);
  padding: 12px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  z-index: 20;
  position: relative;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

.logo-emblem-outer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #785b12, #e2c168, #997a15);
  padding: 2px;
  box-shadow: 0 4px 10px rgba(120, 91, 18, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease;
}
.logo-emblem-outer:hover {
  transform: scale(1.05);
}

.logo-emblem-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #f3e5ab;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-titles {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-family: 'Playfair Display', serif;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #5a4208, #997a15, #5a4208);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
  margin: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.brand-subtitle {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #5c4202;
  margin: 2px 0 0 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.date-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #5c4202;
  letter-spacing: 0.02em;
}



/* ── Main Queue Board ─────────────────────────────────────────────────────── */
.main-board {
  flex: 1;
  width: 100%;
  padding: 24px 32px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 28px;
  position: relative;
  z-index: 10;
  overflow: hidden;
  box-sizing: border-box;
}

.queue-lane {
  flex: 1;
  max-width: 780px;
  border-radius: 24px;
  background: #ffffff;
  border: 2px solid rgba(212, 175, 55, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px 28px 24px 28px;
  box-shadow: 0 15px 35px -5px rgba(184, 152, 7, 0.12), 0 0 0 1px rgba(212, 175, 55, 0.1);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.lane-top-stripe {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #d4af37, #f3e5ab, #d4af37);
}

.stripe-next {
  background: linear-gradient(90deg, #997a15, #d4af37, #997a15);
}

.lane-header-wrapper {
  width: 100%;
}

.lane-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(226, 193, 104, 0.3);
}

.lane-info-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lane-icon-badge {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 222, 164, 0.45), rgba(253, 213, 137, 0.55), rgba(255, 222, 164, 0.25));
  border: 2px solid rgba(212, 175, 55, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #745718;
  font-size: 1.5rem;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.lane-subtitle {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #8f702f;
  display: block;
}

.lane-title {
  font-family: 'Roboto', sans-serif;
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #261900;
  margin: 2px 0 0 0;
  line-height: 1.15;
}

.missed-alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.8rem;
  font-weight: 700;
  animation: pulseAlert 2s infinite;
}

@keyframes pulseAlert {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* ── Massive Calling Number ───────────────────────────────────────────────── */
.number-center-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  text-align: center;
  overflow: visible;
}

.number-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.queue-number-text {
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1.02;
  padding: 0 0.05em 0.12em 0.05em;
  font-size: clamp(14rem, 22vw, 26rem);
  background: linear-gradient(
    180deg,
    #0a0703 0%,
    #140d05 50%,
    #241808 72%,
    #422c0e 86%,
    #7a5717 94%,
    #b88a24 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 8px 18px rgba(20, 14, 4, 0.28));
  display: inline-block;
  user-select: none;
}

/* ── Lane Footer (Upcoming & Delayed Numbers) ─────────────────────────────── */
.lane-footer {
  padding: 12px 28px;
  border-top: 1px solid rgba(226, 193, 104, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FAF7F2;
  margin-left: -28px;
  margin-right: -28px;
  margin-bottom: -24px;
  border-bottom-left-radius: 22px;
  border-bottom-right-radius: 22px;
}

.next-label {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #5c4202;
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-gold {
  color: #745718;
}

.next-numbers-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.next-num-badge {
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.next-num-primary {
  padding: 6px 16px;
  background: #ffffff;
  color: #261900;
  border: 2px solid rgba(212, 175, 55, 0.6);
  font-size: 1.35rem;
  font-weight: 900;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.next-num-secondary {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.85);
  color: #5c4202;
  border: 1px solid rgba(212, 175, 55, 0.35);
  font-size: 1.3rem;
  font-weight: 800;
}

.next-num-empty {
  padding: 6px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: #7f7667;
  border: 1px solid rgba(209, 197, 180, 0.5);
  font-size: 1.3rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Vue Transitions ──────────────────────────────────────────────────────── */
.queue-change-enter-active {
  animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.queue-change-leave-active {
  animation: popOut 0.25s ease-in;
}

@keyframes popIn {
  from {
    transform: scale(0.65);
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
</style>
