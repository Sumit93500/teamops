// Export pay details (I1): Finance's file of everyone's pay and bank details, as Finance already sees them: the bank account and PAN masked
// (the last 4), the IFSC, bank, branch, account holder, UAN and ESI. Only someone who may Show the numbers (pii:view: the Admin) can tick
// "Include the full numbers", and that is recorded. CSV or Excel. For export:employees-pay (Finance, Admin). Data: data/export.js.
import { useState } from "react";
import { exportColumns, exportScope, mayExportSensitive } from "../../../assets/js/data/export.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, EXPORT_PAY, IMPORT_HISTORY } from "../routes.js";
import { ExportDialog } from "../ui/impex.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Link } from "react-router-dom";

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const canHistory = useCan("import:history-view");
  const [open, setOpen] = useState(false);
  const d = useData(() => ({ cols: exportColumns(userId, "employees-pay"), people: exportScope(userId, "employees-pay").length, full: mayExportSensitive(userId) }), [userId]);
  return (
    <>
      <PageHeader title="Export pay details" subtitle="Everyone's bank and tax details as a file, as you see them"
        actions={canHistory ? <Link className="ds-btn" to={pageUrl(IMPORT_HISTORY)}>Import history</Link> : null} />
      <Card id="pay-export-card">
        <div className="ds-stack">
          <p className="ix-lead" id="pay-export-what">{d.people} {d.people === 1 ? "person" : "people"}, one row each, with these columns:</p>
          <ul className="ix-columns" id="pay-export-columns">{d.cols.map((c) => <li key={c.key}>{c.header}{c.sensitive ? <small>: {d.full ? "masked unless you include the full numbers" : "masked (the last 4 digits)"}</small> : null}</li>)}</ul>
          <p className="ix-lead">Salaries aren't in this file: they come with each payroll run. Every export is recorded: who, when, how many rows.</p>
          <div className="ix-actions"><button type="button" className="ds-btn ds-btn--primary" id="pay-export-open" onClick={() => setOpen(true)}><Icon d={ICON.download} />Export</button></div>
        </div>
      </Card>
      <ExportDialog open={open} onClose={() => setOpen(false)} module="employees-pay" userId={userId} total={d.people} matching={null} filters="" title="Export pay details" allText={`All ${d.people} ${d.people === 1 ? "person" : "people"} you can see, one row each.`}
        onDone={(r) => toast(`Downloaded ${r.name} (${r.rows} ${r.rows === 1 ? "row" : "rows"}).`, "success")} />
    </>
  );
}

export default function ExportPay() {
  const allowed = useCan("export:employees-pay");
  return <OwnPage page={EXPORT_PAY} title="Export pay details" allowed={allowed}><Content /></OwnPage>;
}