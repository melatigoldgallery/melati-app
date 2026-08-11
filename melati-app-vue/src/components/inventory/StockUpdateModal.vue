<template>
  <div class="modal fade" id="stockUpdateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog" :class="{ 'modal-md': detailMode !== 'default', 'modal-dialog-centered': true }">
      <div class="modal-content border-0 shadow-lg rounded-3">
        <form @submit.prevent="submitForm">
          <div class="modal-header py-3 bg-success text-white border-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-pencil-square me-2"></i>
              Update Stok: {{ mainCat }}
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Jenis & Lokasi</label>
              <input
                class="form-control form-control-sm border-2 rounded-2 bg-light text-dark fw-semibold"
                :value="`${mainCat} - ${subLabel}`"
                readonly
              />
            </div>

            <!-- 1. Default Simple Quantity Input -->
            <div v-if="detailMode === 'default'" class="mb-3">
              <label class="form-label small fw-bold text-secondary">Jumlah Stok Fisik</label>
              <input
                v-model.number="quantity"
                type="number"
                min="0"
                class="form-control form-control-sm border-2 rounded-2"
                required
              />
            </div>

            <!-- 2. Color Breakdown Table -->
            <div v-else-if="detailMode === 'color'" class="table-responsive mb-3 border rounded-2 bg-white">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3 text-secondary small fw-semibold">Warna</th>
                    <th class="text-center text-secondary small fw-semibold" style="width: 120px;">Stok Saat Ini</th>
                    <th class="pe-3 text-secondary small fw-semibold" style="width: 120px;">Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ct in Object.keys(details)" :key="ct">
                    <td class="ps-3 fw-medium text-dark">{{ colorLabels[ct] || `${ct} (Lainnya)` }}</td>
                    <td class="text-center text-muted fw-semibold">{{ originalDetails[ct] ?? 0 }}</td>
                    <td class="pe-3">
                      <input
                        v-model.number="details[ct]"
                        type="number"
                        min="0"
                        class="form-control form-control-sm text-center border-2 rounded-2"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 3. Hala Breakdown Table -->
            <div v-else-if="detailMode === 'hala'" class="table-responsive mb-3 border rounded-2 bg-white">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3 text-secondary small fw-semibold">Jenis Perhiasan</th>
                    <th class="text-center text-secondary small fw-semibold" style="width: 120px;">Stok Saat Ini</th>
                    <th class="pe-3 text-secondary small fw-semibold" style="width: 120px;">Update</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ht in Object.keys(details)" :key="ht">
                    <td class="ps-3 fw-medium text-dark">{{ halaLabels[ht] || `${ht} (Lainnya)` }}</td>
                    <td class="text-center text-muted fw-semibold">{{ originalDetails[ht] ?? 0 }}</td>
                    <td class="pe-3">
                      <input
                        v-model.number="details[ht]"
                        type="number"
                        min="0"
                        class="form-control form-control-sm text-center border-2 rounded-2"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Petugas</label>
              <select v-model="petugas" class="form-select form-select-sm border-2 rounded-2" required>
                <option value="">-- Pilih Nama Staff --</option>
                <option v-for="staff in staffOptions" :key="`staff-${staff}`" :value="staff">
                  {{ staff }}
                </option>
              </select>
            </div>

            <div class="mb-2">
              <label class="form-label small fw-bold text-secondary">Keterangan / Catatan</label>
              <select v-model="keterangan" class="form-select form-select-sm border-2 rounded-2" required>
                <option value="">-- Pilih Keterangan --</option>
                <option v-for="opt in keteranganOpts" :key="`keterangan-${opt}`" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer py-2 border-0 bg-light-subtle">
            <button
              type="button"
              class="btn btn-secondary btn-sm rounded-pill px-3"
              data-bs-dismiss="modal"
              :disabled="saving"
            >
              Batal
            </button>
            <button class="btn btn-success btn-sm rounded-pill px-4" :disabled="saving">
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
import { ref, watch } from "vue";
import { useAlert } from "@/composables/useAlert";

const props = defineProps({
  mainCat: { type: String, default: "" },
  subDoc: { type: String, default: "" },
  subLabel: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  originalDetails: { type: Object, default: () => ({}) },
  detailMode: { type: String, default: "default" },
  colorLabels: { type: Object, default: () => ({}) },
  halaLabels: { type: Object, default: () => ({}) },
  staffOptions: { type: Array, default: () => [] },
  keteranganOpts: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(["submit"]);
const { toast } = useAlert();

const quantity = ref(0);
const details = ref({});
const petugas = ref("");
const keterangan = ref("");

// Reset local states to copy props when a different record is loaded
watch(
  () => [props.subDoc, props.mainCat, props.quantity, props.originalDetails],
  () => {
    quantity.value = props.quantity;
    details.value = props.originalDetails ? { ...props.originalDetails } : {};
    petugas.value = "";
    keterangan.value = "";
  },
  { deep: true, immediate: true }
);

function hasChanges() {
  if (props.detailMode === "default") {
    return true; // Simple update will be committed as long as form is valid
  }
  return Object.keys(details.value).some((key) => {
    return (parseInt(details.value[key], 10) || 0) !== (parseInt(props.originalDetails?.[key], 10) || 0);
  });
}

function submitForm() {
  if (!petugas.value.trim()) {
    return toast("Petugas wajib diisi", "warning");
  }
  if (!keterangan.value) {
    return toast("Keterangan wajib dipilih", "warning");
  }
  if (!hasChanges()) {
    return toast("Tidak ada perubahan data", "warning");
  }

  emit("submit", {
    quantity: quantity.value,
    details: details.value,
    petugas: petugas.value.trim(),
    keterangan: keterangan.value,
  });
}
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
}
.modal-header .btn-close {
  filter: invert(1);
}
</style>
