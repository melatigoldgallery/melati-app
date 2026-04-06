import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// ─── Lazy-loaded views ────────────────────────────────────────────────────────
const LoginView = () => import("@/views/auth/LoginView.vue");
const DashboardView = () => import("@/views/dashboard/DashboardView.vue");
const UnauthorizedView = () => import("@/views/auth/UnauthorizedView.vue");

// Absensi
const KehadiranView = () => import("@/views/absensi/KehadiranView.vue");
const PengajuanIzinView = () => import("@/views/absensi/PengajuanIzinView.vue");
const LaporanKehadiranView = () => import("@/views/absensi/LaporanKehadiranView.vue");
const LaporanIzinView = () => import("@/views/absensi/LaporanIzinView.vue");
const SupervisorView = () => import("@/views/absensi/SupervisorView.vue");
const TambahPenggunaView = () => import("@/views/absensi/TambahPenggunaView.vue");

// Antrian
const AdminAntrianView = () => import("@/views/antrian/AdminAntrianView.vue");
const DisplayAntrianView = () => import("@/views/antrian/DisplayAntrianView.vue");
const LaporanAntrianView = () => import("@/views/antrian/LaporanAntrianView.vue");

// Servis
const InputServisView = () => import("@/views/servis/InputServisView.vue");
const DataServisView = () => import("@/views/servis/DataServisView.vue");
const LaporanServisView = () => import("@/views/servis/LaporanServisView.vue");

// Aksesoris
const PenjualanView = () => import("@/views/aksesoris/PenjualanView.vue");
const DataPenjualanView = () => import("@/views/aksesoris/DataPenjualanView.vue");
const LaporanPenjualanView = () => import("@/views/aksesoris/LaporanPenjualanView.vue");
const TambahBarangView = () => import("@/views/aksesoris/TambahBarangView.vue");
const ReturnBarangView = () => import("@/views/aksesoris/ReturnBarangView.vue");
const LaporanStokView = () => import("@/views/aksesoris/LaporanStokView.vue");
const KelolaSalesView = () => import("@/views/aksesoris/KelolaSalesView.vue");

// Inventory
const ManajemenStokView = () => import("@/views/inventory/ManajemenStokView.vue");
const LaporanStokHarianView = () => import("@/views/inventory/LaporanStokHarianView.vue");
const MutasiKodeView = () => import("@/views/inventory/MutasiKodeView.vue");
const RestokBarangView = () => import("@/views/inventory/RestokBarangView.vue");
const BuybackView = () => import("@/views/inventory/BuybackView.vue");

// Promosi
const SettingPromosiView = () => import("@/views/promosi/SettingPromosiView.vue");
const DisplayPromosiView = () => import("@/views/promosi/DisplayPromosiView.vue");

// Admin
const KelolUserView = () => import("@/views/admin/KelolUserView.vue");
const KodeAksesView = () => import("@/views/admin/KodeAksesView.vue");
const JamAbsensiView = () => import("@/views/admin/JamAbsensiView.vue");

// ─── Route definitions ────────────────────────────────────────────────────────
const routes = [
  // Public
  { path: "/", redirect: "/login" },
  { path: "/login", component: LoginView, meta: { layout: "blank", public: true } },
  { path: "/unauthorized", component: UnauthorizedView, meta: { layout: "blank", public: true } },

  // Display-only (no sidebar, no login)
  { path: "/antrian/display", component: DisplayAntrianView, meta: { layout: "blank", public: true } },
  { path: "/promosi/display", component: DisplayPromosiView, meta: { layout: "blank", public: true } },

  // Dashboard
  {
    path: "/dashboard",
    component: DashboardView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf", "admin_custom"] },
  },

  // Absensi — kehadiran bisa tanpa login (kiosk)
  { path: "/absensi/kehadiran", component: KehadiranView, meta: { requiresAuth: false, public: true } },
  {
    path: "/absensi/pengajuan-izin",
    component: PengajuanIzinView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf"] },
  },
  {
    path: "/absensi/laporan-kehadiran",
    component: LaporanKehadiranView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/absensi/laporan-izin",
    component: LaporanIzinView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/absensi/supervisor",
    component: SupervisorView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  { path: "/absensi/tambah-pengguna", component: TambahPenggunaView, meta: { requiresAuth: true, roles: ["admin"] } },

  // Antrian
  {
    path: "/antrian/admin",
    component: AdminAntrianView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf"] },
  },
  {
    path: "/antrian/laporan",
    component: LaporanAntrianView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },

  // Servis
  {
    path: "/servis/input",
    component: InputServisView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf", "admin_custom"] },
  },
  {
    path: "/servis/data",
    component: DataServisView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf", "admin_custom"] },
  },
  {
    path: "/servis/laporan",
    component: LaporanServisView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },

  // Aksesoris
  {
    path: "/aksesoris/penjualan",
    component: PenjualanView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf", "admin_custom"] },
  },
  {
    path: "/aksesoris/data-penjualan",
    component: DataPenjualanView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "staf", "admin_custom"] },
  },
  {
    path: "/aksesoris/laporan-penjualan",
    component: LaporanPenjualanView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  { path: "/aksesoris/tambah-barang", component: TambahBarangView, meta: { requiresAuth: true, roles: ["admin"] } },
  {
    path: "/aksesoris/return",
    component: ReturnBarangView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/aksesoris/laporan-stok",
    component: LaporanStokView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  { path: "/aksesoris/kelola-sales", component: KelolaSalesView, meta: { requiresAuth: true, roles: ["admin"] } },

  // Inventory
  {
    path: "/inventory/manajemen",
    component: ManajemenStokView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/inventory/laporan-harian",
    component: LaporanStokHarianView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  { path: "/inventory/mutasi-kode", component: MutasiKodeView, meta: { requiresAuth: true, roles: ["admin"] } },
  {
    path: "/inventory/restok",
    component: RestokBarangView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  { path: "/inventory/buyback", component: BuybackView, meta: { requiresAuth: true, roles: ["admin", "supervisor"] } },

  // Promosi
  { path: "/promosi/setting", component: SettingPromosiView, meta: { requiresAuth: true, roles: ["admin"] } },

  // Admin
  { path: "/admin/users", component: KelolUserView, meta: { requiresAuth: true, roles: ["admin"] } },
  { path: "/admin/access-codes", component: KodeAksesView, meta: { requiresAuth: true, roles: ["admin"] } },
  { path: "/admin/jam-absensi", component: JamAbsensiView, meta: { requiresAuth: true, roles: ["admin"] } },

  // 404 catch-all
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ─── Navigation Guard ─────────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // Delay initialization: ensure auth is resolved on first load
  if (!auth.initialized) {
    await auth.init();
  }

  // Public routes — always allow
  if (to.meta.public) return true;

  // Needs auth but not logged in
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  // Role check
  if (to.meta.roles && !to.meta.roles.includes(auth.userRole)) {
    return { path: "/unauthorized" };
  }

  return true;
});

export default router;
