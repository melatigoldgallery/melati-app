import { saveServisData, getServisByDate } from "../services/servis-service.js";

// Global variables
let todayData = [];
let servisItems = [];
let editingIndex = -1;
let verifikasiAction = null;
let verifikasiData = null;
let editingRiwayatId = null;

// Global variables untuk detail barang
let detailBarangItems = [];
let detailBarangCounter = 1;

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

  // Tampilkan button
  document.getElementById("tampilkanBtn").addEventListener("click", function () {
    loadRiwayatData();
  });

  // Export PDF button
  document.getElementById("exportPdfBtn").addEventListener("click", function () {
    exportToPDF();
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
    resetModalForm();
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
          <option value="CHROME GOLD" ${item.jenisServis === "CHROME GOLD" ? "selected" : ""}>CHROME GOLD</option>
          <option value="CHROME SELEB" ${item.jenisServis === "CHROME SELEB" ? "selected" : ""}>CHROME SELEB</option>
          <option value="CHROME PUTIH" ${item.jenisServis === "CHROME PUTIH" ? "selected" : ""}>CHROME PUTIH</option>
          <option value="CHROME ROSE" ${item.jenisServis === "CHROME ROSE" ? "selected" : ""}>CHROME ROSE</option>
          <option value="custom" ${item.jenisServis === "custom" ? "selected" : ""}>Custom</option>
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
    updateDetailBarangTable();
  }
}

function resetDetailBarang() {
  detailBarangItems = [];
  detailBarangCounter = 1;
  updateDetailBarangTable();
}

function validateDetailBarang() {
  if (detailBarangItems.length === 0) {
    showErrorModal("Validasi Error", "Minimal harus ada satu detail barang servis!");
    return false;
  }

  const statusPembayaran = document.getElementById("statusPembayaran").value;

  for (let i = 0; i < detailBarangItems.length; i++) {
    const item = detailBarangItems[i];
    if (!item.namaBarang.trim() || !item.jenisServis.trim()) {
      showErrorModal("Validasi Error", `Nama barang dan jenis servis pada baris ${i + 1} harus diisi!`);
      return false;
    }

    // Validasi ongkos untuk status nominal dan custom
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

  return true;
}

// Global functions untuk inline editing
window.updateDetailBarangItem = updateDetailBarangItem;
window.removeDetailBarangRow = removeDetailBarangRow;

function handleStatusPembayaranChange() {
  const statusPembayaran = document.getElementById("statusPembayaran").value;

  // Ongkos sekarang di level item, jadi tidak perlu handle di sini
  // Hanya untuk info atau logic tambahan jika diperlukan

  // Set semua ongkos item ke 0 jika status free
  if (statusPembayaran === "free") {
    detailBarangItems.forEach((item) => {
      item.ongkos = 0;
    });
    updateDetailBarangTable();
  }
}

function openServisModal(index = -1) {
  editingIndex = index;

  if (index >= 0) {
    // Edit mode
    const item = servisItems[index];
    document.getElementById("modalInputServisLabel").textContent = "Edit Data Servis";
    document.getElementById("namaSales").value = item.namaSales || "";
    document.getElementById("namaCustomer").value = item.namaCustomer;
    document.getElementById("noHp").value = item.noHp;
    document.getElementById("statusPembayaran").value = item.statusPembayaran || "nominal";
    document.getElementById("ongkos").value = item.totalOngkos || item.ongkos || 0;

    // Trigger status change untuk set proper state
    handleStatusPembayaranChange();

    // Load detail barang
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

    updateDetailBarangTable();
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

function resetModalForm() {
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

  // Hitung total ongkos dari semua item
  const totalOngkos = detailBarangItems.reduce((sum, item) => sum + (parseInt(item.ongkos) || 0), 0);

  const servisItem = {
    namaSales,
    namaCustomer,
    noHp,
    statusPembayaran,
    detailBarang: detailBarangItems.map((item) => ({
      jumlah: parseInt(item.jumlah) || 1,
      namaBarang: item.namaBarang.trim(),
      berat: item.berat.trim(),
      karat: item.karat.trim(),
      jenisServis: item.jenisServis.trim(),
      rincianServis: item.rincianServis.trim(),
      ongkos: parseInt(item.ongkos) || 0,
    })),
    totalOngkos: statusPembayaran === "free" ? 0 : totalOngkos,

    // Backward compatibility - keep first item data in root level
    namaBarang: detailBarangItems[0]?.namaBarang || "",
    berat: detailBarangItems[0]?.berat || "",
    karat: detailBarangItems[0]?.karat || "",
    jenisServis: detailBarangItems[0]?.jenisServis || "",
    ongkos: statusPembayaran === "free" ? 0 : totalOngkos,
  };

  // Handle edit riwayat data
  if (editingRiwayatId) {
    try {
      // Ambil tanggal dari field edit jika sedang edit riwayat
      const tanggalEdit = document.getElementById("tanggalEdit").value;
      if (tanggalEdit) {
        // Convert date format from dd/mm/yyyy to yyyy-mm-dd
        const [day, month, year] = tanggalEdit.split("/");
        const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        servisItem.tanggal = formattedDate;
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
    servisItems[editingIndex] = servisItem;
  } else {
    // Cek duplikasi sebelum menambah data baru
    const isDuplicate = servisItems.some(
      (item) =>
        item.namaCustomer.toLowerCase() === namaCustomer.toLowerCase() &&
        item.noHp === noHp &&
        item.namaBarang.toLowerCase() === servisItem.namaBarang.toLowerCase() &&
        item.jenisServis.toLowerCase() === servisItem.jenisServis.toLowerCase()
    );
    if (isDuplicate) {
      showErrorModal(
        "Duplikasi Data",
        "Data servis dengan kombinasi customer, no HP, barang, dan jenis servis yang sama sudah ada!"
      );
      return;
    }
    servisItems.push(servisItem);
  }

  if (!editingRiwayatId) {
    updateServisTable();
  }

  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalInputServis"));
  modal.hide();
}

function updateServisTable() {
  const tbody = document.querySelector("#tableInputServis tbody");
  tbody.innerHTML = "";

  let totalOngkos = 0;

  servisItems.forEach((item, index) => {
    const row = document.createElement("tr");
    const statusPembayaran = item.statusPembayaran || "nominal";

    // Hitung total untuk status nominal dan custom
    if (statusPembayaran === "nominal" || statusPembayaran === "custom") {
      totalOngkos += item.totalOngkos || item.ongkos || 0;
    }

    // Render detailBarang as multiline content for each relevant column
    const details =
      item.detailBarang && item.detailBarang.length > 0
        ? item.detailBarang
        : [
            {
              namaBarang: item.namaBarang || "",
              berat: item.berat || "",
              karat: item.karat || "",
              jenisServis: item.jenisServis || "",
              rincianServis: item.rincianServis || "",
            },
          ];

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
  openServisModal(index);
};

window.deleteServisItem = function (index) {
  if (confirm("Apakah Anda yakin ingin menghapus item ini?")) {
    servisItems.splice(index, 1);
    updateServisTable();
  }
};

window.editRiwayatItem = function (id, index) {
  verifikasiAction = "edit";
  verifikasiData = { id, index };
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
  verifikasiAction = "delete";
  verifikasiData = { id, index };
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

      // Set data customer ke form
      document.getElementById("namaSales").value = item.namaSales;
      document.getElementById("namaCustomer").value = item.namaCustomer;
      document.getElementById("noHp").value = item.noHp;
      document.getElementById("statusPembayaran").value = item.statusPembayaran || "nominal";
      document.getElementById("ongkos").value = item.ongkos;

      // Load detail barang untuk edit riwayat
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

      // Tampilkan dan isi field tanggal edit
      document.getElementById("tanggalEditRow").style.display = "block";
      const tanggalFormatted = new Date(item.tanggal).toLocaleDateString("id-ID");
      document.getElementById("tanggalEdit").value = tanggalFormatted;

      handleStatusPembayaranChange();
      document.getElementById("modalInputServisLabel").textContent = "Edit Data Riwayat Servis";

      const verifikasiModal = bootstrap.Modal.getInstance(document.getElementById("verifikasiModal"));
      verifikasiModal.hide();

      setTimeout(() => {
        const modal = new bootstrap.Modal(document.getElementById("modalInputServis"));
        modal.show();

        // Update detail barang table setelah modal terbuka
        updateDetailBarangTable();

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
  if (servisItems.length === 0) {
    showErrorModal("Validasi Error", "Tidak ada data servis untuk disimpan!");
    return;
  }

  const tanggal = document.getElementById("tanggal").value;

  if (!tanggal) {
    showErrorModal("Validasi Error", "Tanggal harus diisi!");
    return;
  }

  // Convert date format from dd/mm/yyyy to yyyy-mm-dd
  const [day, month, year] = tanggal.split("/");
  const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  try {
    showLoading(true);
    const savedItems = [];

    for (const item of servisItems) {
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
    showSuccessModal("Data Berhasil Disimpan", `${savedItems.length} data servis berhasil disimpan.`, savedItems);

    // Auto print nota after 1 second
    setTimeout(() => {
      printNotaServis(savedItems);
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
  servisItems = [];
  updateServisTable();

  // Reset date to today
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");
  document.getElementById("tanggal").value = formattedDate;
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
    if (todayData.length > 0) {
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
  const tbody = document.querySelector("#tableRiwayatServis tbody");
  tbody.innerHTML = "";

  let totalOngkos = 0;

  if (todayData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center">Belum ada data servis pada tanggal ini</td></tr>';
    document.getElementById("total-riwayat-ongkos").textContent = "Rp 0";
    return;
  }

  todayData.forEach((item, index) => {
    const row = document.createElement("tr");
    const tanggalFormatted = new Date(item.tanggal).toLocaleDateString("id-ID");
    const statusPembayaran = item.statusPembayaran || "nominal";

    // Hitung total untuk status nominal dan custom
    if (statusPembayaran === "nominal" || statusPembayaran === "custom") {
      totalOngkos += item.ongkos || 0;
    }

    // Prepare details (support old format)
    const details =
      item.detailBarang && item.detailBarang.length > 0
        ? item.detailBarang
        : [
            {
              namaBarang: item.namaBarang || "",
              berat: item.berat || "",
              karat: item.karat || "",
              jenisServis: item.jenisServis || "",
              rincianServis: item.rincianServis || "",
            },
          ];

    const namaBarangHtml = details.map((d) => `<div>${d.namaBarang || "-"}</div>`).join("");
    const beratHtml = details.map((d) => `<div>${d.berat || "-"}</div>`).join("");
    const karatHtml = details.map((d) => `<div>${d.karat || "-"}</div>`).join("");
    const jenisHtml = details.map((d) => `<div>${d.jenisServis || "-"}</div>`).join("");
    const rincianHtml = details.map((d) => `<div>${d.rincianServis || "-"}</div>`).join("");
    const ongkosHtml = details.map((d) => `<div>Rp ${(d.ongkos || 0).toLocaleString("id-ID")}</div>`).join("");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${tanggalFormatted}</td>
      <td>${item.namaCustomer}</td>
      <td>${item.noHp}</td>
      <td class="multi-col">${namaBarangHtml}</td>
      <td class="multi-col">${beratHtml}</td>
      <td class="multi-col">${karatHtml}</td>
      <td class="multi-col">${jenisHtml}</td>
      <td class="multi-col">${rincianHtml}</td>
      <td class="multi-col">${ongkosHtml}</td>
      <td>
        ${getOngkosDisplay(item)}
        <br>
        <span class="badge bg-${getStatusBadgeColor(statusPembayaran)} mt-1">
          ${getStatusLabel(statusPembayaran)}
        </span>
      </td>
      <td>${item.namaSales}</td>
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

// Create shared function for generating print box HTML
function generatePrintBox(item) {
  const statusPembayaran = item.statusPembayaran || "nominal";
  let statusText = getStatusLabel(statusPembayaran);

  // Prepare details (support old format and new detailBarang array)
  const details =
    item.detailBarang && item.detailBarang.length > 0
      ? item.detailBarang
      : [
          {
            namaBarang: item.namaBarang || "",
            jenisServis: item.jenisServis || "",
            rincianServis: item.rincianServis || "",
          },
        ];

  // Create combined format: "item (rincian servis)" for each line
  const combinedItems = details
    .map((d) => {
      const namaBarang = d.namaBarang || "-";
      const servisInfo = d.rincianServis?.trim() || d.jenisServis || "-";
      return `${namaBarang} (${servisInfo})`;
    })
    .join("<br>");

  return `
    <div class="print-service-box">
      <div class="print-customer-name">${item.namaCustomer}</div>
      <div class="print-nama-brg">${combinedItems}</div>
      <div class="print-status">${statusText}</div>
    </div>
  `;
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
        width: 2.7cm;
        height: 2.7cm;
        border: 1px solid #000;
        padding: 2mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        break-inside: avoid;
        overflow: hidden;
      }
      .print-customer-name {
        font-size: 8px;
        font-weight: bold;
        margin-bottom: 1px;
        word-wrap: break-word;
        line-height: 1.1;
      }
      .print-nama-brg {
        font-size: 7px;
        font-weight: bold;
        margin: 2px 1px;
        word-wrap: break-word;
        line-height: 1.1;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-grow: 1;
      }
      .print-status {
        font-size: 6px;
        font-weight: bold;
        margin-top: 1px;
        color: #666;
      }
    </style>
  `;
}

// Completely rewrite printSingleItem to match printReport format
window.printSingleItem = function (id, index) {
  const item = todayData[index];
  if (!item) {
    alert("Data tidak ditemukan");
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
  }, 1000);
};

// Fungsi untuk reprint nota servis individual dari riwayat
window.printNotaServisItem = function (id, index) {
  const item = todayData[index];
  if (!item) {
    alert("Data tidak ditemukan");
    return;
  }

  // Convert single item to array format untuk printNotaServis
  printNotaServis([item]);
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

// Fungsi untuk generate plain text nota servis
function generateNotaText(servisData) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID");

  // Header kanan atas (estimasi posisi dengan spacing)
  let notaText = "";

  // Info customer di kanan atas (sejajar dengan header)
  if (servisData.length > 0) {
    const firstCustomer = servisData[0];
    notaText += `                                                                     ${formattedDate}\n`;
    notaText += `                                                                      \n`;
    notaText += `                                                                     ${firstCustomer.namaCustomer}\n`;
    notaText += `                                                                      \n`;
    notaText += `                                                                     ${
      firstCustomer.noHp || firstCustomer.noTelepon || ""
    }`;
  }

  // Spasi untuk posisi tabel
  notaText += "\n\n\n";

  // Header tabel dengan lebar kolom sesuai spesifikasi
  // Kolom: Jumlah | Nama Barang | Berat | Karat | Ongkos | Terbilang
  const colWidths = {
    jumlah: 14,
    namaBarang: 31,
    berat: 8,
    karat: 5,
    ongkos: 10,
    terbilang: 14,
  };

  // Header tabel
  notaText += padText("", colWidths.jumlah) + " ";
  notaText += padText("", colWidths.namaBarang) + " ";
  notaText += padText("", colWidths.berat) + " ";
  notaText += padText("", colWidths.karat) + " ";
  notaText += padText("", colWidths.ongkos) + " ";
  notaText += padText("", colWidths.terbilang) + "\n";

  // Data items
  let totalOngkos = 0;
  servisData.forEach((servis) => {
    if (servis.detailBarang && servis.detailBarang.length > 0) {
      servis.detailBarang.forEach((item) => {
        const ongkos = item.ongkos || 0;

        // Get status label
        const statusPembayaran = servis.statusPembayaran || "nominal";
        const statusLabel = getStatusLabel(statusPembayaran);

        // Wrap nama barang dengan status dan terbilang jika terlalu panjang
        const namaBarangWithStatus = item.namaBarang + " [" + statusLabel + "]";
        const namaBarangLines = wrapText(namaBarangWithStatus, colWidths.namaBarang);
        const jenisServisText = item.rincianServis?.trim() || item.jenisServis || "";
        const terbilangLines = wrapText(jenisServisText, colWidths.terbilang);

        // Tentukan jumlah baris maksimal antara nama barang dan terbilang
        const maxLines = Math.max(namaBarangLines.length, terbilangLines.length);

        // Loop untuk setiap baris
        for (let i = 0; i < maxLines; i++) {
          // Jumlah hanya di baris pertama dengan suffix 'pcs'
          if (i === 0) {
            const jumlahText = (item.jumlah || "1") + " pcs";
            notaText += padText(jumlahText, colWidths.jumlah, "center") + " ";
          } else {
            notaText += padText("", colWidths.jumlah) + " ";
          }

          notaText += padText(namaBarangLines[i] || "", colWidths.namaBarang) + " ";

          // Berat, karat, dan ongkos hanya di baris pertama
          if (i === 0) {
            notaText += padText(item.berat || "", colWidths.berat) + " ";
            notaText += padText(item.karat || "", colWidths.karat) + " ";
            notaText += padText(formatCurrency(ongkos), colWidths.ongkos, "right") + " ";
          } else {
            notaText += padText("", colWidths.berat) + " ";
            notaText += padText("", colWidths.karat) + " ";
            notaText += padText("", colWidths.ongkos) + " ";
          }

          notaText += padText(terbilangLines[i] || "", colWidths.terbilang) + "\n";
        }

        totalOngkos += ongkos;
      });
    } else {
      // Fallback untuk format lama
      const ongkos = servis.totalOngkos || servis.ongkos || 0;

      // Get status label
      const statusPembayaran = servis.statusPembayaran || "nominal";
      const statusLabel = getStatusLabel(statusPembayaran);

      // Wrap nama barang dengan status dan terbilang jika terlalu panjang
      const namaBarangWithStatus = (servis.namaBarang || "") + " [" + statusLabel + "]";
      const namaBarangLines = wrapText(namaBarangWithStatus, colWidths.namaBarang);
      const jenisServisText = servis.rincianServis?.trim() || servis.jenisServis || "";
      const terbilangLines = wrapText(jenisServisText, colWidths.terbilang);

      // Tentukan jumlah baris maksimal antara nama barang dan terbilang
      const maxLines = Math.max(namaBarangLines.length, terbilangLines.length);

      // Loop untuk setiap baris
      for (let i = 0; i < maxLines; i++) {
        // Jumlah hanya di baris pertama (fallback format lama default 1) dengan suffix 'pcs'
        if (i === 0) {
          notaText += padText("1 pcs", colWidths.jumlah, "center") + " ";
        } else {
          notaText += padText("", colWidths.jumlah) + " ";
        }

        notaText += padText(namaBarangLines[i] || "", colWidths.namaBarang) + " ";

        // Berat, karat, dan ongkos hanya di baris pertama
        if (i === 0) {
          notaText += padText(servis.berat || "", colWidths.berat) + " ";
          notaText += padText(servis.karat || "", colWidths.karat) + " ";
          notaText += padText(formatCurrency(ongkos), colWidths.ongkos, "right") + " ";
        } else {
          notaText += padText("", colWidths.berat) + " ";
          notaText += padText("", colWidths.karat) + " ";
          notaText += padText("", colWidths.ongkos) + " ";
        }

        notaText += padText(terbilangLines[i] || "", colWidths.terbilang) + "\n";
      }

      totalOngkos += ongkos;
    }
  });

  // Spasi sebelum footer
  notaText += "\n\n\n\n\n\n";

  // Tanda tangan section
  const salesName = servisData[0]?.namaSales || "Admin";
  const customerName = servisData[0]?.namaCustomer || "";

  notaText += `                                                 ${customerName}               ${salesName}\n`;

  return notaText;
}

// Fungsi utama untuk print nota servis dalam format plain text
function printNotaServis(servisData) {
  const notaText = generateNotaText(servisData);
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
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            white-space: pre;
            position: relative;
          }
          .customer-info {
            position: absolute;
            top: 8mm;
            right: 25mm;
            line-height: 1.2;
            text-align: right;
          }
          .data-items {
            margin-top: 21mm;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <div class="customer-info">${notaText.split("\n\n\n")[0]}</div>
        <div class="data-items">${notaText.split("\n\n\n").slice(1).join("\n\n\n")}</div>
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

function exportToPDF() {
  if (todayData.length === 0) {
    alert("Tidak ada data untuk diekspor");
    return;
  }

  try {
    const tanggalRiwayat = document.getElementById("tanggalRiwayat").value;

    // Hitung total ongkos untuk status nominal dan custom
    const totalOngkos = todayData.reduce((sum, item) => {
      const statusPembayaran = item.statusPembayaran || "nominal";
      return statusPembayaran === "nominal" || statusPembayaran === "custom" ? sum + (item.ongkos || 0) : sum;
    }, 0);

    const docDefinition = {
      pageOrientation: "landscape",
      pageMargins: [20, 30, 20, 30],
      content: [
        {
          text: "LAPORAN INPUT SERVIS",
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 8],
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
            widths: [15, 60, 50, 120, 40, 40, 140, 70, 50, 50],
            body: [
              [
                { text: "No", style: "tableHeader" },
                { text: "Nama Customer", style: "tableHeader" },
                { text: "No HP", style: "tableHeader" },
                { text: "Nama Barang", style: "tableHeader" },
                { text: "Berat", style: "tableHeader" },
                { text: "Karat", style: "tableHeader" },
                { text: "Jenis Servis / Custom", style: "tableHeader" },
                { text: "Ongkos / DP", style: "tableHeader" },
                { text: "Status", style: "tableHeader" },
                { text: "Sales", style: "tableHeader" },
              ],
              ...todayData.map((item, index) => {
                const statusPembayaran = item.statusPembayaran || "nominal";
                let ongkosText = "";

                if (statusPembayaran === "free") {
                  ongkosText = "GRATIS";
                } else if (statusPembayaran === "belum_lunas") {
                  ongkosText = item.ongkos > 0 ? `Rp ${(item.ongkos || 0).toLocaleString("id-ID")}` : "BELUM LUNAS";
                } else if (statusPembayaran === "custom") {
                  ongkosText = `DP: Rp ${(item.ongkos || 0).toLocaleString("id-ID")}`;
                } else {
                  ongkosText = `Rp ${(item.ongkos || 0).toLocaleString("id-ID")}`;
                }

                return [
                  { text: (index + 1).toString(), style: "tableCell" },
                  { text: item.namaCustomer || "", style: "tableCell" },
                  { text: item.noHp || "", style: "tableCell" },
                  { text: item.namaBarang || "", style: "tableCell" },
                  { text: item.berat || "-", style: "tableCell" },
                  { text: item.karat || "-", style: "tableCell" },
                  { text: item.jenisServis || "", style: "tableCell" },
                  { text: ongkosText, style: "tableCellRight" },
                  { text: getStatusLabel(statusPembayaran), style: "tableCell" },
                  { text: item.namaSales || "", style: "tableCell" },
                ];
              }),
              // Baris total
              [
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
                { text: "TOTAL NOMINAL:", style: "tableCellBold", alignment: "right" },
                { text: `Rp ${totalOngkos.toLocaleString("id-ID")}`, style: "tableCellBoldRight" },
                { text: "", style: "tableCell" },
                { text: "", style: "tableCell" },
              ],
            ],
          },
          layout: {
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 2 : 1;
            },
            vLineWidth: function (i, node) {
              return i === 0 || i === node.table.widths.length ? 2 : 1;
            },
            hLineColor: function (i, node) {
              return i === 0 || i === node.table.body.length ? "#666666" : "#cccccc";
            },
            vLineColor: function (i, node) {
              return i === 0 || i === node.table.widths.length ? "#666666" : "#cccccc";
            },
            paddingLeft: function (i, node) {
              return 3;
            },
            paddingRight: function (i, node) {
              return 3;
            },
            paddingTop: function (i, node) {
              return 2;
            },
            paddingBottom: function (i, node) {
              return 1;
            },
          },
        },
        // Tambahkan keterangan di bawah tabel
        {
          text: "Keterangan: Total Nominal mencakup status LUNAS dan CUSTOM",
          style: "footnote",
          alignment: "left",
          margin: [0, 7, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          color: "#2c3e50",
        },
        subheader: {
          fontSize: 12,
          bold: true,
          color: "#34495e",
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: "white",
          fillColor: "#3498db",
          alignment: "center",
        },
        tableCell: {
          fontSize: 8,
          margin: [0, 1, 0, 1],
        },
        tableCellRight: {
          fontSize: 8,
          alignment: "right",
          margin: [0, 1, 0, 1],
        },
        tableCellBold: {
          fontSize: 8,
          bold: true,
          fillColor: "#ecf0f1",
          margin: [0, 1, 0, 1],
        },
        tableCellBoldRight: {
          fontSize: 8,
          bold: true,
          alignment: "right",
          fillColor: "#ecf0f1",
          margin: [0, 1, 0, 1],
        },
        footnote: {
          fontSize: 8,
          italics: true,
          color: "#666666",
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Laporan_Servis_${tanggalRiwayat.replace(/\//g, "-")}.pdf`);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("Terjadi kesalahan saat mengekspor PDF");
  }
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
