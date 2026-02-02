# 📦 Deployment Guide - Multiple PC

Panduan lengkap untuk deploy Melati Print Service ke beberapa PC/workstation.

---

## 🚀 Quick Start (Per PC)

### Opsi 1: Auto Installer (Recommended)

**1. Copy folder `printing-service` ke PC target**

**2. Jalankan installer (as Administrator):**

```
Klik kanan: install-auto-start.bat → Run as administrator
```

**3. Done!** Service akan auto-start setiap kali Windows boot.

---

### Opsi 2: Manual Installation

**1. Install Node.js**

- Download: https://nodejs.org (LTS version)
- Install dengan default settings

**2. Copy folder `printing-service`**

- Copy ke: `C:\MelatiPrintService\` (atau lokasi lain)

**3. Install dependencies**

```bash
cd C:\MelatiPrintService
npm install
```

**4. Konfigurasi printer**

```bash
# Cek nama printer
Get-Printer | Select-Object Name

# Edit config/printers.json
notepad config\printers.json
```

**5. Install Windows Service**

```bash
# Klik kanan CMD/PowerShell → Run as administrator
npm install -g node-windows
npm run install-service
```

**6. Verify**

```bash
# Check status
net start MelatiPrintService

# Test endpoint
http://localhost:3001/api/health
```

---

## 📋 Pre-Deployment Checklist

### Requirements per PC:

- [ ] Windows 10/11 (64-bit)
- [ ] Node.js 16+ installed
- [ ] Printer terinstall dan configured di Windows
- [ ] Port 3001 available (tidak dipakai aplikasi lain)
- [ ] Administrator access untuk install service

---

## 🔧 Konfigurasi per PC

### 1. Update Printer Names

Edit `config/printers.json` di setiap PC:

```json
{
  "receipt": "EPSON TM-T20II",
  "invoice": "EPSON L3210 Series"
}
```

**Cara cek nama printer:**

```powershell
Get-Printer | Select-Object Name
```

### 2. Update Port (Optional)

Jika port 3001 conflict, edit `server.js`:

```javascript
const PORT = process.env.PORT || 3001; // Ganti ke port lain
```

**Jangan lupa update frontend:**

```javascript
// js/services/print-service.js
return "http://localhost:3001/api"; // Ganti ke port yang sama
```

---

## 🏢 Deployment Strategy

### Strategi 1: Central GitHub Repository

**Setup:**

1. Push `printing-service/` ke GitHub private repo
2. Di setiap PC, clone repo:
   ```bash
   git clone https://github.com/yourusername/melati-print-service.git
   cd melati-print-service
   install-auto-start.bat
   ```

**Update:**

```bash
git pull
npm install
net restart MelatiPrintService
```

---

### Strategi 2: Network Share

**Setup:**

1. Share folder di server: `\\SERVER\MelatiPrintService`
2. Di setiap PC:

   ```bash
   # Copy dari network
   xcopy \\SERVER\MelatiPrintService C:\MelatiPrintService /E /I /Y

   # Install
   cd C:\MelatiPrintService
   install-auto-start.bat
   ```

**Update:**

```bash
# Stop service
net stop MelatiPrintService

# Update files
xcopy \\SERVER\MelatiPrintService C:\MelatiPrintService /E /I /Y

# Start service
net start MelatiPrintService
```

---

### Strategi 3: USB/Flash Drive

**Setup:**

1. Copy folder `printing-service` ke USB
2. Di setiap PC:

   ```bash
   # Copy ke local
   xcopy E:\printing-service C:\MelatiPrintService /E /I /Y

   # Install
   cd C:\MelatiPrintService
   install-auto-start.bat
   ```

---

## 🛠️ Management Commands

### Check Service Status

```bash
# Run check-status.bat
check-status.bat

# Atau manual
sc query MelatiPrintService
netstat -ano | findstr :3001
```

### Control Service

```bash
# Start
net start MelatiPrintService

# Stop
net stop MelatiPrintService

# Restart
net stop MelatiPrintService && net start MelatiPrintService

# Check logs
type logs\combined.log
```

### Uninstall Service

```bash
# Run as Administrator
uninstall-service.bat

# Atau manual
npm run uninstall-service
```

---

## 🔍 Troubleshooting

### Service tidak start otomatis

**Check:**

```bash
sc query MelatiPrintService
```

**Fix:**

```bash
sc config MelatiPrintService start= auto
net start MelatiPrintService
```

---

### Port conflict

**Find process:**

```bash
netstat -ano | findstr :3001
tasklist /fi "PID eq <PID>"
```

**Kill process:**

```bash
taskkill /PID <PID> /F
```

**Or change port in server.js**

---

### Printer tidak terdeteksi

**Check Windows printers:**

```powershell
Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus
```

**Update config/printers.json dengan nama exact**

**Restart service:**

```bash
net restart MelatiPrintService
```

---

### npm install error

**Clear cache:**

```bash
npm cache clean --force
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## 📊 Monitoring Multiple PCs

### Centralized Logging (Optional)

Edit `server.js` untuk log ke network location:

```javascript
const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: "\\\\SERVER\\Logs\\melati-print-" + require("os").hostname() + ".log",
    }),
  ],
});
```

---

### Health Check Dashboard (Optional)

Buat simple HTML dashboard:

```html
<!-- health-dashboard.html -->
<script>
  const PCs = [
    { name: "Kasir 1", ip: "192.168.1.101" },
    { name: "Kasir 2", ip: "192.168.1.102" },
    { name: "Kasir 3", ip: "192.168.1.103" },
  ];

  PCs.forEach((pc) => {
    fetch(`http://${pc.ip}:3001/api/health`)
      .then((r) => r.json())
      .then((data) => console.log(`${pc.name}: ✅ Online`))
      .catch((err) => console.log(`${pc.name}: ❌ Offline`));
  });
</script>
```

---

## 🎯 Best Practices

1. **Standardize installation path**
   - Use: `C:\MelatiPrintService\` di semua PC
   - Easier untuk maintenance dan troubleshooting

2. **Document printer names**
   - Buat spreadsheet: PC Name → Receipt Printer → Invoice Printer
   - Update saat ada perubahan hardware

3. **Test before deploy**
   - Test di 1 PC dulu
   - Verify receipt & invoice printing
   - Baru deploy ke PC lainnya

4. **Backup configuration**
   - Backup `config/printers.json` per PC
   - Simpan di network share atau Git

5. **Schedule updates**
   - Update semua PC bersamaan (misal: setiap Minggu malam)
   - Test di 1 PC dulu sebelum rollout ke semua

---

## 📞 Support

**Common issues:**

- Service won't start → Check logs in `logs/error.log`
- Printer not found → Verify `config/printers.json`
- Port conflict → Change port or kill conflicting process

**Contact:** Melati IT Team

---

## ✅ Deployment Checklist

Per PC:

- [ ] Node.js installed (check: `node --version`)
- [ ] Folder copied to `C:\MelatiPrintService\`
- [ ] Dependencies installed (`npm install`)
- [ ] Printer names configured (`config/printers.json`)
- [ ] Service installed (`install-auto-start.bat`)
- [ ] Service running (`net start MelatiPrintService`)
- [ ] Health check OK (`http://localhost:3001/api/health`)
- [ ] Test print successful (receipt + invoice)
- [ ] Auto-start verified (reboot PC → check service)

Done! 🎉
