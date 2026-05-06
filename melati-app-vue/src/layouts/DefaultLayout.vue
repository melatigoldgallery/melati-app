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
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import AppSidebar from "@/components/common/AppSidebar.vue";
import AppHeader from "@/components/common/AppHeader.vue";
import {
  applyThemeAppearanceToDocument,
  ensureThemeAppearanceSettings,
  fetchThemeAppearanceSettings,
  subscribeThemeAppearanceSettings,
} from "@/services/theme-settings-service";

const auth = useAuthStore();
const sidebarCollapsed = ref(false);
const mobileOpen = ref(false);
let themeSubscription = null;

function toggleSidebar() {
  if (window.innerWidth < 768) {
    mobileOpen.value = !mobileOpen.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
}

async function initializeTheme() {
  try {
    if (!auth.activeFloor) return; // Floor not yet selected

    // Ensure theme document exists for this floor
    await ensureThemeAppearanceSettings(auth.activeFloor);

    // Load current theme
    const settings = await fetchThemeAppearanceSettings(auth.activeFloor);
    applyThemeAppearanceToDocument(settings);

    // Subscribe to theme changes for this floor
    if (themeSubscription) themeSubscription();
    themeSubscription = subscribeThemeAppearanceSettings(
      (settings) => {
        applyThemeAppearanceToDocument(settings);
      },
      (error) => {
        console.warn("Theme appearance subscription failed.", error);
      },
      auth.activeFloor,
    );
  } catch (error) {
    console.warn("Theme initialization failed.", error);
  }
}

// Watch for floor changes - reload theme when floor changes
watch(
  () => auth.activeFloor,
  async (newFloor) => {
    if (newFloor) {
      await initializeTheme();
    }
  },
);

onMounted(() => {
  initializeTheme();
});

onUnmounted(() => {
  // Cleanup subscription when leaving layout
  if (themeSubscription) {
    themeSubscription();
    themeSubscription = null;
  }
});
</script>

<style scoped>
.sidebar-mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1040;
}
</style>
