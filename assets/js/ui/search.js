// ui/search.js
// The topbar's search. Jumps to pages and people, and nothing is listed by hand:
//   - pages: the sidebar's items for this person (config/nav.js, ui/sidebar.js)
//     that they can also open (core/guard.js, the rule that sends them to the
//     403 page otherwise), then the pages the sidebar doesn't list (OTHER_PAGES)
//     that they can open and that open without a link parameter
//   - people: only with users:view and the profile page's route; by name or id
// Ctrl/Cmd+K focuses it; arrow keys and Enter pick a result; Esc closes the list.
// At 820 px and under the box is hidden (responsive.css) and an icon in the topbar
// opens it across the topbar (layout/phone.css): Ctrl+K opens it there too, a second
// Esc or its close button shuts it and focus goes back to the icon, and leaving it
// shuts it. Reopened, it shows what was typed, selected.
// Built with DOM calls, so names typed into the user form can't inject markup.

import { NAV, OTHER_PAGES } from "../config/nav.js";
import { canOpenPage } from "../core/guard.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { getAllUsers } from "../data/store.js";
import { navItemHref, navItemVisible } from "./sidebar.js";

const PROFILE = "users/user-profile.html";
const MAX_EACH = 5;   // of pages and of people: typing more narrows them
const SVG = "http://www.w3.org/2000/svg";
const CLOSE_PATH = "M6 6l12 12M18 6 6 18";   // the dialogs' close icon

function matchingPages(query) {
  const inNav = NAV.flatMap((group) => group.items
    .filter((item) => item.label.toLowerCase().includes(query) && navItemVisible(item) && canOpenPage(navItemHref(item)))
    .map((item) => ({ label: item.label, meta: group.group, href: resolvePageLink(navItemHref(item)) })));
  const others = OTHER_PAGES
    .filter((page) => !page.needs && page.label.toLowerCase().includes(query) && canOpenPage(page.href))
    .map((page) => ({ label: page.label, meta: page.group, href: resolvePageLink(page.href) }));
  return [...inNav, ...others].slice(0, MAX_EACH);
}

function matchingPeople(query) {
  if (!can("users:view") || !canOpenPage(PROFILE)) return [];
  return getAllUsers()
    .filter((user) => user.name.toLowerCase().includes(query) || user.id.toLowerCase().includes(query))
    .map((user) => ({ label: user.name, meta: user.designation ?? "", href: resolvePageLink(`${PROFILE}?id=${encodeURIComponent(user.id)}`) }))
    .slice(0, MAX_EACH);
}

function iconButton(className, name, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `topbar__icon-btn ${className}`;
  button.setAttribute("aria-label", name);
  button.append(icon);
  return button;
}

function closeIcon() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", CLOSE_PATH);
  svg.append(path);
  return svg;
}

function buildOption({ label, meta, href }, index) {
  const option = document.createElement("a");
  option.className = "dropdown__item";
  option.id = `search-option-${index}`;
  option.href = href;
  option.tabIndex = -1;
  option.setAttribute("role", "option");
  const name = document.createElement("span");
  name.textContent = label;
  const where = document.createElement("span");
  where.className = "text-xs text-muted";
  where.textContent = meta;
  option.append(name, where);
  return option;
}

export function renderSearch() {
  const label = document.querySelector(".topbar__search");
  const input = label?.querySelector("input");
  if (!input) return;

  // A list can't sit inside a <label>: the box becomes a <div> with the same class.
  const box = document.createElement("div");
  box.className = label.className;
  box.append(...label.childNodes);
  label.replaceWith(box);
  box.id = "topbar-search";
  box.addEventListener("click", (e) => { if (!e.target.closest("a, button")) input.focus(); });

  // At 820 px and under: the icon that opens the box, and the box's close button (both hidden wider, phone.css)
  const topbar = box.closest(".topbar");
  const opener = iconButton("topbar__search-open", "Search", box.querySelector("svg")?.cloneNode(true) ?? closeIcon());
  opener.setAttribute("aria-controls", box.id);
  opener.setAttribute("aria-expanded", "false");
  const shut = iconButton("topbar__search-close", "Close search", closeIcon());
  box.append(shut);
  topbar?.querySelector(".topbar__actions")?.prepend(opener);
  const searching = () => Boolean(topbar?.classList.contains("is-searching"));

  function openBox() {
    topbar?.classList.add("is-searching");
    opener.setAttribute("aria-expanded", "true");
    input.focus();   // in the tap itself, so a phone raises its keyboard
    input.select();
  }
  function shutBox(refocus) {
    if (!searching()) return;
    close();
    topbar.classList.remove("is-searching");
    opener.setAttribute("aria-expanded", "false");
    if (refocus) opener.focus();
  }
  opener.addEventListener("click", openBox);
  // Pressing it mustn't take focus from the box first, which would shut the box before the click lands.
  shut.addEventListener("mousedown", (e) => e.preventDefault());
  shut.addEventListener("click", () => shutBox(true));
  box.addEventListener("focusout", (e) => { if (!box.contains(e.relatedTarget)) shutBox(false); });

  input.placeholder = "Search";
  input.setAttribute("role", "combobox");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "search-results");
  input.setAttribute("aria-expanded", "false");

  const list = document.createElement("div");
  list.className = "dropdown__menu";
  list.id = "search-results";
  list.hidden = true;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Search results");
  // Pressing on a result mustn't take focus from the box, which would close the list before the click lands.
  list.addEventListener("mousedown", (e) => e.preventDefault());
  box.append(list);

  const options = () => [...list.querySelectorAll("a")];
  const activeOption = () => list.querySelector("a.is-active");

  function setActive(option) {
    activeOption()?.classList.remove("is-active");
    options().forEach((o) => o.setAttribute("aria-selected", String(o === option)));
    option?.classList.add("is-active");
    if (option) input.setAttribute("aria-activedescendant", option.id);
    else input.removeAttribute("aria-activedescendant");
  }

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setActive(null);
  }

  function draw() {
    const query = input.value.trim().toLowerCase();
    if (!query) { close(); return; }
    const results = [...matchingPages(query), ...matchingPeople(query)];
    list.replaceChildren(...results.map(buildOption));
    if (!results.length) {
      const none = document.createElement("div");
      none.className = "dropdown__label";
      none.setAttribute("role", "option");
      none.setAttribute("aria-disabled", "true");
      none.textContent = "No matches";
      list.append(none);
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(options()[0] ?? null);   // what Enter would open, shown before it's pressed
  }

  input.addEventListener("input", draw);
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (list.hidden && !searching()) return;
      e.preventDefault();   // a search box would also clear its text
      if (list.hidden) shutBox(true);
      else close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) draw();
      const all = options();
      if (!all.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(all[(all.indexOf(activeOption()) + step + all.length) % all.length]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      activeOption()?.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "k") return;
    if (document.querySelector(".modal.is-open")) return;
    if (getComputedStyle(box).display === "none") {
      if (getComputedStyle(opener).display === "none") return;   // no search on this screen at all
      e.preventDefault();
      openBox();
      return;
    }
    e.preventDefault();
    input.focus();
    input.select();
  });
}