// The sidebar, as ui/sidebar.js + ui/rail.js leave it once drawn: the brand, the person's name (shown in the drawer), the
// sections from config/nav.js (only the items this person may see; a one-page section is a plain link), Sign out (drawer),
// and the footer (one icon in the rail, its two lines in a chip). Above 820px a section's button opens a flyout beside it,
// on hover (with delays), click, tap or the keyboard; at 820px and below the sections expand in place, one at a time, and
// the drawer opens on the section of the page you're on. Links go through the router.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NAV } from "../../../assets/js/config/nav.js";
import { can } from "../../../assets/js/core/rbac.js";
import { ICONS, SECTION_ICONS } from "../../../assets/js/ui/icons.js";
import { activeHeadcount } from "../../../assets/js/data/store.js";
import { managesAnyone, pendingFor } from "../../../assets/js/data/expenses-store.js";
import { isManager as hasReports } from "../../../assets/js/data/reporting.js";
import { pendingFor as pendingAssetRequests } from "../../../assets/js/data/asset-requests-store.js";
import { waitingCount } from "../../../assets/js/ui/waiting.js";
import { useData, useSession, signOutNow } from "../data/hooks.js";
import { pageUrl, ABOUT } from "../routes.js";
import { useMedia, RAIL, inRail, initialsFrom } from "./media.js";
import { COMPANY } from "../data/company.js";
import { CompanyMark } from "./Brand.jsx";

const OPEN_MS = 120, CLOSE_MS = 250, EDGE = 8;
export const SIGN_OUT_ICON = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

// ui/sidebar.js navItemHref / navItemVisible, for the signed-in person.
export const navItemHref = (item, role) => (item.href === "@landing" ? role?.landing ?? "auth/login.html" : item.href);
function isManagerNow(userId, roleKey) {
  return managesAnyone(userId) || pendingFor(userId, roleKey).length > 0 || pendingAssetRequests(userId, roleKey).length > 0;
}
export function navItemVisible(item, userId, roleKey) {
  return can(item.permission) || (item.alsoForManagers && isManagerNow(userId, roleKey)) || (item.alsoForReports && hasReports(userId));
}

const Icon = ({ d, solid }) => (
  <svg className={`icon${solid ? " icon--solid" : ""}`} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

export default function Sidebar({ page, drawerOpen, closeDrawer }) {
  const { user, role, userId } = useSession();
  const navigate = useNavigate();
  const rail = useMedia(RAIL);
  const sections = useData(() => NAV.map((group, index) => {
    const items = group.items.filter((item) => navItemVisible(item, userId, role?.key));
    return { group, index, items };
  }).filter((s) => s.items.length), [userId, role?.key]);
  const waiting = useData(() => waitingCount(userId, role?.key), [userId, role?.key]);
  const headcount = useData(() => activeHeadcount());

  const currentIndex = sections.find((s) => s.items.some((item) => navItemHref(item, role) === page))?.index ?? null;
  const [open, setOpen] = useState(null);
  const navRef = useRef(null), sidebarRef = useRef(null);
  const timers = useRef({ open: 0, close: 0 }), focusFirst = useRef(false), pointer = useRef({});

  // fit(): the rail starts with none open; the drawer opens on the current page's section (not a one-page one).
  useEffect(() => {
    const current = sections.find((s) => s.index === currentIndex);
    setOpen(!rail && current && current.items.length > 1 ? currentIndex : null);
  }, [rail, currentIndex]);   // eslint-disable-line react-hooks/exhaustive-deps

  // An open flyout sits beside its button, moved up if it would run off the window; keyboard opening focuses its first link.
  useLayoutEffect(() => {
    if (open === null) return;
    const section = navRef.current?.querySelector(`[data-section="${open}"]`);
    const trigger = section?.querySelector(".nav__trigger"), panel = section?.querySelector(".nav__panel");
    if (!panel) return;
    panel.style.top = "";
    if (inRail()) {
      const room = window.innerHeight - panel.offsetHeight - EDGE;
      panel.style.top = `${Math.max(EDGE, Math.min(trigger.getBoundingClientRect().top, room))}px`;
    }
    if (focusFirst.current) { focusFirst.current = false; panel.querySelector("a")?.focus(); }
  }, [open]);

  // A click outside, the sidebar's scroll or a resize closes the rail's flyout.
  useEffect(() => {
    const closeRail = (e) => { if (inRail() && !(e.type === "click" && navRef.current?.contains(e.target))) setOpen(null); };
    const sidebar = sidebarRef.current;
    document.addEventListener("click", closeRail);
    sidebar?.addEventListener("scroll", closeRail);
    window.addEventListener("resize", closeRail);
    return () => { document.removeEventListener("click", closeRail); sidebar?.removeEventListener("scroll", closeRail); window.removeEventListener("resize", closeRail); };
  }, []);

  const clear = () => { window.clearTimeout(timers.current.open); window.clearTimeout(timers.current.close); };
  const sectionOf = (n) => n.closest?.(".nav__section");
  const indexOf = (section) => (section ? Number(section.dataset.section) : null);

  const onPointerOver = (e) => {
    if (e.pointerType !== "mouse" || !inRail()) return;
    clear();
    const section = sectionOf(e.target);
    if (section?.querySelector(".nav__trigger")) timers.current.open = window.setTimeout(() => setOpen(indexOf(section)), OPEN_MS);
    else timers.current.close = window.setTimeout(() => setOpen(null), CLOSE_MS);
  };
  const onPointerOut = (e) => {
    if (e.pointerType !== "mouse" || !inRail() || navRef.current.contains(e.relatedTarget)) return;
    window.clearTimeout(timers.current.open);
    timers.current.close = window.setTimeout(() => setOpen(null), CLOSE_MS);
  };
  const onTrigger = (e, index) => {
    clear();
    const isOpen = open === index;
    // A mouse has already opened it by hovering, so its click keeps it open. Touch and keyboard toggle.
    if (isOpen && inRail() && e.detail > 0 && pointer.current[index] === "mouse") return;
    if (isOpen) setOpen(null);
    else { if (inRail() && e.detail === 0) focusFirst.current = true; setOpen(index); }
  };
  const onKeyDown = (e) => {
    if (!inRail()) return;
    const panel = e.target.closest(".nav__section:not(.nav__section--single) .nav__panel");
    if (panel) {
      const links = [...panel.querySelectorAll("a")], i = links.indexOf(e.target);
      const go = { ArrowDown: links[(i + 1) % links.length], ArrowUp: links[(i - 1 + links.length) % links.length], Home: links[0], End: links[links.length - 1] }[e.key];
      if (go) { e.preventDefault(); go.focus(); }
      else if (e.key === "Escape" || e.key === "ArrowLeft") { e.preventDefault(); setOpen(null); sectionOf(panel).querySelector(".nav__trigger").focus(); }
      return;
    }
    const all = [...navRef.current.querySelectorAll(".nav__trigger, .nav__section--single a")], i = all.indexOf(e.target);
    if (i < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); setOpen(null);
      all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length].focus();
    } else if (e.key === "ArrowRight" && e.target.matches(".nav__trigger")) {
      e.preventDefault(); focusFirst.current = true; setOpen(indexOf(sectionOf(e.target)));
    } else if (e.key === "Escape") setOpen(null);
  };
  const onFocusOut = (e) => { if (inRail() && !navRef.current.contains(e.relatedTarget) && document.hasFocus()) setOpen(null); };

  const footerText = `${COMPANY.shortName} ${headcount} ${headcount === 1 ? "employee" : "employees"}`;
  return (
    <aside className={`sidebar${drawerOpen ? " is-open" : ""}`} id="sidebar" ref={sidebarRef}
      onClick={(e) => { if (e.target.closest("a")) closeDrawer(); }}>
      {/* D2a: the company's name (data/company.js), a link to About; the rail shows its mark, the name stays its accessible name */}
      <Link className="sidebar__brand" to={pageUrl(ABOUT)} title={COMPANY.name}>
        <CompanyMark />
        <span className="sidebar__brand-name">{COMPANY.name}</span>
      </Link>
      {user && (
        <div className="nav__profile">
          <span className="nav__profile-avatar" aria-hidden="true">{initialsFrom(user.name)}</span>
          <span className="nav__profile-text"><strong>{user.name}</strong><span>{user.designation ?? ""}</span></span>
        </div>
      )}
      <nav className="sidebar__nav" id="sidebar__nav" aria-label="Main navigation" ref={navRef}
        onPointerOver={onPointerOver} onPointerOut={onPointerOut} onKeyDown={onKeyDown} onBlur={onFocusOut}
        onPointerDown={(e) => { const t = e.target.closest(".nav__trigger"); if (t) pointer.current[indexOf(sectionOf(t))] = e.pointerType; }}>
        {sections.map(({ group, index, items }) => {
          const single = items.length === 1;
          const current = index === currentIndex;
          return (
            <div key={index} data-section={index}
              className={`nav__section${single ? " nav__section--single" : ""}${current ? " is-current" : ""}${open === index ? " is-open" : ""}`}>
              {!single && (
                <button type="button" className="nav__trigger" data-label={group.group} aria-label={group.group}
                  aria-expanded={String(open === index)} aria-controls={`nav-panel-${index}`} onClick={(e) => onTrigger(e, index)}>
                  <Icon d={SECTION_ICONS[group.icon]} solid /><span className="nav__trigger-label">{group.group}</span>
                </button>
              )}
              <div className="nav__panel" id={single ? undefined : `nav-panel-${index}`}>
                <div className="nav__group-title">{group.group}</div>
                {items.map((item) => {
                  const href = navItemHref(item, role), active = href === page;
                  return (
                    <Link key={item.label} className={`nav__item${active ? " is-active" : ""}`} to={pageUrl(href)}
                      aria-current={active ? "page" : undefined} data-label={single ? item.label : undefined}
                      data-count-waiting={item.countWaiting ? "" : undefined}>
                      <Icon d={single ? SECTION_ICONS[group.icon] : ICONS[item.icon] ?? ICONS.default} solid={single} />{item.label}
                      {item.countWaiting && waiting > 0 && <span className="nav__count">{String(waiting)}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <button type="button" className="nav__signout" onClick={() => { signOutNow(); navigate(pageUrl("auth/login.html")); }}>
        <Icon d={SIGN_OUT_ICON} />Sign out
      </button>
      <div className="sidebar__footer" role="group" aria-label={footerText} tabIndex={rail ? 0 : undefined}>
        <Icon d={SECTION_ICONS.company} solid />
        <span className="sidebar__footer-text">
          <strong>{COMPANY.shortName}</strong>{" "}
          <span id="sidebar-headcount">{`${headcount} ${headcount === 1 ? "employee" : "employees"}`}</span>
        </span>
      </div>
    </aside>
  );
}
