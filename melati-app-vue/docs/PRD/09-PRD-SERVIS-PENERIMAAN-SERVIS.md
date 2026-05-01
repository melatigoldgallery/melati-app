# PRD: Penerimaan Servis

## Ringkasan

Tambahkan tahap "Penerimaan Servis" sebagai verifikasi internal. Saat penerimaan tersimpan, status servis otomatis menjadi "Sudah Selesai" dan barang baru boleh diambil oleh customer.

## Tujuan

- Ada bukti fisik bahwa barang sudah diterima.
- Status "Sudah Selesai" otomatis setelah penerimaan servis.
- Audit trail penerimaan tetap tersimpan.

## Alur (Revisi)

1. Tukang mengembalikan barang ke kasir.
2. Kasir melakukan "Penerimaan Servis" (nama + foto + waktu).
3. Status penerimaan servis menjadi "Sudah Diterima".
4. Status servis otomatis menjadi "Sudah Selesai".
5. Setelah itu customer bisa dihubungi dan pengambilan berjalan seperti biasa.

## Alur ASCII

[Servis Masuk]
|
v
[Dikerjakan Tukang]
|
v
[Penerimaan Servis] --(wajib foto + nama)--> [Status Penerimaan: Sudah Diterima]
|
v
[Status Servis: Sudah Selesai]
|
v
[Pengambilan Customer]

## Data Minimal

Field pada dokumen servis:

- statusPenerimaanServis: "Belum Diterima" | "Sudah Diterima"
- penerimaServis: string
- waktuPenerimaan: ISO string
- buktiPenerimaanUrl: string
- buktiPenerimaanPath: string

Histori (subcollection): servis/{id}/penerimaanServis

- penerima, waktu, catatan (opsional)
- buktiUrl, buktiPath, buktiLiteUrl, buktiLitePath
- createdBy, createdAt

## UI Singkat (Data Servis)

- Tambah filter status penerimaan servis.
- Tambah badge status penerimaan servis.
- Tambah tombol "Penerimaan Servis" sebelum "Selesaikan".
- Hapus kolom "Bukti". Ikon foto pengambilan dipindah ke kolom "Handle / Waktu".
- Tambah kolom "Penerimaan / Waktu" berisi:
  - Nama penerima
  - Waktu penerimaan
  - Ikon foto untuk melihat bukti penerimaan

## Aturan Bisnis Inti

- Status servis "Sudah Selesai" otomatis saat penerimaan servis berhasil disimpan.
- Foto bukti wajib.
- Role kasir + supervisor boleh melakukan penerimaan.
- Jika penerimaan dilakukan via checkbox (bulk), satu foto dipakai untuk semua servis yang dicentang dan disimpan ke masing-masing dokumen servis.

## Uji Ringkas

1. Penerimaan servis tanpa foto -> ditolak.
2. Penerimaan servis tersimpan -> status servis otomatis jadi "Sudah Selesai".
3. Pengambilan customer hanya setelah status servis "Sudah Selesai".
4. Penerimaan bulk dengan satu foto -> semua servis tercentang punya bukti penerimaan yang sama.
