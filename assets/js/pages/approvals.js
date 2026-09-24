// pages/approvals.js
// Runs on any page with Approve/Reject buttons (approvals-inbox.html,
// leave-approvals.html, regularization.html). Removes the row on click.

document.querySelectorAll(".btn-group").forEach((group) => {
  const approveBtn = group.querySelector(".btn--primary");
  const rejectBtn = Array.from(group.querySelectorAll(".btn")).find((b) => b !== approveBtn);

  if (!approveBtn) return;

  const row = group.closest("tr, .list__item");
  if (!row) return;

  approveBtn.addEventListener("click", () => row.remove());
  if (rejectBtn) rejectBtn.addEventListener("click", () => row.remove());
});