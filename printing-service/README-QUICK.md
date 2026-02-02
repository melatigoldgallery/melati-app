# 🖨️ Melati Print Service

Auto-print service untuk thermal receipt (80mm) dan invoice A4 tanpa dialog printer.

---

## 🚀 Quick Start (Per PC)

### 1️⃣ Install

**Klik kanan → Run as Administrator:**

```
install-auto-start.bat
```

✅ Service akan auto-start setiap Windows boot!

### 2️⃣ Konfigurasi Printer

Edit `config/printers.json`:

```json
{
  "receipt": "EPSON TM-T20II",
  "invoice": "EPSON L3210 Series"
}
```

**Cek nama printer:**

```powershell
Get-Printer | Select-Object Name
```

### 3️⃣ Test

Browser: http://localhost:3001/api/health

```json
{ "status": "ok", "timestamp": "...", "uptime": 123 }
```

✅ **Done!** Service siap dipakai.

---

## 📋 Management Commands

```bash
# Check status
check-status.bat

# Start/Stop service
net start MelatiPrintService
net stop MelatiPrintService

# Uninstall
uninstall-service.bat
```

---

## 📦 Deploy ke Multiple PC

1. Copy folder `printing-service` ke PC target
2. Run `install-auto-start.bat` (as Administrator)
3. Update `config/printers.json` per PC
4. Done!

**Detail lengkap:** Lihat [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🔌 API Endpoints

| Endpoint             | Method | Description           |
| -------------------- | ------ | --------------------- |
| `/api/health`        | GET    | Health check          |
| `/api/printers`      | GET    | List printers         |
| `/api/print/receipt` | POST   | Print thermal receipt |
| `/api/print/invoice` | POST   | Print A4 invoice      |

---

## 📱 Frontend Integration

```javascript
// Load script
<script src="js/services/print-service.js"></script>

// Print receipt
await window.printService.printReceipt({
  items: [...],
  total: 15000000,
  payment: { method: 'Cash', received: 15000000 }
});

// Print invoice
await window.printService.printInvoice({
  invoiceNumber: 'INV-001',
  customer: { name: '...', phone: '...' },
  items: [...]
});
```

**Fallback:** Otomatis pakai `window.print()` jika service offline.

---

## ⚙️ Requirements

- Windows 10/11 (64-bit)
- Node.js 16+
- Thermal printer (ESC/POS compatible)
- Inkjet/Laser printer (untuk invoice A4)

---

## 🔍 Troubleshooting

### Service tidak start

```bash
# Check port conflict
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F

# Restart
net start MelatiPrintService
```

### Printer tidak terdeteksi

```powershell
# List printers
Get-Printer | Select-Object Name

# Update config
notepad config\printers.json

# Restart service
net restart MelatiPrintService
```

### CORS error

- Jangan buka dari `file://`
- Gunakan Live Server VSCode
- Atau http-server: `npm install -g http-server; http-server`

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Instalasi detail & troubleshooting
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy ke multiple PC
- **[README.md](README.md)** - Quick reference (this file)

---

## ✨ Features

✅ Silent printing (no dialog)  
✅ ESC/POS thermal receipt  
✅ PDF invoice generation  
✅ Auto-detect service availability  
✅ Fallback to browser print  
✅ Windows Service auto-start  
✅ CORS support for GitHub Pages

---

## 🎯 Production Checklist

- [ ] Node.js installed
- [ ] Service auto-installed
- [ ] Printer configured
- [ ] Health check OK
- [ ] Test print successful
- [ ] Auto-start verified (reboot test)

---

**Version:** 1.0.0  
**Port:** 3001  
**License:** MIT
