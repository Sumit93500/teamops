// My visits (CV1, 2026-11-16): the visits the signed-in person asked for or was given, newest first: status chips, a status filter and
// the shared date range ("No data in this range." when nothing falls inside it), Cancel before a visit starts, a link to each visit's
// page (the punch trail), and Request a visit. The app's own page: everyone signed in may open it (visits:request is everyone's).
import { useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { visitsFor } from "../../../assets/js/data/visits-store.js";
import { cancelVisit, phaseOf, mayCancelVisit } from "../../../assets/js/data/visits.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect } from "../components/Controls.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useToast } from "../ui/Toast.jsx";
import { VisitStatus, RequestVisitModal, kindLabel, visitDates, visitDays } from "../ui/visits.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { pageUrl, MY_VISITS, VISIT_PAGE } from "../routes.js";

export const STATUS_OPTIONS = [["planned", "Planned"], ["pending", "Pending"], ["approved", "Approved"], ["in-progress", "In progress"], ["completed", "Completed"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]];
const NONE = { preset: "", from: "", to: "" };

function Content() {
  const { userId } = useSession();
  const canRequest = useCan("visits:request");
  const toast = useToast();
  const confirm = useConfirm();
  const today = officeNow().date;
  const [status, setStatus] = useState("");
  const [range, setRange] = useState(NONE);
  const [asking, setAsking] = useState(false);
  const d = useData(() => ({ rows: visitsFor(userId).sort((a, b) => b.fromDate.localeCompare(a.fromDate) || b.id.localeCompare(a.id, "en", { numeric: true })), user: getUser(userId) }), [userId]);
  const shown = d.rows.filter((v) => (!status || phaseOf(v, today) === status) && (!range.preset || (v.fromDate <= range.to && v.toDate >= range.from)));
  const filtered = Boolean(status || range.preset);

  const cancel = async (v) => {
    if (!(await confirm({ message: `Cancel your visit to ${v.siteName} (${visitDates(v)})?`, confirmLabel: "Cancel visit", cancelLabel: "Keep it", danger: true }))) return;
    const r = cancelVisit(userId, v.id, "");
    toast(r.ok ? "Visit cancelled." : r.error, r.ok ? "success" : "danger"); bump();
  };
  const columns = [
    { key: "site", label: "Visit", sort: (v) => v.siteName.toLowerCase(), render: (v) => <div className="visit-site"><Link className="visit-site__name" to={`${pageUrl(VISIT_PAGE)}?id=${v.id}`}>{v.siteName}</Link><span className="visit-site__sub">{kindLabel(v.kind)}</span></div> },
    { key: "dates", label: "Dates", sort: (v) => v.fromDate, render: (v) => <div className="visit-site"><span>{visitDates(v)}</span><span className="visit-site__sub">{visitDays(v)}</span></div> },
    { key: "source", label: "Set up by", render: (v) => (v.source === "assigned" ? `Assigned by ${getUser(v.assignedBy)?.name ?? "someone"}` : "You asked") },
    { key: "status", label: "Status", render: (v) => <VisitStatus visit={v} /> },
    { key: "actions", label: "Actions", actions: true, render: (v) => {
      const cancellable = mayCancelVisit(userId, v) && (v.status === "pending" || v.status === "approved") && !Object.values(v.days).some((x) => x.in || x.out);
      return cancellable ? <button className="ds-btn ds-btn--sm ds-btn--danger" type="button" onClick={() => cancel(v)}>Cancel</button> : v.status === "rejected" && v.decisionReason ? <span className="text-sm text-muted">{v.decisionReason}</span> : null;
    } },
  ];
  return (
    <>
      <PageHeader title="My visits" subtitle="Client and official visits you asked for or were given"
        actions={canRequest ? <button className="ds-btn ds-btn--primary" type="button" id="request-visit-btn" onClick={() => setAsking(true)}>Request a visit</button> : null} />
      <div className="ds-stack">
        <FilterBar label="Filter my visits" active={filtered} onClearAll={() => { setStatus(""); setRange(NONE); }}>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS.map(([value, label]) => ({ value, label }))} allLabel="All statuses" />
          <DateRange value={range} onChange={setRange} today={today} label="Dates" />
        </FilterBar>
        <Card id="visit-list" title="Visits" meta={countText(shown.length, d.rows.length, "visit", { filtered })}>
          {d.rows.length === 0
            ? <EmptyState title="No visits yet" text="Ask for a visit when you will work from a client's or another place. Your manager decides it." />
            : shown.length === 0 ? <EmptyState title={range.preset ? NO_DATA : "No visits match"} text={range.preset ? "None of your visits fall on these dates." : "Change the status to see more."} />
            : <Table bare pager={false} tableId="visit-table" tableClass="table table--fit" columns={columns} rows={shown} rowKey={(v) => v.id} rowProps={(v) => ({ "data-visit": v.id })} empty={NO_DATA} />}
        </Card>
      </div>
      <RequestVisitModal open={asking} onClose={() => setAsking(false)} />
    </>
  );
}

export default function MyVisits() {
  return <OwnPage page={MY_VISITS} title="My visits"><Content /></OwnPage>;
}
