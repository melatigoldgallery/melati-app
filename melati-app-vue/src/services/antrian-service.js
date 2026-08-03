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

function analyticsRef(year, month, day) {
  return floorDataRef(rtdb, "queue", "analytics", String(year), String(month), String(day));
}

// ── State subscription ─────────────────────────────────────────────────────
export function subscribeQueue(arg1, arg2) {
  const floorId = typeof arg1 === "string" ? arg1 : "";
  const callback = typeof arg1 === "function" ? arg1 : arg2;
  if (typeof callback !== "function") {
    throw new Error("subscribeQueue requires a callback");
  }
  return onValue(queueRef(floorId), (snap) => {
    const val = snap.val() || {};
    callback({
      jual: {
        currentLetter: val.jual?.currentLetter ?? 0,
        currentNumber: val.jual?.currentNumber ?? 1,
        lastLetter: val.jual?.lastLetter ?? 0,
        lastNumber: val.jual?.lastNumber ?? 0,
        delayedQueue: val.jual?.delayedQueue || [],
        missedQueue: val.jual?.missedQueue || [],
        skipList: val.jual?.skipList || [],
      },
      beli: {
        currentLetter: val.beli?.currentLetter ?? 0,
        currentNumber: val.beli?.currentNumber ?? 1,
        lastLetter: val.beli?.lastLetter ?? 0,
        lastNumber: val.beli?.lastNumber ?? 0,
        delayedQueue: val.beli?.delayedQueue || [],
        missedQueue: val.beli?.missedQueue || [],
        skipList: val.beli?.skipList || [],
      }
    });
  });
}

async function saveState(state, floorId = "") {
  await set(queueRef(floorId), state);
}

// ── Operations ─────────────────────────────────────────────────────────────
export async function addCustomerQueue(type, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const current = val[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  let lastLetter = (current.lastLetter ?? 0) % letters.length;
  let lastNumber = current.lastNumber ?? 0;
  
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
  
  const newState = {
    ...val,
    [type]: {
      ...current,
      lastLetter,
      lastNumber
    }
  };
  
  await set(dbRefNode, newState);
  return formattedNum;
}

export async function nextQueue(type, state, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  let { currentLetter, currentNumber, lastLetter, lastNumber, delayedQueue, missedQueue, skipList } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  currentLetter = (currentLetter ?? 0) % letters.length;
  lastLetter = (lastLetter ?? 0) % letters.length;
  
  const maxIdx = letters.length * 99;
  
  const currentIdx = currentLetter * 99 + currentNumber;
  const lastIdx = lastLetter * 99 + lastNumber;
  const nextAfterLastIdx = (lastIdx % maxIdx) + 1;
  
  if (lastNumber !== 0 && currentIdx === nextAfterLastIdx) {
    return state;
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
  
  const newState = {
    ...state,
    [type]: {
      currentLetter,
      currentNumber,
      lastLetter,
      lastNumber,
      delayedQueue,
      missedQueue,
      skipList
    }
  };
  
  await saveState(newState, floorId);
  return newState;
}

export async function previousQueue(type, state, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  let { currentLetter, currentNumber, lastLetter, lastNumber, delayedQueue, missedQueue, skipList } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  currentLetter = (currentLetter ?? 0) % letters.length;
  lastLetter = (lastLetter ?? 0) % letters.length;
  
  currentNumber--;
  if (currentNumber < 1) {
    currentNumber = 99;
    currentLetter = (currentLetter - 1 + letters.length) % letters.length;
  }
  
  const newState = {
    ...state,
    [type]: {
      currentLetter,
      currentNumber,
      lastLetter,
      lastNumber,
      delayedQueue,
      missedQueue,
      skipList
    }
  };
  
  await saveState(newState, floorId);
  return newState;
}

export async function setCustomQueue(type, state, letterIndex, number, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  const newState = {
    ...state,
    [type]: {
      ...current,
      currentLetter: Math.max(0, letterIndex),
      currentNumber: Math.max(1, Math.min(99, number))
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function addToSkipList(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  if (current.skipList.includes(queueNumber)) return state;
  
  const newState = {
    ...state,
    [type]: {
      ...current,
      skipList: [...current.skipList, queueNumber]
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function removeFromSkipList(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  const newState = {
    ...state,
    [type]: {
      ...current,
      skipList: current.skipList.filter(q => q !== queueNumber)
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function addToDelayedQueue(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  if (current.delayedQueue.includes(queueNumber)) return state;
  
  const newState = {
    ...state,
    [type]: {
      ...current,
      delayedQueue: [...current.delayedQueue, queueNumber]
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function removeFromDelayedQueue(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  const newState = {
    ...state,
    [type]: {
      ...current,
      delayedQueue: current.delayedQueue.filter((q) => q !== queueNumber)
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function moveToMissed(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  const newState = {
    ...state,
    [type]: {
      ...current,
      delayedQueue: current.delayedQueue.filter((q) => q !== queueNumber),
      missedQueue: current.missedQueue.includes(queueNumber) ? current.missedQueue : [...current.missedQueue, queueNumber]
    }
  };
  await saveState(newState, floorId);
  return newState;
}

export async function removeFromMissed(type, state, queueNumber, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  const newState = {
    ...state,
    [type]: {
      ...current,
      missedQueue: current.missedQueue.filter((q) => q !== queueNumber)
    }
  };
  await saveState(newState, floorId);
  return newState;
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
  try {
    const docRef = floorDoc(db, "queueSettings", "general", floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        queueMode: snap.data().queueMode || "legacy",
        hybridMode: snap.data().hybridMode || false,
        showFloorSwitcher: snap.data().showFloorSwitcher || false
      };
    }
  } catch (error) {
    console.error("Error fetching general queue settings:", error);
  }
  return {
    queueMode: "legacy",
    hybridMode: false,
    showFloorSwitcher: false
  };
}

export async function saveQueueGeneralSettings(floorId, data) {
  const docRef = floorDoc(db, "queueSettings", "general", floorId);
  await setDoc(docRef, {
    queueMode: data.queueMode || "legacy",
    hybridMode: !!data.hybridMode,
    showFloorSwitcher: !!data.showFloorSwitcher,
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
        showFloorSwitcher: snap.data().showFloorSwitcher || false
      });
    } else {
      callback({
        queueMode: "legacy",
        hybridMode: false,
        showFloorSwitcher: false
      });
    }
  });
}

export async function nextQueueHybrid(type, state, floorId = "") {
  const current = state[type] || { currentLetter: 0, currentNumber: 1, lastLetter: 0, lastNumber: 0, delayedQueue: [], missedQueue: [], skipList: [] };
  let { currentLetter, currentNumber, lastLetter, lastNumber, delayedQueue, missedQueue, skipList } = current;
  
  const letters = type === "jual" ? ["A"] : ["B", "C"];
  
  // If queue is empty or lastNumber is 0, auto-generate the next lastNumber/lastLetter
  const currentIdx = (currentLetter ?? 0) * 99 + currentNumber;
  const lastIdx = (lastLetter ?? 0) * 99 + lastNumber;
  
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
  }
  
  // Now advance currentNumber
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
  
  const newState = {
    ...state,
    [type]: {
      currentLetter,
      currentNumber,
      lastLetter,
      lastNumber,
      delayedQueue,
      missedQueue,
      skipList
    }
  };
  
  await saveState(newState, floorId);
  return newState;
}
