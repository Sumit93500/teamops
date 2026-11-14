// Rates and rules (P4a): the app's own page at /pages/payroll/rates-rules.html. Every row of the dated statutory table
// (data/pay-rules.js): its key, state, rates, value, effective-from, source link, confidence badge, and who verified it and
// when. Finance reads (tax:view); an Admin (payroll-rules:verify) also verifies a row (asked first; the row records the Admin's
// name and the date) and adds a dated row through the module's own checks. A banner counts the rows nobody has verified.
// Nothing is worked out here.
import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { allRules, ruleStatus, verifyRule, addRule, PAY_RULE_KEYS, CONFIDENCE, ALL, isUnverified } from "../../../assets/js/data/pay-rules.js";
import { OFFICE_STATES } from "../../../assets/js/data/offices-store.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan, signOutNow } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, RATES_RULES } from "../routes.js";
import { mayOpenRates } from "../shell/appNav.js";
import Shell from "../shell/Shell.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Card, Pill, KpiCard } from "../components/Layout.jsx";
import { FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";

const pct = (v) => (v === null || v === undefined ? "" : `${+(v * 100).toFixed(4)}%`);
const money = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : String(n));
const START = "2000-01-01";
// The row's numbers in words, for the table (the generated docs/payroll-rules.md says the same).
function describe(r) {
  const v = r.value;
  if (!v) return r.employeeRate === null && r.employerRate === null ? "No number known" : "";
  if (v.slabs && r.key === "pt") return `${v.slabs.map((s) => `${s.upTo === null ? "above" : `to ${money(s.upTo)}`}: ${s.amount === null ? "not known" : s.amount}${s.february ? ` (Feb ${s.february})` : ""}`).join("; ")}${v.period !== "monthly" ? ` (${v.period})` : ""}`;
  if (v.slabs) return `${v.slabs.map((s) => `${s.upTo === null ? "above" : `to ${money(s.upTo)}`} ${pct(s.rate)}`).join(", ")}; standard deduction ${money(v.standardDeduction)}; rebate to ${money(v.rebate.upTo)}`;
  return Object.entries(v).map(([k, x]) => `${k} ${Array.isArray(x) ? x.join(", ") : typeof x === "object" && x !== null ? JSON.stringify(x) : x}`).join("; ");
}
const TONE = { confirmed: "success", secondary: "info", unverified: "warning", verified: "success" };
const LABEL = { confirmed: "Confirmed", secondary: "Secondary", unverified: "Unverified", verified: "Verified by an Admin" };

function AddRow({ open, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const blank = { key: "pf", scope: ALL, effectiveFrom: "", employeeRate: "", employerRate: "", value: "", source: "", confidence: "unverified", note: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErr(null); };
  const rate = (v) => (String(v).trim() === "" ? null : Number(v) / 100);
  const save = (e) => {
    e.preventDefault();
    let value = null;
    if (f.value.trim()) { try { value = JSON.parse(f.value); } catch { setErr({ field: "value", text: "The value must be valid JSON, like {\"wageCeiling\": 30000}." }); return; } }
    const r = addRule(userId, { key: f.key, scope: f.scope, effectiveFrom: f.effectiveFrom, employeeRate: rate(f.employeeRate), employerRate: rate(f.employerRate), value, source: f.source, confidence: f.confidence, note: f.note });
    if (!r.ok) { setErr({ field: r.field, text: r.error }); return; }
    toast(`Row ${r.record.id} added. It is unverified until an Admin verifies it.`, "success");
    bump(); setF(blank); onClose();
  };
  const e = (field) => (err?.field === field ? err.text : undefined);
  return (
    <Modal open={open} onClose={onClose} id="add-rule-modal" size="md" title="Add a dated row" desc="A rate change is a new row with a later date. Rows are never edited or deleted, so earlier months keep the rule they had."
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="add-rule-form">Add row</button></>}>
      <form id="add-rule-form" noValidate onSubmit={save}>
        <div className="ds-form-grid">
          <Field id="rule-key" label="Rule" required error={e("key")}><Select id="rule-key" value={f.key} onChange={set("key")} options={PAY_RULE_KEYS} /></Field>
          <Field id="rule-scope" label="State" required error={e("scope")} hint="All, or the state it applies in."><Select id="rule-scope" value={f.scope} onChange={set("scope")} options={[[ALL, "All (the whole country)"], ...OFFICE_STATES.map((s) => [s, s])]} /></Field>
          <Field id="rule-from" label="Effective from" required error={e("effectiveFrom")}><Input id="rule-from" type="date" value={f.effectiveFrom} onChange={set("effectiveFrom")} /></Field>
          <Field id="rule-confidence" label="Confidence" error={e("confidence")}><Select id="rule-confidence" value={f.confidence} onChange={set("confidence")} options={CONFIDENCE} /></Field>
          <Field id="rule-ee" label="Employee rate (%)" error={e("employeeRate")}><Input id="rule-ee" type="number" step="any" min="0" max="100" value={f.employeeRate} onChange={set("employeeRate")} /></Field>
          <Field id="rule-er" label="Employer rate (%)" error={e("employerRate")}><Input id="rule-er" type="number" step="any" min="0" max="100" value={f.employerRate} onChange={set("employerRate")} /></Field>
          <Field id="rule-value" label="Ceilings, slabs and the rest (JSON)" full error={e("value")} hint="Leave empty for a row with no number."><TextArea id="rule-value" rows={3} value={f.value} onChange={set("value")} /></Field>
          <Field id="rule-source" label="Source" required full error={e("source")} hint="The page the number came from."><Input id="rule-source" value={f.source} onChange={set("source")} placeholder="https://" /></Field>
          <Field id="rule-note" label="Note" full><Input id="rule-note" value={f.note} onChange={set("note")} /></Field>
        </div>
      </form>
    </Modal>
  );
}

function Content() {
  const { userId } = useSession();
  const canVerify = useCan("payroll-rules:verify");
  const confirm = useConfirm();
  const toast = useToast();
  const rows = useData(() => allRules().map((r) => ({ ...r, status: ruleStatus(r) })), []);
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const [rule, setRule] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const unverified = rows.filter((r) => isUnverified(r));
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => (!state || (state === ALL ? r.scope === ALL : r.scope === state)) && (!status || r.status === status) && (!rule || r.key === rule) && (!q || `${r.key} ${r.scope} ${r.note} ${r.source}`.toLowerCase().includes(q)));
  const verify = async (r) => {
    if (!(await confirm({ message: `Verify ${r.id}?\nThis records your name and today's date on the row. Verify only after a Chartered Accountant or the HR team has checked the number against its source.`, confirmLabel: "Verify row", cancelLabel: "Cancel" }))) return;
    const res = verifyRule(userId, r.id);
    if (!res.ok) { toast(res.error, "danger"); return; }
    bump(); toast(`${r.id} is verified.`, "success");
  };
  const columns = [
    { key: "key", label: "Rule", render: (r) => <span className="table__user-name">{r.key}</span>, sort: (r) => r.key },
    { key: "scope", label: "State", render: (r) => (r.scope === ALL ? "All" : r.scope), sort: (r) => r.scope },
    { key: "rates", label: "Employee / employer", render: (r) => [pct(r.employeeRate), pct(r.employerRate)].filter(Boolean).join(" / ") || "—" },
    { key: "value", label: "Value", render: describe },
    { key: "from", label: "Effective from", render: (r) => (r.effectiveFrom === START ? "Not known" : formatDay(r.effectiveFrom, true)), sort: (r) => r.effectiveFrom },
    { key: "source", label: "Source", render: (r) => (r.source ? <a href={r.source} target="_blank" rel="noreferrer noopener">Source page</a> : "None") },
    { key: "status", label: "Confidence", render: (r) => <Pill tone={TONE[r.status]}>{LABEL[r.status]}</Pill>, sort: (r) => r.status },
    { key: "verified", label: "Verified by", render: (r) => (r.verifiedBy ? `${r.verifiedByName}, ${formatDay(r.verifiedOn, true)}` : "Not verified") },
    { key: "actions", label: "Actions", actions: true, render: (r) => (canVerify ? <button className="ds-btn ds-btn--sm" type="button" data-verify={r.id} disabled={Boolean(r.verifiedBy)} onClick={() => verify(r)}>{r.verifiedBy ? "Verified" : "Verify"}</button> : null) },
  ];
  const count = (s) => rows.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader title="Rates and rules" subtitle="The statutory rates the payslips use, with where each came from and who has verified it"
        breadcrumb={[{ label: "Payroll", to: pageUrl("payroll/payroll-run.html") }, { label: "Rates and rules" }]}
        actions={canVerify ? <button className="ds-btn ds-btn--primary" type="button" id="add-rule" onClick={() => setAdding(true)}>Add dated row</button> : null} />
      <div className="ds-note ds-note--warning" id="unverified-banner" role="note">
        <strong>{unverified.length} of {rows.length} rows are unverified.</strong>{" "}These rates are samples until an Admin verifies them. Verify a row only after a Chartered Accountant or the HR team has checked it against its source.
      </div>
      <div className="ds-grid" role="group" aria-label="Key numbers" id="rate-kpis">
        <KpiCard id="k-rows" label="Rows" value={String(rows.length)} />
        <KpiCard id="k-confirmed" label="Confirmed" value={String(count("confirmed"))} />
        <KpiCard id="k-secondary" label="Secondary" value={String(count("secondary"))} />
        <KpiCard id="k-unverified" label="Unverified" value={String(count("unverified"))} />
        <KpiCard id="k-verified" label="Verified by an Admin" value={String(count("verified"))} />
      </div>
      <FilterBar label="Filter the rows" active={Boolean(state || status || rule || q)} onClearAll={() => { setState(""); setStatus(""); setRule(""); setQuery(""); }}>
        <FilterSelect label="State" value={state} onChange={setState} allLabel="All states" options={[{ value: ALL, label: "All (whole country)" }, ...OFFICE_STATES]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="Any status" options={[...CONFIDENCE.map((c) => ({ value: c, label: LABEL[c] })), { value: "verified", label: LABEL.verified }]} />
        <FilterSelect label="Rule" value={rule} onChange={setRule} allLabel="All rules" options={PAY_RULE_KEYS} />
        <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Search the rows" />
      </FilterBar>
      <Card id="rate-rows" title="Dated rows" meta={`Showing ${shown.length} of ${rows.length}`}>
        <Table bare pageSize={15} columns={columns} rows={shown} rowKey={(r) => r.id} rowProps={(r) => ({ "data-rule": r.id })} empty="No rows match these filters." />
      </Card>
      <AddRow open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

export default function RatesRules() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("Rates and rules"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!mayOpenRates()) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return <Shell page={RATES_RULES} title="Rates and rules"><Content /></Shell>;
}