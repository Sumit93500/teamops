// The topbar's search (ui/search.js): pages the person may open (sidebar items, then config/nav.js OTHER_PAGES), and
// people for whoever may view users, 5 of each; arrows move, Enter opens, Esc closes the list and then the box; Ctrl/Cmd+K
// focuses it. Below the topbar's width the box hides behind the search-open button (topbar.is-searching). Results open
// through the router.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV, OTHER_PAGES } from "../../../assets/js/config/nav.js";
import { canOpenPage } from "../../../assets/js/core/guard.js";
import { can } from "../../../assets/js/core/rbac.js";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { useSession } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { navItemHref, navItemVisible } from "./Sidebar.jsx";

const PROFILE = "users/user-profile.html";
const MAX_EACH = 5;
export const SEARCH_ICON = <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const CLOSE_ICON = <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;

function results(query, userId, role) {
  const inNav = NAV.flatMap((group) => group.items
    .filter((item) => item.label.toLowerCase().includes(query) && navItemVisible(item, userId, role?.key) && canOpenPage(navItemHref(item, role)))
    .map((item) => ({ label: item.label, meta: group.group, to: pageUrl(navItemHref(item, role)) })));
  const others = OTHER_PAGES
    .filter((page) => !page.needs && page.label.toLowerCase().includes(query) && canOpenPage(page.href))
    .map((page) => ({ label: page.label, meta: page.group, to: pageUrl(page.href) }));
  const people = !can("users:view") || !canOpenPage(PROFILE) ? [] : getAllUsers()
    .filter((u) => u.name.toLowerCase().includes(query) || u.id.toLowerCase().includes(query))
    .map((u) => ({ label: u.name, meta: u.designation ?? "", to: `${pageUrl(PROFILE)}?id=${encodeURIComponent(u.id)}` }))
    .slice(0, MAX_EACH);
  return [...[...inNav, ...others].slice(0, MAX_EACH), ...people];
}

// The opener lives in the topbar's actions; the box in the topbar. Both share the state passed down from Topbar.
export function SearchOpener({ searching, open, openerRef }) {
  return (
    <button type="button" className="topbar__icon-btn topbar__search-open" aria-label="Search" aria-controls="topbar-search"
      aria-expanded={String(searching)} ref={openerRef} onClick={open}>{SEARCH_ICON}</button>
  );
}

export function SearchBox({ searching, setSearching, openerRef, inputRef }) {
  const { userId, role } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [list, setList] = useState(null);   // null: closed; else the results
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  const close = () => { setList(null); setActive(-1); };
  const draw = (value) => {
    const q = value.trim().toLowerCase();
    if (!q) { close(); return; }
    const r = results(q, userId, role);
    setList(r); setActive(r.length ? 0 : -1);
  };
  const shut = (refocus) => {
    if (!searching) return;
    close(); setSearching(false);
    if (refocus) openerRef.current?.focus();
  };
  const go = (r) => { close(); setQuery(""); setSearching(false); navigate(r.to); };

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "k") return;
      if (document.querySelector(".modal.is-open")) return;
      const box = boxRef.current, opener = openerRef.current;
      if (getComputedStyle(box).display === "none") {
        if (!opener || getComputedStyle(opener).display === "none") return;
        e.preventDefault(); setSearching(true); inputRef.current.focus(); inputRef.current.select();
        return;
      }
      e.preventDefault(); inputRef.current.focus(); inputRef.current.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openerRef, inputRef, setSearching]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (!list && !searching) return;
      e.preventDefault();
      if (!list) shut(true); else close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const r = list ?? (draw(query), results(query.trim().toLowerCase(), userId, role));
      if (!r.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (list ? (i + step + r.length) % r.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (list && active >= 0) go(list[active]);
    }
  };

  return (
    <div className="topbar__search" id="topbar-search" ref={boxRef}
      onClick={(e) => { if (!e.target.closest("a, button")) inputRef.current.focus(); }}
      onBlur={(e) => { if (!boxRef.current.contains(e.relatedTarget)) shut(false); }}>
      {SEARCH_ICON}
      <input type="search" placeholder="Search" aria-label="Search" ref={inputRef} value={query}
        role="combobox" autoComplete="off" aria-autocomplete="list" aria-controls="search-results" aria-expanded={String(Boolean(list))}
        aria-activedescendant={list && active >= 0 ? `search-option-${active}` : undefined}
        onChange={(e) => { setQuery(e.target.value); draw(e.target.value); }} onBlur={close} onKeyDown={onKeyDown} />
      <kbd>Ctrl K</kbd>
      <button type="button" className="topbar__icon-btn topbar__search-close" aria-label="Close search"
        onMouseDown={(e) => e.preventDefault()} onClick={() => shut(true)}>{CLOSE_ICON}</button>
      <div className="dropdown__menu" id="search-results" hidden={!list} role="listbox" aria-label="Search results" onMouseDown={(e) => e.preventDefault()}>
        {list && list.map((r, i) => (
          <a key={`${r.to}${i}`} className={`dropdown__item${i === active ? " is-active" : ""}`} id={`search-option-${i}`} href={r.to} tabIndex={-1}
            role="option" aria-selected={String(i === active)} onClick={(e) => { e.preventDefault(); go(r); }}>
            <span>{r.label}</span><span className="text-xs text-muted">{r.meta}</span>
          </a>
        ))}
        {list && !list.length && <div className="dropdown__label" role="option" aria-disabled="true">No matches</div>}
      </div>
    </div>
  );
}
