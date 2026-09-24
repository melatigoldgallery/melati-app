<template>
  <div class="modal fade" id="barcodeRincianModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
        <div class="modal-header py-3 bg-primary text-white border-0">
          <h6 class="modal-title fw-bold">
            <i class="bi bi-qr-code-scan me-2"></i>
            Rincian Barcode: {{ mainCat }} - {{ locationLabel }}
          </h6>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4 bg-light-subtle" style="min-height: 460px;">
          <!-- Sub-tabs based on color / hala types -->
          <ul v-if="modalTabs.length > 0" class="nav nav-pills mb-3 justify-content-center scrollable-pills modal-pills">
            <li v-for="tab in modalTabs" :key="tab.key" class="nav-item">
              <button
                class="nav-link btn-sm py-1 px-3 me-2 rounded-pill fw-semibold d-flex align-items-center gap-1 border-0"
                :class="getTabClass(tab.key)"
                :style="getTabStyle(tab.key)"
                @click="selectModalTab(tab.key)"
              >
                {{ tab.label }}
                <span 
                  class="badge ms-1" 
                  :class="getTabBadgeClass(tab.key)"
                  :style="getTabBadgeStyle(tab.key)"
                >
                  {{ getSubQty(tab.key) }}
                </span>
              </button>
            </li>
          </ul>

          <!-- Location is Display (Individual barcode tracking disabled) -->
          <div v-if="location === 'barang-display'" class="alert alert-warning py-4 text-center border-0 rounded-4 shadow-sm mb-0">
            <i class="bi bi-info-circle fs-3 d-block mb-2 text-warning"></i>
            <h6 class="fw-bold mb-1">Pelacakan Dinonaktifkan</h6>
            <span class="text-secondary small">Pelacakan barcode individu dinonaktifkan di lokasi Display.</span>
          </div>

          <!-- Physical locations (Barcode tracking enabled) -->
          <div v-else>
            <div v-if="loadingBarcodes && allBarcodes.length === 0" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted small fw-semibold">Memuat daftar barcode...</p>
            </div>
            <div v-else :style="loadingBarcodes ? 'opacity: 0.55; pointer-events: none; transition: opacity 0.15s ease;' : 'transition: opacity 0.15s ease;'">
              <!-- Control Toolbar -->
              <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <button 
                    class="btn btn-secondary btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 shadow-sm transition-all hover-btn-scale"
                    @click="copyAllBarcodes"
                    :disabled="copyingAll || allBarcodes.length === 0"
                  >
                    <span v-if="copyingAll" class="spinner-border spinner-border-sm" role="status"></span>
                    <i v-else class="bi bi-clipboard"></i>
                    <span>Salin Semua Barcode</span>
                  </button>

                  <span 
                    class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill px-3 py-1 d-inline-flex align-items-center gap-1.5 shadow-sm"
                    style="font-size: 0.82rem;"
                  >
                    <i class="bi bi-upc-scan text-primary me-1"></i>
                    <span>Total Barcode: <strong class="fw-bold">{{ Number(totalBarcodeCount || 0).toLocaleString('id-ID') }} pcs</strong></span>
                  </span>
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

              <!-- Barcodes empty list (no barcodes at all) -->
              <div v-if="allBarcodes.length === 0" class="text-center py-5 border border-dashed rounded-4 bg-white shadow-sm">
                <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                <p class="text-secondary small mb-0">Tidak ada barcode terdaftar di lokasi/kategori ini.</p>
              </div>

              <!-- Barcodes empty search result -->
              <div v-else-if="filteredBarcodes.length === 0" class="text-center py-5 border border-dashed rounded-4 bg-white shadow-sm">
                <i class="bi bi-search fs-2 d-block mb-2 text-muted"></i>
                <p class="text-secondary small mb-1">Tidak ada barcode yang cocok dengan "<strong>{{ barcodeSearchQuery }}</strong>".</p>
                <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1 mt-2" @click="clearBarcodeSearch">
                  <i class="bi bi-x-circle me-1"></i> Reset Pencarian
                </button>
              </div>

              <!-- Barcodes list table -->
              <div v-else>
                <div class="table-responsive border border-light rounded-4 shadow-sm bg-white custom-scrollbar" style="max-height: 350px; overflow-y: auto;">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light border-bottom">
                      <tr>
                        <th class="ps-3 text-secondary fw-semibold small" style="width: 70px;">No</th>
                        <th class="text-secondary fw-semibold small">Barcode</th>
                        <th class="text-secondary fw-semibold small">Terakhir Update</th>
                        <th v-if="isSupervisorOrAdmin" class="pe-3 text-end text-secondary fw-semibold small" style="width: 90px;">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(b, idx) in paginatedBarcodes" :key="b.id || b.barcode" class="barcode-row transition-all">
                        <td class="ps-3 text-muted small">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
                        <td>
                          <div class="d-flex align-items-center gap-2">
                            <span 
                              :class="getBarcodeRowBadgeClass()"
                              :style="getBarcodeRowBadgeStyle()"
                            >
                              {{ b.barcode }}
                            </span>
                            <button 
                              type="button"
                              class="btn btn-link btn-xs p-1 text-secondary hover-primary border-0 bg-transparent rounded-circle d-inline-flex align-items-center justify-content-center transition-all hover-bg-light"
                              @click="copySingleBarcode(b.barcode, (currentPage - 1) * pageSize + idx)"
                              title="Salin Barcode"
                              style="width: 26px; height: 26px;"
                            >
                              <i :class="copiedIndex === ((currentPage - 1) * pageSize + idx) ? 'bi bi-check-lg text-success' : 'bi bi-clipboard fs-7'"></i>
                            </button>
                          </div>
                        </td>
                        <td class="text-muted small">
                          <span class="d-inline-flex align-items-center gap-1.5">
                            <i class="bi bi-clock text-secondary opacity-75"></i>
                            {{ formatDate(b.lastUpdated) }}
                          </span>
                        </td>
                        <td v-if="isSupervisorOrAdmin" class="pe-3 text-end">
                          <button
                            type="button"
                            class="btn btn-outline-danger btn-xs px-2 py-0.5 rounded-pill transition-all d-inline-flex align-items-center gap-1 align-middle border-0"
                            @click="handleRevertBarcode(b.barcode)"
                            :disabled="revertingBarcode === b.barcode"
                          >
                            <span v-if="revertingBarcode === b.barcode" class="spinner-border spinner-border-sm" role="status" style="width: 0.75rem; height: 0.75rem;"></span>
                            <i v-else class="bi bi-arrow-counterclockwise fs-7"></i>
                            <span>Batalkan</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Pagination Toolbar -->
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-light flex-wrap gap-2">
                  <!-- Left: Limit selector & range info -->
                  <div class="d-flex align-items-center gap-2 flex-wrap">
                    <div class="d-flex align-items-center gap-1.5 small text-secondary">
                      <select 
                        v-model.number="pageSize" 
                        @change="handlePageSizeChange"
                        class="form-select form-select-sm rounded-pill py-1 px-2.5 bg-white border shadow-xs" 
                        style="width: auto; font-size: 0.8rem; cursor: pointer;"
                      >
                        <option :value="10">10</option>
                        <option :value="25">25</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                      </select>
                    </div>

                    <span class="text-secondary small ps-sm-2 border-start border-secondary-subtle">
                      Menampilkan <strong class="text-dark">{{ rangeStart }}</strong> - <strong class="text-dark">{{ rangeEnd }}</strong> dari <strong class="text-dark">{{ totalFilteredCount }}</strong> barcode
                    </span>
                  </div>

                  <!-- Right: Page numbers -->
                  <nav v-if="totalPages > 1" aria-label="Navigasi Halaman Barcode">
                    <ul class="pagination pagination-sm mb-0 align-items-center gap-1">
                      <!-- First Page -->
                      <li class="page-item" :class="{ disabled: currentPage === 1 }">
                        <button 
                          type="button"
                          class="page-link rounded-pill px-2 py-1 d-flex align-items-center justify-content-center" 
                          @click="goToPage(1)" 
                          title="Halaman Pertama"
                          :disabled="currentPage === 1"
                          style="min-width: 30px; height: 30px;"
                        >
                          <i class="bi bi-chevron-double-left" style="font-size: 0.75rem;"></i>
                        </button>
                      </li>

                      <!-- Prev Page -->
                      <li class="page-item" :class="{ disabled: currentPage === 1 }">
                        <button 
                          type="button"
                          class="page-link rounded-pill px-2 py-1 d-flex align-items-center justify-content-center" 
                          @click="goToPage(currentPage - 1)" 
                          title="Halaman Sebelumnya"
                          :disabled="currentPage === 1"
                          style="min-width: 30px; height: 30px;"
                        >
                          <i class="bi bi-chevron-left" style="font-size: 0.75rem;"></i>
                        </button>
                      </li>

                      <!-- Page Numbers with Ellipsis -->
                      <li 
                        v-for="(page, pIdx) in visiblePages" 
                        :key="pIdx" 
                        class="page-item"
                        :class="{ active: page === currentPage, disabled: page === '...' }"
                      >
                        <span v-if="page === '...'" class="page-link border-0 bg-transparent text-muted px-1">...</span>
                        <button 
                          v-else 
                          type="button"
                          class="page-link rounded-pill px-2.5 py-1 d-flex align-items-center justify-content-center fw-semibold" 
                          @click="goToPage(page)"
                          style="min-width: 30px; height: 30px; font-size: 0.8rem;"
                        >
                          {{ page }}
                        </button>
                      </li>

                      <!-- Next Page -->
                      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                        <button 
                          type="button"
                          class="page-link rounded-pill px-2 py-1 d-flex align-items-center justify-content-center" 
                          @click="goToPage(currentPage + 1)" 
                          title="Halaman Berikutnya"
                          :disabled="currentPage === totalPages"
                          style="min-width: 30px; height: 30px;"
                        >
                          <i class="bi bi-chevron-right" style="font-size: 0.75rem;"></i>
                        </button>
                      </li>

                      <!-- Last Page -->
                      <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                        <button 
                          type="button"
                          class="page-link rounded-pill px-2 py-1 d-flex align-items-center justify-content-center" 
                          @click="goToPage(totalPages)" 
                          title="Halaman Terakhir"
                          :disabled="currentPage === totalPages"
                          style="min-width: 30px; height: 30px;"
                        >
                          <i class="bi bi-chevron-double-right" style="font-size: 0.75rem;"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
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
import { ref, computed, watch } from "vue";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAlert } from "@/composables/useAlert";
import { revertSingleBarcode } from "@/services/barcode-service";
import { getCardDetailMode } from "@/services/inventory-service";

const props = defineProps({
  mainCat: { type: String, default: "" },
  location: { type: String, default: "" },
  locationLabel: { type: String, default: "" },
  stockData: { type: Object, default: () => ({}) },
  activeFloor: { type: String, default: "" },
  userRole: { type: String, default: "" },
  isSupervisorOrAdmin: { type: Boolean, default: false },
  colorTypes: { type: Array, default: () => [] },
  colorLabels: { type: Object, default: () => ({}) },
  halaTypes: { type: Array, default: () => [] },
  halaLabels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["reverted"]);
const { toast, error: showError, confirm } = useAlert();

const allBarcodes = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const loadingBarcodes = ref(false);
const activeModalTab = ref("");
const barcodeCache = ref({});
const copyingAll = ref(false);
const copiedIndex = ref(null);
const barcodeSearchQuery = ref("");
const revertingBarcode = ref("");

const modalTabs = computed(() => {
  const cat = props.mainCat;
  if (!cat) return [];
  const detailMode = getCardDetailMode(cat);
  let baseTabs = [];
  
  if (detailMode === "color") {
    baseTabs = props.colorTypes.map(k => ({ key: k, label: props.colorLabels[k] || k }));
  } else if (detailMode === "hala") {
    baseTabs = props.halaTypes.map(k => ({ key: k, label: props.halaLabels[k] || k }));
  } else {
    return [];
  }
  
  const loc = props.location;
  const item = props.stockData[loc]?.[cat];
  if (item && item.details) {
    const activeKeys = new Set(baseTabs.map(t => t.key));
    Object.keys(item.details).forEach(k => {
      const qty = parseInt(item.details[k], 10) || 0;
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

function getTabClass(tabKey) {
  const isActive = activeModalTab.value === tabKey;
  if (!isActive) return "text-secondary bg-transparent";

  const detailMode = getCardDetailMode(props.mainCat);
  if (detailMode === "color") {
    switch (tabKey) {
      case "PUTIH":
        return "active bg-light text-dark border border-secondary-subtle shadow-sm";
      case "BIRU":
        return "active bg-primary text-white shadow-sm";
      case "KUNING":
        return "active bg-warning text-dark shadow-sm";
      case "HIJAU":
        return "active bg-success text-white shadow-sm";
      case "PINK":
        return "active shadow-sm"; // Handled by inline style
      default:
        return "active bg-primary text-white shadow-sm";
    }
  }
  return "active bg-primary text-white shadow-sm";
}

function getTabStyle(tabKey) {
  const isActive = activeModalTab.value === tabKey;
  if (!isActive) return "";

  const detailMode = getCardDetailMode(props.mainCat);
  if (detailMode === "color" && tabKey === "PINK") {
    return "background-color: #fce4ec !important; border: 1px solid #f8bbd0 !important; color: #c2185b !important;";
  }
  return "";
}

function getTabBadgeClass(tabKey) {
  const isActive = activeModalTab.value === tabKey;
  if (!isActive) return "bg-secondary text-white";

  const detailMode = getCardDetailMode(props.mainCat);
  if (detailMode === "color") {
    switch (tabKey) {
      case "PUTIH":
        return "bg-secondary text-white";
      case "BIRU":
        return "bg-white text-primary";
      case "KUNING":
        return "bg-dark text-warning";
      case "HIJAU":
        return "bg-white text-success";
      case "PINK":
        return ""; // Handled by inline style
      default:
        return "bg-white text-primary";
    }
  }
  return "bg-white text-primary";
}

function getTabBadgeStyle(tabKey) {
  const isActive = activeModalTab.value === tabKey;
  if (!isActive) return "";

  const detailMode = getCardDetailMode(props.mainCat);
  if (detailMode === "color" && tabKey === "PINK") {
    return "background-color: #c2185b !important; color: #ffffff !important;";
  }
  return "";
}

function getBarcodeRowBadgeClass() {
  const detailMode = getCardDetailMode(props.mainCat);
  const activeColor = activeModalTab.value;
  const baseClass = "monospace fw-bold fs-7 px-2 py-1 rounded border";

  if (detailMode === "color") {
    switch (activeColor) {
      case "PUTIH":
        return `${baseClass} bg-light text-dark border-secondary-subtle`;
      case "BIRU":
        return `${baseClass} bg-primary-subtle text-primary-emphasis border-primary-subtle`;
      case "KUNING":
        return `${baseClass} bg-warning-subtle text-warning-emphasis border-warning-subtle`;
      case "HIJAU":
        return `${baseClass} bg-success-subtle text-success-emphasis border-success-subtle`;
      case "PINK":
        return baseClass; // Handled by inline style
      default:
        return `${baseClass} bg-light text-dark`;
    }
  }
  return `${baseClass} bg-light text-dark`;
}

function getBarcodeRowBadgeStyle() {
  const detailMode = getCardDetailMode(props.mainCat);
  const activeColor = activeModalTab.value;

  if (detailMode === "color" && activeColor === "PINK") {
    return "background-color: #fce4ec !important; border-color: #f8bbd0 !important; color: #c2185b !important;";
  }
  return "";
}

function getSubQty(subType) {
  const cat = props.mainCat;
  const loc = props.location;
  const item = props.stockData[loc]?.[cat];
  return parseInt(item?.details?.[subType], 10) || 0;
}

function getQty(cat, loc) {
  const item = props.stockData[loc]?.[cat];
  if (!item) return 0;
  const detailMode = getCardDetailMode(cat);
  if ((detailMode === "color" || detailMode === "hala") && item.details && Object.keys(item.details).length > 0) {
    return Object.values(item.details).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  }
  return parseInt(item.quantity, 10) || 0;
}

const totalBarcodeCount = computed(() => {
  if (activeModalTab.value) {
    return getSubQty(activeModalTab.value);
  }
  return getQty(props.mainCat, props.location);
});

const totalCategoryCount = computed(() => {
  return getQty(props.mainCat, props.location);
});

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

const filteredBarcodes = computed(() => {
  const queryStr = barcodeSearchQuery.value.trim().toUpperCase();
  if (!queryStr) return allBarcodes.value;
  return allBarcodes.value.filter((b) => 
    b.barcode && b.barcode.toUpperCase().includes(queryStr)
  );
});

const totalFilteredCount = computed(() => filteredBarcodes.value.length);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalFilteredCount.value / pageSize.value));
});

const paginatedBarcodes = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredBarcodes.value.slice(start, start + pageSize.value);
});

const rangeStart = computed(() => {
  if (totalFilteredCount.value === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const rangeEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, totalFilteredCount.value);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
});

function goToPage(page) {
  if (typeof page === "number" && page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function handlePageSizeChange() {
  currentPage.value = 1;
}

function selectModalTab(tabKey) {
  activeModalTab.value = tabKey;
  barcodeSearchQuery.value = "";
  currentPage.value = 1;
  if (props.location !== "barang-display") {
    loadBarcodesForTab();
  }
}

async function loadBarcodesForTab(force = false) {
  const cat = props.mainCat;
  const loc = props.location;
  const subType = activeModalTab.value || null;
  const detailMode = getCardDetailMode(cat);
  const hasDetails = detailMode === "color" || detailMode === "hala";

  if (!cat || !loc || loc === "barang-display") {
    allBarcodes.value = [];
    return;
  }

  const cacheKey = `${cat}:${loc}:${subType || 'default'}`;
  const currentLastUpdated = props.stockData[loc]?.[cat]?.lastUpdated || "";
  const currentQty = subType ? getSubQty(subType) : getQty(cat, loc);

  const cachedData = barcodeCache.value[cacheKey];
  const isCacheValid = !force && cachedData && 
                       cachedData.lastUpdated === currentLastUpdated &&
                       cachedData.quantity === currentQty &&
                       Array.isArray(cachedData.items);

  if (isCacheValid) {
    allBarcodes.value = cachedData.items;
    currentPage.value = 1;
    return;
  }

  loadingBarcodes.value = true;
  try {
    let q;
    if (hasDetails) {
      q = query(
        collection(db, "floors", props.activeFloor, "barcodes"),
        where("category", "==", cat),
        where("location", "==", loc),
        where("detailType", "==", subType),
        limit(1000)
      );
    } else {
      q = query(
        collection(db, "floors", props.activeFloor, "barcodes"),
        where("category", "==", cat),
        where("location", "==", loc),
        limit(1000)
      );
    }

    const snaps = await getDocs(q);
    const items = [];
    snaps.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });

    items.sort((a, b) => (a.barcode || "").localeCompare(b.barcode || ""));

    allBarcodes.value = items;
    currentPage.value = 1;

    barcodeCache.value[cacheKey] = {
      lastUpdated: currentLastUpdated,
      quantity: currentQty,
      items: items
    };
  } catch (e) {
    showError("Gagal memuat list barcode", e.message);
  } finally {
    loadingBarcodes.value = false;
  }
}

function handleBarcodeSearch() {
  currentPage.value = 1;
}

function clearBarcodeSearch() {
  barcodeSearchQuery.value = "";
  currentPage.value = 1;
}

async function copyAllBarcodes() {
  const cat = props.mainCat;
  const loc = props.location;

  if (!cat || !loc) return;

  if (allBarcodes.value.length === 0) {
    toast("Tidak ada barcode untuk disalin", "warning");
    return;
  }

  copyingAll.value = true;
  try {
    const list = allBarcodes.value.map((b) => b.barcode).filter(Boolean);

    if (list.length === 0) {
      toast("Tidak ada barcode untuk disalin", "warning");
      return;
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

async function handleRevertBarcode(barcodeId) {
  const result = await confirm({
    title: "Batalkan Mutasi Barcode?",
    text: `Mengembalikan barcode ${barcodeId} ke lokasi sebelumnya, atau menghapusnya jika belum ada lokasi sebelumnya. Lanjutkan?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Batalkan",
    cancelButtonText: "Batal"
  });

  if (!result.isConfirmed) return;

  revertingBarcode.value = barcodeId;
  try {
    await revertSingleBarcode({ barcodeId, floorId: props.activeFloor });
    toast(`Barcode ${barcodeId} berhasil dibatalkan/diubah.`);

    // 1. Hapus barcode dari list tampilan lokal instan
    allBarcodes.value = allBarcodes.value.filter((b) => b.barcode !== barcodeId);

    // 2. Adjust currentPage if needed
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }

    // 3. Bersihkan cache lokal untuk page rincian barcode agar sinkron
    const cat = props.mainCat;
    const loc = props.location;
    const subType = activeModalTab.value || null;
    const cacheKey = `${cat}:${loc}:${subType || 'default'}`;
    if (barcodeCache.value[cacheKey]) {
      barcodeCache.value[cacheKey].items = allBarcodes.value;
      barcodeCache.value[cacheKey].quantity = allBarcodes.value.length;
    }

    // 4. Emit event to parent to reload main stockData & sync database state
    emit("reverted", { barcodeId, category: cat, location: loc, subType });

  } catch (e) {
    showError("Gagal membatalkan barcode", e.message);
  } finally {
    revertingBarcode.value = "";
  }
}

// Watch location/category changes to reset and load fresh data
watch(
  () => [props.location, props.mainCat],
  () => {
    barcodeSearchQuery.value = "";
    barcodeCache.value = {};
    currentPage.value = 1;
    allBarcodes.value = [];

    if (modalTabs.value.length > 0) {
      const firstWithStock = modalTabs.value.find(tab => getSubQty(tab.key) > 0);
      activeModalTab.value = firstWithStock ? firstWithStock.key : modalTabs.value[0].key;
    } else {
      activeModalTab.value = "";
    }

    if (props.location && props.location !== "barang-display") {
      loadBarcodesForTab();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%) !important;
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
.pagination .page-link {
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #495057;
  transition: all 0.15s ease-in-out;
}
.pagination .page-link:hover:not(:disabled) {
  background-color: #e9ecef;
  color: #0d6efd;
}
.pagination .page-item.active .page-link {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: #fff;
  box-shadow: 0 2px 6px rgba(13, 110, 253, 0.3);
}
.pagination .page-item.disabled .page-link {
  opacity: 0.5;
  background-color: #f8f9fa;
  border-color: rgba(0, 0, 0, 0.05);
}
.shadow-xs {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
</style>
