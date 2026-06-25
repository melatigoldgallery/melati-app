<template>
  <div class="container-fluid py-3 stock-page">
    <div class="page-header d-flex justify-content-between align-items-center mb-3">
      <div class="">
        <h1>
          <i class="bi bi-archive me-2 text-dark"></i>
          Manajemen Stok
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
            <li class="breadcrumb-item"><router-link to="/inventory/manajemen">Inventory</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Manajemen Stok</li>
          </ol>
        </nav>
      </div>
      <div class="">
        <button class="btn btn-sm btn-outline-secondary" @click="refreshData" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data stok...</p>
    </div>

    <template v-else>
      <!-- Pill Navigation for Aggregate vs Physical Barcode (Segmented Control style) -->
      <div v-if="isBarcodeEnabled" class="d-flex justify-content-center pb-3 mb-4 border-bottom">
        <div class="main-pills-container p-1 bg-light rounded-pill d-inline-flex align-items-center shadow-sm">
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'agregat' }"
            @click="mainTab = 'agregat'"
          >
            <i class="bi bi-grid-3x3-gap fs-6"></i>
            <span>Stok Summary</span>
          </button>
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'lacakFisik' }"
            @click="mainTab = 'lacakFisik'"
          >
            <i class="bi bi-qr-code-scan fs-6"></i>
            <span>Lacak Barang</span>
          </button>
          <button
            class="main-pill-btn rounded-pill border-0 px-4 py-2 fw-bold d-flex align-items-center gap-2"
            :class="{ 'active': mainTab === 'klipBarang' }"
            @click="mainTab = 'klipBarang'"
          >
            <i class="bi bi-paperclip fs-6"></i>
            <span>Klip Barcode</span>
          </button>
        </div>
      </div>

      <!-- Stok Agregat Content -->
      <div v-if="mainTab === 'agregat'">
        <div class="summary-grid mb-3" :style="summaryGridStyle">
          <div v-for="card in summaryCards" :key="card.id" class="summary-grid-item" @click="activeTab = card.id">
            <div class="summary-card" :style="cardStyle(card.id)">
              <div class="summary-title">{{ card.label }}</div>
              <div :class="['summary-value', summaryValueClass(card.id)]">{{ summary[card.id]?.fisik ?? 0 }}</div>
              <small class="summary-status">{{ summary[card.id]?.status.label ?? "-" }}</small>
            </div>
          </div>
        </div>

        <ul v-if="hasTabs" class="nav nav-tabs compact justify-content-center overflow-auto mb-0">
          <li v-for="tab in tabs" :key="tab.id" class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>

        <div v-if="hasTabs" class="card border-0 shadow-sm rounded-0 rounded-bottom">
          <div class="card-body p-0">
            <div v-if="!isComputerTab" class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 44px">No</th>
                    <th>Jenis</th>
                    <th v-if="isBarcodeEnabled" class="text-center">Rincian Barcode</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-center">Aksi</th>
                    <th class="text-center">Riwayat</th>
                    <th class="text-center">Terakhir Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(sub, idx) in tableRows" :key="sub.key">
                    <td class="fw-semibold">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ sub.label }}</td>
                    <td v-if="isBarcodeEnabled" class="text-center">
                      <button
                        v-if="sub.key !== 'barang-display' || showRincianColumn"
                        class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                        @click="openBarcodeRincianModal(activeTab, sub)"
                      >
                        <i class="bi bi-qr-code-scan"></i>
                        <span>Lihat</span>
                      </button>
                      <span v-else class="text-muted small">-</span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-success fs-6 px-2">{{ getQty(activeTab, sub.key) }}</span>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-success btn-sm" @click="openUpdateModal(activeTab, sub)">
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-info btn-sm text-white" @click="openHistoryModal(activeTab, sub)">
                        <i class="bi bi-clock-history"></i>
                      </button>
                    </td>
                    <td class="text-center text-muted small">
                      {{ formatDate(getItem(sub.key, activeTab)?.lastUpdated) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="table-light fw-bold">
                    <td :colspan="isBarcodeEnabled ? 3 : 2">Total Fisik</td>
                    <td class="text-center">{{ summary[activeTab]?.fisik ?? 0 }}</td>
                    <td colspan="3" class="text-center">
                      <span class="badge" :class="`bg-${summary[activeTab]?.status.cls ?? 'secondary'}`">
                        {{ summary[activeTab]?.status.label ?? "-" }}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-else class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width: 44px">No</th>
                    <th>Jenis Barang</th>
                    <th class="text-center">Jumlah</th>
                    <th class="text-center">Aksi</th>
                    <th class="text-center">Terakhir Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(card, idx) in nonComputerCards" :key="card.id">
                    <td class="fw-semibold">{{ idx + 1 }}</td>
                    <td class="fw-semibold">{{ card.label }}</td>
                    <td class="text-center">
                      <span class="badge bg-primary fs-6 px-2">{{ getQty(card.id, "stok-komputer") }}</span>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-primary btn-sm" @click="openKomputerModal(card.id)">
                        <i class="bi bi-pencil me-1"></i>
                        Update
                      </button>
                    </td>
                    <td class="text-center text-muted small">
                      {{ formatDate(getItem("stok-komputer", card.id)?.lastUpdated) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div v-else class="alert alert-warning mb-0">
          Belum ada tab aktif. Silakan aktifkan card di halaman pengaturan.
        </div>

        <!-- Section Panduan & Alur Kerja Pelacakan Stok (Barcode Tracking) -->
        <div v-if="isBarcodeEnabled" class="card border-0 shadow-sm mt-4 info-board-card">
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
                        Mempercepat proses hitung barang saat tutup toko. Dari estimasi awal <strong>1 jam</strong>, harapannya bisa selesai <strong>jauh lebih cepat</strong>.
                      </p> 
                    </div>
                  </div>
                  <div class="badge bg-white text-primary px-3 py-2 rounded-pill fw-bold shadow-sm flex-shrink-0 align-self-center">
                    Target: 45 Menit Proses Hitung Selesai ⏱️
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
                Kedisiplinan kita melakukan update barcode saat pemindahan barang adalah kunci agar proses hitung barang saat closing lebih efisien dan kita semua bisa <strong>pulang tepat waktu!</strong> 🚀
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Lacak Fisik (Barcode) Content -->
      <div v-else-if="mainTab === 'lacakFisik'">
        <ul class="nav nav-tabs compact justify-content-center overflow-auto mb-3">
          <li v-if="ENABLE_MUTATION_QUEUE" class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'antrian' }"
              @click="physicalTab = 'antrian'"
            >
              Request Pindah Data
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'log' }"
              @click="physicalTab = 'log'"
            >
              Riwayat Pindah Data
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link text-nowrap small text-dark fw-bold"
              :class="{ active: physicalTab === 'opname' }"
              @click="physicalTab = 'opname'"
            >
              Stok Opname Data
            </button>
          </li>
        </ul>

        <div v-if="ENABLE_MUTATION_QUEUE && physicalTab === 'antrian'">
          <MovementQueue />
        </div>
        <div v-else-if="physicalTab === 'log'">
          <MutationLog />
        </div>
        <div v-else-if="physicalTab === 'opname'">
          <StockOpname
            :cards="nonComputerCards"
            :locations="tableRows.filter((r) => r.key !== 'barang-display')"
            :color-types="COLOR_TYPES"
            :color-labels="COLOR_LABELS"
            :hala-types="HALA_TYPES"
            :hala-labels="HALA_LABELS"
            :staff-options="staffOptions"
          />
        </div>
      </div>

      <!-- Klip Barcode Content -->
      <div v-else-if="mainTab === 'klipBarang'">
        <ClipManager
          :staff-options="staffOptions"
          :cards="nonComputerCards"
          :table-rows="tableRows"
        />
      </div>
    </template>

    <!-- Modal Update Simple (Fisik Display) -->
    <div class="modal fade" id="simpleUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <form @submit.prevent="submitSimpleUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${simpleForm.mainCat} - ${simpleForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jumlah</label>
                <input
                  v-model.number="simpleForm.quantity"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  required
                />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="simpleForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`simple-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="simpleForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Update Typed (Fisik Display) -->
    <div class="modal fade" id="typedUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form @submit.prevent="submitTypedUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update {{ typedForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${typedForm.mainCat} - ${typedForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Warna</th>
                      <th class="text-center">Stok Saat Ini</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ct in Object.keys(typedForm.details)" :key="ct">
                      <td>{{ COLOR_LABELS[ct] || `${ct} (Lainnya)` }}</td>
                      <td class="text-center">{{ typedForm.original[ct] ?? 0 }}</td>
                      <td>
                        <input
                          v-model.number="typedForm.details[ct]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="typedForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`typed-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="typedForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Update Hala (Fisik Display) -->
    <div class="modal fade" id="halaUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <form @submit.prevent="submitHalaUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update {{ halaForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis</label>
                <input
                  class="form-control form-control-sm"
                  :value="`${halaForm.mainCat} - ${halaForm.subLabel}`"
                  readonly
                />
              </div>
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Jenis Perhiasan</th>
                      <th class="text-center">Stok Saat Ini</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ht in Object.keys(halaForm.details)" :key="ht">
                      <td>{{ HALA_LABELS[ht] || `${ht} (Lainnya)` }}</td>
                      <td class="text-center">{{ halaForm.original[ht] ?? 0 }}</td>
                      <td>
                        <input
                          v-model.number="halaForm.details[ht]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Petugas</label>
                <select v-model="halaForm.petugas" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`hala-${staff}`" :value="staff">{{ staff }}</option>
                </select>
              </div>
              <div>
                <label class="form-label small fw-semibold">Keterangan</label>
                <select v-model="halaForm.keterangan" class="form-select form-select-sm" required>
                  <option value="">-- Pilih Keterangan --</option>
                  <option v-for="opt in KETERANGAN_OPTS" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-success btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Update Barcode -->
    <div class="modal fade" id="barcodeUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg rounded-3">
          <form @submit.prevent="submitBarcodeUpdate">
            <div class="modal-header py-3 bg-primary text-white border-0">
              <h6 class="modal-title fw-bold">
                <i class="bi bi-qr-code-scan me-2"></i>
                Update Barcode: {{ barcodeForm.mainCat }} - {{ barcodeForm.subLabel }}
              </h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Scan / Paste Barcode</label>
                <textarea
                  v-model="barcodeForm.barcodes"
                  class="form-control form-control-sm border-2 rounded-2"
                  rows="4"
                  placeholder="Scan barcode satu-persatu atau paste list barcode di sini (pisahkan dengan spasi/enter)..."
                  required
                ></textarea>
                <div class="form-text text-muted small">Masukkan satu atau beberapa barcode sekaligus.</div>
              </div>
              <!-- Dropdown Klasifikasi Dinamis (Hanya muncul jika ada barcode BARU dan kategori butuh warna/jenis) -->
              <div v-if="currentDetailOptions.length > 0 && hasNewBarcode" class="mb-3">
                <label class="form-label small fw-bold text-secondary">Klasifikasi Warna / Jenis (Untuk Barcode Baru)</label>
                <select v-model="barcodeForm.detailType" class="form-select form-select-sm border-2 rounded-2" required>
                  <option value="">-- Pilih Klasifikasi --</option>
                  <option v-for="opt in currentDetailOptions" :key="`classif-${opt}`" :value="opt">
                    {{ getDetailLabel(opt) }}
                  </option>
                </select>
                <div class="form-text text-muted small">
                  <i class="bi bi-info-circle text-info me-1"></i>
                  Ditujukan bagi barcode baru agar terdaftar ke kelompok warna/jenis yang benar.
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Lokasi Tujuan</label>
                <select v-model="barcodeForm.destination" class="form-select form-select-sm border-2 rounded-2" required>
                  <option value="">-- Pilih Lokasi Tujuan --</option>
                  <option v-for="row in tableRows" :key="`dest-${row.key}`" :value="row.key">
                    {{ row.label }}
                  </option>
                  <option value="mutasi">Mutasi</option>
                  <option value="laku">Terjual</option>
                </select>
                <div class="form-text text-muted small">
                  <i class="bi bi-info-circle text-info me-1"></i>
                  Sistem akan mendeteksi lokasi asal masing-masing barcode secara otomatis dari database.
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-secondary">Petugas</label>
                <select v-model="barcodeForm.petugas" class="form-select form-select-sm border-2 rounded-2" required>
                  <option value="">-- Pilih Nama Staff --</option>
                  <option v-for="staff in staffOptions" :key="`barcode-staff-${staff}`" :value="staff">
                    {{ staff }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label class="form-label small fw-bold text-secondary">Catatan / Keterangan</label>
                <input
                  v-model="barcodeForm.keterangan"
                  type="text"
                  class="form-control form-control-sm border-2 rounded-2"
                  placeholder="Tulis catatan jika diperlukan..."
                />
              </div>
              <div v-if="barcodeStatus" class="alert alert-info py-2 px-3 mt-3 small border-0 rounded-2 d-flex align-items-center gap-2">
                <div class="spinner-border spinner-border-sm text-info" role="status" v-if="saving"></div>
                <span>{{ barcodeStatus }}</span>
              </div>
            </div>
            <div class="modal-footer py-2 border-0 bg-light-subtle">
              <button type="button" class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" :disabled="saving">
                Batal
              </button>
              <button class="btn btn-primary btn-sm rounded-pill px-4" :disabled="saving">
                <span class="spinner-border spinner-border-sm me-1" role="status" v-if="saving"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="komputerUpdateModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <form @submit.prevent="submitKomputerUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok Komputer</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jenis Barang</label>
                <input class="form-control form-control-sm" :value="komputerForm.mainCat" readonly />
              </div>
              <div class="mb-2">
                <label class="form-label small fw-semibold">Jumlah</label>
                <input
                  v-model.number="komputerForm.quantity"
                  type="number"
                  min="0"
                  class="form-control form-control-sm"
                  required
                />
              </div>
              <small class="text-muted">Update stok komputer tidak mencatat riwayat.</small>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-primary btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="komputerColorModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <form @submit.prevent="submitKomputerColorUpdate">
            <div class="modal-header py-2">
              <h6 class="modal-title fw-semibold">Update Stok Komputer {{ komputerColorForm.mainCat }}</h6>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="table-responsive mb-2">
                <table class="table table-sm table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>{{ komputerDetailLabel }}</th>
                      <th>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ct in komputerDetailTypes" :key="ct">
                      <td>{{ komputerDetailLabels[ct] || ct }}</td>
                      <td>
                        <input
                          v-model.number="komputerColorForm.details[ct]"
                          type="number"
                          min="0"
                          class="form-control form-control-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer py-2">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Batal</button>
              <button class="btn btn-primary btn-sm" :disabled="saving">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="historyModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">Riwayat - {{ historyInfo.mainCat }} / {{ historyInfo.subLabel }}</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-2">
            <div v-if="historyList.length === 0" class="text-center text-muted py-3">Belum ada riwayat.</div>
            <div v-else class="table-responsive">
              <table class="table table-sm table-striped mb-0">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Staff</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in historyList.slice(0, 10)" :key="i">
                    <td>{{ i + 1 }}</td>
                    <td>{{ formatDate(h.date) }}</td>
                    <td>{{ formatHistoryQty(h) }}</td>
                    <td>{{ h.petugas || "-" }}</td>
                    <td>
                      <div 
                        v-if="!h.barcodes || !h.barcodes.length || (h.keterangan && h.keterangan.toLowerCase() !== 'mutasi barcode')" 
                        class="fw-semibold text-dark mb-1"
                      >
                        {{ formatHistoryNote(h) }}
                      </div>
                      <div v-if="h.barcodes && h.barcodes.length" class="d-flex flex-wrap gap-1 align-items-center">
                        <span 
                          v-if="getHistoryRecordClassification(historyInfo.mainCat, h)"
                          class="badge bg-info text-dark fw-bold border"
                          style="font-size: 0.7rem;"
                        >
                          {{ getHistoryRecordClassification(historyInfo.mainCat, h) }}
                        </span>
                        <span 
                          v-for="bc in h.barcodes.slice(0, 5)" 
                          :key="getBarcodeKey(bc)" 
                          class="badge bg-light text-primary border monospace fw-bold" 
                          style="font-size: 0.7rem;"
                        >
                          {{ getBarcodeKey(bc) }}
                        </span>
                        <span 
                          v-if="h.totalBarcodesCount > 5" 
                          class="badge bg-secondary-subtle text-secondary border fw-semibold"
                          style="font-size: 0.7rem;"
                        >
                          +{{ h.totalBarcodesCount - 5 }} lagi
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <small v-if="historyList.length > 10" class="text-muted">Menampilkan 10 riwayat terbaru.</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Rincian & Daftar Barcode (Unified) -->
    <div class="modal fade" id="barcodeRincianModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header py-3 bg-primary text-white border-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-qr-code-scan me-2"></i>
              Rincian Barcode: {{ selectedCategory }} - {{ selectedLocationLabel }}
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4 bg-light-subtle">
            <!-- If category has sub-types (e.g. Kalung colors, Hala types) -->
            <ul v-if="modalTabs.length > 0" class="nav nav-pills mb-3 justify-content-center scrollable-pills modal-pills">
              <li v-for="tab in modalTabs" :key="tab.key" class="nav-item">
                <button
                  class="nav-link btn-sm py-1 px-3 me-2 rounded-pill fw-semibold d-flex align-items-center gap-1 border-0"
                  :class="activeModalTab === tab.key ? 'active bg-primary text-white' : 'text-secondary bg-transparent'"
                  @click="selectModalTab(tab.key)"
                >
                  {{ tab.label }}
                  <span class="badge ms-1" :class="activeModalTab === tab.key ? 'bg-white text-primary' : 'bg-secondary text-white'">
                    {{ getSubQty(tab.key) }}
                  </span>
                </button>
              </li>
            </ul>

            <!-- Check if location is Display -->
            <div v-if="selectedLocation === 'barang-display'" class="alert alert-warning py-4 text-center border-0 rounded-4 shadow-sm mb-0">
              <i class="bi bi-info-circle fs-3 d-block mb-2 text-warning"></i>
              <h6 class="fw-bold mb-1">Pelacakan Dinonaktifkan</h6>
              <span class="text-secondary small">Pelacakan barcode individu dinonaktifkan di lokasi Display.</span>
            </div>

            <!-- Else (physical locations with tracking enabled) -->
            <div v-else>
              <div v-if="loadingBarcodes" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted small fw-semibold">Memuat daftar barcode...</p>
              </div>
              <div v-else>
                <!-- Info & Control Bar -->
                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <button 
                      class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 shadow-sm transition-all hover-btn-scale"
                      @click="copyAllBarcodes"
                      :disabled="copyingAll || barcodes.length === 0"
                    >
                      <span v-if="copyingAll" class="spinner-border spinner-border-sm" role="status"></span>
                      <i v-else class="bi bi-clipboard"></i>
                      <span>Salin Semua Barcode</span>
                    </button>
                  </div>
                  <div>
                    <form @submit.prevent="handleBarcodeSearch" class="d-flex gap-1 align-items-center">
                      <div class="input-group input-group-sm rounded-pill overflow-hidden border shadow-sm search-input-group" style="max-width: 220px; background: white;">
                        <span class="input-group-text bg-white text-muted border-0 pe-1 ps-2">
                          <i class="bi bi-search" style="font-size: 0.85rem;"></i>
                        </span>
                        <input 
                          v-model="barcodeSearchQuery" 
                          type="text" 
                          class="form-control border-0 ps-1 py-1" 
                          placeholder="Cari barcode..." 
                          style="font-size: 0.85rem;"
                        />
                        <button v-if="barcodeSearchQuery" type="button" class="btn btn-link btn-xs p-1 text-secondary bg-transparent border-0 d-inline-flex align-items-center justify-content-center hover-primary" @click="clearBarcodeSearch" style="width: 26px;">
                          <i class="bi bi-x fs-6"></i>
                        </button>
                      </div>
                      <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1 shadow-sm transition-all hover-btn-scale" style="font-size: 0.85rem;">
                        Cari
                      </button>
                    </form>
                  </div>
                </div>

                <div v-if="barcodes.length === 0" class="text-center py-5 border border-dashed rounded-4 bg-white shadow-sm">
                  <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                  <p class="text-secondary small mb-0">Tidak ada barcode terdaftar di lokasi/kategori ini.</p>
                </div>
                <div v-else>
                  <div class="table-responsive border border-light rounded-4 shadow-sm bg-white custom-scrollbar" style="max-height: 350px; overflow-y: auto;">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light border-bottom">
                        <tr>
                          <th class="ps-3 text-secondary fw-semibold small" style="width: 70px;">No</th>
                          <th class="text-secondary fw-semibold small">Barcode</th>
                          <th class="text-secondary fw-semibold small">Terakhir Update</th>
                          <th v-if="isSupervisorOnly" class="pe-3 text-end text-secondary fw-semibold small" style="width: 90px;">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(b, idx) in barcodes" :key="b.id" class="barcode-row transition-all">
                          <td class="ps-3 text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                          <td>
                            <div class="d-flex align-items-center gap-2">
                              <span class="monospace fw-bold text-dark fs-7 bg-light px-2.5 py-1 rounded border">{{ b.barcode }}</span>
                              <button 
                                type="button"
                                class="btn btn-link btn-xs p-1 text-secondary hover-primary border-0 bg-transparent rounded-circle d-inline-flex align-items-center justify-content-center transition-all hover-bg-light"
                                @click="copySingleBarcode(b.barcode, idx)"
                                title="Salin Barcode"
                                style="width: 26px; height: 26px;"
                              >
                                <i :class="copiedIndex === idx ? 'bi bi-check-lg text-success' : 'bi bi-clipboard fs-7'"></i>
                              </button>
                            </div>
                          </td>
                          <td class="text-muted small">
                            <span class="d-inline-flex align-items-center gap-1.5">
                              <i class="bi bi-clock text-secondary opacity-75"></i>
                              {{ formatDate(b.lastUpdated) }}
                            </span>
                          </td>
                          <td v-if="isSupervisorOnly" class="pe-3 text-end">
                            <button
                              type="button"
                              class="btn btn-outline-danger btn-xs px-2 py-0.5 rounded-pill transition-all d-inline-flex align-items-center gap-1 align-middle border-0"
                              @click="handleDeleteBarcode(b.barcode)"
                              :disabled="deletingBarcode === b.barcode"
                            >
                              <span v-if="deletingBarcode === b.barcode" class="spinner-border spinner-border-sm" role="status" style="width: 0.75rem; height: 0.75rem;"></span>
                              <i v-else class="bi bi-trash fs-7"></i>
                              <span>Hapus</span>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Pagination Controls -->
                  <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
                    <button
                      class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                      :disabled="currentPage === 1 || loadingBarcodes"
                      @click="loadBarcodePage(currentPage - 1)"
                    >
                      <i class="bi bi-chevron-left"></i>
                      Sebelumnya
                    </button>
                    <span class="small fw-bold text-secondary">Halaman {{ currentPage }}</span>
                    <button
                      class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                      :disabled="!hasMore || loadingBarcodes"
                      @click="loadBarcodePage(currentPage + 1)"
                    >
                      Berikutnya
                      <i class="bi bi-chevron-right"></i>
                    </button>
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

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Modal } from "bootstrap";
import { collection, query, where, getDocs, limit, startAfter, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import MovementQueue from "@/components/inventory/barcode-tracking/MovementQueue.vue";
import MutationLog from "@/components/inventory/barcode-tracking/MutationLog.vue";
import StockOpname from "@/components/inventory/barcode-tracking/StockOpname.vue";
import ClipManager from "@/components/inventory/barcode-tracking/ClipManager.vue";
import {
  parseBarcodes,
  executeBarcodeMutation,
  submitBarcodeMoveRequest,
  checkBarcodesStatus,
  deleteSingleBarcode
} from "@/services/barcode-service";
import {
  KETERANGAN_OPTS,
  calcFisikTotal,
  fetchAllStockData,
  fetchDailyReport,
  getStockStatus,
  mergeStockByLatest,
  saveDailyReport,
  subscribeStocksRealtime,
  fetchStaffOptions,
  updateKomputerStock,
  updateStockItem,
} from "@/services/inventory-service";
import {
  ensureInventorySettings,
  fetchInventorySettings,
  normalizeInventorySettings,
  subscribeInventorySettings,
} from "@/services/inventory-setting-service";

const { toast, error: showError, confirm } = useAlert();
const auth = useAuthStore();

// Toggle untuk mengaktifkan antrian persetujuan mutasi (Movement Queue)
const ENABLE_MUTATION_QUEUE = false;

const loading = ref(false);
const saving = ref(false);
const stockData = ref({});
const staffOptions = ref([]);
const displaySettings = ref(normalizeInventorySettings());
const activeTab = ref("");

const COLOR_TYPES = computed(() => {
  if (displaySettings.value?.colorTypes) {
    return displaySettings.value.colorTypes.map((c) => c.key);
  }
  return ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
});

const COLOR_LABELS = computed(() => {
  if (displaySettings.value?.colorTypes) {
    const labels = {};
    displaySettings.value.colorTypes.forEach((c) => {
      labels[c.key] = c.label;
    });
    return labels;
  }
  return { HIJAU: "Hijau", BIRU: "Biru", PUTIH: "Putih", PINK: "Pink", KUNING: "Kuning" };
});

const HALA_TYPES = computed(() => {
  if (displaySettings.value?.halaTypes) {
    return displaySettings.value.halaTypes.map((c) => c.key);
  }
  return ["KA", "LA", "AN", "CA", "SA", "GA"];
});

const HALA_LABELS = computed(() => {
  if (displaySettings.value?.halaTypes) {
    const labels = {};
    displaySettings.value.halaTypes.forEach((c) => {
      labels[c.key] = c.label;
    });
    return labels;
  }
  return { KA: "Kalung", LA: "Liontin", AN: "Anting", CA: "Cincin", SA: "Giwang", GA: "Gelang" };
});

const CACHE_KEY_PREFIX = "melati-stock-cache-v2";
const CACHE_TTL = 5 * 60 * 1000;
const modalMap = new Map();

let unsubRealtime = null;
let unsubSettings = null;
let snapshotTimer = null;

const mainTab = ref("agregat"); // "agregat" or "lacakFisik"
const physicalTab = ref(ENABLE_MUTATION_QUEUE ? "antrian" : "log"); // "antrian" or "log"

const simpleForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  quantity: 0,
  petugas: "",
  keterangan: "",
});

const typedForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  details: {},
  original: {},
  petugas: "",
  keterangan: "",
});

const halaForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  details: {},
  original: {},
  petugas: "",
  keterangan: "",
});

const barcodeForm = ref({
  mainCat: "",
  subDoc: "",
  subLabel: "",
  barcodes: "",
  destination: "",
  petugas: "",
  keterangan: "",
  detailType: "",
});

const barcodeStatus = ref(null);
const checkingBarcodes = ref(false);
const hasNewBarcode = ref(false);

const komputerForm = ref({
  mainCat: "",
  quantity: 0,
});

const komputerColorForm = ref({
  mainCat: "",
  detailType: "",
  details: {},
});

const historyInfo = ref({ mainCat: "", subLabel: "" });
const historyList = ref([]);
const detailInfo = ref({ mainCat: "", subLabel: "" });
const detailData = ref({});

const selectedLocation = ref("");
const selectedLocationLabel = ref("");
const selectedCategory = ref("");
const barcodes = ref([]);
const currentPage = ref(1);
const pageSize = 10;
const loadingBarcodes = ref(false);
const hasMore = ref(false);
const pageDocs = ref([]);
const activeModalTab = ref("");
const barcodeCache = ref({});
const copyingAll = ref(false);
const copiedIndex = ref(null);
const barcodeSearchQuery = ref("");

const isBarcodeEnabled = computed(() => {
  return !!displaySettings.value?.barcodeEnabled;
});

const enabledCards = computed(() => displaySettings.value.cards.filter((card) => card.enabled));
const nonComputerCards = computed(() => enabledCards.value.filter((card) => card.type !== "computer"));
const summaryCards = computed(() => nonComputerCards.value.filter((card) => card.showInSummary !== false));
const tabs = computed(() => enabledCards.value);
const hasTabs = computed(() => tabs.value.length > 0);
const tableRows = computed(() => displaySettings.value.tableRows.filter((row) => row.enabled));
const isComputerTab = computed(() => getCardType(activeTab.value) === "computer");
const showRincianColumn = computed(() => isColorType(activeTab.value) || isHalaType(activeTab.value));
const isSupervisorOnly = computed(() => auth.userRole?.toLowerCase() === "supervisor");
const currentDetailOptions = computed(() => {
  const cat = barcodeForm.value.mainCat;
  const detailMode = getCardDetailMode(cat);
  if (detailMode === "color") return COLOR_TYPES.value;
  if (detailMode === "hala") return HALA_TYPES.value;
  return [];
});
function getDetailLabel(opt) {
  return getTypeLabel(barcodeForm.value.mainCat, opt);
}
const komputerDetailTypes = computed(() => {
  let baseTypes = [];
  if (komputerColorForm.value.detailType === "hala") {
    baseTypes = [...HALA_TYPES.value];
  } else if (komputerColorForm.value.detailType === "color") {
    baseTypes = [...COLOR_TYPES.value];
  } else {
    return [];
  }
  const cat = komputerColorForm.value.mainCat;
  const item = getItem("stok-komputer", cat);
  if (item && item.details) {
    Object.keys(item.details).forEach(k => {
      if (toInt(item.details[k]) > 0 && !baseTypes.includes(k)) {
        baseTypes.push(k);
      }
    });
  }
  return baseTypes;
});
const komputerDetailLabels = computed(() => {
  let labels = {};
  if (komputerColorForm.value.detailType === "hala") {
    labels = { ...HALA_LABELS.value };
  } else if (komputerColorForm.value.detailType === "color") {
    labels = { ...COLOR_LABELS.value };
  }
  const cat = komputerColorForm.value.mainCat;
  const item = getItem("stok-komputer", cat);
  if (item && item.details) {
    Object.keys(item.details).forEach(k => {
      if (toInt(item.details[k]) > 0 && !labels[k]) {
        labels[k] = `${k} (Lainnya)`;
      }
    });
  }
  return labels;
});
const komputerDetailLabel = computed(() => (komputerColorForm.value.detailType === "hala" ? "Jenis" : "Warna"));
const summaryGridStyle = computed(() => {
  const grid = displaySettings.value.summaryGrid || {};
  return {
    "--summary-md-cols": String(grid.md || 2),
    "--summary-lg-cols": String(grid.lg || 3),
    "--summary-xl-cols": String(grid.xl || 3),
    "--summary-gap": `${grid.gap || 12}px`,
  };
});

const summary = computed(() => {
  const out = {};
  nonComputerCards.value.forEach((card) => {
    const cat = card.id;
    const fisik = calcFisikTotal(stockData.value, cat, tableRows.value);
    const komputer = toInt(stockData.value["stok-komputer"]?.[cat]?.quantity);
    out[cat] = {
      fisik,
      komputer,
      status: getStockStatus(fisik, komputer),
    };
  });
  return out;
});

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function getCardById(id) {
  return displaySettings.value.cards.find((card) => card.id === id) || null;
}

function getCardType(id) {
  return getCardById(id)?.type || "simple";
}

function getCardDetailMode(id) {
  const card = getCardById(id);
  const mode = String(card?.detailMode || "")
    .trim()
    .toLowerCase();
  if (mode === "color" || mode === "hala" || mode === "default") return mode;
  if (card?.type === "color") return "color";
  if (card?.type === "hala") return "hala";
  return "default";
}

function isColorType(id) {
  return getCardDetailMode(id) === "color";
}

function isHalaType(id) {
  return getCardDetailMode(id) === "hala";
}

function cardStyle(cardId) {
  const card = getCardById(cardId);
  const start = card?.colorStart || "#eef7ff";
  const end = card?.colorEnd || "#8cc8ff";
  return {
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
  };
}

function summaryValueClass(cat) {
  const fisik = toInt(summary.value?.[cat]?.fisik);
  const komputer = toInt(summary.value?.[cat]?.komputer);
  if (fisik < komputer) return "text-danger";
  if (fisik === komputer) return "text-success";
  return "text-primary";
}

function getItem(subDoc, mainCat) {
  return stockData.value[subDoc]?.[mainCat] || null;
}

function getQty(mainCat, subDoc) {
  const item = getItem(subDoc, mainCat);
  if (!item) return 0;
  const detailMode = getCardDetailMode(mainCat);
  if ((detailMode === "color" || detailMode === "hala") && item.details && Object.keys(item.details).length > 0) {
    return Object.values(item.details).reduce((sum, v) => sum + toInt(v), 0);
  }
  return toInt(item.quantity);
}

function hasDetails(mainCat, subDoc) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode !== "color" && detailMode !== "hala") return false;
  const item = getItem(subDoc, mainCat);
  return !!(item?.details && Object.keys(item.details).length > 0);
}

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

function getTypeLabel(mainCat, key) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color") return COLOR_LABELS.value[key] || key;
  if (detailMode === "hala") return HALA_LABELS.value[key] || key;
  return key;
}

function getBarcodeKey(bc) {
  return typeof bc === "object" ? bc.barcode : bc;
}

function getFallbackDetailType(mainCat, code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const detailMode = getCardDetailMode(mainCat);
  
  if (detailMode === "color") {
    const types = COLOR_TYPES.value;
    for (const key of types) {
      if (cleanCode.includes(key)) return key;
    }
    return types[2] || "PUTIH"; // Default fallback
  }
  
  if (detailMode === "hala") {
    const types = HALA_TYPES.value;
    for (const key of types) {
      const parts = [`-${key}-`, key];
      if (parts.some(p => cleanCode.includes(p))) return key;
    }
    return types[0] || "KA"; // Default fallback
  }
  
  return "";
}

function formatBarcodeHistoryItem(mainCat, bc) {
  if (!bc) return "";
  if (typeof bc === "object") {
    const label = getTypeLabel(mainCat, bc.detailType);
    return `${label}: ${bc.barcode}`;
  }
  const detailType = getFallbackDetailType(mainCat, bc);
  if (!detailType) return bc;
  const label = getTypeLabel(mainCat, detailType);
  return `${label}: ${bc}`;
}

function getHistoryRecordClassification(mainCat, record) {
  if (!record?.barcodes || !record.barcodes.length) return "";
  const firstBc = record.barcodes[0];
  let detailType = "";
  if (typeof firstBc === "object") {
    detailType = firstBc.detailType;
  } else {
    detailType = getFallbackDetailType(mainCat, firstBc);
  }
  if (!detailType) return "";
  const label = getTypeLabel(mainCat, detailType);
  const detailMode = getCardDetailMode(mainCat);
  const prefix = detailMode === "hala" ? "Jenis" : "Warna";
  return `${prefix}: ${label}`;
}

function formatHistoryQty(record) {
  if (record.oldQuantity !== undefined && record.newQuantity !== undefined) {
    return `${toInt(record.oldQuantity)} -> ${toInt(record.newQuantity)}`;
  }
  return `${toInt(record.quantity)}`;
}

function formatHistoryNote(record) {
  const base = (record.keterangan || "-").toUpperCase();
  if (!record.items || !Array.isArray(record.items) || !record.items.length) return base;
  const summaryText = record.items
    .filter((it) => toInt(it.quantity) !== 0)
    .map((it) => `${it.jewelryName || it.jewelryType}: ${toInt(it.oldQuantity)} -> ${toInt(it.newQuantity)}`)
    .join(", ");
  if (!summaryText) return base;
  return `${summaryText} | ${base}`;
}

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const modal = Modal.getOrCreateInstance(el);
  modal.show();
  modalMap.set(id, modal);
}

function closeModal(id) {
  const modal = modalMap.get(id) || Modal.getInstance(document.getElementById(id));
  modal?.hide();
}

function getCacheFloorId() {
  return String(auth.activeFloor || "")
    .trim()
    .toUpperCase();
}

function getCacheKey() {
  const floorId = getCacheFloorId();
  if (!floorId) return "";
  return `${CACHE_KEY_PREFIX}:${floorId}`;
}

function readCache() {
  const cacheKey = getCacheKey();
  if (!cacheKey) return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    if (parsed.floorId && parsed.floorId !== getCacheFloorId()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  const cacheKey = getCacheKey();
  if (!cacheKey) return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        floorId: getCacheFloorId(),
        timestamp: Date.now(),
        data,
      }),
    );
  } catch {
    // ignore quota or parse errors
  }
}

function sumDetails(details = {}) {
  return Object.values(details).reduce((sum, v) => sum + toInt(v), 0);
}

function normalizeDetails(details = {}) {
  const normalized = {};
  Object.keys(details).forEach((key) => {
    normalized[key] = toInt(details[key]);
  });
  return normalized;
}

function applyLocalUpdate({ subDoc, mainCat, details = null, quantity = null }) {
  const prevSub = stockData.value[subDoc] || {};
  const prevItem = prevSub[mainCat] || {};
  const nextItem = {
    ...prevItem,
    lastUpdated: new Date().toISOString(),
  };

  if (details) {
    const normalized = normalizeDetails(details);
    nextItem.details = normalized;
    nextItem.quantity = sumDetails(normalized);
  } else if (quantity !== null && quantity !== undefined) {
    nextItem.quantity = toInt(quantity);
    if (prevItem.details) nextItem.details = prevItem.details;
  }

  stockData.value = {
    ...stockData.value,
    [subDoc]: {
      ...prevSub,
      [mainCat]: nextItem,
    },
  };
}

async function loadData({ force = false } = {}) {
  loading.value = true;
  try {
    if (!force) {
      const cacheData = readCache();
      if (cacheData) {
        stockData.value = cacheData;
        loading.value = false;
        return;
      }
    }

    stockData.value = await fetchAllStockData(auth.activeFloor);
    writeCache(stockData.value);
  } catch (e) {
    showError("Gagal memuat data stok", e.message);
  } finally {
    loading.value = false;
  }
}

async function loadStaffOptions() {
  try {
    staffOptions.value = await fetchStaffOptions({ floorId: auth.activeFloor });
  } catch {
    staffOptions.value = [];
  }
}

async function syncFloorScopedState() {
  await loadDisplaySettings();
  await loadData({ force: true });
  await loadStaffOptions();
  setupRealtimeListener();
  setupDisplaySettingsRealtime();
}

function ensureActiveTab() {
  const tabIds = tabs.value.map((card) => card.id);
  if (!tabIds.length) {
    activeTab.value = "";
    return;
  }
  if (!tabIds.includes(activeTab.value)) {
    activeTab.value = tabIds[0];
  }
}

function applyDisplaySettings(payload = {}) {
  displaySettings.value = normalizeInventorySettings(payload, auth.activeFloor);
  ensureActiveTab();
}

async function loadDisplaySettings() {
  try {
    await ensureInventorySettings(auth.activeFloor);
    const settings = await fetchInventorySettings(auth.activeFloor);
    applyDisplaySettings(settings);
  } catch (e) {
    showError("Gagal memuat setting manajemen stok", e.message);
  }
}

function setupDisplaySettingsRealtime() {
  if (unsubSettings) unsubSettings();
  unsubSettings = subscribeInventorySettings(
    (data) => {
      applyDisplaySettings(data);
    },
    () => {
      // ignore listener runtime errors
    },
    auth.activeFloor,
  );
}

async function refreshData() {
  await loadData({ force: true });
  toast("Data stok diperbarui");
}

function openUpdateModal(mainCat, sub) {
  if (!isBarcodeEnabled.value || sub.key === "barang-display") {
    const detailMode = getCardDetailMode(mainCat);
    if (detailMode === "color") {
      const item = getItem(sub.key, mainCat) || {};
      const details = {};
      COLOR_TYPES.value.forEach((k) => {
        details[k] = toInt(item.details?.[k]);
      });
      if (item.details) {
        Object.keys(item.details).forEach((k) => {
          if (toInt(item.details[k]) > 0 && !COLOR_TYPES.value.includes(k)) {
            details[k] = toInt(item.details[k]);
          }
        });
      }
      typedForm.value = {
        mainCat,
        subDoc: sub.key,
        subLabel: sub.label,
        details: { ...details },
        original: { ...details },
        petugas: "",
        keterangan: "",
      };
      showModal("typedUpdateModal");
      return;
    }

    if (detailMode === "hala") {
      const item = getItem(sub.key, mainCat) || {};
      const details = {};
      HALA_TYPES.value.forEach((k) => {
        details[k] = toInt(item.details?.[k]);
      });
      if (item.details) {
        Object.keys(item.details).forEach((k) => {
          if (toInt(item.details[k]) > 0 && !HALA_TYPES.value.includes(k)) {
            details[k] = toInt(item.details[k]);
          }
        });
      }
      halaForm.value = {
        mainCat,
        subDoc: sub.key,
        subLabel: sub.label,
        details: { ...details },
        original: { ...details },
        petugas: "",
        keterangan: "",
      };
      showModal("halaUpdateModal");
      return;
    }

    simpleForm.value = {
      mainCat,
      subDoc: sub.key,
      subLabel: sub.label,
      quantity: getQty(mainCat, sub.key),
      petugas: "",
      keterangan: "",
    };
    showModal("simpleUpdateModal");
    return;
  }

  barcodeForm.value = {
    mainCat,
    subDoc: sub.key,
    subLabel: sub.label,
    barcodes: "",
    destination: sub.key, // Default to the same location for easy base registration
    petugas: "",
    keterangan: "",
    detailType: "",
  };
  hasNewBarcode.value = false;
  barcodeStatus.value = null;
  showModal("barcodeUpdateModal");
}

function openKomputerModal(mainCat) {
  const item = getItem("stok-komputer", mainCat) || { quantity: 0, details: {} };
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color" || detailMode === "hala") {
    const detailType = detailMode;
    const types = detailMode === "hala" ? HALA_TYPES.value : COLOR_TYPES.value;
    const details = {};
    types.forEach((k) => {
      details[k] = toInt(item.details?.[k]);
    });
    if (item.details) {
      Object.keys(item.details).forEach((k) => {
        if (toInt(item.details[k]) > 0 && !types.includes(k)) {
          details[k] = toInt(item.details[k]);
        }
      });
    }
    komputerColorForm.value = {
      mainCat,
      detailType,
      details,
    };
    showModal("komputerColorModal");
    return;
  }

  komputerForm.value = {
    mainCat,
    quantity: toInt(item.quantity),
  };
  showModal("komputerUpdateModal");
}

function openHistoryModal(mainCat, sub) {
  historyInfo.value = {
    mainCat,
    subLabel: sub.label,
  };
  historyList.value = getItem(sub.key, mainCat)?.history || [];
  showModal("historyModal");
}

const modalTabs = computed(() => {
  const cat = selectedCategory.value;
  const detailMode = getCardDetailMode(cat);
  let baseTabs = [];
  
  if (detailMode === "color") {
    baseTabs = COLOR_TYPES.value.map(k => ({ key: k, label: COLOR_LABELS.value[k] || k }));
  } else if (detailMode === "hala") {
    baseTabs = HALA_TYPES.value.map(k => ({ key: k, label: HALA_LABELS.value[k] || k }));
  } else {
    return [];
  }
  
  const loc = selectedLocation.value;
  const item = getItem(loc, cat);
  if (item && item.details) {
    const activeKeys = new Set(baseTabs.map(t => t.key));
    Object.keys(item.details).forEach(k => {
      const qty = toInt(item.details[k]);
      if (qty > 0 && !activeKeys.has(k)) {
        baseTabs.push({
          key: k,
          label: `${k} (Lainnya)`,
          isFallback: true
        });
      }
    });
  }
  
  return baseTabs;
});

function getSubQty(subType) {
  const cat = selectedCategory.value;
  const loc = selectedLocation.value;
  const item = getItem(loc, cat);
  return toInt(item?.details?.[subType]);
}

function selectModalTab(tabKey) {
  activeModalTab.value = tabKey;
  barcodeSearchQuery.value = "";
  pageDocs.value = [];
  currentPage.value = 1;
  barcodes.value = [];
  hasMore.value = false;
  if (selectedLocation.value !== "barang-display") {
    loadBarcodePage(1);
  }
}

function openBarcodeRincianModal(mainCat, sub) {
  selectedLocation.value = sub.key;
  selectedLocationLabel.value = sub.label;
  selectedCategory.value = mainCat;
  barcodeSearchQuery.value = "";

  // Clear cache to guarantee we fetch fresh data from Firestore on open
  barcodeCache.value = {};

  if (modalTabs.value.length > 0) {
    const firstWithStock = modalTabs.value.find(tab => getSubQty(tab.key) > 0);
    activeModalTab.value = firstWithStock ? firstWithStock.key : modalTabs.value[0].key;
  } else {
    activeModalTab.value = "";
  }

  pageDocs.value = [];
  currentPage.value = 1;
  barcodes.value = [];
  hasMore.value = false;

  if (sub.key !== "barang-display") {
    loadBarcodePage(1);
  }

  showModal("barcodeRincianModal");
}

const deletingBarcode = ref("");
async function handleDeleteBarcode(barcodeId) {
  const result = await confirm({
    title: "Hapus Barcode?",
    text: `Apakah Anda yakin ingin menghapus barcode ${barcodeId} dari sistem secara permanen? Stok fisik akan disesuaikan otomatis.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal"
  });

  if (!result.isConfirmed) return;

  deletingBarcode.value = barcodeId;
  try {
    await deleteSingleBarcode({ barcodeId, floorId: auth.activeFloor });
    toast(`Barcode ${barcodeId} berhasil dihapus.`);
    // Reload the current page of barcodes
    await loadBarcodePage(currentPage.value);
    // Reload stock summary and table data
    await loadData({ force: true });
  } catch (e) {
    showError("Gagal menghapus barcode", e.message);
  } finally {
    deletingBarcode.value = "";
  }
}

async function copyAllBarcodes() {
  const cat = selectedCategory.value;
  const loc = selectedLocation.value;
  const subType = activeModalTab.value || null;
  const detailMode = getCardDetailMode(cat);
  const hasDetails = detailMode === "color" || detailMode === "hala";

  if (!cat || !loc) return;

  copyingAll.value = true;
  try {
    let q;
    if (hasDetails) {
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
    const list = [];
    snaps.forEach((doc) => {
      const data = doc.data();
      if (data?.barcode) {
        list.push(data.barcode);
      }
    });

    if (list.length === 0) {
      toast("Tidak ada barcode untuk disalin", "warning");
      return;
    }

    if (!hasDetails) {
      list.sort(); // Sort alphabetically on the client side
    }

    const textToCopy = list.join("\n");
    await navigator.clipboard.writeText(textToCopy);
    toast(`Berhasil menyalin ${list.length} barcode ke clipboard!`);
  } catch (e) {
    showError("Gagal menyalin barcode", e.message);
  } finally {
    copyingAll.value = false;
  }
}

function copySingleBarcode(code, index) {
  navigator.clipboard.writeText(code);
  copiedIndex.value = index;
  toast("Barcode disalin");
  setTimeout(() => {
    if (copiedIndex.value === index) {
      copiedIndex.value = null;
    }
  }, 2000);
}

async function loadBarcodePage(pageNumber) {
  const cat = selectedCategory.value;
  const loc = selectedLocation.value;
  const subType = activeModalTab.value || null;
  const detailMode = getCardDetailMode(cat);
  const hasDetails = detailMode === "color" || detailMode === "hala";
  const searchVal = barcodeSearchQuery.value.trim().toUpperCase();
  const isSearching = !!searchVal;

  if (!isSearching) {
    const cacheKey = `${cat}:${loc}:${subType || 'default'}`;
    const currentLastUpdated = getItem(loc, cat)?.lastUpdated || "";
    const currentQty = subType ? getSubQty(subType) : getQty(cat, loc);

    const cachedData = barcodeCache.value[cacheKey];
    const isCacheValid = cachedData && 
                         cachedData.lastUpdated === currentLastUpdated &&
                         cachedData.quantity === currentQty;

    if (isCacheValid && cachedData.pages[pageNumber]) {
      const pageData = cachedData.pages[pageNumber];
      barcodes.value = pageData.barcodes;
      hasMore.value = pageData.hasMore;
      currentPage.value = pageNumber;
      return;
    }

    let targetPage = pageNumber;
    if (!isCacheValid) {
      const prefix = `${cat}:${loc}:`;
      Object.keys(barcodeCache.value).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete barcodeCache.value[key];
        }
      });

      barcodeCache.value[cacheKey] = {
        lastUpdated: currentLastUpdated,
        quantity: currentQty,
        pages: {}
      };
      targetPage = 1;
      pageDocs.value = [];
    }

    loadingBarcodes.value = true;
    try {
      let q;
      if (hasDetails) {
        q = query(
          collection(db, "floors", auth.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          where("detailType", "==", subType),
          orderBy("barcode", "asc"),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, "floors", auth.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          limit(pageSize)
        );
      }

      if (targetPage > 1 && pageDocs.value[targetPage - 2]) {
        if (hasDetails) {
          q = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("detailType", "==", subType),
            orderBy("barcode", "asc"),
            startAfter(pageDocs.value[targetPage - 2]),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            startAfter(pageDocs.value[targetPage - 2]),
            limit(pageSize)
          );
        }
      }

      const snaps = await getDocs(q);
      const pageItems = [];
      snaps.forEach((doc) => {
        pageItems.push({
          id: doc.id,
          ...doc.data()
        });
      });

      barcodes.value = pageItems;
      hasMore.value = pageItems.length === pageSize;
      currentPage.value = targetPage;

      if (snaps.docs.length > 0) {
        pageDocs.value[targetPage - 1] = snaps.docs[snaps.docs.length - 1];
      }

      barcodeCache.value[cacheKey].pages[targetPage] = {
        barcodes: pageItems,
        hasMore: hasMore.value,
        lastDoc: snaps.docs.length > 0 ? snaps.docs[snaps.docs.length - 1] : null
      };

    } catch (e) {
      showError("Gagal memuat list barcode", e.message);
    } finally {
      loadingBarcodes.value = false;
    }
  } else {
    // Searching mode
    loadingBarcodes.value = true;
    try {
      let q;
      if (hasDetails) {
        q = query(
          collection(db, "floors", auth.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          where("detailType", "==", subType),
          where("barcode", ">=", searchVal),
          where("barcode", "<=", searchVal + "\uf8ff"),
          orderBy("barcode", "asc"),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, "floors", auth.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          where("barcode", ">=", searchVal),
          where("barcode", "<=", searchVal + "\uf8ff"),
          orderBy("barcode", "asc"),
          limit(pageSize)
        );
      }

      if (pageNumber > 1 && pageDocs.value[pageNumber - 2]) {
        if (hasDetails) {
          q = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("detailType", "==", subType),
            where("barcode", ">=", searchVal),
            where("barcode", "<=", searchVal + "\uf8ff"),
            orderBy("barcode", "asc"),
            startAfter(pageDocs.value[pageNumber - 2]),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("barcode", ">=", searchVal),
            where("barcode", "<=", searchVal + "\uf8ff"),
            orderBy("barcode", "asc"),
            startAfter(pageDocs.value[pageNumber - 2]),
            limit(pageSize)
          );
        }
      }

      const snaps = await getDocs(q);
      const pageItems = [];
      snaps.forEach((doc) => {
        pageItems.push({
          id: doc.id,
          ...doc.data()
        });
      });

      barcodes.value = pageItems;
      hasMore.value = pageItems.length === pageSize;
      currentPage.value = pageNumber;

      if (snaps.docs.length > 0) {
        pageDocs.value[pageNumber - 1] = snaps.docs[snaps.docs.length - 1];
      }
    } catch (e) {
      console.warn("Prefix range query failed, falling back to local memory filtering: ", e);
      try {
        let qFallback;
        if (hasDetails) {
          qFallback = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("detailType", "==", subType),
            limit(1000)
          );
        } else {
          qFallback = query(
            collection(db, "floors", auth.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            limit(1000)
          );
        }

        const snaps = await getDocs(qFallback);
        const allItems = [];
        snaps.forEach((doc) => {
          allItems.push({
            id: doc.id,
            ...doc.data()
          });
        });

        allItems.sort((a, b) => (a.barcode || "").localeCompare(b.barcode || ""));

        const filtered = allItems.filter(item => 
          item.barcode && item.barcode.toUpperCase().includes(searchVal)
        );

        barcodes.value = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
        hasMore.value = filtered.length > pageNumber * pageSize;
        currentPage.value = pageNumber;
      } catch (err) {
        showError("Gagal mencari barcode", err.message);
      }
    } finally {
      loadingBarcodes.value = false;
    }
  }
}

async function handleBarcodeSearch() {
  pageDocs.value = [];
  currentPage.value = 1;
  await loadBarcodePage(1);
}

async function clearBarcodeSearch() {
  barcodeSearchQuery.value = "";
  pageDocs.value = [];
  currentPage.value = 1;
  await loadBarcodePage(1);
}

function hasTypedChanges(details, original) {
  return Object.keys(details || {}).some((key) => toInt(details[key]) !== toInt(original?.[key]));
}

// Debounce Watcher untuk Memeriksa Status Barcode
let checkTimeout = null;
watch(
  () => barcodeForm.value.barcodes,
  (newVal) => {
    if (checkTimeout) clearTimeout(checkTimeout);
    const parsed = parseBarcodes(newVal);
    if (parsed.length === 0) {
      hasNewBarcode.value = false;
      return;
    }

    checkTimeout = setTimeout(async () => {
      checkingBarcodes.value = true;
      try {
        const res = await checkBarcodesStatus(parsed, auth.activeFloor);
        if (res && Array.isArray(res.results)) {
          // Jika ada minimal 1 barcode yang belum terdaftar di database
          hasNewBarcode.value = res.results.some(item => !item.exists);
        } else {
          hasNewBarcode.value = false;
        }
      } catch {
        hasNewBarcode.value = true; // Fallback aman
      } finally {
        checkingBarcodes.value = false;
      }
    }, 600);
  }
);

async function submitBarcodeUpdate() {
  if (!barcodeForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!barcodeForm.value.destination) return toast("Lokasi tujuan wajib dipilih", "warning");
  if (!barcodeForm.value.barcodes.trim()) return toast("Barcode tidak boleh kosong", "warning");
  // Validasi klasifikasi wajib dipilih jika ada barcode baru dan kategori membutuhkan rincian detail
  if (currentDetailOptions.value.length > 0 && hasNewBarcode.value && !barcodeForm.value.detailType) {
    return toast("Klasifikasi warna/jenis wajib dipilih", "warning");
  }

  const barcodesArray = parseBarcodes(barcodeForm.value.barcodes);
  if (barcodesArray.length === 0) return toast("Tidak ada barcode yang valid", "warning");

  saving.value = true;
  barcodeStatus.value = `Memproses ${barcodesArray.length} barcode...`;
  try {
    const userRole = auth.userRole?.toLowerCase();
    const isSupervisor = ["supervisor", "admin", "input"].includes(userRole);
    const shouldProcessDirectly = isSupervisor || !ENABLE_MUTATION_QUEUE;

    // Chunking logic (max 200 barcodes per transaction)
    const chunks = [];
    const chunkSize = 200;
    for (let i = 0; i < barcodesArray.length; i += chunkSize) {
      chunks.push(barcodesArray.slice(i, i + chunkSize));
    }

    if (shouldProcessDirectly) {
      for (let i = 0; i < chunks.length; i++) {
        barcodeStatus.value = `Memproses ${barcodesArray.length} barcode (Bagian ${i + 1}/${chunks.length})...`;
        await executeBarcodeMutation({
          barcodes: chunks[i],
          origin: barcodeForm.value.subDoc, // Pass origin location
          destination: barcodeForm.value.destination,
          pemindah: barcodeForm.value.petugas.trim(),
          notes: barcodeForm.value.keterangan?.trim() || "",
          floorId: auth.activeFloor,
          defaultDetailType: barcodeForm.value.detailType,
          category: barcodeForm.value.mainCat
        });
      }
      toast("Mutasi barcode berhasil diproses langsung.");
    } else {
      for (let i = 0; i < chunks.length; i++) {
        barcodeStatus.value = `Mengajukan ${barcodesArray.length} barcode (Bagian ${i + 1}/${chunks.length})...`;
        await submitBarcodeMoveRequest({
          barcodes: chunks[i],
          origin: barcodeForm.value.subDoc, // Pass origin location
          destination: barcodeForm.value.destination,
          pemindah: barcodeForm.value.petugas.trim(),
          notes: barcodeForm.value.keterangan?.trim() || "",
          floorId: auth.activeFloor,
          defaultDetailType: barcodeForm.value.detailType,
          category: barcodeForm.value.mainCat
        });
      }
      toast("Pengajuan mutasi barcode berhasil dikirim ke antrian.");
    }

    await loadData({ force: true });
    closeModal("barcodeUpdateModal");
  } catch (e) {
    showError("Gagal memproses mutasi barcode", e.message);
    barcodeStatus.value = `Gagal: ${e.message}`;
  } finally {
    saving.value = false;
  }
}

async function submitSimpleUpdate() {
  if (!simpleForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!simpleForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: simpleForm.value.subDoc,
      mainCat: simpleForm.value.mainCat,
      newQuantity: toInt(simpleForm.value.quantity),
      newDetails: null,
      petugas: simpleForm.value.petugas.trim(),
      keterangan: simpleForm.value.keterangan,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("simpleUpdateModal");
    toast("Stok berhasil diperbarui");
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitTypedUpdate() {
  if (!typedForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!typedForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");
  if (!hasTypedChanges(typedForm.value.details, typedForm.value.original)) {
    return toast("Tidak ada perubahan data", "warning");
  }

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: typedForm.value.subDoc,
      mainCat: typedForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...typedForm.value.details },
      petugas: typedForm.value.petugas.trim(),
      keterangan: typedForm.value.keterangan,
      detailType: "color",
      floorId: auth.activeFloor,
    });
    applyLocalUpdate({
      subDoc: typedForm.value.subDoc,
      mainCat: typedForm.value.mainCat,
      details: { ...typedForm.value.details },
    });
    await loadData({ force: true });
    closeModal("typedUpdateModal");
    toast(`Update ${typedForm.value.mainCat} berhasil`);
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitHalaUpdate() {
  if (!halaForm.value.petugas.trim()) return toast("Petugas wajib diisi", "warning");
  if (!halaForm.value.keterangan) return toast("Keterangan wajib dipilih", "warning");
  if (!hasTypedChanges(halaForm.value.details, halaForm.value.original)) {
    return toast("Tidak ada perubahan data", "warning");
  }

  saving.value = true;
  try {
    await updateStockItem({
      subDoc: halaForm.value.subDoc,
      mainCat: halaForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...halaForm.value.details },
      petugas: halaForm.value.petugas.trim(),
      keterangan: halaForm.value.keterangan,
      detailType: "hala",
      floorId: auth.activeFloor,
    });
    applyLocalUpdate({
      subDoc: halaForm.value.subDoc,
      mainCat: halaForm.value.mainCat,
      details: { ...halaForm.value.details },
    });
    await loadData({ force: true });
    closeModal("halaUpdateModal");
    toast(`Update ${halaForm.value.mainCat} berhasil`);
  } catch (e) {
    showError("Gagal update stok", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitKomputerUpdate() {
  saving.value = true;
  try {
    await updateKomputerStock({
      mainCat: komputerForm.value.mainCat,
      newQuantity: toInt(komputerForm.value.quantity),
      newDetails: null,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("komputerUpdateModal");
    toast("Stok komputer diperbarui");
  } catch (e) {
    showError("Gagal update stok komputer", e.message);
  } finally {
    saving.value = false;
  }
}

async function submitKomputerColorUpdate() {
  saving.value = true;
  try {
    await updateKomputerStock({
      mainCat: komputerColorForm.value.mainCat,
      newQuantity: null,
      newDetails: { ...komputerColorForm.value.details },
      detailType: komputerColorForm.value.detailType,
      floorId: auth.activeFloor,
    });
    await loadData({ force: true });
    closeModal("komputerColorModal");
    toast("Stok komputer diperbarui");
  } catch (e) {
    showError("Gagal update stok komputer", e.message);
  } finally {
    saving.value = false;
  }
}

function setupRealtimeListener() {
  if (unsubRealtime) unsubRealtime();
  unsubRealtime = subscribeStocksRealtime((incoming) => {
    stockData.value = mergeStockByLatest(stockData.value, incoming);
    writeCache(stockData.value);
  }, auth.activeFloor);
}

function handleStorageSync(event) {
  const cacheKey = getCacheKey();
  if (!cacheKey || event.key !== cacheKey || !event.newValue) return;
  try {
    const parsed = JSON.parse(event.newValue);
    if (!parsed?.data) return;
    if (parsed.floorId && parsed.floorId !== getCacheFloorId()) return;
    stockData.value = mergeStockByLatest(stockData.value, parsed.data);
  } catch {
    // ignore malformed storage payload
  }
}

function getNowWita() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 60 * 60000);
}

function formatDateKey(dateObj) {
  const d = new Date(dateObj);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function scheduleNextDailySnapshot() {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  const now = getNowWita();
  const target = new Date(now);
  target.setHours(0, 5, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  snapshotTimer = setTimeout(async () => {
    try {
      await saveDailyReport(formatDateKey(getNowWita()), stockData.value, auth.activeFloor);
    } catch {
      // ignore snapshot runtime errors
    } finally {
      scheduleNextDailySnapshot();
    }
  }, delay);
}

async function initDailySnapshots() {
  try {
    const now = getNowWita();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = formatDateKey(yesterday);
    const yReport = await fetchDailyReport(yesterdayKey, auth.activeFloor);
    if (yReport.source === "none") {
      await saveDailyReport(yesterdayKey, stockData.value, auth.activeFloor);
    }

    const todayKey = formatDateKey(now);
    const today005 = new Date(now);
    today005.setHours(0, 5, 0, 0);
    if (now >= today005) {
      const tReport = await fetchDailyReport(todayKey, auth.activeFloor);
      if (tReport.source === "none") {
        await saveDailyReport(todayKey, stockData.value, auth.activeFloor);
      }
    }
  } catch {
    // ignore bootstrap snapshot errors
  } finally {
    scheduleNextDailySnapshot();
  }
}

async function handleStockReload() {
  await loadData({ force: true });
}

onMounted(async () => {
  await syncFloorScopedState();
  window.addEventListener("storage", handleStorageSync);
  window.addEventListener("melati-stock-reload", handleStockReload);
  await initDailySnapshots();
});

watch(
  () => auth.activeFloor,
  async (nextFloor, previousFloor) => {
    if (!nextFloor || nextFloor === previousFloor) return;
    await syncFloorScopedState();
  },
);

onUnmounted(() => {
  if (unsubRealtime) unsubRealtime();
  if (unsubSettings) unsubSettings();
  if (snapshotTimer) clearTimeout(snapshotTimer);
  window.removeEventListener("storage", handleStorageSync);
  window.removeEventListener("melati-stock-reload", handleStockReload);
});
</script>

<style scoped>
.stock-page {
  --tab-bg: linear-gradient(135deg, #c4dbf7 0%, #dbe9fc 100%);
}

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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--summary-gap, 12px);
}

@media (min-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-md-cols, 2), minmax(0, 1fr));
  }
}

@media (min-width: 992px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-lg-cols, 3), minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(var(--summary-xl-cols, 3), minmax(0, 1fr));
  }
}

.summary-card {
  border-radius: 12px;
  padding: 12px;
  color: #1f2a44;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-title {
  font-size: 0.8rem;
  font-weight: 700;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 800;
}

.summary-status {
  text-transform: uppercase;
  font-weight: 600;
}

.nav-tabs.compact {
  border-bottom: 3px solid #e9ecef;
  background: var(--tab-bg);
  border-radius: 12px 12px 0 0;
  padding: 10px 10px 0;
  justify-content: center;
}

.nav-tabs.compact .nav-link.active {
  background: rgba(255, 255, 255, 0.75);
  border: none;
  border-bottom: 2px solid #3f37c9;
}

.table thead th {
  font-size: 0.83rem;
  text-transform: uppercase;
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f3f5f8;
}

.table td,
.table th {
  vertical-align: middle;
}

.table-responsive {
  max-height: none;
}

.modal-header {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%);
  color: #fff;
}

.modal-header .btn-close {
  filter: invert(1);
}

/* Scrollable Pills styling for better UI/UX */
.scrollable-pills {
  display: flex;
  flex-wrap: nowrap !important;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 5px;
  width: 100%;
}

.scrollable-pills::-webkit-scrollbar {
  height: 4px;
}

.scrollable-pills::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.scrollable-pills::-webkit-scrollbar-track {
  background: transparent;
}

.main-pills-container {
  background-color: #f1f3f7;
  border: 1px solid #e2e8f0;
}

.main-pill-btn {
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  outline: none;
  background-color: transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-pill-btn:hover:not(.active) {
  color: #1e293b;
  background-color: rgba(0, 0, 0, 0.04) !important;
}

.main-pill-btn.active {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(76, 99, 210, 0.35) !important;
}

.modal-pills {
  gap: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 12px;
  width: 100%;
}

.modal-pills .nav-link {
  font-size: 0.8rem;
  padding: 6px 14px;
  white-space: nowrap;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50rem !important;
}

.modal-pills .nav-link .badge {
  font-size: 0.72rem;
  padding: 2.5px 5.5px;
  border-radius: 50rem;
  transition: all 0.25s ease;
}

.modal-pills .nav-link.active {
  box-shadow: 0 4px 12px rgba(13, 110, 253, 0.25) !important;
}

.barcode-row {
  transition: background-color 0.15s ease;
}

.barcode-row:hover {
  background-color: rgba(13, 110, 253, 0.03) !important;
}

.hover-primary {
  transition: all 0.15s ease;
}

.hover-primary:hover {
  color: #0d6efd !important;
  transform: scale(1.1);
}

.hover-bg-light {
  transition: background-color 0.15s ease;
}

.hover-bg-light:hover {
  background-color: #f1f3f5 !important;
}

.hover-btn-scale {
  transition: all 0.2s ease;
}

.hover-btn-scale:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(13, 110, 253, 0.15) !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.25);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.45);
}

.monospace {
  font-family: var(--bs-font-monospace), monospace;
}

.search-input-group {
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.search-input-group:focus-within {
  border-color: #86b7fe !important;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
}

.search-input-group .form-control:focus {
  box-shadow: none !important;
}
</style>
