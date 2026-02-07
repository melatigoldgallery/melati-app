# 🖨️ Instalasi Print Service - Panduan Lengkap

**Melati Print Service** - Sistem auto-print untuk struk thermal (80mm) dan invoice A4 tanpa dialog printer.

---

## 📋 Persyaratan

- Windows 10/11 (64-bit)
- Node.js 16+ ([Download di sini](https://nodejs.org))
- Printer thermal (ESC/POS compatible) untuk struk
- Printer inkjet/laser untuk invoice A4
- Port 3001 harus tersedia
- Administrator access

---

## 🚀 Instalasi Cepat (3 Langkah)

### **Langkah 1: Install Node.js**

1. Download Node.js LTS dari https://nodejs.org
2. Install dengan default settings (Next → Next → Finish)
3. Restart terminal/PowerShell
4. Verifikasi:
   ```powershell
   node --version
   npm --version
   ```

### **Langkah 2: Copy & Install**

1. **Copy folder `printing-service`** ke komputer target
   - Lokasi disarankan: `C:\MelatiPrintService\`
2. **Buka PowerShell as Administrator** (klik kanan → Run as Administrator)

3. **Jalankan installer:**

   ```powershell
   cd C:\MelatiPrintService
   .\install-auto-start.bat
   ```

   Script akan otomatis:
   - Install dependencies (npm install)
   - Install Windows Service
   - Start service
   - Configure auto-start saat boot

### **Langkah 3: Konfigurasi Printer**

1. **Cek nama printer di Windows:**

   ```powershell
   Get-Printer | Select-Object Name
   ```

2. **Edit file konfigurasi:**

   ```powershell
   notepad config\printers.json
   ```

3. **Update nama printer:**

   ```json
   {
     "receipt": "EPSON TM-T20II",
     "invoice": "EPSON L3210 Series (Copy 2)"
   }
   ```

   ⚠️ **Penting:** Gunakan nama EXACT dari hasil `Get-Printer`

4. **Restart service:**
   ```powershell
   net restart MelatiPrintService
   ```

---

## ✅ Verifikasi Instalasi

### **Test 1: Health Check**

Buka browser: http://localhost:3001/api/health

**Response OK:**

```json
{
  "status": "healthy",
  "service": "Melati Print Service",
  "version": "1.0.0",
  "uptime": 123,
  "timestamp": "2026-02-07T..."
}
```

### **Test 2: Printer Detection**

```powershell
# Check status lengkap
.\check-status.bat
```

Atau buka: http://localhost:3001/api/printers

### **Test 3: Print Test**

1. Buka aplikasi Melati (penjualanAksesoris.html)
2. Cek status indicator di header (harus **HIJAU**: "Print Service: Online")
3. Buat transaksi test
4. Klik "Cetak Struk" - harus langsung print tanpa dialog
5. Klik "Cetak Invoice" - harus langsung print tanpa dialog

---

## 📦 Deploy ke Multiple PC

### **Metode 1: Copy Manual (Recommended)**

**Di PC Utama (yang sudah jalan):**

```powershell
# Copy folder printing-service ke USB/network drive
xcopy C:\MelatiPrintService E:\MelatiPrintService /E /I /Y
```

**Di PC Target:**

```powershell
# 1. Copy dari USB ke local
xcopy E:\MelatiPrintService C:\MelatiPrintService /E /I /Y

# 2. Install
cd C:\MelatiPrintService
.\install-auto-start.bat

# 3. Konfigurasi printer (sesuaikan per PC)
Get-Printer | Select-Object Name
notepad config\printers.json

# 4. Restart service
net restart MelatiPrintService
```

### **Metode 2: Network Share**

**Setup di Server:**

```powershell
# Share folder
New-SmbShare -Name "MelatiPrint" -Path "C:\MelatiPrintService" -FullAccess Everyone
```

**Di setiap PC:**

```powershell
# Copy dan install
xcopy \\SERVER\MelatiPrint C:\MelatiPrintService /E /I /Y
cd C:\MelatiPrintService
.\install-auto-start.bat
```

---

## 🛠️ Management Commands

### **Control Service**

```powershell
# Start service
net start MelatiPrintService

# Stop service
net stop MelatiPrintService

# Restart service
net restart MelatiPrintService

# Check status
sc query MelatiPrintService
```

### **Check Status Lengkap**

```powershell
# Run script checker
.\check-status.bat

# Atau manual
sc query MelatiPrintService
netstat -ano | findstr :3001
```

### **View Logs**

```powershell
# Error logs
type logs\error.log

# Combined logs
type logs\combined.log

# Real-time monitoring
Get-Content logs\combined.log -Wait
```

### **Uninstall Service**

```powershell
# Klik kanan → Run as Administrator
.\uninstall-service.bat
```

---

## 🔧 Troubleshooting

### **Problem: Service tidak start**

**Solusi 1 - Check Port Conflict:**

```powershell
# Cek apa yang pakai port 3001
netstat -ano | findstr :3001

# Jika ada, kill process
tasklist /fi "PID eq <PID>"
taskkill /PID <PID> /F
```

**Solusi 2 - Check Service Status:**

```powershell
sc query MelatiPrintService
sc config MelatiPrintService start= auto
net start MelatiPrintService
```

**Solusi 3 - Reinstall:**

```powershell
.\uninstall-service.bat
.\install-auto-start.bat
```

---

### **Problem: Printer tidak terdeteksi**

**Diagnosa:**

```powershell
# 1. Cek printer Windows
Get-Printer | Select-Object Name, DriverName, PrinterStatus

# 2. Test print dari Windows
# Buka Control Panel → Devices and Printers → Klik kanan printer → Print Test Page
```

**Solusi:**

```powershell
# 1. Update config dengan nama EXACT
notepad config\printers.json

# 2. Restart service
net restart MelatiPrintService

# 3. Verify
curl http://localhost:3001/api/printers
```

---

### **Problem: Status tetap KUNING (Fallback Mode)**

**Penyebab:**

- Service tidak running
- Port conflict
- CORS issue

**Solusi:**

```powershell
# 1. Check service
sc query MelatiPrintService

# 2. Check port
netstat -ano | findstr :3001

# 3. Test connection
Test-NetConnection -ComputerName localhost -Port 3001

# 4. Restart
net restart MelatiPrintService
```

---

### **Problem: npm install error**

**Solusi:**

```powershell
# Clear cache dan reinstall
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 📊 API Endpoints

| Method | Endpoint             | Description      |
| ------ | -------------------- | ---------------- |
| GET    | `/api/health`        | Health check     |
| GET    | `/api/printers`      | List printers    |
| POST   | `/api/print/receipt` | Print thermal    |
| POST   | `/api/print/invoice` | Print A4 invoice |
| GET    | `/api/queue/status`  | Queue statistics |
| GET    | `/api/job/:jobID`    | Check job status |

---

## 📁 Struktur Folder

```
printing-service/
├── server.js                    # Main server
├── package.json                 # Dependencies
├── install-auto-start.bat       # Auto installer ✨
├── check-status.bat             # Status checker
├── uninstall-service.bat        # Uninstaller
├── config/
│   └── printers.json            # ⚙️ Edit printer names di sini
├── controllers/
│   └── printController.js       # Request handlers
├── services/
│   ├── printQueue.js            # Queue management
│   ├── thermalPrinter.js        # ESC/POS printing
│   └── invoicePrinter.js        # PDF generation
├── templates/
│   └── invoice-template.html    # Invoice layout
├── logs/                        # 📄 Log files
│   ├── error.log
│   └── combined.log
└── temp/                        # Temporary files
```

---

## ✅ Checklist Instalasi (Per PC)

- [ ] Node.js installed (`node --version` → v16+)
- [ ] Folder copied ke `C:\MelatiPrintService\`
- [ ] Service installed (`install-auto-start.bat` dijalankan)
- [ ] Printer names configured (`config\printers.json` sudah update)
- [ ] Service running (`sc query MelatiPrintService` → RUNNING)
- [ ] Health check OK (http://localhost:3001/api/health)
- [ ] Printers detected (http://localhost:3001/api/printers)
- [ ] Test print sukses (struk + invoice)
- [ ] Auto-start verified (restart PC → service aktif otomatis)
- [ ] Web status HIJAU ("Print Service: Online")

---

## 🎯 Best Practices

1. **Standardize path:** Gunakan `C:\MelatiPrintService\` di semua PC
2. **Document config:** Catat nama printer per PC di spreadsheet
3. **Test before deploy:** Test di 1 PC dulu sebelum rollout ke semua
4. **Backup config:** Backup `config\printers.json` per PC
5. **Schedule maintenance:** Update semua PC bersamaan (misal Minggu malam)

---

## 🔄 Update Service

**Jika ada update code:**

```powershell
# 1. Stop service
net stop MelatiPrintService

# 2. Backup config
copy config\printers.json config\printers.backup.json

# 3. Copy file baru (overwrite)
xcopy E:\MelatiPrintService C:\MelatiPrintService /E /Y

# 4. Restore config
copy config\printers.backup.json config\printers.json

# 5. Reinstall dependencies (jika ada perubahan package.json)
npm install

# 6. Start service
net start MelatiPrintService
```

---

## 📞 Support & Contact

**Service Issues:**

- Check logs: `logs\error.log`
- Check status: `.\check-status.bat`
- Restart service: `net restart MelatiPrintService`

**Printer Issues:**

- Verify Windows printer: `Get-Printer`
- Test print from Windows Control Panel
- Update `config\printers.json`

**Port Issues:**

- Check: `netstat -ano | findstr :3001`
- Kill conflicting process
- Restart service

---

## 📌 Quick Reference

```powershell
# Status
.\check-status.bat

# Start/Stop
net start MelatiPrintService
net stop MelatiPrintService

# Logs
type logs\error.log

# Test
curl http://localhost:3001/api/health

# Printers
Get-Printer | Select-Object Name
notepad config\printers.json
```

---

**Version:** 1.0.0  
**Port:** 3001  
**Auto-Start:** ✅ Windows Service  
**Update:** February 2026

🎉 **Selamat! Service siap digunakan.**
