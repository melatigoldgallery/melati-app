# Melati Print Service

Automated printing service untuk Melati App yang menangani pencetakan thermal receipt dan invoice A4 tanpa dialog printer.

## 🎯 Fitur

- ✅ **Silent Printing** - Cetak otomatis tanpa popup dialog
- ✅ **Auto-routing** - Receipt ke thermal, Invoice ke A4
- ✅ **ESC/POS Support** - Native thermal printer commands
- ✅ **PDF Generation** - Invoice A4 dengan Puppeteer
- ✅ **Windows Service** - Auto-start saat boot
- ✅ **CORS Ready** - Support GitHub Pages hosting
- ✅ **Fallback** - Web app tetap bisa pakai window.print()

## 📋 Requirements

- Windows 10/11
- Node.js 16+ ([Download](https://nodejs.org/))
- Printer thermal (80mm) untuk receipt
- Printer A4 (inkjet/laser) untuk invoice

## 🚀 Instalasi

### Cara 1: Installer Otomatis (Recommended)

1. Buka Command Prompt sebagai **Administrator**
2. Jalankan:
   ```batch
   cd d:\Project\melati-app\printing-service
   install.bat
   ```
3. Tunggu hingga selesai
4. Service otomatis running di `http://localhost:3000`

### Cara 2: Manual

```bash
# Install dependencies
npm install

# Test run (development)
npm run dev

# Install Windows Service
npm run install-service
```

## ⚙️ Konfigurasi

### 1. Update GitHub Pages URL

Edit `server.js` line 10:

```javascript
const corsOptions = {
  origin: [
    "https://YOURNAME.github.io", // ⚠️ GANTI INI!
    "http://localhost:8080",
  ],
  // ...
};
```

### 2. Konfigurasi Printer

Edit `config/printers.json`:

```json
{
  "receipt": "EPSON TM-T20II", // Nama printer thermal
  "invoice": "EPSON L3210", // Nama printer A4
  "default": "EPSON L3210"
}
```

**Cara cek nama printer:**

1. Buka Control Panel → Devices and Printers
2. Copy nama printer persis seperti yang tertera

### 3. Test Service

Buka browser: `http://localhost:3000/api/health`

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-24T10:30:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

## 📡 API Endpoints

### Health Check

```
GET /api/health
```

### List Printers

```
GET /api/printers
```

### Print Receipt

```
POST /api/print/receipt
Content-Type: application/json

{
  "items": [...],
  "totalHarga": 500000,
  "jumlahBayar": 500000,
  "kembalian": 0,
  "sales": "Budi",
  "tanggal": "24/01/2026",
  "metodeBayar": "tunai"
}
```

### Print Invoice

```
POST /api/print/invoice
Content-Type: application/json

{
  "items": [...],
  "totalHarga": 500000,
  "invoiceNumber": "INV-001",
  "tanggal": "24/01/2026",
  "sales": "Budi"
}
```

## 🔧 Troubleshooting

### Service tidak bisa start

**Solusi:**

1. Buka Services (Win+R → `services.msc`)
2. Cari "Melati Print Service"
3. Klik Start
4. Jika error, cek logs: `logs/error.log`

### Port 3000 sudah dipakai

**Solusi:**

1. Edit `server.js` line 6:
   ```javascript
   const PORT = process.env.PORT || 3001; // Ganti ke 3001
   ```
2. Restart service

### Printer tidak ditemukan

**Solusi:**

1. Pastikan printer online
2. Cek nama printer di Control Panel
3. Update `config/printers.json`
4. Restart service

### CORS Error dari web app

**Solusi:**

1. Update `server.js` corsOptions
2. Tambahkan URL GitHub Pages Anda
3. Restart service

## 📝 Logs

Logs tersimpan di folder `logs/`:

- `error.log` - Error saja
- `combined.log` - Semua log

**Cara lihat log real-time:**

```bash
# Windows PowerShell
Get-Content logs\combined.log -Wait

# Command Prompt
type logs\combined.log
```

## 🔄 Update Service

```bash
# Stop service
net stop "Melati Print Service"

# Update code
git pull

# Install dependencies
npm install

# Start service
net start "Melati Print Service"
```

## 🗑️ Uninstall

```bash
# Stop service
net stop "Melati Print Service"

# Uninstall
sc delete "Melati Print Service"

# Delete folder
cd ..
rmdir /s printing-service
```

## 📞 Support

- Logs: `printing-service/logs/`
- Config: `printing-service/config/printers.json`
- Documentation: `docs/FITUR_PRINT-OTOMATIS.md`

## 📄 License

MIT
