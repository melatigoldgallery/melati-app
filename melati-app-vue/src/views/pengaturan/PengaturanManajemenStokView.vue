<template>
  <div class="page-content">
    <div class="page-header">
      <h1>
        <i class="bi bi-sliders2-vertical me-2 text-dark"></i>
        Pengaturan Manajemen Stok
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/pengaturan/users">Pengaturan</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Manajemen Stok</li>
        </ol>
      </nav>
    </div>

    <div class="content-wrapper">
      <!-- Tab Navigation -->
      <div class="mb-3" v-if="!loading">
        <ul class="nav nav-pills gap-2 bg-light p-1 rounded-3 d-inline-flex border">
          <li class="nav-item">
            <button
              class="nav-link px-3 py-1.5 fw-semibold rounded-pill d-flex align-items-center gap-2 border-0"
              :class="activeSettingTab === 'layout' ? 'active shadow-sm text-white' : 'text-secondary bg-transparent'"
              @click="activeSettingTab = 'layout'"
            >
              <i class="bi bi-layout-three-columns"></i>
              Card & Lokasi
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link px-3 py-1.5 fw-semibold rounded-pill d-flex align-items-center gap-2 border-0"
              :class="activeSettingTab === 'detailTypes' ? 'active shadow-sm text-white' : 'text-secondary bg-transparent'"
              @click="activeSettingTab = 'detailTypes'"
            >
              <i class="bi bi-palette"></i>
              Warna & Jenis Perhiasan
            </button>
          </li>
        </ul>
      </div>

      <!-- Warning Alert for Non-Supervisor -->
      <div v-if="!loading && !isSupervisor" class="alert alert-warning py-3 px-4 mb-4 border-0 rounded-3 shadow-sm d-flex align-items-center gap-3">
        <i class="bi bi-exclamation-triangle-fill text-warning fs-4"></i>
        <div class="text-start">
          <strong class="d-block text-warning-emphasis fw-bold">Mode Lihat Saja (Read-Only)</strong>
          <span class="small text-muted">Hanya Supervisor yang diizinkan untuk mengubah konfigurasi manajemen stok lantai ini.</span>
        </div>
      </div>

      <div class="settings-layout" v-if="!loading">
        <div class="settings-main">
          <fieldset :disabled="!isSupervisor" class="border-0 p-0 m-0">
          <div class="card border-0 shadow-sm mb-3" v-if="activeSettingTab === 'layout'">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0 fw-semibold">Konfigurasi Card & Nav Link</h6>
              <button class="btn btn-sm btn-primary" @click="addCard">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah Card
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive settings-table-wrap">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 52px">No</th>
                      <th style="min-width: 140px">ID Card</th>
                      <th style="min-width: 180px">Nama Card / Tab</th>
                      <th style="width: 120px">Tipe</th>
                      <th style="width: 140px">Modal</th>
                      <th style="width: 130px">Warna</th>
                      <th class="text-center" style="width: 70px">Aktif</th>
                      <th class="text-center" style="width: 80px">Summary</th>
                      <th class="text-center" style="width: 120px">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(card, idx) in form.cards" :key="`card-${idx}`">
                      <td class="fw-semibold">{{ idx + 1 }}</td>
                      <td>
                        <input
                          v-model="card.id"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Contoh: KALUNG"
                          :disabled="card.type === 'computer'"
                        />
                      </td>
                      <td>
                        <input
                          v-model="card.label"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama tampilan"
                        />
                      </td>
                      <td>
                        <select v-model="card.type" class="form-select form-select-sm" @change="syncCardType(card)">
                          <option value="simple">Simple</option>
                          <option value="color">Color</option>
                          <option value="hala">Hala</option>
                          <option value="computer">Computer</option>
                        </select>
                      </td>
                      <td>
                        <select
                          v-model="card.detailMode"
                          class="form-select form-select-sm"
                          :disabled="card.type === 'computer'"
                        >
                          <option value="default">Default</option>
                          <option value="color">Warna</option>
                          <option value="hala">Jenis Perhiasan</option>
                        </select>
                      </td>
                      <td>
                        <div class="d-flex gap-1 justify-content-center">
                          <input v-model="card.colorStart" type="color" class="form-control form-control-color" />
                          <input v-model="card.colorEnd" type="color" class="form-control form-control-color" />
                        </div>
                      </td>
                      <td class="text-center">
                        <input v-model="card.enabled" type="checkbox" class="form-check-input" />
                      </td>
                      <td class="text-center">
                        <input
                          v-model="card.showInSummary"
                          type="checkbox"
                          class="form-check-input"
                          :disabled="card.type === 'computer'"
                        />
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" @click="moveCard(idx, -1)" :disabled="idx === 0">
                            <i class="bi bi-arrow-up"></i>
                          </button>
                          <button
                            class="btn btn-outline-secondary"
                            @click="moveCard(idx, 1)"
                            :disabled="idx === form.cards.length - 1"
                          >
                            <i class="bi bi-arrow-down"></i>
                          </button>
                          <button
                            class="btn btn-outline-danger"
                            @click="removeCard(idx)"
                            :disabled="card.type === 'computer'"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!form.cards.length">
                      <td colspan="9" class="text-center text-muted py-3">Belum ada card.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm" v-if="activeSettingTab === 'layout'">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0 fw-semibold">Konfigurasi Jenis Tabel</h6>
              <button class="btn btn-sm btn-primary" @click="addTableRow">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah Jenis
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive settings-table-wrap">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 52px">No</th>
                      <th style="min-width: 170px">Key Jenis</th>
                      <th style="min-width: 220px">Nama Jenis</th>
                      <th class="text-center" style="width: 80px">Aktif</th>
                      <th class="text-center" style="width: 120px">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in form.tableRows" :key="`row-${idx}`">
                      <td class="fw-semibold">{{ idx + 1 }}</td>
                      <td>
                        <input
                          v-model="row.key"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="contoh: brankas"
                        />
                      </td>
                      <td>
                        <input
                          v-model="row.label"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama jenis di tabel"
                        />
                      </td>
                      <td class="text-center">
                        <input v-model="row.enabled" type="checkbox" class="form-check-input" />
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" @click="moveRow(idx, -1)" :disabled="idx === 0">
                            <i class="bi bi-arrow-up"></i>
                          </button>
                          <button
                            class="btn btn-outline-secondary"
                            @click="moveRow(idx, 1)"
                            :disabled="idx === form.tableRows.length - 1"
                          >
                            <i class="bi bi-arrow-down"></i>
                          </button>
                          <button class="btn btn-outline-danger" @click="removeTableRow(idx)">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!form.tableRows.length">
                      <td colspan="5" class="text-center text-muted py-3">Belum ada jenis tabel.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Konfigurasi Warna -->
          <div class="card border-0 shadow-sm mb-3" v-if="activeSettingTab === 'detailTypes'">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0 fw-semibold">Konfigurasi Klasifikasi Warna</h6>
              <button class="btn btn-sm btn-primary" @click="addColorType">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah Warna
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive settings-table-wrap">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 52px">No</th>
                      <th style="min-width: 140px">Key Warna (ID)</th>
                      <th style="min-width: 180px">Nama Warna (Label)</th>
                      <th class="text-center" style="width: 120px">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(color, idx) in form.colorTypes" :key="`color-${idx}`">
                      <td class="fw-semibold">{{ idx + 1 }}</td>
                      <td>
                        <input
                          v-model="color.key"
                          type="text"
                          class="form-control form-control-sm text-uppercase"
                          placeholder="Contoh: MERAH"
                          @input="color.key = color.key.toUpperCase().replace(/\s+/g, '')"
                        />
                      </td>
                      <td>
                        <input
                          v-model="color.label"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama warna tampilan"
                        />
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" @click="moveColorType(idx, -1)" :disabled="idx === 0">
                            <i class="bi bi-arrow-up"></i>
                          </button>
                          <button
                            class="btn btn-outline-secondary"
                            @click="moveColorType(idx, 1)"
                            :disabled="idx === form.colorTypes.length - 1"
                          >
                            <i class="bi bi-arrow-down"></i>
                          </button>
                          <button
                            class="btn btn-outline-danger"
                            @click="removeColorType(idx)"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!form.colorTypes.length">
                      <td colspan="4" class="text-center text-muted py-3">Belum ada warna.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Konfigurasi Jenis Perhiasan -->
          <div class="card border-0 shadow-sm" v-if="activeSettingTab === 'detailTypes'">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0 fw-semibold">Konfigurasi Jenis Perhiasan</h6>
              <button class="btn btn-sm btn-primary" @click="addHalaType">
                <i class="bi bi-plus-circle me-1"></i>
                Tambah Jenis
              </button>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive settings-table-wrap">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 52px">No</th>
                      <th style="min-width: 140px">Key Jenis (ID)</th>
                      <th style="min-width: 180px">Nama Jenis (Label)</th>
                      <th class="text-center" style="width: 120px">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(hala, idx) in form.halaTypes" :key="`hala-${idx}`">
                      <td class="fw-semibold">{{ idx + 1 }}</td>
                      <td>
                        <input
                          v-model="hala.key"
                          type="text"
                          class="form-control form-control-sm text-uppercase"
                          placeholder="Contoh: HALA_A"
                          @input="hala.key = hala.key.toUpperCase().replace(/\s+/g, '')"
                        />
                      </td>
                      <td>
                        <input
                          v-model="hala.label"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama jenis tampilan"
                        />
                      </td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" @click="moveHalaType(idx, -1)" :disabled="idx === 0">
                            <i class="bi bi-arrow-up"></i>
                          </button>
                          <button
                            class="btn btn-outline-secondary"
                            @click="moveHalaType(idx, 1)"
                            :disabled="idx === form.halaTypes.length - 1"
                          >
                            <i class="bi bi-arrow-down"></i>
                          </button>
                          <button
                            class="btn btn-outline-danger"
                            @click="removeHalaType(idx)"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!form.halaTypes.length">
                      <td colspan="4" class="text-center text-muted py-3">Belum ada jenis perhiasan.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </fieldset>
        </div>

        <aside class="settings-side">
          <fieldset :disabled="!isSupervisor" class="border-0 p-0 m-0">
            <!-- Fitur Barcode Toggle -->
            <div class="card border-0 shadow-sm mb-3">
              <div class="card-header bg-white border-0 py-3">
                <h6 class="mb-0 fw-bold d-flex align-items-center gap-2">
                  <i class="bi bi-qr-code-scan text-primary"></i>
                  <span>Fitur Pelacakan Barcode</span>
                </h6>
              </div>
              <div class="card-body pt-0">
                <div class="form-check form-switch text-start mb-2">
                  <input
                    v-model="form.barcodeEnabled"
                    type="checkbox"
                    class="form-check-input"
                    id="barcodeEnabledSwitch"
                  />
                  <label class="form-check-label fw-bold text-dark" for="barcodeEnabledSwitch">
                    Aktifkan Barcode Tracking
                  </label>
                </div>
                <small class="text-muted d-block text-start lh-sm">
                  Jika aktif, mutasi barang wajib menggunakan scan barcode. Jika nonaktif, mutasi barang di-update manual dengan input angka jumlah.
                </small>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3 sticky-panel" v-if="activeSettingTab === 'layout'">
            <div class="card-header">
              <h6 class="mb-0 fw-semibold">Pengaturan Grid Card Summary</h6>
            </div>
            <div class="card-body">
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label small mb-1">Kolom Desktop (>=1200px)</label>
                  <input
                    v-model.number="form.summaryGrid.xl"
                    type="number"
                    min="1"
                    max="7"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-6">
                  <label class="form-label small mb-1">Kolom Laptop (>=992px)</label>
                  <input
                    v-model.number="form.summaryGrid.lg"
                    type="number"
                    min="1"
                    max="6"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-6">
                  <label class="form-label small mb-1">Kolom Tablet (>=768px)</label>
                  <input
                    v-model.number="form.summaryGrid.md"
                    type="number"
                    min="1"
                    max="4"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="col-6">
                  <label class="form-label small mb-1">Jarak Antar Card (px)</label>
                  <input
                    v-model.number="form.summaryGrid.gap"
                    type="number"
                    min="6"
                    max="28"
                    class="form-control form-control-sm"
                  />
                </div>
              </div>

              <div class="small fw-semibold mb-2">Preview Grid</div>
              <div class="preview-grid" :style="summaryPreviewStyle">
                <div v-for="n in summaryPreviewCount" :key="`preview-${n}`" class="preview-cell"></div>
              </div>
              <small class="text-muted d-block mt-2">
                Preview ini meniru tampilan card summary di halaman manajemen stok.
              </small>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="meta-info mb-3">
                <i class="fas fa-clock me-1"></i>
                Terakhir update:
                <strong>{{ formattedLastUpdated }}</strong>
                <span class="mx-1">|</span>
                Oleh:
                <strong>{{ form.updatedBy || "-" }}</strong>
              </div>

              <div class="d-grid gap-2">
                <button class="btn btn-success" :disabled="saving || loading" @click="saveSettings">
                  <i class="bi bi-save me-1"></i>
                  {{ saving ? "Menyimpan..." : "Simpan Pengaturan" }}
                </button>
                <button class="btn btn-outline-secondary" :disabled="saving || loading" @click="resetToDefault">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>
                  Reset Default
                </button>
              </div>
            </div>
          </div>
          </fieldset>
        </aside>
      </div>

      <div v-else class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import {
  buildDefaultInventorySettings,
  ensureInventorySettings,
  fetchInventorySettings,
  normalizeInventorySettings,
  saveInventorySettings,
} from "@/services/inventory-setting-service";
import { fetchAllStockData, cleanupDeletedDetailTypes } from "@/services/inventory-service";

const auth = useAuthStore();
const { toast, error: showError, confirm } = useAlert();

const loading = ref(true);
const saving = ref(false);
const activeSettingTab = ref("layout");
const stockData = ref({});
const originalColorKeys = ref([]);
const originalHalaKeys = ref([]);

const isSupervisor = computed(() => {
  return auth.userRole?.toLowerCase() === "supervisor";
});

const form = reactive({
  cards: [],
  tableRows: [],
  summaryGrid: {
    md: 2,
    lg: 3,
    xl: 3,
    gap: 12,
  },
  colorTypes: [],
  halaTypes: [],
  barcodeEnabled: false,
  lastUpdated: null,
  updatedBy: "System",
});

const formattedLastUpdated = computed(() => {
  if (!form.lastUpdated) return "Belum pernah";
  const date = new Date(form.lastUpdated);
  if (Number.isNaN(date.getTime())) return "Belum pernah";
  return date.toLocaleString("id-ID");
});

const summaryPreviewCount = computed(() => {
  const count = form.cards.filter(
    (card) => card.enabled && card.type !== "computer" && card.showInSummary !== false,
  ).length;
  return Math.max(count, 4);
});

const summaryPreviewStyle = computed(() => {
  const cols = Math.min(Math.max(Number(form.summaryGrid.xl) || 3, 1), 5);
  const gap = Math.min(Math.max(Number(form.summaryGrid.gap) || 12, 6), 28);
  return {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: `${gap}px`,
  };
});

function applySettings(data = {}) {
  const normalized = normalizeInventorySettings(data, auth.activeFloor);
  form.cards = normalized.cards.map((card) => ({ ...card }));
  form.tableRows = normalized.tableRows.map((row) => ({ ...row }));
  form.summaryGrid = { ...normalized.summaryGrid };
  form.colorTypes = normalized.colorTypes.map((c) => ({ ...c }));
  form.halaTypes = normalized.halaTypes.map((h) => ({ ...h }));
  form.barcodeEnabled = !!normalized.barcodeEnabled;
  form.lastUpdated = normalized.lastUpdated;
  form.updatedBy = normalized.updatedBy;

  originalColorKeys.value = normalized.colorTypes.map((c) => c.key);
  originalHalaKeys.value = normalized.halaTypes.map((h) => h.key);
}

function addCard() {
  form.cards.push({
    id: "",
    label: "",
    type: "simple",
    detailMode: "default",
    enabled: true,
    showInSummary: true,
    colorStart: "#eef7ff",
    colorEnd: "#8cc8ff",
  });
}

function removeCard(index) {
  form.cards.splice(index, 1);
}

function moveCard(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.cards.length) return;
  const clone = [...form.cards];
  const current = clone[index];
  clone[index] = clone[target];
  clone[target] = current;
  form.cards = clone;
}

function syncCardType(card) {
  if (card.type === "computer") {
    card.showInSummary = false;
    card.detailMode = "default";
  }
}

function addTableRow() {
  form.tableRows.push({
    key: "",
    label: "",
    enabled: true,
  });
}

function removeTableRow(index) {
  form.tableRows.splice(index, 1);
}

function moveRow(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.tableRows.length) return;
  const clone = [...form.tableRows];
  const current = clone[index];
  clone[index] = clone[target];
  clone[target] = current;
  form.tableRows = clone;
}

function addColorType() {
  form.colorTypes.push({ key: "", label: "" });
}

function removeColorType(index) {
  form.colorTypes.splice(index, 1);
}

function moveColorType(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.colorTypes.length) return;
  const clone = [...form.colorTypes];
  const current = clone[index];
  clone[index] = clone[target];
  clone[target] = current;
  form.colorTypes = clone;
}

function addHalaType() {
  form.halaTypes.push({ key: "", label: "" });
}

function removeHalaType(index) {
  form.halaTypes.splice(index, 1);
}

function moveHalaType(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.halaTypes.length) return;
  const clone = [...form.halaTypes];
  const current = clone[index];
  clone[index] = clone[target];
  clone[target] = current;
  form.halaTypes = clone;
}

function getPayload() {
  return {
    cards: form.cards.map((card, index) => ({
      ...card,
      id: String(card.id || "")
        .trim()
        .toUpperCase(),
      label: String(card.label || "").trim(),
      order: index + 1,
      showInSummary: card.type === "computer" ? false : !!card.showInSummary,
      detailMode: String(card.detailMode || "default")
        .trim()
        .toLowerCase(),
    })),
    tableRows: form.tableRows.map((row, index) => ({
      ...row,
      key: String(row.key || "").trim(),
      label: String(row.label || "").trim(),
      order: index + 1,
    })),
    summaryGrid: {
      md: Number(form.summaryGrid.md),
      lg: Number(form.summaryGrid.lg),
      xl: Number(form.summaryGrid.xl),
      gap: Number(form.summaryGrid.gap),
    },
    colorTypes: form.colorTypes.map((c) => ({
      key: String(c.key || "").trim().toUpperCase(),
      label: String(c.label || "").trim(),
    })),
    halaTypes: form.halaTypes.map((h) => ({
      key: String(h.key || "").trim().toUpperCase(),
      label: String(h.label || "").trim(),
    })),
    barcodeEnabled: !!form.barcodeEnabled,
  };
}

function validatePayload(payload) {
  if (!payload.cards.length) {
    toast("Card minimal harus 1", "warning");
    return false;
  }

  const cardIdSet = new Set();
  for (const card of payload.cards) {
    if (!card.id) {
      toast("ID card tidak boleh kosong", "warning");
      return false;
    }
    if (!card.label) {
      toast(`Nama card untuk ${card.id} tidak boleh kosong`, "warning");
      return false;
    }
    if (cardIdSet.has(card.id)) {
      toast(`ID card duplikat: ${card.id}`, "warning");
      return false;
    }
    cardIdSet.add(card.id);
  }

  const computerCards = payload.cards.filter((card) => card.type === "computer");
  if (!computerCards.length) {
    toast("Harus ada minimal 1 card tipe computer", "warning");
    return false;
  }

  const rowKeySet = new Set();
  for (const row of payload.tableRows) {
    if (!row.key) {
      toast("Key jenis tabel tidak boleh kosong", "warning");
      return false;
    }
    if (!row.label) {
      toast(`Nama jenis untuk key ${row.key} tidak boleh kosong`, "warning");
      return false;
    }
    if (rowKeySet.has(row.key)) {
      toast(`Key jenis duplikat: ${row.key}`, "warning");
      return false;
    }
    rowKeySet.add(row.key);
  }

  const colorKeySet = new Set();
  for (const c of payload.colorTypes) {
    if (!c.key) {
      toast("Key warna tidak boleh kosong", "warning");
      return false;
    }
    if (!c.label) {
      toast(`Label warna untuk key ${c.key} tidak boleh kosong`, "warning");
      return false;
    }
    if (colorKeySet.has(c.key)) {
      toast(`Key warna duplikat: ${c.key}`, "warning");
      return false;
    }
    colorKeySet.add(c.key);
  }

  const halaKeySet = new Set();
  for (const h of payload.halaTypes) {
    if (!h.key) {
      toast("Key jenis tidak boleh kosong", "warning");
      return false;
    }
    if (!h.label) {
      toast(`Label jenis untuk key ${h.key} tidak boleh kosong`, "warning");
      return false;
    }
    if (halaKeySet.has(h.key)) {
      toast(`Key jenis duplikat: ${h.key}`, "warning");
      return false;
    }
    halaKeySet.add(h.key);
  }

  return true;
}

async function loadSettings() {
  loading.value = true;
  try {
    await ensureInventorySettings(auth.activeFloor);
    const data = await fetchInventorySettings(auth.activeFloor);
    applySettings(data);
    stockData.value = await fetchAllStockData(auth.activeFloor);
  } catch (e) {
    showError("Gagal memuat pengaturan", e.message);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  const payload = getPayload();
  if (!validatePayload(payload)) return;

  const deletedColors = originalColorKeys.value.filter(
    (ok) => !payload.colorTypes.some((nc) => nc.key === ok)
  );
  const deletedHalas = originalHalaKeys.value.filter(
    (ok) => !payload.halaTypes.some((nh) => nh.key === ok)
  );

  if (deletedColors.length > 0 || deletedHalas.length > 0) {
    const deletedActiveItems = [];
    const rowMapping = {};
    form.tableRows.forEach((r) => {
      rowMapping[r.key] = r.label;
    });

    Object.keys(stockData.value).forEach((locKey) => {
      const subDoc = stockData.value[locKey] || {};
      Object.keys(subDoc).forEach((mainCat) => {
        const item = subDoc[mainCat] || {};
        if (item.details) {
          deletedColors.forEach((col) => {
            const qty = parseInt(item.details[col], 10) || 0;
            if (qty > 0) {
              deletedActiveItems.push(
                `Warna "${col}" di Kategori "${mainCat}" (${rowMapping[locKey] || locKey}): ${qty} pcs`
              );
            }
          });
          deletedHalas.forEach((hala) => {
            const qty = parseInt(item.details[hala], 10) || 0;
            if (qty > 0) {
              deletedActiveItems.push(
                `Jenis "${hala}" di Kategori "${mainCat}" (${rowMapping[locKey] || locKey}): ${qty} pcs`
              );
            }
          });
        }
      });
    });

    if (deletedActiveItems.length > 0) {
      const listHtml =
        `<ul class="text-start mt-2 small" style="max-height: 200px; overflow-y: auto;">` +
        deletedActiveItems.map((item) => `<li>${item}</li>`).join("") +
        `</ul>`;

      const result = await confirm({
        title: "Hapus Pilihan yang Memiliki Data?",
        html: `Pilihan yang Anda hapus masih memiliki stok aktif di sistem:<br>${listHtml}<br>Jika tetap dihapus, kolom ini tidak akan tampil lagi di tabel manajemen stok.<br><br>Apakah Anda tetap yakin ingin menyimpan?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, Tetap Hapus",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;
    }
  }

  if (!isSupervisor.value) {
    toast("Hanya Supervisor yang diizinkan untuk menyimpan pengaturan ini.", "error");
    return;
  }

  saving.value = true;
  try {
    await saveInventorySettings(
      payload,
      auth.user?.email || auth.user?.username || auth.userRole || "System",
      auth.activeFloor,
    );
    await cleanupDeletedDetailTypes({
      deletedColors,
      deletedHalas,
      floorId: auth.activeFloor,
      currentStockData: stockData.value,
    });
    toast("Pengaturan manajemen stok berhasil disimpan");
    await loadSettings();
  } catch (e) {
    showError("Gagal menyimpan pengaturan", e.message);
  } finally {
    saving.value = false;
  }
}

async function resetToDefault() {
  if (!isSupervisor.value) {
    toast("Hanya Supervisor yang diizinkan untuk mereset pengaturan ini.", "error");
    return;
  }

  const result = await confirm({
    title: "Reset Pengaturan?",
    text: "Semua konfigurasi card, grid, dan jenis tabel akan kembali ke default.",
    icon: "warning",
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
  });

  if (!result.isConfirmed) return;

  const defaults = buildDefaultInventorySettings();
  applySettings(defaults);
  await saveSettings();
}

onMounted(loadSettings);
</script>

<style scoped>
.content-wrapper {
  max-width: 1620px;
  margin: 0 auto;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(300px, 0.95fr);
  gap: 16px;
  align-items: start;
}

.settings-main .card,
.settings-side .card {
  border-radius: 12px;
}

.settings-table-wrap {
  max-height: calc(100vh - 290px);
}

.sticky-panel {
  position: sticky;
  top: 12px;
}

.preview-grid {
  display: grid;
}

.preview-cell {
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #dfe9f8 0%, #b7d0f3 100%);
  border: 1px solid rgba(79, 122, 189, 0.2);
}

.meta-info {
  font-size: 0.86rem;
  color: #6c757d;
}

@media (max-width: 1199.98px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .sticky-panel {
    position: static;
  }

  .settings-table-wrap {
    max-height: 520px;
  }
}
</style>
