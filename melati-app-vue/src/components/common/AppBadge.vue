<template>
  <span class="badge" :class="badgeClass">{{ label }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  value: { type: String, required: true },
  map: {
    type: Object,
    default: () => ({
      LUNAS: { class: "badge-lunas", label: "Lunas" },
      "BELUM LUNAS": { class: "badge-belum", label: "Belum Lunas" },
      DP: { class: "badge-dp", label: "DP" },
      GRATIS: { class: "badge-gratis", label: "Gratis" },
      SELESAI: { class: "bg-success", label: "Selesai" },
      PROSES: { class: "bg-warning text-dark", label: "Proses" },
      MASUK: { class: "bg-info text-dark", label: "Masuk" },
      DIAMBIL: { class: "bg-secondary", label: "Diambil" },
      approved: { class: "bg-success", label: "Disetujui" },
      pending: { class: "bg-warning text-dark", label: "Menunggu" },
      rejected: { class: "bg-danger", label: "Ditolak" },
    }),
  },
});

const resolved = computed(() => props.map[props.value] || { class: "bg-secondary", label: props.value });
const badgeClass = computed(() => resolved.value.class);
const label = computed(() => resolved.value.label);
</script>
