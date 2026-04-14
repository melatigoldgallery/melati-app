<template>
  <AppModal :model-value="modelValue" :title="title" @update:modelValue="onUpdateModelValue">
    <template #default>
      <div class="text-center py-2">
        <i class="bi bi-exclamation-triangle-fill text-warning mb-3 d-block" style="font-size: 3rem"></i>
        <p class="fw-semibold mb-2">{{ failedTitle }}</p>
        <p class="text-muted small mb-3">{{ message }}</p>
        <div class="alert alert-light text-start small mb-0">
          <strong>Cara mengaktifkan:</strong>
          <ol class="mb-0 ps-3 mt-1">
            <li>Buka Layar Utama Dekstop</li>
            <li>
              Jalankan Aplikasi
              <code>Print Otomatis</code>
            </li>
            <li>
              Klik
              <strong>{{ retryLabel }}</strong>
              di bawah
            </li>
          </ol>
        </div>
      </div>
    </template>
    <template #footer>
      <button @click="onUpdateModelValue(false)" class="btn btn-secondary btn-sm me-2">Tutup</button>
      <button v-if="showRetry" @click="onRetry" class="btn btn-primary btn-sm">
        <i class="bi bi-arrow-clockwise me-1"></i>
        {{ retryLabel }}
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import AppModal from "@/components/common/AppModal.vue";

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "Layanan Cetak Tidak Aktif" },
  failedTitle: { type: String, default: "Gagal Cetak Invoice / Struk" },
  message: { type: String, default: "Pastikan printing service sudah dijalankan di komputer ini." },
  showRetry: { type: Boolean, default: true },
  retryLabel: { type: String, default: "Coba Lagi" },
});

const emit = defineEmits(["update:modelValue", "retry"]);

function onUpdateModelValue(value) {
  emit("update:modelValue", value);
}

function onRetry() {
  emit("retry");
}
</script>
