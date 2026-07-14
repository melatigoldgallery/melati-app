<template>
  <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center" style="height: 100vh; background-color: #f9f5eb;">
    <div class="spinner-border text-primary" role="status"></div>
    <p class="text-muted mt-2">Memuat display antrian...</p>
  </div>
  <component 
    v-else 
    :is="activeComponent" 
    :active-floor="activeFloor" 
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { DEFAULT_FLOOR_ID, normalizeFloorId } from "@/config/floor-config";
import { fetchQueueGeneralSettings } from "@/services/antrian-service";
import DisplayAntrianLegacy from "@/components/antrian/DisplayAntrianLegacy.vue";
import DisplayAntrianSplit from "@/components/antrian/DisplayAntrianSplit.vue";

const route = useRoute();
const loading = ref(true);
const queueMode = ref("legacy");

const activeFloor = computed(() => {
  const normalized = normalizeFloorId(route.query.floor, DEFAULT_FLOOR_ID);
  return normalized || DEFAULT_FLOOR_ID;
});

const activeComponent = computed(() => {
  return queueMode.value === "split" ? DisplayAntrianSplit : DisplayAntrianLegacy;
});

async function loadSettings() {
  loading.value = true;
  try {
    const data = await fetchQueueGeneralSettings(activeFloor.value);
    queueMode.value = data.queueMode || "legacy";
  } catch (error) {
    console.error("Gagal mengambil pengaturan mode antrian untuk display:", error);
    queueMode.value = "legacy";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSettings();
});

watch(activeFloor, () => {
  loadSettings();
});
</script>
