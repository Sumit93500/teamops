// The leave screens' shared pieces (P4b), built in the design system and read from the data layer (data/leave-policy.js,
// data/pay-settings.js, data/employment.js). Nothing is worked out here. Every piece shows only from the leave policy's start
// date (Settings: data/pay-settings.js leaveFrom); before it the leave pages are exactly what they were.
//   leavePolicyOn()          whether the policy applies today
//   BAND_NAME                Intern / Under 1 year / Over 1 year
//   bandChange(userId, day)  { date, to } the day the band changes (an employee under a year moves up on their anniversary)
//   BandBadge                the band as a pill, with the next change in words
//   PolicyBalances           the balance cards, the carry-forward and encashment lines, loss of pay, and how it is worked out
//   outcomeOf(request, day)  how many days of a pending request the balance covers and how many would be unpaid
import { leaveAccount, tenureBand, bandPolicy, anniversaryOf } from "../../../assets/js/data/leave-policy.js";
import { leavePolicyActive, leaveFrom } from "../../../assets/js/data/pay-settings.js";
import { employmentOf } from "../../../assets/js/data/employment.js";
import { formatDay, formatDays, todayIso, monthName } from "../../../assets/js/ui/leave-view.js";
import { useData } from "../data/hooks.js";
import { Card, Pill } from "../components/Layout.jsx";

export const BAND_NAME = { intern: "Intern", under1: "Under 1 year", over1: "Over 1 year" };
const TYPES = ["casual", "sick", "earned", "wfh", "unpaid"];
const NAME = { casual: "Casual leave", sick: "Sick leave", earned: "Earned leave", wfh: "Work from home", unpaid: "Unpaid leave" };
const days = (n) => formatDays(n);

export const leavePolicyOn = (day = todayIso()) => leavePolicyActive(day);

export function bandChange(userId, day = todayIso()) {
  const e = employmentOf(userId);
  if (!e || e.kind === "intern" || tenureBand(userId, day) !== "under1") return null;
  return { date: anniversaryOf(e.joiningDate), to: "over1" };
}

export function BandBadge({ userId, day = todayIso(), next = true }) {
  const d = useData(() => ({ band: tenureBand(userId, day), change: bandChange(userId, day), e: employmentOf(userId) }), [userId, day]);
  if (!d.band) return null;
  return (
    <span className="band" data-band={d.band}>
      <Pill tone={d.band === "intern" ? "info" : d.band === "under1" ? "warning" : "success"}>{BAND_NAME[d.band]}</Pill>
      {next && d.change && <span className="text-muted"> {`Over 1 year from ${formatDay(d.change.date, true)}`}</span>}
    </span>
  );
}

// A pending request's outcome on the balance without counting itself twice: the days the balance covers and the days beyond it.
export function outcomeOf(request, day = todayIso()) {
  if (request.underPolicy) return { paid: request.days - (request.lopDays ?? 0), lop: request.lopDays ?? 0 };   // P5: what the store recorded
  const at = request.from > day ? request.from : day;
  const a = leaveAccount(request.userId, at);
  const t = a?.types[request.type];
  if (!t || t.usable === null) return { paid: request.days, lop: 0 };
  const room = Math.max(0, t.usable - t.taken - Math.max(0, t.pending - (request.status === "pending" ? request.days : 0)));
  return { paid: Math.min(request.days, room), lop: Math.max(0, request.days - room) };
}

const describePolicy = (band, p, type) => {
  const x = p[type];
  if (x.accrual === "none") return "None";
  if (x.accrual === "unlimited") return "No limit";
  if (x.accrual === "perMonth") return `${x.amount} a month`;
  if (x.accrual === "perMonthReset") return `${x.amount} a month`;
  if (x.accrual === "perYear") return `${x.amount} a year${band === "under1" ? ", pro-rated" : ""}`;
  return `1 per ${x.per} days worked`;
};

function Explain({ a }) {
  const p = bandPolicy(a.band), t = a.types, year = a.date.slice(0, 4);
  const items = [];
  if (a.band === "intern") {
    items.push(`You are an intern. Casual leave builds up at ${p.casual.amount} a month from the month you joined: ${days(t.casual.entitled)} so far this year.`);
    items.push("Interns have no sick leave or earned leave, and nothing is carried forward to the next year.");
  } else {
    items.push(`Casual leave is ${p.casual.amount} days and sick leave ${p.sick.amount} days a year${a.band === "under1" ? ", counted from the month you joined (a month counts if you had joined by its 15th) and rounded down to the half day" : ""}: ${days(t.casual.entitled)} casual and ${days(t.sick.entitled)} sick so far in ${year}.`);
    items.push(`Earned leave builds up at 1 day for every ${p.earned.per} working days you work (unpaid leave doesn't count): ${days(t.earned.entitled)} so far this year${t.earned.carriedIn ? `, plus ${days(t.earned.carriedIn)} carried forward` : ""}.`);
    if (t.earned.usableFrom) items.push(`Earned leave can be used from ${formatDay(t.earned.usableFrom, true)}, ${p.earned.usableAfterMonths} months after you joined.`);
    items.push(`At the end of the year up to ${p.earned.carryForwardMax} days of earned leave carry forward${p.earned.encashAbove != null ? `; whatever is above ${p.earned.encashAbove} days is paid out (encashed)` : ", and none is paid out"}. Casual and sick leave don't carry forward.`);
  }
  items.push(`Work from home is ${p.wfh.amount} a month. Unpaid leave has no limit and is deducted from pay.`);
  const change = bandChange(a.userId, a.date);
  if (change) items.push(`You move to the Over 1 year band on ${formatDay(change.date, true)}, your first work anniversary.`);
  return <ul className="leave-explain" id="leave-explain">{items.map((s) => <li key={s}>{s}</li>)}</ul>;
}

export function PolicyBalances({ userId }) {
  const day = todayIso();
  const a = useData(() => leaveAccount(userId, day), [userId, day]);
  if (!a) return null;
  const earnedPolicy = bandPolicy(a.band).earned;
  const lops = TYPES.filter((type) => a.types[type].lop > 0);
  return (
    <>
      <section className="balance-grid" aria-label="Leave balances" id="policy-balances">
        {TYPES.map((type) => {
          const t = a.types[type];
          const noLimit = t.usable === null;
          const none = !noLimit && t.entitled === 0 && t.carriedIn === 0 && (type === "sick" || type === "earned") && a.band === "intern";
          const share = !noLimit && t.available ? Math.min(100, Math.max(0, Math.round((t.left / t.available) * 100))) : 0;
          return (
            <div className="balance" data-type={type} key={type}>
              <div className="balance__head"><span className="balance__type">{NAME[type]}</span><span className="badge badge--square">{describePolicy(a.band, bandPolicy(a.band), type)}</span></div>
              <div className="balance__value">{noLimit ? String(t.taken) : none ? "0" : String(t.left)}<small>{noLimit ? "days taken" : t.left === 1 ? "day left" : "days left"}</small></div>
              <div className="progress"><span className="progress__bar" style={{ "--w": `${share}%` }} /></div>
              <p className="balance__meta">
                {noLimit ? `Salary is deducted if used${t.pending ? `, ${t.pending} pending` : ""}`
                  : none ? "Not part of the intern leave"
                    : `${t.entitled} so far${t.carriedIn ? ` + ${t.carriedIn} carried forward` : ""}, ${t.taken} used${t.pending ? `, ${t.pending} pending` : ""}${t.usableFrom && day < t.usableFrom ? `; usable from ${formatDay(t.usableFrom, true)}` : ""}`}
              </p>
              {t.lop > 0 && <p className="balance__meta"><Pill tone="warning">Loss of pay</Pill>{` ${days(t.lop)} beyond your balance`}</p>}
            </div>
          );
        })}
      </section>
      <Card id="leave-lines" title="Carry-forward and encashment" meta={`Year ${a.date.slice(0, 4)}`}>
        <dl className="kv">
          <div className="kv__row"><dt>Carried forward into this year</dt><dd data-field="carried-in">{days(a.types.earned.carriedIn)}</dd></div>
          <div className="kv__row"><dt>Carry-forward at year end</dt><dd data-field="carry-cap">{a.band === "intern" ? "None for interns" : `Up to ${days(earnedPolicy.carryForwardMax)} of earned leave`}</dd></div>
          <div className="kv__row"><dt>Encashment at year end</dt><dd data-field="encash">{a.band === "intern" || earnedPolicy.encashAbove == null ? "None" : `Earned leave above ${days(earnedPolicy.encashAbove)} is paid out`}</dd></div>
        </dl>
      </Card>
      <Card id="leave-lop" title="Loss of pay" meta="When a balance runs out">
        {lops.length
          ? <p id="leave-lop-text"><Pill tone="warning">Loss of pay</Pill>{` You have used more than your balance: ${lops.map((type) => `${days(a.types[type].lop)} of ${NAME[type].toLowerCase()}`).join(", ")}. Those days are unpaid under the leave policy.`}</p>
          : <p className="text-muted" id="leave-lop-text">None. Everything you have taken is within your balance.</p>}
        <p className="text-muted">Until the payroll step reads the policy, only leave applied for as Unpaid leave is deducted from pay.</p>
      </Card>
      <Card id="leave-how" title="How your balance is worked out" meta={`${BAND_NAME[a.band]}; the policy applies from ${formatDay(leaveFrom(), true)}`}>
        <Explain a={a} />
      </Card>
    </>
  );
}

export const monthYear = (iso) => `${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}`;

// "Under 1 year, over 1 year from 2 Feb 2027": the band in words (the profile and the user form), from the policy's start day.
export function bandText(userId, day = todayIso()) {
  const band = tenureBand(userId, day);
  if (!band) return "—";
  const change = bandChange(userId, day);
  return `${BAND_NAME[band]}${change ? `, over 1 year from ${formatDay(change.date, true)}` : ""}`;
}