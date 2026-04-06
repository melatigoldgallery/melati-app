<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-person-badge me-2 text-warning"></i>Persetujuan Izin
      </h4>
      <span class="badge bg-warning text-dark">{{ pendingList.length }} pending</span>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-warning" role="status"></div>
    </div>

    <div v-else-if="pendingList.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-muted py-5">
        <i class="bi bi-check-circle display-4 d-block mb-2 opacity-25"></i>
        Tidak ada pengajuan yang menunggu persetujuan.
      </div>
    </div>

    <div v-else class="row g-2">
      <div v-for="req in pendingList" :key="req.id" class="col-md-6">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div class="fw-bold">{{ req.name }}</div>
                <div class="text-muted small">{{ req.employeeId }}</div>
              </div>
              <span class="badge bg-warning text-dark">{{ req.leaveType }}</span>
            </div>
            <div class="small mb-1">
              <i class="bi bi-calendar me-1 text-muted"></i>
              {{ req.leaveStartDate }}
              <span v-if="req.leaveEndDate !== req.leaveStartDate"> s/d {{ req.leaveEndDate }}</span>
              <span v-if="req.dayCount > 1" class="text-muted ms-1">({{ req.dayCount }} hari)</span>
            </div>
            <div class="small text-muted mb-2">{{ req.reason }}</div>
            <div class="small text-muted mb-3">
              Pengganti: <span class="fw-semibold">{{ req.replacementType }}</span>
            </div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-success btn-sm flex-fill"
                @click="respond(req, 'Disetujui')"
                :disabled="responding === req.id"
              >
                <span v-if="responding === req.id" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-check-circle me-1"></i>Setujui
              </button>
              <button
                class="btn btn-danger btn-sm flex-fill"
                @click="respond(req, 'Ditolak')"
                :disabled="responding === req.id"
              >
                <i class="bi bi-x-circle me-1"></i>Tolak
              </button>
              <button
                class="btn btn-outline-danger btn-sm"
                @click="removePending(req)"
                title="Hapus"
              ><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useAuthStore } from "@/stores/auth";
import { subscribePendingLeaves, updateLeaveStatus, deleteLeaveRequest } from "@/services/absensi-service";

const { toast, error: showError, confirm } = useAlert();
const auth = useAuthStore();

const loading = ref(true);
const pendingList = ref([]);
const responding = ref(null);
let unsubscribe = null;

async function respond(req, status) {
  responding.value = req.id;
  try {
    await updateLeaveStatus(req.id, status, auth.user?.uid || "");
    toast(`Izin ${req.name} ${status.toLowerCase()}`);
  } catch (e) {
    showError("Gagal memperbarui status", e.message);
  } finally {
    responding.value = null;
  }
}

async function removePending(req) {
  const r = await confirm({ title: "Hapus Pengajuan?", text: `Hapus pengajuan izin dari ${req.name}?`, icon: "warning" });
  if (!r.isConfirmed) return;
  try {
    await deleteLeaveRequest(req.id);
    toast("Pengajuan berhasil dihapus");
  } catch (e) {
    showError("Gagal menghapus", e.message);
  }
}

onMounted(() => {
  unsubscribe = subscribePendingLeaves((data) => {
    pendingList.value = data;
    loading.value = false;
  });
});

onUnmounted(() => unsubscribe?.());
</script>
