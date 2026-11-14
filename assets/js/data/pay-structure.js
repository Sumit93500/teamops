// data/pay-structure.js
// P2: salary structure templates, each person's structure, their tax regime for a tax year and their old-regime
// declaration (data only; no screen reads these yet, and data/payroll.js still splits every payslip its own way).
//
// NOT TAX OR LEGAL ADVICE: demo values, to be checked by a Chartered Accountant (see data/pay-rules.js).
//
// A template: { id, name, kind "employee" | "intern", components: [{ key, name, calc, value, wagesPart, optional }] }
//   calc   "pctOfGross" (value 0.5 = 50% of the gross), "pctOfBasic", "fixed" (rupees a month), "remainder" (what is
//          left: the balancing component; exactly one, last)
//   wagesPart   counts as wages (basic, DA, retaining allowance) for PF and gratuity
//   optional    left out unless the person's structure switches it on (LTA)
// Seed:
//   standard   Basic 50% of gross (ruled; was 40%), HRA 50% of basic, Medical allowance 1,250, Conveyance 1,600,
//              LTA 8.33% of basic (optional), Special allowance (the balancing component)
//   intern     Intern stipend: one line, the whole amount; kind "intern" = no PF, no ESI, no gratuity (ruled)
// A person's template is the one assigned to them, else by their employment type (data/employment.js): an intern gets
// "intern", everyone else "standard". An intern put on "standard" is paid under the normal rules (the template decides).
//
// Saved under "officeos:pay-structures" as { version, templates: { "<id>": { "<component key>": { value } } } (the
// Admin's changes to the seed), people: { "<employee id>": { templateId, lta } }, regimes: { "<employee id>":
// { "<tax year>": "old" } }, declarations: { "<employee id>": { "<tax year>": { rentMonthly, metro, investments, other,
// declaredOn, recordedBy } } }, audit: [...] }. Reads never write.
//
// Who: a template's component rules: the Admin (data/pay-rules.js "payroll-rules:verify"). A person's structure, regime
// and declaration: whoever holds salary:edit on record (Admin, Finance).
//
//   payTemplates()  payTemplate(id)                           the templates with the Admin's changes applied
//   componentsFor(template, gross, { lta })                   -> { lines: [{ key, name, amount, wagesPart }], basic, hra, wages, total }
//   updateTemplateComponent(actorUserId, templateId, key, value, today?)
//   structureOf(userId)                                       -> { templateId, lta, assigned }
//   setStructure(actorUserId, userId, { templateId, lta }, today?)
//   taxYearOf(year, month) -> { label "2026-27", start 2026, startDate "2026-04-01" }
//   regimeOf(userId, taxYear)                                 "new" (the default) | "old"
//   declarationOf(userId, taxYear)                            the declaration on file, or null
//   declareOldRegime(actorUserId, userId, taxYear, declaration, today?)    the old regime, by declaration only
//   chooseNewRegime(actorUserId, userId, taxYear, today?)
//   payStructureAudit()                                       resetPayStructures()

import { remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { permissionsOf } from "../config/roles.js";
import { pureBox } from "./places.js";
import { holdsPayRulePermission } from "./pay-rules.js";
import { employmentOf } from "./employment.js";
import { rupees } from "./statutory.js";

const KEY = "pay-structures";
export const CALCS = ["pctOfGross", "pctOfBasic", "fixed", "remainder"];
const line = (key, name, calc, value, more = {}) => Object.freeze({ key, name, calc, value, wagesPart: false, optional: false, ...more });
const TEMPLATES = Object.freeze([
  Object.freeze({
    id: "standard", name: "Standard", kind: "employee",
    components: Object.freeze([
      line("basic", "Basic salary", "pctOfGross", 0.5, { wagesPart: true }),
      line("hra", "House rent allowance", "pctOfBasic", 0.5),
      line("medical", "Medical allowance", "fixed", 1250),
      line("conveyance", "Conveyance allowance", "fixed", 1600),
      line("lta", "Leave travel allowance", "pctOfBasic", 0.0833, { optional: true }),
      line("special", "Special allowance", "remainder", null),
    ]),
  }),
  Object.freeze({
    id: "intern", name: "Intern stipend", kind: "intern",
    components: Object.freeze([line("stipend", "Stipend", "remainder", null)]),
  }),
]);
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);

const seed = () => ({ templates: {}, people: {}, regimes: {}, declarations: {}, audit: [] });
const isObj = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const store = pureBox(KEY, 1, seed, (b) => isObj(b.templates) && isObj(b.people) && isObj(b.regimes) && isObj(b.declarations) && Array.isArray(b.audit));
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";

// ---------- templates ----------
const applied = (template, box) => {
  const changes = box.templates[template.id] ?? {};
  return { ...copy(template), components: template.components.map((c) => ({ ...c, value: changes[c.key] && typeof changes[c.key].value === "number" ? changes[c.key].value : c.value })) };
};
export const payTemplates = () => { const box = store.read(); return TEMPLATES.map((t) => applied(t, box)); };
export function payTemplate(id) {
  const t = TEMPLATES.find((x) => x.id === id);
  return t ? applied(t, store.read()) : null;
}

// A gross split into the template's lines, whole rupees that always add up to the gross: each line in order takes its
// amount (never more than what is left), and the remainder line takes the rest.
export function componentsFor(template, gross, { lta = false } = {}) {
  const g = Math.max(0, Math.round(Number(gross) || 0));
  let left = g, basic = 0;
  const lines = [];
  for (const c of template?.components ?? []) {
    if (c.optional && !(c.key === "lta" && lta)) continue;
    let amount;
    if (c.calc === "remainder") amount = null;
    else {
      const raw = c.calc === "pctOfGross" ? g * c.value : c.calc === "pctOfBasic" ? basic * c.value : c.value;
      amount = Math.min(left, Math.max(0, rupees(raw)));
      left -= amount;
    }
    if (c.key === "basic") basic = amount ?? 0;
    lines.push({ key: c.key, name: c.name, amount, wagesPart: c.wagesPart });
  }
  for (const l of lines) if (l.amount === null) { l.amount = left; left = 0; }
  const of = (key) => lines.find((l) => l.key === key)?.amount ?? 0;
  return { lines, basic: of("basic"), hra: of("hra"), wages: lines.filter((l) => l.wagesPart).reduce((s, l) => s + l.amount, 0), total: lines.reduce((s, l) => s + l.amount, 0) };
}

// ---------- who ----------
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const active = (id) => { const u = id ? getUser(id) : null; return u && u.status !== "inactive" ? u : null; };
const admin = (id) => { const u = active(id); return u && holdsPayRulePermission(u, "payroll-rules:verify") ? u : null; };
const editor = (id) => { const u = active(id); return u && permissionsOf(u).includes("salary:edit") ? u : null; };
const ADMIN_ONLY = "Only an Admin can change a salary template.";
const EDITORS_ONLY = "You can't change salary structures.";
const entry = (actor, action, detail, today) => ({ at: new Date().toISOString(), on: today, by: actor.id, name: actor.name, action, ...detail });

// The Admin changes one component's rule: a share (0 to 1) for a percentage line, whole rupees for a fixed one. The
// balancing line has no rule to change. The percentage lines together can't promise more than the whole gross.
export function updateTemplateComponent(actorUserId, templateId, key, value, today = todayIso()) {
  const actor = admin(actorUserId);
  if (!actor) return fail(ADMIN_ONLY);
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return fail(`No salary template with id ${templateId}.`, "templateId");
  const component = template.components.find((c) => c.key === key);
  if (!component) return fail(`${template.name} has no component "${key}".`, "key");
  if (component.calc === "remainder") return fail(`${component.name} is the balancing component: it takes what the others leave.`, "key");
  if (component.calc === "fixed") {
    if (!Number.isSafeInteger(value) || value < 0) return fail("Enter whole rupees a month, 0 or more.", "value");
  } else if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) return fail("Enter a share above 0, up to 1 (0.5 is 50%).", "value");
  const box = store.read();
  const now = applied(template, box).components.map((c) => (c.key === key ? { ...c, value } : c));
  const basicShare = now.find((c) => c.key === "basic" && c.calc === "pctOfGross")?.value ?? 0;
  const promised = now.reduce((s, c) => s + (c.optional ? 0 : c.calc === "pctOfGross" ? c.value : c.calc === "pctOfBasic" ? c.value * basicShare : 0), 0);
  if (promised > 1 + 1e-9) return fail("The percentage components would add up to more than the gross.", "value");
  (box.templates[templateId] ??= {})[key] = { value };
  box.audit.push(entry(actor, "template", { templateId, key, value }, today));
  return store.write(box) ? { ok: true, record: applied(template, box) } : fail(SAVE_FAILED);
}

// ---------- a person's structure ----------
export function structureOf(userId) {
  const employment = employmentOf(userId);
  if (!employment) return null;
  const own = store.read().people[userId];
  const assigned = Boolean(own && TEMPLATE_IDS.includes(own.templateId));
  return { userId, templateId: assigned ? own.templateId : employment.kind === "intern" ? "intern" : "standard", lta: assigned && own.lta === true, assigned };
}
export function setStructure(actorUserId, userId, fields = {}, today = todayIso()) {
  const actor = editor(actorUserId);
  if (!actor) return fail(EDITORS_ONLY);
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`, "userId");
  const extra = Object.keys(fields ?? {}).find((k) => !["templateId", "lta"].includes(k));
  if (extra) return fail(`"${extra}" can't be set on a salary structure.`, extra);
  if (!TEMPLATE_IDS.includes(fields.templateId)) return fail("Choose one of the salary templates.", "templateId");
  const lta = fields.lta ?? false;
  if (typeof lta !== "boolean") return fail("LTA is on or off.", "lta");
  if (lta && !TEMPLATES.find((t) => t.id === fields.templateId).components.some((c) => c.key === "lta")) return fail("That template has no LTA.", "lta");
  const box = store.read();
  box.people[userId] = { templateId: fields.templateId, lta };
  box.audit.push(entry(actor, "structure", { userId, templateId: fields.templateId, lta }, today));
  return store.write(box) ? { ok: true, record: structureOf(userId) } : fail(SAVE_FAILED);
}

// ---------- the tax year, the regime, the declaration ----------
// April to March: 2026, 11 -> 2026-27; 2027, 2 -> 2026-27.
export function taxYearOf(year, month) {
  const start = month >= 4 ? year : year - 1;
  return { label: `${start}-${String((start + 1) % 100).padStart(2, "0")}`, start, startDate: `${start}-04-01` };
}
const isTaxYear = (label) => typeof label === "string" && /^\d{4}-\d{2}$/.test(label) && Number(label.slice(5)) === (Number(label.slice(0, 4)) + 1) % 100;
export const REGIMES = ["new", "old"];
// The new regime unless the old one was declared for that tax year.
export function regimeOf(userId, taxYear) {
  return store.read().regimes[userId]?.[taxYear] === "old" ? "old" : "new";
}
export function declarationOf(userId, taxYear) {
  const d = store.read().declarations[userId]?.[taxYear];
  return d ? copy(d) : null;
}
const wholeRupees = (v) => Number.isSafeInteger(v) && v >= 0;
// The old regime applies only on the employee's declaration for the tax year: the monthly rent paid, whether they live
// in one of the four metros (HRA), their 80C-type investments for the year and any other deductions for the year.
export function declareOldRegime(actorUserId, userId, taxYear, declaration = {}, today = todayIso()) {
  const actor = editor(actorUserId);
  if (!actor) return fail(EDITORS_ONLY);
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`, "userId");
  if (!isTaxYear(taxYear)) return fail("The tax year reads like 2026-27.", "taxYear");
  if (!isObj(declaration)) return fail("Give the declaration.", "declaration");
  const extra = Object.keys(declaration).find((k) => !["rentMonthly", "metro", "investments", "other"].includes(k));
  if (extra) return fail(`"${extra}" isn't part of the declaration.`, extra);
  const d = { rentMonthly: declaration.rentMonthly ?? 0, metro: declaration.metro ?? false, investments: declaration.investments ?? 0, other: declaration.other ?? 0 };
  for (const k of ["rentMonthly", "investments", "other"]) if (!wholeRupees(d[k])) return fail("Enter whole rupees, 0 or more.", k);
  if (typeof d.metro !== "boolean") return fail("Metro is yes or no.", "metro");
  const box = store.read();
  (box.declarations[userId] ??= {})[taxYear] = { ...d, declaredOn: today, recordedBy: actor.id };
  (box.regimes[userId] ??= {})[taxYear] = "old";
  box.audit.push(entry(actor, "regime", { userId, taxYear, regime: "old" }, today));
  return store.write(box) ? { ok: true, record: { userId, taxYear, regime: "old", declaration: declarationOf(userId, taxYear) } } : fail(SAVE_FAILED);
}
// Back to the default. The declaration stays on file (it is what was declared), and is not used.
export function chooseNewRegime(actorUserId, userId, taxYear, today = todayIso()) {
  const actor = editor(actorUserId);
  if (!actor) return fail(EDITORS_ONLY);
  if (!getUser(userId)) return fail(`No employee with id ${userId}.`, "userId");
  if (!isTaxYear(taxYear)) return fail("The tax year reads like 2026-27.", "taxYear");
  const box = store.read();
  if (box.regimes[userId]) delete box.regimes[userId][taxYear];
  box.audit.push(entry(actor, "regime", { userId, taxYear, regime: "new" }, today));
  return store.write(box) ? { ok: true, record: { userId, taxYear, regime: "new" } } : fail(SAVE_FAILED);
}

export const payStructureAudit = () => copy(store.read().audit);
export function resetPayStructures() {
  remove(KEY);
}