// data/import-licences.js (I2, 2026-11-28): the licences import form, for it:licences-manage's people (IT; the Admin) holding
// import:licences. Create only: one row per licence (software), saved by data/licences.js addLicence, so its rules hold: the software
// (2 to 80 characters; not one that already has an active licence, nor twice in the file), the vendor (an active one, optional), the seats
// (1 to 100,000), the cost per year (optional; IT may type it from the invoice, as on the Add licence dialog, though only Finance and the
// Admin read it back), the renewal date. Seats are given to people on the Licences page afterwards, never from a file.
// Good rows; the history keeps a generic file name.
import { licencesFor, addLicence } from "./licences.js";
import { vendorsFor } from "./asset-register.js";
import { money } from "./asset-rules.js";
import { readDate, lower, ok, bad, plain, readAmount, officeToday } from "./import-common.js";

function context(actor, now = Date.now()) {
  return {
    actor, today: officeToday(now),
    vendors: vendorsFor(actor.id).filter((x) => x.active),
    active: new Map(licencesFor(actor.id).filter((l) => l.status === "active").map((l) => [lower(l.software), l.software])),
  };
}

const COLUMNS = [
  { key: "software", header: "Software", required: true, help: "2 to 80 characters; not one with an active licence already.",
    validate: (v) => (v.length < 2 || v.length > 80 ? bad("use 2 to 80 characters", "length") : /[<>]/.test(v) ? bad("can't contain < or >", "characters") : ok(v)) },
  { key: "vendor", header: "Vendor", required: false, help: "Optional: an active vendor's name.",
    validate: (v, ctx) => { const x = ctx.vendors.find((y) => lower(y.name) === lower(v)); return x ? ok(x.id) : bad(`no active vendor called "${v}"`, "unknown vendor"); } },
  { key: "seats", header: "Seats", required: true, help: "1 to 100,000.",
    validate: (v) => { const s = v.replace(/,/g, ""); return /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 100000 ? ok(Number(s)) : bad("a whole number from 1 to 100,000", "not a number"); } },
  { key: "cost", header: "Cost per year", required: false, help: "Optional, in rupees, like 129600.",
    validate: (v) => { const a = readAmount(v); const m = a === null ? null : money(a, "Cost per year"); return !m || m.error ? bad("an amount in rupees, like 129600 (at most 2 decimals)", "not an amount") : ok(m.value); } },
  { key: "renewal", header: "Renewal date", required: true, help: "Like 2027-01-31 (or 31-01-2027, day first).",
    validate: (v) => { const d = readDate(v); return d && d >= "1990-01-01" && d <= "2100-12-31" ? ok(d) : bad("not a date: write it like 2027-01-31", "not a date"); } },
];

function applyRow(actor, v, ctx, now) {
  const fields = { software: v.software, vendorId: v.vendor ?? "", seats: v.seats, renewalDate: v.renewal, ...(v.cost != null ? { costPerYear: v.cost } : {}) };
  const r = addLicence(actor.id, fields, now);
  return r.ok ? { ok: true, record: { id: r.record.id, name: r.record.software, seats: r.record.seats } } : { ok: false, error: plain(r.error) };
}

function checkRow(v, ctx) {
  if (v.renewal < ctx.today) return { column: "Renewal date", message: "already past: give the next renewal date", reason: "past renewal" };
  return null;
}

const example = (ctx) => ({ software: "Adobe Acrobat Pro", vendor: ctx.vendors[0]?.name ?? "", seats: "15", cost: "", renewal: `${Number(ctx.today.slice(0, 4)) + 1}${ctx.today.slice(4)}` });

function notes(ctx, actor, cols) {
  return [
    "Delete the EXAMPLE row and these notes, or leave them: they are never imported.",
    `Required: ${cols.filter((c) => c.required).map((c) => c.header).join(", ")}.`,
    `Vendors (optional): ${ctx.vendors.map((x) => x.name).join(", ") || "none yet"}.`,
    `Software with an active licence already (not imported again): ${[...ctx.active.values()].join(", ") || "none"}.`,
    "Renewal date: YYYY-MM-DD, like 2027-01-31; today or later.",
    "Each row is a new licence with no seat given yet: give seats to people on the Licences page.",
    "At most 1,000 rows and 2 MB per file. Save as CSV UTF-8 or .xlsx.",
  ];
}

export const LICENCES_FORM = Object.freeze({
  id: "licences", label: "Licences", permission: "import:licences", mode: "good-rows", maxRows: 1000, genericName: true,
  columns: COLUMNS, unique: [{ key: "software", existing: (ctx) => ctx.active, onRecord: () => "already has an active licence" }],
  maySensitive: () => false, context, checkRow, applyRow, example, notes,
});