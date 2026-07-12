import { rtdb, db } from "@/config/firebase";
import { ref as dbRef, onValue, set, get, push, remove } from "firebase/database";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  A: "Beli / Tukar (A)",
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
  
  let lastLetter = current.lastLetter ?? 0;
  let lastNumber = current.lastNumber ?? 0;
  
  const letters = type === "jual" ? ["D", "E"] : ["A", "B", "C"];
  
  if (lastNumber === 0) {
    lastLetter = 0;
    lastNumber = 1;
  } else {
    lastNumber++;
    if (lastNumber > 50) {
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
  
  const letters = type === "jual" ? ["D", "E"] : ["A", "B", "C"];
  
  currentNumber++;
  if (currentNumber > 50) {
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
      if (currentNumber > 50) {
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
  
  const letters = type === "jual" ? ["D", "E"] : ["A", "B", "C"];
  
  currentNumber--;
  if (currentNumber < 1) {
    currentNumber = 50;
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
      currentNumber: Math.max(1, Math.min(50, number))
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

export async function saveQueueQuotaSettings(floorId, data) {
  const docRef = floorDoc(db, "queueSettings", "quota", floorId);
  await setDoc(docRef, {
    morningJualQuota: Number(data.morningJualQuota) || 2,
    afternoonJualQuota: Number(data.afternoonJualQuota) || 3,
    lastUpdated: new Date().toISOString(),
  }, { merge: true });
}

export async function fetchRosterHistory(floorId = "") {
  try {
    const docRef = floorDoc(db, "queueSettings", "rosterHistory", floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().history || {};
    }
  } catch (error) {
    console.error("Error fetching roster history", error);
  }
  return {};
}

export async function saveRosterHistory(floorId, history) {
  const docRef = floorDoc(db, "queueSettings", "rosterHistory", floorId);
  await setDoc(docRef, {
    history: history || {},
    lastUpdated: new Date().toISOString(),
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

export function calculateAutoRotation(activeSales, history, floorId, shift, quota) {
  const staffList = (activeSales || []).map(n => String(n).trim());
  if (staffList.length === 0) {
    return { jual: [], beli: [] };
  }

  // Count Jual appearances in the history (last 7 days/entries)
  const jualCounts = {};
  staffList.forEach(name => {
    jualCounts[name.toLowerCase()] = 0;
  });

  const historyKeys = Object.keys(history || {}).sort().slice(-7);
  historyKeys.forEach(dateKey => {
    const jualList = history[dateKey] || [];
    jualList.forEach(name => {
      const normalized = String(name).trim().toLowerCase();
      if (jualCounts[normalized] !== undefined) {
        jualCounts[normalized]++;
      }
    });
  });

  // Sort staff by frequency (ascending) and then alphabetically by name
  const sortedStaff = [...staffList].sort((a, b) => {
    const countA = jualCounts[a.toLowerCase()] || 0;
    const countB = jualCounts[b.toLowerCase()] || 0;
    if (countA !== countB) {
      return countA - countB;
    }
    return a.localeCompare(b);
  });

  // Assign top N as Jual, others as Beli
  const targetQuota = Math.max(1, Number(quota) || 2);
  const jualStaff = sortedStaff.slice(0, targetQuota);
  const beliStaff = sortedStaff.slice(targetQuota);

  return {
    jual: jualStaff,
    beli: beliStaff
  };
}
