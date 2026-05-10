<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-table me-2 text-dark"></i>
        Data Servis
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/servis/input">Servis</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Data Servis</li>
        </ol>
      </nav>
    </div>

    <!-- Filters -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header">
        <h2>
          <i class="fas fa-filter me-2"></i>
          Filter Laporan
        </h2>
      </div>
      <div class="card-body py-2">
        <div class="row g-2 align-items-end py-3">
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Dari</label>
            <input v-model="filterStartDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Sampai</label>
            <input v-model="filterEndDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Jenis</label>
            <select v-model="filterJenis" class="form-select form-select-sm">
              <option value="servis">Servis</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Servis</label>
            <select v-model="filterStatus" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="Belum Selesai">Belum Selesai</option>
              <option value="Sudah Selesai">Sudah Selesai</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="filterPengambilan" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="Belum Diambil">Belum Diambil</option>
              <option value="Sudah Diambil">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-6 d-md-none">
            <label class="form-label small fw-semibold mb-1">Cari</label>
            <input
              v-model="searchText"
              type="search"
              name="servisSearch"
              class="form-control form-control-sm"
              placeholder="Customer / barang / kontak..."
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              data-form-type="other"
              :readonly="searchReadonly"
              @focus="unlockSearchInput"
              @pointerdown="unlockSearchInput"
            />
          </div>
          <div class="col-12 col-md-auto d-flex align-items-end gap-2 flex-wrap">
            <button class="btn btn-tampilkan btn-sm fw-semibold flex-fill flex-md-grow-0" @click="loadData">
              <i class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="d-none d-md-flex justify-content-between py-2 border-bottom mb-3">
      <div class="d-flex gap-2 flex-wrap">
        <button
          v-if="hasLoaded"
          class="btn btn-outline-success btn-sm fw-semibold flex-fill flex-md-grow-0"
          :disabled="isFinishSelectedDisabled"
          @click="updateSelectedServisSelesai"
        >
          <span v-if="penerimaanSaving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check2-square me-1"></i>
          Selesaikan Terpilih ({{ selectedServisFinishCount }})
        </button>
        <button
          v-if="hasLoaded && isSupervisor"
          class="btn btn-outline-primary btn-sm fw-semibold flex-fill flex-md-grow-0"
          :disabled="isMarkTakenSelectedDisabled"
          @click="updateSelectedServisSudahDiambil"
        >
          <span v-if="bulkUpdatingStatusServis" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-box-arrow-in-down me-1"></i>
          Sudah Diambil ({{ selectedServisPickupCount }})
        </button>
        <button
          v-if="hasLoaded && canReturnOwner"
          class="btn btn-outline-dark btn-sm fw-semibold flex-fill flex-md-grow-0"
          :disabled="isReturnOwnerSelectedDisabled"
          @click="updateSelectedServisReturnOwner"
        >
          <span v-if="returnOwnerSaving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-arrow-return-left me-1"></i>
          Return ke Owner ({{ selectedServisPickupCount }})
        </button>
        <div class="" v-if="hasLoaded">
          <input
            v-model="searchText"
            type="search"
            name="servisSearch"
            class="form-control form-control-sm"
            placeholder="Customer / barang / kontak..."
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            data-form-type="other"
            :readonly="searchReadonly"
            @focus="unlockSearchInput"
            @pointerdown="unlockSearchInput"
          />
        </div>
      </div>
      <div class="gap-2 d-flex flex-wrap">
        <button
          v-if="hasLoaded"
          class="btn btn-info btn-sm"
          @click="openContactTextModal"
          title="Export teks kontak customer"
        >
          <i class="bi bi-clipboard me-1"></i>
          Export Kontak
        </button>
        <button v-if="hasLoaded" class="btn btn-danger btn-sm" @click="exportPDF" title="Export PDF sesuai filter">
          <i class="bi bi-file-earmark-pdf me-1"></i>
          Export PDF
        </button>
        <button v-if="hasLoaded" class="btn btn-success btn-sm" @click="printAllLabels" title="Print semua label">
          <i class="bi bi-tags me-1"></i>
          Print Label
        </button>
      </div>
    </div>
    <div v-if="hasLoaded && canReceiveServis" class="d-md-none card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <button
          class="btn btn-outline-success btn-sm fw-semibold w-100"
          :disabled="isFinishSelectedDisabled"
          @click="updateSelectedServisSelesai"
        >
          <span v-if="penerimaanSaving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check2-square me-1"></i>
          Selesaikan Terpilih ({{ selectedServisFinishCount }})
        </button>
      </div>
    </div>

    <!-- ── Contact Text Modal ── -->
    <div class="modal fade" id="contactTextModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-clipboard me-1 text-primary"></i>
              Export Text Kontak Customer
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Teks di bawah berisi daftar customer yang sedang difilter. Salin lalu kirim manual ke customer yang
              sesuai.
            </p>
            <textarea
              ref="contactTextRef"
              v-model="contactExportText"
              class="form-control contact-export-text"
              rows="16"
              readonly
            ></textarea>
          </div>
          <div class="modal-footer py-2 d-flex justify-content-between flex-wrap gap-2">
            <div class="small text-muted">{{ contactExportSummary }}</div>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary btn-sm" @click="downloadContactText">
                <i class="bi bi-download me-1"></i>
                Download TXT
              </button>
              <button type="button" class="btn btn-primary btn-sm" @click="copyContactText">
                <i class="bi bi-clipboard-check me-1"></i>
                Copy Text
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data servis...</p>
    </div>

    <div v-else-if="!hasLoaded" class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-search display-6 d-block mb-2 opacity-25"></i>
        Klik tombol Tampilkan untuk memuat data servis.
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Mobile card view -->
      <div class="d-md-none mobile-servis-list">
        <div v-if="filteredList.length === 0" class="text-center text-muted py-5">
          <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
          <p class="small">Tidak ada data servis.</p>
        </div>
        <div
          v-for="item in paginatedList"
          :key="item.id"
          class="card border-0 shadow-sm mb-2 rounded-3 mobile-servis-card"
        >
          <div class="card-body mobile-servis-card-body">
            <!-- Row 1: customer + tanggal -->
            <div class="d-flex justify-content-between align-items-start mb-1 mobile-top-row">
              <div class="d-flex align-items-start">
                <input
                  type="checkbox"
                  class="form-check-input mobile-select-checkbox me-2"
                  :checked="isFinishSelectable(item) && isItemSelected(item.id)"
                  :disabled="!isFinishSelectable(item)"
                  :title="
                    isFinishSelectable(item)
                      ? 'Pilih untuk aksi Selesaikan Terpilih'
                      : 'Hanya data belum selesai yang bisa dipilih'
                  "
                  @change="toggleItemSelection(item.id, $event.target.checked)"
                />
                <span class="fw-bold text-dark mobile-customer">{{ item.namaCustomer }}</span>
              </div>
              <span class="text-muted mobile-date">{{ formatTanggalJam(item.tanggal, item.createdAt) }}</span>
            </div>
            <!-- Row 2: nama barang + jenis -->
            <div class="d-flex align-items-center gap-1 mb-1 mobile-item-row">
              <span class="text-truncate flex-grow-1 mobile-item-name">{{ getItemNama(item) }}</span>
              <span v-if="item.jenisInput !== 'custom'" class="badge text-muted flex-shrink-0 mobile-item-kind">
                {{ getItemJenisServis(item) }}
              </span>
            </div>
            <!-- Row 3: sales + rincian -->
            <div class="text-muted mb-1 mobile-sales-row">
              <span v-if="item.namaSales && getItemRincian(item) !== '-'">SALES :</span>
              <span v-if="item.namaSales">{{ item.namaSales }}</span>
            </div>
            <div v-if="item.waktuDihubungiTerakhir" class="text-muted mb-1 mobile-sales-row">
              Hubungi: {{ formatWaktu(item.waktuDihubungiTerakhir) }}
            </div>
            <div v-if="item.penerimaServis || item.waktuPenerimaan" class="text-muted mb-1 mobile-sales-row">
              <span>Penerimaan:</span>
              <span v-if="item.penerimaServis">{{ item.penerimaServis }}</span>
              <span v-if="item.waktuPenerimaan">| {{ formatWaktu(item.waktuPenerimaan) }}</span>
              <button
                v-if="getBuktiPenerimaanUrl(item)"
                class="btn btn-outline-warning btn-sm py-0 px-1 ms-1"
                @click="openBuktiModalByUrl(getBuktiPenerimaanUrl(item), 'Bukti Penerimaan')"
                title="Lihat bukti penerimaan"
              >
                <i class="bi bi-camera"></i>
              </button>
            </div>
            <div v-if="item.stafHandle || item.waktuPengambilan" class="text-muted mb-1 mobile-sales-row">
              <span>Pengambilan:</span>
              <span v-if="item.stafHandle">{{ item.stafHandle }}</span>
              <span v-if="isReturnOwnerItem(item)" class="badge bg-warning text-dark ms-1">Return Owner</span>
              <span v-if="item.waktuPengambilan">| {{ formatWaktu(item.waktuPengambilan) }}</span>
              <button
                v-if="getBuktiPengambilanUrl(item)"
                class="btn btn-outline-info btn-sm py-0 px-1 ms-1"
                @click="openBuktiModalByUrl(getBuktiPengambilanUrl(item), 'Bukti Pengambilan')"
                title="Lihat bukti pengambilan"
              >
                <i class="bi bi-camera"></i>
              </button>
            </div>
            <!-- Row 4: badges -->
            <div class="d-flex align-items-center mb-2 flex-wrap gap-1 mobile-status-row">
              <div class="d-flex gap-1 flex-wrap">
                <span class="badge mobile-status-badge" :class="statusServisBadge(item.statusServis)">
                  {{ item.statusServis }}
                </span>
                <span class="badge mobile-status-badge" :class="statusPengambilanBadge(item.statusPengambilan)">
                  {{ item.statusPengambilan }}
                </span>
                <span
                  v-if="item.jenisInput !== 'custom'"
                  class="badge mobile-status-badge"
                  :class="statusPembayaranBadge(getItemStatusPembayaran(item))"
                >
                  {{ statusPembayaranLabel(getItemStatusPembayaran(item)) }}
                </span>
              </div>
            </div>
            <!-- Row 5: actions -->
            <div class="d-grid gap-2 mobile-action-grid">
              <div class="d-flex gap-2">
                <button class="btn btn-warning btn-sm flex-fill" @click="openStatusModal(item)">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  Update Status
                </button>
                <button
                  v-if="item.statusServis === 'Sudah Selesai' && item.noHp"
                  class="btn btn-success btn-sm flex-fill"
                  :disabled="contactingServisId === item.id"
                  @click="markCustomerContacted(item)"
                >
                  <span v-if="contactingServisId === item.id" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-telephone-outbound me-1"></i>
                  Sudah Dihubungi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop table view -->
      <div class="d-none d-md-block card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover table-sm table-bordered mb-0 desktop-servis-table" style="font-size: 0.8rem">
            <thead class="table-light">
              <tr>
                <th class="text-center" style="width: 42px">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="isCurrentPageFullySelected"
                    :disabled="currentPageSelectableItems.length === 0"
                    title="Pilih semua data yang bisa diproses di halaman ini"
                    @change="toggleCurrentPageSelection($event.target.checked)"
                  />
                </th>
                <th style="width: 38px">No</th>
                <th style="min-width: 130px">Tanggal/Jam</th>
                <th style="min-width: 90px">Sales</th>
                <th class="sticky-col-customer" style="min-width: 110px">Customer</th>
                <th class="sticky-col-phone" style="min-width: 100px">No HP</th>
                <th style="min-width: 110px">Nama Barang</th>
                <th style="width: 72px; min-width: 72px">Berat</th>
                <th style="width: 72px; min-width: 72px">Kadar</th>
                <th class="text-center" style="width: 120px; min-width: 120px">Jenis</th>
                <th style="min-width: 200px">Rincian</th>
                <th style="min-width: 90px">Pembayaran</th>
                <th v-if="filterJenis === 'custom'" class="text-end" style="min-width: 90px">DP</th>
                <th class="text-end" style="min-width: 80px">Ongkos</th>
                <th class="text-center" style="min-width: 100px">Status Servis</th>
                <th style="min-width: 140px">Penerimaan Servis</th>
                <th style="min-width: 110px">Pengambilan Servis</th>
                <th class="text-center" style="min-width: 140px">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredList.length === 0">
                <td :colspan="filterJenis === 'custom' ? 18 : 17" class="text-center text-muted py-5">
                  <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
                  Tidak ada data servis.
                </td>
              </tr>
              <tr v-for="(item, idx) in paginatedList" :key="item.id">
                <td class="text-center align-middle">
                  <input
                    v-if="isItemSelectable(item)"
                    type="checkbox"
                    class="form-check-input"
                    :checked="isItemSelected(item.id)"
                    @change="toggleItemSelection(item.id, $event.target.checked)"
                  />
                  <span v-else class="text-muted">-</span>
                </td>
                <td class="text-muted align-middle">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                <td class="align-middle">{{ formatTanggalJam(item.tanggal, item.createdAt) }}</td>
                <td class="align-middle">{{ item.namaSales || "-" }}</td>
                <td class="align-middle fw-semibold sticky-col-customer">{{ item.namaCustomer }}</td>
                <td class="align-middle sticky-col-phone">{{ item.noHp || "-" }}</td>
                <td
                  class="align-middle"
                  style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
                  :title="getItemNama(item)"
                >
                  {{ getItemNama(item) }}
                </td>
                <td class="align-middle servis-truncate-cell">
                  <span class="d-inline-block text-truncate servis-truncate-value" :title="getItemBerat(item)">
                    {{ getItemBerat(item) }}
                  </span>
                </td>
                <td class="align-middle servis-truncate-cell">
                  <span class="d-inline-block text-truncate servis-truncate-value" :title="getItemKarat(item)">
                    {{ getItemKarat(item) }}
                  </span>
                </td>
                <td class="align-middle servis-truncate-cell text-center">
                  <span
                    class="badge bg-light text-dark border text-truncate servis-jenis-badge"
                    :title="item.jenisInput === 'custom' ? 'CUSTOM' : getItemJenisServis(item)"
                  >
                    {{ item.jenisInput === "custom" ? "CUSTOM" : getItemJenisServis(item) }}
                  </span>
                </td>
                <td
                  class="align-middle"
                  style="
                    min-width: 200px;
                    max-width: 220px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                  "
                  :title="getItemRincian(item)"
                >
                  {{ getItemRincian(item) }}
                </td>
                <td class="align-middle">
                  <span class="badge" :class="statusPembayaranBadge(getItemStatusPembayaran(item))">
                    {{ statusPembayaranLabel(getItemStatusPembayaran(item)) }}
                  </span>
                </td>
                <td v-if="filterJenis === 'custom'" class="text-end align-middle fw-semibold">
                  Rp {{ Number(getItemDP(item)).toLocaleString("id-ID") }}
                </td>
                <td class="text-end align-middle fw-semibold">
                  Rp {{ Number(getItemOngkos(item)).toLocaleString("id-ID") }}
                </td>
                <td class="text-center align-middle">
                  <span class="badge" :class="statusServisBadge(item.statusServis)">
                    {{ item.statusServis }}
                  </span>
                  <br />
                  <span class="badge mt-1" :class="statusPengambilanBadge(item.statusPengambilan)">
                    {{ item.statusPengambilan }}
                  </span>
                </td>
                <td class="align-middle small">
                  <div
                    v-if="item.penerimaServis || item.waktuPenerimaan || getBuktiPenerimaanUrl(item)"
                    class="d-flex flex-column gap-1"
                  >
                    <div class="d-flex align-items-center justify-content-between">
                      <span v-if="item.penerimaServis">{{ item.penerimaServis }}</span>
                      <button
                        v-if="getBuktiPenerimaanUrl(item)"
                        class="btn btn-outline-warning btn-sm py-0 px-1"
                        @click="openBuktiModalByUrl(getBuktiPenerimaanUrl(item), 'Bukti Penerimaan')"
                        title="Lihat bukti penerimaan"
                      >
                        <i class="bi bi-camera"></i>
                      </button>
                    </div>
                    <span v-if="item.waktuPenerimaan" class="text-muted">
                      {{ formatWaktu(item.waktuPenerimaan) }}
                    </span>
                  </div>
                  <span v-if="!item.penerimaServis && !item.waktuPenerimaan" class="text-muted">-</span>
                </td>
                <td class="align-middle small">
                  <div
                    v-if="item.stafHandle || item.waktuPengambilan || getBuktiPengambilanUrl(item)"
                    class="d-flex flex-column gap-1"
                  >
                    <div class="d-flex align-items-center justify-content-between">
                      <div class="d-flex align-items-center gap-1">
                        <span v-if="item.stafHandle">{{ item.stafHandle }}</span>
                        <span v-if="isReturnOwnerItem(item)" class="badge bg-warning text-dark">Return Owner</span>
                      </div>
                      <button
                        v-if="getBuktiPengambilanUrl(item)"
                        class="btn btn-outline-info btn-sm py-0 px-1"
                        @click="openBuktiModalByUrl(getBuktiPengambilanUrl(item), 'Bukti Pengambilan')"
                        title="Lihat bukti pengambilan"
                      >
                        <i class="bi bi-camera"></i>
                      </button>
                    </div>
                    <span v-if="item.waktuPengambilan" class="text-muted">
                      {{ formatWaktu(item.waktuPengambilan) }}
                    </span>
                  </div>
                  <span v-if="!item.stafHandle && !item.waktuPengambilan" class="text-muted">-</span>
                </td>
                <td class="text-center align-middle">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning" @click="openStatusModal(item)" title="Update Status">
                      <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button
                      v-if="item.statusServis === 'Sudah Selesai' && item.noHp"
                      class="btn btn-success"
                      :disabled="contactingServisId === item.id"
                      @click="markCustomerContacted(item)"
                      title="Tandai sudah dihubungi"
                    >
                      <span
                        v-if="contactingServisId === item.id"
                        class="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <i v-else class="bi bi-telephone-outbound"></i>
                    </button>
                    <button
                      class="btn btn-primary"
                      @click="rePrint(item)"
                      :disabled="Boolean(printingServisId)"
                      title="Cetak ulang"
                    >
                      <span
                        v-if="printingServisId === item.id"
                        class="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <i v-else class="bi bi-printer"></i>
                    </button>
                    <button class="btn btn-secondary" @click="printSingleLabel(item)" title="Print label">
                      <i class="bi bi-tag"></i>
                    </button>
                    <button class="btn btn-info text-white" @click="openEditModal(item)" title="Edit (perlu password)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger" @click="confirmDelete(item)" title="Hapus (perlu password)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="d-flex align-items-center justify-content-between flex-wrap gap-2 px-3 py-2 mt-2 card border-0 shadow-sm"
      >
        <span class="small text-muted">
          Halaman {{ currentPage }} dari {{ totalPages }} ({{ filteredList.length }} data)
        </span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="currentPage = 1">&laquo;</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <button class="page-link" @click="currentPage--">&lsaquo;</button>
            </li>
            <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === currentPage }">
              <button class="page-link" @click="currentPage = p">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="currentPage++">&rsaquo;</button>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <button class="page-link" @click="currentPage = totalPages">&raquo;</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- ── Status Modal ── -->
    <div class="modal fade" id="statusModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-arrow-repeat me-1 text-warning"></i>
              Update Status
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-3">
              Customer:
              <strong>{{ statusForm.namaCustomer }}</strong>
              <br />
              Barang: {{ statusForm.namaBarang }}
            </p>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Status Servis</label>
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="badge" :class="statusServisBadge(statusForm.statusServis)">
                  {{ statusForm.statusServis || "-" }}
                </span>
                <small class="text-muted">
                  {{
                    statusForm.statusServis === statusForm.initialStatusServis
                      ? "Status saat ini"
                      : "Status setelah simpan"
                  }}
                </small>
              </div>
              <div class="form-check">
                <input
                  id="statusServisToggle"
                  v-model="statusForm.toggleStatusServis"
                  class="form-check-input"
                  type="checkbox"
                  @change="onStatusServisToggleChange"
                />
                <label class="form-check-label small" for="statusServisToggle">
                  {{ statusServisToggleLabel }}
                </label>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Status Pengambilan</label>
              <select v-model="statusForm.statusPengambilan" class="form-select form-select-sm">
                <option value="Belum Diambil">Belum Diambil</option>
                <option value="Sudah Diambil">Sudah Diambil</option>
              </select>
            </div>
            <div v-if="showPelunasanField" class="mb-2">
              <label class="form-label small fw-semibold">Status Pembayaran Saat Pengambilan</label>
              <select v-model="statusForm.statusPembayaranUpdate" class="form-select form-select-sm">
                <option value="belum_lunas">Belum Lunas</option>
                <option value="nominal">Sudah Lunas</option>
              </select>
              <div class="small text-muted mt-1">Data hanya bisa disimpan jika pembayaran sudah LUNAS.</div>
            </div>
            <div v-if="statusForm.statusPengambilan === 'Sudah Diambil'" class="mb-2">
              <label class="form-label small fw-semibold">Nama Staf Handle</label>
              <select v-model="statusForm.stafHandle" class="form-select form-select-sm">
                <option value="">Pilih...</option>
                <option v-for="s in salesOptions" :key="s.id" :value="s.nama">{{ s.nama }}</option>
              </select>
            </div>
            <!-- Bukti foto pengambilan -->
            <div v-if="statusForm.statusPengambilan === 'Sudah Diambil'" class="mb-2">
              <label class="form-label small fw-semibold">
                Bukti Pengambilan
                <span class="text-danger">*</span>
              </label>
              <input
                ref="photoInputRef"
                type="file"
                accept="image/*"
                class="form-control form-control-sm"
                @change="onPhotoChange"
              />
              <div v-if="!hasPhotoEvidence" class="small text-danger mt-1">
                Upload foto bukti sebelum menyimpan status "Sudah Diambil".
              </div>
              <div v-if="photoPreviewUrl" class="mt-2">
                <img
                  :src="photoPreviewUrl"
                  alt="Preview"
                  class="img-fluid rounded border"
                  style="max-height: 200px; object-fit: contain"
                />
                <button type="button" class="btn btn-outline-danger btn-sm mt-1 d-block" @click="clearPhoto">
                  <i class="bi bi-x-circle me-1"></i>
                  Hapus foto
                </button>
              </div>
              <div v-if="statusForm.existingBuktiUrl && !photoPreviewUrl" class="mt-2">
                <span class="small text-muted">Bukti sebelumnya:</span>
                <a :href="statusForm.existingBuktiUrl" target="_blank" class="small">Lihat</a>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveStatus" :disabled="isStatusSaveDisabled">
              <span v-if="statusSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Revert Pengambilan Verify Modal ── -->
    <div class="modal fade" id="revertPickupModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-shield-lock me-1 text-primary"></i>
              Verifikasi Ubah Status Pengambilan
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Masukkan password untuk mengubah status dari
              <strong>Sudah Diambil</strong>
              ke
              <strong>Belum Diambil</strong>
              .
            </p>
            <input
              v-model="revertPassword"
              type="password"
              name="supervisorRevertPassword"
              autocomplete="new-password"
              class="form-control form-control-sm"
              placeholder="Masukkan password"
              @keydown.enter="confirmRevertPickup"
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-primary btn-sm" @click="confirmRevertPickup" :disabled="revertVerifying">
              <span v-if="revertVerifying" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-unlock me-1"></i>
              Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Revert Status Servis Verify Modal ── -->
    <div class="modal fade" id="revertStatusServisModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-shield-lock me-1 text-primary"></i>
              Verifikasi Ubah Status Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Masukkan password untuk mengubah status servis dari
              <strong>Sudah Selesai</strong>
              ke
              <strong>Belum Selesai</strong>
              .
            </p>
            <input
              v-model="revertStatusServisPassword"
              type="password"
              name="supervisorRevertStatusServisPassword"
              autocomplete="new-password"
              class="form-control form-control-sm"
              placeholder="Masukkan password"
              @keydown.enter="confirmRevertStatusServis"
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button
              class="btn btn-primary btn-sm"
              @click="confirmRevertStatusServis"
              :disabled="revertStatusServisVerifying"
            >
              <span v-if="revertStatusServisVerifying" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-unlock me-1"></i>
              Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Penerimaan Servis Modal ── -->
    <div class="modal fade" id="penerimaanModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-clipboard-check me-1 text-warning"></i>
              Penerimaan Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label small fw-semibold">Nama Penerima</label>
              <select v-model="penerimaanForm.penerima" class="form-select form-select-sm">
                <option value="">Pilih...</option>
                <option v-for="s in salesOptions" :key="s.id" :value="s.nama">{{ s.nama }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-semibold">
                Bukti Penerimaan
                <span class="text-danger">*</span>
              </label>
              <input
                ref="penerimaanInputRef"
                type="file"
                accept="image/*"
                class="form-control form-control-sm"
                @change="onPenerimaanPhotoChange"
              />
              <div v-if="!hasPenerimaanPhoto" class="small text-danger mt-1">Upload foto bukti sebelum menyimpan.</div>
              <div v-if="penerimaanPhotoPreviewUrl" class="mt-2">
                <img
                  :src="penerimaanPhotoPreviewUrl"
                  alt="Preview"
                  class="img-fluid rounded border"
                  style="max-height: 200px; object-fit: contain"
                />
                <button type="button" class="btn btn-outline-danger btn-sm mt-1 d-block" @click="clearPenerimaanPhoto">
                  <i class="bi bi-x-circle me-1"></i>
                  Hapus foto
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="savePenerimaanServis" :disabled="isPenerimaanSaveDisabled">
              <span v-if="penerimaanSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Return Owner Modal ── -->
    <div class="modal fade" id="returnOwnerModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-arrow-return-left me-1 text-dark"></i>
              Return ke Owner
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Data terpilih:
              <strong>{{ returnOwnerTargetIds.length }}</strong>
              item
            </p>
            <div class="mb-2">
              <label class="form-label small fw-semibold">Nama Sales</label>
              <select v-model="returnOwnerForm.salesName" class="form-select form-select-sm">
                <option value="">Pilih...</option>
                <option v-for="s in salesOptions" :key="s.id" :value="s.nama">{{ s.nama }}</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-semibold">
                Bukti Return
                <span class="text-danger">*</span>
              </label>
              <input
                ref="returnOwnerInputRef"
                type="file"
                accept="image/*"
                class="form-control form-control-sm"
                @change="onReturnOwnerPhotoChange"
              />
              <div v-if="!hasReturnOwnerPhoto" class="small text-danger mt-1">
                Upload foto bukti return sebelum menyimpan.
              </div>
              <div v-if="returnOwnerPhotoPreviewUrl" class="mt-2">
                <img
                  :src="returnOwnerPhotoPreviewUrl"
                  alt="Preview"
                  class="img-fluid rounded border"
                  style="max-height: 200px; object-fit: contain"
                />
                <button type="button" class="btn btn-outline-danger btn-sm mt-1 d-block" @click="clearReturnOwnerPhoto">
                  <i class="bi bi-x-circle me-1"></i>
                  Hapus foto
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-dark btn-sm" @click="saveReturnOwner" :disabled="isReturnOwnerSaveDisabled">
              <span v-if="returnOwnerSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit Verify Modal (md) ── -->
    <div class="modal fade" id="editVerifyModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-shield-lock me-1 text-primary"></i>
              Verifikasi Edit Data Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">Masukkan password untuk melanjutkan.</p>
            <input
              v-model="editPassword"
              type="password"
              name="supervisorVerifyPassword"
              autocomplete="new-password"
              class="form-control form-control-sm"
              placeholder="Masukkan password"
              @keydown.enter="unlockEdit"
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-primary btn-sm" @click="unlockEdit" :disabled="editUnlocking">
              <span v-if="editUnlocking" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-unlock me-1"></i>
              Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Edit Modal (xl) ── -->
    <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-pencil me-1 text-primary"></i>
              Edit Data Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <!-- Header fields -->
            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Tanggal</label>
                <input v-model="editForm.tanggal" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Nama Sales</label>
                <select v-model="editForm.namaSales" class="form-select form-select-sm">
                  <option value="">Pilih...</option>
                  <option v-for="s in salesOptions" :key="s.id" :value="s.nama">{{ s.nama }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">Nama Customer</label>
                <input v-model="editForm.namaCustomer" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold">No HP</label>
                <input v-model="editForm.noHp" type="text" class="form-control form-control-sm" />
              </div>
            </div>

            <!-- Servis rows -->
            <div v-if="editForm.jenisInput === 'servis'">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small fw-semibold">
                  <i class="bi bi-list-ul me-1 text-warning"></i>
                  Detail Barang Servis
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="editForm.servisRows.push(newServisRow())"
                >
                  <i class="bi bi-plus me-1"></i>
                  Tambah Baris
                </button>
              </div>
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0" style="font-size: 0.8rem">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 50px">Jml</th>
                      <th>Nama Barang</th>
                      <th style="width: 90px">Berat</th>
                      <th style="width: 80px">Karat</th>
                      <th style="width: 160px">
                        Jenis Servis
                        <span class="text-danger">*</span>
                      </th>
                      <th>Rincian</th>
                      <th style="width: 110px">Ongkos (Rp)</th>
                      <th style="width: 130px">Status Bayar</th>
                      <th style="width: 36px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in editForm.servisRows" :key="idx">
                      <td>
                        <input
                          v-model.number="row.jumlah"
                          type="number"
                          min="1"
                          class="form-control form-control-sm text-center"
                        />
                      </td>
                      <td>
                        <input
                          v-model="row.namaBarang"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama barang"
                        />
                      </td>
                      <td>
                        <input
                          v-model="row.berat"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="gr/cm"
                        />
                      </td>
                      <td>
                        <input v-model="row.karat" type="text" class="form-control form-control-sm" placeholder="22K" />
                      </td>
                      <td>
                        <select v-model="row.jenisServis" class="form-select form-select-sm">
                          <option value="">Pilih...</option>
                          <option v-for="j in JENIS_SERVIS_OPTIONS" :key="j" :value="j">{{ j }}</option>
                        </select>
                      </td>
                      <td>
                        <input
                          v-model="row.rincianServis"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Keterangan"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="row.ongkos"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                          @input="row.statusPembayaran = row.ongkos > 0 ? 'nominal' : 'free'"
                        />
                      </td>
                      <td>
                        <select v-model="row.statusPembayaran" class="form-select form-select-sm">
                          <option v-for="s in STATUS_PEMBAYARAN_OPTIONS" :key="s.value" :value="s.value">
                            {{ s.label }}
                          </option>
                        </select>
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          @click="editForm.servisRows.splice(idx, 1)"
                          :disabled="editForm.servisRows.length === 1"
                        >
                          <i class="bi bi-x"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="table-light">
                    <tr>
                      <td colspan="6" class="text-end fw-semibold">Total Ongkos:</td>
                      <td class="fw-bold text-success">Rp {{ editTotalOngkos.toLocaleString("id-ID") }}</td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Custom rows -->
            <div v-else>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small fw-semibold">
                  <i class="bi bi-stars me-1 text-warning"></i>
                  Detail Barang Custom
                </span>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="editForm.customRows.push(newCustomRow())"
                >
                  <i class="bi bi-plus me-1"></i>
                  Tambah Baris
                </button>
              </div>
              <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0" style="font-size: 0.8rem">
                  <thead class="table-light">
                    <tr>
                      <th style="width: 50px">Jml</th>
                      <th>Nama Barang</th>
                      <th style="width: 80px">Berat</th>
                      <th style="width: 80px">Panjang</th>
                      <th style="width: 70px">Kadar</th>
                      <th style="width: 80px">Warna</th>
                      <th style="width: 110px">DP (Rp)</th>
                      <th style="width: 110px">Ongkos (Rp)</th>
                      <th style="width: 120px">Status Bayar</th>
                      <th>Rincian</th>
                      <th style="width: 36px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in editForm.customRows" :key="idx">
                      <td>
                        <input
                          v-model.number="row.jumlah"
                          type="number"
                          min="1"
                          class="form-control form-control-sm text-center"
                        />
                      </td>
                      <td>
                        <input
                          v-model="row.namaBarang"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Nama barang"
                        />
                      </td>
                      <td>
                        <input v-model="row.berat" type="text" class="form-control form-control-sm" placeholder="gr" />
                      </td>
                      <td>
                        <input
                          v-model="row.panjang"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="cm"
                        />
                      </td>
                      <td>
                        <input v-model="row.kadar" type="text" class="form-control form-control-sm" placeholder="22K" />
                      </td>
                      <td>
                        <input
                          v-model="row.warna"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Kuning"
                        />
                      </td>
                      <td>
                        <input
                          v-model.number="row.totalDP"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                      <td>
                        <input v-model.number="row.ongkos" type="number" min="0" class="form-control form-control-sm" />
                      </td>
                      <td>
                        <select v-model="row.statusPembayaran" class="form-select form-select-sm">
                          <option v-for="s in STATUS_PEMBAYARAN_CUSTOM" :key="s.value" :value="s.value">
                            {{ s.label }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <input
                          v-model="row.rincianServis"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Keterangan"
                        />
                      </td>
                      <td class="text-center">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          @click="editForm.customRows.splice(idx, 1)"
                          :disabled="editForm.customRows.length === 1"
                        >
                          <i class="bi bi-x"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="table-light">
                    <tr>
                      <td colspan="7" class="text-end fw-semibold">Total Ongkos:</td>
                      <td class="fw-bold text-success">Rp {{ editTotalOngkos.toLocaleString("id-ID") }}</td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-primary btn-sm" @click="saveEdit" :disabled="editSaving">
              <span v-if="editSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Delete Password Modal ── -->
    <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold text-danger">
              <i class="bi bi-trash me-1"></i>
              Hapus Data Servis
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Hapus data servis
              <strong>{{ deleteTarget?.namaCustomer }}</strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <input
              v-model="deletePassword"
              type="password"
              name="supervisorDeletePassword"
              autocomplete="new-password"
              class="form-control form-control-sm"
              placeholder="Masukkan password"
            />
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-danger btn-sm" @click="doDelete" :disabled="deleteSaving">
              <span v-if="deleteSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-trash me-1"></i>
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Bukti Viewer Modal ── -->
    <div class="modal fade" id="buktiModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-image me-1"></i>
              {{ buktiViewTitle }}
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <img
              v-if="buktiViewUrl"
              :src="buktiViewUrl"
              alt="Bukti Pengambilan"
              class="img-fluid rounded"
              style="max-height: 70vh"
            />
          </div>
        </div>
      </div>
    </div>

    <PrintFailedModal
      v-model="showPrintFailedModal"
      failed-title="Gagal Cetak Nota Servis"
      :message="printFailedMessage"
      :retrying="Boolean(printingServisId)"
      @retry="retryPrintServis"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { useAuthStore } from "@/stores/auth";
import PrintFailedModal from "@/components/common/PrintFailedModal.vue";
import { fetchSalesList } from "@/services/sales-service";
import {
  fetchServisByRange,
  subscribeServisByRange,
  updateServisStatus,
  bulkMarkServisSudahDiambil,
  bulkMarkServisPenerimaan,
  updateServisData,
  deleteServis,
  verifySupervisorPassword,
  printServisSlip,
  uploadBuktiPengambilan,
  uploadBuktiPenerimaanServis,
  getCachedServis,
  setCachedServis,
  invalidateCachedServis,
  statusServisBadge,
  statusPengambilanBadge,
  statusPembayaranBadge,
  statusPembayaranLabel,
  JENIS_SERVIS_OPTIONS,
  STATUS_PEMBAYARAN_OPTIONS,
  STATUS_PEMBAYARAN_CUSTOM,
} from "@/services/servis-service";

const { swal, confirm, error: showError } = useAlert();
const { toWITA, todayStringWITA } = useWITA();
const authStore = useAuthStore();
const DEFAULT_DATE = todayStringWITA();

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false);
const allItems = ref([]);
const filterStartDate = ref(DEFAULT_DATE);
const filterEndDate = ref(DEFAULT_DATE);
const filterJenis = ref("servis");
const filterStatus = ref("Belum Selesai");
const filterPengambilan = ref("Belum Diambil");
const searchText = ref("");
const searchReadonly = ref(true);
const hasLoaded = ref(false);
const bulkUpdatingStatusServis = ref(false);
const selectedServisIds = ref([]);
const normalizedUserRole = computed(() =>
  String(authStore.userRole || "")
    .trim()
    .toLowerCase(),
);
const isSupervisor = computed(() => normalizedUserRole.value === "supervisor");
const canReturnOwner = computed(() => ["admin", "supervisor"].includes(normalizedUserRole.value));
const canReceiveServis = computed(() => ["admin", "kasir", "supervisor"].includes(normalizedUserRole.value));

// Pagination
const currentPage = ref(1);
const pageSize = 25;

let unsubscribe = null;

// Status modal
const statusSaving = ref(false);
const photoInputRef = ref(null);
const photoFile = ref(null);
const salesOptions = ref([]);
const photoPreviewUrl = ref("");
const revertPassword = ref("");
const revertVerifying = ref(false);
const allowRevertWithoutPassword = ref(false);
const pendingReopenStatusModal = ref(false);
const revertStatusServisPassword = ref("");
const revertStatusServisVerifying = ref(false);
const allowRevertStatusServisWithoutPassword = ref(false);
const pendingReopenStatusServisModal = ref(false);
const statusForm = ref({
  id: "",
  namaCustomer: "",
  namaBarang: "",
  initialStatusServis: "",
  toggleStatusServis: false,
  statusServis: "",
  statusPengambilan: "",
  stafHandle: "",
  existingBuktiUrl: "",
  hasBelumLunas: false,
  statusPembayaranUpdate: "",
});
const statusTargetItem = ref(null);
const statusModalWasOpen = ref(false);

const hasPhotoEvidence = computed(() => Boolean(photoFile.value || statusForm.value.existingBuktiUrl));
const showPelunasanField = computed(
  () => statusForm.value.statusPengambilan === "Sudah Diambil" && statusForm.value.hasBelumLunas,
);
const isLunasRequiredButUnselected = computed(
  () => showPelunasanField.value && statusForm.value.statusPembayaranUpdate !== "nominal",
);

const isStatusSaveDisabled = computed(
  () =>
    statusSaving.value ||
    (statusForm.value.statusPengambilan === "Sudah Diambil" && !hasPhotoEvidence.value) ||
    isLunasRequiredButUnselected.value,
);

const statusServisToggleLabel = computed(() => {
  if (statusForm.value.initialStatusServis === "Sudah Selesai") {
    return "Ubah status menjadi Belum Selesai";
  }
  return "Ubah status menjadi Sudah Selesai";
});

// Penerimaan servis modal
const penerimaanSaving = ref(false);
const penerimaanInputRef = ref(null);
const penerimaanPhotoFile = ref(null);
const penerimaanPhotoPreviewUrl = ref("");
const penerimaanTargetIds = ref([]);
const penerimaanForm = ref({
  penerima: "",
  catatan: "",
});

const hasPenerimaanPhoto = computed(() => Boolean(penerimaanPhotoFile.value));
const isPenerimaanSaveDisabled = computed(
  () =>
    penerimaanSaving.value ||
    !penerimaanForm.value.penerima?.trim() ||
    !hasPenerimaanPhoto.value ||
    !penerimaanTargetIds.value.length,
);

// Return owner modal
const returnOwnerSaving = ref(false);
const returnOwnerInputRef = ref(null);
const returnOwnerPhotoFile = ref(null);
const returnOwnerPhotoPreviewUrl = ref("");
const returnOwnerTargetIds = ref([]);
const returnOwnerForm = ref({
  salesName: "",
});
const hasReturnOwnerPhoto = computed(() => Boolean(returnOwnerPhotoFile.value));
const isReturnOwnerSaveDisabled = computed(
  () =>
    returnOwnerSaving.value ||
    !returnOwnerForm.value.salesName?.trim() ||
    !hasReturnOwnerPhoto.value ||
    !returnOwnerTargetIds.value.length,
);

// Edit modal
const editUnlocking = ref(false);
const editSaving = ref(false);
const editPassword = ref("");
const editForm = ref({
  id: "",
  tanggal: "",
  namaSales: "",
  namaCustomer: "",
  noHp: "",
  jenisInput: "servis",
  servisRows: [],
  customRows: [],
});

const editTotalOngkos = computed(() => {
  const rows = editForm.value.jenisInput === "custom" ? editForm.value.customRows : editForm.value.servisRows;
  return rows.reduce((sum, r) => sum + Number(r.ongkos || 0), 0);
});

const newServisRow = () => ({
  jumlah: 1,
  namaBarang: "",
  berat: "",
  karat: "",
  jenisServis: "",
  rincianServis: "",
  ongkos: 0,
  statusPembayaran: "nominal",
});

const newCustomRow = () => ({
  jumlah: 1,
  namaBarang: "",
  berat: "",
  panjang: "",
  kadar: "",
  warna: "",
  totalDP: 0,
  ongkos: 0,
  statusPembayaran: "nominal",
  rincianServis: "",
});

// Delete modal
const deleteTarget = ref(null);
const deletePassword = ref("");
const deleteSaving = ref(false);

// Bukti viewer
const buktiViewUrl = ref("");
const buktiViewTitle = ref("Bukti Foto");
const showPrintFailedModal = ref(false);
const printFailedMessage = ref("Pastikan printing service sudah dijalankan di komputer ini.");
const failedPrintItem = ref(null);
const printingServisId = ref("");
const contactingServisId = ref("");
const contactTextRef = ref(null);
const contactExportText = ref("");

const contactExportSummary = computed(() => {
  return `${filteredList.value.length} data | ${filteredList.value.filter((item) => item.noHp).length} nomor HP tersedia`;
});

// ── Helpers ───────────────────────────────────────────────────────────────
function getItems(item) {
  return item.jenisInput === "custom" ? item.detailBarangCustom || [] : item.detailBarang || [];
}

function joinField(item, field) {
  const items = getItems(item);
  if (!items.length) return item[field] || "-";
  const vals = items.map((i) => i[field] || "").filter(Boolean);
  return vals.length ? vals.join(" / ") : "-";
}

function getItemNama(item) {
  return joinField(item, "namaBarang");
}

function getItemBerat(item) {
  return joinField(item, "berat");
}

function getItemKarat(item) {
  const items = getItems(item);
  if (!items.length) return "-";
  const vals = items.map((i) => i.karat || i.kadar || "").filter(Boolean);
  return vals.length ? vals.join(" / ") : "-";
}

function getItemJenisServis(item) {
  return joinField(item, "jenisServis");
}

function getItemRincian(item) {
  return joinField(item, "rincianServis");
}

function getItemStatusPembayaran(item) {
  const items = getItems(item);
  if (!items.length) return item.statusPembayaran || "";
  return items[0]?.statusPembayaran || "";
}

function hasBelumLunasPembayaran(item) {
  const items = getItems(item);
  if (!items.length) return item.statusPembayaran === "belum_lunas";
  return items.some((row) => row?.statusPembayaran === "belum_lunas");
}

function getItemOngkos(item) {
  if (item.totalOngkos != null) return item.totalOngkos;
  const items = getItems(item);
  if (!items.length) return item.ongkos || 0;
  return items.reduce((sum, i) => sum + Number(i.ongkos || 0), 0);
}

function getItemDP(item) {
  const isCustom = (item?.jenisInput || "servis") === "custom";
  if (!isCustom) return 0;
  if (item.totalDP != null) return Number(item.totalDP || 0);

  const items = getItems(item);
  if (!items.length) return Number(item.dp || 0);
  return items.reduce((sum, i) => sum + Number(i.totalDP || i.dp || 0), 0);
}

function normalizePhoneForDisplay(phone) {
  const cleaned = String(phone || "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "-";
}

function getContactMessage(item) {
  const namaCustomer = item?.namaCustomer || "Kak";
  const namaBarang = getItemNama(item) || "-";
  const isCustom = (item?.jenisInput || "servis") === "custom";
  const jenisLabel = isCustom ? "CUSTOM" : getItemJenisServis(item) || "SERVIS";
  const barangLabel = isCustom ? "Barang custom" : "Barang servis";

  return (
    `Halo Kak ${namaCustomer},\n` +
    `${barangLabel} Kakak sudah selesai.\n` +
    `(${namaBarang})\n` +
    `Jenis: ${jenisLabel}\n` +
    `Silahkan datang ke Melati Gold Shop untuk mengambil barangnya ya kak. Terima kasih`
  );
}

function buildContactExportText() {
  const items = filteredList.value;
  if (!items.length) return "Tidak ada data servis untuk diekspor.";

  const lines = [];
  items.forEach((item, index) => {
    lines.push(`Data ${index + 1}`);
    lines.push(`Customer: ${item.namaCustomer || "-"}`);
    lines.push(`No HP: ${normalizePhoneForDisplay(item.noHp)}`);
    lines.push("Pesan:");
    lines.push(getContactMessage(item));
    if (item.waktuDihubungiTerakhir) {
      lines.push(`Terakhir dihubungi: ${formatWaktu(item.waktuDihubungiTerakhir)}`);
    }
    if (index < items.length - 1) lines.push("");
  });

  return lines.join("\n");
}

function refreshContactExportText() {
  contactExportText.value = buildContactExportText();
}

function openContactTextModal() {
  refreshContactExportText();
  Modal.getOrCreateInstance(document.getElementById("contactTextModal")).show();
}

async function copyContactText() {
  const text = contactExportText.value || buildContactExportText();
  if (!text.trim()) return swal("Tidak ada teks untuk disalin", "warning");

  try {
    await navigator.clipboard.writeText(text);
    swal("Teks kontak berhasil disalin", "success");
  } catch {
    const textarea = contactTextRef.value;
    if (textarea) {
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      if (copied) return swal("Teks kontak berhasil disalin", "success");
    }
    swal("Gagal menyalin teks. Silakan salin manual dari kotak teks.", "warning");
  }
}

function downloadContactText() {
  const text = contactExportText.value || buildContactExportText();
  if (!text.trim()) return swal("Tidak ada teks untuk diunduh", "warning");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Teks_Kontak_${getDateRangeFileSuffix()}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTanggal(val) {
  if (!val) return "-";
  // ISO datetime or plain date string — take first 10 chars
  return String(val).substring(0, 10);
}

function parseToMillis(val) {
  if (!val) return NaN;
  if (val && typeof val === "object" && val.seconds != null) {
    return Number(val.seconds) * 1000;
  }
  if (val && typeof val === "object" && typeof val.toDate === "function") {
    const d = val.toDate();
    return d instanceof Date ? d.getTime() : NaN;
  }
  return new Date(val).getTime();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isDateOnlyString(val) {
  return typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

function formatTanggalJam(val, fallbackTimestamp = null) {
  const datePartFromValue = val ? String(val).substring(0, 10) : "";

  let ms = isDateOnlyString(val) ? parseToMillis(fallbackTimestamp) : parseToMillis(val);
  if (isNaN(ms)) {
    ms = parseToMillis(fallbackTimestamp);
  }

  let datePart = datePartFromValue;
  if (!datePart && !isNaN(ms)) {
    const d = toWITA(new Date(ms));
    datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  if (!datePart) return "-";

  if (isNaN(ms)) return datePart;
  const d = toWITA(new Date(ms));
  return `${datePart} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatWaktu(val) {
  if (!val) return "";
  try {
    const ms = parseToMillis(val);
    if (isNaN(ms)) return String(val);
    const d = toWITA(new Date(ms));
    return (
      d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return String(val);
  }
}

function isToday() {
  const today = todayStringWITA();
  return filterStartDate.value === today && filterEndDate.value === today;
}

function getDateRangeLabel() {
  if (filterStartDate.value === filterEndDate.value) return filterStartDate.value;
  return `${filterStartDate.value} s/d ${filterEndDate.value}`;
}

function getDateRangeFileSuffix() {
  if (filterStartDate.value === filterEndDate.value) return filterStartDate.value;
  return `${filterStartDate.value}_sd_${filterEndDate.value}`;
}

function validateDateRange() {
  if (!filterStartDate.value || !filterEndDate.value) {
    swal("Pilih tanggal awal dan tanggal akhir", "warning");
    return false;
  }
  if (filterStartDate.value > filterEndDate.value) {
    swal("Tanggal awal tidak boleh lebih besar dari tanggal akhir", "warning");
    return false;
  }
  return true;
}

function invalidateCurrentRangeCache() {
  invalidateCachedServis(filterStartDate.value, filterEndDate.value);
}

// ── Computed ──────────────────────────────────────────────────────────────
const filteredList = computed(() => {
  let list = allItems.value;
  list = list.filter((i) => (i.jenisInput || "servis") === filterJenis.value);
  if (filterStatus.value) list = list.filter((i) => i.statusServis === filterStatus.value);
  if (filterPengambilan.value) list = list.filter((i) => i.statusPengambilan === filterPengambilan.value);
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    list = list.filter((i) => {
      const phoneRaw = String(i.noHp || "");
      const phone = phoneRaw.toLowerCase();
      const phoneDigits = phoneRaw.replace(/\D/g, "");

      const textMatch =
        (i.namaCustomer || "").toLowerCase().includes(q) ||
        (i.namaBarang || "").toLowerCase().includes(q) ||
        (i.namaSales || "").toLowerCase().includes(q) ||
        phone.includes(q);
      if (textMatch) return true;

      if (!qDigits) return false;
      return phoneDigits.includes(qDigits);
    });
  }
  return list;
});

function isFinishSelectable(item) {
  return canReceiveServis.value && item.statusServis === "Belum Selesai";
}

function isPickupSelectable(item) {
  return canReturnOwner.value && item.statusServis === "Sudah Selesai" && item.statusPengambilan === "Belum Diambil";
}

function isBulkSelectable(item) {
  return isFinishSelectable(item) || isPickupSelectable(item);
}

const selectableServisIdSet = computed(() => new Set(filteredList.value.filter(isBulkSelectable).map((i) => i.id)));
const selectedServisFinishCount = computed(
  () =>
    selectedServisIds.value.filter((id) =>
      filteredList.value.some((item) => item.id === id && isFinishSelectable(item)),
    ).length,
);
const selectedServisPickupCount = computed(
  () =>
    selectedServisIds.value.filter((id) =>
      filteredList.value.some((item) => item.id === id && isPickupSelectable(item)),
    ).length,
);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize)));

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredList.value.slice(start, start + pageSize);
});

const currentPageSelectableItems = computed(() => paginatedList.value.filter(isBulkSelectable));

const isCurrentPageFullySelected = computed(() => {
  if (!currentPageSelectableItems.value.length) return false;
  return currentPageSelectableItems.value.every((item) => selectedServisIds.value.includes(item.id));
});

const isFinishSelectedDisabled = computed(
  () =>
    loading.value ||
    !hasLoaded.value ||
    bulkUpdatingStatusServis.value ||
    selectedServisFinishCount.value === 0 ||
    !canReceiveServis.value,
);

const isMarkTakenSelectedDisabled = computed(
  () =>
    loading.value ||
    !hasLoaded.value ||
    bulkUpdatingStatusServis.value ||
    returnOwnerSaving.value ||
    selectedServisPickupCount.value === 0,
);

const isReturnOwnerSelectedDisabled = computed(
  () =>
    loading.value ||
    !hasLoaded.value ||
    bulkUpdatingStatusServis.value ||
    returnOwnerSaving.value ||
    selectedServisPickupCount.value === 0,
);

const visiblePages = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  const delta = 2;
  const pages = [];
  for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
    pages.push(i);
  }
  return pages;
});

// Reset to page 1 whenever filters change
function resetPage() {
  currentPage.value = 1;
}

function unlockSearchInput() {
  searchReadonly.value = false;
}

function isItemSelectable(item) {
  return isBulkSelectable(item);
}

function isReturnOwnerItem(item) {
  return item?.metodePengambilan === "return_owner";
}

function isItemSelected(id) {
  return selectedServisIds.value.includes(id);
}

function toggleItemSelection(id, checked) {
  if (!selectableServisIdSet.value.has(id)) return;

  const next = new Set(selectedServisIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  selectedServisIds.value = [...next];
}

function toggleCurrentPageSelection(checked) {
  const pageIds = currentPageSelectableItems.value.map((item) => item.id);
  if (!pageIds.length) return;

  const next = new Set(selectedServisIds.value);
  pageIds.forEach((id) => {
    if (checked) next.add(id);
    else next.delete(id);
  });
  selectedServisIds.value = [...next];
}

// ── Data Loading ──────────────────────────────────────────────────────────
function cleanupListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

async function loadData() {
  if (!validateDateRange()) return;

  cleanupListener();
  loading.value = true;
  hasLoaded.value = false;
  selectedServisIds.value = [];
  resetPage();

  try {
    if (isToday()) {
      // Real-time for today
      unsubscribe = subscribeServisByRange(filterStartDate.value, filterEndDate.value, (data) => {
        allItems.value = data;
        loading.value = false;
        hasLoaded.value = true;
      });
    } else {
      const data = await fetchServisByRange(filterStartDate.value, filterEndDate.value);
      allItems.value = data;
      loading.value = false;
      hasLoaded.value = true;
    }
  } catch (e) {
    showError("Gagal memuat data", e.message);
    loading.value = false;
    hasLoaded.value = false;
  }
}

// ── Bulk Status Servis ───────────────────────────────────────────────────
async function updateSelectedServisSelesai() {
  if (!canReceiveServis.value) {
    return swal("Aksi ini hanya untuk admin, kasir, atau supervisor", "warning");
  }

  const targetIds = selectedServisIds.value.filter((id) =>
    filteredList.value.some((item) => item.id === id && isFinishSelectable(item)),
  );
  if (!targetIds.length) {
    return swal("Pilih data yang ingin diselesaikan terlebih dahulu", "warning");
  }

  openPenerimaanModal(targetIds);
}

async function updateSelectedServisSudahDiambil() {
  if (!isSupervisor.value) {
    return swal("Aksi ini hanya untuk supervisor", "warning");
  }

  const targetIds = selectedServisIds.value.filter((id) =>
    filteredList.value.some((item) => item.id === id && isPickupSelectable(item)),
  );
  if (!targetIds.length) {
    return swal("Pilih data yang sudah selesai dan belum diambil terlebih dahulu", "warning");
  }

  const result = await confirm({
    title: "Tandai data terpilih sebagai sudah diambil?",
    text:
      `${targetIds.length} data yang dicentang akan diubah ke status pengambilan 'Sudah Diambil'. ` +
      "Waktu pengambilan akan diisi otomatis.",
    confirmText: "Ya, tandai sudah diambil",
  });
  if (!result.isConfirmed) return;

  bulkUpdatingStatusServis.value = true;
  try {
    const updatedCount = await bulkMarkServisSudahDiambil(targetIds, {
      metodePengambilan: null,
      returnOwnerBy: null,
      returnOwnerAt: null,
      returnOwnerProofUrl: null,
      returnOwnerProofPath: null,
      returnOwnerProofLiteUrl: null,
      returnOwnerProofLitePath: null,
    });
    selectedServisIds.value = [];
    invalidateCurrentRangeCache();
    swal(`${updatedCount} data terpilih berhasil diubah ke status 'Sudah Diambil'`);

    // For non-today date, fetch again because this view is not real-time.
    if (!isToday()) await loadData();
  } catch (e) {
    showError("Gagal update massal status pengambilan", e.message);
  } finally {
    bulkUpdatingStatusServis.value = false;
  }
}

async function updateSelectedServisReturnOwner() {
  if (!canReturnOwner.value) {
    return swal("Aksi ini hanya untuk admin atau supervisor", "warning");
  }

  const targetIds = selectedServisIds.value.filter((id) =>
    filteredList.value.some((item) => item.id === id && isPickupSelectable(item)),
  );
  if (!targetIds.length) {
    return swal("Pilih data yang sudah selesai dan belum diambil terlebih dahulu", "warning");
  }

  openReturnOwnerModal(targetIds);
}

// ── Status Modal ──────────────────────────────────────────────────────────
function openStatusModal(item) {
  const hasBelumLunas = hasBelumLunasPembayaran(item);
  statusTargetItem.value = item;
  allowRevertWithoutPassword.value = false;
  allowRevertStatusServisWithoutPassword.value = false;
  photoFile.value = null;
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
  photoPreviewUrl.value = "";
  if (photoInputRef.value) photoInputRef.value.value = "";
  statusForm.value = {
    id: item.id,
    namaCustomer: item.namaCustomer,
    namaBarang: getItemNama(item),
    initialStatusServis: item.statusServis,
    toggleStatusServis: false,
    statusServis: item.statusServis,
    statusPengambilan: item.statusPengambilan,
    stafHandle: item.stafHandle || "",
    existingBuktiUrl: item.buktiPengambilanUrl || "",
    hasBelumLunas,
    statusPembayaranUpdate: hasBelumLunas ? "belum_lunas" : "",
  };
  new Modal(document.getElementById("statusModal")).show();
}

function onStatusServisToggleChange() {
  const initialStatus = statusForm.value.initialStatusServis || "Belum Selesai";
  const shouldToggle = Boolean(statusForm.value.toggleStatusServis);

  if (!shouldToggle) {
    statusForm.value.statusServis = initialStatus;
    return;
  }

  // If toggling to 'Sudah Selesai', ensure penerimaan servis exists first.
  const target = statusTargetItem.value || null;
  const willBeSelesai = initialStatus === "Sudah Selesai" ? false : true;

  if (willBeSelesai) {
    const hasPenerimaan =
      (target && target.statusPenerimaanServis === "Sudah Diterima") ||
      (target && (target.penerimaServis || target.waktuPenerimaan || target.buktiPenerimaanUrl));

    if (!hasPenerimaan) {
      // prevent toggle and ask user to perform penerimaan first
      statusForm.value.toggleStatusServis = false;
      statusForm.value.statusServis = initialStatus;
      (async () => {
        const res = await confirm({
          title: "Penerimaan wajib",
          text: "Penerimaan servis wajib sebelum menandai 'Sudah Selesai'. Buka form penerimaan sekarang?",
          confirmText: "Buka Penerimaan",
        });
        if (res.isConfirmed) {
          const id = target?.id ? [target.id] : [];
          openPenerimaanModal(id);
        }
      })();
      return;
    }
  }

  statusForm.value.statusServis = initialStatus === "Sudah Selesai" ? "Belum Selesai" : "Sudah Selesai";
}

async function compressImageFile(file, options = {}) {
  const maxSide = options.maxSide ?? 1920;
  const quality = options.quality ?? 0.82;

  const img = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca gambar"));
    };
    image.src = objectUrl;
  });

  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const compressedBlob = await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), "image/jpeg", quality);
  });
  if (!compressedBlob || compressedBlob.size >= file.size) return file;

  return new File([compressedBlob], file.name.replace(/\.[^./\\]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function onPhotoChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    swal("File harus berupa gambar", "warning");
    e.target.value = "";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    swal("Ukuran file maksimal 10MB", "warning");
    e.target.value = "";
    return;
  }

  try {
    const compressedFile = await compressImageFile(file);
    photoFile.value = compressedFile;
    if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
    photoPreviewUrl.value = URL.createObjectURL(compressedFile);
  } catch (err) {
    swal("Gagal memproses gambar. Coba pilih ulang.", "warning");
    e.target.value = "";
  }
}

function clearPhoto() {
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
  photoFile.value = null;
  photoPreviewUrl.value = "";
  if (photoInputRef.value) photoInputRef.value.value = "";
}

function getCurrentUserName() {
  return authStore.userDisplayName || authStore.userName || authStore.userEmail || "";
}

function openPenerimaanModal(ids = []) {
  if (!ids.length) return;
  penerimaanTargetIds.value = ids;
  penerimaanForm.value = {
    penerima: getCurrentUserName(),
    catatan: "",
  };
  penerimaanPhotoFile.value = null;
  if (penerimaanPhotoPreviewUrl.value) URL.revokeObjectURL(penerimaanPhotoPreviewUrl.value);
  penerimaanPhotoPreviewUrl.value = "";
  if (penerimaanInputRef.value) penerimaanInputRef.value.value = "";
  // If status modal is currently open, hide it and remember to restore later
  try {
    const statusEl = document.getElementById("statusModal");
    if (statusEl && statusEl.classList.contains("show")) {
      const statusInst = Modal.getInstance(statusEl) || Modal.getOrCreateInstance(statusEl);
      statusInst.hide();
      statusModalWasOpen.value = true;
    } else {
      statusModalWasOpen.value = false;
    }
  } catch (e) {
    statusModalWasOpen.value = false;
  }

  const penerimaanEl = document.getElementById("penerimaanModal");
  const penerimaanInst = Modal.getOrCreateInstance(penerimaanEl);
  // Add one-time hidden handler to restore status modal if it was open
  const onHidden = () => {
    try {
      if (statusModalWasOpen.value) {
        const statusEl = document.getElementById("statusModal");
        if (statusEl) Modal.getOrCreateInstance(statusEl).show();
      }
    } finally {
      penerimaanEl.removeEventListener("hidden.bs.modal", onHidden);
      statusModalWasOpen.value = false;
    }
  };
  penerimaanEl.addEventListener("hidden.bs.modal", onHidden);
  penerimaanInst.show();
}

async function onPenerimaanPhotoChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    swal("File harus berupa gambar", "warning");
    e.target.value = "";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    swal("Ukuran file maksimal 10MB", "warning");
    e.target.value = "";
    return;
  }

  try {
    const compressedFile = await compressImageFile(file);
    penerimaanPhotoFile.value = compressedFile;
    if (penerimaanPhotoPreviewUrl.value) URL.revokeObjectURL(penerimaanPhotoPreviewUrl.value);
    penerimaanPhotoPreviewUrl.value = URL.createObjectURL(compressedFile);
  } catch (err) {
    swal("Gagal memproses gambar. Coba pilih ulang.", "warning");
    e.target.value = "";
  }
}

function clearPenerimaanPhoto() {
  if (penerimaanPhotoPreviewUrl.value) URL.revokeObjectURL(penerimaanPhotoPreviewUrl.value);
  penerimaanPhotoFile.value = null;
  penerimaanPhotoPreviewUrl.value = "";
  if (penerimaanInputRef.value) penerimaanInputRef.value.value = "";
}

async function savePenerimaanServis() {
  if (!penerimaanTargetIds.value.length) return;
  if (!penerimaanForm.value.penerima?.trim()) return swal("Nama penerima wajib diisi", "warning");
  if (!penerimaanPhotoFile.value) return swal("Upload foto bukti terlebih dahulu", "warning");

  penerimaanSaving.value = true;
  try {
    const targetId = penerimaanTargetIds.value[0];
    const waktuPenerimaan = new Date().toISOString();
    const { url, path, liteUrl, litePath } = await uploadBuktiPenerimaanServis(penerimaanPhotoFile.value, targetId);

    const payload = {
      penerimaServis: penerimaanForm.value.penerima.trim(),
      waktuPenerimaan,
      buktiPenerimaanUrl: url,
      buktiPenerimaanPath: path,
      buktiPenerimaanLiteUrl: liteUrl,
      buktiPenerimaanLitePath: litePath,
      catatan: penerimaanForm.value.catatan?.trim() || "",
      createdBy: getCurrentUserName(),
    };

    const updatedCount = await bulkMarkServisPenerimaan(penerimaanTargetIds.value, payload);
    selectedServisIds.value = [];
    invalidateCurrentRangeCache();
    Modal.getInstance(document.getElementById("penerimaanModal"))?.hide();
    swal(`${updatedCount} data servis berhasil diterima`);
    if (!isToday()) await loadData();
  } catch (e) {
    showError("Gagal menyimpan penerimaan servis", e.message);
  } finally {
    penerimaanSaving.value = false;
  }
}

function openReturnOwnerModal(ids = []) {
  if (!ids.length) return;
  returnOwnerTargetIds.value = ids;
  returnOwnerForm.value = {
    salesName: getCurrentUserName(),
  };
  returnOwnerPhotoFile.value = null;
  if (returnOwnerPhotoPreviewUrl.value) URL.revokeObjectURL(returnOwnerPhotoPreviewUrl.value);
  returnOwnerPhotoPreviewUrl.value = "";
  if (returnOwnerInputRef.value) returnOwnerInputRef.value.value = "";
  Modal.getOrCreateInstance(document.getElementById("returnOwnerModal")).show();
}

async function onReturnOwnerPhotoChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    swal("File harus berupa gambar", "warning");
    e.target.value = "";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    swal("Ukuran file maksimal 10MB", "warning");
    e.target.value = "";
    return;
  }

  try {
    const compressedFile = await compressImageFile(file);
    returnOwnerPhotoFile.value = compressedFile;
    if (returnOwnerPhotoPreviewUrl.value) URL.revokeObjectURL(returnOwnerPhotoPreviewUrl.value);
    returnOwnerPhotoPreviewUrl.value = URL.createObjectURL(compressedFile);
  } catch (err) {
    swal("Gagal memproses gambar. Coba pilih ulang.", "warning");
    e.target.value = "";
  }
}

function clearReturnOwnerPhoto() {
  if (returnOwnerPhotoPreviewUrl.value) URL.revokeObjectURL(returnOwnerPhotoPreviewUrl.value);
  returnOwnerPhotoFile.value = null;
  returnOwnerPhotoPreviewUrl.value = "";
  if (returnOwnerInputRef.value) returnOwnerInputRef.value.value = "";
}

async function saveReturnOwner() {
  if (!returnOwnerTargetIds.value.length) return;
  if (!returnOwnerForm.value.salesName?.trim()) return swal("Nama sales wajib diisi", "warning");
  if (!returnOwnerPhotoFile.value) return swal("Upload foto bukti return terlebih dahulu", "warning");

  returnOwnerSaving.value = true;
  try {
    const targetId = returnOwnerTargetIds.value[0];
    const waktuPengambilan = new Date().toISOString();
    const { url, path, liteUrl, litePath } = await uploadBuktiPengambilan(returnOwnerPhotoFile.value, targetId);

    const payload = {
      stafHandle: returnOwnerForm.value.salesName.trim(),
      waktuPengambilan,
      buktiPengambilanUrl: url,
      buktiPengambilanPath: path,
      buktiPengambilanLiteUrl: liteUrl || null,
      buktiPengambilanLitePath: litePath || null,
      metodePengambilan: "return_owner",
      returnOwnerBy: returnOwnerForm.value.salesName.trim(),
      returnOwnerAt: waktuPengambilan,
      returnOwnerProofUrl: url,
      returnOwnerProofPath: path,
      returnOwnerProofLiteUrl: liteUrl || null,
      returnOwnerProofLitePath: litePath || null,
    };

    const updatedCount = await bulkMarkServisSudahDiambil(returnOwnerTargetIds.value, payload);
    selectedServisIds.value = [];
    invalidateCurrentRangeCache();
    Modal.getInstance(document.getElementById("returnOwnerModal"))?.hide();
    swal(`${updatedCount} data berhasil direturn ke owner`);
    if (!isToday()) await loadData();
  } catch (e) {
    showError("Gagal menyimpan return owner", e.message);
  } finally {
    returnOwnerSaving.value = false;
  }
}

async function saveStatus() {
  const targetItem = statusTargetItem.value;

  const isRevertToNotTaken =
    targetItem?.statusPengambilan === "Sudah Diambil" && statusForm.value.statusPengambilan === "Belum Diambil";
  const isVerifiedRevertToNotTaken = isRevertToNotTaken && allowRevertWithoutPassword.value;
  if (isRevertToNotTaken && !allowRevertWithoutPassword.value) {
    revertPassword.value = "";
    openRevertPickupModal();
    return;
  }

  const isRevertServisToBelumSelesai =
    targetItem?.statusServis === "Sudah Selesai" && statusForm.value.statusServis === "Belum Selesai";
  if (isRevertServisToBelumSelesai && !allowRevertStatusServisWithoutPassword.value) {
    revertStatusServisPassword.value = "";
    openRevertStatusServisModal();
    return;
  }

  if (targetItem?.statusServis === "Belum Selesai" && statusForm.value.statusServis === "Belum Selesai") {
    return swal("Data tidak bisa disimpan jika status belum selesai", "warning");
  }

  if (
    !isVerifiedRevertToNotTaken &&
    statusForm.value.statusServis === "Sudah Selesai" &&
    (targetItem?.statusPenerimaanServis || "Belum Diterima") !== "Sudah Diterima"
  ) {
    return swal("Penerimaan servis wajib sebelum status menjadi Sudah Selesai", "warning");
  }

  if (statusForm.value.statusPengambilan === "Sudah Diambil" && !hasPhotoEvidence.value) {
    return swal("Upload foto bukti pengambilan terlebih dahulu", "warning");
  }
  if (isLunasRequiredButUnselected.value) {
    return swal("Data hanya bisa disimpan jika status pembayaran diubah menjadi LUNAS", "warning");
  }

  statusSaving.value = true;
  try {
    const updates = {
      statusServis: statusForm.value.statusServis,
      statusPengambilan: statusForm.value.statusPengambilan,
    };

    if (
      statusForm.value.statusPengambilan === "Sudah Diambil" &&
      statusForm.value.hasBelumLunas &&
      statusForm.value.statusPembayaranUpdate === "nominal" &&
      targetItem
    ) {
      const detailBarang = (targetItem.detailBarang || []).map((row) => {
        const next = { ...row };
        if (next.statusPembayaran === "belum_lunas") next.statusPembayaran = "nominal";
        return next;
      });
      const detailBarangCustom = (targetItem.detailBarangCustom || []).map((row) => {
        const next = { ...row };
        if (next.statusPembayaran === "belum_lunas") next.statusPembayaran = "nominal";
        return next;
      });

      if (detailBarang.length) updates.detailBarang = detailBarang;
      if (detailBarangCustom.length) updates.detailBarangCustom = detailBarangCustom;
      if (targetItem.statusPembayaran === "belum_lunas") updates.statusPembayaran = "nominal";
    }

    if (statusForm.value.statusPengambilan === "Sudah Diambil") {
      updates.stafHandle = statusForm.value.stafHandle || null;
      updates.waktuPengambilan = new Date().toISOString();
      // Upload foto if provided
      if (photoFile.value) {
        const { url, path, liteUrl, litePath } = await uploadBuktiPengambilan(photoFile.value, statusForm.value.id);
        updates.buktiPengambilanUrl = url;
        updates.buktiPengambilanPath = path;
        if (liteUrl) updates.buktiPengambilanLiteUrl = liteUrl;
        if (litePath) updates.buktiPengambilanLitePath = litePath;
      }
    } else {
      updates.stafHandle = null;
      updates.waktuPengambilan = null;
      updates.metodePengambilan = null;
      updates.returnOwnerBy = null;
      updates.returnOwnerAt = null;
      updates.returnOwnerProofUrl = null;
      updates.returnOwnerProofPath = null;
      updates.returnOwnerProofLiteUrl = null;
      updates.returnOwnerProofLitePath = null;
    }
    await updateServisStatus(statusForm.value.id, updates);
    invalidateCurrentRangeCache();
    Modal.getInstance(document.getElementById("statusModal"))?.hide();
    swal("Status berhasil diperbarui");
    if (!isToday()) loadData();
  } catch (e) {
    showError("Gagal memperbarui status", e.message);
  } finally {
    statusSaving.value = false;
    allowRevertWithoutPassword.value = false;
    allowRevertStatusServisWithoutPassword.value = false;
    statusTargetItem.value = null;
  }
}

function openRevertPickupModal() {
  const revertModalEl = document.getElementById("revertPickupModal");
  const statusModalEl = document.getElementById("statusModal");
  if (!revertModalEl) return;
  if (!statusModalEl) {
    Modal.getOrCreateInstance(revertModalEl).show();
    return;
  }

  pendingReopenStatusModal.value = true;
  const statusModal = Modal.getOrCreateInstance(statusModalEl);
  const showRevertModal = () => {
    Modal.getOrCreateInstance(revertModalEl).show();
  };

  statusModalEl.addEventListener("hidden.bs.modal", showRevertModal, { once: true });
  statusModal.hide();
}

function openRevertStatusServisModal() {
  const revertModalEl = document.getElementById("revertStatusServisModal");
  const statusModalEl = document.getElementById("statusModal");
  if (!revertModalEl) return;
  if (!statusModalEl) {
    Modal.getOrCreateInstance(revertModalEl).show();
    return;
  }

  pendingReopenStatusServisModal.value = true;
  const statusModal = Modal.getOrCreateInstance(statusModalEl);
  const showRevertModal = () => {
    Modal.getOrCreateInstance(revertModalEl).show();
  };

  statusModalEl.addEventListener("hidden.bs.modal", showRevertModal, { once: true });
  statusModal.hide();
}

async function confirmRevertPickup() {
  if (!revertPassword.value) return swal("Password wajib diisi", "warning");
  revertVerifying.value = true;
  try {
    await verifySupervisorPassword(revertPassword.value);
    pendingReopenStatusModal.value = false;
    allowRevertWithoutPassword.value = true;
    Modal.getInstance(document.getElementById("revertPickupModal"))?.hide();
    await saveStatus();
  } catch (e) {
    showError("Verifikasi gagal", e.message);
  } finally {
    revertVerifying.value = false;
  }
}

async function confirmRevertStatusServis() {
  if (!revertStatusServisPassword.value) return swal("Password wajib diisi", "warning");
  revertStatusServisVerifying.value = true;
  try {
    await verifySupervisorPassword(revertStatusServisPassword.value);
    pendingReopenStatusServisModal.value = false;
    allowRevertStatusServisWithoutPassword.value = true;
    Modal.getInstance(document.getElementById("revertStatusServisModal"))?.hide();
    await saveStatus();
  } catch (e) {
    showError("Verifikasi gagal", e.message);
  } finally {
    revertStatusServisVerifying.value = false;
  }
}

// ── Edit Modal ────────────────────────────────────────────────────────────
function openEditModal(item) {
  editPassword.value = "";
  const isCustom = item.jenisInput === "custom";
  const servisRows = (item.detailBarang || []).length ? item.detailBarang.map((r) => ({ ...r })) : [newServisRow()];
  const customRows = (item.detailBarangCustom || []).length
    ? item.detailBarangCustom.map((r) => ({ ...r }))
    : [newCustomRow()];
  editForm.value = {
    id: item.id,
    tanggal: formatTanggal(item.tanggal),
    namaSales: item.namaSales || "",
    namaCustomer: item.namaCustomer || "",
    noHp: item.noHp || "",
    jenisInput: isCustom ? "custom" : "servis",
    servisRows,
    customRows,
  };
  Modal.getOrCreateInstance(document.getElementById("editVerifyModal")).show();
}

async function unlockEdit() {
  if (!editPassword.value) return swal("Password wajib diisi", "warning");
  editUnlocking.value = true;
  try {
    await verifySupervisorPassword(editPassword.value);
    Modal.getInstance(document.getElementById("editVerifyModal"))?.hide();
    Modal.getOrCreateInstance(document.getElementById("editModal")).show();
  } catch (e) {
    showError("Verifikasi gagal", e.message);
  } finally {
    editUnlocking.value = false;
  }
}

async function saveEdit() {
  const isCustom = editForm.value.jenisInput === "custom";
  const rows = isCustom ? editForm.value.customRows : editForm.value.servisRows;
  if (!rows.length || !rows[0].namaBarang?.trim()) {
    return swal("Nama barang wajib diisi", "warning");
  }
  editSaving.value = true;
  try {
    const totalOngkos = editTotalOngkos.value;
    const payload = {
      tanggal: editForm.value.tanggal,
      namaSales: editForm.value.namaSales,
      namaCustomer: editForm.value.namaCustomer,
      noHp: editForm.value.noHp,
      namaBarang: rows[0].namaBarang,
      totalOngkos,
      ongkos: totalOngkos,
    };
    if (isCustom) {
      payload.detailBarangCustom = rows;
    } else {
      payload.detailBarang = rows;
    }
    await updateServisData(editForm.value.id, payload);
    invalidateCurrentRangeCache();
    Modal.getInstance(document.getElementById("editModal"))?.hide();
    swal("Data berhasil diperbarui");
    if (!isToday()) loadData();
  } catch (e) {
    showError("Gagal memperbarui data", e.message);
  } finally {
    editSaving.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
function confirmDelete(item) {
  deleteTarget.value = item;
  deletePassword.value = "";
  new Modal(document.getElementById("deleteModal")).show();
}

async function doDelete() {
  if (!deletePassword.value) return swal("Password wajib diisi", "warning");
  deleteSaving.value = true;
  try {
    await verifySupervisorPassword(deletePassword.value);
    await deleteServis(deleteTarget.value.id);
    invalidateCurrentRangeCache();
    Modal.getInstance(document.getElementById("deleteModal"))?.hide();
    swal("Data servis berhasil dihapus");
    if (!isToday()) loadData();
  } catch (e) {
    showError("Gagal menghapus", e.message);
  } finally {
    deleteSaving.value = false;
  }
}

// ── WA & Print ────────────────────────────────────────────────────────────
async function markCustomerContacted(item) {
  if (!item?.id) return;
  if (!item.noHp) return swal("Nomor HP tidak tersedia", "warning");
  if (contactingServisId.value) return;

  const result = await confirm({
    title: "Customer sudah dihubungi?",
    text:
      `Klik YA jika customer ${item.namaCustomer || "-"} sudah Anda hubungi secara manual. ` +
      "Sistem akan menyimpan waktu kontak terakhir.",
    confirmText: "Ya, sudah dihubungi",
  });
  if (!result.isConfirmed) return;

  contactingServisId.value = item.id;
  try {
    await updateServisStatus(item.id, {
      waktuDihubungiTerakhir: new Date().toISOString(),
      metodeKontakTerakhir: "manual",
      dihubungiOleh: authStore.userDisplayName || authStore.userName || authStore.userEmail || "staf",
    });
    invalidateCurrentRangeCache();
    swal("Waktu kontak terakhir berhasil disimpan", "success");
    if (!isToday()) await loadData();
  } catch (e) {
    showError("Gagal menyimpan status kontak", e.message);
  } finally {
    contactingServisId.value = "";
  }
}

function openBuktiModal(item) {
  const url = getBuktiPengambilanUrl(item);
  if (!url) {
    swal("Bukti pengambilan belum tersedia", "warning");
    return;
  }
  openBuktiModalByUrl(url, "Bukti Pengambilan");
}

function getBuktiPengambilanUrl(item) {
  return item?.buktiPengambilanLiteUrl || item?.buktiPengambilanUrl || "";
}

function getBuktiPenerimaanUrl(item) {
  return item?.buktiPenerimaanLiteUrl || item?.buktiPenerimaanUrl || "";
}

function openBuktiModalByUrl(url, title = "Bukti Foto") {
  if (!url) return;
  buktiViewUrl.value = url;
  buktiViewTitle.value = title;
  Modal.getOrCreateInstance(document.getElementById("buktiModal")).show();
}

async function rePrint(item) {
  if (printingServisId.value) return;
  printingServisId.value = item?.id || "progress";
  try {
    await printServisSlip(item);
    failedPrintItem.value = null;
    swal("Nota servis dikirim ke printer", "success");
  } catch (e) {
    failedPrintItem.value = item;
    printFailedMessage.value = e?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
    showPrintFailedModal.value = true;
  } finally {
    printingServisId.value = "";
  }
}

async function retryPrintServis() {
  const item = failedPrintItem.value;
  if (!item) return;

  showPrintFailedModal.value = false;
  await rePrint(item);
}

// ── Label Print ────────────────────────────────────────────────────────────
function generateLabelBox(item) {
  const isCustom = item.jenisInput === "custom";
  const namaCustomer = item.namaCustomer || "N/A";

  if (isCustom) {
    const details = item.detailBarangCustom || [];
    const combinedItems = details.length
      ? details
          .map((d) => {
            let text = `${d.namaBarang || "-"}<br>B:${d.berat || "-"} P:${d.panjang || "-"} K:${d.kadar || "-"} W:${d.warna || "-"}`;
            if (d.rincianServis?.trim()) text += `<br>${d.rincianServis}`;
            return text;
          })
          .join("<br>")
      : "Data tidak tersedia";
    return `<div class="print-service-box"><div class="print-customer-name">${namaCustomer}</div><div class="print-nama-brg">${combinedItems}</div><div class="print-status">CUSTOM</div></div>`;
  } else {
    const details = (item.detailBarang || []).length
      ? item.detailBarang
      : [
          {
            namaBarang: item.namaBarang || "-",
            jenisServis: item.jenisServis || "-",
            rincianServis: item.rincianServis || "",
            statusPembayaran: item.statusPembayaran || "nominal",
          },
        ];
    const uniqueStatuses = [...new Set(details.map((d) => d.statusPembayaran || "nominal"))];
    const statusText =
      uniqueStatuses.length === 1
        ? statusPembayaranLabel(uniqueStatuses[0])
        : uniqueStatuses.map(statusPembayaranLabel).join(" / ");
    const combinedItems = details
      .map((d) => {
        const rincian = d.rincianServis?.trim();
        return rincian
          ? `${d.namaBarang || "-"} - ${d.jenisServis || "-"} - ${rincian}`
          : `${d.namaBarang || "-"} - ${d.jenisServis || "-"}`;
      })
      .join("<br>");
    return `<div class="print-service-box"><div class="print-customer-name">${namaCustomer}</div><div class="print-nama-brg">${combinedItems}</div><div class="print-status">${statusText}</div></div>`;
  }
}

function printLabel(items) {
  if (!items.length) return swal("Tidak ada data untuk dicetak", "warning");
  const printWindow = window.open("", "_blank");
  if (!printWindow) return swal("Popup diblokir. Izinkan popup untuk mencetak.", "warning");
  const boxes = items.map(generateLabelBox).join("");
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Label Servis</title><style>
    @page{size:A4;margin:1cm}
    body{font-family:Arial,sans-serif;margin:0;padding:0}
    .boxes-container{display:flex;flex-wrap:wrap;justify-content:flex-start;gap:3mm}
    .print-service-box{width:3.5cm;height:3.5cm;border:1px solid #000;padding:1.5mm;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;break-inside:avoid;overflow:hidden}
    .print-customer-name{font-size:8px;font-weight:bold;word-wrap:break-word;line-height:1.1;margin:0;padding:0}
    .print-nama-brg{font-size:8px;font-weight:bold;word-wrap:break-word;word-break:break-word;line-height:1.1;overflow:hidden;margin:0;padding:0}
    .print-status{font-size:7px;font-weight:bold;color:#202020;margin:0;padding:0}
  </style></head><body><div class="boxes-container">${boxes}</div></body></html>`);
  printWindow.document.close();
  printWindow.addEventListener("afterprint", () => setTimeout(() => printWindow.close(), 100));
  printWindow.print();
}

function printAllLabels() {
  if (!filteredList.value.length) return swal("Tidak ada data untuk dicetak", "warning");
  printLabel(filteredList.value);
}

function printSingleLabel(item) {
  printLabel([item]);
}

// ── Export PDF ────────────────────────────────────────────────────────────
function exportPDF() {
  if (filterJenis.value === "custom") return exportCustomPDF();
  return exportServisPDF();
}

async function exportServisPDF() {
  const data = filteredList.value.filter((i) => (i.jenisInput || "servis") === "servis");
  if (!data.length) return swal("Tidak ada data servis untuk diekspor", "warning");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("LAPORAN SERVIS MELATI GOLD SHOP", 14, 15);
  doc.setFontSize(10);
  doc.text(`Rentang Tanggal: ${getDateRangeLabel()}`, 14, 22);

  const head = [
    [
      "No",
      "Sales",
      "Customer",
      "No HP",
      "Nama Barang",
      "Berat",
      "Karat",
      "Jenis Servis",
      "Rincian",
      "Ongkos",
      "Status",
    ],
  ];
  const body = [];
  data.forEach((item, idx) => {
    const details = (item.detailBarang || []).length ? item.detailBarang : [{}];
    details.forEach((d, di) => {
      const sp = d.statusPembayaran || "nominal";
      body.push([
        di === 0 ? String(idx + 1) : "",
        di === 0 ? item.namaSales || "" : "",
        di === 0 ? item.namaCustomer || "" : "",
        di === 0 ? item.noHp || "" : "",
        d.namaBarang || "-",
        d.berat || "-",
        d.karat || "-",
        d.jenisServis || "-",
        d.rincianServis || "-",
        `Rp ${(d.ongkos || 0).toLocaleString("id-ID")}`,
        statusPembayaranLabel(sp),
      ]);
    });
  });
  const totalOngkos = data.reduce((sum, item) => {
    const details = (item.detailBarang || []).length ? item.detailBarang : [{}];
    return (
      sum +
      details.reduce((s, d) => {
        const sp = d.statusPembayaran || "nominal";
        return sp === "nominal" || sp === "custom" ? s + (d.ongkos || 0) : s;
      }, 0)
    );
  }, 0);
  body.push(["", "", "", "", "", "", "", "", "TOTAL:", `Rp ${totalOngkos.toLocaleString("id-ID")}`, ""]);

  autoTable(doc, {
    startY: 28,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 152, 219] },
    columnStyles: {
      4: { cellWidth: 42 },
      8: { cellWidth: 42 },
      9: { cellWidth: 28, halign: "right" },
    },
  });
  doc.save(`Laporan_Servis_${getDateRangeFileSuffix()}.pdf`);
}

async function exportCustomPDF() {
  const data = filteredList.value.filter((i) => i.jenisInput === "custom");
  if (!data.length) return swal("Tidak ada data custom untuk diekspor", "warning");
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("LAPORAN CUSTOM MELATI GOLD SHOP", 14, 15);
  doc.setFontSize(10);
  doc.text(`Rentang Tanggal: ${getDateRangeLabel()}`, 14, 22);

  const head = [
    [
      "No",
      "Sales",
      "Customer",
      "No HP",
      "Nama Barang",
      "Berat",
      "Size / Panjang",
      "Kadar",
      "Warna",
      "Rincian",
      "Total DP",
      "Ongkos",
    ],
  ];
  const body = [];
  let totalDP = 0;
  let totalOngkos = 0;
  data.forEach((item, idx) => {
    const details = (item.detailBarangCustom || []).length ? item.detailBarangCustom : [{}];
    details.forEach((d, di) => {
      totalDP += d.totalDP || 0;
      totalOngkos += d.ongkos || 0;
      body.push([
        di === 0 ? String(idx + 1) : "",
        di === 0 ? item.namaSales || "" : "",
        di === 0 ? item.namaCustomer || "" : "",
        di === 0 ? item.noHp || "" : "",
        d.namaBarang || "-",
        d.berat || "-",
        d.panjang || "-",
        d.kadar || "-",
        d.warna || "-",
        d.rincianServis || "-",
        `Rp ${(d.totalDP || 0).toLocaleString("id-ID")}`,
        `Rp ${(d.ongkos || 0).toLocaleString("id-ID")}`,
      ]);
    });
  });
  const totalNominal = totalDP + totalOngkos;
  body.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "TOTAL:",
    `Rp ${totalDP.toLocaleString("id-ID")}`,
    `Rp ${totalOngkos.toLocaleString("id-ID")}`,
  ]);
  body.push(["", "", "", "", "", "", "", "", "", "", "TOTAL NOMINAL:", `Rp ${totalNominal.toLocaleString("id-ID")}`]);

  autoTable(doc, {
    startY: 28,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 152, 219] },
    columnStyles: {
      4: { cellWidth: 42 },
      9: { cellWidth: 42 },
      10: { halign: "right" },
      11: { cellWidth: 28, halign: "right" },
    },
  });
  doc.save(`Laporan_Custom_${getDateRangeFileSuffix()}.pdf`);
}

// ── Cross-tab sync ────────────────────────────────────────────────────────
function handleStorageSync(e) {
  if (e.key === "servisDataChanged") {
    invalidateCurrentRangeCache();
    if (hasLoaded.value && !isToday()) loadData();
  }
}

watch([filterStartDate, filterEndDate], () => {
  hasLoaded.value = false;
  allItems.value = [];
  selectedServisIds.value = [];
  cleanupListener();
  resetPage();
});

watch(filteredList, (list) => {
  const allowed = new Set(list.filter(isBulkSelectable).map((item) => item.id));
  selectedServisIds.value = selectedServisIds.value.filter((id) => allowed.has(id));
});

onMounted(() => {
  // Hindari browser password manager mengisi field pencarian dengan username tersimpan.
  searchText.value = "";
  window.addEventListener("storage", handleStorageSync);

  // Load sales staff options for dropdowns
  (async () => {
    try {
      const list = await fetchSalesList();
      salesOptions.value = list
        .filter((s) => (s.status || "active") === "active")
        .map((s) => ({ id: s.id, nama: s.nama }));
    } catch (e) {
      console.error("Failed loading sales list:", e?.message || e);
    }
  })();

  const revertModalEl = document.getElementById("revertPickupModal");
  if (revertModalEl) {
    revertModalEl.addEventListener("hidden.bs.modal", handleRevertModalHidden);
  }

  const revertStatusServisModalEl = document.getElementById("revertStatusServisModal");
  if (revertStatusServisModalEl) {
    revertStatusServisModalEl.addEventListener("hidden.bs.modal", handleRevertStatusServisModalHidden);
  }
});

onUnmounted(() => {
  cleanupListener();
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
  if (penerimaanPhotoPreviewUrl.value) URL.revokeObjectURL(penerimaanPhotoPreviewUrl.value);
  if (returnOwnerPhotoPreviewUrl.value) URL.revokeObjectURL(returnOwnerPhotoPreviewUrl.value);
  window.removeEventListener("storage", handleStorageSync);

  const revertModalEl = document.getElementById("revertPickupModal");
  if (revertModalEl) {
    revertModalEl.removeEventListener("hidden.bs.modal", handleRevertModalHidden);
  }

  const revertStatusServisModalEl = document.getElementById("revertStatusServisModal");
  if (revertStatusServisModalEl) {
    revertStatusServisModalEl.removeEventListener("hidden.bs.modal", handleRevertStatusServisModalHidden);
  }
});

function handleRevertModalHidden() {
  if (pendingReopenStatusModal.value && !allowRevertWithoutPassword.value) {
    Modal.getOrCreateInstance(document.getElementById("statusModal")).show();
  }
  pendingReopenStatusModal.value = false;
  revertPassword.value = "";
}

function handleRevertStatusServisModalHidden() {
  if (pendingReopenStatusServisModal.value && !allowRevertStatusServisWithoutPassword.value) {
    Modal.getOrCreateInstance(document.getElementById("statusModal")).show();
  }
  pendingReopenStatusServisModal.value = false;
  revertStatusServisPassword.value = "";
}
</script>

<style scoped>
/* Ensure table columns don't wrap unexpectedly and scroll horizontally */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table th,
.table td {
  white-space: nowrap;
  vertical-align: middle;
}

.desktop-servis-table {
  --sticky-customer-left: 0px;
  --sticky-customer-width: 150px;
  --sticky-phone-width: 120px;
  --sticky-body-bg: #ffffff;
  --sticky-head-bg: #f8f9fa;
  --sticky-hover-bg: #f2f3f5;
}

.desktop-servis-table .sticky-col-customer,
.desktop-servis-table .sticky-col-phone {
  position: sticky;
  background-color: var(--sticky-body-bg);
  background-image: none;
  background-clip: padding-box;
}

.desktop-servis-table .sticky-col-customer {
  left: var(--sticky-customer-left);
  min-width: var(--sticky-customer-width);
  width: var(--sticky-customer-width);
  z-index: 3;
}

.desktop-servis-table .sticky-col-phone {
  left: calc(var(--sticky-customer-left) + var(--sticky-customer-width));
  min-width: var(--sticky-phone-width);
  width: var(--sticky-phone-width);
  z-index: 4;
  box-shadow: 2px 0 0 rgba(0, 0, 0, 0.06);
}

.desktop-servis-table thead .sticky-col-customer,
.desktop-servis-table thead .sticky-col-phone {
  background-color: var(--sticky-head-bg);
  z-index: 6;
}

.desktop-servis-table tbody tr:hover .sticky-col-customer,
.desktop-servis-table tbody tr:hover .sticky-col-phone {
  background-color: var(--sticky-hover-bg);
}

.contact-export-text {
  min-height: 360px;
  font-size: 0.85rem;
  line-height: 1.45;
  white-space: pre-wrap;
  background: #ffffff;
}

.servis-truncate-cell {
  max-width: 1px;
}

.servis-truncate-value {
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.servis-jenis-badge {
  display: inline-block;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.mobile-servis-card {
  border-radius: 0.9rem !important;
}

.mobile-servis-card-body {
  padding: 0.75rem 0.8rem;
}

.mobile-top-row {
  gap: 0.5rem;
}

.mobile-select-checkbox {
  flex-shrink: 0;
  margin-top: 0.18rem;
}

.mobile-customer {
  font-size: 0.92rem;
  line-height: 1.25;
}

.mobile-date {
  font-size: 0.73rem;
  white-space: nowrap;
}

.mobile-item-row {
  font-size: 0.82rem;
}

.mobile-item-name {
  line-height: 1.3;
}

.mobile-item-kind {
  font-size: 0.68rem;
  border: 1px solid #d8dee6;
}

.mobile-sales-row {
  font-size: 0.74rem;
  line-height: 1.3;
}

.mobile-status-row {
  align-items: flex-start;
}

.mobile-status-badge {
  font-size: 0.68rem;
}

.mobile-action-grid .btn {
  font-size: 0.77rem;
  font-weight: 600;
}

@media (max-width: 420px) {
  .mobile-servis-card-body {
    padding: 0.68rem 0.72rem;
  }

  .mobile-customer {
    font-size: 0.88rem;
  }

  .mobile-item-row {
    font-size: 0.79rem;
  }

  .mobile-status-badge {
    font-size: 0.64rem;
  }

  .mobile-action-grid .btn {
    font-size: 0.73rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}
</style>
