# Rencana Implementasi Bertahap: Sistem Lacak Fisik (Barcode) (Diperbarui)

Dokumen ini berisi rencana implementasi bertahap untuk fitur **Lacak Fisik (Barcode)** di Melati App, berdasarkan analisis dokumen [PRD-MANAJEMEN-BARANG.md](file:///d:/Coding/Melati/melati-app/melati-app-vue/docs/PRD-MANAJEMEN-BARANG.md), [PRD-UPDATE-INVENTORY-BARANG.md](file:///d:/Coding/Melati/melati-app/melati-app-vue/docs/PRD-UPDATE-INVENTORY-BARANG.md), serta optimasi performa dan biaya Firestore melalui **Cloud Functions**.

---

## 1. Desain Optimasi Biaya Firestore (Reads & Writes)

Untuk menjaga agar penggunaan biaya Firestore (baca, tulis, dan hapus) tetap efisien dan tidak melonjak drastis saat operasional harian berjalan, kita mengadopsi prinsip arsitektur berikut:

1. **Centralized Processing via Cloud Functions:**
   - Semua operasi tulis intensif seperti mutasi barang, persetujuan antrian, dan distribusi awal didelegasikan ke **Cloud Functions** menggunakan transaksi Firestore (`db.runTransaction()`).
   - Keuntungan: Menghindari *round-trip* jaringan dari browser client untuk melakukan pengecekan satu per satu, sehingga meminimalkan kegagalan tulis akibat koneksi tidak stabil dan mencegah pembengkakan biaya baca berlebih karena validasi dilakukan langsung di server.
2. **Bulk Read menggunakan `db.getAll()`:**
   - Saat staff memindai puluhan barcode di halaman web, sistem tidak akan menembak Firestore satu per satu (`doc.get()`). 
   - Pengecekan status sekelompok barcode dilakukan melalui satu pemanggilan Cloud Function `checkBarcodesStatus` yang mengeksekusi metode API server-side `db.getAll(...)` untuk mengambil seluruh dokumen sekaligus dalam satu langkah efisien.
3. **Query Static di Halaman Web:**
   - Halaman **Antrian Mutasi** dan **Log Mutasi** bersifat statis (tidak menggunakan `onSnapshot` real-time listener). Data hanya di-query saat halaman dibuka atau saat tombol *Refresh* ditekan secara manual.
4. **Auto-Cleanup Sesi Stock Opname:**
   - Dokumen sesi progress stock opname parsial (`barcodeStockOpnameSession`) akan dihapus secara otomatis dari Firestore saat proses closing harian dinyatakan sukses (`selisih = 0`), sehingga menghemat ruang penyimpanan.

---

## 2. Arsitektur Data & Model Database (Firestore)

### A. Collection: `floors/{floorId}/barcodes`
Menyimpan lokasi terkini dan status dari setiap barcode aktif.
```json
{
  "barcode": "C230001",           // String, Key/ID Dokumen
  "category": "CINCIN",           // String (CINCIN, KALUNG, dll. untuk sinkronisasi agregat)
  "detailType": "KUNING",         // String (Sub-tipe seperti KUNING/BIRU/KA, null jika tipe simple)
  "location": "brankas",          // String (posting, admin, brankas, barang-display, mutasi, dll.)
  "in_display": false,            // Boolean (jika true, tracking individu berhenti)
  "in_mutasi": false,             // Boolean (jika true, tracking individu berhenti)
  "createdAt": "Timestamp",
  "lastUpdated": "Timestamp"
}
```

### B. Collection: `floors/{floorId}/barcodeMoveRequests`
Menyimpan antrian pengajuan mutasi dari staff non-input/non-supervisor.
```json
{
  "id": "req_1234567890",         // String, Auto-ID
  "pemindah": "Budi Staff",        // String (diambil dari dropdown staff)
  "origin": "admin",              // String (Lokasi asal)
  "destination": "brankas",       // String (Lokasi tujuan)
  "barcodes": [                   // Array of Objects
    {
      "barcode": "C230001",
      "category": "CINCIN",
      "detailType": "KUNING"
    }
  ],
  "status": "pending",            // String (pending, approved, rejected)
  "notes": "",                    // String (alasan penolakan jika status = rejected)
  "createdAt": "Timestamp",
  "processedAt": null,            // Timestamp (waktu disetujui/ditolak)
  "processedBy": ""               // String (Nama supervisor/input yang memproses)
}
```

### C. Collection: `floors/{floorId}/barcodeMutationLogs`
Menyimpan riwayat lengkap mutasi setiap barcode.
```json
{
  "id": "log_987654321",          // String, Auto-ID
  "barcode": "C230001",           // String (Indexed)
  "category": "CINCIN",           // String
  "origin": "admin",              // String
  "destination": "brankas",       // String
  "pemindah": "Budi Staff",        // String
  "status": "approved",           // String (approved atau rejected)
  "notes": "",                    // String (catatan alasan penolakan jika ada)
  "timestamp": "Timestamp"        // Timestamp
}
```

### D. Collection: `floors/{floorId}/barcodeStockOpnameSession`
Menyimpan sesi aktif stock opname parsial yang sedang berjalan agar progress scan tersimpan.
```json
{
  "location": "brankas",          // String, ID Dokumen (satu sesi aktif per lokasi)
  "status": "in_progress",        // String (in_progress, completed)
  "scannedBarcodes": [            // Array of Strings (barcode yang berhasil di-scan fisik)
    "C230001", "C230002"
  ],
  "startedAt": "Timestamp",
  "lastUpdated": "Timestamp"
}
```

---

## 3. Alur Mutasi Barang & Sinkronisasi Agregat

```mermaid
graph TD
    A[Scan/Input Barcode di Modal Update] --> B[Kirim ke Cloud Function: checkBarcodesStatus]
    B --> C{Apakah Validasi Lokasi Asal Cocok?}
    C -- Salah -- > D[Tampilkan Pesan Error di UI]
    C -- Benar --> E{Role User?}
    
    E -- Supervisor / Input --> F[Kirim ke Cloud Function: executeBarcodeMutation]
    E -- Staff Lain --> G[Kirim ke Cloud Function: submitBarcodeMoveRequest]
    
    F --> H[Mulai Transaksi Firestore]
    H --> I[Update Lokasi Barcode & Flag Stop jika Display/Mutasi]
    I --> J[Kurangi Stok Agregat Asal]
    I --> K[Tambah Stok Agregat Tujuan]
    I --> L[Tulis barcodeMutationLogs]
    L --> M[Transaksi Selesai & Berhasil]
    
    G --> N[Simpan Request pending di barcodeMoveRequests]
```

### Aturan Bisnis Logic Kunci:
1. **Validasi Asal:** Sebelum mengajukan mutasi atau melakukan mutasi langsung, Cloud Function memverifikasi lokasi asal barcode. Jika ada ketidakcocokan, transaksi dibatalkan (rollback) sehingga aman dari manipulasi data.
2. **Pemberhentian Pelacakan (Display & Mutasi):**
   - Jika barcode dipindahkan ke lokasi **Display** (`barang-display`) atau lokasi **Mutasi** (`mutasi`), tracking individu dihentikan secara permanen.
   - Barcode ditandai `in_display: true` atau `in_mutasi: true`.
   - Barcode yang berada di lokasi Display atau Mutasi **tidak dapat dipindahkan** lagi ke lokasi lain dalam sistem pelacakan ini.
   - Riwayat timeline per barcode berhenti pada mutasi masuk ke salah satu dari dua lokasi ini, dan UI menampilkan indikator penutupan tracking.
3. **Nama Pemindah Dropdown:** Diambil secara dinamis dari staff aktif (`salesStaff`) lantai bersangkutan.

---

## 4. Rencana Tahap Implementasi (Phased Plan)

### Tahap 1: Implementasi Cloud Functions (Fase Efisiensi & Keamanan)
Fokus pada penulisan logika server-side di `functions/index.js` (region `asia-southeast2`).

- [ ] Menulis Cloud Function **`checkBarcodesStatus`**:
  - Menerima `barcodes` (array string) dan `floorId`.
  - Mengambil dokumen menggunakan `db.getAll()` untuk efisiensi pembacaan.
  - Mengembalikan daftar status barcode (apakah terdaftar, lokasi sekarang, status display/mutasi).
- [ ] Menulis Cloud Function **`executeBarcodeMutation`**:
  - Berjalan dalam transaksi Firestore (`db.runTransaction()`).
  - Memverifikasi status barcode.
  - Memutakhirkan lokasi barcode ke lokasi tujuan (serta menyetel flag `in_display` atau `in_mutasi` jika tujuannya adalah `barang-display` atau `mutasi`).
  - Mengurangi dan menambah stok agregat yang relevan di collection `/stocks`.
  - Membuat entri logs di `barcodeMutationLogs` dan `dailyStockLogs`.
- [ ] Menulis Cloud Function **`submitBarcodeMoveRequest`**:
  - Menyimpan request mutasi pending ke `barcodeMoveRequests`.
- [ ] Menulis Cloud Function **`processBarcodeMoveRequest`**:
  - Berjalan dalam transaksi Firestore untuk menyetujui (Approve) atau menolak (Reject) request mutasi secara bulk.

---

### Tahap 2: Pembuatan Barcode Service Frontend
Fokus pada integrasi pemanggilan Cloud Functions di aplikasi Vue 3.

- [ ] Membuat file `src/services/barcode-service.js`.
- [ ] Implementasi integrasi `httpsCallable` untuk fungsi-fungsi Cloud Functions yang telah dibuat di Tahap 1.
- [ ] Menambahkan helper untuk mem-parsing barcode dari input teks bebas (paste bulk) menggunakan ekspresi reguler (Regex).

---

### Tahap 3: Integrasi UI Modal Update (Tabel Stok Agregat)
Fokus pada penyediaan fitur scan barcode langsung dari tabel Stok Agregat utama.

- [ ] Memodifikasi `ManajemenStokView.vue` agar modal update (`simpleUpdateModal`, `typedUpdateModal`, `halaUpdateModal`) mendukung pilihan input: **"Update Manual (Jumlah)"** dan **"Update Barcode (Lacak Fisik)"**.
- [ ] Implementasi area pemindaian barcode di modal:
  - Mode satuan (scan/ketik) dan mode bulk (paste teks).
  - Validasi instan status barcode via `checkBarcodesStatus` saat scan selesai.
  - Dropdown staff pemindah dan pilihan lokasi tujuan.
- [ ] Implementasi tombol submit:
  - Memanggil `executeBarcodeMutation` jika role user adalah `supervisor`/`input`.
  - Memanggil `submitBarcodeMoveRequest` jika user memiliki role staff biasa.

---

### Tahap 4: Halaman Lacak Fisik (Antrian & Log Mutasi)
Fokus pada halaman pengawasan terpusat yang hemat biaya baca.

- [ ] Memodifikasi `ManajemenStokView.vue` untuk membagi tampilan utama halaman menggunakan tab top-level:
  - Tab 1: **Stok Agregat** (Tabel agregat yang sudah ada).
  - Tab 2: **Lacak Fisik (Barcode)**.
- [ ] Di bawah tab **Lacak Fisik**, buat sub-tab navigasi:
  - **Antrian Mutasi** (default aktif): Memanggil komponen [MovementQueue.vue](file:///d:/Coding/Melati/melati-app/melati-app-vue/src/components/inventory/MovementQueue.vue) secara global tanpa filter kategori.
  - **Log Mutasi**: Memanggil komponen [MutationLog.vue](file:///d:/Coding/Melati/melati-app/melati-app-vue/src/components/inventory/MutationLog.vue) secara global.
- [ ] **MovementQueue Component:**
  - Menampilkan daftar request pending menggunakan query statis.
  - Tombol Approve dan Reject memicu Cloud Function `processBarcodeMoveRequest`.
- [ ] **MutationLog Component:**
  - **Mode Cari Barcode:** Input satu barcode spesifik untuk menampilkan perjalanan mutasinya. Jika barcode berakhir di lokasi Display atau Mutasi, tampilkan visualisasi timeline berakhir yang jelas dengan indikator khusus.

---

### Tahap 5: Penutupan Harian (Closing) 2-Tahap & Stock Opname
Fokus pada audit fisik harian dan stock opname parsial.

- [ ] Membuat komponen `ClosingTwoPhase.vue` untuk mengelola proses closing harian.
- [ ] **Tahap 1 (Fast Count):**
  - Form input jumlah fisik per lokasi.
  - Tampilkan perbandingan selisih stok. Jika klop, simpan status closing dan hapus sesi stock opname aktif.
- [ ] **Tahap 2 (Stock Opname Parsial):**
  - Form scan barcode fisik satu-per-satu di lokasi yang bermasalah.
  - Progress disimpan ke Firestore (`barcodeStockOpnameSession`) agar kemajuan scan aman jika halaman tidak sengaja di-refresh atau staff berganti perangkat.
  - Selesai opname, bandingkan data scan vs data sistem untuk melacak **Ghost Codes** dan **Orphan Codes**.

---

## 5. Rencana Pengujian (Verification Plan)

### A. Pengujian Efisiensi & Performa Cloud Functions
1. Lakukan pemindaian 15 barcode sekaligus dalam modal Update.
2. Periksa melalui tab Network di browser, pastikan hanya ada **1 kali panggilan API** ke Cloud Function `checkBarcodesStatus`.
3. Jalankan mutasi bulk oleh akun supervisor dan verifikasi waktu respon di bawah 2 detik untuk pemrosesan transaksional lengkap.

### B. Pengujian Batas Sistem (Display & Mutasi)
1. Pindahkan sebuah barcode ke lokasi `barang-display` atau lokasi `mutasi`.
2. Verifikasi status database barcode tersebut memiliki nilai `in_display = true` atau `in_mutasi = true`.
3. Coba lakukan scan kembali pada barcode tersebut untuk dipindahkan ke lokasi lain -> Pastikan Cloud Function memblokir tindakan ini dengan error yang tepat.
4. Buka riwayat timeline barcode tersebut -> Pastikan timeline berakhir di lokasi tersebut dengan keterangan "Tracking Berhenti (Masuk Display / Mutasi)".
