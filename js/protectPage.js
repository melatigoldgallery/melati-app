// File ini menangani proteksi halaman berdasarkan role dan permissions
import { authService } from "./configFirebase.js";

// Fungsi untuk memeriksa autentikasi
async function checkAuth() {
  try {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      // Redirect ke halaman login
      window.location.href = "index.html";
      return false;
    }
    return true;
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "index.html";
    return false;
  }
}

// Fungsi untuk memeriksa apakah pengguna adalah admin
async function isAdmin() {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return sessionUser.role === "admin";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Fungsi untuk memeriksa apakah pengguna adalah supervisor
function isSupervisor() {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return sessionUser.username === "supervisor" && sessionUser.role === "admin";
  } catch (error) {
    console.error("Error checking supervisor status:", error);
    return false;
  }
}

// Fungsi untuk memeriksa akses ke halaman tertentu
function hasPageAccess(pageName) {
  const sessionUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  // Super Admin (username = supervisor) has full access
  if (isSupervisor()) {
    return true;
  }

  // Admin access check - hardcoded filtering
  if (sessionUser.role === "admin") {
    // Block maintenance, setting, and supervisor pages for admin
    const blockedPages = [
      "maintenance.html",
      "kelola-user.html",
      "jam-absensi.html",
      "supervisor.html",
      "tambah-pengguna.html",
    ];
    if (blockedPages.includes(pageName)) {
      return false;
    }
    return true;
  }

  // Staff access check - based on permissions
  if (sessionUser.role === "staf" && sessionUser.permissions) {
    return checkStaffPageAccess(pageName, sessionUser.permissions);
  }

  // Default: no access except dashboard
  return pageName === "dashboard.html";
}

// Check if staff has access to specific page
function checkStaffPageAccess(pageName, permissions) {
  // Dashboard always accessible
  if (pageName === "dashboard.html") return true;

  // Map pages to permission keys
  const pagePermissionMap = {
    // Maintenance & Setting - Super Admin only
    "maintenance.html": () => false,
    "kelola-user.html": () => false,
    "jam-absensi.html": () => false,

    // Inventory Barang
    "manajemenStok.html": () => permissions["inventory-barang"]?.["manajemen-stok"] === true,
    "laporanStokHarian.html": () => permissions["inventory-barang"]?.["laporan-stok-harian"] === true,
    "mutasiKode.html": () => permissions["inventory-barang"]?.["mutasi-kode"] === true,
    "restokBarang.html": () => permissions["inventory-barang"]?.["restok-barang"] === true,

    // Layanan
    "order-barang.html": () => permissions.layanan?.["order-barang"] === true,

    // Aksesoris
    "tambahAksesoris.html": () => permissions.aksesoris?.["tambah-barang"] === true,
    "penjualanAksesoris.html": () => permissions.aksesoris?.penjualan === true,
    "return.html": () => permissions.aksesoris?.return === true,
    "laporanPenjualan.html": () => permissions.aksesoris?.["laporan-penjualan"] === true,
    "laporanStok.html": () => permissions.aksesoris?.["laporan-stok"] === true,

    // Antrian
    "admin-antrian.html": () => permissions.antrian?.["admin-antrian"] === true,
    "display.html": () => permissions.antrian?.["display-antrian"] === true,
    "analisis.html": () => permissions.antrian?.["laporan-antrian"] === true,

    // Absensi
    "sistemAbsensi.html": () => permissions.absensi?.kehadiran === true,
    "pengajuan-izin.html": () => permissions.absensi?.["pengajuan-izin"] === true,
    "laporan-kehadiran.html": () => permissions.absensi?.["laporan-kehadiran"] === true,
    "laporan-izin.html": () => permissions.absensi?.["laporan-izin"] === true,
    "supervisor.html": () => false, // Super Admin only
    "tambah-pengguna.html": () => false, // Super Admin only

    // Servis
    "input-servis.html": () => permissions.servis?.["input-servis"] === true,
    "data-servis.html": () => permissions.servis?.["data-servis"] === true,
    "laporan-servis.html": () => permissions.servis?.["laporan-servis"] === true,

    // Promosi
    "promosi.html": () => permissions.promosi?.["setting-promosi"] === true,
    "promosi-display.html": () => permissions.promosi?.["display-promosi"] === true,
  };

  const checkFunction = pagePermissionMap[pageName];
  return checkFunction ? checkFunction() : false;
}

// Fungsi untuk melindungi halaman khusus admin
async function protectAdminPage() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  const adminAccess = await isAdmin();
  if (!adminAccess) {
    alert("Anda tidak memiliki akses ke halaman ini");
    window.location.href = "dashboard.html";
  }
}

// Fungsi untuk melindungi halaman khusus supervisor
async function protectSupervisorPage() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  if (!isSupervisor()) {
    alert("Akses ditolak. Halaman ini hanya untuk Supervisor.");
    window.location.href = "dashboard.html";
  }
}

// Fungsi untuk melindungi halaman umum (hanya perlu login)
async function protectPage() {
  await checkAuth();
}

// Fungsi untuk melindungi halaman dengan permission check
async function protectPageWithPermission() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  const currentPage = window.location.pathname.split("/").pop();
  const hasAccess = hasPageAccess(currentPage);

  if (!hasAccess) {
    alert("Anda tidak memiliki akses ke halaman ini");
    window.location.href = "dashboard.html";
  }
}

export { protectPage, protectAdminPage, protectSupervisorPage, protectPageWithPermission, isAdmin, isSupervisor };
