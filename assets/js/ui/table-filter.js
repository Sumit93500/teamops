// ui/table-filter.js
// Wires up an input.input--search so it filters the rows of a nearby table.

export function initTableFilters(root = document) {
  root.querySelectorAll(".input--search").forEach((input) => {
    const card = input.closest(".card");
    const table = card ? card.querySelector("table") : null;
    if (!table) return;

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      const rows = table.querySelectorAll("tbody tr");

      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.hidden = query !== "" && !text.includes(query);
      });
    });
  });
}