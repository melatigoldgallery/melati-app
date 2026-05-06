<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-plus-circle me-2 text-dark"></i>
        Tambah Barang Aksesoris
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Tambah Barang</li>
        </ol>
      </nav>
    </div>

    <!-- Card 1: Data Aksesoris -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
        <span class="fw-semibold">
          <i class="bi bi-boxes me-2 text-primary"></i>
          Data Aksesoris
        </span>
        <div class="d-flex gap-2 flex-wrap">
          <button @click="openKelolaKode" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-pencil-square me-1"></i>
            Edit Kode
          </button>
          <button
            v-if="!isL2Floor"
            @click="openPrintQrModal"
            :disabled="form.jenis !== 'silver' || isLoadingCodes"
            class="btn btn-outline-success btn-sm"
          >
            <i class="bi bi-upc-scan me-1"></i>
            Cetak QR Silver
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Tanggal
              <span class="text-danger">*</span>
            </label>
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-calendar3"></i></span>
              <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">
              Jenis Aksesoris
              <span class="text-danger">*</span>
            </label>
            <select v-model="form.jenis" class="form-select form-select-sm" @change="onJenisChange">
              <option value="">-- Pilih Jenis --</option>
              <option value="kotak">Kotak Perhiasan</option>
              <option value="aksesoris">Aksesoris Perhiasan</option>
              <option v-if="!isL2Floor" value="silver">Silver</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 2: Detail Barang -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
        <span class="fw-semibold small">
          <i class="bi bi-list-ul me-1 text-primary"></i>
          Detail Barang
        </span>
        <button @click="addRow" :disabled="!form.jenis" class="btn btn-outline-primary btn-sm">
          <i class="bi bi-plus-lg me-1"></i>
          Tambah
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-bordered mb-0" id="tableTambahAksesoris">
            <thead class="table-light">
              <tr>
                <th style="width: 42px">No</th>
                <th style="width: 220px">Kode Barang</th>
                <th>Nama Barang</th>
                <th style="width: 120px">Jumlah</th>
                <th style="width: 60px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in inputRows" :key="idx">
                <td class="text-center text-muted small align-middle">{{ idx + 1 }}</td>
                <td>
                  <select
                    v-model="row.kode"
                    class="form-select form-select-sm kode-barang"
                    @change="onKodeChange(row)"
                    :disabled="isLoadingCodes || !form.jenis"
                  >
                    <option value="">{{ isLoadingCodes ? "Memuat..." : "-- Pilih Kode --" }}</option>
                    <option
                      v-for="item in kodeCatalog"
                      :key="item.id"
                      :value="item.kode || item.text"
                      :data-nama="item.nama"
                    >
                      {{ item.kode || item.text }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    v-model="row.nama"
                    type="text"
                    class="form-control form-control-sm nama-barang"
                    readonly
                    placeholder="Otomatis"
                  />
                </td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    class="form-control form-control-sm jumlah-barang"
                    min="1"
                    placeholder="0"
                  />
                </td>
                <td class="text-center align-middle">
                  <button
                    v-if="inputRows.length > 1"
                    @click="removeRow(idx)"
                    class="btn btn-sm btn-outline-danger py-0 px-1"
                    title="Hapus baris"
                  >
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="table-light fw-semibold">
                <td colspan="3" class="text-end small">Total Item:</td>
                <td class="small">{{ totalJumlah }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="card-footer bg-white border-top d-flex gap-2 py-2">
        <button @click="simpanData" :disabled="isSaving" class="btn btn-primary btn-sm">
          <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan Data
        </button>
        <button @click="resetForm" class="btn btn-secondary btn-sm">
          <i class="bi bi-x-circle me-1"></i>
          Batal
        </button>
      </div>
    </div>

    <!-- Card 3: Riwayat Penambahan Stok -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white border-bottom py-2">
        <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <span class="fw-semibold small">
            <i class="bi bi-clock-history me-1"></i>
            Riwayat Penambahan Stok
          </span>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <input v-model="histStart" type="date" class="form-control form-control-sm" style="width: 145px" />
            <span class="text-muted small">s/d</span>
            <input v-model="histEnd" type="date" class="form-control form-control-sm" style="width: 145px" />
            <button @click="loadHistory" class="btn btn-tampilkan btn-sm">
              <i class="bi bi-search me-1"></i>
              Tampilkan
            </button>
            <button @click="printLaporan" :disabled="!history.length" class="btn btn-outline-secondary btn-sm">
              <i class="bi bi-printer me-1"></i>
              Print
            </button>
            <button @click="exportExcel" :disabled="!history.length" class="btn btn-outline-success btn-sm">
              <i class="bi bi-file-earmark-excel me-1"></i>
              Excel
            </button>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div v-if="histLoading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!history.length" class="text-center py-4 text-muted small">
          <i class="bi bi-inbox display-6 d-block mb-1 opacity-25"></i>
          Belum ada riwayat
        </div>
        <div v-else class="table-responsive">
          <table class="table table-sm table-hover mb-0" id="tableRiwayatTambahStok">
            <thead class="table-light sticky-top">
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th class="text-center">Jumlah</th>
                <th class="text-center" style="width: 50px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(h, idx) in history" :key="h.id">
                <td class="small text-muted">{{ idx + 1 }}</td>
                <td class="small">{{ h.tanggal }}</td>
                <td class="small fw-semibold text-primary">{{ h.kode }}</td>
                <td class="small">{{ h.nama }}</td>
                <td class="small text-center">{{ h.jumlah }}</td>
                <td class="text-center">
                  <button @click="openHapusTransaksi(h)" class="btn btn-sm btn-outline-danger py-0 px-1" title="Hapus">
                    <i class="bi bi-trash3 small"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── Modal: Kelola Kode ── -->
    <!-- ── Modal: Cetak QR Silver ── -->
    <div class="modal fade" id="modalPrintQrSilver" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-upc-scan me-2"></i>
              Cetak QR Silver (SBPL Mode)
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info small mb-3" role="alert">
              <i class="bi bi-lightning-charge me-2"></i>
              <strong>Mode SBPL Aktif:</strong>
              Lebih cepat (100-200ms) dan efisien - native SATO printer command
            </div>
            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Printer Label</label>
                <select v-model="selectedPrinter" class="form-select form-select-sm" :disabled="isLoadingPrinters">
                  <option value="">
                    {{ isLoadingPrinters ? "Memuat printer..." : "Gunakan default printer label" }}
                  </option>
                  <option v-for="p in printerOptions" :key="p.name" :value="p.name">
                    {{ p.name }}{{ p.isDefault ? " (Default)" : "" }}
                  </option>
                </select>
              </div>
              <div class="col-md-6 d-flex align-items-end">
                <div class="small text-muted">Ukuran label: 2.4 cm x 2.4 cm</div>
              </div>
            </div>
            <div v-if="isLoadingCodes" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
            <div v-else>
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Kadar</th>
                      <th>Berat</th>
                      <th style="width: 120px">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in printRows" :key="r.kode + '-' + i">
                      <td class="small fw-semibold">{{ r.kode }}</td>
                      <td class="small">{{ r.nama }}</td>
                      <td class="small">{{ r.kadar || "-" }}</td>
                      <td class="small">{{ r.berat || "-" }}</td>
                      <td>
                        <input type="number" class="form-control form-control-sm" min="0" v-model.number="r.qty" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Tutup</button>
            <button @click="printQr" :disabled="isPrinting" class="btn btn-success btn-sm">
              <span v-if="isPrinting" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-printer me-1"></i>
              Cetak QR (SBPL)
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      class="modal fade"
      id="modalKelolaKode"
      tabindex="-1"
      aria-labelledby="modalKelolaKodeLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold" id="modalKelolaKodeLabel">
              <i class="bi bi-tags me-2"></i>
              Kelola Kode Barang
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <ul class="nav nav-tabs mb-3">
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeKodeTab === 'kotak' }"
                  @click="onKodeTabChange('kotak')"
                >
                  Kotak
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeKodeTab === 'aksesoris' }"
                  @click="onKodeTabChange('aksesoris')"
                >
                  Aksesoris
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeKodeTab === 'silver' }"
                  @click="onKodeTabChange('silver')"
                >
                  Silver
                </button>
              </li>
            </ul>
            <div class="d-flex gap-2 mb-2">
              <input
                v-model="kodeSearch"
                type="text"
                class="form-control form-control-sm"
                :placeholder="`Cari kode ${activeKodeTab}...`"
              />
              <button @click="openTambahKode" class="btn btn-primary btn-sm text-nowrap">
                <i class="bi bi-plus-lg me-1"></i>
                Tambah Kode
              </button>
            </div>
            <div v-if="isLoadingKode" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
            <div v-else-if="!filteredKodeList.length" class="text-center py-3 text-muted small">
              Belum ada kode untuk kategori ini.
            </div>
            <div v-else class="table-responsive" style="max-height: 350px; overflow-y: auto">
              <table class="table table-sm table-bordered mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th>No</th>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th v-if="activeKodeTab === 'kotak'">Harga</th>
                    <th v-if="activeKodeTab === 'silver'">Kadar</th>
                    <th v-if="activeKodeTab === 'silver'">Berat</th>
                    <th class="text-center" style="width: 80px">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(k, i) in filteredKodeList" :key="k.id">
                    <td class="small text-muted">{{ i + 1 }}</td>
                    <td class="small fw-semibold">{{ k.kode || k.text }}</td>
                    <td class="small">{{ k.nama }}</td>
                    <td v-if="activeKodeTab === 'kotak'" class="small">{{ k.harga || "-" }}</td>
                    <td v-if="activeKodeTab === 'silver'" class="small">{{ k.kadar || "-" }}</td>
                    <td v-if="activeKodeTab === 'silver'" class="small">{{ k.berat || "-" }}</td>
                    <td class="text-center">
                      <button
                        @click="openEditKode(k)"
                        class="btn btn-sm btn-outline-primary py-0 px-1 me-1"
                        title="Edit"
                      >
                        <i class="bi bi-pencil small"></i>
                      </button>
                      <button @click="openHapusKode(k)" class="btn btn-sm btn-outline-danger py-0 px-1" title="Hapus">
                        <i class="bi bi-trash3 small"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Form Kode ── -->
    <div class="modal fade" id="modalFormKode" tabindex="-1" aria-labelledby="modalFormKodeLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold" id="modalFormKodeLabel">
              <i class="bi bi-tag me-2"></i>
              {{ kodeFormMode === "add" ? "Tambah" : "Edit" }} Kode {{ activeKodeTab }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label small fw-semibold">
                Kode Barang
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="kodeForm.kode"
                type="text"
                class="form-control form-control-sm text-uppercase"
                :readonly="kodeFormMode === 'edit'"
                placeholder="Masukkan kode"
                autocomplete="off"
              />
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">
                Nama Barang
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="kodeForm.nama"
                type="text"
                class="form-control form-control-sm"
                placeholder="Masukkan nama barang"
                autocomplete="off"
              />
            </div>
            <div v-if="activeKodeTab === 'silver'" class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label small fw-semibold">Kadar</label>
                <input v-model="kodeForm.kadar" type="text" class="form-control form-control-sm" placeholder="Kadar" />
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">Berat (gr)</label>
                <input v-model="kodeForm.berat" type="text" class="form-control form-control-sm" placeholder="Berat" />
              </div>
            </div>
            <div v-if="activeKodeTab === 'kotak'" class="mb-3">
              <label class="form-label small fw-semibold">Harga</label>
              <input v-model="kodeForm.harga" type="number" class="form-control form-control-sm" placeholder="Harga" />
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button @click="simpanKode" :disabled="isKodeSaving" class="btn btn-primary btn-sm">
              <span v-if="isKodeSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Hapus Kode ── -->
    <div class="modal fade" id="modalHapusKode" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Hapus Kode
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body small">
            Hapus kode
            <strong>{{ deleteKodeTarget?.kode || deleteKodeTarget?.text }}</strong>
            ({{ deleteKodeTarget?.nama }})? Tindakan ini tidak dapat dibatalkan.
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button @click="hapusKode" :disabled="isKodeDeleting" class="btn btn-danger btn-sm">
              <span v-if="isKodeDeleting" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash3 me-1"></i>
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Modal: Hapus Transaksi ── -->
    <div class="modal fade" id="modalHapusTransaksi" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Hapus Transaksi
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body small">
            <p class="mb-2">
              Hapus transaksi kode
              <strong>{{ deleteTarget?.kode }}</strong>
              ({{ deleteTarget?.nama }}) sejumlah
              <strong>{{ deleteTarget?.jumlah }}</strong>
              ? Stok akan dikurangi kembali.
            </p>
            <div class="mb-1">
              <label class="form-label small fw-semibold">
                Kode Akses Hapus Riwayat Tambah Barang
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="deleteTxAccessCode"
                type="password"
                class="form-control form-control-sm"
                placeholder="Masukkan kode akses"
              />
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button @click="hapusTransaksi" :disabled="isDeleteTxSaving" class="btn btn-danger btn-sm">
              <span v-if="isDeleteTxSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash3 me-1"></i>
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  increment,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { floorCollection, floorDoc, floorSubCollection, floorSegmentsWithFloorId } from "@/services/floor-scope";
import { Modal } from "bootstrap";
import { db } from "@/config/firebase";
import { useAccessoriesStore } from "@/stores/accessories";
import { addStock, fetchKodesByKategori, verifyDeleteTambahBarangPassword } from "@/services/stock-service";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { useAuthStore } from "@/stores/auth";

const store = useAccessoriesStore();
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");
const { swal, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

// ── Form ─────────────────────────────────────────────────────────────────────
const form = ref({ tanggal: todayStringWITA(), jenis: "" });

// ── Kode Catalog (dari kodeAksesoris/kategori/{jenis}) ───────────────────────
const kodeCatalog = ref([]);
const isLoadingCodes = ref(false);
const printerOptions = ref([]);
const isLoadingPrinters = ref(false);
const selectedPrinter = ref("");
const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

// ── Print QR Silver ─────────────────────────────────────────────────────────
const printRows = ref([]);
const isPrinting = ref(false);
let printModal = null;

async function loadPrinters() {
  isLoadingPrinters.value = true;
  try {
    const res = await fetch(`${PRINT_BASE}/api/printers`);
    const data = await res.json();
    if (res.ok && data?.success) {
      printerOptions.value = Array.isArray(data.printers) ? data.printers : [];
      selectedPrinter.value =
        data?.config?.label || data?.config?.default || printerOptions.value.find((p) => p.isDefault)?.name || "";
    }
  } catch (e) {
    // keep default empty so service can use configured label printer
    printerOptions.value = [];
  } finally {
    isLoadingPrinters.value = false;
  }
}

function openPrintQrModal() {
  if (form.value.jenis !== "silver") {
    swal("Hanya untuk silver", "Pilih jenis 'silver' terlebih dahulu.", "warning");
    return;
  }
  if (!printerOptions.value.length && !isLoadingPrinters.value) {
    loadPrinters();
  }
  // Build rows from kodeCatalog
  printRows.value = (kodeCatalog.value || []).map((k) => ({
    kode: k.kode || k.text || "",
    nama: k.nama || "",
    kadar: k.kadar || "",
    berat: k.berat || "",
    qty: 0,
  }));
  if (!printModal) printModal = new Modal(document.getElementById("modalPrintQrSilver"));
  printModal.show();
}

async function printQr() {
  const toPrint = printRows.value
    .filter((r) => r.qty && r.qty > 0)
    .map((r) => ({ kode: r.kode, nama: r.nama, kadar: r.kadar, berat: r.berat, qty: r.qty }));
  if (!toPrint.length) {
    swal("Tidak ada label", "Masukkan qty > 0 pada minimal satu kode.", "warning");
    return;
  }

  isPrinting.value = true;
  try {
    const payload = {
      printer: selectedPrinter.value || undefined,
      labels: toPrint,
    };
    // Use SBPL endpoint (10-50x faster, native SATO format, minimal resource usage)
    const url = `${PRINT_BASE}/api/print/qr-sbpl`;
    const controllerFetch = new AbortController();
    const timeout = setTimeout(() => controllerFetch.abort(), 30000);
    const respFetch = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controllerFetch.signal,
    });
    clearTimeout(timeout);
    const resp = await respFetch.json().catch(() => null);
    if (respFetch.ok && resp && resp.success) {
      swal("Terkirim", `Job ${resp.jobID} - SBPL (${resp.performance?.estimatedSpeed || "cepat"})`, "success");
      printModal.hide();
    } else {
      showError("Gagal print", (resp && resp.error) || `HTTP ${respFetch.status}`);
    }
  } catch (e) {
    showError("Gagal print", e.message || e.toString());
  } finally {
    isPrinting.value = false;
  }
}

async function loadKodeCatalog(jenis) {
  if (!jenis) {
    kodeCatalog.value = [];
    return;
  }
  isLoadingCodes.value = true;
  try {
    kodeCatalog.value = await fetchKodesByKategori(jenis);
  } catch (e) {
    showError("Gagal memuat kode", e.message);
  } finally {
    isLoadingCodes.value = false;
  }
}

// ── Input Rows ───────────────────────────────────────────────────────────────
function defaultRow() {
  return { kode: "", nama: "", jumlah: null };
}
const inputRows = ref([defaultRow()]);
const totalJumlah = computed(() => inputRows.value.reduce((s, r) => s + (r.jumlah || 0), 0));

function onJenisChange() {
  inputRows.value = [defaultRow()];
  loadKodeCatalog(form.value.jenis);
}

function onKodeChange(row) {
  const item = kodeCatalog.value.find((c) => (c.kode || c.text) === row.kode);
  row.nama = item ? item.nama : "";
}

function addRow() {
  inputRows.value.push(defaultRow());
}
function removeRow(idx) {
  inputRows.value.splice(idx, 1);
}

// ── Simpan Data ──────────────────────────────────────────────────────────────
const isSaving = ref(false);

async function simpanData() {
  if (!form.value.tanggal || !form.value.jenis) {
    showError("Data Belum Lengkap", "Tanggal dan jenis aksesoris harus diisi.");
    return;
  }
  const validRows = inputRows.value.filter((r) => r.kode && r.jumlah > 0);
  if (!validRows.length) {
    showError("Data Kosong", "Tambahkan minimal satu baris dengan kode dan jumlah.");
    return;
  }

  const kasir = authStore.currentUser?.displayName || authStore.currentUser?.email || "-";
  const items = validRows.map((r) => ({
    kode: r.kode,
    nama: r.nama,
    jumlah: r.jumlah,
    kategori: form.value.jenis,
  }));

  isSaving.value = true;
  try {
    await addStock(items, { tanggal: form.value.tanggal, kasir });
    await Promise.all(items.map((i) => store.refreshSingleStock(i.kode)));
    store.notifyStockChanged(items.map((i) => i.kode));
    swal(`${items.reduce((s, i) => s + i.jumlah, 0)} item berhasil ditambahkan`);
    resetForm();
    await loadHistory();
  } catch (e) {
    showError("Gagal Menyimpan", e.message);
  } finally {
    isSaving.value = false;
  }
}

function resetForm() {
  form.value = { tanggal: todayStringWITA(), jenis: "" };
  inputRows.value = [defaultRow()];
  kodeCatalog.value = [];
}

// ── Riwayat ──────────────────────────────────────────────────────────────────
const histStart = ref(todayStringWITA());
const histEnd = ref(todayStringWITA());
const history = ref([]);
const histLoading = ref(false);

async function loadHistory() {
  if (!histStart.value || !histEnd.value) {
    history.value = [];
    return;
  }
  histLoading.value = true;
  try {
    // ✅ Sama seperti tambahAksesoris.js: query by jenis equality + orderBy timestamp
    // Menggunakan composite index (jenis, timestamp) yang sudah ada — tidak perlu index baru
    // Filter tanggal dilakukan client-side (format YYYY-MM-DD → string comparison valid)
    const snap = await getDocs(
      query(
        floorCollection(db, "stokAksesorisTransaksi", activeFloor.value),
        where("jenis", "==", "tambah"),
        orderBy("timestamp", "desc"),
        limit(1000),
      ),
    );
    const start = histStart.value; // YYYY-MM-DD
    const end = histEnd.value; // YYYY-MM-DD
    history.value = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.tanggal && d.tanggal >= start && d.tanggal <= end);
  } catch (e) {
    showError("Gagal memuat riwayat", e.message);
  } finally {
    histLoading.value = false;
  }
}

// ── Print Laporan ─────────────────────────────────────────────────────────────
function printLaporan() {
  if (!history.value.length) return;
  const rows = history.value
    .map(
      (h, i) => `<tr>
        <td>${i + 1}</td>
        <td>${h.tanggal}</td>
        <td>${h.kode}</td>
        <td>${h.nama || "-"}</td>
        <td style="text-align:center">${h.jumlah}</td>
      </tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><title>Laporan Penambahan Stok</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px}
    th{background:#f0f0f0}h3{margin-bottom:8px}</style></head>
    <body><h3>Riwayat Penambahan Stok Aksesoris</h3>
    <p>Periode: ${histStart.value} s/d ${histEnd.value}</p>
    <table><thead><tr><th>No</th><th>Tanggal</th><th>Kode Barang</th><th>Nama Barang</th><th>Jumlah</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    showError("Pop-up Diblokir", "Izinkan pop-up untuk mencetak laporan.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}

// ── Export Excel (CSV) ───────────────────────────────────────────────────────
function exportExcel() {
  if (!history.value.length) return;
  const headers = ["No", "Tanggal", "Kode Barang", "Nama Barang", "Jumlah"];
  const rows = history.value.map((h, i) => [
    i + 1,
    h.tanggal,
    h.kode,
    `"${(h.nama || "").replace(/"/g, '""')}"`,
    h.jumlah,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `tambah-stok-${histStart.value}-sd-${histEnd.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Hapus Transaksi ──────────────────────────────────────────────────────────
const deleteTarget = ref(null);
const isDeleteTxSaving = ref(false);
const deleteTxAccessCode = ref("");
let deleteModal = null;

function openHapusTransaksi(h) {
  deleteTarget.value = h;
  deleteTxAccessCode.value = "";
  if (!deleteModal) deleteModal = new Modal(document.getElementById("modalHapusTransaksi"));
  deleteModal.show();
}

async function hapusTransaksi() {
  if (!deleteTxAccessCode.value) {
    swal("Kode akses wajib diisi", "warning");
    return;
  }

  isDeleteTxSaving.value = true;
  try {
    const valid = await verifyDeleteTambahBarangPassword(deleteTxAccessCode.value);
    if (!valid) {
      swal("Kode akses salah", "error");
      return;
    }

    await runTransaction(db, async (txn) => {
      const txRef = floorDoc(db, "stokAksesorisTransaksi", deleteTarget.value.id, activeFloor.value);
      const stockRef = floorDoc(db, "stokAksesoris", deleteTarget.value.kode, activeFloor.value);
      const [txSnap, stockSnap] = await Promise.all([txn.get(txRef), txn.get(stockRef)]);
      if (!txSnap.exists()) throw new Error("Transaksi tidak ditemukan");
      if (stockSnap.exists()) {
        txn.update(stockRef, { stok: increment(-deleteTarget.value.jumlah), updatedAt: serverTimestamp() });
      }
      txn.delete(txRef);
    });
    deleteModal.hide();
    swal("Transaksi berhasil dihapus");
    await loadHistory();
  } catch (e) {
    showError("Gagal menghapus transaksi", e.message);
  } finally {
    isDeleteTxSaving.value = false;
  }
}

// ── Kelola Kode ──────────────────────────────────────────────────────────────
const activeKodeTab = ref("kotak");
const kodeList = ref([]);
const isLoadingKode = ref(false);
const kodeSearch = ref("");

const filteredKodeList = computed(() => {
  const q = kodeSearch.value.toLowerCase();
  if (!q) return kodeList.value;
  return kodeList.value.filter(
    (k) => (k.kode || k.text || "").toLowerCase().includes(q) || (k.nama || "").toLowerCase().includes(q),
  );
});

let kelolaKodeModal = null;

function openKelolaKode() {
  if (!kelolaKodeModal) kelolaKodeModal = new Modal(document.getElementById("modalKelolaKode"));
  kelolaKodeModal.show();
  loadKodeBarang(activeKodeTab.value);
}

async function onKodeTabChange(tab) {
  activeKodeTab.value = tab;
  kodeSearch.value = "";
  await loadKodeBarang(tab);
}

async function loadKodeBarang(kategori) {
  isLoadingKode.value = true;
  try {
    kodeList.value = await fetchKodesByKategori(kategori);
  } catch (e) {
    showError("Gagal memuat kode", e.message);
  } finally {
    isLoadingKode.value = false;
  }
}

// ── Form Kode (Tambah / Edit) ─────────────────────────────────────────────────
const kodeFormMode = ref("add");
const kodeForm = ref({ id: null, kode: "", nama: "", kadar: "", berat: "", harga: "" });
const isKodeSaving = ref(false);
let formKodeModal = null;

function openTambahKode() {
  kodeFormMode.value = "add";
  kodeForm.value = { id: null, kode: "", nama: "", kadar: "", berat: "", harga: "" };
  if (!formKodeModal) formKodeModal = new Modal(document.getElementById("modalFormKode"));
  formKodeModal.show();
}

function openEditKode(k) {
  kodeFormMode.value = "edit";
  kodeForm.value = {
    id: k.id,
    kode: k.kode || k.text || "",
    nama: k.nama || "",
    kadar: k.kadar || "",
    berat: k.berat || "",
    harga: k.harga || "",
  };
  if (!formKodeModal) formKodeModal = new Modal(document.getElementById("modalFormKode"));
  formKodeModal.show();
}

async function simpanKode() {
  if (!kodeForm.value.kode.trim() || !kodeForm.value.nama.trim()) {
    showError("Data Tidak Lengkap", "Kode dan nama barang harus diisi.");
    return;
  }
  isKodeSaving.value = true;
  try {
    const data = {
      text: kodeForm.value.kode.trim().toUpperCase(),
      nama: kodeForm.value.nama.trim(),
      ...(activeKodeTab.value === "silver" ? { kadar: kodeForm.value.kadar, berat: kodeForm.value.berat } : {}),
      ...(activeKodeTab.value === "kotak" ? { harga: kodeForm.value.harga } : {}),
    };
    if (kodeFormMode.value === "add") {
      await addDoc(floorSubCollection(db, "kodeAksesoris", "kategori", activeKodeTab.value, activeFloor.value), data);
      // Inisialisasi stokAksesoris/{kode} jika belum ada, agar tambah barang
      // hanya perlu increment (tidak membuat dokumen baru = sesuai behavior lama)
      const kodeText = data.text;
      const stokRef = floorDoc(db, "stokAksesoris", kodeText, activeFloor.value);
      const stokSnap = await getDoc(stokRef);
      if (!stokSnap.exists()) {
        await setDoc(stokRef, {
          kode: kodeText,
          nama: data.nama,
          kategori: activeKodeTab.value,
          kadar: activeKodeTab.value === "silver" ? kodeForm.value.kadar || null : null,
          berat: activeKodeTab.value === "silver" ? kodeForm.value.berat || null : null,
          stok: 0,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      const { text: _text, ...updateData } = data;
      await updateDoc(
        doc(
          db,
          ...floorSegmentsWithFloorId(
            activeFloor.value,
            "kodeAksesoris",
            "kategori",
            activeKodeTab.value,
            kodeForm.value.id,
          ),
        ),
        updateData,
      );
    }
    formKodeModal.hide();
    swal("Kode berhasil disimpan");
    await loadKodeBarang(activeKodeTab.value);
    if (form.value.jenis === activeKodeTab.value) {
      await loadKodeCatalog(activeKodeTab.value);
    }
  } catch (e) {
    showError("Gagal menyimpan kode", e.message);
  } finally {
    isKodeSaving.value = false;
  }
}

// ── Hapus Kode ────────────────────────────────────────────────────────────────
const deleteKodeTarget = ref(null);
const isKodeDeleting = ref(false);
let deleteKodeModal = null;

function openHapusKode(k) {
  deleteKodeTarget.value = k;
  if (!deleteKodeModal) deleteKodeModal = new Modal(document.getElementById("modalHapusKode"));
  deleteKodeModal.show();
}

async function hapusKode() {
  isKodeDeleting.value = true;
  try {
    await deleteDoc(
      doc(
        db,
        ...floorSegmentsWithFloorId(
          activeFloor.value,
          "kodeAksesoris",
          "kategori",
          activeKodeTab.value,
          deleteKodeTarget.value.id,
        ),
      ),
    );
    deleteKodeModal.hide();
    swal("Kode berhasil dihapus");
    await loadKodeBarang(activeKodeTab.value);
    if (form.value.jenis === activeKodeTab.value) {
      await loadKodeCatalog(activeKodeTab.value);
    }
  } catch (e) {
    showError("Gagal menghapus kode", e.message);
  } finally {
    isKodeDeleting.value = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadPrinters();
  await loadHistory();
});
</script>
