Rencana Pembersihan UI Lacak Fisik (Barcode) dan Konsolidasi Alur Barcode
Rencana ini bertujuan untuk merapikan antarmuka pengguna (UI) pada bagian Lacak Fisik (Barcode) setelah integrasi alur barcode langsung ke tombol aksi Update pada tabel Stok Agregat selesai dilakukan.

User Review Required
IMPORTANT

Penyederhanaan UI Lacak Fisik:

Tab Distribusi Awal dan Request Mutasi pada menu Lacak Fisik akan dihapus sepenuhnya. Semua proses pemindaian barcode/distribusi/mutasi baru hanya dilakukan dari tombol Update di baris Stok Agregat.
Navigasi tab kategori (nonComputerCards) di atas menu Lacak Fisik juga akan dihapus. Akibatnya, halaman Antrian Mutasi dan Log Mutasi akan menampilkan data untuk semua kategori barang secara langsung (tidak lagi terfilter per kategori satu-per-satu), yang mempermudah supervisor memantau seluruh aktivitas mutasi.
Proposed Changes
[Frontend - View]
[MODIFY] 
ManajemenStokView.vue
Hapus Elemen UI Tab Kategori dan Sub-Tab yang Tidak Diperlukan:

Di dalam <template> pada section activeSystemTab === 'fisik':
Hapus elemen navigasi kategori dinamis: <ul v-if="nonComputerCards.length" class="nav nav-tabs compact ...">.
Hapus tombol nav-item Distribusi Awal dan Request Mutasi pada sub-navigasi.
Sisakan hanya sub-tab Antrian Mutasi dan Log Mutasi.
Hapus tag komponen <PhysicalDistribution> dan <MovementRequest>.
Hapus prop :activeCategory dari <MovementQueue> dan <MutationLog> (atau abaikan penyaringan kategori).
Bersihkan Script (Logic):

Hapus impor komponen PhysicalDistribution dan MovementRequest.
Ubah nilai inisialisasi default activePhysicalTab menjadi 'antrian' (sebelumnya 'distribusi').
Bersihkan fungsi/watcher pembantu yang berkaitan dengan kategori fisik jika sudah tidak digunakan.
[Frontend - Components]
[MODIFY] 
MovementQueue.vue
Hapus atau abaikan properti activeCategory.
Sesuaikan filteredRequests agar menampilkan semua data secara default tanpa filter kategori, agar pemantauan antrian lebih komprehensif.
[MODIFY] 
MutationLog.vue
Hapus atau abaikan properti activeCategory.
Sesuaikan filteredLogs agar menampilkan semua log mutasi secara default tanpa filter kategori. Pencarian spesifik tetap dapat menggunakan kolom search barcode.
[DELETE] 
PhysicalDistribution.vue
Hapus file ini karena fungsinya sudah sepenuhnya digantikan oleh barcodeUpdateModal di ManajemenStokView.vue.
[DELETE] 
MovementRequest.vue
Hapus file ini karena fungsinya sudah sepenuhnya digantikan oleh barcodeUpdateModal di ManajemenStokView.vue.
Verification Plan
Automated Tests
Menjalankan build produksi npm run build untuk memverifikasi tidak ada error kompilasi, kesalahan impor, atau berkas yang hilang.
Manual Verification
Pindah ke tab Lacak Fisik (Barcode).
Verifikasi bahwa tab kategori dinamis (Cincin, Kalung, dll.) sudah hilang dari bagian atas Lacak Fisik.
Verifikasi bahwa sub-tab yang tersisa hanya Antrian Mutasi dan Log Mutasi (default aktif pada Antrian Mutasi).
Pastikan data di antrian dan log mutasi muncul untuk seluruh kategori barang, dan pencarian barcode di log tetap berfungsi normal.