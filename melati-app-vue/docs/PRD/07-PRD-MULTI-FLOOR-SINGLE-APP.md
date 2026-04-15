# 07-PRD-MULTI-FLOOR-SINGLE-APP

## 1. Ringkasan

Dokumen ini mendefinisikan rencana final penambahan fitur agar 1 aplikasi Vue yang sama dapat dipakai untuk operasional lantai 1 dan lantai 2, dengan kemampuan fitur yang berbeda per lantai.

Tujuan utama:

- Menghilangkan maintenance 2 codebase terpisah.
- Menjaga isolasi data per lantai secara aman di semua layer.
- Mengoptimalkan operasional dengan capability berbasis lantai.

Status: Draft v1.1  
Tanggal: 2026-04-15

---

## 2. Keputusan Produk dan Teknis (Final)

### 2.1 Platform

- Fokus hanya menggunakan project Vue (`melati-app-vue`).
- Kode lama/legacy boleh dihapus bertahap setelah parity dan validasi.

### 2.2 Capability per Lantai

- Lantai 1 (L1): Firestore, Realtime Database, Storage, Cloud Functions.
- Lantai 2 (L2): Firestore, Realtime Database, Cloud Functions.
- L2 tidak menggunakan Storage.

### 2.3 Scope Menu per Lantai

- L1: semua menu sesuai role.
- L2: hanya menu `aksesoris`, `antrian`, `inventory`, `promosi`, `pengaturan`.
- L2 tidak perlu modul `absensi` dan `servis`.

### 2.4 Data Sensitif

- Data sensitif wajib floor-scoped.
- Tiap lantai memiliki supervisor sendiri (otorisasi sensitif tidak boleh berbagi kode/role global).

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
- Isolasi Storage per lantai dengan pembatasan L2 no-storage.
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

| Area            | L1  | L2    |
| --------------- | --- | ----- |
| Menu Aksesoris  | Ya  | Ya    |
| Menu Antrian    | Ya  | Ya    |
| Menu Inventory  | Ya  | Ya    |
| Menu Promosi    | Ya  | Ya    |
| Menu Pengaturan | Ya  | Ya    |
| Menu Absensi    | Ya  | Tidak |
| Menu Servis     | Ya  | Tidak |
| Firestore       | Ya  | Ya    |
| RTDB            | Ya  | Ya    |
| Cloud Functions | Ya  | Ya    |
| Storage         | Ya  | Tidak |

Aturan penting:

- L2 tidak boleh membaca/menulis file ke Storage.
- Modul yang bergantung ke Storage harus otomatis nonaktif untuk L2.

---

## 9. Kebutuhan Fungsional

### FR-01 Login dan Floor Context

- Setelah login, sistem memuat floor yang diizinkan dan role per lantai.
- User single-floor langsung terkunci ke floor tersebut.
- Tidak ada role operasional lintas floor pada fase ini.

### FR-02 Floor-Scoped Feature Access

- Menu dan aksi tampil berdasarkan capability lantai.
- User L2 tidak dapat mengakses absensi/servis.

### FR-03 Isolasi Data per Lantai

- Semua read/write operasional wajib scoped ke `floorId` aktif.
- Tidak boleh query global tanpa floor scope.

### FR-04 Storage Restriction for L2

- Semua fitur upload/download/delete file ditolak untuk L2.
- Enforcement dilakukan di UI, service guard, function, dan Storage Rules.

### FR-05 Cloud Functions Aware Floor and Capability

- Callable/trigger yang menyentuh data scoped memvalidasi `floorId` terhadap claims.
- Function menolak request jika floor tidak sah atau capability tidak diizinkan.

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

Contoh:

- User supervisor L1: `allowedFloors=["L1"]`, `floorRoles={"L1":"supervisor"}`.
- User supervisor L2: `allowedFloors=["L2"]`, `floorRoles={"L2":"supervisor"}`.
- User admin L1: `allowedFloors=["L1"]`, `floorRoles={"L1":"admin"}`.
- User admin L2: `allowedFloors=["L2"]`, `floorRoles={"L2":"admin"}`.

Ketentuan fase ini:

- Akun operasional tidak menggunakan role lintas floor.

---

## 12. Desain Data

### 12.1 Firestore

Path operasional berbasis lantai:

- `floors/{floorId}/penjualan/{docId}`
- `floors/{floorId}/antrian/{docId}`
- `floors/{floorId}/inventory/{docId}`
- `floors/{floorId}/promosi/{docId}`
- `floors/{floorId}/pengaturan/{docId}`

Khusus L1 saja:

- `floors/L1/servis/{docId}`
- `floors/L1/absensi/{docId}`

Data sensitif per lantai:

- `floors/{floorId}/settings/passwords`
- `floors/{floorId}/settings/authorization`

Data global:

- Tidak digunakan untuk data operasional pada fase ini.
- Semua data (termasuk data master yang dipakai operasional) diperlakukan floor-scoped.

### 12.2 Realtime Database

Node berbasis lantai:

- `floorData/{floorId}/queue/*`
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

- L2: no-storage access (read/write/delete ditolak).

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
- Tambah guard eksplisit: jika `floorId == "L2"`, deny akses storage.
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
- Semua upload flow wajib guard `canUseStorage()`.

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

---

## 16. Rencana Migrasi dan Cutover

### Fase 0 - Inventarisasi dan Mapping

- Buat matriks semua collection/node/path lama ke target floor-scoped.
- Tetapkan modul L1-only dan L2-enabled.

### Fase 1 - Foundation

- Implement claims (`allowedFloors`, `floorRoles`).
- Implement floor context manager dan capability guard.
- Draft rules baru + emulator tests.

### Fase 2 - Migrasi Read/Write Vue

- Pindahkan query/write modul yang dipakai L2 dulu: aksesoris, antrian, inventory, promosi, pengaturan.
- Lanjut modul L1-only: servis, absensi.

### Fase 3 - Hard Cutover Vue-Only

- Aktifkan strict rules floor-scoped.
- Bekukan perubahan di kode legacy.
- Verifikasi parity dan UAT.

### Fase 4 - Cleanup Legacy

- Hapus kode lama/legacy bertahap per modul setelah backup/tag release.
- Hapus path lama yang sudah tidak dipakai.

Catatan:

- Dual write hanya dipakai jika diperlukan untuk data kritikal tertentu, bukan default.

---

## 17. Rencana Testing

### 17.1 Unit Test

- Floor context manager.
- Capability resolver.
- Mapper payload + floorId.

### 17.2 Integration Test

- User L1 tidak bisa akses data L2.
- User L2 tidak bisa akses data L1.
- User L2 tidak bisa akses menu absensi/servis.
- Admin L1 hanya bisa akses scope L1, admin L2 hanya bisa akses scope L2.

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
- 0 akses Storage sukses dari user L2.
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

4. Risiko: user L2 tetap melihat fitur non-scope  
   Mitigasi: route guard + menu guard + backend deny.

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
- Enforce `floorId` dan capability per lantai di seluruh layer.
- L2 dibatasi ke menu: aksesoris, antrian, inventory, promosi, pengaturan.
- L2 tidak menggunakan Storage.
- Tidak ada role operasional lintas floor.
- Data sensitif wajib floor-scoped dengan supervisor per lantai.
- Semua data operasional bersifat floor-scoped.
- Audit trail detail tidak diwajibkan pada fase ini.
- Legacy code dihapus bertahap setelah cutover aman.

Dokumen ini menjadi acuan implementasi teknis lintas modul untuk fase multi-floor.
