// Inventory (pages/inventory/items.html, rebuilt in AS2): the fixed-asset register (data/asset-register.js) for everyone with assets:view-all
// (HR, Finance, IT, Admin), and one asset's page at ?tag=AST-0217 (ui/assetDetail.jsx). Tag, name, category, holder, status chip, office and
// warranty for everyone; the purchase price and the book value today only for assets:view-values (Finance, Admin): for anyone else the two
// columns are not drawn and the register never returns the values (the data functions leave them out). Filters: status, category, office
// (every active office), holder, warranty ending soon; a search; Export. Add asset needs assets:manage; each row's actions are what the
// state machine allows (ui/assets.jsx assetActions). Components: Table, KpiCard, FilterBar, Modal (through the dialogs).
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listAssets, depreciationOf, warrantyExpiring } from "../../../assets/js/data/asset-register.js";
import { getOffices } from "../../../assets/js/data/offices-store.js";
import { nameOf, todayIso } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, KpiCard } from "../components/Layout.jsx";
import { FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { Pill } from "../components/Layout.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl } from "../routes.js";
import { StatusChip, STATUS_OPTIONS, CATEGORY_OPTIONS, categoryLabel, WarrantyText, DetailsMissingNote, AssetActionButtons, useAssetDialogs, inr, PATH } from "../ui/assets.jsx";
import AssetDetail from "../ui/assetDetail.jsx";

export const PAGE = "inventory/items.html";
const WARRANTY_OPTIONS = [{ value: "30", label: "Ends within 30 days" }, { value: "60", label: "Ends within 60 days" }, { value: "90", label: "Ends within 90 days" }];

function List() {
  const { userId } = useSession();
  const canValues = useCan("assets:view-values"), canManage = useCan("assets:manage");
  const canIssue = useCan("assets:issue"), canMaintain = useCan("assets:maintain"), canAct = canManage || canIssue || canMaintain;
  const today = todayIso();
  const dlg = useAssetDialogs();
  const d = useData(() => {
    const list = listAssets(userId);
    const books = canValues ? Object.fromEntries(list.map((a) => [a.tag, depreciationOf(userId, a.tag, today)])) : {};
    return { list, books, offices: getOffices() };
  }, [userId, canValues, today]);
  const [f, setF] = useState({ status: "", category: "", location: "", holder: "", warranty: "" });
  const [query, setQuery] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const active = Object.values(f).some(Boolean) || Boolean(query.trim());
  const expiring = useMemo(() => (f.warranty ? new Set(warrantyExpiring(userId, Number(f.warranty)).map((a) => a.tag)) : null), [f.warranty, userId, d.list]);
  const holders = useMemo(() => [...new Set(d.list.map((a) => a.holderId).filter(Boolean))].map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label)), [d.list]);
  const officeNameOf = (id) => d.offices.find((o) => o.id === id)?.name ?? "Inactive office";
  const q = query.trim().toLowerCase();
  const textOf = (a) => [a.tag, a.name, a.makeModel, a.serial, categoryLabel(a.category), a.holderId ? nameOf(a.holderId) : "", officeNameOf(a.locationId)].join(" ").toLowerCase();
  const rows = d.list.filter((a) => (!f.status || a.status === f.status) && (!f.category || a.category === f.category) && (!f.location || a.locationId === f.location)
    && (!f.holder || a.holderId === f.holder) && (!expiring || expiring.has(a.tag)) && (!q || textOf(a).includes(q)));
  const count = (s) => d.list.filter((a) => a.status === s).length;
  const missing = d.list.filter((a) => a.detailsMissing).length;
  const bookTotal = Object.values(d.books).reduce((s, b) => s + (b.ok ? b.bookValue : 0), 0);

  const columns = [
    { key: "tag", label: "Tag", className: "as-nowrap", sort: (a) => a.tag, csv: (a) => a.tag, render: (a) => <Link className="table__user-name" to={`${pageUrl(PAGE)}?tag=${encodeURIComponent(a.tag)}`} aria-label={`Open ${a.tag}`}>{a.tag}</Link> },
    { key: "name", label: "Asset", className: "as-asset", sort: (a) => a.name, csv: (a) => a.name, render: (a) => (
      <span className="as-cell"><strong>{a.name}</strong><span className="text-muted text-sm">{categoryLabel(a.category)}{a.makeModel && a.makeModel !== a.name ? `, ${a.makeModel}` : ""}</span><span className="as-narrow text-muted text-sm">{officeNameOf(a.locationId)}{a.warrantyUntil ? `, warranty to ${a.warrantyUntil}` : ""}</span>{a.detailsMissing && <Pill tone="warning" data-chip="details-missing">Details missing</Pill>}</span>) },
    { key: "holder", label: "Assigned to", sort: (a) => (a.holderId ? nameOf(a.holderId) : ""), csv: (a) => (a.holderId ? nameOf(a.holderId) : ""), render: (a) => (a.holderId ? nameOf(a.holderId) : <span className="text-muted">—</span>) },
    { key: "status", label: "Status", className: "as-nowrap", sort: (a) => a.status, csv: (a) => a.status, render: (a) => <StatusChip status={a.status} /> },
    { key: "location", label: "Office", sort: (a) => officeNameOf(a.locationId), csv: (a) => officeNameOf(a.locationId), render: (a) => <span className="as-cell">{officeNameOf(a.locationId)}{a.storeRoom && a.status === "in-store" && <span className="text-muted text-sm">{a.storeRoom}</span>}</span> },
    { key: "warranty", label: "Warranty", sort: (a) => a.warrantyUntil ?? "", csv: (a) => a.warrantyUntil ?? "", render: (a) => <WarrantyText until={a.warrantyUntil} today={today} /> },
    ...(canValues ? [
      { key: "price", label: "Purchase price", num: true, className: "as-nowrap", sort: (a) => a.purchasePrice ?? -1, csv: (a) => a.purchasePrice ?? "", render: (a) => inr(a.purchasePrice) },
      { key: "book", label: "Book value", num: true, className: "as-nowrap", sort: (a) => (d.books[a.tag]?.ok ? d.books[a.tag].bookValue : -1), csv: (a) => (d.books[a.tag]?.ok ? d.books[a.tag].bookValue : ""), render: (a) => (d.books[a.tag]?.ok ? inr(d.books[a.tag].bookValue) : <span className="text-muted">—</span>) },
    ] : []),
    ...(canAct ? [{ key: "actions", label: "Actions", actions: true, render: (a) => <AssetActionButtons asset={a} onAction={dlg.open} only={["issue", "return", "edit"]} /> }] : []),
  ];

  return (
    <>
      <PageHeader title="Inventory" subtitle="Every fixed asset: who holds it, where it is and what state it is in"
        actions={canManage ? <button type="button" className="ds-btn ds-btn--primary" id="add-asset" onClick={() => dlg.open("add")}><Icon d={PATH.plus} />Add asset</button> : null} />
      <div className="ds-stack">
        <div className="ds-grid as-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-total" label="Assets" value={String(d.list.length)} icon={ICON.layers} />
          <KpiCard id="kpi-assigned" label="Assigned" value={String(count("assigned"))} icon={ICON.users} />
          <KpiCard id="kpi-store" label="In store" value={String(count("in-store"))} icon={ICON.building} />
          <KpiCard id="kpi-maint" label="Under maintenance" value={String(count("under-maintenance"))} icon={ICON.clock} />
          {canValues && <KpiCard id="kpi-book" label="Book value today" value={inr(bookTotal)} icon={ICON.pulse} />}
        </div>
        <DetailsMissingNote count={missing} canFix={canManage} />
        <section className="ds-card" id="assets-card" aria-labelledby="assets-title">
          <div className="ds-card__header"><div><h2 className="ds-card__title" id="assets-title">All assets</h2><span className="ds-card__meta" id="assets-count">{countText(rows.length, d.list.length, "asset", { filtered: active })}</span></div></div>
          <div className="ds-card__body ds-stack">
            <FilterBar label="Filter the assets" active={active} onClearAll={() => { setF({ status: "", category: "", location: "", holder: "", warranty: "" }); setQuery(""); }}>
              <FilterSelect label="Status" value={f.status} onChange={set("status")} allLabel="All statuses" options={STATUS_OPTIONS} />
              <FilterSelect label="Category" value={f.category} onChange={set("category")} allLabel="All categories" options={CATEGORY_OPTIONS.map(([value, label]) => ({ value, label }))} />
              <FilterSelect label="Office" value={f.location} onChange={set("location")} allLabel="All offices" options={d.offices.map((o) => ({ value: o.id, label: o.name }))} />
              <FilterSelect label="Holder" value={f.holder} onChange={set("holder")} allLabel="Anyone" options={holders} />
              <FilterSelect label="Warranty" value={f.warranty} onChange={set("warranty")} allLabel="Any" options={WARRANTY_OPTIONS} />
              <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Tag, name, holder or serial" />
            </FilterBar>
            {d.list.length === 0
              ? <EmptyState title="No assets yet." text={canManage ? "Add the first one with Add asset." : "Nothing has been added to the register."} />
              : <Table bare columns={columns} rows={rows} rowKey={(a) => a.tag} empty="No assets match these filters." tableId="assets-table" tableClass="table table--tight as-table" />}
          </div>
        </section>
      </div>
      {dlg.node}
    </>
  );
}

export default function Inventory() {
  const [params] = useSearchParams();
  const tag = params.get("tag");
  return <Frame page={PAGE}>{tag ? <AssetDetail tag={tag} backTo={PAGE} /> : <List />}</Frame>;
}