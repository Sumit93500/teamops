// My IT requests (IT2): what the signed-in person raised with IT, only their own, each with its status, who has it and its timeline;
// what changed since they last looked (assigned, approved, rejected, done) is listed on top and marked read from here or from the bell.
// Everyone holding it:requests-create sees it (every role). The page reads data/it-desk.js requestsFor(.., { mine: true }), so nobody's
// request but their own is ever in it. Request an asset and Request return (My assets, My requests) end here.
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestsFor, getItRequest, itNoticesFor, markNoticeRead } from "../../../assets/js/data/it-desk.js";
import { OPEN_STATUSES } from "../../../assets/js/data/it-rules.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { Tabs } from "../components/Basics.jsx";
import { Icon } from "../components/icons.jsx";
import { useData, useSession } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { pageUrl, IT_MINE, IT_REQUEST, IT_NEW } from "../routes.js";
import { RequestAssetDialog } from "../ui/assetRequests.jsx";
import { StatusChip, PriorityChip, DueCell, Timeline, typeLabel, nameOf, stamp } from "../ui/it.jsx";

const TABS = [["open", "Open"], ["finished", "Finished"], ["all", "All"]];
export const NOTICE_TEXT = { assigned: "was assigned to someone in IT", approved: "was approved", rejected: "was sent back by the Admin", done: "is done" };

function Content() {
  const { userId } = useSession();
  const [tab, setTab] = useState(0);
  const [asking, setAsking] = useState(false);
  const d = useData(() => {
    const mine = requestsFor(userId, { mine: true });
    return { mine, full: Object.fromEntries(mine.map((r) => [r.id, getItRequest(userId, r.id)])), notices: itNoticesFor(userId, { unreadOnly: true }) };
  }, [userId]);
  const which = TABS[tab][0];
  const counts = { open: d.mine.filter((r) => OPEN_STATUSES.includes(r.status)).length, finished: d.mine.filter((r) => !OPEN_STATUSES.includes(r.status)).length, all: d.mine.length };
  const shown = d.mine.filter((r) => which === "all" || (which === "open") === OPEN_STATUSES.includes(r.status));
  const readNotice = (id) => { markNoticeRead(userId, id); bump(); };
  return (
    <>
      <PageHeader title="My IT requests" subtitle="What you asked IT for, and where it stands" breadcrumb={[{ label: "IT desk", to: pageUrl(IT_MINE) }, { label: "My IT requests" }]}
        actions={<><button type="button" className="ds-btn" id="ask-asset" onClick={() => setAsking(true)}>Request an asset</button><Link className="ds-btn ds-btn--primary" to={pageUrl(IT_NEW)} id="raise-request"><Icon d="M12 5v14M5 12h14" />Raise a request</Link></>} />
      <div className="ds-stack">
        {d.notices.length > 0 && (
          <Card id="notices-card" title="What changed" meta={`${d.notices.length} new`}>
            <ul className="it-seats">
              {d.notices.map((n) => {
                const r = d.mine.find((x) => x.id === n.requestId);
                return (
                  <li key={n.id} data-notice={n.id}>
                    <span><Link to={`${pageUrl(IT_REQUEST)}?id=${n.requestId}`}>{r?.title ?? n.requestId}</Link> {NOTICE_TEXT[n.kind] ?? n.kind} <span className="it-sub">{stamp(n.at)}</span></span>
                    <button type="button" className="ds-btn ds-btn--sm" onClick={() => readNotice(n.id)} aria-label={`Mark the update on ${r?.title ?? n.requestId} as read`}>Mark as read</button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        <Card id="mine-card" title="Your requests" meta={<span id="mine-count">{countText(shown.length, d.mine.length, "request", { filtered: which !== "all" && d.mine.length > 0 })}</span>}>
          <div className="ds-stack">
            <Tabs pill active={tab} onChange={setTab} tabs={TABS.map(([k, label]) => ({ label, count: String(counts[k]) }))} />
            {d.mine.length === 0 ? <EmptyState title="You haven't raised anything with IT." text="Raise a request when you need an account, a device, software or help." to={pageUrl(IT_NEW)} linkText="Raise a request" />
              : shown.length === 0 ? <p className="text-muted" id="mine-empty">{which === "open" ? "Nothing is open." : "Nothing is finished yet."}</p> : (
                <ul className="it-feed" id="mine-list">
                  {shown.map((r) => (
                    <li key={r.id} className="it-feed__item" data-request-id={r.id}>
                      <div>
                        <Link to={`${pageUrl(IT_REQUEST)}?id=${r.id}`}><strong>{r.title}</strong></Link>
                        <span className="it-sub">{r.id}, {typeLabel(r.type)}, raised {stamp(r.createdAt)}{r.subjectPersonId && r.subjectPersonId !== userId ? `, for ${nameOf(r.subjectPersonId)}` : ""}</span>
                        <div className="it-feed__chips"><StatusChip status={r.status} /><PriorityChip priority={r.priority} />{r.assignedTo ? <span className="it-sub">With {nameOf(r.assignedTo)}</span> : <span className="it-sub">Not picked up yet</span>}</div>
                        <details className="it-details"><summary>Timeline ({d.full[r.id].timeline.length})</summary><Timeline entries={d.full[r.id].timeline} /></details>
                      </div>
                      <DueCell r={r} />
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </Card>
      </div>
      {asking && <RequestAssetDialog onClose={() => setAsking(false)} />}
    </>
  );
}

export default function MyItRequests() {
  return <OwnPage page={IT_MINE} title="My IT requests"><Content /></OwnPage>;
}