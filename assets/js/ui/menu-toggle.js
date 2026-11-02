// ui/menu-toggle.js
// The phone menu: below 820px the sidebar is a drawer (layout/responsive.css),
// opened by the topbar's menu button. A link in it, a click outside it or Esc closes it.

export function initMenuToggle(root = document) {
  const toggle = root.querySelector(".topbar__menu-toggle");
  const sidebar = root.querySelector(".sidebar");
  if (!toggle || !sidebar) return;

  const isOpen = () => sidebar.classList.contains("is-open");
  const set = (open) => {
    sidebar.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  set(false);

  // The sidebar comes before the button in the page, so Tab from the button would
  // skip it: opening moves focus into the menu, and closing with the button or Esc brings it back.
  toggle.addEventListener("click", () => {
    const open = !isOpen();
    set(open);
    if (open) sidebar.querySelector("a")?.focus();
  });

  sidebar.addEventListener("click", (e) => {
    if (e.target.closest("a")) set(false);
  });

  // Captured, so a click outside only closes: it doesn't also press what was under it.
  // Widened past the drawer's width, the button is hidden and the sidebar is a plain column: the click goes through.
  root.addEventListener("click", (e) => {
    if (!isOpen() || sidebar.contains(e.target) || toggle.contains(e.target)) return;
    set(false);
    if (window.getComputedStyle(toggle).display === "none") return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  root.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isOpen()) return;
    set(false);
    toggle.focus();
  });
}