<template>
  <div class="container-fluid py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h4 class="fw-bold mb-0">
        <i class="bi bi-people me-2 text-warning"></i>
        Kelola Pengguna
      </h4>
      <button class="btn btn-warning btn-sm" @click="openAdd">
        <i class="bi bi-person-plus me-1"></i>
        Tambah User
      </button>
    </div>

    <!-- Stats -->
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-2">
          <div class="fw-bold fs-5">{{ users.length }}</div>
          <div class="small text-muted">Total User</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-2">
          <div class="fw-bold fs-5 text-primary">{{ countRole("admin") }}</div>
          <div class="small text-muted">Admin</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-2">
          <div class="fw-bold fs-5 text-secondary">{{ countRole("staff") }}</div>
          <div class="small text-muted">Staff</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card border-0 shadow-sm text-center py-2">
          <div class="fw-bold fs-5 text-info">{{ countRole("hrd") }}</div>
          <div class="small text-muted">HRD</div>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-body py-2">
        <input v-model="searchQ" type="text" class="form-control form-control-sm" placeholder="Cari username..." />
      </div>
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead class="table-light">
            <tr>
              <th>Username</th>
              <th>Nama</th>
              <th>Role</th>
              <th>Dibuat</th>
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
            <tr v-for="u in filtered" :key="u.username">
              <td class="small fw-semibold">{{ u.username }}</td>
              <td class="small">{{ u.displayName || "-" }}</td>
              <td>
                <span class="badge" :class="getRoleBadgeClass(u.role)">
                  {{ getRoleLabel(u.role) }}
                </span>
              </td>
              <td class="small text-muted">{{ formatTs(u.createdAt) }}</td>
              <td class="text-center">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary btn-sm" @click="openEdit(u)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button v-if="!isProtectedUser(u)" class="btn btn-outline-danger btn-sm" @click="removeUser(u)">
                    <i class="bi bi-trash"></i>
                  </button>
                  <button
                    v-else
                    class="btn btn-outline-secondary btn-sm"
                    disabled
                    title="Akun supervisor tidak dapat dihapus"
                  >
                    <i class="bi bi-shield-lock"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal fade" id="userModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title small fw-bold">{{ editTarget ? "Edit" : "Tambah" }} Pengguna</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label small">
                  Username
                  <span class="text-danger">*</span>
                </label>
                <input
                  v-model="form.username"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="min 3 karakter, tanpa spasi"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label small">Nama Tampil</label>
                <input v-model="form.displayName" type="text" class="form-control form-control-sm" />
              </div>
              <div class="col-md-4">
                <label class="form-label small">
                  Role
                  <span class="text-danger">*</span>
                </label>
                <select v-model="form.role" class="form-select form-select-sm">
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="staff">Staff</option>
                  <option value="hrd">HRD</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small">
                  Email Firebase Auth
                  <span class="text-muted">(untuk login, opsional)</span>
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control form-control-sm"
                  placeholder="email@melati.com"
                />
                <div class="form-text small text-muted">
                  Isi jika user ini login via Firebase Auth. Role akan disinkronkan otomatis.
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label small">
                  {{ editTarget ? "Password Baru (kosongkan jika tidak diubah)" : "Password *" }}
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-control form-control-sm"
                  autocomplete="new-password"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label small">Konfirmasi Password</label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  class="form-control form-control-sm"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <!-- Permissions (for admin/staff/hrd) -->
            <div v-if="form.role !== 'supervisor'" class="mt-3">
              <div class="fw-semibold small mb-2">Hak Akses</div>
              <div class="row g-1">
                <div v-for="(items, group) in PERMISSION_GROUPS" :key="group" class="col-md-6">
                  <div class="border rounded p-2 small">
                    <div class="fw-semibold text-capitalize mb-1">{{ getPermissionGroupLabel(group) }}</div>
                    <div v-for="perm in items" :key="perm.key" class="form-check form-check-sm mb-1">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`perm-${perm.key}`"
                        v-model="form.permissions[group][perm.key]"
                      />
                      <label class="form-check-label" :for="`perm-${perm.key}`">{{ perm.label }}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="formError" class="text-danger small mt-2">{{ formError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Batal</button>
            <button class="btn btn-warning btn-sm" @click="saveUser" :disabled="saving">
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
import { ref, computed, onMounted } from "vue";
import { Modal } from "bootstrap";
import { db } from "@/config/firebase";
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { useAlert } from "@/composables/useAlert";
import { hashSecret } from "@/utils/security";
import {
  buildUserAccessMap,
  createDefaultAccessMap,
  normalizeAccessMap,
  normalizeUserRole,
} from "@/config/access-control";

const { toast, error: showError, confirm } = useAlert();

const PERMISSION_GROUPS = {
  "inventory-barang": [
    { key: "manajemen-stok", label: "Manajemen Stok" },
    { key: "laporan-stok-harian", label: "Laporan Stok Harian" },
    { key: "mutasi-kode", label: "Mutasi Kode" },
    { key: "restok-barang", label: "Restok Barang" },
    { key: "buyback", label: "Buyback" },
  ],
  aksesoris: [
    { key: "tambah-barang", label: "Tambah Barang" },
    { key: "data-penjualan", label: "Data Penjualan" },
    { key: "penjualan", label: "Penjualan" },
    { key: "return", label: "Return" },
    { key: "kelola-sales", label: "Kelola Sales" },
    { key: "laporan-penjualan", label: "Laporan Penjualan" },
    { key: "laporan-stok", label: "Laporan Stok" },
  ],
  antrian: [
    { key: "admin-antrian", label: "Admin Antrian" },
    { key: "display-antrian", label: "Display Antrian" },
    { key: "laporan-antrian", label: "Laporan Antrian" },
  ],
  absensi: [
    { key: "kehadiran", label: "Kehadiran" },
    { key: "pengajuan-izin", label: "Pengajuan Izin" },
    { key: "laporan-kehadiran", label: "Laporan Kehadiran" },
    { key: "laporan-izin", label: "Laporan Izin" },
    { key: "supervisor", label: "Supervisor" },
    { key: "tambah-pengguna", label: "Tambah Pengguna" },
  ],
  servis: [
    { key: "input-servis", label: "Input Servis" },
    { key: "data-servis", label: "Data Servis" },
    { key: "laporan-servis", label: "Laporan Servis" },
  ],
  promosi: [{ key: "setting-promosi", label: "Setting Promosi" }],
  admin: [
    { key: "kelola-user", label: "Kelola User" },
    { key: "kode-akses", label: "Kode Akses" },
    { key: "jam-absensi", label: "Jam Absensi" },
    { key: "antrian-penutupan", label: "Setting Antrian" },
    { key: "tema-warna", label: "Tema Warna" },
    { key: "maintenance", label: "Maintenance" },
  ],
};

const PERMISSION_TO_PAGE = {
  "inventory-barang.manajemen-stok": "inventory.manajemen",
  "inventory-barang.laporan-stok-harian": "inventory.laporan-harian",
  "inventory-barang.mutasi-kode": "inventory.mutasi-kode",
  "inventory-barang.restok-barang": "inventory.restok",
  "inventory-barang.buyback": "inventory.buyback",
  "aksesoris.tambah-barang": "aksesoris.tambah-barang",
  "aksesoris.data-penjualan": "aksesoris.data-penjualan",
  "aksesoris.penjualan": "aksesoris.penjualan",
  "aksesoris.return": "aksesoris.return",
  "aksesoris.kelola-sales": "aksesoris.kelola-sales",
  "aksesoris.laporan-penjualan": "aksesoris.laporan-penjualan",
  "aksesoris.laporan-stok": "aksesoris.laporan-stok",
  "antrian.admin-antrian": "antrian.admin",
  "antrian.display-antrian": "antrian.display",
  "antrian.laporan-antrian": "antrian.laporan",
  "absensi.kehadiran": "absensi.kehadiran",
  "absensi.pengajuan-izin": "absensi.pengajuan-izin",
  "absensi.laporan-kehadiran": "absensi.laporan-kehadiran",
  "absensi.laporan-izin": "absensi.laporan-izin",
  "absensi.supervisor": "absensi.supervisor",
  "absensi.tambah-pengguna": "absensi.tambah-pengguna",
  "servis.input-servis": "servis.input",
  "servis.data-servis": "servis.data",
  "servis.laporan-servis": "servis.laporan",
  "promosi.setting-promosi": "promosi.setting",
  "admin.kelola-user": "admin.users",
  "admin.kode-akses": "admin.access-codes",
  "admin.jam-absensi": "admin.jam-absensi",
  "admin.antrian-penutupan": "admin.antrian-closing",
  "admin.tema-warna": "admin.theme-appearance",
  "admin.maintenance": "admin.maintenance",
};

function defaultPermissions() {
  const p = {};
  for (const [group, items] of Object.entries(PERMISSION_GROUPS)) {
    p[group] = {};
    for (const item of items) p[group][item.key] = false;
  }
  return p;
}

function permissionsFromPagesAccess(pagesAccess) {
  const p = defaultPermissions();
  Object.entries(PERMISSION_TO_PAGE).forEach(([legacyKey, pageKey]) => {
    const [group, key] = legacyKey.split(".");
    if (p[group] && Object.prototype.hasOwnProperty.call(p[group], key)) {
      p[group][key] = !!pagesAccess?.[pageKey];
    }
  });
  return p;
}

function pagesAccessFromPermissions(permissions, role = "staff") {
  const mapped = {};
  Object.entries(PERMISSION_TO_PAGE).forEach(([legacyKey, pageKey]) => {
    const [group, key] = legacyKey.split(".");
    mapped[pageKey] = !!permissions?.[group]?.[key];
  });
  return normalizeAccessMap(mapped, role);
}

const loading = ref(true);
const saving = ref(false);
const users = ref([]);
const searchQ = ref("");
const editTarget = ref(null);
const originalUsername = ref("");
const formError = ref("");
const form = ref({
  username: "",
  email: "",
  displayName: "",
  role: "staff",
  password: "",
  confirmPassword: "",
  permissions: defaultPermissions(),
});

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase();
  return users.value.filter((u) => !q || u.username.toLowerCase().includes(q));
});

function countRole(role) {
  const targetRole = normalizeUserRole(role, "staff");
  return users.value.filter((u) => normalizeUserRole(u.role, "staff") === targetRole).length;
}

function getRoleBadgeClass(role) {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (normalizedRole === "admin") return "bg-warning text-dark";
  if (normalizedRole === "supervisor") return "bg-primary";
  if (normalizedRole === "hrd") return "bg-info text-dark";
  if (normalizedRole === "admin_custom") return "bg-dark";
  return "bg-secondary";
}

function getRoleLabel(role) {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (normalizedRole === "staff") return "Staff";
  if (normalizedRole === "hrd") return "HRD";
  if (normalizedRole === "admin_custom") return "Admin Custom";
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
}

function getPermissionGroupLabel(group) {
  if (group === "admin") return "pengaturan";
  return group.replace(/-/g, " ");
}

function isProtectedUser(user) {
  return normalizeUserRole(user?.role, "staff") === "supervisor";
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function findUserByUsername(username) {
  const normalized = normalizeUsername(username).toLowerCase();
  return users.value.find((u) => normalizeUsername(u.username).toLowerCase() === normalized);
}

function formatTs(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function loadUsers() {
  loading.value = true;
  try {
    const snap = await getDocs(collection(db, "users"));
    users.value = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        ...data,
        role: normalizeUserRole(data.role, "staff"),
      };
    });
  } catch (e) {
    showError("Gagal memuat pengguna", e.message);
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  editTarget.value = null;
  originalUsername.value = "";
  form.value = {
    username: "",
    email: "",
    displayName: "",
    role: "staff",
    password: "",
    confirmPassword: "",
    permissions: defaultPermissions(),
  };
  formError.value = "";
  Modal.getOrCreateInstance(document.getElementById("userModal")).show();
}

function openEdit(u) {
  const userRole = normalizeUserRole(u.role, "staff");
  const pagesAccess = buildUserAccessMap(u, userRole);
  editTarget.value = u;
  originalUsername.value = u.username;
  form.value = {
    username: u.username,
    email: u.email || "",
    displayName: u.displayName || "",
    role: userRole,
    password: "",
    confirmPassword: "",
    permissions: permissionsFromPagesAccess(pagesAccess),
  };
  formError.value = "";
  Modal.getOrCreateInstance(document.getElementById("userModal")).show();
}

async function saveUser() {
  formError.value = "";
  const { username, email, displayName, role, password, confirmPassword, permissions } = form.value;
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = String(email || "").trim();
  const normalizedRole = normalizeUserRole(role, "staff");
  if (!normalizedUsername || normalizedUsername.length < 3) {
    formError.value = "Username minimal 3 karakter.";
    return;
  }
  if (normalizedUsername.includes(" ")) {
    formError.value = "Username tidak boleh mengandung spasi.";
    return;
  }
  if (!editTarget.value && !password) {
    formError.value = "Password wajib diisi.";
    return;
  }
  if (password && password !== confirmPassword) {
    formError.value = "Konfirmasi password tidak cocok.";
    return;
  }

  saving.value = true;
  try {
    const effectivePagesAccess =
      normalizedRole === "supervisor"
        ? createDefaultAccessMap("supervisor")
        : pagesAccessFromPermissions(permissions, normalizedRole);

    const now = Timestamp.now();

    const data = {
      username: normalizedUsername,
      email: normalizedEmail || null,
      displayName,
      role: normalizedRole,
      permissions: normalizedRole === "supervisor" ? null : permissions,
      pagesAccess: effectivePagesAccess,
      updatedAt: now,
    };

    if (!editTarget.value) {
      // Check duplicate
      const existing = findUserByUsername(normalizedUsername);
      if (existing) {
        formError.value = "Username sudah digunakan.";
        return;
      }
      data.createdAt = now;
      if (password) data.passwordHash = await hashSecret(password);
      await setDoc(doc(db, "users", normalizedUsername), data);
    } else {
      const previousUsername = normalizeUsername(originalUsername.value || editTarget.value.username);
      const isUsernameChanged = normalizedUsername.toLowerCase() !== previousUsername.toLowerCase();

      if (isUsernameChanged) {
        const existingTarget = findUserByUsername(normalizedUsername);
        if (
          existingTarget &&
          normalizeUsername(existingTarget.username).toLowerCase() !== previousUsername.toLowerCase()
        ) {
          formError.value = "Username sudah digunakan.";
          return;
        }

        const { id, ...existingData } = editTarget.value || {};
        const payload = {
          ...existingData,
          ...data,
          username: normalizedUsername,
          createdAt: existingData.createdAt || now,
        };

        if (password) {
          payload.passwordHash = await hashSecret(password);
        } else if (!payload.passwordHash) {
          formError.value = "Password hash lama tidak ditemukan. Isi password baru untuk melanjutkan.";
          return;
        }

        await setDoc(doc(db, "users", normalizedUsername), payload);
        await deleteDoc(doc(db, "users", previousUsername));
      } else {
        if (password) data.passwordHash = await hashSecret(password);
        await updateDoc(doc(db, "users", previousUsername), data);
      }
    }

    // Sync role ke userRoles/{email} agar Firebase Auth login bisa membaca role
    if (normalizedEmail) {
      await setDoc(
        doc(db, "userRoles", normalizedEmail),
        { role: normalizedRole, username: normalizedUsername },
        {
          merge: true,
        },
      );
    }

    Modal.getInstance(document.getElementById("userModal"))?.hide();
    toast(`User ${normalizedUsername} berhasil ${editTarget.value ? "diperbarui" : "ditambahkan"}`);
    await loadUsers();
  } catch (e) {
    showError("Gagal menyimpan", e.message);
  } finally {
    saving.value = false;
  }
}

async function removeUser(u) {
  const r = await confirm({
    title: "Hapus Pengguna?",
    text: `Hapus user "${u.username}"? Tindakan ini tidak dapat dibatalkan.`,
    icon: "warning",
  });
  if (!r.isConfirmed) return;
  try {
    await deleteDoc(doc(db, "users", u.username));
    toast("User berhasil dihapus");
    await loadUsers();
  } catch (e) {
    showError("Gagal menghapus", e.message);
  }
}

onMounted(loadUsers);
</script>
