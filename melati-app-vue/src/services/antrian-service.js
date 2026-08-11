import { rtdb, db } from "@/config/firebase";
import { ref as dbRef, onValue, set, get, push, remove, increment, update } from "firebase/database";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { floorDataRef, floorDataRefWithFloorId, floorDoc } from "./floor-scope";

// ── Helpers ────────────────────────────────────────────────────────────────
export function padNumber(n) {
  return String(n).padStart(2, "0");
}

export function formatQueue(letterOrIndex, number) {
  let letter = letterOrIndex;
  if (typeof letterOrIndex === "number") {
    const LETTERS = ["A", "B", "C", "D", "E"]; // fallback letters map
    letter = LETTERS[letterOrIndex] || "A";
  }
  return letter + padNumber(number);
}

export const LETTERS_MAP = {
  A: "Jual / Servis (A)",
  B: "Beli / Tukar (B)",
  C: "Beli / Tukar (C)",
  D: "Jual / Servis (D)",
  E: "Jual / Servis (E)",
};

function queueRef(floorId = "") {
  // Use state_v2 to isolate development data from production queue/state
  if (floorId) return floorDataRefWithFloorId(rtdb, floorId, "queue", "state_v2");
  return floorDataRef(rtdb, "queue", "state_v2");
}

function getQueueSectionState(val, type) {
  const current = val[type] || {};
  return {
    currentLetter: current.currentLetter ?? 0,
    currentNumber: current.currentNumber ?? 1,
    lastLetter: current.lastLetter ?? 0,
    lastNumber: current.lastNumber ?? 0,
    delayedQueue: current.delayedQueue || [],
    missedQueue: current.missedQueue || [],
    skipList: current.skipList || []
  };
}

function normalizeQueueState(val) {
  const data = val || {};
  return {
    jual: getQueueSectionState(data, "jual"),
    beli: getQueueSectionState(data, "beli")
  };
}

function analyticsRef(year, month, day) {
  return floorDataRef(rtdb, "queue", "analytics", String(year), String(month), String(day));
}

// ── State subscription ─────────────────────────────────────────────────────
let latestQueueState = {};

export function subscribeQueue(arg1, arg2) {
  const floorId = typeof arg1 === "string" ? arg1 : "";
  const callback = typeof arg1 === "function" ? arg1 : arg2;
  if (typeof callback !== "function") {
    throw new Error("subscribeQueue requires a callback");
  }
  return onValue(queueRef(floorId), (snap) => {
    const val = snap.val() || {};
    const state = normalizeQueueState(val);
    latestQueueState[floorId] = state;
    callback(state);
  });
}

async function saveState(state, floorId = "") {
  await set(queueRef(floorId), state);
}

// ── Operations ─────────────────────────────────────────────────────────────
export function addCustomerQueue(type, floorId = "") {
  const resolvedFloor = floorId || "";
  const dbRefNode = queueRef(resolvedFloor);
  
  // 1. Ambil data terbaru dari cache memori lokal (Firebase subscription)
  const hasFirebaseState = !!latestQueueState[resolvedFloor];
  const dbCurrent = (hasFirebaseState && latestQueueState[resolvedFloor][type]) 
    || { lastLetter: 0, lastNumber: 0 };
  
  // 2. Ambil data dari LocalStorage Kiosk (Filter berdasarkan tanggal hari ini)
  const todayStr = getTodayStringWITA();
  const localKey = `kiosk_queue_counter_${resolvedFloor}_${type}`;
  let localCurrent = { lastLetter: 0, lastNumber: 0 };
  
  try {
    const rawLocal = localStorage.getItem(localKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed.date === todayStr) {
        localCurrent = { lastLetter: parsed.lastLetter ?? 0, lastNumber: parsed.lastNumber ?? 0 };
      }
    }
  } catch (e) {
    console.warn("Gagal membaca localStorage:", e);
  }
  
  // 3. Bandingkan dan ambil nilai maksimum (Max-Wins) dengan mitigasi Reset Manual
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  
  let current;
  if (hasFirebaseState && dbCurrent.lastNumber === 0 && dbCurrent.lastLetter === 0) {
    // KASUS MITIGASI MANUAL RESET: Jika Firebase terhubung dan datanya 0,
    // artinya admin melakukan reset antrean atau ini adalah awal hari. Force reset local.
    current = { lastLetter: 0, lastNumber: 0 };
  } else {
    // KASUS NORMAL / OFFLINE: Bandingkan indeks maksimum
    const dbIndex = (dbCurrent.lastLetter ?? 0) * 99 + (dbCurrent.lastNumber ?? 0);
    const localIndex = (localCurrent.lastLetter ?? 0) * 99 + (localCurrent.lastNumber ?? 0);
    current = localIndex > dbIndex ? localCurrent : dbCurrent;
  }
  
  let lastLetter = current.lastLetter ?? 0;
  let lastNumber = current.lastNumber ?? 0;
  
  // 4. Inkremen nomor antrean
  if (lastNumber === 0) {
    lastLetter = 0;
    lastNumber = 1;
  } else {
    lastNumber++;
    if (lastNumber > 99) {
      lastNumber = 1;
      lastLetter = (lastLetter + 1) % letters.length;
    }
  }
  
  const formattedNum = letters[lastLetter] + padNumber(lastNumber);
  
  // 5. Simpan kembali ke LocalStorage Kiosk secara sinkron
  try {
    localStorage.setItem(localKey, JSON.stringify({
      date: todayStr,
      lastLetter,
      lastNumber
    }));
  } catch (e) {
    console.warn("Gagal menulis ke localStorage:", e);
  }
  
  // 6. Update database secara asinkron di background (TANPA await agar tidak memblokir)
  update(dbRefNode, {
    [`${type}/lastLetter`]: lastLetter,
    [`${type}/lastNumber`]: lastNumber
  }).catch((err) => {
    console.warn("Firebase update antrean tertunda (offline):", err);
  });
  
  return formattedNum;
}

export async function nextQueue(type, state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  let { currentLetter, currentNumber, lastLetter, lastNumber, delayedQueue, missedQueue, skipList } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  currentLetter = (currentLetter ?? 0) % letters.length;
  lastLetter = (lastLetter ?? 0) % letters.length;
  
  const maxIdx = letters.length * 99;
  
  const currentIdx = currentLetter * 99 + currentNumber;
  const lastIdx = lastLetter * 99 + lastNumber;
  const nextAfterLastIdx = (lastIdx % maxIdx) + 1;
  
  if (lastNumber !== 0 && currentIdx === nextAfterLastIdx) {
    return val;
  }
  
  currentNumber++;
  if (currentNumber > 99) {
    currentNumber = 1;
    currentLetter = (currentLetter + 1) % letters.length;
  }
  
  // Check skip list
  let limit = 0;
  do {
    const qStr = letters[currentLetter] + padNumber(currentNumber);
    if (skipList.includes(qStr)) {
      skipList = skipList.filter(q => q !== qStr);
      currentNumber++;
      if (currentNumber > 99) {
        currentNumber = 1;
        currentLetter = (currentLetter + 1) % letters.length;
      }
      limit++;
      continue;
    }
    break;
  } while (limit < 200);
  
  await update(dbRefNode, {
    [`${type}/currentLetter`]: currentLetter,
    [`${type}/currentNumber`]: currentNumber,
    [`${type}/skipList`]: skipList
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      currentLetter,
      currentNumber,
      skipList
    }
  });
  return updatedVal;
}

export async function previousQueue(type, state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  let { currentLetter, currentNumber } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  currentLetter = (currentLetter ?? 0) % letters.length;
  
  currentNumber--;
  if (currentNumber < 1) {
    currentNumber = 99;
    currentLetter = (currentLetter - 1 + letters.length) % letters.length;
  }
  
  await update(dbRefNode, {
    [`${type}/currentLetter`]: currentLetter,
    [`${type}/currentNumber`]: currentNumber
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      currentLetter,
      currentNumber
    }
  });
  return updatedVal;
}

export async function setCustomQueue(type, state, letterIndex, number, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  const currentLetter = Math.max(0, letterIndex);
  const currentNumber = Math.max(1, Math.min(99, number));
  
  await update(dbRefNode, {
    [`${type}/currentLetter`]: currentLetter,
    [`${type}/currentNumber`]: currentNumber
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      currentLetter,
      currentNumber
    }
  });
  return updatedVal;
}

export async function addToSkipList(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  if (current.skipList.includes(queueNumber)) return val;
  
  const skipList = [...current.skipList, queueNumber];
  
  await update(dbRefNode, {
    [`${type}/skipList`]: skipList
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      skipList
    }
  });
  return updatedVal;
}

export async function removeFromSkipList(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  const skipList = current.skipList.filter(q => q !== queueNumber);
  
  await update(dbRefNode, {
    [`${type}/skipList`]: skipList
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      skipList
    }
  });
  return updatedVal;
}

export async function addToDelayedQueue(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  if (current.delayedQueue.includes(queueNumber)) return val;
  
  const delayedQueue = [...current.delayedQueue, queueNumber];
  
  await update(dbRefNode, {
    [`${type}/delayedQueue`]: delayedQueue
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      delayedQueue
    }
  });
  return updatedVal;
}

export async function removeFromDelayedQueue(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  const delayedQueue = current.delayedQueue.filter((q) => q !== queueNumber);
  
  await update(dbRefNode, {
    [`${type}/delayedQueue`]: delayedQueue
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      delayedQueue
    }
  });
  return updatedVal;
}

export async function moveToMissed(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  const delayedQueue = current.delayedQueue.filter((q) => q !== queueNumber);
  const missedQueue = current.missedQueue.includes(queueNumber) ? current.missedQueue : [...current.missedQueue, queueNumber];
  
  await update(dbRefNode, {
    [`${type}/delayedQueue`]: delayedQueue,
    [`${type}/missedQueue`]: missedQueue
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      delayedQueue,
      missedQueue
    }
  });
  return updatedVal;
}

export async function removeFromMissed(type, state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  
  const missedQueue = current.missedQueue.filter((q) => q !== queueNumber);
  
  await update(dbRefNode, {
    [`${type}/missedQueue`]: missedQueue
  });
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      missedQueue
    }
  });
  return updatedVal;
}

export async function resetQueue(floorId = "") {
  await set(queueRef(floorId), {
    jual: {
      currentLetter: 0,
      currentNumber: 1,
      lastLetter: 0,
      lastNumber: 0,
      delayedQueue: [],
      missedQueue: [],
      skipList: []
    },
    beli: {
      currentLetter: 0,
      currentNumber: 1,
      lastLetter: 0,
      lastNumber: 0,
      delayedQueue: [],
      missedQueue: [],
      skipList: []
    }
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────
export async function writeAnalyticsEntry({ queueNumber, status = "served", waitTime = null, floorId = "" }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const dbRefNode = floorId 
    ? floorDataRefWithFloorId(rtdb, floorId, "queue", "analytics", String(y), String(m), String(d))
    : floorDataRef(rtdb, "queue", "analytics", String(y), String(m), String(d));
  await push(dbRefNode, {
    queueNumber,
    status,
    timestamp: now.toISOString(),
    hour: now.getHours(),
    day: now.getDay(),
    date: d,
    month: m,
    year: y,
    waitTime,
  });
}

export async function fetchAnalyticsByMonth(year, month, floorId = "") {
  const dbRefNode = floorId
    ? floorDataRefWithFloorId(rtdb, floorId, "queue", "analytics", String(year), String(month))
    : floorDataRef(rtdb, "queue", "analytics", String(year), String(month));
  const snap = await get(dbRefNode);
  if (!snap.val()) return [];
  const entries = [];
  snap.forEach((daySnap) => {
    daySnap.forEach((entrySnap) => {
      entries.push({ id: entrySnap.key, ...entrySnap.val() });
    });
  });
  return entries;
}

export async function resetAnalytics(year, month, floorId = "") {
  const dbRefNode = floorId
    ? floorDataRefWithFloorId(rtdb, floorId, "queue", "analytics", String(year), String(month))
    : floorDataRef(rtdb, "queue", "analytics", String(year), String(month));
  await remove(dbRefNode);
}

// ── Printer Status (Software-Based Counter) ──────────────────────────────────
export const DEFAULT_PRINTER_STATUS = Object.freeze({
  active_paper_type: "80x80",
  paper_roll_length: 40,      // in meters
  ticket_length: 15.5,        // in cm
  alert_threshold_pct: 85,    // in %
  total_prints: 0,
  max_capacity: 258,
  threshold: 219,
  last_reset: null,
});

export function printerStatusRef(floorId = "") {
  return floorDataRefWithFloorId(rtdb, floorId, "queue", "printer_status");
}

export function subscribePrinterStatus(floorId = "", callback) {
  return onValue(printerStatusRef(floorId), (snap) => {
    const val = snap.val();
    if (!val) {
      callback({ ...DEFAULT_PRINTER_STATUS });
    } else {
      callback({
        active_paper_type: val.active_paper_type || "80x80",
        paper_roll_length: Number(val.paper_roll_length) || 40,
        ticket_length: Number(val.ticket_length) || 15.5,
        alert_threshold_pct: Number(val.alert_threshold_pct) || 85,
        total_prints: Number(val.total_prints) || 0,
        max_capacity: Number(val.max_capacity) || 258,
        threshold: Number(val.threshold) || 219,
        last_reset: val.last_reset || null,
      });
    }
  });
}

export async function incrementPrintCount(floorId = "") {
  const refNode = printerStatusRef(floorId);
  await update(refNode, {
    total_prints: increment(1)
  });
}

export async function savePrinterSettings(floorId = "", data = {}) {
  const paper_roll_length = Number(data.paper_roll_length) || 40;
  const ticket_length = Number(data.ticket_length) || 15.5;
  const alert_threshold_pct = Number(data.alert_threshold_pct) || 85;
  const active_paper_type = data.active_paper_type || "80x80";
  const total_prints = Number(data.total_prints) >= 0 ? Number(data.total_prints) : 0;

  const max_capacity = Math.floor((paper_roll_length * 100) / ticket_length);
  const threshold = Math.floor((max_capacity * alert_threshold_pct) / 100);

  const payload = {
    active_paper_type,
    paper_roll_length,
    ticket_length,
    alert_threshold_pct,
    total_prints,
    max_capacity,
    threshold
  };

  await update(printerStatusRef(floorId), payload);
}

export async function resetPrinterCounter(floorId = "", data = {}) {
  const paper_roll_length = Number(data.paper_roll_length) || 40;
  const ticket_length = Number(data.ticket_length) || 15.5;
  const alert_threshold_pct = Number(data.alert_threshold_pct) || 85;
  const active_paper_type = data.active_paper_type || "80x80";

  const max_capacity = Math.floor((paper_roll_length * 100) / ticket_length);
  const threshold = Math.floor((max_capacity * alert_threshold_pct) / 100);
  const now = new Date().toISOString();

  const payload = {
    active_paper_type,
    paper_roll_length,
    ticket_length,
    alert_threshold_pct,
    total_prints: 0,
    max_capacity,
    threshold,
    last_reset: now
  };

  await set(printerStatusRef(floorId), payload);
}

// ── Connection status ──────────────────────────────────────────────────────
export function subscribeConnection(callback) {
  return onValue(dbRef(rtdb, ".info/connected"), (snap) => callback(snap.val() === true));
}

// ── Queue Staff Rotation & Settings ─────────────────────────────────────────

export async function fetchQueueQuotaSettings(floorId = "") {
  try {
    const docRef = floorDoc(db, "queueSettings", "quota", floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        morningJualQuota: Number(data.morningJualQuota) || 2,
        afternoonJualQuota: Number(data.afternoonJualQuota) || 3,
      };
    }
  } catch (error) {
    console.error("Error fetching queue quota settings", error);
  }
  return {
    morningJualQuota: 2,
    afternoonJualQuota: 3,
  };
}

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getNowWITA() {
  const date = new Date();
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  return new Date(utcMs + WITA_OFFSET_MS);
}

export function getTodayStringWITA() {
  const d = getNowWITA();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getISOStringWITA() {
  const d = getNowWITA();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:${s}+08:00`;
}

export async function saveQueueQuotaSettings(floorId, data) {
  const docRef = floorDoc(db, "queueSettings", "quota", floorId);
  await setDoc(docRef, {
    morningJualQuota: Number(data.morningJualQuota) || 2,
    afternoonJualQuota: Number(data.afternoonJualQuota) || 3,
    lastUpdated: getISOStringWITA(),
  }, { merge: true });
}

function getRosterHistoryDocRef(floorId) {
  const resolved = String(floorId || "").trim().toUpperCase();
  const validFloor = resolved === "L2" ? "L2" : "L1";
  return doc(db, "floors", validFloor, "queueSettings", "rosterHistory");
}

export async function fetchRosterHistory(floorId = "") {
  try {
    const docRef = getRosterHistoryDocRef(floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return data.history || data || {};
    }
  } catch (error) {
    console.error("Error fetching roster history", error);
  }
  return {};
}

export function subscribeRosterHistory(floorId = "", callback) {
  const docRef = getRosterHistoryDocRef(floorId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback(data.history || data || {});
      } else {
        callback({});
      }
    },
    (error) => {
      console.error("Error subscribing to roster history:", error);
      callback({});
    }
  );
}

export async function saveRosterHistory(floorId, history) {
  const docRef = getRosterHistoryDocRef(floorId);
  await setDoc(docRef, {
    history: history || {},
    lastUpdated: getISOStringWITA(),
  }, { merge: true });
}

export async function saveActiveRosterToRTB(date, shift, floorId, activeSales, jual, beli) {
  const ref = dbRef(rtdb, `queue/daily_roster/${date}/${shift}/${floorId}`);
  await set(ref, {
    activeSales: activeSales || [],
    jual: jual || [],
    beli: beli || []
  });
}

export function subscribeDailyRoster(date, shift, callback) {
  const ref = dbRef(rtdb, `queue/daily_roster/${date}/${shift}`);
  return onValue(ref, (snap) => {
    callback(snap.val() || {});
  });
}

export function subscribeActiveRoster(date, shift, floorId, callback) {
  const ref = dbRef(rtdb, `queue/daily_roster/${date}/${shift}/${floorId}`);
  return onValue(ref, (snap) => {
    callback(snap.val() || {});
  });
}

export function buildHistoryTimeline(history, excludeDate = "", excludeShift = "") {
  if (!history || typeof history !== "object") return [];

  const timeline = [];
  const dateKeys = Object.keys(history).sort();

  dateKeys.forEach(dateKey => {
    const val = history[dateKey];
    if (!val) return;

    const isSameDate = excludeDate && dateKey === excludeDate;

    if (Array.isArray(val)) {
      if (!isSameDate) {
        timeline.push({
          key: dateKey,
          dateStr: dateKey.split("_")[0],
          jual: val.map(n => String(n).trim()).filter(Boolean)
        });
      }
    } else if (typeof val === "object") {
      if (Array.isArray(val.morning) && val.morning.length > 0) {
        if (!(isSameDate && excludeShift === "morning")) {
          timeline.push({
            key: `${dateKey}_morning`,
            dateStr: dateKey,
            shift: "morning",
            jual: val.morning.map(n => String(n).trim()).filter(Boolean)
          });
        }
      }
      if (Array.isArray(val.afternoon) && val.afternoon.length > 0) {
        if (!(isSameDate && excludeShift === "afternoon")) {
          timeline.push({
            key: `${dateKey}_afternoon`,
            dateStr: dateKey,
            shift: "afternoon",
            jual: val.afternoon.map(n => String(n).trim()).filter(Boolean)
          });
        }
      }
      if (Array.isArray(val.legacy) && val.legacy.length > 0 && !val.morning && !val.afternoon) {
        if (!isSameDate) {
          timeline.push({
            key: dateKey,
            dateStr: dateKey,
            jual: val.legacy.map(n => String(n).trim()).filter(Boolean)
          });
        }
      }
    }
  });

  return timeline;
}

export function getStaffRosterStats(history, staffName, currentDate = "", currentShift = "") {
  if (!staffName) return { text: "", badgeClass: "bg-light text-muted", isNever: true, count: 0 };
  const target = String(staffName).trim().toLowerCase();
  
  const timeline = buildHistoryTimeline(history, currentDate, currentShift).slice(-60);
  
  let lastEvent = null;
  let lastIdx = -1;
  let count = 0;

  timeline.forEach((event, idx) => {
    const match = (event.jual || []).some(n => String(n).trim().toLowerCase() === target);
    if (match) {
      count++;
      lastIdx = idx;
      lastEvent = event;
    }
  });

  if (lastIdx === -1) {
    return {
      text: "",
      badgeClass: "",
      isNever: true,
      count: 0
    };
  }

  const dateStr = lastEvent?.dateStr || "";
  let daysAgoText = "";
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const lastDate = new Date(dateStr + "T00:00:00");
    const todayStr = currentDate || getTodayStringWITA();
    const todayDate = new Date(todayStr + "T00:00:00");
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      daysAgoText = lastEvent.shift === "morning" ? "Jual Pagi Ini" : "Jual Hari Ini";
    } else if (diffDays === 1) {
      daysAgoText = lastEvent.shift === "morning" ? "Jual Pagi Kemarin" : "Jual Kemarin";
    } else {
      daysAgoText = `Jual ${diffDays} hr lalu`;
    }
  } else {
    daysAgoText = "Pernah Jual";
  }

  const isRecent = (timeline.length - 1 - lastIdx) <= 2;
  const badgeClass = isRecent
    ? "bg-warning bg-opacity-10 text-dark border border-warning border-opacity-20"
    : "bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-20";

  return {
    text: daysAgoText,
    badgeClass,
    isNever: false,
    count
  };
}

export function calculateAutoRotation(activeSales, history, floorId, shift, quota) {
  const staffList = (activeSales || []).map(n => String(n).trim()).filter(Boolean);
  if (staffList.length === 0) {
    return { jual: [], beli: [] };
  }

  const todayStr = getTodayStringWITA();
  const timeline = buildHistoryTimeline(history, todayStr, shift).slice(-60);

  const staffStats = {};
  staffList.forEach(name => {
    const norm = name.toLowerCase();
    staffStats[norm] = {
      name,
      jualCount: 0,
      lastJualIndex: -1,
      neverServed: true
    };
  });

  timeline.forEach((event, idx) => {
    (event.jual || []).forEach(rawName => {
      const norm = String(rawName).trim().toLowerCase();
      if (staffStats[norm]) {
        staffStats[norm].jualCount += 1;
        staffStats[norm].lastJualIndex = idx;
        staffStats[norm].neverServed = false;
      }
    });
  });

  const seedString = `${todayStr}_${floorId || 'L1'}_${shift || 'morning'}`;
  const seedHash = Array.from(seedString).reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const getTieBreakerRank = (name) => {
    const nameHash = Array.from(name.toLowerCase()).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (nameHash * 31 + seedHash) % 1000;
  };

  const sortedStaff = [...staffList].sort((a, b) => {
    const statA = staffStats[a.toLowerCase()];
    const statB = staffStats[b.toLowerCase()];

    // Tier 1: Never served Jual comes first
    if (statA.neverServed !== statB.neverServed) {
      return statA.neverServed ? -1 : 1;
    }

    // Tier 2: Recency - staff who served Jual longest ago (smaller lastJualIndex) comes first
    if (statA.lastJualIndex !== statB.lastJualIndex) {
      return statA.lastJualIndex - statB.lastJualIndex;
    }

    // Tier 3: Total frequency - staff with fewer Jual assignments comes first
    if (statA.jualCount !== statB.jualCount) {
      return statA.jualCount - statB.jualCount;
    }

    // Tier 4: Daily rotating tie-breaker seed instead of permanent alphabetical bias
    return getTieBreakerRank(a) - getTieBreakerRank(b);
  });

  const targetQuota = Math.max(1, Number(quota) || 2);
  const jualStaff = sortedStaff.slice(0, targetQuota);
  const beliStaff = sortedStaff.slice(targetQuota);

  return {
    jual: jualStaff,
    beli: beliStaff
  };
}

export async function fetchQueueGeneralSettings(floorId = "") {
  const docRef = floorDoc(db, "queueSettings", "general", floorId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return {
      queueMode: snap.data().queueMode || "legacy",
      hybridMode: snap.data().hybridMode || false,
      showFloorSwitcher: snap.data().showFloorSwitcher || false,
      resetPassword: snap.data().resetPassword || "melatigo"
    };
  }
  return {
    queueMode: "legacy",
    hybridMode: false,
    showFloorSwitcher: false,
    resetPassword: "melatigo"
  };
}

export async function saveQueueGeneralSettings(floorId, data) {
  const docRef = floorDoc(db, "queueSettings", "general", floorId);
  await setDoc(docRef, {
    queueMode: data.queueMode || "legacy",
    hybridMode: !!data.hybridMode,
    showFloorSwitcher: !!data.showFloorSwitcher,
    resetPassword: data.resetPassword || "melatigo",
    lastUpdated: new Date().toISOString()
  }, { merge: true });
}

export function subscribeQueueGeneralSettings(callback, floorId = "") {
  const docRef = floorDoc(db, "queueSettings", "general", floorId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({
        queueMode: snap.data().queueMode || "legacy",
        hybridMode: snap.data().hybridMode || false,
        showFloorSwitcher: snap.data().showFloorSwitcher || false,
        resetPassword: snap.data().resetPassword || "melatigo"
      });
    } else {
      callback({
        queueMode: "legacy",
        hybridMode: false,
        showFloorSwitcher: false,
        resetPassword: "melatigo"
      });
    }
  });
}

export async function nextQueueHybrid(type, state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = getQueueSectionState(val, type);
  let { currentLetter, currentNumber, lastLetter, lastNumber, delayedQueue, missedQueue, skipList } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  
  const currentIdx = (currentLetter ?? 0) * 99 + currentNumber;
  const lastIdx = (lastLetter ?? 0) * 99 + lastNumber;
  
  const updates = {};
  
  if (lastIdx <= currentIdx || lastNumber === 0) {
    if (lastNumber === 0) {
      lastLetter = 0;
      lastNumber = 1;
    } else {
      lastNumber++;
      if (lastNumber > 99) {
        lastNumber = 1;
        lastLetter = (lastLetter + 1) % letters.length;
      }
    }
    updates[`${type}/lastLetter`] = lastLetter;
    updates[`${type}/lastNumber`] = lastNumber;
  }
  
  currentNumber++;
  if (currentNumber > 99) {
    currentNumber = 1;
    currentLetter = (currentLetter + 1) % letters.length;
  }
  
  // Check skip list
  let limit = 0;
  do {
    const qStr = letters[currentLetter] + padNumber(currentNumber);
    if (skipList.includes(qStr)) {
      skipList = skipList.filter(q => q !== qStr);
      currentNumber++;
      if (currentNumber > 99) {
        currentNumber = 1;
        currentLetter = (currentLetter + 1) % letters.length;
      }
      limit++;
      continue;
    }
    break;
  } while (limit < 200);
  
  updates[`${type}/currentLetter`] = currentLetter;
  updates[`${type}/currentNumber`] = currentNumber;
  updates[`${type}/skipList`] = skipList;
  
  await update(dbRefNode, updates);
  
  const updatedVal = normalizeQueueState({
    ...val,
    [type]: {
      ...current,
      currentLetter,
      currentNumber,
      lastLetter,
      lastNumber,
      skipList
    }
  });
  return updatedVal;
}
