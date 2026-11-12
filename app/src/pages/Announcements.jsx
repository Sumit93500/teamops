// announcements/announcements.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import Frame from "../ui/Frame.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";

const PAGE = "announcements/announcements.html";

export default function Announcements() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <h1>Announcements</h1>
          <p className="page-header__subtitle">Company news and notices, sent to the people who need them</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" aria-label="Filter by audience">
            <option>All audiences</option>
            <option>Everyone</option>
            <option>Departments</option>
            <option>Roles</option>
          </select>
        </div>
      </div>
      <div className="alert alert--info mb-4">Sample, not built yet: announcements aren't part of OfficeOS yet. This page shows how they could look; nothing is posted or sent, and the posts and read counts listed are examples.</div>
      <div className="grid grid-main-aside">
        <section className="card">
          <div className="card__header"><h3 className="card__title">Recent announcements</h3>{" "}<span className="card__meta">4 posts</span></div>
          <article className="post post--pinned">
            <div className="post__head">
              <div className="avatar avatar--2">HR</div>
              <div className="grow"><span className="fw-medium">An HR Manager</span><small>HR, 17 Sep</small></div>
              {" "}
              <span className="badge badge--primary badge--square">Pinned</span>
            </div>
            <h3 className="post__title">Team offsite on 12 October</h3>
            <p className="post__body">We are heading to Manesar for a day of workshops and games. Buses leave from the office at 8:00 AM. Please confirm your seat by 30 Sep.</p>
            <div className="post__foot"><span>Sent to everyone</span><span>Read by 201 of 248</span></div>
          </article>
          <article className="post">
            <div className="post__head">
              <div className="avatar avatar--2">HR</div>
              <div className="grow"><span className="fw-medium">An HR Manager</span><small>HR, 15 Sep</small></div>
            </div>
            <h3 className="post__title">Diwali holiday added to the calendar</h3>
            <p className="post__body">The office will be closed on 8 Nov. The holiday is now in the calendar and your leave balance is not affected.</p>
            <div className="post__foot"><span>Sent to everyone</span><span>Read by 236 of 248</span></div>
          </article>
          <article className="post">
            <div className="post__head">
              <div className="avatar avatar--3">AD</div>
              <div className="grow"><span className="fw-medium">An Admin</span><small>16 Sep</small></div>
            </div>
            <h3 className="post__title">Office network maintenance on Saturday</h3>
            <p className="post__body">Wi-Fi and VPN will be down from 10 PM to 2 AM. Save your work first, and avoid scheduling late deployments.</p>
            <div className="post__foot"><span>Sent to Engineering and Operations</span><span>Read by 118 of 129</span></div>
          </article>
          <article className="post">
            <div className="post__head">
              <div className="avatar avatar--2">HR</div>
              <div className="grow"><span className="fw-medium">An HR Manager</span><small>HR, 1 Sep</small></div>
            </div>
            <h3 className="post__title">Welcome our new joiners</h3>
            <p className="post__body">Five new colleagues joined us in September. Say hello when you see them, and help them find their way around the office.</p>
            <div className="post__foot"><span>Sent to everyone</span><span>Read by 244 of 248</span></div>
          </article>
        </section>
        <aside className="stack aside-sticky">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Post an announcement</h3></div>
            <div className="card__body">
              <form className="form" action="announcements.html">
                <div className="form-field"><label className="form-label form-label--required" htmlFor="an-title">Title</label>{" "}<input className="input" id="an-title" type="text" placeholder="e.g. Office closed on Friday" required /></div>
                <div className="form-field">
                  <label className="form-label form-label--required" htmlFor="an-aud">Send to</label>
                  {" "}
                  <select className="select" id="an-aud" required>
                    <option>Everyone</option>
                    <option>One department</option>
                    <option>One role</option>
                  </select>
                </div>
                <div className="form-field"><label className="form-label form-label--required" htmlFor="an-msg">Message</label>{" "}<textarea className="textarea" id="an-msg" placeholder="Write the details here" required /></div>
                <div className="toggle-list">
                  <label className="switch"><input type="checkbox" />{" "}Pin to the top</label>
                  {" "}
                  <label className="switch"><input type="checkbox" defaultChecked />{" "}Also send by email</label>
                </div>
                {" "}
                <NotBuilt what="Post announcement" className="btn btn--primary btn--block" {...perm("announcements:create")}>Post announcement</NotBuilt>
              </form>
            </div>
          </section>
          <section className="card">
            <div className="card__header"><h3 className="card__title">Who sees it</h3></div>
            <div className="card__body">
              <dl className="kv">
                <div className="kv__row"><dt>Everyone</dt><dd>All 248 employees</dd></div>
                <div className="kv__row"><dt>One department</dt><dd>Only that team</dd></div>
                <div className="kv__row"><dt>One role</dt><dd>Only people with that role</dd></div>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </Frame>
  );
}
