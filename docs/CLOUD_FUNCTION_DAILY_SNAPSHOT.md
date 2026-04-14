# Cloud Function: Daily Stock Snapshot

Dokumen ini menjelaskan integrasi server-side untuk pembuatan `dailyStockSnapshot` otomatis setiap pergantian tanggal.

## Ringkasan

- Function utama: `scheduledCreateDailySnapshot`
- Jadwal: `00:05` WITA (`Asia/Makassar`) setiap hari
- Function fallback: `ensureYesterdaySnapshotOnFirstTx`
- Koleksi target: `dailyStockSnapshot`
- Lock koleksi: `systemLocks`

Function menghitung snapshot tanggal kemarin berdasarkan:

1. Data stok saat ini di `stokAksesoris`
2. Dikurangi/ditambah transaksi setelah batas akhir hari kemarin (`stokAksesorisTransaksi`)

Dengan pendekatan ini, snapshot tidak bergantung pada user membuka halaman laporan.

## File yang ditambahkan

- `functions/index.js`
- `functions/package.json`
- `firebase.json`
- `.firebaserc`

## Cara deploy

Jalankan dari root baru:

```bash
cd melati-app-vue
cd functions
npm install
cd ..
firebase login
firebase deploy --only functions
```

## Verifikasi setelah deploy

1. Buka Firebase Console > Functions
2. Pastikan function ini aktif:
   - `scheduledCreateDailySnapshot`
   - `ensureYesterdaySnapshotOnFirstTx`
3. Buka Firestore dan cek koleksi `dailyStockSnapshot`
4. Dokumen baru akan memakai ID format `YYYY-MM-DD` dan memiliki field:
   - `date` (format `DD/MM/YYYY`)
   - `dateYmd` (format `YYYY-MM-DD`)
   - `stockData`
   - `totalItems`
   - `triggerSource`

## Catatan penting

- Query di frontend existing (`where("date", "==", "DD/MM/YYYY")`) tetap kompatibel.
- Function sudah idempotent: tidak membuat snapshot ganda untuk tanggal yang sama.
- Jika scheduler gagal sesaat, fallback Firestore trigger akan membuat snapshot saat transaksi pertama hari itu masuk.

## Opsional (disarankan)

Untuk mencegah write berlebih dari fallback trigger, tambahkan early-return window di `ensureYesterdaySnapshotOnFirstTx` agar hanya aktif di jam tertentu (mis. 00:00-03:00 WITA).
