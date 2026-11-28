// The sidebar, as ui/sidebar.js + ui/rail.js leave it once drawn: the brand, the person's name (shown in the drawer), the
// sections from config/nav.js (only the items this person may see; a one-page section is a plain link), Sign out (drawer),
// and the footer (one icon in the rail, its two lines in a chip). Above 820px a section's button opens a flyout beside it,
// on hover (with delays), click, tap or the keyboard; at 820px and below the sections expand in place, one at a time, and
// the drawer opens on the section of the page you're on. Links go through the router.
// S1: above 820px the sidebar collapses (the rail, as above) or expands (every item with its label under its group's
// heading, no flyouts): the toggle under the company's mark (shell/navWide.js keeps the choice; design/sidebar.css).
// SD1: the groups are by area (shell/appNav.js SD1_GROUPS). In the expanded sidebar each group's heading folds it, kept per person
// (shell/navFolds.js); the group of the page you're on is always open. A menu search above the groups ("Find a page", "/" or Ctrl+/)
// lists the pages you may open that match; arrows move, Enter opens, Esc clears. In the rail the shortcut goes to the top bar's search.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { APP_NAV as NAV, APP_OTHER_PAGES, openable } from "./appNav.js";
import { can } from "../../../assets/js/core/rbac.js";
import { ICONS, SECTION_ICONS } from "../../../assets/js/ui/icons.js";
import { activeHeadcount } from "../../../assets/js/data/store.js";
import { managesAnyone, pendingFor } from "../../../assets/js/data/expenses-store.js";
import { isManager as hasReports } from "../../../assets/js/data/reporting.js";
import { waitingCount } from "../data/waiting.js";
import { useData, useSession, signOutNow } from "../data/hooks.js";
import { pageUrl, ABOUT } from "../routes.js";
import { useMedia, RAIL, inRail as railWidth, initialsFrom } from "./media.js";
import { useNavWide, setWide } from "./navWide.js";
import { useFolded, setFolded } from "./navFolds.js";
import { COMPANY } from "../data/company.js";
import { CompanyMark } from "./Brand.jsx";
import "../design/navfind.css";   // SD1

const OPEN_MS = 120, CLOSE_MS = 250, EDGE = 8;
// The flyouts work only in the collapsed rail (S1: expanded lists every item in place).
const inRail = () => railWidth() && !document.documentElement.hasAttribute("data-nav-wide");
const CHEVRON_LEFT = "M15 18l-6-6 6-6", CHEVRON_RIGHT = "M9 18l6-6-6-6", CHEVRON_DOWN = "M6 9l6 6 6-6";
const FIND = "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5";
export const SIGN_OUT_ICON = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

// ui/sidebar.js navItemHref / navItemVisible, for the signed-in person.
export const navItemHref = (item, role) => (item.href === "@landing" ? role?.landing ?? "auth/login.html" : item.href);
function isManagerNow(userId, roleKey) {
  return managesAnyone(userId) || pendingFor(userId, roleKey).length > 0;   // IT2: the old asset-request chain is retired: it no longer makes anyone a manager here
}
export function navItemVisible(item, userId, roleKey) {
  return (item.permission ? can(item.permission) : false) || (item.anyOf ?? []).some((p) => can(p)) || (item.alsoForManagers && isManagerNow(userId, roleKey)) || (item.alsoForReports && hasReports(userId));
}
// SD1: the pages the menu search may offer: every sidebar item the person sees, then the pages found by search only, each once.
export function findablePages(userId, role) {
  const fromNav = NAV.flatMap((g) => g.items.filter((i) => navItemVisible(i, userId, role?.key)).map((i) => ({ label: i.label, group: g.group, href: navItemHref(i, role) })));
  const seen = new Set(fromNav.map((p) => p.href));
  const others = APP_OTHER_PAGES.filter((p) => !p.needs && !seen.has(p.href) && openable(p.href)).map((p) => ({ label: p.label, group: p.group, href: p.href }));
  return [...fromNav, ...others];
}

const Icon = ({ d, solid }) => (
  <svg className={`icon${solid ? " icon--solid" : ""}`} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

function MenuSearch({ userId, role, inputRef }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const pages = useData(() => findablePages(userId, role), [userId, role?.key]);
  const query = q.trim().toLowerCase();
  const hits = query ? pages.filter((p) => p.label.toLowerCase().includes(query) || p.group.toLowerCase().includes(query)).slice(0, 8) : [];
  const go = (p) => { setQ(""); navigate(pageUrl(p.href)); };
  const onKeyDown = (e) => {
    if (e.key === "Escape") { if (q) { e.preventDefault(); e.stopPropagation(); setQ(""); } else inputRef.current?.blur(); }
    else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && hits.length) { e.preventDefault(); setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length); }
    else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active]); }
  };
  return (
    <div className="nav__find" role="search">
      <label className="nav__find-box">
        <Icon d={FIND} />
        <input ref={inputRef} type="search" id="menu-search" placeholder="Find a page" aria-label="Find a page in the menu" value={q} autoComplete="off"
          role="combobox" aria-expanded={String(Boolean(query))} aria-controls="menu-search-results" aria-autocomplete="list"
          aria-activedescendant={hits[active] ? `menu-hit-${active}` : undefined}
          onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKeyDown} />
        <kbd className="nav__find-key" aria-hidden="true">/</kbd>
      </label>
      {query && (
        <ul className="nav__find-list" id="menu-search-results" role="listbox" aria-label="Pages found">
          {hits.map((p, i) => (
            <li key={p.href} id={`menu-hit-${i}`} role="option" aria-selected={String(i === active)} className={i === active ? "is-active" : undefined}>
              <Link to={pageUrl(p.href)} tabIndex={-1} onClick={() => setQ("")}><span>{p.label}</span><small>{p.group}</small></Link>
            </li>
          ))}
          {!hits.length && <li className="nav__find-none" role="option" aria-disabled="true" aria-selected="false">No page called that</li>}
        </ul>
      )}
    </div>
  );
}

export default function Sidebar({ page, drawerOpen, closeDrawer }) {
  const { user, role, userId } = useSession();
  const navigate = useNavigate();
  const rail = useMedia(RAIL);
  const wide = useNavWide();
  const folded = useFolded(userId);
  const findRef = useRef(null);
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
  const listsInPlace = rail && wide;   // the expanded sidebar: every group in place, folding by its heading

  // fit(): the rail starts with none open; the drawer opens on the current page's section (not a one-page one).
  useEffect(() => {
    const current = sections.find((s) => s.index === currentIndex);
    setOpen(!rail && current && current.items.length > 1 ? currentIndex : null);
  }, [rail, wide, currentIndex]);   // eslint-disable-line react-hooks/exhaustive-deps

  // SD1: "/" (outside a field) and Ctrl+/ go to the menu search; in the collapsed rail, to the top bar's search instead.
  useEffect(() => {
    const onKey = (e) => {
      const slash = e.key === "/" && !e.altKey && !e.metaKey;
      if (!slash) return;
      const typing = e.target.closest?.("input, textarea, select, [contenteditable='true']");
      if (!e.ctrlKey && typing) return;
      if (document.querySelector(".modal.is-open")) return;
      const box = findRef.current;
      const visible = box && box.offsetParent !== null;
      e.preventDefault();
      if (visible) { box.focus(); box.select(); return; }
      const top = document.querySelector("#topbar-search input");
      if (top && top.offsetParent !== null) { top.focus(); top.select(); }
      else document.querySelector(".topbar__search-open")?.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
      <div className="sidebar__head">
        <Link className="sidebar__brand" to={pageUrl(ABOUT)} title={COMPANY.name}>
          <CompanyMark />
          <span className="sidebar__brand-name">{COMPANY.name}</span>
        </Link>
        {/* S1: collapse / expand (desktop only; hidden in the phone's drawer) */}
        <button type="button" className="sidebar__toggle" id="sidebar-toggle" aria-label={wide ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={String(wide)}
          aria-controls="sidebar__nav" data-label={wide ? undefined : "Expand sidebar"} onClick={() => setWide(!wide)}>
          <Icon d={wide ? CHEVRON_LEFT : CHEVRON_RIGHT} />
        </button>
      </div>
      {user && (
        <div className="nav__profile">
          <span className="nav__profile-avatar" aria-hidden="true">{initialsFrom(user.name)}</span>
          <span className="nav__profile-text"><strong>{user.name}</strong><span>{user.designation ?? ""}</span></span>
        </div>
      )}
      {user && <MenuSearch userId={userId} role={role} inputRef={findRef} />}
      <nav className="sidebar__nav" id="sidebar__nav" aria-label="Main navigation" ref={navRef}
        onPointerOver={onPointerOver} onPointerOut={onPointerOut} onKeyDown={onKeyDown} onBlur={onFocusOut}
        onPointerDown={(e) => { const t = e.target.closest(".nav__trigger"); if (t) pointer.current[indexOf(sectionOf(t))] = e.pointerType; }}>
        {sections.map(({ group, index, items }) => {
          const single = items.length === 1;
          const current = index === currentIndex;
          const isFolded = listsInPlace && !single && !current && folded.includes(group.group);
          return (
            <div key={index} data-section={index} data-group={group.group}
              className={`nav__section${single ? " nav__section--single" : ""}${current ? " is-current" : ""}${open === index ? " is-open" : ""}${isFolded ? " is-folded" : ""}`}>
              {!single && (
                <button type="button" className="nav__trigger" data-label={group.group} aria-label={group.group}
                  aria-expanded={String(open === index)} aria-controls={`nav-panel-${index}`} onClick={(e) => onTrigger(e, index)}>
                  <Icon d={group.iconPath ?? SECTION_ICONS[group.icon]} solid /><span className="nav__trigger-label">{group.group}</span>
                </button>
              )}
              <div className="nav__panel" id={single ? undefined : `nav-panel-${index}`}>
                {single || !listsInPlace ? <div className="nav__group-title">{group.group}</div> : (
                  <button type="button" className="nav__group-title nav__group-fold" aria-expanded={String(!isFolded)} aria-controls={`nav-items-${index}`}
                    disabled={current || undefined} title={current ? "The group of the page you're on stays open" : undefined}
                    onClick={() => setFolded(userId, group.group, !isFolded)}>
                    <span>{group.group}</span><Icon d={CHEVRON_DOWN} />
                  </button>
                )}
                <div className="nav__items" id={`nav-items-${index}`} hidden={isFolded || undefined}>
                  {items.map((item) => {
                    const href = navItemHref(item, role), active = href === page;
                    return (
                      <Link key={item.label} className={`nav__item${active ? " is-active" : ""}`} to={pageUrl(href)}
                        aria-current={active ? "page" : undefined} data-label={single ? item.label : undefined}
                        data-count-waiting={item.countWaiting ? "" : undefined}>
                        <Icon d={single ? group.iconPath ?? SECTION_ICONS[group.icon] : item.iconPath ?? ICONS[item.icon] ?? ICONS.default} solid={single} />{item.label}
                        {item.countWaiting && waiting > 0 && <span className="nav__count">{String(waiting)}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <button type="button" className="nav__signout" onClick={() => { signOutNow(); navigate(pageUrl("auth/login.html")); }}>
        <Icon d={SIGN_OUT_ICON} />Sign out
      </button>
      <div className="sidebar__footer" role="group" aria-label={footerText} tabIndex={rail && !wide ? 0 : undefined}>
        <Icon d={SECTION_ICONS.company} solid />
        <span className="sidebar__footer-text">
          <strong>{COMPANY.shortName}</strong>{" "}
          <span id="sidebar-headcount">{`${headcount} ${headcount === 1 ? "employee" : "employees"}`}</span>
        </span>
      </div>
    </aside>
  );
}
