# PRD-06: Modul Promosi

## Migrasi HTML/VanillaJS → Vue.js 3 + Bootstrap 5

**Versi:** 1.0  
**Tanggal:** April 2026  
**Status:** Draft  
**Referensi:** [PRD-00 Migration Overview](./00-MIGRATION-OVERVIEW.md)

---

## 1. Deskripsi Modul

Modul Promosi mengelola tampilan slide promosi di layar display toko. Admin dapat mengupload gambar/video promosi dan mengkonfigurasi pengaturan tampilan (interval slide, efek transisi, animasi). Layar display (`/promosi/display`) berjalan di monitor toko dan sinkron real-time dengan Firebase Realtime Database.

---

## 2. Halaman Eksisting → Route Baru

| File HTML Lama         | Route Vue Baru     | Deskripsi                               |
| ---------------------- | ------------------ | --------------------------------------- |
| `promosi.html`         | `/promosi/setting` | Admin upload & konfigurasi slide        |
| `promosi-display.html` | `/promosi/display` | Layar display fullscreen (monitor toko) |

---

## 3. Firebase Data Model

### 3.1 Firebase Realtime Database (bukan Firestore)

#### `/settings/promotion`

```javascript
{
  slideInterval: number,     // Milliseconds antar slide (default: 5000)
  transitionEffect: string,  // 'fade' | 'zoom' | 'slide'
  enableAnimation: boolean,  // AOS animations on/off
  showControls: boolean,     // Tampilkan prev/next controls
  autoPlay: boolean,         // Auto-play carousel
  updatedAt: number          // Unix timestamp
}
```

#### `/content/promotion`

```javascript
{
  slides: {
    [slideId]: {
      id: string,
      type: string,          // 'image' | 'video'
      url: string,           // Firebase Storage download URL
      title: string,         // Judul slide (opsional)
      caption: string,       // Caption/deskripsi
      order: number,         // Urutan tampil
      isActive: boolean,
      uploadedAt: number,
      uploadedBy: string
    }
  }
}
```

### 3.2 Firebase Storage

Path upload: `promotions/{slideId}.{ext}`

Format yang didukung:

- Gambar: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Video: `.mp4`, `.webm`

---

## 4. User Stories

### 4.1 Setting Promosi (/promosi/setting)

| ID       | Sebagai | Saya ingin                                        | Agar                           |
| -------- | ------- | ------------------------------------------------- | ------------------------------ |
| US-PR-01 | Admin   | Upload gambar/video promosi                       | Konten tampil di layar toko    |
| US-PR-02 | Admin   | Hapus slide yang sudah tidak terpakai             | Kelola konten aktif            |
| US-PR-03 | Admin   | Atur urutan tampilan slide (drag & drop)          | Kontrol urutan presentasi      |
| US-PR-04 | Admin   | Set interval waktu antar slide                    | Sesuaikan kecepatan slideshow  |
| US-PR-05 | Admin   | Pilih efek transisi (fade/zoom/slide)             | Tampilan lebih menarik         |
| US-PR-06 | Admin   | Toggle animasi AOS on/off                         | Kendali efek animasi           |
| US-PR-07 | Admin   | Toggle show/hide navigation controls              | Sesuaikan tampilan display     |
| US-PR-08 | Admin   | Pengaturan berlaku real-time tanpa reload display | Display tidak perlu di-restart |
| US-PR-09 | Admin   | Preview slide sebelum ditayangkan                 | Quality control konten         |

### 4.2 Display Promosi (/promosi/display)

| ID       | Sebagai       | Saya ingin                                | Agar                                     |
| -------- | ------------- | ----------------------------------------- | ---------------------------------------- |
| US-DP-01 | Layar Display | Tampilkan slideshow promosi fullscreen    | Pelanggan toko bisa melihat promosi      |
| US-DP-02 | Layar Display | Slide berganti otomatis sesuai interval   | Tanpa interaksi manual                   |
| US-DP-03 | Layar Display | Efek transisi antar slide                 | Tampilan profesional                     |
| US-DP-04 | Layar Display | Update konten real-time saat admin upload | Tidak perlu reload halaman               |
| US-DP-05 | Layar Display | Auto-check konten setiap 60 detik         | Redundansi jika real-time listener putus |
| US-DP-06 | Layar Display | Indikator offline jika internet terputus  | Transparansi status                      |
| US-DP-07 | Layar Display | Tidak memerlukan login                    | Layar kiosk/display toko                 |

---

## 5. Komponen Vue yang Dibutuhkan

### 5.1 Views

```
src/views/promosi/
├── SettingPromosiView.vue    # Panel admin upload & konfigurasi
└── DisplayPromosiView.vue   # Layar display fullscreen (no sidebar)
```

### 5.2 Komponen Khusus Promosi

```
src/components/promosi/
├── PromosiCarousel.vue       # Bootstrap Carousel wrapper + custom transitions
├── SlideCard.vue             # Kartu preview slide di admin
├── SlideUploadZone.vue       # Drag & drop upload zone
├── SlideSorter.vue           # Drag & drop reorder slides
├── TransitionSettings.vue    # Form pengaturan efek transisi
├── IntervalSlider.vue        # Slider interval waktu
├── AnimationToggle.vue       # Toggle AOS on/off
├── SlidePreviewModal.vue     # Preview fullscreen sebelum publish
└── ConnectionBadge.vue       # Indikator status koneksi
```

### 5.3 Composables

```javascript
// composables/usePromotion.js
export function usePromotion() {
  const settings = ref({
    slideInterval: 5000,
    transitionEffect: "fade",
    enableAnimation: true,
    showControls: false,
    autoPlay: true,
  });
  const slides = ref([]);

  const listenSettings = () => {
    // onValue('/settings/promotion') → update settings
  };
  const listenSlides = () => {
    // onValue('/content/promotion/slides') → update slides
  };
  const updateSettings = async (newSettings) => {
    // update '/settings/promotion' di Realtime DB
  };
  const stopListening = () => {
    // off() semua listeners
  };

  return { settings, slides, listenSettings, listenSlides, updateSettings, stopListening };
}

// composables/useSlideUpload.js
export function useSlideUpload() {
  const uploadProgress = ref(0);
  const isUploading = ref(false);

  const upload = async (file) => {
    // Upload ke Firebase Storage: promotions/{uuid}.{ext}
    // Dapatkan download URL
    // Simpan metadata ke /content/promotion/slides/{slideId}
  };

  const remove = async (slideId, fileName) => {
    // Hapus dari Firebase Storage
    // Hapus dari /content/promotion/slides/{slideId}
  };

  return { uploadProgress, isUploading, upload, remove };
}
```

---

## 6. Pinia Store — `promotionStore`

```javascript
// stores/promotion.js
export const usePromotionStore = defineStore("promotion", {
  state: () => ({
    settings: {
      slideInterval: 5000,
      transitionEffect: "fade",
      enableAnimation: true,
      showControls: false,
      autoPlay: true,
    },
    slides: [], // Array sorted by .order
    isConnected: true,
    lastCheckedAt: null,
  }),
  actions: {
    startListening() {
      // Real-time listeners ke Realtime DB
      // '/settings/promotion' → this.settings
      // '/content/promotion/slides' → this.slides (sorted by order)
    },
    stopListening() {
      // Cleanup off()
    },
    async saveSettings(newSettings) {
      // update di Realtime DB
    },
    async uploadSlide(file, metadata) {
      // Storage upload → get URL → push ke /content/promotion/slides
    },
    async deleteSlide(slideId) {
      // Hapus dari Storage + Realtime DB
    },
    async reorderSlides(newOrder) {
      // Update field 'order' untuk semua slides
    },
  },
  getters: {
    activeSlides: (state) => state.slides.filter((s) => s.isActive).sort((a, b) => a.order - b.order),
  },
});
```

---

## 7. Display View — Layout Khusus

Sama seperti Antrian Display, halaman ini menggunakan layout blank (tanpa sidebar/header):

```javascript
{
  path: '/promosi/display',
  meta: { layout: 'blank', requiresAuth: false }
}
```

### 7.1 Carousel Implementation

Gunakan Bootstrap 5 Carousel dengan Vue watcher untuk mengaplikasikan pengaturan dinamis:

```vue
<script setup>
import { watch, onMounted, onUnmounted } from "vue";
import { Carousel } from "bootstrap";
import { usePromotionStore } from "@/stores/promotion";

const promotionStore = usePromotionStore();
let carouselInstance = null;
let autoCheckInterval = null;

onMounted(() => {
  promotionStore.startListening();

  // Initialize carousel
  const el = document.getElementById("promoCarousel");
  carouselInstance = new Carousel(el, {
    interval: promotionStore.settings.slideInterval,
    ride: promotionStore.settings.autoPlay ? "carousel" : false,
  });

  // Auto-check setiap 60 detik (redundansi)
  autoCheckInterval = setInterval(() => {
    promotionStore.refreshSlides();
  }, 60000);
});

onUnmounted(() => {
  promotionStore.stopListening();
  carouselInstance?.dispose();
  clearInterval(autoCheckInterval);
});

// Re-apply settings saat berubah real-time
watch(
  () => promotionStore.settings.slideInterval,
  (newInterval) => {
    carouselInstance?.dispose();
    const el = document.getElementById("promoCarousel");
    carouselInstance = new Carousel(el, { interval: newInterval, ride: "carousel" });
  },
);
</script>
```

### 7.2 Transition Effects

```css
/* assets/css/promosi-transitions.css */

/* Fade */
.carousel-transition-fade .carousel-item {
  opacity: 0;
  transition: opacity 0.8s ease;
}
.carousel-transition-fade .carousel-item.active {
  opacity: 1;
}

/* Zoom */
.carousel-transition-zoom .carousel-item {
  transform: scale(0.8);
  opacity: 0;
  transition: all 0.6s ease;
}
.carousel-transition-zoom .carousel-item.active {
  transform: scale(1);
  opacity: 1;
}
```

---

## 8. AOS (Animate On Scroll) Integration

```javascript
// main.js
import AOS from "aos";
import "aos/dist/aos.css";

app.use(router);
app.use(pinia);

// AOS hanya di-init di halaman display
// Di DisplayPromosiView.vue:
onMounted(() => {
  if (promotionStore.settings.enableAnimation) {
    AOS.init({ duration: 800, once: true });
  }
});

watch(
  () => promotionStore.settings.enableAnimation,
  (enabled) => {
    if (enabled) AOS.init();
    else AOS.refresh(); // atau disable via CSS
  },
);
```

---

## 9. File Upload (Firebase Storage)

```javascript
// Upload dengan progress tracking
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export async function uploadPromoFile(file, onProgress) {
  const ext = file.name.split(".").pop();
  const slideId = crypto.randomUUID();
  const path = `promotions/${slideId}.${ext}`;
  const fileRef = storageRef(storage, path);

  const task = uploadBytesResumable(fileRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ slideId, url, path });
      },
    );
  });
}
```

---

## 10. Koneksi Monitoring

```javascript
// composables/useConnectionMonitor.js
import { ref as dbRef, onValue } from "firebase/database";
import { realtimeDb } from "@/config/firebase";

export function useConnectionMonitor() {
  const isConnected = ref(true);

  const startMonitoring = () => {
    const connRef = dbRef(realtimeDb, ".info/connected");
    onValue(connRef, (snap) => {
      isConnected.value = snap.val() === true;
    });
  };

  return { isConnected, startMonitoring };
}
```

---

## 11. Route Guard & Permission

```javascript
{
  path: '/promosi/setting',
  meta: { requiresAuth: true, roles: ['admin'] }
},
{
  path: '/promosi/display',
  meta: { requiresAuth: false, layout: 'blank' }  // Publik, no sidebar
}
```

---

## 12. Acceptance Criteria

- [ ] Admin dapat upload gambar/video promosi ke Firebase Storage dari halaman setting
- [ ] Slide yang di-upload langsung muncul di layar display tanpa perlu reload
- [ ] Pengaturan (interval, efek transisi, animasi) berlaku real-time di layar display
- [ ] Delete slide menghapus dari Storage dan Realtime DB secara bersamaan
- [ ] Auto-check setiap 60 detik berjalan di display sebagai failsafe
- [ ] Layar display tidak memerlukan login (route publik)
- [ ] Indikator offline muncul di display saat koneksi Realtime DB terputus
- [ ] Efek transisi fade/zoom/slide dapat diterapkan dari panel admin
- [ ] AOS animasi dapat di-toggle tanpa reload halaman display
- [ ] Upload progress ditampilkan selama proses upload berlangsung
