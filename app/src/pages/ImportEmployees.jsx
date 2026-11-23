// Import employees (I1): new employees from a CSV or Excel file, in four steps: Upload (the template, then the file: dropped or chosen),
// Check (the counts, the first rows, every problem with its row number, the error report), Confirm (what will happen, in plain words), Done
// (links to the people made and their sign-in requests to IT). Nothing is written before Confirm, and nobody gets a sign-in from it: each new
// person gets one new-account request for IT. For import:employees (HR, Admin). Data: data/import-engine.js with data/import-employees.js.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { checkImport, applyImport, templateFor, refuseUnread, columnsFor, summaryText, problemText, errorReport, IMPORT_LIMITS, TOKEN_MINUTES } from "../../../assets/js/data/import-engine.js";
import { EMPLOYEES_FORM } from "../../../assets/js/data/import-employees.js";
import { getUser } from "../../../assets/js/data/store.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, KpiCard, Card, Pill } from "../components/Layout.jsx";
import { Stepper } from "../components/Basics.jsx";
import Table from "../components/Table.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { pageUrl, IMPORT_EMPLOYEES, IMPORT_HISTORY, IT_REQUEST } from "../routes.js";
import { downloadFile, sizeText, STATUS } from "../ui/impex.jsx";
import { todayIso } from "../../../assets/js/ui/leave-view.js";
import { usePhone } from "../ui/phone.jsx";

const FORM = EMPLOYEES_FORM;
const STEPS = [["upload", "Upload", "The template, then your file"], ["check", "Check", "What the file holds"], ["confirm", "Confirm", "What will happen"], ["done", "Done", "The people added"]];
const UPLOAD = "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3";
const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const errorFileName = () => `employees-import-errors-${todayIso()}.csv`;

function StatusPill({ status }) {
  const [words, tone] = STATUS[status] ?? [status, ""];
  return <Pill tone={tone} data-ix-status={status}>{words}</Pill>;
}

function Content() {
  const { userId } = useSession();
  const canHistory = useCan("import:history-view");
  const phone = usePhone();   // the column list starts folded on a phone
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);   // { name, size, bytes }
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState("");     // "", "reading", "checking", "importing"
  const [error, setError] = useState(null); // { text, code }
  const [check, setCheck] = useState(null);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const input = useRef(null), title = useRef(null), first = useRef(true);
  const actor = getUser(userId);
  const cols = actor ? columnsFor(FORM, actor) : [];
  const at = STEPS.findIndex(([k]) => k === step);

  // a new step: its heading takes the focus (so a screen reader reads where it is), never on the first draw
  useLayoutEffect(() => { if (first.current) { first.current = false; return; } title.current?.focus(); }, [step]);
  useEffect(() => { setPage(1); }, [check]);

  const template = async (format) => {
    const t = await templateFor(FORM, userId, format);
    if (!t.ok) { setError({ text: t.error }); return; }
    downloadFile(t);
  };
  const choose = async (f) => {
    setError(null);
    if (!f) return;
    if (f.size > IMPORT_LIMITS.bytes || f.size === 0) { setFile(null); bump(); setError({ text: refuseUnread(FORM, userId, { name: f.name, size: f.size }).error }); return; }
    setBusy("reading");
    try {
      setFile({ name: f.name, size: f.size, bytes: new Uint8Array(await f.arrayBuffer()) });
    } catch {
      setError({ text: "The file couldn't be read. Try again, or save it again and upload the copy." });
    } finally { setBusy(""); }
  };
  const onDrop = (e) => {
    e.preventDefault(); setOver(false);
    if (busy) return;
    const list = e.dataTransfer?.files ?? [];
    if (list.length > 1) { setError({ text: "Drop one file at a time." }); return; }
    choose(list[0]);
  };
  const runCheck = async () => {
    setBusy("checking"); setError(null);
    const r = await checkImport(FORM, { bytes: file.bytes, name: file.name }, userId);
    setBusy(""); bump();
    if (!r.ok) { setError({ text: r.error, code: r.code, problems: r.problems }); return; }
    setCheck(r); setStep("check");
  };
  const runImport = async () => {
    setBusy("importing"); setError(null);
    const r = await applyImport(FORM, { bytes: file.bytes, name: file.name }, userId, check.token);
    setBusy(""); bump();
    if (!r.ok) { setError({ text: r.error, code: r.code }); return; }
    setResult(r); setStep("done");
  };
  const restart = () => { setFile(null); setCheck(null); setResult(null); setError(null); setStep("upload"); if (input.current) input.current.value = ""; };
  const report = (problems) => downloadFile({ name: errorFileName(), mime: "text/csv;charset=utf-8", text: errorReport(problems) });

  const steps = STEPS.map(([key, t, detail], i) => ({ title: t, detail, state: i < at || step === "done" ? "done" : i === at ? "current" : "" }));   // at Done, every step is done
  const heading = (text) => <h2 className="ix-step-title" id="step-title" tabIndex={-1} ref={title}>{text}</h2>;
  const alert = error && (
    <div className="ds-note ds-note--danger" role="alert" id="import-error">
      <p className="ix-alert-text">{error.text}</p>
      {error.problems?.length > 1 && <ul className="ix-alert-list">{error.problems.slice(1).map((p, i) => <li key={i}>{p.message}</li>)}</ul>}
    </div>
  );
  const s = check?.summary;
  const ready = check ? check.rows.filter((r) => r.status === "ready").length : 0;
  const problemCols = [
    { key: "row", label: "Row", num: true, render: (p) => String(p.row) },
    { key: "column", label: "Column", render: (p) => p.column ?? "—" },
    { key: "message", label: "Problem", render: (p) => p.message },
  ];
  const previewCols = [
    { key: "row", label: "Row", num: true, render: (r) => String(r.row) },
    { key: "name", label: "Full name", render: (r) => r.raw?.name || "—" },
    { key: "email", label: "Work email", render: (r) => <span className="ix-cell">{r.raw?.email || "—"}</span> },
    { key: "designation", label: "Designation", render: (r) => r.raw?.designation || "—" },
    { key: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
  ];
  const madeCols = [
    { key: "row", label: "Row", num: true, render: (c) => String(c.row) },
    { key: "name", label: "Employee", render: (c) => <span className="ix-cell"><Link className="ix-link" to={`${pageUrl("users/user-profile.html")}?id=${encodeURIComponent(c.id)}`}>{c.name}</Link><span className="ix-sub">{c.id}</span></span> },
    { key: "request", label: "Sign-in request", render: (c) => <Link className="ix-link" to={`${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(c.requestId)}`}>{c.requestId}</Link> },
  ];
  const PER = 10;
  const shownProblems = check ? check.problems.slice((page - 1) * PER, page * PER) : [];

  return (
    <>
      <PageHeader title="Import employees" subtitle="Add new employees from a CSV or Excel file. Nobody already on record is changed."
        actions={canHistory ? <Link className="ds-btn" to={pageUrl(IMPORT_HISTORY)}>Import history</Link> : null} />
      <div className="ds-stack">
        <div className="ix-steps" aria-label="Steps"><Stepper steps={steps} vertical={false} id="import-steps" /></div>
        <p className="visually-hidden" aria-live="polite" id="import-status">{busy === "checking" ? "Checking the file." : busy === "importing" ? "Importing." : step === "check" && s ? summaryText(s, FORM) : step === "done" && result ? `${result.created.length} imported.` : ""}</p>

        {step === "upload" && (
          <Card id="upload-card">
            <div className="ds-stack">
              {heading("Step 1 of 4: Upload")}
              <div className="ix-template" id="template">
                <h3 className="ix-h3">Start from the template</h3>
                <p className="ix-lead">It has the columns below, one example row marked EXAMPLE and notes listing the departments, designations, offices and shifts you can use. Those rows are never imported.</p>
                <details className="ix-details" open={!phone}>
                  <summary>The {cols.length} columns</summary>
                  <ul className="ix-columns" id="template-columns">
                    {cols.map((c) => <li key={c.key}>{c.header}{c.required ? " (required)" : ""}{c.help ? <small>: {c.help}</small> : null}</li>)}
                  </ul>
                </details>
                <div className="ix-row">
                  <button type="button" className="ds-btn" id="template-csv" onClick={() => template("csv")}><Icon d={ICON.download} />CSV template</button>
                  <button type="button" className="ds-btn" id="template-xlsx" onClick={() => template("xlsx")}><Icon d={ICON.download} />Excel template</button>
                </div>
              </div>
              <label className={`ix-drop${over ? " is-over" : ""}`} htmlFor="import-file" id="drop-zone" aria-disabled={busy ? "true" : undefined}
                onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
                <Icon d={UPLOAD} />
                <span className="ix-drop__main">Drag your file here, or <span className="ix-drop__pick">choose a file</span></span>
                <span className="ix-drop__hint">CSV (saved as "CSV UTF-8") or Excel .xlsx; at most 2 MB and {IMPORT_LIMITS.rows.toLocaleString("en-IN")} rows</span>
                <input ref={input} className="ix-input" type="file" id="import-file" accept={ACCEPT} disabled={Boolean(busy)} onChange={(e) => choose(e.target.files?.[0])} />
              </label>
              {file && (
                <div className="ix-file" id="chosen-file">
                  <span className="ix-file__name">{file.name}</span><span className="ix-file__size">{sizeText(file.size)}</span>
                  <button type="button" className="ds-btn ds-btn--sm ds-btn--ghost" onClick={restart}>Remove</button>
                </div>
              )}
              {alert}
              <div className="ix-actions">
                <button type="button" className="ds-btn ds-btn--primary" id="check-file" disabled={!file || Boolean(busy)} aria-busy={busy === "checking" ? "true" : undefined} onClick={runCheck}>
                  {busy === "checking" ? "Checking…" : busy === "reading" ? "Reading…" : "Check the file"}
                </button>
              </div>
            </div>
          </Card>
        )}

        {step === "check" && check && (
          <>
            <Card id="check-card">
              <div className="ds-stack">
                {heading("Step 2 of 4: Check")}
                <p className="ix-lead" id="check-summary"><strong>{summaryText(s, FORM)}.</strong> {file.name}, {s.read} {s.read === 1 ? "row" : "rows"} read{s.templateRows ? ` (the template's own ${s.templateRows} ${s.templateRows === 1 ? "row was" : "rows were"} left out)` : ""}. Nothing has been saved yet.</p>
                <div className="ds-grid ix-kpis" role="group" aria-label="What the file holds">
                  <KpiCard id="kpi-read" label="Rows read" value={String(s.read)} icon={ICON.table} />
                  <KpiCard id="kpi-ready" label="Will be imported" value={String(s.ready)} icon={ICON.users} />
                  <KpiCard id="kpi-errors" label="Have errors" value={String(s.errors)} icon={ICON.pulse} />
                  <KpiCard id="kpi-dups" label="Duplicates" value={String(s.duplicates)} icon={ICON.layers} />
                </div>
              </div>
            </Card>
            <Card id="preview-card" title="The first rows" meta={countText(Math.min(5, check.rows.length), check.rows.length, "row")}>
              <Table bare tableClass="table table--tight" columns={previewCols} rows={check.rows.slice(0, 5)} rowKey={(r) => r.row} tableId="preview-table" />
            </Card>
            <Card id="problems-card" title="Problems" footer={check.problems.length ? <span className="ix-sub" id="row-numbers">Row numbers are the spreadsheet's: the header is row 1.</span> : null} meta={check.problems.length ? countText(shownProblems.length, check.problems.length, "problem", { range: `${(page - 1) * PER + 1}–${(page - 1) * PER + shownProblems.length}` }) : "None"}
              actions={check.problems.length ? <button type="button" className="ds-btn ds-btn--sm" id="error-report" onClick={() => report(check.problems)}><Icon d={ICON.download} />Download error report</button> : null}>
              {check.problems.length === 0 ? <p className="ix-lead" id="no-problems">No problems: every row is ready.</p>
                : <Table bare tableClass="table table--tight" columns={problemCols} rows={check.problems} rowKey={(p) => `${p.row}-${p.column}-${p.message}`} page={page} onPageChange={setPage} tableId="problems-table" />}
            </Card>
            <Card id="check-actions">
              <div className="ds-stack">
                {ready === 0 && <p className="ds-note ds-note--warning" role="status" id="none-ready">No row is ready to import. Fix the problems in your file (the error report lists them) and upload it again.</p>}
                {alert}
                <div className="ix-actions">
                  <button type="button" className="ds-btn ix-grow" id="upload-another" onClick={restart}>Upload another file</button>
                  <button type="button" className="ds-btn ds-btn--primary" id="to-confirm" disabled={ready === 0} onClick={() => { setError(null); setStep("confirm"); }}>Continue</button>
                </div>
              </div>
            </Card>
          </>
        )}

        {step === "confirm" && check && (
          <Card id="confirm-card">
            <div className="ds-stack">
              {heading("Step 3 of 4: Confirm")}
              <ul className="ix-confirm" id="confirm-list">
                <li><strong>{ready} new {ready === 1 ? "employee" : "employees"} will be added</strong>, as active, from {file.name}.</li>
                {s.read - ready > 0 && <li>{s.read - ready} {s.read - ready === 1 ? "row has" : "rows have"} problems and will be skipped. Nothing on record is changed.</li>}
                <li><strong>New sign-in requests will be sent to IT</strong>, one for each person. Nobody gets a sign-in from the import: IT prepares each one and an Admin approves it.</li>
                <li>The file is checked again when you import: anything that changed since (an email taken meanwhile) is skipped too.</li>
                <li>All of it is saved together, or none of it. The import is recorded in the history and the audit trail.</li>
              </ul>
              <p className="ix-lead">This check is valid for {TOKEN_MINUTES} minutes.</p>
              {alert}
              <div className="ix-actions">
                <button type="button" className="ds-btn ix-grow" id="back-to-check" disabled={Boolean(busy)} onClick={() => { setError(null); setStep("check"); }}>Back</button>
                {error?.code === "token" ? <button type="button" className="ds-btn ds-btn--primary" id="check-again" disabled={Boolean(busy)} onClick={runCheck}>Check the file again</button>
                  : <button type="button" className="ds-btn ds-btn--primary" id="do-import" disabled={Boolean(busy) || error?.code === "already-imported"} aria-busy={busy === "importing" ? "true" : undefined} onClick={runImport}>
                    {busy === "importing" ? "Importing…" : `Import ${ready} ${ready === 1 ? "employee" : "employees"}`}
                  </button>}
              </div>
            </div>
          </Card>
        )}

        {step === "done" && result && (
          <>
            <Card id="done-card">
              <div className="ds-stack">
                {heading("Step 4 of 4: Done")}
                <p className="ds-note ds-note--success" role="status" id="done-summary">{result.created.length} {result.created.length === 1 ? "employee was" : "employees were"} added{result.skipped.length ? `; ${result.skipped.length} ${result.skipped.length === 1 ? "row was" : "rows were"} skipped` : ""}. {result.created.length === 1 ? "A sign-in request is" : `${result.created.length} sign-in requests are`} with IT.</p>
                <div className="ix-actions">
                  {result.skipped.length > 0 && <button type="button" className="ds-btn ix-grow" id="done-report" onClick={() => report(check.problems)}><Icon d={ICON.download} />Download the skipped rows' errors</button>}
                  <button type="button" className="ds-btn" id="import-another" onClick={restart}>Import another file</button>
                  <Link className="ds-btn ds-btn--primary" to={pageUrl("users/users-list.html")}>Go to Users</Link>
                </div>
              </div>
            </Card>
            <Card id="made-card" title="Added" meta={countText(result.created.length, result.created.length, ["employee", "employees"])}>
              <Table bare tableClass="table table--tight" columns={madeCols} rows={result.created} rowKey={(c) => c.id} tableId="made-table" />
            </Card>
          </>
        )}
      </div>
    </>
  );
}

export default function ImportEmployees() {
  const allowed = useCan("import:employees");
  return <OwnPage page={IMPORT_EMPLOYEES} title="Import employees" allowed={allowed}><Content /></OwnPage>;
}