// ui/tabs.js
// Switches which .tabs__tab is active, and shows/hides matching .tab-panel elements.

export function initTabs(root = document) {
  root.querySelectorAll(".tabs").forEach((tabGroup) => {
    const tabs = tabGroup.querySelectorAll(".tabs__tab");

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");

        const panels = tabGroup.parentElement?.querySelectorAll(".tab-panel");
        if (panels) {
          panels.forEach((panel, i) => {
            panel.hidden = i !== index;
          });
        }
      });
    });
  });
}