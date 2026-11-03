// ui/search.js
// The topbar's search. Jumps to pages and people, and nothing is listed by hand:
//   - pages: the sidebar's items for this person (config/nav.js, ui/sidebar.js)
//     that they can also open (core/guard.js, the rule that sends them to the
//     403 page otherwise)
//   - people: only with users:view and the profile page's route; by name or id
// Ctrl/Cmd+K focuses it; arrow keys and Enter pick a result; Esc closes the list.
// The box is hidden below 820 px (responsive.css), and then Ctrl+K is left alone.
// Built with DOM calls, so names typed into the user form can't inject markup.

import { NAV } from "../config/nav.js";
import { canOpenPage } from "../core/guard.js";
import { can } from "../core/rbac.js";
import { resolvePageLink } from "../core/paths.js";
import { getAllUsers } from "../data/store.js";
import { navItemHref, navItemVisible } from "./sidebar.js";

const PROFILE = "users/user-profile.html";
const MAX_EACH = 5;   // of pages and of people: typing more narrows them

function matchingPages(query) {
  return NAV.flatMap((group) => group.items
    .filter((item) => item.label.toLowerCase().includes(query) && navItemVisible(item) && canOpenPage(navItemHref(item)))
    .map((item) => ({ label: item.label, meta: group.group, href: resolvePageLink(navItemHref(item)) })))
    .slice(0, MAX_EACH);
}

function matchingPeople(query) {
  if (!can("users:view") || !canOpenPage(PROFILE)) return [];
  return getAllUsers()
    .filter((user) => user.name.toLowerCase().includes(query) || user.id.toLowerCase().includes(query))
    .map((user) => ({ label: user.name, meta: user.designation ?? "", href: resolvePageLink(`${PROFILE}?id=${encodeURIComponent(user.id)}`) }))
    .slice(0, MAX_EACH);
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
  box.addEventListener("click", (e) => { if (!e.target.closest("a")) input.focus(); });

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
      if (list.hidden) return;
      e.preventDefault();   // a search box would also clear its text
      close();
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
    if (getComputedStyle(box).display === "none" || document.querySelector(".modal.is-open")) return;
    e.preventDefault();
    input.focus();
    input.select();
  });
}