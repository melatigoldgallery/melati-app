# Debug Guide: Multi-Item Invoice Printing

## Masalah

Window.print() popup masih muncul saat print invoice dengan beberapa item (multi-item).

## Debugging Steps

### 1. Cek Print Service Status

**Buka Browser Console** (F12) dan periksa pesan log saat halaman load:

```
✅ Print Service initialized
✅ Print service online
```

Jika melihat:

```
⚠️ Print service offline
```

Maka print service belum berjalan!

### 2. Start Print Service

Buka terminal di folder `printing-service`:

```powershell
cd d:\Project\melati-app\printing-service
node server.js
```

Output yang benar:

```
🖨️  Print Service Starting...
✅ Printer Service initialized
✅ Print Service running on http://localhost:3001
📡 Health check: http://localhost:3001/api/health
```

### 3. Test Multi-Item Print dengan Debugging

1. **Buka halaman** `penjualanAksesoris.html`
2. **Buat transaksi manual** dengan 2-3 item
3. **Klik Print Invoice**
4. **Perhatikan Console Log** (F12):

#### ✅ Jika Print Service Online (BERHASIL):

```
🖨️ === DEBUG: printInvoicePerItem called ===
📋 Transaction data: {items: 3, ...}
🔍 Checking print service...
  - window.printService exists: true
  - window.printService.isOnline: true
✅ Print service available, attempting to print...
📤 Sending 3 items to print service...
  └─ Item 1/3: {nama: "...", kode: "..."}
  └─ Sending invoice data: {...}
🖨️ === printInvoice called ===
  - isOnline: true
📤 Sending invoice to print service...
📥 Response status: 200 OK
📥 Response data: {success: true, jobID: "..."}
✅ Invoice sent to printer successfully!
  └─ Print result: {success: true, method: "service"}
  └─ Waiting 500ms before next print...
  └─ Item 2/3: ...
✅ All invoices sent successfully!
```

#### ❌ Jika Print Service Offline (FALLBACK):

```
🖨️ === DEBUG: printInvoicePerItem called ===
🔍 Checking print service...
  - window.printService exists: true
  - window.printService.isOnline: false
⚠️ Print service not available
🌐 Falling back to browser print...
```

#### ⚠️ Jika Service Online tapi Error:

```
✅ Print service available, attempting to print...
📤 Sending 1 items to print service...
🖨️ === printInvoice called ===
  - isOnline: true
📤 Sending invoice to print service...
❌ Print service error: TypeError: Failed to fetch
🔄 Fallback to browser print
📄 === Using fallback: window.print() ===
  └─ Print result: {success: true, method: "browser"}
⚠️ Print service returned browser method, stopping...
❌ Print service error: Error: Print service used browser fallback
🌐 Falling back to browser print...
```

## Analisis Hasil

### Skenario A: Print Service Tidak Berjalan

**Gejala:**

- `window.printService.isOnline: false`
- Langsung fallback ke browser print

**Solusi:**

1. Start print service: `node printing-service/server.js`
2. Refresh halaman
3. Coba print lagi

### Skenario B: Print Service Berjalan, tapi CORS Error

**Gejala:**

- `isOnline: true`
- Error: `Failed to fetch` atau `CORS policy`

**Solusi:**

1. Cek console di terminal print service, lihat ada error?
2. Pastikan CORS sudah dikonfigurasi untuk `http://127.0.0.1:5500`
3. Cek file `printing-service/server.js` line 14-28

### Skenario C: Print Service OK, tapi Return Method 'browser'

**Gejala:**

- `isOnline: true`
- Request sampai ke server
- Response: `{method: "browser"}`

**Solusi:**
Ini berarti print service backend mendeteksi error dan fallback ke browser.
Cek log di terminal print service untuk error detail.

### Skenario D: Printer Tidak Ditemukan

**Gejala:**

- Service online
- Error: `Printer not found` atau `No default printer`

**Solusi:**

1. Cek printer terinstall:
   ```powershell
   Get-Printer | Select-Object Name, DriverName, PortName
   ```
2. Set default printer
3. Restart print service

## Quick Checklist

- [ ] Print service berjalan (`node server.js`)
- [ ] Port 3001 tidak dipakai aplikasi lain
- [ ] Browser console menunjukkan `isOnline: true`
- [ ] Printer terinstall dan online
- [ ] Single-item invoice print berhasil (test dulu)
- [ ] Multi-item invoice masih popup? → Cek console log lengkap

## Next Steps

Setelah menjalankan debugging di atas, share hasil console log lengkap untuk analisis lebih lanjut.

### Format Report:

```
1. Print Service Status:
   - Running: [Yes/No]
   - Port: [3001]
   - Terminal Output: [paste here]

2. Browser Console (multi-item print):
   [paste full log dari 🖨️ === DEBUG sampai akhir]

3. Browser Console (single-item print):
   [paste untuk comparison]

4. Printer Status:
   [paste hasil Get-Printer]
```
