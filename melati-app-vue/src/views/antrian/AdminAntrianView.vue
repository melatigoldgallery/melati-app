<template>
  <div v-if="loading" class="text-center py-5">
    <div class="spinner-border text-primary" role="status"></div>
    <p class="text-muted mt-2">Memuat panel antrian...</p>
  </div>
  <component 
    v-else 
    :is="activeComponent" 
    :active-floor="activeFloor" 
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { fetchQueueGeneralSettings } from "@/services/antrian-service";
import AdminAntrianLegacy from "@/components/antrian/AdminAntrianLegacy.vue";
import AdminAntrianSplit from "@/components/antrian/AdminAntrianSplit.vue";

const auth = useAuthStore();
const loading = ref(true);
const queueMode = ref("legacy");

const activeFloor = computed(() => auth.activeFloor || "L1");

const activeComponent = computed(() => {
  return queueMode.value === "split" ? AdminAntrianSplit : AdminAntrianLegacy;
});

async function loadSettings() {
  loading.value = true;
  try {
    const data = await fetchQueueGeneralSettings(activeFloor.value);
    queueMode.value = data.queueMode || "legacy";
  } catch (error) {
    console.error("Gagal mengambil pengaturan mode antrian:", error);
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
