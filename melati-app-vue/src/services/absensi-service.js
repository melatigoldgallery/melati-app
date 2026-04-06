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
} from "firebase/firestore";
import { db } from "@/config/firebase";

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

/** Look up an employee by barcode or employeeId string (case-insensitive). */
export async function findEmployeeByCode(code) {
  const upper = code.trim().toUpperCase();
  const snap = await getDocs(collection(db, "employees"));
  for (const d of snap.docs) {
    const e = d.data();
    if (
      (e.barcode || "").toUpperCase() === upper ||
      (e.employeeId || "").toUpperCase() === upper
    ) {
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

export async function getFaceDescriptor(employeeId) {
  const snap = await getDoc(doc(db, "employeeFaces", employeeId));
  if (!snap.exists()) return null;
  return new Float32Array(snap.data().faceDescriptor);
}

/** Fetch all face descriptors as a map { employeeId → Float32Array }. */
export async function fetchAllFaceDescriptors() {
  const snap = await getDocs(collection(db, "employeeFaces"));
  const map = {};
  snap.docs.forEach((d) => {
    map[d.id] = new Float32Array(d.data().faceDescriptor);
  });
  return map;
}

export async function deleteFaceDescriptor(employeeId) {
  await deleteDoc(doc(db, "employeeFaces", employeeId));
}

// ── Attendance ────────────────────────────────────────────────────────────

/** Get today's attendance as an onSnapshot — returns unsubscribe fn. */
export function subscribeTodayAttendance(today, callback) {
  const q = query(
    collection(db, "attendance"),
    where("date", "==", today),
    orderBy("timeIn", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Record check-in.
 * @returns {string} new doc ID
 */
export async function recordCheckIn({ employeeId, name, type, shift, date, status, lateMinutes, faceVerified }) {
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
  });
  return ref.id;
}

/** Record check-out on existing attendance doc. */
export async function recordCheckOut(docId) {
  await updateDoc(doc(db, "attendance", docId), {
    timeOut: Timestamp.now(),
  });
}

/** Fetch attendance by date range for reports. */
export async function fetchAttendanceByRange(startDate, endDate, shiftFilter, statusFilter) {
  let q = query(
    collection(db, "attendance"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "asc"),
    orderBy("timeIn", "asc"),
    limit(1000),
  );
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (shiftFilter) results = results.filter((r) => r.shift === shiftFilter);
  if (statusFilter && statusFilter !== "all") results = results.filter((r) => r.status === statusFilter);
  return results;
}

// ── Attendance Settings ───────────────────────────────────────────────────

export async function fetchAttendanceSettings() {
  const snap = await getDoc(doc(db, "settings", "attendanceThresholds"));
  return snap.exists()
    ? snap.data()
    : { workStartTime: "08:00", lateThreshold: 15, checkInDeadline: "12:00", checkOutTime: "17:00" };
}

export async function saveAttendanceSettings(data) {
  await setDoc(doc(db, "settings", "attendanceThresholds"), data, { merge: true });
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
export async function updateLeaveStatus(id, status, approvedBy) {
  await updateDoc(doc(db, "leaveRequests", id), {
    status,
    approvedBy: approvedBy || "",
    approvedAt: Timestamp.now(),
  });
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

// ── Attendance Status Helpers ─────────────────────────────────────────────

/**
 * Compute status ("Tepat Waktu" | "Terlambat") and lateMinutes
 * based on settings and the current time.
 */
export function computeCheckInStatus(settings, now = new Date()) {
  const [wH, wM] = (settings.workStartTime || "08:00").split(":").map(Number);
  const lateThresh = parseInt(settings.lateThreshold) || 15;

  const deadlineMs = (wH * 60 + wM + lateThresh) * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(wH, wM, 0, 0);
  const nowMs = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000;
  const startMs = (wH * 60 + wM) * 60 * 1000;

  const lateMinutes = Math.max(0, Math.floor((nowMs - startMs) / 60000) - lateThresh);
  const status = lateMinutes > 0 ? "Terlambat" : "Tepat Waktu";

  return { status, lateMinutes };
}

/** Detect shift from current hour: before 12 → morning, else → afternoon */
export function detectShift(now = new Date()) {
  return now.getHours() < 12 ? "morning" : "afternoon";
}
