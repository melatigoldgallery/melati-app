<template>
  <div class="card shadow-sm border-0 rounded-3 mb-4">
    <div class="card-header bg-white border-0 py-3">
      <div class="d-flex align-items-center justify-content-between">
        <h5 class="card-title mb-0 fw-bold text-dark d-flex align-items-center">
          <i class="bi bi-printer-fill text-primary me-2"></i>
          Pengaturan Printer Lokal
        </h5>
        <span 
          class="badge rounded-pill px-3 py-2" 
          :class="isElectronApp ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'"
        >
          <i class="bi" :class="isElectronApp ? 'bi-shield-check' : 'bi-browser-chrome'"></i>
          {{ isElectronApp ? 'Mode Desktop (Electron API)' : 'Mode Web Browser' }}
        </span>
      </div>
    </div>

    <div class="card-body">
      <div v-if="isLoading" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2 mb-0">Mendeteksi printer lokal...</p>
      </div>

      <div v-else>
        <!-- Info Alert -->
        <div class="alert alert-info border-0 rounded-3 mb-4 d-flex align-items-start" role="alert">
          <i class="bi bi-info-circle-fill fs-5 text-info me-3 mt-1"></i>
          <div>
            <h6 class="alert-heading fw-bold mb-1">Informasi Jalur Printer</h6>
            <p class="mb-0 small text-secondary">
              Jika menggunakan <strong>Mode Desktop (Electron)</strong>, pencetakan akan langsung dikirim ke printer secara native tanpa dialog. 
              Jika menggunakan <strong>Mode Web Browser</strong>, pastikan aplikasi <code>printing-service</code> di komputer ini sudah berjalan di latar belakang (port 3001).
            </p>
          </div>
        </div>

        <!-- Printer Select Grid -->
        <div class="row g-3">
          <!-- Default Printer -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="defaultPrinter" class="form-label fw-bold text-secondary small">Printer Default (Global)</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 text-secondary">
                  <i class="bi bi-printer"></i>
                </span>
                <select 
                  id="defaultPrinter" 
                  v-model="printers.default" 
                  @change="savePrinter('user_default_printer', printers.default)"
                  class="form-select border-start-0 ps-0"
                >
                  <option value="">-- Pilih Printer Default --</option>
                  <option v-for="p in printerList" :key="p.name" :value="p.name">
                    {{ p.name }} {{ p.isDefault ? '(Sistem Default)' : '' }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Receipt Printer -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="receiptPrinter" class="form-label fw-bold text-secondary small">Printer Kasir (Thermal Receipt)</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 text-secondary">
                  <i class="bi bi-receipt"></i>
                </span>
                <select 
                  id="receiptPrinter" 
                  v-model="printers.receipt" 
                  @change="savePrinter('printer_receipt', printers.receipt)"
                  class="form-select border-start-0 ps-0"
                >
                  <option value="">-- Gunakan Printer Default --</option>
                  <option v-for="p in printerList" :key="p.name" :value="p.name">
                    {{ p.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Invoice Printer -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="invoicePrinter" class="form-label fw-bold text-secondary small">Printer Nota & Invoice (A4/Kertas)</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 text-secondary">
                  <i class="bi bi-file-earmark-ruled"></i>
                </span>
                <select 
                  id="invoicePrinter" 
                  v-model="printers.invoice" 
                  @change="savePrinter('printer_invoice', printers.invoice)"
                  class="form-select border-start-0 ps-0"
                >
                  <option value="">-- Gunakan Printer Default --</option>
                  <option v-for="p in printerList" :key="p.name" :value="p.name">
                    {{ p.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Label Printer -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="labelPrinter" class="form-label fw-bold text-secondary small">Printer Barcode / QR Label</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 text-secondary">
                  <i class="bi bi-qr-code"></i>
                </span>
                <select 
                  id="labelPrinter" 
                  v-model="printers.label" 
                  @change="savePrinter('printer_label', printers.label)"
                  class="form-select border-start-0 ps-0"
                >
                  <option value="">-- Gunakan Printer Default --</option>
                  <option v-for="p in printerList" :key="p.name" :value="p.name">
                    {{ p.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Queue Printer -->
          <div class="col-md-6">
            <div class="form-group">
              <label for="queuePrinter" class="form-label fw-bold text-secondary small">Printer Tiket Antrian (Thermal)</label>
              <div class="input-group">
                <span class="input-group-text bg-light border-end-0 text-secondary">
                  <i class="bi bi-ticket-perforated"></i>
                </span>
                <select 
                  id="queuePrinter" 
                  v-model="printers.queue" 
                  @change="savePrinter('printer_queue', printers.queue)"
                  class="form-select border-start-0 ps-0"
                >
                  <option value="">-- Gunakan Printer Kasir / Default --</option>
                  <option v-for="p in printerList" :key="p.name" :value="p.name">
                    {{ p.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Testing Section -->
        <div class="mt-4 pt-3 border-top">
          <h6 class="fw-bold text-dark mb-3">Simulasi Cetak Uji Coba</h6>
          <div class="d-flex flex-wrap gap-2">
            <button 
              @click="testPrint('receipt')" 
              class="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center"
              :disabled="isTesting"
            >
              <i class="bi bi-receipt me-1"></i>
              Simulasi Receipt (Thermal)
            </button>
            <button 
              @click="testPrint('invoice')" 
              class="btn btn-outline-primary btn-sm rounded-pill d-flex align-items-center"
              :disabled="isTesting"
            >
              <i class="bi bi-file-earmark-ruled me-1"></i>
              Simulasi Invoice (A4)
            </button>
            <button 
              @click="testPrint('label')" 
              class="btn btn-outline-success btn-sm rounded-pill d-flex align-items-center"
              :disabled="isTesting"
            >
              <i class="bi bi-qr-code me-1"></i>
              Simulasi Label QR
            </button>
            <button 
              @click="testPrint('queue')" 
              class="btn btn-outline-warning btn-sm rounded-pill d-flex align-items-center"
              :disabled="isTesting || !isElectronApp"
            >
              <i class="bi bi-ticket-perforated me-1"></i>
              Simulasi Tiket Antrian (Thermal)
            </button>
            <button 
              @click="refreshPrinters" 
              class="btn btn-light btn-sm rounded-pill text-secondary ms-auto"
              :disabled="isTesting"
            >
              <i class="bi bi-arrow-clockwise"></i>
              Refresh Printer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from "vue";
import { isElectron, getLocalPrinters, printJob } from "@/utils/printHelper";
import Swal from "sweetalert2";

const isLoading = ref(true);
const isTesting = ref(false);
const isElectronApp = ref(false);
const printerList = ref([]);

const printers = reactive({
  default: "",
  receipt: "",
  invoice: "",
  label: "",
  queue: ""
});

// Memuat daftar printer dan preferensi local storage
async function refreshPrinters() {
  isLoading.value = true;
  try {
    printerList.value = await getLocalPrinters();
    
    // Muat setting tersimpan
    printers.default = localStorage.getItem("user_default_printer") || "";
    printers.receipt = localStorage.getItem("printer_receipt") || "";
    printers.invoice = localStorage.getItem("printer_invoice") || "";
    printers.label = localStorage.getItem("printer_label") || "";
    printers.queue = localStorage.getItem("printer_queue") || "";

    // Set fallback default jika di sistem ada printer default dan local storage masih kosong
    if (!printers.default) {
      const defaultSystem = printerList.value.find(p => p.isDefault);
      if (defaultSystem) {
        printers.default = defaultSystem.name;
        localStorage.setItem("user_default_printer", defaultSystem.name);
      }
    }
  } catch (err) {
    console.error("Gagal mendapatkan daftar printer:", err);
  } finally {
    isLoading.value = false;
  }
}

// Simpan pilihan printer ke localStorage
function savePrinter(key, value) {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
  
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "Pengaturan printer disimpan",
    showConfirmButton: false,
    timer: 2000
  });
}

// Simulasi print untuk testing
async function testPrint(type) {
  isTesting.value = true;
  
  let payload = {};
  let printType = type;

  if (type === "receipt") {
    payload = {
      tanggal: new Date().toLocaleDateString("id-ID"),
      sales: "Kasir Uji",
      totalHarga: 125000,
      jumlahBayar: 150000,
      kembalian: 25000,
      metodeBayar: "tunai",
      items: [
        { nama: "Test Cincin Emas", kode: "TC001", kadar: "700", berat: "2.5", totalHarga: 125000 }
      ],
      transactionType: "SIMULASI KASIR"
    };
  } else if (type === "invoice") {
    payload = {
      tanggal: new Date().toLocaleDateString("id-ID"),
      customerName: "Budi Uji Coba",
      customerPhone: "08123456789",
      sales: "Admin Toko",
      totalHarga: 2500000,
      items: [
        { name: "Kalung Emas Melati", code: "KL005", kadar: "750", berat: "5.0", quantity: 1, price: 2500000 }
      ],
      notes: "Simulasi print native via Electron. Semoga sukses!"
    };
  } else if (type === "label") {
    printType = "qr-sbpl";
    payload = {
      labelWidthMm: 23,
      labelHeightMm: 24,
      pageWidthMm: 85,
      pageHeightMm: 28,
      labels: [
        { kode: "M3-2606-A1", nama: "Cincin Uji 2g", kadar: "70%", berat: "2.0", qty: 1 }
      ]
    };
  } else if (type === "queue") {
    payload = {
      queueNumber: "A001",
      queueType: "Beli / Tukar Tambah",
      dateStr: new Date().toLocaleDateString("id-ID"),
      timeStr: new Date().toLocaleTimeString("id-ID"),
      floor: "L1",
      lang: "id"
    };
  }

  try {
    const res = await printJob(printType, payload);
    if (res && res.success) {
      Swal.fire({
        icon: "success",
        title: "Simulasi Sukses",
        text: `Berhasil mengirim perintah cetak via ${res.method}.`,
        timer: 3000
      });
    }
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Simulasi Gagal",
      text: err.message
    });
  } finally {
    isTesting.value = false;
  }
}

onMounted(() => {
  isElectronApp.value = isElectron();
  refreshPrinters();
});
</script>

<style scoped>
.card {
  transition: transform 0.2s;
}
.form-select:focus, .input-group-text {
  border-color: #dee2e6;
  box-shadow: none;
}
.form-select:focus {
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
</style>
