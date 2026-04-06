<template>
  <Teleport to="body">
    <div v-if="visible" class="loading-overlay">
      <div class="text-center text-white">
        <div class="spinner-border mb-2" role="status" style="width: 3rem; height: 3rem">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div v-if="message" class="small">{{ message }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: "" },
});
</script>
