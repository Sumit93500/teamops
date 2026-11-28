// I1: what the import and export screens share: saving a file, the export dialog (the Users list's Export button), the words for the history.
// The data layer decides everything (data/export.js: who may export what, which rows and columns, masked or not; data/import-engine.js);
// these only draw it. Classes are prefixed ix- (design/impex.css).
import { useState } from "react";
import Modal from "../components/Modal.jsx";
import { Segmented } from "../components/Controls.jsx";
import { exportFile, mayExportSensitive } from "../../../assets/js/data/export.js";
import { bump } from "../data/bus.js";
import "../design/impex.css";

// Saves a file the page made (a Blob and a temporary link): CSV text (its BOM included) or xlsx bytes.
export function downloadFile({ name, mime, text, bytes }) {
  const url = URL.createObjectURL(new Blob([bytes ?? text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener"; a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const sizeText = (bytes) => (bytes < 1024 ? `${bytes} bytes` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);
export const stamp = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) : "—");
export const WHAT = { "import:employees": "Import employees", "export:employees": "Export employees", "export:employees-pay": "Export pay details",
  // I2
  "import:assets": "Import assets", "import:stock-opening": "Import stock counts", "import:licences": "Import licences", "import:leave-balances": "Import leave balances",
  "import:attendance-corrections": "Import attendance corrections", "export:leave": "Export leave", "export:attendance": "Export attendance", "export:expenses": "Export expenses",
  "export:visits": "Export visits", "export:tasks": "Export work tasks", "export:payroll": "Export payroll register" };
export const whatOf = (e) => WHAT[`${e.kind}:${e.kind === "import" ? e.form : e.module}`] ?? `${e.kind === "import" ? "Import" : "Export"} ${e.form ?? e.module}`;
export const STATUS = {
  checked: ["Checked, not imported", "info"], imported: ["Imported", "success"], refused: ["Refused", "danger"], failed: ["Failed, rolled back", "danger"], exported: ["Downloaded", "success"],
  ready: ["Ready", "success"], error: ["Has errors", "danger"], duplicate: ["Duplicate", "warning"],
};

// "1 Nov 2026" for the log's words (never an ISO date in what a person reads)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayWords = (iso) => { const [y, m, d] = String(iso ?? "").split("-").map(Number); return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : ""; };

const FORMATS = [{ value: "csv", label: "CSV" }, { value: "xlsx", label: "Excel (.xlsx)" }];

// The Export dialog. matching: the ids the list's filters show (null when nothing is filtered); total: everyone the viewer can see;
// filters: the filters in words (for the log). onDone(file) after the download.
// I2: range { from, to, max } asks for the dates of a record export (data/export-records.js) instead of the rows; sensitiveColumns false
// leaves out the Aadhaar, bank account and PAN choice (a file with none of them).
export function ExportDialog({ open, onClose, module, userId, matching, total, filters, onDone, title = "Export employees", allText = null, range = null, sensitiveColumns = true }) {
  const [format, setFormat] = useState("csv");
  const [which, setWhich] = useState("matching");
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dates, setDates] = useState(() => (range ? { from: range.from, to: range.to } : null));
  const filtered = Array.isArray(matching);
  const maySensitive = sensitiveColumns && mayExportSensitive(userId);
  const close = () => { setError(""); setFull(false); setWhich("matching"); onClose(); };
  const go = async () => {
    setBusy(true); setError("");
    const useMatching = filtered && which === "matching";
    const r = range ? await exportFile(userId, module, { includeSensitive: maySensitive && full, format, from: dates.from, to: dates.to, filters: `${dayWords(dates.from)} to ${dayWords(dates.to)}` })
      : await exportFile(userId, module, { ids: useMatching ? matching : null, includeSensitive: maySensitive && full, format, filters: useMatching ? filters : "All they can see" });
    setBusy(false);
    bump();
    if (!r.ok) { setError(r.error); return; }
    downloadFile(r);
    onDone?.(r);
    close();
  };
  return (
    <Modal open={open} onClose={close} title={title} id="export-dialog" guard={false}
      footer={<><button type="button" className="ds-btn" onClick={close}>Cancel</button>
        <button type="button" className="ds-btn ds-btn--primary" id="export-go" onClick={go} disabled={busy} aria-busy={busy ? "true" : undefined}>{busy ? "Preparing…" : "Download"}</button></>}>
      <div className="ix-dialog">
        <fieldset className="ix-fieldset">
          <legend>Format</legend>
          <Segmented label="Format" options={FORMATS} value={format} onChange={setFormat} />
        </fieldset>
        {range ? (
          <fieldset className="ix-fieldset" id="export-dates">
            <legend>Dates</legend>
            <div className="ix-dates">
              <label className="ix-date"><span>From</span><input type="date" className="ds-input" id="export-from" value={dates.from} max={dates.to || undefined} onChange={(e) => setDates((d) => ({ ...d, from: e.target.value }))} /></label>
              <label className="ix-date"><span>To</span><input type="date" className="ds-input" id="export-to" value={dates.to} min={dates.from || undefined} onChange={(e) => setDates((d) => ({ ...d, to: e.target.value }))} /></label>
            </div>
            <small className="ix-sub">{range.max}</small>
          </fieldset>
        ) : filtered ? (
          <fieldset className="ix-fieldset" id="export-rows">
            <legend>Rows</legend>
            <label className="ix-choice"><input type="radio" name="export-rows" value="matching" checked={which === "matching"} onChange={() => setWhich("matching")} />
              <span>Matching the filters<small>{matching.length} of {total}: {filters}</small></span></label>
            <label className="ix-choice"><input type="radio" name="export-rows" value="all" checked={which === "all"} onChange={() => setWhich("all")} />
              <span>Everyone you can see<small>{total} in all</small></span></label>
          </fieldset>
        ) : <p className="ix-lead" id="export-rows">{allText ?? `All ${total} you can see. Filter the list first to export part of it.`}</p>}
        {!sensitiveColumns ? null : maySensitive ? (
          <fieldset className="ix-fieldset" id="export-sensitive">
            <legend>Aadhaar, bank account and PAN</legend>
            <label className="ix-choice"><input type="checkbox" id="export-full" checked={full} onChange={(e) => setFull(e.target.checked)} />
              <span>Include the full numbers<small>Otherwise they are masked (the last 4 digits), as on the profile. Including them is recorded in the audit trail.</small></span></label>
          </fieldset>
        ) : <p className="ix-lead" id="export-sensitive">Aadhaar, bank account and PAN are masked (the last 4 digits), as on the profile.</p>}
        <p className="ix-lead">Dates are written as YYYY-MM-DD. Each export is recorded: who, when, which rows.</p>
        {error && <p className="ds-note ds-note--danger" role="alert" id="export-error">{error}</p>}
      </div>
    </Modal>
  );
}