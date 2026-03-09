# Rencana Implementasi Fitur Detail & Rekap Laporan Penjualan

## 📋 Overview

Menambahkan dropdown "Jenis Laporan" dengan 2 mode:

- **Rekap**: Data agregasi per kode (logic existing)
- **Detail**: Data transaksi individual dengan struktur berbeda

---

## 🎯 Perubahan yang Diperlukan

### 1. **HTML (laporanPenjualan.html)**

**Lokasi**: Setelah filter `salesPerson`, sebelum tombol "Tampilkan"

```html
<div class="col-md-2">
  <label for="reportType" class="form-label">Jenis Laporan</label>
  <select class="form-select" id="reportType">
    <option value="rekap" selected>Rekap (Per Kode)</option>
    <option value="detail" selected>Detail (Per Transaksi)</option>
  </select>
</div>
```

**Update struktur tabel** - Tambah kolom `Jam` dan `Sales`:

```html
<thead>
  <tr>
    <th>Tanggal</th>
    <th>Jam</th>
    <!-- NEW -->
    <th>Sales</th>
    <!-- NEW -->
    <th>Jenis</th>
    <th>Kode</th>
    <th>Nama Barang</th>
    <th>Pcs</th>
    <th>Gr</th>
    <th>Kadar</th>
    <th>Harga</th>
    <th>Status</th>
    <th>Keterangan</th>
  </tr>
</thead>
```

---

### 2. **JavaScript (laporanPenjualan.js)**

#### A. State Management

```javascript
// Di dalam class/handler, tambah property:
this.currentReportType = "rekap"; // Default
```

#### B. Table Configuration Update

```javascript
const tableConfigs = {
  rekap: {
    columns: ["Tanggal", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Status", "Keterangan"],
    fields: ["tanggal", "jenis", "kode", "nama", "pcs", "gr", "kadar", "harga", "status", "keterangan"],
  },
  detail: {
    columns: [
      "Tanggal",
      "Jam",
      "Sales",
      "Jenis",
      "Kode",
      "Nama Barang",
      "Pcs",
      "Gr",
      "Kadar",
      "Harga",
      "Status",
      "Keterangan",
    ],
    fields: ["tanggal", "jam", "sales", "jenis", "kode", "nama", "pcs", "gr", "kadar", "harga", "status", "keterangan"],
  },
};
```

#### C. Method `prepareTableData()` - Conditional Logic

```javascript
prepareTableData() {
  const reportType = document.getElementById("reportType").value;
  this.currentReportType = reportType;

  if (reportType === "detail") {
    return this.prepareDetailData();
  } else {
    return this.prepareRekapData(); // Existing logic
  }
}
```

#### D. New Method: `prepareDetailData()`

**Logic**:

- Loop setiap transaksi → loop setiap item
- Extract: tanggal, jam (dari timestamp), sales, jenis, kode, nama, pcs, gr, kadar, harga, status, keterangan
- **NO aggregation** - tiap item jadi 1 row
- Sort by timestamp descending

```javascript
prepareDetailData() {
  const tableData = [];

  this.filteredSalesData.forEach((transaction) => {
    // Format tanggal & jam dari timestamp
    const date = formatDate(transaction.timestamp.toDate());
    const time = transaction.timestamp.toDate().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const sales = transaction.sales || "-";
    const jenis = this.formatJenisPenjualan(transaction);
    const status = this.getStatusBadge(transaction);

    transaction.items.forEach((item) => {
      tableData.push([
        date,
        time,
        sales,
        jenis,
        item.kodeText || item.barcode || "-",
        item.nama || "-",
        parseInt(item.jumlah) || 1,
        parseFloat(item.berat) > 0 ? `${parseFloat(item.berat).toFixed(2)} gr` : "-",
        item.kadar || "-",
        `Rp ${(parseInt(item.totalHarga) || 0).toLocaleString("id-ID")}`,
        status,
        item.keterangan || transaction.keterangan || "-"
      ]);
    });
  });

  return tableData;
}
```

#### E. Method `prepareRekapData()`

Extract existing aggregation logic dari `prepareTableData()`:

- Global summary map
- Aggregate by kode
- Merge items dengan kode sama

---

### 3. **Export Excel - Conditional Logic**

#### Method: `exportToExcel()`

```javascript
exportToExcel() {
  if (this.currentReportType === "detail") {
    return this.exportDetailToExcel();
  } else {
    return this.exportRekapToExcel(); // Existing logic
  }
}
```

#### New Method: `exportDetailToExcel()`

**Structure**: `tanggal, jam, sales, jenis, kode, nama barang, pcs, gr, kadar, harga, keterangan`

- ❌ **Remove**: Status (tidak ada di export)
- Format currency tanpa "Rp"
- Format berat tanpa "gr"

```javascript
exportDetailToExcel() {
  const exportData = [];
  const header = ["Tanggal", "Jam", "Sales", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Keterangan"];
  exportData.push(header);

  this.filteredSalesData.forEach((transaction) => {
    const date = formatDate(transaction.timestamp.toDate());
    const time = transaction.timestamp.toDate().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const sales = transaction.sales || "-";
    const jenis = transaction.jenisPenjualan;

    transaction.items.forEach((item) => {
      exportData.push([
        date,
        time,
        sales,
        jenis,
        item.kodeText || item.barcode || "-",
        item.nama || "-",
        parseInt(item.jumlah) || 1,
        parseFloat(item.berat) || 0,
        item.kadar || "-",
        parseInt(item.totalHarga) || 0,
        item.keterangan || transaction.keterangan || "-"
      ]);
    });
  });

  // Create workbook & download (same as existing)
}
```

---

### 4. **Export PDF - Conditional Logic**

#### Method: `exportToPDF()`

```javascript
exportToPDF() {
  if (this.currentReportType === "detail") {
    return this.exportDetailToPDF();
  } else {
    return this.exportRekapToPDF(); // Existing logic
  }
}
```

#### New Method: `exportDetailToPDF()`

**Special feature**: **Dipisahkan per tanggal** (grouping by date)

```javascript
exportDetailToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");

  // Group data by tanggal
  const groupedByDate = new Map();

  this.filteredSalesData.forEach((transaction) => {
    const date = formatDate(transaction.timestamp.toDate());
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date).push(transaction);
  });

  // Generate PDF page per tanggal
  let firstPage = true;

  Array.from(groupedByDate.entries()).forEach(([date, transactions]) => {
    if (!firstPage) {
      doc.addPage();
    }
    firstPage = false;

    // Title dengan tanggal
    doc.text(`Laporan Penjualan Detail - ${date}`, 14, 15);

    // Prepare table data untuk tanggal ini
    const tableData = [];
    transactions.forEach((transaction) => {
      const time = transaction.timestamp.toDate().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      });
      const sales = transaction.sales || "-";
      const jenis = transaction.jenisPenjualan;

      transaction.items.forEach((item) => {
        tableData.push([
          time,
          sales,
          jenis,
          item.kodeText || item.barcode || "-",
          item.nama || "-",
          parseInt(item.jumlah) || 1,
          parseFloat(item.berat) || 0,
          item.kadar || "-",
          parseInt(item.totalHarga) || 0,
          item.keterangan || transaction.keterangan || "-"
        ]);
      });
    });

    // AutoTable
    doc.autoTable({
      head: [["Jam", "Sales", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Keterangan"]],
      body: tableData,
      startY: 25,
    });
  });

  doc.save("Laporan_Penjualan_Detail.pdf");
}
```

---

## 📝 Summary Perubahan

| Komponen         | Perubahan                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **HTML**         | • Tambah dropdown `reportType`<br>• Update header tabel (+ Jam, Sales)                                 |
| **State**        | • Property `currentReportType`                                                                         |
| **Table Config** | • Split config: `rekap` & `detail`                                                                     |
| **Render Logic** | • `prepareTableData()` conditional<br>• New: `prepareDetailData()`<br>• Refactor: `prepareRekapData()` |
| **Export Excel** | • Conditional routing<br>• New: `exportDetailToExcel()`                                                |
| **Export PDF**   | • Conditional routing<br>• New: `exportDetailToPDF()` (grouping by date)                               |

---

## ✅ Testing Checklist

- [ ] Dropdown "Jenis Laporan" berfungsi
- [ ] Mode Rekap: Data agregasi per kode (existing logic tetap jalan)
- [ ] Mode Detail: Tampil semua transaksi individual dengan jam & sales
- [ ] Export Excel Detail: Structure sesuai (tanpa status)
- [ ] Export PDF Detail: Dipisahkan per tanggal, structure sesuai
- [ ] Footer total tetap akurat di mode Detail
- [ ] Cache tetap berfungsi untuk kedua mode
- [ ] Real-time update berfungsi untuk kedua mode

---

## 🎯 Next Steps

1. **Konfirmasi** rencana ini
2. **Implementasi** perubahan HTML + JS
3. **Testing** kedua mode laporan
4. **Validasi** export Excel & PDF
