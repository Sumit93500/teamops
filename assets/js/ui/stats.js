// ui/stats.js
// Filling a stat card (.stat: a .stat__value and the .stat__delta line under
// it). Each page still finds its own cards, by data-stat key, by label text or
// by position, and then calls these, so the value, the line's classes and an
// empty line are handled the same way everywhere. No imports, so any page can
// use it without loading anything else.

// The number (or text such as "–") in the card.
export function setStatValue(stat, value) {
  stat.querySelector(".stat__value").textContent = value;
}

// The line under the number, on a page whose HTML always has one. Its classes
// become stat__delta, plus stat__delta--<tone> for a tone such as "down", and
// its text the note. Returns the line.
export function setStatNote(stat, note, tone = "") {
  const delta = stat.querySelector(".stat__delta");
  delta.className = `stat__delta${tone ? ` stat__delta--${tone}` : ""}`;
  delta.textContent = note;
  return delta;
}

// The line under the number, on a page where it's optional: an empty note
// removes it; otherwise it's added after the number when missing, then set as
// in setStatNote() (no tone).
export function setOptionalStatNote(stat, note) {
  let delta = stat.querySelector(".stat__delta");
  if (!note) {
    delta?.remove();
    return;
  }
  if (!delta) {
    delta = document.createElement("span");
    delta.className = "stat__delta";
    stat.querySelector(".stat__value").after(delta);
  }
  setStatNote(stat, note);
}