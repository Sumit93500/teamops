// My profile (pages/account/my-profile.html + assets/js/pages/my-profile.js), ported (round 23): the signed-in person's
// details from the live store (the header card, work details, the masked bank account and PAN, their access: the role from
// the session, the real leave approval chain). With no matching user (a session saved before employee ids), the old page's
// placeholder profile stays, as before. Save changes saves their own contact details and emergency contact through the
// store's updateOwnContact() (only those fields, only their own record); an error goes under its field, a refusal is a toast;
// Discard goes back to what was last saved. Preferred name is shown, not saved. Change photo is a placeholder.
// Components: Badge, NotBuilt. Written as JSX from the old page (tools/react/html2jsx.py).
import { useState } from "react";
import { Link } from "react-router-dom";
import { getUser, getAllDepartments, reportingManagerName, updateOwnContact } from "../../../assets/js/data/store.js";
import { DEPARTMENTS } from "../../../assets/js/data/users.js";
import { approvalChainText } from "../../../assets/js/data/leave-store.js";
import { maskAccount, maskPan } from "../../../assets/js/ui/pii.js";
import Frame from "../ui/Frame.jsx";
import { Badge, badgeOf, NotBuilt } from "../components/Basics.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "account/my-profile.html";
const STATUS = {
  "active": { label: "Active", badge: "badge badge--success badge--dot" },
  "on-leave": { label: "On leave", badge: "badge badge--info badge--dot" },
  "inactive": { label: "Inactive", badge: "badge badge--dot" },
};
// What Save changes sends: input id -> the record's field (the store's OWN_CONTACT_FIELDS). Preferred name isn't saved.
const SAVED = {
  "p-phone": "phone", "p-email": "personalEmail", "p-city": "city", "p-address": "address",
  "e-name": "emergencyContactName", "e-rel": "emergencyContactRelation", "e-phone": "emergencyContactPhone",
};
// The old page's placeholder profile, shown when the session has no matching user.
const PLACEHOLDER = {
  initials: "AK", name: "Arjun Kapoor", meta: "Software Engineer, Engineering", role: "Employee", status: STATUS.active, id: "EMP-1105",
  work: ["EMP-1105", "Software Engineer", "Engineering", "Sneha Rao", "12 Jan 2023", "Gurugram office", "Full-time"],
  bank: "•••• •••• 4821", pan: "•••••3421F", scope: "Own records", chain: "Sneha Rao, then HR or an Admin",
  fields: { "p-name": "Arjun", "p-phone": "+91 98765 43210", "p-email": "arjun.k@example.com", "p-city": "Gurugram", "p-address": "Sector 56, Gurugram, Haryana 122011",
    "e-name": "Sunita Kapoor", "e-rel": "Mother", "e-phone": "+91 98110 55667" },
};
const WORK = ["Employee ID", "Designation", "Department", "Reporting manager", "Date of joining", "Location", "Employment type"];

// Same as initialsFrom() in ui/topbar.js.
const initialsFrom = (name) => (name ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "?");
// Live departments first, so renamed or added ones show correctly; the built-in list covers any code that isn't in the store.
const departmentName = (code) => getAllDepartments().find((d) => d.code === code)?.name ?? DEPARTMENTS.find((d) => d.code === code)?.name ?? code ?? "";
const orDash = (value) => (value ? String(value) : "—");

function profileOf(user, role) {
  const dept = departmentName(user.department);
  return {
    initials: initialsFrom(user.name), name: user.name, meta: [user.designation, dept].filter(Boolean).join(", "), role: role.label,
    status: STATUS[user.status] ?? STATUS.active, id: user.id,
    work: [user.id, orDash(user.designation), orDash(dept), orDash(reportingManagerName(user)), orDash(user.dateOfJoining), orDash(user.location), orDash(user.employmentType)],
    bank: maskAccount(user.bankAccountLast4), pan: maskPan(user.pan), scope: role.scopeLabel, chain: approvalChainText(user.id),
    fields: { "p-name": String(user.name ?? "").split(" ")[0], ...Object.fromEntries(Object.entries(SAVED).map(([id, key]) => [id, user[key] ?? ""])) },
  };
}

// Masked value, or "Not on file" (muted) when there's nothing stored.
const Sensitive = ({ term, masked }) => <div className="kv__row"><dt>{term}</dt><dd className={masked ? "masked" : "text-muted"}>{masked || "Not on file"}</dd></div>;
const Kv = ({ term, children }) => <div className="kv__row"><dt>{term}</dt><dd>{children}</dd></div>;

function Field({ id, label, type = "text", value, error, full, area, hint, disabled }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`form-field${full ? " form-field--full" : ""}`}>
      <label className="form-label" htmlFor={id}>{label}</label>
      {" "}
      {area ? <textarea defaultValue={value} className="textarea" id={id} aria-describedby={describedBy} />
        : <input className="input" id={id} type={type} defaultValue={value} disabled={disabled} aria-describedby={describedBy} />}
      {hint && <>{" "}<span className="form-hint" id={`${id}-hint`}>{hint}</span></>}
      {error && <span className="form-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

export default function MyProfile() {
  const perm = usePerm();
  const showToast = useToast();
  const { userId, role } = useSession();
  const user = useData(() => (userId ? getUser(userId) : null), [userId]);
  const p = user && role ? profileOf(user, role) : PLACEHOLDER;
  const [error, setError] = useState(null);   // { id, text }
  const [saved, setSaved] = useState(0);      // after a save the form starts again from what was saved

  // The browser checks Personal email first (type="email"); the store checks it again, and refuses any other field or record.
  const save = (e) => {
    e.preventDefault();
    if (!user || !role) return;   // the placeholder profile has nothing to save, as before (no handler)
    setError(null);
    const changes = Object.fromEntries(Object.entries(SAVED).map(([id, key]) => [key, document.getElementById(id).value.trim()]));
    const result = updateOwnContact(userId, user.id, changes);
    if (!result.ok) {
      const id = Object.keys(SAVED).find((k) => SAVED[k] === result.field);
      if (id) { setError({ id, text: result.error }); setTimeout(() => document.getElementById(id)?.focus()); }
      else showToast(result.error, "danger");
      return;
    }
    bump();
    setSaved((n) => n + 1);
    showToast("Saved.", "success");
  };
  const err = (id) => (error?.id === id ? error.text : null);

  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My account</h1>
          <p className="page-header__subtitle">Your profile, password and sign-in security</p>
        </div>
      </div>
      <nav className="tabs acct-tabs" aria-label="Account sections">
        <Link to={pageUrl("account/my-profile.html")} className="tabs__tab is-active">Profile</Link>
        {" "}
        <Link to={pageUrl("account/change-password.html")} className="tabs__tab">Password</Link>
        {" "}
        <Link to={pageUrl("account/sessions.html")} className="tabs__tab">Sessions</Link>
        {" "}
        <Link to={pageUrl("account/notifications.html")} className="tabs__tab">Notifications</Link>
      </nav>
      <div className="stack">
        <section className="card profile">
          <div className="avatar avatar--xl">{p.initials}</div>
          <div className="profile__info">
            <h2 className="profile__name">{p.name}</h2>
            <p className="profile__meta">{p.meta}</p>
            <div className="profile__badges">
              <Badge tone="primary">{p.role}</Badge>
              {" "}
              <Badge {...badgeOf(p.status.badge)}>{p.status.label}</Badge>
              {" "}
              <Badge>{p.id}</Badge>
            </div>
          </div>
          {" "}
          <NotBuilt what="Change photo" />
        </section>
        <div className="grid grid-main-aside">
          <form className="card" key={`${p.id}-${saved}`} onSubmit={save} onInput={() => setError(null)}>
            <section className="form-section">
              <div className="form-section__head">
                <h3 className="form-section__title">Contact details</h3>
                <p className="form-section__desc">You can update these yourself.</p>
              </div>
              <div className="form-grid">
                <Field id="p-name" label="Preferred name" value={p.fields["p-name"]} disabled hint="From your name on record. To change it, ask HR." />
                <Field id="p-phone" label="Phone" type="tel" value={p.fields["p-phone"]} error={err("p-phone")} />
                <Field id="p-email" label="Personal email" type="email" value={p.fields["p-email"]} error={err("p-email")} />
                <Field id="p-city" label="City" value={p.fields["p-city"]} error={err("p-city")} />
                <Field id="p-address" label="Address" area full value={p.fields["p-address"]} error={err("p-address")} />
              </div>
            </section>
            <section className="form-section">
              <div className="form-section__head">
                <h3 className="form-section__title">Emergency contact</h3>
                <p className="form-section__desc">Who we should call if something happens at work.</p>
              </div>
              <div className="form-grid">
                <Field id="e-name" label="Name" value={p.fields["e-name"]} error={err("e-name")} />
                <Field id="e-rel" label="Relationship" value={p.fields["e-rel"]} error={err("e-rel")} />
                <Field id="e-phone" label="Phone" type="tel" value={p.fields["e-phone"]} error={err("e-phone")} />
              </div>
            </section>
            <div className="card__footer">
              <span className="card__meta">Changes are saved to your profile only.</span>
              {" "}
              <div className="btn-group"><button className="btn" type="reset" onClick={() => setError(null)}>Discard</button>{" "}<button className="btn btn--primary" type="submit" {...perm("profile:edit-own")}>Save changes</button></div>
            </div>
          </form>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Work details</h3></div>
              <div className="card__body">
                <dl className="kv">{WORK.map((term, i) => <Kv key={term} term={term}>{p.work[i]}</Kv>)}</dl>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Sensitive details</h3></div>
              <div className="card__body">
                {/* masked by ui/pii.js, as on the employee profile page; no Reveal here */}
                <dl className="kv"><Sensitive term="Bank account" masked={p.bank} /><Sensitive term="PAN" masked={p.pan} /></dl>
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">Your access</h3></div>
              <div className="card__body">
                <dl className="kv">
                  {/* the role comes from the session: it's what this person can do right now */}
                  <Kv term="Role"><Badge tone="primary">{p.role}</Badge></Kv>
                  <Kv term="Data scope">{p.scope}</Kv>
                  <Kv term="Leave approved by">{p.chain}</Kv>
                </dl>
              </div>
            </section>
            <div className="alert alert--info">Work details, bank account and PAN are managed by HR. To correct them, send HR a request.</div>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
