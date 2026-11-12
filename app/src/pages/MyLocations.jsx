// My locations (L2): the app's own page at /pages/account/my-locations.html, for everyone signed in. Where you may check in
// from: your office (data/offices-store.js officeOf) and, when HR has turned home check-in on for you (homeEligible), your
// permanent and temporary home. Each home is set ONCE here (address, then "Use my current location" or the latitude and
// longitude typed in; no map); after that a change is a request with a reason that an Admin approves or rejects (the
// Approvals inbox, the card and the bell). An Admin's own change applies at once and is logged. Your requests, with status
// chips, and the history of every set and change. Someone without home check-in sees why and whom to ask. The store's own
// checks and words (data/locations-store.js). The position is read only when the button is pressed.
import { useLayoutEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { hasPermission } from "../../../assets/js/config/roles.js";
import { officeOf } from "../../../assets/js/data/offices-store.js";
import { homeOf, locationChangesFor, setOwnHome, requestLocationChange, cancelLocationChange, HOME_KINDS, HOME_RADIUS_M, REASON_MAX } from "../../../assets/js/data/locations-store.js";
import { formatDay, localDateOf, nameOf } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan, signOutNow } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, OFFICES, MY_LOCATIONS } from "../routes.js";
import Shell from "../shell/Shell.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Field, Input, TextArea, Kv } from "../components/Form.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { PRIVACY, useDevicePosition } from "./Offices.jsx";

const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const KIND_NAME = { permanent: "Permanent home", temporary: "Temporary home" };
const KIND_HINT = {
  permanent: "Where you live. Check-ins count within 150 m of it.",
  temporary: "Somewhere you stay for a while, for example while travelling for work.",
};
const STATUS = { pending: ["Waiting for an Admin", "info"], approved: ["Approved", "success"], rejected: ["Rejected", "danger"], cancelled: ["Cancelled", ""] };
const ACTION = { set: "Set", changed: "Changed", eligible: "Home check-in turned on", "not-eligible": "Home check-in turned off" };
const day = (iso) => formatDay(localDateOf(iso), true);
const num = (v) => (String(v).trim() === "" ? NaN : Number(v));
const where = (p) => `${p.lat}, ${p.lng}`;

// Who can turn home check-in on: active people with users:edit (HR and Admins), by name.
function askWhom(selfId) {
  const names = getAllUsers().filter((u) => u.status !== "inactive" && u.id !== selfId && hasPermission(u, "users:edit")).map((u) => u.name);
  if (!names.length) return "HR or an Admin";
  const shown = names.slice(0, 3);
  return shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")} or ${shown.at(-1)}`;
}

// The place's fields: the address, "Use my current location" (once, on press), and the latitude and longitude.
function PlaceFields({ prefix, f, setF, err }) {
  const [pos, readPos] = useDevicePosition();
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const tone = { ok: "success", busy: "info", warning: "warning" }[pos.status] ?? "danger";
  return (
    <>
      <Field id={`${prefix}-address`} label="Address" required full error={err("address")}>
        <Input id={`${prefix}-address`} type="text" autoComplete="street-address" value={f.address} error={err("address")} onChange={set("address")} />
      </Field>
      <div className="ds-form-actions" style={{ gridColumn: "1 / -1" }}>
        <button type="button" className="ds-btn" id={`${prefix}-locate`} disabled={pos.status === "busy"}
          onClick={() => readPos(({ lat, lng }) => setF((s) => ({ ...s, lat: String(lat), lng: String(lng) })))}><Icon d={PIN} />Use my current location</button>
        {pos.text && <span className={`ds-status ds-status--${tone}`} role="status">{pos.text}</span>}
      </div>
      <Field id={`${prefix}-lat`} label="Latitude" required hint="Or type it, for example 28.4595" error={err("lat")}>
        <Input id={`${prefix}-lat`} type="text" inputMode="decimal" value={f.lat} hint="Or type it, for example 28.4595" error={err("lat")} onChange={set("lat")} />
      </Field>
      <Field id={`${prefix}-lng`} label="Longitude" required hint="For example 77.0266" error={err("lng")}>
        <Input id={`${prefix}-lng`} type="text" inputMode="decimal" value={f.lng} hint="For example 77.0266" error={err("lng")} onChange={set("lng")} />
      </Field>
    </>
  );
}

// The store's place error names one field, "place": put it under the address or the position, whichever it's about.
const placeField = (text) => (/address/i.test(text) ? "address" : /longitude/i.test(text) && !/latitude/i.test(text) ? "lng" : "lat");

function SetHome({ kind }) {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ address: "", lat: "", lng: "" });
  const [error, setError] = useState(null);
  const err = (field) => (error?.field === field ? error.text : null);
  const prefix = `set-${kind}`;
  const save = (e) => {
    e.preventDefault();
    const r = setOwnHome(userId, kind, { address: f.address, lat: num(f.lat), lng: num(f.lng) });
    if (!r.ok) {
      if (r.field === "place") { const field = placeField(r.error); setError({ field, text: r.error }); document.getElementById(`${prefix}-${field}`)?.focus(); }
      else toast(r.error, "danger");
      return;
    }
    bump();
    toast(`${KIND_NAME[kind]} saved. You can check in from it now.`, "success");
  };
  return (
    <form id={`${prefix}-form`} className="ds-stack" noValidate onSubmit={save} onInput={() => setError(null)}>
      <p className="ds-hint">{KIND_HINT[kind]} You set it once; after that, a change needs an Admin's approval.</p>
      <div className="ds-form-grid"><PlaceFields prefix={prefix} f={f} setF={(fn) => { setF(fn); setError(null); }} err={err} /></div>
      <div className="ds-form-actions"><button type="submit" className="ds-btn ds-btn--primary">Save {KIND_NAME[kind].toLowerCase()}</button></div>
    </form>
  );
}

function ChangeForm({ kind, current, onDone }) {
  const { userId } = useSession();
  const toast = useToast();
  const admin = useCan("locations:review");
  const [f, setF] = useState({ address: "", lat: "", lng: "", reason: "" });
  const [error, setError] = useState(null);
  const err = (field) => (error?.field === field ? error.text : null);
  const prefix = "change";
  const send = (e) => {
    e.preventDefault();
    const r = requestLocationChange(userId, kind, { address: f.address, lat: num(f.lat), lng: num(f.lng) }, f.reason);
    if (!r.ok) {
      const field = r.field === "place" ? placeField(r.error) : r.field === "reason" ? "reason" : null;
      if (field) { setError({ field, text: r.error }); document.getElementById(`${prefix}-${field}`)?.focus(); }
      else toast(r.error, "danger");
      return;
    }
    bump();
    toast(r.record.status === "approved" ? `${KIND_NAME[kind]} changed. As an Admin, your own change applies at once; it's kept in your history.` : "Change request sent. An Admin will approve or reject it.", "success");
    onDone();
  };
  return (
    <form id="change-form" className="ds-stack" noValidate onSubmit={send}>
      <Kv rows={[["Now", current.address], ["Position", where(current)]]} />
      {admin && <p className="ds-note">You're an Admin: your own change applies at once and is kept in your history.</p>}
      <div className="ds-form-grid">
        <PlaceFields prefix={prefix} f={f} setF={(fn) => { setF(fn); setError(null); }} err={err} />
        <Field id="change-reason" label="Reason" required full hint={`Why it changes, up to ${REASON_MAX} characters. The Admin who decides sees it.`} error={err("reason")}>
          <TextArea id="change-reason" rows={3} maxLength={REASON_MAX} value={f.reason} hint={`Why it changes, up to ${REASON_MAX} characters. The Admin who decides sees it.`} error={err("reason")}
            onChange={(e) => { setF((s) => ({ ...s, reason: e.target.value })); setError(null); }} />
        </Field>
      </div>
    </form>
  );
}

function HomeCard({ kind, home, pending, onChange }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const place = home[kind];
  const [label, tone] = pending ? ["Change waiting", "info"] : place ? ["Set", "success"] : ["Not set", "warning"];
  const cancel = async () => {
    if (!(await confirm({ message: `Cancel your ${kind} home change request?\nThe place stays as it is now.`, confirmLabel: "Cancel request", danger: true }))) return;
    const r = cancelLocationChange(pending.id, userId);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast("Change request cancelled.", "success");
  };
  return (
    <Card id={`home-${kind}`} title={KIND_NAME[kind]} meta={<Pill tone={tone}>{label}</Pill>}
      actions={place && !pending ? <button type="button" className="ds-btn ds-btn--sm" onClick={() => onChange(kind)} aria-label={`Request a change to your ${kind} home`}>Request change</button> : null}>
      {!place ? <SetHome kind={kind} /> : (
        <div className="ds-stack">
          <Kv rows={[["Address", place.address], ["Position", where(place)], ["Radius", `${HOME_RADIUS_M} m`], ["Set on", day(place.setAt)]]} />
          {pending && (
            <div className="ds-note" id={`home-${kind}-pending`}>
              <p>Waiting for an Admin since {day(pending.requestedAt)}: {pending.place.address}.</p>
              <button type="button" className="ds-btn ds-btn--sm ds-btn--danger" onClick={cancel}>Cancel request</button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Content() {
  const { userId, user } = useSession();
  const office = useData(() => officeOf(userId), [userId]);
  const home = useData(() => homeOf(userId), [userId]);
  const requests = useData(() => locationChangesFor(userId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)), [userId]);
  const [changing, setChanging] = useState(null);
  const pendingOf = (kind) => requests.find((r) => r.kind === kind && r.status === "pending") ?? null;
  const eligible = home.homeEligible;

  const requestColumns = [
    { key: "id", label: "Request" },
    { key: "kind", label: "Home", render: (r) => KIND_NAME[r.kind] },
    { key: "place", label: "New address", render: (r) => r.place.address },
    { key: "reason", label: "Reason" },
    { key: "requestedAt", label: "Sent", render: (r) => day(r.requestedAt) },
    { key: "status", label: "Status", render: (r) => <Pill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Pill> },
    { key: "decided", label: "Decided", render: (r) => (r.status === "pending" ? "—" : r.status === "cancelled" ? `You, ${day(r.decidedAt)}`
      : `${r.decidedBy === userId ? "You" : nameOf(r.decidedBy)}, ${day(r.decidedAt)}${r.note ? `: ${r.note}` : ""}`) },
  ];
  const history = [...home.history].reverse().map((h, i) => ({ ...h, key: `${h.at}-${i}` }));
  const historyColumns = [
    { key: "at", label: "When", render: (h) => day(h.at) },
    { key: "action", label: "What", render: (h) => (h.kind ? `${ACTION[h.action] ?? h.action}: ${KIND_NAME[h.kind].toLowerCase()}` : ACTION[h.action] ?? h.action) },
    { key: "from", label: "From", render: (h) => h.from?.address ?? "—" },
    { key: "to", label: "To", render: (h) => h.to?.address ?? "—" },
    { key: "by", label: "By", render: (h) => (h.byUserId === userId ? "You" : nameOf(h.byUserId)) },
  ];

  return (
    <>
      <PageHeader title="My locations" subtitle="Where you may check in from" breadcrumb={[{ label: "My account", to: pageUrl("account/my-profile.html") }, { label: "My locations" }]}
        actions={<Link className="ds-btn" to={pageUrl(OFFICES)}><Icon d={ICON.building} />Offices</Link>} />
      <div className="ds-stack">
        <Card id="my-office" title="Your office" meta={office ? (office.type === "head" ? "Head office" : "Branch") : undefined}>
          {office ? <Kv rows={[["Office", office.name], ["Address", office.address], ["Radius", `${office.radiusM} m`]]} />
            : <p className="ds-hint">No office is set for you. Ask an Admin.</p>}
        </Card>
        {eligible ? (
          <div className="ds-cards ds-cards--wide">
            {HOME_KINDS.map((kind) => <HomeCard key={kind} kind={kind} home={home} pending={pendingOf(kind)} onChange={setChanging} />)}
          </div>
        ) : (
          <Card id="home-off" title="Home check-in">
            <div className="ds-stack" id="home-off-text">
              <p><strong>Home check-in isn't on for you.</strong> You check in from your office{office ? `, ${office.name}` : ""}.</p>
              <p className="ds-hint">If you work from home, ask {askWhom(user?.id)} to turn on home check-in for you. Then you can set your permanent and temporary home here.</p>
            </div>
          </Card>
        )}
        {(eligible || requests.length > 0) && (
          <Card id="my-requests" title="Change requests" meta={requests.length ? `${requests.length}` : undefined}>
            <Table bare columns={requestColumns} rows={requests} empty="No change requests yet. Once a home is set, Request change sends one." tableId="location-requests" />
          </Card>
        )}
        {(eligible || history.length > 0) && (
          <Card id="my-history" title="History" meta="Every set and change">
            <Table bare columns={historyColumns} rows={history} rowKey={(h) => h.key} empty="Nothing yet. Setting a home adds a line here." tableId="location-history" />
          </Card>
        )}
        <p className="ds-privacy">{PRIVACY}</p>
      </div>
      <Modal open={Boolean(changing)} onClose={() => setChanging(null)} id="change-modal" title={changing ? `Change your ${changing} home` : ""}
        desc="Give the new place and a reason. An Admin approves or rejects it; until then the current place counts."
        footer={<><button type="button" className="ds-btn" onClick={() => setChanging(null)}>Cancel</button><button type="submit" form="change-form" className="ds-btn ds-btn--primary">Send request</button></>}>
        {changing && home[changing] && <ChangeForm key={changing} kind={changing} current={home[changing]} onDone={() => setChanging(null)} />}
      </Modal>
    </>
  );
}

export default function MyLocations() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("My locations"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  return <Shell page={MY_LOCATIONS} title="My locations"><Content /></Shell>;
}