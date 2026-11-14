// The person-level pay cards (P4a), built in the design system and read from the data layer (data/pay-engine.js,
// data/pay-structure.js, data/employment.js); nothing is worked out here.
//   TaxExplain   how this tax year's TDS is worked out for one person: the months so far, the year's projection, the standard
//                deduction, the slabs, the rebate, the cess, and a Compare regimes panel (new against old with their
//                declaration, the difference in rupees, said in words as well as shown)
//   SalaryPlan   one person's template (picker, LTA), the CTC view (gross, employer costs, gratuity accrual, monthly and yearly)
//                and their tax regime for the year with the old-regime declaration form. Written for salary:edit holders
//                (Admin, Finance); anyone else sees it read-only.
// The regime and the declaration are recorded by Finance or the Admin on the employee's word: the module (pay-structure.js) lets
// no one else write them, so the employee has no button of their own here. Proofs are not collected in this demo.
import { useState } from "react";
import { payFor, ctcFor, compareRegimes } from "../../../assets/js/data/pay-engine.js";
import { payTemplates, structureOf, setStructure, regimeOf, declarationOf, declareOldRegime, chooseNewRegime, taxYearOf, componentsFor, payTemplate } from "../../../assets/js/data/pay-structure.js";
import { employmentOf } from "../../../assets/js/data/employment.js";
import { salaryFor } from "../../../assets/js/data/payroll-store.js";
import { ruleOn } from "../../../assets/js/data/pay-rules.js";
import { usesNewRules, statutoryFrom } from "../../../assets/js/data/pay-settings.js";
import { payForFinal } from "../../../assets/js/data/pay-runs.js";
import { taxYearMonths } from "../../../assets/js/data/payroll.js";
import { todayIso, monthName, formatDay } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Select, Switch } from "../components/Form.jsx";
import { rupees, UnverifiedNote } from "./payroll.jsx";

const monthLabel = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;
const pct = (v) => `${+(v * 100).toFixed(2)}%`;
const now = () => { const t = todayIso(); return { y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) }; };

function slabRows(regime, date) {
  const slabs = ruleOn(regime === "old" ? "tax.old" : "tax.new", date)?.value?.slabs ?? [];
  let from = 0;
  return slabs.map((s) => { const row = [from === 0 ? "Up to" : `${rupees(from + 1)} to`, s.upTo === null ? null : s.upTo, s.rate]; from = s.upTo ?? from; return row; });
}
const slabText = (row) => (row[1] === null ? `Above ${rupees(row[0] === "Up to" ? 0 : Number(row[0].replace(/[^\d]/g, "")) - 1)}` : `${row[0]} ${rupees(row[1])}`);

// ---------- how this year's TDS is worked out ----------
export function TaxExplain({ userId }) {
  const { y, m } = now();
  const ty = taxYearOf(y, m);
  const d = useData(() => {
    const upto = (m + 8) % 12;
    const months = taxYearMonths(y, m).slice(0, upto + 1).map(([yy, mm]) => ({ yy, mm, key: `${yy}-${String(mm).padStart(2, "0")}`, pay: payFor(userId, yy, mm), final: payForFinal(userId, yy, mm)?.final ?? false }));
    const latest = months.filter((x) => x.pay).at(-1)?.pay ?? null;
    const sal = salaryFor(userId, y, m);
    const structure = structureOf(userId);
    const template = structure && payTemplate(structure.templateId);
    const full = sal && template ? componentsFor(template, sal.gross, { lta: structure.lta }) : null;
    const decl = declarationOf(userId, ty.label);
    const compare = sal && full ? compareRegimes({ annualGross: sal.gross * 12, declaration: decl, basicAnnual: full.basic * 12, hraAnnual: full.hra * 12 }, ty.startDate) : null;
    return { months, latest, compare, decl, regime: regimeOf(userId, ty.label), gross: sal?.gross ?? 0 };
  }, [userId]);
  // before the statutory rules start month nothing is added to the page: it is what it was
  if (!usesNewRules(`${y}-${String(m).padStart(2, "0")}`)) return null;
  if (!d.latest) {
    return <Card id="tax-explain" title="How your tax is worked out" meta={`Tax year ${ty.label}`}><p className="text-muted">There's no pay on record for you this tax year yet, so there's nothing to work out.</p></Card>;
  }
  const t = d.latest.tax;
  const slabs = slabRows(t.regime, ty.startDate);
  const cmp = d.compare;
  return (
    <>
      <Card id="tax-explain" title="How your tax is worked out" meta={`Tax year ${ty.label}; ${t.regime === "old" ? "old" : "new"} regime`}
        footer={<span className="ds-card__meta">{`Under the new rules, from ${monthLabel(statutoryFrom())}.`}</span>}>
        {d.latest.unverified && <UnverifiedNote id="tax-unverified" />}
        <p>Each month's tax is the year's tax, projected from what you were paid so far and your salary for the months left, spread over the months left. Any shortfall from earlier months is caught up.</p>
        <dl className="kv" id="tax-year-summary">
          {[["Projected income for the year", rupees(t.projected)], ["Standard deduction", `−${rupees(t.standardDeduction)}`], ...(t.regime === "old" ? [["Declared deductions", `−${rupees(t.deductions)}`]] : []),
            ["Taxable income", rupees(t.taxable)], ["Tax on the slabs", rupees(Math.round(t.annual.slabTax))], ["Rebate", `−${rupees(Math.round(t.annual.rebate))}`], ["Tax after rebate", rupees(Math.round(t.annual.tax))],
            ["Health and education cess", rupees(Math.round(t.annual.cess))], ["Tax for the year", rupees(Math.round(t.annual.total))], ["An even month's share", rupees(t.monthly)]].map(([k, v]) => <div className="kv__row" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <h3 className="ds-card__title">Your months</h3>
        <table className="table" id="tax-months"><thead><tr><th>Month</th><th className="num">Paid</th><th className="num">Tax taken</th><th>Figures</th></tr></thead>
          <tbody>{d.months.map((x) => <tr key={x.key}><td>{monthLabel(x.key)}</td><td className="num">{x.pay ? rupees(x.pay.gross) : "—"}</td><td className="num">{x.pay ? rupees(x.pay.deductions.tds) : "—"}</td><td>{x.pay ? (x.final ? "Final" : "Draft, not final") : "—"}</td></tr>)}</tbody></table>
        <h3 className="ds-card__title">Slabs, {t.regime === "old" ? "old" : "new"} regime</h3>
        <ul id="tax-slabs">{slabs.map((s) => <li key={`${s[0]}${s[1]}`}>{`${slabText(s)}: ${s[2] === 0 ? "nil" : pct(s[2])}`}</li>)}</ul>
      </Card>
      {cmp && (
        <Card id="tax-compare" title="Compare regimes" meta={`On ${rupees(d.gross * 12)} a year`}>
          <dl className="kv">
            <div className="kv__row"><dt>New regime</dt><dd data-field="cmp-new">{rupees(cmp.new)}</dd></div>
            <div className="kv__row"><dt>{d.decl ? "Old regime, with your declaration" : "Old regime, with no declaration"}</dt><dd data-field="cmp-old">{rupees(cmp.old)}</dd></div>
            <div className="kv__row"><dt>Difference</dt><dd data-field="cmp-diff">{rupees(cmp.saving)}</dd></div>
          </dl>
          <p id="tax-compare-text"><Pill tone={cmp.lower === "new" ? "info" : "success"}>{cmp.lower === "new" ? "New regime is lower" : "Old regime is lower"}</Pill>{" "}{cmp.saving === 0 ? "The two come to the same tax." : `The ${cmp.lower} regime costs ${rupees(cmp.saving)} less a year.`}</p>
          <p className="text-muted">You are on the {d.regime} regime for {ty.label}. {d.decl ? `Your declaration of ${formatDay(d.decl.declaredOn, true)} is used for the old regime.` : "No old-regime declaration is on file."} Rates marked unverified are samples.</p>
        </Card>
      )}
    </>
  );
}

// ---------- one person's template, CTC and regime (salary:edit holders edit; anyone else reads) ----------
export function SalaryPlan({ userId, name }) {
  const { userId: me } = useSession();
  const canEdit = useCan("salary:edit") && userId !== me;
  const toast = useToast();
  const { y, m } = now();
  const ty = taxYearOf(y, m);
  const d = useData(() => ({
    templates: payTemplates(), structure: structureOf(userId), employment: employmentOf(userId), ctc: ctcFor(userId, y, m), final: payForFinal(userId, y, m), regime: regimeOf(userId, ty.label), decl: declarationOf(userId, ty.label),
    sal: salaryFor(userId, y, m),
  }), [userId]);
  const [pick, setPick] = useState(null);
  const [lta, setLta] = useState(null);
  const [decl, setDecl] = useState(null);
  const [err, setErr] = useState({});
  const tplId = pick ?? d.structure?.templateId ?? "standard";
  const ltaOn = lta ?? d.structure?.lta ?? false;
  const tpl = d.templates.find((t) => t.id === tplId);
  const form = decl ?? { rentMonthly: String(d.decl?.rentMonthly ?? ""), metro: d.decl?.metro ?? false, investments: String(d.decl?.investments ?? ""), other: String(d.decl?.other ?? "") };
  const money = (v) => (String(v).trim() === "" ? 0 : Number(v));
  const saveStructure = (e) => {
    e.preventDefault();
    const r = setStructure(me, userId, { templateId: tplId, lta: tpl?.components.some((c) => c.key === "lta") ? ltaOn : false });
    if (!r.ok) { toast(r.error, "danger"); return; }
    setPick(null); setLta(null); bump();
    toast(`${name}'s salary template is ${tpl.name}.`, "success");
  };
  const saveOld = (e) => {
    e.preventDefault();
    const r = declareOldRegime(me, userId, ty.label, { rentMonthly: money(form.rentMonthly), metro: form.metro, investments: money(form.investments), other: money(form.other) });
    if (!r.ok) { setErr({ field: r.field, text: r.error }); return; }
    setErr({}); setDecl(null); bump();
    toast(`${name} is on the old regime for ${ty.label}.`, "success");
  };
  const newRegime = () => {
    const r = chooseNewRegime(me, userId, ty.label);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast(`${name} is on the new regime for ${ty.label}.`, "success");
  };
  const sample = componentsFor(tpl, d.sal?.gross ?? 100000, { lta: ltaOn });
  const e = (f) => (err.field === f ? err.text : undefined);
  const set = (k) => (ev) => { setDecl({ ...form, [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value }); setErr({}); };
  return (
    <>
      <Card id="salary-plan" title={`Template: ${name}`} meta={`${d.employment?.employmentType ?? "Full-time"}${d.employment?.joiningDate ? `, joined ${formatDay(d.employment.joiningDate, true)}` : ""}`}>
        <form onSubmit={saveStructure} noValidate>
          <Field id="plan-template" label="Salary template" hint={d.structure?.assigned ? "Chosen for this person." : "Chosen from their employment type until one is picked."}>
            <Select id="plan-template" value={tplId} disabled={!canEdit} onChange={(ev) => setPick(ev.target.value)} options={d.templates.map((t) => [t.id, t.name])} />
          </Field>
          {tpl?.components.some((c) => c.key === "lta") && <Switch id="plan-lta" label="Leave travel allowance" checked={ltaOn} disabled={!canEdit} onChange={setLta} />}
          <dl className="kv" id="plan-preview" aria-label={`${tpl?.name} on ${rupees(d.sal?.gross ?? 100000)}`}>
            {sample.lines.map((l) => <div className="kv__row" key={l.key}><dt>{l.name}</dt><dd>{rupees(l.amount)}</dd></div>)}
          </dl>
          <p className="text-muted">{d.sal ? `On their salary of ${rupees(d.sal.gross)} a month.` : "No salary on file: shown on a sample of ₹1,00,000."} {tpl?.kind === "intern" ? "A stipend: no PF, ESI or gratuity." : ""}</p>
          {canEdit && <p><button className="ds-btn ds-btn--primary" type="submit" id="plan-save">Save template</button></p>}
        </form>
      </Card>
      <Card id="salary-ctc" title="Cost to company" meta={d.ctc ? monthLabel(d.ctc.month) : ""}>
        {d.ctc ? (
          <>
            {d.ctc.unverified && <UnverifiedNote id="ctc-unverified" />}
            <table className="table" id="ctc-table"><thead><tr><th>Part</th><th className="num">A month</th><th className="num">A year</th></tr></thead>
              <tbody>
                {[["Gross pay", d.ctc.monthly.gross], ["Employer provident fund", d.ctc.monthly.employer.pf], ["Employer EDLI and PF admin charge", d.ctc.monthly.employer.edli + d.ctc.monthly.employer.pfAdmin], ["Employer state insurance", d.ctc.monthly.employer.esi],
                  ["Employer labour welfare fund", d.ctc.monthly.employer.lwf], ["Gratuity accrual (a cost, not paid out now)", d.ctc.monthly.employer.gratuity], ["Cost to company", d.ctc.monthly.total]].map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{rupees(v)}</td><td className="num">{rupees(v * 12)}</td></tr>)}
              </tbody></table>
            <p className="text-muted">Rules as of {formatDay(d.ctc.rulesAsOf, true)}. A projection on the full monthly gross: a draft, not final.</p>
            {d.final?.final && <p id="ctc-final">{`This month's approved run, as frozen: ${rupees(d.final.pay.gross)} paid and ${rupees(d.final.pay.employer.total)} of employer contributions, ${rupees(d.final.pay.costToCompany)} in all.`}</p>}
          </>
        ) : <p className="text-muted">No salary on file for this month, so there's no cost to work out.</p>}
      </Card>
      <Card id="salary-regime" title="Tax regime" meta={`Tax year ${ty.label}`}>
        <p id="regime-now"><Pill tone={d.regime === "old" ? "warning" : "info"}>{d.regime === "old" ? "Old regime" : "New regime"}</Pill>{" "}{d.regime === "old" ? "By declaration." : "The default. The old regime applies only on a declaration for the tax year."}</p>
        {canEdit ? (
          <form onSubmit={saveOld} noValidate id="declaration-form">
            <Field id="decl-rent" label="Rent paid a month (₹)" error={e("rentMonthly")}><Input id="decl-rent" type="number" min="0" step="1" value={form.rentMonthly} onChange={set("rentMonthly")} /></Field>
            <Switch id="decl-metro" label="Lives in Mumbai, Kolkata, Delhi or Chennai (HRA at 50%, not 40%)" checked={form.metro} onChange={(v) => setDecl({ ...form, metro: v })} />
            <Field id="decl-invest" label="80C-type investments for the year (₹)" error={e("investments")} hint="Counted up to the cap in the old regime's rates."><Input id="decl-invest" type="number" min="0" step="1" value={form.investments} onChange={set("investments")} /></Field>
            <Field id="decl-other" label="Other deductions for the year (₹)" error={e("other")}><Input id="decl-other" type="number" min="0" step="1" value={form.other} onChange={set("other")} /></Field>
            <p className="text-muted">Proofs are not collected in this demo: what is entered here is taken as declared.</p>
            <p><button className="ds-btn ds-btn--primary" type="submit" id="decl-save">{d.regime === "old" ? "Update declaration" : "Declare old regime"}</button>{" "}
              {d.regime === "old" && <button className="ds-btn" type="button" id="regime-new" onClick={newRegime}>Back to the new regime</button>}</p>
          </form>
        ) : <p className="text-muted">{d.decl ? `Declaration: rent ${rupees(d.decl.rentMonthly)} a month, investments ${rupees(d.decl.investments)}, other deductions ${rupees(d.decl.other)}.` : "No declaration on file."} The regime and the declaration are recorded by Finance or an Admin.</p>}
      </Card>
    </>
  );
}