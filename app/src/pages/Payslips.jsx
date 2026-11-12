// My payslips (pages/payroll/payslips.html + assets/js/pages/payslips.js), ported (round 11): the signed-in person's own payslips
// from data/payroll-store.js, newest first, for the chosen financial year (April to March): the stat cards, the history (View,
// Download as a placeholder; a hold reason under its badge; a line when the history stops at the joining month) and the year
// to date. Nothing here works out pay; the store does. Components: StatCard, Table, Badge, NotBuilt, Reason.
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { payslipsFor, payslipTotals } from "../../../assets/js/data/payroll-store.js";
import { getUser, joiningDate } from "../../../assets/js/data/store.js";
import { todayIso, monthName, monthShort, formatRange, formatDay, plural } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { StatStrip, StatCard, Badge, badgeOf, NotBuilt, Reason, NO_DATA } from "../components/Basics.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const PAGE = "payroll/payslips.html";
const STATUS = {
  draft: { label: "Draft", badge: "badge badge--warning badge--dot" },
  "on-hold": { label: "On hold", badge: "badge badge--danger badge--dot" },
  approved: { label: "Approved", badge: "badge badge--success badge--dot" },
};
const NO_SALARY = "No salary on file for this month";
const ICONS = {
  latest: [2, "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1"], "ytd-net": [1, "M4 20V10M10 20V4M16 20v-7M22 20H2"],
  "ytd-tds": [3, "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"], next: [4, "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6"],
};
const yearOf = (slip) => Number(slip.month.slice(0, 4));
const monthOf = (slip) => Number(slip.month.slice(5, 7));
const label = (slip) => `${monthName(monthOf(slip))} ${yearOf(slip)}`;
const financialYear = (slip) => (monthOf(slip) >= 4 ? yearOf(slip) : yearOf(slip) - 1);
const yearLabel = (fy) => `${fy} – ${String(fy + 1).slice(2)}`;
const short = (slip) => monthShort(slip.period.from);
const span = (slips) => (slips.length === 1 ? short(slips[0]) : `${short(slips.at(-1))} to ${short(slips[0])}`);
function spanWithYear(slips) {
  const [a, b] = [slips.at(-1), slips[0]];
  if (slips.length === 1) return `${short(a)} ${yearOf(a)}`;
  return yearOf(a) === yearOf(b) ? `${short(a)} – ${short(b)} ${yearOf(b)}` : `${short(a)} ${yearOf(a)} – ${short(b)} ${yearOf(b)}`;
}
const amount = (slip, n) => (slip.holdReason === NO_SALARY ? "—" : rupees(n));
const approved = (slip) => slip.runStatus === "approved";
const statusKey = (slip) => (approved(slip) && slip.status === "draft" ? "approved" : slip.status);
const statusNote = (slip) => (slip.status === "on-hold" ? `${approved(slip) ? "On hold when approved" : "On hold"}: ${slip.holdReason}` : approved(slip) ? "Approved, not paid yet" : "Draft, not paid yet");
function joinedNote(all, slips, joined, today) {
  if (!joined) return null;
  if (!all.length && joined > today) return `No payslips yet: you join on ${formatDay(joined, true)}.`;
  const first = all.at(-1);
  if (first && slips.includes(first) && joined.slice(0, 7) === first.month) return `No payslips before ${label(first)}: you joined on ${formatDay(joined, true)}.`;
  return null;
}
const MessageRow = ({ text }) => <tr><td className="text-muted" colSpan={7}>{text}</td></tr>;

// The status badge with its hold reason as a line under it (showReason).
function StatusCell({ slip }) {
  const id = useId();
  const s = STATUS[statusKey(slip)];
  return <><Badge {...badgeOf(s?.badge ?? "badge")} title={slip.holdReason || undefined} aria-describedby={slip.holdReason ? id : undefined}>{s?.label ?? slip.status}</Badge><Reason id={id} text={slip.holdReason} /></>;
}

export default function Payslips() {
  const { userId: me } = useSession();
  const canDownload = useCan("payslip:download");
  const today = todayIso();
  const thisMonth = today.slice(0, 7);
  const d = useData(() => (me ? { all: payslipsFor(me, today), joined: joiningDate(getUser(me)?.dateOfJoining) } : null), [me]);
  const years = d ? [...new Set(d.all.map(financialYear))] : [];
  if (!years.length) years.push(Number(thisMonth.slice(5, 7)) >= 4 ? Number(today.slice(0, 4)) : Number(today.slice(0, 4)) - 1);
  const [fy, setFy] = useState(years[0]);
  const dl = (what, cls) => <NotBuilt what={what} className={cls} data-permission="payslip:download" hidden={!canDownload || undefined} />;

  let stats, rows = [], extra = null, empty = "No payslips for this financial year.", historyMeta = "", ytd = {}, ytdMeta = "";
  if (!d) {   // an old session with no employee id: nothing to look up
    stats = { latest: ["Net pay", "—", ""], "ytd-net": ["Net pay this year", "—", ""], "ytd-tds": ["Tax deducted this year", "—", ""], next: ["Next payslip", "—", ""] };
    empty = "This session has no employee ID. Sign out and back in to see your payslips.";
    ytd = Object.fromEntries(["gross", "pf", "pt", "tds", "deductions", "net"].map((k) => [k, "—"]));
  } else {
    const { all, joined } = d;
    const latest = all.find((s) => s.month < thisMonth) ?? all[0];
    const next = all.find((s) => s.month === thisMonth);
    const slips = all.filter((s) => financialYear(s) === fy);
    const totals = payslipTotals(slips);
    stats = {
      latest: latest ? [`Net pay, ${monthName(monthOf(latest))}`, amount(latest, latest.net), statusNote(latest)] : ["Net pay", "—", "No payslips yet"],
      "ytd-net": ["Net pay this year", rupees(totals.net), slips.length ? `${span(slips)}, ${plural(slips.length, "payslip", "payslips")}` : "No payslips"],
      "ytd-tds": ["Tax deducted this year", rupees(totals.tds), slips.length ? `TDS on sample tax rates, ${span(slips)}` : "TDS, no payslips"],
      next: ["Next payslip", next ? `${short(next)} ${yearOf(next)}` : "—", next ? `${statusNote(next)}; no pay date set` : "No payslip yet"],
    };
    if (!slips.length) {   // the financial year has no payslips (13c, rer's empty range: the one message)
      stats["ytd-net"] = ["Net pay this year", "–", NO_DATA];
      stats["ytd-tds"] = ["Tax deducted this year", "–", NO_DATA];
      empty = NO_DATA;
    }
    rows = slips;
    const note = joinedNote(all, slips, joined, today);
    extra = note ? <MessageRow text={note} /> : null;
    historyMeta = `Financial year ${yearLabel(fy)}`;
    ytd = Object.fromEntries(["gross", "pf", "pt", "tds", "deductions", "net"].map((k) => [k, slips.length ? rupees(totals[k]) : "–"]));
    ytdMeta = slips.length ? spanWithYear(slips) : NO_DATA;
  }
  const columns = [
    { key: "month", label: "Month", render: (s) => <span className="table__user-name">{label(s)}</span> },
    { key: "period", label: "Pay period", render: (s) => formatRange(s.period.from, s.period.to) },
    { key: "gross", label: "Gross", num: true, render: (s) => amount(s, s.gross) },
    { key: "deductions", label: "Deductions", num: true, render: (s) => amount(s, s.deductions) },
    { key: "net", label: "Net pay", num: true, render: (s) => amount(s, s.net) },
    { key: "status", label: "Status", render: (s) => <StatusCell slip={s} /> },
    { key: "actions", label: "Actions", actions: true, render: (s) => (
      <div className="btn-group">
        <Link className="btn btn--sm" to={`${pageUrl("payroll/payslip-view.html")}?employee=${encodeURIComponent(s.userId)}&month=${s.month}`}>View</Link>
        {dl("Download", "btn btn--sm")}
      </div>
    ) },
  ];
  const BREAKDOWN = [["gross", "Gross earnings", ""], ["pf", "Provident fund", ""], ["pt", "Professional tax", ""], ["tds", "Income tax (TDS), sample tax rates", ""],
    ["deductions", "Total deductions", " breakdown__row--total"], ["net", "Net pay", " breakdown__row--total breakdown__row--net"]];

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My payslips</h1>
          <p className="page-header__subtitle">Your salary slips and year-to-date totals</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" id="payslip-year" aria-label="Choose financial year" value={String(fy)} disabled={!d || undefined} onChange={(e) => setFy(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={String(y)}>{`Financial year ${yearLabel(y)}`}</option>)}
          </select>
          {dl("Download all", "btn")}
        </div>
      </div>
      <div className="stack">
        <StatStrip label="Key numbers">
          {Object.entries(stats).map(([key, [l, value, note]]) => <StatCard key={key} id={key} icon={ICONS[key][1]} tone={ICONS[key][0]} label={l} value={value} note={note} />)}
        </StatStrip>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header">
              <h3 className="card__title">Payslip history</h3>
              <span className="card__meta" id="payslip-history-meta">{historyMeta}</span>
            </div>
            <Table bare pager={false} tbodyId="payslip-rows" columns={columns} rows={rows} rowKey={(s) => s.month} rowProps={(s) => ({ "data-month": s.month })} empty={empty} extraRows={extra} />
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Year to date</h3>
                <span className="card__meta" id="payslip-ytd-meta">{ytdMeta}</span>
              </div>
              <div className="card__body">
                <dl className="breakdown">
                  {BREAKDOWN.map(([key, term, cls]) => <div className={`breakdown__row${cls}`} key={key}><dt>{term}</dt><dd data-field={key}>{ytd[key]}</dd></div>)}
                </dl>
              </div>
            </section>
            <div className="alert alert--info">Your bank account and PAN are always masked on payslips. HR and Admins can see them in full on your employee profile.</div>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
