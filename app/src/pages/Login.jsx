// Sign in (pages/auth/login.html + assets/js/pages/login.js). Its markup is the old page's <main>, read as
// text at build time, so the words stay in one place until the sign-in round; the demo role buttons and the
// form sign in as login.js does, then open the role's landing page.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import loginHtml from "../../../pages/auth/login.html?raw";
import { signInAs } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { initPasswordToggles } from "../../../assets/js/ui/password-toggle.js";

const DEMO_USERS = {
  admin: { name: "Aarav Mehta", id: "EMP-1001" },
  hr: { name: "Priya Nair", id: "EMP-1003" },
  fin: { name: "Kabir Shah", id: "EMP-1008" },
  emp: { name: "Arjun Kapoor", id: "EMP-1105" },
};

const MAIN = loginHtml.match(/<main class="auth">([\s\S]*)<\/main>/)[1];

export default function Login() {
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = ref.current;
    const go = (roleKey) => {
      signInAs(roleKey, DEMO_USERS[roleKey].name, DEMO_USERS[roleKey].id);
      navigate(pageUrl(ROLES[roleKey].landing));
    };
    const onClick = (e) => {
      const button = e.target.closest("[data-demo-role]");
      if (!button) return;
      e.preventDefault();
      if (ROLES[button.dataset.demoRole]) go(button.dataset.demoRole);
    };
    const onSubmit = (e) => { e.preventDefault(); go("admin"); };
    const form = root.querySelector(".auth__panel form");
    root.addEventListener("click", onClick);
    form?.addEventListener("submit", onSubmit);
    // Once per mount of the markup: StrictMode runs effects twice in dev, and two toggles cancel out.
    if (!root.dataset.toggles) { initPasswordToggles(root); root.dataset.toggles = "1"; }
    return () => { root.removeEventListener("click", onClick); form?.removeEventListener("submit", onSubmit); };
  }, [navigate]);

  return <main className="auth" ref={ref} dangerouslySetInnerHTML={{ __html: MAIN }} />;
}
