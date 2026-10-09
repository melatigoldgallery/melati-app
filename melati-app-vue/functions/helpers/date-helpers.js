import { HttpsError } from "firebase-functions/v2/https";
import { WITA_MS, WITA_OFFSET } from "../config.js";

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toWitaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + WITA_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

export function formatYmd({ y, m, d }) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function formatDmy({ y, m, d }) {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

export function toDateFromYmd(ymd, time = "00:00:00") {
  return new Date(`${ymd}T${time}${WITA_OFFSET}`);
}

export function shiftYmd(ymd, deltaDays) {
  const base = toDateFromYmd(ymd, "00:00:00");
  const shifted = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return formatYmd(toWitaParts(shifted));
}

export function formatMonthBounds(month) {
  const [yStr, mStr] = String(month || "").split("-");
  const year = Number(yStr);
  const monthNum = Number(mStr);

  if (!Number.isInteger(year) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new HttpsError("invalid-argument", "Format bulan tidak valid. Gunakan YYYY-MM.");
  }

  const first = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const next = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
  const last = new Date(Date.UTC(year, monthNum, 0, 0, 0, 0, 0));

  const startYmd = `${year}-${pad2(monthNum)}-01`;
  const endYmd = `${year}-${pad2(monthNum)}-${pad2(last.getUTCDate())}`;

  return {
    year,
    monthNum,
    startYmd,
    endYmd,
    first,
    next,
  };
}
