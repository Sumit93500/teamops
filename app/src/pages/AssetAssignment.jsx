// Asset assignment (pages/inventory/asset-assignment.html, rebuilt in AS2): who holds what, and the work that moves an asset: for assets:view-all
// (HR, Finance, IT, Admin) to read; issuing and taking back needs assets:issue and maintenance assets:maintain (IT, Admin). Four tabs. Held:
// every issued asset with its holder, Take back. In store: what can be issued, Issue and Send for maintenance. Maintenance: the open records
// (Back from maintenance), the services past their date and the warranties ending in 30, 60 or 90 days. Not returned: assets still with
// someone who has left (the offboarding list). A button is offered only when the state machine allows the move and the person holds the
// permission; the AS1 functions check both again and say why in plain words.
import { useState } from "react";
import { Link } from "react-router-dom";
import { listAssets, assetsNotReturned, maintenanceList, overdueService, warrantyExpiring } from "../../../assets/js/data/asset-register.js";
import { nameOf, todayIso } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, KpiCard, Pill } from "../components/Layout.jsx";
import { FilterBar, FilterSearch, FilterSelect } from "../components/Controls.jsx";
import { Tabs, EmptyState, Badge } from "../components/Basics.jsx";
import { ICON } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl } from "../routes.js";
import { StatusChip, ConditionBadge, WarrantyText, AssetActionButtons, useAssetDialogs, categoryLabel, officeName, dayText, inr } from "../ui/assets.jsx";

const PAGE = "inventory/asset-assignment.html";
const ITEMS = pageUrl("inventory/items.html");
const tagLink = (a) => <Link className="table__user-name" to={`${ITEMS}?tag=${encodeURIComponent(a.tag)}`} aria-label={`Open ${a.tag}`}>{a.tag}</Link>;
const WARRANTY_DAYS = [{ value: "60", label: "60 days" }, { value: "90", label: "90 days" }];

export default function AssetAssignment() {
  const { userId } = useSession();
  const canValues = useCan("assets:view-values");
  const canManage = useCan("assets:manage"), canIssue = useCan("assets:issue"), canMaintain = useCan("assets:maintain"), canAct = canManage || canIssue || canMaintain;
  const today = todayIso();
  const dlg = useAssetDialogs();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("");
  const d = useData(() => ({ list: listAssets(userId), left: assetsNotReturned(userId, {}), records: maintenanceList(userId), overdue: overdueService(userId), warranty: warrantyExpiring(userId, Number(days || 30)) }), [userId, days]);
  const q = query.trim().toLowerCase();
  const match = (a) => !q || [a.tag, a.name, a.holderId ? nameOf(a.holderId) : "", categoryLabel(a.category)].join(" ").toLowerCase().includes(q);
  const held = d.list.filter((a) => a.status === "assigned" && match(a));
  const store = d.list.filter((a) => a.status === "in-store" && match(a));
  const left = d.left.filter((x) => match(x.asset));
  const assetOf = (tag) => d.list.find((a) => a.tag === tag);
  const openRecords = d.records.filter((r) => r.status === "open");

  const heldCols = [
    { key: "tag", label: "Tag", sort: (a) => a.tag, render: tagLink },
    { key: "name", label: "Asset", className: "as-asset", sort: (a) => a.name, render: (a) => <span className="as-cell"><strong>{a.name}</strong><span className="text-muted text-sm">{categoryLabel(a.category)}</span></span> },
    { key: "holder", label: "Assigned to", sort: (a) => nameOf(a.holderId), render: (a) => nameOf(a.holderId) },
    { key: "since", label: "Since", sort: (a) => a.since ?? "", render: (a) => dayText(a.since) },
    { key: "condition", label: "Condition", render: (a) => <ConditionBadge condition={a.condition} /> },
    ...(canAct ? [{ key: "actions", label: "Actions", actions: true, render: (a) => <AssetActionButtons asset={a} onAction={dlg.open} only={["return"]} /> }] : []),
  ];
  const storeCols = [
    { key: "tag", label: "Tag", sort: (a) => a.tag, render: tagLink },
    { key: "name", label: "Asset", className: "as-asset", sort: (a) => a.name, render: (a) => <span className="as-cell"><strong>{a.name}</strong><span className="text-muted text-sm">{categoryLabel(a.category)}</span></span> },
    { key: "where", label: "Kept at", render: (a) => <span className="as-cell">{officeName(a.locationId)}{a.storeRoom && <span className="text-muted text-sm">{a.storeRoom}</span>}</span> },
    { key: "condition", label: "Condition", render: (a) => <ConditionBadge condition={a.condition} /> },
    { key: "status", label: "Status", render: (a) => <StatusChip status={a.status} /> },
    ...(canAct ? [{ key: "actions", label: "Actions", actions: true, render: (a) => <AssetActionButtons asset={a} onAction={dlg.open} only={["issue", "maintenance"]} /> }] : []),
  ];
  const recordCols = [
    { key: "tag", label: "Tag", render: (r) => (r.tag ? tagLink(r) : "—") },
    { key: "asset", label: "Asset", render: (r) => r.assetName },
    { key: "issue", label: "Issue", render: (r) => r.issue },
    { key: "date", label: "Opened", render: (r) => dayText(r.date) },
    ...(canValues ? [{ key: "cost", label: "Cost", num: true, render: (r) => inr(r.cost) }] : []),
    ...(canAct ? [{ key: "actions", label: "Actions", actions: true, render: (r) => (assetOf(r.tag) ? <AssetActionButtons asset={assetOf(r.tag)} onAction={dlg.open} only={["close-maintenance"]} /> : null) }] : []),
  ];
  const overdueCols = [
    { key: "tag", label: "Tag", render: (o) => tagLink(o.asset) },
    { key: "asset", label: "Asset", render: (o) => o.asset.name },
    { key: "due", label: "Service was due", render: (o) => <span>{dayText(o.due)} <Badge tone="danger" square>Overdue</Badge></span> },
    { key: "last", label: "Last record", render: (o) => o.record.issue },
  ];
  const warrantyCols = [
    { key: "tag", label: "Tag", render: tagLink },
    { key: "asset", label: "Asset", render: (a) => a.name },
    { key: "holder", label: "Holder", render: (a) => (a.holderId ? nameOf(a.holderId) : "In the store") },
    { key: "until", label: "Warranty ends", render: (a) => <WarrantyText until={a.warrantyUntil} today={today} /> },
  ];
  const leftCols = [
    { key: "tag", label: "Tag", render: (x) => tagLink(x.asset) },
    { key: "asset", label: "Asset", render: (x) => x.asset.name },
    { key: "who", label: "Assigned to", render: (x) => <span>{nameOf(x.personId)} <Pill tone="danger" data-chip="left">Has left</Pill></span> },
    { key: "last", label: "Last working day", render: (x) => (x.exitDate ? dayText(x.exitDate) : <span className="text-muted">Not recorded</span>) },
    { key: "since", label: "Held since", render: (x) => dayText(x.since) },
    ...(canAct ? [{ key: "actions", label: "Actions", actions: true, render: (x) => <AssetActionButtons asset={x.asset} onAction={dlg.open} only={["return"]} /> }] : []),
  ];
  const tabs = [{ label: "Held", count: String(d.list.filter((a) => a.status === "assigned").length) }, { label: "In store", count: String(d.list.filter((a) => a.status === "in-store").length) },
    { label: "Maintenance", count: String(openRecords.length) }, { label: "Not returned", count: String(d.left.length) }];

  return (
    <Frame page={PAGE}>
      <PageHeader title="Asset assignment" subtitle="Issue and take back assets, and keep them serviced" />
      <div className="ds-stack">
        <div className="ds-grid as-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-held" label="Held by people" value={String(d.list.filter((a) => a.status === "assigned").length)} icon={ICON.users} />
          <KpiCard id="kpi-store" label="In store" value={String(d.list.filter((a) => a.status === "in-store").length)} icon={ICON.building} />
          <KpiCard id="kpi-maint" label="Open maintenance" value={String(openRecords.length)} icon={ICON.clock} />
          <KpiCard id="kpi-left" label="Not returned" value={String(d.left.length)} icon={ICON.pulse} />
        </div>
        <section className="ds-card" aria-label="Assignment">
          <div className="ds-card__body ds-stack">
            <div className="as-tabs"><Tabs pill active={tab} onChange={(t) => { setTab(t); setQuery(""); }} tabs={tabs} /></div>
            {tab !== 2 && (
              <FilterBar label="Search the assets" active={Boolean(query.trim())} onClearAll={() => setQuery("")}>
                <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Tag, asset or person" />
              </FilterBar>
            )}
            {tab === 0 && (d.list.some((a) => a.status === "assigned")
              ? <><Table bare columns={heldCols} rows={held} rowKey={(a) => a.tag} empty="No held asset matches." tableId="held-table" /><p className="ds-hint" id="held-count">{countText(held.length, d.list.filter((a) => a.status === "assigned").length, "asset", { filtered: Boolean(q) })}</p></>
              : <EmptyState title="Nothing is issued." text="Issue an asset from the In store tab." />)}
            {tab === 1 && (d.list.some((a) => a.status === "in-store")
              ? <><Table bare columns={storeCols} rows={store} rowKey={(a) => a.tag} empty="No asset in the store matches." tableId="store-table" /><p className="ds-hint" id="store-count">{countText(store.length, d.list.filter((a) => a.status === "in-store").length, "asset", { filtered: Boolean(q) })}</p></>
              : <EmptyState title="Nothing is in the store." text="Assets handed back come here." />)}
            {tab === 2 && (
              <div className="ds-stack">
                <h3 className="as-subhead">Open records</h3>
                {openRecords.length ? <Table bare pager={false} columns={recordCols} rows={openRecords} rowKey={(r) => r.id} tableId="open-maint-table" /> : <p className="ds-hint" id="no-open-maint">No asset is with a vendor or being serviced.</p>}
                <h3 className="as-subhead">Service overdue</h3>
                {d.overdue.length ? <Table bare pager={false} columns={overdueCols} rows={d.overdue} rowKey={(o) => o.asset.tag} tableId="overdue-table" /> : <p className="ds-hint" id="no-overdue">No service is past its date.</p>}
                <div className="as-subhead-row">
                  <h3 className="as-subhead">Warranty ending</h3>
                  <FilterSelect label="Within" value={days} onChange={setDays} allLabel="30 days" options={WARRANTY_DAYS} />
                </div>
                {d.warranty.length ? <Table bare pager={false} columns={warrantyCols} rows={d.warranty} rowKey={(a) => a.tag} tableId="warranty-table" /> : <p className="ds-hint" id="no-warranty">No warranty ends in the next {days || 30} days.</p>}
              </div>
            )}
            {tab === 3 && (d.left.length
              ? <><p className="ds-note ds-note--warning" id="left-note" role="status">These assets are still with people who have left. Take each back (also from someone who has left), or it stays on their offboarding.</p><Table bare columns={leftCols} rows={left} rowKey={(x) => x.asset.tag} empty="No asset matches." tableId="left-table" /></>
              : <EmptyState title="Nothing is waiting to come back." text="Nobody who has left is still holding an asset." />)}
          </div>
        </section>
      </div>
      {dlg.node}
    </Frame>
  );
}