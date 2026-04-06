<template>
  <nav class="sidebar d-flex flex-column py-3" :class="{ collapsed }">
    <!-- Logo -->
    <div class="px-3 mb-3 d-flex align-items-center gap-2">
      <img src="/img/Melati.jfif" alt="Melati" width="36" height="36" class="rounded-circle" />
      <span v-if="!collapsed" class="fw-bold text-white fs-6">Melati Gold</span>
    </div>

    <hr class="border-secondary my-1" />

    <!-- Menu items -->
    <ul class="nav flex-column px-2 flex-grow-1">
      <template v-for="item in visibleMenu" :key="item.label">
        <!-- Single item (no children) -->
        <li v-if="!item.children" class="nav-item">
          <RouterLink :to="item.to" class="nav-link sidebar-link" active-class="active">
            <i :class="['bi', item.icon, 'me-2']"></i>
            <span v-if="!collapsed">{{ item.label }}</span>
          </RouterLink>
        </li>

        <!-- Group with children -->
        <li v-else class="nav-item">
          <button
            class="nav-link sidebar-link w-100 border-0 bg-transparent text-start d-flex align-items-center"
            @click="toggleGroup(item.label)"
          >
            <i :class="['bi', item.icon, 'me-2']"></i>
            <span v-if="!collapsed" class="flex-grow-1">{{ item.label }}</span>
            <i
              v-if="!collapsed"
              :class="['bi', openGroups.includes(item.label) ? 'bi-chevron-up' : 'bi-chevron-down', 'ms-auto small']"
            ></i>
          </button>

          <ul v-if="!collapsed && openGroups.includes(item.label)" class="nav flex-column ps-3">
            <li v-for="child in visibleChildren(item.children)" :key="child.to" class="nav-item">
              <RouterLink :to="child.to" class="nav-link sidebar-link-child" active-class="active">
                <i class="bi bi-chevron-right me-1 small"></i>
                {{ child.label }}
              </RouterLink>
            </li>
          </ul>
        </li>
      </template>
    </ul>

    <!-- Logout -->
    <div class="px-3 mt-2">
      <button class="btn btn-sm btn-outline-danger w-100" @click="logout">
        <i class="bi bi-box-arrow-right me-1"></i>
        <span v-if="!collapsed">Logout</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { menuStructure } from "@/config/menu-structure";

const props = defineProps({
  collapsed: { type: Boolean, default: false },
});

const auth = useAuthStore();
const router = useRouter();

// Filter menu berdasarkan role user
const visibleMenu = computed(() => menuStructure.filter((item) => item.roles.includes(auth.userRole)));

const visibleChildren = (children) => children.filter((c) => c.roles.includes(auth.userRole));

// Accordion state
const openGroups = ref([]);
function toggleGroup(label) {
  const idx = openGroups.value.indexOf(label);
  if (idx === -1) openGroups.value.push(label);
  else openGroups.value.splice(idx, 1);
}

async function logout() {
  await auth.logout();
  router.push("/login");
}
</script>

<style scoped>
.sidebar {
  background-color: var(--melati-sidebar-bg);
  color: var(--melati-sidebar-text);
  width: 260px;
  min-height: 100vh;
  transition: width 0.25s ease;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar.collapsed {
  width: 60px;
}

.sidebar-link {
  color: var(--melati-sidebar-text);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.sidebar-link:hover,
.sidebar-link.active {
  background-color: rgba(200, 169, 110, 0.2);
  color: var(--melati-sidebar-active);
}
.sidebar-link-child {
  color: #aaa;
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.sidebar-link-child:hover,
.sidebar-link-child.active {
  background-color: rgba(200, 169, 110, 0.15);
  color: var(--melati-sidebar-active);
}
</style>
