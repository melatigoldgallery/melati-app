<template>
  <div class="container-fluid py-3">
    <h4 class="fw-bold mb-4">
      <i class="bi bi-house-door me-2 text-warning"></i>
      Dashboard
    </h4>

    <!-- Summary cards -->
    <div class="row g-3 mb-4">
      <div v-for="card in cards" :key="card.label" class="col-6 col-md-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="icon-box rounded-3 p-3" :style="{ background: card.color + '20' }">
              <i :class="['bi', card.icon, 'fs-4']" :style="{ color: card.color }"></i>
            </div>
            <div>
              <div class="text-muted small">{{ card.label }}</div>
              <div class="fw-bold fs-5">{{ card.value }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <h5 class="fw-semibold mb-3">Akses Cepat</h5>
    <div class="row g-2">
      <div v-for="link in quickLinks" :key="link.to" class="col-6 col-md-4 col-lg-3">
        <RouterLink :to="link.to" class="card text-decoration-none border-0 shadow-sm quick-link-card">
          <div class="card-body text-center py-3">
            <i :class="['bi', link.icon, 'fs-3 mb-2 d-block']" :style="{ color: link.color }"></i>
            <div class="small fw-semibold text-dark">{{ link.label }}</div>
          </div>
        </RouterLink>
      </div>
    </div>

    <div class="mt-4 text-muted small text-end">
      Masuk sebagai:
      <strong>{{ auth.user?.email }}</strong>
      ({{ auth.userRole }})
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();

const cards = [
  {
    label: "Hari ini",
    icon: "bi-calendar-check",
    color: "#c8a96e",
    value: new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
  },
];

const quickLinks = [
  { label: "Penjualan Aksesoris", to: "/aksesoris/penjualan", icon: "bi-gem", color: "#c8a96e" },
  { label: "Input Servis", to: "/servis/input", icon: "bi-tools", color: "#0d6efd" },
  { label: "Kehadiran", to: "/absensi/kehadiran", icon: "bi-person-check", color: "#198754" },
  { label: "Admin Antrian", to: "/antrian/admin", icon: "bi-people", color: "#dc3545" },
  { label: "Manajemen Stok", to: "/inventory/manajemen", icon: "bi-archive", color: "#6610f2" },
  { label: "Laporan Penjualan", to: "/aksesoris/laporan-penjualan", icon: "bi-bar-chart", color: "#fd7e14" },
];
</script>

<style scoped>
.quick-link-card {
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  cursor: pointer;
}
.quick-link-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12) !important;
}
</style>
