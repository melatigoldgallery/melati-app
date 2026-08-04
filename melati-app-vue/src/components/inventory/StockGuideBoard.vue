<template>
  <div class="card border-0 shadow-sm mt-4 info-board-card">
    <div class="card-header bg-gradient-info text-white p-3 border-0">
      <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
        <i class="bi bi-info-circle-fill"></i>
        <span>Informasi Update Sistem Inventory</span>
      </h5>
    </div>
    <div class="card-body p-4">
      <!-- Banner: Tujuan & Target Tutup Toko -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="goal-banner p-3 rounded-3 d-flex align-items-center justify-content-between flex-nowrap gap-3">
            <div class="d-flex align-items-center gap-3 min-w-0">
              <div class="icon-circle bg-white text-primary fs-3 shadow-sm flex-shrink-0">
                <i class="bi bi-lightning-charge-fill text-primary"></i>
              </div>
              <div class="min-w-0 text-start">
                <h6 class="fw-bold mb-1 text-white">Tujuan Utama: Hitung Barang Lebih Efisien!</h6>
                <p class="mb-0 text-white small text-wrap">
                  Mempercepat proses hitung barang saat tutup toko. Dari estimasi awal <strong>1 jam</strong>, harapannya bisa selesai <strong> lebih cepat</strong>.
                </p> 
              </div>
            </div>
            <div class="badge bg-white text-primary px-3 py-2 rounded-pill fw-bold shadow-sm flex-shrink-0 align-self-center">
              45 Menit Proses Hitung Selesai ⏱️
            </div>
          </div>
        </div>
      </div>

      <!-- Grid Content Panduan -->
      <div class="row g-3">
        <!-- Kolom Kiri: Alur Mutasi Barang -->
        <div class="col-md-6">
          <div class="h-100 p-3 bg-light rounded-3 border border-light-subtle shadow-sm-hover transition-all text-start">
            <h6 class="fw-bold text-dark mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
              <i class="bi bi-arrow-left-right text-primary"></i>
              1. Alur & Perpindahan Barang
            </h6>
            <div class="timeline-custom">
              <div class="timeline-item-custom pb-3">
                <span class="badge bg-primary-subtle text-primary mb-1">Barang Baru</span>
                <p class="small mb-0">
                  Tim Input mendaftarkan barang ke kategori <strong>Belum Posting</strong>. Setelah diposting, status barcode dipindahkan ke kategori <strong>Admin</strong>.
                </p>
              </div>
              <div class="timeline-item-custom pb-3">
                <span class="badge bg-warning-subtle text-warning-emphasis mb-1">Barang BC (Cucian)</span>
                <p class="small mb-0">
                  Tim Input memindahkan barcode langsung ke lokasi <strong>Stok Brankas</strong>. Jika ada staff yang mengambil untuk dipajang atau terjual, wajib dipindahkan ke lokasi <strong>Display</strong> atau <strong>Laku</strong> di sistem.
                </p>
              </div>
              <div class="timeline-item-custom pb-0">
                <span class="badge bg-danger-subtle text-danger mb-1 fw-bold">Wajib Scan Barcode!</span>
                <p class="small mb-0">
                  Setiap staff yang mengambil barang dari box Admin, Brankas, atau lokasi lainnya <strong>wajib scan barcode</strong> di sistem saat memindahkan barang.
                </p>
              </div>
            </div>

            <!-- Definisi Jenis / Lokasi Barang -->
            <div class="mt-3 pt-3 border-top border-light-subtle text-start">
              <span class="d-block fw-bold text-dark mb-2 small text-uppercase tracking-wider">
                <i class="bi bi-info-circle-fill text-info me-1"></i>
                Keterangan Jenis & Lokasi Barang:
              </span>
              <div class="d-flex flex-column gap-2">
                <div class="p-2 rounded bg-white border border-light-subtle shadow-sm-hover d-flex align-items-start gap-2">
                  <span class="badge bg-primary fw-bold text-center mt-0.5" style="min-width: 95px;">Admin</span>
                  <div class="small mb-0">
                    Barang dasaran (display) atau barang sudah posting yang dibawa ke area kerja admin.
                    <ul class="ps-3 mb-0 mt-1">
                      <li><strong>Penyimpanan & Ambil:</strong> Tempat menyimpan barang dasaran & sudah posting wajib dipisahkan. Pengambilan fisik ke meja admin tidak perlu scan.</li>
                      <li><strong>Batal Transaksi:</strong> Barang dasaran dikembalikan ke display tanpa scan. Barang sudah posting dikembalikan ke box Sudah Posting tanpa scan.</li>
                      <li><strong>Keep & Laku:</strong> Jika barang dasaran di-DP/keep untuk besok, atau jika barang sudah posting terjual (laku), <strong>wajib scan barcode</strong> ke sistem.</li>
                    </ul>
                  </div>
                </div>
                <div class="p-2 rounded bg-white border border-light-subtle shadow-sm-hover d-flex align-items-start gap-2">
                  <span class="badge bg-warning text-dark fw-bold text-center mt-0.5" style="min-width: 95px;">DP & Keep</span>
                  <div class="small mb-0">
                    Barang pesanan pelanggan yang telah membayar uang muka (DP) atau barang keep customer yang akan segera diproses keesokan harinya. Jika barang DP atau Keep sudah ditransaksi maka pindahkan barcode ke laku atau jika batal transaksi pindahkan ke display dan dipajang.
                  </div>
                </div>
                <div class="p-2 rounded bg-white border border-light-subtle shadow-sm-hover d-flex align-items-start gap-2">
                  <span class="badge bg-success fw-bold text-center mt-0.5" style="min-width: 95px;">Sudah Posting</span>
                  <div class="small mb-0">
                    Box fisik penyimpanan barang yang telah selesai diposting.
                    <ul class="ps-3 mb-0 mt-1">
                      <li><strong>Prosedur Update:</strong> Tim posting cukup meletakkan barang di box Sudah Posting dan mengonfirmasi kode klip unik (beserta jumlah pcs) ke tim input. Update barcode dari <em>Belum Posting</em> ke <em>Sudah Posting</em> dilakukan oleh tim input tanpa perlu scan satu per satu.</li>
                      <li><strong>Barang Dasaran:</strong> Jika tim posting mengambil barang dasaran untuk diposting: dikembalikan ke dasaran (tanpa scan), diletakkan di box Sudah Posting (<strong>wajib scan</strong> agar data fisik dan sistem akurat).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Prosedur SO & Box Fisik -->
        <div class="col-md-6 text-start">
          <div class="h-100 p-3 bg-light rounded-3 border border-light-subtle shadow-sm-hover transition-all d-flex flex-column justify-content-between">
            <div>
              <h6 class="fw-bold text-dark mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
                <i class="bi bi-exclamation-triangle-fill text-danger"></i>
                2. Stock Opname (SO) Barang
              </h6>
              <p class="small">
                Jika jumlah barcode di sistem berbeda dengan fisik, segera lakukan koordinasi & SO dengan penanggung jawab masing-masing bagian:
              </p>
              <ul class="list-unstyled mb-3 ps-1">
                <li class="d-flex align-items-start gap-2 mb-2 small">
                  <i class="bi bi-check-circle-fill text-success mt-1"></i>
                  <div><strong>Stok Brankas:</strong> Koordinasi & SO dengan <strong>Tim Input</strong>.</div>
                </li>
                <li class="d-flex align-items-start gap-2 mb-2 small">
                  <i class="bi bi-check-circle-fill text-success mt-1"></i>
                  <div><strong>Stok Belum Posting:</strong> Koordinasi & SO dengan <strong>Bagian Posting</strong>.</div>
                </li>
                <li class="d-flex align-items-start gap-2 mb-2 small">
                  <i class="bi bi-check-circle-fill text-success mt-1"></i>
                  <div><strong>Lokasi Lain (Rusak, Batu Lepas, dll):</strong> SO dapat dilakukan sesuai bagian (tim kalung, anting, liontin, dll). Cara SO dikoordinasikan dengan <strong>Tim Input</strong>.</div>
                </li>
              </ul>
              <div class="alert alert-warning border border-warning-subtle p-2 rounded-2 small mb-3">
                <i class="bi bi-info-circle-fill text-warning me-1"></i>
                Tujuan SO ini untuk melacak kode barang mana yang tidak ada, serta mengidentifikasi pengambilan barang oleh sales yang lupa update di sistem.
              </div>
              
              <h6 class="fw-bold text-dark mb-2 d-flex align-items-center gap-2 small">
                <i class="bi bi-box-seam-fill text-info"></i>
                Penyimpanan Rapi (Fisik)
              </h6>
              <p class="small mb-0">
                Gunakan box fisik khusus yang disediakan (Stok Brankas, Admin, Belum Posting, dll.) guna mempermudah penataan dan pengecekan barang secara cepat.
              </p>
              <div class="alert alert-info border border-info-subtle p-2 rounded-2 small mt-2 mb-0">
                <strong>💡 Info Penting:</strong> Hasil input shift pagi harus dihitung dan diletakkan sesuai boxnya (<strong>Stok Brankas</strong> atau <strong>Belum Posting</strong>). Pemisahan ini mempermudah pelacakan barang dan mencegah selisih stok saat pergantian shift.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: Himbauan Kerjasama -->
      <div class="mt-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle text-center">
        <h6 class="fw-bold text-primary mb-1">
          <i class="bi bi-people-fill me-1"></i>
          Tolong Kerja Sama & Keterlibatannya 🔥
        </h6>
        <p class="small mb-0 text-primary-emphasis">
          Kedisiplinan kita melakukan update barcode saat pemindahan barang adalah kunci agar proses hitung barang saat closing lebih efisien dan akurat 🚀
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Static component
</script>

<style scoped>
.info-board-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.info-board-card .card-header {
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
}

.goal-banner {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-custom {
  position: relative;
  border-left: 2px solid #e2e8f0;
  padding-left: 16px;
  margin-left: 8px;
}

.timeline-item-custom {
  position: relative;
}

.timeline-item-custom::before {
  content: '';
  position: absolute;
  left: -22px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #3b82f6;
  border: 2px solid #fff;
}

.timeline-item-custom:nth-child(2)::before {
  background-color: #eab308;
}

.timeline-item-custom:nth-child(3)::before {
  background-color: #06b6d4;
}

.timeline-item-custom:nth-child(4)::before {
  background-color: #ef4444;
}

.shadow-sm-hover {
  transition: all 0.2s ease-in-out;
}

.shadow-sm-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}
</style>
