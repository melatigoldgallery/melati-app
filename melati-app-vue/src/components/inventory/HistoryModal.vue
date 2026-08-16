<template>
  <div class="modal fade" id="historyModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
        <div class="modal-header py-3 bg-info text-white border-0">
          <h6 class="modal-title fw-bold">
            <i class="bi bi-clock-history me-2"></i>
            Riwayat - {{ mainCat }} / {{ subLabel }}
          </h6>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4 bg-light-subtle">
          <div v-if="filteredHistoryList.length === 0" class="text-center text-muted py-5">
            <i class="bi bi-journal-x fs-2 d-block mb-2 opacity-50"></i>
            <span>Belum ada riwayat update untuk lokasi ini.</span>
          </div>
          <div v-else>
            <div class="table-responsive border rounded-3 bg-white shadow-sm custom-scrollbar" style="max-height: 450px; overflow-y: auto;">
              <table class="table table-striped table-hover align-middle mb-0">
                <thead class="table-light border-bottom">
                  <tr>
                    <th class="ps-3 text-secondary small fw-semibold" style="width: 50px;">No</th>
                    <th class="text-secondary small fw-semibold" style="width: 160px;">Tanggal</th>
                    <th class="text-secondary small fw-semibold text-center" style="width: 120px;">Jumlah</th>
                    <th class="text-secondary small fw-semibold" style="width: 140px;">Staff</th>
                    <th class="pe-3 text-secondary small fw-semibold">Catatan / Detail Mutasi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in filteredHistoryList.slice(0, 25)" :key="i">
                    <td class="ps-3 text-muted small fw-medium">{{ i + 1 }}</td>
                    <td class="text-muted small">
                      <span class="d-inline-flex align-items-center gap-1.5">
                        <i class="bi bi-calendar3 opacity-75"></i>
                        {{ formatDate(h.date) }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-secondary px-2.5 py-1.5 rounded fw-bold fs-7 shadow-sm">
                        {{ formatHistoryQty(h) }}
                      </span>
                    </td>
                    <td class="fw-semibold text-dark">{{ h.petugas || "-" }}</td>
                    <td class="pe-3">
                      <div class="fw-bold text-dark-emphasis mb-1" style="font-size: 0.9rem;">
                        {{ formatHistoryNote(h) }}
                        <span v-if="getHistoryFlow(h)" class="badge bg-success-subtle text-success border ms-2" style="font-size: 0.72rem;">
                          <i class="bi bi-arrow-left-right me-1"></i>
                          {{ getHistoryFlow(h) }}
                        </span>
                      </div>
                      <div v-if="h.barcodes && h.barcodes.length" class="d-flex flex-wrap gap-1.5 align-items-center mt-1">
                        <span 
                          v-if="getHistoryRecordClassification(mainCat, h)"
                          :class="getHistoryRecordBadgeClass(mainCat, h)"
                          :style="getHistoryRecordBadgeStyle(mainCat, h)"
                        >
                          {{ getHistoryRecordClassification(mainCat, h) }}
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
                          v-if="h.barcodes.length > 5" 
                          class="badge bg-secondary-subtle text-secondary border fw-semibold"
                          style="font-size: 0.7rem;"
                        >
                          +{{ h.barcodes.length - 5 }} lagi
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3 text-muted small">
              <span>Menampilkan maksimal 25 riwayat terbaru.</span>
              <span v-if="isFetchingLogs" class="d-inline-flex align-items-center gap-1.5 text-primary fw-semibold">
                <span class="spinner-border spinner-border-sm" role="status" style="width: 0.85rem; height: 0.85rem;"></span>
                Menyelaraskan log barcode...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { getCardDetailMode } from "@/services/inventory-service";

const props = defineProps({
  mainCat: { type: String, default: "" },
  subLabel: { type: String, default: "" },
  historyList: { type: Array, default: () => [] },
  colorLabels: { type: Object, default: () => ({}) },
  halaLabels: { type: Object, default: () => ({}) },
  activeFloor: { type: String, default: "" },
});

const mutationLogsCache = ref([]);
const isFetchingLogs = ref(false);

const filteredHistoryList = computed(() => {
  return (props.historyList || []).filter(h => {
    const petugas = String(h.petugas || "").toLowerCase();
    const keterangan = String(h.keterangan || "").toLowerCase();
    const isSync = petugas.includes("sync") || petugas.includes("desktop") || keterangan.includes("sync") || keterangan.includes("kasir desktop");
    return !isSync;
  });
});

function getSubDocLabel(key) {
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

function getBarcodeKey(bc) {
  return typeof bc === "object" ? bc.barcode : bc;
}

function getTypeLabel(mainCat, key) {
  const detailMode = getCardDetailMode(mainCat);
  if (detailMode === "color") return props.colorLabels[key] || key;
  if (detailMode === "hala") return props.halaLabels[key] || key;
  return key;
}

function getFallbackDetailType(mainCat, code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const detailMode = getCardDetailMode(mainCat);
  
  if (detailMode === "color") {
    const types = ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"]; // base fallback
    if (cleanCode.includes("-")) {
      const parts = cleanCode.split("-");
      if (parts.length >= 3) {
        const parsedType = parts[parts.length - 2];
        if (types.includes(parsedType)) return parsedType;
      }
    }
    for (const key of types) {
      if (cleanCode.includes(key)) return key;
    }
    return "PUTIH";
  }
  
  if (detailMode === "hala") {
    const types = ["KA", "LA", "AN", "CA", "SA", "GA"]; // base fallback
    if (cleanCode.includes("-")) {
      const parts = cleanCode.split("-");
      if (parts.length >= 3) {
        const parsedType = parts[parts.length - 2];
        if (types.includes(parsedType)) return parsedType;
      }
    }
    for (const key of types) {
      const parts = [`-${key}-`, key];
      if (parts.some(p => cleanCode.includes(p))) return key;
    }
    return "KA";
  }
  return "";
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
  const prefix = detailMode === "hala" ? "Jenis" : "Barcode";
  return `${prefix}: ${label}`;
}

function getHistoryRecordDetailType(mainCat, record) {
  if (!record?.barcodes || !record.barcodes.length) return "";
  const firstBc = record.barcodes[0];
  let detailType = "";
  if (typeof firstBc === "object") {
    detailType = firstBc.detailType;
  } else {
    detailType = getFallbackDetailType(mainCat, firstBc);
  }
  return detailType ? String(detailType).trim().toUpperCase() : "";
}

function getHistoryRecordBadgeClass(mainCat, record) {
  const detailMode = getCardDetailMode(mainCat);
  const detailType = getHistoryRecordDetailType(mainCat, record);
  const baseClass = "badge fw-bold border";

  if (detailMode === "color") {
    switch (detailType) {
      case "PUTIH":
        return `${baseClass} bg-light text-dark`;
      case "BIRU":
        return `${baseClass} bg-primary text-white border-primary`;
      case "KUNING":
        return `${baseClass} bg-warning text-dark border-warning`;
      case "HIJAU":
        return `${baseClass} bg-success text-white border-success`;
      case "PINK":
        return baseClass;
      default:
        return `${baseClass} bg-light text-dark`;
    }
  }
  return `${baseClass} bg-light text-dark`;
}

function getHistoryRecordBadgeStyle(mainCat, record) {
  const detailMode = getCardDetailMode(mainCat);
  const detailType = getHistoryRecordDetailType(mainCat, record);

  if (detailMode === "color") {
    if (detailType === "PINK") {
      return "font-size: 0.7rem; background-color: #fce4ec !important; border-color: #f8bbd0 !important; color: #c2185b !important;";
    }
    if (detailType === "PUTIH") {
      return "font-size: 0.7rem; border-color: #dee2e6 !important;";
    }
    if (["BIRU", "KUNING", "HIJAU"].includes(detailType)) {
      return "font-size: 0.7rem;";
    }
  }
  return "font-size: 0.7rem; border-color: rgba(13, 202, 240, 0.4) !important;";
}

function formatHistoryQty(record) {
  if (record.oldQuantity !== undefined && record.newQuantity !== undefined) {
    return `${parseInt(record.oldQuantity, 10) || 0} → ${parseInt(record.newQuantity, 10) || 0}`;
  }
  return `${parseInt(record.quantity, 10) || 0}`;
}

function formatHistoryNote(record) {
  let base = (record.keterangan || "-").toUpperCase();
  base = base.replace(/PEMBATALAN MUTASI BARCODE/g, "BATAL PEMINDAHAN BARCODE");
  if (!record.items || !Array.isArray(record.items) || !record.items.length) return base;
  const summaryText = record.items
    .filter((it) => (parseInt(it.quantity, 10) || 0) !== 0)
    .map((it) => `${it.jewelryName || it.jewelryType}: ${parseInt(it.oldQuantity, 10) || 0} → ${parseInt(it.newQuantity, 10) || 0}`)
    .join(", ");
  if (!summaryText) return base;
  return `${summaryText} | ${base}`;
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

function findMatchedMutationLog(h) {
  if (!h.barcodes || !h.barcodes.length) return null;
  const hTime = new Date(h.date).getTime();
  const hBarcodesSet = new Set(h.barcodes.map(getBarcodeKey));
  
  let bestMatch = null;
  let minDiff = Infinity;
  
  for (const log of mutationLogsCache.value) {
    const logBarcodes = log.barcodeIds || (log.barcodes ? log.barcodes.map(b => b.barcode) : []);
    const hasOverlap = logBarcodes.some(bc => hBarcodesSet.has(bc));
    
    if (hasOverlap) {
      const logTime = log.timestamp?.toDate ? log.timestamp.toDate().getTime() : new Date(log.timestamp || 0).getTime();
      const diff = Math.abs(hTime - logTime);
      
      // Matching within 30 seconds
      if (diff < 30000 && diff < minDiff) {
        minDiff = diff;
        bestMatch = log;
      }
    }
  }
  return bestMatch;
}

function getHistoryFlow(h) {
  if (h.origin && h.destination) {
    return `${getSubDocLabel(h.origin)} → ${getSubDocLabel(h.destination)}`;
  }
  const matched = findMatchedMutationLog(h);
  if (matched) {
    return `${getSubDocLabel(matched.origin)} → ${getSubDocLabel(matched.destination)}`;
  }
  return "";
}

// Watcher to fetch mutation logs from Firestore on history list load
watch(
  () => [filteredHistoryList.value, props.activeFloor],
  async () => {
    const list = filteredHistoryList.value;
    if (!list || !list.length || !props.activeFloor) return;

    const needFetch = list.some(h => h.barcodes?.length > 0 && (!h.origin || !h.destination));
    if (needFetch && mutationLogsCache.value.length === 0 && !isFetchingLogs.value) {
      isFetchingLogs.value = true;
      try {
        const q = query(
          collection(db, "floors", props.activeFloor, "barcodeMutationLogs"),
          where("category", "==", props.mainCat),
          orderBy("timestamp", "desc"),
          limit(20)
        );
        const snaps = await getDocs(q);
        const fetched = [];
        snaps.forEach((doc) => {
          const data = doc.data();
          const pemindah = String(data.pemindah || "").toLowerCase();
          const notes = String(data.notes || "").toLowerCase();
          const isSync = pemindah.includes("sync") || pemindah.includes("desktop") || notes.includes("sync") || notes.includes("kasir desktop");
          if (!isSync) {
            fetched.push({ id: doc.id, ...data });
          }
        });
        mutationLogsCache.value = fetched;
      } catch (e) {
        console.warn("Gagal memuat log mutasi untuk riwayat:", e);
      } finally {
        isFetchingLogs.value = false;
      }
    }
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #0dcaf0 0%, #0aa2c0 100%) !important;
  color: #fff;
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
