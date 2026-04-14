<template>
  <nav class="sidebar d-flex flex-column py-3" :class="{ collapsed, 'sidebar-mobile-open': mobileOpen }">
    <!-- Logo -->
    <div class="px-3 mb-3 d-flex align-items-center gap-2">
      <img src="/img/Melati.jfif" alt="Melati" width="36" height="36" class="rounded-circle" />
      <span v-if="!collapsed" class="fw-bold text-white fs-6">Melati Gold Shop</span>
    </div>

    <hr class="border-secondary my-1" />

    <!-- Menu items -->
    <ul class="nav flex-column px-2 flex-grow-1">
      <template v-for="item in visibleMenu" :key="item.label">
        <!-- Single item (no children) -->
        <li v-if="!item.children" class="nav-item">
          <RouterLink :to="item.to" class="nav-link sidebar-link" active-class="active" @click="onLinkClick">
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
              <RouterLink :to="child.to" class="nav-link sidebar-link-child" active-class="active" @click="onLinkClick">
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
  mobileOpen: { type: Boolean, default: false },
});

const emit = defineEmits(["close-mobile"]);

function onLinkClick() {
  if (window.innerWidth < 768) emit("close-mobile");
}

const auth = useAuthStore();
const router = useRouter();

// Filter menu berdasarkan role user
function canOpenItem(item) {
  if (!item.roles.includes(auth.userRole)) return false;
  if (!item.pageKey) return true;
  return auth.canAccessPage(item.pageKey);
}

const visibleChildren = (children) => children.filter((child) => canOpenItem(child));

const visibleMenu = computed(() =>
  menuStructure.filter((item) => {
    if (!item.roles.includes(auth.userRole)) return false;
    if (item.children?.length) return visibleChildren(item.children).length > 0;
    return canOpenItem(item);
  }),
);

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
  width: 220px;
  min-height: 100vh;
  transition: width 0.25s ease;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar.collapsed {
  width: 60px;
}

.sidebar-link {
  color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.sidebar-link:hover,
.sidebar-link.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}
.sidebar-link-child {
  color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.sidebar-link-child:hover,
.sidebar-link-child.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 260px !important;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 1050;
  }
  .sidebar.sidebar-mobile-open {
    transform: translateX(0);
  }
}
</style>
