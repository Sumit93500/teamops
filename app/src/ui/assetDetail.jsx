// One asset's page (AS2), at inventory/items.html?tag=AST-0217: its details, lifecycle timeline, assignment history, maintenance records and
// warranty; and, only for assets:view-values (Finance, Admin), a depreciation panel: method, rate, book value today, what has been taken, this
// and next year's charge, the schedule by year and a line of the book value over time (the shared AreaChart). Anyone else's page never
// holds a value: the register's reads leave them out, so there is nothing to draw (depreciationOf refuses them too). An asset a person may not
// see, or one that doesn't exist, says the same thing, so a tag can't be probed.
import { Link } from "react-router-dom";
import { getAssetFor, assetEvents, assignmentHistory, maintenanceOf, depreciationOf, vendorsFor } from "../../../assets/js/data/asset-register.js";
import { METHODS } from "../../../assets/js/data/asset-rules.js";
import { nameOf, todayIso } from "../../../assets/js/ui/leave-view.js";
import Table from "../components/Table.jsx";
import { PageHeader, Card, KpiCard, Pill } from "../components/Layout.jsx";
import { Kv } from "../components/Form.jsx";
import { EmptyState, Badge } from "../components/Basics.jsx";
import { AreaChart } from "../components/charts/Charts.jsx";
import { ICON } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { StatusChip, ConditionBadge, WarrantyText, Timeline, AssetActionButtons, useAssetDialogs, categoryLabel, officeName, dayText, inr } from "./assets.jsx";

const bookChart = (dep) => {
  const s = dep.schedule;
  const useMonths = s.months.length <= 72;
  const labels = useMonths ? s.months.map((m) => m.month) : s.years.map((y) => y.to);
  const values = useMonths ? s.months.map((m) => m.closing) : s.years.map((y) => y.closing);
  return { title: "Book value over time", unit: "₹", labels, series: [{ name: "Book value", values }], empty: !values.length, emptyReason: "Nothing depreciates yet." };
};

function Depreciation({ asset, dep, today }) {
  if (!dep.ok) return (
    <Card id="dep-card" title="Depreciation" meta="Finance and Admin only">
      <p className="ds-note ds-note--warning" id="dep-missing" role="status">{dep.error}</p>
    </Card>
  );
  const years = dep.schedule.years;
  const at = years.findIndex((y) => y.from <= today && today <= y.to);
  const thisYear = at >= 0 ? years[at].charge : 0;
  const nextYear = at >= 0 ? years[at + 1]?.charge ?? 0 : years.find((y) => y.from > today)?.charge ?? 0;
  const columns = [
    { key: "year", label: "Year", num: true, render: (y) => String(y.year) },
    { key: "from", label: "From", render: (y) => dayText(y.from) },
    { key: "to", label: "To", render: (y) => dayText(y.to) },
    { key: "opening", label: "Opening value", num: true, render: (y) => inr(y.opening) },
    { key: "charge", label: "Charge", num: true, render: (y) => inr(y.charge) },
    { key: "closing", label: "Closing value", num: true, render: (y) => inr(y.closing) },
  ];
  return (
    <Card id="dep-card" title="Depreciation" meta={`${METHODS[asset.depreciationMethod]?.label ?? asset.depreciationMethod}${asset.depreciationMethod === "wdv" ? `, ${asset.wdvRatePercent}% a year` : `, ${asset.usefulLifeYears} years`}`}>
      <div className="ds-stack">
        <div className="ds-grid as-kpis" role="group" aria-label="Depreciation figures">
          <KpiCard id="dep-book" label="Book value today" value={inr(dep.bookValue)} icon={ICON.pulse} />
          <KpiCard id="dep-acc" label="Taken so far" value={inr(dep.accumulated)} icon={ICON.progress} />
          <KpiCard id="dep-this" label="This year's charge" value={inr(thisYear)} icon={ICON.calendar} />
          <KpiCard id="dep-next" label="Next year's charge" value={inr(nextYear)} icon={ICON.calendar} />
        </div>
        <Kv id="dep-kv" rows={[["Purchase price", inr(asset.purchasePrice)], ["Salvage value", inr(asset.salvageValue)], [dep.fullyDepreciated ? "Fully depreciated since" : "Fully depreciated on", dep.fullyDepreciatedOn ? dayText(dep.fullyDepreciatedOn) : "Not within 100 years"],
          ...(asset.saleValue != null || asset.bookValueAtDisposal != null ? [["Book value at disposal", inr(asset.bookValueAtDisposal)], ["Sale value", inr(asset.saleValue)], [asset.gainOrLoss >= 0 ? "Gain on disposal" : "Loss on disposal", inr(Math.abs(asset.gainOrLoss ?? 0))]] : [])]} />
        <div id="dep-chart"><AreaChart chart={bookChart(dep)} id="book-value-chart" label={`Book value of ${asset.tag} over time`} height={240} labelHeader="Month" /></div>
        <Table bare pager={false} columns={columns} rows={years} rowKey={(y) => y.year} tableId="dep-schedule" empty="No schedule." rowProps={(y) => (y.from <= today && today <= y.to ? { "aria-current": "date", className: "as-row-now" } : {})} />
        <p className="ds-hint">Day by day from the purchase date (the purchase day counts); each year's charge is spread over that year's own days. The figures are rounded once to the paisa and add up exactly.</p>
      </div>
    </Card>
  );
}

export default function AssetDetail({ tag, backTo }) {
  const { userId } = useSession();
  const canValues = useCan("assets:view-values");
  const today = todayIso();
  const dlg = useAssetDialogs();
  const d = useData(() => {
    const asset = getAssetFor(userId, tag);
    if (!asset) return null;
    return { asset, events: assetEvents(userId, tag), rows: assignmentHistory(userId, tag), maint: maintenanceOf(userId, tag), vendors: vendorsFor(userId),
      dep: canValues ? depreciationOf(userId, tag, today, { schedule: true }) : null };
  }, [tag, userId, canValues, today]);
  const back = pageUrl(backTo);
  if (!d) {
    return (
      <>
        <PageHeader title="Asset" breadcrumb={[{ label: "Inventory", to: back }, { label: "Not found" }]} />
        <EmptyState title="You can't see this asset." text="It may not exist, or it may not be one you may see." to={back} linkText="Back to the inventory" />
      </>
    );
  }
  const { asset, events, rows, maint, dep, vendors } = d;
  const vendor = vendors.find((v) => v.id === asset.vendorId);
  const rowCols = [
    { key: "person", label: "Person", render: (r) => nameOf(r.personId) },
    { key: "from", label: "From", render: (r) => dayText(r.from) },
    { key: "to", label: "To", render: (r) => (r.to ? dayText(r.to) : <Badge tone="info" square>Holding now</Badge>) },
    { key: "by", label: "Issued by", render: (r) => (r.issuedBy ? nameOf(r.issuedBy) : "—") },
    { key: "ci", label: "Condition at issue", render: (r) => <ConditionBadge condition={r.conditionAtIssue} /> },
    { key: "cr", label: "Condition at return", render: (r) => (r.to ? <ConditionBadge condition={r.conditionAtReturn} /> : "—") },
    { key: "notes", label: "Notes", render: (r) => [r.notes, r.returnNotes].filter(Boolean).join(" · ") || "—" },
  ];
  const maintCols = [
    { key: "date", label: "Date", render: (m) => dayText(m.date) },
    { key: "issue", label: "Issue", render: (m) => m.issue },
    { key: "vendor", label: "Vendor", render: (m) => vendors.find((v) => v.id === m.vendorId)?.name ?? "—" },
    ...(canValues ? [{ key: "cost", label: "Cost", num: true, render: (m) => inr(m.cost) }] : []),
    { key: "next", label: "Next service", render: (m) => (m.nextServiceDue ? dayText(m.nextServiceDue) : "—") },
    { key: "status", label: "Status", render: (m) => (m.status === "open" ? <Pill tone="warning" data-chip="maintenance-open">Open</Pill> : <Pill tone="success">Done {m.closedOn ? dayText(m.closedOn) : ""}</Pill>) },
  ];
  const kv = [
    ["Category", categoryLabel(asset.category)], ["Make and model", asset.makeModel || "—"], ["Serial number", asset.serial || "—"],
    ["Status", <StatusChip status={asset.status} />],
    ["Holder", asset.holderId ? <span>{nameOf(asset.holderId)}{asset.since ? `, since ${dayText(asset.since)}` : ""}</span> : "In the store"],
    ["Condition", <ConditionBadge condition={asset.condition} />],
    ["Office", <span>{officeName(asset.locationId)}{asset.storeRoom ? `, ${asset.storeRoom}` : ""}</span>],
    ["Purchase date", asset.purchaseDate ? dayText(asset.purchaseDate) : <span className="text-muted">Not recorded</span>],
    ["Vendor", vendor ? vendor.name : "—"], ["Invoice", asset.invoiceRef || "—"], ["Warranty", <WarrantyText until={asset.warrantyUntil} today={today} />],
    ...(asset.retiredOn ? [["Retired", `${dayText(asset.retiredOn)}${asset.retireReason ? `: ${asset.retireReason}` : ""}`]] : []),
    ...(asset.disposedOn ? [["Disposed of", `${dayText(asset.disposedOn)}${asset.disposalReason ? `: ${asset.disposalReason}` : ""}`]] : []),
  ];
  return (
    <>
      <PageHeader title={asset.tag} subtitle={asset.name} breadcrumb={[{ label: "Inventory", to: back }, { label: asset.tag }]}
        actions={<AssetActionButtons asset={asset} onAction={dlg.open} size="md" />} />
      <div className="ds-stack" id="asset-detail" data-tag={asset.tag} data-status={asset.status}>
        {asset.detailsMissing && <p className="ds-note ds-note--warning" id="details-missing-note" role="status">This asset came from the old register, which had no purchase date or price for it.{asset.purchaseDate == null || asset.purchasePrice == null ? " They have not been added yet." : ""}</p>}
        <div className="as-detail">
          <Card id="asset-card" title="Details"><Kv id="asset-kv" rows={kv} /></Card>
          <Card id="lifecycle-card" title="Lifecycle"><Timeline events={events} /></Card>
        </div>
        <Card id="history-card" title="Assignment history" meta={`${rows.length} ${rows.length === 1 ? "holder" : "holders"}`}>
          {rows.length ? <Table bare pager={false} columns={rowCols} rows={rows} rowKey={(r) => `${r.personId}-${r.from}`} tableId="history-table" /> : <p className="ds-hint">Nobody has held it yet.</p>}
        </Card>
        <Card id="maint-card" title="Maintenance">
          {maint.length ? <Table bare pager={false} columns={maintCols} rows={maint} rowKey={(m) => m.id} tableId="maint-table" /> : <p className="ds-hint">No maintenance on record.</p>}
        </Card>
        {dep && <Depreciation asset={asset} dep={dep} today={today} />}
      </div>
      {dlg.node}
    </>
  );
}