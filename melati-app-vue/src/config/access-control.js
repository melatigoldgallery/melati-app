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
      { key: "absensi.supervisor", label: "Supervisor", route: "/absensi/supervisor" },
      { key: "absensi.tambah-pengguna", label: "Tambah Pengguna", route: "/absensi/tambah-pengguna" },
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
        key: "admin.maintenance",
        label: "Maintenance",
        route: "/pengaturan/maintenance",
      },
    ],
  },
];

export const PAGE_ACCESS_KEYS = PAGE_ACCESS_SECTIONS.flatMap((section) => section.pages.map((page) => page.key));

const SENSITIVE_PAGE_KEYS = new Set([
  "absensi.supervisor",
  "absensi.tambah-pengguna",
  "admin.users",
  "admin.access-codes",
  "admin.jam-absensi",
  "admin.antrian-closing",
  "admin.maintenance",
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
  "absensi.supervisor": "absensi.supervisor",
  "absensi.tambah-pengguna": "absensi.tambah-pengguna",
  "servis.input-servis": "servis.input",
  "servis.data-servis": "servis.data",
  "servis.laporan-servis": "servis.laporan",
  "promosi.setting-promosi": "promosi.setting",
  "admin.kelola-user": "admin.users",
  "admin.kode-akses": "admin.access-codes",
  "admin.jam-absensi": "admin.jam-absensi",
  "admin.antrian-penutupan": "admin.antrian-closing",
  "admin.maintenance": "admin.maintenance",
};

export function getDefaultPageAccess(pageKey, role = "staf") {
  if (role === "supervisor") return true;
  if (
    role === "admin" &&
    (pageKey === "admin.access-codes" || pageKey === "admin.antrian-closing" || pageKey === "admin.maintenance")
  ) {
    return true;
  }
  if (SENSITIVE_PAGE_KEYS.has(pageKey)) return false;
  return true;
}

export function createDefaultAccessMap(role = "staf") {
  const map = {};
  PAGE_ACCESS_KEYS.forEach((key) => {
    map[key] = getDefaultPageAccess(key, role);
  });
  return map;
}

export function normalizeAccessMap(inputMap, role = "staf") {
  const map = createDefaultAccessMap(role);
  if (!inputMap || typeof inputMap !== "object") return map;

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

export function buildUserAccessMap(userData, role = "staf") {
  const normalizedPages = normalizeAccessMap(userData?.pagesAccess, role);
  const hasExplicitPages = userData?.pagesAccess && typeof userData.pagesAccess === "object";
  if (hasExplicitPages) return normalizedPages;

  const legacyMapped = mapLegacyPermissions(userData?.permissions);
  return normalizeAccessMap({ ...normalizedPages, ...legacyMapped }, role);
}
