# PRD-04: Modul Aksesoris

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Aksesoris mengelola penjualan aksesoris perhiasan, manajemen stok aksesoris, return barang, pelaporan penjualan, dan kelola data sales. Ini adalah modul paling aktif secara bisnis dan memiliki integrasi stok+transaksi yang erat.

> **Catatan Penting (Bug Fix):** Sebelum migrasi, pastikan `penjualanAksesoris.js` menggunakan `td:nth-child(2)` untuk kode dan `td:nth-child(3)` untuk nama (sudah diperbaiki). Data lama di Firestore dengan `kodeText == "1"/"2"/"3"` perlu dibetulkan melalui halaman Data Penjualan.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama            | Route Vue Baru                 | Deskripsi                       |
| ------------------------- | ------------------------------ | ------------------------------- |
| `penjualanAksesoris.html` | `/aksesoris/penjualan`         | Input transaksi penjualan baru  |
| `dataPenjualan.html`      | `/aksesoris/data-penjualan`    | Lihat/edit/hapus transaksi      |
| `laporanPenjualan.html`   | `/aksesoris/laporan-penjualan` | Laporan penjualan per periode   |
| `tambahAksesoris.html`    | `/aksesoris/tambah-barang`     | Manajemen data master aksesoris |
| `return.html`             | `/aksesoris/return`            | Proses return barang            |
| `laporanStok.html`        | `/aksesoris/laporan-stok`      | Laporan stok aksesoris          |
| `kelolaSales.html`        | `/aksesoris/kelola-sales`      | Kelola data sales karyawan      |

---

## 3. Firebase Data Model

### 3.1 Firestore Collections

#### `penjualanAksesoris/{docId}`

```javascript
{
  // Transaksi Header
  tanggal: string,           // YYYY-MM-DD
  waktu: string,             // HH:mm:ss
  salesId: string,           // Employee ID sales
  salesName: string,
  noInvoice: string,         // Format: INV-YYYYMMDD-XXX

  // Item-item yang dijual
  items: [
    {
      tipe: string,          // 'aksesoris' | 'kotak' | 'silver' | 'manual'
      kodeText: string,      // Kode barang (mis: K30, GB, S5)
      namaBarang: string,    // Nama barang
      qty: number,
      harga: number,
      subtotal: number
    }
  ],

  // Total
  totalHarga: number,
  diskon: number,
  grandTotal: number,

  // Status & Metadata
  metodePembayaran: string,  // 'TUNAI' | 'TRANSFER' | 'QRIS'
  status: string,            // 'SELESAI' | 'RETURN'
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string
}
```

#### `stokAksesoris/{kodeBarang}`

```javascript
{
  kode: string,              // Kode unik barang (primary key)
  nama: string,              // Nama barang
  kategori: string,          // 'aksesoris' | 'kotak' | 'silver'
  stok: number,              // Stok saat ini
  hargaJual: number,         // Harga jual satuan
  hargaBeli: number,         // Harga beli (HPP)
  satuan: string,            // 'pcs' | 'lusin' | 'set'
  isActive: boolean,
  updatedAt: Timestamp
}
```

#### `stokAksesorisTransaksi/{docId}`

```javascript
{
  kode: string,              // Referensi ke stokAksesoris
  tipe: string,              // 'JUAL' | 'RETURN' | 'TAMBAH' | 'KOREKSI'
  qty: number,               // Positif = masuk, negatif = keluar
  stokSebelum: number,
  stokSesudah: number,
  referensiId: string,       // ID penjualanAksesoris / return
  tanggal: string,
  performedBy: string,
  catatan: string
}
```

#### `settings/passwords`

```javascript
{
  supervisorPassword: string,
  adminPassword: string
}
```

---

## 4. User Stories

### 4.1 Penjualan Aksesoris (/aksesoris/penjualan)

| ID       | Sebagai | Saya ingin                             | Agar                                              |
| -------- | ------- | -------------------------------------- | ------------------------------------------------- |
| US-PJ-01 | Sales   | Tambah item aksesoris ke keranjang     | Input transaksi per item                          |
| US-PJ-02 | Sales   | Cari barang berdasarkan kode atau nama | Tidak perlu hafal kode                            |
| US-PJ-03 | Sales   | Lihat stok saat menginput item         | Tahu apakah barang tersedia                       |
| US-PJ-04 | Sales   | Tambah item kotak, silver, atau manual | Fleksibilitas jenis barang                        |
| US-PJ-05 | Sales   | Hapus item dari keranjang              | Koreksi item yang salah input                     |
| US-PJ-06 | Sales   | Konfirmasi transaksi dan simpan        | Transaksi tersimpan ke Firestore & stok berkurang |
| US-PJ-07 | Sales   | Cetak/download struk/invoice           | Bukti transaksi untuk pelanggan                   |
| US-PJ-08 | Sales   | Input diskon transaksi                 | Terapkan promo/diskon                             |

### 4.2 Data Penjualan (/aksesoris/data-penjualan)

| ID       | Sebagai | Saya ingin                            | Agar                            |
| -------- | ------- | ------------------------------------- | ------------------------------- |
| US-DP-01 | Admin   | Lihat semua transaksi hari ini        | Monitoring penjualan harian     |
| US-DP-02 | Admin   | Filter transaksi per tanggal/range    | Analisis periode tertentu       |
| US-DP-03 | Admin   | Edit transaksi (termasuk kode barang) | Perbaiki data yang salah input  |
| US-DP-04 | Admin   | Hapus transaksi dengan restore stok   | Rollback transaksi fiktif/error |
| US-DP-05 | Admin   | Cetak ulang invoice transaksi         | Jika struk asli hilang          |
| US-DP-06 | Admin   | Search berdasarkan nama/kode/invoice  | Pencarian cepat                 |

### 4.3 Laporan Penjualan (/aksesoris/laporan-penjualan)

| ID       | Sebagai | Saya ingin                                      | Agar                   |
| -------- | ------- | ----------------------------------------------- | ---------------------- |
| US-LP-01 | Admin   | Laporan penjualan per hari/minggu/bulan         | Analitik penjualan     |
| US-LP-02 | Admin   | Rekap per sales (siapa yang paling banyak jual) | Evaluasi kinerja sales |
| US-LP-03 | Admin   | Export Excel & PDF                              | Laporan formal         |
| US-LP-04 | Admin   | Filter berdasarkan kategori barang              | Analisis per segmen    |

### 4.4 Tambah Barang (/aksesoris/tambah-barang)

| ID       | Sebagai | Saya ingin                    | Agar                    |
| -------- | ------- | ----------------------------- | ----------------------- |
| US-TB-01 | Admin   | CRUD data master aksesoris    | Kelola katalog barang   |
| US-TB-02 | Admin   | Set harga jual dan harga beli | Pencatatan margin       |
| US-TB-03 | Admin   | Koreksi stok manual           | Sinkronisasi stok fisik |

### 4.5 Return Barang (/aksesoris/return)

| ID       | Sebagai | Saya ingin                             | Agar                          |
| -------- | ------- | -------------------------------------- | ----------------------------- |
| US-RT-01 | Admin   | Pilih transaksi yang di-return         | Referensi transaksi asal      |
| US-RT-02 | Admin   | Pilih item yang dikembalikan           | Tidak perlu return semua item |
| US-RT-03 | Admin   | Stok otomatis bertambah setelah return | Stok akurat                   |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/aksesoris/
├── PenjualanView.vue         # Halaman transaksi penjualan
├── DataPenjualanView.vue     # Daftar transaksi + edit/hapus
├── LaporanPenjualanView.vue  # Laporan dengan filter periode
├── TambahBarangView.vue      # Master data aksesoris
├── ReturnBarangView.vue      # Proses return
├── LaporanStokView.vue       # Laporan kondisi stok
└── KelolaSalesView.vue       # Manajemen data sales
```

### 5.2 Komponen Khusus Aksesoris

```
src/components/aksesoris/
├── ItemSearchInput.vue       # Autocomplete pencarian barang
├── CartTable.vue             # Tabel keranjang belanja + row numbering
├── CartItemRow.vue           # Satu baris item di keranjang
├── ManualItemInput.vue       # Form input item manual (tanpa stok)
├── TransactionConfirmModal.vue  # Modal konfirmasi sebelum simpan
├── InvoicePreview.vue        # Preview invoice/struk
├── TransactionTable.vue      # Tabel data penjualan
├── EditTransactionModal.vue  # Modal edit transaksi (kode editable)
├── StockBadge.vue            # Badge stok tersedia/habis
└── ReturnItemSelector.vue    # UI pemilihan item untuk return
```

### 5.3 Composables

```javascript
// composables/useCart.js
export function useCart() {
  const items = ref([]);

  const addItem = (item) => {
    // Cek stok, tambah ke items
    // Hitung rowNo, subtotal
  };
  const removeItem = (index) => {
    items.value.splice(index, 1);
  };
  const calculateTotal = () => {
    return items.value.reduce((sum, i) => sum + i.subtotal, 0);
  };
  const clearCart = () => {
    items.value = [];
  };

  return { items, addItem, removeItem, calculateTotal, clearCart };
}

// composables/useStockValidation.js
export function useStockValidation() {
  const checkStock = async (kode, qty) => {
    // Query stokAksesoris
    // Return { available: boolean, currentStock: number }
  };
  return { checkStock };
}
```

---

## 6. Pinia Store — `accessoriesStore`

```javascript
// stores/accessories.js
export const useAccessoriesStore = defineStore("accessories", {
  state: () => ({
    catalog: [], // Data master stokAksesoris
    todayTransactions: [], // Transaksi hari ini
    currentDateFilter: null, // Filter tanggal aktif
    isLoading: false,
  }),
  actions: {
    async loadCatalog() {
      // Query stokAksesoris where isActive == true
    },
    async loadTransactions(startDate, endDate) {
      // Query penjualanAksesoris dengan range tanggal
    },
    async saveTransaction(cartItems, salesInfo) {
      // Firestore transaction (atomic):
      // 1. Simpan dokumen penjualanAksesoris
      // 2. Update stok tiap item (stokAksesoris)
      // 3. Simpan log stokAksesorisTransaksi
    },
    async deleteTransaction(id) {
      // Firestore transaction:
      // 1. Hapus penjualanAksesoris
      // 2. Restore stok (tambahkan kembali)
      // 3. Hapus/negate stokAksesorisTransaksi
    },
    async editTransaction(id, updatedData) {
      // Verifikasi password
      // Update penjualanAksesoris
      // Rekalkukasi stok jika qty/item berubah
    },
  },
});
```

---

## 7. Transaksi Atomik (Firestore Transaction)

Penjualan menggunakan Firestore Transaction untuk atomisitas:

```javascript
// services/stock-service.js
export async function processSale(cartItems, transactionData) {
  await runTransaction(db, async (transaction) => {
    // 1. Baca stok saat ini untuk semua item
    const stockRefs = cartItems.map((item) => doc(db, "stokAksesoris", item.kode));
    const stockSnaps = await Promise.all(stockRefs.map((ref) => transaction.get(ref)));

    // 2. Validasi stok cukup
    stockSnaps.forEach((snap, i) => {
      if (!snap.exists()) throw new Error(`Barang ${cartItems[i].kode} tidak ditemukan`);
      if (snap.data().stok < cartItems[i].qty) {
        throw new Error(`Stok ${cartItems[i].kode} tidak cukup`);
      }
    });

    // 3. Kurangi stok
    stockSnaps.forEach((snap, i) => {
      transaction.update(stockRefs[i], {
        stok: increment(-cartItems[i].qty),
        updatedAt: serverTimestamp(),
      });
    });

    // 4. Simpan transaksi penjualan
    const saleRef = doc(collection(db, "penjualanAksesoris"));
    transaction.set(saleRef, { ...transactionData, id: saleRef.id });

    // 5. Simpan log transaksi stok
    cartItems.forEach((item, i) => {
      const logRef = doc(collection(db, "stokAksesorisTransaksi"));
      transaction.set(logRef, {
        kode: item.kode,
        tipe: "JUAL",
        qty: -item.qty,
        stokSebelum: stockSnaps[i].data().stok,
        stokSesudah: stockSnaps[i].data().stok - item.qty,
        referensiId: saleRef.id,
        tanggal: transactionData.tanggal,
        performedBy: transactionData.salesId,
      });
    });
  });
}
```

---

## 8. Print Service Integration

Sama seperti modul Servis, menggunakan print service lokal dengan fallback:

```javascript
// Endpoint: POST http://localhost:3001/print/invoice
// Body: { transaction, items, store }
```

---

## 9. Row Numbering di Tabel Keranjang

> **PENTING**: Kolom pertama tabel keranjang adalah nomor urut (`No`) bukan bagian dari data item. Ini adalah penyebab bug `kodeText = 1, 2, 3` di versi lama.

Dalam Vue, nomor baris dihasilkan dari index array, bukan dari DOM:

```vue
<template>
  <tr v-for="(item, index) in cart.items" :key="item.kode">
    <td>{{ index + 1 }}</td>
    <!-- No (dari index) -->
    <td>{{ item.kodeText }}</td>
    <!-- Kode barang -->
    <td>{{ item.namaBarang }}</td>
    <!-- Nama barang -->
    <td>{{ item.qty }}</td>
    <td>{{ formatCurrency(item.harga) }}</td>
    <td>{{ formatCurrency(item.subtotal) }}</td>
    <td>
      <button @click="removeItem(index)">Hapus</button>
    </td>
  </tr>
</template>
```

Data disimpan per-objek di array, tidak dari DOM. Bug nth-child tidak mungkin terjadi di Vue.

---

## 10. Real-time Listener (Stok)

> **Problem dengan `onSnapshot(collection(db, 'stokAksesoris'))`: setiap write ke koleksi (penjualan, return, edit) mengirimkan re-delivery SEMUA dokumen yang berubah ke semua subscriber. Untuk koleksi dengan 100-300 item, ini sangat mahal.**

### Pola yang Benar: Catalog Cache-First + Targeted Sync

```javascript
// stores/accessories.js
async loadCatalog() {
  // Cache-first: skip fetch jika sudah ada di Pinia
  if (this.catalog.length > 0) return

  const snap = await getDocs(
    query(collection(db, 'stokAksesoris'), where('isActive', '==', true))
  )
  this.catalog = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Simpan timestamp untuk stale-while-revalidate
  this.catalogLoadedAt = Date.now()
},

async refreshSingleStock(kode) {
  // Dipanggil setelah sukses processSale / deleteTransaction
  // Hanya fetch 1 dokumen yang berubah, bukan seluruh koleksi
  const snap = await getDoc(doc(db, 'stokAksesoris', kode))
  if (!snap.exists()) return
  const idx = this.catalog.findIndex(c => c.kode === kode)
  if (idx !== -1) this.catalog[idx] = { id: snap.id, ...snap.data() }
  else this.catalog.push({ id: snap.id, ...snap.data() })
}
```

### Cross-tab Sync untuk Stok

```javascript
// Setelah processSale selesai:
function notifyStockChanged(kodes) {
  // kodes = array kode barang yang stoknya baru berubah
  localStorage.setItem("stokAksesorisChanged", JSON.stringify({ kodes, ts: Date.now() }));
}

// Di PenjualanView.vue dan TambahBarangView.vue:
onMounted(() => window.addEventListener("storage", handleStockSync));
onUnmounted(() => window.removeEventListener("storage", handleStockSync));

async function handleStockSync(e) {
  if (e.key !== "stokAksesorisChanged") return;
  const { kodes } = JSON.parse(e.newValue);
  // Hanya refresh item yang berubah (targeted getDoc)
  await Promise.all(kodes.map((k) => accessoriesStore.refreshSingleStock(k)));
}
```

**`onSnapshot(collection)` tidak digunakan** karena tidak ada halaman yang perlu live-update katalog stok secara kontinu. Sinkronisasi cukup via targeted `getDoc` setelah mutasi.

---

## 11. Route Guard & Permission

```javascript
{
  path: '/aksesoris/penjualan',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor', 'staf', 'admin_custom'] }
},
{
  path: '/aksesoris/data-penjualan',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor', 'staf', 'admin_custom'] }
},
{
  path: '/aksesoris/laporan-penjualan',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/aksesoris/tambah-barang',
  meta: { requiresAuth: true, roles: ['admin'] }
},
{
  path: '/aksesoris/return',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/aksesoris/laporan-stok',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/aksesoris/kelola-sales',
  meta: { requiresAuth: true, roles: ['admin'] }
}
```

---

## 12. Laporan Penjualan — Struktur Rekap

```
Laporan Penjualan
├── Filter periode (tanggal / bulan / range)
├── Summary cards
│   ├── Total Transaksi: N
│   ├── Total Pendapatan: Rp XXX
│   └── Total Item Terjual: N
├── Tabel detail transaksi (DataTables)
│   ├── Kolom: No, Tanggal, Invoice, Sales, Items, Total, Aksi
│   └── Expandable row untuk detail item per transaksi
├── Rekap per Sales (tabel ring)
│   └── Kolom: Sales, Transaksi, Total
└── Export (Excel / PDF)
```

---

## 13. Acceptance Criteria

- [ ] Transaksi penjualan tersimpan atomik: stok berkurang + record tersimpan dalam satu Firestore transaction
- [ ] Kolom "No" di tabel keranjang adalah nomor urut index (tidak mempengaruhi `kodeText`)
- [ ] Edit transaksi memerlukan verifikasi password supervisor; field kode dapat diubah
- [ ] Hapus transaksi merestore stok secara atomik
- [ ] Print invoice memanggil print service, fallback ke browser print
- [ ] Laporan filter per range tanggal menampilkan data akurat
- [ ] Export Excel dan PDF berhasil
- [ ] Search/sort DataTables berfungsi di semua tabel
- [ ] Return barang merestore stok secara otomatis
- [ ] Cross-tab: stok terupdate di tab lain setelah penjualan (targeted getDoc, bukan reload full koleksi)

---

## 14. Firestore Read Strategy

Mengacu pada [PRD-00 §16](./00-MIGRATION-OVERVIEW.md#16-strategi-optimasi-firestore-reads).

### 14.1 Keputusan Metode per Operasi

| Operasi                                  | Metode                  | Limit                              | Catatan                     |
| ---------------------------------------- | ----------------------- | ---------------------------------- | --------------------------- |
| Muat katalog `stokAksesoris`             | `getDocs` + Pinia cache | Semua (bounded ~300)               | Cache-first, load sekali    |
| Refresh stok setelah penjualan           | `getDoc` per kode       | 1 doc per kode                     | Targeted, bukan full reload |
| Transaksi hari ini (`DataPenjualanView`) | `onSnapshot`            | `where date==today` + `limit(200)` | Real-time justified         |
| Transaksi range (laporan)                | `getDocs`               | `limit(200)` + cursor              | One-shot, statis            |
| Validasi stok saat checkout              | Dari Pinia cache        | —                                  | 0 Firestore reads           |
| `stokAksesorisTransaksi`                 | **Tidak dibaca client** | —                                  | Write-only dari client      |

### 14.2 `loadTransactions` dengan Limit + Cursor

```javascript
// stores/accessories.js
async loadTransactions(startDate, endDate, lastDoc = null) {
  const constraints = [
    collection(db, 'penjualanAksesoris'),
    where('tanggal', '>=', startDate),
    where('tanggal', '<=', endDate),
    orderBy('tanggal', 'desc'),
    limit(200)
  ]
  if (lastDoc) constraints.push(startAfter(lastDoc))

  const q = query(...constraints)
  const snap = await getDocs(q)
  const newData = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  if (lastDoc) {
    this.transactions = [...this.transactions, ...newData]  // append (load more)
  } else {
    this.transactions = newData  // replace (initial load)
  }
  this.lastTransactionDoc = snap.docs[snap.docs.length - 1] ?? null
  this.hasMoreTransactions = snap.docs.length === 200
}
```

### 14.3 Validasi Stok saat Checkout

Stok dicek dari **Pinia cache** (sudah di-load saat mount), **bukan** via `getDoc` baru. Stok aktual divalidasi ulang hanya di dalam `runTransaction` saat commit:

```javascript
// Saat user tekan tombol checkout:
async function validateBeforeSubmit() {
  for (const item of cart.items) {
    const inCatalog = accessoriesStore.catalog.find((c) => c.kode === item.kode);
    if (!inCatalog || inCatalog.stok < item.qty) {
      throw new Error(`Stok ${item.kode} tidak cukup (cache check)`); // UI warning
    }
  }
  // Validasi final tetap ada di runTransaction (double check di Firestore)
  await processSale(cart.items, transactionData);
}
```

Ini mengurangi `getDoc` calls sebelum transaksi. Validasi server-side di `runTransaction` tetap menjadi safety net.

### 14.4 Estimasi Read Budget per Hari

| Operasi                                       | Reads/hari                  | Catatan                        |
| --------------------------------------------- | --------------------------- | ------------------------------ |
| Load catalog stok (session pertama)           | ~200-300 docs               | Sekali per session             |
| Load catalog (session berikutnya)             | 0                           | Pinia cache                    |
| onSnapshot transaksi hari ini                 | ~20-50 docs initial + delta | Justified                      |
| Refresh stok post-sale (3 item/transaksi avg) | ~3 reads × N transaksi      | Targeted getDoc                |
| Laporan (jika dibuka)                         | max 200 per query           | getDocs one-shot               |
| Penjualan (runTransaction reads per item)     | N item per transaksi        | Inherent dari transaksi atomik |
