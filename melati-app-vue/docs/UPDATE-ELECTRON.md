Saya sudah memiliki aplikasi desktop kasir/antrean berbasis Hybrid menggunakan Electron.js dan Vue 3. Sekarang, saya ingin MENAMBAHKAN fitur "Audio Ducking" khusus untuk modul pemanggilan nomor antrean di dalam kode yang sudah ada.

KENDALA SAAT INI: 
Ketika tombol "Panggil Antrean" diklik, suara panggilan bertabrakan dan tenggelam dengan suara dari aplikasi lain (seperti tab YouTube yang sedang diputar di browser komputer). 

SOLUSI YANG DIINGINKAN:
Saya ingin ketika nomor antrean dipanggil, suara master dari OS komputer otomatis mengecil secara drastis (menjadi sekitar 25% - 30%), lalu setelah audio panggilan selesai berbunyi, volume komputer otomatis kembali normal ke tingkat semula.

Tolong berikan instruksi lengkap dan modifikasi kodenya dengan spesifikasi berikut:

1. DEPENDENCY YANG DIPERLUKAN:
   - Beritahu saya library Node.js apa yang paling stabil untuk mengontrol volume OS secara global di Windows (misalnya menggunakan `node-loudness` atau library bawaan Node.js lainnya) dan bagaimana cara menginstalnya di folder Electron.

2. MODIFIKASI FILE `preload.js`:
   - Tambahkan fungsi jembatan IPC baru (misalnya `panggilAntreanDim`) agar website Vue bisa mengirim sinyal perintah penurunan volume ke Main Process Electron.

3. MODIFIKASI FILE `main.js` (Electron Backend):
   - Buat handler IPC untuk menangkap perintah dari Vue beserta parameter "durasi audio dalam milidetik".
   - Alur logikanya di `main.js`:
     a. Ambil dan simpan angka volume komputer saat ini (misal volume awal sedang di angka 90%).
     b. Setel volume master OS turun menjadi 30% secara global (sehingga suara YouTube otomatis mengecil).
     c. Gunakan `setTimeout` sesuai durasi audio panggilan dari Vue. Jika waktu habis, kembalikan volume master komputer ke angka semula (kembali ke 90%).

4. MODIFIKASI SISI VUE 3 (<script setup> Component):
   - Buat fungsi atau modifikasi fungsi tombol "Panggil" yang sudah ada.
   - Saat tombol diklik, Vue akan memutar file audio panggilan (misal: "Nomor Antrean 1...").
   - Sebelum atau bersamaan dengan audio dimainkan, Vue memanggil fungsi jembatan IPC tadi sambil mengirimkan estimasi durasi file audio tersebut (contoh: 4000 milidetik / 4 detik).

Tolong tunjukkan potongan kode yang perlu ditambahkan secara spesifik untuk file `main.js`, `preload.js`, dan komponen Vue Anda, serta pastikan kodenya tidak mengganggu fitur cetak printer yang sudah diimplementasikan sebelumnya.