// Team attendance (pages/attendance/team-attendance.html + assets/js/pages/team-attendance.js), ported: a date (today or
// earlier; a future one refused with the old toast), the stats, the All / Present / Late / On leave / Absent tabs with their
// counts, search by name, department, the Employee sort, 10 a page, the week's dots, Export (none for a manager's team, as
// ruled), attendance by department, who needs attention with Message, and the Regularization link's pending count. Admin and
// HR see everyone; a manager sees their direct reports (data/reporting.js teamScope).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { can } from "../../../assets/js/core/rbac.js";
import { getAllUsers, getAllDepartments } from "../../../assets/js/data/store.js";
import { isValidDate } from "../../../assets/js/data/holidays.js";
import { allRequests } from "../../../assets/js/data/leave-store.js";
import { teamWeekFor, summaryFor, pendingRegularizations } from "../../../assets/js/data/attendance-store.js";
import { teamScope } from "../../../assets/js/data/reporting.js";
import { csvColumns, csvRows, initExports } from "../../../assets/js/ui/csv-export.js";
import { el, weekdayName, todayIso, formatDay, initials, avatarClass, departmentName, shortDate, plural, personCell, showReason } from "../../../assets/js/ui/leave-view.js";
import { dayBadge, presentNote, checkInCell, hoursCell } from "../../../assets/js/ui/attendance-view.js";
import { barRow } from "../../../assets/js/ui/chart.js";
import { departmentPresenceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import Frame from "../ui/Frame.jsx";
import Nodes from "../ui/Nodes.jsx";
import Pagination from "../ui/Pagination.jsx";
import { useToast } from "../ui/Toast.jsx";
import { StatStrip, StatCard } from "../components/Basics.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

csvColumns("team-attendance", { Employee: { split: "Employee ID" } });   // Round Data export part 2

const PAGE = "attendance/team-attendance.html";
const PAGE_SIZE = 10;
const WEEK = {
  present: ["p", "P", "present"], late: ["l", "L", "late"], "half-day": ["hd", "HD", "half day"], absent: ["a", "A", "absent"], "on-leave": ["lv", "LV", "on leave"],
  holiday: ["hol", "HOL", "holiday"], weekend: ["nd", "W", "weekend"], "not-yet": ["ny", "NY", "not in yet"], "no-data": ["nd", "ND", "no data"],
  "not-joined": ["nd", "NJ", "before joining"], left: ["nd", "AL", "after leaving"],
};
const weekPart = (day) => WEEK[day.status] ?? ["nd", "?", day.status];
const isPresent = (day) => ["present", "late", "half-day"].includes(day.status);
const isAbsent = (day) => day.status === "absent" || day.overdue;
const isMissing = (day) => !day.checkIn && isAbsent(day);
const TABS = { all: () => true, present: isPresent, late: (day) => day.status === "late", "on-leave": (day) => day.status === "on-leave", absent: isAbsent };
const TAB_LABELS = [["all", "All"], ["present", "Present"], ["late", "Late"], ["on-leave", "On leave"], ["absent", "Absent"]];
const ICONS = {
  present: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6", 2], late: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2", 3],
  "on-leave": ["M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", 1], absent: ["M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0", 4],
};

function weekCell(week) {
  const td = el("td");
  const strip = el("span", "week");
  strip.setAttribute("role", "img");
  strip.setAttribute("aria-label", week.map((d) => `${weekdayName(d.date)} ${weekPart(d)[2]}`).join(", "));
  week.forEach((d) => { const [suffix, , words] = weekPart(d); const dot = el("i", `week__day week__day--${suffix}`); dot.title = `${shortDate(d.date)}: ${words}`; strip.append(dot); });
  strip.append(el("span", "sr-only", week.map((d) => weekPart(d)[1]).join(",")));
  td.append(strip);
  return td;
}
function row(r) {
  const tr = el("tr");
  const status = el("td");
  const badge = dayBadge(r.day);
  status.append(badge);
  showReason(badge, badge.title);
  tr.append(personCell(r.day.userId, r.user, r.day.userId), el("td", "", departmentName(r.user?.department)), checkInCell(r.day), hoursCell(r.day), weekCell(r.week), status);
  return tr;
}
function emptyRow(text) { const td = el("td", "text-muted", text); td.colSpan = 6; const tr = el("tr"); tr.append(td); return tr; }
function attentionNote(day, pendingLeave) {
  if (day.regularization?.status === "pending" && day.regularization.issue === "missed-check-in") return "correction pending";
  if (pendingLeave.has(day.userId)) return "leave request pending";
  return "no check-in or leave request";
}
function attentionItems(rows, summary, date, today) {
  const pendingLeave = new Set(allRequests().filter((r) => r.status === "pending" && r.type !== "wfh" && r.from <= date && date <= r.to).map((r) => r.userId));
  const people = rows.filter((r) => isMissing(r.day));
  if (!people.length) {
    const item = el("div", "list__item"); const content = el("div", "list__content");
    content.append(el("span", "list__sub", summary.expected ? "Everyone is accounted for." : "Nobody is expected at work on this date."));
    item.append(content); return [item];
  }
  return people.map((r) => {
    const item = el("div", "list__item");
    const content = el("div", "list__content");
    content.append(el("span", "list__title", r.user?.name ?? r.day.userId), el("span", "list__sub", `${departmentName(r.user?.department)}, ${attentionNote(r.day, pendingLeave)}`));
    item.append(el("div", avatarClass(r.day.userId), initials(r.user?.name)), content);
    if (r.user?.email) {
      const link = el("a", "btn btn--sm", "Message");
      link.href = `mailto:${r.user.email}?subject=${encodeURIComponent(`Attendance on ${formatDay(date, date.slice(0, 4) !== today.slice(0, 4))}`)}`;
      link.setAttribute("aria-label", `Message ${r.user.name}`);
      item.append(link);
    }
    return item;
  });
}

export default function TeamAttendance() {
  const { userId, role } = useSession();
  const canExport = useCan("reports:export"), canApprove = useCan("attendance:approve"), canAll = useCan("attendance:view-all");
  const showToast = useToast();
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [dateField, setDateField] = useState(today);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const scope = useMemo(() => teamScope(userId, can("attendance:view-all")), [userId, role?.key, canAll]);   // eslint-disable-line react-hooks/exhaustive-deps

  const d = useData(() => {
    const people = new Map(getAllUsers().map((u) => [u.id, u]));
    const rows = teamWeekFor(date).filter(({ day }) => scope === null || scope.has(day.userId)).map(({ day, week }) => ({ day, week, user: people.get(day.userId) }));
    return { rows, summary: summaryFor(date, scope), chart: departmentPresenceChart(date, rows, scope), departments: getAllDepartments(), regCount: canApprove ? pendingRegularizations(userId, role?.key).length : 0 };
  }, [date, scope, userId, role?.key, canApprove]);

  // the table (team-attendance.js renderTable)
  const query = search.trim().toLowerCase();
  const narrowed = d.rows.filter((r) => (!dept || r.user?.department === dept) && (!query || (r.user?.name ?? "").toLowerCase().includes(query)));
  const byName = (a, b) => (a.user?.name ?? "").localeCompare(b.user?.name ?? "") || a.day.userId.localeCompare(b.day.userId);
  const shown = narrowed.filter((r) => TABS[tab](r.day)).sort((a, b) => (ascending ? byName(a, b) : byName(b, a)));
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageRows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  let empty = "Nobody matches these filters.";
  if (!d.rows.length) empty = "No active employees.";
  else if (!search.trim() && !dept) empty = "Nobody in this group on this date.";
  // the stats
  const s = d.summary;
  const absent = s.absent + s.overdue, waiting = s.notYet - s.overdue;
  let absentNote = "No check-in or approved leave";
  if (s.overdue) absentNote = `Includes ${s.overdue} overdue${waiting ? `; ${waiting} more not in yet` : ""}`;
  else if (waiting) absentNote = `${plural(waiting, "person", "people")} not in yet, not counted`;
  const [rate, present, expected] = ["Rate", "Present", "Expected"].map((name) => valuesOf(d.chart, name));
  const attention = d.rows.filter((r) => isMissing(r.day)).length;

  useEffect(() => { if (scope === null) initExports(document.getElementById("main")); }, [scope]);
  useEffect(() => { csvRows("team-attendance", () => shown.map(row)); });

  const pick = (picked) => {
    setDateField(picked);
    if (picked === date) return;
    if (!isValidDate(picked) || picked > today) {
      setDateField(date);
      if (picked > today) showToast("Attendance can't be shown for a future date. Pick today or an earlier date.", "warning");
      return;
    }
    setDate(picked); setPage(1);
  };

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Team attendance</h1>
          <p className="page-header__subtitle">Who is in, late, on leave or absent</p>
        </div>
        <div className="page-header__actions">
          <input className="input input--sm" id="team-date" type="date" aria-label="Choose date" style={{ width: "auto" }} max={today} value={dateField} onChange={(e) => pick(e.target.value)} />
          <Link className="btn" id="team-reg-link" to={pageUrl("attendance/regularization.html")} data-permission="attendance:approve" hidden={!canApprove || undefined}>
            Regularization{d.regCount ? <>{" "}<span className="badge badge--count">{String(d.regCount)}<span className="sr-only"> pending</span></span></> : null}
          </Link>
          {scope === null && <button className="btn btn--primary" type="button" data-permission="reports:export" hidden={!canExport || undefined} data-export>Export</button>}
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {[["present", "Present", s.present, presentNote(s, d.rows.map((r) => r.day)), ""], ["late", "Late arrivals", s.late, "Included in present", ""],
            ["on-leave", "On leave", s.onLeave, "Not counted in expected", ""], ["absent", "Absent", absent, absentNote, absent ? "down" : ""]].map(([key, label, value, note, tone]) => (
            <StatCard key={key} id={key} icon={ICONS[key][0]} tone={ICONS[key][1]} label={label} value={String(value)} note={note} noteTone={tone} />
          ))}
        </StatStrip>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="table__toolbar">
              <div className="tabs tabs--pill" role="tablist">
                {TAB_LABELS.map(([key, label]) => (
                  <button key={key} className={`tabs__tab${tab === key ? " is-active" : ""}`} type="button" role="tab" data-tab={key} onClick={() => { setTab(key); setPage(1); }}>
                    {`${label} `}<span className="badge badge--count">{String(narrowed.filter((r) => TABS[key](r.day)).length)}</span>
                  </button>
                ))}
              </div>
              <div className="table__filters">
                <div className="input-group">
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input className="input input--sm input--search" id="team-search" type="search" placeholder="Search by name" aria-label="Search employees by name" data-table-filter="off"
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="select select--sm" id="team-dept" aria-label="Filter by department" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}>
                  <option value="">All departments</option>
                  {d.departments.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                </select>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table" data-export-name="team-attendance">
                <thead>
                  <tr>
                    <th className="is-sortable" aria-sort={ascending ? "ascending" : "descending"}><button className="sort-btn" id="team-sort" type="button" onClick={() => setAscending(!ascending)}>Employee <span aria-hidden="true">{ascending ? "▲" : "▼"}</span></button></th>
                    <th>Department</th><th>Check-in</th><th className="table__num">Hours</th><th>This week</th><th>Status</th>
                  </tr>
                </thead>
                <Nodes as="tbody" id="team-rows" build={() => (pageRows.length ? pageRows.map(row) : [emptyRow(empty)])} deps={[d, tab, search, dept, ascending, current]} />
              </table>
            </div>
            <Pagination totalItems={shown.length} pageSize={PAGE_SIZE} currentPage={current} onPageChange={setPage} />
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Attendance by department</h3>
                <span className="card__meta" id="team-dept-date">{d.chart.period.date === today ? "Today" : shortDate(d.chart.period.date)}</span>
              </div>
              <Nodes className="card__body" id="team-dept-bars" deps={[d]} build={() => d.chart.labels.map((name, i) => {
                const bar = barRow(name, rate[i] === null ? "–" : `${rate[i]}%`, rate[i] ?? 0);
                bar.title = expected[i] ? `${present[i]} of ${expected[i]} expected are in` : "Nobody expected";
                return bar;
              })} />
            </section>
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Needs attention</h3>
                <span className="card__meta" id="team-attention-count">{attention ? `${attention} ${attention === 1 ? "needs" : "need"} attention` : "None"}</span>
              </div>
              <Nodes className="list" id="team-attention" build={() => attentionItems(d.rows, d.summary, date, today)} deps={[d, date]} />
            </section>
            <div className="calendar__legend">
              <span className="is-present">Present</span><span className="is-late">Late</span><span className="is-half">Half day</span><span className="is-absent">Absent</span>
              <span className="is-leave">On leave</span><span className="is-holiday">Holiday</span><span className="is-not-yet">Not in yet</span><span style={{ "--c": "var(--color-border)" }}>No record</span>
            </div>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
