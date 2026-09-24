// pages/attendance.js
// Runs only on mark-attendance.html. Handles the check-in / check-out button.

const checkInBtn = document.querySelector(".punch__actions .btn--primary");
const checkOutBtn = document.querySelector(".punch__actions .btn:not(.btn--primary)");
const statusBadge = document.querySelector(".punch__body > .badge");
const timeDisplay = document.querySelector(".punch__time time");

let checkedIn = false;

function nowLabel() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

if (checkInBtn && checkOutBtn) {
  checkInBtn.addEventListener("click", () => {
    checkedIn = true;
    checkInBtn.disabled = true;
    checkOutBtn.disabled = false;
    if (statusBadge) {
      statusBadge.textContent = "Checked in at " + nowLabel();
      statusBadge.className = "badge badge--success badge--dot";
    }
  });

  checkOutBtn.addEventListener("click", () => {
    if (!checkedIn) return;
    checkOutBtn.disabled = true;
    if (statusBadge) {
      statusBadge.textContent = "Checked out at " + nowLabel();
      statusBadge.className = "badge badge--dot";
    }
  });
}