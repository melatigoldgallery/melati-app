import { rtdb } from "@/config/firebase";
import { ref as dbRef, onValue, set, get, push, remove } from "firebase/database";
import { floorDataRef, floorDataRefWithFloorId } from "./floor-scope";

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

// ΓöÇΓöÇ State subscription ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export function subscribeQueue(arg1, arg2) {
  const floorId = typeof arg1 === "string" ? arg1 : "";
  const callback = typeof arg1 === "function" ? arg1 : arg2;
  if (typeof callback !== "function") {
    throw new Error("subscribeQueue requires a callback");
  }
  return onValue(queueRef(floorId), (snap) => {
    const val = snap.val() || {};
    callback({
      currentLetter: val.currentLetter ?? 0,
      currentNumber: val.currentNumber ?? 1,
      delayedQueue: val.delayedQueue || [],
      skipList: val.skipList || [],
      missedQueue: val.missedQueue || [],
    });
  });
}

async function saveState(state, floorId = "") {
  await set(queueRef(floorId), {
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
  };
}

// ΓöÇΓöÇ Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export async function addCustomerQueue(letterIndex, floorId = "") {
  const dbRefNode = queueRef(floorId);
  const snap = await get(dbRefNode);
  const val = snap.val() || {};
  
  const LETTERS = ["A", "B", "C", "D"];
  const letter = LETTERS[letterIndex] || "A";
  
  const counters = val.counters || { A: 0, B: 0, C: 0, D: 0 };
  const currentCount = (counters[letter] || 0) + 1;
  const newCount = currentCount > 50 ? 1 : currentCount;
  
  const newCounters = {
    ...counters,
    [letter]: newCount
  };
  
  await set(dbRefNode, {
    ...val,
    counters: newCounters
  });
  
  return letter + padNumber(newCount);
}

export async function nextQueue(state, floorId = "") {
  let { currentLetter, currentNumber, delayedQueue, skipList, missedQueue } = state;
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
  return newState;
}

export async function previousQueue(state, floorId = "") {
  let { currentLetter, currentNumber, delayedQueue, skipList, missedQueue } = state;
  currentNumber--;
  if (currentNumber < 1) {
    currentLetter = (currentLetter - 1 + LETTERS.length) % LETTERS.length;
    currentNumber = 50;
  }
  const newState = { currentLetter, currentNumber, delayedQueue, skipList, missedQueue };
  await saveState(newState, floorId);
  return newState;
}

export async function setCustomQueue(state, letterIndex, number, floorId = "") {
  const newState = {
    ...state,
    currentLetter: letterIndex,
    currentNumber: Math.max(1, Math.min(50, number)),
  };
  await saveState(newState, floorId);
  return newState;
}

export async function addToSkipList(state, queueNumber, floorId = "") {
  if (state.skipList.includes(queueNumber)) return state;
  const newState = { ...state, skipList: [...state.skipList, queueNumber] };
  await saveState(newState, floorId);
  return newState;
}

export async function addToDelayedQueue(state, queueNumber, floorId = "") {
  if (state.delayedQueue.includes(queueNumber)) return state;
  const newState = { ...state, delayedQueue: [...state.delayedQueue, queueNumber] };
  await saveState(newState, floorId);
  return newState;
}

export async function removeFromDelayedQueue(state, queueNumber, floorId = "") {
  const newState = { ...state, delayedQueue: state.delayedQueue.filter((q) => q !== queueNumber) };
  await saveState(newState, floorId);
  return newState;
}

export async function moveToMissed(state, queueNumber, floorId = "") {
  const newState = {
    ...state,
    delayedQueue: state.delayedQueue.filter((q) => q !== queueNumber),
    missedQueue: state.missedQueue.includes(queueNumber) ? state.missedQueue : [...state.missedQueue, queueNumber],
  };
  await saveState(newState, floorId);
  return newState;
}

export async function removeFromMissed(state, queueNumber, floorId = "") {
  const newState = { ...state, missedQueue: state.missedQueue.filter((q) => q !== queueNumber) };
  await saveState(newState, floorId);
  return newState;
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
