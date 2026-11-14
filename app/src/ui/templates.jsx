// Salary templates (P4a), on the Salary structure page: the templates the pay engine uses (Standard, Intern stipend), each
// component's rule, a preview on a gross the viewer types, and, for an Admin, Edit on a component through the module's own
// validation (data/pay-structure.js updateTemplateComponent: a share up to 1, or whole rupees; the balancing component has
// no rule; the percentages can't promise more than the gross). Nothing is worked out here.
import { useState } from "react";
import { payTemplates, componentsFor, updateTemplateComponent } from "../../../assets/js/data/pay-structure.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input } from "../components/Form.jsx";
import { rupees } from "./payroll.jsx";

const pct = (v) => `${+(v * 100).toFixed(2)}%`;
const rule = (c) => (c.calc === "pctOfGross" ? `${pct(c.value)} of gross` : c.calc === "pctOfBasic" ? `${pct(c.value)} of basic` : c.calc === "fixed" ? `Fixed ${rupees(c.value)} a month` : "The balance of the gross");

function EditRule({ edit, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const { template, c } = edit ?? {};
  const percent = c && c.calc !== "fixed";
  const [text, setText] = useState(c ? String(percent ? +(c.value * 100).toFixed(4) : c.value) : "");
  const [err, setErr] = useState("");
  const save = (e) => {
    e.preventDefault();
    const n = Number(text);
    const r = updateTemplateComponent(userId, template.id, c.key, percent ? n / 100 : n);
    if (!r.ok) { setErr(r.error); return; }
    toast(`${c.name} in ${template.name} is now ${percent ? `${pct(n / 100)} of ${c.calc === "pctOfBasic" ? "basic" : "gross"}` : `${rupees(n)} a month`}.`, "success");
    bump(); onClose();
  };
  return (
    <Modal open={Boolean(edit)} onClose={onClose} id="template-edit" size="sm" title={c ? `Edit ${c.name}` : ""} desc={c ? `${template.name}. New figures apply to pay worked out from now on.` : ""}
      footer={<><button className="ds-btn" type="button" onClick={onClose}>Cancel</button><button className="ds-btn ds-btn--primary" type="submit" form="template-edit-form">Save rule</button></>}>
      {c && (
        <form id="template-edit-form" noValidate onSubmit={save}>
          <Field id="template-value" label={percent ? `Share of ${c.calc === "pctOfBasic" ? "basic" : "gross"} (%)` : "Rupees a month"} required error={err || undefined}>
            <Input id="template-value" type="number" step="any" min="0" value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} />
          </Field>
        </form>
      )}
    </Modal>
  );
}

export default function TemplateEditor() {
  const isAdmin = useCan("payroll-rules:verify");
  const templates = useData(() => payTemplates(), []);
  const [gross, setGross] = useState("100000");
  const [edit, setEdit] = useState(null);
  const g = Math.max(0, Math.round(Number(gross) || 0));
  return (
    <Card id="salary-templates" title="Salary templates" meta={`${templates.length} templates`}
      footer={<span className="ds-card__meta">{isAdmin ? "Only an Admin edits a template. Each person's template is chosen on their row below." : "Only an Admin edits a template."}</span>}>
      <Field id="template-gross" label="Preview on a monthly gross (₹)"><Input id="template-gross" type="number" min="0" step="1000" value={gross} onChange={(e) => setGross(e.target.value)} /></Field>
      {templates.map((t) => {
        const split = componentsFor(t, g);
        const columns = [
          { key: "name", label: "Component", render: (c) => <span className="table__user-name">{c.name}</span> },
          { key: "rule", label: "How it is worked out", render: (c) => <>{rule(c)}{c.optional && <>{" "}<Pill>Optional</Pill></>}</> },
          { key: "wages", label: "Counts as wages", render: (c) => (c.wagesPart ? "Yes" : "No") },
          { key: "preview", label: `On ${rupees(g)}`, num: true, render: (c) => (c.optional ? "Per person" : rupees(split.lines.find((l) => l.key === c.key)?.amount ?? 0)) },
          { key: "actions", label: "Actions", actions: true, render: (c) => (isAdmin && c.calc !== "remainder" ? <button className="ds-btn ds-btn--sm" type="button" data-edit-component={`${t.id}:${c.key}`} onClick={() => setEdit({ template: t, c })}>Edit</button> : null) },
        ];
        return (
          <div key={t.id} data-template={t.id}>
            <h3 className="ds-card__title">{t.name} <Pill tone={t.kind === "intern" ? "info" : ""}>{t.kind === "intern" ? "No PF, ESI or gratuity" : "Employees"}</Pill></h3>
            <Table bare pager={false} columns={columns} rows={t.components} rowKey={(c) => c.key} empty="No components." />
          </div>
        );
      })}
      <EditRule edit={edit} onClose={() => setEdit(null)} />
    </Card>
  );
}