import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";

export const MAINTENANCE_COLLECTIONS = [
  {
    key: "attendance",
    label: "attendance",
    description: "Data kehadiran karyawan.",
    deletable: true,
  },
  {
    key: "dailystocksnapshot",
    label: "dailyStockSnapshot",
    description: "Snapshot stok harian.",
    deletable: true,
  },
  {
    key: "dailystocklogs",
    label: "daily_stock_logs",
    description: "Log perubahan stok harian.",
    deletable: true,
  },
  {
    key: "dailystockreports",
    label: "daily_stock_reports",
    description: "Ringkasan laporan stok harian.",
    deletable: true,
  },
  {
    key: "leaverequests",
    label: "leaveRequests",
    description: "Data pengajuan izin.",
    deletable: true,
  },
  {
    key: "penjualanaksesoris",
    label: "penjualanAksesoris",
    description: "Transaksi penjualan aksesoris.",
    deletable: true,
  },
  {
    key: "servis",
    label: "servis",
    description: "Data transaksi servis.",
    deletable: true,
  },
  {
    key: "stocks",
    label: "stocks",
    description: "Master stok aktif (monitor only).",
    deletable: false,
    reason: "Master stok aktif. Hapus periodik tidak diizinkan.",
  },
  {
    key: "stokaksesoristransaksi",
    label: "stokAksesorisTransaksi",
    description: "Log transaksi keluar/masuk stok aksesoris.",
    deletable: true,
  },
];

export function getDefaultMaintenanceSelection() {
  return MAINTENANCE_COLLECTIONS.filter((item) => item.deletable).map((item) => item.key);
}

async function callMaintenance(payload) {
  const callable = httpsCallable(functions, "maintenanceMonthlyCleanup");
  const res = await callable(payload);
  return res?.data || {};
}

export async function maintenanceDryRun(month, collections, floorId) {
  return callMaintenance({ action: "dryRun", month, collections, floorId });
}

export async function maintenanceExecute(month, collections, floorId) {
  return callMaintenance({ action: "execute", month, collections, floorId });
}
