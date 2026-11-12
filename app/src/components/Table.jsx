// Table: the old pages' card table in one component: a toolbar (title, the search filter, extra controls, Export),
// the table (sortable headings as the old sort buttons: th.is-sortable[aria-sort] > button.sort-btn with ▲/▼, and on a
// phone "Sort by" before the button, as ui/phone.js), the phone cards (ui/phone.jsx: labels, parts, Details), and the pager
// (10 a page by default).
//   columns: [{ key, label, num?, actions?, className?, hidden?, cellProps?: (row) => attributes (data-csv: the old exporter's
//   value), sort?: (row) => value, render?: (row) => node, csv?: (row) => value }]
//   rows: the data; rowKey(row); filter: the search box's placeholder (searches each row's text, as ui/table-filter.js);
//   exportName: the file name (csv-export.js downloadCsv); empty: what an empty table says (a row spanning the table).
// The old pages' own layout (round 10): bare draws only the table and its pager, for a page that draws the card, its
// header and toolbar itself; page + onPageChange make the pager the page's own (an old page went back to page 1 on a
// new tab or search); rowProps(row) gives a row its attributes. oldExport: the table carries data-export-name and the
// page's [data-export] button exports it with the old exporter (csv-export.js initExports): its csvRows get the whole
// filtered list drawn by these same rows into a detached tbody, so the file is what the old page wrote, byte for byte.
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Pagination from "../ui/Pagination.jsx";
import { usePhone, cardColumns, MoreButton } from "../ui/phone.jsx";
import { downloadCsv, csvRows } from "../../../assets/js/ui/csv-export.js";

const text = (v) => (v == null ? "" : String(v));
const tdClass = (c) => [c.num && "table__num", c.actions && "table__actions", c.className].filter(Boolean).join(" ") || undefined;

function Row({ row, columns, cols, rowProps }) {
  const [open, setOpen] = useState(false);
  const extra = rowProps ? rowProps(row) : {};
  return (
    <tr {...cols.row()} {...extra} className={[extra.className, open && cols.moreAt >= 0 && "is-open"].filter(Boolean).join(" ") || undefined}>
      {columns.map((c, i) => (
        <td key={c.key} className={tdClass(c)} hidden={c.hidden || undefined} {...cols.cell(i)} {...(c.cellProps ? c.cellProps(row) : {})}>
          {c.render ? c.render(row) : text(row[c.key])}
          {i === cols.moreAt && <MoreButton open={open} onToggle={() => setOpen(!open)} />}
        </td>
      ))}
    </tr>
  );
}

// The rows as table rows (DOM nodes) for the old exporter: drawn by Row into a tbody of their own, read, then let go.
function detachedRows(list, columns, rowKey, rowProps) {
  const tbody = document.createElement("tbody");
  const root = createRoot(tbody);
  const flat = cardColumns(columns.map((c) => c.label), false);
  flushSync(() => root.render(list.map((r) => <Row key={rowKey(r)} row={r} columns={columns} cols={flat} rowProps={rowProps} />)));
  const out = [...tbody.children];
  setTimeout(() => root.unmount());
  return out;
}

export default function Table({ title, columns, rows, rowKey = (r) => r.id, filter, exportName, pageSize = 10, empty = "Nothing to show.", tools, initialSort = null,
  bare = false, page: pageProp, onPageChange, rowProps, oldExport = false, pager = true, extraRows = null, tbodyId, tableClass = "table" }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort);   // { key, dir: "ascending" | "descending" }
  const [ownPage, setOwnPage] = useState(1);
  const page = pageProp ?? ownPage, setPage = onPageChange ?? setOwnPage;
  const phone = usePhone();
  const cols = cardColumns(columns.map((c) => c.label), phone);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const textOf = (r) => columns.map((c) => text(c.csv ? c.csv(r) : c.sort ? c.sort(r) : r[c.key])).join(" ").toLowerCase();
    let list = q ? rows.filter((r) => textOf(r).includes(q)) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      list = [...list].sort((a, b) => {
        const x = col.sort(a), y = col.sort(b);
        const d = typeof x === "number" && typeof y === "number" ? x - y : text(x).localeCompare(text(y), "en", { numeric: true });
        return sort.dir === "ascending" ? d : -d;
      });
    }
    return list;
  }, [rows, columns, query, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const visible = pager ? shown.slice((current - 1) * pageSize, current * pageSize) : shown;

  const tableRef = useRef(null);
  const latest = useRef(null);
  latest.current = () => detachedRows(shown, columns, rowKey, rowProps);
  useEffect(() => { if (oldExport && exportName && tableRef.current) csvRows(exportName, () => latest.current()); }, [oldExport, exportName]);

  const toggleSort = (key) => { setSort((s) => ({ key, dir: s?.key === key && s.dir === "ascending" ? "descending" : "ascending" })); setPage(1); };
  const exportCsv = () => downloadCsv([columns.filter((c) => !c.actions).map((c) => c.label),
    ...shown.map((r) => columns.filter((c) => !c.actions).map((c) => (c.csv ? c.csv(r) : c.sort ? c.sort(r) : r[c.key])))], exportName,
    columns.filter((c) => !c.actions).map((c) => Boolean(c.num)));

  const body = (
    <>
      <div className="table-wrap">
        <table className={tableClass} ref={tableRef} data-export-name={oldExport ? exportName : undefined} {...cols.table}>
          <thead>
            <tr>
              {columns.map((c) => {
                const sorted = sort?.key === c.key ? sort.dir : undefined;
                const cls = [tdClass(c), c.sort && "is-sortable"].filter(Boolean).join(" ") || undefined;
                return (
                  <th key={c.key} className={cls} hidden={c.hidden || undefined} aria-sort={c.sort ? sorted ?? "none" : undefined} {...cols.th()}>
                    {c.sort && phone && <span className="table__sort-label" aria-hidden="true">Sort by</span>}
                    {c.sort ? (
                      <button className="sort-btn" type="button" onClick={() => toggleSort(c.key)}>
                        {c.label} {sorted && <span aria-hidden="true">{sorted === "ascending" ? "▲" : "▼"}</span>}
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody id={tbodyId}>
            {visible.length
              ? visible.map((r) => <Row key={rowKey(r)} row={r} columns={columns} cols={cols} rowProps={rowProps} />)
              : <tr><td className="text-muted" colSpan={columns.length}>{query ? "No matches." : empty}</td></tr>}
            {extraRows}
          </tbody>
        </table>
      </div>
      {pager && <Pagination totalItems={shown.length} pageSize={pageSize} currentPage={current} onPageChange={setPage} />}
    </>
  );
  if (bare) return body;
  return (
    <section className="card">
      <div className="table__toolbar">
        {title && <h3 className="card__title">{title}</h3>}
        {filter && <input className="input input--search" type="search" placeholder={filter} aria-label={filter} value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }} />}
        {tools}
        {exportName && !oldExport && <button className="btn btn--sm" type="button" onClick={exportCsv}>Export</button>}
      </div>
      {body}
    </section>
  );
}
