// Settings > Payroll (P4a), for an Admin: when the new statutory rules start, and the company switch for PF on full wages.
// Months before the start month keep exactly the figures they had (the existing engine); from it the new engine's.
// Saved by data/pay-settings.js and data/pay-rules.js, which refuse what isn't allowed (a start on or before an approved
// month) in their own words.
import { useState } from "react";
import { Link } from "react-router-dom";
import { statutoryFrom, setStatutoryFrom, DEFAULT_STATUTORY_FROM } from "../../../assets/js/data/pay-settings.js";
import { payRuleSettings, setPfOnFullWages, unverifiedRules } from "../../../assets/js/data/pay-rules.js";
import { monthName } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "../ui/Toast.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Switch } from "../components/Form.jsx";
import { pageUrl, RATES_RULES } from "../routes.js";

const label = (month) => `${monthName(Number(month.slice(5, 7)))} ${month.slice(0, 4)}`;

export default function PayrollSettings() {
  const { userId } = useSession();
  const canEdit = useCan("settings:edit");
  const toast = useToast();
  const d = useData(() => ({ from: statutoryFrom(), pf: payRuleSettings().pfOnFullWages, unverified: unverifiedRules().length }), []);
  const [month, setMonth] = useState(null);
  const [error, setError] = useState("");
  const value = month ?? d.from;
  const save = (e) => {
    e.preventDefault();
    const r = setStatutoryFrom(userId, value);
    if (!r.ok) { setError(r.error); return; }
    setError(""); setMonth(null); bump();
    toast(`The new statutory rules start with ${label(value)}.`, "success");
  };
  const pf = (on) => {
    const r = setPfOnFullWages(userId, on);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(on ? "Provident fund now uses full wages." : "Provident fund is capped at the wage ceiling again.", "success");
  };
  return (
    <Card id="payroll-settings" title="Payroll" meta="Admin only"
      footer={<span className="ds-card__meta">The rates themselves are on the <Link to={pageUrl(RATES_RULES)}>Rates and rules</Link> page: {d.unverified} rows are unverified.</span>}>
      <form onSubmit={save} noValidate>
        <Field id="pay-start-month" label="Statutory rules start month" required hint={`Months before it keep exactly the figures they have today; from it the payslips, payroll run, salary and tax pages use the new rules. Until changed: ${label(DEFAULT_STATUTORY_FROM)}, the first month whose payroll was not finalized when the new rules shipped.`} error={error || undefined}>
          <Input id="pay-start-month" type="month" value={value} disabled={!canEdit} onChange={(e) => { setMonth(e.target.value); setError(""); }} />
        </Field>
        <p><button className="ds-btn ds-btn--primary" type="submit" id="pay-start-save" disabled={!canEdit || !value || value === d.from}>Save start month</button>{" "}<Pill tone="info">{`Now: ${label(d.from)}`}</Pill></p>
      </form>
      <hr />
      <Switch id="pay-pf-full" label="PF on full wages" checked={d.pf} disabled={!canEdit} onChange={pf} describedBy="pay-pf-full-hint" />
      <p className="ds-field__helper" id="pay-pf-full-hint">Off (the default): provident fund is on wages up to the ceiling, the statutory minimum. On: on the full wages. EPS stays capped either way.</p>
    </Card>
  );
}