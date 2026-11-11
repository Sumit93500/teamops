// The sign-in and error pages (pages/auth/*.html, pages/errors/*.html), round 3. Their <main> is the old page's own markup, read at
// build time, so the words and layout stay in one place; what their scripts did is done here, on that markup:
//   - every page: the password eye (ui/password-toggle.js), the 6 code boxes (ui/otp.js), "isn't available in this demo" on
//     [data-not-implemented] (ui/placeholder.js), and links to other pages through the router;
//   - login: the demo role buttons and the form sign in, then the role's landing page (pages/login.js);
//   - reset-password: "Passwords don't match." under the second field, else the info toast (pages/reset-password.js);
//   - two-factor: "Enter all 6 digits of the code.", else the toast and, 1.2 s later, Admin's sign-in (pages/two-factor.js);
//   - an error page's "Go to dashboard" is the signed-in person's own landing page (app.js, round 14E part 3), written into
//     the markup before it is drawn.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { initPasswordToggles } from "../../../assets/js/ui/password-toggle.js";
import { initOtpInputs } from "../../../assets/js/ui/otp.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { signInAs, useSession } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";

const RAW = import.meta.glob(["../../../pages/auth/*.html", "../../../pages/errors/*.html"], { query: "?raw", import: "default", eager: true });
const MAIN = Object.fromEntries(Object.entries(RAW).map(([file, html]) => {
  const m = html.match(/<main class="auth"( style="([^"]*)")?>([\s\S]*)<\/main>/);
  return [file.replace(/^.*\/pages\//, ""), { style: m[2] ?? null, html: m[3] }];
}));
const styleObject = (css) => (css ? Object.fromEntries(css.split(";").filter((s) => s.trim()).map((s) => {
  const [k, v] = s.split(":").map((x) => x.trim());
  return [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v];
})) : undefined);

const DEMO_USERS = {
  admin: { name: "Aarav Mehta", id: "EMP-1001" },
  hr: { name: "Priya Nair", id: "EMP-1003" },
  fin: { name: "Kabir Shah", id: "EMP-1008" },
  emp: { name: "Arjun Kapoor", id: "EMP-1105" },
};

// A form error under a field, as the old scripts add it.
function showError(form, field, describe, id, message) {
  form.querySelector(".form-error")?.remove();
  const error = document.createElement("span");
  error.className = "form-error"; error.id = id; error.textContent = message;
  field.closest(".form-field").appendChild(error);
  describe.setAttribute("aria-describedby", id);
}
const clearError = (form) => form.querySelector(".form-error")?.remove();

export default function PublicPage({ page }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const showToast = useToast();
  const { role, user } = useSession();
  const { style, html } = MAIN[page];
  const landing = role && user ? role.landing : null;
  const markup = page.startsWith("errors/") && landing ? html.replace('href="../dashboard/admin.html"', `href="../${landing}"`) : html;

  useEffect(() => {
    const root = ref.current;
    const goLanding = (roleKey) => navigate(pageUrl(ROLES[roleKey].landing));
    const signInDemo = (roleKey) => { signInAs(roleKey, DEMO_USERS[roleKey].name, DEMO_USERS[roleKey].id); goLanding(roleKey); };
    const cleanups = [];
    const on = (node, type, fn) => { node?.addEventListener(type, fn); cleanups.push(() => node?.removeEventListener(type, fn)); };

    on(root, "click", (e) => {
      const placeholder = e.target.closest("[data-not-implemented]");
      if (placeholder) { e.preventDefault(); showToast(`${placeholder.dataset.notImplemented} isn't available in this demo.`, "info"); return; }
      const demo = e.target.closest("[data-demo-role]");
      if (demo) { e.preventDefault(); if (ROLES[demo.dataset.demoRole]) signInDemo(demo.dataset.demoRole); return; }
      const a = e.target.closest("a[href]");
      if (!a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/pages/") || a.getAttribute("href") === "#") return;
      e.preventDefault();
      navigate(url.pathname + url.search);
    });

    const form = root.querySelector("form");
    if (page === "auth/login.html") on(root.querySelector(".auth__panel form"), "submit", (e) => { e.preventDefault(); signInDemo("admin"); });
    if (page === "auth/reset-password.html" && form) {
      on(form, "submit", (e) => {
        e.preventDefault();
        if (form.elements.new.value !== form.elements.confirm.value) {
          showError(form, form.elements.confirm, form.elements.confirm, `${form.elements.confirm.id}-error`, "Passwords don't match.");
          form.elements.confirm.focus();
          return;
        }
        clearError(form);
        showToast("Passwords aren't part of OfficeOS yet: nothing was reset.", "info");
      });
      on(form.elements.confirm, "input", () => clearError(form));
    }
    if (page === "auth/two-factor.html" && form) {
      const inputs = [...root.querySelectorAll(".otp__input")];
      let timer = 0;
      on(form, "submit", (e) => {
        e.preventDefault();
        const firstEmpty = inputs.find((input) => !input.value.trim());
        if (firstEmpty) {
          const group = firstEmpty.closest(".otp");
          showError(form, group, group, "otp-error", "Enter all 6 digits of the code.");
          firstEmpty.focus();
          return;
        }
        clearError(form);
        showToast("Codes aren't checked in this demo: signing in as Aarav Mehta (Admin).", "info");
        timer = window.setTimeout(() => signInDemo("admin"), 1200);
      });
      inputs.forEach((input) => on(input, "input", () => clearError(form)));
      cleanups.push(() => window.clearTimeout(timer));
    }
    // Once per mount of the markup: StrictMode runs effects twice in dev, and two listeners would cancel out.
    if (!root.dataset.wired) { initPasswordToggles(root); initOtpInputs(root); root.dataset.wired = "1"; }
    return () => cleanups.forEach((c) => c());
  }, [page, navigate, showToast]);

  return <main className="auth" style={styleObject(style)} ref={ref} key={page} dangerouslySetInnerHTML={{ __html: markup }} />;
}
