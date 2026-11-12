// users/departments.html (L1), built in the design system. What the old page (pages/departments.js) does, in its words:
// the four numbers (Departments with whether all have a head, Employees, Open positions "—", Average team size and the
// largest), a card per department (name, code, Active / Inactive, head, employees, open roles "—", View people, Edit with
// departments:edit), and Add department (departments:create) / Edit in one dialog: name, code (2-4 capitals, fixed once
// made), head (active people), Active. Deactivating one that still has people asks first. The store's own checks and words.
import { useState } from "react";
import { Link } from "react-router-dom";
import { getAllDepartments, getDepartment, getAllUsers, addDepartment, updateDepartment, headcountByDepartment } from "../../../assets/js/data/store.js";
import { useData, useAction, useCan, useSession } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import Frame from "../ui/Frame.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Pill } from "../components/Layout.jsx";
import { Field, Input, Select, Switch, Person } from "../components/Form.jsx";
import { Icon } from "../components/icons.jsx";

const PAGE = "users/departments.html";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const PLUS = "M12 5v14M5 12h14";

function Stat({ id, label, value, note }) {
  return (
    <div className="ds-kpi" data-stat={id}>
      <div className="ds-kpi__top"><span className="ds-kpi__label">{label}</span></div>
      <strong className="ds-kpi__value">{value}</strong>
      {note ? <span className="ds-hint" data-stat-note>{note}</span> : null}
    </div>
  );
}

function DeptForm({ editing, onDone }) {
  const { userId } = useSession();
  const confirm = useConfirm();
  const toast = useToast();
  const add = useAction(addDepartment), update = useAction(updateDepartment);
  const people = useData(() => getAllUsers().filter((u) => u.status === "active").map((u) => u.name));
  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState(editing?.code ?? "");
  const [head, setHead] = useState(editing?.head ?? "");
  const [active, setActive] = useState(editing ? editing.active !== false : true);
  const [error, setError] = useState(null);   // { field, text }
  const heads = editing?.head && !people.includes(editing.head) ? [...people, editing.head] : people;

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    const record = { name: name.trim(), head, active };
    if (editing) {
      const before = getDepartment(editing.code);
      const count = headcountByDepartment()[editing.code] ?? 0;
      if (before?.active !== false && !active && count > 0 && !(await confirm({ message: `This department has ${plural(count, "employee", "employees")}. Deactivate anyway?`, confirmLabel: "Deactivate", danger: true }))) return;
    }
    const fixed = code.trim().toUpperCase();
    if (!editing) setCode(fixed);
    const result = editing ? update(userId, editing.code, record) : add(userId, { ...record, code: fixed });
    if (!result.ok) {
      if (result.field === "code" || result.field === "name") setError({ field: result.field, text: result.error });
      else toast(result.error, "danger");
      return;
    }
    toast(editing ? "Department saved." : "Department added.", "success");
    onDone();
  };

  return (
    <form id="dept-form" className="ds-form-grid" onSubmit={save} noValidate={false}>
      <Field id="dept-name" label="Name" required error={error?.field === "name" ? error.text : null}>
        <Input id="dept-name" type="text" placeholder="e.g. Marketing" required value={name} error={error?.field === "name" ? error.text : null} onChange={(e) => { setName(e.target.value); setError(null); }} />
      </Field>
      <Field id="dept-code" label="Code" required hint="2 to 4 capital letters. Can't be changed later." error={error?.field === "code" ? error.text : null}>
        <Input id="dept-code" type="text" placeholder="e.g. MKT" autoComplete="off" required disabled={Boolean(editing)} value={code} hint="2 to 4 capital letters. Can't be changed later."
          error={error?.field === "code" ? error.text : null} onChange={(e) => { setCode(e.target.value); setError(null); }} onBlur={() => setCode((c) => c.trim().toUpperCase())} />
      </Field>
      <Field id="dept-head" label="Head">
        <Select id="dept-head" placeholder="No head" options={heads} value={head} onChange={(e) => setHead(e.target.value)} />
      </Field>
      <div className="ds-field">
        <span className="ds-field__label">Status</span>
        <Switch id="dept-active" label="Active" checked={active} onChange={setActive} />
      </div>
    </form>
  );
}

function Content() {
  const canCreate = useCan("departments:create"), canEdit = useCan("departments:edit");
  const toast = useToast();
  const departments = useData(() => getAllDepartments());
  const counts = useData(() => headcountByDepartment());
  const [modal, setModal] = useState(null);   // null | { editing: dept | null }

  const employees = Object.values(counts).reduce((s, n) => s + n, 0);
  const headless = departments.filter((d) => !d.head).length;
  const average = departments.length ? Math.round((employees / departments.length) * 10) / 10 : 0;
  const largest = departments.reduce((best, d) => ((counts[d.code] ?? 0) > (counts[best?.code] ?? 0) ? d : best), null);
  const openEdit = (code) => {
    const dept = getDepartment(code);
    if (!dept) { toast("That department no longer exists.", "danger"); return; }
    setModal({ editing: dept });
  };

  return (
    <>
      <PageHeader title="Departments" subtitle="How the company is organised, and who leads each team"
        breadcrumb={[{ label: "Users", to: pageUrl("users/users-list.html") }, { label: "Departments" }]}
        actions={<>
          <Link className="ds-btn" to={pageUrl("access/designations.html")}>Designations</Link>
          {canCreate && <button type="button" className="ds-btn ds-btn--primary" onClick={() => setModal({ editing: null })}><Icon d={PLUS} />Add department</button>}
        </>} />
      <div className="ds-stack">
        <div className="ds-grid" role="group" aria-label="Key numbers">
          <Stat id="departments" label="Departments" value={String(departments.length)} note={departments.length ? (headless ? `${headless} ${headless === 1 ? "has" : "have"} no head` : "All have a head") : ""} />
          <Stat id="employees" label="Employees" value={String(employees)} />
          <Stat id="open" label="Open positions" value="—" />
          <Stat id="average" label="Average team size" value={departments.length ? String(average) : "—"} note={largest ? `Largest is ${largest.name}` : ""} />
        </div>
        <section className="ds-cards" aria-label="All departments">
          {departments.map((d) => (
            <article className="ds-card dept-card" key={d.code} data-dept={d.code}>
              <div className="ds-card__header">
                <div><h3 className="ds-card__title">{d.name}</h3><span className="ds-card__meta">{d.code}</span></div>
                <Pill tone={d.active === false ? "" : "success"}>{d.active === false ? "Inactive" : "Active"}</Pill>
              </div>
              <div className="ds-card__body ds-stack">
                <Person name={d.head || "No head assigned"} sub="Department head" />
                <dl className="ds-kv">
                  <div><dt>Employees</dt><dd>{String(counts[d.code] ?? 0)}</dd></div>
                  <div><dt>Open roles</dt><dd>—</dd></div>
                </dl>
              </div>
              <div className="ds-card__footer ds-form-actions">
                <Link to={`${pageUrl("users/users-list.html")}?dept=${encodeURIComponent(d.code)}`}>View people</Link>
                {canEdit && <button type="button" className="ds-btn ds-btn--sm" onClick={() => openEdit(d.code)}>Edit</button>}
              </div>
            </article>
          ))}
        </section>
        <p className="ds-note">Editing a department's head does not currently change any approval chains.</p>
      </div>
      <Modal open={Boolean(modal)} onClose={() => setModal(null)} id="dept-modal" title={modal?.editing ? "Edit department" : "Add department"}
        desc={modal?.editing ? "The code can't be changed, because employees are linked to it." : "Create a new department. The code is used on employee records."}
        footer={<><button type="button" className="ds-btn" onClick={() => setModal(null)}>Cancel</button><button type="submit" form="dept-form" className="ds-btn ds-btn--primary">Save</button></>}>
        {modal && <DeptForm key={modal.editing?.code ?? "new"} editing={modal.editing} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}

export default function Departments() {
  return <Frame page={PAGE}><Content /></Frame>;
}