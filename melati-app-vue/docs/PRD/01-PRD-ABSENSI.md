# PRD-01: Modul Absensi

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Absensi mengelola pencatatan kehadiran karyawan secara digital dengan dukungan face recognition, pengajuan dan persetujuan izin, serta laporan kehadiran harian/bulanan.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama           | Route Vue Baru               | Deskripsi                                 |
| ------------------------ | ---------------------------- | ----------------------------------------- |
| `sistemAbsensi.html`     | `/absensi/kehadiran`         | Scanner wajah / barcode / manual          |
| `pengajuan-izin.html`    | `/absensi/pengajuan-izin`    | Karyawan mengajukan izin/cuti/sakit       |
| `laporan-kehadiran.html` | `/absensi/laporan-kehadiran` | Laporan harian & bulanan Admin/Supervisor |
| `laporan-izin.html`      | `/absensi/laporan-izin`      | Laporan pengajuan izin                    |
| `supervisor.html`        | `/absensi/status-pengajuan`  | Status pengajuan izin (approval)          |
| `tambah-pengguna.html`   | `/absensi/tambah-pengguna`   | Manajemen data karyawan + scan wajah      |
| `jam-absensi.html`       | `/admin/jam-absensi`         | Setting jam kerja & batas absensi         |

---

## 3. Firebase Data Model

### 3.1 Firestore Collections

#### `employees/{employeeId}`

```javascript
{
  name: string,           // Nama lengkap
  employeeId: string,     // ID karyawan (mis. EMP001)
  role: string,           // 'admin' | 'supervisor' | 'staf' | 'admin_custom'
  phone: string,          // Nomor telepon
  isActive: boolean,      // Status aktif
  createdAt: Timestamp
}
```

#### `employeeFaces/{employeeId}`

```javascript
{
  employeeId: string,
  descriptors: Array<Float32Array>,  // Array float dari face-api.js
  updatedAt: Timestamp
}
```

#### `attendance/{docId}`

```javascript
{
  employeeId: string,
  employeeName: string,
  date: string,            // Format: YYYY-MM-DD
  checkInTime: string,     // Format: HH:mm:ss
  checkOutTime: string,    // null jika belum checkout
  method: string,          // 'face' | 'barcode' | 'manual'
  status: string,          // 'hadir' | 'terlambat' | 'izin'
  notes: string            // Keterangan tambahan
}
```

#### `leaveRequests/{requestId}`

```javascript
{
  employeeId: string,
  employeeName: string,
  leaveType: string,       // 'Sakit' | 'Cuti' | 'Normal'
  startDate: string,       // YYYY-MM-DD
  endDate: string,
  reason: string,
  replacementType: string, // 'libur' | 'jam' | 'tidak'
  replacementDate: string, // null jika tidak ada pengganti
  replacementTime: string,
  medicalCertUrl: string,  // Firebase Storage URL (khusus Sakit)
  status: string,          // 'pending' | 'approved' | 'rejected'
  submittedAt: Timestamp,
  approvedBy: string,      // employeeId Supervisor
  approvedAt: Timestamp
}
```

#### `settings/attendanceThresholds`

```javascript
{
  workStartTime: string,   // "08:00"
  lateThreshold: number,   // menit toleransi keterlambatan
  checkInDeadline: string, // "12:00"
  checkOutTime: string     // "17:00"
}
```

---

## 4. User Stories

### 4.1 Kehadiran (absensi/kehadiran)

| ID       | Sebagai  | Saya ingin                              | Agar                               |
| -------- | -------- | --------------------------------------- | ---------------------------------- |
| US-AB-01 | Karyawan | Scan wajah untuk absensi masuk          | Tercatat hadir tanpa tanda tangan  |
| US-AB-02 | Karyawan | Scan wajah untuk absensi keluar         | Tercatat jam keluar                |
| US-AB-03 | Karyawan | Absensi via barcode / ID                | Backup jika kamera tidak tersedia  |
| US-AB-04 | Admin    | Input manual dengan password verifikasi | Koreksi absensi yang gagal scan    |
| US-AB-05 | Sistem   | Inactivity timeout setelah 60 detik     | Reset ke halaman absensi otomatis  |
| US-AB-06 | Sistem   | Audio feedback (suara Indonesia)        | Konfirmasi keberhasilan absensi    |
| US-AB-07 | Sistem   | Deteksi wajah real-time via kamera      | Mengenali karyawan secara otomatis |

### 4.2 Pengajuan Izin (absensi/pengajuan-izin)

| ID       | Sebagai  | Saya ingin                                 | Agar                             |
| -------- | -------- | ------------------------------------------ | -------------------------------- |
| US-IZ-01 | Karyawan | Ajukan izin dengan jenis Sakit/Cuti/Normal | Ada rekam formal pengajuan       |
| US-IZ-02 | Karyawan | Upload surat keterangan dokter             | Bukti izin sakit tersimpan       |
| US-IZ-03 | Karyawan | Isi jadwal pengganti                       | Admin tahu kapan saya mengganti  |
| US-IZ-04 | Karyawan | Lihat status pengajuan saya                | Tahu sudah di-approve atau belum |

### 4.3 Status Pengajuan (absensi/status-pengajuan)

| ID       | Sebagai    | Saya ingin                         | Agar                           |
| -------- | ---------- | ---------------------------------- | ------------------------------ |
| US-SP-01 | Supervisor | Lihat semua pengajuan izin pending | Bisa diproses sesegera mungkin |
| US-SP-02 | Supervisor | Approve / Reject pengajuan         | Status pengajuan berubah       |
| US-SP-03 | Supervisor | Hapus pengajuan dengan konfirmasi  | Rollback data yang salah       |

### 4.4 Laporan Kehadiran (absensi/laporan-kehadiran)

| ID       | Sebagai | Saya ingin                          | Agar                           |
| -------- | ------- | ----------------------------------- | ------------------------------ |
| US-LK-01 | Admin   | Filter laporan per tanggal/rentang  | Fleksibel melihat histori      |
| US-LK-02 | Admin   | Export ke Excel & PDF               | Laporan formal untuk manajemen |
| US-LK-03 | Admin   | Sorting & search di tabel kehadiran | Mudah mencari data karyawan    |

### 4.5 Tambah Pengguna (absensi/tambah-pengguna)

| ID       | Sebagai | Saya ingin                        | Agar                                   |
| -------- | ------- | --------------------------------- | -------------------------------------- |
| US-TP-01 | Admin   | CRUD data karyawan                | Manajemen SDM                          |
| US-TP-02 | Admin   | Scan & simpan data wajah karyawan | Face recognition bisa mengenali mereka |
| US-TP-03 | Admin   | Update data wajah yang sudah ada  | Refresh jika penampilan berubah        |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/absensi/
├── KehadiranView.vue       # Absensi utama + kamera
├── PengajuanIzinView.vue   # Form pengajuan izin
├── LaporanKehadiranView.vue
├── LaporanIzinView.vue
├── SupervisorView.vue
└── TambahPenggunaView.vue
```

### 5.2 Komponen Khusus Absensi

```
src/components/absensi/
├── FaceScanner.vue         # Kamera + face-api.js integration
├── BarcodeScannerInput.vue # Input barcode keyboard listener
├── ManualInputModal.vue    # Modal input manual + verifikasi password
├── AttendanceStatusCard.vue # Kartu status karyawan saat absensi
├── LeaveRequestForm.vue    # Form pengajuan izin
├── MedicalCertUpload.vue   # Upload surat dokter
├── ReplacementSchedule.vue # Input jadwal pengganti
├── LeaveApprovalCard.vue   # Kartu approval di supervisor
└── AttendanceTable.vue     # Tabel laporan kehadiran
```

### 5.3 Composables

```javascript
// composables/useFaceRecognition.js
export function useFaceRecognition() {
  const startCamera = async () => {};
  const loadFaceModels = async () => {};
  const detectFace = async (videoElement) => {};
  const matchFace = (descriptor, knownDescriptors) => {};
  return { startCamera, loadFaceModels, detectFace, matchFace };
}

// composables/useAttendance.js
export function useAttendance() {
  const recordCheckIn = async (employeeId, method) => {};
  const recordCheckOut = async (employeeId) => {};
  const getTodayAttendance = async () => {};
  return { recordCheckIn, recordCheckOut, getTodayAttendance };
}

// composables/useInactivityTimer.js
export function useInactivityTimer(timeout = 60000) {
  const reset = () => {};
  const onTimeout = (callback) => {};
  return { reset, onTimeout };
}
```

---

## 6. Pinia Store — `attendanceStore`

```javascript
// stores/attendance.js
export const useAttendanceStore = defineStore("attendance", {
  state: () => ({
    employees: [], // Array employee aktif
    faceDescriptors: {}, // { employeeId: [descriptors] }
    todayAttendance: [], // Array attendance hari ini
    settings: {}, // attendanceThresholds
    isModelLoaded: false, // face-api.js status
    processingEmployee: null, // Nama karyawan yang sedang diproses
  }),
  actions: {
    async loadEmployees() {},
    async loadFaceDescriptors() {},
    async recordAttendance(employeeId, type) {},
    async listenTodayAttendance() {}, // onSnapshot listener
    async loadSettings() {},
  },
  getters: {
    presentToday: (state) => state.todayAttendance.filter((a) => a.checkInTime),
    absentToday: (state) => {
      /* employees yang belum hadir */
    },
  },
});
```

---

## 7. Face Recognition Integration

### 7.1 Setup face-api.js dengan Vite

```javascript
// vite.config.js - perlu alias karena face-api.js membutuhkan tf.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ["face-api.js"],
  },
});
```

### 7.2 Model Files

Salin folder `js/face-api/` ke `public/face-api/` agar dapat diakses sebagai static asset.

### 7.3 FaceScanner.vue lifecycle

```vue
<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useFaceRecognition } from "@/composables/useFaceRecognition";

const { startCamera, loadFaceModels, detectFace, matchFace } = useFaceRecognition();
const videoRef = ref(null);
let scanInterval = null;

onMounted(async () => {
  await loadFaceModels(); // Load dari /public/face-api/
  await startCamera(videoRef.value);
  scanInterval = setInterval(() => detectAndMatch(), 500);
});

onUnmounted(() => {
  clearInterval(scanInterval);
  // Stop camera stream
  if (videoRef.value?.srcObject) {
    videoRef.value.srcObject.getTracks().forEach((t) => t.stop());
  }
});
</script>
```

---

## 8. Audio Feedback

File audio disimpan di `public/audio/`. Dimainkan via composable:

```javascript
// composables/useAudio.js
export function useAudio() {
  const play = (filename) => {
    const audio = new Audio(`/audio/${filename}`);
    audio.play().catch(console.warn);
  };
  return { play };
}
```

Contoh penggunaan: `play('hadir.mp3')`, `play('sudah-absen.mp3')`

---

## 9. File Upload (Medical Certificate)

- Upload via Firebase Storage
- Path: `medical-certs/{employeeId}/{requestId}.{ext}`
- Validasi: max 2MB, format jpg/png/pdf
- Kompresi gambar ke quality 0.7 sebelum upload (sama seperti existing)
- URL disimpan di `leaveRequests.medicalCertUrl`

```javascript
// services/leave-service.js
export async function uploadMedicalCert(file, employeeId, requestId) {
  if (file.size > 2 * 1024 * 1024) throw new Error("File max 2MB");
  const compressedFile = await compressImage(file, 0.7);
  const path = `medical-certs/${employeeId}/${requestId}`;
  // ... Firebase Storage upload
}
```

---

## 10. Real-time Listeners

| Event                  | Metode                 | Filter Wajib                       | Komponen                    |
| ---------------------- | ---------------------- | ---------------------------------- | --------------------------- |
| Settings absensi       | `getDoc` + Pinia cache | —                                  | KehadiranView (load sekali) |
| Absensi hari ini       | `onSnapshot`           | `where('date', '==', today)`       | KehadiranView               |
| Pengajuan izin pending | `onSnapshot`           | `where('status', '==', 'pending')` | SupervisorView              |
| Laporan kehadiran      | `getDocs`              | range + `limit(500)`               | LaporanKehadiranView        |

Semua listener di-cleanup di `onUnmounted()`. Settings **tidak menggunakan** `onSnapshot` — cukup `getDoc` satu kali karena jarang berubah.

---

## 11. Route Guard & Permission

```javascript
// router config untuk modul ini
{
  path: '/absensi/tambah-pengguna',
  component: TambahPenggunaView,
  meta: { requiresAuth: true, roles: ['admin'] }
},
{
  path: '/absensi/status-pengajuan',
  component: SupervisorView,
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
},
{
  path: '/absensi/kehadiran',
  component: KehadiranView,
  meta: { requiresAuth: false }  // Halaman publik (kiosk)
}
```

---

## 12. Perubahan UX / Perbaikan

| Perubahan                          | Deskripsi                                                      |
| ---------------------------------- | -------------------------------------------------------------- |
| Inactivity timer via Vue lifecycle | `watch` + `onMounted` menggantikan `window.setTimeout`         |
| Face scan loading indicator        | `AppLoading.vue` saat model face-api.js loading                |
| Responsive kamera view             | Layout kamera menyesuaikan layar mobile                        |
| Toast notification                 | Menggantikan `Swal.fire` sederhana dengan toast di pojok layar |

---

## 13. Dependensi Tambahan

```json
{
  "face-api.js": "^0.22.2",
  "@tensorflow/tfjs": "^4.x"
}
```

---

## 14. Acceptance Criteria

- [ ] Face recognition mendeteksi wajah dan cocokkan dengan data dalam 2 detik
- [ ] Absensi berhasil disimpan ke Firestore dengan format dokumen yang sama seperti existing
- [ ] Timer inactivity 60 detik me-reset tampilan keosk
- [ ] Upload surat dokter berhasil ke Firebase Storage, maks 2MB
- [ ] Supervisor bisa approve/reject dan data berubah real-time
- [ ] Export laporan Excel & PDF menghasilkan file yang sama formatnya
- [ ] Audio feedback dimainkan setelah absensi berhasil
- [ ] Halaman kiosk tidak memerlukan login

---

## 15. Firestore Read Strategy

Mengacu pada [PRD-00 §16](./00-MIGRATION-OVERVIEW.md#16-strategi-optimasi-firestore-reads). Aturan spesifik modul Absensi:

### 15.1 `employees` — Satu Kali Load, Cache di Pinia

```javascript
// stores/attendance.js
async loadEmployees() {
  if (this.employees.length > 0) return  // ← cache-first check

  const snap = await getDocs(
    query(collection(db, 'employees'), where('isActive', '==', true))
  )
  this.employees = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
```

Re-fetch **hanya** dipicu setelah admin melakukan tambah/edit/hapus karyawan (explicit invalidation: `this.employees = []` → trigger load ulang).

### 15.2 `employeeFaces` — sessionStorage Cache (Payload Besar)

Face descriptor adalah Float32Array dengan ~128 angka per foto × beberapa sampel per karyawan. Untuk 20 karyawan, total bisa **100-300KB**. Harus di-cache:

```javascript
// composables/useFaceRecognition.js
const FACE_CACHE_KEY = "faceDescriptorsCache";

async function loadFaceDescriptors(forceRefresh = false) {
  const cached = sessionStorage.getItem(FACE_CACHE_KEY);
  if (cached && !forceRefresh) {
    return JSON.parse(cached); // ← 0 Firestore reads
  }

  const snap = await getDocs(collection(db, "employeeFaces"));
  const data = snap.docs.map((d) => d.data());
  sessionStorage.setItem(FACE_CACHE_KEY, JSON.stringify(data));
  return data; // ← N reads (N = jumlah karyawan)
}
```

Invalidasi cache: hanya ketika admin simpan face data baru (`TambahPenggunaView` → hapus key `FACE_CACHE_KEY` dari sessionStorage).

### 15.3 `attendance` (Absensi Hari Ini) — `onSnapshot` dengan Filter Ketat

```javascript
// Di attendanceStore.listenTodayAttendance()
const today = getTodayString(); // 'YYYY-MM-DD'
const q = query(
  collection(db, "attendance"),
  where("date", "==", today),
  // Tidak pakai orderBy agar tidak butuh composite index
);
const unsubscribe = onSnapshot(q, (snap) => {
  this.todayAttendance = snap.docs.map((d) => d.data());
});
this.unsubscribeAttendance = unsubscribe;
```

`onSnapshot` hanya aktif selama `KehadiranView` terbuka. `unsubscribe()` dipanggil di `onUnmounted`.

### 15.4 `attendance` (Laporan) — `getDocs` + Limit + Pagination

```javascript
// Di LaporanKehadiranView — TIDAK gunakan onSnapshot
async loadAttendanceReport(startDate, endDate, lastDoc = null) {
  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc'),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
    limit(500)
  )
  const snap = await getDocs(q)
  return {
    data: snap.docs.map(d => d.data()),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === 500
  }
}
```

### 15.5 `leaveRequests` (Supervisor) — `onSnapshot` dengan Filter Status

```javascript
// Hanya fetch status 'pending' — bukan semua leave requests
const q = query(collection(db, "leaveRequests"), where("status", "==", "pending"), orderBy("submittedAt", "desc"));
const unsubscribe = onSnapshot(q, (snap) => {
  this.pendingRequests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
});
```

Untuk halaman `LaporanIzinView` (histori semua izin): gunakan `getDocs` dengan filter range tanggal + `limit(200)`, bukan `onSnapshot`.

### 15.6 `settings/attendanceThresholds` — `getDoc` Satu Kali

```javascript
// Di attendanceStore — getDoc (bukan onSnapshot)
async loadSettings() {
  if (Object.keys(this.settings).length > 0) return  // cache-first

  const snap = await getDoc(doc(db, 'settings', 'attendanceThresholds'))
  this.settings = snap.data() ?? {}
}
```

Settings tidak menggunakan listener karena perubahan jam absensi sangat jarang dan tidak perlu real-time.

### 15.7 Estimasi Read Budget per Hari

| Operasi                             | Reads/hari                   | Catatan                  |
| ----------------------------------- | ---------------------------- | ------------------------ |
| Load employees                      | 1× per session               | Cache Pinia              |
| Load face descriptors               | 1× per session               | Cache sessionStorage     |
| Load settings                       | 1× per session               | Cache Pinia              |
| onSnapshot today attendance         | ~20 docs × (perubahan × 2)   | Realtime justified       |
| Absensi write → snapshot re-deliver | N docs per hari (N karyawan) | Inherent dari onSnapshot |
| Laporan query (jika dibuka)         | Max 500 per query            | One-shot getDocs         |
| Supervisor pending leaves           | ~5-10 docs (low volume)      | OK                       |
