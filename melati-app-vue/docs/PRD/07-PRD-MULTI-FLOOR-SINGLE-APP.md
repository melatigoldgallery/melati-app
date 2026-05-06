# 07-PRD-MULTI-FLOOR-SINGLE-APP

## 1. Ringkasan

Dokumen ini mendefinisikan rencana final penambahan fitur agar 1 aplikasi Vue yang sama dapat dipakai untuk operasional lantai 1 dan lantai 2, dengan fitur yang sama di kedua lantai namun scope data dan user akses dipisahkan per lantai.

Tujuan utama:

- Menghilangkan maintenance 2 codebase terpisah.
- Menjaga isolasi data per lantai secara aman di semua layer.
- Mengoptimalkan operasional dengan scope data berbasis lantai.

Status: **FINAL v1.2 - Sebagian Implementasi Selesai**
Tanggal: 2026-05-04

**Status Implementasi (per 04-Mei-2026):**

- ✅ Fase 1 Foundation: Claims, floor context, capability guard, rules draft
- ✅ Login 2-step: Floor selector + form login
- ✅ Auth validation: User profile floor-aware, reject mismatch
- ✅ Cloud Function: loginWithUsername menerima floorId, enforce role per-floor
- 🔄 Fase 2-3: Service migration (aksesoris, antrian, inventory, promosi, pengaturan, servis, absensi)
- 📋 Fase 4: Hard cutover & cleanup legacy

---

## 2. Keputusan Produk dan Teknis (Final)

### 2.1 Platform

- Fokus hanya menggunakan project Vue (`melati-app-vue`).
- Kode lama/legacy boleh dihapus bertahap setelah parity dan validasi.

### 2.2 Capability per Lantai

- Lantai 1 (L1): Firestore, Realtime Database, Storage, Cloud Functions.
- Lantai 2 (L2): Firestore, Realtime Database, Storage, Cloud Functions.

### 2.3 Scope Menu per Lantai

- L1: semua menu sesuai role akses menu bisa diatur dari role supervisor
- L2: semua menu sesuai role akses menu bisa diatur dari role supervisor

### 2.4 Data Sensitif

- Data sensitif wajib floor-scoped.
- Supervisor L2 memiliki full page access seperti supervisor L1 untuk mengatur hak akses menu pada user lantai tersebut.
- Akun default operasional per lantai:
  - Supervisor L2 menggunakan username/password supervisor yang sudah ada.
  - Admin L2 menggunakan `username: admin` dan `password: adminyoung`.

### 2.5 Matriks Role per Lantai

- L1: `supervisor`, `admin`, `staff`, `hrd`
- L2: `supervisor`, `admin`

---

## 3. Latar Belakang dan Masalah

Kondisi awal:

- Terdapat 2 aplikasi/kode terpisah untuk operasional antar lantai.
- Perubahan fitur/bugfix harus dilakukan ganda.
- Risiko inkonsistensi proses dan konfigurasi tinggi.

Masalah utama:

- Duplikasi effort development, testing, deployment.
- Sulit memastikan policy keamanan konsisten antar lantai.

---

## 4. Tujuan Produk

### 4.1 Tujuan Utama

- Menjalankan L1 dan L2 dari 1 codebase Vue.
- Membatasi akses data dan fitur berdasarkan lantai user login.
- Menjamin enforcement akses di UI, services, functions, dan rules.

### 4.2 Tujuan Teknis

- Menambahkan konteks `floorId` dan capability lantai di seluruh alur.
- Menstandarkan struktur Firebase agar aman, mudah di-query, dan mudah diaudit.
- Menyediakan migration path dari struktur lama ke struktur floor-scoped.

### 4.3 Non-Goals

- Tidak memecah ke Firebase project terpisah.
- Tidak menambah cabang/lokasi baru pada fase ini.
- Tidak merombak UI besar di luar kebutuhan floor scope/capability.

---

## 5. Ruang Lingkup

### 5.1 In Scope

- Auth user dengan floor authorization dan role per lantai.
- Isolasi data Firestore per lantai.
- Isolasi node RTDB per lantai.
- Isolasi Storage per lantai
- Penyesuaian Cloud Functions agar floor-aware dan capability-aware.
- Penyesuaian query frontend agar wajib scoped ke floor aktif.
- Floor-scoped sensitive configuration.
- Decommission kode legacy setelah cutover.

### 5.2 Out of Scope

- Migrasi antar Firebase project.
- Multi-tenant lintas cabang fisik.
- Re-architecture total modul yang tidak terkait floor/capability.

---

## 6. Stakeholder

- Product Owner / Owner Toko
- Admin Operasional
- Supervisor Lantai 1
- Supervisor Lantai 2
- Staff Lantai 1
- Staff Lantai 2
- Tim Developer

---

## 7. Solusi yang Dipilih

Gunakan 1 aplikasi Vue + 1 project Firebase, dengan pemisahan akses berbasis `floorId` dan capability matrix.

Prinsip desain:

- Data dipisah berdasarkan path (bukan hanya field).
- Security Rules dan Function validation adalah sumber kebenaran.
- UI check hanya guard tambahan.
- Semua cache key/storage key wajib memuat `floorId`.

---

## 8. Capability Matrix

| Area            | L1  | L2  |
| --------------- | --- | --- |
| Menu Aksesoris  | Ya  | Ya  |
| Menu Antrian    | Ya  | Ya  |
| Menu Inventory  | Ya  | Ya  |
| Menu Promosi    | Ya  | Ya  |
| Menu Pengaturan | Ya  | Ya  |
| Menu Absensi    | Ya  | Ya  |
| Menu Servis     | Ya  | Ya  |
| Firestore       | Ya  | Ya  |
| RTDB            | Ya  | Ya  |
| Cloud Functions | Ya  | Ya  |
| Storage         | Ya  | Ya  |

Aturan penting:

- Seluruh modul dan fitur tersedia di L1 dan L2.
- Semua data operasional, data sensitif, cache, dan query wajib dibatasi ke `floorId` aktif.

---

## 9. Kebutuhan Fungsional

### FR-01 Login dan Floor Context

**Flow Pengguna:**

1. Login page dibuka → tampilkan selector `Lt 1` / `Lt 2`.
2. User pilih lantai → store `activeFloor` di session.
3. Form login tampil → user input username/password.
4. Backend validasi:
   - User profil harus cocok dengan `floorId` terpilih.
   - Role user harus valid untuk lantai tersebut (L2 hanya supervisor/admin).
   - Reject jika mismatch dengan error `auth/floor-user-mismatch`.
5. Login berhasil → generate custom claims (`allowedFloors`, `floorRoles`).
6. User diarahkan ke dashboard dengan data scoped ke `activeFloor`.

**Validasi Floor-Aware:**

- Auth store memvalidasi: `userProfile.floorId === selectedFloor`.
- Tidak boleh ada user lintas floor pada fase ini.
- Session `activeFloor` persist sampai logout.

### FR-02 Floor-Scoped Feature Access

- Menu dan aksi tampil berdasarkan role + hak akses user pada floor aktif.
- Supervisor L1 dan L2 memiliki full akses menu untuk mengatur hak akses user pada floor masing-masing.

### FR-03 Isolasi Data per Lantai

- Semua read/write operasional wajib scoped ke `floorId` aktif.
- Tidak boleh query global tanpa floor scope.

### FR-04 Storage Scope

- Semua fitur upload/download/delete file tetap tersedia di L1 dan L2.
- Path Storage wajib scoped ke `floors/{floorId}/...`.
- Enforcement dilakukan di UI, service guard, function, dan Storage Rules.

### FR-05 Cloud Functions Aware Floor and Capability

**Kontrak Wajib untuk Semua Callable/HTTP Operasional:**

- Terima `floorId` di payload request.
- Validasi `floorId` tidak kosong → return `invalid-argument` jika kosong.
- Validasi `floorId` termasuk `allowedFloors` claim → return `permission-denied` jika tidak.
- Validasi role dari `floorRoles[floorId]` untuk aksi sensitif.
- Validasi capability per floor sesuai matriks role + hak akses menu.
- Return `permission-denied` jika floor/role/capability tidak valid.
- Log operasional menyertakan: `floorId`, `uid`, `action`, `status`.

**Pattern Trigger/Scheduler:**

- Trigger Firestore gunakan wildcard: `floors/{floorId}/stokAksesorisTransaksi/{txId}`.
- Scheduler harian iterasi daftar floor aktif, proses per floor.
- Hasil job disimpan per floor agar mudah audit & rollback.

### FR-06 Floor-Scoped Sensitive Data

- Kode akses, supervisor authorization, dan konfigurasi sensitif disimpan per lantai.
- Supervisor L1 tidak bisa mengubah data sensitif L2, dan sebaliknya.

### FR-07 Metadata Dasar (Tanpa Audit Trail Detail)

- Audit trail detail aksi sensitif (edit/hapus/approve) tidak diperlukan pada fase ini.
- Metadata minimum (`floorId`, `createdAt`, `updatedAt`) tetap disarankan untuk kebutuhan operasional.

---

## 10. Kebutuhan Non-Fungsional

- Security: enforcement utama di Firebase Rules + Function validation.
- Reliability: fallback aman saat floor context invalid.
- Performance: index/query disesuaikan dengan `floorId`.
- Maintainability: helper floor scope terpusat.
- Observability: log unauthorized per modul dan per floor.

---

## 11. Desain Auth, Role, dan Claims

Claims yang disarankan:

- `allowedFloors`: array floor yang boleh diakses.
- `floorRoles`: map role per floor, contoh `{ "L1": "supervisor", "L2": "staf" }`.
- `capabilities`: map capability per floor bila diperlukan fine-grained control.

**Contoh Claims:**

- **Supervisor L1:** `allowedFloors=["L1"]`, `floorRoles={"L1":"supervisor"}`, `userFloor="L1"`.
- **Supervisor L2:** `allowedFloors=["L2"]`, `floorRoles={"L2":"supervisor"}`, `userFloor="L2"`.
- **Admin L1:** `allowedFloors=["L1"]`, `floorRoles={"L1":"admin"}`, `userFloor="L1"`.
- **Admin L2:** `allowedFloors=["L2"]`, `floorRoles={"L2":"admin"}`, `userFloor="L2"`.
- **Staff L1:** `allowedFloors=["L1"]`, `floorRoles={"L1":"staff"}`, `userFloor="L1"`.
- **HRD L1:** `allowedFloors=["L1"]`, `floorRoles={"L1":"hrd"}`, `userFloor="L1"`.

**Ketentuan:**

- Setiap user hanya boleh memiliki 1 floor (tidak lintas floor).
- `userFloor` mengindikasikan lantai primary user, wajib ada di profile Firestore.
- Claim `floorRoles` hanya mengandung 1 entry per user.
- Role L2 dibatasi: `supervisor`, `admin` saja (tidak ada staff/hrd di L2).

Ketentuan fase ini:

- Akun operasional tidak menggunakan role lintas floor.

---

## 12. Desain Data

### 12.1 Firestore

Struktur final (canonical):

- `floors/{floorId}/penjualanAksesoris/{docId}`
- `floors/{floorId}/antrian/{docId}`
- `floors/{floorId}/inventory/{docId}`
- `floors/{floorId}/promosi/{docId}`
- `floors/{floorId}/pengaturan/{docId}`
- `floors/{floorId}/mutasiKode/{docId}`
- `floors/{floorId}/restokBarang/{docId}`
- `floors/{floorId}/stocks/{docId}`
- `floors/{floorId}/stokAksesoris/{docId}`
- `floors/{floorId}/stokAksesorisTransaksi/{docId}`
- `floors/{floorId}/dailyStockLogs/{docId}`
- `floors/{floorId}/dailyStockReports/{docId}`
- `floors/{floorId}/dailyStockSnapshot/{docId}`
- `floors/{floorId}/maintenanceLogs/{docId}`
- `floors/{floorId}/systemLocks/{docId}`

Berlaku untuk L1 dan L2:

- `floors/{floorId}/servis/{docId}`
- `floors/{floorId}/absensi/attendance/{docId}`
- `floors/{floorId}/absensi/leaveRequests/{docId}`
- `floors/{floorId}/absensi/manualOvertime/{docId}`
- `floors/{floorId}/absensi/latePermissionCodes/{code}`
- `floors/{floorId}/absensi/employees/{docId}`
- `floors/{floorId}/absensi/employeeFaces/{employeeId}`

Data sensitif per lantai:

- `floors/{floorId}/settings/passwords`
- `floors/{floorId}/settings/authorization`
- `floors/{floorId}/settings/attendanceThresholds`
- `floors/{floorId}/settings/antrianClosingAnnouncement`
- `floors/{floorId}/settings/whatsapp`

Data global yang diperbolehkan (non-operasional):

- `users`
- `userRoles`
- `floorProfiles` (opsional, metadata lantai)

Keputusan arsitektur:

- Gunakan isolasi data berbasis path `floors/{floorId}/...`.
- Hindari pola `penjualanAksesoris/L1/L2/data` sebagai struktur utama karena meningkatkan kompleksitas query/rules lintas modul.

### 12.2 Realtime Database

Node berbasis lantai:

- `floorData/{floorId}/queue/state`
- `floorData/{floorId}/queue/customerCount`
- `floorData/{floorId}/queue/analytics/{yyyy}/{mm}/{dd}/{pushId}`
- `floorData/{floorId}/content/promotion/*`
- `floorData/{floorId}/settings/promotion/*`

Khusus L1 bila diperlukan:

- `floorData/L1/presence/*`

### 12.3 Storage

Path berbasis lantai:

- `floors/{floorId}/promotions/{year}/{month}/{contentType}/{fileName}`
- `floors/{floorId}/medical-certificates/{year}/{month}/{fileName}`
- `floors/{floorId}/bukti-pengambilan/{year}/{month}/{fileName}`

Kebijakan:

- Semua file operasional wajib disimpan ke path floor-scoped sesuai lantai aktif.

---

## 13. Security Rules (Arah Implementasi)

### 13.1 Firestore Rules

- `request.auth != null`
- Path `floors/{floorId}/...` hanya boleh jika `floorId` ada di `allowedFloors`.
- Koleksi sensitif wajib cek role supervisor/admin pada floor yang sama.

### 13.2 RTDB Rules

- `floorData/$floorId/...` hanya boleh jika `allowedFloors` mengandung `$floorId`.
- Node sensitif cek role per floor.

### 13.3 Storage Rules

- `floors/{floorId}/...` validasi `allowedFloors`.
- Validasi `size/contentType` per folder.

Catatan:

- Frontend check tidak menggantikan rules.
- Rules test harus lulus di emulator sebelum rollout.

---

## 14. Perubahan Aplikasi (Frontend + Services)

- Tambahkan floor context manager terpusat:
  - `getActiveFloor()`
  - `setActiveFloor()`
  - `getAllowedFloors()`
  - `canUseMenu(menuKey)`
  - `canUseStorage()`
- Semua service/query wajib menerima floor scope.
- Menu dan route guard mengikuti capability matrix.
- Cache/session/localStorage key wajib menambahkan suffix `floorId`.
- Semua upload flow wajib menulis ke path storage dengan prefix `floors/{floorId}/`.

---

## 15. Cloud Functions

Semua callable/HTTP yang menyentuh data scoped wajib:

- Ambil `uid` dan claims.
- Validasi `floorId` request terhadap `allowedFloors`.
- Validasi capability (misal storage disallowed untuk L2).
- Return `permission-denied` jika tidak valid.

Scheduler/trigger global harus dievaluasi:

- Untuk data operasional floor-scoped, proses per floor.
- Logging hasil per floor untuk audit.

Kontrak implementasi Functions (wajib):

- Semua callable/HTTP operasional menerima `floorId` pada payload.
- Jika `floorId` kosong atau tidak valid, return `invalid-argument`.
- Jika `floorId` tidak termasuk `allowedFloors`, return `permission-denied`.
- Validasi role dari `floorRoles[floorId]` untuk aksi sensitif.
- Validasi capability per floor sesuai matriks role dan hak akses menu.
- Semua log operasional function menyertakan `floorId`, `uid`, `action`, `status`.

Pattern trigger/scheduler:

- Trigger Firestore gunakan wildcard floor, contoh: `floors/{floorId}/stokAksesorisTransaksi/{txId}`.
- Scheduler harian/jam-an melakukan iterasi daftar floor aktif, lalu proses per floor.
- Hasil job disimpan per floor agar mudah audit dan rollback.

---

## 16. Rencana Migrasi dan Cutover

### Status Migrasi (per 04-Mei-2026)

| Fase       | Status         | Keterangan                                                                          |
| ---------- | -------------- | ----------------------------------------------------------------------------------- |
| **Fase 0** | ✅ Selesai     | Inventarisasi mapping, matriks role, claims model                                   |
| **Fase 1** | ✅ Selesai     | Claims + floor context + auth validation + rules draft + Cloud Function floor-aware |
| **Fase 2** | 🔄 In Progress | Migrasi modul L2: aksesoris, antrian, inventory, promosi, pengaturan                |
| **Fase 3** | 📋 Planned     | Migrasi modul L1: servis, absensi; hardening functions/rules; testing               |
| **Fase 4** | 📋 Planned     | Hard cutover + cleanup legacy                                                       |

### Matriks mapping awal (global -> floor-scoped):

- `penjualanAksesoris` -> `floors/{floorId}/penjualanAksesoris`
- `mutasiKode` -> `floors/{floorId}/mutasiKode`
- `restokBarang` -> `floors/{floorId}/restokBarang`
- `stocks` -> `floors/{floorId}/stocks`
- `stokAksesoris` -> `floors/{floorId}/stokAksesoris`
- `stokAksesorisTransaksi` -> `floors/{floorId}/stokAksesorisTransaksi`
- `daily_stock_logs` -> `floors/{floorId}/dailyStockLogs`
- `daily_stock_reports` -> `floors/{floorId}/dailyStockReports`
- `dailyStockSnapshot` -> `floors/{floorId}/dailyStockSnapshot`
- `servis` -> `floors/{floorId}/servis`
- `attendance` -> `floors/{floorId}/absensi/attendance`
- `leaveRequests` -> `floors/{floorId}/absensi/leaveRequests`
- `manualOvertime` -> `floors/{floorId}/absensi/manualOvertime`
- `latePermissionCodes` -> `floors/{floorId}/absensi/latePermissionCodes`
- `employees` -> `floors/{floorId}/absensi/employees`
- `employeeFaces` -> `floors/{floorId}/absensi/employeeFaces`

Matriks mapping RTDB:

- `queue` -> `floorData/{floorId}/queue/state`
- `customerCount` -> `floorData/{floorId}/queue/customerCount`
- `analytics/{yyyy}/{mm}` -> `floorData/{floorId}/queue/analytics/{yyyy}/{mm}/{dd}`

### Fase 0 - Inventarisasi dan Mapping ✅

- ✅ Buat matriks semua collection/node/path lama ke target floor-scoped.
- ✅ Tetapkan modul L1-only dan L2-enabled.

### Fase 1 - Foundation ✅

- ✅ Implement claims (`allowedFloors`, `floorRoles`, `userFloor`).
- ✅ Implement floor context manager dan capability guard.
- ✅ Draft rules baru + emulator tests.
- ✅ Tambahkan helper path terpusat agar tidak ada string path hardcoded di service.
- ✅ Login 2-step: floor selector + form login di LoginView.vue.
- ✅ Auth validation: user profile harus cocok floor, reject mismatch.
- ✅ Cloud Function loginWithUsername: menerima floorId, enforce role per-floor.

### Fase 2 - Migrasi Read/Write Vue 🔄 In Progress

- 🔄 Pindahkan query/write modul yang dipakai L2 dulu: aksesoris, antrian, inventory, promosi, pengaturan.
- 📋 Lanjut modul L1-only: servis, absensi.
- 📋 Terapkan floor-scoped helper agar refactor ringkas, tidak duplikasi.
- 📋 Dual-read fallback hanya jika diperlukan data kritikal tertentu, bukan default.

### Fase 3 - Hard Cutover Vue-Only 📋 Planned

- 📋 Aktifkan strict rules floor-scoped.
- 📋 Bekukan perubahan di kode legacy.
- 📋 Verifikasi parity dan UAT.
- 📋 Matikan fallback old path setelah parity terkonfirmasi.

### Fase 4 - Cleanup Legacy 📋 Planned

- 📋 Hapus kode lama/legacy bertahap per modul setelah backup/tag release.
- 📋 Hapus path lama yang sudah tidak dipakai.

### Checklist Best Practice Cutover (Wajib)

- Semua query Firestore di codebase mengandung `floorId` di path.
- Semua key cache/localStorage/session menyertakan suffix `floorId`.
- Semua function operasional menolak request tanpa `floorId`.
- Semua rules emulator test mencakup kasus negatif lintas floor.
- Validasi role per-floor untuk aksi sensitif (edit/hapus data sensitif).
- Log unauthorized akses per modul dan per floor untuk audit.
- Semua flow Storage memiliki guard eksplisit dan path scoped per floor.
- Session `activeFloor` persist dan validated di setiap navigation.

---

## 17. Rencana Testing

### 17.1 Unit Test

- Floor context manager.
- Capability resolver.
- Mapper payload + floorId.

### 17.2 Integration Test

- User L1 tidak bisa akses data L2.
- User L2 tidak bisa akses data L1.
- Admin L1 hanya bisa akses scope L1, admin L2 hanya bisa akses scope L2.
- User L2 hanya dapat menggunakan role `supervisor` dan `admin`.

### 17.3 Security Test

- Uji bypass query tanpa floor scope.
- Uji akses Storage L2 (harus gagal).
- Uji callable function dengan floorId ilegal.
- Uji akses sensitif supervisor lintas lantai (harus ditolak).

### 17.4 UAT

- Skenario transaksi simultan L1 dan L2.
- Skenario antrian, inventory, promosi, pengaturan di L2.
- Skenario servis/absensi hanya di L1.

---

## 18. KPI Keberhasilan

- 100% modul operasional scoped by `floorId`.
- 0 insiden akses lintas lantai tanpa hak.
- 100% data sensitif menggunakan konfigurasi per lantai.
- 1 codebase Vue aktif untuk L1+L2.

---

## 19. Risiko dan Mitigasi

1. Risiko: query lupa floor scope  
   Mitigasi: helper wajib + lint checklist + review gate.

2. Risiko: rules belum menutup semua jalur  
   Mitigasi: rules test matrix wajib sebelum go-live.

3. Risiko: data sensitif masih global  
   Mitigasi: migrasi ke floor-scoped settings lebih dulu sebelum strict mode.

4. Risiko: user melihat data lantai yang bukan scope login  
   Mitigasi: floor selector wajib sebelum login + route guard + floor-scoped query + backend deny.

5. Risiko: penghapusan legacy terlalu cepat  
   Mitigasi: backup, tag release, checklist parity, rollback window.

---

## 20. Estimasi Implementasi

- Sprint 1:
  - Finalisasi data matrix, claims model, floor context, capability matrix, rules draft.
- Sprint 2:
  - Migrasi modul L2 scope (aksesoris, antrian, inventory, promosi, pengaturan).
- Sprint 3:
  - Migrasi modul L1-only (servis, absensi), hardening functions/rules, testing menyeluruh.
- Sprint 4:
  - Cutover Vue-only, cleanup legacy, dokumentasi final.

---

## 21. Keputusan atas Open Questions

- Dashboard admin gabungan lintas floor tidak diperlukan; setiap floor memiliki admin dan supervisor sendiri.
- Semua data diperlakukan floor-scoped.
- Audit trail detail untuk aksi sensitif tidak diperlukan pada fase ini.

---

## 22. Keputusan Final PRD

- Tetap 1 aplikasi Vue dan 1 Firebase project.
- Enforce `floorId` dan capability per lantai di seluruh layer (UI, services, functions, rules).
- L1 dan L2 memiliki fitur/menu yang sama, pembedaan hanya pada scope data dan role access.
- Pembedaan akses dilakukan melalui role + hak akses user per lantai.
- L2 hanya menggunakan role `supervisor` dan `admin` (tidak ada staff/hrd).
- Tidak ada role operasional lintas floor pada fase ini.
- Data sensitif wajib floor-scoped dengan supervisor independen per lantai.
- Semua data operasional bersifat floor-scoped dengan path prefix `floors/{floorId}/...`.
- Login wajib 2-step: pilih lantai dulu sebelum form login.
- Auth validation floor-aware: reject login jika user profil tidak cocok dengan lantai terpilih.
- Cloud Function operasional wajib menerima `floorId` dan validasi terhadap claims.
- Audit trail detail tidak diwajibkan pada fase ini, namun metadata minimum (`floorId`, `createdAt`, `updatedAt`) tetap disarankan.
- Legacy code dihapus bertahap setelah cutover aman dan parity terkonfirmasi.

---

## 23. Progress Tracking

**Diperbarui:** 2026-05-04

Dokumen ini merupakan acuan implementasi teknis lintas modul untuk fase multi-floor. Progress tracking dilakukan per sprint dan per fase sesuai jadwal di Section 20.
