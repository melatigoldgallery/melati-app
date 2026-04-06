<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-file-earmark-text me-2 text-warning"></i>Pengajuan Izin
      </h4>
    </div>

    <!-- Employee Lookup -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2">
        <div class="row g-2 align-items-end">
          <div class="col-md-3">
            <label class="form-label small fw-semibold mb-1">ID Karyawan</label>
            <div class="input-group">
              <input v-model="employeeIdInput" type="text" class="form-control form-control-sm" placeholder="EMP001" @keydown.enter="lookupEmployee" />
              <button class="btn btn-warning btn-sm" @click="lookupEmployee" :disabled="lookingUp">
                <span v-if="lookingUp" class="spinner-border spinner-border-sm"></span>
                <i v-else class="bi bi-search"></i>
              </button>
            </div>
          </div>
          <div v-if="employee" class="col-md-auto">
            <span class="badge bg-success">{{ employee.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div v-if="employee" class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold py-2">
        <i class="bi bi-file-earmark-plus me-1 text-warning"></i> Form Pengajuan Izin
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal Mulai <span class="text-danger">*</span></label>
            <input v-model="form.leaveStartDate" type="date" class="form-control form-control-sm" required />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tanggal Selesai <span class="text-danger">*</span></label>
            <input v-model="form.leaveEndDate" type="date" class="form-control form-control-sm" required />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Jenis Izin <span class="text-danger">*</span></label>
            <select v-model="form.leaveType" class="form-select form-select-sm">
              <option value="normal">Izin Lainnya</option>
              <option value="sakit">Izin Sakit</option>
              <option value="cuti">Cuti</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Pengganti</label>
            <select v-model="form.replacementType" class="form-select form-select-sm">
              <option value="tidak">Tidak Perlu</option>
              <option value="libur">Ganti Hari Libur</option>
              <option value="jam">Ganti Jam</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Alasan <span class="text-danger">*</span></label>
            <textarea v-model="form.reason" rows="3" class="form-control form-control-sm" placeholder="Jelaskan alasan izin..."></textarea>
          </div>
        </div>
        <div class="d-flex justify-content-end mt-3">
          <button class="btn btn-warning btn-sm" @click="submitForm" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-send me-1"></i>Ajukan Izin
          </button>
        </div>
      </div>
    </div>

    <!-- My Requests -->
    <div v-if="myRequests.length > 0" class="card border-0 shadow-sm">
      <div class="card-header bg-white fw-semibold py-2 small">
        <i class="bi bi-list-check me-1"></i>Pengajuan Saya
      </div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Alasan</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in myRequests" :key="req.id">
              <td class="small">{{ req.leaveStartDate }}{{ req.leaveEndDate !== req.leaveStartDate ? ` s/d ${req.leaveEndDate}` : '' }}</td>
              <td><span class="badge bg-info text-dark">{{ req.leaveType }}</span></td>
              <td class="small text-muted">{{ req.reason }}</td>
              <td class="text-center">
                <span class="badge" :class="statusBadge(req.status)">{{ req.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { findEmployeeByCode, submitLeaveRequest, fetchLeavesByRange } from "@/services/absensi-service";

const { toast, error: showError } = useAlert();
const { todayStringWITA } = useWITA();

const employeeIdInput = ref("");
const lookingUp = ref(false);
const submitting = ref(false);
const employee = ref(null);
const myRequests = ref([]);

const form = ref({
  leaveStartDate: todayStringWITA(),
  leaveEndDate: todayStringWITA(),
  leaveType: "normal",
  replacementType: "tidak",
  reason: "",
});

function statusBadge(status) {
  if (status === "Disetujui") return "bg-success";
  if (status === "Ditolak") return "bg-danger";
  return "bg-warning text-dark";
}

async function lookupEmployee() {
  if (!employeeIdInput.value.trim()) return;
  lookingUp.value = true;
  try {
    const emp = await findEmployeeByCode(employeeIdInput.value.trim());
    if (!emp) return toast("Karyawan tidak ditemukan", "warning");
    employee.value = emp;
    // Fetch last 3 months of their requests
    const start = todayStringWITA().substring(0, 7) + "-01";
    const end = todayStringWITA();
    const all = await fetchLeavesByRange(start.substring(0, 4) + "-01-01", end);
    myRequests.value = all.filter((r) => r.employeeId === emp.employeeId);
  } catch (e) {
    showError("Gagal mencari karyawan", e.message);
  } finally {
    lookingUp.value = false;
  }
}

async function submitForm() {
  if (!form.value.leaveStartDate || !form.value.leaveEndDate) return toast("Tanggal wajib diisi", "warning");
  if (!form.value.reason.trim()) return toast("Alasan wajib diisi", "warning");

  submitting.value = true;
  try {
    const startParts = form.value.leaveStartDate.split("-");
    const dayCount = Math.max(1, Math.round(
      (new Date(form.value.leaveEndDate) - new Date(form.value.leaveStartDate)) / 86400000
    ) + 1);
    await submitLeaveRequest({
      employeeId: employee.value.employeeId,
      name: employee.value.name,
      leaveStartDate: form.value.leaveStartDate,
      leaveEndDate: form.value.leaveEndDate,
      leaveDate: new Date(form.value.leaveStartDate),
      rawLeaveDate: form.value.leaveStartDate,
      month: parseInt(startParts[1]),
      year: parseInt(startParts[0]),
      reason: form.value.reason.trim(),
      leaveType: form.value.leaveType,
      replacementType: form.value.replacementType,
      replacementDetails: { type: form.value.replacementType, needReplacement: form.value.replacementType !== "tidak" },
      isMultiDay: dayCount > 1,
      dayCount,
      submissionDate: new Date().toISOString(),
    });
    toast("Pengajuan izin berhasil dikirim");
    form.value = { leaveStartDate: todayStringWITA(), leaveEndDate: todayStringWITA(), leaveType: "normal", replacementType: "tidak", reason: "" };
    await lookupEmployee();
  } catch (e) {
    showError("Gagal mengajukan izin", e.message);
  } finally {
    submitting.value = false;
  }
}
</script>
