<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-gem me-2 text-dark"></i>
        Penjualan Aksesoris
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/aksesoris/penjualan">Aksesoris</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Penjualan</li>
        </ol>
      </nav>
    </div>

    <!-- -- Card 1: Input Penjualan -- -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom">
        <span>
          <i class="bi bi-pencil-square me-2 text-primary"></i>
          Input Penjualan
        </span>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Tanggal</label>
            <input v-model="form.tanggal" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Jenis Penjualan</label>
            <select v-model="form.tipe" @change="onTipeChange" class="form-select form-select-sm">
              <option value="aksesoris">Aksesoris</option>
              <option v-if="!isL2Floor" value="silver">Silver</option>
              <option value="kotak">Kotak</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div v-show="form.tipe === 'manual'" class="col-md-2">
            <label class="form-label small fw-semibold">
              Jenis Manual
              <span class="text-danger">*</span>
            </label>
            <select v-model="form.jenisManual" class="form-select form-select-sm">
              <option value="">-- Pilih --</option>
              <option value="perlu-mutasi">Perlu Mutasi</option>
              <option value="tidak-perlu-mutasi">Tidak Perlu Mutasi</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">
              Sales
              <span class="text-danger">*</span>
            </label>
            <select v-model="form.salesName" class="form-select form-select-sm">
              <option value="">-- Pilih Sales --</option>
              <option v-for="s in salesList" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Nama Customer</label>
            <input
              v-model="form.customerName"
              type="text"
              class="form-control form-control-sm"
              placeholder="Opsional"
            />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">No. HP</label>
            <input
              v-model="form.customerPhone"
              type="text"
              class="form-control form-control-sm"
              placeholder="Opsional"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- -- Card 2: Detail Barang -- -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom d-flex align-items-center gap-2">
        <span>
          <i class="bi bi-list-ul me-2 text-success"></i>
          {{ detailTitle }}
        </span>
        <button
          v-if="form.tipe === 'silver'"
          @click="openSilverPriceModal"
          class="btn btn-outline-secondary btn-sm ms-auto"
        >
          <i class="bi bi-gear me-1"></i>
          Update Harga
        </button>
        <button v-else-if="form.tipe !== 'manual'" @click="openCatalogModal" class="btn btn-primary btn-sm ms-auto">
          <i class="bi bi-search me-1"></i>
          Pilih Kode
        </button>
        <button v-if="form.tipe === 'manual'" @click="commitManualRow" class="btn btn-outline-primary btn-sm ms-auto">
          <i class="bi bi-plus-circle me-1"></i>
          Tambah Baris
        </button>
      </div>
      <div class="card-body p-0">
        <!-- Aksesoris Table -->
        <div v-show="form.tipe === 'aksesoris'" class="table-responsive">
          <table class="table table-bordered table-sm mb-0">
            <thead class="table-primary">
              <tr>
                <th style="width: 40px">No</th>
                <th>Barcode</th>
                <th>Nama Barang</th>
                <th style="width: 70px">Jumlah</th>
                <th style="width: 90px">Kadar</th>
                <th style="width: 90px">Berat</th>
                <th style="width: 120px">Harga/Gram</th>
                <th style="width: 140px">Total Harga</th>
                <th style="width: 50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!aksesorisRows.length">
                <td colspan="9" class="text-center text-muted py-3">
                  Belum ada barang. Klik "Pilih Kode" untuk menambahkan.
                </td>
              </tr>
              <tr v-for="(row, i) in aksesorisRows" :key="i">
                <td class="text-center align-middle">{{ i + 1 }}</td>
                <td class="align-middle small">{{ row.kode }}</td>
                <td class="align-middle small">{{ row.nama }}</td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    style="width: 60px"
                  />
                </td>
                <td>
                  <input v-model="row.kadar" type="text" class="form-control form-control-sm" placeholder="Kadar" />
                </td>
                <td>
                  <input
                    v-model="row.berat"
                    @input="recalcHargaPerGram(row)"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    :value="formatCurrency(row.hargaPerGram)"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    v-model="row.totalHargaStr"
                    @input="recalcHargaPerGram(row)"
                    @blur="formatTotalHarga(row)"
                    @keydown.enter.prevent="handleHargaEnter(() => formatTotalHarga(row))"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Masukkan harga"
                  />
                </td>
                <td class="text-center align-middle">
                  <button @click="aksesorisRows.splice(i, 1)" class="btn btn-sm btn-danger">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="aksesorisRows.length">
              <tr class="table-light fw-bold">
                <td colspan="7" class="text-end">Grand Total:</td>
                <td class="text-primary">{{ formatCurrency(grandTotalAksesoris) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Silver Table -->
        <div v-show="form.tipe === 'silver'" class="table-responsive">
          <!-- inline input row will appear inside tbody -->
          <table class="table table-bordered table-sm mb-0">
            <thead class="table-primary">
              <tr>
                <th style="width: 40px">No</th>
                <th>Barcode</th>
                <th>Nama Barang</th>
                <th style="width: 70px">Jumlah</th>
                <th style="width: 90px">Kadar</th>
                <th style="width: 90px">Berat</th>
                <th style="width: 120px">Harga/Gram</th>
                <th style="width: 140px">Total Harga</th>
                <th style="width: 50px"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Inline input row for adding silver by kode -->
              <tr class="table-light">
                <td></td>
                <td>
                  <input
                    v-model="silverInput.kode"
                    @keydown.enter.prevent="commitSilverRowFromInput"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Kode (Enter untuk tambah)"
                  />
                </td>
                <td>
                  <input :value="silverInput.nama" type="text" class="form-control form-control-sm bg-light" readonly />
                </td>
                <td>
                  <input
                    v-model.number="silverInput.jumlah"
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    style="width: 60px"
                  />
                </td>
                <td>
                  <input
                    :value="silverInput.kadar"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    :value="silverInput.berat"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    :value="formatCurrency(silverInput.hargaPerGram)"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    v-model="silverInput.totalHargaStr"
                    @blur="formatSilverInputTotal"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Masukkan harga"
                  />
                </td>
                <td class="text-center align-middle">
                  <button @click="commitSilverRowFromInput" class="btn btn-sm btn-primary">+</button>
                </td>
              </tr>

              <tr v-if="!silverRows.length">
                <td colspan="9" class="text-center text-muted py-3">
                  Belum ada barang. Ketik kode di baris atas dan tekan Enter untuk menambahkan.
                </td>
              </tr>
              <tr v-for="(row, i) in silverRows" :key="i">
                <td class="text-center align-middle">{{ i + 1 }}</td>
                <td class="align-middle small">{{ row.kode }}</td>
                <td class="align-middle small">{{ row.nama }}</td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    @input="recalcSilverBerat(row)"
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    style="width: 60px"
                  />
                </td>
                <td>
                  <input
                    v-model="row.kadar"
                    type="text"
                    class="form-control form-control-sm"
                    :readonly="row._kadarFixed"
                    placeholder="Kadar"
                  />
                </td>
                <td>
                  <input
                    v-model="row.berat"
                    @input="recalcHargaPerGram(row)"
                    type="text"
                    class="form-control form-control-sm"
                    :readonly="row._beratFixed"
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    :value="formatCurrency(row.hargaPerGram)"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    v-model="row.totalHargaStr"
                    @input="recalcHargaPerGram(row)"
                    @blur="formatTotalHarga(row)"
                    @keydown.enter.prevent="handleHargaEnter(() => formatTotalHarga(row))"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Masukkan harga"
                  />
                </td>
                <td class="text-center align-middle">
                  <button @click="silverRows.splice(i, 1)" class="btn btn-sm btn-danger">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="silverRows.length">
              <tr class="table-light fw-bold">
                <td colspan="7" class="text-end">Grand Total:</td>
                <td class="text-primary">{{ formatCurrency(grandTotalSilver) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Kotak Table -->
        <div v-show="form.tipe === 'kotak'" class="table-responsive">
          <table class="table table-bordered table-sm mb-0">
            <thead class="table-primary">
              <tr>
                <th style="width: 40px">No</th>
                <th>Kode</th>
                <th>Jenis Kotak</th>
                <th style="width: 70px">Jumlah</th>
                <th style="width: 140px">Harga Satuan</th>
                <th style="width: 140px">Total Harga</th>
                <th style="width: 50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!kotakRows.length">
                <td colspan="7" class="text-center text-muted py-3">
                  Belum ada barang. Klik "Pilih Kode" untuk menambahkan.
                </td>
              </tr>
              <tr v-for="(row, i) in kotakRows" :key="i">
                <td class="text-center align-middle">{{ i + 1 }}</td>
                <td class="align-middle small">{{ row.kode }}</td>
                <td class="align-middle small">{{ row.nama }}</td>
                <td>
                  <input
                    v-model.number="row.jumlah"
                    @input="recalcKotak(row)"
                    type="number"
                    min="1"
                    class="form-control form-control-sm"
                    style="width: 60px"
                  />
                </td>
                <td>
                  <input
                    v-model="row.hargaSatuanStr"
                    @input="recalcKotak(row)"
                    @blur="formatKotakHarga(row)"
                    @keydown.enter.prevent="handleHargaEnter(() => formatKotakHarga(row))"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Masukkan harga"
                  />
                </td>
                <td class="align-middle fw-semibold">{{ formatCurrency(row.totalHarga) }}</td>
                <td class="text-center align-middle">
                  <button @click="kotakRows.splice(i, 1)" class="btn btn-sm btn-danger">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="kotakRows.length">
              <tr class="table-light fw-bold">
                <td colspan="5" class="text-end">Grand Total:</td>
                <td class="text-primary">{{ formatCurrency(grandTotalKotak) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Manual Table -->
        <div v-show="form.tipe === 'manual'" class="table-responsive">
          <table class="table table-bordered table-sm mb-0">
            <thead class="table-primary">
              <tr>
                <th style="width: 140px">Barcode</th>
                <th>Nama Barang</th>
                <th style="width: 160px">Kode Lock</th>
                <th style="width: 90px">Kadar</th>
                <th style="width: 90px">Berat</th>
                <th style="width: 120px">Harga/Gram</th>
                <th style="width: 140px">Total Harga</th>
                <th>Keterangan</th>
                <th style="width: 50px"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Input Row -->
              <tr class="table-light">
                <td>
                  <input
                    ref="manualKodeInput"
                    v-model="manualInput.kode"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Kode"
                  />
                </td>
                <td>
                  <input
                    v-model="manualInput.nama"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Nama barang"
                  />
                </td>
                <td>
                  <div class="input-group input-group-sm">
                    <input
                      v-model="manualInput.kodeLock"
                      type="text"
                      class="form-control"
                      placeholder="Pilih kode"
                      readonly
                    />
                    <button @click="openLockModal" class="btn btn-outline-secondary" type="button">
                      <i class="bi bi-search"></i>
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    v-model="manualInput.kadar"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Kadar"
                  />
                </td>
                <td>
                  <input
                    v-model="manualInput.berat"
                    @input="recalcManualHargaPerGram"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    :value="formatCurrency(manualInput.hargaPerGram)"
                    type="text"
                    class="form-control form-control-sm bg-light"
                    readonly
                  />
                </td>
                <td>
                  <input
                    v-model="manualInput.totalHargaStr"
                    @input="recalcManualHargaPerGram"
                    @blur="formatManualTotalHarga"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Masukkan harga"
                  />
                </td>
                <td>
                  <input
                    v-model="manualInput.keterangan"
                    @keydown.enter.prevent="handleManualKeteranganEnter"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Keterangan"
                  />
                </td>
              </tr>
              <!-- Data Rows -->
              <tr v-if="!manualRows.length">
                <td colspan="9" class="text-center text-muted py-2">
                  Isi form di atas dan klik
                  <strong>Enter</strong>
                  untuk menambahkan.
                </td>
              </tr>
              <tr v-for="(row, i) in manualRows" :key="i">
                <td class="small">{{ row.kode || "-" }}</td>
                <td class="small">{{ row.nama }}</td>
                <td class="small">{{ row.kodeLock || "-" }}</td>
                <td class="small">{{ row.kadar }}</td>
                <td class="small">{{ row.berat }}</td>
                <td class="small">{{ formatCurrency(row.hargaPerGram) }}</td>
                <td class="small fw-semibold">{{ formatCurrency(row.totalHarga) }}</td>
                <td class="small">{{ row.keterangan || "" }}</td>
                <td class="text-center align-middle">
                  <button @click="manualRows.splice(i, 1)" class="btn btn-sm btn-danger">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="manualRows.length">
              <tr class="table-light fw-bold">
                <td colspan="6" class="text-end">Grand Total:</td>
                <td class="text-primary">{{ formatCurrency(grandTotalManual) }}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- -- Card 3: Pembayaran -- -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold border-bottom">
        <span>
          <i class="bi bi-cash-stack me-2 text-success"></i>
          Pembayaran
        </span>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Metode Bayar</label>
            <select v-model="form.metodePembayaran" @change="onMetodeChange" class="form-select form-select-sm">
              <option value="TUNAI">Tunai</option>
              <option v-if="form.tipe === 'manual'" value="DP">DP</option>
              <option v-if="form.tipe === 'kotak' || form.tipe === 'aksesoris'" value="FREE">Free</option>
            </select>
          </div>
          <template v-if="form.metodePembayaran === 'DP'">
            <div class="col-md-2">
              <label class="form-label small fw-semibold">
                Nominal DP
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="dpStr"
                @input="onDpInput"
                @blur="formatDp"
                type="text"
                class="form-control form-control-sm"
                placeholder="0"
              />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Sisa Pembayaran</label>
              <input
                :value="formatCurrency(sisaPembayaran)"
                type="text"
                class="form-control form-control-sm bg-light"
                readonly
              />
            </div>
          </template>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Total</label>
            <input
              :value="formatCurrency(grandTotal)"
              type="text"
              class="form-control form-control-sm bg-light fw-bold"
              readonly
            />
          </div>
          <template v-if="form.metodePembayaran !== 'FREE'">
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Jumlah Bayar</label>
              <input
                v-model="jumlahBayarStr"
                @input="onJumlahBayarInput"
                @blur="formatJumlahBayar"
                @keydown.enter.prevent="handleJumlahBayarEnter"
                ref="jumlahBayarInput"
                type="text"
                class="form-control form-control-sm"
                placeholder="0"
              />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">Kembalian</label>
              <input
                :value="formatCurrency(kembalian)"
                type="text"
                class="form-control form-control-sm bg-light"
                readonly
              />
            </div>
          </template>
        </div>
      </div>
      <div class="card-footer bg-white d-flex justify-content-end gap-2">
        <button @click="resetForm" class="btn btn-secondary btn-sm">
          <i class="bi bi-x-circle me-1"></i>
          Batal
        </button>
        <button @click="savePenjualan" :disabled="isSaveBlocked()" class="btn btn-primary btn-sm">
          <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan Penjualan
        </button>
      </div>
    </div>

    <!-- -- Catalog Modal -- -->
    <AppModal v-model="showCatalogModal" :title="catalogModalTitle" size="sm" max-width="550px">
      <template #default>
        <div class="row mb-3">
          <div class="col-md-6">
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="catalogSearch" type="text" class="form-control" placeholder="Cari kode atau nama..." />
            </div>
          </div>
          <div class="col-md-6 d-flex align-items-center text-muted small">
            <i class="bi bi-info-circle me-2"></i>
            Klik pada baris untuk memilih
          </div>
        </div>
        <div class="table-responsive" style="max-height: 450px">
          <table class="table table-hover table-striped table-sm">
            <thead class="table-primary sticky-top">
              <tr>
                <th>Kode</th>
                <th>Nama Barang</th>
                <th class="text-end">Stok</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredCatalog.length">
                <td colspan="3" class="text-center text-muted py-3">Tidak ada data</td>
              </tr>
              <tr
                v-for="item in filteredCatalog"
                :key="item.kode"
                @click="pickFromCatalog(item)"
                style="cursor: pointer"
              >
                <td class="align-middle">{{ item.kode }}</td>
                <td class="align-middle">
                  {{ item.nama }}
                  <span v-if="(item.stok ?? 0) <= 0" class="badge bg-danger ms-1">Habis</span>
                </td>
                <td class="text-end">{{ item.stok ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button @click="showCatalogModal = false" class="btn btn-secondary btn-sm">
          <i class="bi bi-x me-1"></i>
          Tutup
        </button>
      </template>
    </AppModal>

    <!-- -- Silver Price Settings Modal -- -->
    <AppModal v-model="showSilverPriceModal" title="Pengaturan Harga Silver" size="lg">
      <template #default>
        <div class="row mb-3">
          <div class="col-md-6">
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input
                v-model="silverPriceSearch"
                type="text"
                class="form-control"
                placeholder="Cari kode atau nama..."
              />
            </div>
          </div>
          <div class="col-md-6 d-flex align-items-center text-muted small">
            <i class="bi bi-info-circle me-2"></i>
            Kode silver stok aktif otomatis ditampilkan.
          </div>
        </div>
        <div class="table-responsive" style="max-height: 450px">
          <table class="table table-sm table-hover">
            <thead class="table-primary sticky-top">
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th class="text-end">Harga Referensi</th>
                <th style="width: 60px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredSilverPriceList.length">
                <td colspan="4" class="text-center text-muted py-3">Belum ada pengaturan harga</td>
              </tr>
              <tr v-for="(p, idx) in filteredSilverPriceList" :key="p.kode || idx">
                <td>{{ p.kode }}</td>
                <td>{{ p.nama || "-" }}</td>
                <td>
                  <input v-model.number="p.harga" type="number" class="form-control form-control-sm text-end" />
                </td>
                <td class="text-end">
                  <button @click="removeSilverPriceByKode(p.kode)" class="btn btn-sm btn-danger">Hapus</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button @click="showSilverPriceModal = false" class="btn btn-secondary btn-sm">Tutup</button>
        <button @click="saveSilverPrices" :disabled="isSavingSilverPrices" class="btn btn-primary btn-sm">
          <span v-if="isSavingSilverPrices" class="spinner-border spinner-border-sm me-1"></span>
          Simpan
        </button>
      </template>
    </AppModal>

    <!-- -- Lock Modal (Manual kode lock picker) -- -->
    <AppModal v-model="showLockModal" title="Pilih Kode Lock" size="lg">
      <template #default>
        <div class="row mb-3">
          <div class="col-md-6">
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="lockSearch" type="text" class="form-control" placeholder="Cari kode atau nama lock..." />
            </div>
          </div>
          <div class="col-md-6 d-flex align-items-center text-muted small">
            <i class="bi bi-info-circle me-2"></i>
            Klik pada baris untuk memilih kode lock
          </div>
        </div>
        <div class="table-responsive" style="max-height: 450px">
          <table class="table table-hover table-striped table-sm">
            <thead class="table-primary sticky-top">
              <tr>
                <th>Kode</th>
                <th>Nama Barang</th>
                <th class="text-end">Stok</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredLockCatalog.length">
                <td colspan="3" class="text-center text-muted py-3">Tidak ada data</td>
              </tr>
              <tr v-for="item in filteredLockCatalog" :key="item.kode" @click="pickLock(item)" style="cursor: pointer">
                <td class="align-middle small">{{ item.kode }}</td>
                <td class="align-middle">{{ item.nama }}</td>
                <td class="text-end align-middle">{{ item.stok ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button @click="showLockModal = false" class="btn btn-secondary btn-sm">
          <i class="bi bi-x me-1"></i>
          Tutup
        </button>
      </template>
    </AppModal>

    <!-- -- Print Modal -- -->
    <AppModal v-model="showPrintModal" title="Transaksi Berhasil" :closable="false" :static-backdrop="true">
      <template #default>
        <div class="text-center py-3">
          <i class="bi bi-check-circle-fill text-success mb-3 d-block" style="font-size: 3rem"></i>
          <p class="fw-semibold mb-1">Transaksi berhasil disimpan!</p>
          <p v-if="isPrinting" class="text-primary small mb-1">
            <span class="spinner-border spinner-border-sm me-1"></span>
            Sedang mengirim {{ lastPrintType === "invoice" ? "invoice" : "struk" }} ke printer...
          </p>
          <p v-else class="text-muted small">Pilih format cetak atau tutup untuk melanjutkan</p>
        </div>
      </template>
      <template #footer>
        <button @click="printReceipt" :disabled="isPrinting" class="btn btn-success btn-sm me-1">
          <span v-if="isPrinting && lastPrintType === 'receipt'" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-receipt me-1"></i>
          Cetak Struk
        </button>
        <button @click="printInvoice" :disabled="isPrinting" class="btn btn-primary btn-sm">
          <span v-if="isPrinting && lastPrintType === 'invoice'" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-file-earmark-text me-1"></i>
          Cetak Invoice
        </button>
        <button @click="closePrintModal" :disabled="isPrinting" class="btn btn-secondary btn-sm me-1">Tutup</button>
      </template>
    </AppModal>

    <!-- -- Print Offline Modal -- -->
    <PrintFailedModal
      v-model="showPrintOfflineModal"
      failed-title="Gagal Cetak Invoice / Struk"
      :message="printOfflineMessage"
      :retrying="isPrinting"
      @retry="retryPrint"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from "vue";
import { getDocs, query, where, orderBy, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { floorCollection } from "@/services/floor-scope";
import Swal from "sweetalert2";
import { db } from "@/config/firebase";
import { useAccessoriesStore } from "@/stores/accessories";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";
import PrintFailedModal from "@/components/common/PrintFailedModal.vue";
import { getSafeAmount, resolveReceiptPayment } from "@/utils/print-payment";

const store = useAccessoriesStore();
const authStore = useAuthStore();
const activeFloor = computed(() => authStore.activeFloor || "L1");
const isL2Floor = computed(() => String(activeFloor.value || "").toUpperCase() === "L2");
const { swal, error: showError } = useAlert();
const MAX_KODE_PER_TRANSACTION = 10;

// --- Date helpers -------------------------------------------------------------
const today = new Date();
const todayDate = today.toLocaleDateString("id-ID", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

// --- Sales list ---------------------------------------------------------------
const salesList = ref([]);

// --- Form state ---------------------------------------------------------------
const form = reactive({
  salesName: "",
  tipe: "aksesoris",
  jenisManual: "",
  tanggal: todayISO,
  customerName: "",
  customerPhone: "",
  metodePembayaran: "TUNAI",
});

// --- Rows per type ------------------------------------------------------------
// Aksesoris / Silver row shape: { kode, nama, jumlah, kadar, berat, _kadarFixed, _beratFixed, _beratSatuan, hargaPerGram, totalHargaStr }
// Kotak row shape: { kode, nama, jumlah, hargaSatuanStr, hargaSatuan, totalHarga }
// Manual row shape (committed): { kode, nama, kodeLock, kadar, berat, hargaPerGram, totalHarga, keterangan }
const aksesorisRows = ref([]);
const silverRows = ref([]);
const kotakRows = ref([]);
const manualRows = ref([]);

// Manual input row (bound to the inline input row in the manual table)
const manualInput = reactive({
  kode: "",
  nama: "",
  kodeLock: "",
  kadar: "",
  berat: "",
  hargaPerGram: 0,
  totalHargaStr: "",
  keterangan: "",
});

// Silver inline input
const silverInput = reactive({
  kode: "",
  nama: "",
  jumlah: 1,
  kadar: "",
  berat: "",
  hargaPerGram: 0,
  totalHargaStr: "",
});

// --- Grand totals -------------------------------------------------------------
const grandTotalAksesoris = computed(() =>
  aksesorisRows.value.reduce((s, r) => s + (parseNum(r.totalHargaStr) || 0), 0),
);
const grandTotalSilver = computed(() => silverRows.value.reduce((s, r) => s + (parseNum(r.totalHargaStr) || 0), 0));
const grandTotalKotak = computed(() => kotakRows.value.reduce((s, r) => s + (r.totalHarga || 0), 0));
const grandTotalManual = computed(() => manualRows.value.reduce((s, r) => s + (r.totalHarga || 0), 0));

const grandTotal = computed(() => {
  if (form.tipe === "aksesoris") return grandTotalAksesoris.value;
  if (form.tipe === "silver") return grandTotalSilver.value;
  if (form.tipe === "kotak") return grandTotalKotak.value;
  return grandTotalManual.value;
});

// --- Payment state ------------------------------------------------------------
const dpStr = ref("0");
const nominalDP = ref(0);
const jumlahBayarStr = ref("0");
const jumlahBayar = ref(0);
const jumlahBayarInput = ref(null);
const manualKodeInput = ref(null);
const isShortcutTipe = computed(() => ["aksesoris", "silver", "kotak"].includes(form.tipe));

const sisaPembayaran = computed(() => {
  if (form.metodePembayaran !== "DP") return 0;
  return Math.max(0, grandTotal.value - nominalDP.value);
});

const kembalian = computed(() => {
  if (form.metodePembayaran === "FREE") return 0;
  if (form.metodePembayaran === "DP") {
    if (nominalDP.value >= grandTotal.value) {
      return nominalDP.value - grandTotal.value + jumlahBayar.value;
    }
    return Math.max(0, jumlahBayar.value - sisaPembayaran.value);
  }
  return Math.max(0, jumlahBayar.value - grandTotal.value);
});

// --- Detail title -------------------------------------------------------------
const detailTitle = computed(() => {
  const map = {
    aksesoris: "Detail Aksesoris",
    silver: "Detail Silver",
    kotak: "Detail Kotak",
    manual: "Detail Penjualan Manual",
  };
  return map[form.tipe] || "Detail Barang";
});

// --- Helpers ------------------------------------------------------------------
function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID").format(val ?? 0);
}

function parseNum(str) {
  if (!str && str !== 0) return 0;
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

// --- Inline row calculations --------------------------------------------------
function recalcHargaPerGram(row) {
  const berat = parseFloat(row.berat) || 0;
  const total = parseNum(row.totalHargaStr);
  row.hargaPerGram = berat > 0 ? Math.round(total / berat) : 0;
}

function formatTotalHarga(row) {
  const val = parseNum(row.totalHargaStr);
  row.totalHargaStr = formatCurrency(val);
  recalcHargaPerGram(row);
}

function recalcSilverBerat(row) {
  if (row._beratSatuan && row._beratFixed) {
    const jumlah = row.jumlah || 1;
    row.berat = (parseFloat(row._beratSatuan) * jumlah).toFixed(2);
    recalcHargaPerGram(row);
  }
}

function recalcKotak(row) {
  const jumlah = row.jumlah || 1;
  const harga = parseNum(row.hargaSatuanStr);
  row.hargaSatuan = harga;
  row.totalHarga = jumlah * harga;
}

function formatKotakHarga(row) {
  const val = parseNum(row.hargaSatuanStr);
  row.hargaSatuanStr = formatCurrency(val);
  recalcKotak(row);
}

function recalcManualHargaPerGram() {
  const berat = parseFloat(manualInput.berat) || 0;
  const total = parseNum(manualInput.totalHargaStr);
  manualInput.hargaPerGram = berat > 0 ? Math.round(total / berat) : 0;
}

function formatManualTotalHarga() {
  const val = parseNum(manualInput.totalHargaStr);
  manualInput.totalHargaStr = formatCurrency(val);
  recalcManualHargaPerGram();
}

// --- Type change --------------------------------------------------------------
function onTipeChange() {
  // Reset metodePembayaran if no longer valid for this type
  if (form.metodePembayaran === "DP" && form.tipe !== "manual") {
    form.metodePembayaran = "TUNAI";
    dpStr.value = "0";
    nominalDP.value = 0;
  }
  if (form.metodePembayaran === "FREE" && form.tipe !== "kotak" && form.tipe !== "aksesoris") {
    form.metodePembayaran = "TUNAI";
  }
}

function onMetodeChange() {
  if (form.metodePembayaran !== "DP") {
    dpStr.value = "0";
    nominalDP.value = 0;
  }
  jumlahBayarStr.value = "0";
  jumlahBayar.value = 0;
}

// --- DP / JumlahBayar input formatters ---------------------------------------
function onDpInput() {
  nominalDP.value = parseNum(dpStr.value);
}

function formatDp() {
  const val = parseNum(dpStr.value);
  nominalDP.value = val;
  dpStr.value = formatCurrency(val);
}

function onJumlahBayarInput() {
  jumlahBayar.value = parseNum(jumlahBayarStr.value);
}

function formatJumlahBayar() {
  const val = parseNum(jumlahBayarStr.value);
  jumlahBayar.value = val;
  jumlahBayarStr.value = formatCurrency(val);
}

async function focusJumlahBayar() {
  await nextTick();
  if (jumlahBayarInput.value && typeof jumlahBayarInput.value.focus === "function") {
    jumlahBayarInput.value.focus();
    if (typeof jumlahBayarInput.value.select === "function") {
      jumlahBayarInput.value.select();
    }
  }
}

async function confirmSaveShortcut() {
  if (!isShortcutTipe.value || isSaveBlocked()) return;

  const result = await Swal.fire({
    icon: "question",
    title: "Yakin simpan transaksi?",
    text: "Tekan Enter untuk simpan atau Esc untuk batal.",
    showCancelButton: true,
    confirmButtonText: "Simpan",
    cancelButtonText: "Batal",
    reverseButtons: true,
    allowEnterKey: true,
  });

  if (result.isConfirmed) {
    await savePenjualan();
  }
}

async function handleHargaEnter(formatter) {
  if (!isShortcutTipe.value || showPrintModal.value || showPrintOfflineModal.value) return;

  if (typeof formatter === "function") {
    formatter();
  }

  if (form.metodePembayaran === "FREE") {
    await confirmSaveShortcut();
    return;
  }

  await focusJumlahBayar();
}

async function handleJumlahBayarEnter() {
  if (showPrintModal.value || showPrintOfflineModal.value) return;

  formatJumlahBayar();

  // For manual sales, Enter on jumlah bayar should trigger the same save flow
  // so the manual confirmation swal is shown before actual save.
  if (form.tipe === "manual") {
    await savePenjualan();
    return;
  }

  if (!isShortcutTipe.value) return;
  await confirmSaveShortcut();
}

// --- Catalog Modal ------------------------------------------------------------
const showCatalogModal = ref(false);
const catalogSearch = ref("");

// --- Silver price settings --------------------------------------------------
const showSilverPriceModal = ref(false);
const silverPriceList = ref([]); // [{ kode, nama, harga }]
const silverPriceMap = computed(() => {
  const m = {};
  (silverPriceList.value || []).forEach((p) => {
    if (p && p.kode) m[String(p.kode).toLowerCase()] = Number(p.harga) || 0;
  });
  return m;
});
const isSavingSilverPrices = ref(false);
const silverPriceSearch = ref("");
const silverStockedCatalog = computed(() => {
  return store.activeSalesItems
    .filter((i) => i.kategori === "silver" && (i.stok ?? 0) > 0)
    .sort((a, b) => String(a.kode || "").localeCompare(String(b.kode || "")));
});
const filteredSilverPriceList = computed(() => {
  const q = (silverPriceSearch.value || "").trim().toLowerCase();
  if (!q) return silverPriceList.value;
  return silverPriceList.value.filter((p) => {
    const kode = String(p.kode || "").toLowerCase();
    const nama = String(p.nama || "").toLowerCase();
    return kode.includes(q) || nama.includes(q);
  });
});

const catalogModalTitle = computed(() => {
  const map = { aksesoris: "Pilih Aksesoris", silver: "Pilih Silver", kotak: "Pilih Kotak" };
  return map[form.tipe] || "Pilih Barang";
});

const filteredCatalog = computed(() => {
  let items = store.activeSalesItems.filter((i) => i.kategori === form.tipe);
  if (catalogSearch.value) {
    const q = catalogSearch.value.toLowerCase();
    items = items.filter((i) => i.kode?.toLowerCase().includes(q) || i.nama?.toLowerCase().includes(q));
  }
  return items.sort((a, b) => {
    const aStock = a.stok ?? 0;
    const bStock = b.stok ?? 0;
    if (aStock > 0 && bStock <= 0) return -1;
    if (aStock <= 0 && bStock > 0) return 1;
    return (a.kode || "").localeCompare(b.kode || "");
  });
});

function openCatalogModal() {
  catalogSearch.value = "";
  showCatalogModal.value = true;
}

async function loadSilverPrices() {
  try {
    const d = doc(db, "settings", "silverPrice");
    const snap = await getDoc(d);
    if (!snap.exists()) {
      return [];
    }
    const data = snap.data() || {};
    return Array.isArray(data.prices) ? data.prices : [];
  } catch (err) {
    return [];
  }
}

function buildMergedSilverPriceList(savedPrices) {
  const merged = {};

  silverStockedCatalog.value.forEach((item) => {
    const key = String(item.kode || "")
      .trim()
      .toLowerCase();
    if (!key) return;
    merged[key] = {
      kode: String(item.kode || "").trim(),
      nama: item.nama || "",
      harga: 0,
    };
  });

  (savedPrices || []).forEach((row) => {
    const key = String(row?.kode || "")
      .trim()
      .toLowerCase();
    if (!key) return;
    const matchedCatalog = store.activeSalesItems.find(
      (i) => i.kategori === "silver" && String(i.kode || "").toLowerCase() === key,
    );
    const current = merged[key] || {
      kode: String(row?.kode || "").trim(),
      nama: matchedCatalog?.nama || "",
      harga: 0,
    };
    current.harga = Number(row?.harga) || 0;
    if (!current.nama && matchedCatalog?.nama) current.nama = matchedCatalog.nama;
    merged[key] = current;
  });

  return Object.values(merged).sort((a, b) => String(a.kode || "").localeCompare(String(b.kode || "")));
}

function removeSilverPriceByKode(kode) {
  const key = String(kode || "").toLowerCase();
  silverPriceList.value = silverPriceList.value.filter((p) => String(p.kode || "").toLowerCase() !== key);
}

async function saveSilverPrices() {
  isSavingSilverPrices.value = true;
  try {
    const d = doc(db, "settings", "silverPrice");
    const cleanedMap = {};
    (silverPriceList.value || []).forEach((p) => {
      const key = String(p?.kode || "")
        .trim()
        .toLowerCase();
      if (!key) return;
      cleanedMap[key] = {
        kode: String(p.kode || "").trim(),
        harga: Number(p.harga) || 0,
      };
    });
    const payload = Object.values(cleanedMap).sort((a, b) => String(a.kode || "").localeCompare(String(b.kode || "")));
    await setDoc(d, { prices: payload, lastUpdated: serverTimestamp() }, { merge: true });
    await store.loadSalesCatalog();
    swal("Pengaturan harga tersimpan", "success");
    showSilverPriceModal.value = false;
  } catch (err) {
    showError("Gagal menyimpan pengaturan harga", err.message);
  } finally {
    isSavingSilverPrices.value = false;
  }
}

async function openSilverPriceModal() {
  // Request verification code with retry logic
  const verifyCode = await requestVerificationCode();
  if (!verifyCode) return; // Verification failed or user cancelled

  const saved = await loadSilverPrices();
  silverPriceList.value = buildMergedSilverPriceList(saved);
  silverPriceSearch.value = "";
  showSilverPriceModal.value = true;
}

function formatSilverInputTotal() {
  const val = parseNum(silverInput.totalHargaStr);
  silverInput.totalHargaStr = formatCurrency(val);
  silverInput.hargaPerGram =
    (parseFloat(silverInput.berat) || 0) > 0 ? Math.round(val / parseFloat(silverInput.berat)) : 0;
}

function resetSilverInput() {
  Object.assign(silverInput, {
    kode: "",
    nama: "",
    jumlah: 1,
    kadar: "",
    berat: "",
    hargaPerGram: 0,
    totalHargaStr: "",
  });
}

function fillSilverInputFromCatalog(found) {
  silverInput.nama = found.nama || "";
  silverInput.kadar = found.kadar || "";
  silverInput.berat = found.berat ? String(found.berat) : "";
  silverInput.hargaPerGram = 0;
  // if there's a reference price set, prefill totalHargaStr
  const ref = silverPriceMap.value[String(found.kode || "").toLowerCase()];
  if (ref && ref > 0) {
    silverInput.totalHargaStr = formatCurrency(ref * (silverInput.jumlah || 1));
  }
}

function commitSilverRowFromInput() {
  const kode = (silverInput.kode || "").trim();
  if (!kode) {
    swal("Kode wajib diisi", "warning");
    return;
  }
  const found = store.activeSalesItems.find(
    (i) => String(i.kode || "").toLowerCase() === kode.toLowerCase() && i.kategori === "silver",
  );
  if (!found) {
    swal(`Kode ${kode} tidak ditemukan atau stok kosong`, "error");
    return;
  }

  // prevent duplicate kode in current rows
  if (silverRows.value.some((r) => String(r.kode || "").toLowerCase() === kode.toLowerCase())) {
    swal("Kode sudah ditambahkan", "warning");
    return;
  }

  const berat = parseFloat(found.berat) || 0;
  const totalHarga = parseNum(silverInput.totalHargaStr);
  if (totalHarga <= 0) {
    swal("Total harga harus lebih dari 0", "warning");
    return;
  }

  silverRows.value.push({
    kode: found.kode,
    nama: found.nama,
    jumlah: silverInput.jumlah || 1,
    kadar: found.kadar || silverInput.kadar || "",
    berat: silverInput.berat || (found.berat ? String(found.berat) : ""),
    _kadarFixed: !!found.kadar,
    _beratFixed: !!found.berat,
    _beratSatuan: found.berat || 0,
    hargaPerGram: silverInput.hargaPerGram || 0,
    totalHargaStr: formatCurrency(totalHarga),
  });

  resetSilverInput();
}

// Auto-fill silverInput fields when kode changes
watch(
  () => silverInput.kode,
  (val) => {
    const kode = (val || "").trim();
    if (!kode) {
      silverInput.nama = "";
      silverInput.kadar = "";
      silverInput.berat = "";
      return;
    }
    const found = store.activeSalesItems.find(
      (i) => String(i.kode || "").toLowerCase() === kode.toLowerCase() && i.kategori === "silver",
    );
    if (found) {
      fillSilverInputFromCatalog(found);
    } else {
      silverInput.nama = "";
      silverInput.kadar = "";
      silverInput.berat = "";
    }
  },
);

// Helper: Request verification code with retry limit and clear error handling
async function requestVerificationCode() {
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    const result = await Swal.fire({
      title: "Masukkan Kode Verifikasi",
      input: "password",
      inputPlaceholder: "Kode verifikasi",
      showCancelButton: true,
      confirmButtonText: "Cek",
      cancelButtonText: "Batal",
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
      didOpen: () => {
        const input = document.querySelector(".swal2-input");
        if (input) input.focus();
      },
    });

    if (!result.isConfirmed) {
      return null; // User cancel
    }

    const code = result.value?.trim() || "";
    if (!code) {
      await Swal.fire({
        icon: "warning",
        title: "Kode Kosong",
        text: "Kode verifikasi harus diisi",
        confirmButtonText: "OK",
      });
      attempts++;
      continue;
    }

    try {
      const isValid = await store.verifyEditAccess(code);
      if (isValid) {
        return code; // Success
      } else {
        attempts++;
        if (attempts < maxRetries) {
          await Swal.fire({
            icon: "error",
            title: "Kode Verifikasi Salah",
            text: `Kesempatan tersisa: ${maxRetries - attempts}`,
            confirmButtonText: "Coba Lagi",
          });
        } else {
          await Swal.fire({
            icon: "error",
            title: "Verifikasi Gagal",
            text: "Anda telah melampaui batas percobaan. Transaksi dibatalkan.",
            confirmButtonText: "OK",
          });
          return null;
        }
      }
    } catch (err) {
      attempts++;
      await Swal.fire({
        icon: "error",
        title: "Kesalahan Verifikasi",
        text: err.message || "Gagal memeriksa kode verifikasi",
        confirmButtonText: "Coba Lagi",
      });
    }
  }

  return null; // All retries exhausted
}

// --- Lifecycle Hooks -----------------------------------------------------------
onMounted(async () => {
  // Auto-load silver prices on component mount to ensure silverPriceMap is populated
  // This ensures price validation works when user tries to save without opening the modal
  const saved = await loadSilverPrices();
  silverPriceList.value = buildMergedSilverPriceList(saved);
});

function getRowsByTipe(tipe) {
  if (tipe === "aksesoris") return aksesorisRows.value;
  if (tipe === "silver") return silverRows.value;
  if (tipe === "kotak") return kotakRows.value;
  return null;
}

function showMaxKodeAlert() {
  return Swal.fire({
    icon: "warning",
    title: "Maksimal 10 Kode",
    text: `Dalam 1 transaksi hanya boleh maksimal ${MAX_KODE_PER_TRANSACTION} kode untuk jenis ini.`,
    confirmButtonText: "OK",
  });
}

function pickFromCatalog(item) {
  if ((item.stok ?? 0) <= 0) {
    swal(`Stok ${item.nama} (${item.kode}) sudah habis!`, "error");
    return;
  }

  const currentRows = getRowsByTipe(form.tipe);
  if (currentRows && currentRows.length >= MAX_KODE_PER_TRANSACTION) {
    showMaxKodeAlert();
    return;
  }

  if (form.tipe === "aksesoris") {
    aksesorisRows.value.push({
      kode: item.kode,
      nama: item.nama,
      jumlah: 1,
      kadar: "",
      berat: "",
      hargaPerGram: 0,
      totalHargaStr: "",
    });
  } else if (form.tipe === "silver") {
    silverRows.value.push({
      kode: item.kode,
      nama: item.nama,
      jumlah: 1,
      kadar: item.kadar || "",
      berat: item.berat ? String(item.berat) : "",
      _kadarFixed: !!item.kadar,
      _beratFixed: !!item.berat,
      _beratSatuan: item.berat || 0,
      hargaPerGram: 0,
      totalHargaStr: "",
    });
  } else if (form.tipe === "kotak") {
    const hargaSatuan = item.hargaJual || item.harga || 0;
    kotakRows.value.push({
      kode: item.kode,
      nama: item.nama,
      jumlah: 1,
      hargaSatuanStr: formatCurrency(hargaSatuan),
      hargaSatuan,
      totalHarga: hargaSatuan,
    });
  }
  showCatalogModal.value = false;
}

// --- Lock Modal ---------------------------------------------------------------
const showLockModal = ref(false);
const lockSearch = ref("");

const filteredLockCatalog = computed(() => {
  const items = store.activeSalesItems.filter((i) => i.kategori === "aksesoris");
  if (!lockSearch.value) return items;
  const q = lockSearch.value.toLowerCase();
  return items.filter((i) => i.kode?.toLowerCase().includes(q) || i.nama?.toLowerCase().includes(q));
});

function openLockModal() {
  lockSearch.value = "";
  showLockModal.value = true;
}

function pickLock(item) {
  manualInput.kodeLock = item.kode;
  showLockModal.value = false;
}

// --- Manual row management ----------------------------------------------------
function resetManualInput() {
  Object.assign(manualInput, {
    kode: "",
    nama: "",
    kodeLock: "",
    kadar: "",
    berat: "",
    hargaPerGram: 0,
    totalHargaStr: "",
    keterangan: "",
  });
}

function commitManualRow() {
  if (!manualInput.nama) {
    swal("Nama barang harus diisi!", "warning");
    return;
  }
  if (!manualInput.kadar) {
    swal("Kadar harus diisi!", "warning");
    return;
  }
  const berat = parseFloat(manualInput.berat) || 0;
  if (berat <= 0) {
    swal("Berat harus lebih dari 0!", "warning");
    return;
  }
  const totalHarga = parseNum(manualInput.totalHargaStr);
  if (totalHarga <= 0) {
    swal("Total harga harus lebih dari 0!", "warning");
    return;
  }
  manualRows.value.push({
    kode: manualInput.kode || "-",
    nama: manualInput.nama,
    kodeLock: manualInput.kodeLock || null,
    kadar: manualInput.kadar,
    berat: parseFloat(manualInput.berat),
    hargaPerGram: manualInput.hargaPerGram,
    totalHarga,
    keterangan: manualInput.keterangan || "",
  });
  resetManualInput();
}

async function handleManualKeteranganEnter() {
  formatManualTotalHarga();
  const rowsBefore = manualRows.value.length;
  commitManualRow();

  // Focus back to barcode field for faster next manual row input.
  if (manualRows.value.length > rowsBefore) {
    await nextTick();
    if (manualKodeInput.value && typeof manualKodeInput.value.focus === "function") {
      manualKodeInput.value.focus();
    }
  }
}

// --- Save transaction ---------------------------------------------------------
const isSaving = ref(false);
const showPrintModal = ref(false);
const showPrintOfflineModal = ref(false);
const printOfflineMessage = ref("Pastikan printing service sudah dijalankan di komputer ini.");
const isPrinting = ref(false);
const lastPrintType = ref("receipt");
const lastSaleData = ref(null);

function isSaveBlocked() {
  return isSaving.value || showPrintModal.value || showPrintOfflineModal.value;
}

async function savePenjualan() {
  if (isSaveBlocked()) return;
  isSaving.value = true;

  try {
    // Sync validations
    if (!form.salesName) {
      swal("Sales harus dipilih!", "warning");
      return;
    }
    if (form.tipe === "manual" && !form.jenisManual) {
      swal("Jenis Manual harus dipilih!", "warning");
      return;
    }

    const rowCount = {
      aksesoris: aksesorisRows.value.length,
      silver: silverRows.value.length,
      kotak: kotakRows.value.length,
      manual: manualRows.value.length,
    }[form.tipe];

    if (!rowCount) {
      swal("Tidak ada barang yang ditambahkan!", "warning");
      return;
    }

    if (["aksesoris", "silver", "kotak"].includes(form.tipe) && rowCount > MAX_KODE_PER_TRANSACTION) {
      await showMaxKodeAlert();
      return;
    }

    // Validate row fields for aksesoris / silver
    if (form.tipe === "aksesoris" || form.tipe === "silver") {
      const rows = form.tipe === "aksesoris" ? aksesorisRows.value : silverRows.value;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.kadar) {
          swal(`Baris ${i + 1}: Kadar harus diisi!`, "warning");
          return;
        }
        if (!parseFloat(row.berat) || parseFloat(row.berat) <= 0) {
          swal(`Baris ${i + 1}: Berat harus diisi!`, "warning");
          return;
        }
        if (!parseNum(row.totalHargaStr) || parseNum(row.totalHargaStr) <= 0) {
          swal(`Baris ${i + 1}: Total harga harus diisi!`, "warning");
          return;
        }
      }
    }

    // Price validation for silver against settings/silverPrice (exact match)
    if (form.tipe === "silver") {
      const mismatches = [];
      for (let i = 0; i < silverRows.value.length; i++) {
        const row = silverRows.value[i];
        const kodeKey = String(row.kode || "").toLowerCase();
        const refPrice = silverPriceMap.value[kodeKey];
        if (refPrice && refPrice > 0) {
          const expected = refPrice * (row.jumlah || 1);
          const actual = parseNum(row.totalHargaStr);
          if (actual !== expected) {
            mismatches.push({ index: i, row, expected, actual });
          }
        }
      }

      if (mismatches.length > 0) {
        const proceed = await Swal.fire({
          icon: "warning",
          title: `Harga tidak sesuai (${mismatches.length} baris)`,
          text: "Beberapa baris memiliki harga yang tidak sesuai dengan pengaturan. Tetap proses?",
          showCancelButton: true,
          confirmButtonText: "Proses",
          cancelButtonText: "Batal",
          reverseButtons: true,
        });

        if (!proceed.isConfirmed) return;

        // Request verification code with retry logic
        const verifyCode = await requestVerificationCode();
        if (!verifyCode) return; // Verification failed or user cancelled
      }
    }

    // Payment validation
    if (form.metodePembayaran === "DP") {
      if (nominalDP.value <= 0) {
        swal("Nominal DP harus diisi!", "warning");
        return;
      }
    } else if (form.metodePembayaran !== "FREE") {
      if (jumlahBayar.value < grandTotal.value) {
        swal("Jumlah bayar kurang dari total!", "warning");
        return;
      }
    }

    if (form.tipe === "manual") {
      const confirmSave = await Swal.fire({
        icon: "question",
        title: "Yakin simpan data?",
        text: "Tekan Enter untuk simpan atau Esc untuk batal.",
        showCancelButton: true,
        confirmButtonText: "Simpan",
        cancelButtonText: "Batal",
        reverseButtons: true,
        allowEnterKey: true,
      });

      if (!confirmSave.isConfirmed) return;
    }

    const now = new Date();
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const cartItems = buildCartItems();

    const transactionData = {
      jenisPenjualan: form.tipe,
      tanggal: form.tanggal,
      jam,
      salesName: form.salesName,
      sales: form.salesName,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      metodePembayaran: form.metodePembayaran,
      totalHarga: grandTotal.value,
      items: cartItems,
    };

    if (form.tipe === "manual") {
      transactionData.jenisManual = form.jenisManual;
      if (cartItems.some((i) => i.kodeLock)) transactionData.isGantiLock = true;
    }

    if (form.metodePembayaran === "DP") {
      transactionData.nominalDP = nominalDP.value;
      transactionData.sisaPembayaran = sisaPembayaran.value;
      transactionData.jumlahBayar = jumlahBayar.value;
      transactionData.kembalian = kembalian.value;
      transactionData.statusPembayaran = `DP ${formatCurrency(nominalDP.value)}`;
      transactionData.isDPComplete = nominalDP.value >= grandTotal.value;
    } else if (form.metodePembayaran === "FREE") {
      transactionData.statusPembayaran = "Free";
    } else {
      transactionData.jumlahBayar = jumlahBayar.value;
      transactionData.kembalian = kembalian.value;
      transactionData.statusPembayaran = "Lunas";
    }

    const saleId = await store.saveTransaction(cartItems, transactionData);

    // Write mutasiKode if manual + perlu-mutasi
    if (form.tipe === "manual" && form.jenisManual === "perlu-mutasi") {
      const jenisBarang = {
        C: "Cincin",
        K: "Kalung",
        L: "Liontin",
        A: "Anting",
        G: "Gelang",
        S: "Giwang",
        Z: "HALA & SDW",
        V: "HALA & SDW",
      };

      const mutasiItems = cartItems;
      await Promise.all(
        mutasiItems.map((item) => {
          const rawKode = String(item.kode || item.kodeText || "").trim();
          const prefix = rawKode.charAt(0).toUpperCase();
          const hasKnownPrefix = !!jenisBarang[prefix];
          const jenisPrefix = hasKnownPrefix ? prefix : "LAIN";

          // Create floor doc ref with generated id.
          const floorRef = doc(floorCollection(db, "mutasiKode", activeFloor.value));

          return setDoc(
            floorRef,
            {
              kode: rawKode || "-",
              namaBarang: item.namaBarang || "Tidak ada nama",
              kadar: item.kadar || "-",
              berat: parseFloat(item.berat) || 0,
              keterangan: item.keterangan || "",
              hargaPerGram: parseFloat(item.hargaPerGram) || 0,
              totalHarga: item.totalHarga || 0,
              tanggalInput: form.tanggal,
              sales: form.salesName,
              penjualanId: saleId,
              isMutated: false,
              tanggalMutasi: null,
              mutasiKeterangan: "",
              mutasiHistory: [],
              timestamp: serverTimestamp(),
              lastUpdated: serverTimestamp(),
              jenisPrefix,
              jenisNama: jenisBarang[prefix] || "Lainnya",
            },
            { merge: true },
          );
        }),
      );
    }

    lastSaleData.value = {
      saleId,
      items: cartItems,
      totalHarga: grandTotal.value,
      sisaPembayaran: sisaPembayaran.value,
    };

    // Prevent Enter key from hitting focused element behind the print modal.
    const activeElement = typeof document !== "undefined" ? document.activeElement : null;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
    showPrintModal.value = true;
  } catch (err) {
    showError("Gagal menyimpan transaksi", err.message);
  } finally {
    isSaving.value = false;
  }
}

function buildCartItems() {
  if (form.tipe === "aksesoris") {
    return aksesorisRows.value.map((row) => ({
      tipe: "aksesoris",
      kode: row.kode,
      kodeText: row.kode,
      namaBarang: row.nama,
      qty: row.jumlah || 1,
      kadar: row.kadar,
      berat: parseFloat(row.berat) || 0,
      totalBerat: (parseFloat(row.berat) || 0) * (row.jumlah || 1),
      hargaPerGram: row.hargaPerGram || 0,
      totalHarga: parseNum(row.totalHargaStr),
      harga: parseNum(row.totalHargaStr),
      subtotal: parseNum(row.totalHargaStr),
    }));
  }
  if (form.tipe === "silver") {
    return silverRows.value.map((row) => ({
      tipe: "silver",
      kode: row.kode,
      kodeText: row.kode,
      namaBarang: row.nama,
      qty: row.jumlah || 1,
      kadar: row.kadar,
      berat: parseFloat(row.berat) || 0,
      totalBerat: (parseFloat(row.berat) || 0) * (row.jumlah || 1),
      hargaPerGram: row.hargaPerGram || 0,
      totalHarga: parseNum(row.totalHargaStr),
      harga: parseNum(row.totalHargaStr),
      subtotal: parseNum(row.totalHargaStr),
    }));
  }
  if (form.tipe === "kotak") {
    return kotakRows.value.map((row) => ({
      tipe: "kotak",
      kode: row.kode,
      kodeText: row.kode,
      namaBarang: row.nama,
      qty: row.jumlah || 1,
      hargaSatuan: row.hargaSatuan || 0,
      totalHarga: row.totalHarga || 0,
      harga: row.hargaSatuan || 0,
      subtotal: row.totalHarga || 0,
    }));
  }
  // manual
  return manualRows.value.map((row) => ({
    tipe: "manual",
    kode: row.kode,
    kodeText: row.kode,
    namaBarang: row.nama,
    kodeLock: row.kodeLock || null,
    qty: 1,
    kadar: row.kadar,
    berat: row.berat,
    hargaPerGram: row.hargaPerGram || 0,
    totalHarga: row.totalHarga,
    harga: row.totalHarga,
    subtotal: row.totalHarga,
    keterangan: row.keterangan || "",
  }));
}

// --- Form reset ---------------------------------------------------------------
function resetForm() {
  Object.assign(form, {
    salesName: "",
    tipe: "aksesoris",
    jenisManual: "",
    tanggal: todayISO,
    customerName: "",
    customerPhone: "",
    metodePembayaran: "TUNAI",
  });
  aksesorisRows.value = [];
  silverRows.value = [];
  kotakRows.value = [];
  manualRows.value = [];
  resetManualInput();
  dpStr.value = "0";
  nominalDP.value = 0;
  jumlahBayarStr.value = "0";
  jumlahBayar.value = 0;
  lastSaleData.value = null;
}

// --- Print Service ------------------------------------------------------------
const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

function mapPrintItem(item) {
  const rawQty = Number(item?.qty ?? item?.jumlah ?? 1);
  const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
  const totalHarga = getSafeAmount(item?.totalHarga ?? item?.subtotal ?? item?.harga);

  return {
    nama: item?.namaBarang || item?.nama || "",
    kode: item?.kodeText || item?.kode || "",
    kadar: item?.kadar || "-",
    berat: item?.berat || "-",
    qty,
    jumlah: qty,
    harga: totalHarga,
    subtotal: totalHarga,
    totalHarga,
    keterangan: item?.keterangan || "",
  };
}

async function postPrintRequest(endpoint, data) {
  const res = await fetch(`${PRINT_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = `Print gagal (${res.status})`;
    try {
      const errorBody = await res.json();
      message = errorBody?.error || errorBody?.message || message;
    } catch (_) {
      // ignore parse error, keep fallback message
    }
    throw new Error(message);
  }

  const result = await res.json();
  if (!result.success) throw new Error(result.error || "Print gagal");
  return result;
}

function shouldSplitInvoiceByItem(items) {
  return items.length > 1;
}

async function printInvoicePerItem(baseData, items) {
  let successCount = 0;
  let failedCount = 0;
  let lastErrorMessage = "";

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    try {
      await postPrintRequest("/api/print/invoice", {
        ...baseData,
        items: [item],
        totalHarga: getSafeAmount(item.totalHarga),
        notes: item.keterangan || "",
      });
      successCount += 1;
    } catch (error) {
      failedCount += 1;
      lastErrorMessage = error?.message || "Print gagal";
    }

    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return { successCount, failedCount, lastErrorMessage };
}

async function checkPrintService() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const r = await fetch(`${PRINT_BASE}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`Health check failed: ${r.status}`);
  } catch {
    clearTimeout(t);
    throw new Error("Print service tidak aktif");
  }
}

async function printReceipt() {
  if (isPrinting.value) return;
  lastPrintType.value = "receipt";
  isPrinting.value = true;
  try {
    await checkPrintService();
    const items = (lastSaleData.value?.items ?? []).map(mapPrintItem);
    if (!items.length) throw new Error("Tidak ada item untuk dicetak");

    const now = new Date();
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const payment = resolveReceiptPayment({
      metodeBayar: form.metodePembayaran,
      totalHarga: lastSaleData.value?.totalHarga,
      jumlahBayar: jumlahBayar.value,
      kembalian: kembalian.value,
    });

    const data = {
      transactionType: form.tipe.toUpperCase(),
      tanggal: form.tanggal,
      jam,
      sales: form.salesName,
      customerName: form.customerName || "",
      items,
      totalHarga: payment.totalHarga,
      metodeBayar: payment.metodeBayar,
      nominalDP: form.metodePembayaran === "DP" ? nominalDP.value : 0,
      sisaPembayaran: form.metodePembayaran === "DP" ? lastSaleData.value.sisaPembayaran : 0,
      jumlahBayar: payment.jumlahBayar,
      kembalian: payment.kembalian,
    };

    await postPrintRequest("/api/print/receipt", data);
    swal("Struk dikirim ke printer");
  } catch (err) {
    printOfflineMessage.value = err?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
    showPrintOfflineModal.value = true;
  } finally {
    isPrinting.value = false;
  }
}

async function printInvoice() {
  if (isPrinting.value) return;
  lastPrintType.value = "invoice";
  isPrinting.value = true;
  try {
    await checkPrintService();
    const transactionType = form.tipe.toUpperCase();
    const items = (lastSaleData.value?.items ?? []).map(mapPrintItem);
    if (!items.length) throw new Error("Tidak ada item untuk dicetak");

    const now = new Date();
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const baseData = {
      transactionId: lastSaleData.value.saleId,
      transactionType,
      tanggal: form.tanggal,
      jam,
      sales: form.salesName,
      customerName: form.customerName || "",
      customerPhone: form.customerPhone || "",
      metodeBayar: form.metodePembayaran,
      nominalDP: form.metodePembayaran === "DP" ? nominalDP.value : 0,
      sisaPembayaran: form.metodePembayaran === "DP" ? lastSaleData.value.sisaPembayaran : 0,
    };

    if (!shouldSplitInvoiceByItem(items)) {
      await postPrintRequest("/api/print/invoice", {
        ...baseData,
        items,
        totalHarga: getSafeAmount(lastSaleData.value?.totalHarga),
      });
      swal("Invoice dikirim ke printer");
      return;
    }

    const { successCount, failedCount, lastErrorMessage } = await printInvoicePerItem(baseData, items);

    if (failedCount > 0) {
      if (successCount > 0) {
        swal(`${successCount} invoice berhasil, ${failedCount} gagal`, "warning");
        return;
      }
      throw new Error(lastErrorMessage || "Semua invoice gagal dicetak");
    }

    swal(`${successCount} invoice dikirim ke printer`, "success");
  } catch (err) {
    printOfflineMessage.value = err?.message || "Pastikan printing service sudah dijalankan di komputer ini.";
    showPrintOfflineModal.value = true;
  } finally {
    isPrinting.value = false;
  }
}

async function retryPrint() {
  showPrintOfflineModal.value = false;
  if (lastPrintType.value === "receipt") {
    await printReceipt();
  } else {
    await printInvoice();
  }
}

function closePrintModal() {
  showPrintModal.value = false;
  resetForm();
}

// --- Cross-tab stock sync -----------------------------------------------------
async function handleStockSync(e) {
  if (e.key !== "stokAksesorisChanged") return;
  try {
    const { kodes } = JSON.parse(e.newValue);
    await store.refreshComputedStocks(Array.isArray(kodes) ? [...new Set(kodes)] : []);
  } catch (_) {
    /* silent */
  }
}

// --- Lifecycle ----------------------------------------------------------------
onMounted(async () => {
  await store.loadSalesCatalog();
  try {
    const snap = await getDocs(
      query(
        floorCollection(db, "salesStaff", activeFloor.value),
        where("status", "==", "active"),
        orderBy("nama", "asc"),
      ),
    );
    salesList.value = snap.docs.map((d) => d.data().nama);
  } catch (_) {
    salesList.value = [];
  }
  window.addEventListener("storage", handleStockSync);
});

onUnmounted(() => {
  window.removeEventListener("storage", handleStockSync);
});
</script>
