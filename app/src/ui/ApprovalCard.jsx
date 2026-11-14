// The approval card and the bell's list (ui/approval-card.js, round 14G), as React (round 13b): the same markup, words, focus
// and keyboard rules, drawn on <body> (outside main) by <CardHost/>, which the shell mounts once. The API is the old module's:
// openApprovalCard(kind, id, { opener, more, refresh }), closeApprovalCard(), cardOpener(node, ...), cardLink(link, ...),
// toggleBellPanel(bell), closeBellPanel(focusBell), so the dashboards' and inbox's openers work as before.
// New in 13b (the 14F ruling, option B): a card for something that waits for you has Reject and Approve in its footer, after
// More, through the same flows as the pages' rows (Decision.jsx: the in-app question, the reject note, the same toasts). The
// card closes as either starts (Reject's note replaces it, as ruled; Approve's question too); when it's done or answered no,
// focus goes back to what opened the card, or the bell if that's gone.
// F1 (the bell's fix): the shell is drawn again on every page change (each page has its own Frame), so a new CardHost
// mounts before the old one unmounts. The old one's cleanup used to set the module's host to null AFTER the new one had
// set it, and nothing drew the new host again, so after any page change in the app the bell (and every card opener) did
// nothing until a reload. Now the host registers in a layout effect and an unmount clears it only if it is still its
// own; the list's open state is one small store (useBellOpen) that the bell's aria-expanded and the host both read; the
// list closes on Esc anywhere, a press outside, a new width and a page change, and focus goes back to the bell.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { getCurrentUserId, getCurrentRole } from "../../../assets/js/core/auth.js";
import { can } from "../../../assets/js/core/rbac.js";
import { getRequest } from "../../../assets/js/data/leave-store.js";
import { getRegularization } from "../../../assets/js/data/attendance-store.js";
import { getExpense, STAGE_NAME as EXPENSE_STAGE } from "../../../assets/js/data/expenses-store.js";
import { getAssetRequest, STAGE_NAME as ASSET_STAGE } from "../../../assets/js/data/asset-requests-store.js";
import { salaryProposals, salaryFor } from "../../../assets/js/data/payroll-store.js";
import { categoryLabel } from "../../../assets/js/ui/expense-view.js";
import { assetTypeLabel } from "../../../assets/js/ui/inventory-view.js";
import { ISSUE_LABEL } from "../../../assets/js/ui/attendance-view.js";
import { formatDay, formatDays, requestDates, typeLabel, nameOf, initials, avatarClass, localDateOf } from "../../../assets/js/ui/leave-view.js";
import { waitingFor } from "../data/waiting.js";
import { getLocationChange, homeOf } from "../../../assets/js/data/locations-store.js";
import { useDecision, LEAVE_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, ASSET_FLOW, SALARY_FLOW, LOCATION_FLOW, DecisionButtons } from "../components/Decision.jsx";
import { rupees } from "./payroll.jsx";
import { useData } from "../data/hooks.js";
import { pageUrl } from "../routes.js";

const INBOX = pageUrl("requests/approvals-inbox.html");
const BELL_SHOWN = 5;
export const GONE = "This request no longer exists.";
export const DECIDED = "This request was already decided.";
export const NOT_YOURS = "It's no longer waiting for you.";
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const LOOKUP = { leave: getRequest, corrections: getRegularization, expenses: getExpense, assets: getAssetRequest, salary: (id) => salaryProposals().find((p) => p.id === id) ?? null, locations: getLocationChange };
const WHAT = { leave: (r) => typeLabel(r.type), corrections: () => "Regularization", expenses: () => "Expense claim", assets: () => "Asset request", salary: () => "Salary change", locations: (r) => `${capital(r.kind)} home location change` };
const CHAIN_STAGE = { manager: "Manager", hr: "HR" };
const STAGE = {
  leave: (r) => CHAIN_STAGE[r.stage] ?? r.stage, corrections: (r) => CHAIN_STAGE[r.stage] ?? r.stage,
  expenses: (r) => capital(EXPENSE_STAGE[r.stage] ?? r.stage), assets: (r) => capital(ASSET_STAGE[r.stage] ?? r.stage),
};
const SINCE = { leave: (r) => r.history[0].at, corrections: (r) => r.history[0].at, expenses: (r) => r.history.at(-1).at, assets: (r) => r.history.at(-1).at, salary: (p) => p.enteredAt, locations: (r) => r.requestedAt };
const ROWS = {
  leave: (r) => [["Dates", requestDates(r)], ["Days", formatDays(r.days)], ["Applied", formatDay(r.appliedOn)]],
  corrections: (r) => [["Date", formatDay(r.date)], ["Issue", ISSUE_LABEL[r.issue] ?? r.issue], ["Recorded", r.recordedTime], ["Corrected to", r.time], ["Applied", formatDay(r.appliedOn)]],
  expenses: (c) => [["Amount", rupees(c.amount)], ["Category", categoryLabel(c.category)], ["Spent on", c.date ? formatDay(c.date) : ""], ["Receipt", c.receipt], ["Applied", formatDay(c.appliedOn)]],
  assets: (r) => [["Asset", assetTypeLabel(r.assetType)], ["Replaces", r.replacesTag], ["Applied", formatDay(r.appliedOn)]],
  salary: (p) => {
    const now = salaryFor(p.userId, Number(p.effectiveFrom.slice(0, 4)), Number(p.effectiveFrom.slice(5, 7)));
    return [["New gross", rupees(p.gross)], ["Current gross", now ? rupees(now.gross) : "No salary on file"], ["From", formatDay(p.effectiveFrom, true)], ["Proposed by", nameOf(p.enteredBy)]];
  },
  locations: (r) => {
    const current = homeOf(r.userId)[r.kind];
    return [["New address", r.place.address], ["Position", `${r.place.lat}, ${r.place.lng}`], ["Now", current ? current.address : "Not set"], ["Sent", formatDay(localDateOf(r.requestedAt))]];
  },
};
// The buttons' permission, as the inbox's rows carry it: the manager stage and salary changes go by relationship / record.
const PERMISSION = { leave: "leave:approve", corrections: "attendance:approve", expenses: "expenses:approve", assets: "assets:approve", locations: "locations:review" };

export function waitingSince(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
const waitingNow = () => waitingFor(getCurrentUserId(), getCurrentRole()?.key);
export function cardState(kind, id) {
  const item = (waitingNow()[kind] ?? []).find((r) => r.id === id);
  if (item) return { item };
  if (kind === "salary" && !can("salary:view")) return { why: NOT_YOURS };
  const record = LOOKUP[kind]?.(id) ?? null;
  if (!record) return { why: GONE };
  if (record.status === "pending" || record.status === "cancelled") return { why: NOT_YOURS };
  return { why: DECIDED };
}

// ---------- the imperative API (the old module's), wired to the mounted host ----------

let host = null;   // { openCard, closeCard }: the mounted CardHost's
const connected = (node) => !!node && node.isConnected;
export const BELL_SELECTOR = ".topbar__icon-btn--dot[aria-haspopup]";
const currentBell = () => document.querySelector(BELL_SELECTOR);

// The bell's list: open or not, in one place. The bell (Topbar.jsx) draws aria-expanded from it, CardHost draws the list.
let bellOpen = false;
const bellListeners = new Set();
function setBellOpen(open) {
  if (bellOpen === open) return;
  bellOpen = open;
  bellListeners.forEach((l) => l());
}
const subscribeBell = (l) => { bellListeners.add(l); return () => bellListeners.delete(l); };
export const useBellOpen = () => useSyncExternalStore(subscribeBell, () => bellOpen);

export function openApprovalCard(kind, id, { opener = document.activeElement, more = true, refresh = null } = {}) { host?.openCard({ kind, id, opener, more, refresh }); }
export function closeApprovalCard() { host?.closeCard(); }
export function toggleBellPanel(bell) {
  if (bellOpen) { closeBellPanel(true); return; }
  if (!connected(bell)) return;
  setBellOpen(true);
}
export function closeBellPanel(focusBell) {
  if (!bellOpen) return;
  setBellOpen(false);
  if (focusBell) currentBell()?.focus();
}
export function cardOpener(node, kind, id, options = {}) {
  node.setAttribute("role", "button");
  node.setAttribute("aria-haspopup", "dialog");
  node.tabIndex = 0;
  node.dataset.card = kind;
  const open = () => openApprovalCard(kind, id, { ...options, opener: node });
  node.addEventListener("click", open);
  node.addEventListener("keydown", (e) => { if (e.key !== "Enter" && e.key !== " ") return; e.preventDefault(); open(); });
}
export function cardLink(link, kind, id, options = {}) {
  link.setAttribute("aria-haspopup", "dialog");
  link.dataset.card = kind;
  link.addEventListener("click", (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openApprovalCard(kind, id, { ...options, opener: link });
  });
}

const CloseIcon = () => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;
const focusables = (root) => Array.from(root.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')).filter((n) => !n.closest("[hidden]"));
// secondary (13c, ruled): More sits beside Approve, so it is a plain button and Approve stays the one primary; See all,
// alone in its footer, stays primary.
const InboxLink = ({ text, label, secondary }) => <a className={`btn${secondary ? "" : " btn--primary"} btn--sm`} href={INBOX} aria-label={label}>{text}</a>;

function Card({ card, onClose, decide }) {
  const ref = useRef(null);
  const { kind, item, why, more } = card;
  useEffect(() => { document.getElementById("approval-card-title")?.focus(); }, [card]);
  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab") return;
    const list = focusables(ref.current);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || !list.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const close = <button className="modal__close" type="button" aria-label="Close" onClick={onClose}><CloseIcon /></button>;
  const rows = item ? [...ROWS[kind](item), ...(STAGE[kind] ? [["Stage", STAGE[kind](item)]] : []), ["Waiting", waitingSince(SINCE[kind](item))]].filter(([, v]) => v) : [];
  const permission = item && item.stage !== "manager" ? PERMISSION[kind] : undefined;
  return (
    <div className="modal approval-card is-open" id="approval-card" role="dialog" aria-modal="true" aria-labelledby="approval-card-title" ref={ref}
      data-kind={kind} data-state={item ? "open" : why === GONE ? "gone" : why === DECIDED ? "decided" : "not-yours"}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} onKeyDown={onKeyDown}>
      <div className="modal__dialog modal__dialog--sm approval-card__dialog">
        {item ? (
          <>
            <div className="modal__header">
              <div className="approval-card__who">
                <div className={avatarClass(item.userId)}>{initials(nameOf(item.userId))}</div>
                <div className="approval-card__text"><h2 className="modal__title" id="approval-card-title" tabIndex={-1}>{nameOf(item.userId)}</h2><p className="approval-card__what">{WHAT[kind](item)}</p></div>
              </div>
              {close}
            </div>
            <div className="modal__body">
              <dl className="kv">{rows.map(([l, v]) => <div className="kv__row" key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl>
              {item.reason && <div className="approval-card__reason"><h3 className="approval-card__label">Reason</h3><p>{item.reason}</p></div>}
            </div>
            <div className="modal__footer">
              {more && <InboxLink text="More" label="More in Approvals inbox" secondary />}
              <DecisionButtons permission={permission} onReject={() => decide("reject")} onApprove={() => decide("approve")} />
            </div>
          </>
        ) : (
          <>
            <div className="modal__header"><h2 className="modal__title" id="approval-card-title" tabIndex={-1}>{why}</h2>{close}</div>
            {more && <div className="modal__footer"><InboxLink text="See all" /></div>}
          </>
        )}
      </div>
    </div>
  );
}

// What waits, newest first; a read that fails (storage that can't be read) gives null, and the list says so.
function waitingList() {
  try {
    return Object.entries(waitingNow()).flatMap(([kind, list]) => list.map((r) => ({ kind, r, since: Date.parse(SINCE[kind](r)) })))
      .sort((a, b) => b.since - a.since || b.r.id.localeCompare(a.r.id, "en", { numeric: true }));
  } catch {
    return null;
  }
}

function BellPanel({ onClose }) {
  const ref = useRef(null);
  const d = useData(waitingList, []);
  const [pos] = useState(() => {
    const box = currentBell()?.getBoundingClientRect();
    return box ? { "--bell-top": `${Math.round(box.bottom + 6)}px`, "--bell-right": `${Math.max(8, Math.round(document.documentElement.clientWidth - box.right))}px` } : {};
  });
  useEffect(() => { document.getElementById("bell-panel-title")?.focus(); }, []);
  return (
    <div className="bell-panel" id="bell-panel" role="dialog" aria-labelledby="bell-panel-title" ref={ref} style={pos}
      onClick={(e) => { if (e.target === ref.current) onClose(true); }}
      onKeyDown={(e) => { if (e.key !== "Escape") return; e.preventDefault(); e.stopPropagation(); onClose(true); }}
      onBlur={(e) => { if (e.relatedTarget && !ref.current.contains(e.relatedTarget) && !e.relatedTarget.closest?.(BELL_SELECTOR)) onClose(false); }}>
      <div className="bell-panel__sheet">
        <div className="bell-panel__header"><h2 className="bell-panel__title" id="bell-panel-title" tabIndex={-1}>Waiting for you</h2></div>
        {d === null ? <p className="bell-panel__empty" role="status">What's waiting couldn't be read. Reload the page to try again.</p> : d.length ? (
          <ul className="bell-panel__list">
            {d.slice(0, BELL_SHOWN).map(({ kind, r }) => (
              <li key={`${kind}-${r.id}`}>
                <button className="bell-panel__item" type="button" aria-haspopup="dialog" data-card={kind} onClick={() => openApprovalCard(kind, r.id, { opener: currentBell() })}>
                  <span className={`${avatarClass(r.userId)} avatar--sm`}>{initials(nameOf(r.userId))}</span>
                  <span className="bell-panel__text"><span className="bell-panel__name">{nameOf(r.userId)}</span><span className="bell-panel__what">{WHAT[kind](r)}</span></span>
                  <span className="bell-panel__when">{waitingSince(SINCE[kind](r))}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="bell-panel__empty">Nothing is waiting for you.</p>}
        <div className="bell-panel__footer"><InboxLink text="See all" /></div>
      </div>
    </div>
  );
}

// Mounted once by the shell: holds the open card and the bell's list, and draws them on <body>.
export function CardHost() {
  const [card, setCard] = useState(null);   // { kind, id, item, why, more }
  const open = useBellOpen();
  const { pathname } = useLocation();
  const opened = useRef({ opener: null, refresh: null, stale: false, width: 0 });
  const flows = { leave: useDecision(LEAVE_FLOW), corrections: useDecision(CORRECTION_FLOW), expenses: useDecision(EXPENSE_FLOW), assets: useDecision(ASSET_FLOW), salary: useDecision(SALARY_FLOW), locations: useDecision(LOCATION_FLOW) };
  const focusBack = () => {
    const back = connected(opened.current.opener) ? opened.current.opener : currentBell();
    back?.focus?.();
  };
  const closeBell = closeBellPanel;
  const closeCard = ({ focus = true } = {}) => {
    setCard((c) => {
      if (!c) return c;
      if (opened.current.stale && opened.current.refresh) opened.current.refresh();
      if (focus) setTimeout(focusBack);
      return null;
    });
  };
  // The imperative API's target: the latest render's functions, registered once this host is in the page. A host that
  // unmounts clears it only while it is still its own (the next page's host has registered by then).
  const api = useRef(null);
  api.current = {
    openCard: ({ kind, id, opener, more, refresh }) => {
      closeBell(false);
      const { item, why } = cardState(kind, id);
      opened.current = { ...opened.current, opener, refresh, stale: !item };
      setCard({ kind, id, item, why, more });
    },
    closeCard: () => closeCard(),
  };
  useLayoutEffect(() => {
    const mine = { openCard: (a) => api.current.openCard(a), closeCard: () => api.current.closeCard() };
    host = mine;
    return () => { if (host === mine) host = null; setBellOpen(false); };
  }, []);
  // a new page closes the list and the card (focus stays with the new page)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    closeBell(false);
    closeCard({ focus: false });
  }, [pathname]);   // eslint-disable-line react-hooks/exhaustive-deps
  // the list: a press outside it (and outside the bell, whose own click toggles it), Esc anywhere, or a new width closes
  // it (Chrome for Android's height-only resizes don't)
  useEffect(() => {
    if (!open) return undefined;
    opened.current.width = window.innerWidth;
    const onDown = (e) => {
      if (document.getElementById("bell-panel")?.contains(e.target) || e.target.closest?.(BELL_SELECTOR)) return;
      closeBell(false);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); closeBell(true); } };
    const onResize = () => { if (window.innerWidth !== opened.current.width) closeBell(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [open]);

  // Approve / Reject from the card: it closes as either starts; focus comes back when it's done or answered no.
  const decide = async (which) => {
    const { kind, item } = card;
    const flow = flows[kind];
    closeCard({ focus: false });
    if (which === "approve") { await flow.approve(item); setTimeout(focusBack); }
    else flow.reject(item, () => setTimeout(focusBack));
  };
  return (
    <>
      {open && createPortal(<BellPanel onClose={closeBell} />, document.body)}
      {card && createPortal(<Card card={card} onClose={() => closeCard()} decide={decide} />, document.body)}
      {Object.values(flows).map((f, i) => <span key={i} style={{ display: "contents" }}>{f.modal}</span>)}
    </>
  );
}
