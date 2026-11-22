// users/user-form.html (L1), built in the design system. What the old page (pages/user-form.js) does, in its words:
// Add employee, or Edit employee with ?id= ("Employee not found" for an id that isn't one); dropdowns from live data
// (departments, designations: one carrying the Admin role only for an Admin, managers by id: active people but the
// employee); the default role follows the designation; Access summary and Effective permissions follow every change;
// permission overrides (round 11R: Admin only, not on your own record, nothing for an Admin); Account active only when
// editing; saving through addUser / updateUser, the email's error at the field, any other in a toast; "Employee saved."
// then the list. New (L1): the employee's Office (offices:manage, Admin) and whether they may check in from home
// (users:edit, HR / Admin), both saved after the employee.
// E0: the same fields, in sections: Personal details, Contact details, Employment, Pay and tax, Role and access, then
// Review. A section list on the left (a stepper on top on a phone) with the progress and how many sections have errors;
// Next checks the section it leaves (errors under the fields, focus on the first); Back; any section by its name; Review
// shows every value with an Edit link to its section, then Create employee. Editing saves from any section (Save
// changes). ?section=<key> opens a section (the profile's Edit links). Leaving with unsaved changes asks first.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useSearchParams } from "react-router-dom";
import { getUser, getAllUsers, addUser, updateUser, peekNextId, getAllDepartments } from "../../../assets/js/data/store.js";
import { newSignIn } from "../../../assets/js/data/it-desk.js";   // IT1: an Admin makes sign-in details directly; HR's go to IT as a request
import { DESIGNATIONS } from "../../../assets/js/data/users.js";
import { ROLES, OVERRIDABLE, overridesOf, permissionsOf } from "../../../assets/js/config/roles.js";
import { ALL_PERMISSIONS } from "../../../assets/js/config/permissions.js";
import { approvalChainFor } from "../../../assets/js/data/leave-store.js";
import { getOffices, officeIdOf, setEmployeeOffice } from "../../../assets/js/data/offices-store.js";
import { isHomeEligible, setHomeEligible } from "../../../assets/js/data/locations-store.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl } from "../routes.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { EmptyState, NotBuilt } from "../components/Basics.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Field, Input, Select, Switch, Kv, initialsOf } from "../components/Form.jsx";
import "../design/sections.css";
import { leavePolicyOn, bandText } from "../ui/leaveband.jsx";
import { SECTIONS, RULES as FIELD_RULES } from "../../../assets/js/config/employee-fields.js";
import { bankFromIfsc } from "../../../assets/js/config/ifsc-banks.js";   // F2
import { profileView, saveFields } from "../../../assets/js/data/employee-record.js";   // F2
import { ShareDetails } from "../ui/profile.jsx";
import { Avatar, PhotoEditor } from "../ui/files.jsx";   // FS1: Upload photo (was NotBuilt since F2)

const PAGE = "users/user-form.html";
const LIST = pageUrl("users/users-list.html");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toInputDate = (text) => {
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = String(text).match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return month === -1 ? "" : `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};
// F2: a new employee saved with the joining date left empty joins on the day they are added (never as if long-serving)
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const toDisplayDate = (iso) => { const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ""; };
const withValue = (list, value, label = value) => (value && !list.some((o) => o[0] === value) ? [...list, [value, label]] : list);
export const OVERRIDES_HINT = "Applied on top of the default role, everywhere the app checks: extra permissions are added, denied ones taken away. Only an Admin can change them, and not on their own record. Approvals, dashboards, Admin-only powers, managing people and everyone's own pages stay with the role.";

// The sections, in order; a section only shows when it has fields (all of these do today). E1: defined once, in
// config/employee-fields.js, which the profile reads too.
export { SECTIONS };
const sectionIndex = (key) => Math.max(0, SECTIONS.findIndex((s) => s.key === key));
// The rules the old page's form held (required fields, an email address): each one's section, field and words.
const RULES = [
  ["first-name", "personal", (f) => (f.first.trim() ? "" : "Enter the first name.")],
  ["last-name", "personal", (f) => (f.last.trim() ? "" : "Enter the last name.")],
  ["work-email", "contact", (f) => (!f.email.trim() ? "Enter the work email." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "" : "Enter a valid email address, like name@northwind.com.")],
  ["department", "employment", (f) => (f.department ? "" : "Choose a department.")],
  ["designation", "employment", (f) => (f.designation ? "" : "Choose a designation.")],
  // F2: bank and statutory details, checked when they change (a value already on file isn't re-judged)
  ["bank-account", "pay", (f) => payCheck(f, "bank", "account")],
  ["bank-confirm", "pay", (f) => (f.bank.trim() && f.bank.trim() !== f.was.bank && f.bank.replace(/\s/g, "") !== f.bankConfirm.replace(/\s/g, "") ? "The two account numbers don't match. Type it again." : "")],
  ["ifsc", "pay", (f) => ([f.bank, f.bankName, f.branch, f.holder].some((v) => v.trim()) && !f.ifsc.trim() && ["bank", "bankName", "branch", "holder", "ifsc"].some((k) => f[k].trim() !== f.was[k]) ? "Enter the IFSC: it's needed whenever bank details are entered." : payCheck(f, "ifsc", "ifsc"))],
  ["pan", "pay", (f) => payCheck(f, "pan", "pan")],
  ["aadhaar", "pay", (f) => payCheck(f, "aadhaar", "aadhaar")],
];
// a changed value against the employee record's rule (config/employee-fields.js RULES); "" when it passes, is empty or unchanged
function payCheck(f, key, rule) {
  const v = f[key].trim();
  if (!v || v === f.was[key]) return "";
  const clean = key === "pan" || key === "ifsc" ? v.toUpperCase().replace(/\s/g, "") : key === "bank" ? v.replace(/\s/g, "") : v;
  const [test, words] = FIELD_RULES[rule];
  return test(clean) ? "" : words;
}
const problemsOf = (f) => Object.fromEntries(RULES.map(([id, section, rule]) => [id, { section, text: rule(f) }]).filter(([, p]) => p.text));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Form({ editing, editId, startAt }) {
  const { role, userId } = useSession();
  const byRole = role?.key;
  const [photoOpen, setPhotoOpen] = useState(false);   // FS1
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const canCreate = useCan("users:create"), canManageOffices = useCan("offices:manage"), canEditPeople = useCan("users:edit");
  const departments = useData(() => getAllDepartments());
  const users = useData(() => getAllUsers());
  const offices = useData(() => getOffices());
  const [first, ...rest] = String(editing?.name ?? "").split(" ");
  const managerKey0 = editing ? editing.reportingManagerId ?? (editing.reportingManager ? `name:${editing.reportingManager}` : "") : "";
  // F2: the record's bank fields as this person sees them (Aadhaar is masked: left empty, it keeps the one on file)
  const [onFile] = useState(() => {
    const view = editing ? profileView(userId, editing.id) : null;
    const v = Object.fromEntries((view?.sections ?? []).flatMap((s) => s.fields).map((x) => [x.key, x.masked ? "" : String(x.value ?? "")]));
    return { ifsc: v.ifsc ?? "", bankName: v.bankName ?? "", branch: v.branch ?? "", holder: v.accountHolder ?? "", aadhaar: "", aadhaarOnFile: Boolean((view?.sections ?? []).flatMap((s) => s.fields).find((x) => x.key === "aadhaar")?.masked) };
  });
  const [f0] = useState(() => ({
    first: editing ? first : "", last: editing ? rest.join(" ") : "", email: editing?.email ?? "", phone: editing?.phone ?? "", dob: editing?.dob ?? "",
    bank: editing?.bankAccount ?? "", pan: editing?.pan ?? "", department: editing?.department ?? "", designation: editing?.designation ?? "",
    bankConfirm: "", ifsc: onFile.ifsc, bankName: onFile.bankName, branch: onFile.branch, holder: onFile.holder, aadhaar: "",
    was: { bank: editing?.bankAccount ?? "", pan: editing?.pan ?? "", ifsc: onFile.ifsc, bankName: onFile.bankName, branch: onFile.branch, holder: onFile.holder, aadhaar: "" },
    manager: managerKey0, joining: toInputDate(editing?.dateOfJoining), empType: editing?.employmentType || "Full-time", location: editing?.location || (offices.find((o) => o.type === "head") ?? offices[0])?.name || "Remote",
    active: editing ? editing.status !== "inactive" : true,
    office: editing ? officeIdOf(editing.id) : officeIdOf(null), home: editing ? isHomeEligible(editing.id) : false,
  }));
  const [f, setF] = useState(f0);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }));
  // F2: PAN and IFSC in capitals as typed; a new IFSC fills the bank name when it is empty or still names the old IFSC's bank
  const setUpper = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value.toUpperCase() }));
  const setIfsc = (e) => setF((s) => {
    const ifsc = e.target.value.toUpperCase(), named = bankFromIfsc(ifsc);
    return { ...s, ifsc, bankName: named && (!s.bankName.trim() || s.bankName === bankFromIfsc(s.ifsc)) ? named : s.bankName };
  });
  const [ticked0] = useState(() => ({ grant: new Set(overridesOf(editing).grants), deny: new Set(overridesOf(editing).denies) }));
  const [ticked, setTicked] = useState(ticked0);
  const [emailError, setEmailError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [share, setShare] = useState(null);   // E1: a new employee's sign-in details, shown once
  const [at, setAt] = useState(() => sectionIndex(startAt));
  const [checked, setChecked] = useState(() => new Set());   // the sections whose errors show (left by Next, or checked on save)
  const [visited, setVisited] = useState(() => new Set([sectionIndex(startAt)]));
  const focusNext = useRef(null);

  const deptOptions = withValue(departments.map((d) => [d.code, d.name]), editing?.department);
  const designations = DESIGNATIONS.filter((d) => d.defaultRole !== "admin" || byRole === "admin");
  const designationOptions = withValue(designations.map((d) => [d.title, d.title]), editing?.designation);
  const managerOptions = withValue(users.filter((u) => u.status === "active" && u.id !== editId).map((u) => [u.id, u.name]), managerKey0,
    getUser(editing?.reportingManagerId)?.name ?? editing?.reportingManager);
  const empTypes = withValue([["Full-time", "Full-time"], ["Contract", "Contract"], ["Intern", "Intern"]], editing?.employmentType);
  // F1: every active office from the offices store (not a written-in head office), then Remote; a saved value not in the list stays
  const locations = withValue([...offices.map((o) => [o.name, o.name]), ["Remote", "Remote"]], editing?.location);
  const officeOptions = offices.map((o) => [o.id, `${o.name}${o.state ? `, ${o.state}` : ""}`]);

  // The role saving would store: the designation's default role, else the employee's current one, else Employee.
  const roleOnSave = DESIGNATIONS.find((d) => d.title === f.designation)?.defaultRole ?? editing?.role ?? "emp";
  const lock = byRole !== "admin" ? "Only an Admin can change permission overrides." : editing && editing.id === userId ? "You can't change your own permission overrides."
    : roleOnSave === "admin" ? "An Admin holds every permission, so there's nothing to grant or deny." : "";
  const offered = (name) => (roleOnSave === "admin" ? [] : OVERRIDABLE.filter((p) => (ROLES[roleOnSave]?.permissions ?? []).includes(p) === (name === "deny")));
  const offeredTicked = (name) => offered(name).filter((p) => ticked[name].has(p));
  const effective = permissionsOf({ role: roleOnSave, grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") });
  const held = ROLES[roleOnSave]?.permissions ?? [];
  const chain = useMemo(() => approvalChainFor({ id: editing?.id ?? null, role: roleOnSave, reportingManagerId: f.manager.startsWith("name:") ? null : f.manager || null }), [editing, roleOnSave, f.manager]);
  const toggle = (name, perm) => setTicked((t) => { const next = new Set(t[name]); if (next.has(perm)) next.delete(perm); else next.add(perm); return { ...t, [name]: next }; });

  // ---------- errors, by section ----------
  const problems = problemsOf(f);
  const shown = Object.fromEntries(Object.entries(problems).filter(([, p]) => checked.has(p.section)).map(([id, p]) => [id, p.text]));
  if (emailError) shown["work-email"] = emailError;
  const errorsIn = (key) => Object.keys(shown).filter((id) => (RULES.find((r) => r[0] === id)?.[1] ?? "contact") === key).length;
  const sectionsWithErrors = SECTIONS.filter((s) => errorsIn(s.key) > 0).length;
  const err = (id) => shown[id] ?? null;

  // ---------- leaving with changes asks first ----------
  const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  const dirty = !saving && (JSON.stringify(f) !== JSON.stringify(f0) || !sameSet(ticked.grant, ticked0.grant) || !sameSet(ticked.deny, ticked0.deny));
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    confirm({ message: "Leave without saving?\nWhat you've entered for this employee will be lost.", confirmLabel: "Leave", cancelLabel: "Stay", danger: true })
      .then((leave) => (leave ? blocker.proceed() : blocker.reset()));
  }, [blocker.state]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---------- moving between sections ----------
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    const el = target ? document.getElementById(target) : null;
    if (!el) return;
    if (!el.matches("input, select, textarea, button, a[href], [tabindex]")) el.setAttribute("tabindex", "-1");   // a section's heading
    el.focus();
  });
  // on a phone the stepper scrolls sideways: keep the current section's name in view
  useEffect(() => { document.querySelector('.uf-step[aria-current="step"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" }); }, [at]);
  const go = (i, focusId = `section-${SECTIONS[i].key}-title`) => { setAt(i); setVisited((v) => new Set([...v, i])); focusNext.current = focusId; };
  const firstError = (key, list = problems) => RULES.find(([id, section]) => section === key && (list[id] || (id === "work-email" && emailError)))?.[0];
  const next = () => {
    const key = SECTIONS[at].key;
    setChecked((c) => new Set([...c, key]));
    const bad = firstError(key);
    if (bad) { focusNext.current = bad; setAt(at); return; }
    go(Math.min(at + 1, SECTIONS.length - 1));
  };

  const save = (e) => {
    e.preventDefault();
    setChecked(new Set(SECTIONS.map((s) => s.key)));
    const firstBad = RULES.find(([id]) => problems[id]);
    if (firstBad) { go(sectionIndex(firstBad[1]), firstBad[0]); return; }
    setEmailError(null);
    let status = editing?.status ?? "active";
    if (editing) status = f.active ? (status === "inactive" ? "active" : status) : "inactive";
    const account = f.bank.trim().replace(/\s+/g, " "), digits = account.replace(/\D/g, "");
    const manager = f.manager.startsWith("name:") ? { reportingManager: f.manager.slice(5) }
      : { reportingManagerId: f.manager || null, reportingManager: f.manager ? (managerOptions.find((o) => o[0] === f.manager)?.[1] ?? "") : "" };
    const overrides = byRole !== "admin" || (editing && editing.id === userId) ? {} : { grantPermissions: offeredTicked("grant"), denyPermissions: offeredTicked("deny") };
    const record = {
      name: `${f.first.trim()} ${f.last.trim()}`, email: f.email.trim(), department: f.department, designation: f.designation, role: roleOnSave, status,
      phone: f.phone.trim(), dob: f.dob, dateOfJoining: toDisplayDate(f.joining || (editing ? "" : todayIso())), employmentType: f.empType, location: f.location,
      ...manager, ...overrides, bankAccount: account || null, bankAccountLast4: digits ? digits.slice(-4) : null, pan: f.pan.trim().toUpperCase() || null,
    };
    const result = editing ? updateUser(userId, editing.id, record) : addUser(userId, record);
    if (!result.ok) {
      if (result.field === "email") { setEmailError(result.error); go(sectionIndex("contact"), "work-email"); }
      else toast(result.error, "danger");
      return;
    }
    // L1: the office and home check-in, after the employee (each by its own permission; unchanged ones aren't sent)
    const id = result.record.id;
    // F2: the record's bank fields (IFSC, bank name, branch, holder) and Aadhaar, after the employee, only the ones that changed
    const recordChanges = Object.fromEntries([["ifsc", f.ifsc.trim()], ["bankName", f.bankName.trim()], ["branch", f.branch.trim()], ["accountHolder", f.holder.trim()]]
      .filter(([k, v]) => v !== f.was[k === "accountHolder" ? "holder" : k]));
    if (f.aadhaar.trim()) recordChanges.aadhaar = f.aadhaar.trim();
    if (Object.keys(recordChanges).length) { const rr = saveFields(userId, id, recordChanges); if (!rr.ok) toast(rr.error, "danger"); }
    if (canManageOffices && f.office && f.office !== officeIdOf(id)) setEmployeeOffice(userId, id, f.office);
    if (canEditPeople && f.home !== isHomeEligible(id)) setHomeEligible(userId, id, f.home);
    bump();
    setSaving(true);
    toast("Employee saved.", "success");
    // E1: someone new gets sign-in details (a temporary password and a set-password link), shown once, then the list.
    // IT1: only when an Admin adds them (the direct flow, flagged on the IT review trail); HR's addition opens a new-account request:
    // IT prepares it, the Admin approves, IT hands the details over.
    if (!editing) {
      newSignIn(userId, id).then((r) => {
        if (!r.ok) { toast(r.error, "danger"); setTimeout(() => navigate(LIST), 1200); return; }
        bump();
        if (r.requested) { toast("IT will make the sign-in details once an Admin approves them.", "info"); setTimeout(() => navigate(LIST), 1200); return; }
        setShare({ name: result.record.name, details: r });
      });
      return;
    }
    setTimeout(() => navigate(LIST), 1200);
  };

  // ---------- Review: every value, read-only ----------
  const label = (list, v) => list.find((o) => o[0] === v)?.[1] ?? "";
  const shownValue = (v) => (v === "" || v == null ? <span className="ds-hint">Not given</span> : v);
  const review = {
    personal: [["First name", f.first.trim()], ["Last name", f.last.trim()], ["Date of birth", toDisplayDate(f.dob)], ["Employee ID", editing ? editing.id : peekNextId()]],
    contact: [["Work email", f.email.trim()], ["Phone", f.phone.trim()]],
    employment: [["Department", label(deptOptions, f.department)], ["Designation", f.designation], ["Reporting manager", label(managerOptions, f.manager)], ["Date of joining", f.joining || editing ? toDisplayDate(f.joining) : `${toDisplayDate(todayIso())} (today)`],
      ["Employment type", f.empType], ["Work location", f.location], ["Office", label(officeOptions, f.office)], ["Home check-in", f.home ? "Can check in from home" : "Office only"]],
    pay: [["Bank account number", f.bank.trim()], ["IFSC", f.ifsc.trim()], ["Bank name", f.bankName.trim()], ["Branch", f.branch.trim()], ["Account holder's name", f.holder.trim()], ["PAN", f.pan.trim().toUpperCase()],
      ["Aadhaar", f.aadhaar.trim() ? `•••• •••• ${f.aadhaar.replace(/\s/g, "").slice(-4)}` : onFile.aadhaarOnFile ? "On file" : ""]],
    access: [["Default role", ROLES[roleOnSave]?.label ?? roleOnSave], ["Extra permissions", offeredTicked("grant").join(", ") || "None"], ["Denied permissions", offeredTicked("deny").join(", ") || "None"],
      ...(editing ? [["Account", f.active ? "Active" : "Inactive"]] : [])],
  };

  const cur = SECTIONS[at].key;
  const onReview = cur === "review";
  const sectionCard = (key, children) => {
    const s = SECTIONS[sectionIndex(key)];
    return (
      <div className="uf-section" data-section={key} hidden={cur !== key || undefined}>
        <Card id={`section-${key}`} title={s.title} meta={`Step ${sectionIndex(key) + 1} of ${SECTIONS.length}`}>
          <p className="ds-hint uf-section__desc">{s.desc}</p>
          {children}
        </Card>
      </div>
    );
  };

  return (
    <div className="uf">
      {share && <ShareDetails name={share.name} details={share.details} onClose={() => navigate(LIST)} />}
      <nav className="uf-steps ds-card" aria-label="Form sections">
        <p className="uf-steps__now" id="uf-progress-text">{`Step ${at + 1} of ${SECTIONS.length}: ${SECTIONS[at].title}`}</p>
        <div className="uf-steps__bar" role="progressbar" aria-labelledby="uf-progress-text" aria-valuemin={1} aria-valuemax={SECTIONS.length} aria-valuenow={at + 1}>
          <span style={{ width: `${((at + 1) / SECTIONS.length) * 100}%` }} />
        </div>
        <p className="uf-steps__errors" id="uf-errors" role="status" aria-live="polite">{sectionsWithErrors ? `${plural(sectionsWithErrors, "section needs", "sections need")} attention` : ""}</p>
        <ol className="uf-steps__list">
          {SECTIONS.map((s, i) => {
            const n = errorsIn(s.key), done = visited.has(i) && i !== at && !n && checked.has(s.key);
            return (
              <li key={s.key}>
                <button type="button" className={`uf-step${i === at ? " is-current" : ""}${n ? " has-errors" : ""}${done ? " is-done" : ""}`} aria-current={i === at ? "step" : undefined}
                  data-step={s.key} onClick={() => go(i)}>
                  <span className="uf-step__num" aria-hidden="true">{done ? "✓" : i + 1}</span>
                  <span className="uf-step__title">{s.title}</span>
                  {n > 0 && <span className="uf-step__err">{plural(n, "error", "errors")}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <form className="ds-form uf-main" onSubmit={save} id="user-form" noValidate>
        {sectionCard("personal", <>
          <div className="ds-person">
            {editing ? <Avatar userId={editing.id} name={editing.name} cls="ds-avatar ds-avatar--xl" /> : <span className="ds-avatar ds-avatar--xl" aria-hidden="true">{initialsOf(`${f.first} ${f.last}`.trim())}</span>}
            <div className="ds-stack" style={{ gap: 6 }}>
              {editing ? <button type="button" className="ds-btn ds-btn--sm" id="upload-photo-btn" onClick={() => setPhotoOpen(true)}>Upload photo</button> : null}
              <p className="ds-hint">{editing ? "JPG or PNG, up to 2 MB." : "Add the photo once the employee is created (JPG or PNG, up to 2 MB)."}</p>
              {editing ? <PhotoEditor userId={editing.id} open={photoOpen} onClose={() => setPhotoOpen(false)} /> : null}
            </div>
          </div>
          <div className="ds-form-grid">
            <Field id="first-name" label="First name" required error={err("first-name")}><Input id="first-name" type="text" placeholder="Sneha" required value={f.first} error={err("first-name")} onChange={set("first")} /></Field>
            <Field id="last-name" label="Last name" required error={err("last-name")}><Input id="last-name" type="text" placeholder="Rao" required value={f.last} error={err("last-name")} onChange={set("last")} /></Field>
            <Field id="dob" label="Date of birth"><Input id="dob" type="date" value={f.dob} onChange={set("dob")} /></Field>
            <Field id="emp-id" label="Employee ID" hint="Generated automatically."><Input id="emp-id" type="text" disabled value={editing ? editing.id : peekNextId()} hint="Generated automatically." /></Field>
          </div>
        </>)}
        {sectionCard("contact", (
          <div className="ds-form-grid">
            <Field id="work-email" label="Work email" required error={err("work-email")}><Input id="work-email" type="email" placeholder="name@northwind.com" required value={f.email} error={err("work-email")} onChange={(e) => { set("email")(e); setEmailError(null); }} /></Field>
            <Field id="phone" label="Phone"><Input id="phone" type="tel" placeholder="+91 98765 43210" value={f.phone} onChange={set("phone")} /></Field>
          </div>
        ))}
        {sectionCard("employment", <>
          <div className="ds-form-grid">
            <Field id="department" label="Department" required error={err("department")}><Select id="department" required placeholder="Select department" options={deptOptions} value={f.department} error={err("department")} onChange={set("department")} /></Field>
            <Field id="designation" label="Designation" required hint="The designation sets the default role." error={err("designation")}><Select id="designation" required placeholder="Select designation" options={designationOptions} value={f.designation} hint="The designation sets the default role." error={err("designation")} onChange={set("designation")} /></Field>
            <Field id="manager" label="Reporting manager"><Select id="manager" placeholder="No reporting manager" options={managerOptions} value={f.manager} onChange={set("manager")} /></Field>
            <Field id="joining" label="Date of joining"><Input id="joining" type="date" value={f.joining} onChange={set("joining")} /></Field>
            <Field id="emp-type" label="Employment type" hint={leavePolicyOn() && editing ? `Leave band: ${bandText(editing.id)}. It follows the employment type and the joining date.` : undefined}><Select id="emp-type" options={empTypes} value={f.empType} onChange={set("empType")} /></Field>
            <Field id="location" label="Work location"><Select id="location" options={locations} value={f.location} onChange={set("location")} /></Field>
          </div>
          <h3 className="ds-form-section__title" id="s-office">Office and check-in places</h3>
          <div className="ds-form-grid">
            <Field id="office" label="Office" hint={canManageOffices ? "Check-ins are measured from this office." : "Only an Admin can change someone's office."}>
              <Select id="office" disabled={!canManageOffices} options={officeOptions} value={f.office ?? ""}
                hint={canManageOffices ? "Check-ins are measured from this office." : "Only an Admin can change someone's office."} onChange={set("office")} />
            </Field>
            <div className="ds-field">
              <span className="ds-field__label">Home check-in</span>
              <Switch id="home-eligible" label="Can check in from home" checked={f.home} disabled={!canEditPeople} onChange={set("home")} describedBy="home-eligible-hint" />
              <span className="ds-field__helper" id="home-eligible-hint">{canEditPeople ? "They can then set a permanent and a temporary home once each; changes need an Admin's approval." : "Only HR or an Admin can change this."}</span>
            </div>
          </div>
        </>)}
        {sectionCard("pay", (
          <>
          <p className="ds-note" id="pay-entered">Bank, PAN and Aadhaar details are entered by hand here. OfficeOS doesn't fetch or verify them with the bank or the tax department.</p>
          <div className="ds-form-grid">
            <Field id="bank-account" label="Bank account number" error={err("bank-account")} hint="9 to 18 digits."><Input id="bank-account" type="text" inputMode="numeric" autoComplete="off" placeholder="e.g. 9024 5713 7305" value={f.bank} error={err("bank-account")} hint="9 to 18 digits." onChange={set("bank")} /></Field>
            <Field id="bank-confirm" label="Confirm bank account number" error={err("bank-confirm")} hint={f.bank.trim() && f.bank.trim() !== f.was.bank ? "Type the account number again." : undefined}><Input id="bank-confirm" type="text" inputMode="numeric" autoComplete="off" value={f.bankConfirm} error={err("bank-confirm")} disabled={!f.bank.trim() || f.bank.trim() === f.was.bank} onPaste={(e) => e.preventDefault()} onChange={set("bankConfirm")} /></Field>
            <Field id="ifsc" label="IFSC" error={err("ifsc")} hint="Needed with bank details, like SBIN0001234. The bank name fills in from it."><Input id="ifsc" type="text" autoComplete="off" placeholder="SBIN0001234" maxLength={11} value={f.ifsc} error={err("ifsc")} hint="Needed with bank details, like SBIN0001234. The bank name fills in from it." onChange={setIfsc} /></Field>
            <Field id="bank-name" label="Bank name" hint={f.ifsc.trim().length >= 4 && !bankFromIfsc(f.ifsc) ? "This IFSC's bank isn't in our list: type the bank's name." : undefined}><Input id="bank-name" type="text" autoComplete="off" value={f.bankName} onChange={set("bankName")} /></Field>
            <Field id="branch" label="Branch" hint="Typed by hand: branch lookup arrives with the backend."><Input id="branch" type="text" autoComplete="off" value={f.branch} hint="Typed by hand: branch lookup arrives with the backend." onChange={set("branch")} /></Field>
            <Field id="account-holder" label="Account holder's name"><Input id="account-holder" type="text" autoComplete="off" value={f.holder} onChange={set("holder")} /></Field>
            <Field id="pan" label="PAN" error={err("pan")} hint="Like ABCPE1234F; the 4th letter is P for a person."><Input id="pan" type="text" autoComplete="off" placeholder="ABCPE1234F" maxLength={10} value={f.pan} error={err("pan")} hint="Like ABCPE1234F; the 4th letter is P for a person." onChange={setUpper("pan")} /></Field>
            <Field id="aadhaar" label="Aadhaar" error={err("aadhaar")} hint={onFile.aadhaarOnFile ? "On file and hidden. Leave empty to keep it." : "12 digits."}><Input id="aadhaar" type="text" inputMode="numeric" autoComplete="off" maxLength={14} value={f.aadhaar} error={err("aadhaar")} hint={onFile.aadhaarOnFile ? "On file and hidden. Leave empty to keep it." : "12 digits."} onChange={set("aadhaar")} /></Field>
          </div>
          </>
        ))}
        {sectionCard("access", <>
          <div className="ds-form-grid">
            <Field id="default-role" label="Default role" hint="Comes from the designation. Change the designation to change this."><Input id="default-role" type="text" disabled value={ROLES[DESIGNATIONS.find((d) => d.title === f.designation)?.defaultRole]?.label ?? ""} hint="Comes from the designation. Change the designation to change this." /></Field>
          </div>
          <h3 className="ds-form-section__title">Permission overrides</h3>
          <p className="ds-hint">{OVERRIDES_HINT}</p>
          {lock && <p className="ds-note ds-note--warning" id="overrides-reason">{lock}</p>}
          {["grant", "deny"].map((name) => (
            <fieldset key={name} className="ds-field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="ds-field__label">{name === "grant" ? "Extra permissions" : "Denied permissions"}</legend>
              <div className="ds-checks" id={`${name}-options`}>
                {offered(name).length ? offered(name).map((perm) => (
                  <label className="ds-check" key={perm} title={lock}>
                    <input type="checkbox" name={name} value={perm} checked={ticked[name].has(perm)} disabled={Boolean(lock)} onChange={() => toggle(name, perm)} />{perm}
                  </label>
                )) : <span className="ds-hint">None</span>}
              </div>
            </fieldset>
          ))}
          {editing && (
            <div className="ds-field">
              <span className="ds-field__label">Account</span>
              <Switch id="account-active" label="Account active" checked={f.active} onChange={set("active")} />
            </div>
          )}
        </>)}
        {sectionCard("review", (
          <div className="uf-review" id="review">
            {SECTIONS.filter((s) => review[s.key]).map((s) => (
              <section key={s.key} className="uf-review__group" aria-labelledby={`review-${s.key}`}>
                <div className="uf-review__head">
                  <h3 className="ds-form-section__title" id={`review-${s.key}`}>{s.title}</h3>
                  <button type="button" className="ds-btn ds-btn--sm" data-edit={s.key} aria-label={`Edit ${s.title.toLowerCase()}`} onClick={() => go(sectionIndex(s.key))}>Edit</button>
                </div>
                {errorsIn(s.key) > 0 && <p className="ds-field__error">{`${plural(errorsIn(s.key), "error", "errors")} to fix in this section.`}</p>}
                <Kv rows={review[s.key].map(([k, v]) => [k, shownValue(v)])} />
              </section>
            ))}
          </div>
        ))}
        <div className="ds-form-actions uf-actions">
          <span className="ds-hint">Fields marked * are required.</span>
          <div className="ds-form-actions__buttons">
            <Link className="ds-btn" to={LIST}>Cancel</Link>
            {at > 0 && <button type="button" className="ds-btn" id="uf-back" onClick={() => go(at - 1)}>Back</button>}
            {!onReview && <button type="button" className={`ds-btn${editing ? "" : " ds-btn--primary"}`} id="uf-next" onClick={next}>{at === SECTIONS.length - 2 ? "Next: Review" : "Next"}</button>}
            {canCreate && (onReview || editing) && <button className="ds-btn ds-btn--primary" type="submit" disabled={saving}>{editing ? "Save changes" : "Create employee"}</button>}
          </div>
        </div>
      </form>
      <aside className="ds-stack uf-aside">
        <Card id="access-summary" title="Access summary">
          <Kv rows={[["Designation", f.designation || "—"], ["Default role", <Pill tone="info">{ROLES[roleOnSave]?.label ?? roleOnSave}</Pill>],
            ["Data scope", ROLES[roleOnSave]?.scopeLabel ?? ROLES.emp.scopeLabel], ["Approval chain", chain], ["Two-factor sign-in", "Not recorded yet", { muted: true }]]} />
        </Card>
        <Card id="effective" title="Effective permissions" meta={<span id="effective-count">{String(effective.length)}</span>}
          footer="What the app checks: the default role's permissions, plus the extra ones, minus the denied ones. Updates as you change the designation or the overrides.">
          <div className="ds-chips" id="effective-permissions">
            {effective.length === ALL_PERMISSIONS.length ? <span className="ds-hint">{`Every permission (${effective.length})`}</span>
              : effective.map((p) => <span key={p} className={`ds-chip${held.includes(p) ? "" : " ds-chip--granted"}`} title={held.includes(p) ? undefined : "Granted to this person"}>{p}</span>)}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Content() {
  const [params] = useSearchParams();
  const editId = params.get("id");
  const editing = editId ? getUser(editId) : null;
  const notFound = Boolean(editId && !editing);
  const heading = editId ? "Edit employee" : "Add employee";
  // after the route's own title (RequireRoute's layout effect: the page's static title), as the old script set it on load
  useEffect(() => { document.title = tabTitle(notFound ? "Employee not found" : editing ? "Edit employee" : "Add employee"); });
  return (
    <>
      <PageHeader title={heading} subtitle={notFound ? null : editing ? "Change this person's details, section by section. Saved changes apply straight away." : "Create the account, choose a designation, and the role is set for you."}
        breadcrumb={[{ label: "Users", to: LIST }, { label: notFound ? "Not found" : heading }]} />
      {notFound
        ? <Card id="not-found"><EmptyState title="Employee not found" text={`There's no employee with ID ${editId}. They may have been deleted, or the link is wrong.`} to={LIST} linkText="Back to users" /></Card>
        : <Form key={editId ?? "new"} editing={editing} editId={editId} startAt={params.get("section")} />}
    </>
  );
}

export default function UserForm() {
  return <Frame page={PAGE}><Content /></Frame>;
}