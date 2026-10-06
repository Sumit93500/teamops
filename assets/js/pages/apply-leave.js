// pages/apply-leave.js
// Runs on apply-leave.html. Shows the signed-in person's live balances, counts
// the working days as the dates change, shows who the request goes to, and
// sends it through applyLeave(). A session without an employee id (an old
// sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { resolvePageLink } from "../core/paths.js";
import { getUser } from "../data/store.js";
import { LEAVE_POLICY, LEAVE_TYPES, balanceFor, workingDays, applyLeave, managerFor } from "../data/leave-store.js";
import { dayNumber } from "../data/holidays.js";
import { showToast } from "../ui/toast.js";
import { el, escapeHtml, formatDays, typeLabel, monthName, step, todayIso } from "../ui/leave-view.js";

const user = getUser(getCurrentUserId());

const form = document.getElementById("leave-form");
const typeGrid = document.querySelector(".choice-grid");
const fromInput = document.getElementById("from-date");
const toInput = document.getElementById("to-date");
const durationSelect = document.getElementById("duration");
const totalInput = document.getElementById("total-days");
const reasonInput = document.getElementById("leave-reason");
const phoneInput = document.getElementById("leave-phone");
const balanceList = document.getElementById("balance-after");
const chainList = document.getElementById("approval-chain");
const subtitle = document.querySelector(".page-header__subtitle");
const submitBtn = form?.querySelector('[type="submit"]');

// ---------- errors (same pattern as user-form.js) ----------

// Where each field named by applyLeave()'s result.field shows its error.
const FIELD = { type: typeGrid, from: fromInput, to: toInput, duration: durationSelect, reason: reasonInput };

function clearError(input) {
  const scope = input ? (input.closest(".form-field") ?? input.parentElement) : form;
  scope?.querySelectorAll(".form-error").forEach((error) => error.remove());
  (input ? [input] : Object.values(FIELD)).forEach((i) => i?.removeAttribute("aria-describedby"));
}

function showError(input, message) {
  clearError();
  const error = el("span", "form-error", message);
  error.id = `${input.id || "leave-type"}-error`;
  (input.closest(".form-field") ?? input.parentElement).appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  (input === typeGrid ? typeGrid.querySelector("input:checked") : input)?.focus();
}

// ---------- reading the form ----------

const selectedType = () => typeGrid.querySelector('input[name="leaveType"]:checked')?.value ?? "casual";

// Working days for the dates as they stand, or null while they're incomplete
// or the wrong way round.
function currentDays() {
  const from = fromInput.value;
  const to = toInput.value;
  if (dayNumber(from) === null || dayNumber(to) === null || to < from) return null;
  return workingDays(from, to, durationSelect.value);
}

// ---------- type cards ----------

function typeMeta(type, balance) {
  if (balance.allowance === null) return "Salary is deducted for these days";
  const pending = balance.pending ? `, ${balance.pending} pending` : "";
  if (LEAVE_POLICY[type].per === "month") return `${formatDays(balance.left)} left this month${pending}`;
  return `${balance.left} of ${balance.allowance} days left${pending}`;
}

function renderTypes() {
  const chosen = typeGrid.querySelector("input:checked") ? selectedType() : "casual";
  const balances = balanceFor(user.id);
  typeGrid.replaceChildren(...LEAVE_TYPES.map((type) => {
    const label = el("label", "choice");
    const input = el("input");
    input.type = "radio";
    input.name = "leaveType";
    input.value = type;
    input.checked = type === chosen;
    label.append(input, el("span", "choice__title", typeLabel(type)), el("span", "choice__meta", typeMeta(type, balances[type])));
    return label;
  }));
}

// ---------- "Balance after this request" ----------

function kvRow(term, value) {
  const row = el("div", "kv__row");
  const dd = el("dd");
  dd.append(value);
  row.append(el("dt", "", term), dd);
  return row;
}

function renderBalanceAfter(days) {
  const type = selectedType();
  const policy = LEAVE_POLICY[type];
  // The balance of the period the request falls in: the From date's year
  // (month, for work from home), or today's while no date is picked.
  const period = dayNumber(fromInput.value) !== null ? fromInput.value : todayIso();
  const [y, m] = period.split("-").map(Number);
  const b = balanceFor(user.id, y, m)[type];
  const request = days === null ? "—" : formatDays(days);

  if (policy.allowance === null) {
    balanceList.replaceChildren(
      kvRow(typeLabel(type), "No limit"),
      kvRow("This request", request),
      kvRow("Salary deducted for", days === null ? "—" : formatDays(days)),
    );
    return;
  }

  const periodLabel = policy.per === "month" ? `left in ${monthName(m)}` : "now";
  const rows = [kvRow(`${typeLabel(type)} ${periodLabel}`, formatDays(b.left))];
  if (b.pending) rows.push(kvRow("Already pending", formatDays(b.pending)));
  rows.push(kvRow("This request", request));
  if (days === null) {
    rows.push(kvRow("Balance after", "—"));
  } else {
    const after = b.left - b.pending - days;
    // Over the limit is refused for capped types; work from home only warns.
    const tone = after >= 0 ? "badge--success" : policy.per === "month" ? "badge--warning" : "badge--danger";
    rows.push(kvRow("Balance after", el("span", `badge ${tone}`, formatDays(after))));
  }
  balanceList.replaceChildren(...rows);
}

// ---------- approval chain ----------

function renderChain() {
  const managerId = managerFor(user.id);
  const manager = managerId ? getUser(managerId) : null;
  const steps = [step("current", 1, "You send the request", user.name)];
  let text;
  if (user.role === "admin") {
    steps.push(step("", 2, "Approved automatically", "Admin requests don't need approval"));
    text = "As an Admin, your leave is approved as soon as you send it.";
  } else if (manager) {
    steps.push(step("", 2, "First approval", [manager.name, manager.designation].filter(Boolean).join(", ")));
    steps.push(step("", 3, "Final approval", "HR or an Admin"));
    text = `${manager.name} approves your request first, then HR or an Admin.`;
  } else {
    steps.push(step("", 2, "Approval", "HR or an Admin"));
    text = "Your request goes to HR or an Admin.";
  }
  chainList.replaceChildren(...steps);
  if (subtitle) subtitle.textContent = text;
}

// ---------- live updates ----------

function update() {
  const halfOverDays = durationSelect.value !== "full" && fromInput.value && toInput.value && fromInput.value !== toInput.value;
  if (halfOverDays) showError(durationSelect, "A half day must start and end on the same date.");
  else if (durationSelect.getAttribute("aria-describedby")) clearError(durationSelect);

  const days = halfOverDays ? null : currentDays();
  totalInput.value = days === null ? "—" : formatDays(days);
  renderBalanceAfter(days);
}

// ---------- save ----------

function submit(e) {
  e.preventDefault();
  clearError();
  const result = applyLeave(user.id, {
    type: selectedType(),
    from: fromInput.value,
    to: toInput.value,
    duration: durationSelect.value,
    reason: reasonInput.value,
    contactPhone: phoneInput?.value ?? "",
  });

  if (!result.ok) {
    const input = FIELD[result.field];
    if (input) showError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }

  submitBtn.disabled = true;   // no second request while the page moves on
  if (result.advisories.length) {
    showToast(escapeHtml(result.advisories.map((a) => a.message).join(" ")), "warning", 8000);
  }
  showToast(result.record.status === "approved"
    ? "Leave approved. Admin requests are approved automatically."
    : "Leave request sent.", "success");
  setTimeout(() => {
    window.location.href = resolvePageLink("leave/my-leave.html");
  }, 1200);
}

// ---------- start ----------

if (user && form && typeGrid && balanceList && chainList) {
  renderTypes();
  renderChain();
  update();

  typeGrid.addEventListener("change", () => { clearError(typeGrid); update(); });
  [fromInput, toInput].forEach((input) => input.addEventListener("change", () => { clearError(input); update(); }));
  durationSelect.addEventListener("change", update);
  reasonInput.addEventListener("input", () => clearError(reasonInput));
  // The browser only fires "submit" once required fields are filled, so native
  // validation still runs before this.
  form.addEventListener("submit", submit);
}