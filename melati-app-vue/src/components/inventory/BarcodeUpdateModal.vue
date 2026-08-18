<template>
  <div class="modal fade" id="barcodeUpdateModal" ref="modalRef" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-3">
        <form @submit.prevent="submitBarcodeUpdate" @keydown.enter="handleBarcodeFormEnter">
          <div class="modal-header py-3 bg-primary text-white border-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-qr-code-scan me-2"></i>
              <span v-if="isQuickScan">Scan Cepat Barcode<span v-if="detectedMainCat">: {{ detectedMainCat }}</span></span>
              <span v-else>Update Barcode: {{ mainCat }} - {{ subLabel }}</span>
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Scan / Paste Barcode</label>
              <textarea
                v-model="barcodes"
                class="form-control form-control-sm border-2 rounded-2"
                rows="4"
                placeholder="Scan barcode satu-persatu atau paste list barcode di sini (pisahkan dengan spasi/enter)..."
                required
              ></textarea>
              <div class="d-flex justify-content-between align-items-center mt-1">
                <div class="form-text text-muted small mb-0">Masukkan satu atau beberapa barcode sekaligus.</div>
                <span v-if="barcodeCount > 0" class="badge bg-primary rounded-pill px-3 py-1.5 shadow-sm">
                  <i class="bi bi-qr-code me-1"></i>
                  {{ barcodeCount }} Barcode
                </span>
              </div>
            </div>

            <!-- Dropdown Klasifikasi Dinamis -->
            <div v-if="currentDetailOptions.length > 0" class="mb-3">
              <label class="form-label small fw-bold text-secondary">
                {{ hasNewBarcode ? 'Klasifikasi Warna / Jenis (Wajib untuk Barcode Baru)' : 'Ubah Klasifikasi Warna / Jenis (Opsional)' }}
              </label>
              <select v-model="detailType" class="form-select form-select-sm border-2 rounded-2" :required="hasNewBarcode">
                <option value="">{{ hasNewBarcode ? '-- Pilih Klasifikasi --' : '-- Tetap (Tidak Ada Perubahan) --' }}</option>
                <option v-for="opt in currentDetailOptions" :key="`classif-${opt}`" :value="opt">
                  {{ getDetailLabel(opt) }}
                </option>
              </select>
              <div class="form-text text-muted small mt-1">
                <i class="bi bi-info-circle text-info me-1"></i>
                {{ hasNewBarcode ? 'Wajib diisi untuk barcode baru agar terdaftar ke kelompok yang benar.' : 'Pilih jika ingin memindahkan/mengoreksi barcode yang terdaftar salah.' }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Lokasi Tujuan</label>
              <select v-model="destination" class="form-select form-select-sm border-2 rounded-2" required>
                <option value="">-- Pilih Lokasi Tujuan --</option>
                <option v-for="row in tableRows" :key="`dest-${row.key}`" :value="row.key">
                  {{ row.label }}
                </option>
                <option value="mutasi">Mutasi</option>
              </select>
              <div class="form-text text-muted small mt-1">
                <i class="bi bi-info-circle text-info me-1"></i>
                Sistem akan mendeteksi lokasi asal masing-masing barcode secara otomatis dari database.
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Petugas</label>
              <select v-model="petugas" class="form-select form-select-sm border-2 rounded-2" required>
                <option value="">-- Pilih Nama Staff --</option>
                <option v-for="staff in staffOptions" :key="`barcode-staff-${staff}`" :value="staff">
                  {{ staff }}
                </option>
              </select>
            </div>

            <div class="mb-2">
              <label class="form-label small fw-bold text-secondary">Catatan / Keterangan</label>
              <select v-model="keterangan" class="form-select form-select-sm border-2 rounded-2">
                <option value="">-- Pilih Keterangan --</option>
                <option v-for="opt in keteranganOpts" :key="`ket-opt-${opt}`" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>

            <div v-if="barcodeStatus" class="alert alert-info py-2 px-3 mt-3 small border-0 rounded-2 d-flex align-items-center gap-2">
              <div class="spinner-border spinner-border-sm text-info" role="status" v-if="saving || checkingBarcodes"></div>
              <span>{{ barcodeStatus }}</span>
            </div>
          </div>
          <div class="modal-footer py-2 border-0 bg-light-subtle">
            <button type="button" class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal" :disabled="saving">
              Batal
            </button>
            <button class="btn btn-primary btn-sm rounded-pill px-4" :disabled="saving || checkingBarcodes">
              <span class="spinner-border spinner-border-sm me-1" role="status" v-if="saving"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import {
  parseBarcodes,
  executeBarcodeMutation,
  submitBarcodeMoveRequest,
  checkBarcodesStatus,
  parseBarcodeDetails
} from "@/services/barcode-service";
import { getCardDetailMode } from "@/services/inventory-service";

const props = defineProps({
  mainCat: { type: String, default: "" },
  subDoc: { type: String, default: "" },
  subLabel: { type: String, default: "" },
  isQuickScan: { type: Boolean, default: false },
  tableRows: { type: Array, default: () => [] },
  staffOptions: { type: Array, default: () => [] },
  keteranganOpts: { type: Array, default: () => [] },
  colorTypes: { type: Array, default: () => [] },
  colorLabels: { type: Object, default: () => ({}) },
  halaTypes: { type: Array, default: () => [] },
  halaLabels: { type: Object, default: () => ({}) },
  activeFloor: { type: String, default: "" },
  userRole: { type: String, default: "" },
  enableMutationQueue: { type: Boolean, default: false },
});

const emit = defineEmits(["success"]);
const { toast, error: showError, swal } = useAlert();

const barcodes = ref("");
const modalRef = ref(null);
const destination = ref("");
const petugas = ref("");
const keterangan = ref("");
const detailType = ref("");
const saving = ref(false);
const barcodeStatus = ref(null);

const detectedMainCat = ref("");

const barcodeCount = computed(() => {
  return parseBarcodes(barcodes.value).length;
});

const currentDetailOptions = computed(() => {
  const activeCat = props.isQuickScan ? detectedMainCat.value : props.mainCat;
  if (!activeCat) return [];
  const detailMode = getCardDetailMode(activeCat);
  if (detailMode === "color") return props.colorTypes;
  if (detailMode === "hala") return props.halaTypes;
  return [];
});

function getDetailLabel(opt) {
  const activeCat = props.isQuickScan ? detectedMainCat.value : props.mainCat;
  return getTypeLabel(activeCat, opt);
}

function getTypeLabel(mainCat, key) {
  const activeCat = props.isQuickScan ? detectedMainCat.value : mainCat;
  const detailMode = getCardDetailMode(activeCat);
  if (detailMode === "color") return props.colorLabels[key] || key;
  if (detailMode === "hala") return props.halaLabels[key] || key;
  return key;
}

function getFallbackDetailType(mainCat, code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const detailMode = getCardDetailMode(mainCat);
  
  if (detailMode === "color") {
    const types = props.colorTypes;
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
    return types[2] || "PUTIH";
  }
  
  if (detailMode === "hala") {
    const types = props.halaTypes;
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
    return types[0] || "KA";
  }
  return "";
}

const checkingBarcodes = ref(false);
const hasNewBarcode = ref(false);
const checkedBarcodesList = ref([]);

// Reset modal state when triggered with a new location/category
watch(
  () => [props.subDoc, props.mainCat, props.isQuickScan],
  () => {
    barcodes.value = "";
    destination.value = props.isQuickScan ? "" : (props.subDoc || "");
    petugas.value = "";
    keterangan.value = "";
    detailType.value = "";
    barcodeStatus.value = null;
    hasNewBarcode.value = false;
    checkedBarcodesList.value = [];
    detectedMainCat.value = "";
  }
);

// Watcher barcode scanners (debounce 600ms)
let checkTimeout = null;
watch(
  () => barcodes.value,
  (newVal) => {
    if (checkTimeout) clearTimeout(checkTimeout);
    const parsed = parseBarcodes(newVal);
    if (parsed.length === 0) {
      hasNewBarcode.value = false;
      checkedBarcodesList.value = [];
      barcodeStatus.value = null;
      detectedMainCat.value = "";
      return;
    }

    barcodeStatus.value = "Memeriksa status barcode...";
    checkTimeout = setTimeout(async () => {
      // 1. Deteksi duplikat input client-side
      const seen = new Set();
      const duplicates = [];
      parsed.forEach((bc) => {
        if (seen.has(bc)) {
          duplicates.push(bc);
        } else {
          seen.add(bc);
        }
      });

      if (duplicates.length > 0) {
        toast(`Barcode ${duplicates[0]} sudah discan!`, "warning");
        const uniqueParsed = [...seen];
        barcodes.value = uniqueParsed.join("\n") + "\n";
        return;
      }

      // 2. Cek status database
      checkingBarcodes.value = true;
      try {
        const res = await checkBarcodesStatus(parsed, props.activeFloor);
        if (res && Array.isArray(res.results)) {
          checkedBarcodesList.value = res.results;
          hasNewBarcode.value = res.results.some(item => !item.exists);

          let activeCategory = props.mainCat;

          if (props.isQuickScan) {
            // Resolve mainCat for each barcode
            const categories = res.results.map(item => {
              if (item.exists && item.category) return item.category;
              const parsedDetails = parseBarcodeDetails(item.barcode);
              return parsedDetails.mainCat;
            });
            const uniqueCategories = [...new Set(categories.filter(Boolean))];

            if (uniqueCategories.length > 1) {
              toast(`Gagal: Barcode berasal dari kategori berbeda (${uniqueCategories.join(", ")}). Harus dalam kategori yang sama!`, "warning");
              barcodeStatus.value = `Gagal: Campuran kategori (${uniqueCategories.join(", ")}).`;
              detectedMainCat.value = "";
              return;
            } else if (uniqueCategories.length === 1) {
              detectedMainCat.value = uniqueCategories[0];
              activeCategory = uniqueCategories[0];
            } else {
              detectedMainCat.value = "";
              activeCategory = "";
            }
          }

          // 3. Deteksi jika sudah ada di lokasi tujuan
          const dest = destination.value;
          if (dest) {
            const alreadyInDest = res.results.find(item => {
              if (!item.exists || item.location !== dest) return false;
              if (detailType.value && item.detailType !== detailType.value) {
                return false;
              }
              return true;
            });
            if (alreadyInDest) {
              toast(`Barcode ${alreadyInDest.barcode} sudah berada di lokasi tujuan (${getTypeLabel(activeCategory, alreadyInDest.location)})`, "warning");
              barcodeStatus.value = `Gagal: Barcode ${alreadyInDest.barcode} sudah berada di lokasi tujuan.`;
              return;
            }
          }

          // 4. Deteksi ketidakcocokan kategori
          if (!props.isQuickScan && activeCategory) {
            const mismatchedItem = res.results.find(item => item.exists && item.category && item.category !== activeCategory);
            if (mismatchedItem) {
              toast(`Barcode ${mismatchedItem.barcode} tidak sesuai dengan jenis (${activeCategory}). Barcode ini terdaftar sebagai ${mismatchedItem.category}!`, "warning");
              const cleanParsed = parsed.filter(bc => bc !== mismatchedItem.barcode);
              barcodes.value = cleanParsed.join("\n");
              return;
            }
          }

          // 5. Auto-default classification
          if (!detailType.value && parsed.length > 0 && activeCategory) {
            const detected = getFallbackDetailType(activeCategory, parsed[0]);
            if (detected) {
              detailType.value = detected;
            }
          }
          barcodeStatus.value = `Valid: Ready to update ${parsed.length} barcode.`;
        }
      } catch (err) {
        hasNewBarcode.value = true;
        barcodeStatus.value = `Gagal memeriksa database: ${err.message}`;
      } finally {
        checkingBarcodes.value = false;
      }
    }, 600);
  }
);

function handleBarcodeFormEnter(event) {
  if (document.querySelector(".swal2-container")) return;
  if (event.target.tagName === "TEXTAREA") return;
  if (event.target.tagName === "BUTTON" && event.target.type !== "button") return;
  event.preventDefault();
}

async function submitBarcodeUpdate() {
  if (document.querySelector(".swal2-container")) return;
  if (!petugas.value.trim()) return toast("Petugas wajib diisi", "warning");
  if (!destination.value) return toast("Lokasi tujuan wajib dipilih", "warning");
  if (!barcodes.value.trim()) return toast("Barcode tidak boleh kosong", "warning");
  
  if (currentDetailOptions.value.length > 0 && hasNewBarcode.value && !detailType.value) {
    return toast("Klasifikasi warna/jenis wajib dipilih", "warning");
  }

  const barcodesArray = parseBarcodes(barcodes.value);
  if (barcodesArray.length === 0) return toast("Tidak ada barcode yang valid", "warning");

  const activeCategory = props.isQuickScan ? detectedMainCat.value : props.mainCat;
  if (!activeCategory) {
    return toast(props.isQuickScan ? "Silakan scan barcode terlebih dahulu dengan kategori/jenis perhiasan yang sama" : "Kategori/jenis perhiasan tidak valid", "warning");
  }

  const dest = destination.value;
  const alreadyInDest = checkedBarcodesList.value.find(item => {
    if (!item.exists || item.location !== dest) return false;
    if (detailType.value && item.detailType !== detailType.value) {
      return false;
    }
    return true;
  });
  if (alreadyInDest) {
    return swal(`Gagal: Barcode ${alreadyInDest.barcode} sudah berada di lokasi tujuan`, "warning");
  }

  const mismatchedItem = checkedBarcodesList.value.find(item => item.exists && item.category && item.category !== activeCategory);
  if (mismatchedItem) {
    return swal(`Gagal: Barcode ${mismatchedItem.barcode} tidak sesuai dengan jenis (${activeCategory})`, "warning");
  }

  saving.value = true;
  barcodeStatus.value = `Memproses ${barcodesArray.length} barcode...`;
  try {
    const userRoleLower = props.userRole?.toLowerCase();
    const isSupervisor = ["supervisor", "admin", "input"].includes(userRoleLower);
    const shouldProcessDirectly = isSupervisor || !props.enableMutationQueue;

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
          origin: props.subDoc,
          destination: destination.value,
          pemindah: petugas.value.trim(),
          notes: keterangan.value?.trim() || "",
          floorId: props.activeFloor,
          defaultDetailType: detailType.value,
          category: activeCategory,
          allowCategoryOverride: true
        });
      }
      toast("Mutasi barcode berhasil diproses langsung.");
    } else {
      for (let i = 0; i < chunks.length; i++) {
        barcodeStatus.value = `Mengajukan ${barcodesArray.length} barcode (Bagian ${i + 1}/${chunks.length})...`;
        await submitBarcodeMoveRequest({
          barcodes: chunks[i],
          origin: props.subDoc,
          destination: destination.value,
          pemindah: petugas.value.trim(),
          notes: keterangan.value?.trim() || "",
          floorId: props.activeFloor,
          defaultDetailType: detailType.value,
          category: activeCategory,
          allowCategoryOverride: true
        });
      }
      toast("Pengajuan mutasi barcode berhasil dikirim ke antrian.");
    }

    emit("success");
    // Close modal dynamically
    const el = document.getElementById("barcodeUpdateModal");
    if (el) {
      Modal.getInstance(el)?.hide();
    }
  } catch (e) {
    showError("Gagal memproses mutasi barcode", e.message);
    barcodeStatus.value = `Gagal: ${e.message}`;
  } finally {
    saving.value = false;
  }
}

const handleModalHidden = () => {
  barcodes.value = "";
  destination.value = props.isQuickScan ? "" : (props.subDoc || "");
  petugas.value = "";
  keterangan.value = "";
  detailType.value = "";
  barcodeStatus.value = null;
  hasNewBarcode.value = false;
  checkedBarcodesList.value = [];
  detectedMainCat.value = "";
};

onMounted(() => {
  if (modalRef.value) {
    modalRef.value.addEventListener("hidden.bs.modal", handleModalHidden);
  }
});

onUnmounted(() => {
  if (modalRef.value) {
    modalRef.value.removeEventListener("hidden.bs.modal", handleModalHidden);
  }
});
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #5966e0 0%, #4c63d2 100%) !important;
}
.modal-header .btn-close {
  filter: invert(1);
}
.monospace {
  font-family: var(--bs-font-monospace), monospace;
}
</style>
