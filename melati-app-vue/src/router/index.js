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

// Pengaturan
const KelolUserView = () => import("@/views/pengaturan/KelolUserView.vue");
const KodeAksesView = () => import("@/views/pengaturan/KodeAksesView.vue");
const JamAbsensiView = () => import("@/views/pengaturan/JamAbsensiView.vue");
const AntrianClosingSettingView = () => import("@/views/pengaturan/AntrianSettingView.vue");
const MaintenanceView = () => import("@/views/pengaturan/MaintenanceView.vue");

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
  { path: "/dashboard", component: DashboardView, meta: { requiresAuth: true, pageKey: "dashboard" } },

  // Absensi
  { path: "/absensi/kehadiran", component: KehadiranView, meta: { requiresAuth: true, pageKey: "absensi.kehadiran" } },
  {
    path: "/absensi/pengajuan-izin",
    component: PengajuanIzinView,
    meta: { requiresAuth: true, pageKey: "absensi.pengajuan-izin" },
  },
  {
    path: "/absensi/laporan-kehadiran",
    component: LaporanKehadiranView,
    meta: { requiresAuth: true, pageKey: "absensi.laporan-kehadiran" },
  },
  {
    path: "/absensi/laporan-izin",
    component: LaporanIzinView,
    meta: { requiresAuth: true, pageKey: "absensi.laporan-izin" },
  },
  {
    path: "/absensi/supervisor",
    component: SupervisorView,
    meta: { requiresAuth: true, pageKey: "absensi.supervisor" },
  },
  {
    path: "/absensi/tambah-pengguna",
    component: TambahPenggunaView,
    meta: { requiresAuth: true, pageKey: "absensi.tambah-pengguna" },
  },

  // Antrian
  { path: "/antrian/admin", component: AdminAntrianView, meta: { requiresAuth: true, pageKey: "antrian.admin" } },
  {
    path: "/antrian/laporan",
    component: LaporanAntrianView,
    meta: { requiresAuth: true, pageKey: "antrian.laporan" },
  },

  // Servis
  { path: "/servis/input", component: InputServisView, meta: { requiresAuth: true, pageKey: "servis.input" } },
  { path: "/servis/data", component: DataServisView, meta: { requiresAuth: true, pageKey: "servis.data" } },
  {
    path: "/servis/laporan",
    component: LaporanServisView,
    meta: { requiresAuth: true, pageKey: "servis.laporan" },
  },

  // Aksesoris
  {
    path: "/aksesoris/penjualan",
    component: PenjualanView,
    meta: { requiresAuth: true, pageKey: "aksesoris.penjualan" },
  },
  {
    path: "/aksesoris/data-penjualan",
    component: DataPenjualanView,
    meta: { requiresAuth: true, pageKey: "aksesoris.data-penjualan" },
  },
  {
    path: "/aksesoris/laporan-penjualan",
    component: LaporanPenjualanView,
    meta: { requiresAuth: true, pageKey: "aksesoris.laporan-penjualan" },
  },
  {
    path: "/aksesoris/tambah-barang",
    component: TambahBarangView,
    meta: { requiresAuth: true, pageKey: "aksesoris.tambah-barang" },
  },
  {
    path: "/aksesoris/return",
    component: ReturnBarangView,
    meta: { requiresAuth: true, pageKey: "aksesoris.return" },
  },
  {
    path: "/aksesoris/laporan-stok",
    component: LaporanStokView,
    meta: { requiresAuth: true, pageKey: "aksesoris.laporan-stok" },
  },
  {
    path: "/aksesoris/kelola-sales",
    component: KelolaSalesView,
    meta: { requiresAuth: true, pageKey: "aksesoris.kelola-sales" },
  },

  // Inventory
  {
    path: "/inventory/manajemen",
    component: ManajemenStokView,
    meta: { requiresAuth: true, pageKey: "inventory.manajemen" },
  },
  {
    path: "/inventory/laporan-harian",
    component: LaporanStokHarianView,
    meta: { requiresAuth: true, pageKey: "inventory.laporan-harian" },
  },
  {
    path: "/inventory/mutasi-kode",
    component: MutasiKodeView,
    meta: { requiresAuth: true, pageKey: "inventory.mutasi-kode" },
  },
  {
    path: "/inventory/restok",
    component: RestokBarangView,
    meta: { requiresAuth: true, pageKey: "inventory.restok" },
  },
  {
    path: "/inventory/buyback",
    component: BuybackView,
    meta: { requiresAuth: true, pageKey: "inventory.buyback" },
  },

  // Promosi
  {
    path: "/promosi/setting",
    component: SettingPromosiView,
    meta: { requiresAuth: true, pageKey: "promosi.setting" },
  },

  // Pengaturan
  { path: "/pengaturan/users", component: KelolUserView, meta: { requiresAuth: true, pageKey: "admin.users" } },
  {
    path: "/pengaturan/access-codes",
    component: KodeAksesView,
    meta: { requiresAuth: true, pageKey: "admin.access-codes" },
  },
  {
    path: "/pengaturan/jam-absensi",
    component: JamAbsensiView,
    meta: { requiresAuth: true, pageKey: "admin.jam-absensi" },
  },
  {
    path: "/pengaturan/antrian-penutupan",
    component: AntrianClosingSettingView,
    meta: { requiresAuth: true, pageKey: "admin.antrian-closing" },
  },
  {
    path: "/pengaturan/maintenance",
    component: MaintenanceView,
    meta: { requiresAuth: true, pageKey: "admin.maintenance" },
  },

  // Backward-compatible redirects
  { path: "/admin/users", redirect: "/pengaturan/users" },
  { path: "/admin/access-codes", redirect: "/pengaturan/access-codes" },
  { path: "/admin/jam-absensi", redirect: "/pengaturan/jam-absensi" },
  { path: "/admin/antrian-penutupan", redirect: "/pengaturan/antrian-penutupan" },
  { path: "/maintenance", redirect: "/pengaturan/maintenance" },

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

  // Page-based access check (KISS: supervisor is root)
  if (to.meta.pageKey && !auth.canAccessPage(to.meta.pageKey)) {
    return { path: "/unauthorized" };
  }

  // Role check
  if (to.meta.roles && !to.meta.roles.includes(auth.userRole)) {
    return { path: "/unauthorized" };
  }

  return true;
});

export default router;
