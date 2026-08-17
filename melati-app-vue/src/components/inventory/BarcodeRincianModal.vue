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
            <div v-if="loadingBarcodes && barcodes.length === 0" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted small fw-semibold">Memuat daftar barcode...</p>
            </div>
            <div v-else :style="loadingBarcodes ? 'opacity: 0.55; pointer-events: none; transition: opacity 0.15s ease;' : 'transition: opacity 0.15s ease;'">
              <!-- Control Toolbar -->
              <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div>
                  <button 
                    class="btn btn-secondary btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2 shadow-sm transition-all hover-btn-scale"
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

              <!-- Barcodes empty list -->
              <div v-if="barcodes.length === 0" class="text-center py-5 border border-dashed rounded-4 bg-white shadow-sm">
                <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                <p class="text-secondary small mb-0">Tidak ada barcode terdaftar di lokasi/kategori ini.</p>
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
                      <tr v-for="(b, idx) in barcodes" :key="b.id" class="barcode-row transition-all">
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

                <!-- Pagination -->
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
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { collection, query, where, getDocs, limit, startAfter, orderBy } from "firebase/firestore";
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

function selectModalTab(tabKey) {
  activeModalTab.value = tabKey;
  barcodeSearchQuery.value = "";
  pageDocs.value = [];
  currentPage.value = 1;
  hasMore.value = false;
  if (props.location !== "barang-display") {
    loadBarcodePage(1);
  }
}

async function loadBarcodePage(pageNumber) {
  const cat = props.mainCat;
  const loc = props.location;
  const subType = activeModalTab.value || null;
  const detailMode = getCardDetailMode(cat);
  const hasDetails = detailMode === "color" || detailMode === "hala";
  const searchVal = barcodeSearchQuery.value.trim().toUpperCase();
  const isSearching = !!searchVal;

  if (!isSearching) {
    const cacheKey = `${cat}:${loc}:${subType || 'default'}`;
    const currentLastUpdated = props.stockData[loc]?.[cat]?.lastUpdated || "";
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
          collection(db, "floors", props.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          where("detailType", "==", subType),
          orderBy("barcode", "asc"),
          limit(pageSize)
        );
      } else {
        q = query(
          collection(db, "floors", props.activeFloor, "barcodes"),
          where("category", "==", cat),
          where("location", "==", loc),
          limit(pageSize)
        );
      }

      if (targetPage > 1 && pageDocs.value[targetPage - 2]) {
        if (hasDetails) {
          q = query(
            collection(db, "floors", props.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("detailType", "==", subType),
            orderBy("barcode", "asc"),
            startAfter(pageDocs.value[targetPage - 2]),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, "floors", props.activeFloor, "barcodes"),
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
          collection(db, "floors", props.activeFloor, "barcodes"),
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
          collection(db, "floors", props.activeFloor, "barcodes"),
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
            collection(db, "floors", props.activeFloor, "barcodes"),
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
            collection(db, "floors", props.activeFloor, "barcodes"),
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
            collection(db, "floors", props.activeFloor, "barcodes"),
            where("category", "==", cat),
            where("location", "==", loc),
            where("detailType", "==", subType),
            limit(1000)
          );
        } else {
          qFallback = query(
            collection(db, "floors", props.activeFloor, "barcodes"),
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

async function copyAllBarcodes() {
  const cat = props.mainCat;
  const loc = props.location;
  const subType = activeModalTab.value || null;
  const detailMode = getCardDetailMode(cat);
  const hasDetails = detailMode === "color" || detailMode === "hala";

  if (!cat || !loc) return;

  copyingAll.value = true;
  try {
    let q;
    if (hasDetails) {
      q = query(
        collection(db, "floors", props.activeFloor, "barcodes"),
        where("category", "==", cat),
        where("location", "==", loc),
        where("detailType", "==", subType),
        orderBy("barcode", "asc")
      );
    } else {
      q = query(
        collection(db, "floors", props.activeFloor, "barcodes"),
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
      list.sort();
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
    barcodes.value = barcodes.value.filter((b) => b.barcode !== barcodeId);

    // 2. Bersihkan cache lokal untuk page rincian barcode agar sinkron
    const cat = props.mainCat;
    const loc = props.location;
    const subType = activeModalTab.value || null;
    const cacheKey = `${cat}:${loc}:${subType || 'default'}`;
    if (barcodeCache.value[cacheKey]?.pages) {
      Object.keys(barcodeCache.value[cacheKey].pages).forEach((pg) => {
        const pgData = barcodeCache.value[cacheKey].pages[pg];
        if (pgData && Array.isArray(pgData.barcodes)) {
          pgData.barcodes = pgData.barcodes.filter((b) => b.barcode !== barcodeId);
        }
      });
    }

    // 3. Emit event to parent to reload main stockData & sync database state
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
    pageDocs.value = [];
    currentPage.value = 1;
    barcodes.value = [];
    hasMore.value = false;

    if (modalTabs.value.length > 0) {
      const firstWithStock = modalTabs.value.find(tab => getSubQty(tab.key) > 0);
      activeModalTab.value = firstWithStock ? firstWithStock.key : modalTabs.value[0].key;
    } else {
      activeModalTab.value = "";
    }

    if (props.location && props.location !== "barang-display") {
      loadBarcodePage(1);
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
</style>
