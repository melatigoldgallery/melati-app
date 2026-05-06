export const PAGE_ACCESS_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    pages: [{ key: "dashboard", label: "Dashboard", route: "/dashboard" }],
  },
  {
    key: "absensi",
    label: "Absensi",
    pages: [
      { key: "absensi.kehadiran", label: "Kehadiran", route: "/absensi/kehadiran" },
      { key: "absensi.pengajuan-izin", label: "Pengajuan Izin", route: "/absensi/pengajuan-izin" },
      { key: "absensi.laporan-kehadiran", label: "Laporan Kehadiran", route: "/absensi/laporan-kehadiran" },
      { key: "absensi.laporan-izin", label: "Laporan Izin", route: "/absensi/laporan-izin" },
      { key: "absensi.status-pengajuan", label: "Status Pengajuan", route: "/absensi/status-pengajuan" },
      { key: "absensi.manajemen", label: "Manajemen Absensi", route: "/absensi/manajemen" },
      { key: "absensi.tambah-staff", label: "Tambah Staff", route: "/absensi/tambah-staff" },
    ],
  },
  {
    key: "antrian",
    label: "Antrian",
    pages: [
      { key: "antrian.admin", label: "Admin Antrian", route: "/antrian/admin" },
      { key: "antrian.display", label: "Display Antrian", route: "/antrian/display" },
      { key: "antrian.laporan", label: "Laporan Antrian", route: "/antrian/laporan" },
    ],
  },
  {
    key: "servis",
    label: "Servis",
    pages: [
      { key: "servis.input", label: "Input Servis", route: "/servis/input" },
      { key: "servis.data", label: "Data Servis", route: "/servis/data" },
      { key: "servis.laporan", label: "Laporan Servis", route: "/servis/laporan" },
      { key: "servis.manajemen", label: "Manajemen Servis", route: "/servis/manajemen" },
    ],
  },
  {
    key: "order-online",
    label: "Order Online",
    pages: [
      { key: "order-online.input", label: "Input Order", route: "/order-online/input" },
      { key: "order-online.data", label: "Data Order", route: "/order-online/data" },
      { key: "order-online.manajemen", label: "Manajemen Order", route: "/order-online/manajemen" },
    ],
  },
  {
    key: "aksesoris",
    label: "Aksesoris",
    pages: [
      { key: "aksesoris.penjualan", label: "Penjualan", route: "/aksesoris/penjualan" },
      { key: "aksesoris.data-penjualan", label: "Data Penjualan", route: "/aksesoris/data-penjualan" },
      {
        key: "aksesoris.laporan-penjualan",
        label: "Laporan Penjualan",
        route: "/aksesoris/laporan-penjualan",
      },
      { key: "aksesoris.tambah-barang", label: "Tambah Barang", route: "/aksesoris/tambah-barang" },
      { key: "aksesoris.return", label: "Return Barang", route: "/aksesoris/return" },
      { key: "aksesoris.laporan-stok", label: "Laporan Stok", route: "/aksesoris/laporan-stok" },
      { key: "aksesoris.kelola-sales", label: "Kelola Sales", route: "/aksesoris/kelola-sales" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    pages: [
      { key: "inventory.manajemen", label: "Manajemen Stok", route: "/inventory/manajemen" },
      { key: "inventory.laporan-harian", label: "Laporan Harian", route: "/inventory/laporan-harian" },
      { key: "inventory.mutasi-kode", label: "Mutasi Kode", route: "/inventory/mutasi-kode" },
      { key: "inventory.restok", label: "Restok Barang", route: "/inventory/restok" },
      { key: "inventory.buyback", label: "Buyback", route: "/inventory/buyback" },
    ],
  },
  {
    key: "promosi",
    label: "Promosi",
    pages: [{ key: "promosi.setting", label: "Setting Promosi", route: "/promosi/setting" }],
  },
  {
    key: "admin",
    label: "Pengaturan",
    pages: [
      { key: "admin.users", label: "Kelola User", route: "/pengaturan/users" },
      { key: "admin.access-codes", label: "Kode Akses", route: "/pengaturan/access-codes" },
      { key: "admin.jam-absensi", label: "Jam Absensi", route: "/pengaturan/jam-absensi" },
      {
        key: "admin.antrian-closing",
        label: "Setting Antrian",
        route: "/pengaturan/antrian-penutupan",
      },
      {
        key: "admin.theme-appearance",
        label: "Tema Warna",
        route: "/pengaturan/tema-warna",
      },
      {
        key: "admin.maintenance",
        label: "Maintenance",
        route: "/pengaturan/maintenance",
      },
      {
        key: "admin.inventory-manajemen-stok",
        label: "Setting Manajemen Stok",
        route: "/pengaturan/manajemen-stok",
      },
    ],
  },
];

export const PAGE_ACCESS_KEYS = PAGE_ACCESS_SECTIONS.flatMap((section) => section.pages.map((page) => page.key));

const KNOWN_USER_ROLES = new Set(["admin", "supervisor", "staff", "hrd", "admin_custom"]);

export function normalizeUserRole(role, fallback = "staff") {
  const raw = String(role || "")
    .trim()
    .toLowerCase();
  const normalizedFallback =
    fallback === null || fallback === undefined ? "staff" : String(fallback).trim().toLowerCase();

  if (!raw) return normalizedFallback;
  if (raw === "staf") return "staff";
  if (raw === "hr") return "hrd";
  if (KNOWN_USER_ROLES.has(raw)) return raw;
  return normalizedFallback;
}

const SENSITIVE_PAGE_KEYS = new Set([
  "absensi.status-pengajuan",
  "absensi.manajemen",
  "absensi.tambah-staff",
  "admin.users",
  "admin.access-codes",
  "admin.jam-absensi",
  "admin.antrian-closing",
  "admin.theme-appearance",
  "admin.maintenance",
  "admin.inventory-manajemen-stok",
]);

const LEGACY_PERMISSION_TO_PAGE = {
  "inventory-barang.manajemen-stok": "inventory.manajemen",
  "inventory-barang.laporan-stok-harian": "inventory.laporan-harian",
  "inventory-barang.mutasi-kode": "inventory.mutasi-kode",
  "inventory-barang.restok-barang": "inventory.restok",
  "inventory-barang.buyback": "inventory.buyback",
  "aksesoris.tambah-barang": "aksesoris.tambah-barang",
  "aksesoris.data-penjualan": "aksesoris.data-penjualan",
  "aksesoris.penjualan": "aksesoris.penjualan",
  "aksesoris.return": "aksesoris.return",
  "aksesoris.kelola-sales": "aksesoris.kelola-sales",
  "aksesoris.laporan-penjualan": "aksesoris.laporan-penjualan",
  "aksesoris.laporan-stok": "aksesoris.laporan-stok",
  "antrian.admin-antrian": "antrian.admin",
  "antrian.display-antrian": "antrian.display",
  "antrian.laporan-antrian": "antrian.laporan",
  "absensi.kehadiran": "absensi.kehadiran",
  "absensi.pengajuan-izin": "absensi.pengajuan-izin",
  "absensi.laporan-kehadiran": "absensi.laporan-kehadiran",
  "absensi.laporan-izin": "absensi.laporan-izin",
  "absensi.supervisor": "absensi.status-pengajuan",
  "absensi.status-pengajuan": "absensi.status-pengajuan",
  "absensi.manajemen": "absensi.manajemen",
  "absensi.tambah-pengguna": "absensi.tambah-staff",
  "absensi.tambah-staff": "absensi.tambah-staff",
  "servis.input-servis": "servis.input",
  "servis.data-servis": "servis.data",
  "servis.laporan-servis": "servis.laporan",
  "servis.manajemen-servis": "servis.manajemen",
  "servis.manajemen": "servis.manajemen",
  "order-online.input-order": "order-online.input",
  "order-online.data-order": "order-online.data",
  "order-online.manajemen-order": "order-online.manajemen",
  "order-online.laporan-order": "order-online.manajemen",
  "order-online.laporan": "order-online.manajemen",
  "promosi.setting-promosi": "promosi.setting",
  "admin.kelola-user": "admin.users",
  "admin.kode-akses": "admin.access-codes",
  "admin.jam-absensi": "admin.jam-absensi",
  "admin.antrian-penutupan": "admin.antrian-closing",
  "admin.tema-warna": "admin.theme-appearance",
  "admin.theme-appearance": "admin.theme-appearance",
  "admin.maintenance": "admin.maintenance",
  "admin.setting-manajemen-stok": "admin.inventory-manajemen-stok",
  "admin.inventory-manajemen-stok": "admin.inventory-manajemen-stok",
};

export function getDefaultPageAccess(pageKey, role = "staff") {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (normalizedRole === "supervisor") return true;
  if (SENSITIVE_PAGE_KEYS.has(pageKey)) return false;
  return true;
}

export function createDefaultAccessMap(role = "staff") {
  const normalizedRole = normalizeUserRole(role, "staff");
  const map = {};
  PAGE_ACCESS_KEYS.forEach((key) => {
    map[key] = getDefaultPageAccess(key, normalizedRole);
  });
  return map;
}

export function normalizeAccessMap(inputMap, role = "staff") {
  const normalizedRole = normalizeUserRole(role, "staff");
  const map = createDefaultAccessMap(normalizedRole);
  if (!inputMap || typeof inputMap !== "object") return map;

  // Migrate legacy page keys when old access maps are loaded from Firestore.
  Object.entries(LEGACY_PERMISSION_TO_PAGE).forEach(([legacyKey, mappedKey]) => {
    if (typeof inputMap[legacyKey] === "boolean" && PAGE_ACCESS_KEYS.includes(mappedKey)) {
      map[mappedKey] = inputMap[legacyKey];
    }
  });

  PAGE_ACCESS_KEYS.forEach((key) => {
    if (typeof inputMap[key] === "boolean") map[key] = inputMap[key];
  });
  return map;
}

export function mapLegacyPermissions(legacyPermissions) {
  if (!legacyPermissions || typeof legacyPermissions !== "object") return {};

  const mapped = {};
  Object.entries(legacyPermissions).forEach(([group, perms]) => {
    if (!perms || typeof perms !== "object") return;
    Object.entries(perms).forEach(([permKey, value]) => {
      const mappedKey = LEGACY_PERMISSION_TO_PAGE[`${group}.${permKey}`];
      if (mappedKey) mapped[mappedKey] = !!value;
    });
  });
  return mapped;
}

export function buildUserAccessMap(userData, role = "staff") {
  const normalizedRole = normalizeUserRole(role, "staff");
  const normalizedPages = normalizeAccessMap(userData?.pagesAccess, normalizedRole);
  const hasExplicitPages = userData?.pagesAccess && typeof userData.pagesAccess === "object";
  if (hasExplicitPages) return normalizedPages;

  const legacyMapped = mapLegacyPermissions(userData?.permissions);
  return normalizeAccessMap({ ...normalizedPages, ...legacyMapped }, normalizedRole);
}
