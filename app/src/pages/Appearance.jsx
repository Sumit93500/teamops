// Appearance (A1): the app's own page at /pages/account/appearance.html, for everyone signed in (ruled 2026-11-13: Settings
// is Admins' only), linked from the header's Appearance menu and found by search. AppearancePanel is also Settings >
// Appearance. Every choice applies at once (data/prefs.js: the one store the header menu uses too) and says "Saved";
// Reset to default puts every choice back. Plain words under each choice; on a phone each row stacks.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSession, signOutNow } from "../data/hooks.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, APPEARANCE } from "../routes.js";
import Shell from "../shell/Shell.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { Segmented } from "../components/Controls.jsx";
import { usePrefs, setPref, resetPrefs, DEFAULTS, THEMES, ACCENTS, ROLE_COLOUR, DENSITIES, TEXT_SIZES, SIDEBAR_DEFAULTS, MOTIONS } from "../data/prefs.js";

const options = (list) => list.map(([value, label]) => ({ value, label }));

function Row({ id, label, help, children }) {
  return (
    <div className="ap-row" id={id}>
      <div>
        <p className="ap-row__label" id={`${id}-label`}>{label}</p>
        <p className="ap-row__help" id={`${id}-help`}>{help}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

// The accent: a radio group of swatches with their names (one Tab stop; the arrow keys move and choose).
function Swatches({ value, onChange, labelledBy, describedBy }) {
  const list = [["", ROLE_COLOUR], ...ACCENTS];
  const refs = useRef([]);
  const index = Math.max(0, list.findIndex(([v]) => v === value));
  const onKeyDown = (e) => {
    const to = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: list.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const i = (to + list.length) % list.length;
    onChange(list[i][0]); refs.current[i]?.focus();
  };
  return (
    <div className="ap-swatches" role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} onKeyDown={onKeyDown}>
      {list.map(([v, label], i) => (
        <button key={v || "role"} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" className={`ap-swatch${v ? "" : " ap-swatch--role"}`}
          aria-checked={String(i === index)} tabIndex={i === index ? 0 : -1} data-accent-choice={v} onClick={() => onChange(v)}>
          <span className="ap-swatch__dot" data-accent={v || undefined} aria-hidden="true" />{label}
        </button>
      ))}
    </div>
  );
}

export function AppearancePanel({ idPrefix = "ap" }) {
  const prefs = usePrefs();
  const [status, setStatus] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const say = (ok, text = "Saved") => {
    window.clearTimeout(timer.current);
    setStatus(ok ? { text } : { text: "Applied for this visit only: this browser doesn't allow saving.", warn: true });
    timer.current = window.setTimeout(() => setStatus(null), ok ? 2500 : 8000);
  };
  const choose = (name) => (value) => { if (value !== prefs[name]) say(setPref(name, value)); };
  const atDefault = Object.keys(DEFAULTS).every((k) => prefs[k] === DEFAULTS[k]);
  const seg = (name, list, label) => <Segmented label={label} options={options(list)} value={prefs[name]} onChange={choose(name)} />;
  const id = (s) => `${idPrefix}-${s}`;
  return (
    <div className="ap-panel" data-appearance-panel="">
      <Row id={id("theme")} label="Theme" help="Light, dark, or match your device's setting (it follows a change at once).">{seg("theme", THEMES, "Theme")}</Row>
      <Row id={id("accent")} label="Accent colour" help="Colours the header, buttons and links. Charts keep their own colours.">
        <Swatches value={prefs.accent} onChange={choose("accent")} labelledBy={`${id("accent")}-label`} describedBy={`${id("accent")}-help`} />
      </Row>
      <Row id={id("density")} label="Density" help="Compact fits more rows and fields on the screen.">{seg("density", DENSITIES, "Density")}</Row>
      <Row id={id("text")} label="Text size" help="The size of text across OfficeOS.">{seg("text", TEXT_SIZES, "Text size")}</Row>
      <Row id={id("sidebar")} label="Sidebar on a computer" help="How the sidebar opens. Remember keeps it as you last left it. On a phone it's always the menu.">{seg("sidebar", SIDEBAR_DEFAULTS, "Sidebar on a computer")}</Row>
      <Row id={id("motion")} label="Motion" help="Always reduce stops movement such as the sidebar sliding, whatever your device says.">{seg("motion", MOTIONS, "Motion")}</Row>
      <div className="ap-foot">
        <button type="button" className="ds-btn" id={id("reset")} disabled={atDefault} onClick={() => say(resetPrefs(), "Back to the default look")}>Reset to default</button>
        <span className={`ap-saved${status?.warn ? " ap-saved--warn" : ""}`} role="status" aria-live="polite">{status?.text ?? ""}</span>
      </div>
    </div>
  );
}

export default function Appearance() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("Appearance"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  return (
    <Shell page={APPEARANCE} title="Appearance">
      <PageHeader title="Appearance" subtitle="How OfficeOS looks for you. Saved for your sign-in in this browser." />
      <Card id="appearance-card" title="Your appearance"><AppearancePanel /></Card>
    </Shell>
  );
}