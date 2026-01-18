# 🔐 Panduan Permission Management System

## Struktur Role

### 1️⃣ **Super Admin** (username: `supervisor`)

- ✅ Full access ke **semua menu** (Desktop & Mobile)
- ✅ Dapat mengelola user di "Kelola User"
- 🔒 Protected account (tidak bisa diedit/hapus)
- 🛡️ Akses ke Maintenance & Setting

### 2️⃣ **Admin** (role: `admin`)

**Desktop:**

- ✅ Akses ke semua menu KECUALI:
  - ❌ Maintenance
  - ❌ Supervisor submenu (Absensi)
  - ❌ Setting (Kelola User & Jam Absensi)
- ⚡ Hardcoded - tidak perlu setup permissions

**Mobile:**

- ✅ Hanya menu **Servis** (Input Servis, Data Servis, Laporan Servis)
- ⚡ Auto-switch berdasarkan lebar layar (< 768px)

### 3️⃣ **Staff** (role: `staf`)

- 🎯 **Custom permissions** per user
- ⚙️ Diatur menggunakan toggle di halaman "Kelola User"
- 📋 Setiap staff bisa punya akses berbeda-beda

## Cara Mengatur Permissions Staff

### 1. Login sebagai Supervisor

```
Username: supervisor
Password: [password supervisor]
```

### 2. Buka Menu Setting > Kelola User

Path: Dashboard → Setting → Kelola User

### 3. Tambah atau Edit Staff

#### **Tambah Staff Baru:**

1. Klik tombol **"Tambah User"**
2. Isi:
   - Username (minimal 3 karakter, tanpa spasi)
   - Display Name (nama tampilan)
   - Role: Pilih **"Staff (Custom Permissions)"**
3. Akan muncul **Menu Permissions** section
4. Toggle menu yang ingin diakses staff

#### **Edit Permissions Staff Existing:**

1. Klik tombol **Edit** (ikon pensil) pada user staff
2. Scroll ke section **"⚙️ Menu Permissions"**
3. Toggle menu sesuai kebutuhan

### 4. Setting Toggle Permissions

**Struktur Toggle:**

```
☑️ Dashboard (selalu aktif)

☑️ Sistem Absensi (2/5 submenu aktif)
  ☑️ Pengajuan Izin
  ☑️ Laporan Izin
  ☐ Laporan Kehadiran
  ☐ Jam Absensi

☐ Servis
☐ Penjualan
☐ Stok
☐ Promosi & Display
```

**Tombol Quick Action:**

- **All**: Aktifkan semua menu
- **None**: Nonaktifkan semua menu

### 5. Simpan User

Klik tombol **"Simpan"** untuk menyimpan perubahan.

## Contoh Konfigurasi

### Contoh 1: Staff Absensi (Melati)

```
Role: Staff
Permissions:
  ✅ Dashboard
  ✅ Absensi
    ✅ Pengajuan Izin
    ✅ Laporan Izin
  ❌ Inventory Barang
  ❌ Layanan
  ❌ Aksesoris
  ❌ Antrian
  ❌ Servis
  ❌ Promosi
```

### Contoh 2: Staff Servis

```
Role: Staff
Permissions:
  ✅ Dashboard
  ❌ Inventory Barang
  ❌ Layanan
  ❌ Aksesoris
  ❌ Antrian
  ❌ Absensi
  ✅ Servis
    ✅ Input Servis
    ✅ Data Servis
    ✅ Laporan Servis
  ❌ Promosi
```

### Contoh 3: Staff Kasir (Aksesoris)

```
Role: Staff
Permissions:
  ✅ Dashboard
  ❌ Inventory Barang
  ❌ Layanan
  ✅ Aksesoris
    ✅ Penjualan
    ✅ Laporan Penjualan
  ❌ Antrian
  ❌ Absensi
  ❌ Servis
  ❌ Promosi
```

## Menu yang Tersedia

### 📊 Dashboard

- Selalu accessible untuk semua user

### � Maintenance (Super Admin only)

- Maintenance system

### 📦 Inventory Barang

Submenu:

- Manajemen Stok
- Laporan Stok Harian
- Mutasi Kode
- Restok Barang

### 🛠️ Layanan

Submenu:

- Order Barang

### 💎 Aksesoris

Submenu:

- Tambah Barang
- Penjualan
- Return
- Laporan Penjualan
- Laporan Stok

### 🎯 Antrian

Submenu:

- Admin Antrian
- Display Antrian
- Laporan Antrian

### 👥 Absensi

Submenu:

- Kehadiran
- Pengajuan Izin
- Laporan Kehadiran
- Laporan Izin
- 👑 Supervisor (Super Admin only)
  - Status Pengajuan Izin
  - Tambah Pengguna

### 🛠️ Servis

Submenu:

- Input Servis
- Data Servis
- Laporan Servis

### 📢 Promosi

Submenu:

- Setting Promosi
- Display Promosi

### ⚙️ Setting (Super Admin only)

Submenu:

- Kelola User
- Jam Absensi

## Keamanan & Proteksi

### Page Protection

Setiap halaman dilindungi dengan:

1. **Authentication Check**: User harus login
2. **Role Check**: Validasi role user
3. **Permission Check**: Validasi akses menu (untuk staff)

### Auto Redirect

Jika user mencoba akses halaman tanpa permission:

- ⚠️ Alert: "Anda tidak memiliki akses ke halaman ini"
- 🔄 Redirect ke Dashboard

### Sidebar Filtering

Menu di sidebar secara otomatis difilter:

- ✅ Hanya tampil menu yang boleh diakses
- 🚫 Menu yang tidak bisa diakses di-hide
- 📱 Mobile detection untuk admin (servis only)

## File yang Dimodifikasi

1. **kelola-user.html** - UI permissions toggle
2. **js/pages/kelola-user.js** - Logic permissions management
3. **js/config/menu-structure.js** - Menu structure config (NEW)
4. **js/sidebar-loader.js** - Sidebar filtering logic
5. **js/protectPage.js** - Page protection logic

## Tips Penggunaan

### ✅ Best Practices

1. Berikan permission minimal yang diperlukan
2. Review permissions secara berkala
3. Gunakan Quick Action (All/None) untuk setup cepat
4. Test login staff setelah setting permissions

### ⚠️ Yang Harus Diperhatikan

1. **Dashboard** selalu accessible (tidak bisa di-disable)
2. **Supervisor submenu** tidak muncul di staff permissions
3. **Maintenance** tidak muncul di staff permissions
4. Admin tidak perlu setting permissions (hardcoded)

## Troubleshooting

### Staff tidak bisa akses menu tertentu

1. Cek permissions di Kelola User
2. Pastikan toggle menu aktif (hijau)
3. Staff harus logout dan login ulang

### Menu tidak muncul di sidebar

1. Normal jika permissions tidak aktif
2. Cek role user di sessionStorage
3. Clear cache browser jika perlu

### Error saat save permissions

1. Pastikan minimal satu menu aktif
2. Cek koneksi Firebase
3. Lihat console browser untuk error detail

## Support

Untuk bantuan lebih lanjut:

- 📧 Email: melatigoldshopid@gmail.com
- 📱 Contact: Supervisor Melati Gold Shop
