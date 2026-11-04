// ui/rail.js
// The sidebar once ui/sidebar.js has drawn it. Above 820 px it's an icon rail: each
// section's button opens a flyout beside it, on hover (with delays), on click or tap,
// or from the keyboard. At 820 px and below it's the drawer (ui/menu-toggle.js opens
// it): sections expand in place, one at a time, and the person's name and Sign out
// join it. A disclosure, not a menu: a button shows or hides a section's links.

import { getCurrentUser } from "../core/auth.js";
import { SECTION_ICONS } from "./icons.js";
import { initialsFrom, signOutNow } from "./topbar.js";

const OPEN_MS = 120, CLOSE_MS = 250, EDGE = 8;

const inRail = () => Boolean(window.matchMedia?.("(min-width: 821px)").matches);

// The name and designation at the top of the drawer. Text only, so a name can't inject markup.
function renderProfile(sidebar, nav) {
  const user = getCurrentUser();
  if (!user) return;
  const box = document.createElement("div");
  box.className = "nav__profile";
  const avatar = document.createElement("span");
  avatar.className = "nav__profile-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = initialsFrom(user.name);
  const text = document.createElement("span");
  text.className = "nav__profile-text";
  const name = document.createElement("strong");
  name.textContent = user.name;
  const role = document.createElement("span");
  role.textContent = user.designation ?? "";
  text.append(name, role);
  box.append(avatar, text);
  sidebar.insertBefore(box, nav);
}

// The drawer's Sign out: the account menu's own words and icon, and what it does.
function renderSignOut(sidebar, nav) {
  const source = document.querySelector("[data-signout]");
  if (!source) return;
  const row = document.createElement("button");
  row.type = "button";
  row.className = "nav__signout";
  const icon = source.querySelector("svg")?.cloneNode(true);
  if (icon) row.append(icon);
  row.append(source.textContent.trim());
  row.addEventListener("click", signOutNow);
  nav.after(row);
}

// In the rail the footer is one icon, its two lines in a chip on hover or focus.
function renderFooter(footer) {
  if (!footer) return;
  const text = document.createElement("span");
  text.className = "sidebar__footer-text";
  text.append(...footer.childNodes);
  footer.innerHTML = `<svg class="icon icon--solid" viewBox="0 0 24 24" aria-hidden="true"><path d="${SECTION_ICONS.company}"></path></svg>`;
  footer.append(text);
  footer.setAttribute("role", "group");
  footer.setAttribute("aria-label", text.textContent.replace(/\s+/g, " ").trim());
}

export function initRail(sidebar = document.querySelector(".sidebar")) {
  const nav = sidebar?.querySelector(".sidebar__nav");
  if (!nav) return;
  const footer = sidebar.querySelector(".sidebar__footer");
  renderProfile(sidebar, nav);
  renderSignOut(sidebar, nav);
  renderFooter(footer);

  let openTimer = 0, closeTimer = 0;
  const sectionOf = (n) => n.closest?.(".nav__section");
  const openOne = () => nav.querySelector(".nav__section.is-open");
  const stops = () => [...nav.querySelectorAll(".nav__trigger, .nav__section--single a")];

  function close(section = openOne()) {
    if (!section) return;
    section.classList.remove("is-open");
    section.querySelector(".nav__trigger")?.setAttribute("aria-expanded", "false");
  }

  function open(section) {
    if (section.classList.contains("is-open")) return;
    close();
    section.classList.add("is-open");
    const trigger = section.querySelector(".nav__trigger"), panel = section.querySelector(".nav__panel");
    trigger.setAttribute("aria-expanded", "true");
    panel.style.top = "";
    if (!inRail()) return;
    // Beside its icon, and moved up if it would run off the window.
    const room = window.innerHeight - panel.offsetHeight - EDGE;
    panel.style.top = `${Math.max(EDGE, Math.min(trigger.getBoundingClientRect().top, room))}px`;
  }

  // The drawer opens on the section of the page you're on; the rail starts with none open.
  function fit() {
    close();
    const current = nav.querySelector(".nav__section.is-current:not(.nav__section--single)");
    if (!inRail() && current) open(current);
    if (footer) {
      if (inRail()) footer.tabIndex = 0;
      else footer.removeAttribute("tabindex");
    }
  }
  fit();
  window.matchMedia?.("(min-width: 821px)").addEventListener?.("change", fit);

  nav.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse" || !inRail()) return;
    window.clearTimeout(closeTimer);
    window.clearTimeout(openTimer);
    const section = sectionOf(e.target);
    if (section?.querySelector(".nav__trigger")) openTimer = window.setTimeout(() => open(section), OPEN_MS);
    else closeTimer = window.setTimeout(() => close(), CLOSE_MS);
  });
  nav.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse" || !inRail() || nav.contains(e.relatedTarget)) return;
    window.clearTimeout(openTimer);
    closeTimer = window.setTimeout(() => close(), CLOSE_MS);
  });
  nav.addEventListener("pointerdown", (e) => {
    const trigger = e.target.closest(".nav__trigger");
    if (trigger) trigger.dataset.pointer = e.pointerType;
  });
  nav.addEventListener("click", (e) => {
    const trigger = e.target.closest(".nav__trigger");
    if (!trigger) return;
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    const section = sectionOf(trigger), isOpen = section.classList.contains("is-open");
    // A mouse has already opened it by hovering, so its click keeps it open. Touch and keyboard toggle.
    if (isOpen && inRail() && e.detail > 0 && trigger.dataset.pointer === "mouse") return;
    if (isOpen) close(section);
    else {
      open(section);
      if (inRail() && e.detail === 0) section.querySelector(".nav__panel a")?.focus();
    }
  });
  nav.addEventListener("keydown", (e) => {
    if (!inRail()) return;
    const panel = e.target.closest(".nav__section:not(.nav__section--single) .nav__panel");
    if (panel) {
      const links = [...panel.querySelectorAll("a")], i = links.indexOf(e.target);
      const go = { ArrowDown: links[(i + 1) % links.length], ArrowUp: links[(i - 1 + links.length) % links.length], Home: links[0], End: links[links.length - 1] }[e.key];
      if (go) {
        e.preventDefault();
        go.focus();
      } else if (e.key === "Escape" || e.key === "ArrowLeft") {
        e.preventDefault();
        const section = sectionOf(panel);
        close(section);
        section.querySelector(".nav__trigger").focus();
      }
      return;
    }
    const all = stops(), i = all.indexOf(e.target);
    if (i < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      close();
      all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length].focus();
    } else if (e.key === "ArrowRight" && e.target.matches(".nav__trigger")) {
      e.preventDefault();
      const section = sectionOf(e.target);
      open(section);
      section.querySelector(".nav__panel a")?.focus();
    } else if (e.key === "Escape") close();
  });
  nav.addEventListener("focusout", (e) => {
    if (inRail() && !nav.contains(e.relatedTarget) && document.hasFocus()) close();
  });
  document.addEventListener("click", (e) => {
    if (inRail() && !nav.contains(e.target)) close();
  });
  sidebar.addEventListener("scroll", () => {
    if (inRail()) close();
  });
  window.addEventListener("resize", () => {
    if (inRail()) close();
  });
}