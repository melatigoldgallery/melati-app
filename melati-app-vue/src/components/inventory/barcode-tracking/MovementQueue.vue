<template>
  <div class="movement-queue card border-0 shadow-sm rounded-3 overflow-hidden">
    <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-light-primary rounded-3 me-2 p-2 text-primary">
          <i class="bi bi-list-stars fs-5"></i>
        </div>
        <h6 class="mb-0 fw-bold text-dark">Antrian Mutasi (Pending)</h6>
      </div>
      <button class="btn btn-sm btn-outline-primary rounded-2 px-3 hover-lift" @click="loadQueue" :disabled="loading">
        <i class="bi bi-arrow-clockwise me-1" :class="{ 'spinner-spin': loading }"></i>
        Refresh
      </button>
    </div>

    <div class="card-body p-0">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 text-muted small">Memuat antrian...</p>
      </div>

      <div v-else-if="requests.length === 0" class="text-center py-5 px-3">
        <div class="empty-state-icon bg-light-success text-success rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
          <i class="bi bi-check-lg fs-3"></i>
        </div>
        <h6 class="fw-semibold text-dark mb-1">Data Aman!</h6>
        <p class="text-muted small mb-0">Tidak ada antrian pengajuan mutasi saat ini.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width: 15%">Tanggal</th>
              <th style="width: 15%">Pemindah</th>
              <th style="width: 20%">Rute</th>
              <th class="text-center" style="width: 10%">Qty</th>
              <th>Daftar Barcode</th>
              <th v-if="isSupervisor" class="text-end pe-3" style="width: 15%">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in requests" :key="req.id" class="queue-row">
              <td class="ps-3 text-muted small">
                {{ formatDate(req.createdAt) }}
              </td>
              <td>
                <span class="fw-semibold text-dark d-block">{{ req.pemindah }}</span>
              </td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <span class="badge bg-secondary-subtle text-secondary border px-2 py-1">{{ getSubDocLabel(req.origin) }}</span>
                  <i class="bi bi-arrow-right text-muted small"></i>
                  <span class="badge bg-primary-subtle text-primary border px-2 py-1">{{ getSubDocLabel(req.destination) }}</span>
                </div>
              </td>
              <td class="text-center fw-bold">
                <span class="badge bg-dark rounded-pill">{{ req.barcodes?.length || 0 }}</span>
              </td>
              <td>
                <div class="d-flex flex-wrap gap-1" style="max-height: 80px; overflow-y: auto;">
                  <span v-for="b in req.barcodes" :key="b.barcode" class="barcode-badge">
                    {{ b.barcode }}
                    <small class="text-muted">({{ b.category }})</small>
                  </span>
                </div>
              </td>
              <td v-if="isSupervisor" class="text-end pe-3">
                <div class="d-flex justify-content-end gap-2">
                  <button 
                    class="btn btn-sm btn-success rounded-pill px-3 py-1 text-white shadow-sm hover-lift d-flex align-items-center gap-1" 
                    @click="handleApprove(req)" 
                    :disabled="actioning"
                  >
                    <i class="bi bi-check-circle"></i>
                    Terima
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-danger rounded-pill px-3 py-1 hover-lift d-flex align-items-center gap-1" 
                    @click="handleReject(req)" 
                    :disabled="actioning"
                  >
                    <i class="bi bi-x-circle"></i>
                    Tolak
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { processBarcodeMoveRequest } from "@/services/barcode-service";
import Swal from "sweetalert2";

const auth = useAuthStore();
const { toast, error: showError } = useAlert();

const requests = ref([]);
const loading = ref(false);
const actioning = ref(false);

const isSupervisor = computed(() => {
  return ["supervisor", "admin"].includes(auth.userRole?.toLowerCase());
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
    'any': 'Mutasi Cepat'
  };
  return map[key] || key;
}

function formatDate(value) {
  if (!value) return "-";
  let d;
  if (value.toDate) d = value.toDate();
  else d = new Date(value);
  
  if (Number.isNaN(d.getTime())) return "-";
  const dd = `${d.getDate()}`.padStart(2, "0");
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mi = `${d.getMinutes()}`.padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

async function loadQueue() {
  loading.value = true;
  try {
    const q = query(
      collection(db, "floors", auth.activeFloor, "barcodeMoveRequests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const snaps = await getDocs(q);
    requests.value = snaps.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    showError("Gagal memuat antrian mutasi", e.message);
  } finally {
    loading.value = false;
  }
}

async function handleApprove(req) {
  const confirm = await Swal.fire({
    title: "Terima Mutasi?",
    text: `Anda akan menyetujui mutasi ${req.barcodes?.length || 0} barang ke ${getSubDocLabel(req.destination)}`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Terima",
    cancelButtonText: "Batal",
    confirmButtonColor: "#198754"
  });

  if (!confirm.isConfirmed) return;

  actioning.value = true;
  try {
    await processBarcodeMoveRequest({
      requestId: req.id,
      status: "approved",
      processor: auth.currentUser?.username || auth.currentUser?.email || "Supervisor",
      floorId: auth.activeFloor
    });
    toast("Request mutasi berhasil disetujui.");
    await loadQueue();
  } catch (e) {
    showError("Gagal memproses persetujuan", e.message);
  } finally {
    actioning.value = false;
  }
}

async function handleReject(req) {
  const { value: reason } = await Swal.fire({
    title: "Tolak Mutasi",
    input: "text",
    inputLabel: "Alasan Penolakan",
    inputPlaceholder: "Tulis alasan di sini...",
    showCancelButton: true,
    confirmButtonText: "Tolak",
    cancelButtonText: "Batal",
    confirmButtonColor: "#dc3545",
    inputValidator: (value) => {
      if (!value) {
        return "Alasan penolakan wajib diisi!";
      }
    }
  });

  if (!reason) return;

  actioning.value = true;
  try {
    await processBarcodeMoveRequest({
      requestId: req.id,
      status: "rejected",
      processor: auth.currentUser?.username || auth.currentUser?.email || "Supervisor",
      floorId: auth.activeFloor
    });
    toast("Request mutasi berhasil ditolak.");
    await loadQueue();
  } catch (e) {
    showError("Gagal memproses penolakan", e.message);
  } finally {
    actioning.value = false;
  }
}

onMounted(() => {
  loadQueue();
});
</script>

<style scoped>
.icon-box {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-light-primary {
  background-color: rgba(63, 55, 201, 0.1);
}
.bg-light-success {
  background-color: rgba(25, 135, 84, 0.1);
}
.barcode-badge {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #212529;
  font-family: monospace;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
}
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}
.queue-row {
  transition: background-color 0.15s ease;
}
.queue-row:hover {
  background-color: rgba(248, 249, 250, 0.8) !important;
}
.spinner-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>