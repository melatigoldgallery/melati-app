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
      <div class="dropdown">
        <button
          class="btn p-0 border-0 bg-transparent d-flex align-items-center role-dropdown-trigger"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span v-if="auth.activeFloor" class="badge bg-light text-dark border small me-1">
            {{ floorLabel }}
          </span>
          <span class="badge btn-primary text-uppercase small">{{ auth.userRole }}</span>
          <i class="bi bi-chevron-down role-dropdown-icon ms-1" aria-hidden="true"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
          <li>
            <button class="dropdown-item text-danger" type="button" @click="handleLogout">
              <i class="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getFloorLabel } from "@/config/floor-config";

defineEmits(["toggle-sidebar"]);

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const pageTitle = computed(() => route.meta?.title || "");
const floorLabel = computed(() => getFloorLabel(auth.activeFloor || "L1"));

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

async function handleLogout() {
  await auth.logout();
  router.push("/login");
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

.role-dropdown-trigger {
  cursor: pointer;
}

.role-dropdown-icon {
  font-size: 0.75rem;
  color: #6c757d;
  transition: transform 0.2s ease;
}

.role-dropdown-trigger[aria-expanded="true"] .role-dropdown-icon {
  transform: rotate(180deg);
}
</style>
