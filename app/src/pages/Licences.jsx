// Software licences (IT2): the licences IT keeps and their seats (data/licences.js). IT and the Admin (it:licences-manage) add and change
// licences and give and take back seats; Finance (it:licences-view-costs) reads them. The cost of a licence is a value field: the data
// functions leave it out for anyone without it:licences-view-costs, and the page draws no cost column, cell or word for them (so nothing is
// hidden by css: it is not in the page). Renewals in the next 30, 60 or 90 days, seats held by people who have left, licences with seats
// nobody uses. Components: Table, KpiCard, Tabs, Modal (through AskDialog).
import { useState } from "react";
import { licencesFor, seatsOf, expiringRenewals, underUsedLicences, seatsOfLeavers, addLicence, updateLicence, assignSeat, revokeSeat } from "../../../assets/js/data/licences.js";
import { vendorsFor } from "../../../assets/js/data/asset-register.js";
import { formatDay, plural } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { PageHeader, KpiCard, Card } from "../components/Layout.jsx";
import { EmptyState, Tabs } from "../components/Basics.jsx";
import { Field, Select } from "../components/Form.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { IT_LICENCES } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { AskDialog, nameOf, activePeople } from "../ui/it.jsx";
import { PATH } from "../ui/assets.jsx";

const TITLE = "Licences";
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const WINDOWS = [30, 60, 90];

function SeatsDialog({ licence, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const d = useData(() => ({ seats: seatsOf(userId, licence.id), lic: licencesFor(userId).find((l) => l.id === licence.id) ?? licence }), [userId, licence.id]);
  const [person, setPerson] = useState("");
  const [error, setError] = useState(null);
  const holders = new Set(d.seats.map((s) => s.personId));
  const give = (e) => {
    e.preventDefault();
    const r = assignSeat(userId, licence.id, person);
    if (!r.ok) { setError(r.error); return; }
    bump(); setPerson(""); setError(null); toast(`${nameOf(r.record.personId)} has a ${licence.software} seat.`, "success");
  };
  const take = async (s) => {
    if (!(await confirm({ message: `Take ${licence.software} back from ${nameOf(s.personId)}?`, confirmLabel: "Revoke the seat", cancelLabel: "Keep it", danger: true }))) return;
    const r = revokeSeat(userId, s.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast(`Seat taken back from ${nameOf(s.personId)}.`, "success");
  };
  return (
    <Modal open onClose={onClose} id="seats-modal" size="lg" title={`${licence.software}: seats`} desc={`${d.lic.used} of ${d.lic.seats} in use, ${d.lic.free} free.`}
      footer={<button type="button" className="ds-btn" onClick={onClose}>Close</button>}>
      <div className="ds-stack">
        {d.seats.length === 0 ? <p className="text-muted">Nobody holds a seat yet.</p> : (
          <ul className="it-seats" id="seat-list">
            {d.seats.map((s) => (
              <li key={s.id} data-seat={s.id}><span>{nameOf(s.personId)} <span className="it-sub">since {formatDay(s.assignedAt, true)}</span></span>
                <button type="button" className="ds-btn ds-btn--sm ds-btn--danger" onClick={() => take(s)} aria-label={`Revoke ${nameOf(s.personId)}'s seat`}>Revoke</button></li>
            ))}
          </ul>
        )}
        <form className="ds-stack" id="seat-form" onSubmit={give} noValidate>
          <Field id="seat-person" label="Give a seat to" error={error} hint={d.lic.free ? undefined : "All seats are in use."}>
            <Select id="seat-person" placeholder="Choose a person" options={activePeople().filter((u) => !holders.has(u.id)).map((u) => [u.id, u.name])} value={person} error={error} onChange={(e) => { setPerson(e.target.value); setError(null); }} />
          </Field>
          <div><button type="submit" className="ds-btn ds-btn--primary" id="seat-give">Give a seat</button></div>
        </form>
      </div>
    </Modal>
  );
}

function LicenceDialog({ licence, canCosts, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const editing = Boolean(licence);
  const vendors = useData(() => vendorsFor(userId).filter((v) => v.active || v.id === licence?.vendorId), [userId]);
  const fields = [
    { name: "software", label: "Software", kind: "input", required: true, maxLength: 80, value: licence?.software ?? "", alias: ["software"] },
    { name: "vendorId", label: "Vendor", kind: "select", options: vendors.map((v) => [v.id, v.name]), placeholder: "No vendor", value: licence?.vendorId ?? "", alias: ["vendorId"] },
    { name: "seats", label: "Seats", kind: "input", required: true, value: licence ? String(licence.seats) : "", hint: "How many people may use it.", alias: ["seats"] },
    { name: "renewalDate", label: "Renewal date", kind: "date", required: true, value: licence?.renewalDate ?? "", alias: ["renewalDate"] },
    ...(!editing || canCosts ? [{ name: "costPerYear", label: "Cost per year (₹)", kind: "input", value: licence?.costPerYear != null ? String(licence.costPerYear) : "", hint: editing ? undefined : "From the invoice. Only Finance and the Admin read it back.", alias: ["costPerYear"] }] : []),
    ...(editing ? [{ name: "status", label: "Status", kind: "select", options: [["active", "Active"], ["cancelled", "Cancelled"]], value: licence.status, alias: ["status"] }] : []),
  ];
  const run = (v) => {
    const body = { software: v.software, vendorId: v.vendorId, seats: v.seats, renewalDate: v.renewalDate, ...("costPerYear" in v ? { costPerYear: v.costPerYear === "" ? 0 : v.costPerYear } : {}), ...(editing ? { status: v.status } : {}) };
    return editing ? updateLicence(userId, licence.id, body) : addLicence(userId, body);
  };
  return <AskDialog id="licence" title={editing ? `Edit ${licence.software}` : "Add a licence"} desc={editing ? "Change what IT keeps for it." : "A new licence has no seats given out yet."} submitLabel={editing ? "Save" : "Add licence"} size="lg" fields={fields} run={run} onClose={onClose}
    onDone={(r) => toast(editing ? `${r.record.software} saved.` : `${r.record.software} added.`, "success")} />;
}

function Content() {
  const { userId } = useSession();
  const manage = useCan("it:licences-manage"), costs = useCan("it:licences-view-costs");
  const toast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null);   // { kind: "seats" | "licence", licence }
  const [win, setWin] = useState(0);
  const d = useData(() => ({
    list: licencesFor(userId), vendors: Object.fromEntries(vendorsFor(userId).map((v) => [v.id, v.name])),
    renewals: Object.fromEntries(WINDOWS.map((w) => [w, expiringRenewals(userId, w)])), under: underUsedLicences(userId), leavers: seatsOfLeavers(userId),
  }), [userId]);
  const showCost = d.list.some((l) => l.costPerYear !== undefined);
  const active = d.list.filter((l) => l.status === "active");
  const seats = active.reduce((n, l) => n + l.seats, 0), used = active.reduce((n, l) => n + l.used, 0);
  const cols = (extra = []) => [
    { key: "software", label: "Software", className: "it-title-col", sort: (l) => l.software, render: (l) => <span className="it-cell"><strong>{l.software}</strong><span className="it-sub">{d.vendors[l.vendorId] ?? "No vendor"}{l.sample ? ", sample" : ""}</span></span> },
    { key: "seats", label: "Seats", num: true, sort: (l) => l.used, render: (l) => <span className="it-cell">{l.used} of {l.seats}<span className="it-sub">{l.free} free</span></span> },
    { key: "renewal", label: "Renews", sort: (l) => l.renewalDate, render: (l) => formatDay(l.renewalDate, true) },
    ...(showCost ? [{ key: "cost", label: "Cost per year", num: true, sort: (l) => l.costPerYear ?? 0, render: (l) => (l.costPerYear !== undefined ? inr(l.costPerYear) : "") }] : []),
    ...extra,
  ];
  const main = cols([
    { key: "status", label: "Status", sort: (l) => l.status, render: (l) => <span className="it-cell">{l.status === "active" ? "Active" : "Cancelled"}</span> },
    { key: "actions", label: "Actions", actions: true, render: (l) => (
      <span className="ds-form-actions__buttons">
        <button type="button" className="ds-btn ds-btn--sm" data-action="seats" onClick={() => setDialog({ kind: "seats", licence: l })} aria-label={`Seats of ${l.software}`}>{manage ? "Seats" : "See seats"}</button>
        {manage && <button type="button" className="ds-btn ds-btn--sm" data-action="edit" onClick={() => setDialog({ kind: "licence", licence: l })} aria-label={`Edit ${l.software}`}>Edit</button>}
      </span>) },
  ]);
  const revoke = async (s) => {
    if (!(await confirm({ message: `Take ${s.software} back from ${nameOf(s.personId)}, who has left?`, confirmLabel: "Revoke the seat", cancelLabel: "Keep it", danger: true }))) return;
    const r = revokeSeat(userId, s.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast("Seat taken back.", "success");
  };
  const leaverCols = [
    { key: "who", label: "Person", sort: (s) => nameOf(s.personId), render: (s) => nameOf(s.personId) },
    { key: "sw", label: "Software", sort: (s) => s.software, render: (s) => s.software },
    { key: "since", label: "Since", render: (s) => formatDay(s.assignedAt, true) },
    ...(manage ? [{ key: "actions", label: "Actions", actions: true, render: (s) => <button type="button" className="ds-btn ds-btn--sm ds-btn--danger" data-action="revoke" onClick={() => revoke(s)} aria-label={`Revoke ${s.software} from ${nameOf(s.personId)}`}>Revoke</button> }] : []),
  ];
  const w = WINDOWS[win];
  return (
    <>
      <PageHeader title="Licences" subtitle="Software IT keeps, and who holds a seat"
        actions={manage ? <button type="button" className="ds-btn ds-btn--primary" id="add-licence" onClick={() => setDialog({ kind: "licence", licence: null })}><Icon d={PATH.plus} />Add licence</button> : null} />
      <div className="ds-stack">
        <div className="ds-grid it-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-licences" label="Active licences" value={String(active.length)} icon={ICON.layers} />
          <KpiCard id="kpi-seats" label="Seats in use" value={`${used} of ${seats}`} icon={ICON.users} />
          <KpiCard id="kpi-renewals" label="Renewing in 30 days" value={String(d.renewals[30].length)} icon={ICON.calendar} />
          <KpiCard id="kpi-leavers" label="Seats of people who left" value={String(d.leavers.length)} icon={ICON.clock} />
        </div>
        <Card id="licences-card" title="All licences" meta={<span id="licences-count">{countText(d.list.length, d.list.length, "licence")}</span>}>
          {d.list.length === 0 ? <EmptyState title="No licences yet." text={manage ? "Add the first one with Add licence." : "None have been added."} />
            : <Table bare columns={main} rows={d.list} rowKey={(l) => l.id} empty="No licences." tableId="licences-table" tableClass="table table--tight it-table" />}
        </Card>
        <div className="it-two">
          <Card id="renewals-card" title="Renewals" meta={`Next ${w} days`}>
            <div className="ds-stack">
              <Tabs pill active={win} onChange={setWin} tabs={WINDOWS.map((x) => ({ label: `${x} days`, count: String(d.renewals[x].length) }))} />
              <Table bare pager={false} columns={cols().map(({ sort, ...c }) => c)} rows={d.renewals[w]} rowKey={(l) => l.id} empty={`Nothing renews in the next ${w} days.`} tableId="renewals-table" tableClass="table table--tight it-table" />
            </div>
          </Card>
          <Card id="leavers-card" title="Seats held by people who left" meta={d.leavers.length ? plural(d.leavers.length, "seat", "seats") : "None"}>
            <Table bare pager={false} columns={leaverCols.map(({ sort, ...c }) => c)} rows={d.leavers} rowKey={(s) => s.id} empty="No seat is held by someone who has left." tableId="leavers-table" tableClass="table table--tight it-table" />
          </Card>
        </div>
        <Card id="under-card" title="Seats nobody uses" meta={d.under.length ? plural(d.under.length, "licence", "licences") : "None"}>
          {d.under.length === 0 ? <p className="text-muted">Every seat is in use.</p> : <ul className="it-seats">{d.under.map((l) => <li key={l.id}><span>{l.software}</span><span className="it-sub">{l.free} of {l.seats} free</span></li>)}</ul>}
        </Card>
      </div>
      {dialog?.kind === "seats" && <SeatsDialog licence={dialog.licence} onClose={() => setDialog(null)} />}
      {dialog?.kind === "licence" && <LicenceDialog licence={dialog.licence} canCosts={costs} onClose={() => setDialog(null)} />}
    </>
  );
}

export default function Licences() {
  const manage = useCan("it:licences-manage"), costs = useCan("it:licences-view-costs");
  return <OwnPage page={IT_LICENCES} title={TITLE} allowed={manage || costs}><Content /></OwnPage>;
}