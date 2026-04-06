# PRD-02: Modul Antrian

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Antrian mengelola sistem nomor antrian pelanggan toko dengan dua tampilan: panel admin untuk kontrol antrian, dan layar display publik yang menampilkan nomor giliran. Data antrian menggunakan **Firebase Realtime Database** (bukan Firestore) untuk latensi rendah dan sinkronisasi real-time.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama       | Route Vue Baru     | Deskripsi                            |
| -------------------- | ------------------ | ------------------------------------ |
| `admin-antrian.html` | `/antrian/admin`   | Panel kontrol antrian (staff)        |
| `display.html`       | `/antrian/display` | Layar display publik (monitor kasir) |
| `analisis.html`      | `/antrian/laporan` | Analitik dan laporan antrian         |

---

## 3. Firebase Data Model

### 3.1 Firebase Realtime Database (bukan Firestore)

#### `/queue`

```javascript
{
  current: {
    letter: "A",           // Huruf antrian aktif
    number: 5,             // Nomor antrian saat ini yang dipanggil
    displayText: "A5",     // Teks yang ditampilkan di layar
    calledAt: timestamp    // Waktu dipanggil
  },
  counters: {
    A: 10,   // Total antrian huruf A yang sudah diterbitkan
    B: 3,
    C: 7,
    D: 0
  },
  skipList: [
    { letter: "A", number: 3, skippedAt: timestamp },
    // ... nomor yang dilewati
  ],
  history: [
    { letter: "A", number: 1, servedAt: timestamp },
    // ... histori yang sudah dilayani
  ],
  status: "active" | "paused" | "closed"
}
```

#### `/customerCount`

```javascript
{
  date: "2024-01-15",
  count: 42,
  updatedAt: timestamp
}
```

### 3.2 Struktur Huruf Antrian

| Kode | Layanan            |
| ---- | ------------------ |
| A    | Layanan Umum       |
| B    | Khusus / Prioritas |
| C    | Servis / Reparasi  |
| D    | Pembelian Emas     |

_Konfigurasi huruf dapat disesuaikan di `settings`._

---

## 4. User Stories

### 4.1 Admin Antrian (/antrian/admin)

| ID       | Sebagai | Saya ingin                                     | Agar                               |
| -------- | ------- | ---------------------------------------------- | ---------------------------------- |
| US-AN-01 | Admin   | Melihat nomor antrian yang sedang aktif        | Tahu status antrian saat ini       |
| US-AN-02 | Admin   | Panggil nomor berikutnya (Next)                | Melayani pelanggan berikutnya      |
| US-AN-03 | Admin   | Skip nomor yang tidak hadir                    | Lanjut ke pelanggan berikutnya     |
| US-AN-04 | Admin   | Kembali ke nomor sebelumnya (Previous)         | Koreksi jika panggilan salah       |
| US-AN-05 | Admin   | Lihat daftar nomor yang di-skip                | Monitoring pelanggan yang terlewat |
| US-AN-06 | Admin   | Reset antrian di akhir hari                    | Mulai dari nol keesokan harinya    |
| US-AN-07 | Admin   | Tambah/kurangi counter pelanggan secara manual | Hitung jumlah pengunjung fisik     |
| US-AN-08 | Admin   | Lihat status koneksi Firebase                  | Pastikan sistem online             |

### 4.2 Display Antrian (/antrian/display)

| ID       | Sebagai   | Saya ingin                            | Agar                                                 |
| -------- | --------- | ------------------------------------- | ---------------------------------------------------- |
| US-DS-01 | Pelanggan | Melihat nomor yang sedang dilayani    | Tahu kapan giliran saya                              |
| US-DS-02 | Pelanggan | Layar update otomatis tanpa refresh   | Tidak perlu reload manual                            |
| US-DS-03 | Pelanggan | Informasi jumlah pelanggan hari ini   | Estimasi waktu tunggu                                |
| US-DS-04 | Sistem    | Audio notifikasi saat nomor dipanggil | Pelanggan yang tidak memperhatikan layar bisa dengar |
| US-DS-05 | Sistem    | Indikator offline jika koneksi putus  | Transparansi status sistem                           |

### 4.3 Laporan Antrian (/antrian/laporan)

| ID       | Sebagai | Saya ingin                                | Agar                           |
| -------- | ------- | ----------------------------------------- | ------------------------------ |
| US-LP-01 | Admin   | Lihat total antrian per hari/minggu/bulan | Analitik traffic pelanggan     |
| US-LP-02 | Admin   | Lihat distribusi antrian per huruf        | Tahu layanan mana paling ramai |
| US-LP-03 | Admin   | Export laporan ke Excel/PDF               | Laporan untuk manajemen        |
| US-LP-04 | Admin   | Lihat rata-rata waktu tunggu              | Evaluasi kinerja layanan       |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/antrian/
├── AdminAntrianView.vue    # Panel kontrol admin
├── DisplayAntrianView.vue  # Layar display publik (no sidebar)
└── LaporanAntrianView.vue  # Laporan & analitik
```

### 5.2 Komponen Khusus Antrian

```
src/components/antrian/
├── QueueDisplay.vue         # Tampilan nomor besar di display
├── QueueControlPanel.vue    # Tombol Next/Skip/Previous
├── QueueCounters.vue        # Counter per huruf (A:10, B:3, ...)
├── SkipListTable.vue        # Tabel nomor yang di-skip
├── CustomerCountWidget.vue  # Widget jumlah pelanggan
├── ConnectionStatus.vue     # Indikator status koneksi Realtime DB
└── QueueResetModal.vue      # Modal konfirmasi reset antrian
```

### 5.3 Composables

```javascript
// composables/useQueue.js
export function useQueue() {
  const queueRef = ref(null); // Firebase Realtime DB ref
  const currentQueue = ref({});
  const skipList = ref([]);

  const listenQueue = () => {
    // onValue listener → update currentQueue
  };
  const callNext = async () => {};
  const skipCurrent = async () => {};
  const callPrevious = async () => {};
  const resetQueue = async () => {};

  onUnmounted(() => {
    off(queueRef);
  }); // Cleanup listener

  return { currentQueue, skipList, listenQueue, callNext, skipCurrent, callPrevious, resetQueue };
}

// composables/useCustomerCount.js
export function useCustomerCount() {
  const count = ref(0);
  const increment = async () => {};
  const decrement = async () => {};
  const reset = async () => {};
  const listenCount = () => {};
  return { count, increment, decrement, reset, listenCount };
}
```

---

## 6. Pinia Store — `queueStore`

```javascript
// stores/queue.js
import { defineStore } from "pinia";
import { ref as dbRef, onValue, update, push } from "firebase/database";
import { realtimeDb } from "@/config/firebase";

export const useQueueStore = defineStore("queue", {
  state: () => ({
    current: { letter: "", number: 0, displayText: "-" },
    counters: { A: 0, B: 0, C: 0, D: 0 },
    skipList: [],
    history: [],
    customerCount: 0,
    status: "active",
    isConnected: true,
  }),
  actions: {
    startListening() {
      // onValue('/queue') → update state
      // onValue('/.info/connected') → update isConnected
    },
    stopListening() {
      // off() semua listener
    },
    async callNext() {
      // Cari nomor berikutnya yang belum di-skip
      // Update /queue/current di Realtime DB
    },
    async skipCurrent() {
      // Tambahkan current ke skipList
      // Panggil nomor berikutnya
    },
    async callPrevious() {
      // Mundur satu nomor dari history
    },
    async resetAll() {
      // Reset semua counter dan history
    },
  },
});
```

---

## 7. Display View — Layout Khusus

Halaman display (`DisplayAntrianView.vue`) harus menggunakan layout **tanpa sidebar dan header**. Gunakan `meta.layout = 'blank'` di router:

```javascript
// router/index.js
{
  path: '/antrian/display',
  component: DisplayAntrianView,
  meta: { layout: 'blank', requiresAuth: false }
}
```

```vue
<!-- App.vue -->
<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script setup>
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";
// Resolve layout berdasarkan route.meta.layout
</script>
```

### 7.1 Design Display

- Background gelap (dark mode)
- Font nomor antrian besar: `font-size: 15rem` atau lebih
- Animasi muncul saat nomor berubah (CSS transition / Vue Transition)
- Ticker berjalan (nama toko / promosi) di bagian bawah
- Audio notifikasi saat nomor baru dipanggil

---

## 8. Audio Notification

```javascript
// Di DisplayAntrianView.vue, watch perubahan nomor antrian
watch(
  () => queueStore.current.displayText,
  (newVal, oldVal) => {
    if (newVal !== oldVal && oldVal !== "-") {
      const audio = new Audio("/audio/antrian.mp3");
      audio.play();
    }
  },
);
```

---

## 9. Koneksi Firebase Realtime DB

### 9.1 Inisialisasi

```javascript
// config/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const app = initializeApp(firebaseConfig);
export const realtimeDb = getDatabase(app);
```

### 9.2 Connection Monitoring

```javascript
import { ref as dbRef, onValue } from "firebase/database";
const connectedRef = dbRef(realtimeDb, ".info/connected");
onValue(connectedRef, (snap) => {
  isConnected.value = snap.val() === true;
});
```

---

## 10. Route Guard & Permission

```javascript
{
  path: '/antrian/admin',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor', 'staf'] }
},
{
  path: '/antrian/display',
  meta: { requiresAuth: false, layout: 'blank' }  // Publik, no sidebar
},
{
  path: '/antrian/laporan',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
}
```

---

## 11. Laporan Antrian

Data laporan diambil dari:

- `/queue/history` untuk antrian yang selesai dilayani
- `/customerCount` untuk statistik harian
- Dikelompokkan per hari/minggu/bulan di frontend (computed)

Chart menggunakan `Chart.js` (sudah ada di stack):

- Bar chart: jumlah antrian per hari
- Pie chart: distribusi per huruf (A/B/C/D)
- Line chart: tren mingguan

---

## 12. Acceptance Criteria

- [ ] Nomor antrian terbaru muncul di layar display dalam < 1 detik setelah admin klik "Next"
- [ ] Audio notifikasi berbunyi di display saat nomor berganti
- [ ] Skip list tersimpan dan bisa dilihat di panel admin
- [ ] Reset antrian menghapus semua counter dan history (konfirmasi dua langkah)
- [ ] Display berjalan tanpa login (route publik)
- [ ] Indicator offline muncul saat koneksi terputus
- [ ] Counter pelanggan bisa diubah ±1 manual oleh admin
- [ ] Laporan menampilkan chart distribusi antrian per huruf
