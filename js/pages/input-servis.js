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

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  initializePage();
  setupEventListeners();
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

  // Status pembayaran change handler
  document.getElementById("statusPembayaran").addEventListener("change", function () {
    handleStatusPembayaranChange();
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

  // Status pembayaran change handler
  document.getElementById("statusPembayaran").addEventListener("change", function () {
    handleStatusPembayaranChange();
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
          <option value="CUCI" ${item.jenisServis === "CUCI" ? "selected" : ""}>CUCI</option>
          <option value="CHROME GOLD" ${item.jenisServis === "CHROME GOLD" ? "selected" : ""}>CHROME GOLD 22K</option>
          <option value="CHROME SELEB" ${item.jenisServis === "CHROME SELEB" ? "selected" : ""}>CHROME SELEB</option>
          <option value="CHROME PUTIH" ${item.jenisServis === "CHROME PUTIH" ? "selected" : ""}>CHROME PUTIH</option>
          <option value="CHROME ROSE" ${item.jenisServis === "CHROME ROSE" ? "selected" : ""}>CHROME ROSE</option>
          <option value="CUSTOM" ${item.jenisServis === "CUSTOM" ? "selected" : ""}>CUSTOM</option>
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

  const statusPembayaran = document.getElementById("statusPembayaran").value;

  if (jenisInput === "servis") {
    for (let i = 0; i < detailBarangItems.length; i++) {
      const item = detailBarangItems[i];
      if (!item.namaBarang.trim() || !item.jenisServis.trim()) {
        showErrorModal("Validasi Error", `Nama barang dan jenis servis pada baris ${i + 1} harus diisi!`);
        return false;
      }
      if (
        (statusPembayaran === "nominal" || statusPembayaran === "custom") &&
        (!item.ongkos || parseInt(item.ongkos) <= 0)
      ) {
        const labelText = statusPembayaran === "custom" ? "DP" : "Ongkos";
        showErrorModal(
          "Validasi Error",
          `${labelText} pada baris ${i + 1} harus diisi untuk status ${statusPembayaran}!`
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
  const statusPembayaran = document.getElementById("statusPembayaran").value;

  // Set semua ongkos item ke 0 jika status free
  if (statusPembayaran === "free") {
    detailBarangItems.forEach((item) => {
      item.ongkos = 0;
    });
    updateDetailBarangTable();
    detailBarangCustomItems.forEach((item) => {
      item.ongkos = 0;
      item.totalDp = 0;
    });
    updateDetailBarangCustomTable();
  }
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
    document.getElementById("statusPembayaran").value = item.statusPembayaran || "nominal";
    document.getElementById("ongkos").value = item.totalOngkos || item.ongkos || 0;

    // Set jenis input
    jenisInput = item.jenisInput || "servis";
    document.getElementById("jenisInput").value = jenisInput;
    handleJenisInputChange();

    // Trigger status change untuk set proper state
    handleStatusPembayaranChange();

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
    { once: true }
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
  const statusPembayaran = document.getElementById("statusPembayaran").value;

  // Validation
  if (!namaSales || !namaCustomer || !noHp || !statusPembayaran) {
    showErrorModal("Validasi Error", "Data customer harus diisi dengan benar!");
    return;
  }

  // Validate detail barang (include ongkos validation)
  if (!validateDetailBarang()) {
    return;
  }

  let servisItem = {
    namaSales,
    namaCustomer,
    noHp,
    statusPembayaran,
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
    }));
    servisItem.totalOngkos = statusPembayaran === "free" ? 0 : totalOngkos;
    servisItem.namaBarang = detailBarangItems[0]?.namaBarang || "";
    servisItem.berat = detailBarangItems[0]?.berat || "";
    servisItem.karat = detailBarangItems[0]?.karat || "";
    servisItem.jenisServis = detailBarangItems[0]?.jenisServis || "";
    servisItem.ongkos = statusPembayaran === "free" ? 0 : totalOngkos;
  } else {
    const totalDp = detailBarangCustomItems.reduce((sum, item) => sum + (parseInt(item.totalDp) || 0), 0);
    const totalOngkos = detailBarangCustomItems.reduce((sum, item) => sum + (parseInt(item.ongkos) || 0), 0);
    servisItem.detailBarangCustom = detailBarangCustomItems.map((item) => ({
      jumlah: parseInt(item.jumlah) || 1,
      namaBarang: item.namaBarang.trim(),
      berat: item.berat.trim(),
      panjang: item.panjang.trim(),
      kadar: item.kadar.trim(),
      warna: item.warna.trim(),
      totalDP: parseInt(item.totalDp) || 0,
      ongkos: parseInt(item.ongkos) || 0,
      rincianServis: item.rincianServis.trim(),
    }));
    servisItem.totalDP = statusPembayaran === "free" ? 0 : totalDp;
    servisItem.totalOngkos = statusPembayaran === "free" ? 0 : totalOngkos;
    servisItem.namaBarang = detailBarangCustomItems[0]?.namaBarang || "";
    servisItem.ongkos = statusPembayaran === "free" ? 0 : totalOngkos;
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
          originalDate.getSeconds()
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

      alert("Data berhasil diupdate");
      editingRiwayatId = null;
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Terjadi kesalahan saat mengupdate data");
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
        item.namaBarang.toLowerCase() === servisItem.namaBarang.toLowerCase()
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
}

function updateServisTableServis() {
  const tbody = document.querySelector("#tableInputServis tbody");
  tbody.innerHTML = "";

  let totalOngkos = 0;

  servisItemsServis.forEach((item, index) => {
    const row = document.createElement("tr");
    const statusPembayaran = item.statusPembayaran || "nominal";

    if (statusPembayaran === "nominal" || statusPembayaran === "custom") {
      totalOngkos += item.totalOngkos || item.ongkos || 0;
    }

    const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const karatHtml = details.map((d) => `<div>${d.karat || "-"}</div>`).join("");
    const jenisHtml = details.map((d) => `<div>${d.jenisServis || "-"}</div>`).join("");
    const rincianHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

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
      <td>
        <span class="badge bg-${getStatusBadgeColor(statusPembayaran)}">
          ${getStatusLabel(statusPembayaran)}
        </span>
      </td>
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
    const statusPembayaran = item.statusPembayaran || "nominal";

    const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const panjangHtml = details.map((d) => `<div>${d.panjang || "-"}</div>`).join("");
    const kadarHtml = details.map((d) => `<div>${d.kadar || "-"}</div>`).join("");
    const warnaHtml = details.map((d) => `<div>${d.warna || "-"}</div>`).join("");
    const totalDPHtml = details.map((d) => `<div>Rp ${(d.totalDP || 0).toLocaleString("id-ID")}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

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
      <td>
        <span class="badge bg-${getStatusBadgeColor(statusPembayaran)}">
          ${getStatusLabel(statusPembayaran)}
        </span>
      </td>
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
    free: "info",
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

window.deleteServisItem = function (index) {
  if (confirm("Apakah Anda yakin ingin menghapus item ini?")) {
    servisItemsServis.splice(index, 1);
    updateServisTableServis();
  }
};

window.editCustomItem = function (index) {
  jenisInput = "custom";
  openServisModal(index);
};

window.deleteCustomItem = function (index) {
  if (confirm("Apakah Anda yakin ingin menghapus item ini?")) {
    servisItemsCustom.splice(index, 1);
    updateServisTableCustom();
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
    { once: true }
  );
};

window.deleteRiwayatItem = function (id, index) {
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
    { once: true }
  );
};

async function handleVerifikasi() {
  const kode = document.getElementById("kodeVerifikasi").value;

  if (kode !== "smlt116") {
    alert("Kode verifikasi salah!");
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
      document.getElementById("statusPembayaran").value = item.statusPembayaran || "nominal";
      document.getElementById("ongkos").value = item.ongkos;

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
          }));
          detailBarangCustomCounter = detailBarangCustomItems.length + 1;
        }
      }

      // Tampilkan dan isi field tanggal edit (with time info)
      document.getElementById("tanggalEditRow").style.display = "block";
      const tanggalObj = new Date(item.tanggal);
      const tanggalFormatted = tanggalObj.toLocaleDateString("id-ID");
      const jamFormatted = tanggalObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
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
          { once: true }
        );
      }, 300);

      return;
    } else if (verifikasiAction === "delete") {
      // Delete logic remains the same
      const { deleteServisData } = await import("../services/servis-service.js");
      await deleteServisData(verifikasiData.id);

      todayData = todayData.filter((item) => item.id !== verifikasiData.id);
      updateRiwayatTable();

      showDeleteSuccessModal();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Terjadi kesalahan: " + error.message);
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
    // Broadcast each new item
    savedItems.forEach((item) => {
      const event = {
        action: "add",
        data: item,
        timestamp: Date.now(),
        source: "input-servis",
      };

      localStorage.setItem("servisDataChange", JSON.stringify(event));
      window.dispatchEvent(new CustomEvent("servisDataChanged", { detail: event }));
    });

    // Show success modal and print nota
    showSuccessModal("Data Berhasil Disimpan", `${savedItems.length} data berhasil disimpan.`, savedItems);

    // Auto print nota after 1 second
    setTimeout(() => {
      const servisItems = savedItems.filter((item) => item.jenisInput === "servis");
      const customItems = savedItems.filter((item) => item.jenisInput === "custom");

      if (servisItems.length > 0) {
        printNotaServis(servisItems);
      }
      if (customItems.length > 0) {
        printNotaCustom(customItems);
      }
    }, 1000);

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
    tbody.innerHTML = '<tr><td colspan="13" class="text-center">Belum ada data servis pada tanggal ini</td></tr>';
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
      jamFormatted = new Date(item.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } else {
      // Fallback to tanggal for old data
      jamFormatted = tanggalObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    const statusPembayaran = item.statusPembayaran || "nominal";

    // Hitung total untuk status nominal dan custom
    if (statusPembayaran === "nominal" || statusPembayaran === "custom") {
      totalOngkos += item.ongkos || 0;
    }

    // Prepare details
    const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const karatHtml = details.map((d) => `<div>${d.karat || "-"}</div>`).join("");
    const jenisHtml = details.map((d) => `<div>${d.jenisServis || "-"}</div>`).join("");
    const rincianHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

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
    tbody.innerHTML = '<tr><td colspan="15" class="text-center">Belum ada data custom pada tanggal ini</td></tr>';
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
      jamFormatted = new Date(item.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } else {
      // Fallback to tanggal for old data
      jamFormatted = tanggalObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    const statusPembayaran = item.statusPembayaran || "nominal";

    const details = item.detailBarangCustom && item.detailBarangCustom.length > 0 ? item.detailBarangCustom : [];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const panjangHtml = details.map((d) => `<div>${d.panjang || "-"}</div>`).join("");
    const kadarHtml = details.map((d) => `<div>${d.kadar || "-"}</div>`).join("");
    const warnaHtml = details.map((d) => `<div>${d.warna || "-"}</div>`).join("");
    const rincianCustomHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const totalDPHtml = details.map((d) => `<div>Rp ${(d.totalDP || 0).toLocaleString("id-ID")}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

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
    const statusPembayaran = item.statusPembayaran || "nominal";
    let statusText = getStatusLabel(statusPembayaran);

    const details =
      item.detailBarang && item.detailBarang.length > 0
        ? item.detailBarang
        : [
            {
              namaBarang: item.namaBarang || "-",
              jenisServis: item.jenisServis || "-",
              rincianServis: item.rincianServis || "",
            },
          ];

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
        width: 3cm;
        height: 3cm;
        border: 1px solid #000;
        padding: 1.5mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
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
        font-size: 7px;
        font-weight: bold;
        word-wrap: break-word;
        word-break: break-word;
        line-height: 1.1;
        overflow: hidden;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin: 0;
        padding: 1px 0;
      }
      .print-status {
        font-size: 7px;
        font-weight: bold;
        color: #333;
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

  const printWindow = window.open("", "_blank");
  const tanggalFormatted = new Date(item.tanggal).toLocaleDateString("id-ID");

  const printContent = `
    <html>
      <head>
        <title>Label Servis - ${item.namaCustomer}</title>
        ${getPrintStyles()}
      </head>
      <body>
        <div class="boxes-container">
          ${generatePrintBox(item)}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();

  // Auto print 2x (double print) dengan auto-close
  let printCount = 0;
  const handleAfterPrint = () => {
    printCount++;
    if (printCount === 2) {
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      setTimeout(() => printWindow.close(), 100);
    }
  };

  printWindow.addEventListener("afterprint", handleAfterPrint);

  printWindow.print();
  setTimeout(() => {
    printWindow.print();
  }, 100);
};

// Fungsi untuk reprint nota servis individual dari riwayat
window.printNotaServisItem = function (id, index) {
  const filteredData = todayData.filter((item) => (item.jenisInput || "servis") === "servis");
  const item = filteredData[index];
  if (!item) {
    alert("Data tidak ditemukan");
    return;
  }
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

function printReport() {
  if (todayData.length === 0) {
    alert("Tidak ada data untuk dicetak");
    return;
  }

  const tanggalRiwayat = document.getElementById("tanggalRiwayat").value;
  const printWindow = window.open("", "_blank");

  // Generate boxes menggunakan shared function
  let boxesContent = "";
  todayData.forEach((item) => {
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

  // Auto-close setelah print selesai
  printWindow.addEventListener("afterprint", () => {
    setTimeout(() => printWindow.close(), 100);
  });

  printWindow.print();
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
      const statusPembayaran = servis.statusPembayaran || "nominal";
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
      <div style="margin-top: 3mm;">${customerName}</div>
      <div style="margin-top: 3mm;">${firstCustomer.noHp || firstCustomer.noTelepon || ""}</div>
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
  `;
}

// Fungsi utama untuk print nota servis dengan HTML table
function printNotaServis(servisData) {
  const notaHTML = generateNotaHTML(servisData);
  const printWindow = window.open("", "_blank");

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
        </style>
      </head>
      <body>
        ${notaHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Auto print 2x (double print) dengan auto-close
  let printCount = 0;
  const handleAfterPrint = () => {
    printCount++;
    if (printCount === 2) {
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      setTimeout(() => printWindow.close(), 100);
    }
  };

  printWindow.addEventListener("afterprint", handleAfterPrint);

  printWindow.print();
  setTimeout(() => {
    printWindow.print();
  }, 1000);
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

      tableRows += `
        <tr>
          <td style="text-align: center;">${item.jumlah || 1} pcs</td>
          <td>${namaBarangGabungan}</td>
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

  // Tambahkan baris total
  tableRows += `
    <tr>
      <td></td>
      <td></td>
      <td></td>
      <td style="text-align: right; font-weight: bold;">BAYAR AWAL</td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(grandTotal)}</td>
      <td></td>
    </tr>
  `;

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
    
    <div class="total-dp-info">
      ${formatCurrency(totalDP)} (DP)
    </div>
    
    <div class="note-info">
      Note : Ongkos tidak termasuk hitungan pelunasan
    </div>
    
    <div class="signature-section">
      <div class="signature-sales">Sales: ${salesName}</div>
    </div>
  `;
}

// Fungsi utama untuk print nota custom
function printNotaCustom(servisData) {
  const notaHTML = generateNotaCustomHTML(servisData);
  const printWindow = window.open("", "_blank");

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
            width: 40px;
          }
          td:nth-child(2) {
            width: 130px;
          }
          td:nth-child(3) {
            width: 20px;
            align-items: center;
          }
          td:nth-child(4) {
            width: 20px;
            align-items: center;
          }
          td:nth-child(5) {
            width: 30px;
          }
          td:nth-child(6) {
            width: 50px;
          }
          .total-dp-info {
            position: absolute;
            top: 9.5cm;
            right: 25mm;
            font-size: 12px;
            font-weight: bold;
            text-align: right;
            line-height: 2;
          }
          .note-info {
            position: absolute;
            top: 11.6cm;
            right: 10mm;
            font-size: 10px;
            font-weight: bold;
            font-style: italic;
            text-align: right;
            color: #333;
          }
          .signature-section {
            position: absolute;
            top: 11.6cm;
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

  let printCount = 0;
  const handleAfterPrint = () => {
    printCount++;
    if (printCount === 2) {
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      setTimeout(() => printWindow.close(), 100);
    }
  };

  printWindow.addEventListener("afterprint", handleAfterPrint);
  printWindow.print();
  setTimeout(() => printWindow.print(), 1000);
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
        { text: "Rincian", style: "tableHeader" },
        { text: "Ongkos", style: "tableHeader" },
        { text: "Status", style: "tableHeader" },
      ],
    ];

    filteredData.forEach((item, index) => {
      const details = item.detailBarang && item.detailBarang.length > 0 ? item.detailBarang : [{}];
      details.forEach((d, idx) => {
        const statusPembayaran = item.statusPembayaran || "nominal";
        let ongkosText =
          statusPembayaran === "free"
            ? "GRATIS"
            : statusPembayaran === "belum_lunas"
            ? "BELUM LUNAS"
            : `Rp ${(d.ongkos || 0).toLocaleString("id-ID")}`;

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
          { text: ongkosText, style: "tableCellRight" },
          { text: idx === 0 ? getStatusLabel(statusPembayaran) : "", style: "tableCell" },
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
        { text: "LAPORAN SERVIS", style: "header", alignment: "center", margin: [0, 0, 0, 5] },
        { text: "Melati Gold Shop", style: "header", alignment: "center", margin: [0, 0, 0, 5] },
        { text: `Tanggal: ${tanggalRiwayat}`, style: "subheader", alignment: "center", margin: [0, 0, 0, 8] },
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
        { text: "Rincian", style: "tableHeader" },
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
        { text: "LAPORAN CUSTOM", style: "header", alignment: "center", margin: [0, 0, 0, 5] },
        { text: "Melati Gold Shop", style: "header", alignment: "center", margin: [0, 0, 0, 5] },
        { text: `Tanggal: ${tanggalRiwayat}`, style: "subheader", alignment: "center", margin: [0, 0, 0, 8] },
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
    tableHeader: { bold: true, fontSize: 9, color: "white", fillColor: "#3498db", alignment: "center" },
    tableCell: { fontSize: 8, margin: [0, 1, 0, 1] },
    tableCellRight: { fontSize: 8, alignment: "right", margin: [0, 1, 0, 1] },
    tableCellBold: { fontSize: 8, bold: true, fillColor: "#ecf0f1", margin: [0, 1, 0, 1] },
    tableCellBoldRight: { fontSize: 8, bold: true, alignment: "right", fillColor: "#ecf0f1", margin: [0, 1, 0, 1] },
  };
}

function showLoading(show) {
  // Simple loading implementation
  if (show) {
    document.body.style.cursor = "wait";
  } else {
    document.body.style.cursor = "default";
  }
}

function showSuccessModal(title, message, items = []) {
  document.getElementById("successModalTitle").textContent = title;

  let content = `<p>${message}</p>`;
  if (items.length > 0) {
    content += '<div class="item-list">';
    items.forEach((item, index) => {
      const statusPembayaran = item.statusPembayaran || "nominal";
      let ongkosText = getOngkosDisplay(item);

      content += `
        <div class="item">
          <strong>${index + 1}. ${item.namaCustomer}</strong><br>
          Barang: ${item.namaBarang} - ${item.jenisServis}<br>
          Ongkos: ${ongkosText}
          <span class="badge bg-${getStatusBadgeColor(statusPembayaran)} ms-2">
            ${getStatusLabel(statusPembayaran)}
          </span>
        </div>
      `;
    });
    content += "</div>";
  }

  document.getElementById("successModalContent").innerHTML = content;

  const modal = new bootstrap.Modal(document.getElementById("successModal"));
  modal.show();
}

function showErrorModal(title, message) {
  document.getElementById("errorModalTitle").textContent = title;
  document.getElementById("errorModalContent").innerHTML = `<p>${message}</p>`;

  const modal = new bootstrap.Modal(document.getElementById("errorModal"));
  modal.show();
}
