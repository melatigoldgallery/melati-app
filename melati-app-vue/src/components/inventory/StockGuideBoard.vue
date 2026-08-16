<template>
  <div class="card border-0 shadow-sm mt-4 info-board-card">
    <div class="card-header bg-gradient-info text-white p-3 border-0">
      <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
        <i class="bi bi-info-circle-fill"></i>
        <span>Informasi Sistem Inventory</span>
      </h5>
    </div>
    <div class="card-body p-4">
      <!-- SECTION BARU: KETENTUAN DAN FLOWCHART (SELALU MUNCUL) -->
      <div class="row g-4 align-items-stretch">
        <!-- Kolom Kiri: 4 Ketentuan Utama -->
        <div class="col-lg-6 text-start">
          <div class="h-100 p-4 bg-white rounded-3 border border-light-subtle shadow-sm d-flex flex-column justify-content-between">
            <div>
              <h5 class="fw-bold text-dark mb-3 pb-2 border-bottom d-flex align-items-center gap-2">
                <i class="bi bi-shield-fill-exclamation text-primary"></i>
                <span>Ketentuan Update Stock Barang</span>
              </h5>
              <div class="rules-container d-flex flex-column gap-3">
                
                <div class="rule-card p-3 rounded-3 border-start border-4 border-primary bg-light-primary shadow-sm-hover transition-all">
                  <div class="d-flex align-items-start gap-3">
                    <span class="rule-num badge bg-primary rounded-circle mt-1">1</span>
                    <div class="rule-text text-start">
                      <h6 class="fw-bold text-primary mb-1">Wajib Scan Barcode Saat Ambil Barang</h6>
                      <p class="mb-0 text-muted small">
                        Setiap pengambilan atau perpindahan fisik barang, <strong>wajib di-scan barcode-nya terlebih dahulu</strong> di sistem.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="rule-card p-3 rounded-3 border-start border-4 border-info bg-light-info shadow-sm-hover transition-all">
                  <div class="d-flex align-items-start gap-3">
                    <span class="rule-num badge bg-info text-white rounded-circle mt-1">2</span>
                    <div class="rule-text text-start">
                      <h6 class="fw-bold text-info-emphasis mb-1">Konfirmasi ke Tim Input</h6>
                      <p class="mb-0 text-muted small">
                        Setelah selesai scan barcode, <strong>konfirmasi ke Tim Input</strong> untuk memastikan perpindahan valid dan menghindari lupa scan barcode.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="rule-card p-3 rounded-3 border-start border-4 border-warning bg-light-warning shadow-sm-hover transition-all">
                  <div class="d-flex align-items-start gap-3">
                    <span class="rule-num badge bg-warning text-dark rounded-circle mt-1">3</span>
                    <div class="rule-text text-start">
                      <h6 class="fw-bold text-warning-emphasis mb-1">Penyelarasan Selisih (Stock Opname)</h6>
                      <p class="mb-0 text-muted small">
                        Jika terdapat ketidaksesuaian data antara fisik barang dan sistem, <strong>segera lakukan Stock Opname</strong> dengan dibantu oleh Tim Input.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="rule-card p-3 rounded-3 border-start border-4 border-danger bg-light-danger shadow-sm-hover transition-all">
                  <div class="d-flex align-items-start gap-3">
                    <span class="rule-num badge bg-danger rounded-circle mt-1">4</span>
                    <div class="rule-text text-start">
                      <h6 class="fw-bold text-danger mb-1"> Kelalaian (Tanpa Scan)</h6>
                      <p class="mb-0 text-muted small">
                        Jika diketahui ada sales yang mengambil/memindahkan barang tanpa melakukan scan barcode, <strong> sales yang bersangkutan akan diingatkan di grup toko</strong> sebagai pengingat untuk yang bersangkutan dan sales secara keseluruhan.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Flowchart Diagram HTML/CSS -->
        <div class="col-lg-6">
          <div class="h-100 p-4 bg-white rounded-3 border border-light-subtle shadow-sm d-flex flex-column justify-content-between text-start">
            <div>
              <h5 class="fw-bold text-dark mb-4 pb-2 border-bottom d-flex align-items-center gap-2">
                <i class="bi bi-diagram-3-fill text-primary"></i>
                <span>Alur Perpindahan Barang (Sales)</span>
              </h5>
              
              <!-- Flowchart Grid/Flex -->
              <div class="flowchart-container px-2">
                <!-- Step 1 -->
                <div class="flow-step-wrapper d-flex align-items-center gap-3 mb-3">
                  <div class="flow-step-icon bg-primary-subtle text-primary border border-primary-subtle rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm" style="width: 52px; height: 52px;">
                    <i class="bi bi-box-seam fs-4"></i>
                  </div>
                  <div class="flow-step-desc flex-grow-1 min-w-0">
                    <h6 class="fw-bold text-dark mb-0.5">1. Ambil Barang Fisik</h6>
                    <span class="text-secondary small">Sales mengambil barang dari lokasi penyimpanan.</span>
                  </div>
                </div>

                <!-- Connect Line Down -->
                <div class="flow-connector ms-4 mb-3 border-start border-2 border-primary border-dashed" style="height: 25px; width: 0;"></div>

                <!-- Step 2 -->
                <div class="flow-step-wrapper d-flex align-items-center gap-3 mb-3">
                  <div class="flow-step-icon bg-info-subtle text-info border border-info-subtle rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm" style="width: 52px; height: 52px;">
                    <i class="bi bi-qr-code-scan fs-4"></i>
                  </div>
                  <div class="flow-step-desc flex-grow-1 min-w-0">
                    <h6 class="fw-bold text-dark mb-0.5">2. Scan Barcode di Sistem</h6>
                    <span class="text-secondary small">Update lokasi barang secara langsung menggunakan scanner.</span>
                  </div>
                </div>

                <!-- Connect Line Down -->
                <div class="flow-connector ms-4 mb-3 border-start border-2 border-info border-dashed" style="height: 25px; width: 0;"></div>

                <!-- Step 3 -->
                <div class="flow-step-wrapper d-flex align-items-center gap-3 mb-3">
                  <div class="flow-step-icon bg-warning-subtle text-warning border border-warning-subtle rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm" style="width: 52px; height: 52px;">
                    <i class="bi bi-chat-left-dots fs-4 text-warning-emphasis"></i>
                  </div>
                  <div class="flow-step-desc flex-grow-1 min-w-0">
                    <h6 class="fw-bold text-dark mb-0.5">3. Konfirmasi Tim Input</h6>
                    <span class="text-secondary small">Verifikasi mutasi agar tercatat valid dan menghindari lupa scan.</span>
                  </div>
                </div>

                <!-- Connect Line Down -->
                <div class="flow-connector ms-4 mb-3 border-start border-2 border-success border-dashed" style="height: 25px; width: 0;"></div>

                <!-- Step 4 (Success outcome) -->
                <div class="flow-step-wrapper d-flex align-items-center gap-3">
                  <div class="flow-step-icon bg-success-subtle text-success border border-success-subtle rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm" style="width: 52px; height: 52px;">
                    <i class="bi bi-shield-fill-check fs-4"></i>
                  </div>
                  <div class="flow-step-desc flex-grow-1 min-w-0">
                    <h6 class="fw-bold text-success mb-0.5">Stok Akurat & Aman</h6>
                    <span class="text-secondary small">Pengecekan closing berjalan lancar dan cepat!</span>
                  </div>
                </div>
              </div>

              <!-- Flow Exceptions / Alert cards at the bottom -->
              <div class="row g-2 mt-4 pt-3 border-top">
                <div class="col-sm-6">
                  <div class="alert alert-danger border-0 p-2.5 rounded-3 mb-0 small d-flex gap-2">
                    <i class="bi bi-megaphone-fill text-danger fs-5 flex-shrink-0"></i>
                    <div>
                      <strong class="d-block text-danger mb-0.5">Lupa / Tidak Scan?</strong>
                      <span class="text-muted" style="font-size: 0.75rem;">Sales yang bersangkutan akan diingatkan di grup toko.</span>
                    </div>
                  </div>
                </div>
                <div class="col-sm-6">
                  <div class="alert alert-warning border-0 p-2.5 rounded-3 mb-0 small d-flex gap-2">
                    <i class="bi bi-exclamation-triangle-fill text-warning-emphasis fs-5 flex-shrink-0"></i>
                    <div>
                      <strong class="d-block text-warning-emphasis mb-0.5">Ada Selisih Stok?</strong>
                      <span class="text-muted" style="font-size: 0.75rem;">Segera lakukan Stock Opname dibantu oleh Tim Input.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>


<style scoped>
.info-board-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.info-board-card .card-header {
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
}



.shadow-sm-hover {
  transition: all 0.2s ease-in-out;
}

.shadow-sm-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}

/* Background subtle variants for rule cards */
.bg-light-primary {
  background-color: rgba(13, 110, 253, 0.03);
}
.bg-light-info {
  background-color: rgba(13, 202, 240, 0.03);
}
.bg-light-warning {
  background-color: rgba(255, 193, 7, 0.03);
}
.bg-light-danger {
  background-color: rgba(220, 53, 69, 0.03);
}

.rule-card {
  border: 1px solid #f1f3f7;
  cursor: default;
}

.rule-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.rule-num {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.flow-step-wrapper {
  transition: all 0.2s ease-in-out;
}
.flow-step-wrapper:hover {
  transform: translateX(3px);
}
.flow-step-icon {
  transition: all 0.2s ease;
}
.flow-step-wrapper:hover .flow-step-icon {
  transform: scale(1.05);
}
</style>
