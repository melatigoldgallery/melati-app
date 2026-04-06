<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-ticket-perforated me-2 text-warning"></i>Panel Antrian
      </h4>
      <span :class="['badge', connected ? 'bg-success' : 'bg-danger']">
        <i class="bi bi-circle-fill me-1" style="font-size:0.6em"></i>
        {{ connected ? 'Terhubung' : 'Tidak Terhubung' }}
      </span>
    </div>

    <!-- Current Queue Display -->
    <div class="row g-3 mb-3">
      <div class="col-md-5">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-warning fw-bold d-flex justify-content-between align-items-center">
            <span>Nomor Antrian Saat Ini</span>
            <span class="badge bg-dark">{{ letterLabel }}</span>
          </div>
          <div class="card-body text-center py-4">
            <div class="display-1 fw-bold text-warning mb-2">{{ currentQueueStr }}</div>
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <button class="btn btn-success" @click="handleServed" :disabled="busy">
                <i class="bi bi-check-circle me-1"></i>Sudah Dilayani
              </button>
              <button class="btn btn-outline-warning" @click="openDelay">
                <i class="bi bi-pause-circle me-1"></i>Tertunda
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="openPrev" title="Sebelumnya">
                <i class="bi bi-arrow-left"></i>
              </button>
              <button class="btn btn-outline-info btn-sm" @click="openCustom">
                <i class="bi bi-input-cursor-text me-1"></i>Custom
              </button>
              <button class="btn btn-outline-danger btn-sm" @click="openSkip">
                <i class="bi bi-skip-forward me-1"></i>Lewati
              </button>
              <button class="btn btn-danger btn-sm" @click="openReset">
                <i class="bi bi-arrow-counterclockwise me-1"></i>Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Skip List -->
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white fw-semibold small py-2">
            <i class="bi bi-skip-forward me-1 text-warning"></i>Skip List
          </div>
          <div class="card-body">
            <div v-if="state.skipList.length === 0" class="text-muted small text-center py-3">Kosong</div>
            <div v-else class="d-flex flex-wrap gap-1">
              <span v-for="s in state.skipList" :key="s" class="badge bg-warning text-dark">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Announcement Buttons -->
      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white fw-semibold small py-2">
            <i class="bi bi-megaphone me-1 text-warning"></i>Pengumuman
          </div>
          <div class="card-body d-flex flex-column gap-2 justify-content-center">
            <button class="btn btn-danger btn-sm" @click="announceWait">
              <i class="bi bi-hourglass-split me-1"></i>Informasi Tunggu
            </button>
            <button class="btn btn-warning btn-sm" @click="announceReminder">
              <i class="bi bi-bell me-1"></i>Pengingat Antrian
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delayed & Missed -->
    <div class="row g-3">
      <!-- Delayed Queue -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
            <span class="fw-semibold small"><i class="bi bi-pause-circle me-1 text-warning"></i>Antrian Tertunda</span>
            <span class="badge bg-warning text-dark">{{ state.delayedQueue.length }}</span>
          </div>
          <div class="card-body">
            <div v-if="state.delayedQueue.length === 0" class="text-muted small text-center py-3">Tidak ada antrian tertunda.</div>
            <div v-else class="d-flex flex-column gap-2">
              <div v-for="q in state.delayedQueue" :key="q" class="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                <span class="fw-bold text-warning">{{ q }}</span>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-success btn-sm" @click="serveDelayed(q)" :disabled="busy" title="Dilayani">
                    <i class="bi bi-check"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm" @click="escalateToMissed(q)" :disabled="busy" title="Pindah ke Terlewat">
                    <i class="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Missed Queue -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
            <span class="fw-semibold small"><i class="bi bi-exclamation-triangle me-1 text-danger"></i>Antrian Terlewat</span>
            <span class="badge bg-danger">{{ state.missedQueue.length }}</span>
          </div>
          <div class="card-body">
            <div v-if="state.missedQueue.length === 0" class="text-muted small text-center py-3">Tidak ada antrian terlewat.</div>
            <div v-else class="d-flex flex-column gap-2">
              <div v-for="q in state.missedQueue" :key="q" class="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                <span class="fw-bold text-danger">{{ q }}</span>
                <button class="btn btn-outline-success btn-sm" @click="serveMissed(q)" :disabled="busy">
                  <i class="bi bi-check me-1"></i>Dilayani
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Delay Current -->
    <div class="modal fade" id="delayModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title small fw-bold">Tunda Antrian?</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body small">Nomor <b>{{ currentQueueStr }}</b> akan dipindahkan ke antrian tertunda.</div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="confirmDelay" :disabled="busy">Ya, Tunda</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Previous -->
    <div class="modal fade" id="prevModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title small fw-bold">Kembali?</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body small">Kembali ke nomor antrian sebelumnya?</div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-secondary btn-sm" @click="confirmPrev" :disabled="busy">Ya, Kembali</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Custom Queue -->
    <div class="modal fade" id="customModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title small fw-bold">Set Nomor Custom</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label small">Huruf</label>
              <select v-model="customLetter" class="form-select form-select-sm">
                <option v-for="(l, i) in ['A','B','C','D']" :key="l" :value="i">{{ l }} — {{ LETTERS_MAP[l] }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small">Nomor (1–50)</label>
              <input v-model.number="customNumber" type="number" min="1" max="50" class="form-control form-control-sm" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-info btn-sm text-white" @click="confirmCustom" :disabled="busy">Set</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Add to Skip -->
    <div class="modal fade" id="skipModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title small fw-bold">Lewati Nomor</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label small">Huruf</label>
              <select v-model="skipLetter" class="form-select form-select-sm">
                <option v-for="l in ['A','B','C','D']" :key="l" :value="l">{{ l }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small">Nomor (1–50)</label>
              <input v-model.number="skipNumber" type="number" min="1" max="50" class="form-control form-control-sm" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="confirmSkip" :disabled="busy">Tambah</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Reset -->
    <div class="modal fade" id="resetModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title small fw-bold text-danger">Reset Antrian?</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body small">Semua data antrian akan direset ke A01. Tindakan ini tidak bisa dibatalkan.</div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-danger btn-sm" @click="confirmReset" :disabled="busy">Ya, Reset</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import {
  subscribeQueue, subscribeConnection,
  formatQueue, padNumber, LETTERS_MAP,
  nextQueue, previousQueue, setCustomQueue,
  addToSkipList, addToDelayedQueue,
  removeFromDelayedQueue, moveToMissed, removeFromMissed,
  resetQueue, writeAnalyticsEntry,
} from "@/services/antrian-service";

const { toast, error: showError } = useAlert();

const LETTER_NAMES = ["A", "B", "C", "D"];
const state = ref({ currentLetter: 0, currentNumber: 1, delayedQueue: [], skipList: [], missedQueue: [] });
const connected = ref(false);
const busy = ref(false);
const customLetter = ref(0);
const customNumber = ref(1);
const skipLetter = ref("A");
const skipNumber = ref(1);

const currentQueueStr = computed(() => formatQueue(state.value.currentLetter, state.value.currentNumber));
const letterLabel = computed(() => LETTERS_MAP[LETTER_NAMES[state.value.currentLetter]]);

let unsubQueue = null;
let unsubConn = null;

function modal(id) { return Modal.getOrCreateInstance(document.getElementById(id)); }

// ── Action handlers ────────────────────────────────────────────────────────
async function handleServed() {
  busy.value = true;
  try {
    const q = currentQueueStr.value;
    const newState = await nextQueue(state.value);
    state.value = newState;
    await writeAnalyticsEntry({ queueNumber: q, status: "served" });
  } catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function openDelay() { modal("delayModal").show(); }
async function confirmDelay() {
  busy.value = true;
  modal("delayModal").hide();
  try {
    const q = currentQueueStr.value;
    const s = await addToDelayedQueue(state.value, q);
    state.value = await nextQueue(s);
  } catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function openPrev() { modal("prevModal").show(); }
async function confirmPrev() {
  busy.value = true;
  modal("prevModal").hide();
  try { state.value = await previousQueue(state.value); }
  catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function openCustom() { modal("customModal").show(); }
async function confirmCustom() {
  busy.value = true;
  modal("customModal").hide();
  try { state.value = await setCustomQueue(state.value, customLetter.value, customNumber.value); }
  catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function openSkip() { modal("skipModal").show(); }
async function confirmSkip() {
  busy.value = true;
  modal("skipModal").hide();
  try {
    const qNum = skipLetter.value + padNumber(skipNumber.value);
    state.value = await addToSkipList(state.value, qNum);
    toast(`${qNum} ditambahkan ke skip list`);
  } catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function openReset() { modal("resetModal").show(); }
async function confirmReset() {
  busy.value = true;
  modal("resetModal").hide();
  try { await resetQueue(); toast("Antrian berhasil direset"); }
  catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

async function serveDelayed(q) {
  busy.value = true;
  try {
    state.value = await removeFromDelayedQueue(state.value, q);
    await writeAnalyticsEntry({ queueNumber: q, status: "delayed" });
    toast(`${q} sudah dilayani`);
  } catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

async function escalateToMissed(q) {
  busy.value = true;
  try { state.value = await moveToMissed(state.value, q); }
  catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

async function serveMissed(q) {
  busy.value = true;
  try {
    state.value = await removeFromMissed(state.value, q);
    await writeAnalyticsEntry({ queueNumber: q, status: "served" });
    toast(`${q} sudah dilayani`);
  } catch (e) { showError("Gagal", e.message); }
  finally { busy.value = false; }
}

function announceWait() { toast("Pengumuman 'Informasi Tunggu' telah dikirim ke display", "info"); }
function announceReminder() { toast("Pengumuman 'Pengingat Antrian' telah dikirim ke display", "info"); }

onMounted(() => {
  unsubQueue = subscribeQueue((s) => { state.value = s; });
  unsubConn = subscribeConnection((v) => { connected.value = v; });
});

onUnmounted(() => {
  unsubQueue?.();
  unsubConn?.();
});
</script>

