<template>
  <div class="container-fluid py-3">
    <h4 class="fw-bold mb-4">
      <i class="bi bi-key me-2 text-warning"></i>
      Kode Akses
    </h4>

    <div class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>Fungsi</th>
              <th>Keterangan</th>
              <th>Terakhir Diubah</th>
              <th class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-warning"></div>
              </td>
            </tr>
            <tr v-for="def in DEFINITIONS" :key="def.key" v-else>
              <td>
                <span :class="`text-${def.color}`"><i :class="`bi bi-${def.icon} me-1`"></i></span>
                <span class="small fw-semibold">{{ def.label }}</span>
              </td>
              <td class="small text-muted">{{ def.description }}</td>
              <td class="small text-muted">
                <span v-if="meta.lastUpdated">{{ formatTs(meta.lastUpdated) }}</span>
                <span v-if="meta.updatedBy" class="ms-1 text-muted fst-italic">oleh: {{ meta.updatedBy }}</span>
              </td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-warning" @click="openEdit(def)">
                  <i class="bi bi-pencil me-1"></i>
                  Ubah
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Modal -->
    <div class="modal fade" id="editCodeModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title small fw-bold">Ubah Kode — {{ editDef?.label }}</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="small text-muted mb-3">{{ editDef?.description }}</div>
            <div class="mb-2">
              <label class="form-label small">Kode Saat Ini</label>
              <input
                ref="oldRef"
                v-model="editForm.old"
                type="password"
                class="form-control form-control-sm"
                @keydown.enter="$refs.newRef.focus()"
                autocomplete="current-password"
              />
            </div>
            <div class="mb-2">
              <label class="form-label small">Kode Baru (min 6 karakter)</label>
              <div class="input-group">
                <input
                  ref="newRef"
                  v-model="editForm.new"
                  :type="showNew ? 'text' : 'password'"
                  class="form-control form-control-sm"
                  @keydown.enter="$refs.confirmRef.focus()"
                  autocomplete="new-password"
                />
                <button class="btn btn-outline-secondary btn-sm" @click="showNew = !showNew" type="button">
                  <i :class="`bi bi-eye${showNew ? '-slash' : ''}`"></i>
                </button>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small">Konfirmasi Kode Baru</label>
              <input
                ref="confirmRef"
                v-model="editForm.confirm"
                type="password"
                class="form-control form-control-sm"
                @keydown.enter="saveCode"
                autocomplete="new-password"
              />
            </div>
            <div v-if="editError" class="text-danger small mt-1">{{ editError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveCode" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { Modal } from "bootstrap";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { hashSecret, isSha256Hex, verifyStoredSecret } from "@/utils/security";

const { toast, error: showError } = useAlert();
const auth = useAuthStore();

const BANNED = ["123456", "password", "admin"];
const DEFINITIONS = [
  {
    key: "editDataPenjualan",
    label: "Edit Data Penjualan",
    description: "Mengedit transaksi penjualan aksesoris",
    icon: "pencil-square",
    color: "primary",
  },
  {
    key: "deleteDataPenjualan",
    label: "Hapus Data Penjualan",
    description: "Menghapus transaksi penjualan aksesoris",
    icon: "trash",
    color: "danger",
  },
  {
    key: "editServis",
    label: "Edit Data Servis",
    description: "Mengedit data servis dan custom",
    icon: "pencil",
    color: "warning",
  },
  {
    key: "deleteServis",
    label: "Hapus Data Servis",
    description: "Menghapus data servis dan custom",
    icon: "x-circle",
    color: "danger",
  },
  {
    key: "editLaporanKehadiran",
    label: "Edit Laporan Kehadiran",
    description: "Mengedit data pada halaman laporan kehadiran",
    icon: "calendar-check",
    color: "primary",
  },
  {
    key: "deleteLaporanKehadiran",
    label: "Hapus Laporan Kehadiran",
    description: "Menghapus data pada halaman laporan kehadiran",
    icon: "calendar-x",
    color: "danger",
  },
  {
    key: "deleteMutasiKode",
    label: "Hapus Mutasi Kode",
    description: "Menghapus data pada tab kode sudah dimutasi",
    icon: "archive",
    color: "danger",
  },
  {
    key: "deleteRiwayatReturn",
    label: "Hapus Riwayat Return",
    description: "Menghapus data pada riwayat return barang aksesoris",
    icon: "arrow-return-left",
    color: "danger",
  },
  {
    key: "deleteRiwayatTambahBarang",
    label: "Hapus Riwayat Tambah Barang",
    description: "Menghapus data pada riwayat penambahan stok aksesoris",
    icon: "boxes",
    color: "danger",
  },
];

const loading = ref(true);
const saving = ref(false);
const showNew = ref(false);
const codes = ref({});
const meta = ref({ lastUpdated: null, updatedBy: "" });
const editDef = ref(null);
const editForm = ref({ old: "", new: "", confirm: "" });
const editError = ref("");
const oldRef = ref(null);

function formatTs(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getDefaultCodes() {
  const defaults = {
    editDataPenjualan: "admin123",
    deleteDataPenjualan: "smlt116",
    editServis: "admin123",
    deleteServis: "smlt116",
    editLaporanKehadiran: "admin123",
    deleteLaporanKehadiran: "smlt116",
    deleteMutasiKode: "smlt116",
    deleteRiwayatReturn: "smlt116",
    deleteRiwayatTambahBarang: "smlt116",
  };
  const hashedDefaults = {};
  await Promise.all(
    Object.entries(defaults).map(async ([key, value]) => {
      hashedDefaults[key] = await hashSecret(value);
    }),
  );
  return hashedDefaults;
}

async function loadCodes() {
  loading.value = true;
  try {
    const docRef = doc(db, "settings", "passwords");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const defaults = await getDefaultCodes();
      const now = Timestamp.now();
      await setDoc(docRef, {
        ...defaults,
        lastUpdated: now,
        updatedBy: auth.user?.email || "system",
      });
      codes.value = defaults;
      meta.value = { lastUpdated: now, updatedBy: auth.user?.email || "system" };
    } else {
      const data = snap.data();
      codes.value = data;
      meta.value = { lastUpdated: data.lastUpdated, updatedBy: data.updatedBy };

      const migrationUpdates = {};
      const defaultCodes = await getDefaultCodes();
      await Promise.all(
        DEFINITIONS.map(async ({ key }) => {
          const currentValue = data[key];
          if (!currentValue && defaultCodes[key]) {
            migrationUpdates[key] = defaultCodes[key];
            return;
          }
          if (currentValue && !isSha256Hex(currentValue)) {
            migrationUpdates[key] = await hashSecret(currentValue);
          }
        }),
      );

      if (Object.keys(migrationUpdates).length) {
        const now = Timestamp.now();
        await updateDoc(docRef, {
          ...migrationUpdates,
          lastUpdated: now,
          updatedBy: auth.user?.email || data.updatedBy || "system-migration",
        });
        codes.value = { ...codes.value, ...migrationUpdates };
        meta.value = {
          lastUpdated: now,
          updatedBy: auth.user?.email || data.updatedBy || "system-migration",
        };
      }
    }
  } catch (e) {
    showError("Gagal memuat kode", e.message);
  } finally {
    loading.value = false;
  }
}

function openEdit(def) {
  editDef.value = def;
  editForm.value = { old: "", new: "", confirm: "" };
  editError.value = "";
  showNew.value = false;
  const m = Modal.getOrCreateInstance(document.getElementById("editCodeModal"));
  m.show();
  nextTick(() => oldRef.value?.focus());
}

async function saveCode() {
  editError.value = "";
  const { old, new: newCode, confirm } = editForm.value;
  if (!old || !newCode || !confirm) {
    editError.value = "Semua field wajib diisi.";
    return;
  }
  const oldCodeValid = await verifyStoredSecret(old, codes.value[editDef.value.key], { allowLegacyBase64: true });
  if (!oldCodeValid) {
    editError.value = "Kode lama tidak sesuai.";
    return;
  }
  if (newCode.length < 6) {
    editError.value = "Kode baru minimal 6 karakter.";
    return;
  }
  if (newCode === old) {
    editError.value = "Kode baru tidak boleh sama dengan kode lama.";
    return;
  }
  if (newCode !== confirm) {
    editError.value = "Konfirmasi kode tidak cocok.";
    return;
  }
  if (BANNED.includes(newCode)) {
    editError.value = "Kode terlalu lemah.";
    return;
  }

  saving.value = true;
  try {
    const docRef = doc(db, "settings", "passwords");
    const hashedCode = await hashSecret(newCode);
    const now = Timestamp.now();
    await updateDoc(docRef, {
      [editDef.value.key]: hashedCode,
      lastUpdated: now,
      updatedBy: auth.user?.email || "",
    });
    codes.value[editDef.value.key] = hashedCode;
    meta.value = { lastUpdated: now, updatedBy: auth.user?.email };
    Modal.getInstance(document.getElementById("editCodeModal"))?.hide();
    toast(`Kode ${editDef.value.label} berhasil diubah`);
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadCodes();
});
</script>
