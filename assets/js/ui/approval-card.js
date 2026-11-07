// ui/approval-card.js
// The approval card and the bell's list (round 14G). The card shows the key
// details of one approval that waits for the signed-in person, read-only, with
// "More" to the Approvals Inbox (not on the inbox's own cards: that's where More
// leads). It opens from the bell's list, the Admin and Finance dashboards'
// Review, and the row titles on the HR dashboard and the inbox. Deciding stays
// on the rows; the card is built so Approve and Reject can be added to its
// footer later.
//   - who may see what: the same as the inbox. A card opens with details only
//     for an item in waitingFor() (ui/waiting.js: the inbox's Pending rows, the
//     sidebar's and the bell's count), read fresh when it opens, never by id
//     alone. Otherwise it says why in plain words (already decided, no longer
//     waiting for you, no longer exists) and shows nothing of the request.
//   - the reason is shown to whoever may decide the request (team leads
//     included); a leave request's contact phone isn't shown.
//   - the bell's list: what waits, newest first (by when it started waiting
//     for you, the time each item shows), up to 5, and See all.
//   - focus: into the card or list on open, back to what opened it on close
//     (or the bell, if that's gone); Escape and the backdrop close; Tab stays
//     inside the card (a trap for the card only: the shared one belongs to the
//     Forms round). Both are built on first use, outside main (ui/phone.js
//     only watches main), so nothing on the page moves until one opens.
//   - 560px and under (css/components/modal.css): both are bottom sheets.

import { getCurrentUserId, getCurrentRole } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { getRequest } from "../data/leave-store.js";
import { getRegularization } from "../data/attendance-store.js";
import { getExpense, STAGE_NAME as EXPENSE_STAGE } from "../data/expenses-store.js";
import { getAssetRequest, STAGE_NAME as ASSET_STAGE } from "../data/asset-requests-store.js";
import { salaryProposals, salaryFor } from "../data/payroll-store.js";
import { categoryLabel } from "./expense-view.js";
import { assetTypeLabel } from "./inventory-view.js";
import { ISSUE_LABEL } from "./attendance-view.js";
import { rupees } from "./money.js";
import { el, formatDay, formatDays, requestDates, typeLabel, nameOf, initials, avatarClass } from "./leave-view.js";
import { waitingFor } from "./waiting.js";

const INBOX = "requests/approvals-inbox.html";
const SVG = "http://www.w3.org/2000/svg";
const CLOSE_PATH = "M6 6l12 12M18 6 6 18";   // the dialogs' close icon
const BELL_SHOWN = 5;

export const GONE = "This request no longer exists.";
export const DECIDED = "This request was already decided.";
export const NOT_YOURS = "It's no longer waiting for you.";

// The kinds are ui/waiting.js's keys.
const LOOKUP = {
  leave: getRequest,
  corrections: getRegularization,
  expenses: getExpense,
  assets: getAssetRequest,
  salary: (id) => salaryProposals().find((p) => p.id === id) ?? null,
};
const WHAT = {
  leave: (r) => typeLabel(r.type),
  corrections: () => "Regularization",
  expenses: () => "Expense claim",
  assets: () => "Asset request",
  salary: () => "Salary change",
};
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const CHAIN_STAGE = { manager: "Manager", hr: "HR" };
const STAGE = {
  leave: (r) => CHAIN_STAGE[r.stage] ?? r.stage,
  corrections: (r) => CHAIN_STAGE[r.stage] ?? r.stage,
  expenses: (r) => capital(EXPENSE_STAGE[r.stage] ?? r.stage),
  assets: (r) => capital(ASSET_STAGE[r.stage] ?? r.stage),
};
// When it started waiting, as the inbox counts it: leave and corrections from
// when they were sent, expense claims and asset requests from when they
// reached their current stage, salary changes from when they were proposed.
const SINCE = {
  leave: (r) => r.history[0].at,
  corrections: (r) => r.history[0].at,
  expenses: (r) => r.history.at(-1).at,
  assets: (r) => r.history.at(-1).at,
  salary: (p) => p.enteredAt,
};
// "12 min", "3 hours", "1 day", "10 days": as the inbox's Waiting column.
export function waitingSince(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

// [label, value] rows; a row without a value isn't shown.
const ROWS = {
  leave: (r) => [["Dates", requestDates(r)], ["Days", formatDays(r.days)], ["Applied", formatDay(r.appliedOn)]],
  corrections: (r) => [["Date", formatDay(r.date)], ["Issue", ISSUE_LABEL[r.issue] ?? r.issue], ["Recorded", r.recordedTime], ["Corrected to", r.time], ["Applied", formatDay(r.appliedOn)]],
  expenses: (c) => [["Amount", rupees(c.amount)], ["Category", categoryLabel(c.category)], ["Spent on", c.date ? formatDay(c.date) : ""], ["Receipt", c.receipt], ["Applied", formatDay(c.appliedOn)]],
  assets: (r) => [["Asset", assetTypeLabel(r.assetType)], ["Replaces", r.replacesTag], ["Applied", formatDay(r.appliedOn)]],
  salary: (p) => {
    const now = salaryFor(p.userId, Number(p.effectiveFrom.slice(0, 4)), Number(p.effectiveFrom.slice(5, 7)));
    return [["New gross", rupees(p.gross)], ["Current gross", now ? rupees(now.gross) : "No salary on file"], ["From", formatDay(p.effectiveFrom, true)], ["Proposed by", nameOf(p.enteredBy)]];
  },
};

function closeIcon() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", CLOSE_PATH);
  svg.append(path);
  return svg;
}

const inboxLink = (text, label) => {
  const a = el("a", "btn btn--primary btn--sm", text);
  a.href = resolvePageLink(INBOX);
  if (label) a.setAttribute("aria-label", label);
  return a;
};

// What waits for the signed-in person, read now: { kind: [items] }.
const waitingNow = () => waitingFor(getCurrentUserId(), getCurrentRole()?.key);

// The item, if it waits for this person; otherwise why not (one of the three sentences).
export function cardState(kind, id) {
  const item = (waitingNow()[kind] ?? []).find((r) => r.id === id);
  if (item) return { item };
  // No one without salary:view learns anything of a salary change, not even whether it exists.
  if (kind === "salary" && !can("salary:view")) return { why: NOT_YOURS };
  const record = LOOKUP[kind]?.(id) ?? null;
  if (!record) return { why: GONE };
  if (record.status === "pending" || record.status === "cancelled") return { why: NOT_YOURS };
  return { why: DECIDED };
}

// Whether an element built earlier is on this page now.
const here = (node) => !!node && node.ownerDocument === document && node.isConnected;

// ---------- the card ----------

let card = null;
let cardOpenedBy = null;
let cardRefresh = null;
let cardStale = false;

function focusables(root) {
  return Array.from(root.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')).filter((n) => !n.closest("[hidden]"));
}

function buildCard() {
  card = el("div", "modal approval-card");
  card.id = "approval-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "approval-card-title");
  card.addEventListener("click", (e) => { if (e.target === card) closeApprovalCard(); });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();   // the page's own Esc (ui/modal.js) mustn't also act
      closeApprovalCard();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusables(card);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || !list.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.body.append(card);
}

function header(titleText, person) {
  const head = el("div", "modal__header");
  const title = el("h2", "modal__title", titleText);
  title.id = "approval-card-title";
  title.tabIndex = -1;
  if (person) {
    const who = el("div", "approval-card__who");
    const text = el("div", "approval-card__text");
    text.append(title, el("p", "approval-card__what", person.what));
    who.append(el("div", avatarClass(person.userId), initials(nameOf(person.userId))), text);
    head.append(who);
  } else {
    head.append(title);
  }
  const close = el("button", "modal__close");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.append(closeIcon());
  close.addEventListener("click", () => closeApprovalCard());
  head.append(close);
  return head;
}

// kind: a ui/waiting.js key; id: the record's id. opener: what to focus on close.
// more: false on the inbox's own cards. refresh: the page's own redraw, called on
// close when the card found its row out of date.
export function openApprovalCard(kind, id, { opener = document.activeElement, more = true, refresh = null } = {}) {
  closeBellPanel(false);
  if (!here(card)) buildCard();   // built on first use (again if the page's body was replaced)
  const { item, why } = cardState(kind, id);
  const dialog = el("div", "modal__dialog modal__dialog--sm approval-card__dialog");
  const foot = el("div", "modal__footer");
  if (item) {
    dialog.append(header(nameOf(item.userId), { userId: item.userId, what: WHAT[kind](item) }));
    const body = el("div", "modal__body");
    const kv = el("dl", "kv");
    const rows = [...ROWS[kind](item), ...(STAGE[kind] ? [["Stage", STAGE[kind](item)]] : []), ["Waiting", waitingSince(SINCE[kind](item))]];
    rows.filter(([, value]) => value).forEach(([label, value]) => {
      const row = el("div", "kv__row");
      row.append(el("dt", "", label), el("dd", "", value));
      kv.append(row);
    });
    body.append(kv);
    if (item.reason) {
      const reason = el("div", "approval-card__reason");
      reason.append(el("h3", "approval-card__label", "Reason"), el("p", "", item.reason));
      body.append(reason);
    }
    dialog.append(body);
    if (more) foot.append(inboxLink("More", "More in Approvals inbox"));
  } else {
    dialog.append(header(why, null));
    if (more) foot.append(inboxLink("See all"));
  }
  if (foot.childElementCount) dialog.append(foot);
  card.replaceChildren(dialog);
  cardOpenedBy = opener;
  cardRefresh = refresh;
  cardStale = !item;
  card.dataset.kind = kind;
  card.dataset.state = item ? "open" : why === GONE ? "gone" : why === DECIDED ? "decided" : "not-yours";
  card.classList.add("is-open");
  document.getElementById("approval-card-title").focus();
}

export function closeApprovalCard() {
  if (!here(card) || !card.classList.contains("is-open")) return;
  card.classList.remove("is-open");
  if (cardStale && cardRefresh) cardRefresh();
  const back = here(cardOpenedBy) ? cardOpenedBy : document.querySelector(".topbar__icon-btn--dot[aria-haspopup]");
  back?.focus?.();
  cardOpenedBy = null;
  cardRefresh = null;
}

// A row's title opens its card: a button in place, so it reads and looks as before.
export function cardOpener(node, kind, id, options = {}) {
  node.setAttribute("role", "button");
  node.setAttribute("aria-haspopup", "dialog");
  node.tabIndex = 0;
  node.dataset.card = kind;
  const open = () => openApprovalCard(kind, id, { ...options, opener: node });
  node.addEventListener("click", open);
  node.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    open();
  });
}

// A Review link opens the card; with Ctrl, Shift, Alt or Cmd, or the middle button, it's still a link to the inbox.
export function cardLink(link, kind, id, options = {}) {
  link.setAttribute("aria-haspopup", "dialog");
  link.dataset.card = kind;
  link.addEventListener("click", (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openApprovalCard(kind, id, { ...options, opener: link });
  });
}

// ---------- the bell's list ----------

let panel = null;
let panelBell = null;

function buildPanel() {
  panel = el("div", "bell-panel");
  panel.id = "bell-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "bell-panel-title");
  // A click on the phone's backdrop (the panel itself, outside its sheet) closes it.
  panel.addEventListener("click", (e) => { if (e.target === panel) closeBellPanel(true); });
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    closeBellPanel(true);
  });
  // Focus leaving the list (Tab past its end, a click elsewhere) closes it; the list keeps no trap.
  panel.addEventListener("focusout", (e) => {
    if (!panel.hidden && e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== panelBell) closeBellPanel(false);
  });
  document.body.append(panel);
  document.addEventListener("pointerdown", (e) => {
    if (panel.hidden || panel.contains(e.target) || panelBell?.contains(e.target)) return;
    closeBellPanel(false);
  });
  window.addEventListener("resize", () => closeBellPanel(false));
}

function bellItem({ kind, r }) {
  const button = el("button", "bell-panel__item");
  button.type = "button";
  button.setAttribute("aria-haspopup", "dialog");
  button.dataset.card = kind;
  const text = el("span", "bell-panel__text");
  text.append(el("span", "bell-panel__name", nameOf(r.userId)), el("span", "bell-panel__what", WHAT[kind](r)));
  button.append(el("span", `${avatarClass(r.userId)} avatar--sm`, initials(nameOf(r.userId))), text, el("span", "bell-panel__when", waitingSince(SINCE[kind](r))));
  button.addEventListener("click", () => openApprovalCard(kind, r.id, { opener: panelBell }));
  const li = el("li");
  li.append(button);
  return li;
}

export function toggleBellPanel(bell) {
  if (here(panel) && !panel.hidden) closeBellPanel(true);
  else openBellPanel(bell);
}

export function openBellPanel(bell) {
  if (!here(bell)) return;   // the page moved on while this module loaded
  if (!here(panel)) buildPanel();
  panelBell = bell;
  // Newest first by the moment each one started waiting for you, the time the list shows.
  const waiting = Object.entries(waitingNow())
    .flatMap(([kind, list]) => list.map((r) => ({ kind, r, since: Date.parse(SINCE[kind](r)) })))
    .sort((a, b) => b.since - a.since || b.r.id.localeCompare(a.r.id, "en", { numeric: true }));
  const sheet = el("div", "bell-panel__sheet");
  const head = el("div", "bell-panel__header");
  const title = el("h2", "bell-panel__title", "Waiting for you");
  title.id = "bell-panel-title";
  title.tabIndex = -1;
  head.append(title);
  sheet.append(head);
  if (waiting.length) {
    const list = el("ul", "bell-panel__list");
    list.append(...waiting.slice(0, BELL_SHOWN).map(bellItem));
    sheet.append(list);
  } else {
    sheet.append(el("p", "bell-panel__empty", "Nothing is waiting for you."));
  }
  const foot = el("div", "bell-panel__footer");
  foot.append(inboxLink("See all"));
  sheet.append(foot);
  panel.replaceChildren(sheet);
  // Above 560px it hangs under the bell; at 560 and under the css makes it a bottom sheet and ignores these.
  const box = bell.getBoundingClientRect();
  panel.style.setProperty("--bell-top", `${Math.round(box.bottom + 6)}px`);
  panel.style.setProperty("--bell-right", `${Math.max(8, Math.round(document.documentElement.clientWidth - box.right))}px`);
  panel.hidden = false;
  bell.setAttribute("aria-expanded", "true");
  bell.setAttribute("aria-controls", "bell-panel");
  title.focus();
}

// focusBell: true when the person closed it (Escape, the bell, the backdrop), so focus goes back to the bell.
export function closeBellPanel(focusBell) {
  if (!here(panel) || panel.hidden) return;
  panel.hidden = true;
  panelBell?.setAttribute("aria-expanded", "false");
  if (focusBell) panelBell?.focus();
}