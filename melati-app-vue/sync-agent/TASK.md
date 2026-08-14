# Rencana Implementasi: Sinkronisasi Stok & Rekonsiliasi Selisih Multi-Lantai

Dokumen ini berisi daftar tugas (*task checklist*) untuk memandu implementasi integrasi data penjualan/void desktop ke Firestore serta modul rekonsiliasi manual di aplikasi Vue web.

Daftar tugas ini mengacu penuh pada [PRD_Stock_Sync.md](file:///d:/melatiProject/melati-app/melati-app-vue/sync-agent/PRD_Stock_Sync.md).

---

## 📋 DAFTAR UTAMA PROGRESS
- [x] **Fase 1:** Konfigurasi & Optimalisasi Sync Agent Lokal (`sync-agent-inventory.js`)
- [x] **Fase 2:** Pembuatan Cloud Functions Endpoint (`functions/index.js`)
- [x] **Fase 3:** Integrasi Frontend Core Service (`src/services/inventory-service.js`)
- [x] **Fase 4:** Pembangunan Dashboard Rekonsiliasi UI (`DiscrepancyDashboard.vue`)
- [x] **Fase 5:** Integrasi Tab Manajemen Stok (`ManajemenStokView.vue`)
- [/] **Fase 6:** Deployment Server PC M3200 & Uji Coba Lapangan

---

## 🛠️ DETAIL RINCIAN TUGAS

### FASE 1: Optimalisasi Sync Agent Lokal (`sync-agent-inventory.js`)
*Tujuan: Memperbarui skrip local daemon agar mendukung CLI argument multi-instance, pemfilteran lokal, deteksi transaksi void, dan otentikasi API key.*

- [x] **1.1 Dukungan Argumen CLI untuk Multi-Instance**
  - Ubah pembacaan target lantai menggunakan argumen CLI: `const targetFloor = (process.argv.slice(2)[0] || 'L1').toUpperCase();`.
  - Masing-masing lantai harus memetakan database (`core_dbtokomasmelatibawah` untuk L1, dan `core_dbtokomasmelatiatas` untuk L2).
  - Tentukan `STORE_ID` dinamis (`MELATI-BAWAH` / `MELATI-ATAS`).

- [x] **1.2 Penyesuaian Path Berkas Watermark**
  - Pisahkan berkas state sales: `last_sync_state_inventory_L1.json` dan `last_sync_state_inventory_L2.json`.
  - Pisahkan berkas state void: `last_sync_void_state_L1.json` dan `last_sync_void_state_L2.json`.

- [x] **1.3 Pemfilteran Prefix Barcode Emas secara Lokal**
  - Implementasikan regex penyaring barcode emas:
    ```javascript
    const GOLD_PREFIX_REGEX = /^(C|K|L|A|G|S|Z|V|B|HL|KL|BL)/i;
    ```
  - Saring baris data dari database MySQL sebelum melakukan panggilan API.

- [x] **1.4 Implementasi Zero-Payload Suppression**
  - Jika setelah difilter jumlah baris transaksi baru adalah `0`, batalkan pengiriman HTTP POST ke Cloud Functions (mencegah komputasi & logging sia-sia).

- [x] **1.5 Integrasi Pemantauan Log Pembatalan (*Transaction Void*)**
  - Tambahkan pembacaan berkala dari tabel `tblsejarahpenjualanhapus` berbasis watermark `last_sync_void_state_[targetFloor].json`.
  - Query harus bersifat non-blocking (Consistent Reads / MVCC) hanya membaca kolom primary ID log penghapusan, nomor penjualan, tanggal, kode barcode, dan admin yang membatalkan.
  - Saring barcode non-emas secara lokal sebelum mengirim.

- [x] **1.6 Header Otentikasi x-api-key**
  - Tambahkan header `x-api-key: MelatiSecretToken123` (atau sesuai konfigurasi env) pada setiap request HTTP POST Axios ke Cloud Functions.

---

### FASE 2: Pembuatan Cloud Functions Endpoint (`functions/index.js`)
*Tujuan: Membuat backend webhook HTTPS yang aman, efisien (low read/write cost), dan memiliki mekanisme validasi data.*

- [x] **2.1 Endpoint Sinkronisasi Penjualan (`syncDesktopSales`)**
  - Buat endpoint HTTPS baru menggunakan `onRequest` v2.
  - Verifikasi token `x-api-key` dari header request.
  - Terima payload berisi `store_id` (petakan ke `floorId: L1/L2`) dan daftar barcode yang terjual.
  - Gunakan `db.getAll()` untuk memuat status dokumen barcode saat ini dari Firestore secara efisien dalam satu batch (maksimal 100 barcode).
  - Terapkan perbandingan state logis:
    - **Bypass Unregistered:** Jika dokumen barcode tidak terdaftar di Firestore, abaikan (0 writes).
    - **Bypass Already Sold:** Jika status barcode di Firestore sudah `'laku'`, abaikan (0 writes).
    - **Match-Execute Mutation:** Jika status barcode saat ini `'barang-display'`, jalankan transaksi untuk:
      - Mengubah status barcode menjadi `'laku'`.
      - Mengurangi kuantitas fisik stok display pada master stok terkait.
      - Menulis berkas riwayat mutasi barcode di `barcodeMutationLogs`.
    - **Discrepancy Log Only:** Jika status barcode saat ini bukan `'barang-display'` (misal `'brankas'` atau `'admin'`), abaikan perubahan stok fisik. Buat satu dokumen laporan selisih baru di koleksi `floors/{floorId}/barcodeDiscrepancies/{discrepancyId}`.
      - ID Dokumen: `DISC_[barcode]_[desktop_item_id]`

- [x] **2.2 Endpoint Sinkronisasi Void (`syncDesktopVoid`)**
  - Buat endpoint HTTPS baru menggunakan `onRequest` v2.
  - Verifikasi token `x-api-key` dari header.
  - Ambil log mutasi terakhir barcode bersangkutan dari `barcodeMutationLogs` untuk mencari lokasi asalnya sebelum berstatus `'laku'`.
  - Kembalikan status lokasi barcode ke lokasi asalnya tersebut.
  - Naikkan kembali kuantitas fisik master stok pada lokasi asal tersebut secara transaksional.
  - Tandai status laporan discrepancy terkait (jika ada) sebagai `resolved` dengan catatan otomatis "Pembatalan Transaksi Kasir".

---

### FASE 3: Integrasi Frontend Core Service (`src/services/inventory-service.js`)
*Tujuan: Menyediakan API wrapper frontend Vue untuk membaca dan meresolusi data selisih.*

- [x] **3.1 Fungsi Fetch Data Selisih (`fetchBarcodeDiscrepancies`)**
  - Tambahkan fungsi untuk mengambil dokumen dari `floors/{floorId}/barcodeDiscrepancies` menggunakan filter `resolved === false` / `resolved === true` dan dukungan paginasi.

- [x] **3.2 Fungsi Resolusi Selisih Manual (`resolveBarcodeDiscrepancy`)**
  - Tambahkan fungsi untuk memicu penyelesaian selisih oleh supervisor.
  - Resolusi manual akan memanggil backend untuk memaksa mengubah status barcode menjadi `'laku'`, memotong stok display/brankas secara benar, dan menandai status dokumen discrepancy tersebut menjadi `resolved: true` beserta nama supervisor (`resolvedBy`) dan catatan penyelesaian (`resolutionNote`).

---

### FASE 4: Pembangunan Dashboard Rekonsiliasi UI (`DiscrepancyDashboard.vue`)
*Tujuan: Membuat antarmuka pengguna (dashboard) modern untuk melacak selisih stok dan memfasilitasi rekonsiliasi manual.*

- [x] **4.1 Desain Layout UI Premium & Responsif**
  - Buat file baru [DiscrepancyDashboard.vue](file:///d:/melatiProject/melati-app/melati-app-vue/src/components/inventory/barcode-tracking/DiscrepancyDashboard.vue).
  - Gunakan visualisasi ringkasan (Summary Cards): Jumlah total selisih aktif (unresolved), jumlah selisih hari ini, dan total selisih terselesaikan (resolved).
  - Tampilkan tabel detail selisih dengan kolom lengkap: Kode Barcode, No. Faktur Desktop, Lokasi Terdaftar Web, Nama Sales, Tanggal Penjualan Kasir, dan Tanggal Terdeteksi Selisih.

- [x] **4.2 Filter & Tab Status Selisih**
  - Sediakan tab navigasi atas: "Belum Selesai" (*Unresolved*) & "Selesai" (*Resolved*).
  - Sediakan filter pencarian instan berdasarkan nomor barcode atau nomor faktur kasir.

- [x] **4.3 Dialog/Modal Rekonsiliasi Manual**
  - Ketika tombol "Paksa Selesaikan" diklik oleh Supervisor, tampilkan modal konfirmasi.
  - Wajibkan input catatan penjelasan resolusi (misal: "Barang display terjual, tetapi lupa dimutasi dari brankas di web").

---

### FASE 5: Integrasi Tab Manajemen Stok (`ManajemenStokView.vue`)
*Tujuan: Menyematkan Dashboard Selisih ke menu manajemen utama bagi pengguna berwenang.*

- [x] **5.1 Impor & Pendaftaran Komponen**
  - Impor `DiscrepancyDashboard.vue` ke dalam [ManajemenStokView.vue](file:///d:/melatiProject/melati-app/melati-app-vue/src/views/inventory/ManajemenStokView.vue).

- [x] **5.2 Penambahan Tab Baru "Laporan Selisih"**
  - Tambahkan opsi tab baru bernama "Laporan Selisih" di antarmuka navigasi tab.
  - Terapkan pembatasan hak akses (hanya merender dashboard selisih jika user memiliki role supervisor atau administrator).

---

### FASE 6: Deployment Server PC M3200 & Uji Coba Lapangan
*Tujuan: Konfigurasi auto-start daemon, pemantauan log berkala, dan verifikasi akhir alur data.*

- [ ] **6.1 Konfigurasi Node.js & Instalasi PM2**
  - Unduh Node.js LTS di Server M3200.
  - Install PM2 secara global: `npm install pm2 -g`.

- [ ] **6.2 Pendaftaran Instance Proses PM2**
  - Jalankan proses sinkronisasi lantai 1 (bawah):
    ```bash
    pm2 start sync-agent-inventory.js --name "melati-sync-bawah" -- L1
    ```
  - Jalankan proses sinkronisasi lantai 2 (atas):
    ```bash
    pm2 start sync-agent-inventory.js --name "melati-sync-atas" -- L2
    ```

- [ ] **6.3 Pengaturan Auto-Start Komputer**
  - Daftarkan tugas pemulihan PM2 (`pm2 resurrect`) di Windows Task Scheduler saat *Startup* server agar sistem otomatis menyala setelah mati lampu / reboot.

- [ ] **6.4 Pengujian Seluruh Skenario Utama (QA Validation)**
  - [ ] **Kasus Match:** Penjualan barcode display -> Berhasil laku + stok berkurang.
  - [ ] **Kasus Mismatch:** Penjualan barcode brankas -> Status barcode tetap brankas, muncul entri discrepancy baru di web.
  - [ ] **Kasus Bypass:** Penjualan barcode tidak terdaftar Firestore -> Log diabaikan, 0 Firestore writes.
  - [ ] **Kasus Void:** Pembatalan penjualan di desktop -> Lokasi barang dikembalikan ke display, kuantitas stok bertambah kembali secara otomatis.

---

## 📊 STATUS TRACKING
*Gunakan area ini untuk mencatat log pengerjaan harian saat implementasi sedang berlangsung.*

| Tanggal | Target | Realisasi | Hambatan / Keterangan | PIC |
| :--- | :--- | :--- | :--- | :--- |
| 12-08-2026 | Fase 1-5 | Sukses Diimplementasi | Tidak ada | Antigravity |
