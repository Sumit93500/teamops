// Claim expense (pages/requests/claim-expense.html + assets/js/pages/claim-expense.js), ported (round 13a), for expenses:create:
// the claim form (category, whole-rupee amount, date, the receipt as a file (FS1: ui/files.jsx FilePicker; kept through data/files.js), reason) with the receipt hint and the approval chain for
// the amount entered (previewRoute()), and Send claim through submitExpense(): its errors under their fields, the
// advisories and the old toasts, then My requests. The chain is the round 4 Stepper.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { EXPENSE_POLICY, CATEGORY_KEYS, needsReceipt } from "../../../assets/js/data/expenses.js";
import { submitExpense, previewRoute, cancelExpense } from "../../../assets/js/data/expenses-store.js";
import { putFile } from "../../../assets/js/data/files.js";   // FS1
import { FilePicker, pickerHint } from "../ui/files.jsx";
import { STAGE_NAME, categoryLabel } from "../../../assets/js/ui/expense-view.js";
import { nameOf } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Stepper } from "../components/Basics.jsx";
import { rupees } from "../ui/payroll.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl } from "../routes.js";

const PAGE = "requests/claim-expense.html";
const FIELD_ID = { category: "expense-category", amount: "expense-amount", date: "expense-date", reason: "expense-reason" };

export default function ClaimExpense() {
  const { userId } = useSession();
  const canCreate = useCan("expenses:create");
  const showToast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: "", amount: "", date: "", reason: "" });
  const [receipt, setReceipt] = useState(null);   // FS1: the chosen file, checked
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const d = useData(() => ({ user: getUser(userId) }), [userId]);
  const user = d.user;
  if (!user) return <Frame page={PAGE}><div /></Frame>;

  const text = form.amount.trim();
  const amount = /^\d+$/.test(text) && Number(text) > 0 ? Number(text) : null;
  const missing = amount !== null && needsReceipt(amount) && !receipt;
  // the chain for the amount entered (any amount up to the Admin limit until one is)
  const steps = [{ state: "current", title: "You send the claim", detail: user.name }];
  let subtitle;
  if (user.role === "admin") {
    steps.push({ state: "", title: "Approved automatically", detail: "Admin claims don't need approval" }, { state: "", title: "Payment", detail: "Finance pays it" });
    subtitle = "As an Admin, your claim is approved as soon as you send it.";
  } else {
    const route = previewRoute(user.id, amount ?? EXPENSE_POLICY.adminAbove);
    const deciding = route.filter((r) => r.holderIds.length);
    for (const { stage, holderIds } of route) {
      const title = `${stage === "manager" ? "Manager" : STAGE_NAME[stage]} approval`;
      steps.push(holderIds.length ? { state: "", title, detail: holderIds.map(nameOf).join(", ") }
        : { state: "", title: `${title} skipped`, detail: stage === "manager" ? "No manager on file" : `Nobody else can decide the ${STAGE_NAME[stage]} stage` });
    }
    steps.push({ state: "", title: "Payment", detail: "Finance or an Admin pays approved claims" });
    subtitle = deciding.length
      ? `Your claim goes to ${deciding.map((r) => (r.stage === "manager" ? nameOf(r.holderIds[0]) : r.stage === "admin" ? "an Admin" : STAGE_NAME[r.stage])).join(", then ")}.`
      : "Nobody can approve a claim from you at the moment. Ask an Admin.";
  }
  const set = (name) => (e) => { setForm({ ...form, [name]: e.target.value }); if (error?.field === name) setError(null); };
  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    const result = submitExpense(user.id, { category: form.category, amount: form.amount, date: form.date, reason: form.reason, receipt: receipt?.name ?? "" });
    if (!result.ok) {
      if (FIELD_ID[result.field]) { setError({ field: result.field, message: result.error }); setTimeout(() => document.getElementById(FIELD_ID[result.field])?.focus()); }
      else showToast(result.error, "danger");
      return;
    }
    if (receipt) {   // FS1: the file goes with the claim it belongs to; if it can't be kept, the claim is taken back
      setSending(true);
      const put = await putFile(user.id, { type: "expense", id: result.record.id }, receipt, { kind: "expense-payslip" });
      setSending(false);
      if (!put.ok) {
        cancelExpense(result.record.id, user.id); bump();
        setError({ field: "receipt", message: `Your claim wasn't sent: ${put.error}` });
        return;
      }
    }
    setSent(true);
    if (result.advisories.length) showToast(result.advisories.map((a) => a.message).join(" "), "warning", 8000);
    showToast(result.record.status === "approved" ? "Claim approved. Admin claims are approved automatically." : "Expense claim sent.", "success");
    bump();
    setTimeout(() => navigate(pageUrl("requests/my-requests.html")), 1200);
  };
  const err = (f) => (error?.field === f ? <span className="form-error" id={`${FIELD_ID[f]}-error`}>{error.message}</span> : null);
  const described = (f) => (error?.field === f ? `${FIELD_ID[f]}-error` : undefined);

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("requests/my-requests.html")}>My requests</Link></li>
            <li className="breadcrumb__item" aria-current="page">Claim expense</li>
          </ol>
          <h1>Claim expense</h1>
          <p className="page-header__subtitle">{canCreate ? subtitle : "Your claim goes to your manager, then to Finance."}</p>
        </div>
      </div>
      <div className="grid grid-main-aside">
        <form className="card" id="expense-form" noValidate onSubmit={submit}>
          <section className="form-section">
            <div className="form-section__head">
              <h3 className="form-section__title">What you spent</h3>
              <p className="form-section__desc">One claim per spending. Whole rupees only.</p>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="expense-category">Category</label>
                <select className="select" id="expense-category" name="category" value={form.category} onChange={set("category")} aria-describedby={described("category")}>
                  <option value="">Choose a category</option>
                  {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{categoryLabel(k)}</option>)}
                </select>
                {err("category")}
              </div>
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="expense-amount">Amount (₹)</label>
                <input className="input" id="expense-amount" name="amount" type="text" inputMode="numeric" placeholder="1850" autoComplete="off" value={form.amount} onChange={set("amount")} aria-describedby={described("amount")} />
                <span className="form-hint">Digits only, no commas or paise.</span>
                {err("amount")}
              </div>
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="expense-date">Date of spending</label>
                <input className="input" id="expense-date" name="date" type="date" value={form.date} onChange={set("date")} aria-describedby={described("date")} />
                <span className="form-hint">Claims must be sent within 30 days of the spending.</span>
                {err("date")}
              </div>
              <div className="form-field form-field--full">
                <FilePicker id="expense-receipt" kind="expense-payslip" label="Receipt" value={receipt} disabled={sent || sending}
                  onChange={(v) => { setReceipt(v); if (error?.field === "receipt") setError(null); }} error={error?.field === "receipt" ? error.message : undefined}
                  hint={missing
                    ? `Claims above ${rupees(EXPENSE_POLICY.receiptAbove)} need a receipt. You can still send it, but it may be rejected without one. ${pickerHint("expense-payslip")}`
                    : `Needed above ${rupees(EXPENSE_POLICY.receiptAbove)}. ${pickerHint("expense-payslip")} Seen by you, your manager, HR and Finance; it can't be changed once the claim is sent.`} />
                <span className="visually-hidden" id="expense-receipt-hint" data-missing={String(missing)}>{missing ? "A receipt is expected for this amount." : ""}</span>
              </div>
              <div className="form-field form-field--full">
                <label className="form-label form-label--required" htmlFor="expense-reason">Reason</label>
                <textarea className="textarea" id="expense-reason" name="reason" placeholder="What it was for, e.g. Cab to the client office" value={form.reason} onChange={set("reason")} aria-describedby={described("reason")} />
                {err("reason")}
              </div>
            </div>
          </section>
          <div className="card__footer">
            <span className="card__meta">Fields marked * are required.</span>
            <div className="btn-group">
              <Link className="btn" to={pageUrl("requests/my-requests.html")}>Cancel</Link>
              <button className="btn btn--primary" type="submit" data-permission="expenses:create" hidden={!canCreate || undefined} disabled={sent || sending || undefined} aria-busy={sending || undefined}>{sending ? "Sending…" : "Send claim"}</button>
            </div>
          </div>
        </form>
        <aside className="stack aside-sticky">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Approval chain</h3></div>
            <div className="card__body"><Stepper id="expense-chain" steps={steps} /></div>
          </section>
          <div className="alert alert--info">Claims above ₹50,000 also need an Admin's approval. You can follow your claim, and cancel it while it's waiting, in My requests.</div>
        </aside>
      </div>
    </Frame>
  );
}
