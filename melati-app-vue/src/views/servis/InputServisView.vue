<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-tools me-2 text-dark"></i>
        Input Servis
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/servis/input">Servis</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Input Servis</li>
        </ol>
      </nav>
    </div>

    <form @submit.prevent="submitForm">
      <!-- Basic Info -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold py-2">
          <span>
            <i class="bi bi-person me-1 text-dark"></i>
            Data Pelanggan
          </span>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-2">
              <label class="form-label small fw-semibold">
                Tanggal
                <span class="text-danger">*</span>
              </label>
              <input v-model="form.tanggal" type="date" class="form-control form-control-sm" required />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">
                Nama Sales
                <span class="text-danger">*</span>
              </label>
              <select v-model="form.namaSales" class="form-select form-select-sm" required>
                <option value="">Pilih...</option>
                <option v-for="s in salesOptions" :key="s.id" :value="s.nama">{{ s.nama }}</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">
                Nama Customer
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.namaCustomer"
                type="text"
                class="form-control form-control-sm"
                placeholder="Nama pelanggan"
                required
              />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">No HP</label>
              <input v-model="form.noHp" type="text" class="form-control form-control-sm" placeholder="08xxx" />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Jenis</label>
              <div class="d-flex gap-2 mt-1">
                <div class="form-check">
                  <input
                    id="jenis-servis"
                    v-model="form.jenisInput"
                    class="form-check-input"
                    type="radio"
                    value="servis"
                  />
                  <label class="form-check-label small" for="jenis-servis">Servis</label>
                </div>
                <div class="form-check">
                  <input
                    id="jenis-custom"
                    v-model="form.jenisInput"
                    class="form-check-input"
                    type="radio"
                    value="custom"
                  />
                  <label class="form-check-label small" for="jenis-custom">Custom</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Items Table — Servis mode -->
      <div v-if="form.jenisInput === 'servis'" class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-list-ul me-1 text-dark"></i>
            Detail Barang Servis
          </span>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="addServisRow">
            <i class="bi bi-plus me-1"></i>
            Tambah Baris
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px">Jml</th>
                  <th>Nama Barang</th>
                  <th style="width: 90px">Berat</th>
                  <th style="width: 80px">Karat</th>
                  <th style="width: 160px">
                    Jenis Servis
                    <span class="text-danger">*</span>
                  </th>
                  <th>Rincian</th>
                  <th style="width: 110px">Ongkos (Rp)</th>
                  <th style="width: 130px">Status Bayar</th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in form.servisRows" :key="idx">
                  <td>
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      min="1"
                      class="form-control form-control-sm text-center"
                    />
                  </td>
                  <td>
                    <input
                      v-model="row.namaBarang"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Nama barang"
                      required
                    />
                  </td>
                  <td>
                    <input v-model="row.berat" type="text" class="form-control form-control-sm" placeholder="gr/cm" />
                  </td>
                  <td>
                    <input v-model="row.karat" type="text" class="form-control form-control-sm" placeholder="22K" />
                  </td>
                  <td>
                    <div class="dropdown">
                      <button
                        class="form-select form-select-sm text-start w-100"
                        type="button"
                        :id="'dropdownServis-' + idx"
                        data-bs-toggle="dropdown"
                        data-bs-auto-close="outside"
                        data-bs-popper-config='{"strategy":"fixed"}'
                        aria-expanded="false"
                        :title="row.jenisServis || 'Pilih...'"
                      >
                        <span class="text-truncate d-inline-block" style="max-width: 110px;">
                          {{ getSelectedServisLabel(row.jenisServis) }}
                        </span>
                      </button>
                      <ul class="dropdown-menu p-2 shadow-sm" :aria-labelledby="'dropdownServis-' + idx" style="max-height: 250px; overflow-y: auto; min-width: 180px;">
                        <li v-for="option in JENIS_SERVIS_OPTIONS" :key="option" class="px-2 py-1">
                          <div class="form-check">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="'check-' + idx + '-' + option"
                              :checked="isServisOptionChecked(row.jenisServis, option)"
                              @change="toggleServisOption(row, option, $event.target.checked)"
                            />
                            <label class="form-check-label small w-100 mb-0" :for="'check-' + idx + '-' + option" style="cursor: pointer;">
                              {{ option }}
                            </label>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </td>
                  <td>
                    <input
                      v-model="row.rincianServis"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Keterangan"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="row.ongkos"
                      type="number"
                      min="0"
                      class="form-control form-control-sm"
                      @input="row.statusPembayaran = row.ongkos > 0 ? 'nominal' : 'free'"
                    />
                  </td>
                  <td>
                    <select v-model="row.statusPembayaran" class="form-select form-select-sm">
                      <option v-for="s in STATUS_PEMBAYARAN_OPTIONS" :key="s.value" :value="s.value">
                        {{ s.label }}
                      </option>
                    </select>
                  </td>
                  <td class="text-center">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click="removeServisRow(idx)"
                      :disabled="form.servisRows.length === 1"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr>
                  <td colspan="6" class="text-end fw-semibold">Total Ongkos:</td>
                  <td class="fw-bold text-success">Rp {{ totalOngkos.toLocaleString("id-ID") }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Items Table — Custom mode -->
      <div v-else class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-stars me-1 text-warning"></i>
            Detail Barang Custom
          </span>
          <button type="button" class="btn btn-sm btn-outline-primary" @click="addCustomRow">
            <i class="bi bi-plus me-1"></i>
            Tambah Baris
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px">Jml</th>
                  <th>Nama Barang</th>
                  <th style="width: 80px">Berat</th>
                  <th class="text-center" style="width: 80px">Size / Panjang</th>
                  <th style="width: 70px">Kadar</th>
                  <th style="width: 80px">Warna</th>
                  <th style="width: 110px">DP (Rp)</th>
                  <th style="width: 110px">Ongkos (Rp)</th>
                  <th style="width: 120px">Status Bayar</th>
                  <th>Rincian</th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in form.customRows" :key="idx">
                  <td>
                    <input
                      v-model.number="row.jumlah"
                      type="number"
                      min="1"
                      class="form-control form-control-sm text-center"
                    />
                  </td>
                  <td>
                    <input
                      v-model="row.namaBarang"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Nama barang"
                      required
                    />
                  </td>
                  <td>
                    <input v-model="row.berat" type="text" class="form-control form-control-sm" placeholder="gr" />
                  </td>
                  <td>
                    <input v-model="row.panjang" type="text" class="form-control form-control-sm" placeholder="cm" />
                  </td>
                  <td>
                    <input v-model="row.kadar" type="text" class="form-control form-control-sm" placeholder="22K" />
                  </td>
                  <td>
                    <input v-model="row.warna" type="text" class="form-control form-control-sm" placeholder="Kuning" />
                  </td>
                  <td>
                    <input v-model.number="row.totalDP" type="number" min="0" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="row.ongkos" type="number" min="0" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <select v-model="row.statusPembayaran" class="form-select form-select-sm">
                      <option v-for="s in STATUS_PEMBAYARAN_CUSTOM" :key="s.value" :value="s.value">
                        {{ s.label }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input
                      v-model="row.rincianServis"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Keterangan"
                    />
                  </td>
                  <td class="text-center">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click="removeCustomRow(idx)"
                      :disabled="form.customRows.length === 1"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr>
                  <td colspan="6" class="text-end fw-semibold">Total DP:</td>
                  <td class="fw-bold text-info">Rp {{ totalDP.toLocaleString("id-ID") }}</td>
                  <td colspan="3"></td>
                </tr>
                <tr>
                  <td colspan="7" class="text-end fw-semibold">Total Ongkos:</td>
                  <td class="fw-bold text-success">Rp {{ totalOngkos.toLocaleString("id-ID") }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-secondary btn-sm" @click="resetForm">
          <i class="bi bi-arrow-counterclockwise me-1"></i>
          Reset
        </button>
        <button type="submit" class="btn btn-warning btn-sm" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan & Cetak
        </button>
      </div>
    </form>

    <PrintFailedModal
      v-model="showPrintFailedModal"
      failed-title="Gagal Cetak Nota Servis"
      :message="printFailedMessage"
      @retry="retryPrintSlip"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  JENIS_SERVIS_OPTIONS,
  STATUS_PEMBAYARAN_OPTIONS,
  STATUS_PEMBAYARAN_CUSTOM,
  saveServis,
  printServisSlip,
} from "@/services/servis-service";
import { fetchSalesList } from "@/services/sales-service";
import PrintFailedModal from "@/components/common/PrintFailedModal.vue";

const { swal, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── Default row factories ──────────────────────────────────────────────────
const newServisRow = () => ({
  jumlah: 1,
  namaBarang: "",
  berat: "",
  karat: "",
  jenisServis: "",
  rincianServis: "",
  ongkos: 0,
  statusPembayaran: "nominal",
});

const newCustomRow = () => ({
  jumlah: 1,
  namaBarang: "",
  berat: "",
  panjang: "",
  kadar: "",
  warna: "",
  totalDP: 0,
  ongkos: 0,
  statusPembayaran: "nominal",
  rincianServis: "",
});

// ── State ─────────────────────────────────────────────────────────────────
const saving = ref(false);
const showPrintFailedModal = ref(false);
const printFailedMessage = ref("Pastikan printing service sudah dijalankan di komputer ini.");
const lastFailedPrintPayload = ref(null);
const form = ref({
  tanggal: todayStringWITA(),
  namaSales: "",
  namaCustomer: "",
  noHp: "",
  jenisInput: "servis",
  servisRows: [newServisRow()],
  customRows: [newCustomRow()],
});

const salesOptions = ref([]);

onMounted(async () => {
  try {
    const list = await fetchSalesList();
    salesOptions.value = list
      .filter((s) => (s.status || "active") === "active")
      .map((s) => ({ id: s.id, nama: s.nama }));
  } catch (e) {
    console.error("Failed loading sales list:", e?.message || e);
  }
});

// ── Computed ──────────────────────────────────────────────────────────────
const totalOngkos = computed(() => {
  const rows = form.value.jenisInput === "servis" ? form.value.servisRows : form.value.customRows;
  return rows.reduce((s, r) => s + (Number(r.ongkos) || 0), 0);
});

const totalDP = computed(() => {
  if (form.value.jenisInput !== "custom") return 0;
  return form.value.customRows.reduce((s, r) => s + (Number(r.totalDP) || 0), 0);
});

// ── Row management ────────────────────────────────────────────────────────
function addServisRow() {
  form.value.servisRows.push(newServisRow());
}
function removeServisRow(idx) {
  form.value.servisRows.splice(idx, 1);
}
function addCustomRow() {
  form.value.customRows.push(newCustomRow());
}
function removeCustomRow(idx) {
  form.value.customRows.splice(idx, 1);
}

// ── Submit ────────────────────────────────────────────────────────────────
async function submitForm() {
  saving.value = true;
  try {
    const isServis = form.value.jenisInput === "servis";
    const rows = isServis ? form.value.servisRows : form.value.customRows;

    // Validate rows
    for (const row of rows) {
      if (!row.namaBarang.trim()) return swal("Nama barang wajib diisi", "warning");
      if (isServis && !row.jenisServis) return swal("Jenis servis wajib dipilih", "warning");
    }

    const firstItem = rows[0];
    const data = {
      tanggal: form.value.tanggal,
      namaSales: form.value.namaSales,
      namaCustomer: form.value.namaCustomer,
      noHp: form.value.noHp,
      jenisInput: form.value.jenisInput,
      namaBarang: firstItem.namaBarang,
      ongkos: totalOngkos.value,
      totalOngkos: totalOngkos.value,
    };

    if (isServis) {
      data.detailBarang = form.value.servisRows.map((r) => ({ ...r }));
      data.jenisServis = firstItem.jenisServis;
      data.berat = firstItem.berat;
      data.karat = firstItem.karat;
    } else {
      data.detailBarangCustom = form.value.customRows.map((r) => ({ ...r }));
      data.totalDP = totalDP.value;
    }

    const newId = await saveServis(data);

    swal("Servis berhasil disimpan");
    resetForm();

    // Print via printing-service only — no browser fallback
    try {
      await printServisSlip({ id: newId, ...data });
      lastFailedPrintPayload.value = null;
    } catch (e) {
      lastFailedPrintPayload.value = { id: newId, ...data };
      printFailedMessage.value = e?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
      showPrintFailedModal.value = true;
    }
  } catch (e) {
    showError("Gagal menyimpan servis", e.message);
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  form.value = {
    tanggal: todayStringWITA(),
    namaSales: form.value.namaSales, // keep namaSales for convenience
    namaCustomer: "",
    noHp: "",
    jenisInput: "servis",
    servisRows: [newServisRow()],
    customRows: [newCustomRow()],
  };
}

async function retryPrintSlip() {
  const payload = lastFailedPrintPayload.value;
  if (!payload) return;

  showPrintFailedModal.value = false;
  try {
    await printServisSlip(payload);
    lastFailedPrintPayload.value = null;
    swal("Nota servis dikirim ke printer", "success");
  } catch (e) {
    printFailedMessage.value = e?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
    showPrintFailedModal.value = true;
  }
}

// ── Dropdown helpers for multiple servis types ─────────────────────────────
function getSelectedServisLabel(jenisServis) {
  if (!jenisServis) return "Pilih...";
  return jenisServis;
}

function isServisOptionChecked(jenisServis, option) {
  if (!jenisServis) return false;
  return jenisServis.split(",").map((s) => s.trim()).includes(option);
}

function toggleServisOption(row, option, isChecked) {
  let selected = row.jenisServis ? row.jenisServis.split(",").map((s) => s.trim()) : [];
  if (isChecked) {
    if (!selected.includes(option)) {
      selected.push(option);
    }
  } else {
    selected = selected.filter((s) => s !== option);
  }
  
  // Sort based on canon order in JENIS_SERVIS_OPTIONS
  selected.sort((a, b) => {
    return JENIS_SERVIS_OPTIONS.indexOf(a) - JENIS_SERVIS_OPTIONS.indexOf(b);
  });
  
  row.jenisServis = selected.join(", ");
}
</script>
