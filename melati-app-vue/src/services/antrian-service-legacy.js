import { rtdb } from "@/config/firebase";
import { ref as dbRef, onValue, set, get, push, remove, update } from "firebase/database";
import { floorDataRef, floorDataRefWithFloorId } from "./floor-scope";
import { getTodayStringWITA } from "./antrian-service";

const LETTERS = ["A", "B", "C", "D"];

// ΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function padNumber(n) {
  return String(n).padStart(2, "0");
}

export function formatQueue(letterIndex, number) {
  return LETTERS[letterIndex] + padNumber(number);
}

export const LETTERS_MAP = {
  A: "Layanan Umum",
  B: "Khusus / Prioritas",
  C: "Servis / Reparasi",
  D: "Pembelian Emas",
};

function queueRef(floorId = "") {
  if (floorId) return floorDataRefWithFloorId(rtdb, floorId, "queue", "state");
  return floorDataRef(rtdb, "queue", "state");
}

function customerCountRef() {
  return floorDataRef(rtdb, "queue", "customerCount");
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
    const state = {
      currentLetter: val.currentLetter ?? 0,
      currentNumber: val.currentNumber ?? 1,
      delayedQueue: val.delayedQueue || [],
      skipList: val.skipList || [],
      missedQueue: val.missedQueue || [],
      counters: val.counters || { A: 0, B: 0, C: 0, D: 0 }
    };
    latestQueueState[floorId] = state;
    callback(state);
  });
}

async function saveState(state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  await update(dbRefNode, {
    currentLetter: state.currentLetter,
    currentNumber: state.currentNumber,
    delayedQueue: state.delayedQueue || [],
    skipList: state.skipList || [],
    missedQueue: state.missedQueue || [],
  });
}

async function getState(floorId = "") {
  const snap = await get(queueRef(floorId));
  const val = snap.val() || {};
  return {
    currentLetter: val.currentLetter ?? 0,
    currentNumber: val.currentNumber ?? 1,
    delayedQueue: val.delayedQueue || [],
    skipList: val.skipList || [],
    missedQueue: val.missedQueue || [],
    counters: val.counters || { A: 0, B: 0, C: 0, D: 0 }
  };
}

// ── Operations ─────────────────────────────────────────────────────────────
export function addCustomerQueue(letterIndex, floorId = "") {
  const resolvedFloor = floorId || "";
  const dbRefNode = queueRef(resolvedFloor);
  
  const LETTERS = ["A", "B", "C", "D"];
  const letter = LETTERS[letterIndex] || "A";
  
  const hasFirebaseState = !!latestQueueState[resolvedFloor];
  const dbCurrent = (hasFirebaseState && latestQueueState[resolvedFloor].counters && latestQueueState[resolvedFloor].counters[letter]) || 0;
  
  const todayStr = getTodayStringWITA();
  const localKey = `kiosk_queue_counter_legacy_${resolvedFloor}_${letter}`;
  let localCurrent = 0;
  
  try {
    const rawLocal = localStorage.getItem(localKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed.date === todayStr) {
        localCurrent = parsed.count ?? 0;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca localStorage legacy:", e);
  }
  
  let currentCount;
  const isDbReset = hasFirebaseState && 
    (!latestQueueState[resolvedFloor].counters || 
     Object.values(latestQueueState[resolvedFloor].counters).every(v => v === 0));
  
  if (isDbReset) {
    currentCount = 0;
  } else {
    currentCount = Math.max(localCurrent, dbCurrent);
  }
  
  const newCount = currentCount + 1 > 50 ? 1 : currentCount + 1;
  
  try {
    localStorage.setItem(localKey, JSON.stringify({
      date: todayStr,
      count: newCount
    }));
  } catch (e) {
    console.warn("Gagal menulis ke localStorage legacy:", e);
  }
  
  update(dbRefNode, {
    [`counters/${letter}`]: newCount
  }).catch((err) => {
    console.warn("Firebase update antrean legacy tertunda (offline):", err);
  });
  
  return letter + padNumber(newCount);
}

export async function nextQueue(state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  let { currentLetter, currentNumber, delayedQueue, skipList, missedQueue } = {
    currentLetter: val.currentLetter ?? 0,
    currentNumber: val.currentNumber ?? 1,
    delayedQueue: val.delayedQueue || [],
    skipList: val.skipList || [],
    missedQueue: val.missedQueue || [],
  };
  
  let limit = 0;
  do {
    currentNumber++;
    if (currentNumber > 50) {
      currentNumber = 1;
      currentLetter = (currentLetter + 1) % LETTERS.length;
    }
    const qNum = formatQueue(currentLetter, currentNumber);
    const skipIdx = skipList.indexOf(qNum);
    if (skipIdx !== -1) {
      skipList = skipList.filter((_, i) => i !== skipIdx);
      limit++;
      continue;
    }
    break;
  } while (limit < 200);

  const newState = { currentLetter, currentNumber, delayedQueue, skipList, missedQueue };
  await saveState(newState, floorId);
  return {
    ...val,
    ...newState
  };
}

export async function previousQueue(state, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  let { currentLetter, currentNumber, delayedQueue, skipList, missedQueue } = {
    currentLetter: val.currentLetter ?? 0,
    currentNumber: val.currentNumber ?? 1,
    delayedQueue: val.delayedQueue || [],
    skipList: val.skipList || [],
    missedQueue: val.missedQueue || [],
  };
  
  currentNumber--;
  if (currentNumber < 1) {
    currentLetter = (currentLetter - 1 + LETTERS.length) % LETTERS.length;
    currentNumber = 50;
  }
  
  const newState = { currentLetter, currentNumber, delayedQueue, skipList, missedQueue };
  await saveState(newState, floorId);
  return {
    ...val,
    ...newState
  };
}

export async function setCustomQueue(state, letterIndex, number, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  
  const currentLetter = letterIndex;
  const currentNumber = Math.max(1, Math.min(50, number));
  
  const newState = {
    currentLetter,
    currentNumber,
    delayedQueue: val.delayedQueue || [],
    skipList: val.skipList || [],
    missedQueue: val.missedQueue || [],
  };
  await saveState(newState, floorId);
  return {
    ...val,
    ...newState
  };
}

export async function addToSkipList(state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const skipList = val.skipList || [];
  
  if (skipList.includes(queueNumber)) return val;
  
  const newSkipList = [...skipList, queueNumber];
  
  await update(dbRefNode, {
    skipList: newSkipList
  });
  
  return {
    ...val,
    skipList: newSkipList
  };
}

export async function addToDelayedQueue(state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const delayedQueue = val.delayedQueue || [];
  
  if (delayedQueue.includes(queueNumber)) return val;
  
  const newDelayedQueue = [...delayedQueue, queueNumber];
  
  await update(dbRefNode, {
    delayedQueue: newDelayedQueue
  });
  
  return {
    ...val,
    delayedQueue: newDelayedQueue
  };
}

export async function removeFromDelayedQueue(state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const delayedQueue = val.delayedQueue || [];
  
  const newDelayedQueue = delayedQueue.filter((q) => q !== queueNumber);
  
  await update(dbRefNode, {
    delayedQueue: newDelayedQueue
  });
  
  return {
    ...val,
    delayedQueue: newDelayedQueue
  };
}

export async function moveToMissed(state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const delayedQueue = val.delayedQueue || [];
  const missedQueue = val.missedQueue || [];
  
  const newDelayedQueue = delayedQueue.filter((q) => q !== queueNumber);
  const newMissedQueue = missedQueue.includes(queueNumber) ? missedQueue : [...missedQueue, queueNumber];
  
  await update(dbRefNode, {
    delayedQueue: newDelayedQueue,
    missedQueue: newMissedQueue
  });
  
  return {
    ...val,
    delayedQueue: newDelayedQueue,
    missedQueue: newMissedQueue
  };
}

export async function removeFromMissed(state, queueNumber, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  const missedQueue = val.missedQueue || [];
  
  const newMissedQueue = missedQueue.filter((q) => q !== queueNumber);
  
  await update(dbRefNode, {
    missedQueue: newMissedQueue
  });
  
  return {
    ...val,
    missedQueue: newMissedQueue
  };
}

export async function resetQueue(floorId = "") {
  await set(queueRef(floorId), {
    currentLetter: 0,
    currentNumber: 1,
    delayedQueue: [],
    skipList: [],
    missedQueue: [],
  });
}

// ΓöÇΓöÇ Customer Count ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function incrementCustomer() {
  const snap = await get(customerCountRef());
  const current = snap.val() || 0;
  await set(customerCountRef(), current + 1);
}

export async function decrementCustomer() {
  const snap = await get(customerCountRef());
  const current = snap.val() || 0;
  await set(customerCountRef(), Math.max(0, current - 1));
}

export function subscribeCustomerCount(callback) {
  return onValue(customerCountRef(), (snap) => callback(snap.val() || 0));
}

// ΓöÇΓöÇ Analytics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function writeAnalyticsEntry({ queueNumber, status = "served", waitTime = null }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  await push(analyticsRef(y, m, d), {
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

export async function fetchAnalyticsByMonth(year, month) {
  const snap = await get(floorDataRef(rtdb, "queue", "analytics", String(year), String(month)));
  if (!snap.val()) return [];
  const entries = [];
  snap.forEach((daySnap) => {
    daySnap.forEach((entrySnap) => {
      entries.push({ id: entrySnap.key, ...entrySnap.val() });
    });
  });
  return entries;
}

export async function resetAnalytics(year, month) {
  await remove(floorDataRef(rtdb, "queue", "analytics", String(year), String(month)));
}

// ΓöÇΓöÇ Connection status ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function subscribeConnection(callback) {
  return onValue(dbRef(rtdb, ".info/connected"), (snap) => callback(snap.val() === true));
}
