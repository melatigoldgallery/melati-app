// Struktur menu sidebar — digunakan oleh AppSidebar.vue
// roles: array role yang boleh melihat menu ini
const ALL = ["admin", "supervisor", "staff", "hrd", "admin_custom"];

export const menuStructure = [
  { label: "Dashboard", icon: "bi-house-door", to: "/dashboard", pageKey: "dashboard", roles: ALL },
  {
    label: "Absensi",
    icon: "bi-person-check",
    roles: ALL,
    children: [
      { label: "Kehadiran", to: "/absensi/kehadiran", pageKey: "absensi.kehadiran", roles: ALL },
      { label: "Pengajuan Izin", to: "/absensi/pengajuan-izin", pageKey: "absensi.pengajuan-izin", roles: ALL },
      {
        label: "Status Pengajuan",
        to: "/absensi/status-pengajuan",
        pageKey: "absensi.status-pengajuan",
        roles: ALL,
      },
      { label: "Manajemen Absensi", to: "/absensi/manajemen", pageKey: "absensi.manajemen", roles: ALL },
      {
        label: "Tambah Staff",
        to: "/absensi/tambah-staff",
        pageKey: "absensi.tambah-staff",
        roles: ALL,
      },
      {
        label: "Laporan Kehadiran",
        to: "/absensi/laporan-kehadiran",
        pageKey: "absensi.laporan-kehadiran",
        roles: ALL,
      },
      { label: "Laporan Izin", to: "/absensi/laporan-izin", pageKey: "absensi.laporan-izin", roles: ALL },
    ],
  },
  {
    label: "Antrian",
    icon: "bi-people",
    roles: ALL,
    children: [
      { label: "Admin Antrian", to: "/antrian/admin", pageKey: "antrian.admin", roles: ALL },
      { label: "Display Antrian", to: "/antrian/display", pageKey: "antrian.display", roles: ALL },
      { label: "Ambil Antrian", to: "/antrian/ambil", pageKey: "antrian.ambil", roles: ALL },
      { label: "Laporan Antrian", to: "/antrian/laporan", pageKey: "antrian.laporan", roles: ALL },
    ],
  },
  {
    label: "Servis",
    icon: "bi-tools",
    roles: ALL,
    children: [
      { label: "Input Servis", to: "/servis/input", pageKey: "servis.input", roles: ALL },
      { label: "Data Servis", to: "/servis/data", pageKey: "servis.data", roles: ALL },
      { label: "Laporan Servis", to: "/servis/laporan", pageKey: "servis.laporan", roles: ALL },
      { label: "Manajemen Servis", to: "/servis/manajemen", pageKey: "servis.manajemen", roles: ALL },
    ],
  },
  {
    label: "Order Online",
    icon: "bi-bag-check",
    roles: ALL,
    children: [
      { label: "Input Order", to: "/order-online/input", pageKey: "order-online.input", roles: ALL },
      { label: "Data Order", to: "/order-online/data", pageKey: "order-online.data", roles: ALL },
      {
        label: "Manajemen Order",
        to: "/order-online/manajemen",
        pageKey: "order-online.manajemen",
        roles: ALL,
      },
    ],
  },
  {
    label: "Aksesoris",
    icon: "bi-gem",
    roles: ALL,
    children: [
      { label: "Penjualan", to: "/aksesoris/penjualan", pageKey: "aksesoris.penjualan", roles: ALL },
      {
        label: "Data Penjualan",
        to: "/aksesoris/data-penjualan",
        pageKey: "aksesoris.data-penjualan",
        roles: ALL,
      },
      {
        label: "Laporan Penjualan",
        to: "/aksesoris/laporan-penjualan",
        pageKey: "aksesoris.laporan-penjualan",
        roles: ALL,
      },
      {
        label: "Tambah Barang",
        to: "/aksesoris/tambah-barang",
        pageKey: "aksesoris.tambah-barang",
        roles: ALL,
      },
      { label: "Return Barang", to: "/aksesoris/return", pageKey: "aksesoris.return", roles: ALL },
      {
        label: "Laporan Stok",
        to: "/aksesoris/laporan-stok",
        pageKey: "aksesoris.laporan-stok",
        roles: ALL,
      },
      {
        label: "Kelola Sales",
        to: "/aksesoris/kelola-sales",
        pageKey: "aksesoris.kelola-sales",
        roles: ALL,
      },
    ],
  },
  {
    label: "Inventory",
    icon: "bi-archive",
    roles: ALL,
    children: [
      {
        label: "Manajemen Stok",
        to: "/inventory/manajemen",
        pageKey: "inventory.manajemen",
        roles: ALL,
      },
      {
        label: "Laporan Harian",
        to: "/inventory/laporan-harian",
        pageKey: "inventory.laporan-harian",
        roles: ALL,
      },
      {
        label: "Mutasi Kode",
        to: "/inventory/mutasi-kode",
        pageKey: "inventory.mutasi-kode",
        roles: ALL,
      },
      { label: "Restok Barang", to: "/inventory/restok", pageKey: "inventory.restok", roles: ALL },
      { label: "Buyback", to: "/inventory/buyback", pageKey: "inventory.buyback", roles: ALL },
    ],
  },
  {
    label: "Promosi",
    icon: "bi-megaphone",
    roles: ALL,
    children: [{ label: "Setting Promosi", to: "/promosi/setting", pageKey: "promosi.setting", roles: ALL }],
  },
  {
    label: "Informasi Toko",
    icon: "bi-shop",
    roles: ALL,
    children: [
      { label: "Profil Toko", to: "/toko/profil", pageKey: "toko.profil", roles: ALL },
      { label: "SOP Operasional", to: "/toko/sop", pageKey: "toko.sop", roles: ALL },
      { label: "Informasi Operasional", to: "/toko/informasi-operasional", pageKey: "toko.layanan", roles: ALL },
    ],
  },
  {
    label: "Pengaturan",
    icon: "bi-gear",
    roles: ALL,
    children: [
      { label: "Kelola User", to: "/pengaturan/users", pageKey: "admin.users", roles: ALL },
      { label: "Kode Akses", to: "/pengaturan/access-codes", pageKey: "admin.access-codes", roles: ALL },
      { label: "Jam Absensi", to: "/pengaturan/jam-absensi", pageKey: "admin.jam-absensi", roles: ALL },
      {
        label: "Setting Antrian",
        to: "/pengaturan/antrian-penutupan",
        pageKey: "admin.antrian-closing",
        roles: ALL,
      },
      {
        label: "Tema Warna",
        to: "/pengaturan/tema-warna",
        pageKey: "admin.theme-appearance",
        roles: ALL,
      },
      {
        label: "Maintenance",
        to: "/pengaturan/maintenance",
        pageKey: "admin.maintenance",
        roles: ALL,
      },
      {
        label: "Setting Inventory",
        to: "/pengaturan/manajemen-stok",
        pageKey: "admin.inventory-manajemen-stok",
        roles: ALL,
      },
      {
        label: "Setting Printer",
        to: "/pengaturan/printer",
        pageKey: "admin.printer",
        roles: ALL,
      },
    ],
  },
];
