<template>
  <div class="container-fluid py-3">
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-arrow-left-right me-2 text-dark"></i>
        Kalkulator Buyback
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/inventory/manajemen">Inventory</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Buyback</li>
        </ol>
      </nav>
    </div>
    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-outline-secondary btn-sm" @click="openSettings">
        <i class="bi bi-gear me-1"></i>
        Pengaturan Persentase
      </button>
    </div>

    <!-- Input Table -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold small py-2">Data Barang</div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>#</th>
              <th>Kadar</th>
              <th>Nama Barang</th>
              <th>Kondisi</th>
              <th>Harga Beli/gr (Rp)</th>
              <th>Harga Hari Ini/gr (Rp)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td class="small">{{ i + 1 }}</td>
              <td>
                <select v-model="row.kadar" class="form-select form-select-sm" style="width: 80px">
                  <option v-for="k in KADAR_OPTIONS" :key="k" :value="k">{{ k }}</option>
                </select>
              </td>
              <td>
                <input v-model="row.namaBarang" type="text" class="form-control form-control-sm" style="width: 150px" />
              </td>
              <td>
                <select v-model="row.kondisiBarang" class="form-select form-select-sm" style="width: 90px">
                  <option value="1">K1</option>
                  <option value="2">K2</option>
                  <option value="3">K3</option>
                  <option value="4">K4</option>
                </select>
              </td>
              <td>
                <input
                  v-model.number="row.hargaBeli"
                  type="number"
                  class="form-control form-control-sm"
                  style="width: 130px"
                />
              </td>
              <td>
                <input
                  v-model.number="row.hargaHariIni"
                  type="number"
                  class="form-control form-control-sm"
                  style="width: 130px"
                />
              </td>
              <td>
                <button class="btn btn-outline-danger btn-sm" @click="removeRow(i)" :disabled="rows.length === 1">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-white d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="addRow">
          <i class="bi bi-plus-circle me-1"></i>
          Tambah Baris
        </button>
        <button class="btn btn-warning btn-sm" @click="calculate" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-calculator me-1"></i>
          Hitung Buyback
        </button>
      </div>
    </div>

    <!-- Condition Reference -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold small py-2">Referensi Kondisi</div>
      <div class="card-body">
        <div class="row g-2">
          <div v-for="cond in CONDITIONS" :key="cond.key" class="col-6 col-md-3">
            <div class="p-2 border rounded text-center">
              <div class="fw-bold text-warning">{{ cond.key }}</div>
              <div class="small text-muted">{{ cond.desc }}</div>
              <div class="small fw-semibold">{{ persentaseMap[cond.key] ? persentaseMap[cond.key] + "%" : "-" }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Modal -->
    <div class="modal fade" id="resultModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-warning">
            <h5 class="modal-title fw-bold small">Hasil Kalkulasi Buyback</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="text-muted small mb-3">{{ new Date().toLocaleString("id-ID") }}</div>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead class="table-light">
                  <tr>
                    <th>Barang</th>
                    <th>Kadar</th>
                    <th>Kondisi</th>
                    <th class="text-end">Harga Buyback</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in results" :key="i">
                    <td class="small">{{ r.namaBarang || "-" }}</td>
                    <td class="small">{{ r.kadar }}</td>
                    <td class="small">{{ r.kondisi }}</td>
                    <td class="text-end small fw-bold text-success">
                      {{ formatRp(r.buybackPrice) }}
                      <small class="text-muted">/gr</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-light btn-sm" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div class="modal fade" id="settingsModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title small fw-bold">Pengaturan Persentase</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div v-if="!settingsUnlocked">
              <label class="form-label small">Password</label>
              <input
                v-model="settingsPassword"
                type="password"
                class="form-control form-control-sm"
                @keydown.enter="unlockSettings"
              />
              <div v-if="settingsError" class="text-danger small mt-1">{{ settingsError }}</div>
              <button class="btn btn-warning btn-sm mt-2 w-100" @click="unlockSettings">Masuk</button>
            </div>
            <div v-else>
              <div v-for="cond in CONDITIONS" :key="cond.key" class="mb-2">
                <label class="form-label small">{{ cond.key }} — {{ cond.desc }} (%)</label>
                <input
                  v-model.number="editPersentase[cond.key]"
                  type="number"
                  min="0"
                  max="100"
                  class="form-control form-control-sm"
                />
              </div>
            </div>
          </div>
          <div v-if="settingsUnlocked" class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveSettingsBuyback" :disabled="savingBuyback">
              <span v-if="savingBuyback" class="spinner-border spinner-border-sm me-1"></span>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Modal } from "bootstrap";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAlert } from "@/composables/useAlert";

const { error: showError } = useAlert();

const KADAR_OPTIONS = ["8K", "9K", "16K", "17K", "18K", "22K"];
const CONDITIONS = [
  { key: "K1", desc: "Kondisi Sangat Baik" },
  { key: "K2", desc: "Kondisi Baik" },
  { key: "K3", desc: "Kondisi Cukup" },
  { key: "K4", desc: "Kondisi Kurang" },
];

const loading = ref(false);
const savingBuyback = ref(false);
const settingsUnlocked = ref(false);
const settingsPassword = ref("");
const settingsError = ref("");
const persentaseMap = ref({ K1: 97, K2: 92, K3: 85, K4: 70 });
const editPersentase = ref({ K1: 97, K2: 92, K3: 85, K4: 70 });
const results = ref([]);

function defaultRow() {
  return { kadar: "18K", namaBarang: "", kondisiBarang: "1", hargaBeli: 0, hargaHariIni: 0 };
}

const rows = ref([defaultRow()]);

function addRow() {
  rows.value.push(defaultRow());
}
function removeRow(i) {
  if (rows.value.length > 1) rows.value.splice(i, 1);
}

function formatRp(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);
}

function calcBuybackPrice(row) {
  const pct = persentaseMap.value[`K${row.kondisiBarang}`] / 100;
  const base = row.hargaBeli > row.hargaHariIni ? row.hargaHariIni : row.hargaHariIni;
  let price = Math.round((base * pct) / 5000) * 5000;
  if (row.hargaBeli > row.hargaHariIni) price = row.hargaHariIni;
  return Math.max(price, row.hargaBeli * 0.5);
}

async function calculate() {
  loading.value = true;
  try {
    results.value = rows.value.map((row) => ({
      namaBarang: row.namaBarang,
      kadar: row.kadar,
      kondisi: `K${row.kondisiBarang}`,
      buybackPrice: calcBuybackPrice(row),
    }));
    Modal.getOrCreateInstance(document.getElementById("resultModal")).show();
  } finally {
    loading.value = false;
  }
}

function openSettings() {
  settingsUnlocked.value = false;
  settingsPassword.value = "";
  settingsError.value = "";
  editPersentase.value = { ...persentaseMap.value };
  Modal.getOrCreateInstance(document.getElementById("settingsModal")).show();
}

function unlockSettings() {
  if (settingsPassword.value === "smlt116") {
    settingsUnlocked.value = true;
    settingsError.value = "";
  } else {
    settingsError.value = "Password salah.";
  }
}

async function saveSettingsBuyback() {
  savingBuyback.value = true;
  try {
    await setDoc(doc(db, "setting_buyback", "default"), {
      K1: editPersentase.value.K1,
      K2: editPersentase.value.K2,
      K3: editPersentase.value.K3,
      K4: editPersentase.value.K4,
    });
    Object.assign(persentaseMap.value, editPersentase.value);
    Modal.getInstance(document.getElementById("settingsModal"))?.hide();
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    savingBuyback.value = false;
  }
}

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, "setting_buyback", "default"));
    if (snap.exists()) Object.assign(persentaseMap.value, snap.data());
  } catch {
    /* use defaults */
  }
});
</script>
