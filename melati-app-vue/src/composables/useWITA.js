// composables/useWITA.js
// Semua timestamp inventory menggunakan WITA (UTC+8)

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function useWITA() {
  function toWITA(date = new Date()) {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
    return new Date(utcMs + WITA_OFFSET_MS);
  }

  function nowWITA() {
    return toWITA(new Date());
  }

  function todayStringWITA() {
    const d = nowWITA();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function timeStringWITA() {
    const d = nowWITA();
    return d.toTimeString().slice(0, 8); // HH:mm:ss
  }

  return { toWITA, nowWITA, todayStringWITA, timeStringWITA };
}
