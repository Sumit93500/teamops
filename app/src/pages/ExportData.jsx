// Export data (I2): the record exports a person may make, one card each: leave, attendance, expenses (Finance only), visits, work tasks and
// the payroll register. Each card says what the file holds and opens the shared export dialog (ui/impex.jsx) with a date range, CSV or Excel,
// and, for the payroll register only, the full bank account and PAN numbers for someone who may Show them. For anyone holding one of
// export:leave, export:attendance, export:expenses, export:visits, export:tasks, export:payroll (shell/importAccess.js). Data: data/export.js
// with data/export-records.js; the data layer checks every permission again.
import { useState } from "react";
import { Link } from "react-router-dom";
import { RECORD_MODULES, recordModulesFor } from "../../../assets/js/data/export-records.js";
import { mayExportSensitive } from "../../../assets/js/data/export.js";
import { getUser } from "../../../assets/js/data/store.js";
import { todayIso } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl, EXPORT_DATA, IMPORT_HISTORY } from "../routes.js";
import { ExportDialog } from "../ui/impex.jsx";
import { useToast } from "../ui/Toast.jsx";
import { mayOpenExportData } from "../shell/importAccess.js";

// what each file is, in a sentence
const ABOUT = {
  leave: "Every leave request whose days fall in the dates: who, the type, the days, the status and the reason.",
  attendance: "One row per person and day: the status, the shift, check-in and check-out, hours, minutes late and whether the day was corrected. At most 92 days.",
  expenses: "Every claim spent in the dates: who, the category, the amount, the status and when it was paid. Whether a receipt is attached, never the receipt.",
  visits: "Every visit whose days fall in the dates: who, the kind, the site, the purpose and the status. No location readings.",
  tasks: "Every work task due in the dates: the title, who it is for and from, the priority and the status. Personal tasks are never in it.",
  payroll: "Each person's payroll row for every month in the dates (at most 12): pay, loss of pay, deductions and net pay, with the run's status. Bank account and PAN are masked.",
};
const MAX = { attendance: "At most 92 days.", payroll: "At most 12 months: each month in the dates is a run." };
const firstOfMonth = (iso) => `${iso.slice(0, 8)}01`;

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const canHistory = useCan("import:history-view");
  const [open, setOpen] = useState(null);
  const d = useData(() => ({ modules: recordModulesFor(getUser(userId)), full: mayExportSensitive(userId) }), [userId]);
  const today = todayIso();
  return (
    <>
      <PageHeader title="Export data" subtitle="Lists as CSV or Excel files, with only what you may see"
        actions={canHistory ? <Link className="ds-btn" to={pageUrl(IMPORT_HISTORY)}>Import history</Link> : null} />
      <div className="ds-grid ix-export-grid" id="export-cards">
        {d.modules.map((key) => {
          const m = RECORD_MODULES[key];
          const cols = m.columns();
          return (
            <Card key={key} id={`export-${key}`} title={m.label}>
              <div className="ds-stack">
                <p className="ix-lead">{key === "payroll" && d.full ? ABOUT.payroll.replace("are masked.", "are masked unless you include the full numbers.") : ABOUT[key]}</p>
                <details className="ix-details">
                  <summary>The {cols.length} columns</summary>
                  <ul className="ix-columns">{cols.map((c) => <li key={c.key}>{c.header}{c.sensitive ? <small>: {d.full ? "masked unless you include the full numbers" : "masked (the last 4 digits)"}</small> : null}</li>)}</ul>
                </details>
                <div className="ix-actions"><button type="button" className="ds-btn ds-btn--primary" id={`export-open-${key}`} onClick={() => setOpen(key)}><Icon d={ICON.download} />Export {m.label.toLowerCase()}</button></div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="ix-lead ix-export-note" id="export-note">Every export is recorded: who, when, which dates and how many rows. Dates in the files are written as <span className="ix-nowrap">YYYY-MM-DD</span>.</p>
      {open && (
        <ExportDialog key={open} open onClose={() => setOpen(null)} module={open} userId={userId} matching={null} total={0} filters="" title={`Export ${RECORD_MODULES[open].label.toLowerCase()}`}
          range={{ from: firstOfMonth(today), to: today, max: MAX[open] ?? "At most a year." }} sensitiveColumns={Boolean(RECORD_MODULES[open].sensitive)}
          onDone={(r) => toast(`Downloaded ${r.name} (${r.rows} ${r.rows === 1 ? "row" : "rows"}).`, "success")} />
      )}
    </>
  );
}

export default function ExportData() {
  useSession();   // drawn again when the person changes
  const allowed = mayOpenExportData();
  return <OwnPage page={EXPORT_DATA} title="Export data" allowed={allowed}><Content /></OwnPage>;
}