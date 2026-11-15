// E1: the sign-in pages, in the design system (the old site's pages stay as they were): Sign in, Forgot password, Reset
// password (a reset link), Set password (a new employee's link, or the first sign-in with a temporary password). Every
// check is data/credentials.js's: passwords are only ever hashed there. Each page:
//   - says what went wrong in a labelled message that takes focus (role="alert"), and every field has its label;
//   - shows the password with a Show / Hide button, the strength as four steps and a word, and the rules ticked off;
//   - keeps the demo's one-click role buttons (they sign in the four demo people, as before).
// Forgot password answers the same whether or not the email is someone's; a link that is expired, used or wrong says so,
// with a way to ask for a new one.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { signInWithPassword, requestReset, checkToken, redeemToken, setFirstPassword, passwordProblems, passwordStrength, sessionAllowed, mustChangePassword, MIN_LENGTH } from "../../../assets/js/data/credentials.js";
import { signInAs, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { COMPANY, tabTitle } from "../data/company.js";
import { pageUrl } from "../routes.js";
import { CompanyMark, PoweredBy } from "../shell/Brand.jsx";
import { Field } from "../components/Form.jsx";
import { DEMO } from "../../../assets/js/config/demo.js";
import { Icon, ICON } from "../components/icons.jsx";
import "../design/auth.css";

export const SET_PASSWORD = "auth/set-password.html";
const DEMO_USERS = { admin: ["Admin", "EMP-1001"], hr: ["HR Manager", "EMP-1003"], fin: ["Finance", "EMP-1008"], emp: ["Employee", "EMP-1105"] };
const landingOf = (user) => pageUrl(ROLES[user.role]?.landing ?? "dashboard/employee.html");

// F2: the brand panel beside the card (wide screens only; the card keeps the company's name on a phone or a tablet): the
// company's mark and name from the company profile, what OfficeOS is for, and three short points. No product's branding but ours.
const POINTS = [
  [ICON.clock, "Attendance that adds up", "Check in from the office or home; shifts, late marks and overtime are worked out for you."],
  [ICON.calendar, "Leave without the chase", "Ask in a minute and see your balance; your approver hears straight away."],
  [ICON.layers, "Pay you can follow", "Payslips, tax and every deduction, line by line."],
];
function BrandPanel() {
  return (
    <aside className="auth-brand" aria-label={`About ${COMPANY.shortName}`}>
      <div className="auth-brand__name"><CompanyMark className="brand-mark auth-brand__mark" /><span>{COMPANY.name}</span></div>
      <div className="auth-brand__body">
        <p className="auth-brand__line">People, attendance, leave and pay, in one calm place.</p>
        <ul className="auth-brand__points">
          {POINTS.map(([d, head, text]) => (
            <li key={head}><span className="auth-brand__icon"><Icon d={d} /></span><span><strong>{head}</strong><span>{text}</span></span></li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function AuthLayout({ title, lead, docTitle, children, after = null }) {
  const heading = useRef(null);
  useLayoutEffect(() => { document.title = tabTitle(docTitle ?? title); document.documentElement.dataset.role = "admin"; window.scrollTo(0, 0); }, [title, docTitle]);
  return (
    <div className="auth-page auth-split">
      <BrandPanel />
      <div className="auth-split__side">
        <main className="auth-page__main" id="main">
          <div className="auth-stack">
            <section className="auth-card" aria-labelledby="auth-title">
              <div className="auth-card__brand"><CompanyMark /><span>{COMPANY.name}</span></div>
              <h1 className="auth-card__title" id="auth-title" tabIndex={-1} ref={heading}>{title}</h1>
              {lead && <p className="auth-card__lead" id="auth-lead">{lead}</p>}
              {children}
            </section>
            {after}
          </div>
        </main>
        <PoweredBy className="app-footer--auth" withCompany />
      </div>
    </div>
  );
}

// A message that matters now: focused when it appears, read out, in the tone of what happened.
function Message({ tone = "danger", children, id = "auth-message" }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, [children]);
  return <p className={`ds-note ds-note--${tone}`} id={id} role={tone === "danger" ? "alert" : "status"} tabIndex={-1} ref={ref}>{children}</p>;
}

function PasswordInput({ id, label, value, onChange, autoComplete, error, hint, required = true }) {
  const [shown, setShown] = useState(false);
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint}>
      <div className={`ds-control pw-control${error ? " ds-control--invalid" : ""}`}>
        <input id={id} type={shown ? "text" : "password"} value={value} autoComplete={autoComplete} spellCheck={false} aria-invalid={error ? "true" : undefined}
          aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="pw-control__toggle" aria-pressed={String(shown)} aria-controls={id} onClick={() => setShown(!shown)}>{shown ? "Hide" : "Show"}</button>
      </div>
    </Field>
  );
}

// New password + confirm, with the meter and the rules. onDone(password) is called with a password that passes.
function NewPasswordForm({ user, submitLabel, busy, onDone }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState({});
  const strength = passwordStrength(pw, user);
  const problems = passwordProblems(pw, user);
  const rules = [[`At least ${MIN_LENGTH} characters`, pw.length >= MIN_LENGTH], ["Not your name, email or employee ID", pw.length > 0 && !problems.some((p) => p.startsWith("Don't use"))], ["Not a common password", pw.length > 0 && !problems.some((p) => p.startsWith("That's a common"))]];
  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (problems.length) next.pw = problems[0];
    else if (pw !== again) next.again = "The two passwords don't match.";
    setErrors(next);
    if (next.pw) { document.getElementById("new-password")?.focus(); return; }
    if (next.again) { document.getElementById("confirm-password")?.focus(); return; }
    onDone(pw);
  };
  return (
    <form noValidate onSubmit={submit}>
      <PasswordInput id="new-password" label="New password" value={pw} onChange={(v) => { setPw(v); setErrors({}); }} autoComplete="new-password" error={errors.pw} />
      <div className="pw-meter" data-score={pw ? strength.score : 0} id="pw-meter">
        <div className="pw-meter__bars" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className="pw-meter__bar" />)}</div>
        <span className="pw-meter__word" aria-live="polite">{`Strength: ${pw ? strength.label : "not started"}`}</span>
      </div>
      <ul className="pw-rules" id="pw-rules" aria-label="Password rules">{rules.map(([text, ok]) => <li key={text} data-ok={ok ? "" : undefined}>{text}{ok ? <span className="visually-hidden"> (done)</span> : null}</li>)}</ul>
      <PasswordInput id="confirm-password" label="Type it again" value={again} onChange={(v) => { setAgain(v); setErrors({}); }} autoComplete="new-password" error={errors.again} />
      <button type="submit" className="ds-btn ds-btn--primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}

// ---------- Sign in ----------
export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("reason") === "disabled" ? "Your sign-in was disabled, so you were signed out. Ask an Admin." : "");
  const [busy, setBusy] = useState(false);
  const done = (user, mustChange) => { signInAs(user.role, user.name, user.id); navigate(mustChange ? pageUrl(SET_PASSWORD) : landingOf(user), { replace: true }); };
  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Enter your work email and your password."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter your work email, like name@company.com."); return; }   // F2
    setBusy(true); setError("");
    const r = await signInWithPassword(email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); setPassword(""); return; }
    done(getUser(r.userId), r.mustChange);
  };
  const demo = (key) => {
    const user = getUser(DEMO_USERS[key][1]);
    if (!user || !sessionAllowed(user.id)) { setError("This demo account can't sign in. Ask an Admin."); return; }
    done(user, mustChangePassword(user.id));
  };
  // E1b: the demo hint and the role buttons only in demo mode (config/demo.js); F2: in their own quiet section under the card
  const demoSection = DEMO.mode && (
    <section className="auth-demo" aria-labelledby="demo-title">
      <p className="auth-demo__title" id="demo-title">Demo accounts</p>
      <p className="ds-hint">Sign in with any demo work email, like arjun.kapoor@northwind.com, and the password <code>{DEMO.password}</code>, or pick a role:</p>
      <div className="auth-demo__roles">
        {Object.entries(DEMO_USERS).map(([key, [label]]) => <button key={key} type="button" className="ds-btn ds-btn--sm" data-demo-role={key} onClick={() => demo(key)}>{label}</button>)}
      </div>
    </section>
  );
  return (
    <AuthLayout title="Sign in" lead="Use your work email and password." docTitle="Sign in" after={demoSection}>
      {error && <Message>{error}</Message>}
      <form noValidate onSubmit={submit} aria-describedby={error ? "auth-message" : undefined} aria-busy={busy ? "true" : undefined}>
        <Field id="email" label="Work email" required>
          <div className="ds-control"><input id="email" type="email" value={email} autoComplete="username" placeholder="name@company.com" onChange={(e) => setEmail(e.target.value)} /></div>
        </Field>
        <PasswordInput id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="auth-row"><span /><Link className="link" to={pageUrl("auth/forgot-password.html")}>Forgot password?</Link></div>
        <button type="submit" className="ds-btn ds-btn--primary" disabled={busy}>{busy ? <><span className="auth-spinner" aria-hidden="true" />Signing in…</> : "Sign in"}</button>
      </form>
    </AuthLayout>
  );
}

// ---------- Forgot password ----------
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter your work email, like name@company.com."); return; }
    setBusy(true); setError("");
    const r = await requestReset(email);
    setBusy(false);
    setSent(r.message);
  };
  if (sent) {
    return (
      <AuthLayout title="Check your email" docTitle="Forgot password">
        <Message tone="success" id="reset-sent">{sent}</Message>
        <p className="ds-hint">Email delivery arrives with the backend. In this demo the message goes to the Mail outbox, which an Admin can open.</p>
        <div className="auth-links"><Link className="link" to={pageUrl("auth/login.html")}>Back to sign in</Link><button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" onClick={() => { setSent(""); setEmail(""); }}>Use another email</button></div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Forgot password" lead="Enter your work email and we'll send a link to set a new password." docTitle="Forgot password">
      {error && <Message>{error}</Message>}
      <form noValidate onSubmit={submit}>
        <Field id="email" label="Work email" required error={null}>
          <div className="ds-control"><input id="email" type="email" value={email} autoComplete="username" placeholder="name@company.com" onChange={(e) => { setEmail(e.target.value); setError(""); }} /></div>
        </Field>
        <button type="submit" className="ds-btn ds-btn--primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
      </form>
      <div className="auth-links"><Link className="link" to={pageUrl("auth/login.html")}>Back to sign in</Link></div>
    </AuthLayout>
  );
}

// ---------- a link's page: reset (kind "reset") or set (kind "invite") ----------
function LinkPage({ token, kindWanted }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ phase: "checking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    checkToken(token).then((r) => { if (live) setState(r.ok ? { phase: "form", ...r } : { phase: "bad", code: r.code, error: r.error }); });
    return () => { live = false; };
  }, [token]);
  const invite = kindWanted === "invite";
  const title = invite ? "Set your password" : "Reset your password";
  if (state.phase === "checking") return <AuthLayout title={title}><p className="ds-hint" role="status">Checking the link…</p></AuthLayout>;
  if (state.phase === "bad") {
    const heading = { expired: "This link has expired", used: "This link was already used", disabled: "This account can't sign in" }[state.code] ?? "This link isn't valid";
    return (
      <AuthLayout title={heading} docTitle={title}>
        <Message id="link-problem">{state.error}</Message>
        <div className="auth-links"><Link className="ds-btn ds-btn--primary" to={pageUrl("auth/forgot-password.html")}>Ask for a new link</Link><Link className="link" to={pageUrl("auth/login.html")}>Back to sign in</Link></div>
      </AuthLayout>
    );
  }
  if (state.phase === "done") {
    return (
      <AuthLayout title="Password set" docTitle={title}>
        <Message tone="success" id="link-done">Your new password is set. Sign in with it now.</Message>
        <Link className="ds-btn ds-btn--primary" to={pageUrl("auth/login.html")}>Sign in</Link>
      </AuthLayout>
    );
  }
  const user = getUser(state.userId);
  const save = async (pw) => {
    setBusy(true);
    const r = await redeemToken(token, pw);
    setBusy(false);
    if (!r.ok) { if (["expired", "used", "invalid", "disabled"].includes(r.code)) setState({ phase: "bad", code: r.code, error: r.error }); else setError(r.error); return; }
    bump();
    setState({ phase: "done" });
    void navigate;
  };
  return (
    <AuthLayout title={title} lead={invite ? `Welcome, ${user?.name ?? "there"}. Choose the password you'll sign in with.` : `For ${user?.email ?? "your account"}. The link works once.`}>
      {error && <Message>{error}</Message>}
      <NewPasswordForm user={user} submitLabel={invite ? "Set password" : "Reset password"} busy={busy} onDone={save} />
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  if (!token) {
    return (
      <AuthLayout title="This link isn't valid" docTitle="Reset password">
        <Message id="link-problem">This page opens from the link in a reset email. Ask for a new one.</Message>
        <div className="auth-links"><Link className="ds-btn ds-btn--primary" to={pageUrl("auth/forgot-password.html")}>Ask for a new link</Link><Link className="link" to={pageUrl("auth/login.html")}>Back to sign in</Link></div>
      </AuthLayout>
    );
  }
  return <LinkPage token={token} kindWanted="reset" key={token} />;
}

// Set password: from a new employee's link (?token=), or straight after a sign-in with a temporary password (mustChange:
// every other page sends them here until it's done).
export function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const token = params.get("token");
  if (token) return <LinkPage token={token} kindWanted="invite" key={token} />;
  if (!user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!mustChangePassword(user.id)) return <Navigate to={landingOf(user)} replace />;
  const save = async (pw) => {
    setBusy(true);
    const r = await setFirstPassword(user.id, pw);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    bump();
    navigate(landingOf(user), { replace: true });
  };
  return (
    <AuthLayout title="Choose a new password" lead={`You signed in with a temporary password, ${user.name.split(" ")[0]}. Choose your own before you go on.`} docTitle="Set password">
      {error && <Message>{error}</Message>}
      <NewPasswordForm user={user} submitLabel="Save and continue" busy={busy} onDone={save} />
    </AuthLayout>
  );
}