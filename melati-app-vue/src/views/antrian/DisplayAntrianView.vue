<template>
  <div
    class="display-antrian d-flex flex-column align-items-center justify-content-center min-vh-100 bg-dark text-white"
    style="user-select: none"
  >
    <!-- Header -->
    <div class="display-header text-center mb-4">
      <h1 class="display-brand fw-bold">Melati Gold Shop</h1>
      <div class="connection-badge">
        <span :class="['badge', isConnected ? 'bg-success' : 'bg-danger', 'px-3 py-2']">
          <i :class="['bi', isConnected ? 'bi-wifi' : 'bi-wifi-off', 'me-1']"></i>
          {{ isConnected ? "Online" : "Offline" }}
        </span>
      </div>
    </div>

    <!-- Nomor antrian besar -->
    <Transition name="queue-pop" mode="out-in">
      <div :key="queueStore.current.displayText" class="queue-number-box text-center">
        <div class="queue-label text-warning mb-2 fs-4 fw-semibold letter-spacing">NOMOR ANTRIAN</div>
        <div class="queue-number fw-bold display-1">
          {{ queueStore.current.displayText || "-" }}
        </div>
        <div class="queue-time text-secondary mt-2 small">Dipanggil: {{ calledTime }}</div>
      </div>
    </Transition>

    <!-- Customer count + jam -->
    <div class="d-flex gap-4 mt-5 text-center">
      <div>
        <div class="text-muted small">Pengunjung Hari Ini</div>
        <div class="fs-2 fw-bold text-warning">{{ queueStore.customerCount }}</div>
      </div>
      <div class="vr opacity-25"></div>
      <div>
        <div class="text-muted small">Waktu</div>
        <div class="fs-2 fw-bold">{{ currentTime }}</div>
      </div>
    </div>

    <!-- Ticker -->
    <div
      class="ticker-bar position-fixed bottom-0 start-0 end-0 py-2 px-3 text-center bg-warning text-dark small fw-semibold"
    >
      Selamat datang di Melati Gold Shop — Silakan ambil nomor antrian
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ref as dbRef, onValue, off } from "firebase/database";
import { rtdb } from "@/config/firebase";
import { useQueueStore } from "@/stores/queue";

const queueStore = useQueueStore();
const isConnected = ref(true);
const currentTime = ref("");
let clockInterval = null;
let audioCtx = null;

const calledTime = computed(() => {
  if (!queueStore.current.calledAt) return "—";
  return new Date(queueStore.current.calledAt).toLocaleTimeString("id-ID");
});

function updateClock() {
  currentTime.value = new Date().toLocaleTimeString("id-ID");
}

function playNotif() {
  // Simple beep via Web Audio API (no external file needed)
  try {
    if (!audioCtx) audioCtx = new AudioContext();
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
  queueStore.startListening(playNotif);
});

onUnmounted(() => {
  clearInterval(clockInterval);
  queueStore.stopListening();
});
</script>

<style scoped>
.display-antrian {
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d1a 100%);
}
.display-brand {
  font-size: clamp(1.5rem, 4vw, 3rem);
  color: #c8a96e;
}
.queue-number-box {
  min-width: 320px;
}
.queue-number {
  font-size: clamp(8rem, 25vw, 20rem);
  color: #fff;
  line-height: 1;
  text-shadow: 0 0 60px rgba(200, 169, 110, 0.5);
}

/* Transition pop */
.queue-pop-enter-active {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.queue-pop-leave-active {
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
.letter-spacing {
  letter-spacing: 0.15em;
}
</style>
