# 🖨️ Setup Print Service - Melati App

## Instalasi

### 1. Install Node.js

- Download dan install Node.js versi 16 atau lebih baru dari https://nodejs.org
- Verifikasi instalasi:

```bash
node --version
npm --version
```

### 2. Install Dependencies

Buka terminal di folder `printing-service` dan jalankan:

```bash
cd d:\Project\melati-app\printing-service
npm install
```

### 3. Konfigurasi Printer

Edit file `config/printers.json` sesuai nama printer Anda:

```json
{
  "receipt": "EPSON TM-T20II",
  "invoice": "EPSON L3210"
}
```

**Cara mengetahui nama printer:**

```powershell
Get-Printer | Select-Object Name
```

## Menjalankan Service

⚠️ **Service menggunakan port 3001**

### Opsi 1: Manual (Testing)

```bash
cd d:\Project\melati-app\printing-service
node server.js
```

### Opsi 2: Auto-Start on Boot (Production - RECOMMENDED)

**Quick Install (1-Click):**

```bash
# Klik kanan → Run as Administrator
install-auto-start.bat
```

Script akan otomatis:

- Install dependencies
- Install Windows Service atau Task Scheduler
- Start service
- Configure auto-start saat boot

**Manual Install:**

```bash
# Install node-windows
npm install -g node-windows

# Install service
npm run install-service

# Start service
net start MelatiPrintService
```

### Opsi 3: Dengan Auto-Restart (Development)

```bash
npm install -g nodemon
npm run dev
```

## Testing

### Test dengan Browser

1. Buka `http://localhost:3001/api/health` - Cek service status
2. Buka test page dengan Live Server VSCode (klik kanan test-print.html → Open with Live Server)

### Test dengan PowerShell

```powershell
# Check health
Invoke-WebRequest http://localhost:3001/api/health

# List printers
Invoke-WebRequest http://localhost:3001/api/printers

# Check service status
.\check-status.bat
```

## Troubleshooting

### Service tidak bisa start

- Pastikan port 3001 tidak digunakan aplikasi lain
- Check dengan: `netstat -ano | findstr :3001`
- Kill process: Jalankan `check-status.bat` atau manual: `taskkill /PID <PID> /F`

### Printer tidak terdeteksi

- Pastikan printer sudah terinstall di Windows
- Cek dengan: `Get-Printer | Select-Object Name`
- Update `config/printers.json` dengan nama yang benar

### CORS Error dari GitHub Pages

- Pastikan service berjalan di localhost:3001
- CORS sudah dikonfigurasi untuk `melatigoldgallery.github.io`
- Jika domain berbeda, edit `server.js` bagian CORS
- Gunakan Live Server VSCode untuk local testing (bukan file://)

### npm install gagal

- Hapus folder `node_modules` dan file `package-lock.json`
- Jalankan `npm install` lagi
- Jika masih error, gunakan `npm install --legacy-peer-deps`

## Fitur

✅ **Silent Printing** - Tanpa dialog printer
✅ **Thermal Receipt** - Format ESC/POS untuk struk 80mm
✅ **A4 Invoice** - PDF generation dengan Puppeteer
✅ **Auto-Detection** - Otomatis detect localhost atau GitHub Pages
✅ **Fallback** - Gunakan `window.print()` jika service offline
✅ **Logging** - Winston logger untuk debugging
✅ **CORS** - Support GitHub Pages deployment

## API Endpoints

| Method | Endpoint               | Description             |
| ------ | ---------------------- | ----------------------- |
| GET    | `/api/health`          | Health check            |
| GET    | `/api/printers`        | List available printers |
| POST   | `/api/printers/config` | Update printer config   |
| POST   | `/api/print/receipt`   | Print thermal receipt   |
| POST   | `/api/print/invoice`   | Print A4 invoice        |

## Struktur Project

```
printing-service/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── config/
│   └── printers.json      # Printer configuration
├── controllers/
│   └── printController.js # Request handlers
├── services/
│   ├── printerService.js  # Windows printer management
│   ├── escposService.js   # ESC/POS command generator
│   └── pdfService.js      # PDF invoice generator
├── templates/
│   └── invoice.html       # Invoice template
└── utils/
    └── logger.js          # Winston logger
```

## Deployment to Production

### Auto-Start on Windows Boot

1. Install sebagai Windows Service:

```bash
npm install -g node-windows
npm run install-service
```

2. Service akan start otomatis saat Windows boot
3. Control service:

```bash
# Start
net start MelatiPrintService

# Stop
net stop MelatiPrintService

# Restart
net stop MelatiPrintService && net start MelatiPrintService
```

### Alternative: Task Scheduler

1. Buat batch file `start-print-service.bat`:

```batch
@echo off
cd /d d:\Project\melati-app\printing-service
node server.js
```

2. Buka Task Scheduler → Create Task
3. Trigger: At startup
4. Action: Run `start-print-service.bat`

## Support

Untuk bantuan lebih lanjut, hubungi tim development Melati App.
