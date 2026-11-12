// The topbar, as the old pages show it once app.js has run: the menu button (phone), "Workspace / <page title>", the search,
// and the actions in the old order: Appearance (ui/theme.js), the search opener, the bell, the account menu (initials, My
// account, Sign out). Its text is right on the first paint: the title comes from the page's own HTML at build time and the
// initials from the session. A dropdown opens on its button, closes on a click elsewhere or Esc (focus back on its button).
// The bell: whoever may open the Approvals Inbox gets "Waiting for you: n" and the dot above 0; it opens the inbox until
// round 3 brings the approval card. Anyone else keeps the old placeholder ("Notifications isn't available in this demo.").
// Round 3: the bell opens the old list of what waits and its read-only cards; the phone's back arrow (a detail page, 560px
// and under) goes to the breadcrumb's parent, as ui/phone.js addBack.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import { THEMES, ACCENTS, applyTheme, applyAccent, savedTheme, onAppearanceChange } from "../../../assets/js/ui/theme.js";
import { canOpenPage } from "../../../assets/js/core/guard.js";
import { waitingCount } from "../../../assets/js/ui/waiting.js";
import { load } from "../../../assets/js/core/storage.js";
import { useData, useSession, signOutNow } from "../data/hooks.js";
import { pageUrl, ABOUT } from "../routes.js";
import { COMPANY } from "../data/company.js";
import { CompanyMark } from "./Brand.jsx";
import { useToast } from "../ui/Toast.jsx";
import { SearchBox, SearchOpener } from "./Search.jsx";
import { initialsFrom } from "./media.js";
import { SIGN_OUT_ICON } from "./Sidebar.jsx";
import { toggleBellPanel } from "../ui/ApprovalCard.jsx";

const INBOX = "requests/approvals-inbox.html";
const PALETTE = "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.5a4.5 4.5 0 0 0 4.5-4.5C22 6.1 17.5 3 12 3M7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01";
const ROLE_COLOUR = "My role's colour";
const Icon = ({ d }) => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

// What the Appearance menu marks as chosen; it re-reads whenever theme.js announces a change.
let appearanceVersion = 0;
const appearanceListeners = new Set();
onAppearanceChange(() => { appearanceVersion++; appearanceListeners.forEach((l) => l()); });
function useAppearance() {
  useSyncExternalStore((cb) => { appearanceListeners.add(cb); return () => appearanceListeners.delete(cb); }, () => appearanceVersion);
  const accent = load("accent");
  return { theme: savedTheme() ?? "light", accent: ACCENTS.some(([v]) => v === accent) ? accent : "" };
}

function ThemeMenu() {
  const { theme, accent } = useAppearance();
  return (
    <div className="dropdown__menu theme-menu" onClick={(e) => e.stopPropagation()}>
      <div className="theme-menu__title">Theme</div>
      <div className="theme-menu__themes" role="group" aria-label="Theme">
        {THEMES.map(([value, label]) => (
          <button key={value} className="theme-menu__theme" type="button" data-theme-choice={value} aria-pressed={String(value === theme)}
            onClick={() => applyTheme(value)}>{label}</button>
        ))}
      </div>
      <div className="theme-menu__title">Accent colour</div>
      <div className="theme-menu__accents" role="group" aria-label="Accent colour">
        <button className="theme-swatch theme-swatch--role" type="button" data-accent-choice="" aria-label={ROLE_COLOUR} title={ROLE_COLOUR}
          aria-pressed={String(accent === "")} onClick={() => applyAccent("")} />
        {ACCENTS.map(([value, label]) => (
          <button key={value} className="theme-swatch" type="button" data-accent-choice={value} data-accent={value} aria-label={label} title={label}
            aria-pressed={String(value === accent)} onClick={() => applyAccent(value)} />
        ))}
      </div>
      <div className="theme-menu__current" aria-hidden="true">{ACCENTS.find(([v]) => v === accent)?.[1] ?? ROLE_COLOUR}</div>
    </div>
  );
}

const BELL = "M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0";

function Bell() {
  const { userId, role } = useSession();
  const showToast = useToast();
  const inbox = useData(() => canOpenPage(INBOX), [userId, role?.key]);
  const n = useData(() => waitingCount(userId, role?.key), [userId, role?.key]);
  if (!inbox) {
    return (
      <button className="topbar__icon-btn topbar__icon-btn--dot" type="button" aria-label="Notifications" data-not-implemented="Notifications"
        onClick={(e) => { e.preventDefault(); showToast("Notifications isn't available in this demo.", "info"); }}><Icon d={BELL} /></button>
    );
  }
  // The list of what waits, and each item's card (ui/ApprovalCard.jsx, round 13b: drawn on <body> by the shell's CardHost,
  // which sets the bell's aria-expanded/-controls as the old module did).
  const onClick = (e) => toggleBellPanel(e.currentTarget);
  return (
    <button className="topbar__icon-btn topbar__icon-btn--dot" type="button" aria-haspopup="dialog" aria-expanded="false"
      aria-label={`Waiting for you: ${n}`} title={`Waiting for you: ${n}`} data-waiting={n > 0 ? "" : undefined}
      onClick={onClick}><Icon d={BELL} /></button>
  );
}

const BACK_ICON = <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;

export default function Topbar({ title, back, drawerOpen, toggleDrawer, toggleRef }) {
  const { user, session } = useSession();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);   // "theme" | "account" | null
  const [searching, setSearching] = useState(false);
  const triggers = { theme: useRef(null), account: useRef(null) };
  const openerRef = useRef(null), inputRef = useRef(null);
  const label = session?.userLabel ?? null;

  useEffect(() => {
    const close = () => setMenu(null);
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setMenu((open) => { if (open) triggers[open].current?.focus(); return null; });
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", onKey); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (name) => (e) => { e.stopPropagation(); setMenu((open) => (open === name ? null : name)); };
  const openSearch = () => { setSearching(true); inputRef.current?.focus(); inputRef.current?.select(); };

  return (
    <header className={`topbar${searching ? " is-searching" : ""}`}>
      {back && <Link className="topbar__back" to={pageUrl(back)} aria-label="Back">{BACK_ICON}</Link>}
      <button className="topbar__menu-toggle" type="button" aria-label={drawerOpen ? "Close menu" : "Open menu"} aria-controls="sidebar"
        aria-expanded={String(drawerOpen)} ref={toggleRef} onClick={toggleDrawer}>
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* D2a: the company's name (data/company.js) in the place "Workspace" had, a link to About; on a phone, its mark */}
      <Link className="topbar__brand" to={pageUrl(ABOUT)} aria-label={`About ${COMPANY.name}`}><CompanyMark /></Link>
      <div className="topbar__left">
        <span className="topbar__company-crumb"><Link className="topbar__company" to={pageUrl(ABOUT)}>{COMPANY.name}</Link></span><span>/</span><strong>{title}</strong>
      </div>
      <SearchBox searching={searching} setSearching={setSearching} openerRef={openerRef} inputRef={inputRef} />
      <div className="topbar__actions">
        <div className={`dropdown${menu === "theme" ? " is-open" : ""}`}>
          <button className="topbar__icon-btn" type="button" aria-label="Appearance" title="Appearance" aria-expanded={String(menu === "theme")}
            ref={triggers.theme} onClick={toggle("theme")}><Icon d={PALETTE} /></button>
          <ThemeMenu />
        </div>
        <SearchOpener searching={searching} open={openSearch} openerRef={openerRef} />
        <Bell />
        <div className={`dropdown${menu === "account" ? " is-open" : ""}`}>
          <button type="button" aria-label="Account menu" aria-expanded={String(menu === "account")} ref={triggers.account} onClick={toggle("account")}>
            <span className="avatar" title={label ?? ""}>{initialsFrom(label)}</span>
          </button>
          <div className="dropdown__menu">
            <Link className="dropdown__item" to={pageUrl("account/my-profile.html")}>
              <Icon d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
              My account
            </Link>
            <div className="dropdown__divider" />
            <button className="dropdown__item dropdown__item--danger" type="button" data-signout
              onClick={() => { signOutNow(); navigate(pageUrl("auth/login.html")); }}>
              <Icon d={SIGN_OUT_ICON} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
