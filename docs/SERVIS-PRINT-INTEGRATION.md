# 🖨️ Input Servis - Print Service Integration

Panduan integrasi silent printing untuk nota servis, nota custom, dan label servis.

---

## 📋 Overview

**3 Jenis Print yang Akan Diintegrasikan:**

| Jenis            | Format                  | Double Print | Current Method           |
| ---------------- | ----------------------- | ------------ | ------------------------ |
| **Nota Servis**  | 20cm x 12.9cm Landscape | ✅ 2x        | Browser `window.print()` |
| **Nota Custom**  | 17cm x 12cm Landscape   | ✅ 2x        | Browser `window.print()` |
| **Label Servis** | Box-style (multiple)    | ✅ 2x        | Browser `window.print()` |

**Requirement:**

- ✅ Hasil print EXACT sama dengan browser print saat ini
- ✅ Silent print (no dialog) jika service online
- ✅ Auto fallback ke browser jika service offline
- ✅ Semua print 2x otomatis (double print)

---

## 🎯 Architecture

```
input-servis.js
    ↓ (cek service.isOnline?)
    ├─→ YES: printService.printNotaServis(data)
    │         → API POST /api/print/nota-servis
    │         → printQueue → Puppeteer → Printer (2x auto)
    │         → Return jobID
    │
    └─→ NO:  printNotaServisBrowser(data)
             → window.open() → Browser Print Dialog (existing)
```

---

## 📦 Backend Implementation

### **1. Templates (printing-service/templates/)**

#### **a) `nota-servis.html`**

**Data Structure:**

```javascript
{
  tanggal: "07/02/2026",
  customerName: "Ibu Siti",
  customerPhone: "08123456789",
  salesName: "Budi",
  items: [
    {
      jumlah: 2,
      namaBarang: "Kalung",
      berat: "10gr",
      karat: "70%",
      jenisServis: "PATRI",
      rincianServis: "Patri sambung",
      ongkos: 50000,
      statusPembayaran: "nominal" // "nominal" | "belum_lunas" | "free"
    }
  ],
  totalOngkos: 50000
}
```

**Template HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Nota Servis</title>
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
    <div class="customer-info">
      <div>{{tanggal}}</div>
      <div style="margin-top: 3mm;">{{customerName}}</div>
      <div style="margin-top: 3mm;">{{customerPhone}}</div>
    </div>

    <div class="nota-table">
      <table>
        <tbody>
          {{#each items}}
          <tr>
            <td style="text-align: center;">{{jumlah}} pcs</td>
            <td>{{namaBarang}}{{#if rincianServis}} - {{rincianServis}}{{/if}} [{{statusLabel}}]</td>
            <td>{{berat}}</td>
            <td>{{karat}}</td>
            <td style="text-align: right;">{{formatRupiah ongkos}}</td>
            <td>{{jenisServis}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <div class="signature-section">
      <div class="signature-customer">{{customerName}}</div>
      <div class="signature-sales">{{salesName}}</div>
    </div>

    <div class="nota-catatan">
      Catatan : Penurunan berat pasca pencucian/servis dapat terjadi karena pembersihan kotoran yang menempel
    </div>
  </body>
</html>
```

---

#### **b) `nota-custom.html`**

**Data Structure:**

```javascript
{
  tanggal: "07/02/2026",
  customerName: "Ibu Ani",
  customerPhone: "08987654321",
  salesName: "Andi",
  items: [
    {
      jumlah: 1,
      namaBarang: "Cincin Custom",
      berat: "15gr",
      panjang: "55cm",
      kadar: "750",
      warna: "Rose Gold",
      totalDP: 1000000,
      ongkos: 200000,
      statusPembayaran: "nominal", // "nominal" | "custom"
      rincianServis: "Model bunga"
    }
  ],
  totalDP: 1000000,
  totalOngkos: 200000,
  grandTotal: 1200000
}
```

**Template HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Nota Custom</title>
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
      }
      td:nth-child(4) {
        width: 20px;
      }
      td:nth-child(5) {
        width: 30px;
      }
      td:nth-child(6) {
        width: 50px;
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
    <div class="customer-info">
      <div>{{tanggal}}</div>
      <div style="margin-top: 3mm;">{{customerName}}</div>
      <div style="margin-top: 3mm;">{{customerPhone}}</div>
    </div>

    <div class="nota-table">
      <table>
        <tbody>
          {{#each items}}
          <tr>
            <td style="text-align: center;">{{jumlah}} pcs</td>
            <td>
              {{namaBarang}}{{#if panjang}}, P: {{panjang}}cm{{/if}}{{#if kadar}}, K: {{kadar}}{{/if}}{{#if warna}}, W:
              {{warna}}{{/if}}
              <br />
              <span style="font-size: 10px; font-style: italic;">({{statusLabel}})</span>
            </td>
            <td>{{#if berat}}± {{berat}}{{else}}-{{/if}}</td>
            <td style="text-align: right;">{{formatRupiah totalDP}}</td>
            <td style="text-align: right;">{{formatRupiah ongkos}}</td>
            <td>{{#if rincianServis}}{{rincianServis}}{{else}}-{{/if}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <div class="bayar-awal-section">
      <span class="bayar-awal-label">BAYAR AWAL</span>
      <span class="bayar-awal-value">{{formatRupiah grandTotal}}</span>
    </div>

    <div class="total-dp-info">{{formatRupiah totalDP}} (DP)</div>

    <div class="note-info">Note : Ongkos tidak termasuk hitungan pelunasan</div>

    <div class="signature-section">
      <div class="signature-sales">Sales: {{salesName}}</div>
    </div>
  </body>
</html>
```

---

#### **c) `label-servis.html`**

**Data Structure:**

```javascript
{
  items: [
    {
      id: "ABC123",
      customerName: "Ibu Siti",
      jenisInput: "servis", // atau "custom"
      detailBarang: [
        {
          namaBarang: "Kalung",
          jenisServis: "PATRI",
          rincianServis: "Patri sambung",
          statusPembayaran: "nominal",
        },
      ],
      detailBarangCustom: [
        {
          namaBarang: "Cincin",
          berat: "15gr",
          panjang: "55cm",
          kadar: "750",
          warna: "Rose Gold",
          rincianServis: "Model bunga",
        },
      ],
    },
  ];
}
```

**Template HTML:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Label Servis</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 10mm;
        font-family: Arial, sans-serif;
      }
      .boxes-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 5mm;
        width: 100%;
      }
      .print-service-box {
        width: 90mm;
        height: 50mm;
        border: 1.5px solid #000;
        padding: 3mm;
        box-sizing: border-box;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .print-customer-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 2mm;
        border-bottom: 1px solid #000;
        padding-bottom: 1mm;
      }
      .print-nama-brg {
        font-size: 8px;
        margin-bottom: 3mm;
        flex: 1;
        overflow: hidden;
        line-height: 1.4;
      }
      .print-status {
        font-size: 7px;
        font-weight: bold;
        color: #202020ff;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div class="boxes-container">
      {{#each items}}
      <div class="print-service-box">
        <div class="print-customer-name">{{customerName}}</div>
        <div class="print-nama-brg">
          {{#if (eq jenisInput "custom")}} {{#each detailBarangCustom}} {{namaBarang}}
          <br />
          B:{{berat}} P:{{panjang}} K:{{kadar}} W:{{warna}} {{#if rincianServis}}
          <br />
          {{rincianServis}}{{/if}}
          <br />
          {{/each}} {{else}} {{#each detailBarang}} {{namaBarang}} - {{jenisServis}}{{#if rincianServis}} -
          {{rincianServis}}{{/if}}
          <br />
          {{/each}} {{/if}}
        </div>
        <div class="print-status">{{#if (eq jenisInput "custom")}}CUSTOM{{else}}{{statusText}}{{/if}}</div>
      </div>
      {{/each}}
    </div>
  </body>
</html>
```

---

### **2. Service Layer**

**File:** `printing-service/services/servisPrinter.js`

```javascript
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const Handlebars = require("handlebars");
const printer = require("pdf-to-printer");

// Register Handlebars helpers
Handlebars.registerHelper("formatRupiah", (value) => {
  return new Intl.NumberFormat("id-ID").format(value || 0);
});

Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper("statusLabel", (status) => {
  const labels = {
    nominal: "Lunas",
    belum_lunas: "Belum Lunas",
    free: "Free",
    custom: "Custom",
  };
  return labels[status] || "Lunas";
});

class ServisPrinter {
  constructor(printerName) {
    this.printerName = printerName;
  }

  async printNotaServis(data) {
    try {
      const templatePath = path.join(__dirname, "../templates/nota-servis.html");
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);

      // Add status labels to items
      const enhancedData = {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          statusLabel: this.getStatusLabel(item.statusPembayaran || "nominal"),
        })),
      };

      const html = template(enhancedData);
      const pdfPath = await this.generatePDF(html, {
        width: "20cm",
        height: "12.9cm",
        landscape: true,
      });

      // Print 2x (double print)
      await this.printPDF(pdfPath, 2);

      return { success: true, path: pdfPath };
    } catch (error) {
      throw new Error(`Print nota servis failed: ${error.message}`);
    }
  }

  async printNotaCustom(data) {
    try {
      const templatePath = path.join(__dirname, "../templates/nota-custom.html");
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);

      // Add status labels to items
      const enhancedData = {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          statusLabel: this.getStatusLabel(item.statusPembayaran || "nominal"),
        })),
      };

      const html = template(enhancedData);
      const pdfPath = await this.generatePDF(html, {
        width: "17cm",
        height: "12cm",
        landscape: true,
      });

      // Print 2x (double print)
      await this.printPDF(pdfPath, 2);

      return { success: true, path: pdfPath };
    } catch (error) {
      throw new Error(`Print nota custom failed: ${error.message}`);
    }
  }

  async printLabelServis(data) {
    try {
      const templatePath = path.join(__dirname, "../templates/label-servis.html");
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);

      // Process items to add status text
      const enhancedData = {
        items: data.items.map((item) => {
          const statuses = item.detailBarang?.map((d) => d.statusPembayaran || "nominal") || [];
          const uniqueStatuses = [...new Set(statuses)];
          const statusText = uniqueStatuses.map((s) => this.getStatusLabel(s)).join(" / ");

          return {
            ...item,
            statusText,
          };
        }),
      };

      const html = template(enhancedData);
      const pdfPath = await this.generatePDF(html, {
        width: "21cm",
        height: "29.7cm",
        landscape: false,
      });

      // Print 2x (double print)
      await this.printPDF(pdfPath, 2);

      return { success: true, path: pdfPath };
    } catch (error) {
      throw new Error(`Print label servis failed: ${error.message}`);
    }
  }

  async generatePDF(html, pageSize) {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const timestamp = Date.now();
      const pdfPath = path.join(__dirname, "../temp", `servis-${timestamp}.pdf`);

      await page.pdf({
        path: pdfPath,
        width: pageSize.width,
        height: pageSize.height,
        landscape: pageSize.landscape || false,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      return pdfPath;
    } finally {
      await browser.close();
    }
  }

  async printPDF(pdfPath, copies = 1) {
    const options = {
      printer: this.printerName,
      copies: copies,
    };

    await printer.print(pdfPath, options);
  }

  getStatusLabel(status) {
    const labels = {
      nominal: "Lunas",
      belum_lunas: "Belum Lunas",
      free: "Free",
      custom: "Custom",
    };
    return labels[status] || "Lunas";
  }
}

module.exports = ServisPrinter;
```

---

### **3. Controller**

**File:** `printing-service/controllers/servisPrintController.js`

```javascript
const ServisPrinter = require("../services/servisPrinter");
const config = require("../config/printers.json");
const printQueue = require("../services/printQueue");

exports.printNotaServis = async (req, res) => {
  try {
    const data = req.body;

    // Validate data
    if (!data.customerName || !data.items || data.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid data: customerName and items are required",
      });
    }

    // Queue the print job
    const jobID = printQueue.addJob("nota-servis", data);

    // Return immediately (background processing)
    res.json({
      success: true,
      jobID: jobID,
      message: "Nota servis queued for printing (2 copies)",
    });

    // Process in background
    const printer = new ServisPrinter(config.nota || config.invoice);
    await printer.printNotaServis(data);
    printQueue.updateJobStatus(jobID, "completed");
  } catch (error) {
    console.error("Print nota servis error:", error);
    if (req.body.jobID) {
      printQueue.updateJobStatus(req.body.jobID, "error", error.message);
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
};

exports.printNotaCustom = async (req, res) => {
  try {
    const data = req.body;

    if (!data.customerName || !data.items || data.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid data: customerName and items are required",
      });
    }

    const jobID = printQueue.addJob("nota-custom", data);

    res.json({
      success: true,
      jobID: jobID,
      message: "Nota custom queued for printing (2 copies)",
    });

    const printer = new ServisPrinter(config.nota || config.invoice);
    await printer.printNotaCustom(data);
    printQueue.updateJobStatus(jobID, "completed");
  } catch (error) {
    console.error("Print nota custom error:", error);
    if (req.body.jobID) {
      printQueue.updateJobStatus(req.body.jobID, "error", error.message);
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
};

exports.printLabelServis = async (req, res) => {
  try {
    const data = req.body;

    if (!data.items || data.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid data: items array is required",
      });
    }

    const jobID = printQueue.addJob("label-servis", data);

    res.json({
      success: true,
      jobID: jobID,
      message: "Label servis queued for printing (2 copies)",
    });

    const printer = new ServisPrinter(config.nota || config.invoice);
    await printer.printLabelServis(data);
    printQueue.updateJobStatus(jobID, "completed");
  } catch (error) {
    console.error("Print label servis error:", error);
    if (req.body.jobID) {
      printQueue.updateJobStatus(req.body.jobID, "error", error.message);
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
};
```

---

### **4. Routes**

**Update:** `printing-service/server.js`

```javascript
// Add routes
const servisPrintController = require("./controllers/servisPrintController");

app.post("/api/print/nota-servis", servisPrintController.printNotaServis);
app.post("/api/print/nota-custom", servisPrintController.printNotaCustom);
app.post("/api/print/label-servis", servisPrintController.printLabelServis);
```

---

### **5. Configuration**

**Update:** `printing-service/config/printers.json`

```json
{
  "receipt": "EPSON TM-T20II",
  "invoice": "EPSON L3210 Series (Copy 2)",
  "nota": "EPSON L3210 Series (Copy 2)"
}
```

---

## 🎨 Frontend Integration

### **File:** `js/pages/input-servis.js`

**Pattern: Try Service → Fallback to Browser**

#### **1. Print Nota Servis**

```javascript
// Replace existing printNotaServis function
async function printNotaServis(servisData) {
  // Check if print service available
  if (window.printService && window.printService.isOnline) {
    try {
      const firstCustomer = servisData[0];
      const notaData = {
        tanggal: new Date().toLocaleDateString("id-ID"),
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
      const response = await fetch("http://localhost:3001/api/print/nota-servis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notaData),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Nota servis queued for printing (2 copies):", result.jobID);
        return;
      }
    } catch (error) {
      console.warn("⚠️ Print service failed, using browser fallback:", error);
    }
  }

  // Fallback to browser print (existing function)
  printNotaServisBrowser(servisData);
}

// Rename existing printNotaServis to printNotaServisBrowser
function printNotaServisBrowser(servisData) {
  // ... existing browser print code (keep as is) ...
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
          /* ... existing styles ... */
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
  setTimeout(() => printWindow.print(), 100);
}
```

---

#### **2. Print Nota Custom**

```javascript
// Replace existing printNotaCustom function
async function printNotaCustom(servisData) {
  // Check if print service available
  if (window.printService && window.printService.isOnline) {
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
          notaData.items.push({
            jumlah: parseInt(item.jumlah) || 1,
            namaBarang: item.namaBarang.trim(),
            berat: item.berat?.trim() || "",
            panjang: item.panjang?.trim() || "",
            kadar: item.kadar?.trim() || "",
            warna: item.warna?.trim() || "",
            totalDP: parseInt(item.totalDP) || 0,
            ongkos: parseInt(item.ongkos) || 0,
            statusPembayaran: item.statusPembayaran || "nominal",
            rincianServis: item.rincianServis?.trim() || "",
          });
          notaData.totalDP += parseInt(item.totalDP) || 0;
          notaData.totalOngkos += parseInt(item.ongkos) || 0;
        });
      });

      notaData.grandTotal = notaData.totalDP + notaData.totalOngkos;

      // Call print service API
      const response = await fetch("http://localhost:3001/api/print/nota-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notaData),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Nota custom queued for printing (2 copies):", result.jobID);
        return;
      }
    } catch (error) {
      console.warn("⚠️ Print service failed, using browser fallback:", error);
    }
  }

  // Fallback to browser print (existing function)
  printNotaCustomBrowser(servisData);
}

// Rename existing printNotaCustom to printNotaCustomBrowser
function printNotaCustomBrowser(servisData) {
  // ... existing browser print code (keep as is) ...
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
          /* ... existing styles ... */
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
  setTimeout(() => printWindow.print(), 100);
}
```

---

#### **3. Print Label Servis**

```javascript
// Add new function for print label with service
async function printLabelServis(items) {
  // Check if print service available
  if (window.printService && window.printService.isOnline) {
    try {
      const labelData = {
        items: items.map((item) => ({
          id: item.id,
          customerName: item.namaCustomer || "N/A",
          jenisInput: item.jenisInput || "servis",
          detailBarang: item.detailBarang || [],
          detailBarangCustom: item.detailBarangCustom || [],
        })),
      };

      // Call print service API
      const response = await fetch("http://localhost:3001/api/print/label-servis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labelData),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ Label servis queued for printing (2 copies):", result.jobID);
        return;
      }
    } catch (error) {
      console.warn("⚠️ Print service failed, using browser fallback:", error);
    }
  }

  // Fallback to browser print
  printLabelServisBrowser(items);
}

// Update existing printReport function
function printReport() {
  if (todayData.length === 0) {
    alert("Tidak ada data untuk dicetak");
    return;
  }

  printLabelServis(todayData);
}

// Update existing printSingleItem function
window.printSingleItem = function (id, index) {
  const item = todayData.find((item) => item.id === id);

  if (!item) {
    alert("Data tidak ditemukan. Silakan klik 'Tampilkan' terlebih dahulu.");
    return;
  }

  printLabelServis([item]);
};

// Rename existing browser print logic
function printLabelServisBrowser(items) {
  const printWindow = window.open("", "_blank");

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
  setTimeout(() => printWindow.print(), 100);
}
```

---

## ✅ Testing Checklist

### **Backend:**

- [ ] Template nota-servis.html renders correctly
- [ ] Template nota-custom.html renders correctly
- [ ] Template label-servis.html renders correctly
- [ ] API endpoint `/api/print/nota-servis` returns jobID
- [ ] API endpoint `/api/print/nota-custom` returns jobID
- [ ] API endpoint `/api/print/label-servis` returns jobID
- [ ] PDF generation with correct page size (landscape/portrait)
- [ ] Double print (2 copies) executes automatically
- [ ] Print queue processes jobs in order

### **Frontend:**

- [ ] Service online: Print via API (no dialog)
- [ ] Service offline: Fallback to browser print (with dialog)
- [ ] Nota servis: Layout exact sama dengan browser print
- [ ] Nota custom: Layout exact sama dengan browser print
- [ ] Label servis: Layout exact sama dengan browser print
- [ ] Double print works di kedua mode (service & browser)
- [ ] No console errors
- [ ] Test reprint dari riwayat

### **Integration:**

- [ ] Save data → Auto print nota (service or browser)
- [ ] Button "Print" → Print label (service or browser)
- [ ] Button "Reprint Nota" → Print nota (service or browser)
- [ ] Button "Print Label" per item → Print single label
- [ ] Status indicator shows service online/offline

---

## 📝 Implementation Steps

1. **Backend (printing-service/):**

   ```bash
   # Install dependencies
   npm install handlebars

   # Create files
   touch templates/nota-servis.html
   touch templates/nota-custom.html
   touch templates/label-servis.html
   touch services/servisPrinter.js
   touch controllers/servisPrintController.js

   # Update config
   # Edit config/printers.json (add "nota")

   # Update routes
   # Edit server.js (add 3 new routes)
   ```

2. **Frontend (js/pages/input-servis.js):**

   ```javascript
   // Rename existing functions
   printNotaServis → printNotaServisBrowser
   printNotaCustom → printNotaCustomBrowser
   printReport → printLabelServisBrowser (logic only)

   // Add new async functions
   async printNotaServis(data) - try service, fallback browser
   async printNotaCustom(data) - try service, fallback browser
   async printLabelServis(items) - try service, fallback browser

   // Update callers
   saveAllServisData() → call new async functions
   printReport() → call printLabelServis()
   printSingleItem() → call printLabelServis([item])
   ```

3. **Testing:**
   - Start print service: `cd printing-service && npm start`
   - Test with service online
   - Stop service, test fallback to browser
   - Compare output layout (service vs browser)
   - Verify double print (2 copies) di both modes

---

## 🎯 Success Criteria

✅ **Service Online:**

- Print langsung tanpa dialog (silent)
- Auto 2x copies
- Layout EXACT sama dengan browser print saat ini

✅ **Service Offline:**

- Auto fallback ke browser print (existing code)
- Browser dialog muncul
- Layout tidak berubah

✅ **No Breaking Changes:**

- Existing browser print tetap berfungsi
- Backward compatible

---

## 📞 Support

**Jika ada issue:**

1. Check print service running: `http://localhost:3001/api/health`
2. Check logs: `printing-service/logs/error.log`
3. Test dengan browser print dulu (pastikan layout OK)
4. Bandingkan PDF output dengan browser print

**Key Points:**

- Layout harus **EXACT** sama
- Double print (2x) wajib di both modes
- Fallback seamless (no error to user)
