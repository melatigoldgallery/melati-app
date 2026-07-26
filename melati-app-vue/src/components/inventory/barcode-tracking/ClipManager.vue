<template>
  <div class="row g-4 clip-manager-panel">
    <!-- LEFT PANEL: CLIP LIST (MASTER) -->
    <div class="col-lg-5 col-md-12 text-start">
      <div class="card border-0 shadow-sm rounded-4 h-100 bg-white">
        <div class="card-header bg-white border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center">
          <div>
            <h5 class="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i class="bi bi-paperclip text-primary fs-4"></i>
              <span>Daftar Klip Perhiasan</span>
            </h5>
            <small class="text-muted">Kelola grup klip untuk mutasi massal</small>
          </div>
          <button 
            class="btn btn-success btn-sm rounded-pill px-3 py-2 fw-semibold shadow-sm hover-lift"
            @click="openCreateModal"
          >
            <i class="bi bi-plus-lg me-1"></i>
            Buat Klip
          </button>
        </div>

        <!-- Filter & Search Section -->
        <div class="p-3 bg-light-subtle border-bottom mx-3 mb-2 rounded-3">
          <div class="row g-2">
            <div class="col-12">
              <div class="input-group input-group-sm rounded-pill overflow-hidden border bg-white search-group">
                <span class="input-group-text bg-transparent border-0 text-muted ps-3 pe-1">
                  <i class="bi bi-search"></i>
                </span>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="form-control border-0 py-2" 
                  placeholder="Cari kode klip..." 
                />
                <button v-if="searchQuery" class="btn btn-link text-muted border-0 p-1 px-2.5" @click="searchQuery = ''">
                  <i class="bi bi-x fs-6"></i>
                </button>
              </div>
            </div>
            <div class="col-12">
              <!-- Scrollable filter buttons based on active categories prefix -->
              <div class="d-flex gap-1.5 overflow-auto pb-1 scrollable-pills">
                <!-- No Semua button, defaults to KA -->
                <button 
                  v-for="card in dynamicCards" 
                  :key="card.id"
                  class="btn btn-xs rounded-pill px-3 transition-all fw-semibold text-nowrap"
                  :class="activeCategoryFilter === card.id ? 'btn-success shadow-sm' : 'btn-outline-secondary'"
                  @click="activeCategoryFilter = card.id"
                  :title="card.label"
                >
                  {{ getPrefix(card.id) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Clip List -->
        <div class="card-body p-0 custom-scrollbar clip-list-container" style="max-height: 520px; overflow-y: auto;">
          <div v-if="loadingClips" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted small fw-semibold">Memuat daftar klip...</p>
          </div>
          <div v-else-if="filteredClips.length === 0" class="text-center py-5 px-3">
            <div class="empty-icon bg-light-primary text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
              <i class="bi bi-inbox fs-4"></i>
            </div>
            <h6 class="fw-bold text-dark mb-1">Belum Ada Klip</h6>
            <p class="text-muted small mb-0">Klik tombol <strong>Buat Klip</strong> untuk membuat klip perhiasan baru.</p>
          </div>
          <div class="list-group list-group-flush" v-else>
            <button 
              v-for="clip in filteredClips" 
              :key="clip.id"
              class="list-group-item list-group-item-action py-3 px-4 d-flex justify-content-between align-items-center border-light transition-all list-item-custom"
              :class="{ 'active bg-light-primary text-dark border-start border-4 border-primary': selectedClip && selectedClip.id === clip.id }"
              @click="selectClip(clip)"
            >
              <div class="min-w-0 text-start">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge bg-secondary text-white fw-bold monospace fs-8">{{ clip.type }}</span>
                  <span class="fw-bold text-dark monospace text-truncate" style="font-size: 0.95rem;">{{ clip.code }}</span>
                </div>
                <small class="text-muted d-block" style="font-size: 0.72rem;">
                  <i class="bi bi-calendar-event me-1"></i>
                  {{ formatTime(clip.createdAt) }}
                </small>
              </div>
              <div class="d-flex align-items-center gap-2 flex-shrink-0">
                <span class="badge rounded-pill bg-secondary px-2.5 py-1 text-white fw-bold fs-7 shadow-sm">
                  {{ clip.barcodes?.length || 0 }} Barcode
                </span>
                <i class="bi bi-chevron-right text-muted opacity-50"></i>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL: CLIP DETAILS & ACTION (DETAIL) -->
    <div class="col-lg-7 col-md-12 text-start">
      <div v-if="!selectedClip" class="card border-0 shadow-sm rounded-4 h-100 bg-white d-flex align-items-center justify-content-center text-center p-5 min-h-350">
        <div class="p-4 bg-light rounded-circle shadow-sm mb-3">
          <i class="bi bi-paperclip fs-1 text-primary opacity-75"></i>
        </div>
        <h5 class="fw-bold text-dark mb-1">Pilih Klip Perhiasan</h5>
        <p class="text-muted small mx-auto mb-0" style="max-width: 320px;">
          Pilih salah satu klip perhiasan di sebelah kiri untuk mengelola daftar barcode dan melakukan pemindahan data.
        </p>
      </div>

      <div v-else class="card border-0 shadow-sm rounded-4 h-100 bg-white d-flex flex-column justify-content-between">
        <!-- Detail Header -->
        <div class="card-header bg-white border-0 pt-4 pb-2 px-4 border-bottom border-light">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1.5 flex-wrap">
                <span class="badge bg-secondary text-white fw-bold monospace">{{ selectedClip.type }}</span>
                <h4 class="fw-extrabold text-dark mb-0 monospace">{{ selectedClip.code }}</h4>
              </div>
              <p class="mb-0 text-muted small">
                Dibuat pada: <strong class="text-dark">{{ formatTime(selectedClip.createdAt) }}</strong>
              </p>
            </div>
            <div class="d-flex gap-2">
              <button 
                class="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 transition-all"
                @click="renameSelectedClip"
                :disabled="saving"
              >
                <i class="bi bi-pencil"></i>
                <span>Ganti Nama</span>
              </button>
              <button 
                class="btn btn-outline-danger btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 transition-all"
                @click="deleteSelectedClip"
                :disabled="saving"
              >
                <i class="bi bi-trash"></i>
                <span>Hapus Klip</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card-body p-4 custom-scrollbar" style="max-height: 480px; overflow-y: auto;">
          <!-- STAGE 1: ADD BARCODES MASS-WISE (TEXTAREA) -->
          <div class="card border border-light shadow-xs rounded-3 mb-4 bg-light-subtle">
            <div class="card-header bg-white border-0 pt-3 pb-1">
              <h6 class="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i class="bi bi-plus-circle-fill text-success"></i>
                <span>Input Barcode</span>
              </h6>
              <small class="text-muted">Masukkan barcode sekaligus (copy-paste / scan beruntun)</small>
            </div>
            <div class="card-body pt-1 pb-3">
              <div class="mb-3">
                <textarea 
                  v-model="barcodeTextInput" 
                  class="form-control border-2 rounded-3 monospace p-3" 
                  rows="3"
                  placeholder="Paste list barcode di sini (pisahkan dengan spasi, enter, koma atau titik koma)..."
                  :disabled="saving"
                ></textarea>
                <div class="d-flex justify-content-between align-items-center mt-1">
                  <div class="form-text text-muted small mb-0">
                    Setiap barcode yang ditambahkan akan otomatis masuk ke kategori <strong>"Belum Posting"</strong> di sistem.
                  </div>
                  <span v-if="barcodeInputCount > 0" class="badge bg-primary rounded-pill px-3 py-1.5 shadow-sm">
                    <i class="bi bi-qr-code me-1"></i>
                    {{ barcodeInputCount }} Barcode
                  </span>
                </div>
                <!-- Form Petugas (Staff) Input Barcode -->
                <div class="row g-3 align-items-end mt-0 pt-2 border-light-subtle">
                  <div class="col-md-3 text-start">
                    <label class="form-label small fw-bold text-secondary mb-1">Petugas (Staff) <span class="text-danger">*</span></label>
                    <select v-model="inputPetugasName" class="form-select form-select-sm border-2 rounded-4 custom-select" required :disabled="saving">
                      <option value="">-- Pilih Staff --</option>
                      <option v-for="staff in staffOptions" :key="`clip-input-staff-${staff}`" :value="staff">
                        {{ staff }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-9 d-flex justify-content-start">
                    <button 
                      class="btn btn-success btn-sm rounded-pill px-4 py-2 text-white fw-bold d-flex align-items-center gap-2 shadow-sm"
                      @click="addBarcodesToClip"
                      :disabled="saving || !barcodeTextInput.trim()"
                    >
                      <span v-if="saving" class="spinner-border spinner-border-sm" role="status"></span>
                      <i v-else class="bi bi-clipboard-plus"></i>
                      <span>Tambahkan Barcode</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STAGE 2: BARCODES LIST TABLE WITH SYSTEM STATUS -->
          <div class="barcode-list-section">
            <div class="d-flex justify-content-between align-items-center mb-2.5">
              <h6 class="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <i class="bi bi-list-task text-primary"></i>
                <span>Daftar Barcode di Klip ({{ selectedClip.barcodes?.length || 0 }})</span>
              </h6>
              <div v-if="selectedClip.barcodes?.length > 0" class="d-flex gap-2">
                <button 
                  class="btn btn-xs btn-outline-primary rounded-pill px-2.5" style="font-size: 13px;"
                  @click="copyBarcodes"
                  :disabled="saving"
                >
                  <i class="bi bi-clipboard me-1"></i>
                  Salin Barcode
                </button>
                <button 
                  class="btn btn-xs btn-outline-danger rounded-pill px-2.5" style="font-size: 13px;"
                  @click="clearAllBarcodes"
                  :disabled="saving"
                >
                  Hapus Semua
                </button>
              </div>
            </div>

            <div v-if="!selectedClip.barcodes || selectedClip.barcodes.length === 0" class="text-center py-4 border border-dashed rounded-3 bg-white mb-2">
              <p class="text-muted small mb-0">Belum ada barcode di dalam klip ini. Silakan masukkan di area teks di atas.</p>
            </div>
            
            <div v-else class="table-responsive border border-light rounded-3 bg-white custom-scrollbar mb-2" style="max-height: 250px; overflow-y: auto;">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3 text-secondary small py-2.5" style="width: 50px;">No</th>
                    <th class="text-secondary small py-2.5">Barcode</th>
                    <th class="text-secondary small py-2.5">Status Sistem (Lokasi)</th>
                    <th class="text-end pe-3 text-secondary small py-2.5" style="width: 100px;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(bc, index) in selectedClip.barcodes" :key="bc" class="barcode-item-row">
                    <td class="ps-3 text-muted small">{{ index + 1 }}</td>
                    <td>
                      <span class="monospace fw-bold text-dark fs-7 bg-light px-2.5 py-1 rounded border">{{ bc }}</span>
                    </td>
                    <td>
                      <div v-if="checkingStatus" class="spinner-border spinner-border-sm text-secondary opacity-70" role="status"></div>
                      <span v-else :class="['badge rounded-pill fw-bold border px-2.5 py-1', getStatusBadgeClass(bc)]">
                        {{ getStatusText(bc) }}
                      </span>
                    </td>
                    <td class="text-end pe-3">
                      <div class="d-flex gap-1 justify-content-end">
                        <button 
                          class="btn btn-link btn-xs text-danger border-0 p-1 rounded-circle"
                          @click="deleteSingleBarcodeFromClip(bc)"
                          title="Hapus"
                          :disabled="saving"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- STAGE 3: ACTION DRAWER (MUTATE CLIP DATA) -->
        <div class="card-footer bg-light-subtle border-0 p-4 border-top border-light">
          <div class="d-flex align-items-center mb-3">
            <i class="bi bi-arrow-left-right text-success fs-5 me-2"></i>
            <h6 class="fw-bold text-dark mb-0">Pindahkan Data Klip (Belum ➡️ Sudah Posting)</h6>
          </div>
          <form @submit.prevent="executeMoveData">
            <div class="row g-3 align-items-end">
              <div class="col-md-3 text-start">
                <label class="form-label small fw-bold text-secondary mb-1">Petugas (Staff) <span class="text-danger">*</span></label>
                <select v-model="petugasName" class="form-select form-select-sm border-2 rounded-4 custom-select" required :disabled="saving">
                  <option value="">-- Pilih Staff --</option>
                  <option v-for="staff in staffOptions" :key="`clip-staff-${staff}`" :value="staff">
                    {{ staff }}
                  </option>
                </select>
              </div>
              <div class="col-md-3 text-start">
                <label class="form-label small fw-bold text-secondary mb-1">Keterangan</label>
                <input 
                  v-model="notesInput" 
                  type="text" 
                  class="form-control form-control-sm border-2 rounded-4" 
                  placeholder="Catatan tambahan..." 
                  :disabled="saving"
                />
              </div>
              <div class="col-md-3">
                <button 
                  type="submit"
                  class="btn btn-primary btn-sm rounded-4 px-3 fw-bold d-flex align-items-center gap-2 shadow w-100 justify-content-center"
                  :disabled="saving || !selectedClip.barcodes || selectedClip.barcodes.length === 0"
                  style="height: 34px;"
                >
                  <span v-if="saving" class="spinner-border spinner-border-sm" role="status"></span>
                  <i v-else class="bi bi-cloud-arrow-up-fill"></i>
                  <span>Pindahkan Data</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- CREATE CLIP MODAL -->
    <div class="modal fade" id="createClipModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header py-3 bg-success text-white border-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-paperclip me-1.5"></i>
              Buat Klip Baru
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" :disabled="creatingClip"></button>
          </div>
          <form @submit.prevent="submitCreateClip">
            <div class="modal-body p-4 text-start">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Kategori Utama</label>
                <select v-model="newClipCategory" class="form-select form-select-sm border-2 rounded-2" required :disabled="creatingClip">
                  <option value="">-- Pilih Kategori --</option>
                  <option v-for="card in dynamicCards" :key="`new-clip-cat-${card.id}`" :value="card.id">
                    {{ card.label }} ({{ getPrefix(card.id) }})
                  </option>
                </select>
              </div>
              <!-- Dynamic sub-type selection dropdown (color or jewelry type) -->
              <div class="mb-3" v-if="newClipCategory && newClipCategoryDetailOptions.length > 0">
                <label class="form-label small fw-bold text-secondary">
                  {{ newClipCategoryDetailMode === 'hala' ? 'Jenis Perhiasan' : 'Klasifikasi Warna' }}
                </label>
                <select v-model="newClipSubType" class="form-select form-select-sm border-2 rounded-2" required :disabled="creatingClip">
                  <option value="" disabled>
                    {{ newClipCategoryDetailMode === 'hala' ? '-- Pilih Jenis --' : '-- Pilih Warna --' }}
                  </option>
                  <option v-for="opt in newClipCategoryDetailOptions" :key="`new-clip-sub-${opt}`" :value="opt">
                    {{ getNewClipDetailLabel(opt) }}
                  </option>
                </select>
              </div>

              <div class="mb-3" v-if="newClipCategory">
                <label class="form-label small fw-bold text-secondary">Suffix Kode Klip</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-light text-dark fw-bold monospace border-2 border-end-0 rounded-start-2">
                    {{ newClipPrefix }}-
                  </span>
                  <input 
                    v-model="newClipSuffix" 
                    type="text" 
                    class="form-control form-control-sm border-2 rounded-end-2 monospace" 
                    placeholder="Contoh: 01 25/6" 
                    required 
                    :disabled="creatingClip"
                  />
                </div>
              </div>
              <!-- Code Preview -->
              <div v-if="newClipCategory && newClipSuffix" class="alert alert-info py-2 px-3 small border-0 rounded-2 monospace mb-0">
                <div class="small text-muted">Pratinjau Kode:</div>
                <strong class="text-primary">{{ newClipPrefix }}-{{ newClipSuffix }}</strong>
              </div>
            </div>
            <div class="modal-footer py-2.5 border-0 bg-light-subtle">
              <button type="button" class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" :disabled="creatingClip">
                Batal
              </button>
              <button class="btn btn-primary btn-sm rounded-pill px-4" :disabled="creatingClip || !newClipCategory || !newClipSuffix">
                <span v-if="creatingClip" class="spinner-border spinner-border-sm me-1" role="status"></span>
                <span>Buat</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

import {
  subscribeClips,
  createClip,
  updateClip,
  deleteClip,
  getCategoryPrefix,
} from "@/services/clip-service";

import {
  parseBarcodes,
  executeBarcodeMutation,
  submitBarcodeMoveRequest,
  checkBarcodesStatus,
  parseBarcodeDetails,
  deleteSingleBarcode,
} from "@/services/barcode-service";

import {
  getDynamicColorTypes,
  getDynamicHalaTypes,
} from "@/services/inventory-service";

const props = defineProps({
  staffOptions: { type: Array, required: true },
  cards: { type: Array, required: true }, // nonComputerCards from parent
  tableRows: { type: Array, required: true },
  colorTypes: { type: Array, default: () => [] },
  colorLabels: { type: Object, default: () => ({}) },
  halaTypes: { type: Array, default: () => [] },
  halaLabels: { type: Object, default: () => ({}) },
});

const auth = useAuthStore();
const { toast, error: showError, confirm } = useAlert();

// State
const clips = ref([]);
const loadingClips = ref(false);
const saving = ref(false);
const selectedClip = ref(null);
const searchQuery = ref("");
const activeCategoryFilter = ref("");

// Barcode input and statuses
const barcodeTextInput = ref("");
const barcodeInputCount = computed(() => {
  return parseBarcodes(barcodeTextInput.value).length;
});
const checkingStatus = ref(false);
const barcodeStatuses = ref({}); // barcode -> { exists, location, category, detailType }
const inputDetailType = ref("");

// Mutation Action Form
const petugasName = ref("");
const inputPetugasName = ref("");
const notesInput = ref("");
const autoDeleteClip = ref(true);

// Create Clip Dialog State
let createModal = null;
const creatingClip = ref(false);
const newClipCategory = ref("");
const newClipSuffix = ref("");
const newClipSubType = ref("");

// Computed helpers for dynamic details
const selectedClipDetailMode = computed(() => {
  if (!selectedClip.value) return "default";
  const cat = selectedClip.value.category;
  const card = props.cards.find(c => c.id === cat);
  return card?.detailMode || "default";
});

const selectedClipDetailOptions = computed(() => {
  const mode = selectedClipDetailMode.value;
  if (mode === "color") return props.colorTypes || [];
  if (mode === "hala") return props.halaTypes || [];
  return [];
});

const newClipCategoryDetailMode = computed(() => {
  if (!newClipCategory.value) return "default";
  const card = props.cards.find(c => c.id === newClipCategory.value);
  return card?.detailMode || "default";
});

const newClipCategoryDetailOptions = computed(() => {
  const mode = newClipCategoryDetailMode.value;
  if (mode === "color") return props.colorTypes || [];
  if (mode === "hala") return props.halaTypes || [];
  return [];
});

const newClipPrefix = computed(() => {
  if (!newClipCategory.value) return "";
  const catPrefix = getPrefix(newClipCategory.value);
  if (newClipSubType.value) return `${catPrefix}-${newClipSubType.value}`;
  return catPrefix;
});

function getDetailLabel(opt) {
  const mode = selectedClipDetailMode.value;
  if (mode === "color") return props.colorLabels[opt] || opt;
  if (mode === "hala") return props.halaLabels[opt] || opt;
  return opt;
}

function getNewClipDetailLabel(opt) {
  const mode = newClipCategoryDetailMode.value;
  if (mode === "color") return props.colorLabels[opt] || opt;
  if (mode === "hala") return props.halaLabels[opt] || opt;
  return opt;
}

// Listeners
let unsubClips = null;

// Dynamic categories based on physical cards configured in parent
const dynamicCards = computed(() => {
  return props.cards || [];
});

// Watch dynamicCards to set initial activeCategoryFilter to first card ID
watch(dynamicCards, (newVal) => {
  if (newVal && newVal.length > 0 && !activeCategoryFilter.value) {
    activeCategoryFilter.value = newVal[0].id;
  }
}, { immediate: true });

const belumPostingKey = computed(() => {
  if (!props.tableRows) return "posting";
  let row = props.tableRows.find(r => r.key === "belum-posting" || r.key === "belum_posting");
  if (row) return row.key;
  row = props.tableRows.find(r => r.label && r.label.toLowerCase().includes("belum posting"));
  if (row) return row.key;
  return "posting";
});

const sudahPostingKey = computed(() => {
  if (!props.tableRows) return "admin";
  let row = props.tableRows.find(r => r.key === "sudah-posting" || r.key === "sudah_posting");
  if (row) return row.key;
  row = props.tableRows.find(r => r.label && r.label.toLowerCase().includes("sudah posting"));
  if (row) return row.key;
  return "admin";
});

const filteredClips = computed(() => {
  let list = clips.value;
  
  if (activeCategoryFilter.value) {
    list = list.filter(c => {
      if (c.category) return c.category === activeCategoryFilter.value;
      const card = props.cards.find(card => card.id === activeCategoryFilter.value);
      if (!card) return false;
      return c.type === getPrefix(card.id);
    });
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(c => (c.code || "").toLowerCase().includes(q));
  }
  
  return list;
});

let lastClipId = null;
// Watcher to load default note when selected clip changes
watch(selectedClip, (newClip) => {
  barcodeStatuses.value = {}; // Clear status cache to force fresh verification!
  if (newClip) {
    notesInput.value = `Pindah data klip ${newClip.code}`;
    // Verify barcode statuses
    triggerBarcodeVerification(newClip.barcodes || []);
    
    // Only reset/update inputDetailType if a different clip is selected
    if (newClip.id !== lastClipId) {
      lastClipId = newClip.id;
      const options = selectedClipDetailOptions.value;
      if (newClip.subType && options.includes(newClip.subType)) {
        inputDetailType.value = newClip.subType;
      } else if (newClip.type && options.includes(newClip.type)) {
        inputDetailType.value = newClip.type;
      } else {
        inputDetailType.value = "";
      }
    }
  } else {
    lastClipId = null;
    notesInput.value = "";
    inputDetailType.value = "";
  }
});

// Watch for barcodes list updates in the selected clip to refresh status
watch(() => selectedClip.value?.barcodes, (newBarcodes) => {
  if (newBarcodes) {
    triggerBarcodeVerification(newBarcodes);
  }
}, { deep: true });

// Watch for manual barcode input to count and detect duplicates
let checkDuplicateTimeout = null;
watch(barcodeTextInput, (newVal) => {
  if (checkDuplicateTimeout) clearTimeout(checkDuplicateTimeout);
  const parsed = parseBarcodes(newVal);
  if (parsed.length === 0) return;

  checkDuplicateTimeout = setTimeout(() => {
    const seen = new Set();
    const duplicates = [];
    parsed.forEach((bc) => {
      if (seen.has(bc)) {
        duplicates.push(bc);
      } else {
        seen.add(bc);
      }
    });

    if (duplicates.length > 0) {
      toast(`Barcode ${duplicates[0]} sudah discan!`, "warning");
      const uniqueParsed = [...seen];
      barcodeTextInput.value = uniqueParsed.join("\n") + "\n";
    }
  }, 600);
});

// dynamic prefixes helper
function getPrefix(cardId) {
  return getCategoryPrefix(cardId);
}

function selectClip(clip) {
  selectedClip.value = clip;
}

// Subscribe to clips under this floor
function setupClipsListener() {
  if (unsubClips) unsubClips();
  loadingClips.value = true;
  
  unsubClips = subscribeClips(
    auth.activeFloor,
    (incoming) => {
      clips.value = incoming;
      loadingClips.value = false;
      
      // If we had a selected clip, update it with fresh data
      if (selectedClip.value) {
        const fresh = incoming.find(c => c.id === selectedClip.value.id);
        selectedClip.value = fresh || null;
      }
    },
    (err) => {
      loadingClips.value = false;
      showError("Gagal berlangganan data klip", err.message);
    }
  );
}

// Verification of barcode status in background
let verifyTimeout = null;
function triggerBarcodeVerification(barcodesArray) {
  if (verifyTimeout) clearTimeout(verifyTimeout);
  if (!barcodesArray || barcodesArray.length === 0) {
    barcodeStatuses.value = {};
    return;
  }
  
  verifyTimeout = setTimeout(async () => {
    checkingStatus.value = true;
    const currentClipId = selectedClip.value?.id;
    try {
      const statuses = { ...barcodeStatuses.value };
      const missingStatusList = barcodesArray.filter(bc => !statuses[bc]);
      
      if (missingStatusList.length > 0) {
        // Chunk verification list (Cloud Function payload size limits)
        const chunkSize = 200;
        for (let i = 0; i < missingStatusList.length; i += chunkSize) {
          const chunk = missingStatusList.slice(i, i + chunkSize);
          try {
            const res = await checkBarcodesStatus(chunk, auth.activeFloor);
            if (res && Array.isArray(res.results)) {
              res.results.forEach((item) => {
                statuses[item.barcode] = {
                  exists: item.exists,
                  location: item.location || (item.exists ? "Ada" : "Belum Terdaftar"),
                  category: item.category || "",
                  detailType: item.detailType || "",
                };
              });
            }
          } catch (cfErr) {
            console.warn("checkBarcodesStatus Cloud Function failed, falling back to direct Firestore reads:", cfErr);
            // Fallback direct read
            for (const bc of chunk) {
              const docRef = doc(db, "floors", auth.activeFloor, "barcodes", bc);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const data = snap.data();
                statuses[bc] = {
                  exists: true,
                  location: data.location || "Ada",
                  category: data.category || "",
                  detailType: data.detailType || "",
                };
              } else {
                statuses[bc] = {
                  exists: false,
                  location: "Belum Terdaftar",
                  category: "",
                  detailType: "",
                };
              }
            }
          }
        }
        barcodeStatuses.value = statuses;
      }

      // Auto cleanup: if a barcode exists in the database but its location is not 'belum-posting',
      // remove it from the clip document.
      const movedBarcodes = barcodesArray.filter(bc => {
        const status = statuses[bc];
        return status && status.exists && status.location !== belumPostingKey.value;
      });

      if (movedBarcodes.length > 0 && selectedClip.value && selectedClip.value.id === currentClipId) {
        const cleanList = barcodesArray.filter(bc => !movedBarcodes.includes(bc));
        await updateClip(auth.activeFloor, currentClipId, { barcodes: cleanList });
        toast(`${movedBarcodes.length} barcode otomatis dihapus dari klip karena sudah berada di lokasi lain.`, "warning");
      }
    } catch (e) {
      console.error("Barcode verification error:", e);
    } finally {
      if (selectedClip.value && selectedClip.value.id === currentClipId) {
        checkingStatus.value = false;
      }
    }
  }, 300);
}

// Location label translation helper
const locationLabelMap = computed(() => {
  const map = {
    posting: "Belum Posting",
    admin: "Sudah Posting",
    brankas: "Stok Brankas",
    "barang-display": "Display",
    laku: "Terjual",
    mutasi: "Mutasi",
  };
  if (props.tableRows) {
    props.tableRows.forEach((r) => {
      if (r.key === "admin") {
        map[r.key] = "Sudah Posting";
      } else if (r.key === "posting") {
        map[r.key] = "Belum Posting";
      } else {
        map[r.key] = r.label;
      }
    });
  }
  return map;
});

function getStatusText(barcode) {
  const status = barcodeStatuses.value[barcode];
  if (!status) return "Memeriksa...";
  if (!status.exists) return "Belum Terdaftar";
  return locationLabelMap.value[status.location] || status.location;
}

function getStatusBadgeClass(barcode) {
  const status = barcodeStatuses.value[barcode];
  if (!status) return "bg-light text-dark border-light-subtle";
  if (!status.exists) return "bg-danger-subtle text-danger border-danger-subtle";
  if (status.location === belumPostingKey.value) return "bg-success-subtle text-success border-success-subtle";
  if (status.location === sudahPostingKey.value) return "bg-info-subtle text-info border-info-subtle";
  return "bg-warning-subtle text-warning border-warning-subtle";
}

// Add multiple barcodes to selected clip
async function addBarcodesToClip() {
  if (!selectedClip.value) return;
  const parsed = parseBarcodes(barcodeTextInput.value);
  if (parsed.length === 0) return toast("Tidak ada barcode valid", "warning");

  if (!inputPetugasName.value) {
    return toast("Silakan pilih petugas terlebih dahulu", "warning");
  }

  saving.value = true;
  try {
    const currentList = selectedClip.value.barcodes || [];
    const addedList = parsed.filter(bc => !currentList.includes(bc));
    
    if (addedList.length === 0) {
      toast("Barcode sudah ada di dalam klip", "warning");
      barcodeTextInput.value = "";
      saving.value = false;
      return;
    }

    const nextList = [...currentList, ...addedList];

    // Automatically register added barcodes to "Belum Posting" first
    const category = selectedClip.value.category || "KALUNG"; // Fallback to KALUNG for legacy docs
    
    // Check barcode status to filter out those already in the target location
    let barcodesToRegister = [...addedList];
    try {
      const statusRes = await checkBarcodesStatus(addedList, auth.activeFloor);
      if (statusRes && Array.isArray(statusRes.results)) {
        barcodesToRegister = statusRes.results
          .filter(item => !item.exists || item.location !== belumPostingKey.value)
          .map(item => item.barcode);
      }
    } catch (err) {
      console.warn("Gagal mengecek status barcode, memproses semua secara default:", err);
    }

    if (barcodesToRegister.length > 0) {
      if (inputDetailType.value) {
        // If a specific type is selected, use it for all barcodes in this addition
        await executeBarcodeMutation({
          barcodes: barcodesToRegister,
          origin: "",
          destination: belumPostingKey.value,
          pemindah: inputPetugasName.value,
          notes: `Registrasi Klip: ${selectedClip.value.code}`,
          floorId: auth.activeFloor,
          defaultDetailType: inputDetailType.value,
          category: category,
          allowCategoryOverride: true,
        });
      } else {
        // Deteksi Otomatis: Group barcodes by their fallback detail type
        const groups = {};
        for (const bc of barcodesToRegister) {
          const type = getFallbackDetailType(category, bc);
          if (!groups[type]) groups[type] = [];
          groups[type].push(bc);
        }
        
        for (const [type, list] of Object.entries(groups)) {
          await executeBarcodeMutation({
            barcodes: list,
            origin: "",
            destination: belumPostingKey.value,
            pemindah: inputPetugasName.value,
            notes: `Registrasi Klip: ${selectedClip.value.code}`,
            floorId: auth.activeFloor,
            defaultDetailType: type,
            category: category,
            allowCategoryOverride: true,
          });
        }
      }
    }

    // Save clip document with updated list
    await updateClip(auth.activeFloor, selectedClip.value.id, { barcodes: nextList });
    toast(`Berhasil menambahkan ${addedList.length} barcode ke klip.`);
    barcodeTextInput.value = "";

    // Trigger state reload in parent stock page to sync aggregates
    triggerParentReload();
    inputPetugasName.value = "";
  } catch (e) {
    showError("Gagal menambahkan barcode ke klip", e.message);
  } finally {
    saving.value = false;
  }
}

// Helper to determine detail mode / fallback type for typed cards
function getFallbackDetailType(mainCat, code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const matchedCard = props.cards.find(c => c.id === mainCat);
  const detailMode = matchedCard?.detailMode || "default";

  if (detailMode === "color") {
    const types = props.colorTypes || [];
    for (const key of types) {
      if (cleanCode.includes(key)) return key;
    }
    return types[2] || "PUTIH";
  }

  if (detailMode === "hala") {
    const types = props.halaTypes || [];
    for (const key of types) {
      const parts = [`-${key}-`, key];
      if (parts.some(p => cleanCode.includes(p))) return key;
    }
    return types[0] || "KA";
  }

  return "";
}



// Delete single barcode from clip list and database
async function deleteSingleBarcodeFromClip(barcode) {
  if (!selectedClip.value) return;

  const result = await confirm({
    title: "Hapus Barcode?",
    text: `Hapus barcode ${barcode} dari klip ini DAN hapus data fisiknya dari database? (Stok di sistem akan berkurang).`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  saving.value = true;
  try {
    // 1. Delete from database first via Cloud Function
    await deleteSingleBarcode({ barcodeId: barcode, floorId: auth.activeFloor });
    
    // 2. Remove from clip local list and update
    const nextList = (selectedClip.value.barcodes || []).filter(b => b !== barcode);
    await updateClip(auth.activeFloor, selectedClip.value.id, { barcodes: nextList });
    
    toast("Barcode berhasil dihapus dari klip dan database.");
    
    // Trigger stock reload to update summary and rincian barcode
    triggerParentReload();
  } catch (e) {
    showError("Gagal menghapus barcode", e.message);
  } finally {
    saving.value = false;
  }
}

// Clear all barcodes in clip and database
async function clearAllBarcodes() {
  if (!selectedClip.value) return;
  const barcodesList = selectedClip.value.barcodes || [];
  if (barcodesList.length === 0) return;

  const result = await confirm({
    title: "Kosongkan Klip & Hapus Database?",
    text: `Hapus semua (${barcodesList.length}) barcode dari klip ini DAN hapus data fisiknya dari database? (Stok di sistem akan berkurang).`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Kosongkan",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  saving.value = true;
  try {
    // Delete all barcodes in parallel via Cloud Function
    await Promise.all(barcodesList.map(bc => 
      deleteSingleBarcode({ barcodeId: bc, floorId: auth.activeFloor })
    ));

    await updateClip(auth.activeFloor, selectedClip.value.id, { barcodes: [] });
    toast("Klip dikosongkan dan semua barcode berhasil dihapus dari database.");
    
    // Trigger stock reload to update summary and rincian barcode
    triggerParentReload();
  } catch (e) {
    showError("Gagal mengosongkan klip", e.message);
  } finally {
    saving.value = false;
  }
}

// Copy all barcodes in clip to clipboard
async function copyBarcodes() {
  if (!selectedClip.value || !selectedClip.value.barcodes || selectedClip.value.barcodes.length === 0) {
    return toast("Daftar barcode kosong", "warning");
  }
  
  const barcodesText = selectedClip.value.barcodes.join("\n");
  try {
    await navigator.clipboard.writeText(barcodesText);
    toast("Berhasil menyalin barcode ke clipboard.");
  } catch (err) {
    console.error("Gagal menyalin barcode: ", err);
    showError("Gagal menyalin barcode ke clipboard.");
  }
}

// Trigger parent page data reload to update stock aggregate tables
function triggerParentReload() {
  window.dispatchEvent(new CustomEvent("melati-stock-reload"));
}

// Action: Move barcodes in clip from Belum Posting (posting) -> Sudah Posting (admin)
async function executeMoveData() {
  if (!selectedClip.value) return;
  if (!selectedClip.value.barcodes || selectedClip.value.barcodes.length === 0) {
    return toast("Daftar barcode kosong", "warning");
  }
  if (!petugasName.value) {
    return toast("Silakan pilih petugas terlebih dahulu", "warning");
  }

  const listCount = selectedClip.value.barcodes.length;
  const confirmResult = await confirm({
    title: "Pindahkan Data Klip?",
    text: `Pindahkan ${listCount} barang di klip ini secara otomatis dari "Belum Posting" ke "Sudah Posting"?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Pindahkan",
    cancelButtonText: "Batal",
  });

  if (!confirmResult.isConfirmed) return;

  saving.value = true;
  try {
    const category = selectedClip.value.category || "KALUNG";
    const userRole = auth.userRole?.toLowerCase();
    const isSupervisor = ["supervisor", "admin", "input"].includes(userRole);
    // Hardcode ENABLE_MUTATION_QUEUE logic (default false)
    const shouldProcessDirectly = isSupervisor || true;

    // Real-time verification of barcodes' statuses to filter out moved ones
    const barcodesToCheck = selectedClip.value.barcodes || [];
    const res = await checkBarcodesStatus(barcodesToCheck, auth.activeFloor);
    const statuses = {};
    if (res && Array.isArray(res.results)) {
      res.results.forEach((item) => {
        statuses[item.barcode] = {
          exists: item.exists,
          location: item.location || (item.exists ? "Ada" : "Belum Terdaftar"),
        };
      });
    }

    const barcodesToMutate = [];
    const barcodesToRemove = [];

    barcodesToCheck.forEach((bc) => {
      const status = statuses[bc];
      if (status && status.exists) {
        if (status.location === belumPostingKey.value) {
          barcodesToMutate.push(bc);
        } else {
          barcodesToRemove.push(bc);
        }
      } else {
        barcodesToMutate.push(bc); // Keep if not found/registered to handle naturally in mutation
      }
    });

    if (barcodesToRemove.length > 0) {
      const cleanList = barcodesToCheck.filter(bc => !barcodesToRemove.includes(bc));
      await updateClip(auth.activeFloor, selectedClip.value.id, { barcodes: cleanList });
      toast(`${barcodesToRemove.length} barcode otomatis dihapus dari klip karena sudah berada di lokasi lain.`, "warning");
      
      if (barcodesToMutate.length === 0) {
        saving.value = false;
        return;
      }
    }

    // Chunking logic (max 200 barcodes per transaction)
    const chunks = [];
    const chunkSize = 200;
    for (let i = 0; i < barcodesToMutate.length; i += chunkSize) {
      chunks.push(barcodesToMutate.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      if (shouldProcessDirectly) {
        await executeBarcodeMutation({
          barcodes: chunks[i],
          origin: belumPostingKey.value, // From Belum Posting
          destination: sudahPostingKey.value, // To Already Posted / Admin
          pemindah: petugasName.value,
          notes: notesInput.value?.trim() || `Mutasi klip ${selectedClip.value.code}`,
          floorId: auth.activeFloor,
          category: category,
          allowCategoryOverride: true,
        });
      } else {
        // Fallback move request queue
        await submitBarcodeMoveRequest({
          barcodes: chunks[i],
          origin: belumPostingKey.value,
          destination: sudahPostingKey.value,
          pemindah: petugasName.value,
          notes: notesInput.value?.trim() || `Request klip ${selectedClip.value.code}`,
          floorId: auth.activeFloor,
          category: category,
          allowCategoryOverride: true,
        });
      }
    }

    toast(`Data klip ${selectedClip.value.code} berhasil dipindahkan.`);

    // Auto delete or clear clip code document
    if (autoDeleteClip.value) {
      const deletedCode = selectedClip.value.code;
      await deleteClip(auth.activeFloor, selectedClip.value.id);
      selectedClip.value = null;
      toast(`Klip ${deletedCode} dihapus.`);
    } else {
      await updateClip(auth.activeFloor, selectedClip.value.id, { barcodes: [] });
      toast("Daftar barcode dalam klip berhasil dibersihkan.");
    }

    // Trigger parent stock sync
    triggerParentReload();
    petugasName.value = "";
  } catch (e) {
    showError("Gagal memindahkan data klip", e.message);
  } finally {
    saving.value = false;
  }
}

// Rename selected clip code
async function renameSelectedClip() {
  if (!selectedClip.value) return;

  const { value: newCode } = await Swal.fire({
    title: "Ganti Nama Klip",
    input: "text",
    inputValue: selectedClip.value.code,
    inputPlaceholder: "Masukkan kode klip baru...",
    showCancelButton: true,
    confirmButtonText: "Simpan",
    cancelButtonText: "Batal",
    inputValidator: (value) => {
      if (!value || !value.trim()) return "Nama klip tidak boleh kosong!";
      // Basic prefix check
      const currentPrefix = selectedClip.value.type;
      const cleanVal = value.trim().toUpperCase();
      if (!cleanVal.startsWith(currentPrefix)) {
        return `Kode klip harus berawalan dengan prefix "${currentPrefix}"!`;
      }
    }
  });

  if (!newCode) return;

  const cleanNewCode = newCode.trim().toUpperCase();
  if (cleanNewCode === selectedClip.value.code) return;

  saving.value = true;
  try {
    await updateClip(auth.activeFloor, selectedClip.value.id, { code: cleanNewCode });
    toast("Kode klip berhasil diubah.");
  } catch (e) {
    showError("Gagal mengubah nama klip", e.message);
  } finally {
    saving.value = false;
  }
}

// Delete entire selected clip code
async function deleteSelectedClip() {
  if (!selectedClip.value) return;

  const result = await confirm({
    title: "Hapus Klip?",
    text: `Apakah Anda yakin ingin menghapus klip ${selectedClip.value.code}? Aksi ini hanya menghapus klip, barang fisik di database tidak akan terpengaruh.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  saving.value = true;
  try {
    const deletedCode = selectedClip.value.code;
    await deleteClip(auth.activeFloor, selectedClip.value.id);
    selectedClip.value = null;
    toast(`Klip ${deletedCode} berhasil dihapus.`);
  } catch (e) {
    showError("Gagal menghapus klip", e.message);
  } finally {
    saving.value = false;
  }
}

// Watch newClipCategory to reset newClipSubType on change
watch(newClipCategory, () => {
  newClipSubType.value = "";
});

// Create clip modal helpers
function openCreateModal() {
  newClipCategory.value = "";
  newClipSuffix.value = "";
  newClipSubType.value = "";
  creatingClip.value = false;
  
  const el = document.getElementById("createClipModal");
  if (el) {
    createModal = Modal.getOrCreateInstance(el);
    createModal.show();
  }
}

async function submitCreateClip() {
  if (!newClipCategory.value || !newClipSuffix.value.trim()) return;
  if (newClipCategoryDetailOptions.value.length > 0 && !newClipSubType.value) {
    return toast("Klasifikasi warna/jenis wajib dipilih", "warning");
  }
  
  creatingClip.value = true;
  const prefix = newClipPrefix.value;
  const fullCode = `${prefix}-${newClipSuffix.value.trim().toUpperCase()}`;

  try {
    const newId = await createClip(auth.activeFloor, {
      code: fullCode,
      type: prefix,
      category: newClipCategory.value,
      subType: newClipSubType.value || null,
      barcodes: [],
    });
    
    toast(`Klip "${fullCode}" berhasil dibuat.`);
    
    // Auto switch filter category to match the category of the created clip
    activeCategoryFilter.value = newClipCategory.value;
    
    // Auto select the new clip
    setTimeout(() => {
      const created = clips.value.find(c => c.id === newId);
      if (created) {
        selectedClip.value = created;
      }
    }, 100);

    createModal?.hide();
  } catch (e) {
    showError("Gagal membuat klip baru", e.message);
  } finally {
    creatingClip.value = false;
  }
}

// Lifecycle and Watchers
onMounted(() => {
  setupClipsListener();
});

watch(() => auth.activeFloor, (newFloor, oldFloor) => {
  if (newFloor && newFloor !== oldFloor) {
    selectedClip.value = null;
    setupClipsListener();
  }
});

onUnmounted(() => {
  if (unsubClips) unsubClips();
  if (verifyTimeout) clearTimeout(verifyTimeout);
});

// Helper formatted dates
function formatTime(value) {
  if (!value) return "-";
  let d;
  if (value && typeof value.toDate === "function") d = value.toDate();
  else d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
</script>

<style scoped>
.clip-manager-panel {
  color: #334155;
}

.min-h-350 {
  min-height: 350px;
}

.fs-8 {
  font-size: 0.72rem !important;
}

.fs-7 {
  font-size: 0.8rem !important;
}

.monospace {
  font-family: var(--bs-font-monospace), monospace;
}

.hover-lift {
  transition: all 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08) !important;
}

.bg-light-primary {
  background-color: rgba(13, 110, 253, 0.06) !important;
}

.search-group {
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
.search-group:focus-within {
  border-color: #86b7fe !important;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15) !important;
}

.list-item-custom {
  border-left: 4px solid transparent;
  transition: all 0.2s ease;
}
.list-item-custom:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.barcode-item-row:hover {
  background-color: rgba(13, 110, 253, 0.02) !important;
}

.hover-primary:hover {
  color: #0d6efd !important;
}

.clip-list-container::-webkit-scrollbar,
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.clip-list-container::-webkit-scrollbar-track,
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.clip-list-container::-webkit-scrollbar-thumb,
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.2);
  border-radius: 4px;
}
.clip-list-container::-webkit-scrollbar-thumb:hover,
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}

.scrollable-pills {
  display: flex;
  flex-wrap: nowrap !important;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.scrollable-pills::-webkit-scrollbar {
  height: 3px;
}
.scrollable-pills::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
</style>
