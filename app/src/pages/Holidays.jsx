// Holidays (pages/leave/holidays.html + assets/js/pages/holidays.js), ported (round 10), for anyone signed in: the year select
// (this year and every year on file) filters the month calendar (the arrows stay inside the year), the year's list and the
// summary. With holidays:manage: Add holiday (a modal: addHoliday()'s errors under their fields; the calendar then shows where
// it went) and Remove on an upcoming holiday, asked in the in-app dialog (round 4) in the old words, which name anyone the
// removal would take over an allowance.
import { useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { getAllHolidays, addHoliday, removeHoliday, isWeekend, dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { LEAVE_POLICY, overAllowanceIfWorking } from "../../../assets/js/data/leave-store.js";
import { getUser } from "../../../assets/js/data/store.js";
import { todayIso, formatDay, monthName, monthShort, dayOfMonth, weekdayName } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Badge } from "../components/Basics.jsx";
import { useData, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "leave/holidays.html";
const pad = (n) => String(n).padStart(2, "0");
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIELD_ID = { date: "holiday-date", name: "holiday-name", kind: "holiday-kind" };
const EMPTY = { date: "", kind: "", name: "" };
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const holidaysOf = (all, y) => all.filter((h) => h.date.startsWith(`${y}-`));

// The month of the next upcoming holiday in that year; otherwise this month (this year) or the year's first holiday.
function defaultMonth(all, y, thisYear) {
  const list = holidaysOf(all, y);
  const next = list.find((h) => h.date >= todayIso());
  if (next) return Number(next.date.slice(5, 7));
  if (y === thisYear) return Number(todayIso().slice(5, 7));
  return list.length ? Number(list[0].date.slice(5, 7)) : 1;
}
function overWarning(holiday) {
  const over = overAllowanceIfWorking(holiday.date);
  if (!over.length) return "";
  const lines = over.map((o) => `${getUser(o.userId)?.name ?? o.userId}: ${LEAVE_POLICY[o.type].label.toLowerCase()} ${o.period}, ${o.after} of ${o.allowance} days`);
  return `\n\nApproved leave covers this day, so it would count against that leave again. ${over.length === 1 ? "This person would go" : "These people would go"} over their allowance:\n${lines.join("\n")}`;
}

export default function Holidays() {
  const canManage = useCan("holidays:manage");
  const showToast = useToast();
  const confirm = useConfirm();
  const today = todayIso();
  const thisYear = Number(today.slice(0, 4));
  const d = useData(() => ({ all: getAllHolidays() }), []);
  const [[year, month], setView] = useState(() => [thisYear, defaultMonth(getAllHolidays(), thisYear, thisYear)]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  const list = holidaysOf(d.all, year);
  const years = [...new Set([thisYear, ...d.all.map((h) => Number(h.date.slice(0, 4)))])].sort((a, b) => b - a);
  const byDate = new Map(list.map((h) => [h.date, h]));
  const first = dayNumber(`${year}-${pad(month)}-01`);
  const next = month === 12 ? dayNumber(`${year + 1}-01-01`) : dayNumber(`${year}-${pad(month + 1)}-01`);
  const lead = (new Date(first * 86400000).getUTCDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<div className="calendar__day calendar__day--empty" key={`l${i}`} />);
  for (let n = first; n < next; n++) {
    const iso = isoFromDayNumber(n);
    const holiday = byDate.get(iso);
    const kind = holiday ? "calendar__day--holiday" : isWeekend(iso) ? "calendar__day--weekend" : iso > today ? "calendar__day--future" : "";
    cells.push(
      <div key={iso} className={["calendar__day", kind, iso === today ? "calendar__day--today" : ""].filter(Boolean).join(" ")}>
        <span className="calendar__date">{String(Number(iso.slice(8)))}</span>
        {holiday && <span className="calendar__tag">{holiday.name}</span>}
      </div>,
    );
  }
  while (cells.length % 7) cells.push(<div className="calendar__day calendar__day--empty" key={`t${cells.length}`} />);
  const inMonth = list.filter((h) => Number(h.date.slice(5, 7)) === month).length;
  const count = (kind) => list.filter((h) => h.kind === kind).length;

  const removeOne = async (holiday) => {
    if (!(await confirm({ message: `Remove ${holiday.name} on ${formatDay(holiday.date, true)}?${overWarning(holiday)}`, confirmLabel: "Remove holiday", cancelLabel: "Keep it", danger: true }))) return;
    const result = removeHoliday(getCurrentUserId(), holiday.id);
    if (result.ok) showToast("Holiday removed.", "success");
    else showToast(result.error, "danger");
    bump();
  };
  const open = () => { setError(null); setModal({ ...EMPTY }); setTimeout(() => document.getElementById("holiday-date")?.focus()); };
  const save = (e) => {
    e.preventDefault();
    setError(null);
    const result = addHoliday(getCurrentUserId(), modal);
    if (!result.ok) {
      if (FIELD_ID[result.field]) { setError({ field: result.field, message: result.error }); document.getElementById(FIELD_ID[result.field])?.focus(); }
      else showToast(result.error, "danger");
      return;
    }
    setModal(null);
    showToast("Holiday added.", "success");
    setView([Number(result.record.date.slice(0, 4)), Number(result.record.date.slice(5, 7))]);   // show where it went
    bump();
  };
  const set = (name) => (e) => { setModal({ ...modal, [name]: e.target.value }); setError(null); };
  const fieldError = (name) => (error?.field === name ? <span className="form-error" id={`${FIELD_ID[name]}-error`}>{error.message}</span> : null);
  const described = (name) => (error?.field === name ? `${FIELD_ID[name]}-error` : undefined);

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("leave/my-leave.html")}>My leave</Link></li>
            <li className="breadcrumb__item" aria-current="page">Holidays</li>
          </ol>
          <h1>Holidays</h1>
          <p className="page-header__subtitle">{`Company holiday calendar for ${year}`}</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" aria-label="Choose year" value={String(year)}
            onChange={(e) => { const y = Number(e.target.value); setView([y, defaultMonth(d.all, y, thisYear)]); }}>
            {years.map((y) => <option key={y} value={String(y)}>{String(y)}</option>)}
          </select>
          <button className="btn btn--primary" type="button" data-permission="holidays:manage" hidden={!canManage || undefined} onClick={open}>
            <Icon d="M12 5v14M5 12h14" />{" "}Add holiday
          </button>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <section className="card" id="holiday-calendar">
          <div className="card__header">
            <h3 className="card__title">{`${monthName(month)} ${year}`}</h3>
            <div className="btn-group">
              <span className="card__meta">{`${inMonth} ${inMonth === 1 ? "holiday" : "holidays"}`}</span>
              <button className="btn btn--sm btn--icon" type="button" data-month="prev" aria-label="Previous month" disabled={month === 1} onClick={() => setView([year, month - 1])}><Icon d="m15 18-6-6 6-6" /></button>
              <button className="btn btn--sm btn--icon" type="button" data-month="next" aria-label="Next month" disabled={month === 12} onClick={() => setView([year, month + 1])}><Icon d="m9 18 6-6-6-6" /></button>
            </div>
          </div>
          <div className="card__body">
            <div className="calendar__grid">{DOW.map((x) => <div className="calendar__dow" key={x}>{x}</div>)}{cells}</div>
            <div className="calendar__legend"><span className="is-holiday">Holiday</span><span className="is-off">Weekend</span></div>
          </div>
        </section>
        <aside className="stack">
          <section className="card" id="holiday-list">
            <div className="card__header">
              <h3 className="card__title">{`${year} holidays`}</h3>
              <span className="card__meta">{`${list.length} listed`}</span>
            </div>
            <div className="list">
              {list.length ? list.map((h) => {
                const past = h.date < today;
                return (
                  <div className="list__item" key={h.id}>
                    <div className={past ? "date-tile date-tile--muted" : "date-tile"}><span className="date-tile__month">{monthShort(h.date)}</span><span className="date-tile__day">{String(dayOfMonth(h.date))}</span></div>
                    <div className="list__content"><span className="list__title">{h.name}</span><span className="list__sub">{`${weekdayName(h.date)}, ${h.kind}`}</span></div>
                    {past ? <Badge>Past</Badge> : <Badge tone="primary">Upcoming</Badge>}
                    {!past && <button className="btn btn--sm btn--ghost" type="button" data-permission="holidays:manage" hidden={!canManage || undefined} aria-label={`Remove ${h.name}`} onClick={() => removeOne(h)}>Remove</button>}
                  </div>
                );
              }) : <div className="list__item"><span className="list__sub">{`No holidays listed for ${year}.`}</span></div>}
            </div>
          </section>
          <section className="card" id="holiday-summary">
            <div className="card__header"><h3 className="card__title">Summary</h3></div>
            <div className="card__body">
              <dl className="kv">
                {[["National holidays", count("national")], ["Company holidays", count("company")], ["Optional holidays", count("optional")], ["Total listed", list.length]].map(([term, value]) => (
                  <div className="kv__row" key={term}><dt>{term}</dt><dd>{String(value)}</dd></div>
                ))}
              </dl>
            </div>
          </section>
          <div className="alert alert--info">HR adds and removes holidays from this page. Weekends and company or national holidays aren't counted as leave days.</div>
        </aside>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} id="holiday-modal" size="sm" title="Add holiday"
        desc="National and company holidays aren't counted as leave days. Optional ones are."
        footer={<><button className="btn" type="button" data-modal-close onClick={() => setModal(null)}>Cancel</button><button className="btn btn--primary" type="submit" form="holiday-form">Add holiday</button></>}>
        {modal && (
          <form id="holiday-form" noValidate onSubmit={save}>
            <div className="form">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="holiday-date">Date</label>
                  <input className="input" id="holiday-date" type="date" required value={modal.date} onChange={set("date")} aria-describedby={described("date")} />
                  {fieldError("date")}
                </div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="holiday-kind">Kind</label>
                  <select className="select" id="holiday-kind" required value={modal.kind} onChange={set("kind")} aria-describedby={described("kind")}>
                    <option value="">Select</option><option value="national">National</option><option value="company">Company</option><option value="optional">Optional</option>
                  </select>
                  {fieldError("kind")}
                </div>
                <div className="form-field form-field--full">
                  <label className="form-label form-label--required" htmlFor="holiday-name">Name</label>
                  <input className="input" id="holiday-name" type="text" placeholder="e.g. Diwali" required value={modal.name} onChange={set("name")} aria-describedby={described("name")} />
                  {fieldError("name")}
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </Frame>
  );
}
