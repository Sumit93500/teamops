// IT2: the Admin dashboard's IT card: how many IT actions nobody has reviewed yet, the break-glass approvals still waiting for another
// Admin's review (each stays here until marked reviewed), and, when there is only one Admin, the banner that recommends a second one.
// Everything is data/it-desk.js (unreviewedCount, breakGlassOpen, soleAdmin); for it:activity-review (the Admin).
import { Link } from "react-router-dom";
import { unreviewedCount, breakGlassOpen, soleAdmin } from "../../../assets/js/data/it-desk.js";
import { Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, IT_REVIEW, IT_REQUEST } from "../routes.js";
import { nameOf, stampYear } from "./it.jsx";

const WARN = "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0";

export default function ItReviewCard() {
  const { userId } = useSession();
  const allowed = useCan("it:activity-review");
  const d = useData(() => (allowed ? { unreviewed: unreviewedCount(userId), glass: breakGlassOpen(userId), sole: soleAdmin() } : null), [userId, allowed]);
  if (!d) return null;
  return (
    <section className="card" id="admin-it-card">
      <div className="card__header">
        <h3 className="card__title">IT activity to review</h3>
        <span className="card__meta" id="it-unreviewed">{d.unreviewed === 0 ? "All reviewed" : `${d.unreviewed} not reviewed`}</span>
      </div>
      <div className="card__body ds-stack">
        {d.sole && <p className="ds-note ds-note--warning it-banner" id="second-admin-banner" role="status"><Icon d={WARN} />You are the only Admin. Create a second Admin so that requests about you or raised by you can be approved by someone else.</p>}
        {d.glass.length > 0 && (
          <ul className="it-seats" id="break-glass-list">
            {d.glass.map((a) => (
              <li key={a.id} data-break-glass={a.id}>
                <span><strong>Break-glass:</strong> {a.summary} <span className="it-sub">{nameOf(a.actorId)}, {stampYear(a.at)}{a.requestId ? <>, <Link to={`${pageUrl(IT_REQUEST)}?id=${a.requestId}`}>{a.requestId}</Link></> : null}</span></span>
              </li>
            ))}
          </ul>
        )}
        {d.glass.length === 0 && d.unreviewed === 0 && !d.sole && <p className="text-muted text-sm">Nothing waits for your review.</p>}
        <div><Link className="btn btn--sm" to={pageUrl(IT_REVIEW)} id="open-review">Open the IT review trail</Link></div>
      </div>
    </section>
  );
}