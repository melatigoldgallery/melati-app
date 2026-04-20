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
              <option value="silver">Silver</option>
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
        <button v-if="form.tipe !== 'manual'" @click="openCatalogModal" class="btn btn-primary btn-sm ms-auto">
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
                <td class="align-middle">{{ row.kode }}</td>
                <td class="align-middle">{{ row.nama }}</td>
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
              <tr v-if="!silverRows.length">
                <td colspan="9" class="text-center text-muted py-3">
                  Belum ada barang. Klik "Pilih Kode" untuk menambahkan.
                </td>
              </tr>
              <tr v-for="(row, i) in silverRows" :key="i">
                <td class="text-center align-middle">{{ i + 1 }}</td>
                <td class="align-middle">{{ row.kode }}</td>
                <td class="align-middle">{{ row.nama }}</td>
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
                <td class="align-middle">{{ row.kode }}</td>
                <td class="align-middle">{{ row.nama }}</td>
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
        <button @click="savePenjualan" :disabled="isSaving" class="btn btn-primary btn-sm">
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
                <td class="align-middle">{{ item.kode }}</td>
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
import { getDocs, query, collection, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import { db } from "@/config/firebase";
import { useAccessoriesStore } from "@/stores/accessories";
import { useAlert } from "@/composables/useAlert";
import AppModal from "@/components/common/AppModal.vue";
import PrintFailedModal from "@/components/common/PrintFailedModal.vue";

const store = useAccessoriesStore();
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
  if (!isShortcutTipe.value || isSaving.value) return;

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
  if (!isShortcutTipe.value) return;

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

async function savePenjualan() {
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

  if (isSaving.value) return;
  isSaving.value = true;

  try {
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
      const mutasiItems = cartItems.filter((item) => {
        const kode = item.kode || item.kodeText;
        return kode && kode !== "-" && jenisBarang[kode.charAt(0).toUpperCase()];
      });
      await Promise.all(
        mutasiItems.map((item) => {
          const kode = item.kode || item.kodeText;
          const prefix = kode.charAt(0).toUpperCase();
          return addDoc(collection(db, "mutasiKode"), {
            kode,
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
            jenisPrefix: prefix,
            jenisNama: jenisBarang[prefix],
          });
        }),
      );
    }

    lastSaleData.value = {
      saleId,
      items: cartItems,
      totalHarga: grandTotal.value,
      sisaPembayaran: sisaPembayaran.value,
    };

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
    const now = new Date();
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const data = {
      transactionType: form.tipe.toUpperCase(),
      tanggal: form.tanggal,
      jam,
      sales: form.salesName,
      customerName: form.customerName || "",
      items: lastSaleData.value.items.map((i) => ({
        nama: i.namaBarang,
        kode: i.kodeText || i.kode,
        kadar: i.kadar || "-",
        berat: i.berat || "-",
        qty: i.qty,
        totalHarga: i.totalHarga || i.subtotal,
        keterangan: i.keterangan || "",
      })),
      totalHarga: lastSaleData.value.totalHarga,
      metodeBayar: form.metodePembayaran.toLowerCase(),
      nominalDP: form.metodePembayaran === "DP" ? nominalDP.value : 0,
      sisaPembayaran: form.metodePembayaran === "DP" ? lastSaleData.value.sisaPembayaran : 0,
      jumlahBayar: form.metodePembayaran !== "DP" && form.metodePembayaran !== "FREE" ? jumlahBayar.value : 0,
      kembalian: form.metodePembayaran !== "DP" && form.metodePembayaran !== "FREE" ? kembalian.value : 0,
    };
    const res = await fetch(`${PRINT_BASE}/api/print/receipt`, {
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
    const now = new Date();
    const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const data = {
      transactionId: lastSaleData.value.saleId,
      transactionType: form.tipe.toUpperCase(),
      tanggal: form.tanggal,
      jam,
      sales: form.salesName,
      customerName: form.customerName || "",
      customerPhone: form.customerPhone || "",
      items: lastSaleData.value.items.map((i) => ({
        nama: i.namaBarang,
        kode: i.kodeText || i.kode,
        kadar: i.kadar || "-",
        berat: i.berat || "-",
        qty: i.qty,
        totalHarga: i.totalHarga || i.subtotal,
        keterangan: i.keterangan || "",
      })),
      totalHarga: lastSaleData.value.totalHarga,
      metodeBayar: form.metodePembayaran,
      nominalDP: form.metodePembayaran === "DP" ? nominalDP.value : 0,
      sisaPembayaran: form.metodePembayaran === "DP" ? lastSaleData.value.sisaPembayaran : 0,
    };
    const res = await fetch(`${PRINT_BASE}/api/print/invoice`, {
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
    swal("Invoice dikirim ke printer");
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
    const q = query(collection(db, "salesStaff"), where("status", "==", "active"), orderBy("nama", "asc"));
    const snap = await getDocs(q);
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
