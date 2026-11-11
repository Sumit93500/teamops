// The page shell: .app > aside.sidebar + .main > header.topbar + main.content. The <html> marks the old scripts set are set
// before the first paint (useLayoutEffect): data-nav-drawn (the rail's width, rail.css) and data-phone-ready (phone.css's
// hold: the shell is drawn whole, so there is nothing to wait for). The drawer (820px and below) opens from the menu button,
// as ui/menu-toggle.js: focus moves into it; a link in it, a click outside (which only closes) or Esc closes it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import "./solid-header.css";

export default function Shell({ page, title, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.removeAttribute("data-nav-pending");
    html.setAttribute("data-nav-drawn", "");
    html.setAttribute("data-phone-ready", "");
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    document.querySelector("#sidebar a")?.focus();
    const onClick = (e) => {
      if (document.getElementById("sidebar").contains(e.target) || toggleRef.current.contains(e.target)) return;
      setDrawerOpen(false);
      if (window.getComputedStyle(toggleRef.current).display === "none") return;
      e.preventDefault(); e.stopPropagation();
    };
    const onKey = (e) => { if (e.key === "Escape") { setDrawerOpen(false); toggleRef.current.focus(); } };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("keydown", onKey); };
  }, [drawerOpen]);

  return (
    <div className="app">
      <Sidebar page={page} drawerOpen={drawerOpen} closeDrawer={() => setDrawerOpen(false)} />
      <div className="main">
        <Topbar title={title} drawerOpen={drawerOpen} toggleDrawer={() => setDrawerOpen((o) => !o)} toggleRef={toggleRef} />
        <main className="content" id="main" data-page={page}>{children}</main>
      </div>
    </div>
  );
}
