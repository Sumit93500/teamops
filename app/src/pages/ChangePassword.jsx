// Change password (pages/account/change-password.html + assets/js/pages/change-password.js), ported (round 23): the new
// password must be typed the same twice ("Passwords don't match." under the confirm field, which takes focus); then the page
// says plainly that nothing was changed: there are no passwords in OfficeOS (sign-in is picking a demo role). Each field's
// eye button shows or hides what was typed (ui/password-toggle.js). Written as JSX from the old page (tools/react/html2jsx.py).
import { useState } from "react";
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "account/change-password.html";
const EYE = "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6";

function Password({ id, name, autoComplete, error }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="input-group input-group--action">
      <input className="input" id={id} name={name} type={shown ? "text" : "password"} autoComplete={autoComplete} required aria-describedby={error ? `${id}-error` : undefined} />
      {" "}
      <button className="input-group__action" type="button" aria-label="Show password" onClick={() => setShown(!shown)}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={EYE} /></svg></button>
    </div>
  );
}

export default function ChangePassword() {
  const perm = usePerm();
  const showToast = useToast();
  const [error, setError] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    if (f.new.value !== f.confirm.value) {
      setError("Passwords don't match.");
      f.confirm.focus();
      return;
    }
    setError(null);
    showToast("Passwords aren't part of OfficeOS yet: nothing was changed.", "info");
  };
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>My account</h1>
          <p className="page-header__subtitle">Your profile, password and sign-in security</p>
        </div>
      </div>
      <nav className="tabs acct-tabs" aria-label="Account sections">
        <Link to={pageUrl("account/my-profile.html")} className="tabs__tab">Profile</Link>
        {" "}
        <Link to={pageUrl("account/change-password.html")} className="tabs__tab is-active">Password</Link>
        {" "}
        <Link to={pageUrl("account/sessions.html")} className="tabs__tab">Sessions</Link>
        {" "}
        <Link to={pageUrl("account/notifications.html")} className="tabs__tab">Notifications</Link>
      </nav>
      <div className="grid grid-main-aside">
        <form className="card" method="post" onSubmit={submit} onInput={(e) => { if (e.target.name === "confirm") setError(null); }}>
          <section className="form-section">
            <div className="form-section__head">
              <h3 className="form-section__title">Change password</h3>
              <p className="form-section__desc">Choose a password you don't use anywhere else.</p>
            </div>
            <div className="form">
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="pw-current">Current password</label>
                {" "}
                <Password id="pw-current" name="current" autoComplete="current-password" />
              </div>
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="pw-new">New password</label>
                {" "}
                <Password id="pw-new" name="new" autoComplete="new-password" />
              </div>
              <div className="form-field">
                <label className="form-label form-label--required" htmlFor="pw-confirm">Confirm new password</label>
                {" "}
                <Password id="pw-confirm" name="confirm" autoComplete="new-password" error={error} />
                {error && <span className="form-error" id="pw-confirm-error">{error}</span>}
              </div>
              {" "}
              <label className="check"><input type="checkbox" defaultChecked />{" "}Sign me out of all other devices</label>
            </div>
          </section>
          <div className="card__footer">
            <span className="card__meta">Fields marked * are required.</span>
            {" "}
            <div className="btn-group"><Link to={pageUrl("account/my-profile.html")} className="btn">Cancel</Link>{" "}<button className="btn btn--primary" type="submit" {...perm("password:change-own")}>Update password</button></div>
          </div>
        </form>
        <aside className="stack">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Extra protection</h3></div>
            <div className="card__body">
              <div className="toggle-list">
                <label className="switch"><input type="checkbox" />{" "}Two-factor sign-in</label>
                {" "}
                <label className="switch"><input type="checkbox" defaultChecked />{" "}Email me when a new device signs in</label>
              </div>
              <p className="form-hint mt-4">Two-factor sign-in asks for a code from your phone after your password.</p>
            </div>
          </section>
          <div className="alert alert--info">Passwords aren't part of OfficeOS yet: sign-in is picking a demo role, so nothing on this page changes a password, signs anyone out or saves these settings.</div>
        </aside>
      </div>
    </Frame>
  );
}
