<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-person-plus me-2 text-warning"></i>Kelola Karyawan
      </h4>
      <button class="btn btn-warning btn-sm" data-bs-toggle="modal" data-bs-target="#modalTambah">
        <i class="bi bi-plus-circle me-1"></i>Tambah Karyawan
      </button>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body d-flex align-items-center gap-2 py-2">
        <input v-model="searchQ" type="text" class="form-control form-control-sm" placeholder="Cari nama / ID..." />
      </div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Nama</th>
              <th>Barcode</th>
              <th>Tipe</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-warning"></div>
              </td>
            </tr>
            <tr v-else-if="filtered.length === 0">
              <td colspan="5" class="text-center text-muted py-4">Tidak ada data.</td>
            </tr>
            <tr v-for="emp in filtered" :key="emp.id">
              <td class="small">{{ emp.employeeId }}</td>
              <td class="small fw-semibold">{{ emp.name }}</td>
              <td class="small">{{ emp.barcode }}</td>
              <td><span class="badge bg-secondary">{{ emp.type }}</span></td>
              <td class="text-center">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary btn-sm" @click="openEdit(emp)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-info btn-sm" @click="openFace(emp)" title="Daftarkan Wajah">
                    <i class="bi bi-camera"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm" @click="removeEmployee(emp)" title="Hapus">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Tambah/Edit -->
    <div class="modal fade" id="modalTambah" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold small">{{ editTarget ? 'Edit' : 'Tambah' }} Karyawan</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label small">ID Karyawan</label>
              <input v-model="form.employeeId" type="text" class="form-control form-control-sm" placeholder="EMP001" :readonly="!!editTarget" />
            </div>
            <div class="mb-2">
              <label class="form-label small">Nama</label>
              <input v-model="form.name" type="text" class="form-control form-control-sm" />
            </div>
            <div class="mb-2">
              <label class="form-label small">Barcode</label>
              <input v-model="form.barcode" type="text" class="form-control form-control-sm" />
            </div>
            <div class="mb-2">
              <label class="form-label small">Tipe</label>
              <select v-model="form.type" class="form-select form-select-sm">
                <option value="staff">Staff</option>
                <option value="ob">OB</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button data-bs-dismiss="modal" class="btn btn-sm btn-light">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveEmployee" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Face Enrollment -->
    <div class="modal fade" id="modalFace" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold small">Daftarkan Wajah — {{ faceTarget?.name }}</h5>
            <button type="button" class="btn-close" @click="closeFaceModal"></button>
          </div>
          <div class="modal-body text-center">
            <video ref="videoEl" autoplay muted playsinline class="rounded w-100 mb-2" style="max-height:280px;object-fit:cover;"></video>
            <div v-if="faceStatus" class="small text-muted mb-2">{{ faceStatus }}</div>
            <button class="btn btn-warning btn-sm" @click="captureFace" :disabled="!faceReady || savingFace">
              <span v-if="savingFace" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-camera-fill me-1"></i>Simpan Wajah
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Modal } from "bootstrap";
import { useAlert } from "@/composables/useAlert";
import {
  fetchEmployees, saveEmployee as apiSaveEmployee, updateEmployee,
  deleteEmployee, saveFaceDescriptor, deleteFaceDescriptor,
} from "@/services/absensi-service";

const { toast, error: showError, confirm } = useAlert();

function loadFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve(window.faceapi);
    const existing = document.getElementById("face-api-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.faceapi));
      return;
    }
    const script = document.createElement("script");
    script.id = "face-api-script";
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload = () => resolve(window.faceapi);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const loading = ref(true);
const saving = ref(false);
const savingFace = ref(false);
const employees = ref([]);
const searchQ = ref("");
const editTarget = ref(null);
const faceTarget = ref(null);
const faceStatus = ref("");
const faceReady = ref(false);
const videoEl = ref(null);
let stream = null;
let faceapi = null;

const form = ref({ employeeId: "", name: "", barcode: "", type: "staff" });

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase();
  return employees.value.filter((e) => !q || e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q));
});

async function load() {
  loading.value = true;
  try { employees.value = await fetchEmployees(); }
  catch (e) { showError("Gagal memuat karyawan", e.message); }
  finally { loading.value = false; }
}

function nextEmployeeId() {
  const nums = employees.value
    .map((e) => parseInt(e.employeeId.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return "EMP" + String(next).padStart(3, "0");
}

function openEdit(emp) {
  editTarget.value = emp;
  form.value = { employeeId: emp.employeeId, name: emp.name, barcode: emp.barcode, type: emp.type };
  new Modal(document.getElementById("modalTambah")).show();
}

async function saveEmployee() {
  if (!form.value.name.trim() || !form.value.employeeId.trim()) return toast("Nama dan ID wajib diisi", "warning");
  saving.value = true;
  try {
    if (editTarget.value) {
      await updateEmployee(editTarget.value.id, { name: form.value.name, barcode: form.value.barcode, type: form.value.type });
      toast("Data karyawan diperbarui");
    } else {
      await apiSaveEmployee({ employeeId: form.value.employeeId, name: form.value.name, barcode: form.value.barcode, type: form.value.type });
      toast("Karyawan berhasil ditambah");
    }
    Modal.getInstance(document.getElementById("modalTambah"))?.hide();
    editTarget.value = null;
    form.value = { employeeId: nextEmployeeId(), name: "", barcode: "", type: "staff" };
    await load();
  } catch (e) { showError("Gagal menyimpan", e.message); }
  finally { saving.value = false; }
}

async function removeEmployee(emp) {
  const r = await confirm({ title: "Hapus Karyawan?", text: emp.name, icon: "warning" });
  if (!r.isConfirmed) return;
  try {
    await deleteEmployee(emp.id);
    await deleteFaceDescriptor(emp.employeeId).catch(() => {});
    toast("Karyawan dihapus");
    await load();
  } catch (e) { showError("Gagal menghapus", e.message); }
}

async function openFace(emp) {
  faceTarget.value = emp;
  faceReady.value = false;
  faceStatus.value = "Memuat model wajah...";
  const modal = new Modal(document.getElementById("modalFace"));
  modal.show();
  document.getElementById("modalFace").addEventListener("hidden.bs.modal", closeFaceModal, { once: true });
  try {
    if (!faceapi) {
      faceapi = await loadFaceApiScript();
      const modelUrl = "/face-api/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
      ]);
    }
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoEl.value) videoEl.value.srcObject = stream;
    faceStatus.value = "Kamera aktif — arahkan wajah ke kamera lalu klik Simpan Wajah";
    faceReady.value = true;
  } catch (e) {
    faceStatus.value = "Gagal memuat: " + e.message;
  }
}

function closeFaceModal() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  faceReady.value = false;
  faceTarget.value = null;
  Modal.getInstance(document.getElementById("modalFace"))?.hide();
}

async function captureFace() {
  if (!faceReady.value || !videoEl.value) return;
  savingFace.value = true;
  faceStatus.value = "Mendeteksi wajah...";
  try {
    const detection = await faceapi
      .detectSingleFace(videoEl.value, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    if (!detection) {
      faceStatus.value = "Wajah tidak terdeteksi. Coba lagi.";
      return;
    }
    await saveFaceDescriptor(faceTarget.value.employeeId, Array.from(detection.descriptor));
    toast(`Wajah ${faceTarget.value.name} berhasil didaftarkan`);
    closeFaceModal();
  } catch (e) { showError("Gagal menyimpan wajah", e.message); }
  finally { savingFace.value = false; }
}

onMounted(async () => {
  await load();
  form.value.employeeId = nextEmployeeId();
});

onUnmounted(() => {
  if (stream) stream.getTracks().forEach((t) => t.stop());
});
</script>
