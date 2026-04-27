/**
 * Absensi Service
 * Collections: employees, employeeFaces, attendance, leaveRequests, settings
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db, storage, auth } from "@/config/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { hashSecret, isSha256Hex, verifyStoredSecret } from "@/utils/security";

// ── Employee CRUD ─────────────────────────────────────────────────────────

export async function fetchEmployees() {
  const snap = await getDocs(collection(db, "employees"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveEmployee(data) {
  const ref = await addDoc(collection(db, "employees"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateEmployee(id, data) {
  await updateDoc(doc(db, "employees", id), data);
}

export async function deleteEmployee(id) {
  await deleteDoc(doc(db, "employees", id));
}

// ── Password Verification (settings/passwords) ───────────────────────────

const DEFAULT_KEHADIRAN_ACCESS_CODES = {
  editLaporanKehadiran: "admin123",
  deleteLaporanKehadiran: "smlt116",
};

function isNonEmptySecret(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function normalizeSecretForStorage(value, fallbackValue) {
  const raw = isNonEmptySecret(value) ? value.trim() : String(fallbackValue ?? "").trim();
  if (!raw) return "";
  if (isSha256Hex(raw)) return raw;
  return hashSecret(raw);
}

async function verifySecretWithCandidates(inputSecret, candidates = []) {
  const normalizedInput = String(inputSecret ?? "").trim();
  if (!normalizedInput) return false;

  const uniqueCandidates = [...new Set(candidates.filter(isNonEmptySecret).map((v) => v.trim()))];
  for (const storedCandidate of uniqueCandidates) {
    const valid = await verifyStoredSecret(normalizedInput, storedCandidate, { allowLegacyBase64: true });
    if (valid) return true;
  }
  return false;
}

async function ensureKehadiranAccessCodes() {
  const docRef = doc(db, "settings", "passwords");
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    const now = Timestamp.now();
    const defaults = {
      editLaporanKehadiran: await hashSecret(DEFAULT_KEHADIRAN_ACCESS_CODES.editLaporanKehadiran),
      deleteLaporanKehadiran: await hashSecret(DEFAULT_KEHADIRAN_ACCESS_CODES.deleteLaporanKehadiran),
      lastUpdated: now,
      updatedBy: auth.currentUser?.email || "system-default",
    };
    await setDoc(docRef, defaults, { merge: true });
    return defaults;
  }

  const data = snap.data() || {};
  const updates = {};
  const editSource =
    data.editLaporanKehadiran ??
    data.editDataPenjualan ??
    data.supervisorPassword ??
    data.deleteDataPenjualan ??
    DEFAULT_KEHADIRAN_ACCESS_CODES.editLaporanKehadiran;
  const deleteSource =
    data.deleteLaporanKehadiran ??
    data.deleteDataPenjualan ??
    data.supervisorPassword ??
    data.editDataPenjualan ??
    DEFAULT_KEHADIRAN_ACCESS_CODES.deleteLaporanKehadiran;

  if (!isNonEmptySecret(data.editLaporanKehadiran)) {
    updates.editLaporanKehadiran = await normalizeSecretForStorage(
      editSource,
      DEFAULT_KEHADIRAN_ACCESS_CODES.editLaporanKehadiran,
    );
  }
  if (!isNonEmptySecret(data.deleteLaporanKehadiran)) {
    updates.deleteLaporanKehadiran = await normalizeSecretForStorage(
      deleteSource,
      DEFAULT_KEHADIRAN_ACCESS_CODES.deleteLaporanKehadiran,
    );
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: Timestamp.now(),
      updatedBy: auth.currentUser?.email || data.updatedBy || "system-migration",
    });
    return { ...data, ...updates };
  }

  return data;
}

export async function verifyEditLaporanKehadiranPassword(inputPassword) {
  const data = await ensureKehadiranAccessCodes();
  return verifySecretWithCandidates(inputPassword, [
    data.editLaporanKehadiran,
    data.editDataPenjualan,
    data.supervisorPassword,
    data.deleteDataPenjualan,
  ]);
}

export async function verifyDeleteLaporanKehadiranPassword(inputPassword) {
  const data = await ensureKehadiranAccessCodes();
  return verifySecretWithCandidates(inputPassword, [
    data.deleteLaporanKehadiran,
    data.deleteDataPenjualan,
    data.supervisorPassword,
    data.editDataPenjualan,
  ]);
}

/** Look up an employee by barcode or employeeId string (case-insensitive). */
export async function findEmployeeByCode(code) {
  const upper = code.trim().toUpperCase();
  const snap = await getDocs(collection(db, "employees"));
  for (const d of snap.docs) {
    const e = d.data();
    if ((e.barcode || "").toUpperCase() === upper || (e.employeeId || "").toUpperCase() === upper) {
      return { id: d.id, ...e };
    }
  }
  return null;
}

// ── Face Descriptors ──────────────────────────────────────────────────────

export async function saveFaceDescriptor(employeeId, descriptorArray) {
  await setDoc(doc(db, "employeeFaces", employeeId), {
    employeeId,
    faceDescriptor: Array.from(descriptorArray),
    updatedAt: Timestamp.now(),
  });
}

function toFloat32Descriptor(data) {
  if (!data) return null;

  const toFiniteFloat32Array = (value) => {
    if (value instanceof Float32Array) return value;

    if (ArrayBuffer.isView(value) && value?.buffer) {
      return new Float32Array(value.buffer, value.byteOffset, value.length);
    }

    if (Array.isArray(value)) {
      const numeric = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      return numeric.length ? new Float32Array(numeric) : null;
    }

    return null;
  };

  const parseDescriptorSource = (source) => {
    if (!source) return null;

    const direct = toFiniteFloat32Array(source);
    if (direct) return direct;

    if (typeof source === "string") {
      const raw = source.trim();
      if (!raw) return null;
      try {
        return parseDescriptorSource(JSON.parse(raw));
      } catch {
        return null;
      }
    }

    if (typeof source === "object") {
      // Legacy payload: { type: "Float32Array", data: [...] }
      if (Array.isArray(source.data)) {
        const fromData = toFiniteFloat32Array(source.data);
        if (fromData) return fromData;
      }

      // Legacy/malformed shape: numeric-key object {0:...,1:...}
      const numericKeys = Object.keys(source).filter((k) => /^\d+$/.test(k));
      if (numericKeys.length) {
        const values = numericKeys.sort((a, b) => Number(a) - Number(b)).map((k) => source[k]);
        const fromObject = toFiniteFloat32Array(values);
        if (fromObject) return fromObject;
      }
    }

    return null;
  };

  return (
    parseDescriptorSource(data.faceDescriptor) ||
    parseDescriptorSource(data.descriptor) ||
    parseDescriptorSource(data.faceDescriptorArray) ||
    parseDescriptorSource(data.faceDescriptorJson)
  );
}

export async function getFaceDescriptor(employeeId, options = {}) {
  const candidates = new Set();
  const addCandidate = (v) => {
    if (!v || typeof v !== "string") return;
    const trimmed = v.trim();
    if (!trimmed) return;
    candidates.add(trimmed);
    candidates.add(trimmed.toUpperCase());
    candidates.add(trimmed.toLowerCase());
  };

  addCandidate(employeeId);
  addCandidate(options.docId);
  addCandidate(options.barcode);
  const candidateIds = [...candidates];

  // 1) Fast path: try by possible document IDs
  const directSnaps = await Promise.all(candidateIds.map((id) => getDoc(doc(db, "employeeFaces", id))));
  for (let i = 0; i < candidateIds.length; i += 1) {
    const snap = directSnaps[i];
    if (!snap.exists()) continue;
    const descriptor = toFloat32Descriptor(snap.data());
    if (descriptor) return descriptor;
  }

  // 2) Fallback: scan by embedded employeeId field for legacy records
  const fallbackSnaps = await Promise.all(
    candidateIds.map((id) => {
      const q = query(collection(db, "employeeFaces"), where("employeeId", "==", id), limit(1));
      return getDocs(q);
    }),
  );
  for (let i = 0; i < candidateIds.length; i += 1) {
    const snap = fallbackSnaps[i];
    if (snap.empty) continue;
    const descriptor = toFloat32Descriptor(snap.docs[0].data());
    if (descriptor) return descriptor;
  }

  return null;
}

/** Fetch all face descriptors as a map { employeeId → Float32Array }.
 * Keys are indexed by: doc ID, doc ID uppercase, embedded employeeId field, and its uppercase.
 */
export async function fetchAllFaceDescriptors() {
  const snap = await getDocs(collection(db, "employeeFaces"));
  const map = {};
  snap.docs.forEach((d) => {
    try {
      const data = d.data();
      const desc = data.faceDescriptor;
      if (!desc) return;
      const val = Array.isArray(desc) ? new Float32Array(desc) : desc;
      // Index by doc ID (original + uppercase)
      if (d.id) {
        map[d.id] = val;
        map[d.id.toUpperCase()] = val;
      }
      // Index by embedded employeeId field (original + uppercase)
      if (data.employeeId) {
        map[data.employeeId] = val;
        map[data.employeeId.toUpperCase()] = val;
      }
    } catch (_) {
      /* skip malformed docs */
    }
  });
  return map;
}

export async function deleteFaceDescriptor(employeeId) {
  await deleteDoc(doc(db, "employeeFaces", employeeId));
}

// ── Attendance ────────────────────────────────────────────────────────────

/** Get today's attendance as an onSnapshot — returns unsubscribe fn. */
export function subscribeTodayAttendance(today, callback) {
  const q = query(collection(db, "attendance"), where("date", "==", today), orderBy("timeIn", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Record check-in.
 * @returns {string} new doc ID
 */
export async function recordCheckIn({
  employeeId,
  name,
  type,
  shift,
  date,
  status,
  lateMinutes,
  faceVerified,
  faceVerificationRequired,
}) {
  const ref = await addDoc(collection(db, "attendance"), {
    employeeId,
    name,
    type: type || "staff",
    shift: shift || "morning",
    date,
    timeIn: Timestamp.now(),
    timeOut: null,
    status: status || "Tepat Waktu",
    lateMinutes: lateMinutes || 0,
    faceVerified: faceVerified || false,
    faceVerificationRequired: !!faceVerificationRequired,
  });
  return ref.id;
}

/** Record check-out on existing attendance doc. */
export async function recordCheckOut(docId, data = {}) {
  await updateDoc(doc(db, "attendance", docId), {
    timeOut: Timestamp.now(),
    ...data,
  });
}

/** Fetch attendance by date range for reports. */
export async function fetchAttendanceByRange(startDate, endDate, shiftFilter, statusFilter) {
  const q = query(
    collection(db, "attendance"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
    limit(2000),
  );
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timeIn: data.timeIn ? new Date(data.timeIn.seconds * 1000) : null,
      timeOut: data.timeOut ? new Date(data.timeOut.seconds * 1000) : null,
      shift: data.shift || "morning",
      status: data.status || "Tepat Waktu",
      lateMinutes: data.lateMinutes || 0,
      type: data.type || "",
    };
  });
  if (shiftFilter) results = results.filter((r) => r.shift === shiftFilter);
  if (statusFilter && statusFilter !== "all") results = results.filter((r) => r.status === statusFilter);
  // Sort client-side: date asc, then timeIn asc
  results.sort((a, b) => {
    const dateCmp = (a.date || "").localeCompare(b.date || "");
    if (dateCmp !== 0) return dateCmp;
    const tA = a.timeIn instanceof Date ? a.timeIn.getTime() : 0;
    const tB = b.timeIn instanceof Date ? b.timeIn.getTime() : 0;
    return tA - tB;
  });
  return results;
}

// ── Attendance Settings ───────────────────────────────────────────────────

const DEFAULT_ATTENDANCE_SETTINGS = {
  staff: { morning: "09:00", afternoon: "14:21" },
  ob: { morning: "07:31", afternoon: "13:46" },
  faceVerification: {
    enabled: true,
    rules: {
      checkIn: { morning: true, afternoon: false },
      checkOut: { morning: false, afternoon: false },
    },
  },
};

function normalizeAttendanceSettings(raw = {}) {
  // Backward compatibility for legacy flat settings format.
  const isFlat = raw.workStartTime || raw.checkInDeadline || raw.checkOutTime || Number.isFinite(raw.lateThreshold);
  if (isFlat) {
    const start = raw.workStartTime || "08:00";
    const lateThreshold = Number.isFinite(raw.lateThreshold) ? raw.lateThreshold : 15;
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + lateThreshold;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    const lateLimit = `${hh}:${mm}`;
    return {
      ...DEFAULT_ATTENDANCE_SETTINGS,
      staff: { morning: lateLimit, afternoon: DEFAULT_ATTENDANCE_SETTINGS.staff.afternoon },
      ob: { ...DEFAULT_ATTENDANCE_SETTINGS.ob },
      faceVerification: {
        ...DEFAULT_ATTENDANCE_SETTINGS.faceVerification,
        ...(raw.faceVerification || {}),
      },
      lastUpdated: raw.lastUpdated || null,
      updatedBy: raw.updatedBy || "System",
    };
  }

  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...raw,
    staff: {
      ...DEFAULT_ATTENDANCE_SETTINGS.staff,
      ...(raw.staff || {}),
    },
    ob: {
      ...DEFAULT_ATTENDANCE_SETTINGS.ob,
      ...(raw.ob || {}),
    },
    faceVerification: {
      ...DEFAULT_ATTENDANCE_SETTINGS.faceVerification,
      ...(raw.faceVerification || {}),
      rules: {
        ...DEFAULT_ATTENDANCE_SETTINGS.faceVerification.rules,
        ...(raw.faceVerification?.rules || {}),
        checkIn: {
          ...DEFAULT_ATTENDANCE_SETTINGS.faceVerification.rules.checkIn,
          ...(raw.faceVerification?.rules?.checkIn || {}),
        },
        checkOut: {
          ...DEFAULT_ATTENDANCE_SETTINGS.faceVerification.rules.checkOut,
          ...(raw.faceVerification?.rules?.checkOut || {}),
        },
      },
    },
  };
}

export async function fetchAttendanceSettings() {
  const snap = await getDoc(doc(db, "settings", "attendanceThresholds"));
  return normalizeAttendanceSettings(snap.exists() ? snap.data() : DEFAULT_ATTENDANCE_SETTINGS);
}

export async function saveAttendanceSettings(data) {
  await setDoc(doc(db, "settings", "attendanceThresholds"), normalizeAttendanceSettings(data), { merge: true });
}

/** Ensure attendance settings document exists; creates defaults when missing. */
export async function ensureAttendanceSettings() {
  const settingsRef = doc(db, "settings", "attendanceThresholds");
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    await setDoc(settingsRef, {
      ...DEFAULT_ATTENDANCE_SETTINGS,
      lastUpdated: new Date().toISOString(),
      updatedBy: "System (Initial)",
    });
  }
}

/** Subscribe to attendance settings in real-time. Returns unsubscribe fn. */
export function subscribeAttendanceSettings(callback) {
  return onSnapshot(doc(db, "settings", "attendanceThresholds"), (snap) => {
    callback(normalizeAttendanceSettings(snap.exists() ? snap.data() : DEFAULT_ATTENDANCE_SETTINGS));
  });
}

// ── Leave Requests ────────────────────────────────────────────────────────

export async function submitLeaveRequest(data) {
  const ref = await addDoc(collection(db, "leaveRequests"), {
    ...data,
    status: "Menunggu Persetujuan",
    submitDate: Timestamp.now(),
  });
  return ref.id;
}

/** Subscribe to pending leave requests (for supervisor page). */
export function subscribePendingLeaves(callback) {
  const q = query(
    collection(db, "leaveRequests"),
    where("status", "==", "Menunggu Persetujuan"),
    orderBy("submitDate", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Approve or reject a leave request. */
export async function updateLeaveStatus(id, status, approvedBy, options = {}) {
  const payload = {
    status,
    approvedBy: approvedBy || "",
    approvedAt: Timestamp.now(),
  };

  if (status === "Ditolak" || status === "Rejected") {
    payload.rejectedReason = String(options.rejectedReason || "").trim();
    payload.rejectedBy = approvedBy || "";
    payload.rejectedAt = Timestamp.now();
  }

  await updateDoc(doc(db, "leaveRequests", id), payload);
}

export async function deleteLeaveRequest(id) {
  await deleteDoc(doc(db, "leaveRequests", id));
}

/** Fetch leave requests by month range. */
export async function fetchLeavesByRange(startDate, endDate) {
  const q = query(
    collection(db, "leaveRequests"),
    where("leaveStartDate", ">=", startDate),
    where("leaveStartDate", "<=", endDate),
    orderBy("leaveStartDate", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch last 20 leave requests for a specific employee. */
export async function fetchLeavesByEmployee(employeeId) {
  const q = query(
    collection(db, "leaveRequests"),
    where("employeeId", "==", employeeId),
    orderBy("submitDate", "desc"),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Upload a medical certificate to Firebase Storage.
 * Returns { url, path, name, type, size, uploadedAt }
 */
export async function uploadMedicalCertificate(file, employeeId, employeeName, onProgress = null) {
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) {
    throw new Error("Sesi login tidak valid. Silakan login ulang sebelum upload surat sakit.");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeName = String(employeeName || "Unknown")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
  const fileName = `${safeName}_${timestamp}.${ext}`;
  const path = `medical-certificates/${year}/${month}/${fileName}`;

  const ref = storageRef(storage, path);
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: currentUser.uid,
      employeeId: String(employeeId || ""),
    },
  };

  const task = uploadBytesResumable(ref, file, metadata);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            path,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

// ── Attendance Status Helpers ─────────────────────────────────────────────

/**
 * Compute status ("Tepat Waktu" | "Terlambat") and lateMinutes
 * based on settings and the current time.
 */
export function computeCheckInStatus(settings, now = new Date(), context = {}) {
  let deadline = "08:00";

  if (settings?.staff || settings?.ob) {
    const shift = context.shift || detectShift(now);
    const employeeType = (context.employeeType || "staff").toLowerCase();
    const group = employeeType === "ob" ? settings.ob : settings.staff;
    deadline = shift === "afternoon" ? group?.afternoon || "14:21" : group?.morning || "09:00";
  } else {
    // Legacy flat settings fallback.
    const [startHour, startMinute] = (settings?.workStartTime || "08:00").split(":").map(Number);
    const lateThreshold = parseInt(settings?.lateThreshold, 10) || 15;
    const total = startHour * 60 + startMinute + lateThreshold;
    deadline = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  const [dH, dM] = deadline.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const lateMinutes = Math.max(0, nowMin - (dH * 60 + dM));
  const status = lateMinutes > 0 ? "Terlambat" : "Tepat Waktu";

  return { status, lateMinutes };
}

/** Detect shift from current hour: before 12 → morning, else → afternoon */
export function detectShift(now = new Date()) {
  return now.getHours() < 12 ? "morning" : "afternoon";
}

/**
 * Record late permission.
 * - If docIdOrPayload is a string docId, updates existing attendance doc.
 * - If docIdOrPayload is an object payload, creates new attendance doc.
 */
export async function recordLatePermission(docIdOrPayload, verificationCode) {
  const payload = {
    latePermission: true,
    latePermissionCode: verificationCode || "",
    latePermissionAt: Timestamp.now(),
    status: "Izin Terlambat",
  };

  if (typeof docIdOrPayload === "string" && docIdOrPayload.trim()) {
    await updateDoc(doc(db, "attendance", docIdOrPayload), payload);
    return docIdOrPayload;
  }

  const data = docIdOrPayload || {};
  const ref = await addDoc(collection(db, "attendance"), {
    employeeId: data.employeeId || "",
    name: data.name || "",
    type: data.type || "staff",
    shift: data.shift || "morning",
    date: data.date || "",
    timeIn: Timestamp.now(),
    timeOut: null,
    lateMinutes: 0,
    faceVerified: false,
    faceVerificationRequired: false,
    ...payload,
  });
  return ref.id;
}

const LATE_PERMISSION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateLatePermissionCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * LATE_PERMISSION_CODE_CHARS.length);
    out += LATE_PERMISSION_CODE_CHARS[idx];
  }
  return out;
}

/** Create random one-time late-permission verification code (no expiry). */
export async function createLatePermissionCode(payload = {}) {
  const date = String(payload.date || "").trim();
  if (!date) throw new Error("Tanggal kode verifikasi wajib diisi.");
  const employeeId = String(payload.employeeId || "").trim();
  if (!employeeId) throw new Error("ID Sales wajib diisi untuk membuat kode verifikasi.");

  let attempt = 0;
  while (attempt < 8) {
    attempt += 1;
    const code = generateLatePermissionCode(8);
    const ref = doc(db, "latePermissionCodes", code);
    const exists = await getDoc(ref);
    if (exists.exists()) continue;

    await setDoc(ref, {
      code,
      date,
      shift: payload.shift || "morning",
      employeeId,
      employeeName: String(payload.employeeName || "").trim(),
      note: String(payload.note || "").trim(),
      used: false,
      usedAt: null,
      usedByEmployeeId: "",
      usedByName: "",
      usedByAttendanceId: "",
      createdAt: Timestamp.now(),
      createdBy: String(payload.createdBy || "").trim(),
      revoked: false,
    });

    return code;
  }

  throw new Error("Gagal membuat kode verifikasi unik. Silakan coba lagi.");
}

/** Subscribe verification codes by date (sorted client-side by newest first). */
export function subscribeLatePermissionCodesByDate(date, callback) {
  const q = query(collection(db, "latePermissionCodes"), where("date", "==", date));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aMs = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
        const bMs = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
        return bMs - aMs;
      });
    callback(rows);
  });
}

/** Subscribe verification codes by date range (sorted client-side by newest first). */
export function subscribeLatePermissionCodesByDateRange(startDate, endDate, callback) {
  const q = query(
    collection(db, "latePermissionCodes"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
  );

  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const dateCmp = String(b.date || "").localeCompare(String(a.date || ""));
        if (dateCmp !== 0) return dateCmp;
        const aMs = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
        const bMs = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
        return bMs - aMs;
      });
    callback(rows);
  });
}

/** Delete a late-permission verification code by document ID/code. */
export async function deleteLatePermissionCode(id) {
  await deleteDoc(doc(db, "latePermissionCodes", id));
}

/**
 * Validate and consume one verification code.
 * No expiry, but strictly one-time and stores who used it.
 */
export async function consumeLatePermissionCode({ code, date, shift, employeeId, employeeName, attendanceId = "" }) {
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalizedCode) throw new Error("Kode verifikasi wajib diisi.");

  const ref = doc(db, "latePermissionCodes", normalizedCode);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error("Kode verifikasi tidak ditemukan.");
    }

    const data = snap.data() || {};
    if (data.revoked) {
      throw new Error("Kode verifikasi sudah dinonaktifkan.");
    }
    if (data.used) {
      const usedBy = data.usedByName || data.usedByEmployeeId || "staf lain";
      throw new Error(`Kode sudah digunakan oleh: ${usedBy}.`);
    }

    const codeDate = String(data.date || "");
    if (codeDate && date && codeDate !== date) {
      throw new Error("Kode verifikasi bukan untuk tanggal hari ini.");
    }

    const codeShift = String(data.shift || "");
    if (codeShift && shift && codeShift !== shift) {
      throw new Error("Kode verifikasi tidak sesuai shift yang dipilih.");
    }

    const targetEmployeeId = String(data.employeeId || "")
      .trim()
      .toLowerCase();
    const currentEmployeeId = String(employeeId || "")
      .trim()
      .toLowerCase();
    if (!targetEmployeeId) {
      throw new Error("Kode verifikasi tidak memiliki target ID sales.");
    }
    if (!currentEmployeeId || targetEmployeeId !== currentEmployeeId) {
      throw new Error("Kode verifikasi ini bukan untuk staf tersebut.");
    }

    let usedAt = Timestamp.now();
    const normalizedAttendanceId = String(attendanceId || "").trim();
    if (normalizedAttendanceId) {
      const attendanceRef = doc(db, "attendance", normalizedAttendanceId);
      const attendanceSnap = await tx.get(attendanceRef);
      if (attendanceSnap.exists()) {
        const attendanceData = attendanceSnap.data() || {};
        if (attendanceData.timeIn) {
          usedAt = attendanceData.timeIn;
        }
      }
    }

    tx.update(ref, {
      used: true,
      usedAt,
      usedByEmployeeId: String(employeeId || "").trim(),
      usedByName: String(employeeName || "").trim(),
      usedByAttendanceId: normalizedAttendanceId,
    });
  });

  return { code: normalizedCode, used: true };
}

/** Subscribe to today's approved leave requests (izin libur). Returns unsubscribe fn.
 *  Uses single equality filter (no composite index needed), date range filtered client-side.
 */
export function subscribeTodayLeaves(today, callback) {
  const q = query(collection(db, "leaveRequests"), where("status", "==", "Disetujui"));
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(all.filter((r) => (r.leaveStartDate || "") <= today && (r.leaveEndDate || "") >= today));
  });
}

/** Subscribe to today's time-based replacements (ganti jam + lembur) with low-read query. */
export function subscribeTodayJamReplacements(today, callback) {
  const q = query(
    collection(db, "leaveRequests"),
    where("replacementType", "in", ["jam", "lembur"]),
    where("replacementDetails.date", "==", today),
  );

  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.status === "Disetujui" || r.status === "Approved");
    callback(rows);
  });
}

/** Add manual overtime entry from supervisor page. */
export async function addManualOvertimeEntry(data) {
  const ref = await addDoc(collection(db, "manualOvertime"), {
    date: data.date,
    name: data.name,
    reason: data.reason || "Internal Shifting",
    employeeId: data.employeeId || "",
    createdBy: data.createdBy || "",
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

/** Subscribe manual overtime entries by date (low-read equality filter). */
export function subscribeManualOvertimeByDate(date, callback) {
  const q = query(collection(db, "manualOvertime"), where("date", "==", date), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Subscribe manual overtime entries within a date range for headcount history. */
export function subscribeManualOvertimeByDateRange(startDate, endDate, callback) {
  const q = query(
    collection(db, "manualOvertime"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Delete a single manual overtime entry by document ID. */
export async function deleteManualOvertimeEntry(id) {
  await deleteDoc(doc(db, "manualOvertime", id));
}

/** Update an attendance record by doc ID. */
export async function updateAttendanceRecord(id, data) {
  await updateDoc(doc(db, "attendance", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a single attendance record by ID. */
export async function deleteAttendanceRecord(id) {
  await deleteDoc(doc(db, "attendance", id));
}

/** Delete all leaveRequests for a given month/year. Returns deleted count. */
export async function deleteLeavesByMonth(month, year) {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
  const q = query(
    collection(db, "leaveRequests"),
    where("leaveStartDate", ">=", firstDay),
    where("leaveStartDate", "<=", lastDay),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "leaveRequests", d.id))));
  return snap.docs.length;
}

/** Delete all attendance records within a date range. Returns deleted count. */
export async function deleteAttendanceByDateRange(startDate, endDate) {
  const q = query(collection(db, "attendance"), where("date", ">=", startDate), where("date", "<=", endDate));
  const snap = await getDocs(q);
  const deletes = snap.docs.map((d) => deleteDoc(doc(db, "attendance", d.id)));
  await Promise.all(deletes);
  return snap.docs.length;
}

/** Fetch all leave requests ordered by newest first. */
export async function fetchAllLeaves() {
  const q = query(collection(db, "leaveRequests"), orderBy("submitDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    if (!data.status) data.status = "Pending";
    // Ensure leaveDate fallback for multi-day records
    if (data.leaveStartDate && data.leaveEndDate && !data.leaveDate) {
      data.leaveDate = data.leaveStartDate;
    }
    return { id: d.id, ...data };
  });
}

/** Fetch a single leave request by its doc ID. */
export async function fetchLeaveById(id) {
  const snap = await getDoc(doc(db, "leaveRequests", id));
  if (!snap.exists()) throw new Error("Leave request not found");
  return { id: snap.id, ...snap.data() };
}

/**
 * Update replacementStatus (and replacementStatusArray for multi-day) on a leave request.
 * Logic mirrors leave-service.js updateReplacementStatus().
 */
export async function updateLeaveReplacementStatus(id, status, dayIndex = null) {
  const leaveRef = doc(db, "leaveRequests", id);
  const snap = await getDoc(leaveRef);
  if (!snap.exists()) throw new Error("Leave request not found");

  const data = snap.data();
  const isMultiDay = data.leaveStartDate && data.leaveEndDate && data.leaveStartDate !== data.leaveEndDate;

  let updateData = {};

  if (isMultiDay && dayIndex !== null) {
    const start = new Date(data.leaveStartDate + "T00:00:00");
    const end = new Date(data.leaveEndDate + "T00:00:00");
    const dayDiff = Math.round((end - start) / 86400000) + 1;
    const arr = [...(data.replacementStatusArray || Array(dayDiff).fill("Belum Diganti"))];
    if (dayIndex >= 0 && dayIndex < arr.length) arr[dayIndex] = status;
    updateData = {
      replacementStatusArray: arr,
      replacementStatus: arr.every((s) => s === "Sudah Diganti") ? "Sudah Diganti" : "Belum Diganti",
    };
  } else {
    updateData = { replacementStatus: status };
    if (isMultiDay) {
      const start = new Date(data.leaveStartDate + "T00:00:00");
      const end = new Date(data.leaveEndDate + "T00:00:00");
      const dayDiff = Math.round((end - start) / 86400000) + 1;
      updateData.replacementStatusArray = Array(dayDiff).fill(status);
    }
  }

  await updateDoc(leaveRef, updateData);
}

/**
 * Auto-detect scan type and shift based on current time.
 * Mirrors setRadioButtonsByTime() from sistem-absensi.js
 * Returns { scanType, shift } or null if outside operating hours.
 */
export function autoDetectScanTypeAndShift(now = new Date()) {
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const ranges = [
    { start: 7 * 60, end: 13 * 60, scanType: "in", shift: "morning" },
    { start: 13 * 60, end: 16 * 60, scanType: "in", shift: "afternoon" },
    { start: 16 * 60 + 20, end: 17 * 60 + 30, scanType: "out", shift: "morning" },
    { start: 21 * 60, end: 23 * 60, scanType: "out", shift: "afternoon" },
  ];
  return ranges.find((r) => totalMin >= r.start && totalMin <= r.end) || null;
}
