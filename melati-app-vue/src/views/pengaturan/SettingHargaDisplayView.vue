<template>
  <div class="container-fluid py-3">
    <!-- Header -->
    <div class="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h4 class="fw-bold mb-0">
          <i class="bi bi-tags me-2 text-warning"></i>
          Setting Display Harga Emas
        </h4>
        <div class="small text-muted mt-1">
          Pengaturan global untuk tampilan Harga Emas Hari Ini, Mode Tema (Dark/Light), Running Text Promosi, dan Audit Log Riwayat Harga.
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <a href="#section-riwayat" class="btn btn-outline-secondary btn-sm fw-semibold">
          <i class="bi bi-clock-history me-1 text-primary"></i>
          Lihat Riwayat Perubahan
        </a>
        <router-link to="/promosi/display-harga" target="_blank" class="btn btn-primary btn-sm fw-semibold">
          <i class="bi bi-tv me-1"></i>
          Buka Display Harga Emas
        </router-link>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="small text-muted mt-2">Memuat data pengaturan harga...</div>
    </div>

    <div v-else class="row g-3">
      <!-- Section 1: Pilihan Tema Display (Dark vs Light) -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="bg-white px-3 py-2 fw-semibold border-bottom d-flex align-items-center">
            <i class="bi bi-palette me-2 text-primary"></i>
            <span>Pilihan Mode Tema</span>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <!-- Dark Luxury Option -->
              <div class="col-sm-6 col-12">
                <div
                  :class="[
                    'theme-select-card p-3 rounded-3 border cursor-pointer h-100 transition-all',
                    form.theme === 'dark' ? 'active border-warning shadow-sm' : 'border-secondary-subtle'
                  ]"
                  @click="form.theme = 'dark'"
                >
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="fs-4">🌙</span>
                      <div>
                        <div class="fw-bold text-dark">Dark Mode</div>
                      </div>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="themeRadio"
                        value="dark"
                        v-model="form.theme"
                      />
                    </div>
                  </div>
                  <!-- Preview Box -->
                  <div class="theme-preview-box dark-preview p-2.5 rounded-2 mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="badge bg-gold-tag">18K (75%)</span>
                      <span class="text-gold-light fw-bold small">Rp 2.125.000</span>
                      <span class="badge bg-purple-badge">BRANDED</span>
                    </div>
                    <div class="small text-gold-muted text-center" style="font-size: 10px;">
                      ✦ HARGA EMAS HARI INI • MELATI GOLD SHOP
                    </div>
                  </div>
                </div>
              </div>

              <!-- Light Editorial Option -->
              <div class="col-sm-6 col-12">
                <div
                  :class="[
                    'theme-select-card p-3 rounded-3 border cursor-pointer h-100 transition-all',
                    form.theme === 'light' ? 'active border-warning shadow-sm' : 'border-secondary-subtle'
                  ]"
                  @click="form.theme = 'light'"
                >
                  <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="d-flex align-items-center gap-2">
                      <span class="fs-4">☀️</span>
                      <div>
                        <div class="fw-bold text-dark">Light Mode</div>
                      </div>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="themeRadio"
                        value="light"
                        v-model="form.theme"
                      />
                    </div>
                  </div>
                  <!-- Preview Box -->
                  <div class="theme-preview-box light-preview p-2.5 rounded-2 mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="badge bg-gold-tag-light">18K (75%)</span>
                      <span class="text-dark fw-bold small">Rp 2.125.000</span>
                      <span class="badge bg-purple-badge">BRANDED</span>
                    </div>
                    <div class="small text-stone-muted text-center" style="font-size: 10px;">
                      ✦ HARGA EMAS HARI INI • MELATI GOLD SHOP
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Pengaturan Header & Tagline Display -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="bg-white px-3 py-2 fw-semibold border-bottom d-flex align-items-center">
            <i class="bi bi-layout-text-window-reverse me-2 text-primary"></i>
            <span>Judul & Teks Header Display</span>
          </div>
          <div class="card-body">
            <div class="row g-2.5">
              <div class="col-12">
                <label class="form-label small fw-bold">Judul Utama Display</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: HARGA EMAS HARI INI"
                />
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold">Subjudul / Nama Toko</label>
                <input
                  v-model="form.subtitle"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: Melati Gold Shop"
                />
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold">Tagline Slogan</label>
                <input
                  v-model="form.tagline"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Contoh: Transparan • Harga dan Kualitas terbaik"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Daftar Harga Per Kadar -->
      <div class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2.5 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold text-dark">
              <i class="bi bi-gem me-2 text-warning"></i>
              Daftar Kadar & Harga per Gram
            </div>
            <button class="btn btn-outline-primary btn-sm fw-semibold" @click="addKadar">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Kadar
            </button>
          </div>
          <div class="card-body p-0">
            <div v-if="form.items.length === 0" class="text-center py-4 text-muted small">
              Belum ada kadar yang ditambahkan. Klik <strong>Tambah Kadar</strong> di atas.
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover table-bordered align-middle mb-0 setting-price-table">
                <thead class="table-light small text-secondary">
                  <tr>
                    <th style="width: 48px;" class="text-center">No</th>
                    <th style="width: 140px;">Kadar</th>
                    <th style="width: 110px;" class="text-center">Branded</th>
                    <th style="min-width: 190px;">Harga Jual Normal</th>
                    <th class="purple-header-th" style="min-width: 200px;">Harga Jual Branded</th>
                    <th class="buyback-header-th" style="min-width: 190px;">Buyback Customer</th>
                    <th style="width: 110px;" class="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in form.items" :key="item.id || idx">
                    <!-- Order / Index -->
                    <td class="text-center text-muted small fw-bold">{{ idx + 1 }}</td>

                    <!-- Kadar Name -->
                    <td>
                      <input
                        v-model="item.kadar"
                        type="text"
                        class="form-control form-control-sm fw-bold"
                        placeholder="e.g. 18K"
                      />
                    </td>

                    <!-- Toggle Branded -->
                    <td class="text-center">
                      <div class="form-check form-switch d-inline-block">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          role="switch"
                          :id="`branded-switch-${idx}`"
                          v-model="item.hasBranded"
                        />
                        <label class="form-check-label small ms-1" :for="`branded-switch-${idx}`">
                          {{ item.hasBranded ? 'Ada' : 'Tidak' }}
                        </label>
                      </div>
                    </td>

                    <!-- Harga Jual Normal -->
                    <td>
                      <div class="input-group input-group-sm">
                        <span class="input-group-text bg-light text-muted">Rp</span>
                        <input
                          v-model.number="item.hargaNormal"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control font-monospace"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-muted mt-1 font-monospace">
                        {{ formatRupiah(item.hargaNormal) }}
                      </div>
                    </td>

                    <!-- Harga Jual Branded (PURPLE STYLING) -->
                    <td :class="['purple-cell-td', { 'disabled-cell': !item.hasBranded }]">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text purple-addon">Rp</span>
                        <input
                          v-model.number="item.hargaBranded"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control purple-input font-monospace"
                          :disabled="!item.hasBranded"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-purple-dark fw-semibold mt-1 font-monospace">
                        <span v-if="item.hasBranded">{{ formatRupiah(item.hargaBranded) }}</span>
                        <span v-else class="text-muted fst-italic">Nonaktif</span>
                      </div>
                    </td>

                    <!-- Harga Buyback -->
                    <td class="buyback-cell-td">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text text-success bg-success-subtle border-success-subtle fw-semibold">Rp</span>
                        <input
                          v-model.number="item.hargaBuyback"
                          type="number"
                          min="0"
                          step="1000"
                          class="form-control border-success-subtle font-monospace text-success fw-semibold"
                          placeholder="0"
                        />
                      </div>
                      <div class="small text-success fw-semibold mt-1 font-monospace">
                        {{ formatRupiah(item.hargaBuyback) }}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td class="text-center">
                      <div class="btn-group btn-group-sm">
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          :disabled="idx === 0"
                          @click="moveKadarUp(idx)"
                          title="Naikkan"
                        >
                          <i class="bi bi-arrow-up"></i>
                        </button>
                        <button
                          class="btn btn-outline-secondary btn-sm"
                          :disabled="idx === form.items.length - 1"
                          @click="moveKadarDown(idx)"
                          title="Turunkan"
                        >
                          <i class="bi bi-arrow-down"></i>
                        </button>
                        <button
                          class="btn btn-outline-danger btn-sm"
                          @click="removeKadar(idx)"
                          title="Hapus"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Running Ticker (Pesan Berjalan Promosi) -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold">
              <i class="bi bi-megaphone me-2 text-warning"></i>
              Pesan Running Ticker (Teks Berjalan)
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="addTicker">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Pesan Ticker
            </button>
          </div>
          <div class="card-body">
            <div class="small text-muted mb-2">
              Teks ini akan bergerak mendatar pada pita ticker di layar TV di bawah judul utama.
            </div>
            <div v-if="!form.tickerMessages || form.tickerMessages.length === 0" class="text-muted small fst-italic">
              Belum ada pesan ticker. Klik tombol "Tambah Pesan Ticker".
            </div>
            <div v-for="(msg, tIdx) in form.tickerMessages" :key="tIdx" class="input-group input-group-sm mb-2">
              <span class="input-group-text bg-light text-muted">✦ {{ tIdx + 1 }}</span>
              <input
                v-model="form.tickerMessages[tIdx]"
                type="text"
                class="form-control"
                placeholder="Contoh: MENYEDIAKAN PERHIASAN MODEL TERBARU YANG ELEGAN DAN STYLISH"
              />
              <button class="btn btn-outline-danger" @click="removeTicker(tIdx)" title="Hapus pesan">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 5: Catatan & Disclaimer Footer -->
      <div class="col-12 col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between border-bottom">
            <div class="fw-semibold">
              <i class="bi bi-info-circle me-2 text-info"></i>
              Catatan & Syarat Ketentuan Buyback
            </div>
            <button class="btn btn-outline-secondary btn-sm" @click="addNote">
              <i class="bi bi-plus-circle me-1"></i>
              Tambah Catatan
            </button>
          </div>
          <div class="card-body">
            <div v-for="(note, nIdx) in form.notes" :key="nIdx" class="input-group input-group-sm mb-2">
              <span class="input-group-text bg-light text-muted">{{ nIdx + 1 }}</span>
              <input
                v-model="form.notes[nIdx]"
                type="text"
                class="form-control"
                placeholder="Tulis catatan atau syarat buyback..."
              />
              <button class="btn btn-outline-danger" @click="removeNote(nIdx)" title="Hapus catatan">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Save Action -->
      <div class="col-12 text-end mt-2">
        <button class="btn btn-success fw-semibold px-4 py-2 shadow-sm" :disabled="saving" @click="openSaveConfirmModal">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan Pengaturan Display
        </button>
      </div>

      <!-- Section 6: Riwayat Perubahan Harga (Audit Log) -->
      <div class="col-12 mt-4" id="section-riwayat">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <div class="fw-bold fs-6 d-flex align-items-center gap-2">
                <i class="bi bi-clock-history text-primary"></i>
                <span>Riwayat & Audit Log Perubahan Harga</span>
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                  {{ filteredHistory.length }} Catatan
                </span>
              </div>
              <div class="small text-muted mt-0.5">
                Audit lengkap perubahan harga per gram.
              </div>
            </div>
            <div v-if="lastAuditTime" class="text-muted small">
              Terakhir update: <strong class="text-dark">{{ formatDateTime(lastAuditTime) }}</strong>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="bg-light-subtle px-3 py-2 border-bottom">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-md-6">
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-white border-end-0">
                    <i class="bi bi-search text-muted"></i>
                  </span>
                  <input
                    v-model="historySearch"
                    type="text"
                    class="form-control border-start-0"
                    placeholder="Cari kadar (e.g. 18K)..."
                  />
                  <button 
                    v-if="historySearch" 
                    class="btn btn-outline-secondary border-start-0" 
                    @click="historySearch = ''"
                  >
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
              <div class="col-12 col-md-3">
                <select v-model="historyDateFilter" class="form-select form-select-sm">
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card-body p-0">
            <!-- Loading State -->
            <div v-if="loadingHistory" class="text-center py-5 text-muted">
              <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
              <div class="small">Mengambil data riwayat harga...</div>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredHistory.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-journal-x fs-1 opacity-50 d-block mb-2 text-secondary"></i>
              <div class="fw-semibold">Belum Ada Riwayat Perubahan</div>
              <div class="small text-muted mt-1">
                {{ historySearch ? 'Tidak ditemukan riwayat yang sesuai dengan filter pencarian.' : 'Setiap kali harga disimpan atau diubah, log perubahan harga awal dan akhir akan tercatat di sini secara otomatis.' }}
              </div>
            </div>

            <!-- History List Cards -->
            <div v-else class="history-list-wrapper">
              <div 
                v-for="(log, lIdx) in filteredHistory" 
                :key="log.id || lIdx"
                class="history-card border-bottom p-3"
              >
                <!-- Log Header Bar -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2.5">
                  <div class="d-flex align-items-center flex-wrap gap-2">
                    <span class="badge bg-dark-subtle text-dark border px-2 py-1 fw-bold d-inline-flex align-items-center gap-2">
                      <i class="bi bi-calendar3 text-dark"></i>
                      {{ formatDateTime(log.timestamp) }}
                    </span>
                  </div>

                  <div>
                    <button 
                      class="btn btn-outline-secondary btn-sm border fw-semibold py-1 px-2 mb-2"
                      @click="openDetailSnapshotModal(log)"
                      title="Lihat seluruh daftar harga pada saat ini"
                    >
                      <i class="bi bi-eye me-1"></i>
                      Lihat Snapshot Lengkap
                    </button>
                  </div>
                </div>

                <!-- Table of Price Changes (Awal -> Akhir -> Diff) -->
                <div v-if="log.changes && log.changes.length > 0" class="table-responsive rounded-2 border bg-white">
                  <table class="table table-sm table-bordered table-hover align-middle mb-0 history-diff-table">
                    <thead class="table-light small text-secondary">
                      <tr>
                        <th class="text-center" style="width: 100px;">Kadar</th>
                        <th class="text-center" style="width: 90px;">Status</th>
                        <th style="width: 28%;">Harga Jual Normal</th>
                        <th class="purple-diff-th" style="width: 30%;">Harga Jual Branded</th>
                        <th class="buyback-diff-th" style="width: 28%;">Buyback Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(chg, cIdx) in log.changes" :key="cIdx">
                        <!-- Kadar Badge -->
                        <td class="text-center">
                          <span class="badge bg-dark fw-bold font-monospace px-2 py-1">
                            {{ chg.kadar }}
                          </span>
                        </td>

                        <!-- Change Type Badge -->
                        <td class="text-center">
                          <span v-if="chg.type === 'added'" class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            <i class="bi bi-plus-circle me-1"></i>Baru
                          </span>
                          <span v-else-if="chg.type === 'removed'" class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                            <i class="bi bi-dash-circle me-1"></i>Dihapus
                          </span>
                          <span v-else class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                            <i class="bi bi-pencil me-1"></i>Ubah
                          </span>
                        </td>

                        <!-- Harga Normal Diff -->
                        <td class="px-3">
                          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-1.5 font-monospace">
                              <span class="text-muted text-decoration-line-through small">
                                {{ formatRupiah(chg.hargaNormal?.before) }}
                              </span>
                              <i class="bi bi-arrow-right text-secondary small"></i>
                              <span class="fw-bold text-dark">
                                {{ formatRupiah(chg.hargaNormal?.after) }}
                              </span>
                            </div>
                            <span 
                              v-if="chg.hargaNormal?.diff !== 0" 
                              :class="['badge diff-badge font-monospace', chg.hargaNormal?.diff > 0 ? 'bg-success text-white' : 'bg-danger text-white']"
                            >
                              {{ formatDiff(chg.hargaNormal?.diff) }}
                            </span>
                          </div>
                        </td>

                        <!-- Harga Branded Diff -->
                        <td class="purple-diff-td px-3">
                          <div v-if="chg.hasBranded?.after || chg.hasBranded?.before" class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-1.5 font-monospace">
                              <span class="text-muted text-decoration-line-through small" v-if="chg.hasBranded?.before">
                                {{ formatRupiah(chg.hargaBranded?.before) }}
                              </span>
                              <span class="text-muted small fst-italic" v-else>Nonaktif</span>

                              <i class="bi bi-arrow-right text-secondary small"></i>

                              <span class="fw-bold text-purple-dark" v-if="chg.hasBranded?.after">
                                {{ formatRupiah(chg.hargaBranded?.after) }}
                              </span>
                              <span class="text-muted small fst-italic" v-else>Nonaktif</span>
                            </div>

                            <span 
                              v-if="chg.hasBranded?.after && chg.hasBranded?.before && chg.hargaBranded?.diff !== 0" 
                              :class="['badge diff-badge font-monospace', chg.hargaBranded?.diff > 0 ? 'bg-success text-white' : 'bg-danger text-white']"
                            >
                              {{ formatDiff(chg.hargaBranded?.diff) }}
                            </span>
                          </div>
                          <div v-else class="text-muted small fst-italic">
                            Nonaktif
                          </div>
                        </td>

                        <!-- Buyback Diff -->
                        <td class="buyback-diff-td px-3">
                          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-1.5 font-monospace">
                              <span class="text-muted text-decoration-line-through small">
                                {{ formatRupiah(chg.hargaBuyback?.before) }}
                              </span>
                              <i class="bi bi-arrow-right text-secondary small"></i>
                              <span class="fw-bold text-success">
                                {{ formatRupiah(chg.hargaBuyback?.after) }}
                              </span>
                            </div>
                            <span 
                              v-if="chg.hargaBuyback?.diff !== 0" 
                              :class="['badge diff-badge font-monospace', chg.hargaBuyback?.diff > 0 ? 'bg-success text-white' : 'bg-danger text-white']"
                            >
                              {{ formatDiff(chg.hargaBuyback?.diff) }}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Non-price changes summary if no item price changed -->
                <div v-else class="small text-muted fst-italic bg-light p-2 rounded">
                  <i class="bi bi-info-circle me-1 text-primary"></i>
                  Pengaturan display disimpan (tema, judul, atau running text disesuaikan).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Simpan Pengaturan Display -->
    <AppModal
      v-model="showSaveConfirmModal"
      title="Konfirmasi Simpan Pengaturan Display"
      size="lg"
    >
      <div>
        <div class="mb-2">
          <p class="text-muted small mb-2">
            Periksa ringkasan perubahan harga emas di bawah sebelum menyimpan ke server:
          </p>

          <!-- Realtime Change Preview -->
          <div v-if="pendingPriceChanges.length > 0" class="border rounded-2 p-2 bg-light">
            <div class="fw-bold text-dark small mb-2 d-flex align-items-center gap-1.5">
              <i class="bi bi-exclamation-triangle-fill text-warning"></i>
              <span>Terdeteksi {{ pendingPriceChanges.length }} perubahan harga kadar:</span>
            </div>
            <div class="table-responsive bg-white rounded border">
              <table class="table table-sm table-bordered table-hover align-middle mb-0 font-sm preview-diff-table">
                <thead class="table-light small text-secondary">
                  <tr>
                    <th class="text-center" style="width: 90px;">Kadar</th>
                    <th>Harga Jual Normal</th>
                    <th class="purple-diff-th">Harga Jual Branded</th>
                    <th class="buyback-diff-th">Buyback Customer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, pIdx) in pendingPriceChanges" :key="pIdx">
                    <td class="text-center">
                      <span class="badge bg-dark fw-bold font-monospace px-2 py-1">{{ p.kadar }}</span>
                    </td>
                    <td class="font-monospace">
                      <div class="d-flex align-items-center gap-1.5">
                        <span class="text-muted small text-decoration-line-through">{{ formatRupiah(p.hargaNormal?.before) }}</span>
                        <i class="bi bi-arrow-right text-secondary small"></i>
                        <strong class="text-dark">{{ formatRupiah(p.hargaNormal?.after) }}</strong>
                      </div>
                    </td>
                    <td class="purple-diff-td font-monospace">
                      <div v-if="p.hasBranded?.after" class="d-flex align-items-center gap-1.5">
                        <span v-if="p.hasBranded?.before" class="text-muted small text-decoration-line-through">{{ formatRupiah(p.hargaBranded?.before) }}</span>
                        <i v-if="p.hasBranded?.before" class="bi bi-arrow-right text-secondary small"></i>
                        <strong class="text-purple-dark">{{ formatRupiah(p.hargaBranded?.after) }}</strong>
                      </div>
                      <span v-else class="text-muted fst-italic small">Nonaktif</span>
                    </td>
                    <td class="buyback-diff-td font-monospace">
                      <div class="d-flex align-items-center gap-1.5">
                        <span class="text-muted small text-decoration-line-through">{{ formatRupiah(p.hargaBuyback?.before) }}</span>
                        <i class="bi bi-arrow-right text-secondary small"></i>
                        <strong class="text-success">{{ formatRupiah(p.hargaBuyback?.after) }}</strong>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="alert alert-secondary py-2 small mb-0">
            <i class="bi bi-info-circle me-1"></i>
            Tidak ada perubahan nominal harga kadar emas. Hanya pengaturan umum (tema/judul/running text) yang akan disimpan.
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="showSaveConfirmModal = false">
          Batal
        </button>
        <button 
          type="button" 
          class="btn btn-success btn-sm fw-semibold px-3" 
          :disabled="saving"
          @click="confirmSaveSettings"
        >
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check2-circle me-1"></i>
          Ya, Simpan Perubahan
        </button>
      </template>
    </AppModal>

    <!-- Modal Detail Snapshot Lengkap -->
    <AppModal
      v-model="showSnapshotModal"
      title="Snapshot Lengkap Harga Display"
      size="lg"
    >
      <div v-if="selectedSnapshotLog">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 p-2.5 bg-light rounded-2 mb-3">
          <div>
            <div class="fw-bold text-dark">
              <i class="bi bi-clock-history text-primary me-1"></i>
              {{ formatDateTime(selectedSnapshotLog.timestamp) }}
            </div>
          </div>
        </div>

        <div class="fw-semibold small mb-2 text-secondary">
          <i class="bi bi-gem me-1 text-warning"></i>
          Kondisi Daftar Harga Pada Saat Log Dibuat (Snapshot Sesudah Perubahan):
        </div>

        <div class="table-responsive border rounded-2">
          <table class="table table-bordered table-hover align-middle mb-0 table-sm snapshot-table">
            <thead class="table-light small text-secondary">
              <tr>
                <th style="width: 48px;" class="text-center">No</th>
                <th style="width: 120px;" class="text-center">Kadar</th>
                <th style="width: 100px;" class="text-center">Branded</th>
                <th>Harga Jual Normal</th>
                <th class="purple-header-th">Harga Jual Branded</th>
                <th class="buyback-header-th">Buyback Customer</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(it, iIdx) in (selectedSnapshotLog.snapshotAfter || [])" 
                :key="iIdx"
              >
                <td class="text-center text-muted small fw-bold">{{ iIdx + 1 }}</td>
                <td class="text-center">
                  <span class="badge bg-dark fw-bold font-monospace px-2 py-1">{{ it.kadar }}</span>
                </td>
                <td class="text-center">
                  <span v-if="it.hasBranded" class="badge bg-purple-badge">ADA</span>
                  <span v-else class="badge bg-light text-muted border">TIDAK</span>
                </td>
                <td class="fw-semibold text-dark font-monospace">{{ formatRupiah(it.hargaNormal) }}</td>
                <td class="purple-cell-td fw-semibold text-purple-dark font-monospace">
                  {{ it.hasBranded ? formatRupiah(it.hargaBranded) : '-' }}
                </td>
                <td class="buyback-cell-td fw-semibold text-success font-monospace">{{ formatRupiah(it.hargaBuyback) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-secondary btn-sm" @click="showSnapshotModal = false">
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";
import { 
  DEFAULT_HARGA_DISPLAY_SETTINGS, 
  fetchHargaDisplaySettings, 
  saveHargaDisplaySettings,
  fetchHargaDisplayHistory,
  calculateHargaDiff
} from "@/services/harga-display-service";

const { toast, error: showError } = useAlert();

const loading = ref(true);
const saving = ref(false);
const loadingHistory = ref(false);

const initialLoadedData = ref(null);
const historyList = ref([]);
const historySearch = ref("");
const historyDateFilter = ref("all"); // 'all' | 'today' | '7days' | '30days'

const showSaveConfirmModal = ref(false);
const pendingPriceChanges = ref([]);

const showSnapshotModal = ref(false);
const selectedSnapshotLog = ref(null);

const form = ref({
  theme: DEFAULT_HARGA_DISPLAY_SETTINGS.theme,
  title: DEFAULT_HARGA_DISPLAY_SETTINGS.title,
  subtitle: DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle,
  tagline: DEFAULT_HARGA_DISPLAY_SETTINGS.tagline,
  tickerMessages: [...DEFAULT_HARGA_DISPLAY_SETTINGS.tickerMessages],
  items: [],
  notes: [],
});

function formatRupiah(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDiff(diff) {
  if (diff === 0 || diff === undefined || diff === null) return "0";
  const isPositive = diff > 0;
  const formatted = formatRupiah(Math.abs(diff));
  return isPositive ? `+${formatted}` : `-${formatted}`;
}

function formatDateTime(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

const lastAuditTime = computed(() => {
  if (!historyList.value || historyList.value.length === 0) return null;
  return historyList.value[0]?.timestamp || null;
});

const filteredHistory = computed(() => {
  let list = historyList.value || [];

  // Filter by Date
  if (historyDateFilter.value !== "all") {
    const now = Date.now();
    list = list.filter((item) => {
      if (!item.timestamp) return false;
      const itemTime = new Date(item.timestamp).getTime();
      if (isNaN(itemTime)) return true;
      const diffHours = (now - itemTime) / (1000 * 60 * 60);

      if (historyDateFilter.value === "today") {
        const itemDate = new Date(item.timestamp).toDateString();
        return itemDate === new Date().toDateString();
      } else if (historyDateFilter.value === "7days") {
        return diffHours <= 24 * 7;
      } else if (historyDateFilter.value === "30days") {
        return diffHours <= 24 * 30;
      }
      return true;
    });
  }

  // Filter by Search text (kadar)
  if (historySearch.value.trim()) {
    const q = historySearch.value.trim().toLowerCase();
    list = list.filter((item) => {
      return (item.changes || []).some((c) =>
        String(c.kadar || "").toLowerCase().includes(q)
      );
    });
  }

  return list;
});

function addKadar() {
  form.value.items.push({
    id: `kadar-${Date.now()}`,
    kadar: "",
    hasBranded: false,
    hargaNormal: 1000000,
    hargaBranded: 0,
    hargaBuyback: 850000,
  });
}

function removeKadar(idx) {
  form.value.items.splice(idx, 1);
}

function moveKadarUp(idx) {
  if (idx <= 0) return;
  const temp = form.value.items[idx];
  form.value.items[idx] = form.value.items[idx - 1];
  form.value.items[idx - 1] = temp;
}

function moveKadarDown(idx) {
  if (idx >= form.value.items.length - 1) return;
  const temp = form.value.items[idx];
  form.value.items[idx] = form.value.items[idx + 1];
  form.value.items[idx + 1] = temp;
}

function addTicker() {
  if (!form.value.tickerMessages) form.value.tickerMessages = [];
  form.value.tickerMessages.push("");
}

function removeTicker(idx) {
  form.value.tickerMessages.splice(idx, 1);
}

function addNote() {
  form.value.notes.push("");
}

function removeNote(idx) {
  form.value.notes.splice(idx, 1);
}

async function loadData() {
  loading.value = true;
  try {
    const data = await fetchHargaDisplaySettings();
    initialLoadedData.value = JSON.parse(JSON.stringify(data));
    form.value = {
      theme: data.theme || "dark",
      title: data.title || DEFAULT_HARGA_DISPLAY_SETTINGS.title,
      subtitle: data.subtitle || DEFAULT_HARGA_DISPLAY_SETTINGS.subtitle,
      tagline: data.tagline || DEFAULT_HARGA_DISPLAY_SETTINGS.tagline,
      tickerMessages: (data.tickerMessages || []).map((t) => t),
      items: (data.items || []).map((item) => ({ ...item })),
      notes: (data.notes || []).map((note) => note),
    };
    await loadHistory();
  } catch (err) {
    showError("Gagal memuat pengaturan", err.message);
  } finally {
    loading.value = false;
  }
}

async function loadHistory() {
  loadingHistory.value = true;
  try {
    const list = await fetchHargaDisplayHistory(50);
    historyList.value = list;
  } catch (err) {
    console.error("Gagal memuat riwayat harga:", err);
  } finally {
    loadingHistory.value = false;
  }
}

function openSaveConfirmModal() {
  const previousItems = initialLoadedData.value?.items || [];
  const changes = calculateHargaDiff(previousItems, form.value.items || []);
  pendingPriceChanges.value = changes;
  showSaveConfirmModal.value = true;
}

async function confirmSaveSettings() {
  saving.value = true;
  try {
    await saveHargaDisplaySettings(form.value);
    showSaveConfirmModal.value = false;
    toast("Pengaturan Display Harga Emas & Audit Log berhasil disimpan");
    await loadData();
  } catch (err) {
    showError("Gagal menyimpan pengaturan", err.message);
  } finally {
    saving.value = false;
  }
}

function openDetailSnapshotModal(log) {
  selectedSnapshotLog.value = log;
  showSnapshotModal.value = true;
}

onMounted(loadData);
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

.theme-select-card {
  background: #ffffff;
  border-width: 2px !important;
}

.theme-select-card:hover {
  transform: translateY(-2px);
}

.theme-select-card.active {
  border-color: #d4af37 !important;
  background-color: #fffdf7;
}

/* Theme Preview Boxes */
.theme-preview-box {
  border-radius: 8px;
  font-family: inherit;
}

.dark-preview {
  background: radial-gradient(circle at 50% 12%, #141724 0%, #090A0F 100%);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.light-preview {
  background: radial-gradient(circle at 50% 8%, #FFFFFF 0%, #FAF8F5 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.bg-gold-tag {
  background-color: #d4af37;
  color: #1a1500;
  font-weight: 700;
}

.bg-gold-tag-light {
  background-color: #f5eed8;
  color: #7a5b10;
  border: 1px solid #dfca86;
  font-weight: 700;
}

.bg-purple-badge {
  background-color: #5b1e8a;
  color: #ffffff;
  font-size: 9px;
  letter-spacing: 0.5px;
}

.text-gold-light {
  color: #fce788;
}

.text-gold-muted {
  color: #dfca86;
  opacity: 0.8;
}

.text-stone-muted {
  color: #78716c;
}

/* PURPLE BACKGROUND STYLING FOR BRANDED HEADER AND CELLS */
.purple-header-th {
  background-color: #6b21a8 !important;
  color: #ffffff !important;
  border-bottom: 2px solid #a855f7 !important;
}

.purple-cell-td {
  background-color: #fcf8ff !important;
}

.purple-cell-td.disabled-cell {
  background-color: #faf5ff !important;
  opacity: 0.7;
}

.purple-addon {
  background-color: #6b21a8;
  color: #ffffff;
  border-color: #7e22ce;
  font-weight: 600;
}

.purple-input {
  border-color: #a855f7;
  font-weight: 600;
  color: #4c1d95;
}

.purple-input:focus {
  border-color: #7e22ce;
  box-shadow: 0 0 0 0.25rem rgba(126, 34, 206, 0.25);
}

.text-purple-dark {
  color: #581c87;
}

/* BUYBACK STYLING */
.buyback-header-th {
  background-color: #15803d !important;
  color: #ffffff !important;
}

.buyback-cell-td {
  background-color: #f0fdf4 !important;
}

/* Riwayat & Audit Log Styles */
.history-card:last-child {
  border-bottom: 0 !important;
}

.history-card:hover {
  background-color: #fafbfe;
}

.diff-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 0.25rem 0.45rem;
}

.purple-diff-th {
  background-color: #f3e8ff !important;
  color: #581c87 !important;
  font-weight: 600;
}

.purple-diff-td {
  background-color: #fcf8ff !important;
}

.buyback-diff-th {
  background-color: #dcfce7 !important;
  color: #166534 !important;
  font-weight: 600;
}

.buyback-diff-td {
  background-color: #f0fdf4 !important;
}

.history-diff-table th,
.history-diff-table td {
  padding: 0.55rem 0.75rem;
}

.font-sm {
  font-size: 0.85rem;
}
</style>
