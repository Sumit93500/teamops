// Offices (L1): the app's own page at /pages/company/offices.html, for everyone signed in (offices:view, self-service).
// The list from data/offices-store.js: name, type, state, address, radius, how many active people work there, active or
// not; the head office's sample coordinates are marked. An Admin (offices:manage) adds branches, edits any office (the
// position from this device's location or typed in), deactivates / reactivates a branch (never the head office), and
// moves people between offices. The store's own checks and words. The position is read only when the button is pressed.
import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { getOffices, createOffice, updateOffice, deactivateOffice, reactivateOffice, setEmployeeOffice, officeIdOf, OFFICE_STATES, OFFICE_RADIUS, SAMPLE_NOTE } from "../../../assets/js/data/offices-store.js";
import { useData, useSession, useCan, signOutNow } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, OFFICES, ABOUT } from "../routes.js";
import Shell from "../shell/Shell.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Card, Pill, KpiCard } from "../components/Layout.jsx";
import { Field, Input, Select, Person } from "../components/Form.jsx";
import { ICON, Icon } from "../components/icons.jsx";

export const PRIVACY = "Your location is read only when you check in or out, never in the background.";
const PLUS = "M12 5v14M5 12h14";
const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const typeLabel = (t) => (t === "head" ? "Head office" : "Branch");

// "Use this device's location": the browser's position once, with its accuracy; every outcome said in words.
export function useDevicePosition() {
  const [state, setState] = useState({ status: "idle", text: "" });
  const read = (onPosition) => {
    if (!globalThis.navigator?.geolocation) { setState({ status: "error", text: "This browser can't share its location. Type the latitude and longitude instead." }); return; }
    setState({ status: "busy", text: "Reading this device's location…" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const acc = Math.round(p.coords.accuracy);
        onPosition({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
        setState({ status: acc > 100 ? "warning" : "ok", text: acc > 100 ? `Location read, but only to within ${acc} m. Try again near a window, or type it in.` : `Location read (to within ${acc} m).` });
      },
      (err) => setState({ status: "error", text: err.code === 1 ? "Location permission was denied. Allow it in the browser, or type the latitude and longitude." : "The location couldn't be read. Try again, or type it in." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  return [state, read];
}

function OfficeForm({ editing, onDone }) {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ name: editing?.name ?? "", address: editing?.address ?? "", state: editing?.state ?? "", lat: editing ? String(editing.lat) : "", lng: editing ? String(editing.lng) : "",
    radius: String(editing?.radiusM ?? OFFICE_RADIUS.default) });
  const [error, setError] = useState(null);
  const [pos, readPos] = useDevicePosition();
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(null); };
  const err = (field) => (error?.field === field ? error.text : null);
  const num = (v) => (String(v).trim() === "" ? NaN : Number(v));
  const save = (e) => {
    e.preventDefault();
    const fields = { name: f.name, address: f.address, state: f.state || undefined, lat: num(f.lat), lng: num(f.lng), radiusM: num(f.radius) };
    if (!editing) fields.type = "branch";
    const r = editing ? updateOffice(userId, editing.id, editing.state == null && !f.state ? (({ state, ...rest }) => rest)(fields) : fields) : createOffice(userId, fields);
    if (!r.ok) { if (r.field) setError({ field: r.field, text: r.error }); else toast(r.error, "danger"); return; }
    bump();
    toast(editing ? `${r.record.name} saved.` : `${r.record.name} added.`, "success");
    onDone();
  };
  return (
    <form id="office-form" className="ds-stack" onSubmit={save} noValidate>
      {editing?.sample && <p className="ds-note ds-note--warning">{SAMPLE_NOTE}</p>}
      <div className="ds-form-grid">
        <Field id="office-name" label="Name" required error={err("name")}><Input id="office-name" type="text" value={f.name} error={err("name")} onChange={set("name")} /></Field>
        <Field id="office-type" label="Type"><Input id="office-type" type="text" disabled value={typeLabel(editing?.type ?? "branch")} /></Field>
        <Field id="office-address" label="Address" required full error={err("address")}><Input id="office-address" type="text" value={f.address} error={err("address")} onChange={set("address")} /></Field>
        <Field id="office-state" label="State or union territory" required error={err("state")}><Select id="office-state" placeholder="Choose one" options={OFFICE_STATES} value={f.state} error={err("state")} onChange={set("state")} /></Field>
        <Field id="office-radius" label="Radius (metres)" required hint={`Check-ins count within this distance, ${OFFICE_RADIUS.min} to ${OFFICE_RADIUS.max} m.`} error={err("radiusM")}>
          <Input id="office-radius" type="number" inputMode="numeric" min={OFFICE_RADIUS.min} max={OFFICE_RADIUS.max} step="1" value={f.radius} error={err("radiusM")} hint={`Check-ins count within this distance, ${OFFICE_RADIUS.min} to ${OFFICE_RADIUS.max} m.`} onChange={set("radius")} />
        </Field>
      </div>
      <fieldset className="ds-stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="ds-form-section__title">Position</legend>
        <div className="ds-form-actions">
          <button type="button" className="ds-btn" onClick={() => readPos(({ lat, lng }) => setF((s) => ({ ...s, lat: String(lat), lng: String(lng) })))} disabled={pos.status === "busy"}><Icon d={PIN} />Use this device's location</button>
          {pos.text && <span className={`ds-status ds-status--${pos.status === "ok" ? "success" : pos.status === "busy" ? "info" : pos.status === "warning" ? "warning" : "danger"}`} role="status">{pos.text}</span>}
        </div>
        <div className="ds-form-grid">
          <Field id="office-lat" label="Latitude" required error={err("lat")}><Input id="office-lat" type="text" inputMode="decimal" value={f.lat} error={err("lat")} onChange={set("lat")} /></Field>
          <Field id="office-lng" label="Longitude" required error={err("lng")}><Input id="office-lng" type="text" inputMode="decimal" value={f.lng} error={err("lng")} onChange={set("lng")} /></Field>
        </div>
        <p className="ds-privacy">{PRIVACY}</p>
      </fieldset>
    </form>
  );
}

function Content() {
  const { userId } = useSession();
  const canManage = useCan("offices:manage");
  const toast = useToast();
  const confirm = useConfirm();
  const offices = useData(() => getOffices({ includeInactive: true }));
  const people = useData(() => getAllUsers().filter((u) => u.status !== "inactive").map((u) => ({ ...u, office: officeIdOf(u.id) })));
  const [modal, setModal] = useState(null);
  const count = (id) => people.filter((p) => p.office === id).length;
  const active = offices.filter((o) => o.active);

  const toggle = async (o) => {
    if (o.active) {
      const n = count(o.id);
      if (!(await confirm({ message: `Deactivate ${o.name}?${n ? `\n${plural(n, "person works", "people work")} there; they'll check in at the head office until it's active again or they're moved.` : ""}`, confirmLabel: "Deactivate", danger: true }))) return;
    }
    const r = o.active ? deactivateOffice(userId, o.id) : reactivateOffice(userId, o.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${o.name} ${o.active ? "deactivated" : "reactivated"}.`, "success");
  };
  const move = (person, officeId) => {
    const r = setEmployeeOffice(userId, person.id, officeId);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${person.name} now works from ${r.record.name}.`, "success");
  };

  const columns = [
    { key: "name", label: "Office", render: (o) => <span className="ds-stack" style={{ gap: 4 }}><strong>{o.name}</strong>{o.sample && <Pill tone="warning">Sample location</Pill>}</span> },
    { key: "type", label: "Type", render: (o) => typeLabel(o.type) },
    { key: "state", label: "State", render: (o) => o.state ?? "Not set" },
    { key: "address", label: "Address" },
    { key: "radiusM", label: "Radius", render: (o) => `${o.radiusM} m` },
    { key: "people", label: "People", num: true, render: (o) => String(count(o.id)) },
    { key: "status", label: "Status", render: (o) => <Pill tone={o.active ? "success" : ""}>{o.active ? "Active" : "Inactive"}</Pill> },
    ...(canManage ? [{ key: "actions", label: "Actions", actions: true, render: (o) => (
      <span className="ds-form-actions__buttons">
        <button type="button" className="ds-btn ds-btn--sm" onClick={() => setModal({ editing: o })} aria-label={`Edit ${o.name}`}>Edit</button>
        {o.type !== "head" && <button type="button" className={`ds-btn ds-btn--sm${o.active ? " ds-btn--danger" : ""}`} onClick={() => toggle(o)} aria-label={`${o.active ? "Deactivate" : "Reactivate"} ${o.name}`}>{o.active ? "Deactivate" : "Reactivate"}</button>}
      </span>) }] : []),
  ];
  const peopleColumns = [
    { key: "name", label: "Employee", render: (p) => <Person name={p.name} sub={p.designation} /> },
    { key: "office", label: "Office", render: (p) => (canManage
      ? <div className="ds-control ds-control--select"><select aria-label={`Office for ${p.name}`} value={p.office ?? ""} onChange={(e) => move(p, e.target.value)}>{active.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      : offices.find((o) => o.id === p.office)?.name ?? "—") },
  ];

  return (
    <>
      <PageHeader title="Offices" subtitle="Where people check in from" breadcrumb={[{ label: "Company", to: pageUrl(ABOUT) }, { label: "Offices" }]}
        actions={canManage ? <button type="button" className="ds-btn ds-btn--primary" onClick={() => setModal({ editing: null })}><Icon d={PLUS} />Add branch</button> : null} />
      <div className="ds-stack">
        <div className="ds-grid" role="group" aria-label="Key numbers">
          <KpiCard id="offices" label="Active offices" value={String(active.length)} icon={ICON.building} />
          <KpiCard id="branches" label="Branches" value={String(active.filter((o) => o.type === "branch").length)} icon={ICON.map} />
          <KpiCard id="people" label="People placed" value={String(people.length)} icon={ICON.users} />
        </div>
        <Card id="offices-card" title="All offices" meta={plural(offices.length, "office", "offices")}>
          <Table bare columns={columns} rows={offices} empty="No offices yet." tableId="offices-table" />
        </Card>
        <Card id="people-card" title="Who works where" meta={canManage ? "Change an office to move someone" : "Only an Admin can move people"}>
          <Table bare columns={peopleColumns} rows={people} tableId="office-people" />
        </Card>
        <p className="ds-privacy">{PRIVACY}</p>
      </div>
      <Modal open={Boolean(modal)} onClose={() => setModal(null)} id="office-modal" title={modal?.editing ? `Edit ${modal.editing.name}` : "Add branch"}
        desc={modal?.editing ? "Change its details; setting the real position clears the sample mark." : "A branch office: people moved here check in from it."}
        footer={<><button type="button" className="ds-btn" onClick={() => setModal(null)}>Cancel</button><button type="submit" form="office-form" className="ds-btn ds-btn--primary">Save</button></>}>
        {modal && <OfficeForm key={modal.editing?.id ?? "new"} editing={modal.editing} onDone={() => setModal(null)} />}
      </Modal>
    </>
  );
}

export default function Offices() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("Offices"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  return <Shell page={OFFICES} title="Offices"><Content /></Shell>;
}