// pages/approval-workflows.js
// Runs on approval-workflows.html (needs workflows:view: Admin). Fills the
// stat strip's three request figures from the four workflows that are built:
// leave, attendance corrections, expense claims and asset requests. The
// Workflows card and the table are the page's own (static) description. The
// "₹62,000 example" card follows the real ₹62,000 claim (renderExample).
//
//   Requests this month    sent this calendar month (by the local day), and
//                          the change from last month
//   Average decision time  from sending to the final decision, over requests
//                          that got one (approved, rejected, paid, fulfilled
//                          or closed); auto-approved ones are left out, as on
//                          leave-approvals
//   Waiting over 2 days    still pending, sent more than 2 days ago
//
// Nothing escalates and there's no company-wide target, so neither is shown.

import { can } from "../core/rbac.js";
import { allRequests } from "../data/leave-store.js";
import { allRegularizations } from "../data/attendance-store.js";
import { allExpenses, getExpense } from "../data/expenses-store.js";
import { allAssetRequests } from "../data/asset-requests-store.js";
import { todayIso, monthName, plural } from "../ui/leave-view.js";
import { setStatValue, setStatNote } from "../ui/stats.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DECIDED = ["approved", "rejected", "paid", "fulfilled", "closed"];
const DECISIONS = ["approved", "rejected", "auto-approved"];

const stat = (key) => document.querySelector(`[data-stat="${key}"]`);

// "2026-10" and the month before it, by the local calendar (appliedOn is a local date).
function monthKeys() {
  const [year, month] = todayIso().split("-").map(Number);
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const key = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
  return { current: key(year, month), previous: key(...prev), previousMonth: prev[1] };
}

// Days from sending to the final decision, or null (not decided, or auto-approved).
function decisionDays(request) {
  if (!DECIDED.includes(request.status)) return null;
  const last = [...request.history].reverse().find((h) => DECISIONS.includes(h.decision));
  if (!last || last.decision === "auto-approved") return null;
  return (Date.parse(last.at) - Date.parse(request.history[0].at)) / DAY_MS;
}

function render() {
  const requests = [...allRequests(), ...allRegularizations(), ...allExpenses(), ...allAssetRequests()];

  const { current, previous, previousMonth } = monthKeys();
  const now = requests.filter((r) => r.appliedOn?.startsWith(current)).length;
  const before = requests.filter((r) => r.appliedOn?.startsWith(previous)).length;
  const change = now - before;
  setStatValue(stat("requests"), String(now));
  setStatNote(stat("requests"), change === 0 ? `Same as ${monthName(previousMonth)}` : `${change > 0 ? "+" : "−"}${Math.abs(change)} vs ${monthName(previousMonth)}`,
    change > 0 ? "up" : change < 0 ? "down" : "");

  const times = requests.map(decisionDays).filter((d) => d !== null);
  setStatValue(stat("decision"), times.length ? `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)} days` : "—");
  setStatNote(stat("decision"), times.length ? `Over ${plural(times.length, "decision", "decisions")}` : "No decisions yet");

  const pending = requests.filter((r) => r.status === "pending");
  const waiting = pending.filter((r) => (Date.now() - Date.parse(r.history[0].at)) / DAY_MS > 2).length;
  setStatValue(stat("waiting"), String(waiting));
  setStatNote(stat("waiting"), pending.length ? `Of ${plural(pending.length, "request", "requests")} waiting for a decision` : "Nothing waiting for a decision",
    waiting ? "down" : "");
}

// The "₹62,000 example" card is the app's one claim above ₹50,000 (EXP-3103,
// Rohan Gupta's client visit), drawn at the stage it is really at: a stage is
// done once the claim's history approves (or skips) it, current while the
// claim waits there, rejected if it was turned down there. Without the claim
// (an old saved copy) the card's static steps stay as they are.
const EXAMPLE_CLAIM = "EXP-3103";
const PASSED = ["approved", "auto-approved", "skipped"];

function renderExample() {
  const card = document.getElementById("expense-example");
  const claim = getExpense(EXAMPLE_CLAIM);
  if (!card || !claim) return;
  const tick = card.querySelector(".stepper__step.is-done .stepper__dot svg");   // "Employee sends" is always done
  card.querySelectorAll(".stepper__step[data-stage]").forEach((step, i) => {
    const stage = step.dataset.stage;
    const done = claim.history.some((h) => h.stage === stage && PASSED.includes(h.decision));
    const rejected = claim.status === "rejected" && claim.history.some((h) => h.stage === stage && h.decision === "rejected");
    step.classList.toggle("is-done", done);
    step.classList.toggle("is-current", claim.status === "pending" && claim.stage === stage);
    step.classList.toggle("is-rejected", rejected);
    step.querySelector(".stepper__dot").replaceChildren(done && tick ? tick.cloneNode(true) : String(i + 2));
  });
}

// can() matters because guard.js only redirects; this script would still run.
if (can("workflows:view") && stat("requests")) {
  render();
  renderExample();
}