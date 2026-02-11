import { saveServisData, getServisByDate } from "../services/servis-service.js";

// Global variables
let todayData = [];
let servisItemsServis = [];
let servisItemsCustom = [];
let editingIndex = -1;
let verifikasiAction = null;
let verifikasiData = null;
let editingRiwayatId = null;
let filterJenisRiwayat = "servis";

// Global variables untuk detail barang
let jenisInput = "servis";
let detailBarangItems = [];
let detailBarangCounter = 1;
let detailBarangCustomItems = [];
let detailBarangCustomCounter = 1;
let modalClosedBySave = false;

// Print Service Configuration
const PRINT_SERVICE_URL = "http://localhost:3001";
const PRINT_SERVICE_TIMEOUT = 5000;

// Print Service Availability Checker
window.printService = {
  isOnline: false,
  lastCheck: 0,
  checkInterval: 30000, // Check every 30 seconds

  async checkAvailability() {
    const now = Date.now();
    // Don't check too frequently
    if (now - this.lastCheck < this.checkInterval) {
      return this.isOnline;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRINT_SERVICE_TIMEOUT);

      const response = await fetch(`${PRINT_SERVICE_URL}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.isOnline = response.ok;
      this.lastCheck = now;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      this.lastCheck = now;
      return false;
    }
  },

  async print(endpoint, data) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRINT_SERVICE_TIMEOUT);

      const response = await fetch(`${PRINT_SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return await response.json();
    } catch (error) {
      console.warn("Print service request failed:", error);
      throw error;
    }
  },
};

// SweetAlert Helper Functions
function showSuccessToast(message, timer = 2000) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
  });
}

function showErrorAlert(title, message) {
  Swal.fire({
    icon: "error",
    title: title,
    text: message,
    confirmButtonColor: "#d33",
  });
}

function showSuccessAlert(title, message) {
  Swal.fire({
    icon: "success",
    title: title,
    text: message,
    confirmButtonColor: "#28a745",
    timer: 3000,
    timerProgressBar: true,
  });
}

async function showConfirmDialog(title, message, confirmText = "Ya, Hapus!") {
  return await Swal.fire({
    title: title,
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: confirmText,
    cancelButtonText: "Batal",
  });
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  initializePage();
  setupEventListeners();

  // Check print service availability
  window.printService.checkAvailability().then((isOnline) => {
    console.log("🖨️ Print service status:", isOnline ? "Online" : "Offline");
  });
});

function initializePage() {
  // Set current date and time
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Initialize datepicker
  initializeDatePicker();

  // Initialize section visibility based on default jenisInput
  handleJenisInputChange();

  // Set default date to today hanya untuk input tanggal
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");
  document.getElementById("tanggal").value = formattedDate;
  document.getElementById("tanggalRiwayat").value = formattedDate;
}

function initializeDatePicker() {
  $("#tanggal").datepicker({
    format: "dd/mm/yyyy",
    language: "id",
    autoclose: true,
    todayHighlight: true,
    orientation: "bottom auto",
  });

  $("#tanggalRiwayat").datepicker({
    format: "dd/mm/yyyy",
    language: "id",
    autoclose: true,
    todayHighlight: true,
    orientation: "bottom auto",
  });

  // Tambahkan datepicker untuk field tanggal edit
  $("#tanggalEdit").datepicker({
    format: "dd/mm/yyyy",
    language: "id",
    autoclose: true,
    todayHighlight: true,
    orientation: "bottom auto",
  });

  // Calendar icon click handlers
  document.getElementById("calendarIcon").addEventListener("click", function () {
    $("#tanggal").datepicker("show");
  });

  document.getElementById("calendarRiwayatIcon").addEventListener("click", function () {
    $("#tanggalRiwayat").datepicker("show");
  });

  document.getElementById("calendarEditIcon").addEventListener("click", function () {
    $("#tanggalEdit").datepicker("show");
  });
}

function updateDateTime() {
  const now = new Date();
  const dateElement = document.getElementById("current-date");
  const timeElement = document.getElementById("current-time");

  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString("id-ID");
  }
}

function setupEventListeners() {
  // Tambah servis button
  document.getElementById("btnTambahServis").addEventListener("click", function () {
    openServisModal();
  });

  // Simpan servis button in modal
  document.getElementById("btnSimpanServis").addEventListener("click", function () {
    saveServisItem();
  });

  // Tambah barang button in modal
  document.getElementById("btnTambahBarang").addEventListener("click", function () {
    addDetailBarangRow();
  });

  // Tambah barang custom button
  document.getElementById("btnTambahBarangCustom").addEventListener("click", function () {
    addDetailBarangCustomRow();
  });

  // Jenis input change handler
  document.getElementById("jenisInput").addEventListener("change", function () {
    handleJenisInputChange();
  });

  // Simpan data button
  document.getElementById("btnSimpanData").addEventListener("click", function () {
    saveAllServisData();
  });

  // Batal button
  document.getElementById("btnBatal").addEventListener("click", function () {
    resetForm();
  });

  // Simpan data custom button
  document.getElementById("btnSimpanDataCustom").addEventListener("click", function () {
    saveAllServisData();
  });

  // Batal custom button
  document.getElementById("btnBatalCustom").addEventListener("click", function () {
    resetForm();
  });

  // Filter jenis riwayat change handler
  document.getElementById("filterJenisRiwayat").addEventListener("change", function () {
    filterJenisRiwayat = this.value;
    handleFilterRiwayatChange();
  });

  // Tampilkan button
  document.getElementById("tampilkanBtn").addEventListener("click", function () {
    loadRiwayatData();
  });

  // Export PDF button
  document.getElementById("exportPdfBtn").addEventListener("click", function () {
    if (filterJenisRiwayat === "servis") {
      exportServisToPDF();
    } else {
      exportCustomToPDF();
    }
  });

  // Print button
  document.getElementById("printBtn").addEventListener("click", function () {
    printReport();
  });

  // Verifikasi button
  document.getElementById("btnVerifikasi").addEventListener("click", function () {
    handleVerifikasi();
  });

  // Modal hidden events
  document.getElementById("modalInputServis").addEventListener("hidden.bs.modal", function () {
    if (modalClosedBySave) {
      // Jika modal ditutup karena save, reset form tapi pertahankan jenisInput
      resetModalForm(false);
      modalClosedBySave = false;
    } else {
      // Jika modal ditutup karena cancel/close, reset semua termasuk jenisInput ke default
      resetModalForm(true);
    }
  });

  document.getElementById("verifikasiModal").addEventListener("hidden.bs.modal", function () {
    document.getElementById("kodeVerifikasi").value = "";
    verifikasiAction = null;
    verifikasiData = null;
  });

  // Enter key handler untuk modal form
  document.getElementById("formInputServis").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveServisItem();
    }
  });

  // Enter key handler untuk form verifikasi
  document.getElementById("formVerifikasi").addEventListener("submit", function (e) {
    e.preventDefault();
    handleVerifikasi();
  });

  document.getElementById("kodeVerifikasi").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleVerifikasi();
    }
  });
}

// Functions untuk mengelola detail barang
function addDetailBarangRow() {
  const newItem = {
    id: detailBarangCounter++,
    jumlah: 1,
    namaBarang: "",
    berat: "",
    karat: "",
    jenisServis: "",
    rincianServis: "",
    ongkos: 0,
    statusPembayaran: "nominal",
  };

  detailBarangItems.push(newItem);
  updateDetailBarangTable();
}

function removeDetailBarangRow(id) {
  detailBarangItems = detailBarangItems.filter((item) => item.id !== id);
  updateDetailBarangTable();
}

function updateDetailBarangTable() {
  const tbody = document.getElementById("detailBarangBody");
  tbody.innerHTML = "";

  detailBarangItems.forEach((item, index) => {
    const statusPembayaran = item.statusPembayaran || "nominal";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <input type="number" class="form-control form-control-sm"
               value="${item.jumlah || 1}"
               onchange="updateDetailBarangItem(${item.id}, 'jumlah', this.value)"
               placeholder="1" min="1" required />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm"
               value="${item.namaBarang}"
               onchange="updateDetailBarangItem(${item.id}, 'namaBarang', this.value)"
               placeholder="Nama barang" required />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm"
               value="${item.berat}"
               onchange="updateDetailBarangItem(${item.id}, 'berat', this.value)"
               placeholder="Berat" />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm"
               value="${item.karat}"
               onchange="updateDetailBarangItem(${item.id}, 'karat', this.value)"
               placeholder="Karat" />
      </td>
      <td>
        <select class="form-control form-control-sm"
                onchange="updateDetailBarangItem(${item.id}, 'jenisServis', this.value)" required>
          <option value="">Pilih Jenis</option>
          <option value="GRAFIR" ${item.jenisServis === "GRAFIR" ? "selected" : ""}>GRAFIR</option>
          <option value="PATRI" ${item.jenisServis === "PATRI" ? "selected" : ""}>PATRI</option>
          <option value="LASER" ${item.jenisServis === "LASER" ? "selected" : ""}>LASER</option>
          <option value="CUCI" ${item.jenisServis === "CUCI" ? "selected" : ""}>CUCI</option>
          <option value="PASANG BATU" ${item.jenisServis === "PASANG BATU" ? "selected" : ""}>PASANG BATU</option>
          <option value="TAMBAH RING" ${item.jenisServis === "TAMBAH RING" ? "selected" : ""}>TAMBAH RING</option>
          <option value="CHROME GOLD" ${item.jenisServis === "CHROME GOLD" ? "selected" : ""}>CHROME GOLD 22K</option>
          <option value="CHROME SELEB" ${item.jenisServis === "CHROME SELEB" ? "selected" : ""}>CHROME SELEB</option>
          <option value="CHROME PUTIH" ${item.jenisServis === "CHROME PUTIH" ? "selected" : ""}>CHROME PUTIH</option>
          <option value="CHROME ROSE" ${item.jenisServis === "CHROME ROSE" ? "selected" : ""}>CHROME ROSE</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm"
               value="${item.rincianServis}"
               onchange="updateDetailBarangItem(${item.id}, 'rincianServis', this.value)"
               placeholder="Rincian servis" />
      </td>
      <td>
        <input type="number" class="form-control form-control-sm"
               value="${item.ongkos || 0}"
               onchange="updateDetailBarangItem(${item.id}, 'ongkos', this.value)"
               placeholder="Ongkos"
               min="0" />
      </td>
      <td>
        <select class="form-select form-select-sm"
                onchange="updateDetailBarangItem(${item.id}, 'statusPembayaran', this.value)">
          <option value="nominal" ${statusPembayaran === "nominal" ? "selected" : ""}>LUNAS</option>
          <option value="belum_lunas" ${statusPembayaran === "belum_lunas" ? "selected" : ""}>BELUM LUNAS</option>
          <option value="free" ${statusPembayaran === "free" ? "selected" : ""}>GRATIS</option>
          <option value="custom" ${statusPembayaran === "custom" ? "selected" : ""}>CUSTOM</option>
        </select>
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeDetailBarangRow(${item.id})" title="Hapus">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Jika belum ada item, tambahkan satu baris default
  if (detailBarangItems.length === 0) {
    addDetailBarangRow();
  }
}

function updateDetailBarangItem(id, field, value) {
  const item = detailBarangItems.find((item) => item.id === id);
  if (item) {
    item[field] = value;
    // Tidak perlu update table setiap kali perubahan untuk menjaga focus saat Tab
  }
}

function resetDetailBarang() {
  detailBarangItems = [];
  detailBarangCounter = 1;
  updateDetailBarangTable();
}

function resetDetailBarangCustom() {
  detailBarangCustomItems = [];
  detailBarangCustomCounter = 1;
  updateDetailBarangCustomTable();
}

// Functions untuk detail barang custom
function addDetailBarangCustomRow() {
  const newItem = {
    id: detailBarangCustomCounter++,
    jumlah: 1,
    namaBarang: "",
    berat: "",
    panjang: "",
    kadar: "",
    warna: "",
    totalDp: 0,
    ongkos: 0,
    rincianServis: "",
    statusPembayaran: "nominal",
  };
  detailBarangCustomItems.push(newItem);
  updateDetailBarangCustomTable();
}

function removeDetailBarangCustomRow(id) {
  detailBarangCustomItems = detailBarangCustomItems.filter((item) => item.id !== id);
  updateDetailBarangCustomTable();
}

function updateDetailBarangCustomTable() {
  const tbody = document.getElementById("detailBarangCustomBody");
  tbody.innerHTML = "";

  detailBarangCustomItems.forEach((item, index) => {
    const statusPembayaran = item.statusPembayaran || "nominal";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="number" class="form-control form-control-sm" value="${
        item.jumlah || 1
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'jumlah', this.value)" min="1" required /></td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.namaBarang
      }" onchange="updateDetailBarangCustomItem(${
        item.id
      }, 'namaBarang', this.value)" placeholder="Nama barang" required /></td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.berat
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'berat', this.value)" placeholder="Berat" /></td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.panjang
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'panjang', this.value)" placeholder="Panjang" /></td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.kadar
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'kadar', this.value)" placeholder="Kadar" /></td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.warna
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'warna', this.value)" placeholder="Warna" /></td>
      <td><input type="number" class="form-control form-control-sm" value="${
        item.totalDp || 0
      }" onchange="updateDetailBarangCustomItem(${
        item.id
      }, 'totalDp', this.value)" placeholder="Total DP" min="0" /></td>
      <td><input type="number" class="form-control form-control-sm" value="${
        item.ongkos || 0
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'ongkos', this.value)" placeholder="Ongkos" min="0" /></td>
      <td>
        <select class="form-select form-select-sm"
                onchange="updateDetailBarangCustomItem(${item.id}, 'statusPembayaran', this.value)">
          <option value="nominal" ${statusPembayaran === "nominal" ? "selected" : ""}>LUNAS</option>
          <option value="custom" ${statusPembayaran === "custom" ? "selected" : ""}>CUSTOM</option>
        </select>
      </td>
      <td><input type="text" class="form-control form-control-sm" value="${
        item.rincianServis
      }" onchange="updateDetailBarangCustomItem(${item.id}, 'rincianServis', this.value)" placeholder="Rincian" /></td>
      <td><button type="button" class="btn btn-sm btn-danger" onclick="removeDetailBarangCustomRow(${
        item.id
      })" title="Hapus"><i class="fas fa-trash"></i></button></td>
    `;
    tbody.appendChild(row);
  });

  if (detailBarangCustomItems.length === 0) {
    addDetailBarangCustomRow();
  }
}

function updateDetailBarangCustomItem(id, field, value) {
  const item = detailBarangCustomItems.find((item) => item.id === id);
  if (item) {
    // Trim whitespace untuk field string, parse number untuk field numerik
    if (field === "jumlah" || field === "totalDp" || field === "ongkos") {
      item[field] = parseInt(value) || 0;
    } else if (typeof value === "string") {
      item[field] = value.trim();
    } else {
      item[field] = value;
    }
  }
}

function validateDetailBarang() {
  if (jenisInput === "servis") {
    if (detailBarangItems.length === 0) {
      showErrorModal("Validasi Error", "Minimal harus ada satu detail barang servis!");
      return false;
    }
  } else {
    if (detailBarangCustomItems.length === 0) {
      showErrorModal("Validasi Error", "Minimal harus ada satu detail barang custom!");
      return false;
    }
  }

  if (jenisInput === "servis") {
    for (let i = 0; i < detailBarangItems.length; i++) {
      const item = detailBarangItems[i];
      if (!item.namaBarang.trim() || !item.jenisServis.trim()) {
        showErrorModal("Validasi Error", `Nama barang dan jenis servis pada baris ${i + 1} harus diisi!`);
        return false;
      }

      // Validasi status pembayaran per item
      const itemStatus = item.statusPembayaran || "nominal";
      if (!item.statusPembayaran) {
        showErrorModal("Validasi Error", `Status pembayaran pada baris ${i + 1} harus dipilih!`);
        return false;
      }

      // Auto-set ongkos ke 0 jika status free
      if (itemStatus === "free") {
        item.ongkos = 0;
      } else if (
        (itemStatus === "nominal" || itemStatus === "belum_lunas") &&
        (!item.ongkos || parseInt(item.ongkos) <= 0)
      ) {
        showErrorModal(
          "Validasi Error",
          `Ongkos pada baris ${i + 1} harus diisi untuk status ${getStatusLabel(itemStatus)}!`,
        );
        return false;
      }
    }
  } else {
    for (let i = 0; i < detailBarangCustomItems.length; i++) {
      const item = detailBarangCustomItems[i];
      if (!item.namaBarang.trim()) {
        showErrorModal("Validasi Error", `Nama barang pada baris ${i + 1} harus diisi!`);
        return false;
      }

      // Validasi status pembayaran per item
      if (!item.statusPembayaran) {
        showErrorModal("Validasi Error", `Status pembayaran pada baris ${i + 1} harus dipilih!`);
        return false;
      }
    }
  }

  return true;
}

// Global functions untuk inline editing
window.updateDetailBarangItem = updateDetailBarangItem;
window.removeDetailBarangRow = removeDetailBarangRow;
window.updateDetailBarangCustomItem = updateDetailBarangCustomItem;
window.removeDetailBarangCustomRow = removeDetailBarangCustomRow;

function handleJenisInputChange() {
  jenisInput = document.getElementById("jenisInput").value;
  const sectionServis = document.getElementById("sectionServis");
  const sectionCustom = document.getElementById("sectionCustom");
  const sectionInputServis = document.getElementById("sectionInputServis");
  const sectionInputCustom = document.getElementById("sectionInputCustom");

  if (jenisInput === "servis") {
    sectionServis.style.display = "block";
    sectionCustom.style.display = "none";
    sectionInputServis.style.display = "block";
    sectionInputCustom.style.display = "none";
  } else {
    sectionServis.style.display = "none";
    sectionCustom.style.display = "block";
    sectionInputServis.style.display = "none";
    sectionInputCustom.style.display = "block";
  }
}

function handleStatusPembayaranChange() {
  // Status pembayaran sekarang per item, function ini tidak diperlukan lagi
  // Kept for backward compatibility but does nothing
}

function openServisModal(index = -1) {
  editingIndex = index;

  if (index >= 0) {
    // Edit mode
    const item = jenisInput === "servis" ? servisItemsServis[index] : servisItemsCustom[index];
    document.getElementById("modalInputServisLabel").textContent =
      jenisInput === "servis" ? "Edit Data Servis" : "Edit Data Custom";
    document.getElementById("namaSales").value = item.namaSales || "";
    document.getElementById("namaCustomer").value = item.namaCustomer;
    document.getElementById("noHp").value = item.noHp;

    // Set jenis input
    jenisInput = item.jenisInput || "servis";
    document.getElementById("jenisInput").value = jenisInput;
    handleJenisInputChange();

    // Load detail barang
    if (jenisInput === "servis" && item.detailBarang && item.detailBarang.length > 0) {
      detailBarangItems = item.detailBarang.map((detail, idx) => ({
        id: idx + 1,
        jumlah: detail.jumlah || 1,
        namaBarang: detail.namaBarang || "",
        berat: detail.berat || "",
        karat: detail.karat || "",
        jenisServis: detail.jenisServis || "",
        rincianServis: detail.rincianServis || "",
        ongkos: detail.ongkos || 0,
        statusPembayaran: detail.statusPembayaran || "nominal",
      }));
      detailBarangCounter = detailBarangItems.length + 1;
    } else {
      // Backward compatibility - convert old format
      detailBarangItems = [
        {
          id: 1,
          jumlah: 1,
          namaBarang: item.namaBarang || "",
          berat: item.berat || "",
          karat: item.karat || "",
          jenisServis: item.jenisServis || "",
          rincianServis: "",
          ongkos: item.ongkos || 0,
          statusPembayaran: item.statusPembayaran || "nominal",
        },
      ];
      detailBarangCounter = 2;
    }

    updateDetailBarangTable();

    if (jenisInput === "custom" && item.detailBarangCustom && item.detailBarangCustom.length > 0) {
      detailBarangCustomItems = item.detailBarangCustom.map((detail, idx) => ({
        id: idx + 1,
        jumlah: detail.jumlah || 1,
        namaBarang: detail.namaBarang || "",
        berat: detail.berat || "",
        panjang: detail.panjang || "",
        kadar: detail.kadar || "",
        warna: detail.warna || "",
        totalDp: detail.totalDp || 0,
        ongkos: detail.ongkos || 0,
        rincianServis: detail.rincianServis || "",
        statusPembayaran: detail.statusPembayaran || "nominal",
      }));
      detailBarangCustomCounter = detailBarangCustomItems.length + 1;
      updateDetailBarangCustomTable();
    }
  } else {
    // Add mode
    document.getElementById("modalInputServisLabel").textContent = "Input Data Servis";
    resetModalForm();
  }

  const modal = new bootstrap.Modal(document.getElementById("modalInputServis"));
  modal.show();

  // Auto focus pada nama sales setelah modal terbuka
  document.getElementById("modalInputServis").addEventListener(
    "shown.bs.modal",
    function () {
      document.getElementById("namaSales").focus();
    },
    { once: true },
  );
}

function resetModalForm(resetJenisInput = true) {
  document.getElementById("formInputServis").reset();
  document.getElementById("ongkos").disabled = false;
  document.getElementById("ongkos").required = true;
  document.getElementById("ongkosLabel").textContent = "Total Ongkos / DP";
  editingIndex = -1;
  editingRiwayatId = null;
  document.getElementById("modalInputServisLabel").textContent = "Input Data Servis";

  // Sembunyikan field tanggal edit
  document.getElementById("tanggalEditRow").style.display = "none";

  // Reset detail barang
  resetDetailBarang();
  resetDetailBarangCustom();

  // Reset jenis input to default hanya jika diminta (saat user cancel/close modal)
  if (resetJenisInput) {
    jenisInput = "servis";
    document.getElementById("jenisInput").value = "servis";
    handleJenisInputChange();
  }
}

async function saveServisItem() {
  const namaSales = document.getElementById("namaSales").value.trim();
  const namaCustomer = document.getElementById("namaCustomer").value.trim();
  const noHp = document.getElementById("noHp").value.trim();

  // Validation
  if (!namaSales || !namaCustomer || !noHp) {
    showErrorModal("Validasi Error", "Data customer harus diisi dengan benar!");
    return;
  }

  // Validate detail barang (include status pembayaran per item validation)
  if (!validateDetailBarang()) {
    return;
  }

  let servisItem = {
    namaSales,
    namaCustomer,
    noHp,
    jenisInput: jenisInput,
  };

  if (jenisInput === "servis") {
    const totalOngkos = detailBarangItems.reduce((sum, item) => sum + (parseInt(item.ongkos) || 0), 0);
    servisItem.detailBarang = detailBarangItems.map((item) => ({
      jumlah: parseInt(item.jumlah) || 1,
      namaBarang: item.namaBarang.trim(),
      berat: item.berat.trim(),
      karat: item.karat.trim(),
      jenisServis: item.jenisServis.trim(),
      rincianServis: item.rincianServis.trim(),
      ongkos: parseInt(item.ongkos) || 0,
      statusPembayaran: item.statusPembayaran || "nominal",
    }));
    servisItem.totalOngkos = totalOngkos;
    servisItem.namaBarang = detailBarangItems[0]?.namaBarang || "";
    servisItem.berat = detailBarangItems[0]?.berat || "";
    servisItem.karat = detailBarangItems[0]?.karat || "";
    servisItem.jenisServis = detailBarangItems[0]?.jenisServis || "";
    servisItem.ongkos = totalOngkos;
  } else {
    const totalDp = detailBarangCustomItems.reduce((sum, item) => sum + (parseInt(item.totalDp) || 0), 0);
    const totalOngkos = detailBarangCustomItems.reduce((sum, item) => sum + (parseInt(item.ongkos) || 0), 0);
    servisItem.detailBarangCustom = detailBarangCustomItems.map((item) => {
      const statusPembayaran = item.statusPembayaran || "nominal";

      return {
        jumlah: parseInt(item.jumlah) || 1,
        namaBarang: item.namaBarang.trim(),
        berat: item.berat.trim(),
        panjang: item.panjang.trim(),
        kadar: item.kadar.trim(),
        warna: item.warna.trim(),
        totalDP: parseInt(item.totalDp) || 0,
        ongkos: parseInt(item.ongkos) || 0,
        statusPembayaran: statusPembayaran,
        rincianServis: item.rincianServis.trim(),
      };
    });
    servisItem.totalDP = totalDp;
    servisItem.totalOngkos = totalOngkos;
    servisItem.namaBarang = detailBarangCustomItems[0]?.namaBarang || "";
    servisItem.ongkos = totalOngkos;
  }

  // Handle edit riwayat data
  if (editingRiwayatId) {
    try {
      // Ambil tanggal dari field edit jika sedang edit riwayat
      const tanggalEdit = document.getElementById("tanggalEdit").value;
      if (tanggalEdit) {
        // Get original item to preserve timestamp
        const originalItem = todayData.find((item) => item.id === editingRiwayatId);
        const originalDate = originalItem ? new Date(originalItem.tanggal) : new Date();

        // Parse new date but keep original time
        const [day, month, year] = tanggalEdit.split("/");
        const updatedDate = new Date(
          year,
          month - 1,
          day,
          originalDate.getHours(),
          originalDate.getMinutes(),
          originalDate.getSeconds(),
        );
        servisItem.tanggal = updatedDate.toISOString();
      }

      const { updateServisData } = await import("../services/servis-service.js");
      await updateServisData(editingRiwayatId, servisItem);

      // Update todayData langsung
      const itemIndex = todayData.findIndex((item) => item.id === editingRiwayatId);
      if (itemIndex !== -1) {
        todayData[itemIndex] = { ...todayData[itemIndex], ...servisItem };
        updateRiwayatTable();
      }

      showSuccessAlert("Berhasil!", "Data riwayat berhasil diupdate");
      editingRiwayatId = null;

      // Close modal and stop execution
      modalClosedBySave = true;
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalInputServis"));
      modal.hide();
      return;
    } catch (error) {
      console.error("Error updating data:", error);
      showErrorAlert("Error!", "Terjadi kesalahan saat mengupdate data: " + error.message);
      return;
    }
  }
  // Handle regular servis items
  else if (editingIndex >= 0) {
    if (jenisInput === "servis") {
      servisItemsServis[editingIndex] = servisItem;
    } else {
      servisItemsCustom[editingIndex] = servisItem;
    }
  } else {
    // Cek duplikasi sebelum menambah data baru
    const targetArray = jenisInput === "servis" ? servisItemsServis : servisItemsCustom;
    const isDuplicate = targetArray.some(
      (item) =>
        item.namaCustomer.toLowerCase() === namaCustomer.toLowerCase() &&
        item.noHp === noHp &&
        item.namaBarang.toLowerCase() === servisItem.namaBarang.toLowerCase(),
    );
    if (isDuplicate) {
      showErrorModal("Duplikasi Data", "Data dengan kombinasi customer, no HP, dan barang yang sama sudah ada!");
      return;
    }
    targetArray.push(servisItem);
  }

  if (!editingRiwayatId) {
    if (jenisInput === "servis") {
      updateServisTableServis();
    } else {
      updateServisTableCustom();
    }
  }

  // Set flag bahwa modal ditutup karena save
  modalClosedBySave = true;

  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalInputServis"));
  modal.hide();

  // Show success notification
  if (!editingRiwayatId) {
    const actionText = editingIndex >= 0 ? "diupdate" : "ditambahkan";
    setTimeout(() => {
      showSuccessToast(`Item berhasil ${actionText} ke daftar!`);
    }, 300);
  }
}

function updateServisTableServis() {
  const tbody = document.querySelector("#tableInputServis tbody");
  tbody.innerHTML = "";

  let totalOngkos = 0;

  servisItemsServis.forEach((item, index) => {
    const row = document.createElement("tr");

    totalOngkos += item.totalOngkos || item.ongkos || 0;

    const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const karatHtml = details.map((d) => `<div>${d.karat || "-"}</div>`).join("");
    const jenisHtml = details.map((d) => `<div>${d.jenisServis || "-"}</div>`).join("");
    const rincianHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

    // Status per item
    const statusHtml = details
      .map((d) => {
        const status = d.statusPembayaran || "nominal";
        return `<div><span class="badge bg-${getStatusBadgeColor(status)}">${getStatusLabel(status)}</span></div>`;
      })
      .join("");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.noHp}</td>
      <td class="multi-col">${namaBarangHtml}</td>
      <td class="multi-col">${beratHtml}</td>
      <td class="multi-col">${karatHtml}</td>
      <td class="multi-col">${jenisHtml}</td>
      <td class="multi-col">${rincianHtml}</td>
      <td class="multi-col">${ongkosHtml}</td>
      <td class="multi-col">${statusHtml}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="editServisItem(${index})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteServisItem(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("total-ongkos").textContent = `Rp ${totalOngkos.toLocaleString("id-ID")}`;
}

function updateServisTableCustom() {
  const tbody = document.querySelector("#tableInputCustom tbody");
  tbody.innerHTML = "";

  let totalDP = 0;
  let totalOngkos = 0;

  servisItemsCustom.forEach((item, index) => {
    const row = document.createElement("tr");

    const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const panjangHtml = details.map((d) => `<div>${d.panjang || "-"}</div>`).join("");
    const kadarHtml = details.map((d) => `<div>${d.kadar || "-"}</div>`).join("");
    const warnaHtml = details.map((d) => `<div>${d.warna || "-"}</div>`).join("");
    const totalDPHtml = details.map((d) => `<div>Rp ${(d.totalDP || 0).toLocaleString("id-ID")}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

    // Status per item
    const statusHtml = details
      .map((d) => {
        const status = d.statusPembayaran || "nominal";
        return `<div><span class="badge bg-${getStatusBadgeColor(status)}">${getStatusLabel(status)}</span></div>`;
      })
      .join("");

    details.forEach((d) => {
      totalDP += d.totalDP || 0;
      totalOngkos += d.ongkos || 0;
    });

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.noHp}</td>
      <td class="multi-col">${namaBarangHtml}</td>
      <td class="multi-col">${beratHtml}</td>
      <td class="multi-col">${panjangHtml}</td>
      <td class="multi-col">${kadarHtml}</td>
      <td class="multi-col">${warnaHtml}</td>
      <td class="multi-col">${totalDPHtml}</td>
      <td class="multi-col">${ongkosHtml}</td>
      <td class="multi-col">${statusHtml}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="editCustomItem(${index})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteCustomItem(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("total-dp-custom").textContent = `Rp ${totalDP.toLocaleString("id-ID")}`;
  document.getElementById("total-ongkos-custom").textContent = `Rp ${totalOngkos.toLocaleString("id-ID")}`;
}

function getOngkosDisplay(item) {
  const statusPembayaran = item.statusPembayaran || "nominal";
  const ongkos = item.totalOngkos || item.ongkos || 0;

  if (statusPembayaran === "free") {
    return "GRATIS";
  } else if (statusPembayaran === "belum_lunas") {
    return ongkos > 0 ? `Rp ${ongkos.toLocaleString("id-ID")}` : "BELUM LUNAS";
  } else if (statusPembayaran === "custom") {
    return `DP: Rp ${ongkos.toLocaleString("id-ID")}`;
  } else {
    return `Rp ${ongkos.toLocaleString("id-ID")}`;
  }
}

function getStatusLabel(status) {
  const labels = {
    nominal: "LUNAS",
    free: "GRATIS",
    belum_lunas: "BELUM LUNAS",
    custom: "CUSTOM",
  };
  return labels[status] || "LUNAS";
}

function getStatusBadgeColor(status) {
  const colors = {
    nominal: "success",
    free: "primary",
    belum_lunas: "warning",
    custom: "secondary",
  };
  return colors[status] || "success";
}

// Global functions for button clicks
window.editServisItem = function (index) {
  jenisInput = "servis";
  openServisModal(index);
};

window.deleteServisItem = async function (index) {
  const result = await showConfirmDialog(
    "Hapus Item?",
    "Item ini akan dihapus dari daftar (belum tersimpan ke database)",
    "Ya, Hapus!",
  );

  if (result.isConfirmed) {
    servisItemsServis.splice(index, 1);
    updateServisTableServis();
    showSuccessToast("Item berhasil dihapus dari daftar!");
  }
};

window.editCustomItem = function (index) {
  jenisInput = "custom";
  openServisModal(index);
};

window.deleteCustomItem = async function (index) {
  const result = await showConfirmDialog(
    "Hapus Item?",
    "Item ini akan dihapus dari daftar (belum tersimpan ke database)",
    "Ya, Hapus!",
  );

  if (result.isConfirmed) {
    servisItemsCustom.splice(index, 1);
    updateServisTableCustom();
    showSuccessToast("Item berhasil dihapus dari daftar!");
  }
};

window.editRiwayatItem = function (id, index) {
  // Cari item dari todayData berdasarkan id
  const actualIndex = todayData.findIndex((item) => item.id === id);
  verifikasiAction = "edit";
  verifikasiData = { id, index: actualIndex };
  const modal = new bootstrap.Modal(document.getElementById("verifikasiModal"));
  modal.show();

  // Auto focus pada input kode verifikasi setelah modal terbuka
  document.getElementById("verifikasiModal").addEventListener(
    "shown.bs.modal",
    function () {
      document.getElementById("kodeVerifikasi").focus();
    },
    { once: true },
  );
};

window.deleteRiwayatItem = async function (id, index) {
  // Confirm first with SweetAlert
  const result = await showConfirmDialog(
    "Hapus Data Riwayat?",
    "Data ini akan dihapus permanen dari database. Anda perlu memasukkan kode verifikasi.",
    "Lanjutkan",
  );

  if (!result.isConfirmed) return;

  // Cari item dari todayData berdasarkan id
  const actualIndex = todayData.findIndex((item) => item.id === id);
  verifikasiAction = "delete";
  verifikasiData = { id, index: actualIndex };
  const modal = new bootstrap.Modal(document.getElementById("verifikasiModal"));
  modal.show();

  // Auto focus pada input kode verifikasi setelah modal terbuka
  document.getElementById("verifikasiModal").addEventListener(
    "shown.bs.modal",
    function () {
      document.getElementById("kodeVerifikasi").focus();
    },
    { once: true },
  );
};

async function handleVerifikasi() {
  const kode = document.getElementById("kodeVerifikasi").value;

  if (kode !== "smlt116") {
    showErrorAlert("Verifikasi Gagal!", "Kode verifikasi yang Anda masukkan salah");
    document.getElementById("kodeVerifikasi").focus();
    return;
  }

  try {
    if (verifikasiAction === "edit") {
      const item = todayData[verifikasiData.index];
      editingRiwayatId = verifikasiData.id;

      // Set jenis input dari item
      jenisInput = item.jenisInput || "servis";
      document.getElementById("jenisInput").value = jenisInput;
      handleJenisInputChange();

      // Set data customer ke form
      document.getElementById("namaSales").value = item.namaSales;
      document.getElementById("namaCustomer").value = item.namaCustomer;
      document.getElementById("noHp").value = item.noHp;

      // Load detail barang berdasarkan jenis input
      if (jenisInput === "servis") {
        // Load detail barang servis
        if (item.detailBarang && item.detailBarang.length > 0) {
          detailBarangItems = item.detailBarang.map((detail, idx) => ({
            id: idx + 1,
            jumlah: detail.jumlah || 1,
            namaBarang: detail.namaBarang || "",
            berat: detail.berat || "",
            karat: detail.karat || "",
            jenisServis: detail.jenisServis || "",
            rincianServis: detail.rincianServis || "",
            ongkos: detail.ongkos || 0,
            statusPembayaran: detail.statusPembayaran || "nominal",
          }));
          detailBarangCounter = detailBarangItems.length + 1;
        } else {
          // Backward compatibility - convert old format
          detailBarangItems = [
            {
              id: 1,
              jumlah: 1,
              namaBarang: item.namaBarang || "",
              berat: item.berat || "",
              karat: item.karat || "",
              jenisServis: item.jenisServis || "",
              rincianServis: "",
              ongkos: item.ongkos || 0,
              statusPembayaran: item.statusPembayaran || "nominal",
            },
          ];
          detailBarangCounter = 2;
        }
      } else {
        // Load detail barang custom
        if (item.detailBarangCustom && item.detailBarangCustom.length > 0) {
          detailBarangCustomItems = item.detailBarangCustom.map((detail, idx) => ({
            id: idx + 1,
            jumlah: detail.jumlah || 1,
            namaBarang: detail.namaBarang || "",
            berat: detail.berat || "",
            panjang: detail.panjang || "",
            kadar: detail.kadar || "",
            warna: detail.warna || "",
            totalDp: detail.totalDP || detail.totalDp || 0,
            ongkos: detail.ongkos || 0,
            rincianServis: detail.rincianServis || "",
            statusPembayaran: detail.statusPembayaran || "nominal",
          }));
          detailBarangCustomCounter = detailBarangCustomItems.length + 1;
        }
      }

      // Tampilkan dan isi field tanggal edit (with time info)
      document.getElementById("tanggalEditRow").style.display = "block";
      const tanggalObj = new Date(item.tanggal);
      const tanggalFormatted = tanggalObj.toLocaleDateString("id-ID");
      const jamFormatted = tanggalObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      document.getElementById("tanggalEdit").value = tanggalFormatted;
      // Store time info for display (optional: could show in label)
      document.getElementById("tanggalEdit").title = `Waktu input: ${jamFormatted}`;

      handleStatusPembayaranChange();
      document.getElementById("modalInputServisLabel").textContent =
        jenisInput === "servis" ? "Edit Data Riwayat Servis" : "Edit Data Riwayat Custom";

      const verifikasiModal = bootstrap.Modal.getInstance(document.getElementById("verifikasiModal"));
      verifikasiModal.hide();

      setTimeout(() => {
        const modal = new bootstrap.Modal(document.getElementById("modalInputServis"));
        modal.show();

        // Update detail barang table sesuai jenis input
        if (jenisInput === "servis") {
          updateDetailBarangTable();
        } else {
          updateDetailBarangCustomTable();
        }

        document.getElementById("modalInputServis").addEventListener(
          "shown.bs.modal",
          function () {
            document.getElementById("namaSales").focus();
          },
          { once: true },
        );
      }, 300);

      return;
    } else if (verifikasiAction === "delete") {
      // Delete logic remains the same
      const { deleteServisData } = await import("../services/servis-service.js");
      await deleteServisData(verifikasiData.id);

      todayData = todayData.filter((item) => item.id !== verifikasiData.id);
      updateRiwayatTable();

      Swal.fire({
        icon: "success",
        title: "Berhasil Dihapus!",
        text: "Data riwayat telah dihapus dari sistem",
        confirmButtonColor: "#28a745",
        timer: 3000,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    showErrorAlert("Error!", "Terjadi kesalahan: " + error.message);
  }

  const modal = bootstrap.Modal.getInstance(document.getElementById("verifikasiModal"));
  modal.hide();
}

function showDeleteSuccessModal() {
  const modal = new bootstrap.Modal(document.getElementById("deleteSuccessModal"));
  modal.show();
}

async function saveAllServisData() {
  const allItems = [...servisItemsServis, ...servisItemsCustom];

  if (allItems.length === 0) {
    showErrorModal("Validasi Error", "Tidak ada data untuk disimpan!");
    return;
  }

  const tanggal = document.getElementById("tanggal").value;

  if (!tanggal) {
    showErrorModal("Validasi Error", "Tanggal harus diisi!");
    return;
  }

  // Convert date format from dd/mm/yyyy to yyyy-mm-dd with current time
  const [day, month, year] = tanggal.split("/");
  const now = new Date();
  const tanggalWithTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  const formattedDate = tanggalWithTime.toISOString();

  try {
    showLoading(true);
    const savedItems = [];

    for (const item of allItems) {
      const servisData = {
        tanggal: formattedDate,
        ...item,
      };

      const docId = await saveServisData(servisData);
      const savedItem = { ...servisData, id: docId };
      savedItems.push(savedItem);
    }

    showLoading(false);
    // Broadcast each new item via BroadcastChannel (no localStorage)
    const servisBC = new BroadcastChannel("servisDataChannel");

    savedItems.forEach((item) => {
      const event = {
        action: "add",
        data: item,
        timestamp: Date.now(),
        source: "input-servis",
      };

      // Use BroadcastChannel for cross-tab communication (no localStorage needed)
      servisBC.postMessage(event);

      // Dispatch local event for same-tab listeners
      window.dispatchEvent(new CustomEvent("servisDataChanged", { detail: event }));
    });

    servisBC.close();

    // Show success modal and print nota
    showSuccessModal("Data Berhasil Disimpan", `${savedItems.length} data berhasil disimpan.`, savedItems);

    // Auto print nota after 500ms
    setTimeout(() => {
      const servisItems = savedItems.filter((item) => item.jenisInput === "servis");
      const customItems = savedItems.filter((item) => item.jenisInput === "custom");

      console.log("\ud83d\udcbe Auto print after save - Servis:", servisItems.length, "Custom:", customItems.length);

      if (servisItems.length > 0 && customItems.length > 0) {
        // Jika ada keduanya, print servis dulu
        console.log("\ud83d\udda8\ufe0f Auto printing both servis & custom nota...");
        printNotaServis(servisItems);
        // Delay print custom untuk menghindari konflik dengan popup servis
        setTimeout(() => {
          printNotaCustom(customItems);
        }, 1500);
      } else if (servisItems.length > 0) {
        // Hanya servis
        console.log("\ud83d\udda8\ufe0f Auto printing servis nota...");
        printNotaServis(servisItems);
      } else if (customItems.length > 0) {
        // Hanya custom - langsung print tanpa delay panjang
        console.log("\ud83d\udda8\ufe0f Auto printing custom nota...");
        printNotaCustom(customItems);
      }
    }, 500);

    // Reset form
    resetForm();
  } catch (error) {
    console.error("Error saving servis data:", error);
    showLoading(false);
    showErrorModal("Error", "Terjadi kesalahan saat menyimpan data: " + error.message);
  }
}

function resetForm() {
  servisItemsServis = [];
  servisItemsCustom = [];
  updateServisTableServis();
  updateServisTableCustom();

  // Reset date to today
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");
  document.getElementById("tanggal").value = formattedDate;
}

function handleFilterRiwayatChange() {
  const sectionServis = document.getElementById("sectionRiwayatServis");
  const sectionCustom = document.getElementById("sectionRiwayatCustom");

  if (filterJenisRiwayat === "servis") {
    sectionServis.style.display = "block";
    sectionCustom.style.display = "none";
  } else {
    sectionServis.style.display = "none";
    sectionCustom.style.display = "block";
  }

  // Update table jika sudah ada data
  if (todayData.length > 0) {
    updateRiwayatTable();
  }
}

async function loadRiwayatData() {
  const tanggalRiwayat = document.getElementById("tanggalRiwayat").value;

  if (!tanggalRiwayat) {
    alert("Pilih tanggal terlebih dahulu");
    return;
  }

  try {
    // Convert date format from dd/mm/yyyy to yyyy-mm-dd
    const [day, month, year] = tanggalRiwayat.split("/");
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    todayData = await getServisByDate(formattedDate);
    updateRiwayatTable();

    // Tampilkan tombol export dan print setelah data ditampilkan
    const actionButtons = document.getElementById("actionButtons");
    const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === filterJenisRiwayat);
    if (filteredData.length > 0) {
      actionButtons.style.display = "block";
    } else {
      actionButtons.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading riwayat data:", error);
    alert("Terjadi kesalahan saat memuat data");
  }
}

function updateRiwayatTable() {
  // Filter data berdasarkan jenis input
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === filterJenisRiwayat);

  if (filterJenisRiwayat === "servis") {
    updateRiwayatTableServis(filteredData);
  } else {
    updateRiwayatTableCustom(filteredData);
  }
}

function updateRiwayatTableServis(filteredData) {
  const tbody = document.querySelector("#tableRiwayatServis tbody");
  tbody.innerHTML = "";

  let totalOngkos = 0;

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" class="text-center">Belum ada data servis pada tanggal ini</td></tr>';
    document.getElementById("total-riwayat-ongkos").textContent = "Rp 0";
    return;
  }

  filteredData.forEach((item, index) => {
    const row = document.createElement("tr");
    const tanggalObj = new Date(item.tanggal);
    const tanggalFormatted = tanggalObj.toLocaleDateString("id-ID");

    // Use createdAt for accurate time, fallback to tanggal for old data
    let jamFormatted;
    if (item.createdAt && item.createdAt.toDate) {
      // Firestore Timestamp object
      jamFormatted = item.createdAt.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } else if (item.createdAt) {
      // Plain date object or string
      jamFormatted = new Date(item.createdAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      // Fallback to tanggal for old data
      jamFormatted = tanggalObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    // Hitung total ongkos dari semua items
    totalOngkos += item.ongkos || 0;

    // Prepare details
    const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const karatHtml = details.map((d) => `<div>${d.karat || "-"}</div>`).join("");
    const jenisHtml = details.map((d) => `<div>${d.jenisServis || "-"}</div>`).join("");
    const rincianHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

    // Status per item
    const statusHtml = details
      .map((d) => {
        const status = d.statusPembayaran || "nominal";
        return `<div><span class="badge bg-${getStatusBadgeColor(status)}">${getStatusLabel(status)}</span></div>`;
      })
      .join("");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tanggalFormatted}</td>
      <td>${jamFormatted}</td>
      <td>${item.namaSales}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.noHp}</td>
      <td class="multi-col">${namaBarangHtml}</td>
      <td class="multi-col">${beratHtml}</td>
      <td class="multi-col">${karatHtml}</td>
      <td class="multi-col">${jenisHtml}</td>
      <td class="multi-col">${rincianHtml}</td>
      <td class="multi-col">${ongkosHtml}</td>
      <td class="multi-col">${statusHtml}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1 mb-1" style="font-size: 12px; padding: 2px 5px;" onclick="editRiwayatItem('${
          item.id
        }', ${index})" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button
          class="btn btn-sm btn-danger me-1 mb-1"
          style="font-size: 12px; padding: 2px 5px;"
          onclick="deleteRiwayatItem('${item.id}', ${index})" title="Hapus">
          <i class="fas fa-trash"></i>
        </button>
        <button
          class="btn btn-sm btn-info mb-1"
          style="font-size: 12px; padding: 2px 5px;"
          onclick="printSingleItem('${item.id}', ${index})" title="Print Label">
          <i class="fas fa-print"></i>
        </button>
        <button
          class="btn btn-sm btn-success mb-1"
          style="font-size: 12px; padding: 2px 5px;"
          onclick="printNotaServisItem('${item.id}', ${index})" title="Reprint Nota">
          <i class="fas fa-receipt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("total-riwayat-ongkos").textContent = `Rp ${totalOngkos.toLocaleString("id-ID")}`;
}

function updateRiwayatTableCustom(filteredData) {
  const tbody = document.querySelector("#tableRiwayatCustom tbody");
  tbody.innerHTML = "";

  let totalDP = 0;
  let totalOngkos = 0;

  if (filteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="16" class="text-center">Belum ada data custom pada tanggal ini</td></tr>';
    document.getElementById("total-riwayat-dp").textContent = "Rp 0";
    document.getElementById("total-riwayat-ongkos-custom").textContent = "Rp 0";
    document.getElementById("total-riwayat-nominal").textContent = "Rp 0";
    return;
  }

  filteredData.forEach((item, index) => {
    const row = document.createElement("tr");
    const tanggalObj = new Date(item.tanggal);
    const tanggalFormatted = tanggalObj.toLocaleDateString("id-ID");

    // Use createdAt for accurate time, fallback to tanggal for old data
    let jamFormatted;
    if (item.createdAt && item.createdAt.toDate) {
      // Firestore Timestamp object
      jamFormatted = item.createdAt.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } else if (item.createdAt) {
      // Plain date object or string
      jamFormatted = new Date(item.createdAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      // Fallback to tanggal for old data
      jamFormatted = tanggalObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const panjangHtml = details.map((d) => `<div>${d.panjang || "-"}</div>`).join("");
    const kadarHtml = details.map((d) => `<div>${d.kadar || "-"}</div>`).join("");
    const warnaHtml = details.map((d) => `<div>${d.warna || "-"}</div>`).join("");
    const rincianCustomHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const totalDPHtml = details.map((d) => `<div>Rp ${(d.totalDP || 0).toLocaleString("id-ID")}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

    // Status per item
    const statusHtml = details
      .map((d) => {
        const status = d.statusPembayaran || "nominal";
        return `<div><span class="badge bg-${getStatusBadgeColor(status)}">${getStatusLabel(status)}</span></div>`;
      })
      .join("");

    details.forEach((d) => {
      totalDP += d.totalDP || 0;
      totalOngkos += d.ongkos || 0;
    });

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tanggalFormatted}</td>
      <td>${jamFormatted}</td>
      <td>${item.namaSales}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.noHp}</td>
      <td class="multi-col">${namaBarangHtml}</td>
      <td class="multi-col">${beratHtml}</td>
      <td class="multi-col">${panjangHtml}</td>
      <td class="multi-col">${kadarHtml}</td>
      <td class="multi-col">${warnaHtml}</td>
      <td class="multi-col">${rincianCustomHtml}</td>
      <td class="multi-col">${totalDPHtml}</td>
      <td class="multi-col">${ongkosHtml}</td>
      <td class="multi-col">${statusHtml}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1 mb-1" style="font-size: 12px; padding: 2px 5px;" onclick="editRiwayatItem('${
          item.id
        }', ${index})" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger me-1 mb-1" style="font-size: 12px; padding: 2px 5px;" onclick="deleteRiwayatItem('${
          item.id
        }', ${index})" title="Hapus">
          <i class="fas fa-trash"></i>
        </button>
        <button class="btn btn-sm btn-info mb-1" style="font-size: 12px; padding: 2px 5px;" onclick="printSingleItem('${
          item.id
        }', ${index})" title="Print Label">
          <i class="fas fa-print"></i>
        </button>
        <button class="btn btn-sm btn-success mb-1" style="font-size: 12px; padding: 2px 5px;" onclick="printNotaCustomItem('${
          item.id
        }', ${index})" title="Reprint Nota">
          <i class="fas fa-receipt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  const totalNominal = totalDP + totalOngkos;
  document.getElementById("total-riwayat-dp").textContent = `Rp ${totalDP.toLocaleString("id-ID")}`;
  document.getElementById("total-riwayat-ongkos-custom").textContent = `Rp ${totalOngkos.toLocaleString("id-ID")}`;
  document.getElementById("total-riwayat-nominal").textContent = `Rp ${totalNominal.toLocaleString("id-ID")}`;
}

// Create shared function for generating print box HTML
function generatePrintBox(item) {
  const jenisInput = item.jenisInput || "servis";
  const namaCustomer = item.namaCustomer || "N/A";

  if (jenisInput === "custom") {
    // Format untuk custom
    const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [];

    let combinedItems = "";
    if (details.length > 0) {
      combinedItems = details
        .map((d) => {
          const namaBarang = d.namaBarang || "-";
          const berat = d.berat || "-";
          const panjang = d.panjang || "-";
          const kadar = d.kadar || "-";
          const warna = d.warna || "-";
          const rincianCustom = d.rincianServis?.trim() || "";

          // Format: Nama Barang | Berat | Panjang | Kadar | Warna | Rincian
          let itemText = `${namaBarang}<br>B:${berat} P:${panjang}K:${kadar} W:${warna}`;
          if (rincianCustom) {
            itemText += `<br>${rincianCustom}`;
          }
          return itemText;
        })
        .join("<br>");
    } else {
      combinedItems = "Data tidak tersedia";
    }

    return `
      <div class="print-service-box">
        <div class="print-customer-name">${namaCustomer}</div>
        <div class="print-nama-brg">${combinedItems}</div>
        <div class="print-status">CUSTOM</div>
      </div>
    `;
  } else {
    // Format untuk servis
    const details =
      item.detailBarang && item.detailBarang.length > 0
        ? item.detailBarang
        : [
            {
              namaBarang: item.namaBarang || "-",
              jenisServis: item.jenisServis || "-",
              rincianServis: item.rincianServis || "",
              statusPembayaran: item.statusPembayaran || "nominal", // Fallback untuk data lama
            },
          ];

    // Kumpulkan semua status unik dari detail barang
    const uniqueStatuses = [...new Set(details.map((d) => d.statusPembayaran || "nominal"))];
    let statusText;

    if (uniqueStatuses.length === 1) {
      // Semua detail punya status sama
      statusText = getStatusLabel(uniqueStatuses[0]);
    } else {
      // Multiple status berbeda, gabungkan
      statusText = uniqueStatuses.map((s) => getStatusLabel(s)).join(" / ");
    }

    let combinedItems = "";
    if (details.length > 0) {
      combinedItems = details
        .map((d) => {
          const namaBarang = d.namaBarang || "-";
          const jenisServis = d.jenisServis || "-";
          const rincianServis = d.rincianServis?.trim() || "";

          // Format: Nama Barang - Jenis Servis - Rincian Servis (jika ada)
          if (rincianServis) {
            return `${namaBarang} - ${jenisServis} - ${rincianServis}`;
          } else {
            return `${namaBarang} - ${jenisServis}`;
          }
        })
        .join("<br>");
    } else {
      combinedItems = "Data tidak tersedia";
    }

    return `
      <div class="print-service-box">
        <div class="print-customer-name">${namaCustomer}</div>
        <div class="print-nama-brg">${combinedItems}</div>
        <div class="print-status">${statusText}</div>
      </div>
    `;
  }
}

// Create shared print styles function
function getPrintStyles() {
  return `
    <style>
      @page {
        size: A4;
        margin: 1cm;
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .header {
        text-align: center;
        margin-bottom: 20px;
      }
      .boxes-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 3mm;
      }
      .print-service-box {
        width: 3.5cm;
        height: 3.5cm;
        border: 1px solid #000;
        padding: 1.5mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        text-align: center;
        break-inside: avoid;
        overflow: hidden;
      }
      .print-customer-name {
        font-size: 8px;
        font-weight: bold;
        word-wrap: break-word;
        line-height: 1.1;
        margin: 0;
        padding: 0;
      }
      .print-nama-brg {
        font-size: 8px;
        font-weight: bold;
        word-wrap: break-word;
        word-break: break-word;
        line-height: 1.1;
        overflow: hidden;
        margin: 0;
        padding: 0;
      }
      .print-status {
        font-size: 7px;
        font-weight: bold;
        color: #202020ff;
        margin: 0;
        padding: 0;
      }
    </style>
  `;
}

window.printSingleItem = function (id, index) {
  const item = todayData.find((item) => item.id === id);

  if (!item) {
    alert("Data tidak ditemukan. Silakan klik 'Tampilkan' terlebih dahulu.");
    return;
  }

  console.log("🏷️ Print single label for:", item.namaCustomer);
  printLabelServis([item]);
};

// Fungsi untuk reprint nota servis individual dari riwayat
window.printNotaServisItem = function (id, index) {
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === "servis");
  const item = filteredData[index];
  if (!item) {
    alert("Data tidak ditemukan");
    return;
  }
  console.log("🧾 Reprint nota servis for:", item.namaCustomer);
  printNotaServis([item]);
};

// Fungsi untuk reprint nota custom individual dari riwayat
window.printNotaCustomItem = function (id, index) {
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === "custom");
  const item = filteredData[index];
  if (!item) {
    alert("Data tidak ditemukan");
    return;
  }

  printNotaCustom([item]);
};

// Print label servis - try service first, fallback to browser
// Print label servis - always use browser print
function printLabelServis(items) {
  console.log("🖨️ Print label servis:", items.length, "item(s)");
  printLabelServisBrowser(items);
}

// Browser print function for label servis (fallback)
function printLabelServisBrowser(items) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Popup diblokir oleh browser. Silakan izinkan popup untuk mencetak.");
    return;
  }

  // Generate boxes menggunakan shared function
  let boxesContent = "";
  items.forEach((item) => {
    boxesContent += generatePrintBox(item);
  });

  const printContent = `
    <html>
      <head>
        <title>Label Servis</title>
        ${getPrintStyles()}
      </head>
      <body>
        <div class="boxes-container">
          ${boxesContent}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();

  // Show success message
  Swal.fire({
    icon: "info",
    title: "Siap Cetak",
    text: "Silakan konfirmasi di dialog print browser",
    timer: 2000,
    showConfirmButton: false,
  });

  // Auto print 1x dengan auto-close
  printWindow.addEventListener("afterprint", () => {
    setTimeout(() => printWindow.close(), 100);
  });

  printWindow.print();
}

function printReport() {
  if (todayData.length === 0) {
    alert("Tidak ada data untuk dicetak");
    return;
  }

  console.log("🖨️ Print all labels, total:", todayData.length, "items");
  printLabelServis(todayData);
}

// Helper function untuk format text dengan padding
function padText(text, width, align = "left") {
  const cleanText = text.toString().trim();
  if (cleanText.length >= width) {
    return cleanText.substring(0, width);
  }

  const padding = width - cleanText.length;
  if (align === "right") {
    return " ".repeat(padding) + cleanText;
  } else if (align === "center") {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return " ".repeat(leftPad) + cleanText + " ".repeat(rightPad);
  } else {
    return cleanText + " ".repeat(padding);
  }
}

// Helper function untuk wrap text ke multiple lines
function wrapText(text, width) {
  const cleanText = text.toString().trim();
  if (cleanText.length <= width) {
    return [cleanText];
  }

  const lines = [];
  let currentLine = "";
  const words = cleanText.split(" ");

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= width) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Jika satu kata terlalu panjang, potong
        lines.push(word.substring(0, width));
        currentLine = word.substring(width);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Helper function untuk format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID").format(amount);
}

// Fungsi untuk generate HTML nota servis dengan table
function generateNotaHTML(servisData) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");
  const tanggalSelesai = getTanggalSelesai(3);

  if (servisData.length === 0) return "";

  const firstCustomer = servisData[0];
  const salesName = firstCustomer.namaSales || "Admin";
  const customerName = firstCustomer.namaCustomer || "";

  // Generate table rows
  let tableRows = "";
  servisData.forEach((servis) => {
    const details =
      servis.detailBarang && servis.detailBarang.length > 0
        ? servis.detailBarang
        : [
            {
              jumlah: 1,
              namaBarang: servis.namaBarang || "",
              berat: servis.berat || "",
              karat: servis.karat || "",
              jenisServis: servis.jenisServis || "",
              rincianServis: servis.rincianServis || "",
              ongkos: servis.ongkos || 0,
            },
          ];

    details.forEach((item) => {
      const statusPembayaran = item.statusPembayaran || "nominal";
      const statusLabel = getStatusLabel(statusPembayaran);
      const rincianServisText = item.rincianServis?.trim() || "";
      const namaBarangDisplay = rincianServisText
        ? `${item.namaBarang} - ${rincianServisText} [${statusLabel}]`
        : `${item.namaBarang} [${statusLabel}]`;

      tableRows += `
        <tr>
          <td style="text-align: center;">${item.jumlah || 1} pcs</td>
          <td>${namaBarangDisplay}</td>
          <td>${item.berat || ""}</td>
          <td>${item.karat || ""}</td>
          <td style="text-align: right;">${formatCurrency(item.ongkos || 0)}</td>
          <td>${item.jenisServis || ""}</td>
        </tr>
      `;
    });
  });

  return `
    <div class="customer-info">
      <div>${formattedDate}</div>
      <div>± ${tanggalSelesai}</div>
      <div style="margin-top: 3mm; line-height: 1.8;">${customerName}</div>
      <div style="margin-top: 3mm; line-height: 1.8;">${firstCustomer.noHp || firstCustomer.noTelepon || ""}</div>
    </div>

    <div class="nota-table">
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="signature-section">
      <div class="signature-customer">${customerName}</div>
      <div class="signature-sales">${salesName}</div>
    </div>

    <div class="nota-catatan">
      Catatan : Penurunan berat pasca pencucian/servis dapat terjadi karena pembersihan kotoran yang menempel
    </div>
  `;
}

// Helper function untuk menghitung tanggal selesai (tanggal + N hari)
function getTanggalSelesai(daysToAdd) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString("id-ID");
}

// Fungsi utama untuk print nota servis - try service first, fallback to browser
async function printNotaServis(servisData) {
  console.log("🔄 printNotaServis called for", servisData.length, "item(s)");

  // Show loading alert
  Swal.fire({
    title: "Memproses Print...",
    html: "Sedang mempersiapkan nota servis untuk dicetak",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Check if print service is available
  const isServiceOnline = await window.printService.checkAvailability();
  console.log("🖨️ Print service status:", isServiceOnline ? "✅ Online" : "❌ Offline");

  if (isServiceOnline) {
    try {
      const firstCustomer = servisData[0];
      const notaData = {
        tanggal: new Date().toLocaleDateString("id-ID"),
        tanggalSelesai: getTanggalSelesai(3),
        customerName: firstCustomer.namaCustomer || "",
        customerPhone: firstCustomer.noHp || firstCustomer.noTelepon || "",
        salesName: firstCustomer.namaSales || "Admin",
        items: [],
        totalOngkos: 0,
      };

      // Flatten items from all servis data
      servisData.forEach((servis) => {
        const details =
          servis.detailBarang && servis.detailBarang.length > 0
            ? servis.detailBarang
            : [
                {
                  jumlah: 1,
                  namaBarang: servis.namaBarang || "",
                  berat: servis.berat || "",
                  karat: servis.karat || "",
                  jenisServis: servis.jenisServis || "",
                  rincianServis: servis.rincianServis || "",
                  ongkos: servis.ongkos || 0,
                  statusPembayaran: servis.statusPembayaran || "nominal",
                },
              ];

        details.forEach((item) => {
          notaData.items.push({
            jumlah: item.jumlah || 1,
            namaBarang: item.namaBarang.trim(),
            berat: item.berat.trim(),
            karat: item.karat.trim(),
            jenisServis: item.jenisServis.trim(),
            rincianServis: item.rincianServis?.trim() || "",
            ongkos: parseInt(item.ongkos) || 0,
            statusPembayaran: item.statusPembayaran || "nominal",
          });
          notaData.totalOngkos += parseInt(item.ongkos) || 0;
        });
      });

      // Call print service API
      const result = await window.printService.print("/api/print/nota-servis", notaData);

      if (result.success) {
        console.log("✅ Nota servis queued for printing:", result.jobID);

        // Update loading message
        Swal.update({
          title: "Sedang Mencetak...",
          html: "Printer sedang memproses 2 salinan nota servis",
        });

        // Wait a bit then show success
        setTimeout(() => {
          Swal.close();
          Swal.fire({
            icon: "success",
            title: "Print Berhasil!",
            text: "2 salinan nota servis berhasil dicetak",
            timer: 2500,
            showConfirmButton: false,
          });
        }, 1500);
        return;
      }
    } catch (error) {
      console.warn("⚠️ Print service failed, using browser fallback:", error);
    }
  }

  // Fallback to browser print
  console.log("🌐 Using browser print (fallback)");
  Swal.close();
  printNotaServisBrowser(servisData);
}

// Browser print function for nota servis (fallback)
function printNotaServisBrowser(servisData) {
  const notaHTML = generateNotaHTML(servisData);
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    showErrorAlert("Popup Diblokir", "Popup diblokir oleh browser. Silakan izinkan popup untuk mencetak nota.");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Nota Servis - ${new Date().toLocaleDateString("id-ID")}</title>
        <style>
          @page {
            size: 20cm 12.9cm landscape;
            margin: 5mm;
          }
          body {
            margin: 0;
            padding: 5mm;
            font-family: Arial, sans-serif;
            font-size: 12px;
            font-weight: bold;
            position: relative;
          }
          .customer-info {
            position: absolute;
            top: 8mm;
            right: 25mm;
            line-height: 1.8;
            text-align: right;
            font-size: 12px;
          }
          .nota-table {
            margin-top: 4cm;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 2px 4px;
            vertical-align: top;
            font-size: 12px;
            line-height: 1.8;
          }
          td:nth-child(1) {
            width: 80px;
          }
          td:nth-child(2) {
            width: 190px;
          }
          td:nth-child(3) {
            width: 40px;
          }
          td:nth-child(4) {
            width: 40px;
          }
          td:nth-child(5) {
            width: 50px;
          }
          td:nth-child(6) {
            width: 100px;
          }
          .signature-section {
            position: absolute;
            top: 10.5cm;
            left: 11.5cm;
            right: 3cm;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }
          .signature-customer {
            text-align: left;
          }
          .signature-sales {
            text-align: right;
          }
          .nota-catatan {
            position: absolute;
            top: 12cm;
            left: 1cm;
            font-size: 10px;
            font-weight: normal;
            line-height: 1.3;
            max-width: 18cm;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        ${notaHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Show printing message
  Swal.fire({
    title: "Sedang Mencetak...",
    html: "Mohon tunggu, mencetak 2 salinan nota servis",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Print 2x
  let printCount = 0;
  const doPrint = () => {
    printCount++;
    printWindow.print();

    if (printCount < 2) {
      setTimeout(doPrint, 500);
    } else {
      // After 2nd print, show success
      setTimeout(() => {
        printWindow.close();
        Swal.close();
        Swal.fire({
          icon: "success",
          title: "Print Berhasil!",
          text: "2 salinan nota servis berhasil dicetak",
          timer: 2500,
          showConfirmButton: false,
        });
      }, 1000);
    }
  };

  printWindow.addEventListener("load", () => {
    setTimeout(doPrint, 300);
  });
}

// Fungsi untuk generate HTML nota custom
function generateNotaCustomHTML(servisData) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");

  if (servisData.length === 0) return "";

  const firstCustomer = servisData[0];
  const salesName = firstCustomer.namaSales || "Admin";

  let tableRows = "";
  let totalDP = 0;
  let totalOngkos = 0;

  servisData.forEach((servis) => {
    const details = servis.detailBarangCustom || [];

    details.forEach((item) => {
      const namaBarangParts = [item.namaBarang || "-"];
      if (item.panjang && item.panjang.trim()) namaBarangParts.push(`P: ${item.panjang}cm`);
      if (item.kadar && item.kadar.trim()) namaBarangParts.push(`K: ${item.kadar}`);
      if (item.warna && item.warna.trim()) namaBarangParts.push(`W: ${item.warna}`);
      const namaBarangGabungan = namaBarangParts.join(", ");

      // Tambahkan simbol ± di depan berat jika ada nilai, default "-"
      const beratText = item.berat && item.berat.trim() ? `± ${item.berat}` : "-";

      // Get status pembayaran
      const status = item.statusPembayaran || "nominal";
      const statusText = getStatusLabel(status);

      tableRows += `
        <tr>
          <td style="text-align: center;">${item.jumlah || 1} pcs</td>
          <td>${namaBarangGabungan}<br><span style="font-size: 10px; font-style: italic;">(${statusText})</span></td>
          <td>${beratText}</td>
          <td style="text-align: right;">${formatCurrency(item.totalDP || 0)}</td>
          <td style="text-align: right;">${formatCurrency(item.ongkos || 0)}</td>
          <td>${item.rincianServis && item.rincianServis.trim() ? item.rincianServis : "-"}</td>
        </tr>
      `;

      // Akumulasi total
      totalDP += item.totalDP || 0;
      totalOngkos += item.ongkos || 0;
    });
  });

  // Hitung grand total (DP + Ongkos)
  const grandTotal = totalDP + totalOngkos;

  // Determine dpLabel based on all items' statusPembayaran
  let dpLabel = "DP"; // default
  let allItemsLunas = true;

  servisData.forEach((servis) => {
    const details = servis.detailBarangCustom || [];
    details.forEach((item) => {
      const status = item.statusPembayaran || "nominal";
      if (status !== "nominal") {
        allItemsLunas = false;
      }
    });
  });

  if (allItemsLunas) {
    dpLabel = "LUNAS";
  } else {
    dpLabel = "DP";
  }

  return `
    <div class="customer-info">
      <div>${formattedDate}</div>
      <div style="margin-top: 3mm;">${firstCustomer.namaCustomer}</div>
      <div style="margin-top: 3mm;">${firstCustomer.noHp || ""}</div>
    </div>

    <div class="nota-table">
      <table>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="bayar-awal-section">
      <span class="bayar-awal-label">BAYAR AWAL</span>
      <span class="bayar-awal-value">${formatCurrency(grandTotal)}</span>
    </div>

    <div class="total-dp-info">
      ${formatCurrency(totalDP)} (${dpLabel})
    </div>

    <div class="note-info">
      Note : Ongkos tidak termasuk hitungan pelunasan
    </div>

    <div class="signature-section">
      <div class="signature-sales">Sales: ${salesName}</div>
    </div>
  `;
}

// Fungsi utama untuk print nota custom - try service first, fallback to browser
async function printNotaCustom(servisData) {
  // Show loading alert
  Swal.fire({
    title: "Memproses Print...",
    html: "Sedang mempersiapkan nota custom untuk dicetak",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Check if print service is available
  const isServiceOnline = await window.printService.checkAvailability();
  console.log("🖨️ Print service status:", isServiceOnline ? "✅ Online" : "❌ Offline");

  if (isServiceOnline) {
    try {
      const firstCustomer = servisData[0];
      const notaData = {
        tanggal: new Date().toLocaleDateString("id-ID"),
        customerName: firstCustomer.namaCustomer || "",
        customerPhone: firstCustomer.noHp || "",
        salesName: firstCustomer.namaSales || "Admin",
        items: [],
        totalDP: 0,
        totalOngkos: 0,
        grandTotal: 0,
      };

      // Flatten items from all custom data
      servisData.forEach((servis) => {
        const details = servis.detailBarangCustom || [];

        details.forEach((item) => {
          const statusPembayaran = item.statusPembayaran || "nominal";

          notaData.items.push({
            jumlah: parseInt(item.jumlah) || 1,
            namaBarang: item.namaBarang.trim(),
            berat: item.berat?.trim() || "",
            panjang: item.panjang?.trim() || "",
            kadar: item.kadar?.trim() || "",
            warna: item.warna?.trim() || "",
            totalDP: parseInt(item.totalDP) || 0,
            ongkos: parseInt(item.ongkos) || 0,
            statusPembayaran: statusPembayaran,
            rincianServis: item.rincianServis?.trim() || "",
          });
          notaData.totalDP += parseInt(item.totalDP) || 0;
          notaData.totalOngkos += parseInt(item.ongkos) || 0;
        });
      });

      notaData.grandTotal = notaData.totalDP + notaData.totalOngkos;

      // Call print service API
      const result = await window.printService.print("/api/print/nota-custom", notaData);

      if (result.success) {
        console.log("✅ Nota custom queued for printing:", result.jobID);

        // Update loading message
        Swal.update({
          title: "Sedang Mencetak...",
          html: "Printer sedang memproses 2 salinan nota custom",
        });

        // Wait a bit then show success
        setTimeout(() => {
          Swal.close();
          Swal.fire({
            icon: "success",
            title: "Print Berhasil!",
            text: "2 salinan nota custom berhasil dicetak",
            timer: 2500,
            showConfirmButton: false,
          });
        }, 1500);
        return;
      }
    } catch (error) {
      console.warn("⚠️ Print service failed, using browser fallback:", error);
    }
  }

  // Fallback to browser print
  console.log("🌐 Using browser print (fallback)");
  Swal.close();
  printNotaCustomBrowser(servisData);
}

// Browser print function for nota custom (fallback)
function printNotaCustomBrowser(servisData) {
  const notaHTML = generateNotaCustomHTML(servisData);
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    showErrorAlert("Popup Diblokir", "Popup diblokir oleh browser. Silakan izinkan popup untuk mencetak nota.");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Nota Custom - ${new Date().toLocaleDateString("id-ID")}</title>
        <style>
          @page {
            size: 17cm 12cm landscape;
            margin: 5mm;
          }
          body {
            margin: 0;
            padding: 5mm;
            font-family: Arial, sans-serif;
            font-size: 12px;
            font-weight: bold;
            position: relative;
          }
          .customer-info {
            position: absolute;
            top: 8mm;
            right: 20mm;
            line-height: 1.8;
            text-align: right;
            font-size: 12px;
          }
          .nota-table {
            margin-top: 4cm;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 2px 4px;
            vertical-align: top;
            font-size: 12px;
            line-height: 2;
          }
          td:nth-child(1) {
            width: 55px;
          }
          td:nth-child(2) {
            width: 220px;
          }
          td:nth-child(3) {
            width: 45px;
            align-items: center;
          }
          td:nth-child(4) {
            width: 65px;
            align-items: center;
          }
          td:nth-child(5) {
            width: 65px;
          }
          td:nth-child(6) {
            width: 70px;
          }
          .bayar-awal-section {
            position: absolute;
            top: 6cm;
            right: 40mm;
            display: flex;
            gap: 10px;
            font-size: 12px;
            font-weight: bold;
          }
          .bayar-awal-label {
            text-align: right;
          }
          .bayar-awal-value {
            text-align: right;
            min-width: 80px;
          }
          .total-dp-info {
            position: absolute;
            top: 9.5cm;
            right: 20mm;
            font-size: 12px;
            font-weight: bold;
            text-align: right;
            line-height: 2;
          }
          .note-info {
            position: absolute;
            top: 11.1cm;
            right: 10mm;
            font-size: 10px;
            font-weight: bold;
            font-style: italic;
            text-align: right;
            color: #333;
          }
          .signature-section {
            position: absolute;
            top: 11.1cm;
            left: 8mm;
            font-size: 12px;
          }
          .signature-sales {
            text-align: left;
          }
        </style>
      </head>
      <body>
        ${notaHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Show printing message
  Swal.fire({
    title: "Sedang Mencetak...",
    html: "Mohon tunggu, mencetak 2 salinan nota custom",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Print 2x
  let printCount = 0;
  const doPrint = () => {
    printCount++;
    printWindow.print();

    if (printCount < 2) {
      setTimeout(doPrint, 500);
    } else {
      // After 2nd print, show success
      setTimeout(() => {
        printWindow.close();
        Swal.close();
        Swal.fire({
          icon: "success",
          title: "Print Berhasil!",
          text: "2 salinan nota custom berhasil dicetak",
          timer: 2500,
          showConfirmButton: false,
        });
      }, 1000);
    }
  };

  printWindow.addEventListener("load", () => {
    setTimeout(doPrint, 300);
  });
}

function exportServisToPDF() {
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === "servis");

  if (filteredData.length === 0) {
    alert("Tidak ada data servis untuk diekspor");
    return;
  }

  try {
    const tanggalRiwayat = document.getElementById("tanggalRiwayat").value;
    const totalOngkos = filteredData.reduce((sum, item) => {
      const statusPembayaran = item.statusPembayaran || "nominal";
      return statusPembayaran === "nominal" || statusPembayaran === "custom" ? sum + (item.ongkos || 0) : sum;
    }, 0);

    const tableBody = [
      [
        { text: "No", style: "tableHeader" },
        { text: "Sales", style: "tableHeader" },
        { text: "Customer", style: "tableHeader" },
        { text: "No HP", style: "tableHeader" },
        { text: "Nama Barang", style: "tableHeader" },
        { text: "Berat", style: "tableHeader" },
        { text: "Karat", style: "tableHeader" },
        { text: "Jenis Servis", style: "tableHeader" },
        { text: "Rincian Servis", style: "tableHeader" },
        { text: "Ongkos", style: "tableHeader" },
        { text: "Status", style: "tableHeader" },
      ],
    ];

    filteredData.forEach((item, index) => {
      const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [{}];
      details.forEach((d, idx) => {
        const statusPembayaran = d.statusPembayaran || "nominal";

        tableBody.push([
          { text: idx === 0 ? (index + 1).toString() : "", style: "tableCell" },
          { text: idx === 0 ? item.namaSales || "" : "", style: "tableCell" },
          { text: idx === 0 ? item.namaCustomer || "" : "", style: "tableCell" },
          { text: idx === 0 ? item.noHp || "" : "", style: "tableCell" },
          { text: d.namaBarang || "-", style: "tableCell" },
          { text: d.berat || "-", style: "tableCell" },
          { text: d.karat || "-", style: "tableCell" },
          { text: d.jenisServis || "-", style: "tableCell" },
          { text: d.rincianServis || "-", style: "tableCell" },
          { text: `Rp ${(d.ongkos || 0).toLocaleString("id-ID")}`, style: "tableCellRight" },
          { text: getStatusLabel(statusPembayaran), style: "tableCell" },
        ]);
      });
    });

    tableBody.push([
      { text: "", colSpan: 8, style: "tableCell" },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { text: "TOTAL:", style: "tableCellBold", alignment: "right" },
      { text: `Rp ${totalOngkos.toLocaleString("id-ID")}`, style: "tableCellBoldRight" },
      { text: "", style: "tableCell" },
    ]);

    const docDefinition = {
      pageOrientation: "landscape",
      pageMargins: [15, 25, 15, 25],
      content: [
        {
          text: "LAPORAN SERVIS MELATI GOLD SHOP",
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 5],
        },
        {
          text: `Tanggal: ${tanggalRiwayat}`,
          style: "subheader",
          alignment: "center",
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            headerRows: 1,
            widths: [20, 50, 70, 60, 160, 35, 35, 70, 140, 50, 40],
            body: tableBody,
          },
          layout: getPDFLayout(),
        },
      ],
      styles: getPDFStyles(),
    };

    pdfMake.createPdf(docDefinition).download(`Laporan_Servis_${tanggalRiwayat.replace(/\//g, "-")}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("Terjadi kesalahan saat mengekspor PDF");
  }
}

function exportCustomToPDF() {
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === "custom");

  if (filteredData.length === 0) {
    alert("Tidak ada data custom untuk diekspor");
    return;
  }

  try {
    const tanggalRiwayat = document.getElementById("tanggalRiwayat").value;
    let totalDP = 0;
    let totalOngkos = 0;

    const tableBody = [
      [
        { text: "No", style: "tableHeader" },
        { text: "Sales", style: "tableHeader" },
        { text: "Customer", style: "tableHeader" },
        { text: "No HP", style: "tableHeader" },
        { text: "Nama Barang", style: "tableHeader" },
        { text: "Berat", style: "tableHeader" },
        { text: "Panjang", style: "tableHeader" },
        { text: "Kadar", style: "tableHeader" },
        { text: "Warna", style: "tableHeader" },
        { text: "Rincian Custom", style: "tableHeader" },
        { text: "Total DP", style: "tableHeader" },
        { text: "Ongkos", style: "tableHeader" },
      ],
    ];

    filteredData.forEach((item, index) => {
      const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [{}];
      details.forEach((d, idx) => {
        totalDP += d.totalDP || 0;
        totalOngkos += d.ongkos || 0;

        tableBody.push([
          { text: idx === 0 ? (index + 1).toString() : "", style: "tableCell" },
          { text: idx === 0 ? item.namaSales || "" : "", style: "tableCell" },
          { text: idx === 0 ? item.namaCustomer || "" : "", style: "tableCell" },
          { text: idx === 0 ? item.noHp || "" : "", style: "tableCell" },
          { text: d.namaBarang || "-", style: "tableCell" },
          { text: d.berat || "-", style: "tableCell" },
          { text: d.panjang || "-", style: "tableCell" },
          { text: d.kadar || "-", style: "tableCell" },
          { text: d.warna || "-", style: "tableCell" },
          { text: d.rincianServis || "-", style: "tableCell" },
          { text: `Rp ${(d.totalDP || 0).toLocaleString("id-ID")}`, style: "tableCellRight" },
          { text: `Rp ${(d.ongkos || 0).toLocaleString("id-ID")}`, style: "tableCellRight" },
        ]);
      });
    });

    const totalNominal = totalDP + totalOngkos;
    tableBody.push([
      { text: "TOTAL:", colSpan: 10, style: "tableCellBold", alignment: "right" },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { text: `Rp ${totalDP.toLocaleString("id-ID")}`, style: "tableCellBoldRight" },
      { text: `Rp ${totalOngkos.toLocaleString("id-ID")}`, style: "tableCellBoldRight" },
    ]);
    tableBody.push([
      { text: "TOTAL NOMINAL:", colSpan: 11, style: "tableCellBold", alignment: "right" },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { text: `Rp ${totalNominal.toLocaleString("id-ID")}`, style: "tableCellBoldRight" },
    ]);

    const docDefinition = {
      pageOrientation: "landscape",
      pageMargins: [15, 25, 15, 25],
      content: [
        {
          text: "LAPORAN CUSTOM MELATI GOLD SHOP",
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 5],
        },
        {
          text: `Tanggal: ${tanggalRiwayat}`,
          style: "subheader",
          alignment: "center",
          margin: [0, 0, 0, 8],
        },
        {
          table: {
            headerRows: 1,
            widths: [20, 40, 70, 60, 160, 35, 35, 35, 35, 140, 50, 50],
            body: tableBody,
          },
          layout: getPDFLayout(),
        },
      ],
      styles: getPDFStyles(),
    };

    pdfMake.createPdf(docDefinition).download(`Laporan_Custom_${tanggalRiwayat.replace(/\//g, "-")}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("Terjadi kesalahan saat mengekspor PDF");
  }
}

function getPDFLayout() {
  return {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 2 : 1),
    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 2 : 1),
    hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? "#666666" : "#cccccc"),
    vLineColor: (i, node) => (i === 0 || i === node.table.widths.length ? "#666666" : "#cccccc"),
    paddingLeft: () => 3,
    paddingRight: () => 3,
    paddingTop: () => 2,
    paddingBottom: () => 1,
  };
}

function getPDFStyles() {
  return {
    header: { fontSize: 16, bold: true, color: "#2c3e50" },
    subheader: { fontSize: 12, bold: true, color: "#34495e" },
    tableHeader: {
      bold: true,
      fontSize: 9,
      color: "white",
      fillColor: "#3498db",
      alignment: "center",
    },
    tableCell: { fontSize: 8, margin: [0, 1, 0, 1] },
    tableCellRight: { fontSize: 8, alignment: "right", margin: [0, 1, 0, 1] },
    tableCellBold: { fontSize: 8, bold: true, fillColor: "#ecf0f1", margin: [0, 1, 0, 1] },
    tableCellBoldRight: {
      fontSize: 8,
      bold: true,
      alignment: "right",
      fillColor: "#ecf0f1",
      margin: [0, 1, 0, 1],
    },
  };
}

function showLoading(show) {
  let loadingOverlay = document.getElementById("loadingOverlay");

  if (show) {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement("div");
      loadingOverlay.id = "loadingOverlay";
      loadingOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 9999; display: flex;
                    align-items: center; justify-content: center;">
          <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="mt-2">Menyimpan data...</div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingOverlay);
    }
    document.body.style.cursor = "wait";
  } else {
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
    document.body.style.cursor = "default";
  }
}

function showSuccessModal(title, message, items = []) {
  document.getElementById("successModalTitle").textContent = title;

  // Simplified content - hanya tampilkan ringkasan
  let content = `
    <div class="text-center">
      <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
      <p class="mt-3 mb-2">${message}</p>
    </div>
  `;

  document.getElementById("successModalContent").innerHTML = content;

  const modal = new bootstrap.Modal(document.getElementById("successModal"));
  modal.show();

  // Auto close setelah 1.5 detik untuk UX lebih cepat
  setTimeout(() => {
    const modalElement = document.getElementById("successModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }
  }, 1500);
}

function showErrorModal(title, message) {
  document.getElementById("errorModalTitle").textContent = title;
  document.getElementById("errorModalContent").innerHTML = `<p>${message}</p>`;

  const modal = new bootstrap.Modal(document.getElementById("errorModal"));
  modal.show();
}
