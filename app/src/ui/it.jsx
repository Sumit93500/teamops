// The IT desk's shared pieces (IT2): the status and priority chips (a word, an icon and a pattern each), the due words, the immutable
// timeline, the one question dialog every IT action asks through (its fields, the data layer's refusal said at the field it names),
// and the panel that shows a new sign-in's secrets once. Nothing here decides who may do what: the data layer says (data/it-desk.js
// availableActions and the functions behind each button), and the pages draw what it returns.
import { useState } from "react";
import { getUser, getAllUsers } from "../../../assets/js/data/store.js";
import { TYPES, STATUSES, PRIORITIES, OPEN_STATUSES } from "../../../assets/js/data/it-rules.js";
import Modal from "../components/Modal.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";
import { Pill } from "../components/Layout.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";
import "../design/it.css";

export const typeLabel = (t) => TYPES[t]?.label ?? t;
export const statusLabel = (s) => STATUSES[s]?.label ?? s;
export const PRIORITY_LABEL = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
export const nameOf = (id) => (id ? getUser(id)?.name ?? id : "—");

// status -> tone and icon; the pattern comes from css (data-it-status), so no meaning rests on colour alone
const TICK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6";
const CROSS = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9 9l6 6M15 9l-6 6";
const HAND = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 8v4M12 16h.01";
const STATUS_LOOK = {
  open: ["warning", ICON.clock], "in-progress": ["info", ICON.progress], "awaiting-approval": ["warning", HAND], approved: ["info", TICK], rejected: ["danger", CROSS],
  done: ["success", TICK], cancelled: ["", CROSS],
};
export function StatusChip({ status }) {
  const [tone, icon] = STATUS_LOOK[status] ?? ["", ICON.clock];
  return <Pill tone={tone} icon={icon} data-it-status={status}>{statusLabel(status)}</Pill>;
}
const PRIORITY_LOOK = { low: ["", "M12 5v14M6 13l6 6 6-6"], normal: ["", "M5 12h14"], high: ["warning", "M12 19V5M6 11l6-6 6 6"], urgent: ["danger", "M12 19V5M6 11l6-6 6 6M6 19h12"] };
export function PriorityChip({ priority }) {
  const [tone, icon] = PRIORITY_LOOK[priority] ?? ["", "M5 12h14"];
  return <Pill tone={tone} icon={icon} data-it-priority={priority}>{PRIORITY_LABEL[priority] ?? priority}</Pill>;
}

// "22 Nov, 10:00" in the office's time
export const stamp = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "—");
export const stampYear = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "—");
const hoursWords = (ms) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
  return `${Math.floor(h / 24)} days`;
};
// What the due date says now: "Overdue by 3 h", "Due in 5 h", or what a finished or waiting request says instead.
export function dueState(r, now = Date.now()) {
  if (!OPEN_STATUSES.includes(r.status)) return { text: r.status === "done" ? "Finished" : "Closed", late: false };
  if (r.status === "awaiting-approval") return { text: "Waiting for the Admin", late: false };
  const left = Date.parse(r.dueAt) - now;
  return left < 0 ? { text: `Overdue by ${hoursWords(-left)}`, late: true } : { text: `Due in ${hoursWords(left)}`, late: false };
}
export function DueCell({ r }) {
  const d = dueState(r);
  return <span className="it-due" data-late={d.late ? "" : undefined}><span className="it-due__main">{d.late && <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />}{d.text}</span>{OPEN_STATUSES.includes(r.status) && <span className="it-sub">{stamp(r.dueAt)}</span>}</span>;
}

export const itPeople = () => getAllUsers().filter((u) => u.role === "it" && u.status !== "inactive");
export const activePeople = () => getAllUsers().filter((u) => u.status !== "inactive");
export const PRIORITY_OPTIONS = PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]]);

// ---------- the timeline: only ever added to, so it is only ever read ----------
const TL_LABEL = { created: "Raised", assigned: "Assigned", comment: "Comment", status: "Status", approved: "Approved", rejected: "Rejected", executed: "Carried out", cancelled: "Cancelled", reviewed: "Reviewed" };
function timelineText(e) {
  if (e.kind === "status") {
    const m = /^([\w-]+) -> ([\w-]+)(?:: (.*))?$/.exec(e.note ?? "");
    return m ? `${statusLabel(m[1])} to ${statusLabel(m[2])}${m[3] ? `: ${m[3]}` : ""}` : e.note;
  }
  if (e.kind === "assigned") return `To ${nameOf(e.note)}`;
  if (e.kind === "reviewed") return `The Admin marked ${e.note} as reviewed`;
  return e.note;
}
export function Timeline({ entries }) {
  if (!entries.length) return <p className="text-muted">Nothing has happened yet.</p>;
  return (
    <ol className="it-timeline" aria-label="Timeline">
      {entries.map((e) => (
        <li key={e.id} className="it-timeline__item" data-kind={e.kind}>
          <span className="it-timeline__dot" aria-hidden="true" />
          <div>
            <strong>{TL_LABEL[e.kind] ?? e.kind}<span className="it-timeline__who"> · {nameOf(e.actorId)}</span></strong>
            {timelineText(e) && <span className="it-timeline__note">{timelineText(e)}</span>}
            <span className="it-timeline__when">{stampYear(e.at)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- the question every action asks ----------
// fields: [{ name, label, kind: "input" | "textarea" | "select" | "date" | "email", options, hint, required, maxLength, value, alias: [data-layer field names it answers] }]
// run(values) -> { ok } or { ok: false, error, field }: the data layer's own words, said at the field it names (or above the form).
export function AskDialog({ id, title, desc, submitLabel = "Save", danger = false, fields, run, onClose, onDone, size = "", intro = null }) {
  const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value ?? ""])));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setError(null); };
  const fe = (f) => (error?.field === f.name ? error.text : null);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await run(v);
    setBusy(false);
    if (!r.ok) { const f = fields.find((x) => x.name === r.field || x.alias?.includes(r.field) || x.match?.test(r.error)); setError({ field: f?.name ?? null, text: r.error }); return; }
    bump();
    onDone?.(r);
    onClose();
  };
  return (
    <Modal open onClose={onClose} id={`${id}-modal`} size={size} title={title} desc={desc}
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form={`${id}-form`} className={`ds-btn ${danger ? "ds-btn--danger" : "ds-btn--primary"}`} disabled={busy}>{submitLabel}</button></>}>
      {error && !error.field && <p className="ds-note ds-note--danger" role="alert" id={`${id}-error`}>{error.text}</p>}
      {intro}
      <form id={`${id}-form`} className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          {fields.map((f) => {
            const fid = `${id}-${f.name}`;
            const common = { id: fid, error: fe(f), value: v[f.name], onChange: set(f.name), "aria-label": undefined };
            return (
              <Field key={f.name} id={fid} label={f.label} required={f.required} hint={f.hint} error={fe(f)} full={f.full ?? f.kind === "textarea"}>
                {f.kind === "textarea" ? <TextArea {...common} rows={f.rows ?? 3} maxLength={f.maxLength} placeholder={f.placeholder} />
                  : f.kind === "select" ? <Select {...common} options={f.options} placeholder={f.placeholder ?? "Choose"} />
                  : <Input {...common} type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : "text"} maxLength={f.maxLength} placeholder={f.placeholder} />}
              </Field>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}

// ---------- secrets, shown once ----------
// items: [{ label, value }]. The panel lives only in the page's state: it is never stored, so leaving the page or closing it ends it.
export function SecretPanel({ title, lead, items, onClose }) {
  const toast = useToast();
  const copy = async (what, value) => {
    try { await navigator.clipboard.writeText(value); toast(`${what} copied.`, "success"); } catch { toast(`Couldn't copy: select the ${what.toLowerCase()} and copy it by hand.`, "danger"); }
  };
  return (
    <section className="ds-card it-secret" id="secret-panel" role="region" aria-labelledby="secret-title">
      <div className="ds-card__header"><div><h2 className="ds-card__title" id="secret-title">{title}</h2><span className="ds-card__meta">Shown once</span></div></div>
      <div className="ds-card__body ds-stack">
        <p className="ds-note ds-note--warning" role="status"><Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />{lead}</p>
        {items.map((it) => (
          <div className="it-secret__row" key={it.label}>
            <span className="it-secret__label">{it.label}</span>
            <code className="it-secret__value" data-secret={it.label}>{it.value}</code>
            <button type="button" className="ds-btn ds-btn--sm" onClick={() => copy(it.label, it.value)} aria-label={`Copy the ${it.label.toLowerCase()}`}>Copy</button>
          </div>
        ))}
        <div><button type="button" className="ds-btn ds-btn--primary" id="secret-done" onClick={onClose}>I have shared them: close</button></div>
      </div>
    </section>
  );
}