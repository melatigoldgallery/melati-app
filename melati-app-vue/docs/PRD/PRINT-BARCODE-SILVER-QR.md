# PRD: Cetak QR Label untuk Kode Silver

Versi: 1.0
Tanggal: 2026-05-02
Penulis: Tim Produk / Dev

## Ringkasan

Fitur ini menambahkan kemampuan mencetak label QR khusus untuk barang kategori `silver`. Format cetak final adalah 1 baris berisi 2 label identik, masing-masing berukuran 24 mm x 24 mm, dengan jarak antar label 35 mm. Alur pengguna: pilih satu atau beberapa kode silver, tentukan berapa baris/qty untuk tiap kode, lalu kirim job cetak ke `printing-service` lokal.

## Tujuan

- Memudahkan kasir/staff untuk cepat mencetak label QR untuk barang silver.
- Label berukuran presisi 2.4 x 2.4 cm agar kompatibel dengan stiker/holder fisik yang digunakan.

## Scope

- Frontend: modal/panel di `Tambah Barang (Aksesoris)` untuk memilih kode silver dan qty, tombol `Print QR`.
- Backend: endpoint di `printing-service` yang menerima payload JSON berisi daftar label dan qty, ukuran (2.4x2.4 cm) dan opsi printer.
- Printing logic: generator ESC/POS (atau fallback render-image) yang menghasilkan QR berukuran pas dan teks pendukung (opsional: nama/kadar/berat).

## User Story

Sebagai staff toko, saya ingin memilih kode silver dan mencetak N label QR per kode dengan ukuran 2.4x2.4 cm sehingga saya bisa menempelkan tag pada produk secara cepat.

## Functional Requirements

1. UI dapat menampilkan daftar kode `silver` (fetch dari koleksi `kodeAksesoris/kategori/silver`).
2. User bisa memilih satu atau beberapa kode; untuk setiap kode bisa diisi `qty` (jumlah cetak).
3. Saat menekan `Print`, frontend mengirim POST ke printing-service dengan payload yang berisi array label: `{ kode, nama?, kadar?, berat?, qty }` dan opsi layout cetak 2-up identik serta `printer` optional.
4. printing-service menerima request, membuat one-or-more print jobs (qty copies), dan meng-enqueue/dispatch ke printer yang sudah dikonfigurasi.
5. printing-service mengembalikan respons success/failure (job id atau error message). Frontend menampilkan toast/alert sesuai respons.

## Non-functional Requirements

- Waktu respons API: < 3 detik untuk enqueuing job (actual printing bisa asinkron).
- Label harus dicetak pada ukuran fisik 24mm x 24mm per label.
- 1 sheet menghasilkan 1 baris dengan 2 label identik dan gap 35mm.
- Dukungan printer thermal ESC/POS; jika barcode/QR ESC/POS tidak menghasilkan output presisi, printing-service harus mendukung rendering HTML→PNG→print (image) sebagai fallback.

## QR Content & Layout

- QR akan menyimpan string singkat: `KM-00286` (hanya `kode`). Payload tetap dapat membawa `nama, kadar, berat` untuk kebutuhan tampilan, tetapi isi QR final hanya kode.
- Layout rekomendasi pada tiap label 24x24 mm:
  - QR di kiri atas
  - Kode di kanan QR bagian atas
  - Nama besar di tengah
  - Berat besar di bawah nama
  - Kadar kecil di kanan bawah

## Size / DPI Conversion

- Default printer DPI diasumsikan 203 DPI (typical thermal). Konversi piksel:
  - 24 mm = 0.94488 in → pixels = 0.94488 \* DPI
  - Pada 203 DPI → ~192 px per label.
- printing-service harus menghitung pixel canvas berdasarkan DPI printer yang dipilih.

## API Spec (example)

POST /print/qr-silver
Request JSON:

{
"printer": "label-silver-1", // optional, gunakan default jika kosong
"labels": [
{ "kode": "KM-00286", "nama": "Kalung Herme", "kadar": "9K", "berat": "3.01", "qty": 5 },
{ "kode": "KM-00287", "qty": 2 }
]
}

Success response:
{
"ok": true,
"jobs": [ { "kode": "KM-00286", "jobId": "abc123", "qty": 5 }, { "kode": "KM-00287", "jobId": "def456", "qty": 2 } ]
}

Error response:
{
"ok": false,
"error": "Printer not configured"
}

Example cURL:

curl -X POST http://localhost:3000/print/qr-silver -H "Content-Type: application/json" -d '{"printer":"label-silver-1","widthCm":2.4,"heightCm":2.4,"labels":[{"kode":"KM-00286","qty":3}]}'

## Frontend UI Flow

1. Dari `Tambah Barang (Aksesoris)`, user klik tombol `Cetak QR Silver` (tombol muncul hanya jika `form.jenis === 'silver'` atau dari halaman daftar silver).
2. Modal muncul: tabel kode silver (kode, nama, kadar, berat) dengan kolom `Qty` (input number) dan pilihan printer label.
3. User tentukan qty per baris; bisa masukkan langsung beberapa baris.
4. Tombol `Print` mengirim payload ke `/print/qr-silver` dan menampilkan loading + hasil.

## Error Handling

- Jika printer tidak tersedia, tampilkan pesan error dan opsi retry.
- Jika ukuran tidak bisa dipenuhi oleh printer, fallback ke render-image dan notify user.

## Testing & Verification

1. Unit: fungsi pembuat payload, generator QR, dan layout 2-up per baris — tambahkan test jika ada test harness.
2. Integration: kirim sample payload ke printing-service; periksa log `printQueue` dan response job id.
3. Manual: cetak sample 1 kopi, ukur fisik label (kalibrasi printer jika diperlukan).

## Rollout

- Tambah fitur di branch feature/print-qr-silver.
- QA manual dengan 1-2 printer di toko.
- Merge ke main setelah verifikasi fisik ukuran.

## Open Questions

1. Printer DPI sebenarnya berapa di environment produksi? (butuh verifikasi sebelum release)
2. Apakah ada perbedaan ukuran label antar printer atau semua Sato CG408 memakai stok label yang sama?

---

Dokumen ini disimpan sebagai sumber acuan implementasi; setelah Anda konfirmasi pilihan QR-content dan printer selection, saya bisa lanjutkan ke discovery printing-service dan implementasi.

## Contoh cURL

```bash
curl -X POST http://localhost:3001/api/print/qr-silver \
  -H "Content-Type: application/json" \
  -d '{
    "printer": "Adobe PDF",
    "widthCm": 2.4,
    "heightCm": 2.4,
    "labels": [
      { "kode": "KM-00286", "nama": "Kalung Herme", "kadar": "9K", "berat": "3.01", "qty": 3 }
    ]
  }'
```
