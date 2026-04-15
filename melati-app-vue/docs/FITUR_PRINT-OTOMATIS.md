# Rencana Implementasi Fitur Printing Otomatis
## Sistem Penjualan Aksesoris - Melati App

**Tanggal:** 24 Januari 2026  
**Versi:** 1.0  
**Status:** Planning

---

## 📋 Daftar Isi
1. [Executive Summary](#executive-summary)
2. [Analisis Kondisi Existing](#analisis-kondisi-existing)
3. [Arsitektur Solusi](#arsitektur-solusi)
4. [Tahapan Implementasi](#tahapan-implementasi)
5. [Detail Teknis per Tahap](#detail-teknis-per-tahap)
6. [Testing & Deployment](#testing--deployment)
7. [Maintenance & Monitoring](#maintenance--monitoring)

---

## 🎯 Executive Summary

### Tujuan
Mengimplementasikan sistem printing otomatis yang menghilangkan popup dialog printer dan memastikan hasil print konsisten untuk:
- **Receipt Thermal** (58mm/80mm) - untuk struk penjualan
- **Invoice A4** - untuk invoice detail

### Masalah Saat Ini
```javascript
// penjualanAksesoris.js - Line ~2378 & ~2605
printReceipt() {
  window.print(); // ❌ Menampilkan dialog printer
}

printInvoice() {
  window.print(); // ❌ Tidak ada kontrol ukuran/printer
}
```

**Dampak:**
- User bisa salah pilih printer (receipt ke A4, invoice ke thermal)
- Ukuran kertas dan scale tidak konsisten
- Workflow lambat karena harus pilih printer manual

### Solusi
Membangun **Desktop Printing Service** berbasis Node.js + Express yang:
- ✅ Menerima data print dari web app via HTTP/WebSocket
- ✅ Auto-routing ke printer yang tepat (thermal/inkjet)
- ✅ Silent printing tanpa dialog
- ✅ Konsisten dalam ukuran, margin, dan layout

---

## 📊 Analisis Kondisi Existing

### Stack Teknologi
```
Frontend: HTML + JavaScript + jQuery + Bootstrap
Database: Firebase Firestore
Print Method: window.print() (Browser native)
Target OS: Windows
```

### Fungsi Print Existing

#### 1. printReceipt() - Line 2378
**Fitur:**
- Menampilkan struk penjualan (nama, harga, total, bayar, kembalian)
- Support multiple items
- Tampilkan metode pembayaran (tunai/dp/free)
- Print tanggal dan sales

**Output:** HTML yang diformat untuk thermal printer (58mm/80mm)

**Masalah:**
- Ukuran font tidak konsisten antar printer
- Kadang terpotong jika user pilih ukuran kertas salah
- Harus manual pilih printer setiap transaksi

#### 2. printInvoice() - Line 2605
**Fitur:**
- Invoice lengkap dengan header, detail barang, dan total
- Support kadar, berat, harga per gram (untuk emas/silver)
- Tampilkan grand total

**Output:** HTML diformat untuk A4

**Masalah:**
- User bisa cetak ke thermal (hasil terpotong)
- Margin tidak konsisten
- Tidak ada header/footer otomatis (logo, alamat toko)

#### 3. printInvoicePerItem() - Line 2721
**Fitur:** Invoice terpisah per item (untuk penjualan manual)

**Masalah:** Sama seperti printInvoice()

### Integrasi dengan Firestore
```javascript
// saveTransaction() - Line 1885
// Setelah save transaksi, tombol print muncul
$("#btnPrintReceipt, #btnPrintInvoice").show();
```

**Flow Existing:**
```
User input → Save to Firestore → Show print buttons → User click → Browser dialog → Manual select printer
```

---

## 🏗️ Arsitektur Solusi

### Overview Sistem Baru

```
┌─────────────────────────────────────────────────────────────────┐
│                         WEB APPLICATION                          │
│  (penjualanAksesoris.js running in browser)                     │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    │ HTTP POST/WebSocket
                    │ {type: "receipt", data: {...}}
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              DESKTOP PRINTING SERVICE (Node.js)                  │
│  • Express Server (localhost:3000)                              │
│  • Print Job Queue                                              │
│  • Printer Router                                               │
└───────────┬─────────────────────┬───────────────────────────────┘
            │                     │
            │ Receipt             │ Invoice
            ▼                     ▼
    ┌──────────────┐      ┌──────────────┐
    │ Thermal      │      │ Inkjet       │
    │ EPSON TM220  │      │ EPSON L3210  │
    │ (80mm)       │      │ (A4)         │
    └──────────────┘      └──────────────┘
```

### Komponen Utama

#### 1. **Frontend Service** (`js/services/print-service.js`)
```javascript
class PrintService {
  async sendPrintJob(type, data) {
    // Send ke desktop service
  }
  
  checkServiceStatus() {
    // Cek apakah desktop service running
  }
  
  fallbackToBrowserPrint() {
    // Jika service offline, gunakan window.print()
  }
}
```

#### 2. **Desktop Service** (Node.js App)
```
printing-service/
├── server.js                 # Express server
├── controllers/
│   ├── printController.js    # Handle print requests
│   └── printerController.js  # Manage printer config
├── services/
│   ├── printerService.js     # Wrapper untuk node-printer
│   ├── pdfService.js         # Generate PDF dari HTML
│   └── escposService.js      # ESC/POS commands untuk thermal
├── templates/
│   ├── receipt.html          # Template receipt
│   └── invoice.html          # Template invoice
├── config/
│   └── printers.json         # Konfigurasi printer
├── utils/
│   └── logger.js             # Logging
└── package.json
```

#### 3. **Libraries**
- `express` - Web server
- `node-printer` - Direct printing ke Windows printer
- `puppeteer` - Generate PDF dari HTML
- `escpos` - ESC/POS commands untuk thermal printer
- `socket.io` - Real-time communication (optional)
- `winston` - Logging

---

## 📝 Tahapan Implementasi

### **TAHAP 1: Setup Desktop Printing Service** ⏱️ 2-3 hari
**Tujuan:** Membuat service Node.js yang bisa menerima request dan print ke printer

**Deliverables:**
- ✅ Node.js project structure
- ✅ Express server running di `localhost:3000`
- ✅ Basic endpoint `/api/print`
- ✅ Integration dengan `node-printer`
- ✅ Test print "Hello World" ke default printer

**Success Criteria:**
- Server bisa start dan listen di port 3000
- Endpoint bisa terima POST request
- Bisa print text sederhana ke printer tanpa dialog

---

### **TAHAP 2: Implementasi Receipt Printing** ⏱️ 3-4 hari
**Tujuan:** Migrasi printReceipt() dari browser ke desktop service

**Deliverables:**
- ✅ Template receipt.html untuk thermal (80mm)
- ✅ ESC/POS formatter untuk thermal printer
- ✅ Endpoint `/api/print/receipt`
- ✅ Integration dengan EPSON TM220
- ✅ Frontend service untuk kirim data receipt

**Success Criteria:**
- Receipt tercetak otomatis ke thermal printer
- Ukuran font dan layout konsisten
- Support items dengan kadar/berat
- Tampil total, bayar, kembalian dengan benar

---

### **TAHAP 3: Implementasi Invoice Printing** ⏱️ 3-4 hari
**Tujuan:** Migrasi printInvoice() dari browser ke desktop service

**Deliverables:**
- ✅ Template invoice.html untuk A4
- ✅ PDF generator dengan Puppeteer
- ✅ Endpoint `/api/print/invoice`
- ✅ Integration dengan EPSON L3210
- ✅ Header/footer dengan logo dan alamat

**Success Criteria:**
- Invoice tercetak otomatis ke inkjet A4
- Margin dan layout konsisten
- Support multi-page untuk banyak items
- Header dengan logo dan info toko

---

### **TAHAP 4: Frontend Integration** ⏱️ 2-3 hari
**Tujuan:** Integrasi penuh web app dengan desktop service

**Deliverables:**
- ✅ PrintService class di frontend
- ✅ Refactor printReceipt() dan printInvoice()
- ✅ Service status checker
- ✅ Fallback mechanism ke window.print()
- ✅ Loading states dan error handling

**Success Criteria:**
- Print button langsung cetak tanpa popup
- Tampil loading saat proses print
- Error message jika service offline
- Auto-fallback ke browser print

---

### **TAHAP 5: Configuration & Management** ⏱️ 2 hari
**Tujuan:** UI untuk manage printer settings

**Deliverables:**
- ✅ Config file `printers.json`
- ✅ Endpoint `/api/printers` untuk list printer
- ✅ Endpoint `/api/printers/config` untuk update config
- ✅ Simple UI untuk setting printer (optional)

**Success Criteria:**
- Bisa switch printer tanpa edit code
- Bisa set default printer per jenis print
- Config tersimpan persistent

---

### **TAHAP 6: Testing & Optimization** ⏱️ 2-3 hari
**Tujuan:** Ensure reliability dan performance

**Deliverables:**
- ✅ Unit tests untuk services
- ✅ Integration tests untuk endpoints
- ✅ Load testing (100 print jobs)
- ✅ Error handling improvement
- ✅ Performance optimization

**Success Criteria:**
- Success rate > 99%
- Response time < 2 detik
- Handle 50 concurrent print jobs
- Graceful error handling

---

### **TAHAP 7: Deployment & Documentation** ⏱️ 1-2 hari
**Tujuan:** Deploy ke production dan dokumentasi

**Deliverables:**
- ✅ Installer untuk desktop service (optional: Electron)
- ✅ Auto-start on Windows boot
- ✅ User documentation
- ✅ Developer documentation
- ✅ Troubleshooting guide

**Success Criteria:**
- Service auto-start setelah reboot
- User bisa install sendiri dengan mudah
- Dokumentasi lengkap dan jelas

---

## 🔧 Detail Teknis per Tahap

### TAHAP 1: Setup Desktop Printing Service

#### 1.1 Project Structure
```bash
mkdir printing-service
cd printing-service
npm init -y
```

#### 1.2 Install Dependencies
```bash
npm install express cors body-parser winston
npm install printer edge-js  # untuk Windows printing
npm install dotenv nodemon --save-dev
```

#### 1.3 Basic Server (`server.js`)
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Print endpoint (placeholder)
app.post('/api/print', async (req, res) => {
  try {
    const { type, data } = req.body;
    logger.info(`Print request received: ${type}`);
    
    // TODO: Implement printing logic
    
    res.json({ success: true, message: 'Print job queued' });
  } catch (error) {
    logger.error('Print error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Printing service running on http://localhost:${PORT}`);
});
```

#### 1.4 Logger Setup (`utils/logger.js`)
```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

#### 1.5 Testing
```bash
# Start server
npm run dev

# Test endpoint (di terminal lain)
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/print \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'
```

---

### TAHAP 2: Implementasi Receipt Printing

#### 2.1 Printer Service (`services/printerService.js`)
```javascript
const printer = require('printer');
const logger = require('../utils/logger');
const config = require('../config/printers.json');

class PrinterService {
  constructor() {
    this.defaultPrinter = printer.getDefaultPrinterName();
  }

  // Get printer untuk type tertentu
  getPrinterForType(type) {
    const printerName = config[type] || this.defaultPrinter;
    return printerName;
  }

  // List semua printer
  listPrinters() {
    return printer.getPrinters();
  }

  // Print text langsung (untuk thermal)
  printRaw(printerName, data) {
    return new Promise((resolve, reject) => {
      printer.printDirect({
        data: data,
        printer: printerName,
        type: 'RAW',
        success: (jobID) => {
          logger.info(`Print job ${jobID} sent to ${printerName}`);
          resolve(jobID);
        },
        error: (err) => {
          logger.error(`Print error: ${err}`);
          reject(err);
        }
      });
    });
  }

  // Print PDF (untuk invoice A4)
  printPDF(printerName, pdfPath) {
    return new Promise((resolve, reject) => {
      printer.printFile({
        filename: pdfPath,
        printer: printerName,
        success: (jobID) => {
          logger.info(`Print job ${jobID} sent to ${printerName}`);
          resolve(jobID);
        },
        error: (err) => {
          logger.error(`Print error: ${err}`);
          reject(err);
        }
      });
    });
  }
}

module.exports = new PrinterService();
```

#### 2.2 ESC/POS Service (`services/escposService.js`)
```javascript
const escpos = require('escpos');
const logger = require('../utils/logger');

class ESCPOSService {
  // Generate ESC/POS commands untuk receipt
  generateReceiptCommands(data) {
    const { 
      items, 
      totalHarga, 
      jumlahBayar, 
      kembalian, 
      sales, 
      tanggal,
      metodeBayar,
      nominalDP,
      sisaPembayaran 
    } = data;

    let output = '';

    // Header
    output += this.cmd.TEXT_FORMAT.TXT_ALIGN_CT;
    output += this.cmd.TEXT_FORMAT.TXT_BOLD_ON;
    output += 'TOKO EMAS MELATI\n';
    output += this.cmd.TEXT_FORMAT.TXT_BOLD_OFF;
    output += 'Jl. Example No. 123\n';
    output += 'Telp: 081234567890\n';
    output += this.cmd.LINE_SPACING.LS_DEFAULT;
    output += '--------------------------------\n';

    // Transaction info
    output += this.cmd.TEXT_FORMAT.TXT_ALIGN_LT;
    output += `Tanggal: ${tanggal}\n`;
    output += `Sales: ${sales}\n`;
    output += `Metode: ${this.formatMetodeBayar(metodeBayar)}\n`;
    output += '--------------------------------\n';

    // Items
    items.forEach(item => {
      output += `${item.nama}\n`;
      
      if (item.kadar) output += `  Kadar: ${item.kadar}\n`;
      if (item.berat) output += `  Berat: ${item.berat}g\n`;
      if (item.jumlah > 1) output += `  Qty: ${item.jumlah}\n`;
      
      output += `  ${this.formatRupiah(item.totalHarga)}\n`;
    });

    output += '--------------------------------\n';

    // Total
    output += this.cmd.TEXT_FORMAT.TXT_BOLD_ON;
    output += `TOTAL: ${this.formatRupiah(totalHarga)}\n`;
    output += this.cmd.TEXT_FORMAT.TXT_BOLD_OFF;

    // Payment details
    if (metodeBayar === 'dp') {
      output += `DP: ${this.formatRupiah(nominalDP)}\n`;
      output += `Sisa: ${this.formatRupiah(sisaPembayaran)}\n`;
    } else if (metodeBayar !== 'free') {
      output += `Bayar: ${this.formatRupiah(jumlahBayar)}\n`;
      output += `Kembalian: ${this.formatRupiah(kembalian)}\n`;
    }

    // Footer
    output += '--------------------------------\n';
    output += this.cmd.TEXT_FORMAT.TXT_ALIGN_CT;
    output += 'Terima Kasih\n';
    output += 'sudah mengunjungi Melati Gold Shop\n';
    output += '\n\n\n';

    // Cut paper
    output += this.cmd.FEED_CONTROL_SEQUENCES.CTL_FF;

    return output;
  }

  formatMetodeBayar(metode) {
    const mapping = {
      'tunai': 'Tunai',
      'dp': 'DP',
      'free': 'Gratis'
    };
    return mapping[metode] || metode;
  }

  formatRupiah(angka) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(angka);
  }

  // ESC/POS command constants
  get cmd() {
    return {
      TEXT_FORMAT: {
        TXT_NORMAL: '\x1B\x21\x00',
        TXT_BOLD_ON: '\x1B\x45\x01',
        TXT_BOLD_OFF: '\x1B\x45\x00',
        TXT_UNDERL_ON: '\x1B\x2D\x01',
        TXT_UNDERL_OFF: '\x1B\x2D\x00',
        TXT_ALIGN_LT: '\x1B\x61\x00',
        TXT_ALIGN_CT: '\x1B\x61\x01',
        TXT_ALIGN_RT: '\x1B\x61\x02',
      },
      LINE_SPACING: {
        LS_DEFAULT: '\x1B\x32',
        LS_SET: '\x1B\x33',
      },
      FEED_CONTROL_SEQUENCES: {
        CTL_LF: '\x0A',
        CTL_FF: '\x0C',
        CTL_CR: '\x0D',
      }
    };
  }
}

module.exports = new ESCPOSService();
```

#### 2.3 Receipt Controller (`controllers/printController.js`)
```javascript
const printerService = require('../services/printerService');
const escposService = require('../services/escposService');
const logger = require('../utils/logger');

class PrintController {
  async printReceipt(req, res) {
    try {
      const receiptData = req.body;

      // Validate data
      if (!receiptData.items || receiptData.items.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No items to print' 
        });
      }

      // Generate ESC/POS commands
      const commands = escposService.generateReceiptCommands(receiptData);

      // Get thermal printer
      const printerName = printerService.getPrinterForType('receipt');

      // Print
      const jobID = await printerService.printRaw(printerName, commands);

      logger.info(`Receipt printed successfully: Job ${jobID}`);
      
      res.json({ 
        success: true, 
        jobID, 
        printer: printerName 
      });
    } catch (error) {
      logger.error('Print receipt error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

module.exports = new PrintController();
```

#### 2.4 Router Update (`server.js`)
```javascript
const printController = require('./controllers/printController');

// Routes
app.post('/api/print/receipt', printController.printReceipt.bind(printController));
```

#### 2.5 Printer Config (`config/printers.json`)
```json
{
  "receipt": "EPSON TM-T20II",
  "invoice": "EPSON L3210",
  "default": "EPSON L3210"
}
```

#### 2.6 Frontend Service (`js/services/print-service.js`)
```javascript
class PrintService {
  constructor() {
    this.serviceURL = 'http://localhost:3000/api';
    this.isOnline = false;
    this.checkInterval = null;
  }

  async init() {
    await this.checkServiceStatus();
    // Check status setiap 30 detik
    this.checkInterval = setInterval(() => {
      this.checkServiceStatus();
    }, 30000);
  }

  async checkServiceStatus() {
    try {
      const response = await fetch(`${this.serviceURL}/health`, {
        method: 'GET',
        timeout: 3000
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  async printReceipt(data) {
    // Cek service status dulu
    if (!this.isOnline) {
      const isAvailable = await this.checkServiceStatus();
      if (!isAvailable) {
        return this.fallbackToBrowserPrint('receipt', data);
      }
    }

    try {
      const response = await fetch(`${this.serviceURL}/print/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, jobID: result.jobID };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Print service error:', error);
      // Fallback ke browser print
      return this.fallbackToBrowserPrint('receipt', data);
    }
  }

  fallbackToBrowserPrint(type, data) {
    console.warn('Using fallback browser print');
    
    // Simpan data ke currentTransactionData (global)
    window.currentTransactionData = data;
    
    // Trigger window.print()
    if (type === 'receipt') {
      window.printDocument('receipt');
    } else {
      window.printDocument('invoice');
    }

    return { success: true, method: 'browser' };
  }

  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Initialize globally
window.printService = new PrintService();
```

#### 2.7 Update penjualanAksesoris.js
```javascript
// Di bagian init()
async init() {
  // ... existing code ...
  
  // Initialize print service
  if (typeof PrintService !== 'undefined') {
    await window.printService.init();
  }
}

// Update printReceipt()
async printReceipt() {
  const receiptData = {
    items: this.collectPrintItems(),
    totalHarga: parseInt($("#totalHarga").text().replace(/\./g, "")),
    jumlahBayar: parseInt($("#jumlahBayar").val().replace(/\./g, "") || 0),
    kembalian: parseInt($("#kembalian").text().replace(/\./g, "") || 0),
    sales: $("#sales").val(),
    tanggal: $("#tanggal").val(),
    metodeBayar: $("#metodeBayar").val(),
    nominalDP: parseInt($("#nominalDP").val().replace(/\./g, "") || 0),
    sisaPembayaran: parseInt($("#sisaPembayaran").text().replace(/\./g, "") || 0)
  };

  // Try printing service first
  if (window.printService) {
    const result = await window.printService.printReceipt(receiptData);
    
    if (result.success) {
      if (result.method === 'browser') {
        utils.showAlert('Printing service offline, menggunakan browser print', 'Info', 'info');
      } else {
        utils.showAlert('Receipt berhasil dicetak!', 'Sukses', 'success');
      }
    }
  } else {
    // Fallback ke method lama
    this.printReceiptBrowser(receiptData);
  }
}

// Rename existing printReceipt ke printReceiptBrowser
printReceiptBrowser(receiptData) {
  // ... existing window.print() code ...
}
```

---

### TAHAP 3: Implementasi Invoice Printing

#### 3.1 PDF Service (`services/pdfService.js`)
```javascript
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const Handlebars = require('handlebars');

class PDFService {
  constructor() {
    this.browser = null;
    this.templateCache = new Map();
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    logger.info('Puppeteer browser initialized');
  }

  async generateInvoicePDF(data) {
    try {
      // Load template
      const template = await this.loadTemplate('invoice');
      const html = template(data);

      // Generate PDF
      const page = await this.browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // PDF options untuk A4
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      await page.close();

      // Save temporary file
      const tempPath = path.join(__dirname, '../temp', `invoice_${Date.now()}.pdf`);
      await fs.writeFile(tempPath, pdfBuffer);

      return tempPath;
    } catch (error) {
      logger.error('PDF generation error:', error);
      throw error;
    }
  }

  async loadTemplate(templateName) {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    // Load from file
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Compile with Handlebars
    const compiled = Handlebars.compile(templateContent);
    
    // Cache it
    this.templateCache.set(templateName, compiled);
    
    return compiled;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }

    // Clean temp folder
    const tempDir = path.join(__dirname, '../temp');
    const files = await fs.readdir(tempDir);
    
    for (const file of files) {
      if (file.endsWith('.pdf')) {
        await fs.unlink(path.join(tempDir, file));
      }
    }
  }
}

module.exports = new PDFService();
```

#### 3.2 Invoice Template (`templates/invoice.html`)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      color: #333;
    }
    
    .container {
      width: 100%;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    
    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .header p {
      font-size: 11px;
      color: #666;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .info-box {
      width: 48%;
    }
    
    .info-box label {
      font-weight: bold;
      display: inline-block;
      width: 100px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th {
      background-color: #333;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
    }
    
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .total-section {
      float: right;
      width: 300px;
      margin-top: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    
    .total-row.grand-total {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
    }
    
    .footer {
      clear: both;
      margin-top: 50px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>TOKO EMAS MELATI</h1>
      <p>Jl. Example No. 123, Kota, Provinsi</p>
      <p>Telp: 081234567890 | Email: info@tokomelati.com</p>
    </div>

    <!-- Info Section -->
    <div class="info-section">
      <div class="info-box">
        <p><label>No. Invoice:</label> {{invoiceNumber}}</p>
        <p><label>Tanggal:</label> {{tanggal}}</p>
        <p><label>Sales:</label> {{sales}}</p>
      </div>
      <div class="info-box">
        <p><label>Jenis:</label> {{jenisPenjualan}}</p>
        <p><label>Metode:</label> {{metodeBayar}}</p>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Kode</th>
          <th>Nama Barang</th>
          <th class="text-center">Qty</th>
          <th>Kadar</th>
          <th class="text-right">Berat (g)</th>
          <th class="text-right">Harga/g</th>
          <th class="text-right">Total Harga</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td class="text-center">{{add @index 1}}</td>
          <td>{{kode}}</td>
          <td>{{nama}}</td>
          <td class="text-center">{{jumlah}}</td>
          <td>{{kadar}}</td>
          <td class="text-right">{{berat}}</td>
          <td class="text-right">{{formatRupiah hargaPerGram}}</td>
          <td class="text-right">{{formatRupiah totalHarga}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <!-- Total Section -->
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>{{formatRupiah totalHarga}}</span>
      </div>
      
      {{#if nominalDP}}
      <div class="total-row">
        <span>DP:</span>
        <span>{{formatRupiah nominalDP}}</span>
      </div>
      <div class="total-row">
        <span>Sisa:</span>
        <span>{{formatRupiah sisaPembayaran}}</span>
      </div>
      {{else}}
      <div class="total-row">
        <span>Bayar:</span>
        <span>{{formatRupiah jumlahBayar}}</span>
      </div>
      <div class="total-row">
        <span>Kembalian:</span>
        <span>{{formatRupiah kembalian}}</span>
      </div>
      {{/if}}
      
      <div class="total-row grand-total">
        <span>GRAND TOTAL:</span>
        <span>{{formatRupiah totalHarga}}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Terima kasih atas kepercayaan Anda</p>
      <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
    </div>
  </div>
</body>
</html>
```

#### 3.3 Handlebars Helpers
```javascript
// Di pdfService.js constructor
Handlebars.registerHelper('formatRupiah', function(angka) {
  if (!angka) return 'Rp 0';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(angka);
});

Handlebars.registerHelper('add', function(a, b) {
  return a + b;
});
```

#### 3.4 Invoice Controller
```javascript
// Tambahkan di printController.js

async printInvoice(req, res) {
  try {
    const invoiceData = req.body;

    // Validate data
    if (!invoiceData.items || invoiceData.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No items to print' 
      });
    }

    // Generate invoice number jika belum ada
    if (!invoiceData.invoiceNumber) {
      invoiceData.invoiceNumber = `INV-${Date.now()}`;
    }

    // Generate PDF
    const pdfPath = await pdfService.generateInvoicePDF(invoiceData);

    // Get inkjet printer
    const printerName = printerService.getPrinterForType('invoice');

    // Print PDF
    const jobID = await printerService.printPDF(printerName, pdfPath);

    // Clean up PDF after printing
    setTimeout(async () => {
      await fs.unlink(pdfPath);
    }, 5000);

    logger.info(`Invoice printed successfully: Job ${jobID}`);
    
    res.json({ 
      success: true, 
      jobID, 
      printer: printerName 
    });
  } catch (error) {
    logger.error('Print invoice error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

#### 3.5 Frontend Integration
```javascript
// Di print-service.js

async printInvoice(data) {
  if (!this.isOnline) {
    const isAvailable = await this.checkServiceStatus();
    if (!isAvailable) {
      return this.fallbackToBrowserPrint('invoice', data);
    }
  }

  try {
    const response = await fetch(`${this.serviceURL}/print/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, jobID: result.jobID };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Print service error:', error);
    return this.fallbackToBrowserPrint('invoice', data);
  }
}
```

---

### TAHAP 4: Frontend Integration

Sudah tercakup di Tahap 2 dan 3 di atas.

**Tambahan:**

#### 4.1 Status Indicator UI
```html
<!-- Tambahkan di penjualanAksesoris.html -->
<div id="printServiceStatus" class="alert alert-info" style="display:none;">
  <i class="fas fa-print me-2"></i>
  <span id="printServiceStatusText">Checking printing service...</span>
</div>
```

```javascript
// Di print-service.js
updateStatusIndicator() {
  const indicator = document.getElementById('printServiceStatus');
  const statusText = document.getElementById('printServiceStatusText');
  
  if (!indicator || !statusText) return;
  
  if (this.isOnline) {
    indicator.className = 'alert alert-success';
    statusText.textContent = '✓ Printing service aktif';
    indicator.style.display = 'block';
    
    setTimeout(() => {
      indicator.style.display = 'none';
    }, 3000);
  } else {
    indicator.className = 'alert alert-warning';
    statusText.textContent = '⚠ Printing service offline - menggunakan browser print';
    indicator.style.display = 'block';
  }
}

// Panggil setelah checkServiceStatus()
async checkServiceStatus() {
  // ... existing code ...
  this.updateStatusIndicator();
  return this.isOnline;
}
```

---

### TAHAP 5: Configuration & Management

#### 5.1 Printer Management Endpoint
```javascript
// Di server.js atau printerController.js

app.get('/api/printers', (req, res) => {
  try {
    const printers = printerService.listPrinters();
    const config = require('./config/printers.json');
    
    res.json({
      success: true,
      printers: printers,
      config: config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/printers/config', async (req, res) => {
  try {
    const { type, printerName } = req.body;
    
    // Validate
    const printers = printerService.listPrinters();
    const exists = printers.find(p => p.name === printerName);
    
    if (!exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Printer not found' 
      });
    }
    
    // Update config
    const config = require('./config/printers.json');
    config[type] = printerName;
    
    await fs.writeFile(
      path.join(__dirname, 'config/printers.json'),
      JSON.stringify(config, null, 2)
    );
    
    res.json({ success: true, message: 'Config updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 5.2 Simple Config UI (Optional)
```html
<!-- settings.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Print Service Settings</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <div class="container mt-5">
    <h2>Printer Configuration</h2>
    
    <div class="card mt-4">
      <div class="card-body">
        <form id="configForm">
          <div class="mb-3">
            <label>Receipt Printer (Thermal)</label>
            <select class="form-select" id="receiptPrinter" name="receipt">
              <!-- Populated by JS -->
            </select>
          </div>
          
          <div class="mb-3">
            <label>Invoice Printer (A4)</label>
            <select class="form-select" id="invoicePrinter" name="invoice">
              <!-- Populated by JS -->
            </select>
          </div>
          
          <button type="submit" class="btn btn-primary">Save Configuration</button>
        </form>
      </div>
    </div>
    
    <div class="card mt-4">
      <div class="card-header">Available Printers</div>
      <div class="card-body">
        <ul id="printerList" class="list-group">
          <!-- Populated by JS -->
        </ul>
      </div>
    </div>
  </div>

  <script>
    const API_URL = 'http://localhost:3000/api';
    
    async function loadPrinters() {
      const response = await fetch(`${API_URL}/printers`);
      const data = await response.json();
      
      if (data.success) {
        const receiptSelect = document.getElementById('receiptPrinter');
        const invoiceSelect = document.getElementById('invoicePrinter');
        const printerList = document.getElementById('printerList');
        
        // Populate dropdowns
        data.printers.forEach(printer => {
          const option1 = new Option(printer.name, printer.name);
          const option2 = new Option(printer.name, printer.name);
          
          receiptSelect.add(option1);
          invoiceSelect.add(option2);
          
          // List
          const li = document.createElement('li');
          li.className = 'list-group-item';
          li.textContent = `${printer.name} ${printer.isDefault ? '(Default)' : ''}`;
          printerList.appendChild(li);
        });
        
        // Set current config
        receiptSelect.value = data.config.receipt;
        invoiceSelect.value = data.config.invoice;
      }
    }
    
    document.getElementById('configForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      
      for (const [type, printer] of formData.entries()) {
        await fetch(`${API_URL}/printers/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, printerName: printer })
        });
      }
      
      alert('Configuration saved!');
    });
    
    loadPrinters();
  </script>
</body>
</html>
```

---

### TAHAP 6: Testing & Optimization

#### 6.1 Unit Tests (`tests/printer.test.js`)
```javascript
const printerService = require('../services/printerService');
const pdfService = require('../services/pdfService');

describe('Printer Service', () => {
  test('should list all printers', () => {
    const printers = printerService.listPrinters();
    expect(Array.isArray(printers)).toBe(true);
    expect(printers.length).toBeGreaterThan(0);
  });

  test('should get printer for receipt', () => {
    const printer = printerService.getPrinterForType('receipt');
    expect(typeof printer).toBe('string');
  });
});

describe('PDF Service', () => {
  beforeAll(async () => {
    await pdfService.init();
  });

  test('should generate invoice PDF', async () => {
    const data = {
      invoiceNumber: 'TEST-001',
      tanggal: '24/01/2026',
      sales: 'Test User',
      items: [
        { kode: 'A001', nama: 'Test Item', jumlah: 1, totalHarga: 100000 }
      ],
      totalHarga: 100000
    };

    const pdfPath = await pdfService.generateInvoicePDF(data);
    expect(pdfPath).toBeTruthy();
    
    // Cleanup
    await fs.unlink(pdfPath);
  });

  afterAll(async () => {
    await pdfService.cleanup();
  });
});
```

#### 6.2 Load Testing (`tests/load.test.js`)
```javascript
const autocannon = require('autocannon');

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000/api/print/receipt',
    connections: 10,
    duration: 30,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [{ kode: 'A001', nama: 'Test', totalHarga: 50000 }],
      totalHarga: 50000,
      sales: 'Test',
      tanggal: '24/01/2026'
    })
  });

  console.log(result);
}

runLoadTest();
```

---

### TAHAP 7: Deployment & Documentation

#### 7.1 Windows Service Setup (`install-service.js`)
```javascript
const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'Melati Print Service',
  description: 'Automated printing service for Melati App',
  script: require('path').join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('Service installed successfully!');
  svc.start();
});

// Install the service
svc.install();
```

#### 7.2 Installer Script (`install.bat`)
```batch
@echo off
echo Installing Melati Print Service...

cd /d %~dp0

echo Installing dependencies...
call npm install

echo Installing Windows service...
node install-service.js

echo.
echo Installation complete!
echo Service will auto-start on Windows boot.
pause
```

#### 7.3 User Documentation (`docs/PRINT_SERVICE_USER_GUIDE.md`)
```markdown
# Panduan Penggunaan Print Service

## Instalasi

1. Download folder `printing-service`
2. Jalankan `install.bat` sebagai Administrator
3. Tunggu hingga instalasi selesai
4. Service akan otomatis berjalan

## Konfigurasi Printer

1. Buka `http://localhost:3000/settings.html`
2. Pilih printer untuk Receipt dan Invoice
3. Klik Save

## Troubleshooting

### Service tidak jalan
- Buka Services (Win+R → services.msc)
- Cari "Melati Print Service"
- Klik Start

### Printer tidak muncul
- Pastikan printer sudah terinstall di Windows
- Restart service

### Print gagal
- Cek printer online/offline
- Cek kertas printer
- Lihat log di `printing-service/logs/error.log`
```

---

## 🧪 Testing & Deployment

### Testing Checklist

#### Unit Testing
- [ ] Test printer listing
- [ ] Test ESC/POS command generation
- [ ] Test PDF generation
- [ ] Test printer configuration

#### Integration Testing
- [ ] Test receipt printing end-to-end
- [ ] Test invoice printing end-to-end
- [ ] Test fallback mechanism
- [ ] Test service status check

#### Load Testing
- [ ] 50 concurrent print jobs
- [ ] 100 sequential prints
- [ ] Memory leak check
- [ ] Response time < 2 sec

#### User Acceptance Testing
- [ ] Receipt terbaca jelas
- [ ] Invoice format sesuai
- [ ] Ukuran kertas konsisten
- [ ] Tidak ada popup dialog
- [ ] Auto-select printer benar

### Deployment Steps

1. **Development**
   - Setup local environment
   - Implement all features
   - Unit testing

2. **Staging**
   - Deploy ke test PC
   - Integration testing
   - User training

3. **Production**
   - Backup existing system
   - Install service
   - Configure printers
   - Monitor for 1 week

4. **Rollback Plan**
   - Keep old window.print() as fallback
   - Can disable service anytime
   - Data not affected

---

## 📈 Maintenance & Monitoring

### Monitoring

#### Logs to Monitor
- Print success rate
- Response time
- Error types
- Printer status

#### Metrics Dashboard (Future)
```
- Prints today: 150
- Success rate: 99.2%
- Avg response time: 1.2s
- Thermal printer: Online
- Inkjet printer: Online
```

### Maintenance Tasks

#### Daily
- Check service status
- Review error logs

#### Weekly
- Clear temp PDF files
- Check disk space
- Update printer status

#### Monthly
- Review print statistics
- Update documentation
- Security patches

---

## 📦 Deliverables Summary

### Code Files
```
printing-service/
├── server.js
├── package.json
├── install-service.js
├── install.bat
├── controllers/
│   └── printController.js
├── services/
│   ├── printerService.js
│   ├── pdfService.js
│   └── escposService.js
├── templates/
│   ├── receipt.html
│   └── invoice.html
├── config/
│   └── printers.json
└── utils/
    └── logger.js

melati-app/js/services/
└── print-service.js
```

### Documentation
- [x] Rencana implementasi (file ini)
- [ ] User guide
- [ ] Developer guide
- [ ] API documentation
- [ ] Troubleshooting guide

### Tests
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] Load tests
- [ ] UAT checklist

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service crash | High | Auto-restart, fallback to browser |
| Printer offline | Medium | Status check, error message clear |
| PDF generation slow | Low | Optimize template, cache |
| Port 3000 conflict | Low | Configurable port |
| Windows update breaks service | Medium | Service monitoring, quick reinstall |

---

## 💰 Cost Estimate

### Development Time
- Setup & Receipt: 5-7 hari
- Invoice & PDF: 3-4 hari
- Frontend integration: 2-3 hari
- Testing & docs: 3-4 hari
- **Total: 13-18 hari kerja**

### Infrastructure
- No additional hardware needed
- No cloud services needed
- **Cost: Rp 0**

### Maintenance
- ~2 jam/bulan monitoring
- ~4 jam/tahun updates

---

## ✅ Success Metrics

### Functional
- ✅ Zero manual printer selection
- ✅ 100% consistent layout
- ✅ < 2 sec print time
- ✅ 99%+ success rate

### User Experience
- ✅ No popup dialogs
- ✅ Clear error messages
- ✅ Works offline (fallback)
- ✅ Easy configuration

### Technical
- ✅ < 100 MB memory usage
- ✅ Auto-recovery from errors
- ✅ Comprehensive logging
- ✅ Easy updates

---

## 📞 Support & Contact

**Developer:** Tim IT Melati  
**Documentation:** `docs/PRINT_SERVICE_USER_GUIDE.md`  
**Logs Location:** `printing-service/logs/`  
**Service Name:** Melati Print Service

---

**Last Updated:** 24 Januari 2026  
**Version:** 1.0  
**Status:** Ready for Implementation ✅
