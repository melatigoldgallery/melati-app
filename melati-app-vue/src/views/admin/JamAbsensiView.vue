<template>
  <div class="container-fluid py-3" style="max-width:480px">
    <h4 class="fw-bold mb-4">
      <i class="bi bi-clock me-2 text-warning"></i>Pengaturan Jam Absensi
    </h4>
    <div class="card border-0 shadow-sm">
      <div class="card-body">
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-warning" role="status"></div>
        </div>
        <form v-else @submit.prevent="save">
          <div class="mb-3">
            <label class="form-label fw-semibold">Jam Mulai Kerja <span class="text-danger">*</span></label>
            <input v-model="form.workStartTime" type="time" class="form-control" required />
            <div class="form-text">Waktu normal masuk kerja (mis. 08:00)</div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Toleransi Terlambat (menit)</label>
            <input v-model.number="form.lateThreshold" type="number" min="0" class="form-control" />
            <div class="form-text">Menit setelah jam masuk baru dianggap terlambat</div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Batas Check-in</label>
            <input v-model="form.checkInDeadline" type="time" class="form-control" />
            <div class="form-text">Lewat jam ini tidak bisa check-in (mis. 12:00)</div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Jam Pulang</label>
            <input v-model="form.checkOutTime" type="time" class="form-control" />
          </div>
          <div class="d-flex gap-2 justify-content-end">
            <button type="submit" class="btn btn-warning" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-floppy me-1"></i>Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import { fetchAttendanceSettings, saveAttendanceSettings } from "@/services/absensi-service";

const { toast, error: showError } = useAlert();
const loading = ref(true);
const saving = ref(false);
const form = ref({
  workStartTime: "08:00",
  lateThreshold: 0,
  checkInDeadline: "12:00",
  checkOutTime: "17:00",
});

async function load() {
  try {
    const s = await fetchAttendanceSettings();
    if (s) Object.assign(form.value, s);
  } catch (e) {
    showError("Gagal memuat pengaturan", e.message);
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await saveAttendanceSettings({ ...form.value });
    toast("Pengaturan berhasil disimpan");
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
