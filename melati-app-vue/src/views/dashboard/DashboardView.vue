<template>
  <div class="container-fluid py-3 dashboard-page">
    <div class="dashboard-desktop-content" :class="{ 'd-none d-md-block': showMobileRoleLayout }">
      <header class="page-header mb-4">
        <div class="header-content">
          <h4 class="page-title mb-1">Dashboard</h4>
          <p class="page-subtitle mb-0">Selamat datang di Sistem Manajemen Melati Gold Shop</p>
        </div>
      </header>

      <section class="mb-4">
        <div class="row g-3 dashboard-stats-grid">
          <div v-for="sys in desktopSystems" :key="sys.label" class="col-12 col-sm-6 col-xl-3">
            <RouterLink :to="sys.to" class="text-decoration-none d-block h-100 system-link">
              <article class="system-card" :style="{ '--grad-start': sys.gradStart, '--grad-end': sys.gradEnd }">
                <div class="system-icon" :style="{ background: sys.iconColor }">
                  <i :class="['bi', sys.icon]"></i>
                </div>
                <div class="system-info">
                  <h5>{{ sys.label }}</h5>
                  <p>{{ sys.desc }}</p>
                </div>
              </article>
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="card border-0 shadow-sm quick-access-card mb-4">
        <div class="card-header bg-white border-0 py-3">
          <h5 class="fw-semibold mb-0">
            <i class="bi bi-lightning-charge-fill text-warning me-1"></i>
            Akses Cepat
          </h5>
        </div>
        <div class="card-body pt-1">
          <div class="row g-2">
            <div v-for="link in desktopQuickLinks" :key="link.to" class="col-6 col-md-3">
              <RouterLink :to="resolveQuickLink(link.to)" class="text-decoration-none d-block">
                <div class="quick-btn" :style="{ '--btn-bg': link.color }">
                  <i :class="['bi', link.icon]" aria-hidden="true"></i>
                  <span>{{ link.label }}</span>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <div class="footer-info text-muted small text-end">
        Masuk sebagai:
        <span class="badge ms-1 text-capitalize role-badge">{{ auth.userRole }}</span>
      </div>
    </div>

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

const systems = [
  {
    label: "Sistem Antrian",
    desc: "Manajemen pelayanan customer",
    to: "/antrian/admin",
    icon: "bi-arrow-left-right",
    iconColor: "linear-gradient(135deg,#0d6efd 0%,#6610f2 100%)",
    gradStart: "#0d6efd",
    gradEnd: "#6610f2",
    pageKey: "antrian.admin",
  },
  {
    label: "Sistem Absensi",
    desc: "Monitoring kehadiran dan izin staf",
    to: "/absensi/kehadiran",
    icon: "bi-person-badge",
    iconColor: "linear-gradient(135deg,#ffc107 0%,#fd7e14 100%)",
    gradStart: "#ffc107",
    gradEnd: "#fd7e14",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Sistem Service",
    desc: "Pencatatan servis barang customer",
    to: "/servis/input",
    icon: "bi-tools",
    iconColor: "linear-gradient(135deg,#198754 0%,#20c997 100%)",
    gradStart: "#198754",
    gradEnd: "#20c997",
    pageKey: "servis.input",
  },
  {
    label: "Penjualan Aksesoris",
    desc: "Input penjualan kotak, aksesoris, dan silver",
    to: "/aksesoris/penjualan",
    icon: "bi-bag-check",
    iconColor: "linear-gradient(135deg,#0dcaf0 0%,#0d6efd 100%)",
    gradStart: "#0dcaf0",
    gradEnd: "#0d6efd",
    pageKey: "aksesoris.penjualan",
  },
];

const l2AdminSystems = [
  {
    label: "Pesanan Online",
    desc: "Kelola pesanan dan order dari customer online",
    to: "/order-online/data",
    icon: "bi-shop",
    iconColor: "linear-gradient(135deg,#dc3545 0%,#fd7e14 100%)",
    gradStart: "#dc3545",
    gradEnd: "#fd7e14",
    pageKey: "order-online.data",
  },
];

const hrdSystems = [
  {
    label: "Kehadiran Harian",
    desc: "Pantau absensi masuk dan pulang karyawan setiap hari.",
    to: "/absensi/kehadiran",
    icon: "bi-person-check",
    iconColor: "linear-gradient(135deg,#0d6efd 0%,#3b5bdb 100%)",
    gradStart: "#0d6efd",
    gradEnd: "#3b5bdb",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Pengajuan Izin",
    desc: "Tinjau dan dokumentasikan pengajuan izin karyawan.",
    to: "/absensi/pengajuan-izin",
    icon: "bi-calendar-plus",
    iconColor: "linear-gradient(135deg,#2f9e44 0%,#12b886 100%)",
    gradStart: "#2f9e44",
    gradEnd: "#12b886",
    pageKey: "absensi.pengajuan-izin",
  },
  {
    label: "Laporan Kehadiran",
    desc: "Analisis ringkasan kehadiran karyawan per periode.",
    to: "/absensi/laporan-kehadiran",
    icon: "bi-clipboard-data",
    iconColor: "linear-gradient(135deg,#f59f00 0%,#f76707 100%)",
    gradStart: "#f59f00",
    gradEnd: "#f76707",
    pageKey: "absensi.laporan-kehadiran",
  },
  {
    label: "Laporan Izin",
    desc: "Lihat histori dan status persetujuan izin karyawan.",
    to: "/absensi/laporan-izin",
    icon: "bi-journal-check",
    iconColor: "linear-gradient(135deg,#845ef7 0%,#5f3dc4 100%)",
    gradStart: "#845ef7",
    gradEnd: "#5f3dc4",
    pageKey: "absensi.laporan-izin",
  },
];

const quickLinks = [
  { label: "Admin Antrian", to: "/antrian/admin", icon: "bi-people-fill", color: "#2563eb", pageKey: "antrian.admin" },
  {
    label: "Absensi",
    to: "/absensi/kehadiran",
    icon: "bi-person-check-fill",
    color: "#f97316",
    pageKey: "absensi.kehadiran",
  },
  { label: "Input Service", to: "/servis/input", icon: "bi-tools", color: "#10b981", pageKey: "servis.input" },
  {
    label: "Input Penjualan",
    to: "/aksesoris/penjualan",
    icon: "bi-gem",
    color: "#8b5cf6",
    pageKey: "aksesoris.penjualan",
  },
  {
    label: "Manajemen Stok",
    to: "/inventory/manajemen",
    icon: "bi-archive-fill",
    color: "#ec4899",
    pageKey: "inventory.manajemen",
  },
  {
    label: "Laporan Penjualan",
    to: "/aksesoris/laporan-penjualan",
    icon: "bi-bar-chart-fill",
    color: "#f59e0b",
    pageKey: "aksesoris.laporan-penjualan",
  },
  {
    label: "Display Antrian",
    to: "/antrian/display",
    icon: "bi-display",
    color: "#ef4444",
    pageKey: "antrian.display",
  },
  { label: "Data Servis", to: "/servis/data", icon: "bi-person-gear", color: "#06b6d4", pageKey: "servis.data" },
];

const l2AdminQuickLinks = [
  {
    label: "Order Online",
    to: "/order-online/data",
    icon: "bi-shop",
    color: "#e11d48",
    pageKey: "order-online.data",
  },
];

const hrdQuickLinks = [
  {
    label: "Kehadiran",
    to: "/absensi/kehadiran",
    icon: "bi-person-check-fill",
    color: "#3b82f6",
    pageKey: "absensi.kehadiran",
  },
  {
    label: "Pengajuan Izin",
    to: "/absensi/pengajuan-izin",
    icon: "bi-calendar-plus-fill",
    color: "#16a34a",
    pageKey: "absensi.pengajuan-izin",
  },
  {
    label: "Laporan Kehadiran",
    to: "/absensi/laporan-kehadiran",
    icon: "bi-clipboard-data-fill",
    color: "#ea580c",
    pageKey: "absensi.laporan-kehadiran",
  },
  {
    label: "Laporan Izin",
    to: "/absensi/laporan-izin",
    icon: "bi-journal-check",
    color: "#d946ef",
    pageKey: "absensi.laporan-izin",
  },
];

const desktopSystems = computed(() => {
  const source = normalizedRole.value === "hrd" ? hrdSystems : systems;
  let filtered = source.filter((item) => canOpen(item.pageKey));

  // Tambahkan L2 admin systems jika kondisi terpenuhi
  if (isL2Admin.value) {
    filtered = filtered.concat(l2AdminSystems.filter((item) => canOpen(item.pageKey)));
  }

  return filtered;
});

const desktopQuickLinks = computed(() => {
  const source = normalizedRole.value === "hrd" ? hrdQuickLinks : quickLinks;
  let filtered = source.filter((item) => canOpen(item.pageKey));

  // Tambahkan L2 admin quick links jika kondisi terpenuhi
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
  // Supervisor: gunakan dashboard desktop apa adanya.
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
  --header-bg: linear-gradient(135deg, #ffffff 0%, #ececec 100%);
}

.page-header {
  background: var(--header-bg);
  border-radius: 16px;
  padding: 1.1rem 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1f2937;
}

.page-subtitle {
  font-size: 0.84rem;
  color: #637083;
}

.dashboard-stats-grid {
  margin-bottom: 0;
}

.system-card {
  position: relative;
  display: flex;
  gap: 0.8rem;
  width: 100%;
  align-items: center;
  min-height: 108px;
  height: 100%;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 0.9rem;
  overflow: hidden;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.system-link {
  min-width: 0;
}

.system-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--grad-start), var(--grad-end));
}

.system-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.system-icon {
  width: 46px;
  height: 46px;
  min-width: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.35rem;
}

.system-info h5 {
  margin-bottom: 0.3rem;
  color: #273142;
  font-size: 0.98rem;
  font-weight: 700;
}

.system-info p {
  margin: 0;
  color: #6b7280;
  font-size: 0.78rem;
  line-height: 1.35;
}

.mobile-role-card {
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eceff3;
  padding: 0.95rem;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.mobile-role-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.mobile-role-head i {
  font-size: 1.15rem;
}

.mobile-role-card h6 {
  font-weight: 700;
}

.mobile-role-card p {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.4;
}

.mobile-role-card.is-staff .mobile-role-head i,
.mobile-role-card.is-staff h6 {
  color: #0d6efd;
}

.mobile-role-card.is-admin .mobile-role-head i,
.mobile-role-card.is-admin h6 {
  color: #d97706;
}

.quick-access-card {
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(245, 247, 250, 0.9));
  border: 0;
  box-shadow: 0 10px 30px rgba(18, 38, 63, 0.08);
  overflow: hidden;
}

.quick-btn {
  --btn-bg: #ffa940;
  border-radius: 12px;
  padding: 0.85rem;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  color: #272727;
  transition:
    transform 0.25s cubic-bezier(0.2, 0.9, 0.2, 1),
    box-shadow 0.25s ease;
  background: linear-gradient(135deg, var(--btn-bg) 0%, rgb(198, 225, 245) 100%);
  box-shadow: 0 8px 22px rgba(14, 35, 60, 0.08);
  border: none;
}

.quick-btn i {
  font-size: 1.2rem;
}

.quick-btn span {
  font-size: 0.78rem;
  text-align: center;
  font-weight: 700;
  line-height: 1.15;
  color: #272727;
}

.quick-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 50px rgba(10, 30, 60, 0.12);
}

.role-badge {
  background: #c8a96e;
}

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

@media (min-width: 768px) {
  .page-header {
    padding: 1.4rem 1.5rem;
  }

  .page-title {
    font-size: 1.7rem;
  }

  .page-subtitle {
    font-size: 0.96rem;
  }

  .quick-btn {
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    min-height: 74px;
    gap: 0.55rem;
    padding: 0.9rem;
  }

  .quick-btn i {
    font-size: 1.2rem;
  }

  .quick-btn span {
    text-align: left;
    font-size: 0.8rem;
  }
}
</style>
