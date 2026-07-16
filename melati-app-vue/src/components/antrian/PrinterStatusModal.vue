<template>
  <div class="modal fade" id="printerStatusModal" tabindex="-1" aria-labelledby="printerStatusModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; background-color: #ffffff;">
        <div class="modal-header bg-light text-dark border-0 py-3" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
          <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="printerStatusModalLabel" style="font-family: 'Playfair Display', serif; font-size: 1.3rem;">
            <i class="fas fa-print text-warning"></i>
            Status & Kertas Printer (Lantai: {{ floorId }})
          </h5>
          <button type="button" class="btn-close btn-close-dark shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-4 text-dark">
          <div class="row g-3">
            <!-- Preset Kertas Dropdown -->
            <div class="col-12">
              <label class="form-label fw-semibold">Jenis/Ukuran Kertas</label>
              <select v-model="localForm.active_paper_type" class="form-select" @change="onPaperTypeChange">
                <option value="80x80">80x80 mm (Preset: 40 meter)</option>
                <option value="80x50">80x50 mm (Preset: 20 meter)</option>
                <option value="custom">Kustomisasi Panjang</option>
              </select>
            </div>

            <!-- Panjang Roll Input -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">Panjang Roll (m)</label>
              <input 
                v-model.number="localForm.paper_roll_length" 
                type="number" 
                min="1" 
                max="1000" 
                class="form-control"
                :readonly="localForm.active_paper_type !== 'custom'"
                @input="recalculateCapacity"
              />
            </div>

            <!-- Estimasi Panjang Struk -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">Panjang Struk (cm)</label>
              <input 
                v-model.number="localForm.ticket_length" 
                type="number" 
                min="1" 
                max="100" 
                step="0.1" 
                class="form-control"
                @input="recalculateCapacity"
              />
            </div>

            <!-- Alert Threshold Pct -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">Batas Alert (%)</label>
              <input 
                v-model.number="localForm.alert_threshold_pct" 
                type="number" 
                min="1" 
                max="100" 
                class="form-control"
                @input="recalculateCapacity"
              />
            </div>

            <!-- Koreksi Manual Hitungan Saat Ini -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">Koreksi Counter (Struk)</label>
              <input 
                v-model.number="localForm.total_prints" 
                type="number" 
                min="0" 
                class="form-control"
                @input="recalculateCapacity"
              />
            </div>

            <!-- Printer Usage Stats -->
            <div class="col-12 mt-4 pt-3 border-top">
              <div class="d-flex justify-content-between mb-1">
                <span class="small fw-semibold">Penggunaan Kertas</span>
                <span class="small fw-bold" :class="paperStatusClass">
                  {{ localForm.total_prints }} / {{ localForm.max_capacity }} Struk
                </span>
              </div>
              
              <div class="progress mb-2" style="height: 10px; background-color: #e9ecef; border-radius: 5px;">
                <div 
                  class="progress-bar transition-all" 
                  role="progressbar" 
                  :style="{ width: paperUsagePercentage + '%', backgroundColor: progressBarColor }"
                  :aria-valuenow="localForm.total_prints" 
                  aria-valuemin="0" 
                  :aria-valuemax="localForm.max_capacity"
                  style="border-radius: 5px;"
                ></div>
              </div>

              <div class="d-flex justify-content-between small text-muted">
                <span>Peringatan: {{ localForm.threshold }} struk</span>
                <span>Estimasi Sisa: ~{{ Math.max(0, localForm.max_capacity - localForm.total_prints) }} lembar</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer border-0 p-3 bg-light" style="border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
          <div class="d-flex gap-2 justify-content-end w-100">
            <button 
              type="button" 
              class="btn btn-danger fw-semibold d-flex align-items-center gap-2"
              @click="triggerResetPrinter"
              :disabled="saving"
            >
              <i class="fas fa-sync-alt"></i>
              Reset & Ganti Kertas
            </button>
            <button type="button" class="btn btn-primary fw-semibold px-3" @click="saveSettings" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { savePrinterSettings, resetPrinterCounter } from "@/services/antrian-service";

const props = defineProps({
  printerStatus: {
    type: Object,
    required: true
  },
  floorId: {
    type: String,
    required: true
  }
});

const saving = ref(false);

const localForm = ref({
  active_paper_type: "80x80",
  paper_roll_length: 40,
  ticket_length: 15.5,
  alert_threshold_pct: 85,
  total_prints: 0,
  max_capacity: 258,
  threshold: 219,
  last_reset: null
});

// Synchronize local form with props
watch(() => props.printerStatus, (newVal) => {
  if (newVal) {
    localForm.value = { ...newVal };
  }
}, { immediate: true, deep: true });

const paperUsagePercentage = computed(() => {
  const cap = localForm.value.max_capacity || 258;
  return Math.min(100, Math.round((localForm.value.total_prints / cap) * 100));
});

const progressBarColor = computed(() => {
  const prints = localForm.value.total_prints;
  const thresh = localForm.value.threshold;
  const max = localForm.value.max_capacity;
  if (prints >= max) return "#dc3545"; // Red
  if (prints >= thresh) return "#ffc107"; // Yellow
  return "#198754"; // Green
});

const paperStatusClass = computed(() => {
  const prints = localForm.value.total_prints;
  const thresh = localForm.value.threshold;
  const max = localForm.value.max_capacity;
  if (prints >= max) return "text-danger";
  if (prints >= thresh) return "text-warning fw-bold";
  return "text-success";
});

function onPaperTypeChange() {
  const type = localForm.value.active_paper_type;
  if (type === "80x80") {
    localForm.value.paper_roll_length = 40;
    localForm.value.ticket_length = 15.5;
  } else if (type === "80x50") {
    localForm.value.paper_roll_length = 20;
    localForm.value.ticket_length = 15.5;
  }
  recalculateCapacity();
}

function recalculateCapacity() {
  const lengthMeters = Number(localForm.value.paper_roll_length) || 0;
  const ticketCm = Number(localForm.value.ticket_length) || 1;
  const pct = Number(localForm.value.alert_threshold_pct) || 0;

  const max_capacity = Math.floor((lengthMeters * 100) / ticketCm);
  const threshold = Math.floor((max_capacity * pct) / 100);

  localForm.value.max_capacity = max_capacity;
  localForm.value.threshold = threshold;
}

async function saveSettings() {
  saving.value = true;
  try {
    await savePrinterSettings(props.floorId, localForm.value);
    await Swal.fire({
      icon: "success",
      title: "Berhasil Disimpan",
      text: "Pengaturan kertas printer berhasil diperbarui.",
      timer: 1500,
      showConfirmButton: false
    });
    // Hide modal using bootstrap API
    const modalElement = document.getElementById("printerStatusModal");
    if (modalElement) {
      const modalInstance = Modal.getOrCreateInstance(modalElement);
      if (modalInstance) modalInstance.hide();
    }
  } catch (err) {
    console.error("Gagal menyimpan printer settings:", err);
    await Swal.fire({
      icon: "error",
      title: "Gagal Menyimpan",
      text: "Terjadi kesalahan saat menyimpan pengaturan."
    });
  } finally {
    saving.value = false;
  }
}

async function triggerResetPrinter() {
  const result = await Swal.fire({
    title: "Reset & Ganti Kertas Baru?",
    text: `Anda akan memasang roll kertas baru jenis ${localForm.value.active_paper_type} dan mereset hitungan cetak ke 0.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Ya, Reset & Pasang",
    cancelButtonText: "Batal"
  });

  if (result.isConfirmed) {
    saving.value = true;
    try {
      await resetPrinterCounter(props.floorId, localForm.value);
      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Kertas printer berhasil di-reset ke 0.",
        timer: 1500,
        showConfirmButton: false
      });
      // Hide modal
      const modalElement = document.getElementById("printerStatusModal");
      if (modalElement) {
        const modalInstance = Modal.getOrCreateInstance(modalElement);
        if (modalInstance) modalInstance.hide();
      }
    } catch (error) {
      console.error("Gagal reset printer counter:", error);
      await Swal.fire({
        icon: "error",
        title: "Gagal Reset",
        text: "Terjadi kesalahan saat mereset printer."
      });
    } finally {
      saving.value = false;
    }
  }
}
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}
</style>
