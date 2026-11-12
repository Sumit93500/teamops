// Team leave (pages/leave/team-leave.html + assets/js/pages/team-leave.js), ported (round 10). Read-only, for leave:approve
// (everyone's leave) or a manager (their direct reports, data/reporting.js teamScope): the month calendar of who is off
// (approved or pending leave, not work from home), out in the next 7 days, the overlap alert, the leave balance per active
// person and every leave request, newest first, 10 a page. No pay details and no export. Tables: the round 4 Table.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { can } from "../../../assets/js/core/rbac.js";
import { getUser, getAllUsers } from "../../../assets/js/data/store.js";
import { LEAVE_POLICY, allRequests, balanceFor, overlaps } from "../../../assets/js/data/leave-store.js";
import { getAllHolidays, isWeekend, dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { teamScope } from "../../../assets/js/data/reporting.js";
import { todayIso, formatDay, requestDates, typeLabel, departmentName, nameOf, monthName } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { PersonCell } from "../components/Basics.jsx";
import { StatusBadge, OutNextWeek } from "../ui/leave.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "leave/team-leave.html";
const pad = (n) => String(n).padStart(2, "0");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAPPED = Object.keys(LEAVE_POLICY).filter((type) => LEAVE_POLICY[type].allowance !== null);
const isOff = (r) => (r.status === "pending" || r.status === "approved") && r.type !== "wfh";
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const person = (id, sub) => { const u = getUser(id); return <PersonCell userId={id} name={u?.name ?? nameOf(id) ?? id} sub={sub ?? departmentName(u?.department)} />; };

function Calendar({ year, month, leave, today }) {
  const first = dayNumber(`${year}-${pad(month)}-01`);
  const next = month === 12 ? dayNumber(`${year + 1}-01-01`) : dayNumber(`${year}-${pad(month + 1)}-01`);
  const byDate = new Map(getAllHolidays().map((h) => [h.date, h]));
  const lead = (new Date(first * 86400000).getUTCDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<div className="calendar__day calendar__day--empty" key={`l${i}`} />);
  for (let n = first; n < next; n++) {
    const iso = isoFromDayNumber(n);
    const holiday = byDate.get(iso);
    const off = leave.filter((r) => r.from <= iso && iso <= r.to).sort((a, b) => nameOf(a.userId).localeCompare(nameOf(b.userId)));
    let kind = "";
    if (holiday) kind = "calendar__day--holiday";
    else if (isWeekend(iso)) kind = "calendar__day--weekend";
    else if (off.length) kind = "calendar__day--leave";
    else if (iso > today) kind = "calendar__day--future";
    cells.push(
      <div key={iso} className={["calendar__day", kind, iso === today ? "calendar__day--today" : ""].filter(Boolean).join(" ")}>
        <span className="calendar__date">{String(Number(iso.slice(8)))}</span>
        {holiday ? <span className="calendar__tag">{holiday.name}</span>
          : off.length && !isWeekend(iso) ? <span className="calendar__tag">{off.map((r) => (nameOf(r.userId) || r.userId).split(" ")[0]).join(", ")}</span> : null}
      </div>,
    );
  }
  while (cells.length % 7) cells.push(<div className="calendar__day calendar__day--empty" key={`t${cells.length}`} />);
  return <div className="calendar__grid">{DOW.map((x) => <div className="calendar__dow" key={x}>{x}</div>)}{cells}</div>;
}

export default function TeamLeave() {
  const { userId } = useSession();
  const canApprove = useCan("leave:approve");
  const today = todayIso();
  const [[year, month], setMonth] = useState([Number(today.slice(0, 4)), Number(today.slice(5, 7))]);
  const scope = useMemo(() => teamScope(userId, can("leave:approve")), [userId, canApprove]);   // eslint-disable-line react-hooks/exhaustive-deps
  const inView = (id) => scope === null || scope.has(id);
  const d = useData(() => ({
    requests: allRequests().filter((r) => inView(r.userId)),
    people: getAllUsers().filter((u) => inView(u.id)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
  }), [scope]);

  const step = (by) => { let y = year, m = month + by; if (m < 1) { m = 12; y -= 1; } if (m > 12) { m = 1; y += 1; } setMonth([y, m]); };
  // the overlap alert: the first pending request (oldest sent first) whose dates clash with others in view
  let overlap = null;
  for (const request of d.requests.filter((r) => r.status === "pending").sort((a, b) => a.appliedOn.localeCompare(b.appliedOn) || a.id.localeCompare(b.id))) {
    const clashes = overlaps(request.id).filter((r) => inView(r.userId));
    if (!clashes.length) continue;
    const count = new Set(clashes.map((r) => r.userId)).size;
    const p = getUser(request.userId);
    overlap = `${p?.name ?? request.userId}'s dates overlap with ${count} other ${count === 1 ? "person" : "people"} from ${departmentName(p?.department)}. Check team cover before approving.`;
    break;
  }
  const active = d.people.filter((u) => u.status !== "inactive").map((u) => ({ id: u.id, user: u, balance: balanceFor(u.id) }));
  const balanceColumns = [{ key: "employee", label: "Employee", render: (r) => <PersonCell userId={r.id} name={r.user.name} sub={departmentName(r.user.department)} /> },
    ...CAPPED.map((type) => ({ key: type, label: typeLabel(type), render: (r) => `${r.balance[type].left} days left` }))];
  const requests = [...d.requests].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id, "en", { numeric: true }));
  const requestColumns = [
    { key: "employee", label: "Employee", render: (r) => person(r.userId) },
    { key: "type", label: "Type", render: (r) => typeLabel(r.type) },
    { key: "dates", label: "Dates", render: (r) => requestDates(r) },
    { key: "days", label: "Days", num: true, render: (r) => String(r.days) },
    { key: "applied", label: "Applied", render: (r) => formatDay(r.appliedOn) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Team leave</h1>
          <p className="page-header__subtitle">Who is off, overlaps, balances and past requests</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("leave/holidays.html")}>Holiday calendar</Link>
        </div>
      </div>
      <div className="stack">
        <div className="alert alert--warning" id="team-overlap" hidden={!overlap || undefined}>{overlap}</div>
        <div className="grid grid-main-aside">
          <section className="card" id="team-calendar">
            <div className="card__header">
              <h3 className="card__title">{`${monthName(month)} ${year}`}</h3>
              <div className="btn-group">
                <button className="btn btn--sm btn--icon" type="button" data-month="prev" aria-label="Previous month" onClick={() => step(-1)}><Icon d="m15 18-6-6 6-6" /></button>
                <button className="btn btn--sm btn--icon" type="button" data-month="next" aria-label="Next month" onClick={() => step(1)}><Icon d="m9 18 6-6-6-6" /></button>
              </div>
            </div>
            <div className="card__body"><Calendar year={year} month={month} leave={d.requests.filter(isOff)} today={today} /></div>
          </section>
          <aside className="stack">
            <OutNextWeek requests={d.requests} today={today} />
          </aside>
        </div>
        <section className="card" id="team-balances">
          <div className="card__header"><h3 className="card__title">Leave balance</h3></div>
          <Table bare pager={false} columns={balanceColumns} rows={active} empty="No active employees." />
        </section>
        <section className="card" id="team-requests">
          <div className="card__header"><h3 className="card__title">Past requests</h3></div>
          <Table bare columns={requestColumns} rows={requests} empty="No leave requests yet." />
        </section>
      </div>
    </Frame>
  );
}
