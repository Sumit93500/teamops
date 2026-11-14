// Mail outbox (E1): the app's own page at /pages/system/mail-outbox.html, for an Admin (accounts:unlock). OfficeOS sends no
// email yet, so what it would send is listed here (data/mail-outbox.js): sign-in details for new employees and password
// reset links, newest first. A mail never stores its link (that would be a secret in the browser's storage): the link is
// kept only in the tab that made it, until a reload, and the page says so plainly.
import { useLayoutEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { allMail, linkOf } from "../../../assets/js/data/mail-outbox.js";
import { useData, useSession, signOutNow } from "../data/hooks.js";
import { tabTitle } from "../data/company.js";
import { pageUrl, MAIL_OUTBOX } from "../routes.js";
import { mayOpenOutbox } from "../shell/appNav.js";
import Shell from "../shell/Shell.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useToast } from "../ui/Toast.jsx";
import "../design/profile.css";

export { MAIL_OUTBOX };
const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const KIND = { invite: ["Sign-in details", "info"], reset: ["Password reset", "warning"] };

function Mail({ mail }) {
  const toast = useToast();
  const [shown, setShown] = useState(false);
  const link = linkOf(mail.id);
  const url = link ? new URL(link, window.location.origin).href : null;
  const expired = mail.expiresAt && Date.parse(mail.expiresAt) <= Date.now();
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast("Link copied.", "success"); } catch { setShown(true); }
  };
  return (
    <li className="outbox__mail" data-mail={mail.id}>
      <div className="outbox__head">
        <div>
          <p className="outbox__subject">{mail.subject}</p>
          <p className="ds-hint">{`To ${mail.to}, ${when(mail.at)}`}</p>
        </div>
        <Pill tone={KIND[mail.kind]?.[1] ?? ""}>{KIND[mail.kind]?.[0] ?? mail.kind}</Pill>
      </div>
      <p className="outbox__body">{mail.body}</p>
      {mail.expiresAt && <p className="ds-hint">{expired ? `The link expired ${when(mail.expiresAt)}.` : `The link works until ${when(mail.expiresAt)}, once.`}</p>}
      {url && !expired ? (
        <div className="ds-form-actions__buttons">
          <a className="ds-btn ds-btn--sm" href={url}>Open link</a>
          <button type="button" className="ds-btn ds-btn--sm" onClick={copy}>Copy link</button>
          {shown && <code className="outbox__link">{url}</code>}
        </div>
      ) : !expired && mail.expiresAt ? <p className="ds-hint">The link is kept only in the browser tab that made it, until a reload. Ask for a new one if it's needed.</p> : null}
    </li>
  );
}

function Content() {
  const mails = useData(() => allMail(), []);
  return (
    <>
      <PageHeader title="Mail outbox" subtitle="What OfficeOS would email. Email delivery arrives with the backend; until then the messages are listed here." />
      <Card id="outbox" title="Messages" meta={String(mails.length)}>
        {mails.length ? <ul className="outbox">{mails.map((m) => <Mail key={m.id} mail={m} />)}</ul>
          : <EmptyState title="Nothing has been sent yet" text="Sign-in details for new employees and password reset links appear here." />}
      </Card>
    </>
  );
}

export default function MailOutbox() {
  const { session, user, role } = useSession();
  const stale = session && !user;
  useLayoutEffect(() => { if (stale) signOutNow(); }, [stale]);
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; }, [role]);
  useLayoutEffect(() => { document.title = tabTitle("Mail outbox"); window.scrollTo(0, 0); }, []);
  if (!session || !user) return <Navigate to={pageUrl("auth/login.html")} replace />;
  if (!mayOpenOutbox()) return <Navigate to={pageUrl("errors/403.html")} replace />;
  return <Shell page={MAIL_OUTBOX} title="Mail outbox"><Content /></Shell>;
}