# PRD: Manajemen Servis (Servis Stock Management)

**Versi:** 1.0  
**Status:** Draft  
**Tanggal:** May 2, 2026  
**Owner:** Product Team

---

## 1. Executive Summary

Fitur **Manajemen Servis** adalah sistem tracking dan reconciliation untuk memastikan data servis di sistem sesuai dengan **fisik barang yang ada di toko/gudang**. Sistem ini dirancang mirip dengan **Manajemen Stok** (untuk aksesoris), tetapi dengan dimensi tambahan yaitu **waktu penyimpanan** dan **status multi-tahap** (belum selesai, sudah selesai belum diambil, sudah diambil).

**Goal utama:**

- Rekonsiliasi data sistem dengan fisik barang servis
- Tracking barang servis yang menumpuk (terutama yang >30 hari belum diambil)
- Audit trail untuk setiap perubahan data fisik
- Dashboard overview untuk manajemen inventory servis

---

## 2. Problem Statement

### 2.1 Challenge Utama: Multi-Bulan Servis

**Kondisi Real:**

```
Contoh Kasus:
- 10 Jan 2026: Servis A masuk (status: Belum Selesai)
- 15 Jan 2026: Servis A selesai (status: Sudah Selesai, Belum Diambil)
- 02 May 2026: Servis A MASIH di toko, belum diambil (~3.5 bulan!)
- Customer "hilang" atau lupa, atau sulit dihubungi
```

**Masalah yang timbul:**

1. **Data sistem vs fisik tidak jelas** → tidak tahu berapa barang servis yang benar-benar ada di toko
2. **Penumpukan barang** → memakan ruang, sulit dikelola
3. **Tidak ada visibility** → kapan servis diterima, siapa yang handle, posisi barang saat ini
4. **Risk kehilangan barang** → terutama servis berharga tinggi yang sudah lama tidak diambil
5. **Disparity detection terlambat** → baru ketahuan ada barang hilang saat reconciliation

### 2.2 Requirement dari User

1. **Dashboard Card (Real-time dari Sistem):**
   - Servis (Belum Selesai): jumlah dari koleksi dengan `statusServis = "Belum Selesai"`
   - Servis (Sudah Selesai & Belum Diambil): jumlah dengan `statusServis = "Sudah Selesai"` & `statusPengambilan = "Belum Diambil"`
   - Servis (Sudah Selesai & Sudah Diambil): jumlah dengan `statusServis = "Sudah Selesai"` & `statusPengambilan = "Sudah Diambil"`
   - Custom (Belum Selesai), Custom (Sudah Selesai & Belum Diambil), Custom (Sudah Selesai & Sudah Diambil)

2. **Section Input Fisik Barang:**
   - Form sederhana: input jumlah pcs barang fisik yang ada di toko
   - Grouped by **bulan** (auto-generated dari `bulan` field)
   - Tipe: Servis atau Custom
   - Field: Bulan, Tipe, Jumlah Pcs, Catatan (opsional)

3. **Tab View untuk Reconciliation:**
   - Tab 1: Servis (Sudah Selesai & Belum Diambil)
   - Tab 2: Custom (Sudah Selesai & Belum Diambil)
   - Tabel per tab dengan kolom: No, Bulan, Data Sistem, Fisik Barang, Aksi, Status, Riwayat

4. **Kolom Status:**
   - **Klop**: Data sistem = Fisik barang (jumlah sama)
   - **Kurang**: Fisik barang < Data sistem (ada barang hilang/rusak)
   - **Lebih**: Fisik barang > Data sistem (ada barang ekstra di toko yang tidak terdaftar)

---

## 3. Solution Architecture

### 3.1 Data Model

#### Collection: `servis_management`

**Document: `{userId}/{tipe}/{bulan}`**

```javascript
{
  // Metadata
  id: "servis_servis_202501",
  bulan: "2025-01",  // Format: YYYY-MM
  tipe: "servis",    // atau "custom"
  userId: "admin@melati.com",
  createdAt: ISO8601,
  updatedAt: ISO8601,

  // Fisik Barang Data (Manual Input)
  fisikBarangQty: 10,  // Total jumlah pcs barang fisik yang ada di toko

  // Sistem Data (calculated from firestore servis collection)
  sistemDataQty: 12,   // Total dari koleksi servis sesuai filter status

  // Reconciliation Status
  status: "kurang",    // "klop", "kurang", "lebih"
  variance: -2,        // fisikBarangQty - sistemDataQty
  lastUpdatedBy: "supervisor@melati.com",
  lastUpdatedAt: ISO8601,
  updateNotes: "Verifikasi stok fisik",

  // History
  history: [
    {
      timestamp: ISO8601,
      fisikQtyBefore: 8,
      fisikQtyAfter: 10,
      status: "kurang",
      variance: -2,
      updatedBy: "admin@melati.com",
      notes: "Update verifikasi stok"
    }
  ]
}
```

### 3.2 UI Screens

#### Screen 1: Manajemen Servis Dashboard

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Manajemen Servis                                  [Pilih Bulan] │
└─────────────────────────────────────────────────────────────────┘

┌──── RINGKASAN SISTEM ────────────────────────────────────────┐
│  ┌─────────────────┬──────────────────┬──────────────────┐  │
│  │ Servis          │ Servis           │ Servis           │  │
│  │ Belum Selesai   │ Sudah Selesai &  │ Sudah Diambil    │  │
│  │                 │ Belum Diambil    │                  │  │
│  │ 23              │ 45               │ 234              │  │
│  ├─────────────────┼──────────────────┼──────────────────┤  │
│  │ Custom          │ Custom           │ Custom           │  │
│  │ Belum Selesai   │ Sudah Selesai &  │ Sudah Diambil    │  │
│  │                 │ Belum Diambil    │                  │  │
│  │ 5               │ 12               │ 89               │  │
│  └─────────────────┴──────────────────┴──────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──── INPUT FISIK BARANG (RECONCILIATION) ───────────────────┐
│ Bulan: [Dropdown: Jan 2025, Feb 2025, Des 2025, Kustom]    │
│ Tipe:  [Radio: Servis | Custom]                             │
│                                                               │
│ ┌─ Form Input ────────────────────────────────────────────┐ │
│ │ Bulan:  [Pilih: Mei 2026]                              │ │
│ │ Tipe:   [Radio: ● Servis   ○ Custom]                  │ │
│ │ Jumlah Pcs:  [___] pcs                                 │ │
│ │ Catatan: [_____________________]                       │ │
│ │                [Batal] [Simpan]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──── TAB RECONCILIATION ─────────────────────────────────────┐
│ [Servis (Belum Diambil)] [Custom (Belum Diambil)]           │
└──────────────────────────────────────────────────────────────┘
(Lihat Screen 2 & 3)
```

#### Screen 2: Tab Servis (Sudah Selesai & Belum Diambil)

**Tabel Reconciliation:**

```
┌─────┬───────────┬─────────────┬──────────────┬───────────────────┬──────────┬─────────────┐
│ No  │ Bulan     │ Data Sistem │ Fisik Barang │ Aksi              │ Status   │ Riwayat     │
├─────┼───────────┼─────────────┼──────────────┼───────────────────┼──────────┼─────────────┤
│ 1   │ 2025-01   │ 12          │ 10           │ [Update]          │ Kurang   │ [Lihat]     │
│     │           │             │ (last: ...)  │                   │ (-2)     │             │
├─────┼───────────┼─────────────┼──────────────┼───────────────────┼──────────┼─────────────┤
│ 2   │ 2024-12   │ 8           │ 8            │ [Update]          │ Klop     │ [Lihat]     │
│     │           │             │ (last: ...) │                   │          │             │
├─────┼───────────┼─────────────┼──────────────┼───────────────────┼──────────┼─────────────┤
│ 3   │ 2024-11   │ 5           │ 7            │ [Update]          │ Lebih    │ [Lihat]     │
│     │           │             │ (last: ...) │                   │ (+2)     │             │
└─────┴───────────┴─────────────┴──────────────┴───────────────────┴──────────┴─────────────┘

Catatan:
- "Data Sistem" = count dari koleksi servis dengan statusServis="Sudah Selesai" & statusPengambilan="Belum Diambil" & tanggal dalam bulan itu
- "Fisik Barang" = nilai input dari collection servis_management (diupdate manual oleh user)
- "Update" = modal untuk update fisik barang untuk bulan ini
```

#### Screen 3: Modal Update Fisik Barang

**Saat user klik [Update] pada row tertentu:**

```
┌──────────────────────────────────────────────┐
│ Update Fisik Barang - Mei 2026 (Servis)     │
├──────────────────────────────────────────────┤
│                                              │
│ Data Sistem: 12 pcs                          │
│ Fisik Barang saat ini: 10 pcs                │
│ Status: Kurang 2 pcs                         │
│                                              │
│ Jumlah Pcs Fisik Baru:  [12] pcs             │
│                                              │
│ Catatan:                                     │
│ [_______________________________________]    │
│ (misal: 2 pcs hilang, perlu verifikasi)     │
│                                              │
│ [Batal] [Simpan]                             │
└──────────────────────────────────────────────┘
```

---

## 4. Detailed Requirements

### 4.1 Feature Requirements

#### FR-1: Dashboard Card Summary (Real-time)

- **Scope:** Display-only, auto-update dari Firestore servis collection
- **Calculation:** Grouping by `statusServis` + `statusPengambilan` + `jenisInput`
- **Refresh:** Real-time listener atau interval 30 detik
- **Card Count:** 6 cards (3 for Servis, 3 for Custom)
- **Color Coding:**
  - Belum Selesai: Warning (Orange)
  - Sudah Selesai & Belum Diambil: Info (Blue)
  - Sudah Diambil: Success (Green)

#### FR-2: Input Fisik Barang

- **Input Method:** Form sederhana dengan field: Bulan, Tipe, Jumlah Pcs, Catatan
- **Month Selection:** Auto-detect current month, bisa custom pilih bulan lain
- **Type Selection:** Servis atau Custom
- **Save Destination:** `servis_management/{userId}/{tipe}/{bulan}` (upsert, hanya satu record per tipe per bulan)
- **Validation:**
  - Jumlah Pcs >= 0
  - Catatan optional
- **Duplicate Handling:** Jika sudah ada record untuk bulan+tipe yang sama, update (replace) nilai sebelumnya

#### FR-3: Reconciliation Tab - Servis (Belum Diambil)

- **Data Source:**
  - **Sistem:** Count dari `servis` collection dengan `statusServis="Sudah Selesai"` AND `statusPengambilan="Belum Diambil"`, group by bulan
  - **Fisik:** Query `servis_management` collection dengan `tipe="servis"`, ambil `fisikBarangQty` per bulan
- **Calculation:**
  - `Status = "Klop"` jika `fisikQty == sistemQty`
  - `Status = "Kurang"` jika `fisikQty < sistemQty` (ada diskrepansi, barang kurang di toko)
  - `Status = "Lebih"` jika `fisikQty > sistemQty` (ada diskrepansi, barang lebih di toko)
  - `Variance = fisikQty - sistemQty`

#### FR-4: Reconciliation Tab - Custom (Belum Diambil)

- Same as FR-3 but for `jenisInput="custom"`

#### FR-5: Action - Update Fisik Barang

- **Modal Form:**
  - Show current fisikBarangQty dan sistemDataQty
  - Status indicator (Klop / Kurang / Lebih)
  - Input field untuk update fisikBarangQty (angka pcs baru)
  - Textbox untuk catatan reconciliation
- **Save Logic:**
  - Update `servis_management/{userId}/{tipe}/{bulan}.fisikBarangQty`
  - Recalculate `status` dan `variance` otomatis
  - Log entry ke `history` array dengan before/after values
  - Update `lastUpdatedBy` dan `lastUpdatedAt`
- **Permissions:** Supervisor atau Admin only

#### FR-6: Riwayat Modal

- **Display:**
  - Timeline of changes untuk month/tipe tertentu
  - Setiap entry: timestamp, action, user, changes (before/after), notes
  - Pagination jika history > 10 entries
- **Read-only:** Display only

#### FR-7: Discrepancy Notes (Future Enhancement)

- **For Now:** Catatan di field `updateNotes` cukup untuk mencatat alasan diskrepansi
- **Future:** Bisa tambah form "Report Missing Items" untuk track barang hilang lebih detail

---

## 5. Challenge Deep Dive: Multi-Bulan Servis

### 5.1 Problem Breakdown

**Case 1: Servis dari Januari masih belum diambil di May**

Sistem akan menampilkan:

```
Bulan: 2025-01
Data Sistem: 5 item (masih status "Belum Diambil")
Fisik Barang: 3 item (2 hilang? atau customer sudah ambil tapi tidak terekam?)
Status: KURANG (-2)
```

**Pertanyaan yang muncul:**

- Barang mana yang hilang?
- Siapa customer? Bisa dihubungi?
- Berapa nilai barang yang hilang?
- Kapan terakhir customer dihubungi?

### 5.2 Solution: Bucketing Strategy

**Approach: Combine Data dari 2 Sumber**

```javascript
// Pseudo-logic untuk display
const displayData = [];

// Source 1: Group servis data by bulan
const servisByMonth = {};
servisCollection.forEach(servis => {
  if (servis.statusServis === "Sudah Selesai" &&
      servis.statusPengambilan === "Belum Diambil") {
    const month = formatMonth(servis.tanggal); // "2025-01"
    if (!servisByMonth[month]) {
      servisByMonth[month] = {
        items: [],
        count: 0,
        totalValue: 0
      };
    }
    servisByMonth[month].items.push({
      id: servis.id,
      customer: servis.namaCustomer,
      barang: servis.namaBarang,
      ongkos: servis.totalOngkos,
      tanggal: servis.tanggal,
      telahDihubungi: servis.waktuDihubungiTerakhir
    });
    servisByMonth[month].count++;
    servisByMonth[month].totalValue += servis.totalOngkos;
  }
});

// Source 2: Get fisik data from servis_management
const managementByMonth = {};
servisManagementCollection.forEach(doc => {
  const month = doc.bulan; // "2025-01"
  managementByMonth[month] = {
    count: doc.fisikBarang.total,
    items: doc.fisikBarang.itemDetails,
    status: doc.status,
    reconciled: doc.reconciled
  };
});

// Merge untuk display
const allMonths = new Set([...Object.keys(servisByMonth), ...Object.keys(managementByMonth)]);
allMonths.forEach(month => {
  displayData.push({
    bulan: month,
    sistemCount: servisByMonth[month]?.count || 0,
    fisikCount: managementByMonth[month]?.count || 0,
    status: calculateStatus(...),
    variance: fisikCount - sistemCount,
    sistmeDetails: servisByMonth[month]?.items || [],
    fisikDetails: managementByMonth[month]?.items || []
  });
});
```

### 5.3 Handling "Hilang/Ekstra"

**For "Kurang" Status:**

- Link setiap fisik item ke sistem item (by customer name match)
- Highlight items di sistem yang tidak ada di fisik
- Option untuk "mark as lost" dengan timestamp dan reason

**For "Lebih" Status:**

- Might be data entry error
- Option untuk create new servis record atau update existing
- Flag untuk manual verification

### 5.4 Edge Cases

| Case                          | Sistem | Fisik | Status | Action                             |
| ----------------------------- | ------ | ----- | ------ | ---------------------------------- |
| Normal (old backlog)          | 10     | 10    | Klop   | Just verify, no action             |
| Lost item                     | 10     | 8     | Kurang | Report to customer, update system? |
| New unregistered item         | 10     | 12    | Lebih  | Create missing servis entry        |
| Mixed (some lost, some extra) | 10     | 10    | Klop   | Verify each item manually          |
| Month with no servis          | 0      | 5     | Lebih  | Items tidak terdaftar, investigate |

---

## 6. UI/UX Considerations

### 6.1 Display Formatting

**Month Display:**

- Default: Current month (May 2026)
- Option: Dropdown with last 12 months + custom date picker
- Format: "Mei 2026" (ID locale) or "2026-05"

**Status Badges:**

```css
.status-klop {
  background: #28a745;
  color: white;
} /* Green */
.status-kurang {
  background: #dc3545;
  color: white;
} /* Red */
.status-lebih {
  background: #ffc107;
  color: black;
} /* Yellow */
```

**Number Formatting:**

- Qty: Plain integer
- Value: `Rp X,XXX,XXX` (ID locale)

---

## 7. Technical Specifications & Firestore Optimization

### 7.1 Database Schema

**Firestore Structure:**

```
/servis_management
  /{userId}
    /servis
      /2025-01
        bulan: "2025-01"
        tipe: "servis"
        fisikBarangQty: 10
        sistemDataQty: 12
        status: "kurang"
        variance: -2
        lastUpdatedBy: "admin@melati.com"
        lastUpdatedAt: ISO8601
        updateNotes: "Verifikasi stok fisik"
        history: [...]
      /2025-02
      /2024-12
    /custom
      /2025-01
      /2025-02
```

### 7.2 Real-time Sync Strategy

**DO NOT POLL** (polling 300x multiplies reads):

**Dashboard Cards:**

- Option A (Recommended): Single real-time listener on servis collection
  - Attach once on component mount
  - Auto-update when data changes
  - Detach on unmount
  - Reads only on actual data change (not interval)

- Option B (Simple): Load on-demand with manual "Refresh" button
  - Zero auto-reads
  - User controls when to refresh
  - One read per click

**Reconciliation Tabs:**

- Fetch on tab click (not auto-refresh)
- Cache locally for 5 minutes
- Manual refresh button available
- Lazy load history (only when user clicks)

### 7.3 Performance Optimization & Firestore Read Analysis

#### 7.3.1 Critical Read Patterns

**FR-1: Dashboard Cards (Potential 6x reads if not optimized)**

```
Naive approach (NOT RECOMMENDED):
❌ Query servis where statusServis = "Belum Selesai"
❌ Query servis where statusServis = "Sudah Selesai" AND statusPengambilan = "Belum Diambil"
❌ Query servis where statusServis = "Sudah Selesai" AND statusPengambilan = "Sudah Diambil"
❌ Repeat x3 for custom (jenisInput = "custom")
= 6 queries per page load
```

**Optimized approach:**

```javascript
✅ 1x Query: fetch ALL servis documents (client filter)
✅ OR 1x Real-time listener on entire servis collection (auto-update)
✅ Client-side grouping by status + jenisInput
✅ Cache result locally with 5-min TTL
= 1 query on load, 0 on re-renders
```

**FR-3/FR-4: Reconciliation Tabs**

```
Naive approach (NOT RECOMMENDED):
❌ Query servis by status+month for each month in loop
❌ If showing 12 months = 12 queries per tab
= 12-24 queries per tab view
```

**Optimized approach:**

```javascript
✅ 1x Query: fetch ALL servis with status filter (let client group by month)
✅ 1x Query: fetch ALL servis_management for user + tipe
✅ Pagination: Load 6 months at a time, load more on scroll
✅ Local cache both results
= 2 queries on load, 2 on next page
```

#### 7.3.2 Read Budget Estimation

**Scenario: Daily usage by 5 users (supervisor, admin, kasir)**

| Feature                      | Reads per Load | Daily (5 users) | Monthly       | Notes                           |
| ---------------------------- | -------------- | --------------- | ------------- | ------------------------------- |
| Dashboard load               | 1              | 5-10            | 150-300       | Real-time listener = more reads |
| Dashboard auto-refresh (30s) | 1              | 100             | 3000          | PROBLEM: polling every 30s      |
| Tab Servis load              | 2              | 10-20           | 300-600       | Optimized (1 query + cache)     |
| Tab Custom load              | 2              | 10-20           | 300-600       |                                 |
| Update modal save            | 1 write        | 5-10            | 150-300       | Writes don't count as reads     |
| Riwayat modal (lazy)         | 1              | 5               | 150           | On-demand only                  |
| **TOTAL (Optimized)**        |                | **35-65**       | **1050-1950** |                                 |
| **WITHOUT optimization**     |                | **100-200**     | **3000-6000** | Real-time + polling             |

**Firebase Free Tier:** 50K reads/day  
**Estimated usage (optimized):** ~65 reads/day (0.13% of free tier) ✅  
**Estimated usage (unoptimized):** ~200 reads/day (0.4% of free tier) ⚠️

#### 7.3.3 Optimization Strategies

**Strategy 1: Batch Single Query + Client Filter (RECOMMENDED)**

```javascript
// Dashboard cards
const allServis = await db
  .collection("servis")
  .where("statusServis", "in", ["Belum Selesai", "Sudah Selesai"])
  .limit(5000)
  .get(); // 1 query

// Client-side grouping
const cards = {
  servisBelumSelesai: allServis.filter((s) => s.statusServis === "Belum Selesai").length,
  servisSudahSelesai: allServis.filter(
    (s) => s.statusServis === "Sudah Selesai" && s.statusPengambilan === "Belum Diambil",
  ).length,
  // ...
};
```

**Strategy 2: Local Caching with TTL**

```javascript
const cache = {
  servis: {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
};

function isCacheValid() {
  return cache.servis.data && Date.now() - cache.servis.timestamp < cache.servis.ttl;
}

async function getServisData() {
  if (isCacheValid()) return cache.servis.data; // 0 reads

  const data = await db.collection("servis").limit(5000).get(); // 1 read
  cache.servis.data = data;
  cache.servis.timestamp = Date.now();
  return data;
}
```

**Strategy 3: Pagination for Reconciliation Tabs**

```javascript
// Load 6 months per request
const pageSize = 6;
const allMonths = generateLast24Months(); // local
const page = 1;
const visibleMonths = allMonths.slice((page - 1) * pageSize, page * pageSize);

// Single query with month filter
const monthData = await db
  .collection("servis_management")
  .doc(userId)
  .collection(tipe)
  .where("bulan", "in", visibleMonths)
  .get(); // 1 query per page
```

**Strategy 4: Real-time Listener (Use Carefully)**

- ✅ Use for dashboard cards (auto-update)
- ❌ DO NOT use polling (interval refresh) - will multiply reads 300x
- ✅ Attach listener once on component mount
- ✅ Detach listener on component unmount

```javascript
// GOOD: Real-time listener (reads on data change, not interval)
onMounted(() => {
  unsubscribe = db
    .collection("servis")
    .where("statusServis", "in", ["Belum Selesai", "Sudah Selesai"])
    .onSnapshot((snapshot) => {
      cards.value = processSnapshot(snapshot);
    });
});

onUnmounted(() => {
  unsubscribe?.();
});

// BAD: Polling (reads every 30 seconds = 2880 reads/day)
setInterval(async () => {
  const data = await db.collection("servis").get(); // ❌ Multiplies reads by 2880x
}, 30000);
```

**Strategy 5: Firestore Indexes (Required for Compound Queries)**

```
Index 1: servis
  - Fields: statusServis (Ascending), statusPengambilan (Ascending), tanggal (Descending)
  - Collection: servis

Index 2: servis_management
  - Fields: userId (Ascending), tipe (Ascending), bulan (Descending)
  - Collection: servis_management
```

#### 7.3.4 DO NOT DO (Performance Killers)

```javascript
❌ Don't: Query in loop
  months.forEach(month => {
    db.collection('servis').where('tanggal', '>=', month).get(); // N queries!
  });

❌ Don't: Polling with interval
  setInterval(() => db.collection('servis').get(), 30000); // 2880 reads/day

❌ Don't: Fetch full documents when you only need count
  const count = docs.length; // Do this, not separate count query

❌ Don't: Real-time listener on every page load
  if (!listener) listener = db.collection('servis').onSnapshot(...); // Attach once!

❌ Don't: No pagination on month list
  // Load all 24+ months at once will be slow
```

#### 7.3.5 Recommended Implementation

**Dashboard Component:**

1. Single query OR real-time listener on servis collection
2. Client-side group + filter
3. Cache for 5 minutes
4. Update on manual button click only (no auto-refresh)

**Reconciliation Tab Component:**

1. Query servis_management with month filter (paginated)
2. Query servis with status filter (cached from dashboard)
3. Client-side merge + calculation
4. Lazy load riwayat (on-demand)

**Estimated Final Read Count:**

- Dashboard load: 1 read
- Tab switch: 1 read
- Update action: 0 reads (write only)
- Riwayat modal: 1 read (lazy)
- **Per session (5 tabs, 1 riwayat):** ~4 reads
- **Per month (250 sessions):** ~1000 reads ✅

---

## 8. Security & Permissions

### 8.1 Firestore Rules

```javascript
match /servis_management/{userId}/{document=**} {
  allow read: if request.auth.uid == userId &&
               hasRole(['admin', 'supervisor', 'kasir']);
  allow write: if request.auth.uid == userId &&
                hasRole(['admin', 'supervisor']);
}

match /servis/{document=**} {
  allow read: if hasRole(['admin', 'supervisor', 'kasir']);
  // ... existing write rules
}
```

### 8.2 Role-Based Access

- **Admin / Supervisor:** View + Update fisik barang qty
- **Other roles:** No access

---

## 9. Implementation Roadmap

### Phase 1: MVP (Week 1-2)

- [ ] Implement dashboard card summary (FR-1)
- [ ] Implement input fisik barang form (FR-2)
- [ ] Implement basic reconciliation tab (FR-3, FR-4)
- [ ] Implement update modal (FR-5)

### Phase 2: Enhancement (Week 3)

- [ ] Add riwayat modal (FR-6)
- [ ] Add missing item tracking checkbox (FR-7)
- [ ] Mobile optimization

### Phase 3: Future (Backlog)

- [ ] Bulk import fisik data per bulan (CSV/Excel)
- [ ] Export reconciliation report (PDF/Excel)
- [ ] Notification untuk servis >60 hari belum diambil
- [ ] Auto-suggestion qty berdasar historical data
- [ ] Integration dengan WhatsApp reminder untuk customer

---

## 10. Data Migration

### 10.1 Backfill servis_management Collection

For existing servis data (sudah selesai, belum diambil):

```javascript
// Pseudo-code
const existingServis = await db
  .collection("servis")
  .where("statusServis", "==", "Sudah Selesai")
  .where("statusPengambilan", "==", "Belum Diambil")
  .get();

const byMonthType = {};
existingServis.forEach((doc) => {
  const month = formatMonth(doc.data().tanggal);
  const type = doc.data().jenisInput || "servis";
  const key = `${type}_${month}`;
  if (!byMonthType[key]) byMonthType[key] = { qty: 0, sistemQty: 0 };
  byMonthType[key].sistemQty++;
});

// Upsert ke servis_management dengan fisikBarangQty = 0
// User akan di-prompt untuk update fisik barang
Object.entries(byMonthType).forEach(([key, data]) => {
  const [tipe, bulan] = key.split("_");
  db.collection("servis_management").doc(userId).collection(tipe).doc(bulan).set({
    bulan,
    tipe,
    fisikBarangQty: 0,
    sistemDataQty: data.sistemQty,
    status: "pending",
    history: [],
  });
});
```

---

## 11. Acceptance Criteria

- [ ] Dashboard cards show correct count (verified against db)
- [ ] Can input fisik barang qty dan save to firestore
- [ ] Reconciliation table shows correct sistem vs fisik counts
- [ ] Status badge (Klop/Kurang/Lebih) calculated correctly
- [ ] Update modal saves changes dan recalculates variance
- [ ] History log shows all updates with timestamp dan user
- [ ] Mobile view works on 320px width
- [ ] Permission checks enforced (write only for admin/supervisor)
- [ ] Upsert logic prevents duplicate entries per month+type

---

## 12. Mockup / Wireframe References

**See attached screenshots:**

- `manajemen-servis-dashboard.png`
- `manajemen-servis-reconciliation-tab.png`
- `manajemen-servis-update-modal.png`

---

## 13. Questions & Open Items

1. **Manual vs Auto-calculate sistem count:** Should we cache sistem count or query real-time?
   - **Decision:** Query real-time on page load, cache locally during session

2. **Historical data:** Should we backfill old servis (>3 months) into servis_management?
   - **Decision:** Yes, on first load with fisikBarangQty = 0, user will update manually

3. **Display months:** How many months should be shown by default?
   - **Decision:** Last 12 months in dropdown, load first 6 months in table

4. **Catatan field:** Should this be mandatory or optional?
   - **Decision:** Optional, tapi recommended untuk menjelaskan diskrepansi

---

## 14. Related Documents

- [03-PRD-SERVIS.md](03-PRD-SERVIS.md) - Main Servis Module
- [05-PRD-INVENTORY-BARANG.md](05-PRD-INVENTORY-BARANG.md) - Inventory Management (reference)
- [04-PRD-AKSESORIS.md](04-PRD-AKSESORIS.md) - Manajemen Stok (reference)

---

**End of Document**
