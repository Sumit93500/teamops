// The payroll pages' small pieces (round 11).
// KeepWhole: leave-view.js keepMonthsWhole() as React: each quoted part and each yyyy-mm in a line kept on one line
// (span.empty__keep), so "2026-09" doesn't break at its hyphen.
export function KeepWhole({ text }) {
  return text.split(/("[^"]*"|\d{4}-\d{2})/).map((part, i) => (i % 2 ? <span className="empty__keep" key={i}>{part}</span> : part)).filter((part) => part !== "");
}

// "₹1,23,456"
export const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;
