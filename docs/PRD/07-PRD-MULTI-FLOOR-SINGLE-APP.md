# 07-PRD-MULTI-FLOOR-SINGLE-APP

## 1. Ringkasan

Dokumen ini mendefinisikan rencana penambahan fitur agar 1 aplikasi yang sama dapat dipakai oleh 2 user berbeda untuk operasional lantai 1 dan lantai 2.

Tujuan utamanya adalah:

- Menghapus kebutuhan maintenance 2 codebase/aplikasi terpisah.
- Menjaga isolasi data per lantai secara aman.
- Tetap memakai stack Firebase saat ini: Firestore, Realtime Database, Storage, Cloud Functions, dan Auth.

Status: Draft v1.0  
Tanggal: 2026-04-13

---

## 2. Latar Belakang dan Masalah

Kondisi saat ini:

- Terdapat 2 aplikasi/kode terpisah untuk lantai 1 dan lantai 2.
- Setiap update fitur/bugfix harus dilakukan ganda.
- Risiko inkonsistensi fitur antar lantai tinggi.
- Biaya maintenance meningkat.

Masalah utama:

- Duplikasi effort development, testing, dan deployment.
- Potensi deviasi data dan proses antar lantai.

---

## 3. Tujuan Produk

### 3.1 Tujuan Utama

- Menjalankan operasional lantai 1 dan lantai 2 dari 1 codebase.
- Membatasi akses data berdasarkan lantai sesuai user login.
- Menjaga keamanan data lewat Firebase Security Rules.

### 3.2 Tujuan Teknis

- Menambahkan konteks floorId (tenant scope) di seluruh alur data.
- Menstandarkan struktur data Firebase agar aman, mudah di-query, dan mudah dimigrasi.
- Menambahkan validasi akses di frontend, backend (Functions), dan Security Rules.

### 3.3 Non-Goals

- Tidak memecah ke project Firebase terpisah.
- Tidak merombak UI besar-besaran selain yang terkait pemilihan konteks lantai.
- Tidak menambah role baru di luar kebutuhan fitur ini (kecuali diperlukan pada fase lanjutan).

---

## 4. Ruang Lingkup

### 4.1 In Scope

- Auth user dengan atribut lantai yang diizinkan.
- Isolasi data Firestore per lantai.
- Isolasi node Realtime Database per lantai.
- Isolasi path Storage per lantai.
- Penyesuaian Cloud Functions agar aware terhadap floorId.
- Penyesuaian query frontend agar selalu scoped ke floorId.
- Backoffice/admin view untuk lintas lantai (opsional sesuai role).

### 4.2 Out of Scope

- Migrasi antar project Firebase.
- Multi-tenant lintas cabang fisik di fase awal.
- Refactor total arsitektur modul yang tidak berkaitan dengan akses lantai.

---

## 5. Stakeholder

- Product Owner / Owner Toko
- Admin Operasional
- Supervisor Lantai
- Staff Lantai 1
- Staff Lantai 2
- Tim Developer

---

## 6. Solusi yang Dipilih (Best Practice)

Gunakan 1 aplikasi + 1 project Firebase, dengan pemisahan akses berbasis floorId.

Kenapa solusi ini dipilih:

- Maintenance lebih hemat (single source of truth).
- Update fitur/bugfix sekali deploy.
- Monitoring dan audit lebih sederhana.
- Tidak menambah overhead operasional dari project terpisah.

Prinsip desain:

- Data dipisah secara path (bukan hanya field) untuk mengurangi risiko salah query.
- Rules menjadi guard utama, frontend hanya guard tambahan.

---

## 7. Kebutuhan Fungsional

### FR-01 Login dan Konteks Lantai

- Setelah login, sistem menentukan floor yang diizinkan untuk user.
- User single-floor langsung terkunci ke floor tersebut.
- User multi-floor (mis. admin/supervisor tertentu) dapat memilih floor aktif.

### FR-02 Isolasi Data per Lantai

- User hanya dapat melihat data lantai yang diizinkan.
- Operasi create/update/delete hanya berlaku pada lantai aktif.

### FR-03 Konsistensi Query

- Semua query Firestore/RTDB wajib menyertakan scope floorId.
- Tidak boleh ada query global tanpa floor scope, kecuali endpoint admin lintas lantai.

### FR-04 Isolasi File Storage

- Upload file wajib masuk ke path yang memuat floorId.
- Download/delete file wajib melalui path floor yang sesuai hak akses.

### FR-05 Cloud Functions Aware Floor

- Trigger/HTTP Callable wajib memvalidasi floorId dari request/claims.
- Function menolak request jika floorId tidak sesuai hak akses user.

### FR-06 Audit Dasar

- Simpan metadata createdBy, updatedBy, floorId, createdAt, updatedAt untuk data penting.

---

## 8. Kebutuhan Non-Fungsional

- Security: enforcement utama di Firebase Rules.
- Reliability: fallback aman ketika floor context tidak valid.
- Performance: query menggunakan index sesuai floorId.
- Maintainability: helper terpusat untuk floor scope agar tidak duplikasi.
- Observability: logging error unauthorized per modul.

---

## 9. Desain Data dan Akses

## 9.1 Auth

Sumber floor authorization:

- Disarankan: Firebase Custom Claims (allowedFloors, role).
- Cadangan: koleksi users di Firestore untuk metadata tambahan UI.

Contoh claim:

- role: "staf"
- allowedFloors: ["L1"]

Contoh claim admin:

- role: "admin"
- allowedFloors: ["L1", "L2"]

## 9.2 Firestore

Disarankan pemisahan path berbasis lantai:

- floors/{floorId}/penjualan/{docId}
- floors/{floorId}/servis/{docId}
- floors/{floorId}/antrian/{docId}
- floors/{floorId}/inventory/{docId}

Data global (shared) tetap di root terpisah:

- config/\*
- masterData/\*

## 9.3 Realtime Database

Node berbasis lantai:

- floorData/{floorId}/display/\*
- floorData/{floorId}/antrian/\*
- floorData/{floorId}/presence/\*

## 9.4 Storage

Path berbasis lantai:

- floors/{floorId}/promotions/{year}/{month}/{contentType}/{fileName}
- floors/{floorId}/medical-certificates/{year}/{month}/{fileName}
- floors/{floorId}/bukti-pengambilan/{year}/{month}/{fileName}

## 9.5 Cloud Functions

Semua function yang menyentuh data scoped wajib:

- Ambil uid dan claims user.
- Validasi floorId request terhadap allowedFloors.
- Reject dengan error permission-denied bila tidak valid.

---

## 10. Security Rules (Arah Implementasi)

## 10.1 Firestore Rules (konsep)

- allow read/write hanya jika request.auth != null
- dan floorId pada path ada di request.auth.token.allowedFloors

## 10.2 RTDB Rules (konsep)

- path floorData/$floorId hanya bisa diakses jika auth.token.allowedFloors berisi $floorId

## 10.3 Storage Rules (konsep)

- match floors/{floorId}/... dan validasi allowedFloors claim
- plus validasi size/contentType sesuai kebutuhan tiap folder

Catatan penting:

- Frontend check tidak menggantikan Security Rules.
- Rules harus dianggap sumber kebenaran otorisasi.

---

## 11. Perubahan Aplikasi (Frontend)

- Tambahkan floor context manager (mis. composable/store):
  - getActiveFloor()
  - setActiveFloor()
  - getAllowedFloors()
- Semua service/query existing memakai floor context.
- Komponen layout menampilkan badge floor aktif.
- Admin multi-floor memiliki selector floor (jika diperlukan).

---

## 12. Rencana Migrasi

## Fase 0 - Persiapan

- Inventarisasi collection/node/path yang harus di-scope per lantai.
- Definisikan mapping data lama -> floorId.

## Fase 1 - Foundation

- Tambah custom claims allowedFloors.
- Tambah helper floor context di app.
- Tambah rules baru dalam mode kompatibilitas.

## Fase 2 - Dual Write (Opsional aman)

- Tulis data ke struktur lama + baru sementara.
- Verifikasi parity data.

## Fase 3 - Read Switch

- Ubah semua query baca ke struktur berbasis floor.

## Fase 4 - Cleanup

- Hapus jalur lama setelah validasi dan backup.
- Kunci rules agar hanya path baru yang aktif.

---

## 13. Rencana Testing

### 13.1 Unit Test

- Helper floor context.
- Mapper payload + floorId.

### 13.2 Integration Test

- User L1 tidak bisa akses data L2.
- User L2 tidak bisa akses data L1.
- Admin multi-floor bisa switch floor dan query benar.

### 13.3 Security Test

- Uji bypass query manual tanpa floor scope.
- Uji akses langsung ke path Storage lantai lain.
- Uji callable function dengan floorId ilegal.

### 13.4 UAT

- Skenario transaksi penjualan di L1 dan L2 simultan.
- Skenario cetak, laporan, antrian, promosi per lantai.

---

## 14. KPI Keberhasilan

- 100% modul scoped by floorId untuk data operasional.
- 0 insiden akses lintas lantai tanpa hak.
- 1 codebase aktif untuk 2 lantai.
- Pengurangan effort maintenance minimal 40% setelah 1-2 sprint.

---

## 15. Risiko dan Mitigasi

1. Risiko: Salah query tanpa floor scope  
   Mitigasi: helper query wajib + code review checklist + lint rule internal.

2. Risiko: Rules belum lengkap  
   Mitigasi: test matrix rules sebelum go-live, staged rollout.

3. Risiko: Data migrasi salah lantai  
   Mitigasi: backup, dry-run, dan verifikasi sampling per modul.

4. Risiko: User kehilangan akses pasca-claim update  
   Mitigasi: fallback lookup di users profile + script rollback claim.

---

## 16. Estimasi Implementasi

- Sprint 1:
  - Desain data final, claims, helper floor context, rules draft.
- Sprint 2:
  - Migrasi query modul prioritas (penjualan, servis, antrian).
- Sprint 3:
  - Migrasi modul lain, storage path, functions, testing menyeluruh.
- Sprint 4 (opsional):
  - Hardening, cleanup legacy path, dokumentasi final.

---

## 17. Open Questions

- Apakah admin harus melihat gabungan L1+L2 dalam 1 layar, atau wajib pilih lantai dulu?
- Modul mana yang perlu data global lintas lantai (mis. master katalog)?
- Apakah diperlukan audit trail detail per aksi kritikal (delete/approve)?
- Apakah akan ada penambahan lantai/cabang di masa depan (L3, cabang baru)?

---

## 18. Keputusan Final PRD

Keputusan arsitektur untuk fase ini:

- Tetap 1 aplikasi dan 1 Firebase project.
- Tambahkan floorId/tenant scope berbasis user login.
- Enforce akses per lantai di seluruh layer (UI, services, functions, rules).

Dokumen ini menjadi acuan implementasi teknis lintas modul.
