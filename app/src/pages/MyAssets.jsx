// My assets (pages/inventory/my-assets.html, rebuilt in AS2): what has been issued to the signed-in person, now and before, from the asset
// register (data/asset-register.js). Only their own: the register's own view (assets:view-own) returns nothing about anyone else's assets and no
// value at all, so there is nothing here to hide. Request an asset and Request return make IT requests (data/it-desk.js); the person follows
// them in My requests. Components: Table, Card, Modal (through the request dialogs).
import { useState } from "react";
import { Link } from "react-router-dom";
import { listAssets, assignmentsOf } from "../../../assets/js/data/asset-register.js";
import { requestsFor } from "../../../assets/js/data/it-desk.js";
import { todayIso } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl } from "../routes.js";
import { ConditionBadge, WarrantyText, categoryLabel, dayText, PATH } from "../ui/assets.jsx";
import { RequestAssetDialog, RequestReturnDialog, IT_STATUS } from "../ui/assetRequests.jsx";

const PAGE = "inventory/my-assets.html";

export default function MyAssets() {
  const { userId } = useSession();
  const canRequest = useCan("assets:request");
  const today = todayIso();
  const [dialog, setDialog] = useState(null);
  const d = useData(() => ({
    mine: listAssets(userId), history: assignmentsOf(userId, userId),
    asks: requestsFor(userId, { mine: true }).filter((r) => r.type === "asset-request" || r.type === "asset-return"),
  }), [userId]);
  const now = d.mine.filter((a) => a.heldByYou);
  const past = d.history.filter((r) => r.to);
  const open = d.asks.filter((r) => !["done", "cancelled"].includes(r.status));
  const asking = (tag) => d.asks.some((r) => r.type === "asset-return" && r.payload?.assetTag === tag && !["done", "cancelled", "rejected"].includes(r.status));

  const nowCols = [
    { key: "tag", label: "Tag", sort: (a) => a.tag, render: (a) => <span className="table__user-name">{a.tag}</span> },
    { key: "name", label: "Asset", sort: (a) => a.name, render: (a) => <span className="as-cell"><strong>{a.name}</strong><span className="text-muted text-sm">{categoryLabel(a.category)}{a.serial ? `, serial ${a.serial}` : ""}</span></span> },
    { key: "since", label: "Issued", sort: (a) => a.since ?? "", render: (a) => dayText(a.since) },
    { key: "condition", label: "Condition", render: (a) => <ConditionBadge condition={a.condition} /> },
    { key: "warranty", label: "Warranty", render: (a) => <WarrantyText until={a.warrantyUntil} today={today} /> },
    { key: "actions", label: "Actions", actions: true, render: (a) => (asking(a.tag)
      ? <Pill tone="info" data-chip="return-asked">Return requested</Pill>
      : canRequest ? <button type="button" className="ds-btn ds-btn--sm" data-action="request-return" onClick={() => setDialog({ kind: "return", asset: a })} aria-label={`Request the return of ${a.tag}`}>Request return</button> : null) },
  ];
  const pastCols = [
    { key: "tag", label: "Tag", render: (r) => <span className="table__user-name">{r.tag}</span> },
    { key: "name", label: "Asset", render: (r) => r.name },
    { key: "from", label: "From", render: (r) => dayText(r.from) },
    { key: "to", label: "Until", render: (r) => dayText(r.to) },
    { key: "condition", label: "Condition when returned", render: (r) => <ConditionBadge condition={r.conditionAtReturn} /> },
  ];

  return (
    <Frame page={PAGE}>
      <PageHeader title="My assets" subtitle="What has been issued to you, now and before"
        actions={canRequest ? <button type="button" className="ds-btn ds-btn--primary" id="request-asset" onClick={() => setDialog({ kind: "ask" })}><Icon d={PATH.plus} />Request an asset</button> : null} />
      <div className="ds-stack">
        <Card id="now-card" title="Issued to you now" meta={<span id="now-count">{countText(now.length, now.length, "asset")}</span>}>
          {now.length ? <Table bare pager={false} columns={nowCols} rows={now} rowKey={(a) => a.tag} tableId="my-assets-table" /> : <EmptyState title="Nothing is issued to you." text={canRequest ? "Ask IT for what you need with Request an asset." : undefined} />}
        </Card>
        {open.length > 0 && (
          <Card id="asks-card" title="Your open asset requests" meta={<Link to={pageUrl("requests/my-requests.html")}>Follow them in My requests</Link>}>
            <ul className="as-asks" id="asks-list">
              {open.map((r) => <li key={r.id}><strong>{r.title}</strong> <Pill tone={IT_STATUS[r.status]?.[1] ?? ""} data-chip="it-status">{IT_STATUS[r.status]?.[0] ?? r.status}</Pill></li>)}
            </ul>
          </Card>
        )}
        <Card id="past-card" title="Past assignments" meta={<span id="past-count">{countText(past.length, past.length, "asset")}</span>}>
          {past.length ? <Table bare pager={false} columns={pastCols} rows={past} rowKey={(r) => `${r.tag}-${r.from}`} tableId="past-assets-table" /> : <p className="ds-hint" id="no-past">Nothing you held has been handed back yet.</p>}
        </Card>
      </div>
      {dialog?.kind === "ask" && <RequestAssetDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === "return" && <RequestReturnDialog asset={dialog.asset} onClose={() => setDialog(null)} />}
    </Frame>
  );
}