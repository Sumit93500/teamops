// ui/csv-export.js
// Downloads a CSV of a table's visible rows, or of a list of dashboard stats.
// Built in the browser (Blob + temporary download link), so no backend needed.
// The escaping, formula guard and UTF-8 BOM match users-list.js.
//
// Pages wire it up in HTML, no page script needed:
//   <button data-export>Export</button>                 the button
//   <table data-export-name="vendors">                  each table to export (one file each)
//   <button data-export data-export-stats="name">       also export the page's .stat cards

// Parts of a cell that aren't data: initials avatars, icons, and anything hidden
// (e.g. a button hidden by applyPermissions()).
const SKIP = ".avatar, svg, [hidden], [aria-hidden='true']";

// Quotes a value for CSV. Values starting with = + - @ are prefixed with ' so a
// spreadsheet shows them as text instead of running them as formulas.
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  // The BOM tells Excel the file is UTF-8, so ₹ and accented names show correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${todayStamp()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// The visible text of a cell. Each separate piece of text is joined with a
// space, so a name and its sub-line ("Vikram Singh" + "Operations") or an old
// and new value ("10:24" + "09:30") don't run together.
function cellText(cell) {
  const parts = [];
  const walker = cell.ownerDocument.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest(SKIP)) continue;
    const text = node.textContent.replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

const isHidden = (row) => row.hidden || row.style.display === "none";

// A header cell holding only a checkbox (or nothing) isn't a column of data,
// and neither is an Actions column of buttons.
const isDataColumn = (th) =>
  cellText(th) !== "" && !th.classList.contains("table__actions") && cellText(th) !== "Actions";

// Exports the table's visible rows (whatever search or filters currently show).
// Returns the number of data rows written.
export function exportTableAsCsv(table, filename) {
  const headerRows = table.querySelectorAll("thead tr");
  const header = headerRows[headerRows.length - 1];
  if (!header) return 0;
  const headCells = Array.from(header.children);
  const keep = headCells.map((th, i) => (isDataColumn(th) ? i : -1)).filter((i) => i !== -1);

  const rows = Array.from(table.querySelectorAll("tbody tr"))
    .filter((row) => !isHidden(row) && row.children.length === headCells.length)   // skips "no results" rows that span the table
    .map((row) => keep.map((i) => cellText(row.children[i])));

  downloadCsv([keep.map((i) => cellText(headCells[i])), ...rows], filename);
  return rows.length;
}

// Exports [label, value] pairs, e.g. a dashboard's stat cards, as Metric,Value.
export function exportStatsAsCsv(stats, filename) {
  downloadCsv([["Metric", "Value"], ...stats.map(([label, value]) => [label, value])], filename);
  return stats.length;
}

// Reads the page's stat cards as [label, value] pairs.
function readStats(scope) {
  return Array.from(scope.querySelectorAll(".stat")).map((stat) => [
    cellText(stat.querySelector(".stat__label") ?? stat),
    cellText(stat.querySelector(".stat__value") ?? stat),
  ]);
}

// Wires every [data-export] button: one file per table[data-export-name] on the
// page and, if the button has data-export-stats, one more for the stat cards.
export function initExports(root = document) {
  root.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.closest("main") ?? document;
      scope.querySelectorAll("table[data-export-name]").forEach((table) => {
        exportTableAsCsv(table, table.dataset.exportName);
      });
      if (button.dataset.exportStats) exportStatsAsCsv(readStats(scope), button.dataset.exportStats);
    });
  });
}