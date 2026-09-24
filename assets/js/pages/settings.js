// pages/settings.js
// Runs on settings.html. Scrolls to a section when its sidebar link is clicked.

document.querySelectorAll(".settings__nav .settings__link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "smooth" });

    document.querySelectorAll(".settings__nav .settings__link").forEach((l) => l.classList.remove("is-active"));
    link.classList.add("is-active");
  });
});