<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import BlankLayout from "@/layouts/BlankLayout.vue";

const route = useRoute();

const layout = computed(() => (route.meta.layout === "blank" ? BlankLayout : DefaultLayout));
</script>
