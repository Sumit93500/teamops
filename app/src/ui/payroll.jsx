// The payroll pages' small pieces (round 11).
import { Link } from "react-router-dom";
import { pageUrl, RATES_RULES } from "../routes.js";
import { mayOpenRates } from "../shell/appNav.js";
// KeepWhole: leave-view.js keepMonthsWhole() as React: each quoted part and each yyyy-mm in a line kept on one line
// (span.empty__keep), so "2026-09" doesn't break at its hyphen.
export function KeepWhole({ text }) {
  return text.split(/("[^"]*"|\d{4}-\d{2})/).map((part, i) => (i % 2 ? <span className="empty__keep" key={i}>{part}</span> : part)).filter((part) => part !== "");
}

// P4: where a rate comes from a row flagged unverified, the page says so, in these words, with the way to the Rates and rules
// page for whoever may open it (Finance and Admin).
export const UNVERIFIED_TEXT = "These rates are samples until an Admin verifies them.";
export function UnverifiedNote({ id = "unverified-rates" }) {
  return (
    <div className="ds-note ds-note--warning" id={id} role="note" data-unverified>
      <strong>Unverified rates</strong>{" "}{UNVERIFIED_TEXT}{mayOpenRates() ? <>{" "}<Link to={pageUrl(RATES_RULES)}>Rates and rules</Link></> : null}
    </div>
  );
}

// "₹1,23,456"
export const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;
