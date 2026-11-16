// Team visits (CV1, 2026-11-16): for the people who decide and assign visits: a manager (their direct reports), HR and an Admin (everyone,
// visits:view-all). "Waiting for you" first: visits to approve or reject (a rejection needs a reason) and punches made as "location
// unavailable" that need an explicit OK; then every visit with status, a status filter and the shared date range. "Assign a visit" puts
// a visit on one or more people, approved from the start. "On site today" lists who is checked in on a visit. The app's own page.
import { useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { visitsVisibleTo, pendingVisitItems, onSiteToday, phaseOf, mayDecideVisit } from "../../../assets/js/data/visits.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { formatDay, nameOf } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState, NO_DATA, Tabs } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { useDecision, VISIT_FLOW, VISIT_LOCATION_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { VisitStatus, AssignVisitModal, assignable, kindLabel, visitDates, visitDays, PIN } from "../ui/visits.jsx";
import { STATUS_OPTIONS } from "./MyVisits.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl, TEAM_VISITS, VISIT_PAGE } from "../routes.js";
import { mayOpenTeamVisits } from "../shell/appNav.js";

const NONE = { preset: "", from: "", to: "" };
const link = (id, text) => <Link className="visit-site__name" to={`${pageUrl(VISIT_PAGE)}?id=${id}`}>{text}</Link>;

function Content() {
  const { userId } = useSession();
  const canView = useCan("visits:view-all");
  const flow = useDecision(VISIT_FLOW);
  const locFlow = useDecision(VISIT_LOCATION_FLOW);   // CV1b: the same Accept / Reject as the inbox and the card
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState(NONE);
  const [assigning, setAssigning] = useState(false);
  const today = officeNow().date;
  const d = useData(() => ({
    all: visitsVisibleTo(userId).filter((v) => v.personId !== userId),
    waiting: pendingVisitItems(userId),
    onSite: onSiteToday(userId),
    canAssign: assignable(userId).length > 0,
  }), [userId]);
  const filtered = Boolean(status || q.trim() || range.preset);
  const shown = d.all.filter((v) => (!status || phaseOf(v, today) === status) && (!q.trim() || nameOf(v.personId).toLowerCase().includes(q.trim().toLowerCase()) || v.siteName.toLowerCase().includes(q.trim().toLowerCase()))
    && (!range.preset || (v.fromDate <= range.to && v.toDate >= range.from)));

  const person = (id) => <div className="visit-site"><span className="visit-site__name">{nameOf(id)}</span><span className="visit-site__sub">{getUser(id)?.designation ?? ""}</span></div>;
  const waitingColumns = [
    { key: "who", label: "Person", render: (x) => person(x.personId) },
    { key: "visit", label: "Visit", render: (x) => <div className="visit-site">{link(x.visitId, x.siteName)}<span className="visit-site__sub">{x.kind === "location" ? `${formatDay(x.date)}: ${x.side === "out" ? "check-out" : "check-in"} without a location` : x.sameDay ? "Started today, approval after" : visitDates({ fromDate: x.date, toDate: x.toDate })}</span></div> },
    { key: "what", label: "Needs", render: (x) => (x.kind === "location" ? <span className="visit-chip visit-chip--warn"><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={PIN} /></svg>An OK for the location</span> : "Approval") },
    { key: "why", label: "Why", render: (x) => <span className="text-sm">{x.kind === "location" ? x.reason : x.reason}</span> },
    { key: "actions", label: "Actions", actions: true, render: (x) => (x.kind === "location"
      ? <DecisionButtons permission="visits:approve" labels={["Reject", "Accept"]} onReject={() => locFlow.reject(x)} onApprove={() => locFlow.approve(x)} />
      : <DecisionButtons permission="visits:approve" onReject={() => flow.reject(x)} onApprove={() => flow.approve(x)} />) },
  ];
  const allColumns = [
    { key: "who", label: "Person", sort: (v) => nameOf(v.personId), render: (v) => person(v.personId) },
    { key: "site", label: "Visit", sort: (v) => v.siteName.toLowerCase(), render: (v) => <div className="visit-site">{link(v.id, v.siteName)}<span className="visit-site__sub">{kindLabel(v.kind)}</span></div> },
    { key: "dates", label: "Dates", sort: (v) => v.fromDate, render: (v) => <div className="visit-site"><span>{visitDates(v)}</span><span className="visit-site__sub">{visitDays(v)}</span></div> },
    { key: "source", label: "Set up by", render: (v) => (v.source === "assigned" ? `Assigned by ${getUser(v.assignedBy)?.name ?? "someone"}` : "Asked by them") },
    { key: "status", label: "Status", render: (v) => <VisitStatus visit={v} /> },
  ];
  const tabs = [{ label: "Waiting for you", count: String(d.waiting.length) }, { label: "All visits", count: String(d.all.length) }];

  return (
    <>
      <PageHeader title="Team visits" subtitle={canView ? "Everyone's client and official visits" : "Your team's client and official visits"}
        actions={d.canAssign ? <button className="ds-btn ds-btn--primary" type="button" id="assign-visit-btn" onClick={() => setAssigning(true)}>Assign a visit</button> : null} />
      <div className="ds-stack">
        <Card id="on-site-today" title="On site today" meta={d.onSite.length ? countText(d.onSite.length, d.onSite.length, "person") : undefined}>
          {d.onSite.length
            ? <ul className="visit-onsite" aria-label="People on site today">{d.onSite.map((x) => <li className="visit-onsite__item" key={x.visitId}><strong>{x.name}</strong><small>{x.siteName}, in {x.checkIn}{x.checkOut ? `, out ${x.checkOut}` : ""}</small></li>)}</ul>
            : <p className="text-muted">Nobody on your team is checked in on a visit right now.</p>}
        </Card>
        <Tabs pill active={tab} onChange={setTab} tabs={tabs} />
        {tab === 0
          ? <Card id="visits-waiting" title="Waiting for you" meta={countText(d.waiting.length, d.waiting.length, "item")}>
              {d.waiting.length
                ? <Table bare pager={false} tableId="waiting-table" tableClass="table table--fit" columns={waitingColumns} rows={d.waiting} rowKey={(x) => x.id} rowProps={(x) => ({ "data-visit": x.visitId })} empty="Nothing is waiting for you." />
                : <EmptyState title="Nothing is waiting for you" text="Visit requests from your team, and locations that need your OK, show here." />}
            </Card>
          : <>
              <FilterBar label="Filter visits" active={filtered} onClearAll={() => { setStatus(""); setQ(""); setRange(NONE); }}>
                <FilterSearch label="Search" value={q} onChange={setQ} placeholder="Person or place" />
                <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS.map(([value, label]) => ({ value, label }))} allLabel="All statuses" />
                <DateRange value={range} onChange={setRange} today={today} label="Dates" />
              </FilterBar>
              <Card id="visits-all" title="All visits" meta={countText(shown.length, d.all.length, "visit", { filtered })}>
                {d.all.length === 0 ? <EmptyState title="No visits yet" text="Visits your team asks for, and the ones you assign, are listed here." />
                  : shown.length === 0 ? <EmptyState title={range.preset ? NO_DATA : "No visits match"} text={range.preset ? "No visit falls on these dates." : "Change the search or the status."} />
                  : <Table bare pager={false} tableId="team-visit-table" tableClass="table table--fit" columns={allColumns} rows={shown} rowKey={(v) => v.id} rowProps={(v) => ({ "data-visit": v.id })} empty={NO_DATA} />}
              </Card>
            </>}
      </div>
      <AssignVisitModal open={assigning} onClose={() => setAssigning(false)} />
      <span style={{ display: "contents" }}>{flow.modal}{locFlow.modal}</span>
    </>
  );
}

export default function TeamVisits() {
  useSession();
  return <OwnPage page={TEAM_VISITS} title="Team visits" allowed={mayOpenTeamVisits()}><Content /></OwnPage>;
}
