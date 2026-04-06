// Struktur menu sidebar — digunakan oleh AppSidebar.vue
// roles: array role yang boleh melihat menu ini
export const menuStructure = [
  {
    label: "Dashboard",
    icon: "bi-house-door",
    to: "/dashboard",
    roles: ["admin", "supervisor", "staf", "admin_custom"],
  },
  {
    label: "Absensi",
    icon: "bi-person-check",
    roles: ["admin", "supervisor", "staf"],
    children: [
      { label: "Kehadiran", to: "/absensi/kehadiran", roles: ["admin", "supervisor", "staf"] },
      { label: "Pengajuan Izin", to: "/absensi/pengajuan-izin", roles: ["admin", "supervisor", "staf"] },
      { label: "Laporan Kehadiran", to: "/absensi/laporan-kehadiran", roles: ["admin", "supervisor"] },
      { label: "Laporan Izin", to: "/absensi/laporan-izin", roles: ["admin", "supervisor"] },
      { label: "Supervisor", to: "/absensi/supervisor", roles: ["admin", "supervisor"] },
      { label: "Tambah Pengguna", to: "/absensi/tambah-pengguna", roles: ["admin"] },
    ],
  },
  {
    label: "Antrian",
    icon: "bi-people",
    roles: ["admin", "supervisor", "staf"],
    children: [
      { label: "Admin Antrian", to: "/antrian/admin", roles: ["admin", "supervisor", "staf"] },
      { label: "Laporan Antrian", to: "/antrian/laporan", roles: ["admin", "supervisor"] },
    ],
  },
  {
    label: "Servis",
    icon: "bi-tools",
    roles: ["admin", "supervisor", "staf", "admin_custom"],
    children: [
      { label: "Input Servis", to: "/servis/input", roles: ["admin", "supervisor", "staf", "admin_custom"] },
      { label: "Data Servis", to: "/servis/data", roles: ["admin", "supervisor", "staf", "admin_custom"] },
      { label: "Laporan Servis", to: "/servis/laporan", roles: ["admin", "supervisor"] },
    ],
  },
  {
    label: "Aksesoris",
    icon: "bi-gem",
    roles: ["admin", "supervisor", "staf", "admin_custom"],
    children: [
      { label: "Penjualan", to: "/aksesoris/penjualan", roles: ["admin", "supervisor", "staf", "admin_custom"] },
      {
        label: "Data Penjualan",
        to: "/aksesoris/data-penjualan",
        roles: ["admin", "supervisor", "staf", "admin_custom"],
      },
      { label: "Laporan Penjualan", to: "/aksesoris/laporan-penjualan", roles: ["admin", "supervisor"] },
      { label: "Tambah Barang", to: "/aksesoris/tambah-barang", roles: ["admin"] },
      { label: "Return Barang", to: "/aksesoris/return", roles: ["admin", "supervisor"] },
      { label: "Laporan Stok", to: "/aksesoris/laporan-stok", roles: ["admin", "supervisor"] },
      { label: "Kelola Sales", to: "/aksesoris/kelola-sales", roles: ["admin"] },
    ],
  },
  {
    label: "Inventory",
    icon: "bi-archive",
    roles: ["admin", "supervisor"],
    children: [
      { label: "Manajemen Stok", to: "/inventory/manajemen", roles: ["admin", "supervisor"] },
      { label: "Laporan Harian", to: "/inventory/laporan-harian", roles: ["admin", "supervisor"] },
      { label: "Mutasi Kode", to: "/inventory/mutasi-kode", roles: ["admin"] },
      { label: "Restok Barang", to: "/inventory/restok", roles: ["admin", "supervisor"] },
      { label: "Buyback", to: "/inventory/buyback", roles: ["admin", "supervisor"] },
    ],
  },
  {
    label: "Promosi",
    icon: "bi-megaphone",
    roles: ["admin"],
    children: [{ label: "Setting Promosi", to: "/promosi/setting", roles: ["admin"] }],
  },
  {
    label: "Admin",
    icon: "bi-gear",
    roles: ["admin"],
    children: [
      { label: "Kelola User", to: "/admin/users", roles: ["admin"] },
      { label: "Kode Akses", to: "/admin/access-codes", roles: ["admin"] },
      { label: "Jam Absensi", to: "/admin/jam-absensi", roles: ["admin"] },
    ],
  },
];
