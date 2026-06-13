# RANGKUMAN FINAL: SISTEM BANTU INVENTORI TOKO PERHIASAN

---

## Stack & Posisi Sistem

- **Stack:** Vue 3 + Firebase + Bootstrap
- **Posisi:** Alat bantu tracking lokasi fisik barang, bukan pengganti sistem utama
- Sistem utama sudah ada terpisah — menangani manajemen stok, penjualan, dan stock opname dengan barcode
- Sistem bantu TIDAK menduplikasi transaksi penjualan
- Kode barang konsisten dan tidak pernah berubah — tidak perlu rekonsiliasi kode antar sistem

---

## Model Data Inti

- Satu kode barcode = satu pcs fisik
- Sistem hanya menyimpan: **kode ini ada di lokasi mana**
- Tidak menyimpan harga, berat, atau detail lain
- Total pcs per kode di semua lokasi harus selalu = 1
- Estimasi maksimal **6.000 kode barang aktif** — didefinisikan sebagai kode yang masih dilacak individual (belum masuk Display). Kode yang sudah di-flag `in_display: true` tidak masuk hitungan ini.

---

## 10 Lokasi Fisik yang Ditrack

Belum Posting, Admin, Stok Brankas, Display, Batu Lepas, Manual, DP, Rusak, Keep Barang, Lainnya.

Semua lokasi diperlakukan **setara** — bisa pindah ke lokasi manapun — kecuali Display yang memiliki aturan khusus.

**Catatan khusus Display:**

- Sekali barang masuk Display, kode tidak dilacak per individual lagi — hanya ditrack jumlah pcs-nya
- Kode di-flag `in_display: true` tapi tidak dihapus agar history mutasi tetap bisa ditelusuri
- Barang di Display **tidak bisa dipindah ke lokasi lain**
- Riwayat per kode hanya bisa ditampilkan sampai titik masuk Display — UI harus menampilkan indikator jelas bahwa tracking individual berhenti di sini

---

## Sistem Auth & Role

Sudah ada sistem auth. Dua role yang relevan:

**Role `supervisor`** — sudah ada sebelumnya. Bisa mengeksekusi perpindahan barang langsung tanpa perlu request.

**Role `input`** — role baru, turunan dari supervisor. Satu-satunya role yang bisa mengeksekusi perpindahan barang langsung tanpa perlu approval. Semua role lain hanya bisa mengajukan request perpindahan.

---

## Alur Perpindahan Barang

### Non-input (mengajukan request)

1. Input kode barcode — bisa satuan (scan atau ketik) maupun bulk (scan berulang atau paste teks bebas) dalam satu request, lebih dari 1 kode diperbolehkan
2. Pilih lokasi asal dan tujuan
3. Isi nama pemindah dari **dropdown** (bukan ketik bebas, agar konsisten)
4. Submit
5. Sistem validasi per kode: apakah kode memang ada di lokasi asal yang dipilih — kode yang tidak cocok langsung diblokir, kode yang valid tetap diproses
6. Kode yang lolos validasi masuk antrian dengan status **pending** sebagai satu batch request
7. Barang belum berpindah di sistem sampai role input memproses

### Role input (memproses antrian)

1. Buka halaman antrian kapan saja (manual, bukan real-time)
2. Lihat semua request pending
3. Approve atau reject — satuan maupun bulk
4. Jika approve: mutasi tercatat dan lokasi barang berubah
5. Jika reject: role input bisa isi catatan alasan yang bisa dilihat pemindah
6. Request yang tidak diproses tetap pending selamanya — tidak ada auto-expire

**Trigger operasional tetap manusia:** setelah submit request, pemindah memberi tahu role input secara verbal atau WA, lalu role input membuka halaman antrian.

### Validasi & Blokir

| Kondisi                                          | Aksi Sistem                    |
| ------------------------------------------------ | ------------------------------ |
| Kode tidak ditemukan di lokasi asal yang dipilih | Blokir — tampilkan pesan error |
| Perpindahan tanpa nama pemindah                  | Blokir                         |

Blokir hanya untuk kondisi yang pasti salah secara data.

---

## Arsitektur Antrian Request

Menggunakan **halaman antrian statis** (bukan real-time listener Firestore).

- Firestore query hanya dieksekusi saat halaman dibuka atau tombol refresh ditekan
- Tidak ada listener aktif terus-menerus

**Alasan pemilihan:**

- Menekan biaya Firestore reads
- Lebih tahan kondisi jaringan tidak stabil
- Menghindari risiko double processing antar perangkat
- Lebih sesuai ritme kerja toko fisik

---

## Input Kode Barcode

- **Satuan:** scan barcode atau ketik manual
- **Bulk:** paste teks bebas, sistem melakukan parsing untuk mengambil kode barcode yang relevan — tidak menggunakan import CSV

---

## Log Mutasi

Setiap mutasi mencatat:

- Kode barang
- Lokasi asal
- Lokasi tujuan
- Nama pemindah (dari dropdown)
- Timestamp
- Status request: approved/rejected + catatan alasan jika reject

---

## Riwayat Perpindahan Barang

Tidak perlu dua halaman terpisah. Satu **halaman Log Mutasi** dengan dua mode penggunaan:

**Mode per kode barcode:** scan atau ketik kode → tampil timeline perjalanan satu pcs dari awal masuk sampai sekarang. Digunakan untuk audit, investigasi selisih, atau komplain barang hilang.

**Mode log global:** tanpa kode spesifik, filter by lokasi / pemindah / tanggal → tampil semua aktivitas mutasi. Digunakan role input untuk cek apa yang sudah diproses, atau supervisor untuk audit aktivitas.

Barang yang masuk Display: riwayat berhenti di titik masuk Display, dengan indikator jelas di UI.

---

## Closing Harian

Dua tahap:

### Tahap 1 — Hitung Cepat (wajib tiap hari)

1. Input jumlah fisik per lokasi
2. Sistem tampilkan: jumlah sistem vs jumlah fisik vs selisih
3. Jika selisih = 0 di semua lokasi → closing selesai
4. Jika ada selisih → tandai lokasi bermasalah, lanjut ke Tahap 2 hanya untuk lokasi itu

### Tahap 2 — Stock Opname Parsial (hanya jika ada selisih)

1. Scan kode satu per satu di lokasi bermasalah
2. Sistem bandingkan hasil scan vs data tercatat
3. Output: daftar **kode ghost** (ada di sistem tapi tidak ditemukan fisik) dan **kode orphan** (ditemukan fisik tapi tidak ada di sistem)
4. Tim input putuskan: koreksi data atau eskalasi investigasi

Untuk lokasi ratusan pcs seperti Brankas — stock opname bisa dilakukan **bertahap per sesi**. Sistem menyimpan progress scan sesi yang sedang berjalan.

Lokasi Display dikecualikan dari closing berbasis kode — hanya ditrack jumlah pcs.

---

## Prioritas Sprint

### Sprint 1

- Input distribusi awal per lokasi — satuan & bulk
- Form request perpindahan dengan scan kode
- Halaman antrian untuk role input (approve/reject satuan & bulk)
- Log mutasi (halaman log global)

### Sprint 2

- Closing mode dua tahap
- Filter dan view per lokasi
- Riwayat mutasi per kode barang (mode pencarian per kode di halaman Log Mutasi)
- Fitur stock opname per lokasi dengan progress tersimpan

### Sprint 3 (opsional)

- Tombol "Ambil Cepat dari Admin" dari layar desktop
- Optimasi UX scanner barcode

---

## Masalah Utama yang Diselesaikan

- Closing lama karena tidak tahu barang fisik ada di lokasi mana
- Barang di meja admin sering diambil tanpa tracking
- Sales kadang ambil barang dari Belum Posting langsung tanpa sepengetahuan input
- Selisih antara fisik dan sistem utama sulit ditelusuri

---

## Catatan Penting: Batas Sistem

Masalah akar sebenarnya bukan di sistem — tidak ada friction fisik saat orang mengambil barang. Selama barang bisa diambil tanpa interaksi apapun, sistem digital apapun bisa di-bypass karena scan opsional secara perilaku meski wajib secara aturan.

Sistem ini dirancang dengan prinsip **"Mudah Jika Patuh, Terdeteksi Jika Bypass"** — tidak mencegah bypass secara teknis, tapi setiap bypass meninggalkan jejak yang jelas saat closing.

Agar sistem lebih efektif, perlu satu aturan fisik dari manajemen: **"Barang tidak boleh meninggalkan area admin/brankas sebelum scan."** Ini keputusan organisasional, bukan teknis.

---
