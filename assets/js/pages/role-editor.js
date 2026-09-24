// pages/role-editor.js
// Runs on role-editor.html. Updates the "X of 44 enabled" count as checkboxes toggle.

const matrix = document.querySelector(".matrix");
const countLabel = document.querySelector(".card__meta");

if (matrix) {
  const checkboxes = matrix.querySelectorAll('input[type="checkbox"]:not(:disabled)');

  function updateCount() {
    const total = checkboxes.length;
    const checked = Array.from(checkboxes).filter((c) => c.checked).length;
    if (countLabel) countLabel.textContent = `${checked} of ${total} enabled`;
  }

  checkboxes.forEach((cb) => cb.addEventListener("change", updateCount));
  updateCount();
}