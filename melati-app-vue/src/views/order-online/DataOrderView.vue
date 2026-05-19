<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-table me-2 text-dark"></i>
        Data Order Online
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/order-online/input">Order Online</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Data Order</li>
        </ol>
      </nav>
    </div>

    <!-- Filter Card -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold py-2">
        <span>
          <i class="bi bi-funnel me-1 text-dark"></i>
          Filter Data
        </span>
      </div>
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Dari</label>
            <input v-model="filterStartDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Tanggal Sampai</label>
            <input v-model="filterEndDate" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Status Pengambilan</label>
            <select v-model="filterStatus" class="form-select form-select-sm">
              <option value="">Semua</option>
              <option value="BELUM_DIAMBIL">Belum Diambil</option>
              <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small fw-semibold mb-1">Cari</label>
            <input
              v-model="searchText"
              type="search"
              class="form-control form-control-sm"
              placeholder="Customer / barang / kontak"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
            />
          </div>
          <div class="col-12 col-md-2">
            <button class="btn btn-tampilkan btn-sm mobile-filter-submit" :disabled="loading" @click="loadData">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>
              Tampilkan
            </button>
          </div>
        </div>
      </div>
    </div>


    <!-- Contact Text Modal -->
    <div class="modal fade" id="contactTextModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header py-2">
            <h6 class="modal-title fw-semibold">
              <i class="bi bi-clipboard me-1 text-primary"></i>
              Export Data Kontak Customer
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted mb-2">
              Teks di bawah berisi daftar customer yang sedang difilter. Salin lalu kirim manual ke customer yang sesuai.
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

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="mt-2 text-muted small">Memuat data order online...</p>
    </div>

    <!-- Content -->
    <div v-else-if="hasLoaded">
      <!-- Mobile card view -->
      <div class="d-md-none mobile-order-list">
        <div v-if="mobileRows.length === 0" class="text-center text-muted py-5">
          <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
          <p class="small mb-0">{{ searchText ? "Tidak ada data sesuai pencarian." : "Tidak ada data order online." }}</p>
        </div>

        <div v-for="row in mobileRows" :key="row.id" class="card border-0 shadow-sm mb-2 rounded-3 mobile-order-card">
          <div class="card-body mobile-order-card-body">
            <div class="d-flex justify-content-between align-items-start mb-1 mobile-top-row">
              <span class="fw-bold text-dark mobile-customer">{{ row.namaCustomer || "-" }}</span>
              <span class="text-muted mobile-date">{{ formatOrderDateTime(row.tanggal, row.jam) }}</span>
            </div>

            <div class="d-flex align-items-center gap-1 mb-1 mobile-item-row">
              <span class="text-truncate flex-grow-1 mobile-item-name">{{ row.namaBarang || "-" }}</span>
              <span class="badge text-muted flex-shrink-0 mobile-item-kind">Jml {{ row.jml || 1 }}</span>
            </div>

            <div class="text-muted mb-1 mobile-meta-row">ADMIN: {{ row.namaAdmin || row.namaSales || "-" }}</div>
            <div class="text-muted mb-1 mobile-meta-row">Kontak: {{ row.kontak || "-" }}</div>
            <div class="text-muted mb-1 mobile-meta-row">
              Hubungi:
              <span>{{ row.waktuDihubungiTerakhir ? formatDisplayDateTime(row.waktuDihubungiTerakhir) : "-" }}</span>
            </div>

            <div class="d-flex gap-2 mb-2 flex-wrap mobile-detail-row">
              <span class="badge bg-light text-dark border mobile-detail-badge">Berat: {{ row.berat || "-" }}</span>
              <span class="badge bg-light text-dark border mobile-detail-badge">Kadar: {{ getKadarValue(row) }}</span>
            </div>

            <div class="text-muted mb-2 mobile-meta-row">
              <span>Handle:</span>
              <span>{{ row.namaStafHandle || "-" }}</span>
              <span>| {{ row.waktuPengambilan ? formatDisplayDateTime(row.waktuPengambilan) : "-" }}</span>
              <a
                v-if="row.buktiPengambilanUrl"
                :href="row.buktiPengambilanUrl"
                target="_blank"
                rel="noopener"
                class="btn btn-outline-info btn-sm py-0 px-1 ms-1"
                title="Lihat bukti"
              >
                <i class="bi bi-camera"></i>
              </a>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1 mobile-status-row">
              <span class="badge mobile-status-badge" :class="statusPengambilanBadge(row.statusPengambilan)">
                {{ statusPengambilanLabel(row.statusPengambilan) }}
              </span>
              <span class="fw-bold text-dark mobile-price">Rp {{ formatCurrency(row.harga) }}</span>
            </div>

            <div class="d-grid gap-2 mobile-action-grid">
              <div class="d-flex gap-2">
                <button class="btn btn-warning btn-sm flex-fill" @click="openStatusModal(row)">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  Update Status
                </button>
                <button
                  class="btn btn-secondary btn-sm flex-fill"
                  :disabled="contactingOrderId === row.id"
                  @click="markCustomerContacted(row)"
                >
                  <span v-if="contactingOrderId === row.id" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-telephone-outbound me-1"></i>
                  Sudah Dihubungi
                </button>
              </div>
              <button
                v-if="row.kontak"
                class="btn btn-success btn-sm w-100"
                :disabled="contactingOrderId === row.id"
                @click="contactCustomerViaWhatsApp(row)"
              >
                <span v-if="contactingOrderId === row.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-whatsapp me-1"></i>
                Hubungi WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop table view -->
      <div class="d-none d-md-block card border-0 shadow-sm">
        <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-list-ul me-1 text-dark"></i>
            Daftar Order Online
          </span>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="openContactTextModal">
            <i class="bi bi-clipboard me-1"></i>
            Export Kontak
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead class="table-light small">
              <tr>
                <th style="width: 42px">No</th>
                <th style="min-width: 130px">Tanggal / Jam</th>
                <th style="min-width: 140px">Admin</th>
                <th style="min-width: 140px">Customer</th>
                <th style="min-width: 110px">Kontak</th>
                <th style="min-width: 140px">Barang</th>
                <th style="width: 90px">Kadar</th>
                <th style="width: 110px" class="text-start">Harga</th>
                <th style="min-width: 140px">Handle / Waktu</th>
                <th style="min-width: 150px">Hubungi Customer</th>
                <th style="width: 90px" class="text-center">Bukti</th>
                <th style="min-width: 160px" class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="rows.length === 0">
                <td colspan="12" class="text-center text-muted py-5">
                  <i class="bi bi-inbox display-5 d-block mb-2 opacity-25"></i>
                  Tidak ada data order online.
                </td>
              </tr>
              <tr v-for="(row, index) in rows" :key="row.id">
                <td class="small text-muted fw-semibold">{{ index + 1 }}</td>
                <td class="small">
                  <div>{{ formatOrderDateTime(row.tanggal, row.jam) }}</div>
                </td>
                <td class="small">
                  <div>{{ row.namaAdmin || row.namaSales || "-" }}</div>
                </td>
                <td class="small">
                  <div>{{ row.namaCustomer }}</div>
                </td>
                <td class="small">{{ row.kontak }}</td>
                <td class="small">{{ row.namaBarang }}</td>
                <td class="small">{{ getKadarValue(row) }}</td>
                <td class="small text-start">Rp {{ formatCurrency(row.harga) }}</td>
                <td class="small">
                  <div v-if="row.namaStafHandle" class="text-dark">{{ row.namaStafHandle }}</div>
                  <div v-else class="text-muted">-</div>
                  <div class="text-muted" style="font-size: 0.75rem">
                    {{ row.waktuPengambilan ? formatDisplayDateTime(row.waktuPengambilan) : "-" }}
                  </div>
                </td>
                <td class="small align-middle">
                  <div class="d-flex align-items-center justify-content-between gap-2">
                    <span class="text-muted d-flex flex-column contact-last-text">
                      <span>Terakhir dihubungi</span>
                      <span v-if="row.waktuDihubungiTerakhir">{{ formatDisplayDateTime(row.waktuDihubungiTerakhir) }}</span>
                      <span v-else>-</span>
                    </span>
                    <button
                      v-if="row.kontak"
                      class="btn btn-success btn-sm"
                      :disabled="contactingOrderId === row.id"
                      @click="contactCustomerViaWhatsApp(row)"
                      title="Hubungi WhatsApp"
                    >
                      <span
                        v-if="contactingOrderId === row.id"
                        class="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <i v-else class="bi bi-whatsapp"></i>
                    </button>
                  </div>
                </td>
                <td class="text-center">
                  <a
                    v-if="row.buktiPengambilanUrl"
                    :href="row.buktiPengambilanUrl"
                    target="_blank"
                    rel="noopener"
                    class="btn btn-outline-info btn-sm py-0 px-1"
                    title="Lihat bukti"
                  >
                    <i class="bi bi-image"></i>
                  </a>
                  <span v-else class="text-muted small">-</span>
                </td>
                <td class="text-center">
                  <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-success btn-sm py-0 px-2" @click="markCustomerContacted(row)" title="Tandai sudah dihubungi">
                      <i class="bi bi-telephone-outbound"></i>
                    </button>
                    <button class="btn btn-warning btn-sm py-0 px-2" @click="openStatusModal(row)" title="Update status pengambilan">
                      <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button class="btn btn-primary btn-sm py-0 px-2" @click="openEditModal(row)" title="Edit data">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger btn-sm py-0 px-2" @click="deleteRow(row)" title="Hapus data">
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

    <!-- Empty State -->
    <div v-else class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-search display-5 d-block mb-2 opacity-25"></i>
        Pilih filter lalu klik Tampilkan untuk melihat data order online.
      </div>
    </div>

    <!-- Update Status Modal -->
    <div id="statusUpdateModal" class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-arrow-repeat me-2"></i>
              Update Status Pengambilan
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div v-if="selectedRow" class="modal-body">
            <div class="alert alert-light border mb-3">
              <div class="fw-semibold small">{{ selectedRow.namaCustomer }}</div>
              <div class="text-muted small">{{ selectedRow.namaBarang }}</div>
              <div class="text-muted" style="font-size: 0.75rem">{{ formatOrderDateTime(selectedRow.tanggal, selectedRow.jam) }}</div>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold mb-2">Status Pengambilan</label>
                <select v-model="modalForm.statusPengambilan" class="form-select form-select-sm">
                  <option value="BELUM_DIAMBIL">Belum Diambil</option>
                  <option value="SUDAH_DIAMBIL">Sudah Diambil</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold mb-2">Nama Staf Handle</label>
                <input v-model="modalForm.namaStafHandle" type="text" class="form-control form-control-sm" placeholder="Nama staf" />
              </div>
            </div>

            <div v-if="modalForm.statusPengambilan === 'SUDAH_DIAMBIL'" class="mt-3">
              <label class="form-label small fw-semibold mb-2">Bukti Pengambilan</label>
              <input ref="proofFileInput" type="file" class="form-control form-control-sm" accept="image/*" @change="onProofChange" />
              <div v-if="modalForm.existingBuktiUrl" class="small text-muted mt-2">
                Bukti saat ini: <a :href="modalForm.existingBuktiUrl" target="_blank" rel="noopener" class="text-info">lihat file</a>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal" :disabled="savingStatus">Batal</button>
            <button type="button" class="btn btn-warning btn-sm" @click="saveStatus" :disabled="savingStatus">
              <span v-if="savingStatus" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div id="editOrderModal" class="modal fade" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-pencil me-2"></i>
              Edit Data Order
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div v-if="selectedRow" class="modal-body">
            <div class="alert alert-light border mb-3">
              <div class="fw-semibold small">{{ selectedRow.namaCustomer }}</div>
              <div class="text-muted small">{{ selectedRow.namaBarang }}</div>
              <div class="text-muted" style="font-size: 0.75rem">{{ formatOrderDateTime(selectedRow.tanggal, selectedRow.jam) }}</div>
            </div>

            <div class="row g-2">
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Tanggal</label>
                <input v-model="editForm.tanggal" type="date" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Nama Admin</label>
                <input v-model="editForm.namaAdmin" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Nama Customer</label>
                <input v-model="editForm.namaCustomer" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-semibold mb-1">Kontak</label>
                <input v-model="editForm.kontak" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-4">
                <label class="form-label small fw-semibold mb-1">Nama Barang</label>
                <input v-model="editForm.namaBarang" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Jumlah</label>
                <input v-model.number="editForm.jml" type="number" min="1" class="form-control form-control-sm text-center" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Berat</label>
                <input v-model="editForm.berat" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Kadar</label>
                <input v-model="editForm.karat" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-2">
                <label class="form-label small fw-semibold mb-1">Harga</label>
                <input v-model.number="editForm.harga" type="number" min="0" class="form-control form-control-sm text-end" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal" :disabled="savingEdit">Batal</button>
            <button type="button" class="btn btn-primary btn-sm" @click="saveEdit" :disabled="savingEdit">
              <span v-if="savingEdit" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { Modal } from "bootstrap";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import {
  deleteOrderOnline,
  fetchOrderOnlineByRange,
  formatOrderDateTime,
  updateOrderContactStatus,
  updateOrderOnlineData,
  updateOrderPickup,
  uploadOrderProof,
} from "@/services/order-online-service";

const auth = useAuthStore();
const { confirm, error: showError, swal } = useAlert();
const { todayStringWITA, nowWITA } = useWITA();
const activeFloor = computed(() => auth.activeFloor || "L1");

const filterStartDate = ref(todayStringWITA());
const filterEndDate = ref(todayStringWITA());
const filterStatus = ref("");
const searchText = ref("");
const rows = ref([]);
const loading = ref(false);
const hasLoaded = ref(false);

const selectedRow = ref(null);
const savingStatus = ref(false);
const savingEdit = ref(false);
const contactingOrderId = ref("");
const proofFileInput = ref(null);
const proofFile = ref(null);
const contactTextRef = ref(null);
const contactExportText = ref("");

const editForm = reactive({
  tanggal: "",
  namaAdmin: "",
  namaCustomer: "",
  kontak: "",
  namaBarang: "",
  jml: 1,
  berat: "",
  karat: "",
  harga: 0,
});

const modalForm = reactive({
  statusPengambilan: "BELUM_DIAMBIL",
  namaStafHandle: "",
  existingBuktiUrl: "",
});

const mobileRows = computed(() => {
  const keyword = String(searchText.value || "").trim().toLowerCase();
  if (!keyword) return rows.value;

  const keywordDigits = keyword.replace(/\D/g, "");
  return rows.value.filter((row) => {
    const namaCustomer = String(row?.namaCustomer || "").toLowerCase();
    const namaBarang = String(row?.namaBarang || "").toLowerCase();
    const namaAdmin = String(row?.namaAdmin || row?.namaSales || "").toLowerCase();
    const kontakRaw = String(row?.kontak || "");
    const kontak = kontakRaw.toLowerCase();
    const kontakDigits = kontakRaw.replace(/\D/g, "");

    const textMatch =
      namaCustomer.includes(keyword) ||
      namaBarang.includes(keyword) ||
      namaAdmin.includes(keyword) ||
      kontak.includes(keyword);
    if (textMatch) return true;

    if (!keywordDigits) return false;
    return kontakDigits.includes(keywordDigits);
  });
});

const contactExportSummary = computed(() => {
  return `${rows.value.length} data | ${rows.value.filter((item) => item.kontak).length} nomor HP tersedia`;
});

function formatCurrency(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString("id-ID") : "0";
}

function formatDisplayDateTime(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function formatLocalDateTime(date = nowWITA()) {
  const d = date instanceof Date ? date : nowWITA();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildContactMessage(row) {
  const namaCustomer = row?.namaCustomer || "Kak";
  const namaBarang = row?.namaBarang || "-";
  return (
    `Halo Kak ${namaCustomer},\n` +
    `Order Kakak sudah kami proses.\n` +
    `(${namaBarang})\n` +
    `Silahkan melakukan pengambilan barang di Melati Gold Shop. Terima kasih.`
  );
}

function normalizePhoneForWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function buildWhatsAppContactUrl(row) {
  const phone = normalizePhoneForWhatsApp(row?.kontak);
  if (!phone) return "";
  const message = encodeURIComponent(buildContactMessage(row));
  return `https://wa.me/${phone}?text=${message}`;
}

function buildContactExportText() {
  const items = rows.value;
  if (!items.length) return "Tidak ada data order online untuk diekspor.";

  const lines = [];
  items.forEach((row, index) => {
    lines.push(`Data ${index + 1}`);
    lines.push(`Customer: ${row.namaCustomer || "-"}`);
    lines.push(`No HP: ${row.kontak || "-"}`);
    lines.push("Pesan:");
    lines.push(buildContactMessage(row));
    if (row.waktuDihubungiTerakhir) {
      lines.push(`Terakhir dihubungi: ${formatDisplayDateTime(row.waktuDihubungiTerakhir)}`);
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
  link.download = `Teks_Kontak_Order_${filterStartDate.value}_sd_${filterEndDate.value}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function markCustomerContacted(row) {
  if (!row?.id || contactingOrderId.value) return;
  if (!row.kontak) return swal("Nomor HP tidak tersedia", "warning");

  const result = await confirm({
    title: "Customer sudah dihubungi?",
    text:
      `Klik YA jika customer ${row.namaCustomer || "-"} sudah Anda hubungi secara manual. ` +
      "Sistem akan menyimpan waktu kontak terakhir.",
    confirmText: "Ya, sudah dihubungi",
  });
  if (!result.isConfirmed) return;

  contactingOrderId.value = row.id;
  try {
    const contactTime = formatLocalDateTime(nowWITA());
    await updateOrderContactStatus(
      row.id,
      {
        waktuDihubungiTerakhir: contactTime,
        metodeKontakTerakhir: "manual",
        dihubungiOleh: auth.currentUser?.username || auth.currentUser?.displayName || auth.currentUser?.email || "staf",
      },
      activeFloor.value,
    );
    await swal("Waktu kontak terakhir berhasil disimpan", "success");
    await loadData();
  } catch (error) {
    showError("Gagal menyimpan status kontak", error?.message || "Silakan coba lagi.");
  } finally {
    contactingOrderId.value = "";
  }
}

async function contactCustomerViaWhatsApp(row) {
  if (!row?.id || contactingOrderId.value) return;
  if (!row.kontak) return swal("Nomor HP tidak tersedia", "warning");

  const url = buildWhatsAppContactUrl(row);
  if (!url) return swal("Nomor HP tidak valid untuk WhatsApp", "warning");

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    window.location.href = url;
  }

  contactingOrderId.value = row.id;
  try {
    const contactTime = formatLocalDateTime(nowWITA());
    await updateOrderContactStatus(
      row.id,
      {
        waktuDihubungiTerakhir: contactTime,
        metodeKontakTerakhir: "whatsapp",
        dihubungiOleh: auth.currentUser?.username || auth.currentUser?.displayName || auth.currentUser?.email || "staf",
      },
      activeFloor.value,
    );
    await swal("WhatsApp dibuka dan waktu kontak terakhir disimpan", "success");
    await loadData();
  } catch (error) {
    showError("WhatsApp terbuka, tapi gagal menyimpan status kontak", error?.message || "Silakan coba lagi.");
  } finally {
    contactingOrderId.value = "";
  }
}

function getKadarValue(row) {
  const kadar = String(row?.kadar ?? "").trim();
  if (kadar) return kadar;
  const karat = String(row?.karat ?? "").trim();
  return karat || "-";
}

function statusPengambilanLabel(status) {
  return status === "SUDAH_DIAMBIL" ? "Sudah Diambil" : "Belum Diambil";
}

function statusPengambilanBadge(status) {
  return status === "SUDAH_DIAMBIL" ? "bg-success-subtle text-success-emphasis border border-success-subtle" : "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
}

async function loadData() {
  try {
    loading.value = true;
    rows.value = await fetchOrderOnlineByRange(
      filterStartDate.value,
      filterEndDate.value,
      filterStatus.value,
      activeFloor.value,
    );
    hasLoaded.value = true;
  } catch (error) {
    showError("Gagal memuat data order online", error?.message || "Silakan coba lagi.");
  } finally {
    loading.value = false;
  }
}

function openStatusModal(row) {
  selectedRow.value = row;
  modalForm.statusPengambilan = row.statusPengambilan || "BELUM_DIAMBIL";
  modalForm.namaStafHandle = row.namaStafHandle || auth.currentUser?.displayName || auth.currentUser?.username || "";
  modalForm.existingBuktiUrl = row.buktiPengambilanUrl || "";
  proofFile.value = null;
  if (proofFileInput.value) proofFileInput.value.value = "";
  
  new Modal(document.getElementById("statusUpdateModal")).show();
}

function openEditModal(row) {
  selectedRow.value = row;
  editForm.tanggal = row.tanggal || todayStringWITA();
  editForm.namaAdmin = row.namaAdmin || row.namaSales || auth.currentUser?.displayName || auth.currentUser?.username || "";
  editForm.namaCustomer = row.namaCustomer || "";
  editForm.kontak = row.kontak || "";
  editForm.namaBarang = row.namaBarang || "";
  editForm.jml = Number(row.jml || 1);
  editForm.berat = row.berat ?? "";
  editForm.karat = row.karat || row.kadar || "";
  editForm.harga = Number(row.harga || 0);

  new Modal(document.getElementById("editOrderModal")).show();
}

function onProofChange(event) {
  proofFile.value = event.target.files?.[0] || null;
}

async function saveStatus() {
  if (!selectedRow.value) return;

  try {
    savingStatus.value = true;

    const updates = {
      statusPengambilan: modalForm.statusPengambilan,
      namaStafHandle: modalForm.namaStafHandle,
      updatedBy: auth.currentUser?.username || auth.currentUser?.displayName || modalForm.namaStafHandle,
    };

    if (modalForm.statusPengambilan === "SUDAH_DIAMBIL") {
      const existingUrl = modalForm.existingBuktiUrl;
      if (!existingUrl && !proofFile.value) {
        throw new Error("Bukti pengambilan wajib diunggah saat status sudah diambil");
      }

      let proofResult = null;
      if (proofFile.value) {
        proofResult = await uploadOrderProof(proofFile.value, {
          orderNo: selectedRow.value.orderNo,
          docId: selectedRow.value.id,
          floorId: activeFloor.value,
        });
      }

      updates.waktuPengambilan = selectedRow.value.waktuPengambilan || formatLocalDateTime(nowWITA());
      updates.buktiPengambilanUrl = proofResult?.url || existingUrl;
      updates.buktiPengambilanPath = proofResult?.path || selectedRow.value.buktiPengambilanPath || "";
    } else {
      updates.waktuPengambilan = "";
      updates.buktiPengambilanUrl = "";
      updates.buktiPengambilanPath = "";
    }

    await updateOrderPickup(selectedRow.value.id, updates, activeFloor.value);
    await updateOrderOnlineData(selectedRow.value.id, { ...selectedRow.value, ...updates }, activeFloor.value);

    await swal("Data order online berhasil diperbarui", "success");
    Modal.getInstance(document.getElementById("statusUpdateModal"))?.hide();
    await loadData();
  } catch (error) {
    showError("Gagal menyimpan perubahan", error?.message || "Silakan cek kembali data yang diisi.");
  } finally {
    savingStatus.value = false;
  }
}

async function saveEdit() {
  if (!selectedRow.value) return;

  try {
    savingEdit.value = true;

    await updateOrderOnlineData(selectedRow.value.id, {
      ...editForm,
      updatedBy: auth.currentUser?.username || auth.currentUser?.displayName || editForm.namaAdmin,
    }, activeFloor.value);

    await swal("Data order online berhasil diperbarui", "success");
    Modal.getInstance(document.getElementById("editOrderModal"))?.hide();
    await loadData();
  } catch (error) {
    showError("Gagal menyimpan edit data", error?.message || "Silakan cek kembali data yang diisi.");
  } finally {
    savingEdit.value = false;
  }
}

function formatContactedBy(row) {
  return row?.dihubungiOleh || "-";
}

async function deleteRow(row) {
  const result = await confirm({
    title: "Hapus data order online?",
    text: `${row.namaCustomer} - ${row.namaBarang}`,
    confirmText: "Ya, hapus",
  });
  if (!result.isConfirmed) return;

  try {
    await deleteOrderOnline(row.id, activeFloor.value);
    await swal("Data order online berhasil dihapus", "success");
    await loadData();
  } catch (error) {
    showError("Gagal menghapus data", error?.message || "Silakan coba lagi.");
  }
}
</script>

<style scoped>
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table th,
.table td {
  white-space: nowrap;
  vertical-align: middle;
}

.mobile-order-card {
  border-radius: 0.9rem !important;
}

.mobile-filter-submit {
  width: 100%;
}

.mobile-order-card-body {
  padding: 0.75rem 0.8rem;
}

.mobile-top-row {
  gap: 0.5rem;
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

.mobile-meta-row {
  font-size: 0.74rem;
  line-height: 1.3;
}

.mobile-detail-row {
  margin-top: 0.1rem;
}

.mobile-detail-badge {
  font-size: 0.67rem;
}

.mobile-status-row {
  align-items: flex-start;
}

.mobile-status-badge {
  font-size: 0.68rem;
}

.mobile-price {
  font-size: 0.82rem;
  white-space: nowrap;
}

.mobile-action-grid .btn {
  font-size: 0.73rem;
  font-weight: 600;
}

.contact-last-text {
  font-size: 0.72rem;
  line-height: 1.25;
}

@media (max-width: 420px) {
  .mobile-order-card-body {
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

  .mobile-price {
    font-size: 0.78rem;
  }

  .mobile-action-grid .btn {
    font-size: 0.71rem;
    padding-left: 0.4rem;
    padding-right: 0.4rem;
  }
}

@media (min-width: 768px) {
  .mobile-filter-submit {
    width: auto;
  }
}
</style>
