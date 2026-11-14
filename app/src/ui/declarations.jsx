// Tax declarations (P5), in the design system, read and written through data/pay-structure.js (its checks and words).
//   MyDeclaration       the signed-in person's own regime and old-regime declaration for this tax year: draft, submit, the
//                       status (draft / submitted / verified and locked), the cutoff; once locked, a note to ask Finance
//   DeclarationsReview  for declarations:manage (Finance, Admin): everyone's status for the tax year, Verify and lock / Unlock,
//                       the cutoff date. A manager never sees their team's declarations: this is for Finance and the Admin only.
// Shown only from the statutory rules start month (before it the pages are what they were).
import { useState } from "react";
import { saveOwnDeclaration, declarationStatus, declarationCutoff, verifyDeclaration, unlockDeclaration, setDeclarationCutoff, taxYearOf, ASK_FINANCE } from "../../../assets/js/data/pay-structure.js";
import { usesNewRules } from "../../../assets/js/data/pay-settings.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { todayIso, formatDay } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Table from "../components/Table.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Switch } from "../components/Form.jsx";
import { rupees } from "./payroll.jsx";

const STATUS = { none: ["Not declared", ""], draft: ["Draft", "info"], submitted: ["Submitted", "warning"], locked: ["Verified and locked", "success"] };
const now = () => { const t = todayIso(); return { y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)), t }; };
const active = () => { const { y, m } = now(); return usesNewRules(`${y}-${String(m).padStart(2, "0")}`); };
export const StatusPill = ({ status }) => <Pill tone={STATUS[status]?.[1] ?? ""} data-status={status}>{STATUS[status]?.[0] ?? status}</Pill>;

export function MyDeclaration() {
  const { userId } = useSession();
  const can = useCan("declarations:submit-own");
  const toast = useToast();
  const { y, m, t } = now();
  const ty = taxYearOf(y, m).label;
  const d = useData(() => ({ s: declarationStatus(userId, ty), cutoff: declarationCutoff(ty) }), [userId, ty]);
  const base = d.s.draft ?? { regime: d.s.applied.regime, declaration: d.s.applied.declaration };
  const [f, setF] = useState(null);
  const [err, setErr] = useState(null);
  if (!userId || !can || !active()) return null;
  const form = f ?? { regime: base.regime, rent: String(base.declaration?.rentMonthly ?? ""), metro: base.declaration?.metro ?? false, invest: String(base.declaration?.investments ?? ""), other: String(base.declaration?.other ?? "") };
  const locked = d.s.status === "locked";
  const closed = d.cutoff && t > d.cutoff;
  const money = (v) => (String(v).trim() === "" ? 0 : Number(v));
  const save = (submit) => (e) => {
    e?.preventDefault?.();
    const r = saveOwnDeclaration(userId, ty, { regime: form.regime, declaration: form.regime === "old" ? { rentMonthly: money(form.rent), metro: form.metro, investments: money(form.invest), other: money(form.other) } : undefined }, { submit });
    if (!r.ok) { setErr({ field: r.field, text: r.error }); return; }
    setErr(null); setF(null); bump();
    toast(submit ? `Your declaration for ${ty} is submitted.` : "Draft saved. It applies once you submit it.", "success");
  };
  const set = (k) => (e) => { setF({ ...form, [k]: e.target.value }); setErr(null); };
  const e = (k) => (err?.field === k ? err.text : undefined);
  return (
    <Card id="my-declaration" title="My tax declaration" meta={`Tax year ${ty}`}>
      <p id="my-declaration-status"><StatusPill status={d.s.status} />{" "}{`Applied now: the ${d.s.applied.regime} regime.`}{d.cutoff ? ` Submissions close after ${formatDay(d.cutoff, true)}.` : " No cutoff set yet."}</p>
      {locked ? <p id="my-declaration-locked">{ASK_FINANCE}</p>
        : closed ? <p id="my-declaration-closed">{`Declarations for ${ty} closed on ${formatDay(d.cutoff, true)}. To change yours, ask Finance.`}</p>
          : (
            <form onSubmit={save(true)} noValidate>
              <fieldset className="ds-fieldset" id="my-regime">
                <legend className="ds-field__label">Regime</legend>
                <label className="ds-radio"><input type="radio" name="my-regime" value="new" checked={form.regime === "new"} onChange={set("regime")} /> New regime (the default)</label>{" "}
                <label className="ds-radio"><input type="radio" name="my-regime" value="old" checked={form.regime === "old"} onChange={set("regime")} /> Old regime, with this declaration</label>
              </fieldset>
              {e("regime") && <p className="ds-field__error" role="alert">{e("regime")}</p>}
              {form.regime === "old" && (
                <>
                  <Field id="my-rent" label="Rent paid a month (₹)" error={e("rentMonthly")}><Input id="my-rent" type="number" min="0" step="1" value={form.rent} onChange={set("rent")} /></Field>
                  <Switch id="my-metro" label="I live in Mumbai, Kolkata, Delhi or Chennai" checked={form.metro} onChange={(v) => setF({ ...form, metro: v })} />
                  <Field id="my-invest" label="80C-type investments for the year (₹)" error={e("investments")}><Input id="my-invest" type="number" min="0" step="1" value={form.invest} onChange={set("invest")} /></Field>
                  <Field id="my-other" label="Other deductions for the year (₹)" error={e("other")}><Input id="my-other" type="number" min="0" step="1" value={form.other} onChange={set("other")} /></Field>
                </>
              )}
              <p className="text-muted">Proofs are not collected in this demo: what you enter is taken as declared. A draft doesn't change your pay; a submitted declaration does, until Finance verifies and locks it.</p>
              <p><button className="ds-btn" type="button" id="my-draft" onClick={save(false)}>Save draft</button>{" "}<button className="ds-btn ds-btn--primary" type="submit" id="my-submit">Submit</button></p>
            </form>
          )}
    </Card>
  );
}

export function DeclarationsReview() {
  const { userId } = useSession();
  const can = useCan("declarations:manage");
  const toast = useToast();
  const confirm = useConfirm();
  const { y, m } = now();
  const ty = taxYearOf(y, m).label;
  const rows = useData(() => getAllUsers().filter((u) => u.status !== "inactive").map((u) => ({ id: u.id, name: u.name, s: declarationStatus(u.id, ty) })), [ty]);
  const cutoff = useData(() => declarationCutoff(ty), [ty]);
  const [date, setDate] = useState(null);
  const [err, setErr] = useState("");
  if (!can || !active()) return null;
  const act = async (fn, r, verb) => {
    if (!(await confirm({ message: `${verb} ${r.name}'s declaration for ${ty}?`, confirmLabel: verb, cancelLabel: "Cancel" }))) return;
    const res = fn(userId, r.id, ty);
    if (!res.ok) { toast(res.error, "danger"); return; }
    bump(); toast(`${r.name}: ${verb === "Verify and lock" ? "verified and locked" : "unlocked"}.`, "success");
  };
  const saveCutoff = (e) => {
    e.preventDefault();
    const v = date ?? cutoff ?? "";
    const res = setDeclarationCutoff(userId, ty, v === "" ? null : v);
    if (!res.ok) { setErr(res.error); return; }
    setErr(""); setDate(null); bump(); toast(v ? `Declarations for ${ty} close after ${formatDay(v, true)}.` : "No cutoff now.", "success");
  };
  const columns = [
    { key: "name", label: "Employee", render: (r) => <span className="table__user-name">{r.name}</span> },
    { key: "status", label: "Status", render: (r) => <StatusPill status={r.s.status} /> },
    { key: "regime", label: "Applied regime", render: (r) => (r.s.applied.regime === "old" ? `Old: rent ${rupees(r.s.applied.declaration?.rentMonthly ?? 0)} a month, investments ${rupees(r.s.applied.declaration?.investments ?? 0)}` : "New") },
    { key: "actions", label: "Actions", actions: true, render: (r) => (r.s.status === "submitted" ? <button className="ds-btn ds-btn--sm" type="button" data-verify-decl={r.id} onClick={() => act(verifyDeclaration, r, "Verify and lock")}>Verify and lock</button>
      : r.s.status === "locked" ? <button className="ds-btn ds-btn--sm" type="button" data-unlock-decl={r.id} onClick={() => act(unlockDeclaration, r, "Unlock")}>Unlock</button> : null) },
  ];
  return (
    <Card id="declarations-review" title="Tax declarations" meta={`Tax year ${ty}; Finance and Admin only`}>
      <form onSubmit={saveCutoff} noValidate>
        <Field id="decl-cutoff" label="Submissions close after" hint="After this day an employee can't change their declaration; Finance and the Admin still can." error={err || undefined}>
          <Input id="decl-cutoff" type="date" value={date ?? cutoff ?? ""} onChange={(e) => { setDate(e.target.value); setErr(""); }} />
        </Field>
        <p><button className="ds-btn" type="submit" id="decl-cutoff-save">Save cutoff</button></p>
      </form>
      <Table bare pager={false} columns={columns} rows={rows} rowKey={(r) => r.id} rowProps={(r) => ({ "data-decl": r.id })} empty="No employees." />
    </Card>
  );
}