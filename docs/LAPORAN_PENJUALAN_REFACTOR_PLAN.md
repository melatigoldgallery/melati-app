# Rencana Perbaikan: Laporan Penjualan

**Tanggal:** 3 Februari 2026  
**File Target:** `laporanPenjualan.html`, `js/pages/laporanPenjualan.js`  
**Status:** 📋 Rencana (Belum Implementasi)

---

## 📊 Analisis Kondisi Saat Ini

### ✅ Kelebihan (Pros)

1. **Smart Cache Management**
   - Implementasi cache dengan TTL berbeda (30 menit untuk hari ini, 1 jam untuk historis)
   - LocalStorage persistence untuk cache
   - Auto cleanup cache lama
   - Fallback ke cache jika fetch gagal

2. **Real-time Updates**
   - onSnapshot listener untuk data hari ini
   - Auto-refresh ketika ada perubahan data
   - Visual indicator untuk status cache

3. **DataTables Integration**
   - Pagination, sorting, searching built-in
   - Export buttons (Copy, Excel, PDF) via DataTables
   - Responsive table

4. **Filter Functionality**
   - Filter by jenis penjualan (aksesoris, kotak, silver, manual)
   - Filter by sales person
   - Dynamic table columns based on jenis

### ❌ Kekurangan (Cons)

1. **Single Date Filter**
   - Hanya bisa filter 1 tanggal saja
   - Tidak bisa melihat laporan rentang tanggal (misal: 1-31 Januari)
   - Tidak praktis untuk analisis periode

2. **Export Monthly - Redundant & Complex**
   - Section "Export Laporan Detail Bulanan" terpisah dengan filter utama
   - Logic grouping per tanggal dan jenis sangat kompleks (~365 baris kode)
   - Tidak sinkron dengan filter yang sedang ditampilkan
   - User harus pilih ulang bulan untuk export (bukan dari data yang ditampilkan)

3. **Export Format Tidak Konsisten**
   - Export monthly punya format custom sendiri
   - Export via DataTables punya format berbeda
   - Tidak ada template header standar

4. **Tidak Ada Export PDF Native**
   - DataTables PDF export tidak customizable untuk template header
   - Tidak bisa set header "LAPORAN PENJUALAN MELATI BAWAH"

5. **Code Duplication**
   - Logic process item untuk export (lines 1115-1145)
   - Logic calculate subtotal (lines 1150-1175)
   - Logic format date (multiple places)

---

## 🎯 Tujuan Refactoring

### 1. **Rentang Tanggal (Date Range)**

- User bisa pilih tanggal mulai dan tanggal akhir
- Filter data dalam rentang tersebut
- Validasi: tanggal akhir ≥ tanggal mulai

### 2. **Simplifikasi Export**

- Export hanya data yang sedang ditampilkan (sesuai filter)
- 2 tombol: Export Excel & Export PDF
- Format template header standar
- Hapus section "Export Laporan Detail Bulanan"

### 3. **Template Header Standar**

```
LAPORAN PENJUALAN MELATI BAWAH
{JENIS PENJUALAN}
{RENTANG TANGGAL}
```

### 4. **Data Aggregation untuk Export** ⭐ **CRITICAL**

- Export menampilkan data **teragregasi per kode barang**, bukan detail transaksi
- **Contoh Kasus:**
  - ❌ **Sebelum (Detail Transaksi):**
    ```
    K30  Cincin Mutiara  1pcs  2.5gr  @750  Rp 50,000
    K30  Cincin Mutiara  1pcs  2.5gr  @750  Rp 50,000
    K30  Cincin Mutiara  1pcs  2.5gr  @750  Rp 50,000
    ... (10 baris untuk 10 transaksi berbeda)
    ```
  - ✅ **Sesudah (Agregasi per Kode):**
    ```
    K30  Cincin Mutiara  10pcs  25gr  @750  Rp 500,000
    ```
- **Grouping Key:** `kode + nama + kadar`
- **Kalkulasi:**
  - Total Pcs = Sum(jumlah)
  - Total Gr = Sum(berat)
  - Total Harga = Sum(harga)
- **Benefit:**
  - Laporan lebih ringkas (10 transaksi → 1 baris)
  - Mudah dibaca untuk analisis stok
  - Sesuai kebutuhan bisnis (lihat total penjualan per item)
  - Ukuran file export lebih kecil

### 5. **Reduce Complexity**

- Hapus 365 baris logic monthly export
- Reuse DataTables built-in export (Excel)
- Custom PDF generator dengan jsPDF

---

## 📐 Desain Solusi

### A. UI Changes

#### 1. Filter Section (laporanPenjualan.html)

**Before:**

```html
<div class="col-md-3">
  <label for="startDate" class="form-label">Tanggal</label>
  <input type="text" class="form-control datepicker" id="startDate" />
</div>
```

**After:**

```html
<div class="col-md-3">
  <label for="startDate" class="form-label">Tanggal Mulai</label>
  <input type="text" class="form-control datepicker" id="startDate" />
</div>
<div class="col-md-3">
  <label for="endDate" class="form-label">Tanggal Akhir</label>
  <input type="text" class="form-control datepicker" id="endDate" />
</div>
```

#### 2. Export Buttons (Replace Monthly Export Section)

**Remove:**

```html
<!-- Lines 229-255: Export Laporan Detail Bulanan -->
<div class="card mt-4">...</div>
```

**Add (After Data Table Card):**

```html
<div class="card mt-3">
  <div class="card-header">
    <h6 class="mb-0">
      <i class="fas fa-download me-2"></i>
      Export Laporan
    </h6>
  </div>
  <div class="card-body">
    <div class="d-flex gap-2">
      <button class="btn btn-success" id="btnExportExcel">
        <i class="fas fa-file-excel me-2"></i>
        Export Excel
      </button>
      <button class="btn btn-danger" id="btnExportPDF">
        <i class="fas fa-file-pdf me-2"></i>
        Export PDF
      </button>
    </div>
    <small class="text-muted d-block mt-2">
      <i class="fas fa-info-circle me-1"></i>
      Data yang diexport sesuai dengan filter yang sedang ditampilkan
    </small>
  </div>
</div>
```

### B. Logic Changes (laporanPenjualan.js)

#### 1. Add Dependencies

```javascript
// Add jsPDF for PDF export
// Include in HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// Include in HTML: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
```

#### 2. Load Date Range Data

**Replace:** `loadSalesDataByDate(selectedDate, forceRefresh)` (single date)

**New:** `loadSalesDataByDateRange(startDate, endDate, forceRefresh)`

```javascript
async loadSalesDataByDateRange(startDate, endDate, forceRefresh = false) {
  try {
    // Validation
    if (endDate < startDate) {
      throw new Error("Tanggal akhir harus lebih besar atau sama dengan tanggal mulai");
    }

    // Create cache key from date range
    const startStr = formatDate(startDate).replace(/\//g, "-");
    const endStr = formatDate(endDate).replace(/\//g, "-");
    const cacheKey = `salesData_${startStr}_to_${endStr}`;

    this.currentDateRange = { start: startDate, end: endDate };

    // Check cache
    if (!forceRefresh) {
      const cachedData = cacheManager.get(cacheKey);
      if (cachedData) {
        console.log(`📦 Using cached data for ${startStr} to ${endStr}`);
        this.salesData = cachedData;
        this.populateSalesPersonFilter();
        return;
      }
    }

    console.log(`🔄 Loading data from ${startStr} to ${endStr}`);

    // Query for date range with ISO timestamp support
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const salesQuery = query(
      collection(firestore, "penjualanAksesoris"),
      where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
      where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
      orderBy("timestamp", "desc")
    );

    const salesSnapshot = await getDocs(salesQuery);
    const salesData = [];

    salesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.jenisPenjualan === "gantiLock") {
        data.jenisPenjualan = "manual";
        data.isGantiLock = true;
      }
      salesData.push({ id: doc.id, ...data });
    });

    // Save to cache
    cacheManager.set(cacheKey, salesData);

    this.salesData = salesData;
    this.populateSalesPersonFilter();
    console.log(`✅ Loaded ${salesData.length} sales records`);
  } catch (error) {
    console.error("Error loading sales data by date range:", error);
    this.showAlert("Gagal memuat data: " + error.message, "Error", "error");
  }
}
```

#### 3. Export Excel (Simplified with Aggregation)

**Remove:** Lines 1025-1340 (entire monthly export logic)

**New:** Aggregated export using filtered data

```javascript
exportToExcel() {
  if (!this.filteredSalesData || this.filteredSalesData.length === 0) {
    this.showAlert("Tidak ada data untuk diexport", "Peringatan", "warning");
    return;
  }

  // Get filter info
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const jenisPenjualan = document.getElementById("salesType").value;

  // Determine jenis label
  const jenisLabel = {
    all: "SEMUA JENIS",
    aksesoris: "AKSESORIS",
    kotak: "KOTAK",
    silver: "SILVER",
    manual: "PENJUALAN MANUAL"
  }[jenisPenjualan] || "SEMUA JENIS";

  // STEP 1: Aggregate data per kode barang
  const aggregatedData = this.aggregateItemsByCode();

  // Create workbook
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Header
  wsData.push(["LAPORAN PENJUALAN MELATI BAWAH"]);
  wsData.push([jenisLabel]);
  wsData.push([`${startDate} - ${endDate}`]);
  wsData.push([]);

  // Column headers based on jenis
  if (jenisPenjualan === "kotak") {
    wsData.push(["Jenis", "Nama Barang", "Pcs", "Harga Total"]);
  } else if (jenisPenjualan === "all") {
    wsData.push(["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Keterangan"]);
  } else {
    wsData.push(["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total"]);
  }

  // Data rows (aggregated)
  let totalPcs = 0;
  let totalGr = 0;
  let totalHarga = 0;

  aggregatedData.forEach((item) => {
    const row = this.formatAggregatedItemForExport(item, jenisPenjualan);
    wsData.push(row);

    // Calculate totals
    totalPcs += item.totalPcs;
    totalGr += item.totalGr;
    totalHarga += item.totalHarga;
  });

  // Total row
  wsData.push([]);
  if (jenisPenjualan === "kotak") {
    wsData.push(["TOTAL", "", totalPcs, `Rp ${formatRupiah(totalHarga)}`]);
  } else {
    wsData.push(["TOTAL", "", "", totalPcs, totalGr.toFixed(2), "", `Rp ${formatRupiah(totalHarga)}`, ""]);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, // Jenis
    { wch: 15 }, // Kode
    { wch: 30 }, // Nama
    { wch: 8 },  // Pcs
    { wch: 10 }, // Gr
    { wch: 10 }, // Kadar
    { wch: 15 }, // Harga
    { wch: 20 }, // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan Penjualan");

  // Download
  const filename = `Laporan_Penjualan_${startDate.replace(/\//g, "-")}_${endDate.replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, filename);

  this.showAlert("Export Excel berhasil!", "Sukses", "success");
}

// STEP 2: Aggregation method - Group by Kode + Nama + Kadar
aggregateItemsByCode() {
  const aggregationMap = new Map();

  this.filteredSalesData.forEach((sale) => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item) => {
        const kode = item.kodeText || item.barcode || "-";
        const nama = item.nama || "-";
        const kadar = item.kadar || "-";
        const jenis = (sale.jenisPenjualan || "aksesoris").toUpperCase();

        // Create unique key for grouping
        const key = `${jenis}|${kode}|${nama}|${kadar}`;

        // Calculate item harga (handle DP, free, etc)
        const harga = this.calculateItemHarga(item, sale);
        const pcs = parseInt(item.jumlah) || 1;
        const gr = parseFloat(item.berat) || 0;

        // Aggregate or create new entry
        if (aggregationMap.has(key)) {
          const existing = aggregationMap.get(key);
          existing.totalPcs += pcs;
          existing.totalGr += gr;
          existing.totalHarga += harga;

          // Collect unique keterangan
          const itemKeterangan = item.keterangan || sale.keterangan || "";
          if (itemKeterangan && !existing.keteranganList.includes(itemKeterangan)) {
            existing.keteranganList.push(itemKeterangan);
          }
        } else {
          aggregationMap.set(key, {
            jenis: jenis,
            kode: kode,
            nama: nama,
            kadar: kadar,
            totalPcs: pcs,
            totalGr: gr,
            totalHarga: harga,
            keteranganList: [item.keterangan || sale.keterangan || ""].filter(k => k)
          });
        }
      });
    }
  });

  // Convert Map to Array and sort by jenis, then kode
  return Array.from(aggregationMap.values()).sort((a, b) => {
    if (a.jenis !== b.jenis) return a.jenis.localeCompare(b.jenis);
    return a.kode.localeCompare(b.kode);
  });
}

// STEP 3: Format aggregated item for export
formatAggregatedItemForExport(item, jenisPenjualan) {
  const keterangan = item.keteranganList.join("; ");

  if (jenisPenjualan === "kotak") {
    return [
      item.jenis,
      item.nama,
      item.totalPcs,
      `Rp ${formatRupiah(item.totalHarga)}`
    ];
  } else if (jenisPenjualan === "all") {
    return [
      item.jenis,
      item.kode,
      item.nama,
      item.totalPcs,
      item.totalGr.toFixed(2),
      item.kadar,
      `Rp ${formatRupiah(item.totalHarga)}`,
      keterangan
    ];
  } else {
    return [
      item.jenis,
      item.kode,
      item.nama,
      item.totalPcs,
      item.totalGr.toFixed(2),
      item.kadar,
      `Rp ${formatRupiah(item.totalHarga)}`
    ];
  }
}

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, // Tanggal
    { wch: 12 }, // Jenis
    { wch: 15 }, // Kode
    { wch: 25 }, // Nama
    { wch: 8 },  // Pcs
    { wch: 10 }, // Gr
    { wch: 10 }, // Kadar
    { wch: 15 }, // Harga
    { wch: 12 }, // Status
    { wch: 20 }, // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan Penjualan");

  // Download
  const filename = `Laporan_Penjualan_${startDate.replace(/\//g, "-")}_${endDate.replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, filename);

  this.showAlert("Export Excel berhasil!", "Sukses", "success");
}

formatItemForExport(item, sale, jenisPenjualan) {
  const tanggal = this.getDateStringFromTransaction(sale);
  const jenis = (sale.jenisPenjualan || "aksesoris").toUpperCase();
  const kode = item.kodeText || item.barcode || "-";
  const nama = item.nama || "-";
  const pcs = parseInt(item.jumlah) || 1;
  const gr = parseFloat(item.berat) || 0;
  const kadar = item.kadar || "-";
  const harga = this.calculateItemHarga(item, sale);
  const status = sale.metodeBayar === "dp" ? "DP" : sale.metodeBayar === "free" ? "FREE" : "LUNAS";
  const keterangan = item.keterangan || sale.keterangan || "";

  // Return row based on jenisPenjualan
  if (jenisPenjualan === "kotak") {
    return [tanggal, jenis, nama, pcs, `Rp ${formatRupiah(harga)}`, status];
  } else if (jenisPenjualan === "all") {
    return [tanggal, jenis, kode, nama, pcs, gr.toFixed(2), kadar, `Rp ${formatRupiah(harga)}`, status, keterangan];
  } else {
    return [tanggal, jenis, kode, nama, pcs, gr.toFixed(2), kadar, `Rp ${formatRupiah(harga)}`, status];
  }
}

// STEP 4: Calculate item harga (handle DP, free, lunas)
calculateItemHarga(item, sale) {
  let harga = parseInt(item.totalHarga) || 0;

  // Handle DP calculation
  if (sale.metodeBayar === "dp") {
    const nominalDP = parseFloat(sale.nominalDP) || 0;
    const totalHargaTransaksi = parseFloat(sale.totalHarga) || 0;

    if (nominalDP >= totalHargaTransaksi) {
      harga = 0;
    } else {
      const sisaPembayaran = totalHargaTransaksi - nominalDP;
      const proporsi = harga / totalHargaTransaksi;
      harga = Math.round(proporsi * sisaPembayaran);
    }
  } else if (sale.metodeBayar === "free") {
    harga = 0;
  }

  return harga;
}
```

#### 4. Export PDF (New with Aggregation)

```javascript
exportToPDF() {
  if (!this.filteredSalesData || this.filteredSalesData.length === 0) {
    this.showAlert("Tidak ada data untuk diexport", "Peringatan", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Get filter info
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const jenisPenjualan = document.getElementById("salesType").value;

  // Determine jenis label
  const jenisLabel = {
    all: "SEMUA JENIS",
    aksesoris: "AKSESORIS",
    kotak: "KOTAK",
    silver: "SILVER",
    manual: "PENJUALAN MANUAL"
  }[jenisPenjualan] || "SEMUA JENIS";

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text("LAPORAN PENJUALAN MELATI BAWAH", 148.5, 15, { align: "center" });

  doc.setFontSize(12);
  doc.text(jenisLabel, 148.5, 22, { align: "center" });
  doc.text(`${startDate} - ${endDate}`, 148.5, 28, { align: "center" });

  // STEP 1: Aggregate data per kode barang
  const aggregatedData = this.aggregateItemsByCode();

  // STEP 2: Prepare table data (aggregated)
  const tableData = [];
  let totalPcs = 0;
  let totalGr = 0;
  let totalHarga = 0;

  aggregatedData.forEach((item) => {
    const row = this.formatAggregatedItemForExport(item, jenisPenjualan);
    tableData.push(row);

    totalPcs += item.totalPcs;
    totalGr += item.totalGr;
    totalHarga += item.totalHarga;
  });

  // Add total row
  if (jenisPenjualan === "kotak") {
    tableData.push(["TOTAL", "", totalPcs, `Rp ${formatRupiah(totalHarga)}`]);
  } else {
    tableData.push(["TOTAL", "", "", totalPcs, totalGr.toFixed(2), "", `Rp ${formatRupiah(totalHarga)}`, ""]);
  }

  // Column headers based on jenis
  let columns;
  if (jenisPenjualan === "kotak") {
    columns = ["Jenis", "Nama Barang", "Pcs", "Harga Total"];
  } else if (jenisPenjualan === "all") {
    columns = ["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total", "Keterangan"];
  } else {
    columns = ["Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga Total"];
  }

  // Generate table
  doc.autoTable({
    head: [columns],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
    footStyles: { fillColor: [236, 240, 241], fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'center' }, // Pcs
      4: { halign: 'center' }, // Gr
      6: { halign: 'right' },  // Harga
    },
    didDrawPage: function (data) {
      // Footer
      doc.setFontSize(8);
      doc.text(
        `Halaman ${data.pageNumber}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    },
  });

  // Download
  const filename = `Laporan_Penjualan_${startDate.replace(/\//g, "-")}_${endDate.replace(/\//g, "-")}.pdf`;
  doc.save(filename);

  this.showAlert("Export PDF berhasil!", "Sukses", "success");
}
```

#### 5. Update Event Listeners

```javascript
attachEventListeners() {
  // Filter button
  document.getElementById("filterSalesBtn")?.addEventListener("click", () => {
    const startDate = document.getElementById("startDate")?.value;
    const endDate = document.getElementById("endDate")?.value;

    if (!startDate || !endDate) {
      this.showAlert("Pilih tanggal mulai dan tanggal akhir", "Peringatan", "warning");
      return;
    }

    const startDateObj = parseDate(startDate);
    const endDateObj = parseDate(endDate);

    if (endDateObj < startDateObj) {
      this.showAlert("Tanggal akhir harus lebih besar atau sama dengan tanggal mulai", "Peringatan", "warning");
      return;
    }

    this.showLoading(true);
    this.loadSalesDataByDateRange(startDateObj, endDateObj)
      .then(() => {
        this.filterSalesData();
        this.isDataLoaded = true;
      })
      .catch((error) => {
        this.showAlert("Gagal memuat data: " + error.message, "Error", "error");
      })
      .finally(() => {
        this.showLoading(false);
      });
  });

  // Export Excel button
  document.getElementById("btnExportExcel")?.addEventListener("click", () => {
    this.exportToExcel();
  });

  // Export PDF button
  document.getElementById("btnExportPDF")?.addEventListener("click", () => {
    this.exportToPDF();
  });

  // Sales type filter change
  document.getElementById("salesType")?.addEventListener("change", () => {
    if (this.filteredSalesData && this.filteredSalesData.length > 0) {
      this.filterSalesData();
    }
  });

  // Sales person filter change
  document.getElementById("salesPerson")?.addEventListener("change", () => {
    if (this.filteredSalesData && this.filteredSalesData.length > 0) {
      this.filterSalesData();
    }
  });

  // Date change handlers
  document.getElementById("startDate")?.addEventListener("change", () => {
    this.isDataLoaded = false;
    this.salesData = [];
    this.filteredSalesData = [];
    this.clearTable();
  });

  document.getElementById("endDate")?.addEventListener("change", () => {
    this.isDataLoaded = false;
    this.salesData = [];
    this.filteredSalesData = [];
    this.clearTable();
  });
}

clearTable() {
  const tableBody = document.querySelector("#penjualanTable tbody");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center">
          Klik tombol "Tampilkan" untuk melihat data rentang tanggal yang dipilih
        </td>
      </tr>
    `;
  }
}
```

---

## 📦 Dependencies Update

### HTML (laporanPenjualan.html)

**Add before closing `</body>`:**

```html
<!-- jsPDF for PDF export -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
```

---

## 🔄 Migration Steps

### Phase 1: Backup

1. Backup file `laporanPenjualan.html`
2. Backup file `js/pages/laporanPenjualan.js`
3. Create backup branch di Git

### Phase 2: HTML Changes

1. Add `endDate` input field
2. Remove "Export Laporan Detail Bulanan" section (lines 229-255)
3. Add "Export Laporan" section dengan 2 tombol
4. Add jsPDF dependencies

### Phase 3: JS Refactoring

1. Rename `loadSalesDataByDate` → `loadSalesDataByDateRange`
2. Update cache key logic untuk support date range
3. Remove lines 1025-1340 (monthly export logic)
4. Add `aggregateItemsByCode()` method ⭐ **NEW**
5. Add `exportToExcel()` method (with aggregation)
6. Add `exportToPDF()` method (with aggregation)
7. Add `formatAggregatedItemForExport()` helper
8. Add `calculateItemHarga()` helper
9. Update `attachEventListeners()` method

### Phase 4: Testing

1. Test filter rentang tanggal (1 hari, 7 hari, 1 bulan)
2. Test filter jenis penjualan (all, aksesoris, kotak, silver, manual)
3. Test export Excel dengan berbagai kombinasi filter
4. Test export PDF dengan berbagai kombinasi filter
5. Test cache functionality
6. Test real-time updates (untuk hari ini)

### Phase 5: Cleanup

1. Remove unused methods
2. Remove unused imports
3. Update comments
4. Code formatting

---

## 📊 Impact Analysis

### Code Reduction

- **Before:** ~1465 lines
- **After:** ~900 lines
- **Reduction:** ~565 lines (-38%)

### Complexity Reduction

- Remove complex grouping logic (365 lines)
- Remove duplicate processing methods
- Single source of truth untuk export (filtered data)

### User Experience Improvement

- ✅ Rentang tanggal lebih fleksibel
- ✅ Export langsung dari data yang ditampilkan
- ✅ Template header konsisten
- ✅ 2 format export (Excel & PDF) di satu tempat
- ✅ **Data agregasi per kode** - Laporan lebih ringkas dan mudah dibaca

### Performance

- ✅ Cache tetap efisien (date range key)
- ✅ Query optimized dengan Timestamp index
- ✅ Reduced redundant queries
- ✅ **Export lebih cepat** - Data agregasi mengurangi jumlah baris (10 transaksi → 1 baris)

### Export Aggregation Benefits ⭐

#### Before (Detail per Transaksi):

- **Scenario:** Item K30 terjual 10 kali dalam 1 hari
- **Export Result:** 10 baris untuk K30 (redundant)
- **Total Rows:** 100 transaksi × 3 item/transaksi = 300 baris
- **File Size:** ~50KB Excel
- **Readability:** ❌ Sulit dibaca, banyak duplikasi

#### After (Aggregated per Kode):

- **Scenario:** Item K30 terjual 10 kali dalam 1 hari
- **Export Result:** 1 baris untuk K30 (total: 10pcs, 25gr)
- **Total Rows:** ~50 kode unik = 50 baris
- **File Size:** ~15KB Excel
- **Readability:** ✅ Mudah dibaca, ringkas, analisis stok cepat

#### Business Impact:

- ✅ **Efisiensi Analisis:** Owner bisa langsung lihat total penjualan per item
- ✅ **Stock Reorder:** Mudah identifikasi item fast-moving (K30 10pcs = restock needed)
- ✅ **Print Friendly:** Laporan 1 halaman vs 6 halaman
- ✅ **File Size:** 70% lebih kecil (50KB → 15KB)

---

## 📊 Export Comparison Example

### 🔴 Before: Detail per Transaksi (Redundant)

```
LAPORAN PENJUALAN MELATI BAWAH
AKSESORIS
01/02/2026 - 01/02/2026

Jenis       Kode   Nama Barang        Pcs   Gr      Kadar   Harga
------------------------------------------------------------------
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   K30    Cincin Mutiara     1     2.5     @750    Rp 50,000
AKSESORIS   G45    Gelang Emas        2     5.0     @916    Rp 120,000
AKSESORIS   G45    Gelang Emas        2     5.0     @916    Rp 120,000
AKSESORIS   G45    Gelang Emas        2     5.0     @916    Rp 120,000
AKSESORIS   L12    Liontin Berlian    1     3.2     @750    Rp 200,000
AKSESORIS   L12    Liontin Berlian    1     3.2     @750    Rp 200,000
------------------------------------------------------------------
TOTAL                                 15     48gr             Rp 920,000
```

**Problems:**

- ❌ 15 baris untuk 3 kode barang
- ❌ Banyak duplikasi visual
- ❌ Sulit scan untuk analisis
- ❌ File besar jika banyak transaksi

---

### 🟢 After: Aggregated per Kode (Ringkas)

```
LAPORAN PENJUALAN MELATI BAWAH
AKSESORIS
01/02/2026 - 01/02/2026

Jenis       Kode   Nama Barang        Pcs   Gr      Kadar   Harga Total
------------------------------------------------------------------------
AKSESORIS   G45    Gelang Emas        6     30.0    @916    Rp 360,000
AKSESORIS   K30    Cincin Mutiara     10    25.0    @750    Rp 500,000
AKSESORIS   L12    Liontin Berlian    2     6.4     @750    Rp 400,000
------------------------------------------------------------------------
TOTAL                                 18    61.4gr           Rp 1,260,000
```

**Improvements:**

- ✅ 3 baris untuk 3 kode barang (sorted by kode)
- ✅ Data agregasi jelas (K30 total 10pcs)
- ✅ Mudah analisis stok fast-moving
- ✅ File 70% lebih kecil

---

## 📋 Aggregation Logic Detail

### Grouping Strategy

```javascript
// Unique key for grouping
const key = `${jenis}|${kode}|${nama}|${kadar}`;

// Example keys:
// "AKSESORIS|K30|Cincin Mutiara|@750"
// "AKSESORIS|G45|Gelang Emas|@916"
// "KOTAK|KB01|Kotak Beludru|"
```

### Why Group by Kode + Nama + Kadar?

1. **Kode**: Primary identifier (K30, G45, L12)
2. **Nama**: Same kode might have different names (edge case)
3. **Kadar**: Same item with different kadar (@750 vs @916) should be separate

### Edge Cases Handled

| Case                           | Handling                               |
| ------------------------------ | -------------------------------------- |
| Same kode, different kadar     | Separate rows (K30 @750, K30 @916)     |
| Same kode, DP vs Lunas         | Aggregate (harga calculated correctly) |
| Same kode, multiple keterangan | Join with semicolon                    |
| Missing kode                   | Use "-" as kode                        |

---

## ⚠️ Risks & Mitigations

### Risk 1: Large Date Range Performance

**Impact:** Query 1 bulan penuh bisa lambat (30-31 hari × N transaksi)

**Mitigation:**

- Set maksimal rentang 31 hari
- Add loading indicator dengan progress
- Implement pagination untuk data besar (>1000 records)

### Risk 2: Cache Storage Limit

**Impact:** LocalStorage maksimal 5-10MB, date range cache lebih besar

**Mitigation:**

- Implement LRU (Least Recently Used) cache eviction
- Compress data sebelum save (sudah ada: `compressData()`)
- Auto cleanup cache > 7 hari

### Risk 3: Export Large Data

**Impact:** Excel/PDF dengan ribuan rows bisa freeze browser

**Mitigation:**

- Add warning untuk data > 1000 records
- Batch processing untuk export
- Worker thread untuk heavy processing

---

## 🎯 Success Criteria

### Functional Requirements

- ✅ User bisa pilih rentang tanggal (start - end)
- ✅ Data ditampilkan sesuai rentang + filter jenis + filter sales
- ✅ Export Excel dengan template header standar
- ✅ Export PDF dengan template header standar
- ✅ Export sesuai data yang ditampilkan (filtered)
- ✅ **Export menggunakan data agregasi per kode barang** ⭐
- ✅ Agregasi group by: kode + nama + kadar
- ✅ Total Pcs, Gr, Harga dihitung dengan benar (handle DP, free)

### Non-Functional Requirements

- ✅ Response time < 3 detik untuk rentang 1 bulan
- ✅ Export berhasil untuk data < 5000 records (raw data)
- ✅ **Export agregasi mengurangi rows 70-90%** ⭐
- ✅ Code coverage test > 80%
- ✅ No regression pada fitur cache & real-time

### Code Quality

- ✅ Code reduction > 30%
- ✅ Cyclomatic complexity < 10 per function
- ✅ No duplicate code
- ✅ Consistent naming convention

---

## 📝 Next Steps

1. **Review & Approval:** Diskusi dengan tim, approval dari stakeholder
2. **Implementation:** Follow migration steps (Phase 1-5)
3. **Testing:** UAT dengan user sebenarnya
4. **Deployment:** Deploy ke production dengan rollback plan
5. **Monitoring:** Monitor error logs, performance metrics
6. **Documentation:** Update user manual, API docs

---

## 📚 References

- [SheetJS (XLSX) Documentation](https://docs.sheetjs.com/)
- [jsPDF Documentation](https://artskydj.github.io/jsPDF/docs/)
- [jsPDF AutoTable Plugin](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [Firestore Query Best Practices](https://firebase.google.com/docs/firestore/query-data/queries)
- [LocalStorage Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API)

---

**Prepared by:** GitHub Copilot  
**Document Version:** 1.0  
**Last Updated:** 3 Februari 2026
