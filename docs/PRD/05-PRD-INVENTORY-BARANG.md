# PRD-05: Modul Inventory Barang

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Inventory Barang mengelola stok emas dan perhiasan fisik di brankas. Berbeda dengan modul Aksesoris, modul ini bekerja dengan perhiasan bernilai tinggi (emas, berlian, dll) yang dikategorikan ke 9 kategori utama. Fitur utama meliputi manajemen stok brankas, log audit harian, snapshot stok, dan laporan stok harian.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama           | Route Vue Baru              | Deskripsi                     |
| ------------------------ | --------------------------- | ----------------------------- |
| `manajemenStok.html`     | `/inventory/manajemen`      | CRUD stok brankas             |
| `laporanStokHarian.html` | `/inventory/laporan-harian` | Laporan log stok harian       |
| `mutasiKode.html`        | `/inventory/mutasi-kode`    | Mutasi/pindah kode barang     |
| `restokBarang.html`      | `/inventory/restok`         | Input restok barang masuk     |
| `buyback.html`           | `/inventory/buyback`        | Proses buyback dari pelanggan |
| `order-barang.html`      | `/inventory/order`          | Order barang ke supplier      |

---

## 3. Firebase Data Model

### 3.1 Firestore Collections

#### `brankas/{docId}`

```javascript
{
  kode: string,              // Kode barang unik
  nama: string,              // Nama/deskripsi barang
  kategori: string,          // Salah satu dari 9 kategori (lihat 3.2)
  subKategori: string,       // Sub-kategori (lihat 3.3)

  // Stok per lokasi
  stokBrankas: number,
  stokBelumPosting: number,
  stokDisplay: number,
  stokRusak: number,
  stokBatuLepas: number,
  stokManual: number,
  stokAdmin: number,
  stokDP: number,
  stokLainnya: number,

  // Total dihitung
  stokTotal: number,         // sum semua stok

  // Metadata
  berat: number,             // gram
  karatase: string,          // '24K' | '22K' | '18K' | '17K' | '16K'
  isActive: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastUpdatedBy: string      // employeeId
}
```

#### `daily_stock_logs/{logId}`

```javascript
{
  kode: string,              // Referensi ke brankas
  nama: string,
  kategori: string,
  subKategori: string,
  tanggal: string,           // YYYY-MM-DD (WITA)
  waktu: string,             // HH:mm:ss (WITA)

  // Perubahan
  aksi: string,              // 'TAMBAH_STOK' | 'KURANGI_STOK' | 'EDIT' | 'HAPUS' | 'PINDAH_KODE'
  kolom: string,             // Kolom stok yang berubah (mis: 'stokBrankas')
  nilaiBefore: number,
  nilaiAfter: number,
  selisih: number,

  // Konteks
  keterangan: string,        // "stock awal {before} {userName} {action}"
  performedBy: string,       // employeeId
  performedByName: string,
  referensiId: string        // Jika terkait transaksi lain
}
```

#### `dailyStockSnapshot/{date}`

```javascript
{
  tanggal: string,           // YYYY-MM-DD (key dokumen)
  generatedAt: Timestamp,
  generatedBy: string,
  snapshot: {
    [kode]: {
      ...brankasData,
      stokTotal: number
    }
  }
}
```

#### `systemLocks/{lockId}`

```javascript
{
  lockedAt: Timestamp,
  lockedBy: string,
  operation: string,         // 'SNAPSHOT' | 'RESTOK'
  expiresAt: Timestamp       // Auto-expire if crash
}
```

### 3.2 Kategori Utama (9 Kategori)

| No  | Kategori            |
| --- | ------------------- |
| 1   | KALUNG              |
| 2   | LIONTIN             |
| 3   | ANTING              |
| 4   | CINCIN              |
| 5   | HALA & SDW          |
| 6   | GELANG              |
| 7   | GIWANG              |
| 8   | KENDARI & EMAS BALI |
| 9   | BERLIAN             |

### 3.3 Sub-Kategori Stok

| Key                | Label         |
| ------------------ | ------------- |
| `stokBrankas`      | Stok Brankas  |
| `stokBelumPosting` | Belum Posting |
| `stokDisplay`      | Display       |
| `stokRusak`        | Rusak         |
| `stokBatuLepas`    | Batu Lepas    |
| `stokManual`       | Manual        |
| `stokAdmin`        | Admin         |
| `stokDP`           | DP            |
| `stokLainnya`      | Lainnya       |

---

## 4. User Stories

### 4.1 Manajemen Stok (/inventory/manajemen)

| ID       | Sebagai | Saya ingin                                               | Agar                            |
| -------- | ------- | -------------------------------------------------------- | ------------------------------- |
| US-MS-01 | Admin   | CRUD data barang brankas                                 | Kelola katalog stok emas        |
| US-MS-02 | Admin   | Update stok per sub-kategori                             | Catat perpindahan stok internal |
| US-MS-03 | Admin   | Filter tabel per kategori                                | Mudah cari barang               |
| US-MS-04 | Admin   | Lihat total stok per kategori                            | Summary kondisi brankas         |
| US-MS-05 | Admin   | Audit trail otomatis setiap perubahan                    | Jejak perubahan stok            |
| US-MS-06 | Admin   | Cross-tab sync: perubahan di satu tab muncul di tab lain | Konsistensi data multi-user     |
| US-MS-07 | Admin   | Export data stok ke Excel/PDF                            | Laporan fisik untuk manajemen   |

### 4.2 Laporan Stok Harian (/inventory/laporan-harian)

| ID       | Sebagai | Saya ingin                              | Agar                        |
| -------- | ------- | --------------------------------------- | --------------------------- |
| US-LH-01 | Admin   | Lihat log semua perubahan stok per hari | Audit trail harian          |
| US-LH-02 | Admin   | Filter log per tanggal/kategori/kode    | Cari perubahan tertentu     |
| US-LH-03 | Admin   | Generate snapshot stok hari ini         | Rekap kondisi stok per hari |
| US-LH-04 | Admin   | Export laporan harian ke Excel/PDF      | Arsip laporan fisik         |

### 4.3 Mutasi Kode (/inventory/mutasi-kode)

| ID       | Sebagai | Saya ingin                                 | Agar                        |
| -------- | ------- | ------------------------------------------ | --------------------------- |
| US-MK-01 | Admin   | Pindahkan stok dari satu kode ke kode lain | Restrukturisasi kode barang |
| US-MK-02 | Admin   | Audit trail mutasi kode tersimpan          | Kejelasan histori perubahan |

### 4.4 Restok Barang (/inventory/restok)

| ID       | Sebagai | Saya ingin                         | Agar                    |
| -------- | ------- | ---------------------------------- | ----------------------- |
| US-RB-01 | Admin   | Input barang masuk dari supplier   | Stok bertambah          |
| US-RB-02 | Admin   | Konfirmasi dengan distributed lock | Tidak ada double update |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/inventory/
├── ManajemenStokView.vue      # Tabel stok brankas + CRUD
├── LaporanStokHarianView.vue  # Log + snapshot
├── MutasiKodeView.vue         # Form mutasi kode
├── RestokBarangView.vue       # Form restok
├── BuybackView.vue            # Proses buyback
└── OrderBarangView.vue        # Order barang
```

### 5.2 Komponen Khusus Inventory

```
src/components/inventory/
├── StockTable.vue              # Tabel stok dengan kolom sub-kategori
├── StockEditModal.vue          # Modal edit stok per sub-kategori
├── StockAddModal.vue           # Modal tambah barang baru
├── CategoryFilterBar.vue       # Filter kategori aktif (tab/pill)
├── StockSummaryCard.vue        # Kartu summary per kategori
├── AuditLogTable.vue           # Tabel log perubahan stok
├── SnapshotButton.vue          # Tombol generate snapshot + loading
├── MutasiKodeForm.vue          # Form mutasi kode
├── RestokForm.vue              # Form restok barang
└── LockIndicator.vue           # Indikator distributed lock aktif
```

### 5.3 Composables

```javascript
// composables/useStockWITA.js
export function useStockWITA() {
  // Timezone WITA (UTC+8) untuk semua timestamp stok
  const toWITA = (date) => {
    const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return utc8;
  };
  const nowWITA = () => toWITA(new Date());
  const dateStringWITA = () => {
    const d = nowWITA();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return { toWITA, nowWITA, dateStringWITA };
}

// composables/useDistributedLock.js
export function useDistributedLock() {
  const acquireLock = async (operation, userId) => {
    // Gunakan Firestore transaction untuk cek + set lock
    // Set expiresAt = now + 30 detik (auto-expire jika crash)
  };
  const releaseLock = async (lockId) => {};
  const checkLock = async (operation) => {};
  return { acquireLock, releaseLock, checkLock };
}

// composables/useStockAudit.js
export function useStockAudit() {
  const logChange = async (kode, kolom, before, after, aksi, userName) => {
    // Simpan ke daily_stock_logs
    // Format keterangan: "stock awal {before} {userName} {aksi}"
  };
  return { logChange };
}
```

---

## 6. Pinia Store — `stockStore`

```javascript
// stores/stock.js
export const useStockStore = defineStore("stock", {
  state: () => ({
    brankasData: [], // Array semua item brankas
    activeCategory: "ALL", // Filter aktif
    dailyLogs: [], // Log hari yang sedang dilihat
    isLoading: false,
    lastSyncAt: null,
  }),
  actions: {
    async loadBrankasData() {
      // Cache-first: skip fetch jika sudah ada di Pinia
      if (this.brankasData.length > 0) return;

      const snap = await getDocs(query(collection(db, "brankas"), where("isActive", "!=", false)));
      this.brankasData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this.lastSyncAt = Date.now();
    },
    async updateStock(kode, updates, userName) {
      // Gunakan Firestore transaction
      // Update brankas
      // Log semua perubahan ke daily_stock_logs
      // Notify cross-tab dengan kode spesifik
      notifyBrankasChanged(kode);
    },
    async refreshSingleItem(kode) {
      // Targeted getDoc — dipanggil dari cross-tab sync
      const snap = await getDoc(doc(db, "brankas", kode));
      if (!snap.exists()) return;
      const idx = this.brankasData.findIndex((b) => b.kode === kode);
      const updated = { id: snap.id, ...snap.data() };
      if (idx !== -1) this.brankasData[idx] = updated;
      else this.brankasData.push(updated);
    },
    async generateDailySnapshot() {
      // Acquire distributed lock
      // getDocs(brankas) — one-shot untuk snapshot
      // Buat snapshot dokumen di dailyStockSnapshot/{today}
      // Release lock
    },
    async loadDailyLogs(date, lastDoc = null) {
      // Query dengan limit + cursor pagination
      const constraints = [
        collection(db, "daily_stock_logs"),
        where("tanggal", "==", date),
        orderBy("waktu", "asc"),
        limit(200),
      ];
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const snap = await getDocs(query(...constraints));
      const newLogs = snap.docs.map((d) => d.data());
      this.dailyLogs = lastDoc ? [...this.dailyLogs, ...newLogs] : newLogs;
      this.lastLogDoc = snap.docs[snap.docs.length - 1] ?? null;
      this.hasMoreLogs = snap.docs.length === 200;
    },
  },
  getters: {
    filteredData: (state) => {
      if (state.activeCategory === "ALL") return state.brankasData;
      return state.brankasData.filter((b) => b.kategori === state.activeCategory);
    },
    summaryByCategory: (state) => {
      // Group by kategori, sum stokTotal
    },
  },
});
```

---

## 7. Cross-Tab Synchronization

Karena modul inventory digunakan di beberapa tab browser secara bersamaan, sinkronisasi harus **targeted** (hanya refresh dokumen yang berubah), bukan full reload seluruh koleksi:

```javascript
// Saat update stok berhasil, kirim sinyal dengan kode yang berubah
function notifyBrankasChanged(kode) {
  localStorage.setItem("brankasChanged", JSON.stringify({ kode, ts: Date.now() }));
}

// Di ManajemenStokView.vue
async function handleStorageChange(event) {
  if (event.key !== "brankasChanged") return;
  const { kode } = JSON.parse(event.newValue);
  // Hanya fetch 1 dokumen yang berubah — bukan reload seluruh koleksi
  await stockStore.refreshSingleItem(kode);
}

onMounted(() => window.addEventListener("storage", handleStorageChange));
onUnmounted(() => window.removeEventListener("storage", handleStorageChange));
```

```javascript
// stores/stock.js — targeted refresh
async refreshSingleItem(kode) {
  const snap = await getDoc(doc(db, 'brankas', kode))
  if (!snap.exists()) return
  const idx = this.brankasData.findIndex(b => b.kode === kode)
  const updated = { id: snap.id, ...snap.data() }
  if (idx !== -1) this.brankasData[idx] = updated
  else this.brankasData.push(updated)
}
```

> **Mengapa tidak `onSnapshot` untuk brankas?** Koleksi `brankas` tidak berubah secara kontinu (hanya saat admin edit). `onSnapshot` akan memuat ulang semua dokumen saat listener pertama kali aktif. Cukup gunakan `getDocs` sekali + targeted refresh.

---

## 8. Distributed Lock (Snapshot)

Generate daily snapshot adalah operasi critical yang tidak boleh berjalan bersamaan:

```javascript
// Firestore transaction untuk acquire lock
export async function generateSnapshot(userId) {
  const lockRef = doc(db, "systemLocks", "dailySnapshot");
  const snapshotRef = doc(db, "dailyStockSnapshot", getTodayWITA());

  await runTransaction(db, async (t) => {
    const lock = await t.get(lockRef);

    // Cek apakah lock sudah expired (> 30 detik)
    if (lock.exists() && lock.data().expiresAt.toMillis() > Date.now()) {
      throw new Error("Snapshot sedang diproses oleh pengguna lain");
    }

    // Set lock
    t.set(lockRef, {
      lockedBy: userId,
      lockedAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30000),
      operation: "SNAPSHOT",
    });
  });

  try {
    // Lakukan snapshot
    const allStock = await getDocs(collection(db, "brankas"));
    const snapshot = {};
    allStock.docs.forEach((d) => {
      snapshot[d.data().kode] = d.data();
    });
    await setDoc(snapshotRef, { tanggal: getTodayWITA(), generatedBy: userId, snapshot });
  } finally {
    // Release lock
    await deleteDoc(lockRef);
  }
}
```

---

## 9. Timezone WITA

Semua operasi stok menggunakan timezone WITA (UTC+8). Di Vue/JS:

```javascript
// Jangan gunakan new Date().toLocaleDateString() karena tergantung browser locale
// Gunakan fungsi eksplisit:
export function getNowWITA() {
  const now = new Date();
  const offsetMs = 8 * 60 * 60 * 1000; // WITA = UTC+8
  return new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);
}

export function getTodayStringWITA() {
  const d = getNowWITA();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

---

## 10. Audit Trail Format

Setiap update stok menghasilkan log di `daily_stock_logs` dengan format keterangan:

```
"stock awal {nilaiAsli} {namaUser} {aksi}"
```

Contoh: `"stock awal 5 Budi TAMBAH_STOK"`, `"stock awal 3 Admin123 EDIT"`

---

## 11. Route Guard & Permission

```javascript
{
  path: '/inventory/manajemen',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/inventory/laporan-harian',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/inventory/mutasi-kode',
  meta: { requiresAuth: true, roles: ['admin'] }
},
{
  path: '/inventory/restok',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/inventory/buyback',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
}
```

---

## 12. Laporan Stok Harian — Format

```
Laporan Stok Harian
├── Header: Tanggal, Total item berubah
├── Filter: tanggal, kategori, kode, aksi
├── Tabel Log
│   ├── Waktu (WITA)
│   ├── Kode
│   ├── Nama Barang
│   ├── Kategori
│   ├── Sub-Kategori
│   ├── Aksi (badge warna berbeda per tipe)
│   ├── Sebelum
│   ├── Sesudah
│   ├── Selisih (+/-)
│   └── Diubah Oleh
├── Tombol Generate Snapshot (dengan distributed lock)
└── Export Excel / PDF
```

---

## 13. Acceptance Criteria

- [ ] CRUD barang brankas tersimpan ke Firestore dengan audit log otomatis
- [ ] Setiap perubahan stok menghasilkan dokumen di `daily_stock_logs`
- [ ] Cross-tab sync hanya fetch dokumen yang berubah (targeted `getDoc`), bukan reload seluruh koleksi
- [ ] Generate daily snapshot menggunakan distributed lock (tidak bisa paralel)
- [ ] Timezone WITA digunakan konsisten di semua timestamp dan tanggal
- [ ] Filter per kategori di tabel manajemen stok responsif dan cepat (filter dari Pinia, bukan re-fetch)
- [ ] Export laporan harian Excel & PDF berhasil
- [ ] Mutasi kode menghasilkan log yang mencatat kode asal dan kode tujuan
- [ ] Restok barang mengupdate stok secara atomik

---

## 14. Firestore Read Strategy

Mengacu pada [PRD-00 §16](./00-MIGRATION-OVERVIEW.md#16-strategi-optimasi-firestore-reads).

### 14.1 Keputusan Metode per Operasi

| Operasi                             | Metode                   | Limit                | Catatan                              |
| ----------------------------------- | ------------------------ | -------------------- | ------------------------------------ |
| Load `brankas` koleksi              | `getDocs` + Pinia cache  | Semua (bounded ~500) | Cache-first, load sekali per session |
| Refresh setelah CRUD                | `getDoc` per kode        | 1 doc                | Targeted, bukan full reload          |
| Cross-tab sync                      | `getDoc` per kode terima | 1 doc                | Hanya doc yang berubah               |
| `daily_stock_logs` per hari         | `getDocs` + `limit(200)` | 200 + cursor         | Pagination jika hari sibuk           |
| `daily_stock_logs` range laporan    | `getDocs` + `limit(500)` | 500 + cursor         | Statis, getDocs                      |
| `dailyStockSnapshot` (baca laporan) | `getDoc` per tanggal     | 1 doc                | Satu snapshot per hari               |
| Generate snapshot                   | `getDocs` brankas        | Semua                | One-off, acceptable                  |

### 14.2 Required Composite Indexes

Query berikut memerlukan composite index yang harus didefinisikan di `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "daily_stock_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tanggal", "order": "ASCENDING" },
        { "fieldPath": "waktu", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "daily_stock_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tanggal", "order": "ASCENDING" },
        { "fieldPath": "kode", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "brankas",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "kategori", "order": "ASCENDING" },
        { "fieldPath": "kode", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 14.3 Filter Kategori — Dilakukan di Client (Pinia Getter)

Filter per kategori **tidak boleh** memicu query Firestore baru. Semua data sudah di Pinia:

```javascript
// Benar: filter dari memori Pinia
const filtered = stockStore.brankasData.filter((b) => b.kategori === "KALUNG");

// Salah: query baru ke Firestore hanya untuk filter kategori
const q = query(collection(db, "brankas"), where("kategori", "==", "KALUNG"));
```

### 14.4 `daily_stock_logs` Pagination

Sebuah toko yang aktif bisa menghasilkan 100-300 log per hari. Gunakan pagination:

```javascript
// Di LaporanStokHarianView.vue
const { loadDailyLogs } = useStockStore();

// Load awal
await loadDailyLogs(selectedDate);

// Load more (tombol "Tampilkan lebih banyak")
async function loadMore() {
  if (!stockStore.hasMoreLogs) return;
  await loadDailyLogs(selectedDate, stockStore.lastLogDoc);
}
```

### 14.5 Estimasi Read Budget per Hari

| Operasi                            | Reads/hari                    | Catatan            |
| ---------------------------------- | ----------------------------- | ------------------ |
| Load brankas (session pertama)     | ~200-500 docs                 | Sekali per session |
| Load brankas (session berikutnya)  | 0                             | Pinia cache        |
| CRUD stok (misal 10 update/hari)   | 10 reads (getDoc) + 10 writes | Targeted refresh   |
| Cross-tab sync (10 update × 2 tab) | ~20 reads                     | Targeted getDoc    |
| Load log harian                    | max 200 per page              | getDocs            |
| Generate snapshot                  | ~200-500 reads                | One-off per hari   |
