// ui/phone.js
// What the phone layout (layout/phone.css, 560px and under) can't do in css: labels
// on table cells for the card rows, the Details toggle, the chart's readout and the
// back arrow on a detail page. Above 560px it touches nothing.

const SMALLEST_CARD_TABLE = 4;   // a table of 3 columns or fewer fits as a table
const KEY_CELLS = 2;             // shown after the first cell and the status; the rest wait under Details
const CHART_HINT = "Tap a bar for its value";
const BACK_ICON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

// The pages that are a step inside another page: the arrow takes the hamburger's place
// and goes to the breadcrumb's parent. A page with its own sidebar entry keeps its drawer.
const DETAIL_PAGES = ["requests/claim-expense.html", "users/user-form.html", "users/user-profile.html", "access/role-editor.html", "leave/apply-leave.html", "payroll/payslip-view.html"];

const headText = (th) => th.textContent.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim();
const isActions = (th) => th.classList.contains("table__actions") || th.classList.contains("table__check") || headText(th) === "Actions" || headText(th) === "";

// Which part of the card each column is: primary, status, key, rest, actions. The status is named, not
// guessed from a badge: Type and Role wear badges too. Columns people look for come first among the keys.
const STATUS = /^(status|stage|result)\b/i;
const FIRST_KEYS = /^(net pay|amount|dates?|in stock|assigned to|check-in|designation|department)\b/i;
function cellKinds(heads) {
  const kinds = heads.map((th) => (isActions(th) ? "actions" : ""));
  const primary = kinds.indexOf(""); if (primary >= 0) kinds[primary] = "primary";
  const status = heads.findIndex((th, i) => !kinds[i] && STATUS.test(headText(th))); if (status >= 0) kinds[status] = "status";
  const left = heads.map((_, i) => i).filter((i) => !kinds[i]);
  const keys = [...left.filter((i) => FIRST_KEYS.test(headText(heads[i]))), ...left.filter((i) => !FIRST_KEYS.test(headText(heads[i])))].slice(0, KEY_CELLS);
  left.forEach((i) => { kinds[i] = keys.includes(i) ? "key" : "rest"; });
  return kinds;
}

// The toggle holds no text (css shows its aria-label): row.textContent feeds the table filter
// and the csv export, and an extra cell would make the export skip the row.
function addMore(row) {
  const more = document.createElement("button");
  more.type = "button"; more.className = "table__more";
  more.setAttribute("aria-label", "Details"); more.setAttribute("aria-expanded", "false");
  more.addEventListener("click", () => more.setAttribute("aria-expanded", String(row.classList.toggle("is-open"))));
  const keys = row.querySelectorAll('[data-card-part="key"]');
  keys[keys.length - 1].append(more);
}

function labelTable(table) {
  const headRows = table.querySelectorAll("thead tr");
  const heads = headRows.length ? [...headRows[headRows.length - 1].children] : [];
  if (heads.length < SMALLEST_CARD_TABLE) return;
  const kinds = cellKinds(heads);
  table.dataset.cards = ""; table.setAttribute("role", "table");   // display: block takes the table's own role away
  heads.forEach((th) => th.setAttribute("role", "columnheader"));
  table.querySelectorAll("tbody tr").forEach((row) => {
    if (row.children.length !== heads.length) return;              // a "no results" row spans the table
    row.setAttribute("role", "row");
    [...row.children].forEach((td, i) => { td.dataset.label = headText(heads[i]); td.dataset.cardPart = kinds[i]; td.setAttribute("role", "cell"); });
    if (kinds.includes("rest") && !row.querySelector(".table__more")) addMore(row);
  });
}

// Each column can take focus and names its value, so the readout has a keyboard route;
// the chart stops being one image once something inside it is focusable.
function refreshChart(chart) {
  let out = chart.nextElementSibling;
  if (!out?.classList.contains("chart__readout")) {
    out = document.createElement("p"); out.className = "chart__readout"; out.setAttribute("aria-live", "polite");
    chart.after(out);
  }
  // only if it differs: this runs from a MutationObserver on main, and a write is a mutation
  if (!chart.querySelector(".is-selected") && out.textContent !== CHART_HINT) out.textContent = CHART_HINT;
  if (chart.getAttribute("role") === "img") chart.setAttribute("role", "group");
  chart.querySelectorAll(".chart__col").forEach((col) => {
    const bar = col.querySelector("[title]");
    if (!bar || col.hasAttribute("tabindex")) return;
    col.setAttribute("tabindex", "0"); col.setAttribute("role", "button"); col.setAttribute("aria-label", bar.title);
  });
}

function showValue(event) {
  const col = event.target.closest?.(".chart__col");
  const chart = col?.closest(".chart"), bar = col?.querySelector("[title]");
  if (!bar || !chart) return;
  chart.querySelector(".is-selected")?.classList.remove("is-selected");
  col.classList.add("is-selected");
  chart.nextElementSibling.textContent = bar.title;
}

function addBack(main) {
  if (!DETAIL_PAGES.some((page) => window.location.pathname.endsWith(`/${page}`))) return;
  const links = main.querySelectorAll(".breadcrumb a");
  const toggle = document.querySelector(".topbar__menu-toggle");
  if (!links.length || !toggle || document.querySelector(".topbar__back")) return;
  const back = document.createElement("a");
  back.className = "topbar__back"; back.href = links[links.length - 1].href; back.setAttribute("aria-label", "Back");
  back.innerHTML = BACK_ICON;
  toggle.before(back);
  document.documentElement.toggleAttribute("data-has-back", true);
}

// data-phone-ready lets the page show (the hold at the end of layout/phone.css). The timeout puts it
// after the page's own module, which runs just before DOMContentLoaded and draws the tables.
function markReady() {
  const ready = () => document.documentElement.toggleAttribute("data-phone-ready", true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(ready));
  else setTimeout(ready);
}

export function initPhone() {
  const phone = window.matchMedia?.("(max-width: 560px)");
  const main = document.querySelector("main");
  if (!phone || !main) return;
  const start = () => {
    const run = () => { main.querySelectorAll("table.table").forEach(labelTable); main.querySelectorAll(".chart").forEach(refreshChart); addBack(main); };
    run();
    markReady();
    document.addEventListener("click", showValue);
    document.addEventListener("focusin", showValue);
    if (typeof MutationObserver === "function") new MutationObserver(run).observe(main, { childList: true, subtree: true });
  };
  if (phone.matches) start();
  else phone.addEventListener("change", start, { once: true });
}