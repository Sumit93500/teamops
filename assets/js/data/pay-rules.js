// data/pay-rules.js
// P1: the statutory pay rules as a DATED TABLE (data only; nothing on screen reads it yet, and data/payroll.js, the
// payslips, the payroll runs and the tax page compute exactly as before).
//
// NOT TAX OR LEGAL ADVICE. Every rate here is a demo value from the scoping note (the workspace's
// notes/payroll-rules-scoping.md) and must be checked by a Chartered Accountant before any real use: verifyRule().
//
// A row:
//   id             "<key>@<scope>@<effectiveFrom>"
//   key            the rule: "pf", "esi", "pt", "lwf", "wages.addback", "tax.new" ... (PAY_RULE_KEYS)
//   scope          "all" (the whole country) or a state's name as offices have it ("Haryana"; offices-store.js OFFICE_STATES)
//   effectiveFrom  "YYYY-MM-DD": the rule in force on a date is the newest row on or before it
//   employeeRate, employerRate   shares of the wage base (0.12 = 12%), or null
//   value          ceilings, slabs and anything else the rule needs; null = no number is known (an EMPTY row: the
//                  calculation gives 0 and says so)
//   source         the page the number came from
//   confidence     "confirmed"  read on an official page or PDF
//                  "secondary"  from an official page's search extract; the page itself wasn't opened
//                  "unverified" not confirmed, a commonly used value, or empty
//   note           what isn't known about the row
//   verifiedBy, verifiedByName, verifiedOn   who marked the row verified and when (null until then)
//
// A RATE CHANGE IS A NEW ROW, NOT A CODE CHANGE: addRule() saves a row with a later effectiveFrom (or a correction with
// the same date: the row added last wins); rows are never edited or deleted, so every past month keeps its rule.
//
// Saved under "officeos:pay-rules" as { version, added: [rows], verified: { "<row id>": { by, name, on } },
// settings: { pfOnFullWages }, audit: [{ at, on, by, name, action, ruleId, detail }] }. The seed rows live here in
// code and are never saved; reads never write (data/places.js pureBox).
//
// Who: PAY_RULE_PERMISSIONS ("payroll-rules:verify"), held by the Admin only (PAY_RULE_GRANTS). It is kept here, apart
// from config/permissions.js, until the page round: adding it there now would change the role pages' counts (86 -> 87),
// and this round changes nothing on screen (the same way round 14 kept its seven apart until L0).
//
//   allRules()                         every row, seed then added, with its verification
//   ruleOn(ruleKey, date, scope)       the row in force on that date for that scope (default "all"), or null
//   ruleHistory(ruleKey, scope)        that rule's rows, oldest first
//   ruleStatus(row)                    "verified" | "confirmed" | "secondary" | "unverified"
//   isUnverified(row)                  confidence "unverified" and nobody verified it: pages show "unverified rates"
//   unverifiedRules()                  those rows          readyForRealUse() -> { ok, waiting: [rows not verified] }
//   verifyRule(actorUserId, ruleId, today?)     -> { ok, record } | { ok: false, error }
//   addRule(actorUserId, fields, today?)        -> { ok, record } | { ok: false, error, field }
//   payRuleSettings()                  { pfOnFullWages }   setPfOnFullWages(actorUserId, on, today?)
//   payRuleAudit()                     the audit entries, oldest first
//   holdsPayRulePermission(user, permission)    resetPayRules()

import { remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { ROLE_KEYS } from "../config/roles.js";
import { OFFICE_STATES } from "./offices-store.js";
import { pureBox } from "./places.js";

const KEY = "pay-rules";

// ---------- who ----------
export const PAY_RULE_PERMISSIONS = ["payroll-rules:verify"];
export const PAY_RULE_GRANTS = Object.fromEntries(ROLE_KEYS.map((k) => [k, k === "admin" ? [...PAY_RULE_PERMISSIONS] : []]));
// Whether this person (a user record) holds one of this module's permissions: by role only (not overridable).
export function holdsPayRulePermission(user, permission) {
  return Boolean(user) && Object.hasOwn(PAY_RULE_GRANTS, user.role) && PAY_RULE_GRANTS[user.role].includes(permission);
}
const NOT_ALLOWED = "Only an Admin can verify or change pay rules.";

// ---------- the seed ----------
export const CONFIDENCE = ["confirmed", "secondary", "unverified"];
export const ALL = "all";
// Rows whose start date isn't known carry this date: in force for every date the app can show.
export const START_UNKNOWN = "2000-01-01";
const SRC = {
  codesFaq: "https://www.labour.gov.in/static/uploads/2026/01/de4758d5bfeffc456d7de97a801891b0.pdf",
  pfCeiling: "https://www.labour.gov.in/static/uploads/2026/09/4f607a88c5342aeb980c6b999997caab.pdf",
  pfBooklet: "https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/Employer_Information_Booklet.pdf",
  esi: "https://esic.gov.in/contribution",
  ptMaharashtra: "https://www.mahagst.gov.in/en/profession-tax-and-other-rate-schedule",
  ptKarnataka: "https://ptax.karnataka.gov.in/Home",
  ptWestBengal: "https://wbprofessiontax.gov.in/professiontax_adm/writereaddata/upload/schedules/2016-08-22-161823Ptax-Schedule-New_(w.e.f._1-4-2014).pdf",
  ptTamilNadu: "https://chennaicorporation.gov.in/gcc/department/revenue/",
  lwfHaryana: "https://hrylabour.gov.in/content/cms/MTU",
  lwfTamilNadu: "https://www.lwb.tn.gov.in/about.php",
  lwfKarnataka: "https://www.indiacode.nic.in/bitstream/123456789/7601/1/15_of_1965_(e).pdf",
  lwfMaharashtra: "https://www.indiacode.nic.in/bitstream/123456789/19974/1/the_maharashtra_labour_welfare_fund_act..pdf",
  taxSlabs: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406",
  taxAct: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2221416",
  taxRates: "https://www.incometaxindia.gov.in/w/tds-rates",
  hra: "https://wm.incometaxindia.gov.in/w/what-is-the-taxability-of-house-rent-allowance-hra-",
  gratuity: "https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf",
};
const idOf = (key, scope, effectiveFrom) => `${key}@${scope}@${effectiveFrom}`;
const row = (key, scope, effectiveFrom, confidence, source, fields = {}) =>
  ({ id: idOf(key, scope, effectiveFrom), key, scope, effectiveFrom, employeeRate: null, employerRate: null, value: null, source, confidence, note: "", ...fields });

const PT_STATES_WITH_ROWS = ["Maharashtra", "Karnataka", "West Bengal", "Tamil Nadu", "Haryana"];
const LWF_STATES_WITH_ROWS = ["Haryana", "Tamil Nadu", "Karnataka", "Maharashtra"];
const EMPTY_NOTE = "Not researched: no number is known. The calculation gives 0 until an Admin adds a row.";

const SEED = [
  // ----- wages (Code on Wages) -----
  row("wages.addback", ALL, "2025-11-21", "secondary", SRC.codesFaq, {
    value: { allowanceShare: 0.5 },
    note: "Wages are basic + DA + retaining allowance; other allowances above 50% of total pay are added back. Before this date there is no add-back (no row).",
  }),

  // ----- provident fund -----
  row("pf", ALL, "2014-09-01", "secondary", SRC.pfBooklet, {
    employeeRate: 0.12, employerRate: 0.12, value: { wageCeiling: 15000, epsRate: 0.0833 },
    note: "The ceiling before 17 Sep 2026. Its own start date (1 Sep 2014) is not from the scoping note: check it. The employer's 12% splits into EPS 8.33% (on wages up to the ceiling) and EPF, the rest.",
  }),
  row("pf", ALL, "2026-09-17", "secondary", SRC.pfCeiling, {
    employeeRate: 0.12, employerRate: 0.12, value: { wageCeiling: 25000, epsRate: 0.0833 },
    note: "Wage ceiling 25,000 a month from 17 Sep 2026 (EPS at most 2,083). A month uses the rule in force on its last day, so September 2026 is computed on 25,000: check how EPFO treats the part-month.",
  }),
  row("pf.edli", ALL, "2014-09-01", "secondary", SRC.pfBooklet, {
    employerRate: 0.005, value: { onCeiling: true },
    note: "Employer only. Taken on wages up to the PF ceiling; the base and the start date are not confirmed.",
  }),
  row("pf.admin", ALL, "2014-09-01", "unverified", SRC.pfBooklet, {
    employerRate: 0.005, value: { onCeiling: false, minimum: null },
    note: "Employer only. EPFO pages conflict on the current rate, on a minimum and on EDLI admin charges; no minimum is applied.",
  }),

  // ----- ESI -----
  row("esi", ALL, "2019-07-01", "confirmed", SRC.esi, {
    employeeRate: 0.0075, employerRate: 0.0325,
    note: "Rates from 1 Jul 2019. The contribution-period rule (someone who crosses the ceiling mid-period stays covered to its end) is not confirmed and not applied.",
  }),
  row("esi.ceiling", ALL, "2019-07-01", "secondary", SRC.esi, {
    value: { wageCeiling: 21000 },
    note: "Coverage up to 21,000 a month, from a regional ESIC page; its start date and whether the Code on Social Security changed it are not confirmed.",
  }),
  row("esi.exempt", ALL, "2019-07-01", "confirmed", SRC.esi, {
    value: { dailyWageUpTo: 176 },
    note: "At a daily average wage up to 176 the employee's share is not deducted; the employer still pays.",
  }),

  // ----- professional tax, by state -----
  row("pt", "Maharashtra", "2023-04-01", "confirmed", SRC.ptMaharashtra, {
    value: { period: "monthly", slabs: [{ upTo: 7500, amount: 0 }, { upTo: 10000, amount: 175 }, { upTo: null, amount: 200, february: 300 }] },
    note: "The schedule for men, applied to everyone: the women's slab (nil up to 25,000) is not applied (ruled: no gender rule now). 2,500 a year: 200 a month and 300 in February.",
  }),
  row("pt", "Karnataka", START_UNKNOWN, "secondary", SRC.ptKarnataka, {
    value: { period: "monthly", slabs: [{ upTo: 24999, amount: 0 }, { upTo: null, amount: 200 }] },
    note: "200 a month from 25,000 a month, as the schedule read on the site says. A 2026 amendment act exists and its effect was not read; the start date is not known.",
  }),
  row("pt", "West Bengal", "2014-04-01", "secondary", SRC.ptWestBengal, {
    value: { period: "monthly", slabs: [{ upTo: 10000, amount: 0 }, { upTo: 15000, amount: 110 }, { upTo: 25000, amount: 130 }, { upTo: 40000, amount: 150 }, { upTo: null, amount: 200 }] },
  }),
  row("pt", "Tamil Nadu", "2024-04-01", "unverified", SRC.ptTamilNadu, {
    value: { period: "half-yearly", months: [9, 3], slabs: [{ upTo: 21000, amount: 0 }, { upTo: 30000, amount: 180 }, { upTo: null, amount: null }] },
    note: "Partial: Chennai's 2024-25 schedule only (half-yearly income; local bodies differ). The slabs above 30,000 were not read: the amount there is not known and is computed as 0. The months it is deducted in (September and March) are an assumption.",
  }),
  row("pt", "Haryana", START_UNKNOWN, "unverified", "", {
    value: { period: "monthly", slabs: [{ upTo: null, amount: 0 }] },
    note: "No professional-tax schedule was found for Haryana; whether it is levied at all is not confirmed. Ruled: 0, flagged unverified.",
  }),
  ...OFFICE_STATES.filter((s) => !PT_STATES_WITH_ROWS.includes(s)).map((s) => row("pt", s, START_UNKNOWN, "unverified", "", { note: EMPTY_NOTE })),

  // ----- labour welfare fund, by state -----
  row("lwf", "Haryana", "2025-01-01", "confirmed", SRC.lwfHaryana, {
    employeeRate: 0.002, value: { period: "monthly", employeeCap: 34, employerMultiple: 2 },
    note: "0.2% of wages, at most 34 a month; the employer pays twice the employee's.",
  }),
  row("lwf", "Haryana", "2026-01-01", "confirmed", SRC.lwfHaryana, {
    employeeRate: 0.002, value: { period: "monthly", employeeCap: 35, employerMultiple: 2 },
    note: "0.2% of wages, at most 35 a month from January 2026; the employer pays twice the employee's.",
  }),
  row("lwf", "Tamil Nadu", "2022-01-01", "unverified", SRC.lwfTamilNadu, {
    value: { period: "yearly", months: [12], employeeAmount: 20, employerAmount: 40 },
    note: "20 + 40 a year (G.O. 161, 2022), from a search extract. The month it is deducted in (December) and the start date are assumptions.",
  }),
  row("lwf", "Karnataka", "2025-01-01", "unverified", SRC.lwfKarnataka, {
    value: { period: "yearly", months: [12], employeeAmount: 50, employerAmount: 100 },
    note: "50 + 100 a year, from a fragment of the 2025 amendment. The month (December) and the start date are assumptions.",
  }),
  row("lwf", "Maharashtra", START_UNKNOWN, "unverified", SRC.lwfMaharashtra, {
    value: { period: "half-yearly", months: [6, 12], employeeAmount: 25, employerMultiple: 3 },
    note: "The Act's base amount (25, the employer three times that), half-yearly; it may have been raised by a later government order. The months (June and December) are an assumption.",
  }),
  ...OFFICE_STATES.filter((s) => !LWF_STATES_WITH_ROWS.includes(s)).map((s) => row("lwf", s, START_UNKNOWN, "unverified", "", { note: EMPTY_NOTE })),

  // ----- gratuity (employer accrual only) -----
  row("gratuity", ALL, "2025-11-21", "unverified", SRC.gratuity, {
    employerRate: 15 / 26 / 12, value: { daysPerYear: 15, monthDays: 26, ceiling: 2000000 },
    note: "The formula and the ceiling were not confirmed: the commonly used 15 days' wages for each year of service (a 26-day month), accrued monthly as wages x 15 / 26 / 12. Employer cost only; never a payslip deduction. Eligibility (5 years; 1 year fixed-term) is not applied to the accrual.",
  }),

  // ----- income tax on salary -----
  row("tax.section", ALL, START_UNKNOWN, "secondary", SRC.taxAct, { value: { act: "Income-tax Act, 1961", salaryTds: "192" } }),
  row("tax.section", ALL, "2026-04-01", "secondary", SRC.taxAct, { value: { act: "Income-tax Act, 2025", salaryTds: "392" }, note: "The new Act applies from 1 Apr 2026: salary TDS is section 392 (was 192)." }),
  row("tax.new", ALL, "2025-04-01", "secondary", SRC.taxSlabs, {
    value: {
      standardDeduction: 75000, rebate: { upTo: 1200000, max: 60000 }, marginalRelief: true,
      slabs: [{ upTo: 400000, rate: 0 }, { upTo: 800000, rate: 0.05 }, { upTo: 1200000, rate: 0.10 }, { upTo: 1600000, rate: 0.15 }, { upTo: 2000000, rate: 0.20 }, { upTo: 2400000, rate: 0.25 }, { upTo: null, rate: 0.30 }],
    },
    note: "The new regime (the default). That the same slabs continue for tax year 2026-27 isn't stated explicitly on the pages read.",
  }),
  row("tax.old", ALL, "2025-04-01", "unverified", SRC.taxRates, {
    value: {
      standardDeduction: 50000, rebate: { upTo: 500000, max: 12500 }, marginalRelief: false, investmentsCap: 150000,
      slabs: [{ upTo: 250000, rate: 0 }, { upTo: 500000, rate: 0.05 }, { upTo: 1000000, rate: 0.20 }, { upTo: null, rate: 0.30 }],
    },
    note: "NOT CONFIRMED: the official rates page refused automated reads. Commonly used old-regime values (under 60 years of age; 1,50,000 as the cap on 80C-type investments), shipped by ruling and flagged unverified.",
  }),
  row("tax.cess", ALL, "2025-04-01", "unverified", SRC.taxRates, {
    value: { rate: 0.04 },
    note: "NOT CONFIRMED: health and education cess, the commonly used 4% of the tax, shipped by ruling and flagged unverified.",
  }),
  row("tax.surcharge", ALL, START_UNKNOWN, "unverified", SRC.taxRates, { note: "NOT CONFIRMED: no number is known. No surcharge is computed." }),
  row("tax.hra", ALL, START_UNKNOWN, "secondary", SRC.hra, {
    value: { metroShare: 0.5, otherShare: 0.4, metros: ["Mumbai", "Kolkata", "Delhi", "Chennai"], rentLessShareOfSalary: 0.1 },
    note: "Old regime only: the least of the HRA received, rent paid less 10% of salary (basic + DA), and 50% of salary in the four metros or 40% elsewhere (Gurugram: 40%). A 2026 page lists 8 cities at 50% for another allowance; whether HRA follows is not known.",
  }),
  row("tax.allowances", ALL, START_UNKNOWN, "unverified", SRC.hra, {
    value: { medical: "taxable", lta: "taxable", conveyance: "taxable" },
    note: "NOT CONFIRMED: the treatment of medical allowance, LTA and conveyance. All are taken as fully taxable until a Chartered Accountant confirms.",
  }),
].map((r) => Object.freeze(r));

export const PAY_RULE_KEYS = [...new Set(SEED.map((r) => r.key))];

// ---------- storage ----------
const seed = () => ({ added: [], verified: {}, settings: { pfOnFullWages: false }, audit: [] });
const store = pureBox(KEY, 1, seed, (b) => Array.isArray(b.added) && b.verified && typeof b.verified === "object" && b.settings && typeof b.settings === "object" && Array.isArray(b.audit));
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });

// ---------- reads ----------
const withVerification = (r, box) => {
  const v = box.verified[r.id];
  return { ...copy(r), verifiedBy: v?.by ?? null, verifiedByName: v?.name ?? null, verifiedOn: v?.on ?? null };
};
export function allRules() {
  const box = store.read();
  return [...SEED, ...box.added].map((r) => withVerification(r, box));
}
const isIso = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

// The row in force on `date` for (ruleKey, scope): the newest effectiveFrom on or before the date; of two rows with the
// same date, the one added last. null when there is none (the rule wasn't in force yet, or the key / scope is unknown).
export function ruleOn(ruleKey, date, scope = ALL) {
  if (!isIso(date)) return null;
  const box = store.read();
  let best = null;
  for (const r of [...SEED, ...box.added]) {
    if (r.key !== ruleKey || r.scope !== scope || r.effectiveFrom > date) continue;
    if (!best || r.effectiveFrom >= best.effectiveFrom) best = r;
  }
  return best ? withVerification(best, box) : null;
}
export function ruleHistory(ruleKey, scope = ALL) {
  return allRules().filter((r) => r.key === ruleKey && r.scope === scope)
    .map((r, i) => [r, i]).sort((a, b) => (a[0].effectiveFrom < b[0].effectiveFrom ? -1 : a[0].effectiveFrom > b[0].effectiveFrom ? 1 : a[1] - b[1])).map(([r]) => r);
}
export const ruleStatus = (r) => (r?.verifiedBy ? "verified" : r?.confidence ?? "unverified");
export const isUnverified = (r) => Boolean(r) && !r.verifiedBy && r.confidence === "unverified";
export const unverifiedRules = () => allRules().filter(isUnverified);
// Real use needs every row verified by an Admin, whatever its confidence.
export function readyForRealUse() {
  const waiting = allRules().filter((r) => !r.verifiedBy);
  return { ok: waiting.length === 0, waiting };
}
export const payRuleSettings = () => ({ pfOnFullWages: store.read().settings.pfOnFullWages === true });
export const payRuleAudit = () => copy(store.read().audit);

// ---------- writes ----------
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const admin = (actorUserId) => {
  const actor = actorUserId ? getUser(actorUserId) : null;
  return actor && actor.status !== "inactive" && holdsPayRulePermission(actor, "payroll-rules:verify") ? actor : null;
};
const entry = (actor, action, ruleId, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ruleId, detail });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";

// Marks one row verified: the Admin's id, name and the date, per row. Verifying again replaces who and when.
export function verifyRule(actorUserId, ruleId, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!isIso(today)) return fail("The date must be a real date, as YYYY-MM-DD.", "today");
  const box = store.read();
  const found = [...SEED, ...box.added].find((r) => r.id === ruleId);
  if (!found) return fail(`No pay rule with id ${ruleId}.`, "ruleId");
  box.verified[ruleId] = { by: actor.id, name: actor.name, on: today };
  box.audit.push(entry(actor, "verify", ruleId, "", today));
  return store.write(box) ? { ok: true, record: withVerification(found, box) } : fail(SAVE_FAILED);
}

const isRate = (v) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1);
// A new row (a rate change, a state's first numbers, or a correction). It starts unverified by anyone: verifyRule() is
// a separate step. fields: { key, scope, effectiveFrom, employeeRate?, employerRate?, value?, source, confidence?, note? }
export function addRule(actorUserId, fields = {}, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (!fields || typeof fields !== "object") return fail("Give the rule's fields.");
  const extra = Object.keys(fields).find((k) => !["key", "scope", "effectiveFrom", "employeeRate", "employerRate", "value", "source", "confidence", "note"].includes(k));
  if (extra) return fail(`"${extra}" can't be set on a pay rule.`, extra);
  if (!PAY_RULE_KEYS.includes(fields.key)) return fail("Choose one of the known rules.", "key");
  const scope = fields.scope ?? ALL;
  if (scope !== ALL && !OFFICE_STATES.includes(scope)) return fail("The scope is \"all\" or a state's name.", "scope");
  if (!isIso(fields.effectiveFrom)) return fail("Effective from must be a real date, as YYYY-MM-DD.", "effectiveFrom");
  const employeeRate = fields.employeeRate ?? null, employerRate = fields.employerRate ?? null;
  if (!isRate(employeeRate)) return fail("The employee rate is a share from 0 to 1 (0.12 is 12%).", "employeeRate");
  if (!isRate(employerRate)) return fail("The employer rate is a share from 0 to 1 (0.12 is 12%).", "employerRate");
  const value = fields.value ?? null;
  if (value !== null && (typeof value !== "object" || Array.isArray(value))) return fail("The value holds the rule's ceilings or slabs, or nothing.", "value");
  const source = typeof fields.source === "string" ? fields.source.trim() : "";
  if (!source) return fail("Give the source: the page the number came from.", "source");
  const confidence = fields.confidence ?? "unverified";
  if (!CONFIDENCE.includes(confidence)) return fail("Confidence is confirmed, secondary or unverified.", "confidence");
  const box = store.read();
  const n = [...SEED, ...box.added].filter((r) => r.key === fields.key && r.scope === scope && r.effectiveFrom === fields.effectiveFrom).length;
  const record = { id: `${idOf(fields.key, scope, fields.effectiveFrom)}${n ? `#${n + 1}` : ""}`, key: fields.key, scope, effectiveFrom: fields.effectiveFrom,
    employeeRate, employerRate, value: copy(value), source, confidence, note: typeof fields.note === "string" ? fields.note.trim() : "", addedBy: actor.id, addedOn: today };
  box.added.push(record);
  box.audit.push(entry(actor, "add", record.id, "", today));
  return store.write(box) ? { ok: true, record: withVerification(record, box) } : fail(SAVE_FAILED);
}

// The company switch: PF on full wages instead of wages capped at the ceiling (the default, the statutory minimum).
export function setPfOnFullWages(actorUserId, on, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(NOT_ALLOWED);
  if (typeof on !== "boolean") return fail("Choose on or off.", "on");
  const box = store.read();
  box.settings.pfOnFullWages = on;
  box.audit.push(entry(actor, "pf-on-full-wages", null, on ? "on" : "off", today));
  return store.write(box) ? { ok: true, record: { pfOnFullWages: on } } : fail(SAVE_FAILED);
}

export function resetPayRules() {
  remove(KEY);
}