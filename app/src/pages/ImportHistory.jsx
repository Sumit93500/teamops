// Import history (I1): every import and export, newest first: who, when, which form or module, the file, what came of it (imported,
// checked and left, refused, failed and rolled back; downloaded), with filters (what, result, the shared date range, a search) and a details
// dialog per entry (the file's size and sha256, the counts, the problems as row, column and reason, links to the people made and their IT
// requests). It never holds a file's contents. For import:history-view (HR, Admin). Data: data/import-history.js historyFor.
import { useState } from "react";
import { Link } from "react-router-dom";
import { historyFor } from "../../../assets/js/data/import-history.js";
import { getUser } from "../../../assets/js/data/store.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import Modal from "../components/Modal.jsx";
import Table from "../components/Table.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { pageUrl, IMPORT_HISTORY, IMPORT_EMPLOYEES, IT_REQUEST } from "../routes.js";
import { stamp, sizeText, whatOf, STATUS } from "../ui/impex.jsx";
import { todayIso } from "../../../assets/js/ui/leave-view.js";

const NONE = { preset: "", from: "", to: "" };
const officeDay = (iso) => new Date(Date.parse(iso) + 330 * 60000).toISOString().slice(0, 10);
// I2: the files that can carry Aadhaar, bank account or PAN numbers (the others have none to mask)
const SENSITIVE_FILES = ["employees", "employees-pay", "payroll"];
const nameOf = (id) => getUser(id)?.name ?? id ?? "";

function StatusPill({ status }) {
  const [words, tone] = STATUS[status] ?? [status, ""];
  return <Pill tone={tone} data-ix-status={status}>{words}</Pill>;
}
// the numbers of an entry, in words
function outcome(e) {
  if (e.kind === "export") return e.status === "exported" ? `${e.rows} ${e.rows === 1 ? "row" : "rows"}, ${String(e.format ?? "csv").toUpperCase()}${e.sensitive ? ", full sensitive values" : ""}` : e.reason ?? "";
  if (e.status === "imported") return `${e.imported} imported, ${e.skipped} skipped`;
  if (e.status === "checked") return `${e.rowsRead} read: ${e.ready} ready, ${e.errors} with errors, ${e.duplicates} duplicates`;
  return e.reason ?? "";
}

function Details({ entry, onClose }) {
  if (!entry) return null;
  const e = entry;
  const rows = [["What", whatOf(e)], ["When", stamp(e.at)], ["By", nameOf(e.actorId)], ["Result", <StatusPill key="s" status={e.status} />]];
  if (e.fileName) rows.push(["File", e.fileName]);
  if (e.size != null) rows.push(["Size", sizeText(e.size)]);
  if (e.sha256) rows.push(["SHA-256", <span key="h" className="ix-hash">{e.sha256}</span>]);
  if (e.kind === "export") rows.push(["Rows", String(e.rows ?? 0)], ["Filters", e.filters || "None"], ...(SENSITIVE_FILES.includes(e.module) ? [["Sensitive values", e.sensitive ? "In full" : "Masked"]] : []), ["Format", String(e.format ?? "csv").toUpperCase()]);
  else if (e.rowsRead != null) rows.push(["Rows read", String(e.rowsRead)]);
  if (e.status === "imported") rows.push(["Imported", String(e.imported)], ["Skipped", String(e.skipped)]);
  if (e.reason) rows.push(["Why", e.reason]);
  const problemCols = [
    { key: "row", label: "Row", num: true, render: (p) => String(p.row) },
    { key: "column", label: "Column", render: (p) => p.column ?? "—" },
    { key: "reason", label: "Problem", render: (p) => p.reason },
  ];
  return (
    <Modal open onClose={onClose} title={`${whatOf(e)}, ${stamp(e.at)}`} size="lg" id="entry-dialog" guard={false}
      footer={<button type="button" className="ds-btn" onClick={onClose}>Close</button>}>
      <div className="ds-stack">
        <dl className="ix-dl" id="entry-facts">{rows.map(([k, v]) => <div key={k} className="ix-dl__row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {e.created?.length > 0 && (e.form ?? "employees") === "employees" && (   // I2: the other forms' records are counted above, not listed
          <section aria-labelledby="entry-people">
            <h3 className="ix-h3" id="entry-people">People added ({e.created.length})</h3>
            <ul className="ix-links" id="entry-created">{e.created.map((id) => <li key={id}><Link className="ix-link" to={`${pageUrl("users/user-profile.html")}?id=${encodeURIComponent(id)}`}>{nameOf(id)} ({id})</Link></li>)}</ul>
          </section>
        )}
        {e.requests?.length > 0 && (
          <section aria-labelledby="entry-requests">
            <h3 className="ix-h3" id="entry-requests">Sign-in requests to IT ({e.requests.length})</h3>
            <ul className="ix-links" id="entry-request-links">{e.requests.map((id) => <li key={id}><Link className="ix-link" to={`${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(id)}`}>{id}</Link></li>)}</ul>
          </section>
        )}
        {e.problems?.length > 0 && (
          <section aria-labelledby="entry-problems">
            <h3 className="ix-h3" id="entry-problems">Problems ({e.problems.length + (e.problemsCut ?? 0)}){e.problemsCut ? `: the first ${e.problems.length} are kept` : ""}</h3>
            <Table bare tableClass="table table--tight" columns={problemCols} rows={e.problems} rowKey={(p) => `${p.row}-${p.column}-${p.reason}`} tableId="entry-problems-table" />
          </section>
        )}
        <p className="ix-lead">The history keeps the file's name, size and fingerprint (SHA-256), never what was in it.</p>
      </div>
    </Modal>
  );
}

function Content() {
  const { userId } = useSession();
  const canImport = useCan("import:employees");
  const [f, setF] = useState({ kind: "", status: "" });
  const [range, setRange] = useState(NONE);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [page, setPage] = useState(1);
  const all = useData(() => historyFor(userId), [userId]);
  const set = (k) => (v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };
  const query = q.trim().toLowerCase();
  const rows = all.filter((e) => (!f.kind || e.kind === f.kind) && (!f.status || e.status === f.status)
    && (!range.preset || (officeDay(e.at) >= range.from && officeDay(e.at) <= range.to))
    && (!query || [e.fileName, nameOf(e.actorId), whatOf(e), e.id].join(" ").toLowerCase().includes(query)));
  const active = Boolean(f.kind || f.status || range.preset || query);
  const statuses = [...new Set(all.map((e) => e.status))].map((s) => ({ value: s, label: STATUS[s]?.[0] ?? s }));
  const columns = [
    { key: "at", label: "When", className: "ix-when", render: (e) => <span className="ix-cell">{stamp(e.at)}<span className="ix-sub">{e.id}</span></span> },
    { key: "what", label: "What", className: "ix-what", render: (e) => <span className="ix-cell">{whatOf(e)}<span className="ix-sub">by {nameOf(e.actorId)}</span></span> },
    { key: "file", label: "File", className: "ix-file", render: (e) => <span className="ix-cell">{e.fileName || "—"}{e.size != null && <span className="ix-sub">{sizeText(e.size)}</span>}</span> },
    { key: "status", label: "Status", className: "ix-status", render: (e) => <StatusPill status={e.status} /> },
    { key: "outcome", label: "Outcome", render: (e) => <span className="ix-cell">{outcome(e)}</span> },
    { key: "actions", label: "Actions", actions: true, render: (e) => <button type="button" className="ds-btn ds-btn--sm" data-entry={e.id} onClick={() => setOpen(e)} aria-label={`View ${e.id}`}>View</button> },
  ];
  return (
    <>
      <PageHeader title="Import history" subtitle="Every import and export: who, when, which file, and what came of it"
        actions={canImport ? <Link className="ds-btn ds-btn--primary" to={pageUrl(IMPORT_EMPLOYEES)}>Import employees</Link> : null} />
      <Card id="history-card" title="Imports and exports" meta={<span id="history-count">{countText(rows.length, all.length, ["entry", "entries"], { filtered: active })}</span>}>
        <div className="ds-stack">
          {all.length > 0 && <div className="as-filters"><FilterBar label="Filter the history" active={active} onClearAll={() => { setF({ kind: "", status: "" }); setRange(NONE); setQ(""); setPage(1); }}>
            <FilterSelect label="What" value={f.kind} onChange={set("kind")} allLabel="Imports and exports" options={[{ value: "import", label: "Imports" }, { value: "export", label: "Exports" }]} />
            <FilterSelect label="Result" value={f.status} onChange={set("status")} allLabel="Any result" options={statuses} />
            <DateRange value={range} onChange={(r) => { setRange(r); setPage(1); }} today={todayIso()} label="Happened in" />
            <FilterSearch label="Search" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="File, person or entry" />
          </FilterBar></div>}
          {all.length === 0 ? <EmptyState title="No imports or exports yet." text="Each import and export is recorded here, with who did it and what came of it." to={canImport ? pageUrl(IMPORT_EMPLOYEES) : undefined} linkText={canImport ? "Import employees" : undefined} />
            : rows.length === 0 ? <p className="text-muted" id="history-empty">{range.preset ? NO_DATA : "No entries match these filters."}</p>
              : <Table bare tableClass="table table--tight" columns={columns} rows={rows} rowKey={(e) => e.id} page={page} onPageChange={setPage} tableId="history-table" />}
        </div>
      </Card>
      <Details entry={open} onClose={() => setOpen(null)} />
    </>
  );
}

export default function ImportHistory() {
  const allowed = useCan("import:history-view");
  return <OwnPage page={IMPORT_HISTORY} title="Import history" allowed={allowed}><Content /></OwnPage>;
}