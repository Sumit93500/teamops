// The page shell: .app > aside.sidebar + .main > header.topbar + main.content. The <html> marks the old scripts set are set
// before the first paint (useLayoutEffect): data-nav-drawn (the rail's width, rail.css) and data-phone-ready (phone.css's
// hold: the shell is drawn whole, so there is nothing to wait for). The drawer (820px and below) opens from the menu button,
// as ui/menu-toggle.js: focus moves into it; a link in it, a click outside (which only closes) or Esc closes it.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMedia } from "./media.js";
import Sidebar from "./Sidebar.jsx";
import { useSession } from "../data/hooks.js";
import { refreshPrefs } from "../data/prefs.js";

import { CardHost, closeBellPanel, closeApprovalCard } from "../ui/ApprovalCard.jsx";

// Closes the bell's list and the card (round 13b: ui/ApprovalCard.jsx, mounted below).
const closeCards = () => { closeBellPanel(false); closeApprovalCard(); };
import Topbar from "./Topbar.jsx";
import { PoweredBy } from "./Brand.jsx";
import "./solid-header.css";

// The pages that are a step inside another page (ui/phone.js DETAIL_PAGES): at 560px and under the back arrow takes the
// menu button's place and goes to the breadcrumb's parent (from the page's HTML, at build time).
const DETAIL_PAGES = ["requests/claim-expense.html", "users/user-form.html", "users/user-profile.html", "access/role-editor.html", "leave/apply-leave.html", "payroll/payslip-view.html"];

export default function Shell({ page, title, back, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleRef = useRef(null);
  const navigate = useNavigate();
  const phone = useMedia("(max-width: 560px)");
  const backTo = phone && DETAIL_PAGES.includes(page) ? back : null;
  const { userId } = useSession();
  useLayoutEffect(() => { refreshPrefs(); }, [userId]);   // A1: whoever is signed in sees their own appearance

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.removeAttribute("data-nav-pending");
    html.setAttribute("data-nav-drawn", "");
    html.setAttribute("data-phone-ready", "");
  }, []);
  useLayoutEffect(() => { document.documentElement.toggleAttribute("data-has-back", Boolean(backTo)); }, [backTo]);

  // The bell's list and card (old ui/approval-card.js, drawn on <body>): their inbox links go through the router, and a
  // new page closes them.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest("#bell-panel a[href], #approval-card a[href]");
      if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      closeCards();
      navigate(new URL(a.href, window.location.href).pathname);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
  useEffect(() => () => closeCards(), [page]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    document.querySelector("#sidebar .sidebar__nav a")?.focus();   // the first page link (D2a: the brand link before it is hidden in the drawer)
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
        <Topbar title={title} back={backTo} drawerOpen={drawerOpen} toggleDrawer={() => setDrawerOpen((o) => !o)} toggleRef={toggleRef} />
        <main className="content" id="main" data-page={page}>{children}</main>
        <PoweredBy />
      </div>
      <CardHost />
    </div>
  );
}
