<template>
  <div class="stock-opname card border-0 shadow-sm rounded-3 overflow-hidden">
    <!-- Header -->
    <div class="card-header bg-white border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-light-warning rounded-3 me-2.5 p-2 text-warning">
          <i class="bi bi-shield-check fs-5"></i>
        </div>
        <div>
          <h6 class="mb-0 fw-bold text-dark">Stok Opname Data Barcode</h6>
          <small class="text-muted text-xs">Audit fisik barang dengan data terdaftar di sistem secara real-time</small>
        </div>
      </div>
      
      <!-- Navigasi Mode Tampilan Segmented Control -->
      <div class="d-flex gap-2">
        <div class="segmented-control p-1 bg-light rounded-pill d-flex align-items-center">
          <button 
            class="segmented-btn rounded-pill border-0 px-3 py-1 fw-bold fs-7" 
            :class="{ 'active text-primary bg-white shadow-sm': viewMode === 'active' }"
            @click="viewMode = 'active'"
          >
            Audit Aktif
          </button>
          <button 
            class="segmented-btn rounded-pill border-0 px-3 py-1 fw-bold fs-7" 
            :class="{ 'active text-primary bg-white shadow-sm': viewMode === 'history' }"
            @click="switchToHistory"
          >
            Riwayat Opname
          </button>
        </div>

        <template v-if="viewMode === 'active' && sessionActive">
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm hover-lift" @click="confirmReset" :disabled="loading">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Reset Sesi
          </button>
          <button class="btn btn-sm btn-success text-white rounded-pill px-3 shadow-sm hover-lift" @click="exportToCSV" :disabled="loading">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i>
            Ekspor CSV
          </button>
        </template>
      </div>
    </div>

    <!-- VIEW 1: ACTIVE AUDIT VIEW -->
    <template v-if="viewMode === 'active'">
      <!-- Filters Panel -->
      <div class="card-body bg-light-subtle border-bottom p-3">
        <div class="row g-3 align-items-end justify-content-between">
          <div class="col-lg-9 col-md-12">
            <div class="row g-3">
              <!-- Jenis Barang -->
              <div class="col-md-4">
                <label class="form-label text-muted small fw-bold text-uppercase mb-1.5" style="font-size: 0.72rem; letter-spacing: 0.3px;">Jenis Barang</label>
                <select v-model="selectedCategory" class="form-select form-select-sm border-2 rounded-2 custom-select" :disabled="sessionActive && registeredBarcodes.length > 0">
                  <option value="">-- Pilih Kategori --</option>
                  <option v-for="card in cards" :key="card.id" :value="card.id">
                    {{ card.label }}
                  </option>
                </select>
              </div>

              <!-- Lokasi -->
              <div class="col-md-4">
                <label class="form-label text-muted small fw-bold text-uppercase mb-1.5" style="font-size: 0.72rem; letter-spacing: 0.3px;">Lokasi Fisik</label>
                <select v-model="selectedLocation" class="form-select form-select-sm border-2 rounded-2 custom-select" :disabled="sessionActive && registeredBarcodes.length > 0">
                  <option value="">-- Pilih Lokasi --</option>
                  <option v-for="loc in locations" :key="loc.key" :value="loc.key">
                    {{ loc.label }}
                  </option>
                </select>
              </div>

              <!-- Klasifikasi (Conditional) -->
              <div v-if="detailMode !== 'default'" class="col-md-4">
                <label class="form-label text-muted small fw-bold text-uppercase mb-1.5" style="font-size: 0.72rem; letter-spacing: 0.3px;">
                  Klasifikasi ({{ detailMode === 'hala' ? 'Jenis' : 'Warna' }})
                </label>
                <select v-model="selectedSubType" class="form-select form-select-sm border-2 rounded-2 custom-select" :disabled="sessionActive && registeredBarcodes.length > 0">
                  <option value="">-- Pilih Klasifikasi --</option>
                  <option v-for="opt in detailOptions" :key="opt.key" :value="opt.key">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Start Button -->
          <div class="col-lg-3 col-md-12 d-grid" v-if="!sessionActive">
            <button class="btn btn-primary btn-sm rounded-pill py-2 shadow-sm hover-lift fw-bold" :disabled="!isFilterComplete || loading" @click="startOpname">
              <span class="spinner-border spinner-border-sm me-1" role="status" v-if="loading"></span>
              <i class="bi bi-play-fill me-1" v-else></i>
              Mulai Sesi Opname
            </button>
          </div>
        </div>
      </div>

      <!-- Active Session Area -->
      <div class="card-body p-4" v-if="sessionActive">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted small">Mengunduh data barcode sistem...</p>
        </div>

        <template v-else>
          <!-- Stats Dashboard (Minimalist & Premium) -->
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="card bg-white border-0 border-start border-4 border-primary shadow-sm p-3 rounded-3 position-relative overflow-hidden">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="small fw-semibold text-muted text-uppercase mb-1" style="font-size: 0.72rem; letter-spacing: 0.5px;">Total Sistem</div>
                    <div class="fs-2 fw-extrabold text-dark my-0">{{ registeredBarcodes.length }}</div>
                  </div>
                  <div class="icon-circle bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                    <i class="bi bi-database fs-5"></i>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card bg-white border-0 border-start border-4 border-success shadow-sm p-3 rounded-3 position-relative overflow-hidden">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="small fw-semibold text-muted text-uppercase mb-1" style="font-size: 0.72rem; letter-spacing: 0.5px;">Valid (Fisik Ada)</div>
                    <div class="fs-2 fw-extrabold text-success my-0">
                      {{ scannedBarcodesCount }}
                      <span class="fs-6 fw-normal text-muted">/ {{ registeredBarcodes.length }}</span>
                    </div>
                  </div>
                  <div class="icon-circle bg-light-success text-success rounded-circle d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                    <i class="bi bi-check-circle fs-5"></i>
                  </div>
                </div>
                <div class="progress mt-2" style="height: 4px; background-color: #f1f3f5;">
                  <div class="progress-bar bg-success rounded-pill" role="progressbar" :style="{ width: progressPercent + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card bg-white border-0 border-start border-4 border-danger shadow-sm p-3 rounded-3 position-relative overflow-hidden">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="small fw-semibold text-muted text-uppercase mb-1" style="font-size: 0.72rem; letter-spacing: 0.5px;">Belum Ter-Scan</div>
                    <div class="fs-2 fw-extrabold text-danger my-0">{{ unscannedBarcodesCount }}</div>
                  </div>
                  <div class="icon-circle bg-light-danger text-danger rounded-circle d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                    <i class="bi bi-x-circle fs-5"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Scan Input Box (With Glow/Pulse Effect) -->
          <div class="scan-wrapper mb-4 p-3 border border-light-subtle rounded-3 bg-light-subtle">
            <div class="input-group input-group-glow" :class="pulseClass">
              <span class="input-group-text bg-white border-2 border-end-0 text-muted rounded-start-pill ps-3 pe-2">
                <i class="bi bi-qr-code-scan text-primary fs-5"></i>
              </span>
              <input
                ref="scanInputRef"
                v-model="scanInput"
                type="text"
                class="form-control form-control-lg border-2 border-start-0 rounded-end-pill px-2 py-2.5 fs-5 monospace"
                placeholder="Pindai barcode fisik atau ketik kodenya di sini..."
                autocomplete="off"
                :disabled="loading"
                @keydown.enter="handleBarcodeSubmit"
              />
            </div>

            <!-- Feedback Alert (Styled beautifully) -->
            <div v-if="feedback" class="mt-2.5 text-center transition-all">
              <div :class="['alert py-2 px-3.5 m-0 rounded-pill d-inline-block small border-0 shadow-sm fw-bold', feedbackClass]">
                <i :class="['bi me-2 fs-6', feedbackIcon]"></i>
                {{ feedback.message }}
              </div>
            </div>
          </div>

          <!-- Two Columns Lists (Modern List Group style) -->
          <div class="row g-4 mb-4">
            <!-- Left Column: Unscanned -->
            <div class="col-lg-6">
              <div class="card border border-light shadow-sm rounded-3 overflow-hidden bg-white">
                <div class="card-header bg-white border-0 py-3 px-3 d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-danger d-flex align-items-center gap-1.5 small text-uppercase" style="letter-spacing: 0.3px;">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    Belum Ter-Scan ({{ filteredUnscannedList.length }})
                  </span>
                  <button
                    class="btn btn-xs btn-outline-danger rounded-pill px-3 py-1 shadow-sm hover-lift"
                    :disabled="unscannedList.length === 0"
                    @click="copyUnscannedToClipboard"
                  >
                    <i class="bi bi-clipboard me-1"></i>
                    Salin Semua
                  </button>
                </div>
                <div class="p-2 border-bottom bg-light-subtle">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-white border-end-0 text-muted border-light">
                      <i class="bi bi-search"></i>
                    </span>
                    <input
                      v-model="unscannedSearch"
                      type="text"
                      class="form-control form-control-sm border-start-0 bg-white border-light"
                      placeholder="Cari di kolom ini..."
                    />
                  </div>
                </div>
                <div class="list-container p-0" style="max-height: 350px; overflow-y: auto;">
                  <div v-if="filteredUnscannedList.length === 0" class="text-center text-muted py-5 px-3">
                    <i class="bi bi-check-circle-fill fs-2 d-block text-success mb-2"></i>
                    <span class="small fw-bold text-success">Semua barang fisik valid dan cocok!</span>
                  </div>
                  <div class="list-group list-group-flush" v-else>
                    <div 
                      v-for="(item, idx) in filteredUnscannedList" 
                      :key="item.barcode"
                      class="list-group-item d-flex justify-content-between align-items-center py-2.5 px-3 border-light list-item-hover"
                    >
                      <div class="d-flex align-items-center gap-2.5">
                        <span class="text-muted small fw-semibold" style="width: 24px;">{{ idx + 1 }}</span>
                        <span class="monospace fw-bold text-danger fs-6">{{ item.barcode }}</span>
                      </div>
                      <span class="text-muted small font-xs">
                        {{ formatDate(item.lastUpdated) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Scanned -->
            <div class="col-lg-6">
              <div class="card border border-light shadow-sm rounded-3 overflow-hidden bg-white">
                <div class="card-header bg-white border-0 py-3 px-3 d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-success d-flex align-items-center gap-1.5 small text-uppercase" style="letter-spacing: 0.3px;">
                    <i class="bi bi-check-circle-fill"></i>
                    Sudah Ter-Scan ({{ filteredScannedList.length }})
                  </span>
                  <span class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 small rounded-pill">Fisik Cocok</span>
                </div>
                <div class="p-2 border-bottom bg-light-subtle">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-white border-end-0 text-muted border-light">
                      <i class="bi bi-search"></i>
                    </span>
                    <input
                      v-model="scannedSearch"
                      type="text"
                      class="form-control form-control-sm border-start-0 bg-white border-light"
                      placeholder="Cari di kolom ini..."
                    />
                  </div>
                </div>
                <div class="list-container p-0" style="max-height: 350px; overflow-y: auto;">
                  <div v-if="filteredScannedList.length === 0" class="text-center text-muted py-5 px-3">
                    <i class="bi bi-qr-code-scan fs-2 d-block text-muted mb-2"></i>
                    <span class="small text-muted">Belum ada barcode fisik yang terpindai.</span>
                  </div>
                  <div class="list-group list-group-flush" v-else>
                    <div 
                      v-for="(bc, idx) in filteredScannedList" 
                      :key="bc"
                      class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 border-light list-item-hover"
                    >
                      <div class="d-flex align-items-center gap-2.5">
                        <span class="text-muted small fw-semibold" style="width: 24px;">{{ idx + 1 }}</span>
                        <span class="monospace fw-bold text-success fs-6">{{ bc }}</span>
                      </div>
                      <button class="btn btn-outline-warning btn-xs rounded-pill px-2.5 py-0.5 text-dark hover-lift" @click="undoScan(bc)">
                        <i class="bi bi-arrow-counterclockwise"></i>
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Closing Session Panel (Action Drawer style) -->
          <div class="card border border-success-subtle rounded-3 bg-success-subtle bg-opacity-25 shadow-sm p-4">
            <div class="d-flex align-items-center mb-3">
              <i class="bi bi-check2-circle text-success fs-4 me-2"></i>
              <h6 class="fw-bold text-success-emphasis mb-0">Selesaikan Audit Opname</h6>
            </div>
            <form @submit.prevent="submitOpnameResult">
              <div class="row g-3 align-items-center">
                <div class="col-md-3">
                  <label class="form-label small fw-bold text-success-emphasis mb-1">Petugas Audit <span class="text-danger">*</span></label>
                  <select v-model="closingPetugas" class="form-select form-select-sm border-2 rounded-2 custom-select" required>
                    <option value="">-- Pilih Staff --</option>
                    <option v-for="staff in staffOptions" :key="`opname-staff-${staff}`" :value="staff">
                      {{ staff }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold text-success-emphasis mb-1">Catatan Tambahan</label>
                  <input v-model="closingCatatan" type="text" class="form-control form-control-sm border-2 rounded-2" placeholder="Catatan selisih barang, kondisi fisik, dll..." />
                </div>
                <div class="col-md-3 d-grid">
                  <button class="btn btn-success btn-sm text-white rounded-pill px-4 py-2 hover-lift fw-bold mt-3" :disabled="submitting || loading">
                    <span class="spinner-border spinner-border-sm me-1" role="status" v-if="submitting"></span>
                    <i class="bi bi-cloud-arrow-up-fill me-1" v-else></i>
                    Simpan Laporan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </template>
      </div>

      <!-- Empty Session Warning -->
      <div class="card-body py-5 text-center bg-light-subtle" v-else>
        <div class="empty-state-icon bg-white shadow-sm text-secondary rounded-circle mx-auto mb-3.5 d-flex align-items-center justify-content-center" style="width: 70px; height: 70px;">
          <i class="bi bi-search-heart fs-2 text-primary opacity-75"></i>
        </div>
        <h6 class="fw-bold text-dark mb-1">Mulai Audit Baru</h6>
        <p class="text-muted small mx-auto mb-0" style="max-width: 400px;">
          Pilih kategori barang, lokasi fisik, serta klasifikasinya pada panel di atas, lalu klik <strong>Mulai Sesi Opname</strong> untuk menarik data sistem.
        </p>
      </div>
    </template>

    <!-- VIEW 2: HISTORY LIST VIEW -->
    <template v-else-if="viewMode === 'history'">
      <div class="card-body p-0">
        <div v-if="loadingHistory" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted small">Memuat riwayat stok opname...</p>
        </div>

        <div v-else-if="historyRecords.length === 0" class="text-center py-5 px-3 bg-light-subtle">
          <div class="empty-state-icon bg-white shadow-sm text-secondary rounded-circle mx-auto mb-3.5 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
            <i class="bi bi-folder-x fs-3 text-muted"></i>
          </div>
          <h6 class="fw-bold text-dark mb-1">Belum Ada Riwayat</h6>
          <p class="text-muted small mb-0">Riwayat laporan stok opname yang disimpan akan muncul di halaman ini.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-3" style="width: 15%">Tanggal</th>
                <th style="width: 15%">Petugas</th>
                <th style="width: 25%">Kategori & Lokasi</th>
                <th style="width: 15%">Klasifikasi</th>
                <th class="text-center" style="width: 15%">Hasil Sistem/Fisik</th>
                <th class="text-center" style="width: 10%">Selisih</th>
                <th class="text-end pe-3" style="width: 10%">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in historyRecords" :key="rec.id" class="list-row bg-white">
                <td class="ps-3 text-muted small">
                  {{ formatDate(rec.createdAt) }}
                </td>
                <td>
                  <span class="fw-semibold text-dark">{{ rec.createdBy }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-1.5 flex-wrap">
                    <span class="badge bg-secondary-subtle text-secondary border rounded-1 fs-8">{{ rec.category }}</span>
                    <i class="bi bi-chevron-right text-muted" style="font-size: 0.65rem;"></i>
                    <span class="badge bg-primary-subtle text-primary border rounded-1 fs-8">{{ getSubDocLabel(rec.location) }}</span>
                  </div>
                </td>
                <td class="small text-muted">
                  {{ rec.detailType ? getClassificationLabel(rec.category, rec.detailType) : '-' }}
                </td>
                <td class="text-center">
                  <span class="fw-semibold text-muted small">S:</span>
                  <span class="fw-semibold text-dark ms-1">{{ rec.totalSistem ?? 0 }}</span>
                  <span class="text-muted px-1.5">|</span>
                  <span class="fw-semibold text-muted small">F:</span>
                  <span class="fw-bold text-success ms-1">{{ rec.totalFisik ?? 0 }}</span>
                </td>
                <td class="text-center">
                  <span 
                    class="badge rounded-pill px-2.5 py-1"
                    :class="(rec.totalSelisih ?? 0) < 0 ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'"
                  >
                    {{ rec.totalSelisih ?? 0 }}
                  </span>
                </td>
                <td class="text-end pe-3">
                  <button class="btn btn-outline-primary btn-sm rounded-pill px-3 hover-lift" @click="openReportDetail(rec)">
                    <i class="bi bi-eye-fill me-1"></i>Detail
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination Controls -->
          <div class="d-flex justify-content-between align-items-center p-3 border-top bg-light-subtle">
            <button
              class="btn btn-sm btn-outline-secondary rounded-pill px-3"
              :disabled="historyCurrentPage === 1 || loadingHistory"
              @click="fetchHistory(historyCurrentPage - 1)"
            >
              <i class="bi bi-chevron-left me-1"></i>Sebelumnya
            </button>
            <span class="small fw-semibold text-muted">Halaman {{ historyCurrentPage }}</span>
            <button
              class="btn btn-sm btn-outline-secondary rounded-pill px-3"
              :disabled="!historyHasMore || loadingHistory"
              @click="fetchHistory(historyCurrentPage + 1)"
            >
              Berikutnya<i class="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- History Detail Modal -->
    <div class="modal fade" id="opnameDetailModal" tabindex="-1" aria-hidden="true" ref="detailModalRef">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg rounded-3">
          <div class="modal-header py-3 bg-primary text-white border-0" v-if="selectedReport">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-receipt me-2"></i>
              Detail Hasil Opname: {{ selectedReport.category }} ({{ getSubDocLabel(selectedReport.location) }})
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" v-if="selectedReport">
            <!-- Metadata Info -->
            <div class="row g-3 mb-4 p-3 bg-light rounded-3 shadow-sm border border-light">
              <div class="col-sm-6">
                <div class="small text-muted text-uppercase fw-bold font-xs">Tanggal Audit</div>
                <div class="fw-bold text-dark mt-0.5">{{ formatDate(selectedReport.createdAt) }}</div>
              </div>
              <div class="col-sm-6">
                <div class="small text-muted text-uppercase fw-bold font-xs">Petugas Auditor</div>
                <div class="fw-bold text-dark mt-0.5">{{ selectedReport.createdBy || '-' }}</div>
              </div>
              <div class="col-sm-4">
                <div class="small text-muted text-uppercase fw-bold font-xs">Total Sistem</div>
                <div class="fw-bold text-primary mt-0.5 fs-5">{{ selectedReport.totalSistem ?? 0 }}</div>
              </div>
              <div class="col-sm-4">
                <div class="small text-muted text-uppercase fw-bold font-xs">Fisik Valid</div>
                <div class="fw-bold text-success mt-0.5 fs-5">{{ selectedReport.totalFisik ?? 0 }}</div>
              </div>
              <div class="col-sm-4">
                <div class="small text-muted text-uppercase fw-bold font-xs">Selisih</div>
                <div class="fw-bold mt-0.5 fs-5" :class="(selectedReport.totalSelisih ?? 0) < 0 ? 'text-danger' : 'text-success'">
                  {{ selectedReport.totalSelisih ?? 0 }}
                </div>
              </div>
              <div class="col-12 mt-2" v-if="selectedReport.notes">
                <div class="small text-muted text-uppercase fw-bold font-xs">Catatan Temuan</div>
                <div class="text-secondary small bg-white p-2 border rounded mt-1 shadow-xs">{{ selectedReport.notes }}</div>
              </div>
            </div>

            <!-- Tab List Barcode inside Modal -->
            <div class="row g-3">
              <div class="col-md-6">
                <div class="card border border-light shadow-sm rounded-3 overflow-hidden bg-white">
                  <div class="card-header bg-danger-subtle border-0 py-2.5 px-3">
                    <span class="fw-bold text-danger small text-uppercase" style="letter-spacing: 0.3px;">
                      <i class="bi bi-x-circle-fill me-1"></i>
                      Potensi Hilang ({{ selectedReport.missingBarcodes?.length ?? 0 }})
                    </span>
                  </div>
                  <div class="p-2 border-bottom bg-light-subtle">
                    <input v-model="modalUnscannedSearch" type="text" class="form-control form-control-sm border-0 shadow-xs" placeholder="Cari barcode..." />
                  </div>
                  <div class="p-3 bg-white overflow-auto list-container" style="max-height: 250px;">
                    <div v-if="filteredModalMissingList.length === 0" class="text-center text-muted py-3 small">
                      Tidak ada barcode yang hilang.
                    </div>
                    <div class="d-flex flex-wrap gap-1.5" v-else>
                      <span v-for="bc in filteredModalMissingList" :key="bc" class="badge bg-danger-subtle text-danger border border-danger-subtle monospace py-1.5 px-2.5 rounded-2">
                        {{ bc }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card border border-light shadow-sm rounded-3 overflow-hidden bg-white">
                  <div class="card-header bg-success-subtle border-0 py-2.5 px-3">
                    <span class="fw-bold text-success small text-uppercase" style="letter-spacing: 0.3px;">
                      <i class="bi bi-check-circle-fill me-1"></i>
                      Fisik Valid ({{ selectedReport.scannedBarcodes?.length ?? 0 }})
                    </span>
                  </div>
                  <div class="p-2 border-bottom bg-light-subtle">
                    <input v-model="modalScannedSearch" type="text" class="form-control form-control-sm border-0 shadow-xs" placeholder="Cari barcode..." />
                  </div>
                  <div class="p-3 bg-white overflow-auto list-container" style="max-height: 250px;">
                    <div v-if="filteredModalScannedList.length === 0" class="text-center text-muted py-3 small">
                      Tidak ada barcode.
                    </div>
                    <div class="d-flex flex-wrap gap-1.5" v-else>
                      <span v-for="bc in filteredModalScannedList" :key="bc" class="badge bg-success-subtle text-success border border-success-subtle monospace py-1.5 px-2.5 rounded-2">
                        {{ bc }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2 border-0 bg-light-subtle">
            <button type="button" class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, nextTick } from "vue";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  limit, 
  startAfter, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";

const props = defineProps({
  cards: { type: Array, required: true },
  locations: { type: Array, required: true },
  colorTypes: { type: Array, required: true },
  colorLabels: { type: Object, required: true },
  halaTypes: { type: Array, required: true },
  halaLabels: { type: Object, required: true },
  staffOptions: { type: Array, default: () => [] }
});

const auth = useAuthStore();
const { toast } = useAlert();

// View Mode ('active' / 'history')
const viewMode = ref("active");

// Active Session Filters
const selectedCategory = ref("");
const selectedLocation = ref("");
const selectedSubType = ref("");

// Active Session Data
const registeredBarcodes = ref([]);
const scannedBarcodes = ref(new Set());
const scanInput = ref("");
const loading = ref(false);
const sessionActive = ref(false);
const scanInputRef = ref(null);

// Search Filters (Active Sesi)
const unscannedSearch = ref("");
const scannedSearch = ref("");

// Closing Session State
const closingPetugas = ref("");
const closingCatatan = ref("");
const submitting = ref(false);

// Scan Notification & Pulse Effect
const feedback = ref(null);
const pulseClass = ref("");

// History View State
const historyRecords = ref([]);
const loadingHistory = ref(false);
const historyCurrentPage = ref(1);
const historyHasMore = ref(false);
const historyPageSize = 10;
const historyPageDocs = ref([]);

// Modal Detail State
const detailModalRef = ref(null);
let opnameDetailModal = null;
const selectedReport = ref(null);
const modalUnscannedSearch = ref("");
const modalScannedSearch = ref("");

// Get Selected Card Details
const selectedCard = computed(() => {
  return props.cards.find(c => c.id === selectedCategory.value) || null;
});

const detailMode = computed(() => {
  if (!selectedCard.value) return "default";
  const mode = String(selectedCard.value.detailMode || "").trim().toLowerCase();
  if (mode === "color" || mode === "hala" || mode === "default") return mode;
  if (selectedCard.value.type === "color") return "color";
  if (selectedCard.value.type === "hala") return "hala";
  return "default";
});

const detailOptions = computed(() => {
  if (detailMode.value === "color") {
    return props.colorTypes.map(c => ({ key: c, label: props.colorLabels[c] || c }));
  }
  if (detailMode.value === "hala") {
    return props.halaTypes.map(h => ({ key: h, label: props.halaLabels[h] || h }));
  }
  return [];
});

const isFilterComplete = computed(() => {
  if (!selectedCategory.value || !selectedLocation.value) return false;
  if (detailMode.value !== "default" && !selectedSubType.value) return false;
  return true;
});

// Cache Keys scoped by Floor, Category, Location, SubType
const getSessionCacheKey = () => {
  const floor = String(auth.activeFloor || "").trim().toUpperCase();
  const cat = selectedCategory.value;
  const loc = selectedLocation.value;
  const sub = selectedSubType.value || "default";
  return `melati-opname:${floor}:${cat}:${loc}:${sub}`;
};

const saveSessionToCache = () => {
  const key = getSessionCacheKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({
    scanned: Array.from(scannedBarcodes.value),
    lastUpdated: new Date().toISOString()
  }));
};

const loadSessionFromCache = () => {
  const key = getSessionCacheKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.scanned)) {
        scannedBarcodes.value = new Set(parsed.scanned);
        return;
      }
    }
  } catch (e) {
    console.error("Failed to load opname cache", e);
  }
  scannedBarcodes.value = new Set();
};

const clearSessionCache = () => {
  const key = getSessionCacheKey();
  if (key) {
    localStorage.removeItem(key);
  }
};

// Auto Focus on active scan box
const focusInput = () => {
  nextTick(() => {
    setTimeout(() => {
      scanInputRef.value?.focus();
    }, 80);
  });
};

// Switch Tab to History
const switchToHistory = () => {
  viewMode.value = "history";
  historyPageDocs.value = [];
  fetchHistory(1);
};

// Fetch History Summaries from Firestore
const fetchHistory = async (pageNumber = 1) => {
  loadingHistory.value = true;
  try {
    let q = query(
      collection(db, "floors", auth.activeFloor, "barcodeStockOpnames"),
      orderBy("createdAt", "desc"),
      limit(historyPageSize)
    );

    if (pageNumber > 1 && historyPageDocs.value[pageNumber - 2]) {
      q = query(
        collection(db, "floors", auth.activeFloor, "barcodeStockOpnames"),
        orderBy("createdAt", "desc"),
        startAfter(historyPageDocs.value[pageNumber - 2]),
        limit(historyPageSize)
      );
    }

    const snaps = await getDocs(q);
    const records = [];
    snaps.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    historyRecords.value = records;
    historyHasMore.value = records.length === historyPageSize;
    historyCurrentPage.value = pageNumber;

    if (snaps.docs.length > 0) {
      historyPageDocs.value[pageNumber - 1] = snaps.docs[snaps.docs.length - 1];
    }
  } catch (e) {
    toast(`Gagal memuat riwayat: ${e.message}`, "danger");
    console.error(e);
  } finally {
    loadingHistory.value = false;
  }
};

// Fetch Barcodes from System
const startOpname = async () => {
  if (!isFilterComplete.value) return;
  loading.value = true;
  sessionActive.value = true;
  feedback.value = null;
  scannedBarcodes.value = new Set();
  registeredBarcodes.value = [];
  closingPetugas.value = "";
  closingCatatan.value = "";
  
  try {
    const cat = selectedCategory.value;
    const loc = selectedLocation.value;
    const subType = selectedSubType.value || null;

    let q;
    if (detailMode.value !== "default") {
      q = query(
        collection(db, "floors", auth.activeFloor, "barcodes"),
        where("category", "==", cat),
        where("location", "==", loc),
        where("detailType", "==", subType),
        orderBy("barcode", "asc")
      );
    } else {
      q = query(
        collection(db, "floors", auth.activeFloor, "barcodes"),
        where("category", "==", cat),
        where("location", "==", loc)
      );
    }

    const snaps = await getDocs(q);
    const items = [];
    snaps.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        barcode: data.barcode || doc.id,
        lastUpdated: data.lastUpdated || null
      });
    });

    if (detailMode.value === "default") {
      items.sort((a, b) => a.barcode.localeCompare(b.barcode));
    }

    registeredBarcodes.value = items;
    loadSessionFromCache();
    focusInput();
    toast(`Berhasil memuat ${items.length} data barcode sistem.`, "success");
  } catch (e) {
    toast(`Gagal memuat data: ${e.message}`, "danger");
    sessionActive.value = false;
  } finally {
    loading.value = false;
  }
};

// Scan / Input Submit Handler
const handleBarcodeSubmit = () => {
  const code = scanInput.value.trim().toUpperCase();
  scanInput.value = "";
  if (!code) return;

  const found = registeredBarcodes.value.find(item => item.barcode === code);

  if (found) {
    if (scannedBarcodes.value.has(code)) {
      setFeedback("warning", `Barcode ${code} sudah discan sebelumnya.`);
      triggerPulse("pulse-warning");
    } else {
      scannedBarcodes.value.add(code);
      saveSessionToCache();
      setFeedback("success", `Barcode ${code} terverifikasi valid.`);
      triggerPulse("pulse-success");
    }
  } else {
    setFeedback("danger", `Barcode ${code} tidak terdaftar di lokasi & jenis ini!`);
    triggerPulse("pulse-danger");
  }
  focusInput();
};

const triggerPulse = (cls) => {
  pulseClass.value = cls;
  setTimeout(() => {
    if (pulseClass.value === cls) {
      pulseClass.value = "";
    }
  }, 1000);
};

const setFeedback = (type, message) => {
  feedback.value = { type, message };
  // Auto clear feedback after 5 seconds to avoid clutter
  setTimeout(() => {
    if (feedback.value && feedback.value.message === message) {
      feedback.value = null;
    }
  }, 5000);
};

const feedbackClass = computed(() => {
  if (!feedback.value) return "";
  if (feedback.value.type === "success") return "bg-success-subtle text-success";
  if (feedback.value.type === "warning") return "bg-warning-subtle text-warning-emphasis";
  return "bg-danger-subtle text-danger";
});

const feedbackIcon = computed(() => {
  if (!feedback.value) return "";
  if (feedback.value.type === "success") return "bi-check-circle-fill";
  if (feedback.value.type === "warning") return "bi-exclamation-triangle-fill";
  return "bi-x-circle-fill";
});

// Undo scan in active audit
const undoScan = (bc) => {
  scannedBarcodes.value.delete(bc);
  saveSessionToCache();
  setFeedback("warning", `Batal memindai barcode ${bc}.`);
  focusInput();
};

// Reset Active Session
const confirmReset = async () => {
  const confirm = await Swal.fire({
    title: "Reset Sesi Stok Opname?",
    text: "Tindakan ini akan menghapus semua kemajuan fisik yang telah di-scan untuk kombinasi filter ini.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Reset",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d"
  });

  if (confirm.isConfirmed) {
    scannedBarcodes.value = new Set();
    clearSessionCache();
    feedback.value = null;
    toast("Sesi stok opname di-reset.", "info");
    focusInput();
  }
};

// Copy Unscanned to Clipboard
const copyUnscannedToClipboard = () => {
  const listText = unscannedList.value.map(item => item.barcode).join("\n");
  navigator.clipboard.writeText(listText).then(() => {
    toast("Semua barcode belum ter-scan berhasil disalin ke clipboard.", "success");
  }).catch(() => {
    toast("Gagal menyalin data ke clipboard.", "danger");
  });
};

// Export to CSV (Excel Friendly & Delimiter Safe)
const exportToCSV = () => {
  const missing = unscannedList.value.map(item => item.barcode);
  const valid = scannedList.value;

  let csvContent = "\uFEFF"; // Add UTF-8 BOM
  csvContent += `sep=,\n`; // Tells Excel that column delimiter is comma
  csvContent += `"LAPORAN HASIL STOK OPNAME BARCODE"\n`;
  csvContent += `"Tanggal Audit","${formatDate(new Date())}"\n`;
  csvContent += `"Jenis Barang (Kategori)","${selectedCategory.value}"\n`;
  csvContent += `"Lokasi Fisik","${getSubDocLabel(selectedLocation.value)}"\n`;
  csvContent += `"Klasifikasi","${selectedSubType.value ? getClassificationLabel(selectedCategory.value, selectedSubType.value) : '-'}"\n`;
  csvContent += `"Ringkasan Audit","Total Sistem: ${registeredBarcodes.value.length} | Valid (Fisik): ${scannedBarcodes.value.size} | Selisih: ${scannedBarcodes.value.size - registeredBarcodes.value.length}"\n`;
  csvContent += `\n`; // Empty line separator
  
  csvContent += `"Barcode","Status Opname"\n`;

  missing.forEach(bc => {
    csvContent += `"${bc}","BELUM SCAN / POTENSI HILANG"\n`;
  });
  valid.forEach(bc => {
    csvContent += `"${bc}","VALID / COCOK"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const encodedUri = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("download", `laporan_opname_${selectedCategory.value}_${selectedLocation.value}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast("Laporan CSV berhasil diunduh.", "success");
};

// Submit Audit Results to Firestore (Lazy Write)
const submitOpnameResult = async () => {
  if (!closingPetugas.value) {
    toast("Pilih petugas audit terlebih dahulu.", "warning");
    return;
  }

  const confirm = await Swal.fire({
    title: "Simpan Laporan Opname?",
    text: "Laporan hasil audit fisik ini akan disimpan secara permanen di database sistem.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Simpan",
    cancelButtonText: "Batal",
    confirmButtonColor: "#198754",
    cancelButtonColor: "#6c757d"
  });

  if (!confirm.isConfirmed) return;

  submitting.value = true;
  try {
    const docData = {
      createdAt: serverTimestamp(),
      createdBy: closingPetugas.value,
      category: selectedCategory.value,
      location: selectedLocation.value,
      detailType: selectedSubType.value || null,
      totalSistem: registeredBarcodes.value.length,
      totalFisik: scannedBarcodes.value.size,
      totalSelisih: scannedBarcodes.value.size - registeredBarcodes.value.length,
      missingBarcodes: unscannedList.value.map(item => item.barcode),
      scannedBarcodes: Array.from(scannedBarcodes.value),
      notes: closingCatatan.value.trim()
    };

    await addDoc(
      collection(db, "floors", auth.activeFloor, "barcodeStockOpnames"),
      docData
    );

    toast("Laporan stok opname berhasil disimpan.", "success");

    // Clear session cache
    clearSessionCache();

    // Reset local session state
    scannedBarcodes.value = new Set();
    registeredBarcodes.value = [];
    sessionActive.value = false;
    closingPetugas.value = "";
    closingCatatan.value = "";
    feedback.value = null;

    // Switch view mode to history
    switchToHistory();
  } catch (e) {
    toast(`Gagal menyimpan laporan: ${e.message}`, "danger");
    console.error(e);
  } finally {
    submitting.value = false;
  }
};

// Open Detail Modal from History Table
const openReportDetail = (report) => {
  selectedReport.value = report;
  modalUnscannedSearch.value = "";
  modalScannedSearch.value = "";

  if (!opnameDetailModal) {
    opnameDetailModal = Modal.getOrCreateInstance(detailModalRef.value);
  }
  opnameDetailModal.show();
};

// Filtered Lists for Modal Detail
const filteredModalMissingList = computed(() => {
  if (!selectedReport.value || !selectedReport.value.missingBarcodes) return [];
  const search = modalUnscannedSearch.value.trim().toUpperCase();
  if (!search) return selectedReport.value.missingBarcodes;
  return selectedReport.value.missingBarcodes.filter(bc => bc.includes(search));
});

const filteredModalScannedList = computed(() => {
  if (!selectedReport.value || !selectedReport.value.scannedBarcodes) return [];
  const search = modalScannedSearch.value.trim().toUpperCase();
  if (!search) return selectedReport.value.scannedBarcodes;
  return selectedReport.value.scannedBarcodes.filter(bc => bc.includes(search));
});

// Computed Lists & Counts for Active Sesi
const scannedBarcodesCount = computed(() => scannedBarcodes.value.size);
const unscannedBarcodesCount = computed(() => {
  return Math.max(0, registeredBarcodes.value.length - scannedBarcodes.value.size);
});
const progressPercent = computed(() => {
  if (registeredBarcodes.value.length === 0) return 0;
  return Math.round((scannedBarcodes.value.size / registeredBarcodes.value.length) * 100);
});

const unscannedList = computed(() => {
  return registeredBarcodes.value.filter(item => !scannedBarcodes.value.has(item.barcode));
});

const filteredUnscannedList = computed(() => {
  const search = unscannedSearch.value.trim().toUpperCase();
  if (!search) return unscannedList.value;
  return unscannedList.value.filter(item => item.barcode.includes(search));
});

const scannedList = computed(() => {
  return Array.from(scannedBarcodes.value).sort();
});

const filteredScannedList = computed(() => {
  const search = scannedSearch.value.trim().toUpperCase();
  if (!search) return scannedList.value;
  return scannedList.value.filter(bc => bc.includes(search));
});

// Watch Active Filters to auto reset session on change
const resetFilters = () => {
  sessionActive.value = false;
  registeredBarcodes.value = [];
  scannedBarcodes.value = new Set();
  feedback.value = null;
  unscannedSearch.value = "";
  scannedSearch.value = "";
  closingPetugas.value = "";
  closingCatatan.value = "";
};

watch(selectedCategory, () => {
  selectedSubType.value = "";
  resetFilters();
});
watch(selectedLocation, resetFilters);
watch(selectedSubType, resetFilters);

// Formatting Helpers
function formatDate(value) {
  if (!value) return "-";
  let d;
  if (value && typeof value.toDate === "function") d = value.toDate();
  else d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getSubDocLabel(key) {
  const map = {
    'brankas': 'Stok Brankas',
    'posting': 'Belum Posting',
    'barang-display': 'Display',
    'barang-rusak': 'Rusak',
    'batu-lepas': 'Batu Lepas',
    'manual': 'Manual',
    'admin': 'Admin',
    'DP': 'DP',
    'lainnya': 'Lainnya',
    'mutasi': 'Mutasi',
    'laku': 'Terjual',
    'any': 'Mutasi Cepat'
  };
  return map[key] || key;
}

function getClassificationLabel(category, key) {
  const card = props.cards.find(c => c.id === category);
  if (!card) return key;
  const mode = String(card.detailMode || "").trim().toLowerCase();
  if (mode === "color" || card.type === "color") {
    return props.colorLabels[key] || key;
  }
  if (mode === "hala" || card.type === "hala") {
    return props.halaLabels[key] || key;
  }
  return key;
}
</script>

<style scoped>
.icon-box {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-light-warning {
  background-color: rgba(255, 193, 7, 0.12);
}
.stat-card {
  border: none;
  min-height: 90px;
}
.bg-light-primary {
  background-color: rgba(63, 55, 201, 0.08) !important;
}
.bg-light-success {
  background-color: rgba(25, 135, 84, 0.08) !important;
}
.bg-light-danger {
  background-color: rgba(220, 53, 69, 0.08) !important;
}
.border-start-primary {
  border-left: 4px solid #3f37c9 !important;
}
.border-start-success {
  border-left: 4px solid #198754 !important;
}
.border-start-danger {
  border-left: 4px solid #dc3545 !important;
}
.fw-extrabold {
  font-weight: 800;
}
.monospace {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.segmented-control {
  background-color: #f1f3f5 !important;
  border: 1px solid #e9ecef;
}
.segmented-btn {
  background: transparent;
  color: #6c757d;
  transition: all 0.2s ease;
}
.segmented-btn.active {
  color: #3f37c9 !important;
}
.input-group-glow {
  transition: all 0.3s ease;
  border-radius: 50rem;
  overflow: hidden;
}
.input-group-glow input:focus {
  box-shadow: none;
}
.input-group-glow input::placeholder {
  font-size: 0.88rem;
}
.pulse-success {
  box-shadow: 0 0 0 4px rgba(25, 135, 84, 0.25);
  border-color: #198754 !important;
}
.pulse-warning {
  box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.3);
  border-color: #ffc107 !important;
}
.pulse-danger {
  box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.25);
  border-color: #dc3545 !important;
}
.list-container::-webkit-scrollbar {
  width: 5px;
}
.list-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}
.list-item-hover {
  transition: background-color 0.15s ease;
}
.list-item-hover:hover {
  background-color: rgba(0, 0, 0, 0.015) !important;
}
.custom-select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
}
.fs-7 {
  font-size: 0.8rem;
}
.fs-8 {
  font-size: 0.72rem;
}
.font-xs {
  font-size: 0.7rem;
}
.shadow-xs {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.btn-xs {
  padding: 2.5px 10px;
  font-size: 0.75rem;
}
</style>
