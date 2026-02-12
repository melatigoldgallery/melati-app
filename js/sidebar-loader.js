// Load sidebar dan set active menu
async function initSidebar() {
  const sidebar = document.querySelector(".sidebar");

  try {
    const response = await fetch("components/sidebar.html");
    const html = await response.text();
    sidebar.innerHTML = html;

    // Filter menu based on user permissions
    await filterMenuByPermissions();

    // Set active menu berdasarkan halaman saat ini
    setActiveMenu();
  } catch (error) {
    console.error("Error loading sidebar:", error);
  }
}

// Filter menu based on user role and permissions
async function filterMenuByPermissions() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const isMobile = window.innerWidth < 768;

  // Supervisor: Full access - show everything
  if (currentUser.username === "supervisor" && currentUser.role === "admin") {
    showSettingMenu();
    showSupervisorSubmenu();
    return;
  }

  // Admin: Different behavior for mobile/desktop
  if (currentUser.role === "admin") {
    if (isMobile) {
      // Mobile: Servis only
      hideAllMenusExcept(["dashboard", "servis"]);
    } else {
      // Desktop: Show all menus first, then hide restricted ones
      showAllMenus();
      hideMenu("maintenance");
    }
    // Hide supervisor submenu (only for supervisor username)
    hideSupervisorSubmenu();
    // Hide Kelola Sales menu (only for supervisor username)
    hideKelolaSalesMenu();
    // Hide setting menu (only for Super Admin)
    const settingMenu = document.querySelector(".setting-menu");
    if (settingMenu) settingMenu.style.display = "none";
    return;
  }

  // Staff: Filter by permissions
  if (currentUser.role === "staf") {
    // Always hide supervisor submenu for staff
    hideSupervisorSubmenu();
    // Hide Kelola Sales menu for staff
    hideKelolaSalesMenu();
    // Hide setting menu for staff
    const settingMenu = document.querySelector(".setting-menu");
    if (settingMenu) settingMenu.style.display = "none";

    if (currentUser.permissions) {
      filterStaffMenus(currentUser.permissions);
    } else {
      hideAllMenusExcept(["dashboard"]);
    }
    return;
  }

  // Default: Only dashboard and hide supervisor submenu
  hideAllMenusExcept(["dashboard"]);
  hideSupervisorSubmenu();
  hideKelolaSalesMenu();
  const settingMenu = document.querySelector(".setting-menu");
  if (settingMenu) settingMenu.style.display = "none";
}

// Show setting menu
function showSettingMenu() {
  const settingMenu = document.querySelector(".setting-menu");
  if (settingMenu) {
    settingMenu.style.display = "block";
  }
}

// Show supervisor submenu
function showSupervisorSubmenu() {
  const supervisorToggle = document.querySelector(".supervisor-toggle");
  if (supervisorToggle) {
    supervisorToggle.closest(".nav-item").style.display = "block";
  }
}

// Hide supervisor submenu
function hideSupervisorSubmenu() {
  const supervisorToggle = document.querySelector(".supervisor-toggle");
  if (supervisorToggle) {
    supervisorToggle.closest(".nav-item").style.display = "none";
  }
}

// Hide Kelola Sales menu
function hideKelolaSalesMenu() {
  const kelolaSalesLink = document.querySelector('a[href="kelolaSales.html"]');
  if (kelolaSalesLink) {
    kelolaSalesLink.closest(".nav-item").style.display = "none";
  }
}

// Show specific menu
function showMenu(menuName) {
  const menuMap = {
    maintenance: 'a[href="maintenance.html"]',
    dashboard: 'a[href="dashboard.html"]',
    "inventory-barang": '[data-bs-target="#barangSubmenu"]',
    layanan: '[data-bs-target="#orderSubmenu"]',
    aksesoris: '[data-bs-target="#aksesorisSubmenu"]',
    antrian: '[data-bs-target="#antrianSubmenu"]',
    absensi: '[data-bs-target="#absensiSubmenu"]',
    servis: '[data-bs-target="#servisSubmenu"]',
    promosi: '[data-bs-target="#promosiSubmenu"]',
  };

  const selector = menuMap[menuName];
  if (selector) {
    const menuElement = document.querySelector(selector);
    if (menuElement) {
      menuElement.closest(".nav-item").style.display = "block";
    }
  }
}

// Hide specific menu
function hideMenu(menuName) {
  const menuMap = {
    maintenance: 'a[href="maintenance.html"]',
    dashboard: 'a[href="dashboard.html"]',
    "inventory-barang": '[data-bs-target="#barangSubmenu"]',
    layanan: '[data-bs-target="#orderSubmenu"]',
    aksesoris: '[data-bs-target="#aksesorisSubmenu"]',
    antrian: '[data-bs-target="#antrianSubmenu"]',
    absensi: '[data-bs-target="#absensiSubmenu"]',
    servis: '[data-bs-target="#servisSubmenu"]',
    promosi: '[data-bs-target="#promosiSubmenu"]',
  };

  const selector = menuMap[menuName];
  if (selector) {
    const menuElement = document.querySelector(selector);
    if (menuElement) {
      menuElement.closest(".nav-item").style.display = "none";
    }
  }
}

// Show all menus (except maintenance by default)
function showAllMenus() {
  const allMenus = ["dashboard", "inventory-barang", "layanan", "aksesoris", "antrian", "absensi", "servis", "promosi"];

  allMenus.forEach((menu) => {
    showMenu(menu);
  });
}

// Hide all menus except specified ones
function hideAllMenusExcept(keepMenus = []) {
  const allMenus = [
    "dashboard",
    "maintenance",
    "inventory-barang",
    "layanan",
    "aksesoris",
    "antrian",
    "absensi",
    "servis",
    "promosi",
  ];

  allMenus.forEach((menu) => {
    if (!keepMenus.includes(menu)) {
      hideMenu(menu);
    }
  });

  // Hide setting menu
  const settingMenu = document.querySelector(".setting-menu");
  if (settingMenu) {
    settingMenu.style.display = "none";
  }
}

// Filter staff menus based on permissions
function filterStaffMenus(permissions) {
  // Hide maintenance and setting (super admin only)
  hideMenu("maintenance");
  const settingMenu = document.querySelector(".setting-menu");
  if (settingMenu) settingMenu.style.display = "none";

  // Always hide supervisor submenu for staff
  hideSupervisorSubmenu();

  // Check each menu - updated keys match menu-structure.js
  const menuPermissionMap = {
    "inventory-barang": "inventory-barang",
    layanan: "layanan",
    aksesoris: "aksesoris",
    antrian: "antrian",
    absensi: "absensi",
    servis: "servis",
    promosi: "promosi",
  };

  Object.entries(menuPermissionMap).forEach(([menuName, permKey]) => {
    const perm = permissions[permKey];

    if (typeof perm === "boolean") {
      // Simple menu (no submenu)
      if (!perm) {
        hideMenu(menuName);
      }
    } else if (typeof perm === "object" && perm !== null) {
      // Menu with submenus
      const hasAnyAccess = Object.values(perm).some((val) => val === true);

      if (!hasAnyAccess) {
        // No access to any submenu, hide entire menu
        hideMenu(menuName);
      } else {
        // Has access to some submenus, filter them
        filterSubmenu(menuName, perm);
      }
    } else {
      // No permission defined, hide it
      hideMenu(menuName);
    }
  });
}

// Filter submenu items based on permissions
function filterSubmenu(menuName, submenuPermissions) {
  const submenuMap = {
    "inventory-barang": {
      container: "#barangSubmenu",
      items: {
        "manajemen-stok": 'a[href="manajemenStok.html"]',
        "laporan-stok-harian": 'a[href="laporanStokHarian.html"]',
        "mutasi-kode": 'a[href="mutasiKode.html"]',
        "restok-barang": 'a[href="restokBarang.html"]',
      },
    },
    layanan: {
      container: "#orderSubmenu",
      items: {
        "order-barang": 'a[href="order-barang.html"]',
      },
    },
    aksesoris: {
      container: "#aksesorisSubmenu",
      items: {
        "tambah-barang": 'a[href="tambahAksesoris.html"]',
        penjualan: 'a[href="penjualanAksesoris.html"]',
        return: 'a[href="return.html"]',
        "laporan-penjualan": 'a[href="laporanPenjualan.html"]',
        "laporan-stok": 'a[href="laporanStok.html"]',
      },
    },
    antrian: {
      container: "#antrianSubmenu",
      items: {
        "admin-antrian": 'a[href="admin-antrian.html"]',
        "display-antrian": 'a[href="display.html"]',
        "laporan-antrian": 'a[href="analisis.html"]',
      },
    },
    absensi: {
      container: "#absensiSubmenu",
      items: {
        kehadiran: 'a[href="sistemAbsensi.html"]',
        "pengajuan-izin": 'a[href="pengajuan-izin.html"]',
        "laporan-kehadiran": 'a[href="laporan-kehadiran.html"]',
        "laporan-izin": 'a[href="laporan-izin.html"]',
      },
    },
    servis: {
      container: "#servisSubmenu",
      items: {
        "input-servis": 'a[href="input-servis.html"]',
        "data-servis": 'a[href="data-servis.html"]',
        "laporan-servis": 'a[href="laporan-servis.html"]',
      },
    },
    promosi: {
      container: "#promosiSubmenu",
      items: {
        "setting-promosi": 'a[href="promosi.html"]',
        "display-promosi": 'a[href="promosi-display.html"]',
      },
    },
  };

  const config = submenuMap[menuName];
  if (!config) return;

  Object.entries(config.items).forEach(([permKey, selector]) => {
    const hasAccess = submenuPermissions[permKey] === true;
    if (!hasAccess) {
      const element = document.querySelector(selector);
      if (element) {
        element.closest(".nav-item").style.display = "none";
      }
    }
  });
}

// Set active menu berdasarkan current page
function setActiveMenu() {
  const currentPage = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll(".sidebar .nav-link");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    // Remove active dari semua link
    link.classList.remove("active");

    // Tambah active jika href sama dengan current page
    if (href === currentPage) {
      link.classList.add("active");

      // Expand parent collapse jika ada
      const parentCollapse = link.closest(".collapse");
      if (parentCollapse) {
        parentCollapse.classList.add("show");

        // Update parent toggle button
        const collapseId = parentCollapse.id;
        const parentToggle = document.querySelector(`[data-bs-target="#${collapseId}"]`);
        if (parentToggle) {
          parentToggle.classList.remove("collapsed");
          parentToggle.setAttribute("aria-expanded", "true");
        }
      }
    }
  });
}

// Auto init saat DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar);
} else {
  initSidebar();
}
