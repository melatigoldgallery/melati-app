<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h4 class="fw-bold mb-0">
          <i class="bi bi-tags me-2 text-warning"></i>
          Setting Display Harga Emas
        </h4>
        <div class="small text-muted mt-1">
          Pengaturan global untuk tampilan Harga Emas Hari Ini, Mode Tema (Dark/Light), dan Running Text Promosi.
        </div>
      </div>
      <div>
        <router-link to="/promosi/display-harga" target="_blank" class="btn btn-outline-warning btn-sm fw-semibold">
          <i class="bi bi-tv me-1"></i>
          Buka Display Kiosk
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="small text-muted mt-2">Memuat data pengaturan harga...</div>
    </div>

    <div v-else class="row g-3">
      <!-- Section 1: Pilihan Tema Display (Dark vs Light) -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 fw-semibold border-bottom">
            <i class="bi bi-palette me-2 text-primary"></i>
            Pilihan Mode Tema Tampilan
          </div>
          <div class="card-body">
            <div class="row g-3">
              <!-- Dark Luxury Option -->
              <div class="col-md-6">
                <div
                  :class="[
                    'theme-select-card p-3 rounded-3 border cursor-pointer h-100 transition-all',
                    form.theme === 'dark' ? 'active border-warning shadow-sm' : 'border-secondary-subtle'
                  ]"
                  @click="form.theme = 'dark'"
                >
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="fs-4">🌙</span>
                      <div>
                        <div class="fw-bold text-dark">Dark Luxury Edition</div>
                        <div class="small text-muted">Nuansa Obsidian Hitam Elegan & Gold Glow</div>
                      </div>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="themeRadio"
                        value="dark"
                        v-model="form.theme"
                      />
                    </div>
                  </div>
                  <!-- Preview Box -->
                  <div class="theme-preview-box dark-preview p-2.5 rounded-2 mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="badge bg-gold-tag">18K (75%)</span>
                      <span class="text-gold-light fw-bold small">Rp 2.125.000</span>
                      <span class="badge bg-purple-badge">BRANDED</span>
                    </div>
                    <div class="small text-gold-muted text-center" style="font-size: 10px;">
                      ✦ HARGA EMAS HARI INI • MELATI GOLD SHOP
                    </div>
                  </div>
                </div>
              </div>

              <!-- Light Editorial Option -->
              <div class="col-md-6">
                <div
                  :class="[
                    'theme-select-card p-3 rounded-3 border cursor-pointer h-100 transition-all',
                    form.theme === 'light' ? 'active border-warning shadow-sm' : 'border-secondary-subtle'
                  ]"
                  @click="form.theme = 'light'"
                >
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="fs-4">☀️</span>
                      <div>
                        <div class="fw-bold text-dark">Editorial Light Edition</div>
                        <div class="small text-muted">Nuansa Ivory Putih Bersih & Classic Gold</div>
                      </div>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="themeRadio"
                        value="light"
                        v-model="form.theme"
                      />
                    </div>
                  </div>
                  <!-- Preview Box -->
                  <div class="theme-preview-box light-preview p-2.5 rounded-2 mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="badge bg-gold-tag-light">18K (75%)</span>
                      <span class="text-dark fw-bold small">Rp 2.125.000</span>
                      <span class="badge bg-purple-badge">BRANDED</span>
                    </div>
                    <div class="small text-stone-muted text-center" style="font-size: 10px;">
                      ✦ HARGA EMAS HARI INI • MELATI GOLD SHOP
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Pengaturan Header & Tagline Display -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 fw-semibold border-bottom">
            <i class="bi bi-layout-text-window-reverse me-2 text-primary"></i>
            Judul & Teks Header Display
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label small fw-bold">Judul Utama Display</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: HARGA EMAS HARI INI"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Subjudul / Nama Toko</label>
                <input
                  v-model="form.subtitle"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: Melati Gold Shop"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-bold">Tagline Slogan</label>
                <input
                  v-model="form.tagline"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: Transparan • Harga dan Kualitas terbaik"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Daftar Harga Per Kadar -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold">
              <i class="bi bi-gem me-2 text-warning"></i>
              Daftar Kadar & Harga per Gram
            </div>
            <button class="btn btn-outline-primary btn-sm" @click="addKadar">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Kadar
            </button>
          </div>
          <div class="card-body p-0">
            <div v-if="form.items.length === 0" class="text-center py-4 text-muted small">
              Belum ada kadar yang ditambahkan. Klik <strong>Tambah Kadar</strong> di atas.
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light small">
                  <tr>
                    <th style="width: 50px" class="text-center">No</th>
                    <th style="width: 140px">Kadar</th>
                    <th style="width: 130px" class="text-center">Branded</th>
                    <th>Harga Jual Normal</th>
                    <!-- PURPLE HIGHLIGHT HEADER FOR BRANDED PRICE -->
                    <th class="purple-header-th">Harga Jual Branded</th>
                    <th>Buyback Customer</th>
                    <th style="width: 110px" class="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in form.items" :key="item.id || idx">
                    <!-- Order / Index -->
                    <td class="text-center text-muted small fw-bold">{{ idx + 1 }}</td>

                    <!-- Kadar Name -->
                    <td>
                      <input
                        v-model="item.kadar"
                        type="text"
                        class="form-control form-control-sm fw-bold"
                        placeholder="e.g. 18K"
                      />
                    </td>

                    <!-- Toggle Branded -->
                    <td class="text-center">
                      <div class="form-check form-switch d-inline-block">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          :id="`branded-switch-${idx}`"
                          v-model="item.hasBranded"
                        />
                        <label class="form-check-label small ms-1" :for="`branded-switch-${idx}`">
                          {{ item.hasBranded ? 'Ada' : 'Tidak' }}
                        </label>
                      </div>
                    </td>

                    <!-- Harga Jual Normal -->
                    <td>
                      <div class="input-group input-group-sm">
                        <span class="input-group-text">Rp</span>
                        <input
                          v-model.number="item.hargaNormal"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-muted mt-1">
                        {{ formatRupiah(item.hargaNormal) }}
                      </div>
                    </td>

                    <!-- Harga Jual Branded (PURPLE STYLING) -->
                    <td :class="['purple-cell-td', { 'disabled-cell': !item.hasBranded }]">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text purple-addon">Rp</span>
                        <input
                          v-model.number="item.hargaBranded"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control purple-input"
                          :disabled="!item.hasBranded"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-purple-dark fw-semibold mt-1">
                        <span v-if="item.hasBranded">{{ formatRupiah(item.hargaBranded) }}</span>
                        <span v-else class="text-muted fst-italic">Nonaktif</span>
                      </div>
                    </td>

                    <!-- Harga Buyback -->
                    <td>
                      <div class="input-group input-group-sm">
                        <span class="input-group-text text-success bg-success-subtle border-success-subtle">Rp</span>
                        <input
                          v-model.number="item.hargaBuyback"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control border-success-subtle"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-success fw-semibold mt-1">
                        {{ formatRupiah(item.hargaBuyback) }}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="text-center">
                      <div class="btn-group btn-group-sm">
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          :disabled="idx === 0"
                          @click="moveKadarUp(idx)"
                          title="Naikkan"
                        >
                          <i class="bi bi-arrow-up"></i>
                        </button>
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          :disabled="idx === form.items.length - 1"
                          @click="moveKadarDown(idx)"
                          title="Turunkan"
                        >
                          <i class="bi bi-arrow-down"></i>
                        </button>
                        <button
                          class="btn btn-outline-danger btn-sm"
                          @click="removeKadar(idx)"
                          title="Hapus"
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
      </div>

      <!-- Section 4: Running Ticker (Pesan Berjalan Promosi) -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold">
              <i class="bi bi-megaphone me-2 text-warning"></i>
              Pesan Running Ticker (Teks Berjalan)
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="addTicker">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Pesan Ticker
            </button>
          </div>
          <div class="card-body">
            <div class="small text-muted mb-2">
              Teks ini akan bergerak mendatar pada pita ticker di layar TV di bawah judul utama.
            </div>
            <div v-if="!form.tickerMessages || form.tickerMessages.length === 0" class="text-muted small fst-italic">
              Belum ada pesan ticker. Klik tombol "Tambah Pesan Ticker".
            </div>
            <div v-for="(msg, tIdx) in form.tickerMessages" :key="tIdx" class="input-group input-group-sm mb-2">
              <span class="input-group-text bg-light text-muted">✦ {{ tIdx + 1 }}</span>
              <input
                v-model="form.tickerMessages[tIdx]"
                type="text"
                class="form-control"
                placeholder="Contoh: MENYEDIAKAN PERHIASAN MODEL TERBARU YANG ELEGAN DAN STYLISH"
              />
              <button class="btn btn-outline-danger" @click="removeTicker(tIdx)" title="Hapus pesan">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Catatan & Disclaimer Footer -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold">
              <i class="bi bi-info-circle me-2 text-info"></i>
              Catatan & Syarat Ketentuan Buyback
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="addNote">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Catatan
            </button>
          </div>
          <div class="card-body">
            <div v-for="(note, nIdx) in form.notes" :key="nIdx" class="input-group input-group-sm mb-2">
              <span class="input-group-text bg-light text-muted">{{ nIdx + 1 }}</span>
              <input
                v-model="form.notes[nIdx]"
                type="text"
                class="form-control"
                placeholder="Tulis catatan atau syarat buyback..."
              />
              <button class="btn btn-outline-danger" @click="removeNote(nIdx)" title="Hapus catatan">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Save Action -->
      <div class="col-12 text-end mt-2 mb-4">
        <button class="btn btn-success fw-semibold px-4 py-2" :disabled="saving" @click="saveSettings">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan Pengaturan Display
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import { 
  DEFAULT_HARGA_DISPLAY_SETTINGS, 
  fetchHargaDisplaySettings, 
  saveHargaDisplaySettings 
} from "@/services/harga-display-service";

const { toast, error: showError } = useAlert();

const loading = ref(true);
const saving = ref(false);

const form = ref({
  theme: DEFAULT_HARGA_DISPLAY_SETTINGS.theme,
  title: DEFAULT_HARGA_DISPLAY_SETTINGS.title,
  subtitle: DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle,
  tagline: DEFAULT_HARGA_DISPLAY_SETTINGS.tagline,
  tickerMessages: [...DEFAULT_HARGA_DISPLAY_SETTINGS.tickerMessages],
  items: [],
  notes: [],
});

function formatRupiah(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function addKadar() {
  form.value.items.push({
    id: `kadar-${Date.now()}`,
    kadar: "",
    hasBranded: false,
    hargaNormal: 1000000,
    hargaBranded: 0,
    hargaBuyback: 850000,
  });
}

function removeKadar(idx) {
  form.value.items.splice(idx, 1);
}

function moveKadarUp(idx) {
  if (idx <= 0) return;
  const temp = form.value.items[idx];
  form.value.items[idx] = form.value.items[idx - 1];
  form.value.items[idx - 1] = temp;
}

function moveKadarDown(idx) {
  if (idx >= form.value.items.length - 1) return;
  const temp = form.value.items[idx];
  form.value.items[idx] = form.value.items[idx + 1];
  form.value.items[idx + 1] = temp;
}

function addTicker() {
  if (!form.value.tickerMessages) form.value.tickerMessages = [];
  form.value.tickerMessages.push("");
}

function removeTicker(idx) {
  form.value.tickerMessages.splice(idx, 1);
}

function addNote() {
  form.value.notes.push("");
}

function removeNote(idx) {
  form.value.notes.splice(idx, 1);
}

async function loadData() {
  loading.value = true;
  try {
    const data = await fetchHargaDisplaySettings();
    form.value = {
      theme: data.theme || "dark",
      title: data.title || DEFAULT_HARGA_DISPLAY_SETTINGS.title,
      subtitle: data.subtitle || DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle,
      tagline: data.tagline || DEFAULT_HARGA_DISPLAY_SETTINGS.tagline,
      tickerMessages: (data.tickerMessages || []).map((t) => t),
      items: (data.items || []).map((item) => ({ ...item })),
      notes: (data.notes || []).map((note) => note),
    };
  } catch (err) {
    showError("Gagal memuat pengaturan", err.message);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    await saveHargaDisplaySettings(form.value);
    toast("Pengaturan Display Harga Emas berhasil disimpan");
    await loadData();
  } catch (err) {
    showError("Gagal menyimpan pengaturan", err.message);
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

.theme-select-card {
  background: #ffffff;
  border-width: 2px !important;
}

.theme-select-card:hover {
  transform: translateY(-2px);
}

.theme-select-card.active {
  border-color: #d4af37 !important;
  background-color: #fffdf7;
}

/* Theme Preview Boxes */
.theme-preview-box {
  border-radius: 8px;
  font-family: inherit;
}

.dark-preview {
  background: radial-gradient(circle at 50% 12%, #141724 0%, #090A0F 100%);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.light-preview {
  background: radial-gradient(circle at 50% 8%, #FFFFFF 0%, #FAF8F5 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.bg-gold-tag {
  background-color: #d4af37;
  color: #1a1500;
  font-weight: 700;
}

.bg-gold-tag-light {
  background-color: #f5eed8;
  color: #7a5b10;
  border: 1px solid #dfca86;
  font-weight: 700;
}

.bg-purple-badge {
  background-color: #5b1e8a;
  color: #ffffff;
  font-size: 9px;
  letter-spacing: 0.5px;
}

.text-gold-light {
  color: #fce788;
}

.text-gold-muted {
  color: #dfca86;
  opacity: 0.8;
}

.text-stone-muted {
  color: #78716c;
}

/* PURPLE BACKGROUND STYLING FOR BRANDED HEADER AND CELLS */
.purple-header-th {
  background-color: #6b21a8 !important;
  color: #ffffff !important;
  border-bottom: 2px solid #a855f7 !important;
}

.purple-cell-td {
  background-color: #f3e8ff !important;
  border-left: 2px solid #c084fc;
  border-right: 2px solid #c084fc;
}

.purple-cell-td.disabled-cell {
  background-color: #faf5ff !important;
  opacity: 0.7;
}

.purple-addon {
  background-color: #6b21a8;
  color: #ffffff;
  border-color: #7e22ce;
  font-weight: 600;
}

.purple-input {
  border-color: #a855f7;
  font-weight: 600;
  color: #4c1d95;
}

.purple-input:focus {
  border-color: #7e22ce;
  box-shadow: 0 0 0 0.25rem rgba(126, 34, 206, 0.25);
}

.text-purple-dark {
  color: #581c87;
}
</style>
