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

// The Details toggle: no text (css shows its aria-label), opens the row's other cells.
export function MoreButton({ open, onToggle }) {
  return <button type="button" className="table__more" aria-label="Details" aria-expanded={String(open)} onClick={onToggle} />;
}
