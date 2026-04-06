<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-arrow-left-right me-2 text-info"></i>
        Mutasi Kode Barang
      </h4>
      <button class="btn btn-sm btn-outline-secondary" @click="loadData" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1"></i>
        Refresh
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-2">
          <div class="small text-muted">Kode Aktif</div>
          <div class="fs-4 fw-bold text-success">{{ kodeData.active.length }}</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center p-2">
          <div class="small text-muted">Sudah Mutasi</div>
          <div class="fs-4 fw-bold text-secondary">{{ kodeData.mutated.length }}</div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-info" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data kode...</p>
    </div>

    <template v-else>
      <!-- Tabs -->
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item">
          <button
            class="nav-link"
            :class="activeTab === 'active' ? 'active fw-semibold' : ''"
            @click="
              activeTab = 'active';
              selectedIds.clear();
            "
          >
            Aktif
            <span class="badge bg-success ms-1">{{ kodeData.active.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button
            class="nav-link"
            :class="activeTab === 'mutated' ? 'active fw-semibold' : ''"
            @click="
              activeTab = 'mutated';
              selectedIds.clear();
            "
          >
            Sudah Mutasi
            <span class="badge bg-secondary ms-1">{{ kodeData.mutated.length }}</span>
          </button>
        </li>
      </ul>

      <div class="card border-0 shadow-sm rounded-0 rounded-bottom">
        <!-- Batch toolbar -->
        <div
          v-if="activeTab === 'active' && selectedIds.size > 0"
          class="card-header bg-warning bg-opacity-25 d-flex align-items-center gap-2 py-2"
        >
          <span class="fw-semibold small">{{ selectedIds.size }} kode dipilih</span>
          <button class="btn btn-warning btn-sm ms-auto" @click="openBatchModal">
            <i class="bi bi-arrow-left-right me-1"></i>
            Mutasi Terpilih
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="selectedIds.clear()">Batal Pilih</button>
        </div>

        <!-- Search -->
        <div class="card-body pb-0 pt-2">
          <input
            v-model="searchText"
            type="search"
            class="form-control form-control-sm"
            placeholder="Cari kode atau nama barang..."
            style="max-width: 300px"
          />
        </div>

        <!-- Table -->
        <div class="card-body p-0 mt-2">
          <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
              <thead class="table-light">
                <tr>
                  <th v-if="activeTab === 'active'" style="width: 40px" class="text-center">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="allSelected"
                      :indeterminate.prop="someSelected"
                      @change="toggleAll"
                    />
                  </th>
                  <th style="width: 42px">#</th>
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Jenis</th>
                  <th>Kadar</th>
                  <th>Tgl Input</th>
                  <th v-if="activeTab === 'mutated'">Tgl Mutasi</th>
                  <th v-if="activeTab === 'mutated'">Keterangan</th>
                  <th v-if="activeTab === 'active'" class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="filteredList.length === 0">
                  <td :colspan="activeTab === 'active' ? 8 : 8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox display-6 d-block mb-2 opacity-25"></i>
                    Tidak ada data.
                  </td>
                </tr>
                <tr
                  v-for="(item, idx) in filteredList"
                  :key="item.id"
                  :class="selectedIds.has(item.id) ? 'table-warning' : ''"
                >
                  <td v-if="activeTab === 'active'" class="text-center align-middle">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="selectedIds.has(item.id)"
                      @change="toggleSelect(item.id)"
                    />
                  </td>
                  <td class="text-muted small align-middle">{{ idx + 1 }}</td>
                  <td class="fw-semibold align-middle">{{ item.kode }}</td>
                  <td class="align-middle">{{ item.nama }}</td>
                  <td class="align-middle">
                    <span class="badge bg-info text-dark">{{ item.jenisNama }}</span>
                  </td>
                  <td class="align-middle">{{ item.kadar }}</td>
                  <td class="small text-muted align-middle">{{ item.tanggalInput }}</td>
                  <td v-if="activeTab === 'mutated'" class="small text-muted align-middle">
                    {{ item.tanggalMutasi ?? "-" }}
                  </td>
                  <td v-if="activeTab === 'mutated'" class="small align-middle">
                    {{ item.mutasiKeterangan }}
                  </td>
                  <td v-if="activeTab === 'active'" class="text-center align-middle">
                    <button class="btn btn-warning btn-sm" @click="openSingleModal(item)">
                      <i class="bi bi-arrow-left-right me-1"></i>
                      Mutasi
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Mutasi Modal ── -->
    <div class="modal fade" id="mutasiModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-arrow-left-right me-2 text-warning"></i>
              {{ batchMode ? `Mutasi ${selectedIds.size} Kode` : `Mutasi — ${selectedItem?.kode}` }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div v-if="!batchMode && selectedItem" class="alert alert-warning py-2 small mb-3">
              <strong>{{ selectedItem.kode }}</strong>
              — {{ selectedItem.nama }}
              <br />
              <span class="text-muted">{{ selectedItem.jenisNama }} · {{ selectedItem.kadar }}</span>
            </div>
            <div v-else-if="batchMode" class="alert alert-warning py-2 small mb-3">
              {{ selectedIds.size }} kode akan dimutasi sekaligus.
            </div>
            <label class="form-label small fw-semibold">
              Keterangan Mutasi
              <span class="text-danger">*</span>
            </label>
            <input
              v-model="mutasiKeterangan"
              type="text"
              class="form-control form-control-sm"
              placeholder="Contoh: dijual, hilang, rusak..."
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveMutasi" :disabled="mutating">
              <span v-if="mutating" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-circle me-1"></i>
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { fetchKodeData, mutateSingle, mutateBatch } from "@/services/mutasi-service";

const { toast, error: showError } = useAlert();

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const mutating = ref(false);
const activeTab = ref("active");
const searchText = ref("");
const kodeData = ref({ active: [], mutated: [] });

// Selection (reactive Set)
const selectedIds = reactive(new Set());

// Mutasi modal
const selectedItem = ref(null);
const batchMode = ref(false);
const mutasiKeterangan = ref("");

// ── Computed ──────────────────────────────────────────────────────────────
const filteredList = computed(() => {
  const list = activeTab.value === "active" ? kodeData.value.active : kodeData.value.mutated;
  if (!searchText.value.trim()) return list;
  const q = searchText.value.toLowerCase();
  return list.filter((i) => i.kode.toLowerCase().includes(q) || i.nama.toLowerCase().includes(q));
});

const allSelected = computed(
  () => filteredList.value.length > 0 && filteredList.value.every((i) => selectedIds.has(i.id)),
);
const someSelected = computed(() => filteredList.value.some((i) => selectedIds.has(i.id)) && !allSelected.value);

// ── Selection ─────────────────────────────────────────────────────────────
function toggleAll(e) {
  if (e.target.checked) {
    filteredList.value.forEach((i) => selectedIds.add(i.id));
  } else {
    selectedIds.clear();
  }
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
}

// ── Data Loading ──────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true;
  selectedIds.clear();
  try {
    kodeData.value = await fetchKodeData();
  } catch (e) {
    showError("Gagal memuat data kode", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Modals ────────────────────────────────────────────────────────────────
function openSingleModal(item) {
  selectedItem.value = item;
  batchMode.value = false;
  mutasiKeterangan.value = "";
  new Modal(document.getElementById("mutasiModal")).show();
}

function openBatchModal() {
  batchMode.value = true;
  mutasiKeterangan.value = "";
  new Modal(document.getElementById("mutasiModal")).show();
}

async function saveMutasi() {
  if (!mutasiKeterangan.value.trim()) return toast("Keterangan mutasi wajib diisi", "warning");

  mutating.value = true;
  try {
    if (batchMode.value) {
      await mutateBatch(Array.from(selectedIds), mutasiKeterangan.value.trim());
    } else {
      await mutateSingle(selectedItem.value.id, mutasiKeterangan.value.trim());
    }
    Modal.getInstance(document.getElementById("mutasiModal"))?.hide();
    toast("Mutasi berhasil disimpan");
    await loadData();
  } catch (e) {
    showError("Gagal menyimpan mutasi", e.message);
  } finally {
    mutating.value = false;
  }
}

onMounted(loadData);
</script>
