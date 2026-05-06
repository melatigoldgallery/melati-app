<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="page-header mb-3">
      <h1>Sistem Antrian</h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><RouterLink to="/dashboard">Home</RouterLink></li>
          <li class="breadcrumb-item active">Antrian</li>
        </ol>
      </nav>
    </div>

    <!-- Announcement buttons -->
    <div class="row mb-2">
      <div class="col-md-6">
        <button
          :class="[
            'btn',
            'btn-danger',
            'announcement-btn',
            {
              'audio-active': audioActiveBtn === 'announceWait',
              'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'announceWait',
            },
          ]"
          @click="announceWait"
          :disabled="audioActiveBtn === 'announceWait'"
        >
          <i class="fas fa-info-circle"></i>
          Informasi Tunggu
        </button>
      </div>
      <div class="col-md-6">
        <button
          :class="[
            'btn',
            'btn-warning',
            'announcement-btn',
            {
              'audio-active': audioActiveBtn === 'announceReminder',
              'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'announceReminder',
            },
          ]"
          @click="announceReminder"
          :disabled="audioActiveBtn === 'announceReminder'"
        >
          <i class="fas fa-bell"></i>
          Pengingat Antrian
        </button>
      </div>
      <div class="col-md-12">
        <button
          :class="[
            'btn',
            'btn-success',
            'announcement-btn',
            'd-none',
            {
              'audio-active': audioActiveBtn === 'announceClosing',
              'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'announceClosing',
            },
          ]"
          @click="announceClosingNow"
          :disabled="audioActiveBtn === 'announceClosing'"
        >
          <i class="fas fa-bullhorn me-2"></i>
          Info Penutupan
        </button>
      </div>
    </div>

    <!-- 4 Column Cards -->
    <div class="row d-flex justify-content-evenly">
      <!-- Card 1: Antrian Tertunda -->
      <div class="col-md-3 mb-4">
        <div class="card queue-card">
          <div class="card-header d-flex justify-content-center p-2">
            <h6 class="card-title mb-0">
              <i class="fas fa-pause-circle me-2"></i>
              Nomor Antrian Tertunda
            </h6>
          </div>
          <div class="card-body">
            <div class="queue-display">{{ delayedDisplay }}</div>
            <div class="action-buttons">
              <button
                class="btn btn-danger"
                @click="openMoveToMissed"
                :disabled="busy || state.delayedQueue.length === 0"
              >
                <i class="fas fa-exclamation-circle me-1"></i>
                Nomor Antrian Terlewat
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: Handle Antrian Terlewat -->
      <div class="col-md-3 mb-4">
        <div class="card queue-card">
          <div class="card-header d-flex justify-content-center p-2 text-white">
            <h6 class="card-title mb-0">
              <i class="fas fa-exclamation-circle me-2"></i>
              Handle Antrian Terlewat
            </h6>
          </div>
          <div class="card-body">
            <div class="queue-display">{{ missedDisplay }}</div>
            <div class="action-buttons">
              <button
                :class="[
                  'btn',
                  'btn-primary',
                  {
                    'audio-active': audioActiveBtn === 'callMissedFirst',
                    'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'callMissedFirst',
                  },
                ]"
                @click="callMissedFirst"
                :disabled="audioActiveBtn === 'callMissedFirst' || state.missedQueue.length === 0"
              >
                <i class="fas fa-bullhorn"></i>
                Panggil Nomor Antrian
              </button>
              <button
                class="btn btn-success"
                @click="openMissedHandle"
                :disabled="busy || state.missedQueue.length === 0"
              >
                <i class="fas fa-check-circle"></i>
                Sudah Dilayani
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 3: Nomor Saat Ini -->
      <div class="col-md-3 mb-4">
        <div class="card queue-card">
          <div class="card-header d-flex justify-content-center p-2">
            <h6 class="card-title mb-0">
              <i class="fas fa-user-clock me-2"></i>
              Nomor Antrian Saat Ini
            </h6>
          </div>
          <div class="card-body">
            <div class="queue-display">{{ currentQueueStr }}</div>
            <div class="action-buttons">
              <button
                :class="[
                  'btn',
                  'btn-primary',
                  {
                    'audio-active': audioActiveBtn === 'callCurrent',
                    'audio-blocked': audioActiveBtn !== '' && audioActiveBtn !== 'callCurrent',
                  },
                ]"
                @click="callCurrent"
                :disabled="audioActiveBtn === 'callCurrent'"
              >
                <i class="fas fa-bullhorn"></i>
                Panggil Nomor Antrian
              </button>
              <button class="btn btn-success" @click="openServeConfirm" :disabled="busy">
                <i class="fas fa-check-circle"></i>
                Sudah Dilayani
              </button>
              <button class="btn btn-warning" @click="openSkip" :disabled="busy">
                <i class="fas fa-forward"></i>
                Skip Nomor Antrian
              </button>
              <button class="btn btn-secondary" @click="openDelay" :disabled="busy">
                <i class="fas fa-pause-circle"></i>
                Nomor Antrian Tertunda
              </button>
              <button class="btn btn-primary" @click="openCustom" :disabled="busy">
                <i class="fas fa-step-forward"></i>
                Custom Nomor Antrian
              </button>
              <button class="btn btn-danger" @click="openReset" :disabled="busy">
                <i class="fas fa-redo-alt"></i>
                Reset Nomor Antrian
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 4: Skip List -->
      <div class="col-md-3 mb-4">
        <div class="card queue-card">
          <div class="card-header d-flex justify-content-center p-2">
            <h6 class="card-title mb-0">
              <i class="fas fa-forward me-2"></i>
              Skip Nomor Antrian
            </h6>
          </div>
          <div class="card-body">
            <div class="queue-display">{{ skipDisplay }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Pelayanan (Card 3 Sudah Dilayani) -->
    <div class="modal fade" id="confirmModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-check-circle me-2"></i>
              Konfirmasi Pelayanan
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Anda akan menandai nomor antrian ini sebagai sudah dilayani.
            </div>
            <p class="mb-0">Apakah Anda yakin nomor antrian ini sudah dilayani?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Tidak
            </button>
            <button type="button" class="btn btn-success" @click="confirmServed" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Ya, Sudah Dilayani
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Pindahkan ke Antrian Terlewat (Card 1) -->
    <div class="modal fade" id="moveToMissedModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-circle me-2"></i>
              Pindahkan ke Antrian Terlewat
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-danger">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Pilih nomor antrian tertunda yang akan dipindahkan ke daftar terlewat.
            </div>
            <div class="mb-3">
              <label class="form-label">Pilih nomor antrian:</label>
              <select v-model="moveToMissedSelected" class="form-select">
                <option v-for="q in state.delayedQueue" :key="q" :value="q">{{ q }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-danger" @click="confirmMoveToMissed" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Pindahkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Pelayanan Terlewat (Card 2 Sudah Dilayani) -->
    <div class="modal fade" id="missedHandleModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-check-circle me-2"></i>
              Konfirmasi Pelayanan Terlewat
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Pilih nomor antrian terlewat yang sudah dilayani.
            </div>
            <div class="mb-3">
              <label class="form-label">Pilih nomor antrian yang sudah dilayani:</label>
              <select v-model="missedHandleSelected" class="form-select">
                <option v-for="q in state.missedQueue" :key="q" :value="q">{{ q }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-success" @click="confirmMissedHandle" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Antrian Tertunda (Card 3 Tunda) -->
    <div class="modal fade" id="confirmDelayModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-secondary text-white">
            <h5 class="modal-title">
              <i class="fas fa-pause-circle me-2"></i>
              Konfirmasi Antrian Tertunda
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-secondary">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Anda akan memindahkan nomor antrian ini ke daftar antrian tertunda.
            </div>
            <p>Apakah Anda yakin ingin memindahkan nomor antrian ini ke antrian tertunda?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Tidak
            </button>
            <button type="button" class="btn btn-secondary" @click="confirmDelay" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Ya, Pindahkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Skip Nomor Antrian -->
    <div class="modal fade" id="skipQueueModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-white">
            <h5 class="modal-title">
              <i class="fas fa-forward me-2"></i>
              Skip Nomor Antrian
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Anda akan melewati nomor antrian tertentu.
            </div>
            <p>
              Nomor antrian saat ini:
              <strong>{{ currentQueueStr }}</strong>
            </p>
            <div class="mb-3">
              <label class="form-label">Huruf Antrian (A-D)</label>
              <select v-model="skipLetter" class="form-select">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nomor Antrian yang Akan Dilewati (1-50)</label>
              <input
                v-model.number="skipNumber"
                type="number"
                min="1"
                max="50"
                class="form-control"
                placeholder="Masukkan nomor antrian"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-warning" @click="confirmSkip" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Tambahkan ke Skip List
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Custom Nomor Antrian -->
    <div class="modal fade" id="customQueueModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-edit me-2"></i>
              Set Custom Nomor Antrian
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Anda akan mengatur nomor antrian secara manual.
            </div>
            <div class="mb-3">
              <label class="form-label">Huruf Antrian (A-D)</label>
              <select v-model="customLetter" class="form-select">
                <option :value="0">A</option>
                <option :value="1">B</option>
                <option :value="2">C</option>
                <option :value="3">D</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nomor Antrian (1-50)</label>
              <input
                v-model.number="customNumber"
                type="number"
                min="1"
                max="50"
                class="form-control"
                placeholder="Masukkan nomor antrian"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-2"></i>
              Batal
            </button>
            <button type="button" class="btn btn-primary" @click="confirmCustom" :disabled="busy">
              <i class="fas fa-check me-2"></i>
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Konfirmasi Reset -->
    <div class="modal fade" id="resetModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Konfirmasi Reset</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Perhatian!</strong>
              Tindakan ini akan mereset nomor antrian.
            </div>
            <p>Apakah Anda yakin ingin mereset nomor antrian? Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-danger" @click="confirmReset" :disabled="busy">
              <i class="fas fa-redo-alt me-2"></i>
              Ya, Reset Antrian
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import {
  subscribeQueue,
  subscribeConnection,
  formatQueue,
  padNumber,
  LETTERS_MAP,
  nextQueue,
  setCustomQueue,
  addToSkipList,
  addToDelayedQueue,
  moveToMissed,
  removeFromMissed,
  resetQueue,
  writeAnalyticsEntry,
} from "@/services/antrian-service";
import {
  playQueueAnnouncement,
  playWaitMessageSequence,
  playTakeQueueMessage,
  playClosingAnnouncement,
  primeAudioPlayback,
  isAudioBusy,
} from "@/services/audio-service";
import {
  DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS,
  ensureClosingAnnouncementSettings,
  fetchClosingAnnouncementSettings,
  subscribeClosingAnnouncementSettings,
} from "@/services/antrian-closing-service";

const state = ref({ currentLetter: 0, currentNumber: 1, delayedQueue: [], skipList: [], missedQueue: [] });
const auth = useAuthStore();
const activeFloor = computed(() => auth.activeFloor || "L1");
const connected = ref(false);
const busy = ref(false);
const audioActiveBtn = ref("");
const lastAutoRunSlot = ref(null);
const closingSettings = ref({ ...DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS });

const AUTO_RUN_STORAGE_KEY = computed(() => `closing_auto_run_slot_${activeFloor.value}`);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 60 * 1000;
const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_REMINDER_WINDOW_MS = DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitWindowSeconds * 1000;
const DEFAULT_REMINDER_MAX_CLICKS = DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.reminderLimitMaxCalls;

// Modal form state
const customLetter = ref(0);
const customNumber = ref(1);
const skipLetter = ref("A");
const skipNumber = ref(1);
const moveToMissedSelected = ref("");
const missedHandleSelected = ref("");
const reminderClickTimestamps = ref([]);

const currentQueueStr = computed(() => formatQueue(state.value.currentLetter, state.value.currentNumber));

// Display helpers matching original: show joined list or "-"
const delayedDisplay = computed(() => {
  const q = state.value.delayedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});
const missedDisplay = computed(() => {
  const q = state.value.missedQueue;
  if (!q.length) return "-";
  const MAX = 2;
  const visible = q.slice(0, MAX).join(", ");
  return q.length > MAX ? `${visible}, ...` : visible;
});
const skipDisplay = computed(() => (state.value.skipList.length ? state.value.skipList.join(", ") : "-"));

let unsubQueue = null;
let unsubConn = null;
let unsubClosingSettings = null;
let closingPollIntervalId = null;
let unlockAudioHandler = null;
let schedulerActive = false;
const closingTimeoutIds = new Set();

function modal(id) {
  return Modal.getOrCreateInstance(document.getElementById(id));
}

function makeSlotKey(dateObj, hour, minute) {
  const d = dateObj || new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${day}|${hm}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildClosingSlotsFromSettings() {
  const enabled = closingSettings.value?.enabled !== false;
  if (!enabled) return [];

  const timeRaw = String(closingSettings.value?.time || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.time);
  const [hourStr = "20", minuteStr = "55"] = timeRaw.split(":");
  const h = Math.max(0, Math.min(23, Number(hourStr) || 20));
  const m = Math.max(0, Math.min(59, Number(minuteStr) || 55));
  const repeat = Math.max(1, Math.min(5, Number(closingSettings.value?.repeat) || 1));

  return [{ h, m, repeat }];
}

function getClosingMessage() {
  const text = String(closingSettings.value?.message || "").trim();
  return text || DEFAULT_CLOSING_ANNOUNCEMENT_SETTINGS.message;
}

function getReminderLimitConfig() {
  const maxCalls = Math.max(
    1,
    Math.min(20, Number(closingSettings.value?.reminderLimitMaxCalls) || DEFAULT_REMINDER_MAX_CLICKS),
  );
  const windowSeconds = Math.max(
    10,
    Math.min(3600, Number(closingSettings.value?.reminderLimitWindowSeconds) || DEFAULT_REMINDER_WINDOW_MS / 1000),
  );
  return { maxCalls, windowSeconds, windowMs: windowSeconds * 1000 };
}

function restartClosingScheduler() {
  stopClosingScheduler();
  startClosingScheduler();
}

async function initClosingSettings() {
  try {
    await ensureClosingAnnouncementSettings();
    closingSettings.value = await fetchClosingAnnouncementSettings();
  } catch (error) {
    console.error("Failed to fetch closing announcement settings", error);
  }

  restartClosingScheduler();
  unsubClosingSettings = subscribeClosingAnnouncementSettings((data) => {
    closingSettings.value = data;
    restartClosingScheduler();
  });
}

async function triggerAutoForSlot(targetHour, targetMinute, repeatCount = 1) {
  const slotKey = makeSlotKey(new Date(), targetHour, targetMinute);
  if (lastAutoRunSlot.value === slotKey) return;

  try {
    if (localStorage.getItem(AUTO_RUN_STORAGE_KEY.value) === slotKey) {
      lastAutoRunSlot.value = slotKey;
      return;
    }
    localStorage.setItem(AUTO_RUN_STORAGE_KEY.value, slotKey);
  } catch (_) {
    // Ignore localStorage errors (private mode/restrictions)
  }

  lastAutoRunSlot.value = slotKey;
  for (let i = 0; i < repeatCount; i++) {
    await playClosingAnnouncement(getClosingMessage());
    if (i < repeatCount - 1) {
      await sleep(1000);
    }
  }
}

function computeNextDelayFor(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  let delay = target.getTime() - now.getTime();
  if (delay < 0) delay += ONE_DAY_MS;
  return delay;
}

function scheduleSlot(hour, minute, repeat = 1) {
  const delay = computeNextDelayFor(hour, minute);
  const timeoutId = setTimeout(async () => {
    closingTimeoutIds.delete(timeoutId);
    if (!schedulerActive) return;
    await triggerAutoForSlot(hour, minute, repeat);
    if (schedulerActive) {
      scheduleSlot(hour, minute, repeat);
    }
  }, delay);
  closingTimeoutIds.add(timeoutId);
}

function startClosingScheduler() {
  schedulerActive = true;
  const slots = buildClosingSlotsFromSettings();
  slots.forEach(({ h, m, repeat = 1 }) => scheduleSlot(h, m, repeat));

  closingPollIntervalId = setInterval(async () => {
    if (!schedulerActive) return;
    const now = new Date();

    for (const { h, m, repeat = 1 } of slots) {
      const target = new Date();
      target.setHours(h, m, 0, 0);
      const diff = now.getTime() - target.getTime();
      if (diff >= 0 && diff < WINDOW_MS) {
        await triggerAutoForSlot(h, m, repeat);
      }
    }
  }, POLL_MS);
}

function stopClosingScheduler() {
  schedulerActive = false;
  if (closingPollIntervalId) {
    clearInterval(closingPollIntervalId);
    closingPollIntervalId = null;
  }
  closingTimeoutIds.forEach((id) => clearTimeout(id));
  closingTimeoutIds.clear();
}

function removeUnlockListeners() {
  if (!unlockAudioHandler) return;
  window.removeEventListener("click", unlockAudioHandler);
  window.removeEventListener("keydown", unlockAudioHandler);
  window.removeEventListener("touchstart", unlockAudioHandler);
  unlockAudioHandler = null;
}

function setupPrimeUnlockListeners() {
  unlockAudioHandler = () => {
    try {
      primeAudioPlayback();
    } catch (_) {
      // no-op
    }
    removeUnlockListeners();
  };

  window.addEventListener("click", unlockAudioHandler);
  window.addEventListener("keydown", unlockAudioHandler);
  window.addEventListener("touchstart", unlockAudioHandler);
}

function warnMissedFirst() {
  Swal.fire({
    icon: "warning",
    title: "Tidak Bisa Diproses",
    text: "Selesaikan antrian terlewat terlebih dahulu.",
    confirmButtonText: "Mengerti",
    confirmButtonColor: "#f44336",
  });
}

// ── Card 3: Nomor Saat Ini ──────────────────────────────────────────────────
async function callCurrent() {
  if (state.value.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = "callCurrent";
  await playQueueAnnouncement(currentQueueStr.value);
  audioActiveBtn.value = "";
}

function openServeConfirm() {
  if (state.value.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modal("confirmModal").show();
}

async function confirmServed() {
  busy.value = true;
  modal("confirmModal").hide();
  try {
    const q = currentQueueStr.value;
    state.value = await nextQueue(state.value);
    await writeAnalyticsEntry({ queueNumber: q, status: "served" });
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openSkip() {
  modal("skipQueueModal").show();
}

async function confirmSkip() {
  busy.value = true;
  modal("skipQueueModal").hide();
  try {
    const qNum = skipLetter.value + padNumber(skipNumber.value);
    state.value = await addToSkipList(state.value, qNum);
    skipNumber.value = 1;
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openDelay() {
  if (state.value.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modal("confirmDelayModal").show();
}

async function confirmDelay() {
  busy.value = true;
  modal("confirmDelayModal").hide();
  try {
    const q = currentQueueStr.value;
    const s = await addToDelayedQueue(state.value, q);
    state.value = await nextQueue(s);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openCustom() {
  if (state.value.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modal("customQueueModal").show();
}

async function confirmCustom() {
  busy.value = true;
  modal("customQueueModal").hide();
  try {
    state.value = await setCustomQueue(state.value, customLetter.value, customNumber.value);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

function openReset() {
  if (state.value.missedQueue.length > 0) {
    warnMissedFirst();
    return;
  }
  modal("resetModal").show();
}

async function confirmReset() {
  busy.value = true;
  modal("resetModal").hide();
  try {
    await resetQueue();
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Card 1: Antrian Tertunda ─────────────────────────────────────────────────
function openMoveToMissed() {
  if (!state.value.delayedQueue.length) return;
  moveToMissedSelected.value = state.value.delayedQueue[0];
  modal("moveToMissedModal").show();
}

async function confirmMoveToMissed() {
  const q = moveToMissedSelected.value;
  if (!q) return;
  busy.value = true;
  modal("moveToMissedModal").hide();
  try {
    state.value = await moveToMissed(state.value, q);
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Card 2: Antrian Terlewat ──────────────────────────────────────────────────
async function callMissedFirst() {
  if (!state.value.missedQueue.length) return;
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = "callMissedFirst";
  await playQueueAnnouncement(state.value.missedQueue[0]);
  audioActiveBtn.value = "";
}

function openMissedHandle() {
  if (!state.value.missedQueue.length) return;
  missedHandleSelected.value = state.value.missedQueue[0];
  modal("missedHandleModal").show();
}

async function confirmMissedHandle() {
  const q = missedHandleSelected.value;
  if (!q) return;
  busy.value = true;
  modal("missedHandleModal").hide();
  try {
    state.value = await removeFromMissed(state.value, q);
    await writeAnalyticsEntry({ queueNumber: q, status: "served" });
  } catch (e) {
    console.error(e);
  } finally {
    busy.value = false;
  }
}

// ── Announcement buttons ──────────────────────────────────────────────────────
async function announceWait() {
  if (isAudioBusy()) return;
  primeAudioPlayback();
  audioActiveBtn.value = "announceWait";
  await playWaitMessageSequence();
  audioActiveBtn.value = "";
}

function getReminderTimestampsWithinWindow(now = Date.now(), windowMs = DEFAULT_REMINDER_WINDOW_MS) {
  const minTime = now - windowMs;
  return reminderClickTimestamps.value.filter((ts) => ts > minTime);
}

async function handleReminderRateLimit() {
  const limitEnabled = closingSettings.value?.reminderLimitEnabled !== false;
  if (!limitEnabled) return true;

  const { maxCalls, windowSeconds, windowMs } = getReminderLimitConfig();
  const now = Date.now();
  const recent = getReminderTimestampsWithinWindow(now, windowMs);
  if (recent.length >= maxCalls) {
    reminderClickTimestamps.value = recent;
    const oldest = Math.min(...recent);
    const waitSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    await Swal.fire({
      icon: "warning",
      title: "Batas Pengingat Tercapai",
      text: `Dalam ${windowSeconds} detik maksimal hanya ${maxCalls} kali klik tombol Pengingat Antrian. Coba lagi dalam ${waitSeconds} detik.`,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#f59e0b",
    });
    return false;
  }

  reminderClickTimestamps.value = [...recent, now];
  return true;
}

async function announceReminder() {
  if (isAudioBusy()) return;
  const allowed = await handleReminderRateLimit();
  if (!allowed) return;
  primeAudioPlayback();
  audioActiveBtn.value = "announceReminder";
  await playTakeQueueMessage();
  audioActiveBtn.value = "";
}

async function announceClosingNow() {
  if (isAudioBusy()) return;
  try {
    primeAudioPlayback();
    audioActiveBtn.value = "announceClosing";
    await playClosingAnnouncement(getClosingMessage());
  } finally {
    audioActiveBtn.value = "";
  }
}

onMounted(() => {
  unsubQueue = subscribeQueue((s) => {
    state.value = s;
  });
  unsubConn = subscribeConnection((v) => {
    connected.value = v;
  });
  initClosingSettings();
  setupPrimeUnlockListeners();
});

onUnmounted(() => {
  unsubQueue?.();
  unsubConn?.();
  unsubClosingSettings?.();
  stopClosingScheduler();
  removeUnlockListeners();
});
</script>

<style scoped>
/* Queue Cards */
.queue-card {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  height: 100%;
}

.queue-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.queue-card .card-header {
  background: linear-gradient(
    135deg,
    var(--theme-antrian-card-header-start) 0%,
    var(--theme-antrian-card-header-end) 100%
  );
  color: white;
  font-weight: 600;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

/* Card 2 overrides gradient with Bootstrap bg-danger */
.queue-card .card-header.bg-danger {
  background: #dc3545 !important;
}

/* Big number / list display */
.queue-display {
  font-size: 3.5rem;
  font-weight: 700;
  color: #4361ee;
  text-align: center;
  padding: 1.5rem 0;
  background-color: rgba(67, 97, 238, 0.05);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  word-break: break-all;
}

/* Action button column */
.action-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;
  margin-top: 15px;
}

.action-buttons .btn {
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

/* Announcement buttons */
.announcement-btn {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

/* Block other audio buttons without visual change */
.audio-blocked {
  pointer-events: none;
}

/* Audio playing state */
.audio-active {
  position: relative;
  pointer-events: none;
  opacity: 0.8;
  background-color: #a80101 !important;
  border-color: #a80101 !important;
}

.audio-active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
}
</style>
