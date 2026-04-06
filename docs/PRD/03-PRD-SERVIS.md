# PRD-03: Modul Servis

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Servis mengelola penerimaan, pemrosesan, dan pelaporan pekerjaan servis perhiasan. Data disimpan di Firestore dengan caching berlapis. Terdapat integrasi WhatsApp untuk notifikasi pelanggan dan print service (Node.js lokal) untuk mencetak slip servis.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama        | Route Vue Baru    | Deskripsi                             |
| --------------------- | ----------------- | ------------------------------------- |
| `input-servis.html`   | `/servis/input`   | Form penerimaan servis baru           |
| `data-servis.html`    | `/servis/data`    | Daftar semua data servis + edit/hapus |
| `laporan-servis.html` | `/servis/laporan` | Laporan bulanan servis                |

---

## 3. Firebase Data Model

### 3.1 Firestore Collection: `servis/{docId}`

```javascript
{
  // Identitas
  id: string,                // Auto-generated
  nomorServis: string,       // Format: SRV-YYYYMMDD-XXX
  tanggal: string,           // YYYY-MM-DD (tanggal masuk)

  // Data Pelanggan
  namaPelanggan: string,
  noHp: string,              // Format 08x (WA akan convert ke 628x)

  // Detail Pekerjaan
  jenisPekerjaan: string,    // 'GRAFIR' | 'PATRI' | 'LASER' | 'KIKIR' | 'POLES' | 'CUSTOM'
  deskripsi: string,         // Deskripsi detail pekerjaan
  barang: string,            // Jenis barang yang diservis

  // Status & Pembayaran
  status: string,            // 'MASUK' | 'PROSES' | 'SELESAI' | 'DIAMBIL'
  pembayaran: string,        // 'LUNAS' | 'BELUM LUNAS' | 'GRATIS'
  harga: number,             // Biaya servis
  dp: number,                // Uang muka (jika ada)

  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,         // employeeId
  updatedBy: string,

  // Opsional
  estimasiSelesai: string,   // Tanggal estimasi selesai
  catatan: string            // Catatan internal
}
```

#### `settings/passwords` (dibagikan dengan modul lain)

```javascript
{
  supervisorPassword: string,  // Hashed password untuk aksi sensitif
  adminPassword: string
}
```

---

## 4. User Stories

### 4.1 Input Servis (/servis/input)

| ID       | Sebagai | Saya ingin                          | Agar                               |
| -------- | ------- | ----------------------------------- | ---------------------------------- |
| US-SV-01 | Staf    | Isi form penerimaan servis          | Data servis tersimpan ke Firestore |
| US-SV-02 | Staf    | Pilih jenis pekerjaan dari dropdown | Input lebih cepat, konsisten       |
| US-SV-03 | Staf    | Input nomor HP pelanggan            | Bisa WA pelanggan nanti            |
| US-SV-04 | Staf    | Cetak slip servis setelah simpan    | Bukti fisik untuk pelanggan        |
| US-SV-05 | Staf    | Input harga dan status pembayaran   | Pencatatan keuangan servis         |
| US-SV-06 | Staf    | Form reset setelah berhasil simpan  | Siap input servis berikutnya       |

### 4.2 Data Servis (/servis/data)

| ID       | Sebagai          | Saya ingin                                       | Agar                        |
| -------- | ---------------- | ------------------------------------------------ | --------------------------- |
| US-DV-01 | Staf             | Lihat semua data servis bulan ini                | Monitoring pekerjaan aktif  |
| US-DV-02 | Staf             | Filter per bulan/tahun                           | Lihat histori servis        |
| US-DV-03 | Staf             | Update status servis (MASUK→PROSES→SELESAI)      | Tracking progress pekerjaan |
| US-DV-04 | Supervisor/Admin | Edit detail servis dengan verifikasi password    | Koreksi data yang salah     |
| US-DV-05 | Supervisor/Admin | Hapus data servis dengan verifikasi password     | Hapus data duplikat/salah   |
| US-DV-06 | Staf             | Kirim WA notifikasi ke pelanggan                 | Informasi servis selesai    |
| US-DV-07 | Staf             | Cetak ulang slip servis                          | Jika slip asli hilang       |
| US-DV-08 | Staf             | Search berdasarkan nama pelanggan / nomor servis | Mudah cari data tertentu    |

### 4.3 Laporan Servis (/servis/laporan)

| ID       | Sebagai | Saya ingin                               | Agar                           |
| -------- | ------- | ---------------------------------------- | ------------------------------ |
| US-LS-01 | Admin   | Filter laporan per periode (bulan/tahun) | Fleksibel melihat laporan      |
| US-LS-02 | Admin   | Rekap total pemasukan servis             | Laporan keuangan servis        |
| US-LS-03 | Admin   | Distribusi per jenis pekerjaan           | Analitik jenis layanan populer |
| US-LS-04 | Admin   | Export ke Excel & PDF                    | Laporan formal                 |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/servis/
├── InputServisView.vue      # Form input servis baru
├── DataServisView.vue       # Tabel data servis + aksi
└── LaporanServisView.vue    # Laporan & statistik
```

### 5.2 Komponen Khusus Servis

```
src/components/servis/
├── ServisForm.vue           # Form input servis (reusable untuk input & edit)
├── ServisTable.vue          # Tabel dengan filter bulan/tahun
├── ServisStatusBadge.vue    # Badge status (MASUK/PROSES/SELESAI/DIAMBIL)
├── PaymentBadge.vue         # Badge pembayaran (LUNAS/BELUM LUNAS/GRATIS)
├── ServisEditModal.vue      # Modal edit data servis
├── StatusUpdateModal.vue    # Modal cepat update status
├── WhatsAppButton.vue       # Tombol kirim WA dengan format pesan
└── ServisSlipPreview.vue    # Preview slip sebelum cetak
```

### 5.3 Composables

```javascript
// composables/useServisCache.js
export function useServisCache() {
  // Cache strategy:
  // - Bulan lampau: cache permanent (tidak pernah expire)
  // - Bulan ini: TTL 5 menit
  // - Bulan depan: TTL 2 jam
  const CACHE_KEY = "servisCache";
  const getCached = (monthKey) => {};
  const setCached = (monthKey, data) => {};
  const invalidate = (monthKey) => {};
  return { getCached, setCached, invalidate };
}

// composables/useWhatsApp.js
export function useWhatsApp() {
  const formatPhone = (phone) => {
    // 08xxx → 628xxx
    return phone.replace(/^0/, "62");
  };
  const sendWA = (phone, message) => {
    const url = `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };
  const buildServisMessage = (servis) => {
    return (
      `Yth. ${servis.namaPelanggan},\n` +
      `Servis Anda (${servis.nomorServis}) sudah selesai.\n` +
      `Silakan diambil. Terima kasih - Melati Gold Shop`
    );
  };
  return { sendWA, buildServisMessage, formatPhone };
}
```

---

## 6. Pinia Store — `servisStore`

```javascript
// stores/servis.js
export const useServisStore = defineStore("servis", {
  state: () => ({
    currentMonthData: [], // Data bulan sedang aktif
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),
    isLoading: false,
    unsubscribeListener: null, // Cleanup handle onSnapshot
  }),
  actions: {
    async loadByMonth(month, year) {
      // Cek cache dulu, jika miss → query Firestore
      // Bulan ini: gunakan onSnapshot (real-time)
      // Bulan lampau: getDocs (satu kali)
    },
    async saveServis(data) {
      // Simpan ke Firestore
      // Invalidate cache bulan ini
      // Trigger print slip
    },
    async updateStatus(id, newStatus) {
      // Update status di Firestore
      // Update reactive state lokal
    },
    async editServis(id, updatedData) {
      // Verifikasi password supervisor dulu
      // Update Firestore
    },
    async deleteServis(id) {
      // Verifikasi password supervisor dulu
      // Hapus dari Firestore
      // Invalidate cache
    },
  },
  getters: {
    totalRevenue: (state) =>
      state.currentMonthData.reduce((sum, s) => (s.pembayaran === "LUNAS" ? sum + s.harga : sum), 0),
    byStatus: (state) => (status) => state.currentMonthData.filter((s) => s.status === status),
  },
});
```

---

## 7. Real-time & Cache Strategy

### 7.1 Listener Servis

```javascript
// Di DataServisView.vue
onMounted(async () => {
  await servisStore.loadByMonth(servisStore.selectedMonth, servisStore.selectedYear);

  // Cross-tab sync: gunakan 'storage' event (bukan CustomEvent)
  // CustomEvent hanya bekerja di tab yang sama — tidak cross-tab
  window.addEventListener("storage", handleStorageSync);
});
onUnmounted(() => {
  window.removeEventListener("storage", handleStorageSync);
});

function handleStorageSync(e) {
  if (e.key === "servisDataChanged") {
    const { month, year } = JSON.parse(e.newValue);
    // Invalidasi cache bulan tersebut, lalu reload jika sedang aktif
    servisStore.invalidateCache(`${year}-${month}`);
    if (month === servisStore.selectedMonth && year === servisStore.selectedYear) {
      servisStore.loadByMonth(month, year);
    }
  }
}

// Saat menyimpan/edit/hapus servis, trigger cross-tab:
function notifyOtherTabs(month, year) {
  localStorage.setItem("servisDataChanged", JSON.stringify({ month, year, ts: Date.now() }));
}
```

### 7.2 Cache Implementation (Konkret)

```javascript
// composables/useServisCache.js
const CACHE_TTL = {
  currentMonth: 5 * 60 * 1000, // 5 menit
  futureMonth: 2 * 60 * 60 * 1000, // 2 jam
  pastMonth: null, // Permanent (tidak expire)
};

export function useServisCache() {
  const PREFIX = "servisCache_";

  function getCacheKey(year, month) {
    return `${PREFIX}${year}_${String(month).padStart(2, "0")}`;
  }

  function getTTL(year, month) {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const isFutureMonth = new Date(year, month - 1) > now;
    if (isFutureMonth) return CACHE_TTL.futureMonth;
    if (isCurrentMonth) return CACHE_TTL.currentMonth;
    return CACHE_TTL.pastMonth; // null = permanent
  }

  function getCached(year, month) {
    const key = getCacheKey(year, month);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const { data, savedAt, ttl } = JSON.parse(raw);
    if (ttl !== null && Date.now() - savedAt > ttl) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  }

  function setCached(year, month, data) {
    const key = getCacheKey(year, month);
    sessionStorage.setItem(
      key,
      JSON.stringify({
        data,
        savedAt: Date.now(),
        ttl: getTTL(year, month),
      }),
    );
  }

  function invalidate(year, month) {
    sessionStorage.removeItem(getCacheKey(year, month));
  }

  return { getCached, setCached, invalidate };
}
```

### 7.3 Keputusan `onSnapshot` vs `getDocs`

| Kondisi                              | Metode                                                |
| ------------------------------------ | ----------------------------------------------------- |
| Bulan ini, halaman Data Servis aktif | `onSnapshot` (single listener, cleanup di unmount)    |
| Bulan lampau                         | `getDocs` → di-cache permanent ke sessionStorage      |
| Navigasi pindah bulan                | `unsubscribe()` listener lama, buat query baru        |
| Halaman Laporan Servis               | `getDocs` dengan `limit(500)` — tidak perlu real-time |

```javascript
// Saat pindah bulan di DataServisView, cleanup listener lama
watch([() => servisStore.selectedMonth, () => servisStore.selectedYear], () => {
  servisStore.unsubscribeCurrent();
  servisStore.loadByMonth(servisStore.selectedMonth, servisStore.selectedYear);
});
```

---

## 8. Print Service Integration

Print service tetap berjalan lokal di `localhost:3001`. Vue app memanggil endpoint-nya:

```javascript
// composables/usePrint.js
export function usePrint() {
  const PRINT_SERVICE_URL = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

  const printServisSlip = async (servisData) => {
    try {
      const res = await fetch(`${PRINT_SERVICE_URL}/print/servis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servisData),
      });
      if (!res.ok) throw new Error("Print service error");
    } catch (err) {
      // Fallback: browser print via window.print()
      browserPrintFallback(servisData);
    }
  };

  const browserPrintFallback = (data) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildSlipHTML(data));
    printWindow.print();
  };

  return { printServisSlip };
}
```

---

## 9. Nomor Servis Otomatis

Format nomor servis: `SRV-YYYYMMDD-XXX` (mis. `SRV-20240115-001`)

```javascript
// services/servis-service.js
export async function generateServiceNumber(date) {
  const dateStr = format(date, "yyyyMMdd");
  const q = query(
    collection(db, "servis"),
    where("tanggal", "==", format(date, "yyyy-MM-dd")),
    orderBy("nomorServis", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  const lastNum = snap.empty ? 0 : parseInt(snap.docs[0].data().nomorServis.split("-")[2]);
  return `SRV-${dateStr}-${String(lastNum + 1).padStart(3, "0")}`;
}
```

---

## 10. WhatsApp Integration

Format nomor HP dikonversi sebelum membuka WA:

| Input           | Output         |
| --------------- | -------------- |
| `08123456789`   | `628123456789` |
| `+628123456789` | `628123456789` |
| `628123456789`  | `628123456789` |

Pesan template dapat dikonfigurasi di `settings/waTemplates` (Firestore).

---

## 11. Route Guard & Permission

```javascript
{
  path: '/servis/input',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor', 'staf', 'admin_custom'] }
},
{
  path: '/servis/data',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor', 'staf', 'admin_custom'] }
},
{
  path: '/servis/laporan',
  meta: { requiresAuth: true, roles: ['admin', 'supervisor'] }
}
```

Operasi edit/hapus di dalam halaman menggunakan password verification (bukan route guard).

---

## 12. Laporan Servis

Laporan menggunakan `getDocs` (bukan `onSnapshot`) dengan `limit` untuk keamanan:

```javascript
// LaporanServisView.vue — one-shot fetch
async function loadLaporanServis(startDate, endDate) {
  const q = query(
    collection(db, "servis"),
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate),
    orderBy("tanggal", "asc"),
    limit(500), // Servis volume rendah, 500 cukup untuk 1 tahun
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
```

Tampilan rekap (dihitung di client dari data yang sudah di-fetch):

- Total pekerjaan per jenis (GRAFIR, PATRI, dll)
- Total pemasukan per status pembayaran
- Tren mingguan/bulanan

---

## 13. Acceptance Criteria

- [ ] Form input servis menyimpan data ke Firestore dengan `nomorServis` yang ter-auto-generate
- [ ] Status servis dapat diupdate langsung dari tabel Data Servis
- [ ] Edit dan hapus memerlukan verifikasi password supervisor
- [ ] Tombol WA membuka WhatsApp Web dengan pesan terformat
- [ ] Print slip memanggil print service lokal, fallback ke browser print jika gagal
- [ ] Cache bulan lampau tidak di-fetch ulang dari Firestore
- [ ] Filter bulan/tahun di Data Servis dan Laporan berfungsi
- [ ] Export Excel & PDF menghasilkan laporan dengan format yang sama
- [ ] Cross-tab sync: data baru muncul di tab lain dalam beberapa detik

---

## 14. Firestore Read Strategy

Mengacu pada [PRD-00 §16](./00-MIGRATION-OVERVIEW.md#16-strategi-optimasi-firestore-reads).

### 14.1 Keputusan Metode per Operasi

| Operasi                      | Metode                                     | Reason                               |
| ---------------------------- | ------------------------------------------ | ------------------------------------ |
| Buka Data Servis (bulan ini) | `onSnapshot`                               | Real-time update saat status berubah |
| Pindah ke bulan lampau       | `getDocs` + sessionStorage cache permanent | Data tidak berubah                   |
| Laporan servis (range)       | `getDocs` + `limit(500)`                   | Statis, no listener                  |
| Nomor servis otomatis        | `getDocs` + `limit(1)` + `orderBy desc`    | Ambil nomor terakhir saja            |
| Settings/passwords           | `getDoc` satu kali + Pinia cache           | Jarang berubah                       |

### 14.2 onSnapshot Cleanup saat Pindah Bulan

Bug umum: listener bulan lama tidak di-cleanup ketika user memilih bulan lain. Harus pakai `watch`:

```javascript
const unsubscribeRef = ref(null);

async function loadByMonth(month, year) {
  // Cleanup listener sebelumnya
  if (unsubscribeRef.value) {
    unsubscribeRef.value();
    unsubscribeRef.value = null;
  }

  const isCurrentMonth = isThisMonth(year, month);

  if (isCurrentMonth) {
    // Real-time untuk bulan ini
    const q = buildMonthQuery(month, year);
    unsubscribeRef.value = onSnapshot(q, (snap) => {
      servisStore.currentMonthData = snap.docs.map((d) => d.data());
    });
  } else {
    // One-shot untuk bulan lampau (dengan cache)
    const cached = cache.getCached(year, month);
    if (cached) {
      servisStore.currentMonthData = cached;
      return;
    }
    const snap = await getDocs(buildMonthQuery(month, year));
    const data = snap.docs.map((d) => d.data());
    cache.setCached(year, month, data);
    servisStore.currentMonthData = data;
  }
}
```

### 14.3 Estimasi Read Budget per Hari

| Operasi                           | Reads/hari                  | Catatan                    |
| --------------------------------- | --------------------------- | -------------------------- |
| Buka Data Servis (bulan ini live) | ~30-50 docs initial + delta | onSnapshot justified       |
| Pindah bulan lampau (cache miss)  | ~30-50 docs                 | Satu kali, lalu dari cache |
| Pindah bulan lampau (cache hit)   | 0                           | sessionStorage             |
| Laporan (jika dibuka)             | max 500                     | getDocs one-shot           |
| Auto-generate nomor               | 1 doc                       | limit(1)                   |
