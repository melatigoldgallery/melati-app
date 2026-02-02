# Testing Multi-Print Feature

## Status Print Service

✅ **Print service sedang berjalan di http://localhost:3001**
✅ **Queue mechanism sudah diimplementasikan**
✅ **Retry logic sudah aktif (max 3 retries)**

## Perubahan yang Dilakukan

### 1. Backend (pdfService.js)

- ✅ Tambah queue mechanism untuk serialize requests
- ✅ Flag `isProcessing` mencegah concurrent PDF generation
- ✅ Request diproses satu per satu dengan queue

### 2. Frontend (penjualanAksesoris.js & dataPenjualan.js)

- ✅ Direct fetch ke print service (bypass `isOnline` flag)
- ✅ Retry logic 3x dengan exponential backoff (1s, 2s, 3s)
- ✅ Delay 1500ms antar print untuk ensure backend selesai
- ✅ User confirmation dialog sebelum fallback browser
- ✅ **Tidak ada auto window.print()** - hanya jika user pilih

### 3. Utils Enhancement

- ✅ Tambah `showConfirm()` function untuk dialog konfirmasi

## Cara Testing

### A. Test dengan Test Page (Recommended)

1. Buka: http://localhost/melati-app/test-print-service.html
2. Klik **"Check Status"** → Harus **✅ Online**
3. Klik **"Test Multi Invoice (2 items)"**
4. Lihat console log - harus muncul:
   ```
   📄 Item 1/2: Ring Gold
   ✅ Item 1 printed successfully (Job ID: ...)
   ⏳ Waiting 500ms...
   📄 Item 2/2: Necklace Silver
   ✅ Item 2 printed successfully (Job ID: ...)
   ✅ ALL 2 invoices printed successfully!
   ```

### B. Test di Halaman Aktual

#### Di penjualanAksesoris.html:

1. Buat transaksi manual dengan 2+ item
2. Klik tombol print invoice
3. Harusnya langsung print via service (no popup)

#### Di dataPenjualan.html:

1. Filter transaksi dengan >1 item
2. Klik tombol "Cetak Ulang" → Pilih "Invoice"
3. Klik "Cetak Invoice"
4. Harusnya langsung print via service (no popup)

## Expected Behavior

### ✅ Jika Print Service Online:

- Loading indicator muncul
- Console menunjukkan progress setiap item
- Delay 1500ms antar-print
- Alert sukses setelah semua selesai
- **TIDAK ADA window.print() popup**

### ⚠️ Jika Print Service Offline:

- Muncul dialog konfirmasi:
  > "Print service tidak tersedia. Gunakan browser print sebagai alternatif?"
- Jika pilih **"Ya"** → Browser print (window.print)
- Jika pilih **"Tidak"** → Batal print

## Console Log Examples

### Success (Print Service):

```
🖨️ === DEBUG: printInvoicePerItem called ===
📋 Transaction has 2 items
🔍 Attempting print service for multi-invoice...
📤 Sending 2 items to print service...
  └─ Item 1/2: Ring Gold
  └─ Sending to print service...
  └─ Response status: 200 OK
  └─ Print result: {success: true, jobID: "PDF-xxx"}
  ✅ Item 1 printed successfully (Job ID: PDF-xxx)
  └─ Waiting 1500ms before next print...
  └─ Item 2/2: Necklace Silver
  └─ Sending to print service...
  └─ Response status: 200 OK
  └─ Print result: {success: true, jobID: "PDF-yyy"}
  ✅ Item 2 printed successfully (Job ID: PDF-yyy)
✅ All 2 invoices sent successfully!
```

### Retry Scenario:

```
  └─ Item 1/2: Ring Gold
  └─ Sending to print service...
  ⚠️ Attempt 1 failed: Failed to fetch
  🔄 Retrying in 1000ms...
  └─ Response status: 200 OK
  ✅ Item 1 printed successfully
```

### Failure (Service Offline):

```
❌ Print service error: Failed to fetch
  - Error name: TypeError
  - Error message: Failed to fetch
[Dialog muncul] "Print service tidak tersedia. Gunakan browser print?"
```

## Troubleshooting

### Issue: "Failed to fetch" pada item ke-2

**Cause:** Backend masih processing request pertama
**Solution:** ✅ Sudah fixed dengan queue mechanism + delay 1500ms

### Issue: Window.print() masih muncul

**Check:**

1. Console log - apakah ada "📄 Using browser print fallback"?
2. Print service status - apakah benar-benar online?
3. Network tab - apakah request sampai ke backend?

### Issue: Print terlalu lambat

**Normal:** Dengan 2 items, waktu total ~3-4 detik

- Item 1: ~1.5s
- Delay: 1.5s
- Item 2: ~1.5s

## Backend Monitoring

Lihat log di terminal print service:

```
POST /api/print/invoice - ::1
Invoice print request: 1 items
🔄 Starting PDF generation...
✅ PDF generated: invoice_xxx.pdf
✅ PDF print job PDF-xxx sent to EPSON L3210 Series
✅ Invoice printed successfully: Job PDF-xxx
```

Jika ada queue:

```
Request queued, waiting for previous request to complete...
Processing queued request (0 remaining)...
```

## Files Modified

1. ✅ `printing-service/services/pdfService.js` - Queue mechanism
2. ✅ `js/pages/penjualanAksesoris.js` - Direct fetch + retry
3. ✅ `js/pages/dataPenjualan.js` - Direct fetch + retry + showConfirm
4. ✅ `test-print-service.html` - Testing page

## Next Steps

1. Test dengan transaksi 5+ items
2. Monitor memory usage untuk batch besar
3. Consider adding progress indicator untuk batch besar
