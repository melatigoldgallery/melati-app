# Export PDF Detail - Smart Date Range Handling

## 📋 Requirement Update

Export PDF Detail perlu **smart handling** berdasarkan rentang tanggal yang dipilih.

---

## 🎯 Skenario

### **Skenario 1: Single Date (startDate === endDate)**

Contoh: `12/02/2026 - 12/02/2026`

**Output:**

```
LAPORAN PENJUALAN DETAIL - MELATI BAWAH
SILVER
Tanggal: 12/02/2026
```

**Struktur Tabel:**

- Columns: `Jam, Sales, Jenis, Kode, Nama, Pcs, Gr, Kadar, Harga, Keterangan` **(10 kolom)**
- **NO kolom Tanggal** (sudah ada di header)
- 1 page untuk tanggal tersebut

---

### **Skenario 2: Date Range (startDate !== endDate)**

Contoh: `10/02/2026 - 12/02/2026`

**Output:**

```
LAPORAN PENJUALAN DETAIL - MELATI BAWAH
SILVER
Tanggal: 10/02/2026 - 12/02/2026
```

**Struktur Tabel:**

- Columns: `Tanggal, Jam, Sales, Jenis, Kode, Nama, Pcs, Gr, Kadar, Harga, Keterangan` **(11 kolom)**
- **WITH kolom Tanggal** (untuk identifikasi per row)
- Data semua tanggal **digabung dalam 1 dokumen**
- **TIDAK ada forced page break** per tanggal
- Data flow seamlessly dari tanggal satu ke yang lain
- Halaman baru hanya jika **space habis** (auto by autoTable)

---

## 🔧 Implementasi

### 1. Refactor `exportDetailToPDF()`

**Conditional routing:**

```javascript
exportDetailToPDF() {
  // ... existing setup ...

  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  // Determine if single date or date range
  const isSingleDate = (startDate === endDate);

  if (isSingleDate) {
    return this.exportDetailToPDF_SingleDate(startDate, endDate);
  } else {
    return this.exportDetailToPDF_DateRange(startDate, endDate);
  }
}
```

---

### 2. Extract `exportDetailToPDF_SingleDate()`

**Logic:** Keep existing implementation dengan minimal changes

```javascript
exportDetailToPDF_SingleDate(startDate, endDate) {
  const doc = new jsPDF("landscape", "mm", "a4");

  // Header
  doc.text("LAPORAN PENJUALAN DETAIL - MELATI BAWAH", 148.5, 12, { align: "center" });
  doc.text(jenisLabel, 148.5, 19, { align: "center" });
  doc.text(`Tanggal: ${startDate}`, 148.5, 26, { align: "center" });

  // Build table data (NO Tanggal column)
  const tableData = [];

  this.filteredSalesData.forEach((transaction) => {
    const time = this.getTransactionTime(transaction);
    const sales = transaction.sales || "-";
    const jenis = transaction.jenisPenjualan || "-";

    transaction.items.forEach((item) => {
      tableData.push([
        time,      // Jam
        sales,     // Sales
        jenis,     // Jenis
        item.kodeText || item.barcode || "-",
        item.nama || "-",
        parseInt(item.jumlah) || 1,
        (parseFloat(item.berat) || 0).toFixed(2),
        item.kadar || "-",
        `Rp ${(parseInt(item.totalHarga) || 0).toLocaleString("id-ID")}`,
        item.keterangan || transaction.keterangan || "-"
      ]);
    });
  });

  // AutoTable (10 columns)
  doc.autoTable({
    head: [["Jam", "Sales", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Keterangan"]],
    body: tableData,
    startY: 32,
    // ... styling ...
  });
}
```

---

### 3. NEW: `exportDetailToPDF_DateRange()`

**Logic:** Gabung semua data tanpa grouping, with Tanggal column

```javascript
exportDetailToPDF_DateRange(startDate, endDate) {
  const doc = new jsPDF("landscape", "mm", "a4");

  // Header dengan range
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("LAPORAN PENJUALAN DETAIL - MELATI BAWAH", 148.5, 12, { align: "center" });

  doc.setFontSize(12);
  doc.text(jenisLabel, 148.5, 19, { align: "center" });
  doc.text(`Tanggal: ${startDate} - ${endDate}`, 148.5, 26, { align: "center" });

  // Sort transactions by timestamp (ascending)
  const sortedTransactions = [...this.filteredSalesData].sort((a, b) => {
    const dateA = this.getTransactionDate(a);
    const dateB = this.getTransactionDate(b);
    return dateA - dateB;
  });

  // Build single table data array untuk semua tanggal
  const tableData = [];
  let totalPcs = 0;
  let totalGr = 0;
  let totalHarga = 0;

  sortedTransactions.forEach((transaction) => {
    const date = this.getFormattedDate(transaction);  // Format: dd/mm/yyyy
    const time = this.getTransactionTime(transaction); // Format: HH:MM
    const sales = transaction.sales || "-";
    const jenis = transaction.jenisPenjualan || "-";

    if (!transaction.items) return;

    transaction.items.forEach((item) => {
      const kode = item.kodeText || item.barcode || "-";
      const nama = item.nama || "-";
      const pcs = parseInt(item.jumlah) || 1;
      const gr = parseFloat(item.berat) || 0;
      const kadar = item.kadar || "-";
      let harga = parseInt(item.totalHarga) || 0;

      if (transaction.metodeBayar === "free") {
        harga = 0;
      }

      const keterangan = item.keterangan || transaction.keterangan || "-";

      tableData.push([
        date,      // NEW: Kolom Tanggal
        time,      // Jam
        sales,     // Sales
        jenis,     // Jenis
        kode,      // Kode
        nama,      // Nama
        pcs,       // Pcs
        gr.toFixed(2),  // Gr
        kadar,     // Kadar
        `Rp ${harga.toLocaleString("id-ID")}`,  // Harga
        keterangan // Keterangan
      ]);

      totalPcs += pcs;
      totalGr += gr;
      totalHarga += harga;
    });
  });

  // Total row (11 columns)
  tableData.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    totalPcs,
    totalGr.toFixed(2),
    "",
    `Rp ${totalHarga.toLocaleString("id-ID")}`,
    ""
  ]);

  // Single autoTable call (auto-paging jika space habis)
  doc.autoTable({
    head: [["Tanggal", "Jam", "Sales", "Jenis", "Kode", "Nama Barang", "Pcs", "Gr", "Kadar", "Harga", "Keterangan"]],
    body: tableData,
    startY: 32,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 128, 185], fontStyle: "bold", halign: "center" },
    footStyles: { fillColor: [236, 240, 241], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 20 },  // Tanggal
      1: { cellWidth: 12 },  // Jam
      2: { cellWidth: 22 },  // Sales
      3: { cellWidth: 18 },  // Jenis
      4: { cellWidth: 22 },  // Kode
      5: { cellWidth: 55 },  // Nama
      6: { halign: "center", cellWidth: 12 }, // Pcs
      7: { halign: "center", cellWidth: 18 }, // Gr
      8: { halign: "center", cellWidth: 12 }, // Kadar
      9: { halign: "right", cellWidth: 28 },  // Harga
      10: { cellWidth: 38 }, // Keterangan
    },
    didDrawPage: function (data) {
      // Footer
      doc.setFontSize(8);
      doc.text(`Halaman ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    },
  });

  // Download
  const filename = `Laporan_Penjualan_Detail_${startDate.replace(/\//g, "-")}_${endDate.replace(/\//g, "-")}.pdf`;
  doc.save(filename);

  this.showAlert("Export PDF Detail berhasil!", "Sukses", "success");
}
```

---

### 4. Helper Methods

```javascript
// Get transaction date as Date object
getTransactionDate(transaction) {
  if (transaction.timestamp) {
    if (typeof transaction.timestamp.toDate === "function") {
      return transaction.timestamp.toDate();
    } else if (transaction.timestamp instanceof Date) {
      return transaction.timestamp;
    } else if (typeof transaction.timestamp === "string") {
      return new Date(transaction.timestamp);
    } else if (typeof transaction.timestamp === "object" && transaction.timestamp.seconds) {
      return new Date(transaction.timestamp.seconds * 1000);
    }
  }
  return new Date(0);
}

// Get formatted date string (dd/mm/yyyy)
getFormattedDate(transaction) {
  const dateObj = this.getTransactionDate(transaction);
  if (dateObj && !isNaN(dateObj.getTime())) {
    return formatDate(dateObj);
  }
  return "-";
}

// Get formatted time string (HH:MM)
getTransactionTime(transaction) {
  const dateObj = this.getTransactionDate(transaction);
  if (dateObj && !isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "-";
}
```

---

## 📊 Comparison

| Aspect         | Single Date           | Date Range                         |
| -------------- | --------------------- | ---------------------------------- |
| **Header**     | `Tanggal: 12/02/2026` | `Tanggal: 10/02/2026 - 12/02/2026` |
| **Columns**    | 10 (NO Tanggal)       | 11 (WITH Tanggal)                  |
| **Data Flow**  | 1 page                | Continuous flow                    |
| **Page Break** | N/A                   | Auto by autoTable                  |
| **Sorting**    | Single date           | Timestamp ascending                |
| **Total**      | Single date total     | All dates total                    |

---

## ✅ Benefits

1. ✅ **Smart detection** - Auto detect single vs range
2. ✅ **Seamless flow** - Data tidak terputus per tanggal
3. ✅ **Space efficient** - Tidak ada forced page break
4. ✅ **Clear identification** - Kolom tanggal untuk distinguish per row
5. ✅ **Auto-paging** - AutoTable handle pagination otomatis
6. ✅ **Chronological order** - Data sorted by timestamp
7. ✅ **Backward compatible** - Single date tetap seperti sebelumnya

---

## 🧪 Testing Checklist

- [ ] Single date (12/02 - 12/02): Header single, 10 kolom, NO tanggal column
- [ ] 2 days (11/02 - 12/02): Header range, 11 kolom, WITH tanggal column
- [ ] 3 days (10/02 - 12/02): Data gabungan, flow seamlessly
- [ ] 7 days: Verify auto-paging works correctly
- [ ] Large dataset: Multiple pages dengan continuous flow
- [ ] Total calculation: Accurate across all dates
- [ ] Sorting: Data chronological order
- [ ] Column widths: Proper alignment di landscape mode

---

## 🎯 Implementation Steps

1. ✅ Refactor `exportDetailToPDF()` dengan conditional routing
2. ✅ Extract `exportDetailToPDF_SingleDate()` (existing logic)
3. ✅ Create `exportDetailToPDF_DateRange()` (new logic)
4. ✅ Add helper methods: `getTransactionDate()`, `getFormattedDate()`, `getTransactionTime()`
5. ✅ Update column widths untuk handle 11 columns di landscape
6. ✅ Test semua skenario
7. ✅ Update Excel export (opsional - maintain consistency)
