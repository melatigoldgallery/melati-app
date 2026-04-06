<template>
  <div class="promosi-display min-vh-100 overflow-hidden bg-black">
    <!-- Offline badge -->
    <Transition name="fade">
      <div
        v-if="!isConnected"
        class="position-fixed top-0 end-0 m-3 badge bg-danger px-3 py-2 fs-6"
        style="z-index: 999"
      >
        <i class="bi bi-wifi-off me-1"></i>
        Offline
      </div>
    </Transition>

    <!-- Carousel -->
    <div
      v-if="activeSlides.length"
      id="promoCarousel"
      class="carousel slide h-100"
      :data-bs-ride="settings.autoPlay ? 'carousel' : 'false'"
      :data-bs-interval="settings.slideInterval"
    >
      <div class="carousel-inner h-100">
        <div
          v-for="(slide, idx) in activeSlides"
          :key="slide.id"
          :class="['carousel-item h-100', idx === 0 ? 'active' : '']"
        >
          <img
            v-if="slide.type === 'image'"
            :src="slide.url"
            class="d-block w-100 h-100"
            style="object-fit: cover"
            :alt="slide.title"
          />
          <video
            v-else-if="slide.type === 'video'"
            :src="slide.url"
            class="d-block w-100 h-100"
            style="object-fit: cover"
            autoplay
            muted
            loop
          ></video>

          <!-- Caption -->
          <div v-if="slide.caption" class="carousel-caption d-block">
            <h5 class="fw-bold">{{ slide.title }}</h5>
            <p>{{ slide.caption }}</p>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <template v-if="settings.showControls">
        <button class="carousel-control-prev" data-bs-target="#promoCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon"></span>
        </button>
        <button class="carousel-control-next" data-bs-target="#promoCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon"></span>
        </button>
      </template>
    </div>

    <!-- Empty state -->
    <div v-else class="d-flex flex-column align-items-center justify-content-center min-vh-100 text-white text-center">
      <i class="bi bi-image display-1 text-secondary mb-3"></i>
      <h4 class="text-secondary">Belum ada konten promosi</h4>
      <p class="text-secondary small">Hubungi admin untuk menambahkan slide</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Carousel } from "bootstrap";
import { usePromotionStore } from "@/stores/promotion";
import { useConnectionMonitor } from "@/composables/useConnectionMonitor";

const promotionStore = usePromotionStore();
const { isConnected, startMonitoring, stopMonitoring } = useConnectionMonitor();

const settings = computed(() => promotionStore.settings);
const activeSlides = computed(() => promotionStore.activeSlides);

let carouselInstance = null;
let refreshInterval = null;

function initCarousel() {
  const el = document.getElementById("promoCarousel");
  if (!el) return;
  carouselInstance?.dispose();
  carouselInstance = new Carousel(el, {
    interval: settings.value.slideInterval,
    ride: settings.value.autoPlay ? "carousel" : false,
  });
}

// Re-init carousel saat settings interval berubah
watch(
  () => settings.value.slideInterval,
  () => {
    if (activeSlides.value.length) initCarousel();
  },
);

watch(
  activeSlides,
  (slides) => {
    if (slides.length) setTimeout(initCarousel, 100);
  },
  { immediate: false },
);

onMounted(() => {
  promotionStore.startListening();
  startMonitoring();

  // Auto-check setiap 60 detik sebagai failsafe
  refreshInterval = setInterval(() => {
    promotionStore.refreshSlides();
  }, 60_000);
});

onUnmounted(() => {
  promotionStore.stopListening();
  stopMonitoring();
  carouselInstance?.dispose();
  clearInterval(refreshInterval);
});
</script>

<style scoped>
.promosi-display {
  background: #000;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
