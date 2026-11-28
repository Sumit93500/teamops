// data/import-common.js (I2, 2026-11-28): what the I2 import forms share (data/import-assets.js, import-licences.js, import-leave.js,
// import-attendance.js). The engine (data/import-engine.js) is the same one I1's employees form uses; these are only the cell readers.
//   readDate / displayDate   from data/import-employees.js: 2026-12-01, 01-12-2026 (day first), 1 Dec 2026 or Excel's day number
//   plain(message)           a store's sentence in plain words for a person: an ISO date reads "1 Dec 2026", and no record id (FA-12,
//                            EMP-1001, LIC-3 ...) is left in it
//   peopleIndex(users)       a person named in a file by their employee ID, employee code or work email, in any case
//   readAmount(text)         rupees: "45,000", "₹ 45000.50" -> "45000.50" (the store checks the decimals and the range)
//   readDays(text)           whole or half days, 0 to 365
//   officeToday(now)         the office day (India), "YYYY-MM-DD"
import { readDate, displayDate } from "./import-employees.js";
import { officeNow } from "./shift-engine.js";

export { readDate, displayDate };
export const lower = (s) => String(s ?? "").trim().toLowerCase();
export const ok = (value, warning) => (warning ? { value, warning } : { value });
export const bad = (error, reason) => ({ error, reason: reason ?? error });
export const officeToday = (now = Date.now()) => officeNow(now).date;

const ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
// the record ids the stores put in their sentences (asset tags like AST-0001 are written on the things themselves, so they stay)
const IDS = /\s*\(?\b(?:FA|AE|MR|VN|VEN|ITM|SM|LIC|SEAT|EMP|IH|LO|REG|RG|LV|EXP|VIS|WT|PT|ITR)-\d+\b\)?/g;
export const plain = (message) => String(message ?? "")
  .replace(ISO, (whole, y, m, d) => (readDate(whole) ? displayDate(`${y}-${m}-${d}`) : whole))
  .replace(IDS, "").replace(/\s+([.,:;])/g, "$1").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();

export function peopleIndex(users) {
  const index = new Map();
  for (const u of users) for (const k of [u.id, u.employeeCode, u.email]) if (k) index.set(lower(k), u);
  return index;
}

export function readAmount(text) {
  const s = String(text ?? "").replace(/₹|rs\.?|inr/gi, "").replace(/[\s,]/g, "");
  return /^\d+(\.\d+)?$/.test(s) ? s : null;
}

export function readDays(text) {
  const s = String(text ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n * 2) && n <= 365 ? n : null;
}

// "1 Dec 2026" for a stored "YYYY-MM-DD" (or "" for none)
export const dayText = (iso) => (iso ? displayDate(iso) : "");