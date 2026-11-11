// Regularization (pages/attendance/regularization.html + assets/js/pages/regularization.js), ported: the Pending / Approved /
// Rejected tabs of correction requests with their counts, the name search, 10 a page, Export; on Pending, Approve / Reject
// where the person may decide now (components/Decision.jsx: the in-app question, the reject modal), else who it waits for;
// the policy card (the old page's own words).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import pageHtml from "../../../pages/attendance/regularization.html?raw";
import { csvValue, csvColumns, csvRows, initExports } from "../../../assets/js/ui/csv-export.js";
import { getUser } from "../../../assets/js/data/store.js";
import { allRegularizations, pendingRegularizations, dayFor } from "../../../assets/js/data/attendance-store.js";
import { currentApproverName } from "../../../assets/js/data/leave-store.js";
import { el, formatDay, statusBadge, departmentName, decisionOf, nameOf, personCell } from "../../../assets/js/ui/leave-view.js";
import { issueLabel } from "../../../assets/js/ui/attendance-view.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import Pagination from "../ui/Pagination.jsx";
import { useDecision, CORRECTION_FLOW } from "../components/Decision.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

csvColumns("regularization-requests", { Employee: { split: "Department" } });   // Round Data export part 2

const PAGE = "attendance/regularization.html";
const PAGE_SIZE = 10;
const TABS = [["Pending", "pending"], ["Approved", "approved"], ["Rejected", "rejected"]];
const ASIDE = (() => {
  const doc = new DOMParser().parseFromString(pageHtml, "text/html");
  return doc.querySelector("main .grid > aside")?.innerHTML ?? "";
})();
const decidedAt = (r) => decisionOf(r)?.at ?? "";
const byId = (a, b) => a.id.localeCompare(b.id, "en", { numeric: true });
function tabRequests(which, userId) {
  if (which === "pending") return allRegularizations().filter((r) => r.status === "pending" && r.userId !== userId).sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || byId(a, b));
  return allRegularizations().filter((r) => r.status === which).sort((a, b) => decidedAt(b).localeCompare(decidedAt(a)) || byId(b, a));
}
function recordedTime(request) {
  if (request.status !== "pending") return request.recordedTime ?? null;
  const day = dayFor(request.userId, request.date);
  return (request.issue === "missed-check-out" ? day?.checkOut : day?.checkIn) ?? null;
}
function timesCell(request) {
  const td = el("td");
  const times = el("span", "reg-times");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", "M5 12h14M13 6l6 6-6 6"); svg.append(path);
  times.append(el("span", "reg-times__old", recordedTime(request) ?? "–"), svg, el("strong", "", request.time));
  td.append(times);
  return td;
}
// regularization.js row(); the buttons call the page's current handlers (on.current)
function row(request, tab, mineIds, on, canDecide) {
  const tr = el("tr");
  const status = el("td"); status.append(statusBadge(request.status));
  const actions = el("td", "table__actions");
  actions.hidden = tab !== "pending";
  if (tab === "pending") {
    if (mineIds.has(request.id)) {
      const group = el("div", "btn-group");
      const reject = el("button", "btn btn--sm", "Reject"); reject.type = "button"; reject.dataset.permission = "attendance:approve"; reject.hidden = !canDecide;
      reject.addEventListener("click", () => on.current.reject(request));
      const approve = el("button", "btn btn--primary btn--sm", "Approve"); approve.type = "button"; approve.dataset.permission = "attendance:approve"; approve.hidden = !canDecide;
      approve.addEventListener("click", () => on.current.approve(request));
      group.append(reject, approve);
      actions.append(group);
    } else actions.append(el("span", "text-muted text-sm", `Waiting for ${currentApproverName(request)}`));
  }
  const person = getUser(request.userId);
  tr.append(personCell(request.userId, person, departmentName(person?.department)), csvValue(el("td", "", formatDay(request.date)), request.date),
    el("td", "", issueLabel(request)), timesCell(request), el("td", "reg-reason", request.reason), status, actions);
  return tr;
}

export default function Regularization() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export"), canDecide = useCan("attendance:approve");
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const decision = useDecision(CORRECTION_FLOW);
  const on = useRef({});
  on.current.approve = (r) => decision.approve(r);
  on.current.reject = (r) => decision.reject(r);

  const d = useData(() => ({
    lists: Object.fromEntries(TABS.map(([, k]) => [k, tabRequests(k, userId)])),
    mineIds: new Set(pendingRegularizations(userId, role?.key).map((r) => r.id)),
  }), [userId, role?.key]);
  const query = search.trim().toLowerCase();
  const rows = d.lists[tab].filter((r) => !query || nameOf(r.userId).toLowerCase().includes(query));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => { initExports(document.getElementById("main")); }, []);
  useEffect(() => { csvRows("regularization-requests", () => rows.map((r) => row(r, tab, d.mineIds, on, canDecide))); });

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("attendance/team-attendance.html")}>Team attendance</Link></li>
            <li className="breadcrumb__item" aria-current="page">Regularization</li>
          </ol>
          <h1>Regularization</h1>
          <p className="page-header__subtitle">Corrections to late or missed punches, waiting for a decision</p>
        </div>
        <div className="page-header__actions">
          <button className="btn" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export>Export</button>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <section className="card">
          <div className="table__toolbar">
            <div className="tabs tabs--pill" role="tablist">
              {TABS.map(([label, key]) => (
                <button key={key} className={`tabs__tab${tab === key ? " is-active" : ""}`} type="button" role="tab" onClick={() => { setTab(key); setPage(1); }}>
                  {`${label} `}<span className="badge badge--count">{String(d.lists[key].length)}</span>
                </button>
              ))}
            </div>
            <div className="input-group">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input className="input input--sm input--search" type="search" placeholder="Search employees" aria-label="Search requests" data-table-filter="off" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" data-export-name="regularization-requests">
              <thead><tr><th>Employee</th><th>Date</th><th>Issue</th><th>Recorded, requested</th><th>Reason</th><th>Status</th><th className="table__actions" hidden={tab !== "pending" || undefined}>Actions</th></tr></thead>
              <Nodes as="tbody" deps={[d, tab, search, current, canDecide]} build={() => {
                if (pageRows.length) return pageRows.map((r) => row(r, tab, d.mineIds, on, canDecide));
                const td = el("td", "text-muted", tab === "pending" && !search.trim() ? "Nothing is waiting for a decision." : "No requests match this search."); td.colSpan = 7;
                const tr = el("tr"); tr.append(td); return [tr];
              }} />
            </table>
          </div>
          <Pagination totalItems={rows.length} pageSize={PAGE_SIZE} currentPage={current} onPageChange={setPage} />
        </section>
        <aside className="stack" dangerouslySetInnerHTML={{ __html: ASIDE }} />
      </div>
      {decision.modal}
    </Frame>
  );
}
