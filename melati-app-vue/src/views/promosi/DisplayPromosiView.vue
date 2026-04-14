<template>
  <div class="promosi-display fullscreen-container">
    <Transition name="fade">
      <div v-if="!isConnected" class="offline-badge">
        <i class="bi bi-wifi-off me-1"></i>
        Offline
      </div>
    </Transition>

    <div v-if="allSlides.length" id="promoCarousel" class="carousel slide" :class="carouselClass">
      <div class="carousel-inner">
        <div
          v-for="(slide, idx) in allSlides"
          :key="slide.id"
          :class="[
            'carousel-item',
            idx === 0 ? 'active' : '',
            normalizedSettings.transitionEffect === 'zoom' ? 'zoom-effect' : '',
          ]"
        >
          <template v-if="slide.kind === 'default'">
            <div :class="['thank-you-slide', slide.theme]">
              <div :class="['slide-content', { 'no-animation': !normalizedSettings.enableAnimation }]">
                <div class="decorative-element left"></div>
                <div class="content-wrapper">
                  <h2>{{ slide.title }}</h2>
                  <div class="divider">
                    <span><i class="bi bi-gem"></i></span>
                  </div>
                  <h3>{{ slide.subtitle }}</h3>
                  <p>{{ slide.description }}</p>
                  <div class="logo-container">
                    <img src="/img/Melati.jfif" alt="Melati Gold Shop" class="slide-logo" />
                  </div>
                </div>
                <div class="decorative-element right"></div>
              </div>
            </div>
          </template>

          <template v-else-if="slide.contentType === 'HTML'">
            <div class="custom-slide">
              <div :class="['slide-content', { 'no-animation': !normalizedSettings.enableAnimation }]">
                <div class="decorative-element left"></div>
                <div class="content-wrapper">
                  <div class="custom-html-content" v-html="slide.htmlContent || '<p>Tidak ada konten.</p>'"></div>
                </div>
                <div class="decorative-element right"></div>
              </div>
            </div>
          </template>

          <template v-else-if="slide.contentType === 'Gambar'">
            <div class="fullscreen-media-slide">
              <img
                v-if="!hasMediaError(slide.id)"
                :src="slide.fileUrl"
                :alt="slide.title || 'Promotion Image'"
                class="media-cover"
                @error="markMediaError(slide.id)"
              />
              <div v-else class="media-error-fallback">
                <h2>{{ slide.title || "Image Not Available" }}</h2>
                <p>Gambar tidak dapat dimuat.</p>
              </div>
            </div>
          </template>

          <template v-else-if="slide.contentType === 'Video'">
            <div class="fullscreen-media-slide">
              <video
                v-if="!hasMediaError(slide.id)"
                :src="slide.fileUrl"
                class="media-cover"
                autoplay
                muted
                loop
                playsinline
                @error="markMediaError(slide.id)"
              ></video>
              <div v-else class="media-error-fallback">
                <h2>{{ slide.title || "Video Not Available" }}</h2>
                <p>Video tidak dapat dimuat.</p>
              </div>
            </div>
          </template>

          <template v-else-if="slide.contentType === 'Gallery'">
            <div class="custom-slide collection-display">
              <div :class="['slide-content', { 'no-animation': !normalizedSettings.enableAnimation }]">
                <div class="decorative-element left"></div>
                <div class="content-wrapper">
                  <h2>{{ slide.title }}</h2>
                  <div class="divider">
                    <span><i class="bi bi-stars"></i></span>
                  </div>
                  <div class="image-gallery">
                    <div v-for="(img, gIdx) in slide.images" :key="`${slide.id}-${gIdx}`" class="gallery-item">
                      <img :src="img.url" :alt="img.caption || `Gallery ${gIdx + 1}`" class="gallery-img" />
                      <div v-if="img.caption" class="item-caption">{{ img.caption }}</div>
                    </div>
                  </div>
                  <p>{{ slide.description || "" }}</p>
                </div>
                <div class="decorative-element right"></div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="carousel-indicators">
        <button
          v-for="(slide, idx) in allSlides"
          :key="`indicator-${slide.id}`"
          type="button"
          data-bs-target="#promoCarousel"
          :data-bs-slide-to="idx"
          :class="{ active: idx === 0 }"
          :aria-current="idx === 0 ? 'true' : null"
          :aria-label="`Slide ${idx + 1}`"
        ></button>
      </div>

      <template v-if="normalizedSettings.showControls">
        <button class="carousel-control-prev" type="button" data-bs-target="#promoCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#promoCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </template>
    </div>

    <div v-else class="empty-state">
      <i class="bi bi-image display-1 text-secondary mb-3"></i>
      <h4 class="text-secondary">Belum ada konten promosi</h4>
      <p class="text-secondary small">Hubungi admin untuk menambahkan slide</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { Carousel } from "bootstrap";
import { usePromotionStore } from "@/stores/promotion";
import { useConnectionMonitor } from "@/composables/useConnectionMonitor";

const promotionStore = usePromotionStore();
const { isConnected, startMonitoring, stopMonitoring } = useConnectionMonitor();

const settings = computed(() => promotionStore.settings || {});
const rawSlides = computed(() => promotionStore.activeSlides || []);

const defaultSlides = [
  {
    id: "default-1",
    kind: "default",
    theme: "elegant-gold",
    title: "Terima Kasih",
    subtitle: "Telah Mengunjungi Melati Gold Shop",
    description: "Kami sangat menghargai kepercayaan Anda.",
    order: -3,
  },
  {
    id: "default-2",
    kind: "default",
    theme: "variant-2",
    title: "Kami Senang",
    subtitle: "Dapat Melayani Anda di Melati Gold Shop",
    description: "Semoga pengalaman berbelanja Anda menyenangkan.",
    order: -2,
  },
  {
    id: "default-3",
    kind: "default",
    theme: "variant-3",
    title: "Terima Kasih",
    subtitle: "Atas Kepercayaan Anda Kepada Melati Gold Shop",
    description: "Kami berkomitmen memberikan produk dan layanan terbaik.",
    order: -1,
  },
];

const normalizedSettings = computed(() => {
  const rawInterval = Number(settings.value.slideInterval) || 30;
  const intervalMs = rawInterval > 1000 ? rawInterval : rawInterval * 1000;
  const effect = ["fade", "slide", "zoom"].includes(settings.value.transitionEffect)
    ? settings.value.transitionEffect
    : "fade";

  return {
    intervalMs,
    transitionEffect: effect,
    autoPlay: settings.value.autoPlay !== false,
    showControls: settings.value.showControls !== false,
    enableAnimation: settings.value.enableAnimation !== false,
  };
});

const normalizedCustomSlides = computed(() =>
  rawSlides.value
    .map((slide, idx) => {
      const contentTypeRaw = String(slide.contentType || "").trim();
      let contentType = contentTypeRaw;

      if (!contentType) {
        if (slide.type === "image") contentType = "Gambar";
        else if (slide.type === "video") contentType = "Video";
        else contentType = "HTML";
      }

      return {
        ...slide,
        id: slide.id || `custom-${idx + 1}`,
        kind: "custom",
        contentType,
        fileUrl: slide.fileUrl || slide.url || "",
        images: Array.isArray(slide.images) ? slide.images : [],
        order: Number(slide.order) || 0,
      };
    })
    .filter((slide) => {
      if (slide.contentType === "HTML") return Boolean(slide.htmlContent || slide.description || slide.title);
      if (slide.contentType === "Gallery") return slide.images.length > 0;
      if (slide.contentType === "Gambar" || slide.contentType === "Video") return Boolean(slide.fileUrl);
      return false;
    })
    .sort((a, b) => a.order - b.order),
);

const allSlides = computed(() => [...defaultSlides, ...normalizedCustomSlides.value]);
const carouselClass = computed(() => ({ "carousel-fade": normalizedSettings.value.transitionEffect === "fade" }));

const mediaErrors = ref(new Set());
let carouselInstance = null;
let refreshInterval = null;
let initTimer = null;

function hasMediaError(slideId) {
  return mediaErrors.value.has(slideId);
}

function markMediaError(slideId) {
  const next = new Set(mediaErrors.value);
  next.add(slideId);
  mediaErrors.value = next;
}

function initCarousel() {
  const el = document.getElementById("promoCarousel");
  if (!el || !allSlides.value.length) return;

  carouselInstance?.dispose();

  const shouldAutoPlay = normalizedSettings.value.autoPlay && allSlides.value.length > 1;
  carouselInstance = new Carousel(el, {
    interval: shouldAutoPlay ? normalizedSettings.value.intervalMs : false,
    ride: shouldAutoPlay ? "carousel" : false,
    wrap: true,
    keyboard: false,
    pause: false,
    touch: true,
  });

  if (shouldAutoPlay) carouselInstance.cycle();
}

function scheduleInit() {
  if (initTimer) clearTimeout(initTimer);
  initTimer = setTimeout(async () => {
    await nextTick();
    initCarousel();
  }, 120);
}

function keepCarouselRunning() {
  if (carouselInstance) carouselInstance.cycle();
}

watch(allSlides, () => {
  mediaErrors.value = new Set();
  scheduleInit();
});

watch(
  () => [
    normalizedSettings.value.intervalMs,
    normalizedSettings.value.autoPlay,
    normalizedSettings.value.transitionEffect,
    normalizedSettings.value.showControls,
    normalizedSettings.value.enableAnimation,
  ],
  () => {
    scheduleInit();
  },
);

onMounted(() => {
  promotionStore.startListening();
  startMonitoring();
  window.addEventListener("blur", keepCarouselRunning);

  refreshInterval = setInterval(() => {
    promotionStore.refreshSlides();
    keepCarouselRunning();
  }, 60_000);

  scheduleInit();
});

onUnmounted(() => {
  promotionStore.stopListening();
  stopMonitoring();
  window.removeEventListener("blur", keepCarouselRunning);

  if (refreshInterval) clearInterval(refreshInterval);
  if (initTimer) clearTimeout(initTimer);

  carouselInstance?.dispose();
  carouselInstance = null;
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap");

.promosi-display {
  min-height: 100vh;
  background: #000;
  overflow: hidden;
  font-family: "Montserrat", sans-serif;
}

.fullscreen-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.offline-badge {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 999;
  background: #dc3545;
  color: #fff;
  padding: 0.5rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.carousel,
.carousel-inner,
.carousel-item {
  height: 100vh;
}

.carousel-item {
  transition: transform 1.2s ease-in-out;
  opacity: 1;
}

.carousel-item.zoom-effect .media-cover {
  animation: slowZoom 18s ease-in-out infinite alternate;
}

.slide-content {
  max-width: 100%;
  width: 100%;
  padding: 60px 80px;
  position: relative;
  z-index: 2;
  font-size: clamp(1.15rem, 0.65vw + 0.95rem, 1.75rem);
  line-height: 1.35;
}

.slide-content:not(.no-animation) {
  animation: fadeInUp 1s ease-out;
}

.decorative-element {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  opacity: 0.7;
}

.decorative-element.left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}

.decorative-element.right {
  right: 0;
  bottom: 0;
  border-left: none;
  border-top: none;
}

.divider {
  width: 100%;
  max-width: 220px;
  margin: 18px auto;
  position: relative;
  height: 1px;
  background: rgba(255, 255, 255, 0.35);
}

.divider span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.32);
}

.divider i {
  color: #f4efe2;
}

.thank-you-slide,
.custom-slide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}

.thank-you-slide.elegant-gold {
  background: linear-gradient(135deg, #bf953f 0%, #fcf6ba 50%, #b38728 100%);
  color: #2e2e2e;
}

.thank-you-slide.variant-2 {
  background: linear-gradient(135deg, #2c3e50 0%, #4a6572 50%, #2c3e50 100%);
}

.thank-you-slide.variant-3 {
  background: linear-gradient(135deg, #4a3c29 0%, #8a6d3b 50%, #4a3c29 100%);
}

.variant-2 h2,
.variant-2 h3,
.variant-2 p,
.variant-3 h2,
.variant-3 h3,
.variant-3 p {
  color: #f9f9f9;
}

.thank-you-slide h2,
.custom-slide h2 {
  font-family: "Playfair Display", serif;
  font-size: 6.1rem;
  font-weight: 700;
  margin-bottom: 48px;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.28);
}

.thank-you-slide h3,
.custom-slide h3 {
  font-size: 3.45rem;
  font-weight: 500;
  margin: 30px 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.thank-you-slide p,
.custom-slide p {
  font-size: 2.35rem;
  font-weight: 300;
  margin-bottom: 30px;
}

.logo-container {
  --logo-size: 150px;
  margin: 36px auto 0;
  position: relative;
  width: var(--logo-size);
  height: var(--logo-size);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.logo-container::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--logo-size) + 14px);
  height: calc(var(--logo-size) + 14px);
  transform: translate(-50%, -50%);
  border: 2px solid #b38728;
  border-radius: 999px;
  animation: pulseRing 2s infinite;
  pointer-events: none;
}

.slide-logo {
  width: var(--logo-size);
  height: var(--logo-size);
  border-radius: 50%;
  object-fit: cover;
  border: 6px solid #cab433;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.custom-slide {
  background: linear-gradient(140deg, #111 0%, #2a2a2a 60%, #111 100%);
  color: #f5f5f5;
}

.custom-html-content {
  max-width: 1200px;
  margin: 0 auto;
  font-size: 1.9rem;
  line-height: 1.4;
}

.custom-html-content :deep(*) {
  color: inherit;
}

.custom-html-content :deep(h1) {
  font-size: 4.6rem;
}

.custom-html-content :deep(h2) {
  font-size: 3.7rem;
}

.custom-html-content :deep(h3) {
  font-size: 3rem;
}

.custom-html-content :deep(p),
.custom-html-content :deep(li) {
  font-size: 1.95rem;
}

.fullscreen-media-slide {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.media-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.media-error-fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  text-align: center;
  background: rgba(0, 0, 0, 0.72);
  padding: 1.2rem 1.5rem;
  border-radius: 0.7rem;
}

.collection-display {
  background: linear-gradient(135deg, #1f1f1f 0%, #474747 55%, #232323 100%);
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin: 22px auto;
  max-width: 1200px;
}

.gallery-item {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.gallery-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.item-caption {
  font-size: 0.9rem;
  padding: 0.5rem 0.65rem;
}

.carousel-control-prev,
.carousel-control-next {
  width: 10%;
  opacity: 0.7;
  z-index: 50;
}

.carousel-control-prev:hover,
.carousel-control-next:hover {
  opacity: 1;
}

.carousel-indicators {
  z-index: 100;
  bottom: 22px;
}

.carousel-indicators button {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  margin: 0 5px;
  border: none;
  background-color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.carousel-indicators button.active {
  background-color: #ffeb7c;
  transform: scale(1.2);
}

.empty-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseRing {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.06);
    opacity: 0.74;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@keyframes slowZoom {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.08);
  }
}

@media (max-width: 992px) {
  .slide-content {
    padding: 40px 32px;
    font-size: 1.12rem;
  }

  .thank-you-slide h2,
  .custom-slide h2 {
    font-size: 4.4rem;
    margin-bottom: 32px;
  }

  .thank-you-slide h3,
  .custom-slide h3 {
    font-size: 2.55rem;
  }

  .thank-you-slide p,
  .custom-slide p {
    font-size: 1.72rem;
  }

  .custom-html-content {
    font-size: 1.45rem;
  }

  .custom-html-content :deep(h1) {
    font-size: 3.2rem;
  }

  .custom-html-content :deep(h2) {
    font-size: 2.6rem;
  }

  .custom-html-content :deep(h3) {
    font-size: 2.2rem;
  }

  .custom-html-content :deep(p),
  .custom-html-content :deep(li) {
    font-size: 1.48rem;
  }
}

@media (max-width: 576px) {
  .slide-content {
    padding: 30px 20px;
    font-size: 1rem;
  }

  .thank-you-slide h2,
  .custom-slide h2 {
    font-size: 3.2rem;
  }

  .thank-you-slide h3,
  .custom-slide h3 {
    font-size: 1.95rem;
  }

  .thank-you-slide p,
  .custom-slide p {
    font-size: 1.35rem;
  }

  .custom-html-content {
    font-size: 1.08rem;
  }

  .custom-html-content :deep(h1) {
    font-size: 2.4rem;
  }

  .custom-html-content :deep(h2) {
    font-size: 2.02rem;
  }

  .custom-html-content :deep(h3) {
    font-size: 1.7rem;
  }

  .custom-html-content :deep(p),
  .custom-html-content :deep(li) {
    font-size: 1.2rem;
  }

  .decorative-element {
    display: none;
  }

  .logo-container {
    --logo-size: 108px;
  }

  .slide-logo {
    border-width: 4px;
  }

  .gallery-img {
    height: 140px;
  }
}
</style>
