<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="mb-4">
      <h4 class="fw-bold mb-1">Dashboard</h4>
      <p class="text-muted mb-0 small">Selamat datang di Sistem Manajemen Melati Gold Shop</p>
    </div>

    <!-- System overview cards -->
    <div class="row g-3 mb-4">
      <div v-for="sys in systems" :key="sys.label" class="col-6 col-md-3">
        <RouterLink :to="sys.to" class="text-decoration-none">
          <div class="card border-0 shadow-sm h-100 sys-card">
            <div class="card-body d-flex align-items-center gap-3 py-3">
              <div
                class="sys-icon rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                :style="{ background: sys.color }"
              >
                <i :class="['bi', sys.icon, 'fs-4 text-white']"></i>
              </div>
              <div>
                <div class="fw-semibold text-dark small lh-sm">{{ sys.label }}</div>
                <div class="text-muted" style="font-size: 0.75rem">{{ sys.desc }}</div>
              </div>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Quick access -->
    <h5 class="fw-semibold mb-3">
      <i class="bi bi-lightning-charge-fill text-warning me-1"></i>
      Akses Cepat
    </h5>
    <div class="row g-2 mb-4">
      <div v-for="link in quickLinks" :key="link.to" class="col-6 col-md-3">
        <RouterLink :to="link.to" class="text-decoration-none">
          <div
            class="quick-btn d-flex align-items-center gap-2 rounded-3 px-3 py-3"
            :style="{ background: link.color }"
          >
            <i :class="['bi', link.icon, 'fs-5 text-white flex-shrink-0']"></i>
            <span class="text-white fw-semibold small">{{ link.label }}</span>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Footer info -->
    <div class="text-muted small text-end">
      Masuk sebagai:
      <strong>{{ auth.user?.email }}</strong>
      <span class="badge ms-1 text-capitalize" :style="{ background: '#c8a96e' }">{{ auth.userRole }}</span>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

const systems = [
  {
    label: "Sistem Antrian",
    desc: "Manajemen pelayanan customer",
    to: "/antrian/admin",
    icon: "bi-arrow-left-right",
    color: "#3b5bdb",
  },
  {
    label: "Sistem Absensi",
    desc: "Monitoring kehadiran dan izin staff",
    to: "/absensi/kehadiran",
    icon: "bi-person-badge",
    color: "#e67700",
  },
  {
    label: "Sistem Service",
    desc: "Pencatatan servis barang customer",
    to: "/servis/input",
    icon: "bi-tools",
    color: "#2f9e44",
  },
  {
    label: "Penjualan Aksesoris",
    desc: "Input penjualan kotak, aksesoris, dan silver",
    to: "/aksesoris/penjualan",
    icon: "bi-bag-check",
    color: "#0c8599",
  },
];

const quickLinks = [
  { label: "Admin Antrian", to: "/antrian/admin", icon: "bi-people-fill", color: "#3b5bdb" },
  { label: "Absensi", to: "/absensi/kehadiran", icon: "bi-person-check-fill", color: "#e67700" },
  { label: "Input Service", to: "/servis/input", icon: "bi-tools", color: "#2f9e44" },
  { label: "Input Penjualan", to: "/aksesoris/penjualan", icon: "bi-gem", color: "#0c8599" },
  { label: "Manajemen Stok", to: "/inventory/manajemen", icon: "bi-archive-fill", color: "#6741d9" },
  { label: "Laporan Penjualan", to: "/aksesoris/laporan-penjualan", icon: "bi-bar-chart-fill", color: "#c8a96e" },
  { label: "Display Antrian", to: "/antrian/display", icon: "bi-display", color: "#e03131" },
  { label: "Kelola User", to: "/pengaturan/users", icon: "bi-person-gear", color: "#495057" },
];
</script>

<style scoped>
.sys-card {
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  cursor: pointer;
}
.sys-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1) !important;
}
.sys-icon {
  width: 48px;
  height: 48px;
  min-width: 48px;
}
.quick-btn {
  transition:
    opacity 0.15s,
    transform 0.15s;
  cursor: pointer;
}
.quick-btn:hover {
  opacity: 0.88;
  transform: translateY(-2px);
}
</style>
