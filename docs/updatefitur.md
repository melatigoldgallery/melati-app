# Rencana Perbaikan Fitur Silver (Aksesoris)

Dokumen ini berisi analisis kebutuhan dan rencana penerapan perbaikan fitur **Silver** dalam sistem aksesoris.
Fokus saat ini hanya pada **perencanaan** (belum implementasi kode).

---

## Gambaran Umum Kebutuhan

Tujuan utama:

1. Menambahkan atribut **kadar** dan **berat** pada data aksesoris kategori **silver**.
2. Menyimpan atribut tersebut di:

   * Koleksi `kodeAksesoris > kategori > silver`
   * Koleksi `stokAksesoris`
3. Menggunakan data **kadar** dan **berat** saat:

   * Input penjualan silver
   * Menampilkan laporan stok khusus silver dengan perhitungan berbasis berat

---

## Struktur Data Baru (Konsep)

### Field Baru untuk Silver

Setiap item silver akan memiliki:

* `kadar` : number (misal: 925, 750, dll)
* `berat` : number (berat per pcs)

Disimpan pada:

* `kodeAksesoris.kategori.silver[]`
* `stokAksesoris`

---

# TAHAP 1 – Perbaikan Halaman Tambah Aksesoris

## 1. Perubahan UI (Modal Kelola Kode Barang – Tab Silver)

### Kondisi Saat Ini

Kolom:

* Kode
* Nama
* (field lama lainnya)

### Perubahan yang Diinginkan

Setelah kolom **Nama**, tambahkan:

* Kolom **Kadar**
* Kolom **Berat**

Urutan baru:

* Kode
* Nama
* **Kadar (baru)**
* **Berat (baru)**
* Field lain

---

## 2. Perubahan Logic Simpan Data

Saat menambah data baru kategori **silver**:

Field wajib dikirim:

* kode
* nama
* kadar
* berat

Data disimpan ke:

### Koleksi `kodeAksesoris`

Path:

```
kodeAksesoris > kategori > silver
```

Format contoh:

```json
{
  "kode": "SBN100",
  "nama": "Gelang Silver",
  "kadar": 925,
  "berat": 100
}
```

### Koleksi `stokAksesoris`

Path:

```
stokAksesoris
```

Tambahkan field yang sama:

```json
{
  "kategori" : "silver",
  "kode": "SBN100",
  "nama" : "SILVER BAR REFINERY 100 GR",
  "kadar": "925",
  "berat": 100
}
```

---

## 3. Validasi Tambahan

* Jika kategori = silver:

  * `kadar` wajib diisi
  * `berat` wajib diisi & numeric
* Jika kategori lain:

  * Field kadar & berat tidak ditampilkan / diabaikan

---

# TAHAP 2 – Perbaikan Halaman Penjualan Aksesoris

## 1. Perubahan Perilaku Dropdown Kode

### Kondisi Saat Ini

Saat memilih kode:

* Mengisi nama
* Mengisi harga / data lama

### Perubahan untuk Silver

Jika `jenis = silver` dan user memilih **kode**:

Sistem otomatis:

* Ambil data dari `kodeAksesoris.kategori.silver`
* Isi otomatis:

  * Field **kadar**
  * Field **berat**

---

Tujuan:

* User tidak input manual
* Data konsisten dari master kode

---

## 2. Data yang Disimpan ke Transaksi

Saat simpan penjualan silver:

Data minimal:

```json
{
  "kode": "SBN100",
  "jumlah": 2,
  "kadar": "925",
  "berat": 100,
  "totalBerat": 200
}
```

Catatan:

* `totalBerat = berat * jumlah`

---

# TAHAP 3 – Perbaikan Halaman Laporan Stok (laporanStok.html)

## 1. Penambahan Filter Jenis Laporan

Tambahkan dropdown baru:

Label: **Jenis Laporan**
Pilihan:

* Kotak & Aksesoris (default – seperti sekarang)
* Silver

---

## 2. Perilaku Saat Pilih “Kotak & Aksesoris”

* Tampilan tetap sama seperti sistem saat ini
* Struktur kolom tidak berubah

---

## 3. Perilaku Saat Pilih “Silver”

### Perubahan Kolom

#### Kolom yang DIHAPUS

* Free

#### Kolom yang DIGANTI

* Ganti Lock**

---

## 4. Logika Perhitungan Berat di Setiap Kolom

Misal:

* kode SBN100 field berat berisi = 100 (diambil dari field berat dari masing-masing kode di koleksi stockAksesoris/kodeAksesoris)
* Jumlah stok awal = 10

Maka tampilan:

```
10
1000   (100 x 10)
```

Format tampilan:

* Baris 1: jumlah pcs
* Baris 2: total berat

---

### Kolom yang Menggunakan Logika Berat

Untuk laporan silver, semua kolom berikut menampilkan:

1. **Stok Awal**

   * pcs
   * total berat

2. **Tambah Stok**

   * pcs
   * total berat

3. **Laku**

   * pcs
   * total berat

4. **Return**

   * pcs
   * total berat

5. **Stok Akhir**

   * pcs
   * total berat

Rumus umum:

```
totalBerat = berat * jumlahPcs
```

---

## 5. Sumber Data Berat

Data berat diambil dari:

* `stokAksesoris.berat`

Digunakan untuk semua perhitungan laporan

---

## tambahkan tfoot di bawah tabel untuk menjumlahkan jumlah pcs dan jumlah berat di setiap kolom.

---
