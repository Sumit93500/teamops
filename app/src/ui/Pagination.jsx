// The pager, as ui/pagination.js draws it: nothing (and .is-empty, so the css hides the bar) for one page or
// none; else "Showing a to b of n", Prev, the page numbers with "..." gaps, Next.
function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 2) [2, 3].forEach((p) => pages.add(p));
  if (current >= total - 1) [total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((page, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && page - prev === 2) out.push(prev + 1);
    else if (prev !== undefined && page - prev > 2) out.push("gap");
    out.push(page);
  });
  return out;
}

export default function Pagination({ totalItems, pageSize, currentPage, onPageChange }) {
  const total = Math.max(0, Number(totalItems) || 0);
  const size = Math.max(1, Number(pageSize) || 1);
  const totalPages = Math.ceil(total / size);
  if (totalPages <= 1) return <div className="pagination is-empty" />;
  const current = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const from = (current - 1) * size + 1, to = Math.min(current * size, total);
  const Btn = ({ label, page, disabled, active, aria }) => (
    <button type="button" className={`pagination__btn${active ? " is-active" : ""}`} disabled={disabled || undefined}
      aria-current={active ? "page" : undefined} aria-label={aria} onClick={active || disabled ? undefined : () => onPageChange(page)}>{label}</button>
  );
  return (
    <div className="pagination">
      <span>{`Showing ${from} to ${to} of ${total}`}</span>
      <div className="pagination__pages">
        <Btn label="Prev" page={current - 1} disabled={current === 1} aria="Previous page" />
        {pageList(current, totalPages).map((item, i) => (item === "gap"
          ? <span key={`gap${i}`} className="pagination__gap">...</span>
          : <Btn key={item} label={String(item)} page={item} active={item === current} aria={`Page ${item}`} />))}
        <Btn label="Next" page={current + 1} disabled={current === totalPages} aria="Next page" />
      </div>
    </div>
  );
}
