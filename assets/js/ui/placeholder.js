// ui/placeholder.js
// Buttons marked data-not-implemented="Label" show an info toast instead of
// doing nothing. preventDefault() also stops a submit button from reloading
// the page and losing what was typed.

import { showToast } from "./toast.js";

export function initPlaceholders(root = document) {
  root.querySelectorAll("[data-not-implemented]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(`${el.dataset.notImplemented} isn't available in this demo.`, "info");
    });
  });
}