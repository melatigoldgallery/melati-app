# PRD-08: Modul Order Online

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md), [PRD-03 Modul Servis](./03-PRD-SERVIS.md)

---

## 1. Deskripsi Modul

Modul Order Online dipakai untuk mencatat, memantau, dan melaporkan proses barang hasil order online. Pola kerja mengikuti modul Servis: ada halaman input data, halaman data operasional dengan aksi edit/hapus/update status, dan halaman laporan read-only.

Fokus utama modul ini adalah:

- Input data customer dan detail barang order online.
- Monitoring status pengambilan barang.
- Penyimpanan bukti pengambilan.
- Laporan berdasarkan periode dan status pengambilan.

---

## 2. Halaman Eksisting → Route Baru

| File Lama / Konsep Menu | Route Vue Baru            | Deskripsi                                      |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| `input-order.html`       | `/order-online/input`     | Form input order online baru                   |
| `data-order.html`       | `/order-online/data`      | Daftar data order online + aksi update/edit/hapus |
| `laporan-order.html`    | `/order-online/laporan`   | Laporan order online                           |

Catatan: nama file view yang diusulkan mengikuti permintaan user:

- `InputOrderView.vue`
- `DataOrderView.vue`
- `LaporanOrderView.vue`

---

## 3. Ruang Lingkup

### 3.1 In Scope

- Form input data customer.
- Form input detail barang order online.
- Penyimpanan data order ke Firestore.
- Filter data berdasarkan tanggal dan status pengambilan.
- Update status pengambilan melalui modal.
- Edit data dan hapus data dengan pola akses yang sama seperti modul Servis.
- Upload atau simpan bukti pengambilan.
- Laporan berdasarkan periode dan status pengambilan.

### 3.2 Out of Scope

- Integrasi marketplace / API order online eksternal.
- Sinkronisasi otomatis dari platform e-commerce.
- Notifikasi WA otomatis kecuali diminta pada fase berikutnya.
- Print invoice / nota khusus order online pada fase ini.

---

## 4. Alur Bisnis yang Diinginkan

### 4.1 Input Order

User membuka halaman input order online, lalu mengisi:

- Tanggal
- Nama admin
- Nama customer
- Kontak

Setelah itu user menambahkan detail barang pada card terpisah dengan kolom:

- Jml
- Nama barang
- Berat
- Karat
- Harga

Saat tombol simpan ditekan, sistem menyimpan data dan memberi umpan balik sukses/gagal.

### 4.2 Data Operasional

User membuka halaman data order online, lalu dapat:

- Memfilter data berdasarkan tanggal dari - tanggal sampai.
- Memfilter berdasarkan status pengambilan.
- Menampilkan hasil filter.
- Melihat tabel data detail order online.
- Mengubah status pengambilan melalui modal.
- Mengedit data.
- Menghapus data.

### 4.3 Laporan

User membuka halaman laporan order online, lalu dapat:

- Memfilter berdasarkan tanggal awal.
- Memfilter berdasarkan tanggal akhir.
- Memfilter berdasarkan status pengambilan.
- Menampilkan hasil dalam tabel laporan.

---

## 5. Data Model Firestore

### 5.1 Collection: `order_online/{docId}`

Usulan struktur data utama adalah 1 dokumen per detail barang, sehingga satu order customer dapat memiliki beberapa baris detail dengan `orderNo` atau `groupId` yang sama.

```javascript
{
  id: string,
  orderNo: string,            // Nomor transaksi / nomor grup order

  // Waktu input
  tanggal: string,            // YYYY-MM-DD
  jam: string,                // HH:mm
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Data customer
  namaSales: string,          // Dipakai juga sebagai kolom sales di tabel
  namaCustomer: string,
  kontak: string,

  // Detail barang
  jml: number,
  namaBarang: string,
  berat: number,
  karat: string,
  harga: number,

  // Status pengambilan
  statusPengambilan: string,   // BELUM_DIAMBIL | SUDAH_DIAMBIL
  namaStafHandle: string,
  waktuPengambilan: string,    // YYYY-MM-DD HH:mm, diisi saat diambil
  buktiPengambilanUrl: string,

  // Metadata akses
  createdBy: string,
  updatedBy: string,
  deletedAt?: Timestamp,
  deletedBy?: string
}
```

### 5.2 Catatan Model

- `namaSales` dipakai sebagai sumber data untuk kolom `sales` pada tabel data dan laporan.
- `statusPengambilan` disarankan minimal dua status: `BELUM_DIAMBIL` dan `SUDAH_DIAMBIL`.
- `buktiPengambilanUrl` disarankan menyimpan URL file upload ke Firebase Storage agar bisa dibuka ulang.
- Jika nanti dibutuhkan lebih dari satu status, enum bisa diperluas tanpa mengubah struktur utama.

---

## 6. User Stories

### 6.1 Input Data Order Online (`/order-online/input`)

- Sebagai staf, saya ingin mengisi data customer dan detail barang agar order online tercatat dengan lengkap.
- Sebagai staf, saya ingin menambah lebih dari satu detail barang agar semua barang dalam satu order bisa dicatat.
- Sebagai staf, saya ingin menyimpan data dengan sekali klik agar proses input lebih cepat.
- Sebagai staf, saya ingin mendapat notifikasi sukses/gagal agar tahu hasil penyimpanan.

### 6.2 Data Order Online (`/order-online/data`)

- Sebagai admin atau staf, saya ingin memfilter data berdasarkan tanggal dan status agar mudah mencari data tertentu.
- Sebagai admin atau staf, saya ingin melihat tabel detail order online agar monitoring operasional lebih cepat.
- Sebagai admin atau staf, saya ingin update status pengambilan lewat modal agar alur pengambilan tercatat rapi.
- Sebagai supervisor atau admin, saya ingin mengedit data order online agar bisa koreksi data yang salah.
- Sebagai supervisor atau admin, saya ingin menghapus data order online agar bisa menghapus data duplikat atau keliru.
- Sebagai admin atau staf, saya ingin melihat bukti pengambilan agar bisa verifikasi serah terima barang.

### 6.3 Laporan Order Online (`/order-online/laporan`)

- Sebagai admin, saya ingin memfilter laporan per periode dan status agar laporan sesuai kebutuhan.
- Sebagai admin, saya ingin melihat daftar order yang sudah dan belum diambil agar bisa memantau progres pengambilan barang.

---

## 7. Komponen Vue yang Dibutuhkan

### 7.1 Views

```text
src/views/order-online/
├── InputOrderView.vue
├── DataOrderView.vue
└── LaporanOrderView.vue
```

### 7.2 Komponen Khusus Modul

```text
src/components/order-online/
├── OrderCustomerCard.vue
├── OrderDetailCard.vue
├── OrderFilterCard.vue
├── OrderTable.vue
├── OrderStatusModal.vue
├── OrderEditModal.vue
└── OrderProofPreview.vue
```

---

## 8. Store dan Composables

### 8.1 Pinia Store

```javascript
// stores/order-online.js
export const useOrderOnlineStore = defineStore("orderOnline", {
  state: () => ({
    data: [],
    filteredData: [],
    selectedFromDate: "",
    selectedToDate: "",
    selectedStatus: "",
    isLoading: false,
    activeListener: null,
  }),
  actions: {
    async saveOrder(payload) {},
    async loadOrders(filter) {},
    async updatePickupStatus(id, payload) {},
    async editOrder(id, payload) {},
    async deleteOrder(id) {},
  },
  getters: {
    totalData: (state) => state.filteredData.length,
    totalBelumDiambil: (state) => state.filteredData.filter((item) => item.statusPengambilan === "BELUM_DIAMBIL").length,
  },
});
```

### 8.2 Composable yang Disarankan

```javascript
// composables/useOrderOnline.js
export function useOrderOnline() {
  const formatOrderDateTime = (value) => {};
  const buildOrderNo = () => {};
  const normalizeOrderPayload = (form) => {};

  return {
    formatOrderDateTime,
    buildOrderNo,
    normalizeOrderPayload,
  };
}
```

---

## 9. Validasi dan Aturan Bisnis

- Tanggal, nama sales, nama customer, dan kontak wajib diisi.
- Minimal satu detail barang harus ada sebelum simpan.
- Jml, berat, dan harga harus numerik dan bernilai valid.
- Bukti pengambilan hanya boleh muncul saat status diubah menjadi `SUDAH_DIAMBIL`.
- Edit dan delete mengikuti pola otorisasi yang sama dengan modul Servis.
- Filter laporan harus tetap bekerja meski data memiliki banyak detail barang per customer.

---

## 10. Non-Fungsional

- Tampilan konsisten dengan pola card + table seperti modul Servis.
- Form harus memberi state loading agar user tidak klik simpan berulang kali.
- Upload bukti harus aman dan bisa divalidasi jenis file-nya.
- Query list harus bisa dipakai untuk filter tanggal dan status tanpa reload halaman penuh.

---

## 11. Keputusan Desain yang Ditunda

### 11.1 Asumsi Sementara

- Satu order customer dapat terdiri dari beberapa detail barang, disimpan sebagai beberapa record dengan `orderNo` yang sama.
- `namaAdmin` dipakai sebagai sumber tampilan kolom `sales`.
- Status pengambilan awal hanya dua nilai: `BELUM_DIAMBIL` dan `SUDAH_DIAMBIL`.
- Bukti pengambilan disimpan sebagai file upload, bukan teks manual.

### 11.2 Pertanyaan untuk Konfirmasi

1. Apakah satu customer order harus dijadikan 1 dokumen header + banyak detail, atau langsung 1 dokumen per detail barang?
2. Apakah kolom `sales` memang harus memakai nama admin, atau perlu field tersendiri?
3. Status pengambilan perlu lebih dari dua status atau cukup dua status saja?
4. Bukti pengambilan akan berupa foto upload ke Storage, atau cukup nama file / tautan manual?

---

## 12. Acceptance Criteria Draft

- User bisa membuka tiga halaman: input, data, dan laporan.
- Data customer dan detail barang bisa disimpan dengan benar.
- Data dapat difilter berdasarkan tanggal dan status pengambilan.
- Update status pengambilan dapat disertai nama staf handle dan bukti.
- Laporan menampilkan data sesuai filter yang dipilih.
- Edit dan delete mengikuti pola kontrol akses yang sama seperti servis.

---

## 13. Dampak Implementasi yang Diperkirakan

- Tambahan route di router Vue.
- Tambahan menu di struktur menu dan access control.
- Tambahan store, service layer, dan komponen khusus order online.
- Potensi kebutuhan Firebase Storage untuk bukti pengambilan.
