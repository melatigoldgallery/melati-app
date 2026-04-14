<template>
  <div class="d-flex" style="min-height: 100vh">
    <!-- Mobile overlay backdrop -->
    <div v-if="mobileOpen" class="sidebar-mobile-overlay d-md-none" @click="mobileOpen = false"></div>

    <AppSidebar :collapsed="sidebarCollapsed" :mobile-open="mobileOpen" @close-mobile="mobileOpen = false" />
    <div class="main-content d-flex flex-column">
      <AppHeader @toggle-sidebar="toggleSidebar" />
      <main class="flex-grow-1 p-3">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import AppSidebar from "@/components/common/AppSidebar.vue";
import AppHeader from "@/components/common/AppHeader.vue";

const sidebarCollapsed = ref(false);
const mobileOpen = ref(false);

function toggleSidebar() {
  if (window.innerWidth < 768) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}
</script>

<style scoped>
.sidebar-mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1040;
}
</style>
