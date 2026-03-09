/**
 * Menu Structure Configuration
 * Centralized menu definition untuk filtering permissions
 */

export const MENU_STRUCTURE = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "fas fa-home",
    page: "dashboard.html",
    hasSubmenu: false,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: "fas fa-wrench",
    page: "maintenance.html",
    hasSubmenu: false,
    superAdminOnly: true,
  },
  {
    id: "inventory-barang",
    label: "Inventory Barang",
    icon: "fas fa-cubes",
    hasSubmenu: true,
    submenu: [
      {
        id: "manajemen-stok",
        label: "Manajemen Stok",
        page: "manajemenStok.html",
      },
      {
        id: "laporan-stok-harian",
        label: "Laporan Stok Harian",
        page: "laporanStokHarian.html",
      },
      {
        id: "mutasi-kode",
        label: "Mutasi Kode",
        page: "mutasiKode.html",
      },
      {
        id: "restok-barang",
        label: "Restok Barang",
        page: "restokBarang.html",
      },
    ],
  },
  {
    id: "layanan",
    label: "Layanan",
    icon: "fas fa-concierge-bell",
    hasSubmenu: true,
    submenu: [
      {
        id: "order-barang",
        label: "Order Barang",
        page: "order-barang.html",
      },
    ],
  },
  {
    id: "aksesoris",
    label: "Aksesoris",
    icon: "fas fa-gem",
    hasSubmenu: true,
    submenu: [
      {
        id: "tambah-barang",
        label: "Tambah Barang",
        page: "tambahAksesoris.html",
      },
      {
        id: "penjualan",
        label: "Penjualan",
        page: "penjualanAksesoris.html",
      },
      {
        id: "return",
        label: "Return",
        page: "return.html",
      },
      {
        id: "laporan-penjualan",
        label: "Laporan Penjualan",
        page: "laporanPenjualan.html",
      },
      {
        id: "laporan-stok",
        label: "Laporan Stok",
        page: "laporanStok.html",
      },
    ],
  },
  {
    id: "antrian",
    label: "Antrian",
    icon: "fas fa-users-line",
    hasSubmenu: true,
    submenu: [
      {
        id: "admin-antrian",
        label: "Admin Antrian",
        page: "admin-antrian.html",
      },
      {
        id: "display-antrian",
        label: "Display Antrian",
        page: "display.html",
      },
      {
        id: "laporan-antrian",
        label: "Laporan Antrian",
        page: "analisis.html",
      },
    ],
  },
  {
    id: "absensi",
    label: "Absensi",
    icon: "fas fa-clipboard-check",
    hasSubmenu: true,
    submenu: [
      {
        id: "kehadiran",
        label: "Kehadiran",
        page: "sistemAbsensi.html",
      },
      {
        id: "pengajuan-izin",
        label: "Pengajuan Izin",
        page: "pengajuan-izin.html",
      },
      {
        id: "laporan-kehadiran",
        label: "Laporan Kehadiran",
        page: "laporan-kehadiran.html",
      },
      {
        id: "laporan-izin",
        label: "Laporan Izin",
        page: "laporan-izin.html",
      },
      {
        id: "supervisor",
        label: "👑 Supervisor",
        hasSubmenu: true,
        superAdminOnly: true,
        submenu: [
          {
            id: "status-pengajuan-izin",
            label: "Status Pengajuan Izin",
            page: "supervisor.html",
          },
          {
            id: "tambah-pengguna",
            label: "Tambah Pengguna",
            page: "tambah-pengguna.html",
          },
        ],
      },
    ],
  },
  {
    id: "servis",
    label: "Servis",
    icon: "fas fa-tools",
    hasSubmenu: true,
    submenu: [
      {
        id: "input-servis",
        label: "Input Servis",
        page: "input-servis.html",
      },
      {
        id: "data-servis",
        label: "Data Servis",
        page: "data-servis.html",
      },
      {
        id: "laporan-servis",
        label: "Laporan Servis",
        page: "laporan-servis.html",
      },
    ],
  },
  {
    id: "promosi",
    label: "Promosi",
    icon: "fas fa-bullhorn",
    hasSubmenu: true,
    submenu: [
      {
        id: "setting-promosi",
        label: "Setting Promosi",
        page: "promosi.html",
      },
      {
        id: "display-promosi",
        label: "Display Promosi",
        page: "promosi-display.html",
      },
    ],
  },
  {
    id: "setting",
    label: "Setting",
    icon: "fas fa-cogs",
    hasSubmenu: true,
    superAdminOnly: true,
    submenu: [
      {
        id: "kelola-user",
        label: "Kelola User",
        page: "kelola-user.html",
      },
      {
        id: "jam-absensi",
        label: "Jam Absensi",
        page: "jam-absensi.html",
      },
    ],
  },
];

/**
 * Get default permissions based on role
 */
export function getDefaultPermissions(role) {
  if (role === "admin") {
    // Admin tidak perlu permissions - hardcoded
    return null;
  }

  if (role === "staf") {
    // Default: staff hanya akses dashboard
    const permissions = { dashboard: true };

    MENU_STRUCTURE.forEach((menu) => {
      if (menu.id !== "dashboard" && !menu.superAdminOnly) {
        if (menu.hasSubmenu) {
          permissions[menu.id] = {};
          menu.submenu.forEach((sub) => {
            if (!sub.superAdminOnly) {
              if (sub.hasSubmenu) {
                // Nested submenu (supervisor dalam absensi)
                permissions[menu.id][sub.id] = {};
                sub.submenu.forEach((nested) => {
                  permissions[menu.id][sub.id][nested.id] = false;
                });
              } else {
                permissions[menu.id][sub.id] = false;
              }
            }
          });
        } else {
          permissions[menu.id] = false;
        }
      }
    });

    return permissions;
  }

  return null;
}

/**
 * Check if user has access to a specific menu/page
 */
export function hasAccess(user, menuId, submenuId = null) {
  // Super Admin (username = supervisor) has full access
  if (user.username === "supervisor") {
    return true;
  }

  // Admin check - hardcoded filtering
  if (user.role === "admin") {
    // Block maintenance
    if (menuId === "maintenance") return false;
    // Block setting
    if (menuId === "setting") return false;
    // Block supervisor submenu
    if (menuId === "absensi" && submenuId === "supervisor") return false;
    return true;
  }

  // Staff check permissions
  if (user.role === "staf" && user.permissions) {
    if (submenuId) {
      return user.permissions[menuId]?.[submenuId] === true;
    }
    return user.permissions[menuId] === true;
  }

  return false;
}

/**
 * Get filtered menu structure for user
 */
export function getFilteredMenus(user, isMobile = false) {
  // Super Admin (username = supervisor) gets all menus
  if (user.username === "supervisor") {
    return MENU_STRUCTURE;
  }

  // Admin: hardcoded filtering
  if (user.role === "admin") {
    // Mobile: servis only
    if (isMobile) {
      return MENU_STRUCTURE.filter((menu) => menu.id === "servis" || menu.id === "dashboard");
    }

    // Desktop: all except maintenance, supervisor submenu, setting
    return MENU_STRUCTURE.filter((menu) => {
      if (menu.superAdminOnly) return false; // Filter maintenance & setting
      return true;
    }).map((menu) => {
      if (menu.id === "absensi") {
        return {
          ...menu,
          submenu: menu.submenu.filter((sub) => !sub.superAdminOnly),
        };
      }
      return menu;
    });
  }

  // Staff: filter by permissions
  if (user.role === "staf" && user.permissions) {
    return MENU_STRUCTURE.filter((menu) => {
      if (menu.superAdminOnly) return false;
      if (menu.id === "dashboard") return true;

      if (menu.hasSubmenu) {
        const accessibleSubmenus = menu.submenu.filter((sub) => {
          if (sub.superAdminOnly) return false;
          return user.permissions[menu.id]?.[sub.id] === true;
        });
        return accessibleSubmenus.length > 0;
      }

      return user.permissions[menu.id] === true;
    }).map((menu) => {
      if (menu.hasSubmenu) {
        return {
          ...menu,
          submenu: menu.submenu.filter((sub) => !sub.superAdminOnly && user.permissions[menu.id]?.[sub.id] === true),
        };
      }
      return menu;
    });
  }

  // Default: only dashboard
  return [MENU_STRUCTURE[0]];
}
