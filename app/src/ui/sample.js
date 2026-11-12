// What app.js gave a sample page's search box (ui/table-filter.js), for the sample pages written as JSX (rounds 16 and 23):
// typing hides the rows of the card's table whose text doesn't have it; no "No matches." row. The rows are the Table
// component's; their hidden attribute is the only thing set here.
export function onSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const table = e.target.closest(".card")?.querySelector("table");
  table?.querySelectorAll("tbody tr").forEach((row) => { row.hidden = query !== "" && !row.textContent.toLowerCase().includes(query); });
}
