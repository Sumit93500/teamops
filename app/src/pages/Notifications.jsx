// account/notifications.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "account/notifications.html";

export default function Notifications() {
  const perm = usePerm();
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
        <Link to={pageUrl("account/change-password.html")} className="tabs__tab">Password</Link>
        {" "}
        <Link to={pageUrl("account/sessions.html")} className="tabs__tab">Sessions</Link>
        {" "}
        <Link to={pageUrl("account/notifications.html")} className="tabs__tab is-active">Notifications</Link>
      </nav>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: notifications aren't part of OfficeOS yet. This tab shows how they could look; nothing sends notifications or saves these choices, and the notifications listed are examples.</div>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Recent notifications</h3>{" "}<NotBuilt what="Mark all as read" className="btn btn--sm">Mark all as read</NotBuilt></div>
            <div>
              <div className="notif is-unread">
                <span className="notif__dot" />
                {" "}
                <div className="notif__body">
                  <span className="notif__title">Your regularization for 17 Sep was approved</span>
                  <span className="list__sub">Attendance. Approved by an HR Manager</span>
                </div>
                {" "}
                <span className="notif__time">Today</span>
              </div>
              <div className="notif is-unread">
                <span className="notif__dot" />
                {" "}
                <div className="notif__body">
                  <span className="notif__title">Your laptop request is with your manager</span>
                  <span className="list__sub">Requests. Waiting for manager approval</span>
                </div>
                {" "}
                <span className="notif__time">Yesterday</span>
              </div>
              <div className="notif is-unread">
                <span className="notif__dot" />
                {" "}
                <div className="notif__body">
                  <span className="notif__title">New announcement: Team offsite on 12 Oct</span>
                  <span className="list__sub">Company. Posted by an HR Manager</span>
                </div>
                {" "}
                <span className="notif__time">Yesterday</span>
              </div>
              <div className="notif">
                <span className="notif__dot" />
                {" "}
                <div className="notif__body">
                  <span className="notif__title">Your leave request for 3 Oct was sent to your manager</span>
                  <span className="list__sub">Leave. Waiting for the first approval</span>
                </div>
                {" "}
                <span className="notif__time">18 Sep</span>
              </div>
              <div className="notif">
                <span className="notif__dot" />
                {" "}
                <div className="notif__body">
                  <span className="notif__title">Your work from home request for 12 Aug was approved</span>
                  <span className="list__sub">Leave. Approved by an HR Manager</span>
                </div>
                {" "}
                <span className="notif__time">12 Aug</span>
              </div>
            </div>
            <div className="card__footer">
              <span className="card__meta">3 unread</span>
              {" "}
              <div className="btn-group"><button className="btn btn--sm" type="button" disabled>Previous</button>{" "}<NotBuilt what="Next page" className="btn btn--sm">Next</NotBuilt></div>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">How you're notified</h3></div>
              <div className="card__body">
                <div className="toggle-list">
                  <label className="switch"><input type="checkbox" defaultChecked />{" "}Show notifications in the app</label>
                  {" "}
                  <label className="switch"><input type="checkbox" defaultChecked />{" "}Send important ones by email</label>
                  {" "}
                  <label className="switch"><input type="checkbox" />{" "}Pause notifications from 8 PM to 8 AM</label>
                </div>
              </div>
            </section>
            <div className="alert alert--info">Security alerts, such as a new device signing in, are always sent. You can't turn those off.</div>
          </aside>
        </div>
        <section className="card">
          <div className="card__header">
            <h3 className="card__title">Choose what you hear about</h3>
            {" "}
            <span className="card__meta">Applies to you only</span>
          </div>
          <div className="table-wrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>In the app</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="matrix__module-name">Leave</span><span className="matrix__module-desc">Requests and decisions</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Leave, in the app" defaultChecked /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Leave, by email" defaultChecked /></label>
                  </td>
                </tr>
                <tr>
                  <td><span className="matrix__module-name">Attendance</span><span className="matrix__module-desc">Late marks and corrections</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Attendance, in the app" defaultChecked /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Attendance, by email" /></label>
                  </td>
                </tr>
                <tr>
                  <td><span className="matrix__module-name">Payslips</span><span className="matrix__module-desc">When a payslip is ready</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Payslips, in the app" defaultChecked /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Payslips, by email" defaultChecked /></label>
                  </td>
                </tr>
                <tr>
                  <td><span className="matrix__module-name">Requests</span><span className="matrix__module-desc">Assets and other requests</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Requests, in the app" defaultChecked /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Requests, by email" /></label>
                  </td>
                </tr>
                <tr>
                  <td><span className="matrix__module-name">Announcements</span><span className="matrix__module-desc">Company news and notices</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Announcements, in the app" defaultChecked /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Announcements, by email" /></label>
                  </td>
                </tr>
                <tr>
                  <td><span className="matrix__module-name">Security alerts</span><span className="matrix__module-desc">Always on</span></td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Security alerts, in the app" defaultChecked disabled /></label>
                  </td>
                  <td>
                    <label className="switch"><input type="checkbox" aria-label="Security alerts, by email" defaultChecked disabled /></label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="card__footer">
            <span className="card__meta">Changes are saved when you press Save.</span>
            {" "}
            <NotBuilt what="Save preferences" className="btn btn--primary btn--sm" {...perm("notifications:edit-own")}>Save preferences</NotBuilt>
          </div>
        </section>
      </div>
    </Frame>
  );
}
