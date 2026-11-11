// A sample page (ruled 2026-11-11: the 10 sample pages are ported as faithful samples): the old page's <main> content, read
// at build time, inside the shell, with what app.js gave it: elements the person may not use hidden ([data-permission],
// rbac.js applyPermissions), "isn't available in this demo" on [data-not-implemented] (ui/placeholder.js), tabs (ui/tabs.js),
// a card's search box filtering its table (ui/table-filter.js), the phone cards at 560px and under (ui/phone.js), and links
// to other pages through the router. Round 8: attendance/shifts.html.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { can } from "../../../assets/js/core/rbac.js";
import { initTabs } from "../../../assets/js/ui/tabs.js";
import { initTableFilters } from "../../../assets/js/ui/table-filter.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { usePhone, labelTable } from "../ui/phone.jsx";
import { useSession } from "../data/hooks.js";

const RAW = import.meta.glob(["../../../pages/attendance/shifts.html"], { query: "?raw", import: "default", eager: true });
const MAIN = Object.fromEntries(Object.entries(RAW).map(([file, html]) => [file.replace(/^.*\/pages\//, ""), html.match(/<main class="content" id="main">([\s\S]*)<\/main>/)[1]]));

export default function SamplePage({ page }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const showToast = useToast();
  const phone = usePhone();
  const { role, userId } = useSession();

  useEffect(() => {
    const root = ref.current;
    if (!root.dataset.wired) { initTabs(root); initTableFilters(root); root.dataset.wired = "1"; }
    const onClick = (e) => {
      const placeholder = e.target.closest("[data-not-implemented]");
      if (placeholder) { e.preventDefault(); showToast(`${placeholder.dataset.notImplemented} isn't available in this demo.`, "info"); return; }
      const a = e.target.closest("a[href]");
      if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || a.getAttribute("href").startsWith("#")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/pages/")) return;
      e.preventDefault();
      navigate(url.pathname + url.search);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [navigate, showToast]);
  // who may use what, and the phone cards, follow the session and the width
  useEffect(() => {
    ref.current.querySelectorAll("[data-permission]").forEach((n) => { n.hidden = !can(n.dataset.permission); });
    ref.current.querySelectorAll("table.table").forEach((t) => labelTable(t, phone));
  }, [role?.key, userId, phone]);

  return (
    <Frame page={page}>
      <div ref={ref} className="sample-page" style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: MAIN[page] }} />
    </Frame>
  );
}
