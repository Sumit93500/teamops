// Delegation (pages/access/delegation.html), a faithful sample (round 16; ruled 2026-11-11: the sample pages are ported as
// they are): delegation isn't part of OfficeOS, so the form saves nothing and the delegations listed are examples, as the
// notice says. Written as JSX from the old page's HTML (tools/react/html2jsx.py), with what app.js gave it: controls the person
// may not use hidden (perm), "isn't available in this demo" on the placeholders (NotBuilt), the phone cards (Table).
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { Badge, NotBuilt } from "../components/Basics.jsx";
import { usePerm } from "../ui/perm.js";
import { pageUrl } from "../routes.js";

const PAGE = "access/delegation.html";
const HISTORY = [
  { to: "Anil Verma", period: "29 Sep – 3 Oct", covers: "Leave, regularization", status: ["Ended", ""] },
  { to: "Ritu Malhotra", period: "12 – 16 Oct", covers: "Purchase orders, role changes", status: ["Scheduled", "info"] },
  { to: "A department head", period: "12 – 14 Jul", covers: "Leave, regularization", status: ["Ended", ""] },
];
const COLUMNS = [
  { key: "by", label: "Delegated by", render: () => <div className="table__user"><div className="avatar avatar--3">AD</div><span className="table__user-name">An Admin</span></div> },
  { key: "to", label: "Delegated to" },
  { key: "period", label: "Period" },
  { key: "covers", label: "Covers" },
  { key: "status", label: "Status", render: (r) => <Badge tone={r.status[1]} dot>{r.status[0]}</Badge> },
];
const Check = ({ on, children }) => <label className="check"><input type="checkbox" defaultChecked={on} />{" "}{children}</label>;
const Switch = ({ on, children }) => <label className="switch"><input type="checkbox" defaultChecked={on} />{" "}{children}</label>;
const Kv = ({ term, children }) => <div className="kv__row"><dt>{term}</dt><dd>{children}</dd></div>;

export default function Delegation() {
  const perm = usePerm();
  return (
    <Frame page={PAGE}>
      <div className="page-header">
        <div>
          <ol className="breadcrumb mb-2" aria-label="Breadcrumb">
            <li className="breadcrumb__item"><Link to={pageUrl("access/roles-list.html")}>Roles &amp; permissions</Link></li>
            <li className="breadcrumb__item" aria-current="page">Delegation</li>
          </ol>
          <h1>Delegation</h1>
          <p className="page-header__subtitle">Hand your approvals to a colleague while you are away</p>
        </div>
        <div className="page-header__actions"><Link to={pageUrl("access/approval-workflows.html")} className="btn">Approval workflows</Link></div>
      </div>
      <div className="stack">
        <div className="alert alert--info">Sample, not built yet: delegation isn't part of OfficeOS yet. This page shows how it could look; nothing here is saved, and the delegations listed are examples.</div>
        <div className="grid grid-main-aside">
          <form className="card" onSubmit={(e) => e.preventDefault()}>
            <section className="form-section">
              <div className="form-section__head">
                <h3 className="form-section__title">Who covers for you</h3>
                <p className="form-section__desc">They can only approve what their own role is allowed to approve.</p>
              </div>
              <div className="form-grid">
                <div className="form-field form-field--full">
                  <label className="form-label form-label--required" htmlFor="d-to">Delegate to</label>
                  {" "}
                  <select className="select" id="d-to" required defaultValue="">
                    <option value="">Select a colleague</option>
                    <option>Ritu Malhotra (Admin)</option>
                    <option>A department head</option>
                    <option>An HR Manager</option>
                  </select>
                </div>
                <div className="form-field"><label className="form-label form-label--required" htmlFor="d-from">From</label>{" "}<input className="input" id="d-from" type="date" required /></div>
                <div className="form-field"><label className="form-label form-label--required" htmlFor="d-until">Until</label>{" "}<input className="input" id="d-until" type="date" required /></div>
              </div>
            </section>
            <section className="form-section">
              <div className="form-section__head">
                <h3 className="form-section__title">What they can approve</h3>
                <p className="form-section__desc">Choose only what you need to hand over.</p>
              </div>
              <div className="check-list">
                <Check on>Purchase orders</Check>{" "}<Check on>Role changes</Check>{" "}<Check>Backup restore</Check>{" "}
                <Check>Salary revisions</Check>{" "}<Check>Asset requests</Check>{" "}<Check>Expense claims</Check>
              </div>
              <h4 className="form-subtitle">Note and notifications</h4>
              <div className="form">
                <div className="form-field"><label className="form-label" htmlFor="d-note">Note for your delegate</label>{" "}<textarea className="textarea" id="d-note" placeholder="Anything they should know while you are away" /></div>
                <div className="toggle-list">
                  <Switch on>Email my delegate the details</Switch>{" "}<Switch on>Tell people who are waiting on me</Switch>
                </div>
              </div>
            </section>
            <div className="card__footer">
              <span className="card__meta">You can end a delegation early at any time.</span>
              {" "}
              <div className="btn-group"><Link to={pageUrl("access/delegation.html")} className="btn">Cancel</Link>{" "}<NotBuilt what="Delegate approvals" className="btn btn--primary" {...perm("delegation:create")} /></div>
            </div>
          </form>
          <aside className="stack">
            <section className="card">
              <div className="card__header"><h3 className="card__title">Your delegations</h3>{" "}<span className="card__meta">1 scheduled</span></div>
              <div className="list">
                <div className="list__item">
                  <div className="avatar avatar--3">RM</div>
                  <div className="list__content"><span className="list__title">Ritu Malhotra</span><span className="list__sub">12 – 16 Oct, purchase orders and role changes</span></div>
                  {" "}
                  <Badge tone="info" dot>Scheduled</Badge>
                </div>
              </div>
              <div className="card__footer">
                <span className="card__meta">Nothing active right now</span>
                {" "}
                <NotBuilt what="End early" className="btn btn--sm btn--danger" {...perm("delegation:create")} />
              </div>
            </section>
            <section className="card">
              <div className="card__header"><h3 className="card__title">How it works</h3></div>
              <div className="card__body">
                <dl className="kv">
                  <Kv term="Delegate's access">Only the items you pick</Kv>
                  <Kv term="Your own requests">Never delegated</Kv>
                  <Kv term="Audit log">Shows who really approved</Kv>
                  <Kv term="When it ends">Automatically on the last day</Kv>
                </dl>
              </div>
            </section>
            <div className="alert alert--warning">A delegate can't approve their own requests, even while covering for you. Those still go to someone else.</div>
          </aside>
        </div>
        <section className="card">
          <div className="card__header"><h3 className="card__title">Delegation history</h3>{" "}<span className="card__meta">Company-wide</span></div>
          <Table bare pager={false} columns={COLUMNS} rows={HISTORY} rowKey={(r) => r.to + r.period} />
        </section>
      </div>
    </Frame>
  );
}
