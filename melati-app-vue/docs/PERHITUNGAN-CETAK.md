Saya ingin menambahkan fitur di Sistem Antrean berbasis Web menggunakan Vue 3 (Composition API) dan Firebase Realtime Database. 

Saya ingin menambahkan fitur "Hitung Otomatis Kertas Printer Thermal (Low Paper Alert)" yang berjalan murni di sisi browser. Karena printer yang digunakan (Iware XS-80BT) tidak memiliki sensor hardware internal untuk mendeteksi sisa kertas, saya menggunakan metode perhitungan digital (Software-Based Counter).

Tolong buatkan kode Vue 3 beserta struktur Firebase Realtime Database dan fungsi penunjangnya dengan spesifikasi berikut:

1. FITUR PENGATURAN KERTAS (SETTING PAPER ROLL)
Sistem harus bisa menyimpan konfigurasi jenis kertas yang sedang aktif digunakan di dalam printer. Pilihan kertasnya adalah:
- Ukuran 80x80 mm: Estimasi panjang total 4.000 cm. Dengan konsumsi 15.5 cm per cetak, batas maksimal (Max Capacity) adalah 258 kali cetak. Batas aman alert (Threshold 85%) adalah pada cetakan ke-220.
- Ukuran 80x50 mm: Estimasi panjang total 2.000 cm. Dengan konsumsi 15.5 cm per cetak, batas maksimal (Max Capacity) adalah 129 kali cetak. Batas aman alert (Threshold 85%) adalah pada cetakan ke-110.

2. STRUKTUR DATA FIREBASE REALTIME DATABASE
Buat sebuah node 'printer_status/kasir-1' dengan struktur seperti ini (atau yang kamu rekomendasikan):
{
  "active_paper_type": "80x80", // atau "80x50"
  "total_prints": 0, // Bertambah +1 setiap kali cetak antrean
  "max_capacity": 258, // Berubah otomatis sesuai tipe kertas
  "threshold": 220, // Berubah otomatis sesuai tipe kertas
  "last_reset": "timestamp"
}

3. ALUR LOGIKA & FITUR YANG HARUS ADA DI VUE 3 COMPONENT:
A. Realtime Listener: Aplikasi admin harus mendengarkan secara realtime perubahan data dari Firebase.
B. Fitur Cetak (Trigger Increment): Buat sebuah fungsi `handlePrintQueue()`. Fungsi ini menyimulasikan proses cetak antrean, lalu memperbarui data di Firebase menggunakan perintah `increment(1)` dari Firebase secara atomik agar aman.
C. Notifikasi/Alert di Layar: Jika `total_prints` mencapai atau melewati `threshold`, munculkan sebuah komponen alert/modal peringatan visual yang jelas di layar: "Kertas hampir habis! Tersisa sekitar [X] lembar lagi. Mohon segera bersiap ganti roll."
D. Fitur Lintas Hari (Persistensi): Hitungan `total_prints` TIDAK BOLEH ter-reset otomatis ketika ganti hari. Hitungan harus terus berlanjut dari hari kemarin agar akurat dengan sisa kertas fisik.
E. Tombol Reset & Ganti Kertas (Menu Admin):
Sediakan form/tombol admin untuk:
- Memilih jenis kertas yang baru dipasang (Dropdown 80x80 atau 80x50).
- Tombol "Reset & Pasang Kertas Baru". Jika ditekan, fungsi akan memperbarui `active_paper_type`, mengubah nilai `max_capacity` dan `threshold` sesuai jenis kertas terpilih, serta mengembalikan `total_prints` menjadi 0 di Firebase.

Tolong berikan:
1. Skema struktur JSON Firebase Realtime Database yang rapi.
2. Kode lengkap untuk file Vue 3 component (Script setup dengan kombinasi Firebase SDK v9/v10).
3. Desain template HTML sederhana menggunakan Tailwind CSS untuk tampilan Alert/Modal dan menu Setting Admin tersebut.

Buatlah kode yang bersih, modular, dan siap pakai. Terima kasih!