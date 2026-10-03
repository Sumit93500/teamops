// pages/claim-expense.js
// Runs on claim-expense.html (needs expenses:create, which every role has).
// Sends the signed-in person's claim through submitExpense(): every refusal
// comes from the store and is shown at the field it names (the form is
// novalidate, so there's one source of errors). A missing receipt above
// ₹500 doesn't stop a claim; the store's advisory is shown as a hint while
// typing and as a warning after sending. The approval chain is the store's
// previewRoute() for the amount entered. A session without an employee id (an
// old sign-in) leaves the static page as it is.

import { getCurrentUserId } from "../core/auth.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { getUser } from "../data/store.js";
import { EXPENSE_POLICY, CATEGORY_KEYS, needsReceipt } from "../data/expenses.js";
import { submitExpense, previewRoute } from "../data/expenses-store.js";
import { STAGE_NAME, categoryLabel } from "../ui/expense-view.js";
import { el, escapeHtml, nameOf, step } from "../ui/leave-view.js";
import { rupees } from "../ui/money.js";
import { showToast } from "../ui/toast.js";

const user = getUser(getCurrentUserId());

const $ = (id) => document.getElementById(id);
const form = $("expense-form");
const categorySelect = $("expense-category");
const amountInput = $("expense-amount");
const dateInput = $("expense-date");
const reasonInput = $("expense-reason");
const receiptInput = $("expense-receipt");
const receiptHint = $("expense-receipt-hint");
const chainList = $("expense-chain");
const subtitle = document.querySelector(".page-header__subtitle");
const submitBtn = form?.querySelector('[type="submit"]');

// ---------- errors (the apply-leave.js pattern) ----------

// Where each field named by submitExpense()'s result.field shows its error.
const FIELD = { category: categorySelect, amount: amountInput, date: dateInput, reason: reasonInput };

function clearError(input) {
  const scope = input ? input.closest(".form-field") : form;
  scope?.querySelectorAll(".form-error").forEach((error) => error.remove());
  (input ? [input] : Object.values(FIELD)).forEach((i) => i?.removeAttribute("aria-describedby"));
}

function showError(input, message) {
  clearError();
  const error = el("span", "form-error", message);
  error.id = `${input.id}-error`;
  input.closest(".form-field").appendChild(error);
  input.setAttribute("aria-describedby", error.id);
  input.focus();
}

// ---------- live hints ----------

// The amount as submitExpense() would read it, or null while it isn't one.
function currentAmount() {
  const text = amountInput.value.trim();
  return /^\d+$/.test(text) && Number(text) > 0 ? Number(text) : null;
}

function renderReceiptHint() {
  const amount = currentAmount();
  const missing = amount !== null && needsReceipt(amount) && !receiptInput.value.trim();
  receiptHint.textContent = missing
    ? `Claims above ${rupees(EXPENSE_POLICY.receiptAbove)} need a receipt. You can still send it, but it may be rejected without one.`
    : `Needed above ${rupees(EXPENSE_POLICY.receiptAbove)}. Only the name is kept: no file is uploaded in this demo.`;
  receiptHint.dataset.missing = String(missing);
}

// Who the claim would go to, for the amount entered (any amount up to the
// Admin limit until one is entered).
function renderChain() {
  const amount = currentAmount() ?? EXPENSE_POLICY.adminAbove;
  const steps = [step("current", 1, "You send the claim", user.name)];
  if (user.role === "admin") {
    steps.push(step("", 2, "Approved automatically", "Admin claims don't need approval"), step("", 3, "Payment", "Finance pays it"));
    chainList.replaceChildren(...steps);
    subtitle.textContent = "As an Admin, your claim is approved as soon as you send it.";
    return;
  }
  const route = previewRoute(user.id, amount);
  const deciding = route.filter((r) => r.holderIds.length);
  for (const { stage, holderIds } of route) {
    const title = `${stage === "manager" ? "Manager" : STAGE_NAME[stage]} approval`;
    steps.push(holderIds.length
      ? step("", steps.length + 1, title, holderIds.map(nameOf).join(", "))
      : step("", steps.length + 1, `${title} skipped`, stage === "manager" ? "No manager on file" : `Nobody else can decide the ${STAGE_NAME[stage]} stage`));
  }
  steps.push(step("", steps.length + 1, "Payment", "Finance or an Admin pays approved claims"));
  chainList.replaceChildren(...steps);
  subtitle.textContent = deciding.length
    ? `Your claim goes to ${deciding.map((r) => (r.stage === "manager" ? nameOf(r.holderIds[0]) : r.stage === "admin" ? "an Admin" : STAGE_NAME[r.stage])).join(", then ")}.`
    : "Nobody can approve a claim from you at the moment. Ask an Admin.";
}

function update() {
  renderReceiptHint();
  renderChain();
}

// ---------- send ----------

function submit(e) {
  e.preventDefault();
  clearError();
  const result = submitExpense(user.id, {
    category: categorySelect.value,
    amount: amountInput.value,
    date: dateInput.value,
    reason: reasonInput.value,
    receipt: receiptInput.value,
  });

  if (!result.ok) {
    const input = FIELD[result.field];
    if (input) showError(input, result.error);
    else showToast(escapeHtml(result.error), "danger");
    return;
  }

  submitBtn.disabled = true;   // no second claim while the page moves on
  if (result.advisories.length) {
    showToast(escapeHtml(result.advisories.map((a) => a.message).join(" ")), "warning", 8000);
  }
  showToast(result.record.status === "approved"
    ? "Claim approved. Admin claims are approved automatically."
    : "Expense claim sent.", "success");
  setTimeout(() => {
    window.location.href = resolvePageLink("requests/my-requests.html");
  }, 1200);
}

// ---------- start ----------

// can() matters because guard.js only redirects; this script would still run.
if (user && can("expenses:create") && form && chainList) {
  const choose = el("option", "", "Choose a category");
  choose.value = "";
  categorySelect.replaceChildren(choose, ...CATEGORY_KEYS.map((key) => {
    const option = el("option", "", categoryLabel(key));
    option.value = key;
    return option;
  }));
  update();

  Object.values(FIELD).forEach((input) => input.addEventListener("input", () => clearError(input)));
  categorySelect.addEventListener("change", () => clearError(categorySelect));
  amountInput.addEventListener("input", update);
  receiptInput.addEventListener("input", renderReceiptHint);
  form.addEventListener("submit", submit);
}