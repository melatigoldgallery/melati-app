# PRD-00: Migration Overview — Melati Gold Shop

## Migrasi HTML/CSS/JS Murni → Vue.js + Bootstrap + Node.js + GitHub + Netlify

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft

---

## 1. Latar Belakang

Sistem Manajemen Melati Gold Shop saat ini dibangun menggunakan HTML, CSS, dan JavaScript murni dengan Firebase sebagai backend. Seiring berkembangnya fitur, codebase mulai sulit dipelihara, tidak ada komponen yang dapat di-reuse, tidak ada routing yang terstruktur, dan deployment masih manual.

Migrasi ke ekosistem Vue.js akan memberikan:

- Component-based architecture (reusable UI)
- Routing terpusat (Vue Router)
- State management global (Pinia)
- Build tooling modern (Vite)
- CI/CD pipeline via GitHub → Netlify

---

## 2. Tujuan Migrasi

| Tujuan                    | Deskripsi                                                     |
| ------------------------- | ------------------------------------------------------------- |
| Maintainability           | Struktur kode yang modular dan mudah dipelihara               |
| Scalability               | Fitur baru dapat ditambahkan tanpa mengacaukan modul lain     |
| Performance               | Code splitting, lazy loading per route/modul                  |
| DX (Developer Experience) | TypeScript optional, Composition API, hot reload              |
| Deployment                | Otomatis via GitHub Actions → Netlify                         |
| Reusability               | Komponen UI (tabel, modal, form, badge) dibagikan antar modul |

---

## 3. Scope Proyek

### 3.1 Modul yang Dimigrasi

| No  | Module           | Sub-Halaman                                                                                            | PRD    |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Absensi          | Kehadiran, Pengajuan Izin, Laporan Kehadiran, Laporan Izin, Tambah Pengguna, Supervisor                | PRD-01 |
| 2   | Antrian          | Admin Antrian, Display Antrian, Laporan Antrian                                                        | PRD-02 |
| 3   | Servis           | Input Servis, Data Servis, Laporan Servis                                                              | PRD-03 |
| 4   | Aksesoris        | Tambah Barang, Return Barang, Penjualan, Data Penjualan, Laporan Penjualan, Laporan Stok, Kelola Sales | PRD-04 |
| 5   | Inventory Barang | Manajemen Stok, Laporan Stok Harian, Mutasi Kode, Restok Barang                                        | PRD-05 |
| 6   | Promosi          | Setting Promosi, Display Promosi                                                                       | PRD-06 |

### 3.2 Halaman Global

- Login (`index.html` → `/login`)
- Dashboard (`dashboard.html` → `/dashboard`)
- Maintenance (`maintenance.html` → `/maintenance`)
- Kelola User (`kelola-user.html` → `/admin/users`)
- Kode Akses (`kode-akses.html` → `/admin/access-codes`)
- Jam Absensi (`jam-absensi.html` → `/admin/attendance-settings`)

---

## 4. Tech Stack

### 4.1 Frontend

| Teknologi            | Versi                 | Kegunaan                              |
| -------------------- | --------------------- | ------------------------------------- |
| Vue.js               | 3.x (Composition API) | Framework utama                       |
| Vue Router           | 4.x                   | Client-side routing                   |
| Pinia                | 2.x                   | State management                      |
| Bootstrap            | 5.3.x                 | UI framework (CSS)                    |
| Vite                 | 5.x                   | Build tool / dev server               |
| Axios                | 1.x                   | HTTP client (jika perlu API)          |
| DataTables           | 1.13.x                | Tabel dengan sorting/filtering/export |
| jsPDF + autotable    | 2.x                   | PDF export                            |
| XLSX (SheetJS)       | 0.18.x                | Excel export                          |
| SweetAlert2          | 11.x                  | Alert/dialog UI                       |
| Bootstrap Datepicker | 1.9.x                 | Komponen date picker                  |
| Chart.js             | 4.x                   | Visualisasi data (laporan)            |
| face-api.js          | 0.22.x                | Face recognition (absensi)            |

### 4.2 Backend / Database

| Teknologi                  | Kegunaan                                         |
| -------------------------- | ------------------------------------------------ |
| Firebase Firestore         | Database utama (semua koleksi kecuali antrian)   |
| Firebase Realtime Database | Queue state management (antrian, promosi)        |
| Firebase Storage           | Upload file (foto medical, foto servis, promosi) |
| Firebase Auth              | Authentication (opsional, saat ini custom auth)  |
| Node.js (Express)          | Print service (localhost:3001, tetap lokal)      |

### 4.3 Infrastructure

| Teknologi        | Kegunaan                       |
| ---------------- | ------------------------------ |
| GitHub           | Version control + CI/CD source |
| GitHub Actions   | Otomasi build & deploy         |
| Netlify          | Hosting frontend (static SPA)  |
| Firebase Hosting | Alternatif / fallback          |

---

## 5. Arsitektur Proyek Vue

```
melati-app-vue/
├── public/
│   ├── img/
│   ├── audio/
│   └── favicon.ico
├── src/
│   ├── assets/              # CSS global, images
│   ├── components/          # Komponen reusable
│   │   ├── common/
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppModal.vue
│   │   │   ├── AppTable.vue
│   │   │   ├── AppLoading.vue
│   │   │   └── AppBadge.vue
│   │   └── modules/         # Komponen spesifik modul
│   ├── composables/         # Reusable logic (hooks)
│   │   ├── useAuth.js
│   │   ├── useCache.js
│   │   ├── usePrint.js
│   │   ├── useFirestore.js
│   │   └── useRealtime.js
│   ├── config/
│   │   ├── firebase.js      # Firebase initialization
│   │   └── menu-structure.js
│   ├── router/
│   │   └── index.js         # Vue Router dengan lazy loading
│   ├── stores/              # Pinia stores
│   │   ├── auth.js
│   │   ├── attendance.js
│   │   ├── queue.js
│   │   ├── service.js
│   │   ├── accessories.js
│   │   ├── stock.js
│   │   └── promotion.js
│   ├── services/            # Firebase service layer (diport dari existing)
│   │   ├── employee-service.js
│   │   ├── attendance-service.js
│   │   ├── leave-service.js
│   │   ├── servis-service.js
│   │   ├── stock-service.js
│   │   └── promotion-service.js
│   ├── views/               # Halaman utama (1 per route)
│   │   ├── auth/
│   │   │   └── LoginView.vue
│   │   ├── dashboard/
│   │   │   └── DashboardView.vue
│   │   ├── absensi/
│   │   │   ├── KehadiranView.vue
│   │   │   ├── PengajuanIzinView.vue
│   │   │   ├── LaporanKehadiranView.vue
│   │   │   ├── LaporanIzinView.vue
│   │   │   └── TambahPenggunaView.vue
│   │   ├── antrian/
│   │   │   ├── AdminAntrianView.vue
│   │   │   ├── DisplayAntrianView.vue
│   │   │   └── LaporanAntrianView.vue
│   │   ├── servis/
│   │   │   ├── InputServisView.vue
│   │   │   ├── DataServisView.vue
│   │   │   └── LaporanServisView.vue
│   │   ├── aksesoris/
│   │   │   ├── TambahBarangView.vue
│   │   │   ├── ReturnBarangView.vue
│   │   │   ├── PenjualanView.vue
│   │   │   ├── DataPenjualanView.vue
│   │   │   ├── LaporanPenjualanView.vue
│   │   │   ├── LaporanStokView.vue
│   │   │   └── KelolaSalesView.vue
│   │   ├── inventory/
│   │   │   ├── ManajemenStokView.vue
│   │   │   ├── LaporanStokHarianView.vue
│   │   │   ├── MutasiKodeView.vue
│   │   │   └── RestokBarangView.vue
│   │   └── promosi/
│   │       ├── SettingPromosiView.vue
│   │       └── DisplayPromosiView.vue
│   ├── App.vue
│   └── main.js
├── .env                     # Environment variables (Firebase config)
├── .env.production
├── vite.config.js
├── package.json
└── netlify.toml             # Netlify deployment config
```

---

## 6. Routing Structure

```javascript
// router/index.js (ringkasan)
{
  '/login'                          → LoginView (public)
  '/dashboard'                      → DashboardView (auth required)
  '/absensi/kehadiran'              → KehadiranView
  '/absensi/pengajuan-izin'         → PengajuanIzinView
  '/absensi/laporan'                → LaporanKehadiranView
  '/absensi/laporan-izin'           → LaporanIzinView
  '/antrian/admin'                  → AdminAntrianView
  '/antrian/display'                → DisplayAntrianView (no sidebar)
  '/antrian/laporan'                → LaporanAntrianView
  '/servis/input'                   → InputServisView
  '/servis/data'                    → DataServisView
  '/servis/laporan'                 → LaporanServisView
  '/aksesoris/tambah'               → TambahBarangView
  '/aksesoris/return'               → ReturnBarangView
  '/aksesoris/penjualan'            → PenjualanView
  '/aksesoris/data-penjualan'       → DataPenjualanView
  '/aksesoris/laporan-penjualan'    → LaporanPenjualanView
  '/aksesoris/laporan-stok'         → LaporanStokView
  '/inventory/manajemen'            → ManajemenStokView
  '/inventory/laporan-harian'       → LaporanStokHarianView
  '/inventory/mutasi-kode'          → MutasiKodeView
  '/inventory/restok'               → RestokBarangView
  '/promosi/setting'                → SettingPromosiView
  '/promosi/display'                → DisplayPromosiView (fullscreen, no sidebar)
  '/admin/users'                    → KelolUserView
  '/admin/access-codes'             → KodeAksesView
}
```

---

## 7. State Management (Pinia)

### Store yang Diperlukan

| Store              | State Utama                                  | Actions                                     |
| ------------------ | -------------------------------------------- | ------------------------------------------- |
| `authStore`        | `currentUser`, `isAuthenticated`, `userRole` | `login()`, `logout()`, `checkSession()`     |
| `attendanceStore`  | `employees`, `todayAttendance`, `settings`   | `recordAttendance()`, `loadByDate()`        |
| `leaveStore`       | `leaveRequests`, `pendingRequests`           | `submitLeave()`, `approveLeave()`           |
| `queueStore`       | `currentQueue`, `skipList`, `customerCount`  | `next()`, `skip()`, `previous()`            |
| `servisStore`      | `servisList`, `currentMonth`                 | `save()`, `updateStatus()`, `loadByMonth()` |
| `accessoriesStore` | `stockData`, `transactions`                  | `loadStock()`, `saveTransaction()`          |
| `stockStore`       | `brankasData`, `dailyLogs`                   | `updateStock()`, `generateSnapshot()`       |
| `promotionStore`   | `slides`, `settings`                         | `updateSettings()`, `uploadSlide()`         |

---

## 8. Firebase Collections Mapping

| Koleksi                  | Modul     | Tipe        |
| ------------------------ | --------- | ----------- |
| `employees`              | Absensi   | Firestore   |
| `employeeFaces`          | Absensi   | Firestore   |
| `attendance`             | Absensi   | Firestore   |
| `leaveRequests`          | Absensi   | Firestore   |
| `queue`                  | Antrian   | Realtime DB |
| `customerCount`          | Antrian   | Realtime DB |
| `servis`                 | Servis    | Firestore   |
| `penjualanAksesoris`     | Aksesoris | Firestore   |
| `stokAksesoris`          | Aksesoris | Firestore   |
| `stokAksesorisTransaksi` | Aksesoris | Firestore   |
| `brankas`                | Inventory | Firestore   |
| `daily_stock_logs`       | Inventory | Firestore   |
| `settings`               | Global    | Firestore   |
| `settings/promotion`     | Promosi   | Realtime DB |
| `content/promotion`      | Promosi   | Realtime DB |

---

## 9. Authentication & Authorization

### 9.1 Strategi Autentikasi

Saat ini menggunakan custom auth (sessionStorage). Pada Vue, dipindahkan ke:

- Pinia `authStore` untuk menyimpan state user
- Route guard (`beforeEach`) untuk proteksi halaman
- Firebase Auth (opsional untuk upgrade ke depan)

### 9.2 Role-Based Access

| Role           | Akses                                                  |
| -------------- | ------------------------------------------------------ |
| `admin`        | Semua fitur, termasuk setting, kelola user, kode akses |
| `supervisor`   | Absensi + approval + laporan + hapus data              |
| `staf`         | Input data, presensi, lihat laporan terbatas           |
| `admin_custom` | Servis + input penjualan (tanpa absensi/antrian)       |

### 9.3 Route Guard

```javascript
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) next("/login");
  else if (to.meta.roles && !to.meta.roles.includes(auth.userRole)) next("/unauthorized");
  else next();
});
```

---

## 10. Komponen Reusable (Shared Components)

| Komponen                | Deskripsi                                        | Digunakan di        |
| ----------------------- | ------------------------------------------------ | ------------------- |
| `AppDataTable.vue`      | Wrapper DataTables dengan slot untuk header/body | Semua modul laporan |
| `AppModal.vue`          | Modal Bootstrap dengan slot header/body/footer   | Semua modul         |
| `AppDatePicker.vue`     | Bootstrap Datepicker wrapper                     | Laporan, filter     |
| `AppBadge.vue`          | Status badge (Lunas, DP, dll)                    | Aksesoris, Servis   |
| `AppLoading.vue`        | Full-screen & inline loading                     | Semua modul         |
| `AppAlert.vue`          | SweetAlert2 wrapper sebagai composable           | Semua modul         |
| `AppSidebar.vue`        | Sidebar navigasi dengan role-based visibility    | Layout utama        |
| `AppHeader.vue`         | Top navigation dengan datetime & user avatar     | Layout utama        |
| `AppExportButtons.vue`  | Tombol Excel + PDF                               | Semua modul laporan |
| `VerificationModal.vue` | Modal verifikasi password                        | Hapus/edit data     |

---

## 11. Environment Variables

```env
# .env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_PRINT_SERVICE_URL=http://localhost:3001
```

---

## 12. Deployment Pipeline

```
Developer → git push → GitHub
                          ↓
                   GitHub Actions (CI)
                   - npm install
                   - npm run build (Vite)
                   - netlify deploy --prod
                          ↓
                        Netlify
                   (SPA dengan _redirects)
```

### 12.1 Netlify Config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 12.2 GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... env lainnya
      - uses: netlify/actions/deploy@master
        with:
          publish-dir: "./dist"
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 13. Strategi Migrasi

### 13.1 Pendekatan: Bertahap (Phased Migration)

| Fase       | Scope                                                                                                   | Estimasi   |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| **Fase 0** | Setup project, scaffolding, Firebase config, auth, layout (sidebar + header), halaman login & dashboard | Sprint 1   |
| **Fase 1** | Modul Aksesoris (Penjualan, Data, Laporan) — dampak bisnis terbesar                                     | Sprint 2-3 |
| **Fase 2** | Modul Inventory Barang (Manajemen Stok, Restok, Laporan Harian)                                         | Sprint 4   |
| **Fase 3** | Modul Servis (Input, Data, Laporan)                                                                     | Sprint 5   |
| **Fase 4** | Modul Absensi (Kehadiran, Izin, Laporan) + Face Recognition                                             | Sprint 6-7 |
| **Fase 5** | Modul Antrian (Admin, Display, Laporan)                                                                 | Sprint 8   |
| **Fase 6** | Modul Promosi + Halaman Admin Global                                                                    | Sprint 9   |
| **Fase 7** | QA, Performance tuning, accessibility, cutover                                                          | Sprint 10  |

### 13.2 Aturan Migrasi

1. Service layer (`services/*.js`) diport 1:1 tanpa perubahan logika
2. Logika bisnis dipindahkan ke Pinia stores atau composables
3. UI dibangun ulang sebagai Vue components
4. Firebase collections dan dokumen **tidak berubah** (backward compatible)
5. Print service Node.js **tidak dimigrasi** (tetap lokal, `localhost:3001`)

---

## 14. Risiko & Mitigasi

| Risiko                                                   | Kemungkinan           | Mitigasi                                                   |
| -------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| Face recognition (face-api.js) compatibility dengan Vite | Sedang                | Test early, buat shimming jika perlu                       |
| Firebase Realtime DB listener cleanup di Vue lifecycle   | Rendah                | Cleanup di `onUnmounted()` hook                            |
| DataTables jQuery dependency dalam Vue                   | Sedang                | Gunakan `vue3-datatable` atau bungkus dalam composable     |
| Performance regresi karena reactive overhead             | Rendah                | Gunakan `shallowRef` untuk data besar                      |
| Print service (localhost) tidak accessible di Netlify    | Tidak ada (by design) | Print service tetap lokal, fallback browser print tersedia |
| Session management berbeda antara HTML murni dan SPA     | Sedang                | Pindahkan sessionStorage ke Pinia + localStorage persist   |

---

## 15. Definition of Done

- [ ] Semua route terproteksi dengan auth guard
- [ ] Semua Firebase collection queries tidak berubah dari versi lama
- [ ] Export Excel & PDF berfungsi di semua modul laporan
- [ ] Print service integration berfungsi (dengan fallback)
- [ ] Responsive di mobile dan desktop
- [ ] Build sukses tanpa error/warning kritis
- [ ] Deploy otomatis ke Netlify via GitHub push ke `main`
- [ ] Semua role (admin, supervisor, staf) tertes akses halaman

---

## 16. Strategi Optimasi Firestore Reads

Firestore menagih biaya per **document read**. Aturan global berikut wajib diterapkan di semua modul PRD untuk mencegah lonjakan reads.

### 16.1 Kapan Menggunakan `getDocs` vs `onSnapshot`

| Kondisi                              | Metode                             | Alasan                              |
| ------------------------------------ | ---------------------------------- | ----------------------------------- |
| Data historis / bulan lampau         | `getDocs` (one-shot)               | Tidak berubah, tidak perlu listener |
| Data hari ini yang aktif berubah     | `onSnapshot` dengan `where` filter | Real-time justified                 |
| Data katalog/master (karyawan, stok) | `getDocs` + Pinia cache            | Load sekali, cache in-memory        |
| Halaman laporan (query range)        | `getDocs` + `limit()`              | Laporan statis, no listener         |
| Settings (jarang berubah)            | `getDoc` + Pinia cache             | Bukan real-time                     |

**Aturan utama:** Jangan gunakan `onSnapshot` untuk data yang tidak perlu update real-time di halaman yang sedang aktif.

### 16.2 Wajib Gunakan `limit()` pada Semua Query

Semua query ke koleksi yang bisa tumbuh wajib menggunakan `limit()`:

```javascript
// SALAH — bisa baca ribuan dokumen
const q = query(collection(db, "penjualanAksesoris"), where("tanggal", ">=", start));

// BENAR — batasi per halaman
const q = query(
  collection(db, "penjualanAksesoris"),
  where("tanggal", ">=", start),
  where("tanggal", "<=", end),
  orderBy("tanggal", "desc"),
  limit(200),
);
```

Gunakan cursor pagination (`startAfter(lastDoc)`) jika data lebih dari limit.

### 16.3 Pinia Cache-First Pattern

Data katalog/master harus **disimpan di Pinia dan tidak di-fetch ulang** setiap navigasi:

```javascript
// Pola wajib untuk semua collection katalog (employees, stokAksesoris, brankas)
async loadCatalog() {
  // Jika sudah ada di state, skip fetch
  if (this.catalog.length > 0) return

  const snap = await getDocs(
    query(collection(db, 'stokAksesoris'), where('isActive', '==', true))
  )
  this.catalog = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
```

Data di-refresh hanya dalam kondisi:

1. User melakukan CRUD (explicit invalidation)
2. Cross-tab sync event diterima
3. Manual refresh (pull-to-refresh / tombol refresh)

### 16.4 Cross-Tab Sync yang Benar

`CustomEvent` hanya bekerja dalam satu tab. Untuk cross-tab sync, gunakan `localStorage` event:

```javascript
// SALAH — hanya bekerja same-window
window.dispatchEvent(new CustomEvent("dataChanged"));

// BENAR — bekerja cross-tab
localStorage.setItem("stockChanged", Date.now().toString());
// Di tab lain, listener 'storage' akan menerima ini secara otomatis
window.addEventListener("storage", (e) => {
  if (e.key === "stockChanged") refreshData();
});
```

Cleanup listener wajib di `onUnmounted()`.

### 16.5 Targeted Update vs Full Reload

Ketika cross-tab sync event diterima, **jangan reload seluruh koleksi**. Hanya fetch dokumen yang berubah:

```javascript
// SALAH — reload semua dokumen setiap ada perubahan
window.addEventListener("storage", () => stockStore.loadBrankasData());

// BENAR — hanya fetch dokumen yang berubah
window.addEventListener("storage", (e) => {
  if (e.key === "brankasChanged") {
    const { kode } = JSON.parse(e.newValue);
    stockStore.refreshSingleItem(kode); // getDoc satu dokumen
  }
});
```

### 16.6 Required Firestore Composite Indexes

Query berikut memerlukan composite index di `firestore.indexes.json`:

| Collection           | Fields                           | Digunakan di             |
| -------------------- | -------------------------------- | ------------------------ |
| `attendance`         | `date` ASC, `employeeId` ASC     | Laporan kehadiran        |
| `attendance`         | `date` ASC (range)               | Laporan bulanan          |
| `servis`             | `tanggal` ASC                    | Data servis filter bulan |
| `penjualanAksesoris` | `tanggal` ASC, `salesId` ASC     | Laporan per sales        |
| `daily_stock_logs`   | `tanggal` ASC, `kode` ASC        | Laporan stok harian      |
| `leaveRequests`      | `status` ASC, `submittedAt` DESC | Supervisor approval      |

### 16.7 sessionStorage untuk Face Descriptors

`employeeFaces` berisi array Float32Array per karyawan — payload besar. Wajib dicache di sessionStorage:

```javascript
// Key: 'faceDescriptors' | Value: JSON.stringify semua descriptors
// Invalidasi: hanya ketika admin update face data karyawan tertentu
const FACE_CACHE_KEY = "faceDescriptorsCache";
const FACE_CACHE_VERSION_KEY = "faceDescriptorsVersion";

async function loadFaceDescriptors(forceRefresh = false) {
  const cached = sessionStorage.getItem(FACE_CACHE_KEY);
  if (cached && !forceRefresh) return JSON.parse(cached);

  const snap = await getDocs(collection(db, "employeeFaces"));
  const data = snap.docs.map((d) => d.data());
  sessionStorage.setItem(FACE_CACHE_KEY, JSON.stringify(data));
  return data;
}
```

---

_Dokumen ini adalah acuan utama. Setiap PRD modul merujuk ke dokumen ini untuk standar tech stack, arsitektur, dan routing._
