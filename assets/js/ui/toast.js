// ui/toast.js
// Shows a temporary message in the bottom-right corner.

function ensureContainer() {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  return container;
}

// A live region only announces what changes after it exists, so every page
// makes it up front rather than with its first toast.
export function initToasts() {
  ensureContainer();
}

export function showToast(message, type = "info", duration = 4000) {
  const container = ensureContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__body">
      <div class="toast__text">${message}</div>
    </div>
    <button class="toast__close" type="button" aria-label="Dismiss">×</button>
  `;

  container.appendChild(toast);

  const remove = () => toast.remove();
  toast.querySelector(".toast__close").addEventListener("click", remove);
  setTimeout(remove, duration);
}