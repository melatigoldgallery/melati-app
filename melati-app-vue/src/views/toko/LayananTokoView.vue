<template>
  <div class="page-content">
    <!-- Header Page -->
    <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
      <div>
        <h1 class="page-title d-flex align-items-center gap-2">
          <i class="bi bi-wrench-adjustable-circle text-gold"></i>
          Layanan &amp; Ongkos Toko
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Layanan &amp; Ongkos</li>
          </ol>
        </nav>
      </div>

      <!-- Role Info Badge -->
      <div class="badge-role-info shadow-sm d-flex align-items-center gap-2 px-3 py-2 rounded-pill">
        <i :class="canEdit ? 'bi-shield-check text-success' : 'bi-info-circle text-primary'"></i>
        <span class="small fw-semibold text-secondary">
          Role: <span class="text-uppercase text-dark font-monospace">{{ auth.userRole || 'staff' }}</span>
        </span>
      </div>
    </div>

    <!-- Main Container Card -->
    <div class="card border-0 shadow-sm mb-4 overflow-hidden rounded-4">
      <!-- Tabs Navigation -->
      <div class="card-body p-2 bg-light rounded-top d-flex gap-2 flex-wrap border-bottom">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="btn tab-btn px-4 py-2.5 fw-bold d-flex align-items-center gap-2 transition-all"
          :class="activeTab === tab.id ? 'active-tab shadow-sm' : 'text-secondary hover-bg'"
          @click="activeTab = tab.id"
        >
          <i :class="['bi', tab.icon]"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Content Area -->
      <div class="card-body p-4 bg-white rounded-bottom">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-gold text-center d-block mx-auto mb-3" role="status" style="width: 3rem; height: 3rem">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-muted">Memuat data layanan toko...</p>
        </div>

        <template v-else>
          <transition name="tab-fade" mode="out-in">
            <!-- TAB 1: ONGKOS SERVIS -->
            <div v-if="activeTab === 'ongkos'" key="ongkos" class="tab-pane-content">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                  <h5 class="fw-extrabold text-dark mb-1">
                    <i class="bi bi-tag-fill text-gold me-2"></i>Ongkos Servis
                  </h5>
                  <p class="text-muted small mb-0">Daftar tarif pengerjaan servis barang perhiasan di toko, jika ragu langsung konfirmasi ke tukang.</p>
                </div>
                <button v-if="canEdit" class="btn btn-gold px-3 d-flex align-items-center gap-2" @click="openAddOngkosModal">
                  <i class="bi bi-plus-circle"></i> Tambah Tarif
                </button>
              </div>

              <!-- Service Cost Cards Grid -->
              <div class="row g-3">
                <div v-for="item in data.ongkosServis" :key="item.id" class="col-sm-6 col-md-4 col-lg-3">
                  <div class="card service-cost-card h-100 border-0 p-3 shadow-sm rounded-3 interactive-card position-relative d-flex flex-column justify-content-between">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <span class="service-icon-bg d-flex align-items-center justify-content-center rounded-circle">
                        <i class="bi bi-hammer text-gold"></i>
                      </span>
                      <div v-if="canEdit" class="dropdown">
                        <button class="btn btn-link text-muted p-0 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                          <li><a class="dropdown-item" href="#" @click.prevent="openEditOngkosModal(item)"><i class="bi bi-pencil me-2 text-primary"></i> Edit</a></li>
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteOngkosItem(item.id)"><i class="bi bi-trash me-2"></i> Hapus</a></li>
                        </ul>
                      </div>
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="service-name mb-1">{{ item.name }}</h6>
                      <p class="service-cost mb-0">Rp {{ formatNumber(item.cost) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: BARANG BISA DISERVIS -->
            <div v-else-if="activeTab === 'bisa'" key="bisa" class="tab-pane-content">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h5 class="fw-extrabold text-dark mb-1">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>Barang Bisa Diservis
                  </h5>
                  <p class="text-muted small mb-0">Contoh jenis kerusakan barang perhiasan yang dapat diterima beserta perkiraan biayanya.</p>
                </div>
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <div class="d-flex align-items-center gap-2 dropdown-bisa-container position-relative">
                    <span class="small text-secondary fw-bold text-nowrap"><i class="bi bi-filter"></i> Filter Jenis:</span>
                    <div class="position-relative">
                      <button type="button" class="form-select soft-select shadow-sm d-flex align-items-center justify-content-between px-3 gap-2" style="width: 140px; height: 38px; text-align: left;" @click.stop="isOpenBisa = !isOpenBisa">
                        <span class="text-capitalize">{{ getJenisLabel(filterJenisBisa) || 'Semua Jenis' }}</span>
                      </button>
                      <transition name="dropdown-fade">
                        <ul v-if="isOpenBisa" class="custom-dropdown-menu shadow border-0 py-2 position-absolute start-0 mt-2 z-3 rounded-3 list-unstyled m-0">
                          <li class="px-3 py-2 dropdown-item-custom" :class="{ active: filterJenisBisa === '' }" @click="selectJenisBisa('')">Semua Jenis</li>
                          <li v-for="opt in jenisOptions" :key="opt.value" class="px-3 py-2 dropdown-item-custom" :class="{ active: filterJenisBisa === opt.value }" @click="selectJenisBisa(opt.value)">
                            {{ opt.label }}
                          </li>
                        </ul>
                      </transition>
                    </div>
                  </div>
                  <button v-if="canEdit" class="btn btn-gold px-3 d-flex align-items-center gap-2" style="height: 38px" @click="openAddBisaModal">
                    <i class="bi bi-plus-circle"></i> Tambah Informasi
                  </button>
                </div>
              </div>

              <!-- Repairable Cards Grid -->
              <div v-if="filteredBisa.length" class="row g-4">
                <div v-for="item in filteredBisa" :key="item.id" class="col-md-6 col-lg-4">
                  <div class="card repair-card h-100 border-0 shadow-sm rounded-4 overflow-hidden interactive-card d-flex flex-column">
                    <div class="position-relative repair-image-wrapper bg-light d-flex align-items-center justify-content-center">
                      <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="img-fluid repair-image w-100 h-100 object-fit-cover" />
                      <div v-else class="text-center text-muted p-5">
                        <i class="bi bi-image fs-1 text-gold-subtle d-block mb-2"></i>
                        <span class="small text-secondary">Belum ada foto</span>
                      </div>
                      <span class="badge bg-success position-absolute top-3 start-3 px-3 py-1.5 rounded-pill shadow-sm"><i class="bi bi-check2"></i> Bisa Diservis</span>
                      <span v-if="item.jenis" class="badge bg-dark-glass position-absolute bottom-3 start-3 px-2 py-1 rounded text-capitalize small">Jenis: {{ item.jenis }}</span>
                    </div>
                    <div class="card-body p-4 d-flex flex-column justify-content-between flex-grow-1">
                      <div>
                        <h6 class="fw-extrabold text-dark mb-2">{{ item.name }}</h6>
                        <p class="text-secondary small mb-3">{{ item.description || 'Tidak ada deskripsi tambahan.' }}</p>
                      </div>
                      <div class="pt-3 border-top border-light d-flex justify-content-between align-items-center">
                        <div>
                          <span class="text-muted small d-block">Estimasi Ongkos</span>
                          <span class="fw-bold text-gold">{{ item.cost || '-' }}</span>
                        </div>
                        <div v-if="canEdit" class="d-flex gap-2">
                          <button class="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="openEditBisaModal(item)" title="Edit">
                            <i class="bi bi-pencil-fill small"></i>
                          </button>
                          <button class="btn btn-sm btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="deleteBisaItem(item)" title="Hapus">
                            <i class="bi bi-trash-fill small"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-5 border rounded-4 bg-light shadow-sm">
                <i class="bi bi-search fs-1 text-gold-subtle d-block mb-3"></i>
                <h6 class="fw-bold text-secondary">Tidak ada data barang untuk jenis "{{ filterJenisBisa }}"</h6>
                <p class="text-muted small mb-0">Coba pilih filter jenis lainnya atau tambah data baru.</p>
              </div>
            </div>

            <!-- TAB 3: BARANG TIDAK BISA DISERVIS -->
            <div v-else-if="activeTab === 'tidak_bisa'" key="tidak_bisa" class="tab-pane-content">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                  <h5 class="fw-extrabold text-dark mb-1">
                    <i class="bi bi-x-circle-fill text-danger me-2"></i>Barang Tidak Bisa Diservis
                  </h5>
                  <p class="text-muted small mb-0">Daftar material atau jenis perhiasan yang tidak bisa diterima untuk servis demi menghindari kerusakan permanen.</p>
                </div>
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <div class="d-flex align-items-center gap-2 dropdown-tidakbisa-container position-relative">
                    <span class="small text-secondary fw-bold text-nowrap"><i class="bi bi-filter"></i> Filter Jenis:</span>
                    <div class="position-relative">
                      <button type="button" class="form-select soft-select shadow-sm d-flex align-items-center justify-content-between px-3 gap-2" style="width: 140px; height: 38px; text-align: left;" @click.stop="isOpenTidakBisa = !isOpenTidakBisa">
                        <span class="text-capitalize">{{ getJenisLabel(filterJenisTidakBisa) || 'Semua Jenis' }}</span>
                      </button>
                      <transition name="dropdown-fade">
                        <ul v-if="isOpenTidakBisa" class="custom-dropdown-menu shadow border-0 py-2 position-absolute start-0 mt-2 z-3 rounded-3 list-unstyled m-0">
                          <li class="px-3 py-2 dropdown-item-custom" :class="{ active: filterJenisTidakBisa === '' }" @click="selectJenisTidakBisa('')">Semua Jenis</li>
                          <li v-for="opt in jenisOptions" :key="opt.value" class="px-3 py-2 dropdown-item-custom" :class="{ active: filterJenisTidakBisa === opt.value }" @click="selectJenisTidakBisa(opt.value)">
                            {{ opt.label }}
                          </li>
                        </ul>
                      </transition>
                    </div>
                  </div>
                  <button v-if="canEdit" class="btn btn-gold px-3 d-flex align-items-center gap-2" style="height: 38px" @click="openAddTidakBisaModal">
                    <i class="bi bi-plus-circle"></i> Tambah Informasi
                  </button>
                </div>
              </div>

              <!-- Non-Repairable Cards Grid -->
              <div v-if="filteredTidakBisa.length" class="row g-4">
                <div v-for="item in filteredTidakBisa" :key="item.id" class="col-md-6 col-lg-4">
                  <div class="card repair-card h-100 border-0 shadow-sm rounded-4 overflow-hidden interactive-card d-flex flex-column">
                    <div class="position-relative repair-image-wrapper bg-light d-flex align-items-center justify-content-center">
                      <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="img-fluid repair-image w-100 h-100 object-fit-cover" />
                      <div v-else class="text-center text-muted p-5">
                        <i class="bi bi-image fs-1 text-gold-subtle d-block mb-2"></i>
                        <span class="small text-secondary">Belum ada foto</span>
                      </div>
                      <span class="badge bg-danger position-absolute top-3 start-3 px-3 py-1.5 rounded-pill shadow-sm"><i class="bi bi-exclamation-triangle"></i> Tidak Bisa Servis</span>
                      <span v-if="item.kadar" class="badge bg-dark-glass position-absolute bottom-3 start-3 px-2 py-1 rounded small">Kadar: {{ item.kadar }}</span>
                      <span v-if="item.jenis" class="badge bg-dark-glass position-absolute bottom-3 end-3 px-2 py-1 rounded text-capitalize small">Jenis: {{ item.jenis }}</span>
                    </div>
                    <div class="card-body p-4 d-flex flex-column justify-content-between flex-grow-1">
                      <div>
                        <h6 class="fw-extrabold text-dark mb-2">{{ item.name }}</h6>
                        <p class="text-secondary small mb-3">{{ item.reason || 'Tidak ada keterangan tambahan.' }}</p>
                      </div>
                      <div v-if="canEdit" class="pt-3 border-top border-light d-flex justify-content-end align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="openEditTidakBisaModal(item)" title="Edit">
                          <i class="bi bi-pencil-fill small"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="deleteTidakBisaItem(item)" title="Hapus">
                          <i class="bi bi-trash-fill small"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-5 border rounded-4 bg-light shadow-sm">
                <i class="bi bi-search fs-1 text-gold-subtle d-block mb-3"></i>
                <h6 class="fw-bold text-secondary">Tidak ada data barang untuk jenis "{{ filterJenisTidakBisa }}"</h6>
                <p class="text-muted small mb-0">Coba pilih filter jenis lainnya atau tambah data baru.</p>
              </div>
            </div>

            <!-- TAB 4: HARGA AKSESORIS -->
            <div v-else-if="activeTab === 'aksesoris'" key="aksesoris" class="tab-pane-content">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                  <h5 class="fw-extrabold text-dark mb-1">
                    <i class="bi bi-gem text-gold me-2"></i>Harga Aksesoris per Gram / Pcs
                  </h5>
                  <p class="text-muted small mb-0">Daftar harga jual kelengkapan aksesoris perhiasan pendukung.</p>
                </div>
                <button v-if="canEdit" class="btn btn-gold px-3 d-flex align-items-center gap-2" @click="openAddAksesorisModal">
                  <i class="bi bi-plus-circle"></i> Tambah Aksesoris
                </button>
              </div>

              <!-- Accessories Table / List -->
              <div class="card border-0 shadow-sm rounded-4 overflow-hidden border border-light">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0 custom-accessories-table">
                    <thead class="bg-light">
                      <tr>
                        <th class="px-4 py-3 fw-extrabold text-secondary small text-uppercase">Nama Aksesoris</th>
                        <th class="px-4 py-3 fw-extrabold text-secondary small text-uppercase text-end">Harga</th>
                        <th class="px-4 py-3 fw-extrabold text-secondary small text-uppercase">Keterangan</th>
                        <th v-if="canEdit" class="px-4 py-3 fw-extrabold text-secondary small text-uppercase text-center" style="width: 120px">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in data.hargaAksesoris" :key="item.id">
                        <td class="px-4 py-3.5 fw-bold text-dark">
                          <div class="d-flex align-items-center gap-2">
                            <span class="aks-icon-circle bg-gold-light d-flex align-items-center justify-content-center rounded-circle">
                              <i class="bi bi-gift text-gold"></i>
                            </span>
                            {{ item.name }}
                          </div>
                        </td>
                        <td class="px-4 py-3.5 fw-extrabold text-gold text-end fs-6">
                          Rp {{ formatNumber(item.pricePerGram) }}
                        </td>
                        <td class="px-4 py-3.5 text-muted small">
                          {{ item.notes || '-' }}
                        </td>
                        <td v-if="canEdit" class="px-4 py-3.5 text-center">
                          <div class="d-flex gap-2 justify-content-center">
                            <button class="btn btn-sm btn-outline-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="openEditAksesorisModal(item)">
                              <i class="bi bi-pencil-fill small"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px" @click="deleteAksesorisItem(item.id)">
                              <i class="bi bi-trash-fill small"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="!data.hargaAksesoris?.length">
                        <td colspan="4" class="text-center py-4 text-muted">Belum ada data aksesoris.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </transition>
        </template>
      </div>

      <!-- Footer Info Last Update -->
      <div v-if="!loading && (meta.lastUpdated || meta.updatedBy)" class="card-footer bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
        <span>Terakhir diperbarui: <strong>{{ formatDateTime(meta.lastUpdated) }}</strong></span>
        <span>Diperbarui oleh: <strong class="text-gold">{{ meta.updatedBy }}</strong></span>
      </div>
    </div>

    <!-- MODAL 1: CRUD ONGKOS SERVIS -->
    <div class="modal fade" id="ongkosModal" ref="ongkosModalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
          <div class="modal-header border-bottom border-light">
            <h5 class="modal-title fw-extrabold text-dark">{{ editingId ? 'Edit Tarif Servis' : 'Tambah Tarif Servis' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="saveOngkos">
            <div class="modal-body py-3">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Jenis Servis</label>
                <input v-model="formOngkos.name" type="text" class="form-control" placeholder="Contoh: Patri Emas" required />
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Estimasi Ongkos (Rp)</label>
                <input v-model.number="formOngkos.cost" type="number" class="form-control" placeholder="Contoh: 50000" min="0" required />
              </div>
            </div>
            <div class="modal-footer border-top border-light">
              <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-gold px-4" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 2: CRUD BARANG BISA DISERVIS -->
    <div class="modal fade" id="bisaModal" ref="bisaModalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
          <div class="modal-header border-bottom border-light">
            <h5 class="modal-title fw-extrabold text-dark">{{ editingId ? 'Edit Info Barang Bisa Servis' : 'Tambah Info Barang Bisa Servis' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="saveBisa">
            <div class="modal-body py-3">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Nama Barang / Masalah</label>
                <input v-model="formBisa.name" type="text" class="form-control" placeholder="Contoh: Cincin Patah" required />
              </div>
              <div class="mb-3 dropdown-form-bisa-container position-relative">
                <label class="form-label small fw-bold text-secondary">Jenis Barang</label>
                <div class="position-relative">
                  <button type="button" class="form-select soft-select w-100 d-flex align-items-center justify-content-between text-start" style="height: 38px;" @click.stop="isOpenFormBisa = !isOpenFormBisa">
                    <span :class="formBisa.jenis ? 'text-capitalize text-dark' : 'text-muted'">
                      {{ getJenisLabel(formBisa.jenis) || 'Pilih jenis barang...' }}
                    </span>
                  </button>
                  <transition name="dropdown-fade">
                    <ul v-if="isOpenFormBisa" class="custom-dropdown-menu shadow border-0 py-2 position-absolute start-0 mt-1 z-3 rounded-3 list-unstyled m-0" style="max-height: 200px; overflow-y: auto;">
                      <li v-for="opt in jenisOptions" :key="opt.value" class="px-3 py-2 dropdown-item-custom" :class="{ active: formBisa.jenis === opt.value }" @click="selectFormBisa(opt.value)">
                        {{ opt.label }}
                      </li>
                    </ul>
                  </transition>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Deskripsi Perbaikan</label>
                <textarea v-model="formBisa.description" class="form-control" rows="3" placeholder="Jelaskan detail perbaikan..."></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Estimasi Ongkos</label>
                <input v-model="formBisa.cost" type="text" class="form-control" placeholder="Contoh: Rp 30.000 - Rp 50.000" required />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold text-secondary">Contoh Gambar</label>
                <div class="d-flex align-items-center gap-3">
                  <div class="upload-preview bg-light border rounded d-flex align-items-center justify-content-center overflow-hidden" style="width: 80px; height: 80px">
                    <img v-if="imagePreview" :src="imagePreview" class="img-fluid object-fit-cover w-100 h-100" />
                    <img v-else-if="formBisa.imageUrl" :src="formBisa.imageUrl" class="img-fluid object-fit-cover w-100 h-100" />
                    <i v-else class="bi bi-image text-muted fs-3"></i>
                  </div>
                  <div class="flex-grow-1">
                    <input type="file" ref="fileInputBisa" class="form-control form-control-sm" accept="image/*" @change="handleFileChange" />
                    <span class="small text-muted" style="font-size: 0.72rem">Format: JPG, PNG. Maks: 3MB.</span>
                  </div>
                </div>
                <div v-if="uploadProgress > 0" class="progress mt-2" style="height: 6px">
                  <div class="progress-bar bg-gold" role="progressbar" :style="{ width: uploadProgress + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer border-top border-light">
              <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-gold px-4" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 3: CRUD BARANG TIDAK BISA DISERVIS -->
    <div class="modal fade" id="tidakBisaModal" ref="tidakBisaModalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
          <div class="modal-header border-bottom border-light">
            <h5 class="modal-title fw-extrabold text-dark">{{ editingId ? 'Edit Info Barang Tidak Bisa Servis' : 'Tambah Info Barang Tidak Bisa Servis' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="saveTidakBisa">
            <div class="modal-body py-3">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Nama Barang</label>
                <input v-model="formTidakBisa.name" type="text" class="form-control" placeholder="Contoh: Perhiasan Perak" required />
              </div>
              <div class="mb-3 dropdown-form-tidakbisa-container position-relative">
                <label class="form-label small fw-bold text-secondary">Jenis Barang</label>
                <div class="position-relative">
                  <button type="button" class="form-select soft-select w-100 d-flex align-items-center justify-content-between text-start" style="height: 38px;" @click.stop="isOpenFormTidakBisa = !isOpenFormTidakBisa">
                    <span :class="formTidakBisa.jenis ? 'text-capitalize text-dark' : 'text-muted'">
                      {{ getJenisLabel(formTidakBisa.jenis) || 'Pilih jenis barang...' }}
                    </span>
                  </button>
                  <transition name="dropdown-fade">
                    <ul v-if="isOpenFormTidakBisa" class="custom-dropdown-menu shadow border-0 py-2 position-absolute start-0 mt-1 z-3 rounded-3 list-unstyled m-0" style="max-height: 200px; overflow-y: auto;">
                      <li v-for="opt in jenisOptions" :key="opt.value" class="px-3 py-2 dropdown-item-custom" :class="{ active: formTidakBisa.jenis === opt.value }" @click="selectFormTidakBisa(opt.value)">
                        {{ opt.label }}
                      </li>
                    </ul>
                  </transition>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Kadar / Bahan</label>
                <input v-model="formTidakBisa.kadar" type="text" class="form-control" placeholder="Contoh: Perak / Imitasi / Alpaka" required />
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Alasan Penolakan</label>
                <textarea v-model="formTidakBisa.reason" class="form-control" rows="3" placeholder="Tuliskan alasannya..."></textarea>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold text-secondary">Foto Barang</label>
                <div class="d-flex align-items-center gap-3">
                  <div class="upload-preview bg-light border rounded d-flex align-items-center justify-content-center overflow-hidden" style="width: 80px; height: 80px">
                    <img v-if="imagePreview" :src="imagePreview" class="img-fluid object-fit-cover w-100 h-100" />
                    <img v-else-if="formTidakBisa.imageUrl" :src="formTidakBisa.imageUrl" class="img-fluid object-fit-cover w-100 h-100" />
                    <i v-else class="bi bi-image text-muted fs-3"></i>
                  </div>
                  <div class="flex-grow-1">
                    <input type="file" ref="fileInputTidakBisa" class="form-control form-control-sm" accept="image/*" @change="handleFileChange" />
                    <span class="small text-muted" style="font-size: 0.72rem">Format: JPG, PNG. Maks: 3MB.</span>
                  </div>
                </div>
                <div v-if="uploadProgress > 0" class="progress mt-2" style="height: 6px">
                  <div class="progress-bar bg-gold" role="progressbar" :style="{ width: uploadProgress + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer border-top border-light">
              <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-gold px-4" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 4: CRUD HARGA AKSESORIS -->
    <div class="modal fade" id="aksesorisModal" ref="aksesorisModalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow rounded-4">
          <div class="modal-header border-bottom border-light">
            <h5 class="modal-title fw-extrabold text-dark">{{ editingId ? 'Edit Data Aksesoris' : 'Tambah Data Aksesoris' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form @submit.prevent="saveAksesoris">
            <div class="modal-body py-3">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Nama Aksesoris</label>
                <input v-model="formAksesoris.name" type="text" class="form-control" placeholder="Contoh: Kotak Cincin Beludru" required />
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Harga (Rp)</label>
                <input v-model.number="formAksesoris.pricePerGram" type="number" class="form-control" placeholder="Contoh: 15000" min="0" required />
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Keterangan / Satuan</label>
                <input v-model="formAksesoris.notes" type="text" class="form-control" placeholder="Contoh: Per Gram perhiasan, atau per pcs" />
              </div>
            </div>
            <div class="modal-footer border-top border-light">
              <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">Batal</button>
              <button type="submit" class="btn btn-gold px-4" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import {
  fetchLayananToko,
  saveLayananToko,
  uploadLayananImage,
  deleteLayananImage
} from "@/services/layanan-toko-service";

const auth = useAuthStore();
const { error: showError, confirm: confirmAlert, success: showSuccess } = useAlert();

// Loading states
const loading = ref(true);
const saving = ref(false);
const uploadProgress = ref(0);
const activeTab = ref("ongkos");

const tabs = [
  { id: "ongkos", label: "Estimasi Ongkos", icon: "bi-tag-fill" },
  { id: "bisa", label: "Barang Bisa Servis", icon: "bi-check-circle-fill" },
  { id: "tidak_bisa", label: "Barang Tidak Bisa Servis", icon: "bi-x-circle-fill" },
  { id: "aksesoris", label: "Harga Aksesoris", icon: "bi-gem" }
];

// Document structure refs
const data = ref({
  ongkosServis: [],
  barangBisaServis: [],
  barangTidakBisaServis: [],
  hargaAksesoris: []
});

const meta = ref({
  lastUpdated: null,
  updatedBy: ""
});

// Access controls
const canEdit = computed(() => ["supervisor", "hrd", "admin", "admin_custom"].includes(auth.userRole));

// Filter & Categories Options
const filterJenisBisa = ref("");
const filterJenisTidakBisa = ref("");
const isOpenBisa = ref(false);
const isOpenTidakBisa = ref(false);
const isOpenFormBisa = ref(false);
const isOpenFormTidakBisa = ref(false);

const jenisOptions = [
  { value: "kalung", label: "Kalung" },
  { value: "liontin", label: "Liontin" },
  { value: "anting", label: "Anting" },
  { value: "cincin", label: "Cincin" },
  { value: "gelang", label: "Gelang" },
  { value: "giwang", label: "Giwang" }
];

const filteredBisa = computed(() => {
  if (!filterJenisBisa.value) return data.value.barangBisaServis;
  return data.value.barangBisaServis.filter(
    (item) => item.jenis === filterJenisBisa.value
  );
});

function getJenisLabel(value) {
  if (!value) return "";
  const opt = jenisOptions.find(o => o.value === value);
  return opt ? opt.label : value;
}

function selectJenisBisa(val) {
  filterJenisBisa.value = val;
  isOpenBisa.value = false;
}

function selectJenisTidakBisa(val) {
  filterJenisTidakBisa.value = val;
  isOpenTidakBisa.value = false;
}

function selectFormBisa(val) {
  formBisa.jenis = val;
  isOpenFormBisa.value = false;
}

// ── BARANG BISA SERVIS ACTIONS ──────────────────────────────────────────────
function selectFormTidakBisa(val) {
  formTidakBisa.jenis = val;
  isOpenFormTidakBisa.value = false;
}

function handleDocumentClick(e) {
  const dropdownBisa = document.querySelector(".dropdown-bisa-container");
  const dropdownTidakBisa = document.querySelector(".dropdown-tidakbisa-container");
  const dropdownFormBisa = document.querySelector(".dropdown-form-bisa-container");
  const dropdownFormTidakBisa = document.querySelector(".dropdown-form-tidakbisa-container");
  
  if (dropdownBisa && !dropdownBisa.contains(e.target)) {
    isOpenBisa.value = false;
  }
  if (dropdownTidakBisa && !dropdownTidakBisa.contains(e.target)) {
    isOpenTidakBisa.value = false;
  }
  if (dropdownFormBisa && !dropdownFormBisa.contains(e.target)) {
    isOpenFormBisa.value = false;
  }
  if (dropdownFormTidakBisa && !dropdownFormTidakBisa.contains(e.target)) {
    isOpenFormTidakBisa.value = false;
  }
}


const filteredTidakBisa = computed(() => {
  if (!filterJenisTidakBisa.value) return data.value.barangTidakBisaServis;
  return data.value.barangTidakBisaServis.filter(
    (item) => item.jenis === filterJenisTidakBisa.value
  );
});

// Modal refs & editing states
const editingId = ref(null);
const fileToUpload = ref(null);
const imagePreview = ref("");

// Forms
const formOngkos = reactive({ name: "", cost: 0 });
const formBisa = reactive({ name: "", description: "", cost: "", imageUrl: "", imagePath: "", jenis: "" });
const formTidakBisa = reactive({ name: "", kadar: "", reason: "", imageUrl: "", imagePath: "", jenis: "" });
const formAksesoris = reactive({ name: "", pricePerGram: 0, notes: "" });

// DOM refs for Modals
const ongkosModalRef = ref(null);
const bisaModalRef = ref(null);
const tidakBisaModalRef = ref(null);
const aksesorisModalRef = ref(null);

let modalInstances = {};

// Helper formatting
function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString("id-ID");
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (_) {
    return isoString;
  }
}

// Initial Loading
async function loadData() {
  loading.value = true;
  try {
    const res = await fetchLayananToko();
    data.value = {
      ongkosServis: res.ongkosServis || [],
      barangBisaServis: res.barangBisaServis || [],
      barangTidakBisaServis: res.barangTidakBisaServis || [],
      hargaAksesoris: res.hargaAksesoris || []
    };
    meta.value.lastUpdated = res.lastUpdated || null;
    meta.value.updatedBy = res.updatedBy || "";
  } catch (err) {
    showError("Gagal Memuat Data", err.message);
  } finally {
    loading.value = false;
  }
}

// Open modals
function initModal(name, refEl) {
  if (!modalInstances[name] && refEl) {
    modalInstances[name] = new Modal(refEl);
  }
  return modalInstances[name];
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showError("File Terlalu Besar", "Ukuran foto maksimal adalah 3MB.");
    event.target.value = "";
    return;
  }

  fileToUpload.value = file;
  imagePreview.value = URL.createObjectURL(file);
}

// ── ONGKOS SERVIS ACTIONS ──────────────────────────────────────────────────
function openAddOngkosModal() {
  editingId.value = null;
  formOngkos.name = "";
  formOngkos.cost = 0;
  initModal("ongkos", ongkosModalRef.value).show();
}

function openEditOngkosModal(item) {
  editingId.value = item.id;
  formOngkos.name = item.name;
  formOngkos.cost = item.cost;
  initModal("ongkos", ongkosModalRef.value).show();
}

async function saveOngkos() {
  if (saving.value) return;
  saving.value = true;

  try {
    const list = [...data.value.ongkosServis];
    if (editingId.value) {
      const idx = list.findIndex(i => i.id === editingId.value);
      if (idx !== -1) {
        list[idx] = { id: editingId.value, ...formOngkos };
      }
    } else {
      list.push({ id: crypto.randomUUID(), ...formOngkos });
    }

    const payload = { ...data.value, ongkosServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.ongkosServis = list;
    initModal("ongkos", ongkosModalRef.value).hide();
    showSuccess("Tarif servis berhasil disimpan.");
    await loadData();
  } catch (err) {
    showError("Gagal Menyimpan", err.message);
  } finally {
    saving.value = false;
  }
}

async function deleteOngkosItem(id) {
  const conf = await confirmAlert({
    title: "Hapus Tarif?",
    text: "Apakah Anda yakin ingin menghapus estimasi tarif ini?",
    icon: "warning"
  });
  if (!conf.isConfirmed) return;

  try {
    const list = data.value.ongkosServis.filter(i => i.id !== id);
    const payload = { ...data.value, ongkosServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.ongkosServis = list;
    showSuccess("Tarif servis berhasil dihapus.");
    await loadData();
  } catch (err) {
    showError("Gagal Menghapus", err.message);
  }
}

// ── BARANG BISA SERVIS ACTIONS ──────────────────────────────────────────────
function openAddBisaModal() {
  editingId.value = null;
  fileToUpload.value = null;
  imagePreview.value = "";
  uploadProgress.value = 0;
  formBisa.name = "";
  formBisa.description = "";
  formBisa.cost = "";
  formBisa.imageUrl = "";
  formBisa.imagePath = "";
  formBisa.jenis = "";
  initModal("bisa", bisaModalRef.value).show();
}

function openEditBisaModal(item) {
  editingId.value = item.id;
  fileToUpload.value = null;
  imagePreview.value = "";
  uploadProgress.value = 0;
  formBisa.name = item.name;
  formBisa.description = item.description || "";
  formBisa.cost = item.cost;
  formBisa.imageUrl = item.imageUrl || "";
  formBisa.imagePath = item.imagePath || "";
  formBisa.jenis = item.jenis || "";
  initModal("bisa", bisaModalRef.value).show();
}

async function saveBisa() {
  if (saving.value) return;
  saving.value = true;

  try {
    let imageUrl = formBisa.imageUrl;
    let imagePath = formBisa.imagePath;

    // Upload image if a new one is selected
    if (fileToUpload.value) {
      // If editing and had old image, delete first
      if (imagePath) {
        await deleteLayananImage(imagePath);
      }
      const uploadRes = await uploadLayananImage(fileToUpload.value, "bisa_servis", (pct) => {
        uploadProgress.value = pct;
      });
      imageUrl = uploadRes.url;
      imagePath = uploadRes.path;
    }

    const list = [...data.value.barangBisaServis];
    const itemData = {
      name: formBisa.name,
      description: formBisa.description,
      cost: formBisa.cost,
      imageUrl,
      imagePath,
      jenis: formBisa.jenis
    };

    if (editingId.value) {
      const idx = list.findIndex(i => i.id === editingId.value);
      if (idx !== -1) {
        list[idx] = { id: editingId.value, ...itemData };
      }
    } else {
      list.push({ id: crypto.randomUUID(), ...itemData });
    }

    const payload = { ...data.value, barangBisaServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.barangBisaServis = list;
    initModal("bisa", bisaModalRef.value).hide();
    showSuccess("Informasi barang bisa servis berhasil disimpan.");
    await loadData();
  } catch (err) {
    showError("Gagal Menyimpan", err.message);
  } finally {
    saving.value = false;
    uploadProgress.value = 0;
  }
}

async function deleteBisaItem(item) {
  const conf = await confirmAlert({
    title: "Hapus Informasi?",
    text: "Apakah Anda yakin ingin menghapus data barang bisa servis ini?",
    icon: "warning"
  });
  if (!conf.isConfirmed) return;

  try {
    if (item.imagePath) {
      await deleteLayananImage(item.imagePath);
    }

    const list = data.value.barangBisaServis.filter(i => i.id !== item.id);
    const payload = { ...data.value, barangBisaServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.barangBisaServis = list;
    showSuccess("Informasi berhasil dihapus.");
    await loadData();
  } catch (err) {
    showError("Gagal Menghapus", err.message);
  }
}

// ── BARANG TIDAK BISA SERVIS ACTIONS ─────────────────────────────────────────
function openAddTidakBisaModal() {
  editingId.value = null;
  fileToUpload.value = null;
  imagePreview.value = "";
  uploadProgress.value = 0;
  formTidakBisa.name = "";
  formTidakBisa.kadar = "";
  formTidakBisa.reason = "";
  formTidakBisa.imageUrl = "";
  formTidakBisa.imagePath = "";
  formTidakBisa.jenis = "";
  initModal("tidak_bisa", tidakBisaModalRef.value).show();
}

function openEditTidakBisaModal(item) {
  editingId.value = item.id;
  fileToUpload.value = null;
  imagePreview.value = "";
  uploadProgress.value = 0;
  formTidakBisa.name = item.name;
  formTidakBisa.kadar = item.kadar;
  formTidakBisa.reason = item.reason || "";
  formTidakBisa.imageUrl = item.imageUrl || "";
  formTidakBisa.imagePath = item.imagePath || "";
  formTidakBisa.jenis = item.jenis || "";
  initModal("tidak_bisa", tidakBisaModalRef.value).show();
}

async function saveTidakBisa() {
  if (saving.value) return;
  saving.value = true;

  try {
    let imageUrl = formTidakBisa.imageUrl;
    let imagePath = formTidakBisa.imagePath;

    // Upload image if a new one is selected
    if (fileToUpload.value) {
      if (imagePath) {
        await deleteLayananImage(imagePath);
      }
      const uploadRes = await uploadLayananImage(fileToUpload.value, "tidak_bisa_servis", (pct) => {
        uploadProgress.value = pct;
      });
      imageUrl = uploadRes.url;
      imagePath = uploadRes.path;
    }

    const list = [...data.value.barangTidakBisaServis];
    const itemData = {
      name: formTidakBisa.name,
      kadar: formTidakBisa.kadar,
      reason: formTidakBisa.reason,
      imageUrl,
      imagePath,
      jenis: formTidakBisa.jenis
    };

    if (editingId.value) {
      const idx = list.findIndex(i => i.id === editingId.value);
      if (idx !== -1) {
        list[idx] = { id: editingId.value, ...itemData };
      }
    } else {
      list.push({ id: crypto.randomUUID(), ...itemData });
    }

    const payload = { ...data.value, barangTidakBisaServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.barangTidakBisaServis = list;
    initModal("tidak_bisa", tidakBisaModalRef.value).hide();
    showSuccess("Informasi barang tidak bisa servis berhasil disimpan.");
    await loadData();
  } catch (err) {
    showError("Gagal Menyimpan", err.message);
  } finally {
    saving.value = false;
    uploadProgress.value = 0;
  }
}

async function deleteTidakBisaItem(item) {
  const conf = await confirmAlert({
    title: "Hapus Informasi?",
    text: "Apakah Anda yakin ingin menghapus data barang tidak bisa servis ini?",
    icon: "warning"
  });
  if (!conf.isConfirmed) return;

  try {
    if (item.imagePath) {
      await deleteLayananImage(item.imagePath);
    }

    const list = data.value.barangTidakBisaServis.filter(i => i.id !== item.id);
    const payload = { ...data.value, barangTidakBisaServis: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.barangTidakBisaServis = list;
    showSuccess("Informasi berhasil dihapus.");
    await loadData();
  } catch (err) {
    showError("Gagal Menghapus", err.message);
  }
}

// ── HARGA AKSESORIS ACTIONS ─────────────────────────────────────────────────
function openAddAksesorisModal() {
  editingId.value = null;
  formAksesoris.name = "";
  formAksesoris.pricePerGram = 0;
  formAksesoris.notes = "";
  initModal("aksesoris", aksesorisModalRef.value).show();
}

function openEditAksesorisModal(item) {
  editingId.value = item.id;
  formAksesoris.name = item.name;
  formAksesoris.pricePerGram = item.pricePerGram;
  formAksesoris.notes = item.notes || "";
  initModal("aksesoris", aksesorisModalRef.value).show();
}

async function saveAksesoris() {
  if (saving.value) return;
  saving.value = true;

  try {
    const list = [...data.value.hargaAksesoris];
    if (editingId.value) {
      const idx = list.findIndex(i => i.id === editingId.value);
      if (idx !== -1) {
        list[idx] = { id: editingId.value, ...formAksesoris };
      }
    } else {
      list.push({ id: crypto.randomUUID(), ...formAksesoris });
    }

    const payload = { ...data.value, hargaAksesoris: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.hargaAksesoris = list;
    initModal("aksesoris", aksesorisModalRef.value).hide();
    showSuccess("Data aksesoris berhasil disimpan.");
    await loadData();
  } catch (err) {
    showError("Gagal Menyimpan", err.message);
  } finally {
    saving.value = false;
  }
}

async function deleteAksesorisItem(id) {
  const conf = await confirmAlert({
    title: "Hapus Aksesoris?",
    text: "Apakah Anda yakin ingin menghapus data aksesoris ini?",
    icon: "warning"
  });
  if (!conf.isConfirmed) return;

  try {
    const list = data.value.hargaAksesoris.filter(i => i.id !== id);
    const payload = { ...data.value, hargaAksesoris: list };
    const updatedBy = auth.currentUser?.displayName || auth.currentUser?.email || "Supervisor";
    await saveLayananToko(payload, updatedBy);

    data.value.hargaAksesoris = list;
    showSuccess("Aksesoris berhasil dihapus.");
    await loadData();
  } catch (err) {
    showError("Gagal Menghapus", err.message);
  }
}

onMounted(() => {
  loadData();
  document.addEventListener("click", handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<style scoped>
/* Theme colors */
.text-gold {
  color: #aa7c11;
}

.btn-gold {
  color: #fff;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
  border: none;
  transition: all 0.25s ease;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(170, 124, 17, 0.2);
}

.btn-gold:hover:not(:disabled) {
  background: linear-gradient(135deg, #e5c158 0%, #c09224 100%);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(170, 124, 17, 0.3);
}

.bg-gold-light {
  background-color: rgba(212, 175, 55, 0.12);
}

/* Tabs */
.tab-btn {
  border: 1px solid transparent;
  background-color: transparent;
  border-radius: 10px;
  font-size: 0.92rem;
}

.active-tab {
  background-color: #fff !important;
  color: #aa7c11 !important;
  border: 1px solid #e9ecef !important;
  border-bottom: 3px solid #aa7c11 !important;
}

.hover-bg:hover {
  background-color: rgba(170, 124, 17, 0.06);
  color: #aa7c11 !important;
}

.transition-all {
  transition: all 0.25s ease-in-out !important;
}

/* Soft Select styling */
.soft-select {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out, background-color 0.15s ease-in-out;
  cursor: pointer;
}

.soft-select:hover {
  background-color: #f1f3f5;
  border-color: rgba(170, 124, 17, 0.25);
}

.soft-select:focus {
  border-color: rgba(170, 124, 17, 0.5) !important;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(170, 124, 17, 0.15) !important;
  background-color: #ffffff;
}

/* Cards & Grid styling */
.service-cost-card {
  border: 1px solid #f0f0f0;
  background-color: #ffffff;
}

.service-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #212529;
}

.service-cost {
  font-size: 1.05rem;
  font-weight: 800;
  color: #aa7c11;
}

.service-icon-bg {
  width: 40px;
  height: 40px;
  background-color: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.2);
}

.repair-card {
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.repair-image-wrapper {
  height: 180px;
  position: relative;
  overflow: hidden;
  background-color: #fcfbfa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.repair-image {
  object-fit: cover;
  transition: transform 0.5s ease;
}

.interactive-card:hover .repair-image {
  transform: scale(1.05);
}

.interactive-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}

.interactive-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 15px 30px rgba(170, 124, 17, 0.08) !important;
  border-color: rgba(170, 124, 17, 0.3) !important;
}

/* Overlay Glass */
.bg-dark-glass {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  backdrop-filter: blur(4px);
}

/* Icons */
.aks-icon-circle {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

/* Accessories table styling */
.custom-accessories-table th {
  border-bottom: 2px solid #eaeaea;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
}

.custom-accessories-table tr:hover {
  background-color: rgba(170, 124, 17, 0.02);
}

/* Upload Preview */
.upload-preview {
  border: 1px dashed #ced4da !important;
  border-radius: 8px;
}

/* Animations */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.badge-role-info {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

.top-3 {
  top: 1rem;
}
.start-3 {
  left: 1rem;
}
.bottom-3 {
  bottom: 1rem;
}

.progress-bar.bg-gold {
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
}

/* Custom Premium Dropdown Styling */
.custom-dropdown-menu {
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: 12px;
  min-width: 140px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
  top: 100%;
  left: 0;
  transform: translateY(4px);
  padding: 6px 0;
  max-height: 250px;
  overflow-y: auto;
}

.dropdown-item-custom {
  font-size: 0.85rem;
  color: #495057;
  padding: 8px 16px;
  transition: all 0.15s ease;
  cursor: pointer;
  border-radius: 6px;
  margin: 2px 6px;
}

.dropdown-item-custom:hover {
  background-color: rgba(170, 124, 17, 0.06);
  color: #aa7c11;
}

.dropdown-item-custom.active {
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
  color: #ffffff !important;
  font-weight: 600;
}

.rotate-180 {
  transform: rotate(180deg);
}

.transition-transform {
  transition: transform 0.2s ease;
}

/* Dropdown Animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
