// My leave (pages/leave/my-leave.html + assets/js/pages/my-leave.js), ported as is: balances, the history
// (year filter, 10 a page, Cancel on pending rows), the newest pending request's steps and the next three
// holidays, all for the signed-in person. The numbers come from the same stores and helpers the old page
// calls; a cancel goes through cancelLeave() and every view re-reads (useAction bumps the bus).
import { useState } from "react";
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import Pagination from "../ui/Pagination.jsx";
import { useToast } from "../ui/Toast.jsx";
import { StatusBadge, PendingSteps } from "../ui/leave.jsx";
import { usePhone, cardColumns, MoreButton } from "../ui/phone.jsx";
import { useData, useAction, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { requestsFor, cancelLeave } from "../../../assets/js/data/leave-store.js";
import { getAllHolidays } from "../../../assets/js/data/holidays.js";
import { leaveBalanceChart, valuesOf } from "../../../assets/js/data/chart-data.js";
import {
  todayIso, formatDay, requestDates, requestTitle, typeLabel, monthName, monthShort, dayOfMonth, weekdayName,
  rejectionNote, newestPending, byNewest,
} from "../../../assets/js/ui/leave-view.js";

const PAGE = "leave/my-leave.html";
const PAGE_SIZE = 10;
const HEADS = ["Type", "Dates", "Days", "Applied on", "Status", "Actions"];
const BAR = { casual: "progress", sick: "progress progress--success", earned: "progress", wfh: "progress progress--warning", unpaid: "progress progress--info" };

function BalanceCard({ type, b, month }) {
  const noLimit = b.allowance === null;
  const limit = noLimit ? "No limit" : `${b.allowance} a ${b.per}`;
  const amount = noLimit ? b.approved : b.left;
  const unit = amount === 1 || amount === 0.5 ? "day" : "days";
  // The bar is the share still left; unpaid has no limit to measure against.
  const share = b.allowance ? Math.min(100, Math.max(0, Math.round((b.left / b.allowance) * 100))) : 0;
  const pending = b.pending ? `, ${b.pending} pending` : "";
  let meta;
  if (noLimit) meta = `Salary is deducted if used${pending}`;
  else if (b.per === "month") meta = `${b.approved} used in ${monthName(month)}${pending}`;
  else meta = `${b.approved} used${pending}`;
  return (
    <div className="balance">
      <div className="balance__head"><span className="balance__type">{typeLabel(type)}</span><span className="badge badge--square">{limit}</span></div>
      <div className="balance__value">{String(amount)}<small>{noLimit ? `${unit} taken` : `${unit} left`}</small></div>
      <div className={BAR[type]}><span className="progress__bar" style={{ "--w": `${share}%` }} /></div>
      <p className="balance__meta">{meta}</p>
    </div>
  );
}

function Balances({ userId }) {
  const cards = useData(() => {
    const [y, m] = todayIso().split("-").map(Number);
    const data = leaveBalanceChart(userId, y, m);   // the numbers (data/chart-data.js)
    const [allowance, approved, pending, left] = ["Allowance", "Approved", "Pending", "Left"].map((name) => valuesOf(data, name));
    return data.labels.map((type, i) => ({ type, month: m, b: { allowance: allowance[i], approved: approved[i], pending: pending[i], left: left[i], per: data.marks[i].per } }));
  }, [userId]);
  return (
    <section className="balance-grid" aria-label="Leave balances">
      {cards.map((c) => <BalanceCard key={c.type} {...c} />)}
    </section>
  );
}

function HistoryRow({ request, canCancel, onCancel, cols }) {
  const [open, setOpen] = useState(false);
  const note = request.status === "rejected" ? rejectionNote(request) : "";
  const more = (i) => (i === cols.moreAt ? <MoreButton open={open} onToggle={() => setOpen(!open)} /> : null);
  return (
    <tr {...cols.row()} className={open && cols.moreAt >= 0 ? "is-open" : undefined}>
      <td {...cols.cell(0)}><span className="table__user-name">{typeLabel(request.type)}</span>{more(0)}</td>
      <td {...cols.cell(1)}>{requestDates(request)}{more(1)}</td>
      <td className="table__num" {...cols.cell(2)}>{String(request.days)}{more(2)}</td>
      <td {...cols.cell(3)}>{formatDay(request.appliedOn)}{more(3)}</td>
      <td {...cols.cell(4)}><StatusBadge status={request.status} /></td>
      <td className="table__actions" {...cols.cell(5)}>
        {request.status === "pending"
          ? <button className="btn btn--sm btn--danger" type="button" data-permission="leave:cancel" hidden={!canCancel} onClick={() => onCancel(request)}>Cancel</button>
          : note ? <span className="text-sm text-muted">{note}</span> : null}
      </td>
    </tr>
  );
}

export default function MyLeave() {
  const { userId } = useSession();
  const canCreate = useCan("leave:create");
  const canCancel = useCan("leave:cancel");
  const showToast = useToast();
  const cols = cardColumns(HEADS, usePhone());
  const thisYear = Number(todayIso().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [currentPage, setCurrentPage] = useState(1);

  const requests = useData(() => requestsFor(userId), [userId]);
  const years = [...new Set([thisYear, thisYear - 1, ...requests.map((r) => Number(r.from.slice(0, 4)))])].sort((a, b) => b - a);
  const rows = requests.filter((r) => Number(r.from.slice(0, 4)) === year).sort(byNewest);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pending = newestPending(requests);
  const holidays = useData(() => {
    const today = todayIso();
    return getAllHolidays().filter((h) => h.date >= today).slice(0, 3);
  });

  const cancel = useAction(cancelLeave);
  // window.confirm stays until the confirm dialog moves over (round 4), as the old page asks.
  function cancelRequest(request) {
    if (!window.confirm(`Cancel your ${typeLabel(request.type).toLowerCase()} request for ${requestDates(request)}?`)) return;
    const result = cancel(request.id, userId);
    if (!result.ok) showToast(result.error, "danger");
    else showToast("Leave request cancelled.", "success");
  }

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My leave</h1>
          <p className="page-header__subtitle">Your balances and every request you have made</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" to={pageUrl("leave/holidays.html")}>Holidays</Link>
          <Link className="btn btn--primary" to={pageUrl("leave/apply-leave.html")} data-permission="leave:create" hidden={!canCreate}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Apply for leave
          </Link>
        </div>
      </div>

      <div className="stack">
        <Balances userId={userId} />

        <div className="grid grid-main-aside">
          <section className="card">
            <div className="table__toolbar">
              <h3 className="card__title">Leave history</h3>
              <select className="select select--sm" aria-label="Filter by year" value={String(year)}
                onChange={(e) => { setYear(Number(e.target.value)); setCurrentPage(1); }}>
                {years.map((y) => <option key={y} value={String(y)}>{String(y)}</option>)}
              </select>
            </div>

            <div className="table-wrap">
              <table className="table" {...cols.table}>
                <thead>
                  <tr>
                    {HEADS.map((h, i) => <th key={h} className={i === 2 ? "table__num" : i === 5 ? "table__actions" : undefined} {...cols.th()}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length
                    ? pageRows.map((r) => <HistoryRow key={r.id} request={r} canCancel={canCancel} onCancel={cancelRequest} cols={cols} />)
                    : <tr><td className="text-muted" colSpan={6}>{`No leave requests in ${year}.`}</td></tr>}
                </tbody>
              </table>
            </div>

            <Pagination totalItems={rows.length} pageSize={PAGE_SIZE} currentPage={page} onPageChange={setCurrentPage} />
          </section>

          <aside className="stack">
            <section className="card" id="pending-request" hidden={!pending}>
              <div className="card__header">
                <h3 className="card__title">Pending request</h3>
                <span className="badge badge--warning badge--dot">In review</span>
              </div>
              <div className="card__body">
                {pending && <>
                  <p className="fw-medium mb-4">{requestTitle(pending)}</p>
                  <ol className="stepper stepper--vertical"><PendingSteps request={pending} /></ol>
                </>}
              </div>
            </section>

            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Upcoming holidays</h3>
                <Link className="link text-sm" to={pageUrl("leave/holidays.html")}>See all</Link>
              </div>
              <div className="list" id="upcoming-holidays">
                {holidays.length
                  ? holidays.map((h) => (
                    <div className="list__item" key={`${h.date}${h.name}`}>
                      <div className="date-tile"><span className="date-tile__month">{monthShort(h.date)}</span><span className="date-tile__day">{String(dayOfMonth(h.date))}</span></div>
                      <div className="list__content"><span className="list__title">{h.name}</span><span className="list__sub">{`${weekdayName(h.date)}, ${h.kind} holiday`}</span></div>
                    </div>))
                  : <div className="list__item"><span className="list__sub">No upcoming holidays.</span></div>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
