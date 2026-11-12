// The phone card table, as ui/phone.js marks a table up at 560px and under, so layout/phone.css draws its
// rows as cards: data-cards and the ARIA roles on the table, each cell's data-label and data-card-part, and a
// Details toggle in the last key cell when some cells wait under it. Round 4's Table takes this over; until
// then a page passes its column headings to cardColumns(). Above 560px nothing is added, as before.
import { useSyncExternalStore } from "react";

const PHONE = "(max-width: 560px)";
const SMALLEST_CARD_TABLE = 4;   // a table of 3 columns or fewer fits as a table
const KEY_CELLS = 2;
const STATUS = /^(status|stage|result)\b/i;
const FIRST_KEYS = /^(net pay|amount|dates?|in stock|assigned to|check-in|designation|department)\b/i;

const subscribe = (cb) => { const m = window.matchMedia(PHONE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
export const usePhone = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches);

// phone.js cellKinds(), on heading texts ("" or "Actions" is the actions column).
function cellKinds(heads) {
  const kinds = heads.map((h) => (h === "Actions" || h === "" ? "actions" : ""));
  const primary = kinds.indexOf(""); if (primary >= 0) kinds[primary] = "primary";
  const status = heads.findIndex((h, i) => !kinds[i] && STATUS.test(h)); if (status >= 0) kinds[status] = "status";
  const left = heads.map((_, i) => i).filter((i) => !kinds[i]);
  const keys = [...left.filter((i) => FIRST_KEYS.test(heads[i])), ...left.filter((i) => !FIRST_KEYS.test(heads[i]))].slice(0, KEY_CELLS);
  left.forEach((i) => { kinds[i] = keys.includes(i) ? "key" : "rest"; });
  return kinds;
}

// Props for the table, its headings, rows and cells; all empty when not on a phone (or a narrow table).
export function cardColumns(heads, phone) {
  if (!phone || heads.length < SMALLEST_CARD_TABLE) return { table: {}, th: () => ({}), row: () => ({}), cell: () => ({}), moreAt: -1 };
  const kinds = cellKinds(heads);
  const moreAt = kinds.includes("rest") ? kinds.lastIndexOf("key") : -1;
  return {
    table: { "data-cards": "", role: "table" },
    th: () => ({ role: "columnheader" }),
    row: () => ({ role: "row" }),
    cell: (i) => ({ "data-label": heads[i], "data-card-part": kinds[i], role: "cell" }),
    moreAt,
  };
}

// The same marks on a table whose rows are DOM nodes (ui/Nodes.jsx), as ui/phone.js labelTable() puts them (round 6): on a
// phone, data-cards and the roles, each cell's label and part, Details in the last key cell; off a phone, all taken away.
export function labelTable(table, phone) {
  if (!table) return;
  const heads = [...(table.querySelectorAll("thead tr")[table.querySelectorAll("thead tr").length - 1]?.children ?? [])];
  const rows = [...table.querySelectorAll("tbody tr")];
  if (!phone || heads.length < SMALLEST_CARD_TABLE) {
    table.removeAttribute("data-cards"); if (table.getAttribute("role") === "table") table.removeAttribute("role");
    heads.forEach((th) => th.removeAttribute("role"));
    rows.forEach((row) => { row.removeAttribute("role"); row.classList.remove("is-open"); row.querySelector(".table__more")?.remove();
      [...row.children].forEach((td) => { delete td.dataset.label; delete td.dataset.cardPart; td.removeAttribute("role"); }); });
    return;
  }
  const texts = heads.map((th) => (th.textContent.slice((th.querySelector(".table__sort-label")?.textContent ?? "").length)).replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim());
  const kinds = cellKinds(texts.map((t, i) => (heads[i].classList.contains("table__actions") ? "Actions" : t)));
  table.dataset.cards = ""; table.setAttribute("role", "table");
  heads.forEach((th) => th.setAttribute("role", "columnheader"));
  rows.forEach((row) => {
    if (row.children.length !== heads.length) return;   // a "no results" row spans the table
    row.setAttribute("role", "row");
    [...row.children].forEach((td, i) => { td.dataset.label = texts[i]; td.dataset.cardPart = kinds[i]; td.setAttribute("role", "cell"); });
    if (kinds.includes("rest") && !row.querySelector(".table__more")) {
      const more = document.createElement("button");
      more.type = "button"; more.className = "table__more";
      more.setAttribute("aria-label", "Details"); more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", () => more.setAttribute("aria-expanded", String(row.classList.toggle("is-open"))));
      const keys = row.querySelectorAll('[data-card-part="key"]');
      keys[keys.length - 1].append(more);
    }
  });
}

// The Details toggle: no text (css shows its aria-label), opens the row's other cells.
export function MoreButton({ open, onToggle }) {
  return <button type="button" className="table__more" aria-label="Details" aria-expanded={String(open)} onClick={onToggle} />;
}
