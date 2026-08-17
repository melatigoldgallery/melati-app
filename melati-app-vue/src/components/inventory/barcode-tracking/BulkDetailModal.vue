<template>
  <Teleport to="body">
    <div class="modal fade" id="bulkDetailModal" tabindex="-1" aria-hidden="true" ref="modalRef">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
        <div class="modal-header py-3 bg-primary text-white border-0 d-flex justify-content-between align-items-center">
          <h6 class="modal-title fw-bold mb-0">
            <i class="bi bi-list-check me-2"></i>
            Detail Perpindahan Gabungan ({{ selectedLog?.barcodes?.length || 0 }} Barang)
          </h6>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body bg-light-subtle" style="min-height: 400px;">
          <div v-if="selectedLog" class="mb-3">
            <div class="row g-2 bg-light rounded-2 small p-0 mb-0">
              <div class="col-3"><strong>Waktu:</strong> {{ formatDate(selectedLog.timestamp) }}</div>
              <div class="col-3"><strong>Sales:</strong> {{ selectedLog.pemindah || selectedLog.createdBy || '-' }}</div>
              <div class="col-6 text-end d-flex justify-content-end">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm rounded-pill px-2 py-1 d-flex align-items-center gap-2 shadow-sm"
                  style="font-size: 0.8rem;"
                  @click="copyAllBarcodes"
                  :disabled="!selectedLog?.barcodes?.length"
                >
                  <i class="bi" :class="copiedAll ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
                  <span>{{ copiedAll ? 'Copied' : 'Copy Semua Barcode' }}</span>
                </button>
              </div>                  
            </div>
            <div class="row g-2 mb-3 bg-light rounded-2 small p-0">
              <div class="col-3"><strong>Asal:</strong> {{ getSubDocLabel(selectedLog.origin) }}</div>
              <div class="col-3"><strong>Tujuan:</strong> {{ getSubDocLabel(selectedLog.destination) }}</div>
              <div class="col-4" v-if="selectedLog.notes"><strong>Catatan:</strong> {{ selectedLog.notes }}</div>
            </div>

            <div class="table-responsive border border-light rounded-4 shadow-sm bg-white custom-scrollbar" style="max-height: 350px; overflow-y: auto;">
              <table class="table table-sm table-hover align-middle mb-0" style="font-size: 0.85rem;">
                <thead class="table-secondary">
                  <tr>
                    <th class="ps-3" style="width: 60px;">No</th>
                    <th>Barcode</th>
                    <th>Detail/Warna</th>
                    <th class="pe-3">Asal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in paginatedDetailBarcodes" :key="item.barcode">
                    <td class="ps-3 text-muted">{{ (detailPage - 1) * detailPageSize + idx + 1 }}</td>
                    <td class="monospace fw-bold text-primary">{{ item.barcode }}</td>
                    <td>
                      <span class="badge bg-light text-dark border">
                        {{ item.detailType || '-' }}
                      </span>
                    </td>
                    <td class="pe-3 text-muted">{{ getSubDocLabel(item.origin === selectedLog.destination ? 'sistem_baru' : item.origin) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Controls client-side -->
            <div v-if="selectedLog.barcodes.length > detailPageSize" class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light">
              <button
                class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                :disabled="detailPage === 1"
                @click="detailPage--"
              >
                <i class="bi bi-chevron-left"></i>
                Sebelumnya
              </button>
              <span class="small fw-bold text-secondary">Halaman {{ detailPage }} dari {{ totalDetailPages }}</span>
              <button
                class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                :disabled="detailPage >= totalDetailPages"
                @click="detailPage++"
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
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Modal } from "bootstrap";

const selectedLog = ref(null);
const detailPage = ref(1);
const detailPageSize = 10;
const copiedAll = ref(false);
const modalRef = ref(null);
let modalInstance = null;

const totalDetailPages = computed(() => {
  if (!selectedLog.value?.barcodes) return 0;
  return Math.ceil(selectedLog.value.barcodes.length / detailPageSize);
});

const paginatedDetailBarcodes = computed(() => {
  if (!selectedLog.value?.barcodes) return [];
  const start = (detailPage.value - 1) * detailPageSize;
  return selectedLog.value.barcodes.slice(start, start + detailPageSize);
});

function getSubDocLabel(key) {
  if (!key) return "-";
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
    'sistem_baru': 'Awal Input'
  };
  return map[key] || key;
}

function formatDate(value) {
  if (!value) return "-";
  let d;
  if (value.toDate) d = value.toDate();
  else d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

async function copyAllBarcodes() {
  if (!selectedLog.value?.barcodes) return;
  const list = selectedLog.value.barcodes.map(b => b.barcode).join("\n");
  try {
    await navigator.clipboard.writeText(list);
    copiedAll.value = true;
    setTimeout(() => {
      copiedAll.value = false;
    }, 2000);
  } catch (err) {
    console.error("Gagal menyalin barcode:", err);
  }
}

function show(log) {
  const origin = log.origin === log.destination ? "sistem_baru" : log.origin;
  const normalizedBarcodes = (log.barcodes || []).map(b => {
    const barcodeStr = typeof b === "string" ? b : (b.barcode || "");
    const detailType = typeof b === "object" ? (b.detailType || "") : "";
    const barcodeOrigin = typeof b === "object" ? (b.origin || origin || "sistem_baru") : (origin || "sistem_baru");
    return {
      barcode: barcodeStr,
      detailType,
      origin: barcodeOrigin === log.destination ? "sistem_baru" : barcodeOrigin
    };
  });

  selectedLog.value = {
    ...log,
    origin,
    barcodes: normalizedBarcodes
  };
  detailPage.value = 1;
  copiedAll.value = false;

  if (!modalInstance && modalRef.value) {
    modalInstance = Modal.getOrCreateInstance(modalRef.value);
  }
  modalInstance?.show();
}

function hide() {
  modalInstance?.hide();
}

onMounted(() => {
  if (modalRef.value) {
    modalRef.value.addEventListener("hidden.bs.modal", () => {
      // Jaga scroll lock body tetap aktif jika modal riwayat masih terbuka di bawahnya
      const openModals = document.querySelectorAll(".modal.show");
      if (openModals.length > 0) {
        document.body.classList.add("modal-open");
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = "17px";
      }
    });
  }
});

defineExpose({
  show,
  hide
});
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%) !important;
  color: #fff;
}
.modal-dialog {
  will-change: transform;
  backface-visibility: hidden;
}
.modal-header .btn-close {
  filter: invert(1);
}
.monospace {
  font-family: var(--bs-font-monospace), monospace;
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
</style>

<style>
/* Penumpukan modal (stacked modal) agar tidak tertutup backdrop */
#bulkDetailModal {
  z-index: 1090 !important;
}
.modal-backdrop + .modal-backdrop {
  z-index: 1080 !important;
}
.modal-backdrop.show + .modal-backdrop.show {
  opacity: 0.25 !important;
}
</style>
