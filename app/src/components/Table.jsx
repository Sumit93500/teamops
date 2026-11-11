// Table: the old pages' card table in one component: a toolbar (title, the search filter, extra controls, Export),
// the table (sortable headings as the old sort buttons: th.is-sortable[aria-sort] > button.sort-btn with ▲/▼), the phone
// cards (ui/phone.jsx: labels, parts, Details), and the pager (10 a page by default).
//   columns: [{ key, label, num?, actions?, sort?: (row) => value, render?: (row) => node, csv?: (row) => value }]
//   rows: the data; rowKey(row); filter: the search box's placeholder (searches each row's text, as ui/table-filter.js);
//   exportName: the file name (csv-export.js downloadCsv); empty: what an empty table says (a row spanning the table).
import { useMemo, useState } from "react";
import Pagination from "../ui/Pagination.jsx";
import { usePhone, cardColumns, MoreButton } from "../ui/phone.jsx";
import { downloadCsv } from "../../../assets/js/ui/csv-export.js";

const text = (v) => (v == null ? "" : String(v));

function Row({ row, columns, cols }) {
  const [open, setOpen] = useState(false);
  return (
    <tr {...cols.row()} className={open && cols.moreAt >= 0 ? "is-open" : undefined}>
      {columns.map((c, i) => (
        <td key={c.key} className={c.num ? "table__num" : c.actions ? "table__actions" : undefined} {...cols.cell(i)}>
          {c.render ? c.render(row) : text(row[c.key])}
          {i === cols.moreAt && <MoreButton open={open} onToggle={() => setOpen(!open)} />}
        </td>
      ))}
    </tr>
  );
}

export default function Table({ title, columns, rows, rowKey = (r) => r.id, filter, exportName, pageSize = 10, empty = "Nothing to show.", tools, initialSort = null }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort);   // { key, dir: "ascending" | "descending" }
  const [page, setPage] = useState(1);
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
  const current = Math.min(page, pages);
  const visible = shown.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) => { setSort((s) => ({ key, dir: s?.key === key && s.dir === "ascending" ? "descending" : "ascending" })); setPage(1); };
  const exportCsv = () => downloadCsv([columns.filter((c) => !c.actions).map((c) => c.label),
    ...shown.map((r) => columns.filter((c) => !c.actions).map((c) => (c.csv ? c.csv(r) : c.sort ? c.sort(r) : r[c.key])))], exportName,
    columns.filter((c) => !c.actions).map((c) => Boolean(c.num)));

  return (
    <section className="card">
      <div className="table__toolbar">
        {title && <h3 className="card__title">{title}</h3>}
        {filter && <input className="input input--search" type="search" placeholder={filter} aria-label={filter} value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }} />}
        {tools}
        {exportName && <button className="btn btn--sm" type="button" onClick={exportCsv}>Export</button>}
      </div>
      <div className="table-wrap">
        <table className="table" {...cols.table}>
          <thead>
            <tr>
              {columns.map((c) => {
                const sorted = sort?.key === c.key ? sort.dir : undefined;
                const cls = [c.num && "table__num", c.actions && "table__actions", c.sort && "is-sortable"].filter(Boolean).join(" ") || undefined;
                return (
                  <th key={c.key} className={cls} aria-sort={c.sort ? sorted ?? "none" : undefined} {...cols.th()}>
                    {c.sort ? (
                      <button className="sort-btn" type="button" onClick={() => toggleSort(c.key)}>
                        {phone && <span className="table__sort-label" aria-hidden="true">Sort by</span>}
                        {c.label} {sorted && <span aria-hidden="true">{sorted === "ascending" ? "▲" : "▼"}</span>}
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length
              ? visible.map((r) => <Row key={rowKey(r)} row={r} columns={columns} cols={cols} />)
              : <tr><td className="text-muted" colSpan={columns.length}>{query ? "No matches." : empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination totalItems={shown.length} pageSize={pageSize} currentPage={current} onPageChange={setPage} />
    </section>
  );
}
