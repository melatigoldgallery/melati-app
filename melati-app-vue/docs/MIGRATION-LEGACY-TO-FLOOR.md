# Migration: Legacy Data → Floors/L1

**Status:** Analisis & Rencana (Menunggu Konfirmasi)

## 📋 Situasi Saat Ini

```
Firestore Structure:
├── order_online/          ← Data lama (legacy)
│   ├── {orderId}
│   └── items/
├── servis/                ← Data lama (legacy)
├── penjualanAksesoris/    ← Data lama (legacy)
├── ...
└── floors/
    ├── L1/
    │   ├── order_online/  ← Data baru (kosong?)
    │   ├── servis/        ← Data baru (kosong?)
    │   └── ...
    └── L2/
        ├── order_online/  ← Data baru (kosong?)
        └── ...
```

## ❌ Masalah yang Terjadi

1. **Data lama tidak terbaca** di sistem baru (`readWithFloorFallback` tidak bekerja optimal)
   - Mungkin karena error di floor read → fallback berjalan
   - Tapi fallback ke legacy → data lama terbaca, tapi tidak ter-mirror ke L1

2. **Data tidak ter-mirror ke L1** saat dibaca/diakses
   - `readWithFloorFallback` hanya READ, tidak WRITE ke floor-scoped path
   - Data lama tetap di legacy, tidak masuk L1

3. **Sistem bingung** mana yang source of truth
   - Legacy? Atau floors/L1?

## ✅ Solusi yang Dibutuhkan

Saya perlu tahu dari Anda:

### Pertanyaan 1: **Berapa banyak data lama yang perlu di-migrate?**

```
Estimasi jumlah dokumen per koleksi:
- order_online:          ? dokumen
- servis:                ? dokumen
- penjualanAksesoris:    ? dokumen
- stokAksesorisTransaksi: ? dokumen
- inventory:             ? dokumen
- antrian:               ? dokumen
- absensi/attendance:    ? dokumen
- settings:              ? dokumen
```

### Pertanyaan 2: **Setelah migration, apakah legacy path dihapus?**

- **Option A:** Migrate ke L1, HAPUS legacy path (cleanest)
- **Option B:** Migrate ke L1, KEEP legacy path sebagai backup (safer)
- **Option C:** Migrate ke L1, KEEP legacy path tapi hanya read dari L1 (fase transisi)

### Pertanyaan 3: **Untuk L2, bagaimana dengan data L2?**

- Apakah setiap floor punya data terpisah, atau L2 share data dari L1?
- Berdasarkan floor-config.js, L1 dan L2 punya role matrix berbeda
- Apakah staff L2 perlu akses data L1, atau isolated?

---

## 🔧 Rencana Technical (Pending Confirmation)

Berdasarkan analisis kode, saya sudah identifikasi:

### Collections yang perlu di-migrate:

```
✅ order_online
✅ servis
✅ penjualanAksesoris
✅ stokAksesorisTransaksi
✅ inventory
✅ antrian
✅ attendance
✅ absensi
✅ settings (multiple docs)
✅ employees
✅ employeeFaces
✅ leaveRequests
✅ latePermissionCodes
```

### Approach:

1. **Batch 1: Automated Migration**
   - Cloud Function untuk bulk copy legacy → floors/L1
   - Per koleksi dengan progress tracking
   - Estimated time: 5-15 menit tergantung volume

2. **Batch 2: Verification**
   - Cek data count: legacy vs floors/L1
   - Spot check sampel dokumen
   - Verify subcollections (items, etc.)

3. **Batch 3: Cutover**
   - Update security rules agar priority read dari L1
   - Optional: Delete legacy path (jika Option A)
   - Update code untuk remove fallback logic

---

## 📝 Info yang Saya Butuhkan Dari Anda

Agar bisa buat migration script yang tepat, silakan answer:

1. **Jumlah data per koleksi** (rough estimate OK, e.g., "order_online: ~500 docs")
2. **Migration strategy** (Option A/B/C di atas)
3. **Floor scope** (apakah data L1-only, atau L1+L2 terpisah?)
4. **Timing** (kapan ready untuk migration? prod hours atau off-peak?)

**⏸️ Tunggu konfirmasi sebelum execute migration.**
