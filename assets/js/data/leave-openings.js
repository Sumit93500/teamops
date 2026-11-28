// data/leave-openings.js (I2, 2026-11-28): leave balances brought in from a file (data/import-leave.js, import:leave-balances: HR, the Admin).
// Balances are still worked out, never stored (data/leave-policy.js leaveAccount): what is stored here is the one difference that makes the
// worked-out balance equal the file's on its date. A row says "on 15 Nov 2026 Asha had 7.5 earned days left"; the import stores that and
// the adjustment (7.5 less what the app worked out for her that day). leave-policy.js account() adds the adjustment to what is available
// and usable on that date and after, in that calendar year only; before the date, and in any other year, nothing changes. From there the
// balance counts on by the policy as before (accrual, leave taken, the year's close).
//   "officeos:leave-openings" { version: 1, next, rows: [{ id "LO-n", userId, type casual | sick | earned, year, asOf, balance, adjust,
//                               byId, at }] }   one row per person, type and year (a second is refused by the import)
//   openingAdjust(userId, type, date)   the days to add on that date (0 when nothing was imported): read by leave-policy.js
//   openingKeys()                       "userId|type|year" of every row (the import's duplicate check)
//   openingsFor(userId)                 the person's rows (for the screens and the tests)
//   addOpening(fields, now)             the import's writer (the permission and the checks are the form's)
//   resetLeaveOpenings()
// Reads never write. Nothing here is personal beyond the person's id and the days.
import { load, save, remove } from "../core/storage.js";

const KEY = "leave-openings";
export const OPENING_TYPES = ["casual", "sick", "earned"];
const empty = () => ({ version: 1, next: 1, rows: [] });
const read = () => { const b = load(KEY); return b && b.version === 1 && Array.isArray(b.rows) && Number.isInteger(b.next) ? b : empty(); };
const copy = (v) => JSON.parse(JSON.stringify(v));

export function openingAdjust(userId, type, date) {
  const b = load(KEY);
  if (!b || !Array.isArray(b.rows) || !b.rows.length) return 0;
  const year = String(date ?? "").slice(0, 4);
  return b.rows.filter((r) => r.userId === userId && r.type === type && r.year === year && r.asOf <= date).reduce((s, r) => s + r.adjust, 0);
}

export const openingKeys = () => new Set(read().rows.map((r) => `${r.userId}|${r.type}|${r.year}`));
export const openingsFor = (userId) => copy(read().rows.filter((r) => r.userId === userId));

export function addOpening({ userId, type, asOf, balance, adjust, byId }, now = Date.now()) {
  if (!OPENING_TYPES.includes(type)) return { ok: false, error: "Choose casual, sick or earned leave." };
  const b = read();
  const year = String(asOf).slice(0, 4);
  if (b.rows.some((r) => r.userId === userId && r.type === type && r.year === year)) return { ok: false, error: "A balance of this type is already imported for this person and year." };
  const row = { id: `LO-${b.next}`, userId, type, year, asOf, balance, adjust, byId, at: new Date(now).toISOString() };
  b.rows.push(row);
  b.next += 1;
  return save(KEY, b) ? { ok: true, record: copy(row) } : { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
}

export function resetLeaveOpenings() { remove(KEY); }