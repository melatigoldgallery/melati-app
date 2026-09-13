<template>
  <div class="container-fluid py-3 dashboard-page d-flex flex-column flex-grow-1">
    <div class="dashboard-desktop-content d-flex flex-column flex-grow-1" :class="{ 'd-none d-md-block': showMobileRoleLayout }">
      <div class="row g-3 g-lg-4 mb-2 align-items-stretch flex-grow-1">
        <!-- Kolom Kiri: Dashboard Sistem, Akses Cepat & Harga Emas (col-12 col-lg-8) -->
        <div class="col-12 col-lg-9 d-flex flex-column gap-3 gap-lg-4">
          <!-- 1. Bagian Dashboard Sistem -->
          <section class="card border-0 shadow-sm rounded-3 bg-white main-systems-card flex-shrink-0">
            <div class="card-header bg-white border-bottom py-3 px-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="d-flex align-items-center gap-2">
                <div class="main-system-icon-box bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center">
                  <i class="bi bi-grid-fill"></i>
                </div>
                <div>
                  <h6 class="mb-0 fw-bold text-dark section-heading">Dashboard Sistem</h6>
                  <small class="text-muted">Pilih modul operasional utama</small>
                </div>
              </div>
            </div>

            <div class="card-body p-3.5">
              <div class="row g-3 dashboard-stats-grid">
                <div v-for="sys in desktopSystems" :key="sys.label" class="col-12 col-sm-6">
                  <RouterLink :to="sys.to" class="text-decoration-none d-block h-100 system-link">
                    <article class="system-card shadow-sm border bg-white rounded-3 h-100 d-flex flex-column justify-content-between" :style="{ '--top-color': sys.topBorderColor || sys.gradStart }">
                      <div class="system-card-body p-3">
                        <div class="d-flex align-items-start gap-3">
                          <div class="system-icon-box rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" :style="{ background: sys.iconBg }">
                            <i :class="['bi', sys.icon]"></i>
                          </div>
                          <div class="system-info flex-grow-1 min-w-0">
                            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                              <h6 class="fw-bold text-dark mb-0">{{ sys.label }}</h6>
                              <span v-if="sys.tag" :class="['badge rounded-pill small fw-semibold', sys.tagClass]">
                                {{ sys.tag }}
                              </span>
                            </div>
                            <p class="text-secondary mb-0 text-truncate-2">{{ sys.desc }}</p>
                          </div>
                        </div>
                      </div>

                      <div class="system-card-footer px-3 py-2 border-top bg-light-subtle d-flex justify-content-between align-items-center">
                        <span class="action-text small fw-semibold" :style="{ color: sys.actionColor || sys.gradStart }">
                          {{ sys.actionLabel || 'Buka Modul' }}
                        </span>
                        <i class="bi bi-chevron-right small" :style="{ color: sys.actionColor || sys.gradStart }"></i>
                      </div>
                    </article>
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. Bagian Akses Cepat -->
          <section class="card border-0 shadow-sm rounded-3 bg-white quick-access-card flex-shrink-0">
            <div class="card-header bg-white border-bottom py-3 px-3.5 d-flex justify-content-between align-items-center flex-wrap gap-2 flex-shrink-0">
              <div class="d-flex align-items-center gap-2">
                <div class="quick-icon-title-box rounded-2 d-flex align-items-center justify-content-center">
                  <i class="bi bi-lightning-charge-fill text-warning"></i>
                </div>
                <h6 class="mb-0 fw-bold text-dark section-heading">Akses Cepat</h6>
              </div>
            </div>

            <div class="card-body p-3.5">
              <div class="row g-2.5">
                <div v-for="link in desktopQuickLinks" :key="link.to" class="col-6 col-md-3 mb-3">
                  <RouterLink :to="resolveQuickLink(link.to)" class="text-decoration-none d-block h-100">
                    <div class="quick-btn-item p-3 rounded-3 bg-white border h-100 d-flex align-items-center gap-2 transition-all">
                      <div class="quick-btn-icon rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" :style="{ background: link.iconBg, color: link.iconColor }">
                        <i :class="['bi', link.icon]" aria-hidden="true"></i>
                      </div>
                      <div class="quick-btn-content min-w-0">
                        <span class="quick-btn-title d-block fw-bold text-dark mb-1">{{ link.label }}</span>
                        <small class="quick-btn-desc d-block text-muted">{{ link.desc }}</small>
                      </div>
                    </div>
                  </RouterLink>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Kolom Kanan: Update Fitur Terbaru (col-12 col-lg-4) -->
        <div class="col-12 col-lg-3 d-flex flex-column mb-3 mb-lg-0">
          <FeatureUpdatesWidget class="w-100 flex-grow-1 h-100" />
        </div>
      </div>
    </div>

    <!-- Mobile Variant untuk Staff -->
    <div v-if="mobileDashboardVariant === 'staff'" class="dashboard-mobile-content d-md-none">
      <div class="app-intro-container">
        <div class="app-intro-header text-center mb-4">
          <img src="/img/Melati.jfif" alt="Melati Gold Shop Logo" class="app-logo mb-3" />
          <h1 class="app-title">Sistem Absensi</h1>
          <p class="app-subtitle">Melati Gold Shop</p>
        </div>

        <div class="app-intro-card">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h2 class="card-title text-primary mb-3 fs-6">
                <i class="bi bi-info-circle me-2"></i>
                Tentang Aplikasi
              </h2>
              <p class="card-text small mb-0">
                Sistem Absensi Melati Gold Shop digunakan untuk pencatatan kehadiran dan pengajuan izin karyawan.
              </p>
            </div>
          </div>
        </div>

        <div class="app-features mt-3">
          <div class="row g-2">
            <div class="col-12" v-for="feature in staffFeatures" :key="feature.title">
              <div class="card shadow-sm border-0 feature-card">
                <div class="card-body py-3">
                  <div class="feature-icon" :style="{ background: feature.color }">
                    <i :class="['bi', feature.icon]"></i>
                  </div>
                  <h3 class="feature-title">{{ feature.title }}</h3>
                  <p class="feature-text">{{ feature.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="app-action mt-4 mb-3 text-center">
          <RouterLink to="/absensi/pengajuan-izin" class="btn btn-primary btn-md w-100">
            <i class="bi bi-send me-2"></i>
            Ajukan Izin
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Mobile Variant untuk Admin -->
    <div v-else-if="mobileDashboardVariant === 'admin'" class="dashboard-mobile-content d-md-none">
      <div class="app-intro-container">
        <div class="app-intro-header text-center mb-4">
          <img src="/img/Melati.jfif" alt="Melati Gold Shop Logo" class="app-logo mb-3" />
          <h1 class="app-title">Sistem Servis dan Order Online</h1>
          <p class="app-subtitle">Melati Gold Shop</p>
        </div>

        <div class="app-intro-card">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h2 class="card-title text-dark mb-3 fs-6">
                <i class="bi bi-info-circle me-2"></i>
                Tentang Aplikasi
              </h2>
              <p class="card-text small mb-0 text-center">
                Sistem ini digunakan untuk memantau data servis dan order online customer dengan lebih cepat.
              </p>
            </div>
          </div>
        </div>

        <div class="app-features mt-3">
          <div class="row g-2">
            <div class="col-12" v-for="feature in adminFeatures" :key="feature.title">
              <div class="card shadow-sm border-0 feature-card admin-feature-card">
                <div class="card-body py-3">
                  <div class="feature-icon" :style="{ background: feature.color }">
                    <i :class="['bi', feature.icon]"></i>
                  </div>
                  <h3 class="feature-title">{{ feature.title }}</h3>
                  <p class="feature-text">{{ feature.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="app-servis mt-4 mb-3">
          <RouterLink
            v-for="link in adminActionLinks"
            :key="link.to"
            :to="link.to"
            class="btn btn-sm w-100"
            :class="link.class"
          >
            <i :class="['bi', link.icon, 'me-2']"></i>
            {{ link.label }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { normalizeUserRole } from "@/config/access-control";
import { normalizeFloorId } from "@/config/floor-config";
import FeatureUpdatesWidget from "@/components/dashboard/FeatureUpdatesWidget.vue";

const auth = useAuthStore();
const activeFloor = computed(() => normalizeFloorId(auth.activeFloor, "L1"));

function canOpen(pageKey) {
  return !pageKey || auth.canAccessPage(pageKey);
}

const normalizedRole = computed(() => {
  return normalizeUserRole(auth.userRole, "staff");
});

const isL2Admin = computed(() => {
  return auth.activeFloor === "L2" && (auth.userRole === "admin" || auth.userRole === "admin_custom");
});

function resolveQuickLink(to) {
  if (to !== "/antrian/display" && to !== "/antrian/ambil") return to;
  return { path: to, query: { floor: activeFloor.value } };
}

// 4 Sistem Utama dengan Badge dan Action Text sesuai Desain Gambar
const systems = [
  {
    label: "Sistem Antrian",
    tagClass: "bg-primary-subtle text-primary border border-primary-subtle",
    desc: "Manajemen pelayanan customer & loket pelayanan kasir.",
    actionLabel: "Buka Antrian Customer",
    to: "/antrian/admin",
    icon: "bi-arrow-left-right",
    iconBg: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
    topBorderColor: "#3b82f6",
    actionColor: "#2563eb",
    pageKey: "antrian.admin",
  },
  {
    label: "Sistem Absensi",
    tagClass: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    desc: "Monitoring kehadiran, scan wajah, shift kerja & izin staf.",
    actionLabel: "Kelola Presensi Staf",
    to: "/absensi/kehadiran",
    icon: "bi-qr-code-scan",
    iconBg: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    topBorderColor: "#f59e0b",
    actionColor: "#d97706",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Sistem Service",
    tagClass: "bg-success-subtle text-success border border-success-subtle",
    desc: "Pencatatan reparasi, patri, cuci & servis perhiasan emas.",
    actionLabel: "Kelola Order Servis",
    to: "/servis/input",
    icon: "bi-gear-fill",
    iconBg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    topBorderColor: "#10b981",
    actionColor: "#059669",
    pageKey: "servis.input",
  },
  {
    label: "Penjualan Aksesoris",
    tagClass: "bg-info-subtle text-info-emphasis border border-info-subtle",
    desc: "Input penjualan kotak, dompet, rantai perak & pouch.",
    actionLabel: "Input Transaksi Baru",
    to: "/aksesoris/penjualan",
    icon: "bi-bag-fill",
    iconBg: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
    topBorderColor: "#38bdf8",
    actionColor: "#0284c7",
    pageKey: "aksesoris.penjualan",
  },
  {
    label: "Sistem Order Online",
    tag: "Online",
    tagClass: "bg-danger-subtle text-danger border border-danger-subtle",
    desc: "Kelola pesanan dan order dari customer online.",
    actionLabel: "Buka Order Online",
    to: "/order-online/data",
    icon: "bi-shop",
    iconBg: "linear-gradient(135deg, #dc2626 0%, #f87171 100%)",
    topBorderColor: "#dc2626",
    actionColor: "#dc2626",
    pageKey: "order-online.data",
  },
];

const hrdSystems = [
  {
    label: "Kehadiran Harian",
    tag: "Presensi",
    tagClass: "bg-primary-subtle text-primary border border-primary-subtle",
    desc: "Pantau absensi masuk dan pulang karyawan setiap hari.",
    actionLabel: "Kelola Kehadiran Staf",
    to: "/absensi/kehadiran",
    icon: "bi-person-check-fill",
    iconBg: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
    topBorderColor: "#3b82f6",
    actionColor: "#2563eb",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Pengajuan Izin",
    tag: "Persetujuan",
    tagClass: "bg-success-subtle text-success border border-success-subtle",
    desc: "Tinjau dan dokumentasikan pengajuan izin karyawan.",
    actionLabel: "Tinjau Pengajuan Izin",
    to: "/absensi/pengajuan-izin",
    icon: "bi-calendar-plus-fill",
    iconBg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    topBorderColor: "#10b981",
    actionColor: "#059669",
    pageKey: "absensi.pengajuan-izin",
  },
  {
    label: "Laporan Kehadiran",
    tag: "Rekap",
    tagClass: "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    desc: "Analisis ringkasan kehadiran karyawan per periode.",
    actionLabel: "Lihat Rekap Presensi",
    to: "/absensi/laporan-kehadiran",
    icon: "bi-clipboard-data-fill",
    iconBg: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    topBorderColor: "#f59e0b",
    actionColor: "#d97706",
    pageKey: "absensi.laporan-kehadiran",
  },
  {
    label: "Laporan Izin",
    tag: "Arsip",
    tagClass: "bg-info-subtle text-info-emphasis border border-info-subtle",
    desc: "Lihat histori dan status persetujuan izin karyawan.",
    actionLabel: "Lihat Arsip Izin",
    to: "/absensi/laporan-izin",
    icon: "bi-journal-check",
    iconBg: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    topBorderColor: "#a855f7",
    actionColor: "#7c3aed",
    pageKey: "absensi.laporan-izin",
  },
];

// 8 Akses Cepat sesuai Desain Mockup Gambar
const quickLinks = [
  {
    label: "Admin Antrian",
    desc: "Panggil nomor",
    to: "/antrian/admin",
    icon: "bi-people-fill",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    pageKey: "antrian.admin",
  },
  {
    label: "Absensi",
    desc: "Check-in staf",
    to: "/absensi/kehadiran",
    icon: "bi-person-check-fill",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Input Service",
    desc: "Form penerimaan",
    to: "/servis/input",
    icon: "bi-pencil-square",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    pageKey: "servis.input",
  },
  {
    label: "Input Penjualan",
    desc: "Kasir aksesoris",
    to: "/aksesoris/penjualan",
    icon: "bi-box-seam-fill",
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    pageKey: "aksesoris.penjualan",
  },
  {
    label: "Manajemen Stok",
    desc: "Opname & barcode",
    to: "/inventory/manajemen",
    icon: "bi-archive-fill",
    iconBg: "#fdf2f8",
    iconColor: "#db2777",
    pageKey: "inventory.manajemen",
  },
  {
    label: "Laporan Penjualan",
    desc: "Rekap omset harian",
    to: "/aksesoris/laporan-penjualan",
    icon: "bi-bar-chart-fill",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    pageKey: "aksesoris.laporan-penjualan",
  },
  {
    label: "Display Antrian",
    desc: "Layar TV antrian",
    to: "/antrian/display",
    icon: "bi-display",
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
    pageKey: "antrian.display",
  },
  {
    label: "Data Servis",
    desc: "Riwayat & status servis",
    to: "/servis/data",
    icon: "bi-clipboard2-check-fill",
    iconBg: "#ecfeff",
    iconColor: "#0891b2",
    pageKey: "servis.data",
  },
];

const l2AdminQuickLinks = [
  {
    label: "Order Online",
    desc: "Kelola order web",
    to: "/order-online/data",
    icon: "bi-shop",
    iconBg: "#fff1f2",
    iconColor: "#e11d48",
    pageKey: "order-online.data",
  },
];

const hrdQuickLinks = [
  {
    label: "Kehadiran",
    desc: "Presensi harian",
    to: "/absensi/kehadiran",
    icon: "bi-person-check-fill",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Pengajuan Izin",
    desc: "Form izin cuti/sakit",
    to: "/absensi/pengajuan-izin",
    icon: "bi-calendar-plus-fill",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    pageKey: "absensi.pengajuan-izin",
  },
  {
    label: "Laporan Kehadiran",
    desc: "Rekap absensi bulanan",
    to: "/absensi/laporan-kehadiran",
    icon: "bi-clipboard-data-fill",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    pageKey: "absensi.laporan-kehadiran",
  },
  {
    label: "Laporan Izin",
    desc: "Rekap izin & cuti",
    to: "/absensi/laporan-izin",
    icon: "bi-journal-check",
    iconBg: "#f5f3ff",
    iconColor: "#7c3aed",
    pageKey: "absensi.laporan-izin",
  },
];

const desktopSystems = computed(() => {
  const source = normalizedRole.value === "hrd" ? hrdSystems : systems;
  const filtered = source.filter((item) => canOpen(item.pageKey));
  return filtered.slice(0, 4);
});

const desktopQuickLinks = computed(() => {
  const source = normalizedRole.value === "hrd" ? hrdQuickLinks : quickLinks;
  let filtered = source.filter((item) => canOpen(item.pageKey));

  if (isL2Admin.value) {
    filtered = filtered.concat(l2AdminQuickLinks.filter((item) => canOpen(item.pageKey)));
  }

  return filtered;
});

const mobileDashboardVariant = computed(() => {
  if ((normalizedRole.value === "staff" || normalizedRole.value === "hrd") && canOpen("absensi.pengajuan-izin")) {
    return "staff";
  }
  if (
    (normalizedRole.value === "admin" || normalizedRole.value === "admin_custom") &&
    (canOpen("servis.data") || canOpen("order-online.data"))
  ) {
    return "admin";
  }
  return null;
});

const showMobileRoleLayout = computed(() => mobileDashboardVariant.value !== null);

const staffFeatures = [
  {
    title: "Absensi Harian",
    desc: "Scan barcode untuk absensi masuk dan pulang.",
    icon: "bi-person-check",
    color: "linear-gradient(135deg,#3b5bdb 0%,#5f3dc4 100%)",
  },
  {
    title: "Laporan Kehadiran",
    desc: "Lihat laporan kehadiran karyawan dengan mudah.",
    icon: "bi-bar-chart-line",
    color: "linear-gradient(135deg,#0c8599 0%,#1c7ed6 100%)",
  },
  {
    title: "Pengajuan Izin",
    desc: "Ajukan izin libur, izin sakit, dan keperluan lainnya melalui aplikasi.",
    icon: "bi-calendar-plus",
    color: "linear-gradient(135deg,#2f9e44 0%,#12b886 100%)",
  },
];

const adminFeatures = [
  {
    title: "Data Servis",
    desc: "Pantau daftar servis, custom, status pengerjaan, dan bukti pengambilan customer.",
    icon: "bi-tools",
    color: "linear-gradient(135deg,#f59f00 0%,#f76707 100%)",
  },
  {
    title: "Order Online",
    desc: "Lihat data pesanan online customer agar tindak lanjut order lebih terkontrol.",
    icon: "bi-shop",
    color: "linear-gradient(135deg,#e11d48 0%,#fb7185 100%)",
  },
  {
    title: "Update Status Cepat",
    desc: "Perbarui progres servis dan order dari halaman data sesuai pekerjaan berjalan.",
    icon: "bi-arrow-repeat",
    color: "linear-gradient(135deg,#0c8599 0%,#1c7ed6 100%)",
  },
];

const adminActionLinks = computed(() =>
  [
    {
      label: "Data Servis",
      to: "/servis/data",
      icon: "bi-tools",
      class: "btn-warning",
      pageKey: "servis.data",
    },
    {
      label: "Data Order Online",
      to: "/order-online/data",
      icon: "bi-shop",
      class: "btn-primary",
      pageKey: "order-online.data",
    },
  ].filter((link) => canOpen(link.pageKey)),
);
</script>

<style scoped>
.dashboard-page {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

/* Section Header Styles */
.section-bullet {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f59e0b;
  display: inline-block;
}

.section-heading {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
}

/* System Cards */
.system-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  border-color: #eef2f6 !important;
}

.system-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--top-color, #3b82f6);
}

.system-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
  border-color: #cbd5e1 !important;
}

.system-icon-box {
  width: 44px;
  height: 44px;
  color: #ffffff;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.system-info h6 {
  font-size: 0.95rem;
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
  font-size: 0.82rem;
  color: #475569;
}

.system-card-footer {
  font-size: 0.78rem;
  border-color: #f1f5f9 !important;
}

.action-text {
  letter-spacing: 0.01em;
}

/* Main Systems Card Container */
.main-systems-card {
  background: #ffffff;
  border-radius: 12px;
}

.main-system-icon-box {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

/* Quick Access Section */
.quick-access-card {
  border-color: #eef2f6 !important;
  background: #ffffff;
}

.quick-icon-title-box {
  width: 26px;
  height: 26px;
  background-color: #fffbeb;
}

.quick-btn-item {
  border-color: #eef2f6 !important;
  transition: all 0.2s ease;
  cursor: pointer;
}

.quick-btn-item:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1 !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  background-color: #f8fafc !important;
}

.quick-btn-icon {
  width: 38px;
  height: 38px;
  font-size: 1.1rem;
}

.quick-btn-title {
  font-size: 0.82rem;
  line-height: 1.2;
}

.quick-btn-desc {
  font-size: 0.72rem;
  line-height: 1.2;
}

/* Mobile & Utility Styles */
.dashboard-mobile-content {
  animation: fadeInUp 0.35s ease-out;
}

.app-intro-header {
  padding: 0.4rem 0.2rem;
}

.app-logo {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 3px solid rgba(200, 169, 110, 0.5);
  object-fit: cover;
}

.app-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.15rem;
  color: #1f2937;
}

.app-subtitle {
  color: #64748b;
  margin-bottom: 0;
  font-size: 0.88rem;
}

.feature-card {
  border-radius: 14px;
}

.feature-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 0.55rem;
}

.feature-icon i {
  font-size: 1.05rem;
}

.feature-title {
  font-size: 0.94rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.3rem;
}

.feature-text {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

.admin-feature-card {
  border: 1px solid #ffe8cc;
  background: linear-gradient(180deg, #fffdf8 0%, #ffffff 100%);
}

.admin-feature-card .feature-title {
  color: #7c4a03;
}

.admin-feature-card .feature-text {
  color: #6b5a3a;
}

.app-action .btn,
.app-servis .btn {
  border-radius: 12px;
  font-weight: 600;
}

.app-servis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 991.98px) {
  .page-header {
    padding: 1.1rem 1.2rem;
  }
  .page-title {
    font-size: 1.35rem;
  }
}
</style>
