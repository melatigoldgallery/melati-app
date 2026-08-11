<template>
  <div class="modal fade" id="komputerUpdateModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog" :class="{ 'modal-sm': detailMode === 'default', 'modal-md': detailMode !== 'default', 'modal-dialog-centered': true }">
      <div class="modal-content border-0 shadow-lg rounded-3">
        <form @submit.prevent="submitForm">
          <div class="modal-header py-3 bg-primary text-white border-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-laptop me-2"></i>
              Update Stok Komputer: {{ mainCat }}
            </h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label small fw-bold text-secondary">Jenis Barang</label>
              <input
                class="form-control form-control-sm border-2 rounded-2 bg-light text-dark fw-semibold"
                :value="mainCat"
                readonly
              />
            </div>

            <!-- 1. Simple Computer Stock Update -->
            <div v-if="detailMode === 'default'" class="mb-2">
              <label class="form-label small fw-bold text-secondary">Jumlah</label>
              <input
                v-model.number="quantity"
                type="number"
                min="0"
                class="form-control form-control-sm border-2 rounded-2"
                required
              />
              <div class="form-text text-muted small mt-2">Update stok komputer tidak mencatat riwayat.</div>
            </div>

            <!-- 2. Color/Hala Breakdown Computer Stock Update -->
            <div v-else class="table-responsive border rounded-2 bg-white mb-2">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-3 text-secondary small fw-semibold">{{ detailLabel }}</th>
                    <th class="pe-3 text-secondary small fw-semibold" style="width: 140px;">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ct in detailTypes" :key="ct">
                    <td class="ps-3 fw-medium text-dark">{{ detailLabels[ct] || ct }}</td>
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
            <button class="btn btn-primary btn-sm rounded-pill px-4" :disabled="saving">
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
import { ref, watch, computed } from "vue";

const props = defineProps({
  mainCat: { type: String, default: "" },
  detailMode: { type: String, default: "default" },
  quantity: { type: Number, default: 0 },
  initialDetails: { type: Object, default: () => ({}) },
  detailTypes: { type: Array, default: () => [] },
  detailLabels: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(["submit"]);

const quantity = ref(0);
const details = ref({});

const detailLabel = computed(() => (props.detailMode === "hala" ? "Jenis" : "Warna"));

watch(
  () => [props.mainCat, props.detailMode, props.quantity, props.initialDetails],
  () => {
    quantity.value = props.quantity;
    details.value = props.initialDetails ? { ...props.initialDetails } : {};
  },
  { deep: true, immediate: true }
);

function submitForm() {
  emit("submit", {
    quantity: quantity.value,
    details: details.value,
  });
}
</script>

<style scoped>
.modal-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
}
.modal-header .btn-close {
  filter: invert(1);
}
</style>
