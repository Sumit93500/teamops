// data/asset-rules.js (AS1, 2026-11-22): the rules of the stock ledger (data/stock-ledger.js) and the fixed-asset register
// (data/asset-register.js), as lists and pure functions: the kinds of stock movement, the asset categories and their company depreciation
// defaults, the lifecycle (which state may follow which), and the checks every write makes on text, money, quantities, dates, emails,
// phones and GSTINs. Nothing here reads storage, people or the clock.
//
// Reused from the old site's inventory (data/inventory.js, unchanged): the item categories (IT equipment, furniture, stationery, pantry)
// and the conditions (good, fair, poor). Its ledger's idea is kept too: stock is never stored, only movements, which are only ever added.

import { CATEGORIES, CONDITIONS } from "./inventory.js";
import { METHODS, MAX_RUPEES, MAX_LIFE, toPaise, rupees, dayNo } from "./depreciation.js";

export { CATEGORIES as STOCK_CATEGORIES, CONDITIONS, METHODS };

// ---------- the stock ledger ----------
// Each kind's sign: in (received) and return (handed back by a person) add; out (issued) and remove (written off) take away.
export const STOCK_KINDS = {
  in:     { label: "Stock in", sign: 1 },
  out:    { label: "Issued", sign: -1 },
  return: { label: "Returned", sign: 1 },
  remove: { label: "Written off", sign: -1 },
};
export const STOCK_KIND_KEYS = Object.keys(STOCK_KINDS);
// A correction is the opposite movement: a wrong stock-in is written off, a wrong issue is returned by the same person, and so on.
export const REVERSE_KIND = { in: "remove", out: "return", return: "out", remove: "in" };
export const MAX_QTY = 1000000;
export const REASON_MIN = 3, REASON_MAX = 200;

// A quantity (a number or a numeric string): more than 0, at most MAX_QTY, at most 2 decimals (1.5 kg) -> hundredths as a whole number, or null.
export function qtyHundredths(value) {
  const p = toPaise(value);
  if (p === null || p === 0n || p > BigInt(MAX_QTY) * 100n) return null;
  return Number(p);
}

// ---------- fixed assets ----------
// The categories of fixed asset, with the company's default depreciation (Admin and Finance may change them: depreciation:configure).
// Useful lives follow Schedule II of the Companies Act, 2013 (computers and end-user devices 3 years, office equipment 5, furniture 10),
// with a 5% residual; the wdv rates are the ones that reach that residual at the end of the life (1 - 0.05^(1/life)). The Income-Tax Act's
// block rates are not built (the Finance round).
export const ASSET_CATEGORIES = {
  laptop:    { label: "Laptop",          defaults: { method: "slm", usefulLifeYears: 3,  wdvRatePercent: 63.16, salvagePercent: 5 } },
  monitor:   { label: "Monitor",         defaults: { method: "slm", usefulLifeYears: 3,  wdvRatePercent: 63.16, salvagePercent: 5 } },
  phone:     { label: "Phone",           defaults: { method: "slm", usefulLifeYears: 3,  wdvRatePercent: 63.16, salvagePercent: 5 } },
  printer:   { label: "Printer",         defaults: { method: "slm", usefulLifeYears: 5,  wdvRatePercent: 45.07, salvagePercent: 5 } },
  furniture: { label: "Furniture",       defaults: { method: "slm", usefulLifeYears: 10, wdvRatePercent: 25.89, salvagePercent: 5 } },
  other:     { label: "Other equipment", defaults: { method: "slm", usefulLifeYears: 5,  wdvRatePercent: 45.07, salvagePercent: 5 } },
};
export const ASSET_CATEGORY_KEYS = Object.keys(ASSET_CATEGORIES);

// The lifecycle. "In store" covers a new asset (purchased) and one handed back (returned); the register's history says which.
export const ASSET_STATES = {
  "in-store":          { label: "In store" },
  assigned:            { label: "Assigned" },
  "under-maintenance": { label: "Under maintenance" },
  retired:             { label: "Retired" },
  disposed:            { label: "Disposed" },
};
export const ASSET_STATE_KEYS = Object.keys(ASSET_STATES);
// Which state may follow which. Nothing else is allowed: an assigned asset is handed back before it goes for maintenance or is retired;
// only a retired asset is disposed of; a disposed asset is final.
export const TRANSITIONS = {
  "in-store":          ["assigned", "under-maintenance", "retired"],
  assigned:            ["in-store"],
  "under-maintenance": ["in-store"],
  retired:             ["disposed"],
  disposed:            [],
};
export const canMove = (from, to) => Object.hasOwn(TRANSITIONS, from) && TRANSITIONS[from].includes(to);

// Why a move isn't allowed, in words.
export function moveRefusal(tag, from, to) {
  if (canMove(from, to)) return null;
  const now = ASSET_STATES[from]?.label.toLowerCase() ?? from;
  if (to === "assigned") return `${tag} is ${now}: only an asset in the store can be issued.`;
  if (to === "disposed") return `${tag} is ${now}: retire it before disposing of it.`;
  if (to === "retired") return `${tag} is ${now}: only an asset in the store can be retired.`;
  if (to === "under-maintenance") return `${tag} is ${now}: only an asset in the store can go for maintenance.`;
  return `${tag} is ${now} and can't be moved to ${ASSET_STATES[to]?.label.toLowerCase() ?? to}.`;
}

// An asset tag: AST-0001 when made here; edited once, any 3 to 20 capital letters, digits and dashes.
export const TAG_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
export const tagOf = (n) => `AST-${String(n).padStart(4, "0")}`;
export const tagNumber = (tag) => (/^AST-(\d+)$/.exec(String(tag)) ? Number(/^AST-(\d+)$/.exec(String(tag))[1]) : null);

// ---------- checks ----------
// Text: trimmed, within its length, never HTML (no < or >). -> { value } or { error }.
export function text(value, label, { min = 0, max = 120, required = false } = {}) {
  const s = String(value ?? "").trim();
  if (!s) return required ? { error: `${label} is required.` } : { value: "" };
  if (/[<>]/.test(s)) return { error: `${label} can't contain < or >.` };
  if (s.length < min) return { error: `${label} needs at least ${min} characters.` };
  if (s.length > max) return { error: `${label} can be at most ${max} characters.` };
  return { value: s };
}

// Money: a number of rupees, 0 or more, at most 2 decimals and MAX_RUPEES. -> { value (a number) } or { error }.
export function money(value, label) {
  const p = toPaise(value);
  if (p === null) return { error: `${label}: enter an amount in rupees, 0 or more, with at most 2 decimals${Number(value) > MAX_RUPEES ? ", up to ₹10,000 crore" : ""}.` };
  return { value: rupees(p) };
}

// A percentage, 0 to 100, at most 2 decimals.
export function percent(value, label) {
  const p = toPaise(value);
  return p === null || p > 10000n ? { error: `${label}: enter a percentage from 0 to 100, with at most 2 decimals.` } : { value: rupees(p) };
}

export function lifeYears(value) {
  const n = typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
  return Number.isInteger(n) && n >= 1 && n <= MAX_LIFE ? { value: n } : { error: `Useful life: enter whole years, 1 to ${MAX_LIFE}.` };
}

// A date: "YYYY-MM-DD", real, from 1990 to 2100. latest: the last day allowed (today, for anything that has happened).
export const DATE_MIN = "1990-01-01", DATE_MAX = "2100-12-31";
export function date(value, label, { latest = DATE_MAX, earliest = DATE_MIN, required = true } = {}) {
  const s = String(value ?? "").trim();
  if (!s) return required ? { error: `${label} is required.` } : { value: null };
  if (dayNo(s) === null || s < DATE_MIN || s > DATE_MAX) return { error: `${label}: pick a valid date.` };
  if (s > latest) return { error: `${label} can't be after ${latest}.` };
  if (s < earliest) return { error: `${label} can't be before ${earliest}.` };
  return { value: s };
}

export const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// A phone: digits, spaces, dashes and a leading +, with 10 to 15 digits.
export const PHONE = /^\+?[0-9][0-9 -]{8,18}[0-9]$/;
export const phoneOk = (s) => PHONE.test(s) && s.replace(/\D/g, "").length >= 10 && s.replace(/\D/g, "").length <= 15;
// A GSTIN's format: the state code (01-38, or 97 / 99), the holder's PAN, the entity number, Z, a check character. The check character
// itself isn't verified (the backend will verify GSTINs).
export const GSTIN = /^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// The condition at issue or return: one of CONDITIONS.
export const conditionOk = (c) => Object.hasOwn(CONDITIONS, String(c ?? ""));