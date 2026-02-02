# Integration Test Guide - Penjualan Aksesoris

## What Was Changed

### 1. penjualanAksesoris.html

- ✅ Added `print-service.js` script tag before closing body
- ✅ Added print service status indicator div after page-header
- ✅ Added CSS styles for status indicator (online/offline)

### 2. js/pages/penjualanAksesoris.js

- ✅ Updated `init()` method to initialize print service and status updater
- ✅ Added `updatePrintServiceStatus()` method to show online/offline status
- ✅ Created new async `printReceipt()` that tries service first, then fallback
- ✅ Renamed old `printReceipt()` to `printReceiptBrowser()`
- ✅ Created new async `printInvoice()` that tries service first, then fallback
- ✅ Renamed old `printInvoice()` to `printInvoiceBrowser()`

## How It Works

### Print Flow (Automatic)

1. User clicks "Cetak Struk" or "Cetak Invoice"
2. System checks if print service is online
3. **If service is ONLINE:**
   - Prepare data and send to print service API
   - Print directly to thermal (EPSON TM-T20II) or A4 (EPSON L3210)
   - NO printer dialog popup
   - Show success message
4. **If service is OFFLINE:**
   - Automatically fallback to browser print
   - Open new window and show print dialog (original behavior)

### Status Indicator

- **Green "Print Service: Online"** - Auto-print enabled
- **Yellow "Print Service: Fallback Mode"** - Browser print only
- Updates every 30 seconds automatically

## Testing Steps

### Test 1: Service Online (Auto-Print)

```powershell
# 1. Start print service
cd d:\Project\melati-app\printing-service
npm start

# 2. Open penjualanAksesoris.html in browser
# 3. Check status indicator shows GREEN "Online"
# 4. Complete a transaction
# 5. Click "Cetak Struk" - should print directly to thermal printer
# 6. Click "Cetak Invoice" - should print directly to A4 printer
# 7. Verify no popup dialogs appear
```

### Test 2: Service Offline (Fallback)

```powershell
# 1. Stop print service
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force

# 2. Refresh penjualanAksesoris.html
# 3. Check status indicator shows YELLOW "Fallback Mode"
# 4. Complete a transaction
# 5. Click "Cetak Struk" - should open popup with print dialog (old behavior)
# 6. Click "Cetak Invoice" - should open popup with print dialog (old behavior)
```

### Test 3: Service Recovery

```powershell
# 1. Page is open with service offline (yellow status)
# 2. Start print service: npm start
# 3. Wait 30 seconds (auto-update interval)
# 4. Status should change to GREEN "Online"
# 5. Next print should use auto-print
```

## Data Mapping

### Receipt Data (Thermal 80mm)

```javascript
{
  storeName: "MELATI 3",
  storeAddress: "JL. DIPONEGORO NO. 116",
  transactionType: "AKSESORIS" / "MANUAL",
  date: "dd/mm/yyyy",
  sales: "Nama Sales",
  items: [
    {
      name: "Nama Barang",
      code: "R001",
      purity: "24K",
      weight: "5.5 gr",
      price: 1000000
    }
  ],
  total: 1000000,
  paymentMethod: "tunai" / "dp",
  dpAmount: 500000,  // if dp
  remainingAmount: 500000,  // if dp
  notes: "Keterangan item"
}
```

### Invoice Data (A4)

```javascript
{
  storeName: "MELATI 3",
  storeAddress: "JL. DIPONEGORO NO. 116",
  transactionType: "AKSESORIS" / "MANUAL",
  date: "dd/mm/yyyy",
  sales: "Nama Sales",
  items: [
    {
      name: "Nama Barang",
      code: "R001",
      purity: "24K",
      weight: "5.5 gr",
      price: 1000000
    }
  ],
  total: 1000000,
  paymentMethod: "tunai" / "dp",
  dpAmount: 500000,  // if dp
  remainingAmount: 500000  // if dp
}
```

## Expected Behavior

### When Service Online

- ✅ No popup windows
- ✅ No print dialogs
- ✅ Direct print to configured printers
- ✅ Success message after print
- ✅ Green status indicator

### When Service Offline

- ✅ Automatic fallback to browser print
- ✅ Popup window opens with print dialog
- ✅ User can select printer manually
- ✅ No error messages (silent fallback)
- ✅ Yellow status indicator

## Troubleshooting

### Status shows offline but service is running

```powershell
# Check service is actually listening
Test-NetConnection -ComputerName localhost -Port 3001

# Check CORS settings in server.js
# Should allow file:// and http://localhost
```

### Prints go to wrong printer

```powershell
# Edit printing-service/config/printers.json
# Update printer names to match your system
Get-Printer | Select-Object Name  # List available printers
```

### Print service fails silently

```powershell
# Check service logs
cd d:\Project\melati-app\printing-service
npm start  # Watch console for errors
```

## Files Modified

1. `penjualanAksesoris.html` - Added script tag and status div
2. `js/pages/penjualanAksesoris.js` - Added async print methods and service integration
3. `printing-service/*` - Already created in previous steps

## Next Steps

1. ✅ Integration complete
2. 🔄 Test with real transactions
3. 🔄 Deploy to multiple PCs (see DEPLOYMENT.md)
4. 🔄 Setup auto-start service (see install-auto-start.bat)

## Rollback Plan

If integration causes issues:

1. Revert penjualanAksesoris.js:
   - Remove new async `printReceipt()` and `printInvoice()`
   - Rename `printReceiptBrowser()` back to `printReceipt()`
   - Rename `printInvoiceBrowser()` back to `printInvoice()`
   - Remove `updatePrintServiceStatus()` method
   - Remove print service init code from `init()`

2. Revert penjualanAksesoris.html:
   - Remove print-service.js script tag
   - Remove printServiceStatus div
   - Remove status indicator CSS

3. System will work exactly as before (browser print only)
