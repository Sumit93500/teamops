// E1: the whole employee record on a profile, in the form's five sections (config/employee-fields.js, the one list of
// fields), each a card with a view and an edit mode. What a viewer gets comes from data/employee-record.js profileView():
// a field they may not see isn't there at all (so it isn't in the page); a sensitive one is masked (last 4) with Show for
// whoever may see it in full (each Show is audited); Edit offers only the fields they may change; their own bank or tax
// change is "Ask for a change" (Finance or HR decides, through the approval card). Lists (emergency contacts, dependants,
// previous employment, education, skills, documents) are rows to add and remove. Also here: the profile's completeness and
// change history (HR / Admin), the sign-in account's card and its events.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { profileView, revealField, saveFields, requestChange, profileChangesFor, changeText, historyFor, completeness } from "../../../assets/js/data/employee-record.js";
import { bankFromIfsc } from "../../../assets/js/config/ifsc-banks.js";   // F2
import { accountOf, createAccount, issueReset, unlockAccount, setSignInEnabled } from "../../../assets/js/data/credentials.js";
import { eventsFor, AUDIT_LABEL } from "../../../assets/js/data/audit-trail.js";
import { nameOf } from "../../../assets/js/ui/leave-view.js";
import { rupees } from "../../../assets/js/ui/money.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, MAIL_OUTBOX } from "../routes.js";
import { useToast } from "./Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Card, Pill } from "../components/Layout.jsx";
import { Field, Input, TextArea, initialsOf } from "../components/Form.jsx";
import { Avatar, PhotoEditor, DocFile } from "./files.jsx";   // FS1
import Modal from "../components/Modal.jsx";
import { openApprovalCard } from "./ApprovalCard.jsx";
import "../design/profile.css";

const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const blankRow = (columns) => Object.fromEntries(columns.map((c) => [c.key, ""]));
const empty = (v) => v === "" || v == null || (Array.isArray(v) && !v.length);

// ---------- showing values ----------
function Masked({ userId, field }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const [full, setFull] = useState(null);
  const show = () => {
    const r = revealField(me, userId, field.key);
    if (!r.ok) { toast(r.error, "danger"); return; }
    setFull(r.value);
  };
  const text = full === null ? field.value : field.key === "salary" ? `${rupees(full)} a month` : String(full);
  return (
    <span className="ds-reveal" data-field={field.key}>
      <span className={full === null ? "masked" : undefined} data-masked={full === null ? "" : undefined}>{text}</span>
      {field.canReveal && <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" aria-label={`${full === null ? "Show" : "Hide"} ${field.label.toLowerCase()}`} onClick={() => (full === null ? show() : setFull(null))}>{full === null ? "Show" : "Hide"}</button>}
    </span>
  );
}

function Rows({ userId, field }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const [full, setFull] = useState(null);
  const rows = full ?? field.value;
  if (!rows.length) return <span className="is-muted">None added</span>;
  const show = () => { const r = revealField(me, userId, field.key); if (!r.ok) { toast(r.error, "danger"); return; } setFull(r.value); };
  return (
    <div className="pf-rows">
      <div className="pf-table-wrap">
        <table className="pf-table" data-list={field.key}>
          <thead><tr>{field.columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}{field.key === "documents" && <th scope="col">File</th>}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{field.columns.map((c) => <td key={c.key}>{c.kind === "yesno" ? (r[c.key] === "yes" ? "Yes" : "") : r[c.key] || ""}</td>)}{field.key === "documents" && <td><DocFile userId={userId} slot={i} docType={r.type} /></td>}</tr>)}</tbody>
        </table>
      </div>
      {field.masked && field.canReveal && <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" onClick={() => (full ? setFull(null) : show())}>{full ? "Hide numbers" : "Show numbers"}</button>}
    </div>
  );
}

// FS1: the photo, and Add / Change photo for the person and for users:edit (HR, Admin)
function PhotoValue({ userId }) {
  const { userId: me } = useSession();
  const canEdit = useCan("users:edit");
  const [open, setOpen] = useState(false);
  const mine = me === userId;
  return (
    <span className="pf-photo">
      <Avatar userId={userId} cls="ds-avatar ds-avatar--lg" />
      <span className="pf-photo__actions">
        {(mine || canEdit) && <button type="button" className="ds-btn ds-btn--sm" id="photo-edit-btn" onClick={() => setOpen(true)}>Add or change photo</button>}
        <span className="ds-hint">JPG or PNG, up to 2 MB. Seen by whoever can open this profile; initials show without one.</span>
      </span>
      <PhotoEditor userId={userId} open={open} onClose={() => setOpen(false)} />
    </span>
  );
}

function Value({ userId, field }) {
  if (field.kind === "photo") return <PhotoValue userId={userId} />;
  if (field.kind === "list") return <Rows userId={userId} field={field} />;
  if (empty(field.value)) return <span className="is-muted">Not given</span>;
  if (field.masked) return <Masked userId={userId} field={field} />;
  return <span className="pf-value">{String(field.value)}</span>;
}

// ---------- editing ----------
function RowsEditor({ field, rows, onChange, error }) {
  const set = (i, key, value) => onChange(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)));
  return (
    <fieldset className="pf-edit-rows" aria-describedby={error ? `pf-${field.key}-error` : undefined}>
      <legend className="ds-field__label">{field.label}</legend>
      {field.hint && <p className="ds-hint">{field.key === "documents" ? "The details here; add each document's file (PDF, JPG or PNG, up to 5 MB) from its row once saved." : field.hint}</p>}
      {rows.map((r, i) => (
        <div className="pf-edit-row" key={i} role="group" aria-label={`${field.label}, row ${i + 1}`}>
          {field.columns.map((c) => {
            const id = `pf-${field.key}-${i}-${c.key}`;
            return (
              <div className="ds-field" key={c.key}>
                <label className={`ds-field__label${c.required ? " ds-field__label--required" : ""}`} htmlFor={id}>{c.label}</label>
                {c.kind === "yesno" ? (
                  <label className="ds-check"><input id={id} type="checkbox" checked={r[c.key] === "yes"} onChange={(e) => set(i, c.key, e.target.checked ? "yes" : "")} />Nominee</label>
                ) : <div className="ds-control"><input id={id} type={c.kind === "date" ? "date" : c.kind === "month" ? "month" : "text"} value={r[c.key] ?? ""} onChange={(e) => set(i, c.key, e.target.value)} /></div>}
              </div>
            );
          })}
          <button type="button" className="ds-btn ds-btn--sm ds-btn--ghost pf-edit-row__remove" aria-label={`Remove ${field.label.toLowerCase()} row ${i + 1}`} onClick={() => onChange(rows.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="ds-btn ds-btn--sm" onClick={() => onChange([...rows, blankRow(field.columns)])} disabled={rows.length >= 20}>{`Add ${field.label.toLowerCase().replace(/s$/, "").replace(/ and nominee$/, "")}`}</button>
      {error && <span className="ds-field__error" id={`pf-${field.key}-error`} role="alert">{error}</span>}
    </fieldset>
  );
}

// F2: what a field does as it is typed: PAN and IFSC in capitals; a new IFSC fills the bank name (when it is empty or still names the
// old IFSC's bank); numbers get a number keyboard on a phone.
const UPPER = new Set(["pan", "ifsc"]);
const NUMERIC = new Set(["aadhaar", "bankAccount"]);
function typed(values, key, raw) {
  const v = UPPER.has(key) ? raw.toUpperCase() : raw;
  const next = { ...values, [key]: v };
  if (key === "ifsc" && "bankName" in values) {
    const named = bankFromIfsc(v);
    if (named && (!values.bankName || values.bankName === bankFromIfsc(values.ifsc))) next.bankName = named;
  }
  return next;
}

function EditForm({ userId, fields, mode, onClose, focus = null }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.kind === "list" ? f.value.map((r) => ({ ...r })) : f.masked ? "" : String(f.value ?? "")])));
  const [confirmAccount, setConfirmAccount] = useState("");   // F2: the account number typed twice
  const [error, setError] = useState(null);
  const first = useRef(null);
  useEffect(() => { (focus && first.current?.querySelector(`#pf-${focus}`) || first.current?.querySelector("input, textarea"))?.focus(); }, [focus]);
  const hasAccount = fields.some((f) => f.key === "bankAccount");
  const submit = (e) => {
    e.preventDefault();
    const digits = (s) => String(s ?? "").replace(/\s/g, "");
    if (hasAccount && digits(values.bankAccount) && digits(values.bankAccount) !== digits(confirmAccount)) { setError({ field: "bankAccountConfirm", text: "The two account numbers don't match. Type it again." }); return; }
    // a masked field left empty isn't sent (its value stays as it is)
    const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => !(fields.find((f) => f.key === k).masked && v === "")));
    const r = mode === "request" ? requestChange(me, changes) : saveFields(me, userId, changes);
    if (!r.ok) { setError({ field: r.field, text: r.error }); if (!r.field) toast(r.error, "danger"); return; }
    bump();
    toast(mode === "request" ? "Change asked for. Finance or HR decides it; you'll see it here." : r.changed?.length ? "Saved." : "Nothing changed.", "success");
    onClose();
  };
  return (
    <form className="pf-edit" noValidate onSubmit={submit} ref={first}>
      {mode === "request" && <p className="ds-note">Finance or HR checks a bank or tax change before it applies. Fill in only what changes.</p>}
      <div className="pf-edit__fields">
        {fields.map((f) => {
          const err = error?.field === f.key ? error.text : null;
          const id = `pf-${f.key}`;
          if (f.kind === "list") return <RowsEditor key={f.key} field={f} rows={values[f.key]} error={err} onChange={(rows) => { setValues({ ...values, [f.key]: rows }); setError(null); }} />;
          const hint = f.masked ? `${f.hint ? `${f.hint} ` : ""}Leave empty to keep the one on file.` : f.hint ?? undefined;   // F2: the field's own help stays
          return (
            <Field key={f.key} id={id} label={f.label} error={err} hint={hint} full={f.kind === "textarea"}>
              {f.kind === "textarea"
                ? <TextArea id={id} rows={3} value={values[f.key]} error={err} hint={hint} onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setError(null); }} />
                : <Input id={id} type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : "text"} value={values[f.key]} error={err} hint={hint} autoComplete="off"
                  inputMode={NUMERIC.has(f.key) ? "numeric" : undefined} onChange={(e) => { setValues(typed(values, f.key, e.target.value)); setError(null); }} />}
            </Field>
          );
        }).flatMap((node, i) => (fields[i].key !== "bankAccount" ? [node] : [node, (() => {
          const err = error?.field === "bankAccountConfirm" ? error.text : null;
          return (
            <Field key="bankAccountConfirm" id="pf-bankAccount-confirm" label="Confirm bank account" error={err} hint="Type the account number again.">
              <Input id="pf-bankAccount-confirm" type="text" inputMode="numeric" autoComplete="off" value={confirmAccount} error={err} hint="Type the account number again." onChange={(e) => { setConfirmAccount(e.target.value); setError(null); }} onPaste={(e) => e.preventDefault()} />
            </Field>
          );
        })()]))}
      </div>
      <div className="ds-form-actions__buttons">
        <button type="button" className="ds-btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="ds-btn ds-btn--primary">{mode === "request" ? "Ask for the change" : "Save changes"}</button>
      </div>
    </form>
  );
}

function Section({ userId, section, relation }) {
  const canForm = useCan("users:edit");
  const [mode, setMode] = useState(null);   // null | "direct" | "request"
  const [focus, setFocus] = useState(null);   // F2: the field Add opened the form at
  const direct = section.fields.filter((f) => f.edit === "direct" && f.kind !== "photo");
  const request = section.fields.filter((f) => f.edit === "request");
  // F2: filled fields first; the empty ones under "Not added (N)", collapsed, each with Add for whoever may fill it
  const filled = section.fields.filter((f) => !empty(f.value) || f.kind === "photo");   // FS1: the photo (or initials) always shows, with its button
  const missing = section.fields.filter((f) => empty(f.value) && f.kind !== "photo");
  const open = (m, key) => { setFocus(key); setMode(m); };
  const add = (f) => {
    const label = `Add ${f.label.toLowerCase()}`;
    if (direct.some((d) => d.key === f.key)) return <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" data-add={f.key} aria-label={label} onClick={() => open("direct", f.key)}>Add</button>;
    if (request.some((d) => d.key === f.key)) return <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" data-add={f.key} aria-label={`Ask to add ${f.label.toLowerCase()}`} onClick={() => open("request", f.key)}>Add</button>;
    if (formEdit) return <Link className="ds-btn ds-btn--ghost ds-btn--sm" data-add={f.key} aria-label={label} to={pageUrl(`users/user-form.html?id=${encodeURIComponent(userId)}&section=${section.key}`)}>Add</Link>;
    return null;
  };
  const row = (f) => <div key={f.key} data-kv={f.label} data-field={f.key} className={f.kind === "list" ? "pf-kv__wide" : undefined}><dt>{f.label}</dt><dd><Value userId={userId} field={f} /></dd></div>;
  const formEdit = canForm && relation === "people" && ["personal", "contact", "employment", "access"].includes(section.key);
  const actions = mode ? null : (
    <div className="ds-form-actions__buttons">
      {formEdit && <Link className="ds-btn ds-btn--sm ds-btn--ghost" data-edit-section={section.key} aria-label={`Edit ${section.title.toLowerCase()} in the employee form`} to={pageUrl(`users/user-form.html?id=${encodeURIComponent(userId)}&section=${section.key}`)}>Employee form</Link>}
      {request.length > 0 && <button type="button" className="ds-btn ds-btn--sm" id={`ask-${section.key}`} onClick={() => setMode("request")}>Ask for a change</button>}
      {direct.length > 0 && <button type="button" className="ds-btn ds-btn--sm" id={`edit-${section.key}`} aria-label={`Edit ${section.title.toLowerCase()}`} onClick={() => setMode("direct")}>Edit</button>}
    </div>
  );
  return (
    <Card id={`profile-${section.key}`} title={section.title} actions={actions} className="pf-section">
      {mode ? <EditForm userId={userId} fields={mode === "request" ? request : direct} mode={mode} focus={focus} onClose={() => { setMode(null); setFocus(null); }} />
        : (
          <>
            {filled.length > 0 ? <dl className="ds-kv pf-kv">{filled.map(row)}</dl> : <p className="ds-hint pf-none">Nothing added yet.</p>}
            {missing.length > 0 && (
              <details className="pf-missing" data-missing={section.key}>
                <summary>{`Not added (${missing.length})`}</summary>
                <ul className="pf-missing__list">
                  {missing.map((f) => <li key={f.key} data-field={f.key} data-empty=""><span>{f.label}</span>{add(f)}</li>)}
                </ul>
              </details>
            )}
          </>
        )}
    </Card>
  );
}

// The record's five sections, as this viewer may see them; null when they may see none of it.
export function ProfileRecord({ userId }) {
  const { userId: me } = useSession();
  const view = useData(() => profileView(me, userId), [me, userId]);
  if (!view) return null;
  return <>{view.sections.map((s) => <Section key={s.key} userId={userId} section={s} relation={view.relation} />)}</>;
}
export const viewOf = (me, userId) => profileView(me, userId);

// ---------- change requests ----------
export function ChangeRequests({ userId }) {
  const { userId: me } = useSession();
  const list = useData(() => profileChangesFor(userId).slice().reverse(), [userId]);
  if (!list.length) return null;
  const tone = { pending: "warning", approved: "success", rejected: "danger" };
  return (
    <Card id="profile-requests" title="Bank and tax change requests" meta={String(list.filter((r) => r.status === "pending").length)}>
      <ul className="pf-list">
        {list.map((r) => (
          <li key={r.id} data-request={r.id}>
            <div className="pf-list__head"><span>{changeText(r).map(([l, v]) => `${l}: ${v}`).join("; ")}</span><Pill tone={tone[r.status]}>{r.status === "pending" ? "Waiting" : r.status === "approved" ? "Approved" : "Rejected"}</Pill></div>
            <p className="ds-hint">{r.status === "pending" ? `Asked ${when(r.requestedAt)}` : `${r.status === "approved" ? "Approved" : "Rejected"} by ${nameOf(r.decidedBy)}, ${when(r.decidedAt)}${r.note ? `: ${r.note}` : ""}`}</p>
            {r.status === "pending" && me !== userId && <button type="button" className="ds-btn ds-btn--sm" onClick={(e) => openApprovalCard("profile", r.id, { opener: e.currentTarget, refresh: bump })}>Review</button>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------- completeness (HR / Admin) ----------
export function Completeness({ userId }) {
  const c = useData(() => completeness(userId), [userId]);
  if (!c) return null;
  return (
    <Card id="profile-completeness" title="Profile completeness" meta={`${c.percent}%`}>
      <div className="pf-progress" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.percent}><span style={{ "--pct": `${c.percent}%` }} /></div>
      {c.missing.length ? <p className="ds-hint" id="completeness-missing">{`Missing: ${c.missing.join(", ")}. Nothing is blocked by this.`}</p> : <p className="ds-hint">Everything that counts is filled in.</p>}
    </Card>
  );
}

// ---------- change history (HR / Admin) ----------
export function History({ userId }) {
  const { userId: me } = useSession();
  const list = useData(() => historyFor(me, userId), [me, userId]);
  if (!list) return null;
  return (
    <Card id="profile-history" title="Change history" meta={String(list.length)}>
      {!list.length ? <p className="ds-hint">No changes yet.</p> : (
        <div className="pf-table-wrap">
          <table className="pf-table" id="history-table">
            <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Field</th><th scope="col">From</th><th scope="col">To</th></tr></thead>
            <tbody>{list.slice(0, 25).map((h, i) => <tr key={i}><td>{when(h.at)}</td><td>{nameOf(h.actorId)}{h.how === "request" ? " (request)" : ""}</td><td>{h.label}</td><td>{h.from}</td><td>{h.to}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------- the sign-in account ----------
const STATUS = { invited: ["Invited", "info"], active: ["Active", "success"], disabled: ["Disabled", "danger"], locked: ["Locked", "warning"], none: ["No sign-in yet", ""] };

// The details for someone to sign in with, shown once: a temporary password and a set-password link, with copy buttons.
export function ShareDetails({ name, details, onClose }) {
  const toast = useToast();
  const link = details.link ? new URL(details.link, window.location.origin).href : null;
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); toast(`${what} copied.`, "success"); } catch { toast(`Select the ${what.toLowerCase()} and copy it.`, "info"); } };
  return (
    <Modal open onClose={onClose} guard={false} id="share-modal" size="sm" title="Share these sign-in details" desc={`For ${name}. They're shown only now: copy them before you close this.`}
      footer={<button type="button" className="ds-btn ds-btn--primary" onClick={onClose}>Done</button>}>
      <div className="ds-stack" id="share-details">
        {details.tempPassword && (
          <div className="share-row">
            <span className="ds-field__label" id="share-temp-label">Temporary password</span>
            <div className="share-row__value"><code aria-labelledby="share-temp-label" id="share-temp">{details.tempPassword}</code><button type="button" className="ds-btn ds-btn--sm" onClick={() => copy(details.tempPassword, "Password")}>Copy</button></div>
          </div>
        )}
        {link && (
          <div className="share-row">
            <span className="ds-field__label" id="share-link-label">{details.tempPassword ? "Or the set-password link (48 hours, once)" : "Reset link (60 minutes, once)"}</span>
            <div className="share-row__value"><code aria-labelledby="share-link-label" id="share-link">{link}</code><button type="button" className="ds-btn ds-btn--sm" onClick={() => copy(link, "Link")}>Copy</button></div>
          </div>
        )}
        <p className="ds-hint">{details.tempPassword ? "They choose their own password the first time they sign in." : "They choose a new password with it."} Email delivery arrives with the backend; until then share these yourself. A copy of the message is in the Mail outbox, without the password.</p>
      </div>
    </Modal>
  );
}

export function AccountCard({ user }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const can = { create: useCan("users:create"), reset: useCan("accounts:reset"), unlock: useCan("accounts:unlock"), disable: useCan("accounts:disable") };
  const account = useData(() => accountOf(user.id), [user.id]);
  const events = useData(() => (can.unlock ? eventsFor(user.id).filter((e) => !["field-changed", "field-revealed"].includes(e.kind)).slice(0, 8) : null), [user.id, can.unlock]);
  const [share, setShare] = useState(null);
  const own = me === user.id;
  const [label, tone] = STATUS[account.status] ?? [account.status, ""];
  const run = async (fn, done) => { const r = await fn(); if (!r.ok) { toast(r.error, "danger"); return; } bump(); done(r); };
  const make = () => run(() => createAccount(me, user.id), (r) => setShare(r));
  const resetLink = async () => { if (await confirm({ message: `Send ${user.name} a reset link?\nAny earlier link stops working. It works once, for 60 minutes.`, confirmLabel: "Send link" })) run(() => issueReset(me, user.id, "link"), (r) => setShare(r)); };
  const resetTemp = async () => { if (await confirm({ message: `Give ${user.name} a new temporary password?\nTheir current password stops working; they choose a new one at their next sign-in.`, confirmLabel: "New temporary password", danger: true })) run(() => issueReset(me, user.id, "temp"), (r) => setShare(r)); };
  const unlock = () => run(() => unlockAccount(me, user.id), () => toast(`${user.name}'s account is unlocked.`, "success"));
  const toggle = async () => {
    const off = account.status !== "disabled";
    if (off && !(await confirm({ message: `Disable ${user.name}'s sign-in?\nThey're signed out at their next step and can't sign in until it's enabled. Their employee record stays as it is.`, confirmLabel: "Disable sign-in", danger: true }))) return;
    run(() => setSignInEnabled(me, user.id, !off), () => toast(off ? `${user.name}'s sign-in is disabled.` : `${user.name} can sign in again.`, "success"));
  };
  // HR can't change an Admin's sign-in (data/credentials.js says the same), so an Admin's card offers HR nothing
  const { role: myRole } = useSession();
  const helpable = !own && (user.role !== "admin" || myRole?.key === "admin");
  const any = helpable && (can.reset || can.unlock || can.disable || (can.create && account.status === "none"));
  return (
    <Card id="profile-account" title="Sign-in account" meta={<Pill tone={tone} id="account-status">{label}</Pill>}>
      <div className="ds-stack">
        <p className="ds-hint" id="account-note">{account.status === "none" ? "No sign-in details have been made yet." : account.status === "invited" ? "Invited: they haven't chosen their own password yet." : account.status === "locked" ? `Locked after 5 failed sign-ins, until ${when(new Date(account.lockedUntil).toISOString())}.` : account.status === "disabled" ? "They can't sign in. Their employee record is unchanged." : account.mustChange ? "They must choose a new password at their next sign-in." : "They sign in with their own password."}</p>
        {any && (
          <div className="ds-form-actions__buttons" id="account-actions">
            {account.status === "none" && (can.create || can.reset) && <button type="button" className="ds-btn ds-btn--sm ds-btn--primary" onClick={make}>Make sign-in details</button>}
            {account.status !== "none" && account.status !== "disabled" && can.reset && <button type="button" className="ds-btn ds-btn--sm" onClick={resetLink}>Send reset link</button>}
            {account.status !== "none" && account.status !== "disabled" && can.reset && <button type="button" className="ds-btn ds-btn--sm" onClick={resetTemp}>New temporary password</button>}
            {account.status === "locked" && can.unlock && <button type="button" className="ds-btn ds-btn--sm" onClick={unlock}>Unlock</button>}
            {account.status !== "none" && can.disable && <button type="button" className={`ds-btn ds-btn--sm${account.status === "disabled" ? "" : " ds-btn--danger"}`} onClick={toggle}>{account.status === "disabled" ? "Enable sign-in" : "Disable sign-in"}</button>}
          </div>
        )}
        {can.unlock && <Link className="link text-sm" to={pageUrl(MAIL_OUTBOX)}>Mail outbox</Link>}
        {events && (
          <div>
            <h3 className="pf-subhead">Account events</h3>
            {events.length ? <ul className="pf-list" id="account-events">{events.map((e) => <li key={e.id}><div className="pf-list__head"><span>{AUDIT_LABEL[e.kind]}</span><span className="ds-hint">{when(e.at)}</span></div><p className="ds-hint">{e.actorId && e.actorId !== user.id ? `${nameOf(e.actorId)}: ${e.detail}` : e.detail}</p></li>)}</ul> : <p className="ds-hint">No account events yet.</p>}
          </div>
        )}
      </div>
      {share && <ShareDetails name={user.name} details={share} onClose={() => setShare(null)} />}
    </Card>
  );
}