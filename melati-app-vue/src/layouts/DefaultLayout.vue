<template>
  <div class="d-flex" style="min-height: 100vh">
    <AppSidebar :collapsed="sidebarCollapsed" />
    <div class="main-content d-flex flex-column">
      <AppHeader @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
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
</script>
