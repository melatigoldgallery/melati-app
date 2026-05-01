<template>
  <div class="container-fluid py-3">
    <!-- Page Header -->
    <div class="page-header mb-3">
      <h1>
        <i class="bi bi-bag-check me-2 text-dark"></i>
        Input Order Online
      </h1>
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb mb-0">
          <li class="breadcrumb-item"><router-link to="/dashboard">Home</router-link></li>
          <li class="breadcrumb-item"><router-link to="/order-online/input">Order Online</router-link></li>
          <li class="breadcrumb-item active" aria-current="page">Input Order</li>
        </ol>
      </nav>
    </div>

    <form @submit.prevent="saveData">
      <!-- Data Pelanggan -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold py-2">
          <span>
            <i class="bi bi-person-fill me-1 text-dark"></i>
            Data Pelanggan
          </span>
        </div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-2">
              <label class="form-label small fw-semibold">
                Tanggal
                <span class="text-danger">*</span>
              </label>
              <input v-model="form.tanggal" type="date" class="form-control form-control-sm" required />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">
                Nama Admin
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.namaAdmin"
                type="text"
                class="form-control form-control-sm"
                placeholder="Nama admin"
                required
              />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">
                Nama Customer
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.namaCustomer"
                type="text"
                class="form-control form-control-sm"
                placeholder="Nama customer"
                required
              />
            </div>
            <div class="col-md-2">
              <label class="form-label small fw-semibold">
                Kontak
                <span class="text-danger">*</span>
              </label>
              <input v-model="form.kontak" type="text" class="form-control form-control-sm" placeholder="08xxx" required />
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Barang -->
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-list-ul me-1 text-dark"></i>
            Detail Barang Order
          </span>
          <button type="button" class="btn btn-sm btn-primary" @click="addRow">
            <i class="bi bi-plus me-1"></i>
            Tambah Baris
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 50px">Jml</th>
                  <th>Nama Barang</th>
                  <th style="width: 100px">Berat</th>
                  <th style="width: 80px">Karat</th>
                  <th style="width: 130px">Harga (Rp)</th>
                  <th style="width: 36px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in detailRows" :key="index">
                  <td>
                    <input v-model.number="row.jml" type="number" min="1" class="form-control form-control-sm text-center" />
                  </td>
                  <td>
                    <input v-model="row.namaBarang" type="text" class="form-control form-control-sm" placeholder="Nama barang" />
                  </td>
                  <td>
                    <input v-model="row.berat" type="number" step="0.01" min="0" class="form-control form-control-sm" placeholder="0.00" />
                  </td>
                  <td>
                    <input v-model="row.karat" type="text" class="form-control form-control-sm" placeholder="22K" />
                  </td>
                  <td>
                    <input v-model.number="row.harga" type="number" min="0" class="form-control form-control-sm text-end" placeholder="0" />
                  </td>
                  <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeRow(index)" :disabled="detailRows.length === 1">
                      <i class="bi bi-x"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot class="table-light">
                <tr>
                  <td colspan="4" class="text-end fw-semibold">Total Harga:</td>
                  <td class="fw-bold text-success">Rp {{ totalHarga.toLocaleString("id-ID") }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-secondary btn-sm" @click="resetForm" :disabled="saving">
          <i class="bi bi-arrow-counterclockwise me-1"></i>
          Reset
        </button>
        <button type="submit" class="btn btn-warning btn-sm" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-save me-1"></i>
          Simpan
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { useWITA } from "@/composables/useWITA";
import { saveOrderOnline } from "@/services/order-online-service";

const auth = useAuthStore();
const { swal, error: showError } = useAlert();
const { todayStringWITA, timeStringWITA } = useWITA();

const saving = ref(false);

const form = reactive({
  tanggal: todayStringWITA(),
  namaAdmin: auth.currentUser?.displayName || auth.currentUser?.username || "",
  namaCustomer: "",
  kontak: "",
});

const detailRows = ref([{ jml: 1, namaBarang: "", berat: "", karat: "", harga: "" }]);

const totalHarga = computed(() => {
  return detailRows.value.reduce((sum, row) => sum + (Number(row.harga) || 0), 0);
});

function addRow() {
  detailRows.value.push({ jml: 1, namaBarang: "", berat: "", karat: "", harga: "" });
}

function removeRow(index) {
  if (detailRows.value.length === 1) return;
  detailRows.value.splice(index, 1);
}

function resetForm() {
  form.tanggal = todayStringWITA();
  form.namaAdmin = auth.currentUser?.displayName || auth.currentUser?.username || "";
  form.namaCustomer = "";
  form.kontak = "";
  detailRows.value = [{ jml: 1, namaBarang: "", berat: "", karat: "", harga: "" }];
}

async function saveData() {
  if (saving.value) return;

  try {
    saving.value = true;
    const payload = {
      ...form,
      jam: timeStringWITA().slice(0, 5),
      detailBarang: detailRows.value,
      createdBy: auth.currentUser?.username || auth.currentUser?.displayName || form.namaAdmin,
      updatedBy: auth.currentUser?.username || auth.currentUser?.displayName || form.namaAdmin,
    };
    const result = await saveOrderOnline(payload);
    await swal(`Order online berhasil disimpan (${result.savedCount} detail)`, "success");
    resetForm();
  } catch (err) {
    showError("Gagal menyimpan order online", err?.message || "Silakan cek kembali data input.");
  } finally {
    saving.value = false;
  }
}
</script>
