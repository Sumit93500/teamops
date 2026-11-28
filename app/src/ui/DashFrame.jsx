// SD1: the layout every dashboard shares, from one config per role (ui/dashConfig.js):
//   the greeting     "Good morning, Priya", the role, the office date in words, today's attendance in words and Mark attendance
//   numbers          the page's own 3-4 key numbers (its StatStrip), passed in
//   Do next          tiles to the role's main pages, one click each, only those the person may open, some with a count
//   Needs you        what waits on the person, in words, each opening its page; "Nothing needs you right now." when empty
//   Announcements    the newest three meant for the person, and a link to them all
//   then the page's own cards and charts (children)
import { Link } from "react-router-dom";
import { shiftDayFor } from "../../../assets/js/data/shift-days.js";
import { officeNow } from "../../../assets/js/data/shift-engine.js";
import { announcementsFor, mayPost } from "../../../assets/js/data/announcements.js";
import { ICONS } from "../../../assets/js/ui/icons.js";
import { formatDay, weekdayName, todayIso } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, ANNOUNCEMENTS } from "../routes.js";
import { dashCounts, dashTiles, attentionItems } from "./dashConfig.js";
import "../design/dash.css";

const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
export const greetingFor = (minutes) => (minutes < 12 * 60 ? "Good morning" : minutes < 17 * 60 ? "Good afternoon" : "Good evening");
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] ?? "";

// Today's attendance in words, from the person's day under its rules (data/shift-days.js): null when attendance isn't kept for them.
export function todayWords(day) {
  if (!day || ["no-data", "not-joined", "left"].includes(day.status)) return null;
  if (day.checkIn && day.checkOut) return { text: `Done for today: ${day.checkIn} to ${day.checkOut}`, tone: "success" };
  if (day.checkIn) return { text: `Checked in at ${day.checkIn}`, tone: "success" };
  if (day.status === "on-leave") return { text: "On leave today", tone: "info" };
  if (["holiday", "weekend", "weekly-off"].includes(day.status)) return { text: day.holiday?.name ? `Day off: ${day.holiday.name}` : "Day off today", tone: "info" };
  if (day.status === "on-site" || day.status === "visit-planned") return { text: "On a visit today", tone: "info" };
  return { text: day.overdue ? "Not checked in yet, and it's past your start" : "Not checked in yet", tone: day.overdue ? "warning" : "neutral" };
}

function Greeting({ actions }) {
  const { user, role, userId } = useSession();
  const canMark = useCan("attendance:mark");
  const today = todayIso();
  const day = useData(() => todayWords(shiftDayFor(userId, today)), [userId, today]);
  const minutes = officeNow().minutes;
  return (
    <section className="dh-hello" id="dash-hello" aria-labelledby="dash-greeting">
      <div className="dh-hello__text">
        <p className="dh-hello__date" id="dash-date">{weekdayName(today)}, {formatDay(today, true)}</p>
        <h1 id="dash-greeting">{greetingFor(minutes)}, {firstName(user?.name)}</h1>
        <p className="dh-hello__role" id="dash-role">{role?.label ?? ""}{user?.designation && user.designation !== role?.label ? `, ${user.designation}` : ""}</p>
      </div>
      <div className="dh-hello__today">
        {day && <span className={`dh-today dh-today--${day.tone}`} id="dash-today" role="status">{day.text}</span>}
        <div className="dh-hello__actions">
          {actions}
          {canMark && <Link className="ds-btn ds-btn--primary" id="dash-mark" to={pageUrl("attendance/mark-attendance.html")}><Icon d={ICONS.clock} />Mark attendance</Link>}
        </div>
      </div>
    </section>
  );
}

function Tiles({ tiles }) {
  if (!tiles.length) return null;
  return (
    <section className="dh-next" aria-labelledby="dash-next-title" id="dash-next">
      <h2 className="dh-h2" id="dash-next-title">Do next</h2>
      <ul className="dh-tiles">
        {tiles.map((t) => (
          <li key={t.key}>
            <Link className="dh-tile" to={pageUrl(t.href)} data-tile={t.key} aria-label={t.count ? `${t.label}, ${t.count}` : undefined}>
              <span className="dh-tile__icon"><Icon d={ICONS[t.icon] ?? ICONS.default} /></span>
              <span className="dh-tile__label">{t.label}</span>
              {t.count ? <span className="dh-tile__count" aria-hidden="true">{t.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Attention({ items }) {
  return (
    <section className="ds-card dh-card" id="dash-attention" aria-labelledby="dash-attention-title">
      <div className="ds-card__header"><h2 className="ds-card__title" id="dash-attention-title">Needs you</h2></div>
      <div className="ds-card__body">
        {items.length === 0 ? <p className="dh-empty" id="dash-attention-none">Nothing needs you right now.</p> : (
          <ul className="dh-list">
            {items.map((a) => (
              <li key={a.id} data-attention={a.id} className={`dh-list__item dh-list__item--${a.tone}`}>
                <Link to={pageUrl(a.href)}>{a.text}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AnnouncementsCard({ limit = 3 }) {
  const { userId } = useSession();
  const d = useData(() => ({ posts: announcementsFor(userId).slice(0, limit), poster: mayPost(userId) }), [userId, limit]);
  return (
    <section className="ds-card dh-card" id="dash-announcements" aria-labelledby="dash-announcements-title">
      <div className="ds-card__header">
        <h2 className="ds-card__title" id="dash-announcements-title">Announcements</h2>
        <Link className="link text-sm" to={pageUrl(ANNOUNCEMENTS)} id="dash-announcements-all">{d.poster ? "Post or see all" : "See all"}</Link>
      </div>
      <div className="ds-card__body">
        {d.posts.length === 0 ? <p className="dh-empty">No announcements right now.</p> : (
          <ul className="dh-posts">
            {d.posts.map((p) => (
              <li key={p.id} className="dh-post">
                <span className="dh-post__title">{p.pinned && <span className="dh-pin">Pinned</span>}{p.title}</span>
                <span className="dh-post__body">{p.body}</span>
                <span className="dh-post__date">{formatDay(p.postedAt.slice(0, 10), true)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// kind: admin | hr | fin | emp | it; numbers: the page's StatStrip (or null); actions: extra header buttons; children: the page's own cards
export default function DashFrame({ kind, numbers = null, actions = null, children }) {
  const { userId, role } = useSession();
  const c = useData(() => dashCounts(userId, role?.key), [userId, role?.key]);
  const tiles = dashTiles(kind, c), items = attentionItems(kind, c);
  return (
    <div className="dh stack" data-dash={kind}>
      <Greeting actions={actions} />
      {numbers}
      <Tiles tiles={tiles} />
      <div className="dh-two">
        <Attention items={items} />
        <AnnouncementsCard />
      </div>
      {children}
    </div>
  );
}