<template>
  <div v-if="progress !== null" class="mt-2">
    <div class="progress" role="progressbar" :aria-label="ariaLabel">
      <div
        class="progress-bar"
        :class="barClasses"
        :style="{ width: `${clamped}%` }"
        :aria-valuenow="clamped"
        aria-valuemin="0"
        aria-valuemax="100"
      ></div>
    </div>
    <div v-if="showLabel" class="small text-muted mt-1">{{ label }}: {{ clamped }}%</div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  progress: { type: Number, default: null },
  label: { type: String, default: "Upload" },
  showLabel: { type: Boolean, default: true },
  animated: { type: Boolean, default: true },
  striped: { type: Boolean, default: true },
  ariaLabel: { type: String, default: "Progress upload" },
});

const clamped = computed(() => {
  if (props.progress === null || Number.isNaN(props.progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(props.progress)));
});

const barClasses = computed(() => ({
  "progress-bar-striped": props.striped,
  "progress-bar-animated": props.animated,
}));
</script>
