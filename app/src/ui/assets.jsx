// The asset screens' shared pieces (AS2): the status chip, the condition badge, the lifecycle timeline, what each asset may be offered
// (the state machine's own moves, asset-rules.js TRANSITIONS, and the permission for each), and the dialogs that carry those moves out:
// Add / Edit, Issue, Return, Retire, Dispose, and open / close maintenance. Every dialog calls the AS1 data functions, which check the
// permission, the state machine, the person and the dates again and say why in plain words; those words are shown as they are.
import { useMemo, useState } from "react";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { getOffices } from "../../../assets/js/data/offices-store.js";
import { ASSET_CATEGORIES, CONDITIONS, METHODS, canMove } from "../../../assets/js/data/asset-rules.js";
import { issueAsset, returnAsset, addAsset, editAsset, retireAsset, disposeAsset, openMaintenance, closeMaintenance, maintenanceOf, vendorsFor } from "../../../assets/js/data/asset-register.js";
import { formatDay, nameOf, todayIso } from "../../../assets/js/ui/leave-view.js";
import { useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import Modal from "../components/Modal.jsx";
import { Pill } from "../components/Layout.jsx";
import { Badge } from "../components/Basics.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";
import { Icon } from "../components/icons.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "./Toast.jsx";
import { Link } from "react-router-dom";
import { pageUrl, COMPLETE_DETAILS } from "../routes.js";
import "../design/assets.css";

// ---------- icons (24-unit line paths) ----------
export const PATH = {
  box: "M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.7 12 12.5l8.7-4.8M12 22v-9.5",
  person: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  ban: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M5 5l14 14",
  plus: "M12 5v14M5 12h14",
  laptop: "M4 5h16v11H4zM2 19h20",
  alert: "M12 3 2 21h20L12 3zM12 10v5M12 18v.5",
  check: "M5 13l4 4L19 7",
};

// ---------- status ----------
// Every status has a words label, an icon and a pattern (a hatch, dashes, a bar, dots), so none is told apart by colour alone.
export const STATUS = {
  "in-store": { label: "In store", tone: "success", icon: PATH.box },
  assigned: { label: "Assigned", tone: "info", icon: PATH.person },
  "under-maintenance": { label: "Under maintenance", tone: "warning", icon: PATH.wrench },
  retired: { label: "Retired", tone: "", icon: PATH.archive },
  disposed: { label: "Disposed", tone: "", icon: PATH.ban },
};
export const STATUS_KEYS = Object.keys(STATUS);
export function StatusChip({ status }) {
  const m = STATUS[status] ?? { label: status, tone: "", icon: PATH.box };
  return <Pill tone={m.tone} icon={m.icon} data-status={status} data-chip="asset-status">{m.label}</Pill>;
}
const CONDITION_TONE = { good: "success", fair: "warning", poor: "danger" };
export function ConditionBadge({ condition }) {
  return condition ? <Badge tone={CONDITION_TONE[condition] ?? ""} square>{CONDITIONS[condition]?.label ?? condition}</Badge> : <span className="text-muted">Not recorded</span>;
}

// ---------- small helpers ----------
export const inr = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);
export const dayText = (iso) => (iso ? formatDay(iso, true) : "Not recorded");
export const categoryLabel = (k) => ASSET_CATEGORIES[k]?.label ?? k;
export const CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORIES).map(([k, c]) => [k, c.label]);
export const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([k, c]) => [k, c.label]);
export const STATUS_OPTIONS = STATUS_KEYS.map((k) => ({ value: k, label: STATUS[k].label }));
// Active people, by name (a person picker); the person's id after the name, so two of one name can be told apart.
export const peopleOptions = () => getAllUsers().filter((u) => u.status !== "inactive").sort((a, b) => a.name.localeCompare(b.name)).map((u) => [u.id, `${u.name} (${u.id})`]);
export const officeName = (id) => getOffices({ includeInactive: true }).find((o) => o.id === id)?.name ?? "—";
export const warrantyState = (until, today) => (!until ? null : until < today ? "expired" : until <= addDays(today, 30) ? "soon" : "ok");
function addDays(iso, k) { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); }
export function WarrantyText({ until, today = todayIso() }) {
  const s = warrantyState(until, today);
  if (!until) return <span className="text-muted">None recorded</span>;
  return <span className="as-warranty"><span className="as-nowrap">{dayText(until)}</span>{s === "expired" && <Badge tone="danger" square>Expired</Badge>}{s === "soon" && <Badge tone="warning" square>Ends soon</Badge>}</span>;
}

// ---------- what an asset may be offered ----------
// The state machine's own moves (asset-rules.js canMove) and the permission each needs; nothing the machine refuses is ever a button.
export const ACTION_LABEL = { edit: "Edit", issue: "Issue", return: "Return", maintenance: "Send for maintenance", "close-maintenance": "Back from maintenance", retire: "Retire", dispose: "Dispose of" };
export function assetActions(asset, canDo) {
  if (!asset) return [];
  const out = [];
  const s = asset.status;
  if (s !== "disposed" && canDo("assets:manage")) out.push("edit");
  if (canMove(s, "assigned") && canDo("assets:issue")) out.push("issue");
  if (s === "assigned" && canMove(s, "in-store") && canDo("assets:issue")) out.push("return");
  if (canMove(s, "under-maintenance") && canDo("assets:maintain")) out.push("maintenance");
  if (s === "under-maintenance" && canMove(s, "in-store") && canDo("assets:maintain")) out.push("close-maintenance");
  if (canMove(s, "retired") && canDo("assets:manage")) out.push("retire");
  if (canMove(s, "disposed") && canDo("assets:manage")) out.push("dispose");
  return out;
}
export function AssetActionButtons({ asset, onAction, size = "sm", only = null }) {
  const permits = { "assets:manage": useCan("assets:manage"), "assets:issue": useCan("assets:issue"), "assets:maintain": useCan("assets:maintain") };
  const list = assetActions(asset, (p) => permits[p]).filter((a) => !only || only.includes(a));
  if (!list.length) return null;
  return (
    <span className="ds-form-actions__buttons" role="group" aria-label={`Actions for ${asset.tag}`}>
      {list.map((a) => <button key={a} type="button" data-action={a} className={`ds-btn ds-btn--${size}${a === "retire" || a === "dispose" ? " ds-btn--danger" : ""}`} onClick={() => onAction(a, asset)} aria-label={`${ACTION_LABEL[a]} ${asset.tag}`}>{ACTION_LABEL[a]}</button>)}
    </span>
  );
}

// ---------- the lifecycle timeline ----------
const EVENT_TITLE = {
  added: () => "Added to the register",
  issued: (e) => `Issued to ${nameOf(e.personId)}`,
  returned: (e) => `Returned by ${nameOf(e.personId)}`,
  "maintenance-opened": () => "Sent for maintenance",
  "maintenance-closed": () => "Back from maintenance",
  retired: () => "Retired",
  disposed: () => "Disposed of",
};
export function Timeline({ events }) {
  if (!events.length) return <p className="ds-hint">Nothing recorded yet.</p>;
  return (
    <ol className="as-timeline" aria-label="Lifecycle">
      {events.map((e) => (
        <li key={e.id} className="as-timeline__item" data-kind={e.kind}>
          <span className="as-timeline__dot" aria-hidden="true" />
          <div>
            <strong>{(EVENT_TITLE[e.kind] ?? (() => e.kind))(e)}</strong>
            <span className="as-timeline__when">{dayText(e.date)}{e.byId ? `, by ${nameOf(e.byId)}` : ""}</span>
            {(e.condition || e.notes) && <span className="as-timeline__note">{e.condition ? `Condition: ${CONDITIONS[e.condition]?.label ?? e.condition}. ` : ""}{e.notes}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- dialogs ----------
function useDialog(onClose) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [error, setError] = useState(null);   // { field?, text }
  const fail = (r) => { setError({ field: r.field ?? null, text: r.error }); return false; };
  const done = (message) => { bump(); toast(message, "success"); onClose(); return true; };
  const fieldError = (name) => (error?.field === name ? error.text : null);
  const general = error && !error.field ? error.text : null;
  return { userId, confirm, error, setError, fail, done, fieldError, general };
}
function Shell({ open, onClose, title, desc, id, submitLabel, danger = false, general, children, size = "" }) {
  return (
    <Modal open={open} onClose={onClose} id={`${id}-modal`} title={title} desc={desc} size={size}
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form={id} className={`ds-btn ${danger ? "ds-btn--danger" : "ds-btn--primary"}`}>{submitLabel}</button></>}>
      {general && <p className="ds-note ds-note--danger" role="alert" id={`${id}-error`}>{general}</p>}
      {children}
    </Modal>
  );
}

function IssueDialog({ asset, onClose }) {
  const d = useDialog(onClose);
  const people = useMemo(peopleOptions, []);
  const [f, setF] = useState({ personId: "", date: todayIso(), condition: asset.condition ?? "good", notes: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => { e.preventDefault(); const r = issueAsset(d.userId, asset.tag, f); if (!r.ok) { d.fail(r); return; } d.done(`${asset.tag} issued to ${nameOf(f.personId)}.`); };
  return (
    <Shell open onClose={onClose} id="issue-form" title={`Issue ${asset.tag}`} desc={`${asset.name} goes from the store to a person. Only an asset in the store can be issued.`} submitLabel="Issue" general={d.general}>
      <form id="issue-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="issue-person" label="Person" required error={d.fieldError("personId")} full><Select id="issue-person" placeholder="Choose a person" options={people} value={f.personId} error={d.fieldError("personId")} onChange={set("personId")} /></Field>
          <Field id="issue-date" label="Date" required error={d.fieldError("date")}><Input id="issue-date" type="date" max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          <Field id="issue-condition" label="Condition now" required error={d.fieldError("condition")}><Select id="issue-condition" options={CONDITION_OPTIONS} value={f.condition} error={d.fieldError("condition")} onChange={set("condition")} /></Field>
          <Field id="issue-notes" label="Notes" full error={d.fieldError("notes")}><TextArea id="issue-notes" rows={2} maxLength={500} value={f.notes} error={d.fieldError("notes")} onChange={set("notes")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

function ReturnDialog({ asset, onClose }) {
  const d = useDialog(onClose);
  const [f, setF] = useState({ date: todayIso(), condition: asset.condition ?? "good", notes: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => { e.preventDefault(); const r = returnAsset(d.userId, asset.tag, f); if (!r.ok) { d.fail(r); return; } d.done(`${asset.tag} is back in the store.`); };
  return (
    <Shell open onClose={onClose} id="return-form" title={`Take back ${asset.tag}`} desc={`${asset.name} comes back from ${asset.holderId ? nameOf(asset.holderId) : "its holder"} (also from someone who has left).`} submitLabel="Take back" general={d.general}>
      <form id="return-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="return-date" label="Date" required error={d.fieldError("date")}><Input id="return-date" type="date" max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          <Field id="return-condition" label="Condition on return" required error={d.fieldError("condition")}><Select id="return-condition" options={CONDITION_OPTIONS} value={f.condition} error={d.fieldError("condition")} onChange={set("condition")} /></Field>
          <Field id="return-notes" label="Notes" full error={d.fieldError("notes")}><TextArea id="return-notes" rows={2} maxLength={500} value={f.notes} error={d.fieldError("notes")} onChange={set("notes")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

// Retire (a reason) and Dispose of (a reason, the sale value if any): each asks once more before it happens.
function EndDialog({ asset, kind, onClose }) {
  const d = useDialog(onClose);
  const [f, setF] = useState({ date: todayIso(), reason: "", saleValue: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const dispose = kind === "dispose";
  const submit = async (e) => {
    e.preventDefault();
    const ask = dispose ? `Dispose of ${asset.tag}?\nIt is written off and can't be issued, edited or brought back.` : `Retire ${asset.tag}?\nIt leaves service. Only disposing of it can follow.`;
    if (!(await d.confirm({ message: ask, confirmLabel: dispose ? "Dispose of it" : "Retire it", cancelLabel: "Keep it", danger: true }))) return;
    const r = dispose ? disposeAsset(d.userId, asset.tag, { date: f.date, reason: f.reason, saleValue: f.saleValue }) : retireAsset(d.userId, asset.tag, { date: f.date, reason: f.reason });
    if (!r.ok) { d.fail(r); return; }
    d.done(dispose ? `${asset.tag} disposed of.` : `${asset.tag} retired.`);
  };
  const id = dispose ? "dispose-form" : "retire-form";
  return (
    <Shell open onClose={onClose} id={id} danger title={dispose ? `Dispose of ${asset.tag}` : `Retire ${asset.tag}`} submitLabel={dispose ? "Dispose of" : "Retire"} general={d.general}
      desc={dispose ? "Only a retired asset can be disposed of. Say why, and what it was sold for, if it was." : "Only an asset in the store can be retired. Say why."}>
      <form id={id} className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id={`${id}-date`} label="Date" required error={d.fieldError("date")}><Input id={`${id}-date`} type="date" max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          {dispose && <Field id={`${id}-sale`} label="Sale value (₹, if sold)" error={d.fieldError("saleValue")} hint="Leave empty if it was written off."><Input id={`${id}-sale`} type="text" inputMode="decimal" value={f.saleValue} error={d.fieldError("saleValue")} onChange={set("saleValue")} /></Field>}
          <Field id={`${id}-reason`} label="Reason" required full error={d.fieldError("reason")} hint="3 to 200 characters."><TextArea id={`${id}-reason`} rows={2} maxLength={200} value={f.reason} error={d.fieldError("reason")} onChange={set("reason")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

function MaintenanceDialog({ asset, onClose }) {
  const d = useDialog(onClose);
  const vendors = useMemo(() => vendorsFor(d.userId).filter((v) => v.active), [d.userId]);
  const [f, setF] = useState({ date: todayIso(), issue: "", cost: "", vendorId: "", nextServiceDue: "", notes: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => { e.preventDefault(); const r = openMaintenance(d.userId, asset.tag, { ...f, cost: f.cost === "" ? 0 : f.cost }); if (!r.ok) { d.fail(r); return; } d.done(`${asset.tag} is under maintenance.`); };
  return (
    <Shell open onClose={onClose} id="maint-form" title={`Send ${asset.tag} for maintenance`} desc="Only an asset in the store can go for maintenance; it comes back when you close the record." submitLabel="Open record" general={d.general}>
      <form id="maint-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="maint-issue" label="Issue" required full error={d.fieldError("issue")} hint="3 to 200 characters."><Input id="maint-issue" type="text" maxLength={200} value={f.issue} error={d.fieldError("issue")} onChange={set("issue")} /></Field>
          <Field id="maint-date" label="Date" required error={d.fieldError("date")}><Input id="maint-date" type="date" max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          <Field id="maint-vendor" label="Vendor" error={d.fieldError("vendorId")}><Select id="maint-vendor" placeholder="None" options={vendors.map((v) => [v.id, v.name])} value={f.vendorId} error={d.fieldError("vendorId")} onChange={set("vendorId")} /></Field>
          <Field id="maint-cost" label="Cost so far (₹)" error={d.fieldError("cost")}><Input id="maint-cost" type="text" inputMode="decimal" value={f.cost} error={d.fieldError("cost")} onChange={set("cost")} /></Field>
          <Field id="maint-next" label="Next service due" error={d.fieldError("nextServiceDue")} hint="After the date above."><Input id="maint-next" type="date" value={f.nextServiceDue} error={d.fieldError("nextServiceDue")} onChange={set("nextServiceDue")} /></Field>
          <Field id="maint-notes" label="Notes" full error={d.fieldError("notes")}><TextArea id="maint-notes" rows={2} maxLength={500} value={f.notes} error={d.fieldError("notes")} onChange={set("notes")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

function CloseMaintenanceDialog({ asset, onClose }) {
  const d = useDialog(onClose);
  const record = useMemo(() => maintenanceOf(d.userId, asset.id).find((r) => r.status === "open") ?? null, [d.userId, asset.id]);
  const [f, setF] = useState({ date: todayIso(), cost: "", nextServiceDue: "", notes: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => {
    e.preventDefault();
    if (!record) { d.setError({ text: `${asset.tag} has no open maintenance record.` }); return; }
    const changes = { date: f.date, notes: f.notes };
    if (f.cost !== "") changes.cost = f.cost;
    if (f.nextServiceDue) changes.nextServiceDue = f.nextServiceDue;
    const r = closeMaintenance(d.userId, record.id, changes);
    if (!r.ok) { d.fail(r); return; }
    d.done(`${asset.tag} is back in the store.`);
  };
  return (
    <Shell open onClose={onClose} id="close-maint-form" title={`${asset.tag} back from maintenance`} desc={record ? `Closes the record opened ${dayText(record.date)}: ${record.issue}` : "There is no open record."} submitLabel="Close record" general={d.general}>
      <form id="close-maint-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="cm-date" label="Date back" required error={d.fieldError("date")}><Input id="cm-date" type="date" max={todayIso()} min={record?.date ?? undefined} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          <Field id="cm-cost" label="Final cost (₹)" error={d.fieldError("cost")}><Input id="cm-cost" type="text" inputMode="decimal" value={f.cost} error={d.fieldError("cost")} onChange={set("cost")} /></Field>
          <Field id="cm-next" label="Next service due" error={d.fieldError("nextServiceDue")}><Input id="cm-next" type="date" value={f.nextServiceDue} error={d.fieldError("nextServiceDue")} onChange={set("nextServiceDue")} /></Field>
          <Field id="cm-notes" label="Notes" full error={d.fieldError("notes")}><TextArea id="cm-notes" rows={2} maxLength={500} value={f.notes} error={d.fieldError("notes")} onChange={set("notes")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

// Add or Edit. Edit sends only what changed (so an unchanged price is never sent by someone who can't see it); the price field is there
// only for someone who may see prices (assets:view-values) when editing, and for anyone who may add (the invoice's) when adding.
export function AssetFormDialog({ asset, onClose, onSaved }) {
  const d = useDialog(onClose);
  const canValues = useCan("assets:view-values"), canDep = useCan("depreciation:configure");
  const editing = Boolean(asset);
  const offices = useMemo(() => getOffices(), []);
  const vendors = useMemo(() => vendorsFor(d.userId).filter((v) => v.active || v.id === asset?.vendorId), [d.userId, asset]);
  const start = { name: asset?.name ?? "", category: asset?.category ?? "", makeModel: asset?.makeModel ?? "", serial: asset?.serial ?? "", purchaseDate: asset?.purchaseDate ?? "", purchasePrice: asset?.purchasePrice != null ? String(asset.purchasePrice) : "",
    vendorId: asset?.vendorId ?? "", invoiceRef: asset?.invoiceRef ?? "", warrantyUntil: asset?.warrantyUntil ?? "", locationId: asset?.locationId ?? offices[0]?.id ?? "",
    depreciationMethod: "", usefulLifeYears: "", wdvRatePercent: "", salvageValue: "" };
  const [f, setF] = useState(start);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const showPrice = editing ? canValues : true;
  const submit = (e) => {
    e.preventDefault();
    let r;
    if (editing) {
      const keys = ["name", "category", "makeModel", "serial", "purchaseDate", "vendorId", "invoiceRef", "warrantyUntil", "locationId", ...(canValues ? ["purchasePrice"] : [])];
      const changes = Object.fromEntries(keys.filter((k) => String(f[k]) !== String(start[k])).map((k) => [k, f[k]]));
      if (!Object.keys(changes).length) { onClose(); return; }
      r = editAsset(d.userId, asset.tag, changes);
    } else {
      const fields = { name: f.name, category: f.category, makeModel: f.makeModel, serial: f.serial, purchaseDate: f.purchaseDate, purchasePrice: f.purchasePrice, vendorId: f.vendorId, invoiceRef: f.invoiceRef, warrantyUntil: f.warrantyUntil, locationId: f.locationId };
      if (canDep) for (const k of ["depreciationMethod", "usefulLifeYears", "wdvRatePercent", "salvageValue"]) if (f[k] !== "") fields[k] = f[k];
      r = addAsset(d.userId, fields);
    }
    if (!r.ok) { d.fail(r); return; }
    d.done(editing ? `${asset.tag} saved.` : `${r.record.tag} added.`);
    onSaved?.(r.record);
  };
  return (
    <Shell open onClose={onClose} id="asset-form" size="lg" title={editing ? `Edit ${asset.tag}` : "Add asset"} submitLabel={editing ? "Save" : "Add asset"} general={d.general}
      desc={editing ? (asset.detailsMissing ? "This asset came from the old register without its purchase details: add them here." : "Change its details. The tag stays as it is.") : "A new asset starts in the store, with the next tag."}>
      <form id="asset-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="af-name" label="Name" required error={d.fieldError("name")}><Input id="af-name" type="text" maxLength={80} value={f.name} error={d.fieldError("name")} onChange={set("name")} /></Field>
          <Field id="af-category" label="Category" required error={d.fieldError("category")}><Select id="af-category" placeholder="Choose one" options={CATEGORY_OPTIONS} value={f.category} error={d.fieldError("category")} onChange={set("category")} /></Field>
          <Field id="af-make" label="Make and model" error={d.fieldError("makeModel")}><Input id="af-make" type="text" maxLength={80} value={f.makeModel} error={d.fieldError("makeModel")} onChange={set("makeModel")} /></Field>
          <Field id="af-serial" label="Serial number" error={d.fieldError("serial")} hint="Unique when given."><Input id="af-serial" type="text" maxLength={40} value={f.serial} error={d.fieldError("serial")} onChange={set("serial")} /></Field>
          <Field id="af-date" label="Purchase date" required={!editing} error={d.fieldError("purchaseDate")}><Input id="af-date" type="date" max={todayIso()} value={f.purchaseDate} error={d.fieldError("purchaseDate")} onChange={set("purchaseDate")} /></Field>
          {showPrice && <Field id="af-price" label="Purchase price (₹)" required={!editing} error={d.fieldError("purchasePrice")} hint="From the invoice, to 2 decimals."><Input id="af-price" type="text" inputMode="decimal" value={f.purchasePrice} error={d.fieldError("purchasePrice")} onChange={set("purchasePrice")} /></Field>}
          <Field id="af-vendor" label="Vendor" error={d.fieldError("vendorId")}><Select id="af-vendor" placeholder="None" options={vendors.map((v) => [v.id, v.name])} value={f.vendorId} error={d.fieldError("vendorId")} onChange={set("vendorId")} /></Field>
          <Field id="af-invoice" label="Invoice reference" error={d.fieldError("invoiceRef")}><Input id="af-invoice" type="text" maxLength={40} value={f.invoiceRef} error={d.fieldError("invoiceRef")} onChange={set("invoiceRef")} /></Field>
          <Field id="af-warranty" label="Warranty ends" error={d.fieldError("warrantyUntil")}><Input id="af-warranty" type="date" value={f.warrantyUntil} error={d.fieldError("warrantyUntil")} onChange={set("warrantyUntil")} /></Field>
          <Field id="af-office" label="Office" required error={d.fieldError("locationId")} hint="Every active office."><Select id="af-office" options={offices.map((o) => [o.id, o.name])} value={f.locationId} error={d.fieldError("locationId")} onChange={set("locationId")} /></Field>
          {!editing && canDep && (
            <>
              <Field id="af-method" label="Depreciation method" hint="Empty: the category's default." error={d.fieldError("depreciationMethod")}><Select id="af-method" placeholder="Category default" options={Object.entries(METHODS).map(([k, m]) => [k, m.label])} value={f.depreciationMethod} error={d.fieldError("depreciationMethod")} onChange={set("depreciationMethod")} /></Field>
              <Field id="af-life" label="Useful life (years)" error={d.fieldError("usefulLifeYears")}><Input id="af-life" type="text" inputMode="numeric" value={f.usefulLifeYears} error={d.fieldError("usefulLifeYears")} onChange={set("usefulLifeYears")} /></Field>
              <Field id="af-rate" label="Written-down rate (%)" error={d.fieldError("wdvRatePercent")}><Input id="af-rate" type="text" inputMode="decimal" value={f.wdvRatePercent} error={d.fieldError("wdvRatePercent")} onChange={set("wdvRatePercent")} /></Field>
              <Field id="af-salvage" label="Salvage value (₹)" error={d.fieldError("salvageValue")}><Input id="af-salvage" type="text" inputMode="decimal" value={f.salvageValue} error={d.fieldError("salvageValue")} onChange={set("salvageValue")} /></Field>
            </>
          )}
        </div>
      </form>
    </Shell>
  );
}

// The dialogs the pages share: open("issue" | "return" | "retire" | "dispose" | "maintenance" | "close-maintenance" | "edit", asset), and `node` to draw.
export function useAssetDialogs(onSaved) {
  const [state, setState] = useState(null);
  const close = () => setState(null);
  const node = state && (
    state.kind === "issue" ? <IssueDialog asset={state.asset} onClose={close} />
    : state.kind === "return" ? <ReturnDialog asset={state.asset} onClose={close} />
    : state.kind === "retire" || state.kind === "dispose" ? <EndDialog asset={state.asset} kind={state.kind} onClose={close} />
    : state.kind === "maintenance" ? <MaintenanceDialog asset={state.asset} onClose={close} />
    : state.kind === "close-maintenance" ? <CloseMaintenanceDialog asset={state.asset} onClose={close} />
    : state.kind === "edit" ? <AssetFormDialog asset={state.asset} onClose={close} onSaved={onSaved} />
    : state.kind === "add" ? <AssetFormDialog asset={null} onClose={close} onSaved={onSaved} />
    : null);
  return { open: (kind, asset = null) => setState({ kind, asset }), node };
}

// A note under a table that has assets with no purchase details.
export function DetailsMissingNote({ count, canFix }) {
  if (!count) return null;
  return <p className="ds-note ds-note--warning" id="details-missing-note"><Icon d={PATH.alert} /> {count === 1 ? "1 asset has" : `${count} assets have`} no purchase date or price: they came from the old register, which didn't record them.{canFix ? <> Add them on <Link to={pageUrl(COMPLETE_DETAILS)}>Complete details</Link>; nothing is made up.</> : ""}</p>;
}