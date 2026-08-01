<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-people me-2 text-dark"></i>
        Kelola Karyawan
      </h4>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-secondary btn-sm" @click="load(true)" :disabled="loading" title="Refresh data">
          <i class="bi bi-arrow-clockwise me-1" :class="{ spin: loading }"></i>
          Refresh
        </button>
        <button class="btn btn-outline-success btn-sm" @click="downloadAllBarcodes" :disabled="!employees.length">
          <i class="bi bi-barcode me-1"></i>
          Barcode Semua
        </button>
        <button class="btn btn-outline-primary btn-sm" @click="exportExcel" :disabled="!employees.length">
          <i class="bi bi-file-earmark-excel me-1"></i>
          Export Excel
        </button>
        <button class="btn btn-primary btn-sm" @click="openAdd">
          <i class="bi bi-plus-circle me-1"></i>
          Tambah Karyawan
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body d-flex align-items-center gap-2 py-2">
        <i class="bi bi-search text-muted"></i>
        <input
          v-model="searchQ"
          type="text"
          class="form-control form-control-sm border-0 shadow-none"
          placeholder="Cari nama / ID karyawan..."
        />
      </div>
    </div>

    <!-- Table -->
    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th class="ps-3" style="width: 44px">No</th>
              <th style="width: 90px">ID</th>
              <th>Nama</th>
              <th style="width: 110px">Barcode</th>
              <th style="width: 130px" class="text-center">Visual</th>
              <th style="width: 80px" class="text-center">Tipe</th>
              <th style="width: 90px" class="text-center">Wajah</th>
              <th style="width: 140px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-5">
                <div class="spinner-border text-warning" role="status"></div>
                <div class="text-muted small mt-2">Memuat data...</div>
              </td>
            </tr>
            <tr v-else-if="filtered.length === 0">
              <td colspan="8" class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                Tidak ada data karyawan.
              </td>
            </tr>
            <tr v-for="(emp, index) in paginatedFiltered" :key="emp.id">
              <td class="ps-3 small text-muted">{{ (page - 1) * pageSize + index + 1 }}</td>
              <td class="small text-muted">{{ emp.employeeId }}</td>
              <td class="fw-semibold small">{{ emp.name }}</td>
              <td class="small">
                <code class="text-dark">{{ emp.barcode }}</code>
              </td>
              <td class="text-center py-1">
                <svg
                  :ref="
                    (el) => {
                      if (el) barcodeRefs[emp.id] = el;
                    }
                  "
                  :data-barcode-id="emp.id"
                  style="max-width: 120px; height: 40px"
                ></svg>
              </td>
              <td class="text-center">
                <span class="badge" :class="getBadgeClass(emp.type)">
                  {{ getEmployeeTypeLabel(emp.type) }}
                </span>
              </td>
              <td class="text-center">
                <span
                  class="badge"
                  :class="
                    faceStatuses[emp.employeeId] === true
                      ? 'bg-success'
                      : faceStatuses[emp.employeeId] === false
                        ? 'bg-light text-secondary border'
                        : 'bg-light text-muted border'
                  "
                >
                  <span v-if="faceStatuses[emp.employeeId] === undefined">
                    <span class="spinner-border spinner-border-sm" style="width: 0.6rem; height: 0.6rem"></span>
                  </span>
                  <span v-else>{{ faceStatuses[emp.employeeId] ? "Terdaftar" : "Belum" }}</span>
                </span>
              </td>
              <td class="text-center">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary" @click="openEdit(emp)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-info" @click="openFace(emp)" title="Daftarkan Wajah">
                    <i class="bi bi-camera"></i>
                  </button>
                  <button class="btn btn-outline-success" @click="downloadBarcode(emp)" title="Download Barcode">
                    <i class="bi bi-download"></i>
                  </button>
                  <button class="btn btn-outline-danger" @click="removeEmployee(emp)" title="Hapus">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="!loading && employees.length"
        class="card-footer bg-transparent border-top d-flex align-items-center justify-content-between flex-wrap gap-2 py-2 px-3"
      >
        <span class="text-muted small">
          Menampilkan {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filtered.length) }} dari
          {{ filtered.length }} karyawan
        </span>
        <nav v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: page === 1 }">
              <button class="page-link" @click="page = 1">&laquo;</button>
            </li>
            <li class="page-item" :class="{ disabled: page === 1 }">
              <button class="page-link" @click="page--">&lsaquo;</button>
            </li>
            <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === page }">
              <button class="page-link" @click="page = p">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: page === totalPages }">
              <button class="page-link" @click="page++">&rsaquo;</button>
            </li>
            <li class="page-item" :class="{ disabled: page === totalPages }">
              <button class="page-link" @click="page = totalPages">&raquo;</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Modal: Tambah/Edit -->
    <div class="modal fade" id="modalTambah" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2 border-bottom-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-person-plus me-2 text-dark"></i>
              {{ editTarget ? "Edit" : "Tambah" }} Karyawan
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body pt-0">
            <div class="mb-3">
              <label class="form-label small fw-semibold">ID Karyawan</label>
              <input
                v-model="form.employeeId"
                type="text"
                class="form-control form-control-sm"
                placeholder="EMP001"
                :readonly="!!editTarget"
                :class="{ 'bg-light': !!editTarget }"
              />
              <div v-if="!editTarget" class="form-text">Auto-generate: {{ form.employeeId }}</div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Nama Lengkap</label>
              <input v-model="form.name" type="text" class="form-control form-control-sm" placeholder="Nama karyawan" />
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">Kode Barcode</label>
              <div class="input-group input-group-sm">
                <input v-model="form.barcode" type="text" class="form-control" placeholder="MLT001" />
                <button
                  v-if="!editTarget"
                  class="btn btn-outline-secondary"
                  type="button"
                  @click="form.barcode = nextBarcode()"
                  title="Generate otomatis"
                >
                  <i class="bi bi-arrow-repeat"></i>
                </button>
              </div>
            </div>
            <div class="mb-1">
              <label class="form-label small fw-semibold">Tipe Karyawan</label>
              <div class="input-group input-group-sm">
                <select v-model="form.type" class="form-select">
                  <option v-for="t in employeeTypes" :key="t.id" :value="t.id">
                    {{ t.label }}
                  </option>
                </select>
                <button
                  class="btn btn-outline-secondary"
                  type="button"
                  @click="openManageTypes"
                  title="Kelola Tipe Karyawan"
                >
                  <i class="bi bi-gear-fill"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button data-bs-dismiss="modal" class="btn btn-sm btn-light">Batal</button>
            <button class="btn btn-primary btn-sm" @click="saveEmployee" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check2 me-1"></i>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Kelola Tipe Karyawan -->
    <div class="modal fade" id="modalKelolaTipe" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header py-2 border-bottom-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-tags me-2 text-primary"></i>
              Kelola Tipe Karyawan
            </h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body pt-0">
            <!-- Form Tambah Tipe Baru -->
            <div class="card bg-light border-0 p-2 mb-3">
              <label class="form-label small fw-semibold mb-1">Tambah Tipe Baru</label>
              <div class="mb-2">
                <input
                  v-model="newTypeForm.label"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Nama Tipe (misal: Kasir)"
                  @keydown.enter.prevent="addEmployeeType"
                />
              </div>
              <div class="d-flex gap-2">
                <select v-model="newTypeForm.badgeClass" class="form-select form-select-sm">
                  <option v-for="b in badgeOptions" :key="b.class" :value="b.class">
                    {{ b.label }}
                  </option>
                </select>
                <button class="btn btn-primary btn-sm text-nowrap" @click="addEmployeeType" :disabled="savingTypes">
                  <span v-if="savingTypes" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-plus-lg me-1"></i>
                  Tambah
                </button>
              </div>
            </div>

            <!-- List Tipe yang Ada -->
            <label class="form-label small fw-semibold mb-1">Daftar Tipe</label>
            <div class="list-group list-group-flush border rounded overflow-hidden">
              <div
                v-for="t in employeeTypes"
                :key="t.id"
                class="list-group-item d-flex align-items-center justify-content-between py-2 px-2"
              >
                <div class="d-flex align-items-center gap-2">
                  <span class="badge" :class="t.badgeClass">{{ t.label }}</span>
                  <span class="small text-muted">({{ t.id }})</span>
                </div>
                <button
                  class="btn btn-outline-danger btn-delete-type"
                  @click="removeEmployeeType(t)"
                  :disabled="employeeTypes.length <= 1 || savingTypes"
                  title="Hapus Tipe"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button data-bs-dismiss="modal" class="btn btn-sm btn-secondary">Selesai</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Face Enrollment -->
    <div class="modal fade" id="modalFace" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header py-2 border-bottom-0">
            <h6 class="modal-title fw-bold">
              <i class="bi bi-person-bounding-box me-2 text-info"></i>
              Daftarkan Wajah
              <span v-if="faceTarget" class="text-muted fw-normal">— {{ faceTarget.name }}</span>
            </h6>
            <button type="button" class="btn-close" @click="closeFaceModal"></button>
          </div>
          <div class="modal-body text-center pt-0">
            <div class="position-relative d-inline-block w-100 mb-2">
              <video
                ref="videoEl"
                autoplay
                muted
                playsinline
                class="rounded w-100"
                style="max-height: 300px; object-fit: cover; background: #000"
              ></video>
              <canvas
                ref="overlayCanvas"
                class="position-absolute top-0 start-0 w-100 h-100 rounded"
                style="pointer-events: none"
              ></canvas>
            </div>
            <!-- Camera selector — visible only when multiple cameras found -->
            <div v-if="availableCameras.length > 1" class="mb-2 text-start">
              <label class="form-label small fw-semibold mb-1">
                <i class="bi bi-camera-video me-1"></i>
                Pilih Kamera
              </label>
              <select v-model="selectedCameraId" @change="switchCamera" class="form-select form-select-sm">
                <option v-for="cam in availableCameras" :key="cam.deviceId" :value="cam.deviceId">
                  {{ cam.label }}
                </option>
              </select>
            </div>
            <div
              class="alert py-2 mb-2 small text-start"
              :class="faceError ? 'alert-danger' : faceDetected ? 'alert-success' : 'alert-info'"
            >
              <i
                class="bi me-1"
                :class="faceError ? 'bi-exclamation-circle-fill' : faceDetected ? 'bi-person-check-fill' : 'bi-camera'"
              ></i>
              {{ faceStatus || "Memuat..." }}
            </div>
            <button class="btn btn-primary" @click="captureFace" :disabled="!faceReady || savingFace">
              <span v-if="savingFace" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-camera-fill me-1"></i>
              Simpan Wajah
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Modal } from "bootstrap";
import Swal from "sweetalert2";
import { useAlert } from "@/composables/useAlert";
import {
  fetchEmployees,
  saveEmployee as apiSaveEmployee,
  updateEmployee,
  deleteEmployee,
  saveFaceDescriptor,
  fetchAllFaceDescriptors,
  deleteFaceDescriptor,
  subscribeEmployeeTypes,
  saveEmployeeTypes,
  DEFAULT_EMPLOYEE_TYPES,
} from "@/services/absensi-service";

const { error: showError, confirm } = useAlert();

function showSwalAlert(icon, title, text = "") {
  const confirmButtonColor = icon === "success" ? "#198754" : icon === "error" ? "#dc3545" : "#f8961e";
  return Swal.fire({
    icon,
    title,
    text,
    confirmButtonColor,
  });
}

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(true);
const saving = ref(false);
const savingFace = ref(false);
const employees = ref([]);
const searchQ = ref("");
const editTarget = ref(null);
const faceTarget = ref(null);
const faceStatus = ref("");
const faceDetected = ref(false);
const faceReady = ref(false);
const faceError = ref(false); // true = show alert-danger
const faceStatuses = ref({}); // { [employeeId]: boolean }
const availableCameras = ref([]); // [{ deviceId, label }]
const selectedCameraId = ref(""); // chosen deviceId
const barcodeRefs = {}; // { [emp.id]: SVGElement } — plain object, no reactivity needed
const videoEl = ref(null);
const overlayCanvas = ref(null);
let stream = null;
let faceapi = null;
let detectionInterval = null;
let jsBarcodeLoaded = false;
let unsubEmployeeTypes = null;

const employeeTypes = ref([...DEFAULT_EMPLOYEE_TYPES]);
const savingTypes = ref(false);
const newTypeForm = ref({ label: "", badgeClass: "bg-primary" });
const badgeOptions = [
  { class: "bg-primary", label: "Biru (Primary)" },
  { class: "bg-secondary", label: "Abu-abu (Secondary)" },
  { class: "bg-success", label: "Hijau (Success)" },
  { class: "bg-danger", label: "Merah (Danger)" },
  { class: "bg-warning text-dark", label: "Kuning (Warning)" },
  { class: "bg-info text-dark", label: "Cyan (Info)" },
  { class: "bg-dark", label: "Hitam (Dark)" },
];

const form = ref({ employeeId: "", name: "", barcode: "", type: "staff" });

function getEmployeeTypeLabel(typeId) {
  if (!typeId) return "-";
  const found = employeeTypes.value.find((t) => t.id.toLowerCase() === String(typeId).toLowerCase());
  return found ? found.label : String(typeId).toUpperCase();
}

function getBadgeClass(typeId) {
  if (!typeId) return "bg-secondary";
  const found = employeeTypes.value.find((t) => t.id.toLowerCase() === String(typeId).toLowerCase());
  return found ? found.badgeClass : "bg-secondary";
}

function openManageTypes() {
  newTypeForm.value = { label: "", badgeClass: "bg-primary" };
  const modalEl = document.getElementById("modalKelolaTipe");
  if (!modalEl) return;

  modalEl.addEventListener(
    "show.bs.modal",
    () => {
      setTimeout(() => {
        const backdrops = document.querySelectorAll(".modal-backdrop");
        if (backdrops.length > 1) {
          backdrops[backdrops.length - 1].style.zIndex = "1060";
        }
      }, 10);
    },
    { once: true },
  );

  modalEl.addEventListener(
    "hidden.bs.modal",
    () => {
      const modalTambahEl = document.getElementById("modalTambah");
      if (modalTambahEl && modalTambahEl.classList.contains("show")) {
        document.body.classList.add("modal-open");
      }
    },
    { once: true },
  );

  const instance = Modal.getInstance(modalEl) || new Modal(modalEl);
  instance.show();
}

async function addEmployeeType() {
  const label = newTypeForm.value.label.trim();
  if (!label) return showSwalAlert("warning", "Input Belum Lengkap", "Nama tipe karyawan wajib diisi.");

  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (!id) return showSwalAlert("warning", "Input Tidak Valid", "Nama tipe karyawan harus mengandung huruf/angka.");

  if (employeeTypes.value.some((t) => t.id === id)) {
    return showSwalAlert("warning", "Tipe Sudah Ada", `Tipe "${label}" sudah terdaftar.`);
  }

  savingTypes.value = true;
  try {
    const updated = [...employeeTypes.value, { id, label, badgeClass: newTypeForm.value.badgeClass }];
    await saveEmployeeTypes(updated);
    newTypeForm.value = { label: "", badgeClass: "bg-primary" };
    form.value.type = id;
    await showSwalAlert("success", "Berhasil", `Tipe karyawan "${label}" berhasil ditambahkan.`);
  } catch (e) {
    showError("Gagal menyimpan tipe karyawan", e.message);
  } finally {
    savingTypes.value = false;
  }
}

async function removeEmployeeType(typeObj) {
  if (employeeTypes.value.length <= 1) {
    return showSwalAlert("warning", "Tidak Bisa Dihapus", "Minimal harus ada 1 tipe karyawan.");
  }
  const r = await confirm({
    title: "Hapus Tipe Karyawan?",
    text: `Tipe "${typeObj.label}" akan dihapus dari daftar opsi.`,
    icon: "warning",
  });
  if (!r.isConfirmed) return;

  savingTypes.value = true;
  try {
    const updated = employeeTypes.value.filter((t) => t.id !== typeObj.id);
    await saveEmployeeTypes(updated);
    if (form.value.type === typeObj.id) {
      form.value.type = updated[0]?.id || "staff";
    }
    await showSwalAlert("success", "Berhasil", `Tipe karyawan "${typeObj.label}" berhasil dihapus.`);
  } catch (e) {
    showError("Gagal menghapus tipe karyawan", e.message);
  } finally {
    savingTypes.value = false;
  }
}

// ── Computed ──────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchQ.value.toLowerCase();
  return employees.value.filter(
    (e) => !q || e.name.toLowerCase().includes(q) || (e.employeeId || "").toLowerCase().includes(q),
  );
});

// Pagination
const page = ref(1);
const pageSize = 15;
watch(filtered, () => {
  page.value = 1;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));

const paginatedFiltered = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filtered.value.slice(start, start + pageSize);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const cur = page.value;
  const pages = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i);
  return pages;
});

// ── Helpers: ID / Barcode auto-generate ───────────────────────────────────
function nextEmployeeId() {
  const nums = employees.value
    .map((e) => parseInt((e.employeeId || "").replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return "EMP" + String(next).padStart(3, "0");
}

function nextBarcode() {
  const nums = employees.value.map((e) => parseInt((e.barcode || "").replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return "MLT" + String(next).padStart(3, "0");
}

// ── Barcode rendering ─────────────────────────────────────────────────────
async function loadJsBarcode() {
  if (jsBarcodeLoaded) return;
  return new Promise((resolve, reject) => {
    if (window.JsBarcode) {
      jsBarcodeLoaded = true;
      return resolve();
    }
    const el = document.getElementById("jsbarcode-script");
    if (el) {
      el.addEventListener("load", () => {
        jsBarcodeLoaded = true;
        resolve();
      });
      return;
    }
    const s = document.createElement("script");
    s.id = "jsbarcode-script";
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
    s.onload = () => {
      jsBarcodeLoaded = true;
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function renderBarcodes() {
  try {
    await loadJsBarcode();
    await nextTick();
    employees.value.forEach((emp) => {
      const el = barcodeRefs[emp.id];
      if (el && emp.barcode) {
        try {
          window.JsBarcode(el, emp.barcode, {
            format: "CODE128",
            width: 1.5,
            height: 36,
            displayValue: false,
            margin: 2,
          });
        } catch (_) {
          /* skip invalid barcodes */
        }
      }
    });
  } catch (e) {
    console.warn("JsBarcode load failed:", e.message);
  }
}

// ── Face status check ─────────────────────────────────────────────────────
async function checkFaceStatuses() {
  try {
    const faceMap = await fetchAllFaceDescriptors();
    const faceKeys = Object.keys(faceMap);
    const empIds = employees.value.map((e) => e.employeeId);
    console.log("[FaceStatus] employeeFaces doc IDs:", faceKeys);
    console.log("[FaceStatus] employee IDs:", empIds);
    const result = {};
    employees.value.forEach((emp) => {
      // Lookup by: Firestore doc ID (emp.id = auto-generated, stored as employeeId field in employeeFaces),
      // human-readable employeeId (EMP030), barcode, and their uppercase variants
      const found = !!(
        faceMap[emp.id] ||
        faceMap[(emp.id || "").toUpperCase()] ||
        faceMap[emp.employeeId] ||
        faceMap[(emp.employeeId || "").toUpperCase()] ||
        faceMap[(emp.employeeId || "").toLowerCase()] ||
        (emp.barcode && faceMap[emp.barcode]) ||
        (emp.barcode && faceMap[emp.barcode.toUpperCase()])
      );
      result[emp.employeeId] = found;
      if (!found)
        console.log(`[FaceStatus] NO MATCH for id="${emp.id}" employeeId="${emp.employeeId}" barcode="${emp.barcode}"`);
    });
    console.log("[FaceStatus] result:", result);
    faceStatuses.value = result;
  } catch (e) {
    console.error("[FaceStatus] checkFaceStatuses FAILED:", e);
  }
}

// ── Data load ─────────────────────────────────────────────────────────────
async function load(showToast = false) {
  loading.value = true;
  try {
    employees.value = await fetchEmployees();
    form.value.employeeId = nextEmployeeId();
    form.value.barcode = nextBarcode();
    if (showToast) await showSwalAlert("success", "Berhasil", "Data berhasil dimuat ulang");
    await renderBarcodes();
    checkFaceStatuses(); // run in background
  } catch (e) {
    showError("Gagal memuat karyawan", e.message);
  } finally {
    loading.value = false;
  }
}

// ── Modal: Tambah / Edit ──────────────────────────────────────────────────
function openAdd() {
  editTarget.value = null;
  form.value = { employeeId: nextEmployeeId(), name: "", barcode: nextBarcode(), type: "staff" };
  new Modal(document.getElementById("modalTambah")).show();
}

function openEdit(emp) {
  editTarget.value = emp;
  form.value = { employeeId: emp.employeeId, name: emp.name, barcode: emp.barcode, type: emp.type };
  new Modal(document.getElementById("modalTambah")).show();
}

async function saveEmployee() {
  if (!form.value.name.trim() || !form.value.employeeId.trim()) {
    return showSwalAlert("warning", "Input belum lengkap", "Nama dan ID karyawan wajib diisi.");
  }
  saving.value = true;
  try {
    if (editTarget.value) {
      await updateEmployee(editTarget.value.id, {
        name: form.value.name,
        barcode: form.value.barcode,
        type: form.value.type,
      });
      await showSwalAlert("success", "Berhasil", "Data karyawan berhasil diperbarui.");
    } else {
      await apiSaveEmployee({
        employeeId: form.value.employeeId,
        name: form.value.name,
        barcode: form.value.barcode,
        type: form.value.type,
      });
      await showSwalAlert("success", "Berhasil", "Karyawan berhasil ditambahkan.");
    }
    Modal.getInstance(document.getElementById("modalTambah"))?.hide();
    editTarget.value = null;
    await load();
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

async function removeEmployee(emp) {
  const r = await confirm({ title: "Hapus Karyawan?", text: `${emp.name} (${emp.employeeId})`, icon: "warning" });
  if (!r.isConfirmed) return;
  try {
    await deleteEmployee(emp.id);
    await deleteFaceDescriptor(emp.employeeId).catch(() => {});
    await showSwalAlert("success", "Berhasil", "Karyawan berhasil dihapus.");
    await load();
  } catch (e) {
    showError("Gagal menghapus", e.message);
  }
}

// ── Download: single barcode ──────────────────────────────────────────────
async function downloadBarcode(emp) {
  if (!emp.barcode) return showSwalAlert("warning", "Barcode tidak tersedia", "Karyawan tidak memiliki barcode.");
  try {
    await loadJsBarcode();
    const canvas = document.createElement("canvas");
    window.JsBarcode(canvas, emp.barcode, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      text: `${emp.name} | ${emp.barcode}`,
      fontSize: 12,
      margin: 10,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `barcode-${emp.employeeId}-${emp.name.replace(/\s+/g, "_")}.png`;
    link.click();
  } catch (e) {
    showError("Gagal download barcode", e.message);
  }
}

// ── Download: all barcodes as ZIP ─────────────────────────────────────────
async function downloadAllBarcodes() {
  if (!employees.value.length) return;
  try {
    await loadJsBarcode();
    // Load JSZip dynamically
    const JSZip = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js").catch(() => null);
    // Fallback: sequential download if JSZip unavailable
    if (!JSZip || !JSZip.default) {
      for (const emp of employees.value) await downloadBarcode(emp);
      return;
    }
    const zip = new JSZip.default();
    for (const emp of employees.value) {
      if (!emp.barcode) continue;
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, emp.barcode, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        text: `${emp.name} | ${emp.barcode}`,
        fontSize: 12,
        margin: 10,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      zip.file(`barcode-${emp.employeeId}-${emp.name.replace(/\s+/g, "_")}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "barcodes-karyawan.zip";
    link.click();
    await showSwalAlert("success", "Berhasil", "Semua barcode berhasil diunduh.");
  } catch (e) {
    showError("Gagal download semua barcode", e.message);
  }
}

// ── Export Excel ──────────────────────────────────────────────────────────
async function exportExcel() {
  if (!employees.value.length) return;
  try {
    const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.mini.min.js").catch(() => null);
    if (!XLSX || !XLSX.default) return showError("Gagal memuat library Excel", "");
    const X = XLSX.default;
    const rows = employees.value.map((e) => ({
      "ID Karyawan": e.employeeId,
      Nama: e.name,
      Barcode: e.barcode,
      Tipe: e.type,
      "Status Wajah": faceStatuses.value[e.employeeId] ? "Terdaftar" : "Belum",
    }));
    const ws = X.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, "Karyawan");
    X.writeFile(wb, "data-karyawan.xlsx");
    await showSwalAlert("success", "Berhasil", "Export Excel berhasil.");
  } catch (e) {
    showError("Gagal export Excel", e.message);
  }
}

// ── Face enrollment ───────────────────────────────────────────────────────
function loadFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve(window.faceapi);
    const existing = document.getElementById("face-api-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.faceapi));
      return;
    }
    const s = document.createElement("script");
    s.id = "face-api-script";
    s.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    s.onload = () => resolve(window.faceapi);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function openFace(emp) {
  faceTarget.value = emp;
  faceReady.value = false;
  faceDetected.value = false;
  faceError.value = false;
  faceStatus.value = "Mempersiapkan...";

  // Helper: update status in UI AND console simultaneously
  function dbg(msg, isErr = false) {
    console.log("[FaceEnroll]", msg);
    faceStatus.value = msg;
    if (isErr) faceError.value = true;
  }

  const modalEl = document.getElementById("modalFace");

  // Wait for Bootstrap modal animation to finish BEFORE accessing videoEl ref
  await new Promise((resolve) => {
    modalEl.addEventListener("shown.bs.modal", resolve, { once: true });
    new Modal(modalEl).show();
  });
  modalEl.addEventListener("hidden.bs.modal", closeFaceModal, { once: true });

  try {
    // ── Step 1: Load face-api CDN script ────────────────────────────────
    dbg("[1/4] Memuat library face-api.js...");
    if (!faceapi) {
      faceapi = await loadFaceApiScript();
      console.log("[FaceEnroll] face-api loaded, version:", faceapi?.env?.versions?.["face-api.js"] ?? "unknown");

      // ── Step 2: Load models from /public/face-api/models ──────────────
      dbg("[2/4] Memuat model AI (tinyFaceDetector, faceLandmark, faceRecognition)...");
      const modelUrl = "/face-api/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
      ]);
      console.log("[FaceEnroll] All models loaded ✓");
    } else {
      console.log("[FaceEnroll] face-api + models already loaded, skipping.");
    }

    // ── Step 3: Check mediaDevices API + Chrome permission state ────────
    dbg("[3/4] Memeriksa API kamera browser...");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      dbg("❌ Browser tidak mendukung getUserMedia. Gunakan Chrome/Firefox via HTTPS atau localhost.", true);
      return;
    }

    // Proactively query Chrome's permission state.
    // When Chrome has camera BLOCKED for an origin it throws NotFoundError (not NotAllowedError) which is
    // confusing — catch this early with the Permissions API so we can show the correct fix.
    const camPermission = await navigator.permissions.query({ name: "camera" }).catch(() => null);
    console.log("[FaceEnroll] Camera permission state:", camPermission?.state ?? "unavailable");
    if (camPermission?.state === "denied") {
      dbg(
        "❌ Kamera diblokir oleh browser untuk situs ini. " +
          "Klik ikon 🔒 di address bar Chrome → Izinkan Kamera → Refresh halaman. " +
          "Atau buka chrome://settings/content/camera dan hapus situs ini dari daftar Diblokir.",
        true,
      );
      return;
    }

    // Enumerate devices — visible only after permission granted; 0 video is normal before first prompt.
    // Do NOT block on 0 results; always attempt getUserMedia (mirrors pengguna.js pattern).
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    console.log(
      "[FaceEnroll] Devices enumerated:",
      devices.length,
      "total,",
      videoDevices.length,
      "video:",
      videoDevices.map((d) => d.label || "(no label — perlu izin)"),
    );

    // Pre-populate selector when devices already visible (permission previously granted)
    if (videoDevices.length > 0) {
      availableCameras.value = videoDevices.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Kamera ${i + 1}`,
      }));
      if (!selectedCameraId.value || !videoDevices.find((d) => d.deviceId === selectedCameraId.value)) {
        selectedCameraId.value = videoDevices[0].deviceId;
      }
    }

    // ── Step 4: Open camera ───────────────────────────────────────────────
    dbg(
      `[4/4] Membuka kamera${videoDevices.length ? ` (pakai: ${availableCameras.value.find((c) => c.deviceId === selectedCameraId.value)?.label ?? selectedCameraId.value})` : " (menunggu izin browser...)"} ...`,
    );
    await openCameraStream(videoDevices.length > 0 ? selectedCameraId.value : null);

    faceError.value = false;
    faceStatus.value = "Kamera aktif — arahkan wajah ke tengah frame";
    faceReady.value = true;
    startFaceDetectionLoop();

    // Re-enumerate after permission to get real camera labels
    const devicesAfter = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const videoAfter = devicesAfter.filter((d) => d.kind === "videoinput");
    if (videoAfter.some((d) => d.label)) {
      availableCameras.value = videoAfter.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Kamera ${i + 1}`,
      }));
      console.log(
        "[FaceEnroll] Cameras with labels:",
        availableCameras.value.map((c) => c.label),
      );
    }
  } catch (e) {
    console.error("[FaceEnroll] FATAL:", e.name, e.message, e);
    faceError.value = true;
    if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
      faceStatus.value = "❌ Akses kamera ditolak. Klik ikon kunci/kamera di address bar → Izinkan → Refresh halaman.";
    } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
      faceStatus.value = "❌ Kamera sedang dipakai aplikasi lain (Teams/Zoom/OBS). Tutup semua, lalu coba lagi.";
    } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
      // NotFoundError + 0 video devices = Chrome has camera BLOCKED for this origin (not hardware missing).
      // Chrome shows "0 video" from enumerateDevices and throws NotFoundError (not NotAllowedError) when blocked.
      faceStatus.value =
        `❌ Kamera tidak bisa diakses [${e.name}]. Kemungkinan besar kamera diblokir di Chrome untuk situs ini. ` +
        `Klik ikon 🔒 / kamera di address bar Chrome → Izinkan → Refresh halaman. ` +
        `Atau buka chrome://settings/content/camera dan hapus localhost dari daftar "Diblokir".`;
    } else if (e.name === "OverconstrainedError") {
      faceStatus.value = `❌ Resolusi tidak didukung [OverconstrainedError: ${e.constraint}].`;
    } else {
      faceStatus.value = `❌ ${e.message} [${e.name}] — lihat Console (F12) untuk detail.`;
    }
  }
}

// ── Open a specific camera by deviceId (reusable by switchCamera) ─────────────
async function openCameraStream(deviceId) {
  // Stop any existing stream first
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  // 3-tier constraint fallback:
  // tier 1: specific deviceId + ideal resolution (when deviceId is known)
  // tier 2: no deviceId + ideal resolution (let browser pick)
  // tier 3: bare { video: true } (maximum compatibility)
  const constraintTiers = [];
  if (deviceId) {
    constraintTiers.push(
      { video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: { deviceId: { exact: deviceId } } },
    );
  }
  constraintTiers.push({ video: { width: { ideal: 640 }, height: { ideal: 480 } } }, { video: true });

  let lastErr = null;
  for (const c of constraintTiers) {
    try {
      console.log("[FaceEnroll] Trying constraint:", JSON.stringify(c));
      stream = await navigator.mediaDevices.getUserMedia(c);
      console.log("[FaceEnroll] getUserMedia ✓", JSON.stringify(c));
      lastErr = null;
      break;
    } catch (e) {
      console.warn("[FaceEnroll] constraint failed:", e.name, "-", e.message);
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;

  await nextTick();
  if (!videoEl.value) throw new Error("Video element not found in DOM after nextTick");

  videoEl.value.srcObject = stream;

  // Wait for metadata (mirrors pengguna.js onloadedmetadata pattern)
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Video metadata timeout (8s)")), 8000);
    if (videoEl.value.readyState >= 2) {
      clearTimeout(t);
      return resolve();
    }
    videoEl.value.onloadedmetadata = () => {
      clearTimeout(t);
      console.log("[FaceEnroll] metadata:", videoEl.value.videoWidth, "x", videoEl.value.videoHeight);
      resolve();
    };
  });

  await videoEl.value.play().catch((e) => console.warn("[FaceEnroll] play():", e.message));
  console.log("[FaceEnroll] playing ✓ size:", videoEl.value.videoWidth, "x", videoEl.value.videoHeight);
}

// ── Camera switch when user changes select dropdown ───────────────────────
async function switchCamera() {
  if (!faceReady.value && !stream) return; // not open yet
  faceReady.value = false;
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  faceStatus.value = "Mengganti kamera...";
  faceError.value = false;
  try {
    await openCameraStream(selectedCameraId.value);
    faceStatus.value = "Kamera aktif — arahkan wajah ke tengah frame";
    faceReady.value = true;
    startFaceDetectionLoop();
  } catch (e) {
    faceError.value = true;
    faceStatus.value = `❌ Gagal mengganti kamera: ${e.message} [${e.name}]`;
  }
}

function startFaceDetectionLoop() {
  if (detectionInterval) clearInterval(detectionInterval);
  detectionInterval = setInterval(async () => {
    if (!videoEl.value || !faceapi || !faceReady.value) return;
    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const det = await faceapi.detectSingleFace(videoEl.value, options).withFaceLandmarks(true);
      faceDetected.value = !!det;
      faceStatus.value = det ? "Wajah terdeteksi — klik Simpan Wajah" : "Wajah tidak terdeteksi, sesuaikan posisi...";
      if (det && overlayCanvas.value && videoEl.value) {
        const canvas = overlayCanvas.value;
        const dims = faceapi.matchDimensions(canvas, videoEl.value, true);
        const resized = faceapi.resizeResults(det, dims);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, [resized]);
        faceapi.draw.drawFaceLandmarks(canvas, [resized]);
      }
    } catch (_) {
      /* ignore mid-frame errors */
    }
  }, 400);
}

function closeFaceModal() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  faceReady.value = false;
  faceDetected.value = false;
  faceError.value = false;
  faceTarget.value = null;
  availableCameras.value = [];
  selectedCameraId.value = "";
  if (overlayCanvas.value) {
    const ctx = overlayCanvas.value.getContext("2d");
    ctx.clearRect(0, 0, overlayCanvas.value.width, overlayCanvas.value.height);
  }
  Modal.getInstance(document.getElementById("modalFace"))?.hide();
}

async function captureFace() {
  if (!faceReady.value || !videoEl.value) return;
  savingFace.value = true;
  faceStatus.value = "Mendeteksi & mengambil descriptor wajah...";
  try {
    const detection = await faceapi
      .detectSingleFace(videoEl.value, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    if (!detection) {
      faceStatus.value = "Wajah tidak terdeteksi. Posisikan ulang dan coba lagi.";
      return;
    }
    await saveFaceDescriptor(faceTarget.value.employeeId, Array.from(detection.descriptor));
    faceStatuses.value = { ...faceStatuses.value, [faceTarget.value.employeeId]: true };
    await showSwalAlert("success", "Berhasil", `Wajah ${faceTarget.value.name} berhasil didaftarkan.`);
    closeFaceModal();
  } catch (e) {
    showError("Gagal menyimpan wajah", e.message);
  } finally {
    savingFace.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  load();
  unsubEmployeeTypes = subscribeEmployeeTypes((types) => {
    employeeTypes.value = types;
    if (types.length && !types.some((t) => t.id === form.value.type)) {
      form.value.type = types[0].id;
    }
  });
});

onUnmounted(() => {
  if (unsubEmployeeTypes) unsubEmployeeTypes();
  if (detectionInterval) clearInterval(detectionInterval);
  if (stream) stream.getTracks().forEach((t) => t.stop());
});
</script>

<style scoped>
#modalKelolaTipe {
  z-index: 1065 !important;
}

.btn-delete-type {
  padding: 0.15rem 0.35rem;
  font-size: 0.7rem;
  line-height: 1;
  border-radius: 4px;
}
</style>
