// Complete details (IT2): the imported assets the old register never gave a purchase date, a price, a vendor or a serial number
// (data/asset-register.js detailsToComplete), for whoever looks after the register (assets:manage: IT and the Admin). Each missing field is
// its own flag: filling one removes it, and the "Details missing" label on the asset goes once the purchase date and price are both there.
// The price needs assets:view-values (Finance and the Admin), so IT is not offered it. The data layer checks every value as Edit does and
// its words are shown at the field. Access cards are counted stock, not assets, and are not on this list.
import { useState } from "react";
import { Link } from "react-router-dom";
import { detailsToComplete, completeDetails, vendorsFor } from "../../../assets/js/data/asset-register.js";
import OwnPage from "../ui/OwnPage.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, KpiCard, Card } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { ICON } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl, COMPLETE_DETAILS } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { AskDialog } from "../ui/it.jsx";
import { Pill } from "../components/Layout.jsx";
import { categoryLabel } from "../ui/assets.jsx";

const LABEL = { purchaseDate: "Purchase date", purchasePrice: "Price", vendorId: "Vendor", serial: "Serial number" };
const WARN = "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0";

function CompleteDialog({ row, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const vendors = useData(() => vendorsFor(userId).filter((v) => v.active), [userId]);
  const askable = row.missing.filter((k) => k !== "purchasePrice" || row.mayPrice);
  const defs = {
    purchaseDate: { name: "purchaseDate", label: "Purchase date", kind: "date", alias: ["purchaseDate"], hint: "Not in the future." },
    purchasePrice: { name: "purchasePrice", label: "Price (₹)", kind: "input", alias: ["purchasePrice"], hint: "Including tax, as on the invoice." },
    vendorId: { name: "vendorId", label: "Vendor", kind: "select", options: vendors.map((v) => [v.id, v.name]), placeholder: "Choose a vendor", alias: ["vendorId"] },
    serial: { name: "serial", label: "Serial number", kind: "input", maxLength: 40, alias: ["serial"] },
  };
  return (
    <AskDialog id="complete" title={`Complete ${row.tag}`} desc={`${row.name}. Fill in what you know; the rest stays on the list.`} submitLabel="Save details"
      intro={row.missing.includes("purchasePrice") && !row.mayPrice ? <p className="ds-note" id="price-note">The price is added by Finance or an Admin: it stays on the list until then.</p> : null}
      fields={askable.map((k) => defs[k])}
      run={(v) => completeDetails(userId, row.tag, Object.fromEntries(Object.entries(v).filter(([, x]) => String(x).trim() !== "")))}
      onClose={onClose} onDone={(r) => toast(r.missing.length ? `${row.tag} saved. Still missing: ${r.missing.map((k) => LABEL[k].toLowerCase()).join(", ")}.` : `${row.tag}: every detail is in.`, "success")} />
  );
}

function Content() {
  const { userId } = useSession();
  const [dialog, setDialog] = useState(null);
  const d = useData(() => ({ rows: detailsToComplete(userId) }), [userId]);
  const columns = [
    { key: "asset", label: "Asset and what is missing", className: "as-asset it-title-col", csv: (r) => r.tag, render: (r) => <span className="it-cell"><Link to={`${pageUrl("inventory/items.html")}?tag=${r.tag}`}><strong>{r.tag}</strong></Link><span className="it-sub">{r.name}, {categoryLabel(r.category)}</span><span className="it-feed__chips" data-missing={r.missing.join(" ")}>{r.missing.map((k) => <Pill key={k} tone="warning" icon={WARN} data-field={k}>{LABEL[k]}</Pill>)}</span></span> },
    { key: "actions", label: "Actions", actions: true, render: (r) => <button type="button" className="ds-btn ds-btn--sm" data-action="complete" onClick={() => setDialog(r)} aria-label={`Complete the details of ${r.tag}`}>Complete</button> },
  ];
  return (
    <>
      <PageHeader title="Complete details" subtitle="Assets imported from the old register that still lack purchase details" breadcrumb={[{ label: "Inventory", to: pageUrl("inventory/items.html") }, { label: "Complete details" }]} />
      <div className="ds-stack">
        <div className="ds-grid it-kpis" role="group" aria-label="Key numbers"><KpiCard id="kpi-incomplete" label="Assets to complete" value={String(d.rows.length)} icon={ICON.table} /></div>
        <Card id="details-card" title="Assets with details missing" meta={<span id="details-count">{countText(d.rows.length, d.rows.length, "asset")}</span>}>
          {d.rows.length === 0 ? <EmptyState title="Every imported asset is complete." text="Nothing is missing a purchase date, price, vendor or serial number." />
            : <Table bare columns={columns} rows={d.rows} rowKey={(r) => r.id} empty="Nothing to complete." tableId="details-table" tableClass="table table--tight it-table" />}
        </Card>
      </div>
      {dialog && <CompleteDialog row={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

export default function CompleteDetails() {
  const allowed = useCan("assets:manage");
  return <OwnPage page={COMPLETE_DETAILS} title="Complete details" allowed={allowed}><Content /></OwnPage>;
}