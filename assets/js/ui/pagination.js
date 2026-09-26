// ui/pagination.js
// Draws the "Showing X to Y of Z" text and page buttons into a .pagination
// element, using the classes in pagination.css. It only reports which page was
// asked for; the caller re-renders its list and calls renderPagination() again.

// Which page numbers to show: all of them when there are few, otherwise the
// first, the last and the pages around the current one, with gaps ("...")
// in between. Page 1 of 36 gives 1 2 3 ... 36, like the static pages did.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 2) [2, 3].forEach((p) => pages.add(p));
  if (current >= total - 1) [total - 2, total - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev === 2) out.push(prev + 1);   // a gap of one page: just show it
    else if (prev !== undefined && page - prev > 2) out.push("gap");
    out.push(page);
  });
  return out;
}

function button(label, { disabled = false, active = false, ariaLabel } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pagination__btn" + (active ? " is-active" : "");
  btn.textContent = label;
  if (disabled) btn.disabled = true;
  if (active) btn.setAttribute("aria-current", "page");
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  return btn;
}

export function renderPagination(container, { totalItems, pageSize, currentPage, onPageChange } = {}) {
  if (!container) return;
  container.replaceChildren();

  const total = Math.max(0, Number(totalItems) || 0);
  const size = Math.max(1, Number(pageSize) || 1);
  const totalPages = Math.ceil(total / size);
  // One page (or none) needs no controls at all. is-empty lets the CSS hide the
  // whole bar, since its padding and top border would otherwise still show.
  container.classList.toggle("is-empty", totalPages <= 1);
  if (totalPages <= 1) return;

  const current = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const go = (page) => { if (typeof onPageChange === "function") onPageChange(page); };

  const summary = document.createElement("span");
  const from = (current - 1) * size + 1;
  const to = Math.min(current * size, total);
  summary.textContent = `Showing ${from} to ${to} of ${total}`;

  const pages = document.createElement("div");
  pages.className = "pagination__pages";

  const prev = button("Prev", { disabled: current === 1, ariaLabel: "Previous page" });
  prev.addEventListener("click", () => go(current - 1));
  pages.append(prev);

  for (const item of pageList(current, totalPages)) {
    if (item === "gap") {
      const gap = document.createElement("span");
      gap.className = "pagination__gap";
      gap.textContent = "...";
      pages.append(gap);
      continue;
    }
    const btn = button(String(item), { active: item === current, ariaLabel: `Page ${item}` });
    if (item !== current) btn.addEventListener("click", () => go(item));
    pages.append(btn);
  }

  const next = button("Next", { disabled: current === totalPages, ariaLabel: "Next page" });
  next.addEventListener("click", () => go(current + 1));
  pages.append(next);

  container.append(summary, pages);
}