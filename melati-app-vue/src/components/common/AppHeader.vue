<template>
  <header class="app-header d-flex align-items-center px-3 bg-white border-bottom shadow-sm">
    <!-- Toggle sidebar -->
    <button class="btn btn-sm btn-light me-3" @click="$emit('toggle-sidebar')">
      <i class="bi bi-list fs-5"></i>
    </button>

    <!-- Page title -->
    <span class="fw-semibold text-secondary">{{ pageTitle }}</span>

    <div class="ms-auto d-flex align-items-center gap-3">
      <!-- Clock -->
      <span class="text-muted small d-none d-md-block">{{ currentTime }}</span>

      <!-- User badge -->
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-primary text-uppercase small">{{ auth.userRole }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

defineEmits(["toggle-sidebar"]);

const auth = useAuthStore();
const route = useRoute();

const pageTitle = computed(() => route.meta?.title || "");

// Clock
const currentTime = ref("");
let clockInterval = null;

function updateClock() {
  currentTime.value = new Date().toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => clearInterval(clockInterval));
</script>

<style scoped>
.app-header {
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 100;
}
</style>
