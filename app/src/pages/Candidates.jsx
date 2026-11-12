// recruitment/candidates.html, a faithful sample (round 23; ruled 2026-11-11: the sample pages are ported as they are): written as JSX from
// the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person may not use hidden (perm),
// "isn't available in this demo" on the placeholders (NotBuilt), the tables as Table (the phone cards come with it), a
// search box hiding its table's rows (ui/sample.js), links through the router.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import { NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "recruitment/candidates.html";

export default function Candidates() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("recruitment/job-openings.html")}>Recruitment</Link></li>
            <li className="breadcrumb__item" aria-current="page">Candidates</li>
          </ol>
          <h1>Frontend Developer</h1>
          <p className="page-header__subtitle">48 candidates, Engineering, Gurugram. Closes on 25 Sep.</p>
        </div>
        <div className="page-header__actions">
          <select className="select select--sm" aria-label="Choose job">
            <option>Frontend Developer</option>
            <option>Backend Developer</option>
            <option>QA Engineer</option>
            <option>DevOps Engineer</option>
            <option>Sales Executive</option>
            <option>Account Manager</option>
          </select>
          {" "}
          <NotBuilt what="Add candidate" className="btn btn--primary" {...perm("recruitment:create")}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{" "}Add candidate</NotBuilt>
        </div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: recruitment isn't part of OfficeOS yet. This page shows how it could look; nothing here is saved, and the openings, candidates and figures listed are examples.</div>
        <div className="pipeline" aria-label="Hiring pipeline">
          <section className="pipeline__col" aria-label="Applied">
            <div className="pipeline__head"><span>Applied</span><span className="badge badge--count">22</span></div>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--1">SK</div>
                <div><span className="cand__name">Sanya Kapoor</span><span className="cand__role">3 years experience</span></div>
              </div>
              <div className="cand__meta"><span>Referral</span><span className="score score--mid">78</span></div>
            </article>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--2">YT</div>
                <div><span className="cand__name">Yash Trivedi</span><span className="cand__role">5 years experience</span></div>
              </div>
              <div className="cand__meta"><span>LinkedIn</span><span className="score score--mid">84</span></div>
            </article>
            {" "}
            <a className="pipeline__more" href="#">+ 20 more</a>
          </section>
          <section className="pipeline__col" aria-label="Screening">
            <div className="pipeline__head"><span>Screening</span><span className="badge badge--count">14</span></div>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--3">RS</div>
                <div><span className="cand__name">Ritika Sen</span><span className="cand__role">4 years experience</span></div>
              </div>
              <div className="cand__meta"><span>Careers page</span><span className="score score--mid">81</span></div>
            </article>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--4">MC</div>
                <div><span className="cand__name">Manav Chopra</span><span className="cand__role">2 years experience</span></div>
              </div>
              <div className="cand__meta"><span>Naukri</span><span className="score score--low">69</span></div>
            </article>
            {" "}
            <a className="pipeline__more" href="#">+ 12 more</a>
          </section>
          <section className="pipeline__col" aria-label="Interview">
            <div className="pipeline__head"><span>Interview</span><span className="badge badge--count">8</span></div>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--1">AB</div>
                <div><span className="cand__name">Aditi Bhatt</span><span className="cand__role">6 years experience</span></div>
              </div>
              <p className="cand__note">Tue 22 Sep, 11:00</p>
              <div className="cand__meta"><span>Referral</span><span className="score score--high">90</span></div>
            </article>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--2">KA</div>
                <div><span className="cand__name">Kunal Arora</span><span className="cand__role">4 years experience</span></div>
              </div>
              <p className="cand__note">Wed 23 Sep, 15:00</p>
              <div className="cand__meta"><span>LinkedIn</span><span className="score score--high">86</span></div>
            </article>
            {" "}
            <a className="pipeline__more" href="#">+ 6 more</a>
          </section>
          <section className="pipeline__col" aria-label="Offer">
            <div className="pipeline__head"><span>Offer</span><span className="badge badge--count">3</span></div>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--3">VS</div>
                <div><span className="cand__name">Varun Sethi</span><span className="cand__role">7 years experience</span></div>
              </div>
              <p className="cand__note">Offer sent 17 Sep</p>
              <div className="cand__meta"><span>Referral</span><span className="score score--high">92</span></div>
            </article>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--4">PN</div>
                <div><span className="cand__name">Pooja Nambiar</span><span className="cand__role">5 years experience</span></div>
              </div>
              <p className="cand__note">Waiting for reply</p>
              <div className="cand__meta"><span>Careers page</span><span className="score score--high">88</span></div>
            </article>
            {" "}
            <a className="pipeline__more" href="#">+ 1 more</a>
          </section>
          <section className="pipeline__col" aria-label="Hired">
            <div className="pipeline__head"><span>Hired</span><span className="badge badge--count">1</span></div>
            <article className="cand">
              <div className="cand__top">
                <div className="avatar avatar--1">HG</div>
                <div><span className="cand__name">Harshit Goel</span><span className="cand__role">5 years experience</span></div>
              </div>
              <p className="cand__note">Joins on 5 Oct</p>
              <div className="cand__meta"><span>LinkedIn</span><span className="score score--high">91</span></div>
            </article>
          </section>
        </div>
        <div className="grid grid-main-aside">
          <section className="card">
            <div className="card__header"><h3 className="card__title">Interviews this week</h3>{" "}<span className="card__meta">3 scheduled</span></div>
            <div className="list">
              <div className="list__item">
                <div className="date-tile"><span className="date-tile__month">Sep</span><span className="date-tile__day">22</span></div>
                <div className="list__content"><span className="list__title">Aditi Bhatt, 11:00 AM</span><span className="list__sub">With a department head, technical round</span></div>
                {" "}
                <NotBuilt what="Reschedule" className="btn btn--sm" {...perm("recruitment:edit")}>Reschedule</NotBuilt>
              </div>
              <div className="list__item">
                <div className="date-tile"><span className="date-tile__month">Sep</span><span className="date-tile__day">23</span></div>
                <div className="list__content"><span className="list__title">Kunal Arora, 3:00 PM</span><span className="list__sub">With an employee, technical round</span></div>
                {" "}
                <NotBuilt what="Reschedule" className="btn btn--sm" {...perm("recruitment:edit")}>Reschedule</NotBuilt>
              </div>
              <div className="list__item">
                <div className="date-tile"><span className="date-tile__month">Sep</span><span className="date-tile__day">24</span></div>
                <div className="list__content"><span className="list__title">Ritika Sen, 10:30 AM</span><span className="list__sub">With an HR Manager, HR round</span></div>
                {" "}
                <NotBuilt what="Reschedule" className="btn btn--sm" {...perm("recruitment:edit")}>Reschedule</NotBuilt>
              </div>
            </div>
          </section>
          <aside className="stack">
            <section className="card">
              <div className="card__header">
                <h3 className="card__title">Where candidates come from</h3>
                {" "}
                <span className="card__meta">48 total</span>
              </div>
              <div className="card__body">
                <div className="bar-row">
                  <span>Referral</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "100%" }} /></div>
                  <span className="bar-row__value">14</span>
                </div>
                <div className="bar-row">
                  <span>LinkedIn</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "93%" }} /></div>
                  <span className="bar-row__value">13</span>
                </div>
                <div className="bar-row">
                  <span>Careers page</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "71%" }} /></div>
                  <span className="bar-row__value">10</span>
                </div>
                <div className="bar-row">
                  <span>Naukri</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "57%" }} /></div>
                  <span className="bar-row__value">8</span>
                </div>
                <div className="bar-row">
                  <span>Other</span>
                  <div className="bar-row__track"><span className="bar-row__fill" style={{ "--w": "21%" }} /></div>
                  <span className="bar-row__value">3</span>
                </div>
              </div>
            </section>
            <div className="alert alert--info">Only HR and the hiring manager can see candidate details. The score is a guide from the screening step, not a hiring decision.</div>
          </aside>
        </div>
      </div>
    </Frame>
  );
}
