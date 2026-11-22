// CV1c: a table that scrolls sideways inside its card says so. Marks every .table-wrap with has-scroll when its content is wider than the box, and
// more-left / more-right for the side that has more behind it (design/wide-tables.css draws a soft shadow there). A table that fits gets no class,
// so nothing changes on it. Re-checked on resize, on scroll and when the page adds or replaces a table.
export function initScrollHints() {
  const update = (w) => {
    const more = w.scrollWidth - w.clientWidth > 1;
    w.classList.toggle("has-scroll", more);
    w.classList.toggle("more-left", more && w.scrollLeft > 1);
    w.classList.toggle("more-right", more && w.scrollLeft + w.clientWidth < w.scrollWidth - 1);
  };
  const seen = new WeakSet();
  const ro = new ResizeObserver((entries) => entries.forEach((e) => { const w = e.target.closest(".table-wrap"); if (w) update(w); }));
  const scan = () => document.querySelectorAll(".table-wrap").forEach((w) => {
    if (!seen.has(w)) { seen.add(w); w.addEventListener("scroll", () => update(w), { passive: true }); ro.observe(w); if (w.firstElementChild) ro.observe(w.firstElementChild); }
    update(w);
  });
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
}