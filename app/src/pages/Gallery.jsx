// /gallery: every round-4 component on one page, with demo data (the people are the store's own), so each can be seen in
// both themes at 412 and 1280. Not a product page: it isn't in the sidebar or search. Inside the shell when signed in.
import { useLayoutEffect, useState } from "react";
import { getAllUsers } from "../../../assets/js/data/store.js";
import { departmentName } from "../../../assets/js/ui/leave-view.js";
import { useSession } from "../data/hooks.js";
import Shell from "../shell/Shell.jsx";
import { useToast } from "../ui/Toast.jsx";
import Modal from "../components/Modal.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Table from "../components/Table.jsx";
import { ColumnChart, BarRows } from "../components/Charts.jsx";
import { StatStrip, StatCard, EmptyState, Badge, PersonCell, Stepper, NotBuilt, Tabs } from "../components/Basics.jsx";

const DAYS = [52, 91, 93, 0, 92, 94, 90, 53, 48, 89, 95, 70, 88, 93].map((h, i) => ({
  date: `2026-09-${String(14 + i).padStart(2, "0")}`, height: h,
  modifier: [0, 7, 8].includes(i) ? "muted" : i === 3 ? "absent" : i === 11 ? "incomplete" : i === 5 ? "leave" : "",
  what: [0, 7, 8].includes(i) ? `${h}% (day off)` : i === 3 ? "Absent" : i === 11 ? "Missing check-out" : i === 5 ? "On leave" : `${h}%`,
}));
const ICON = "M4 8h16v11H4zM9 8V5h6v3";

function Card({ title, children }) {
  return (
    <section className="card">
      <div className="card__header"><h3 className="card__title">{title}</h3></div>
      <div className="card__body gallery__section">{children}</div>
    </section>
  );
}

function Content() {
  const showToast = useToast();
  const confirm = useConfirm();
  const [modal, setModal] = useState(false);
  const [answer, setAnswer] = useState("");
  const users = getAllUsers();
  const columns = [
    { key: "name", label: "Employee", sort: (u) => u.name, render: (u) => <PersonCell userId={u.id} name={u.name} sub={u.id} />, csv: (u) => u.name },
    { key: "dept", label: "Department", sort: (u) => departmentName(u.department), render: (u) => departmentName(u.department) },
    { key: "designation", label: "Designation", sort: (u) => u.designation ?? "" },
    { key: "status", label: "Status", render: (u) => <Badge tone={u.status === "inactive" ? "danger" : "success"} dot>{u.status === "inactive" ? "Inactive" : "Active"}</Badge>, csv: (u) => u.status ?? "active" },
    { key: "actions", label: "Actions", actions: true, render: () => <NotBuilt what="Edit" className="btn btn--sm" /> },
  ];
  return (
    <>
      <div className="page-header"><div><h1>Component gallery</h1><p className="page-header__subtitle">Every shared component, as the pages will use them</p></div></div>
      <div className="stack">
        <StatStrip label="Key numbers">
          <StatCard icon={ICON} tone={1} label="Open positions" value="9" note="Sample, not built yet" />
          <StatCard icon={ICON} tone={2} label="On leave today" value="2" note="1 more than yesterday" noteTone="up" />
          <StatCard icon={ICON} tone={3} label="Late check-ins" value="3" note="2 fewer than last week" noteTone="down" />
          <StatCard icon={ICON} tone={4} label="Payroll" value="₹6,20,000" />
        </StatStrip>
        <Card title="Toasts, dialogs and the unsaved-changes guard">
          <div className="gallery__row">
            <button className="btn" type="button" onClick={() => showToast("Saved.", "success")}>Success toast</button>
            <button className="btn" type="button" onClick={() => showToast("Something went wrong.", "danger")}>Danger toast</button>
            <button className="btn" type="button" onClick={async () => setAnswer(String(await confirm({ message: "Approve this request?\nPriya Nair, Work from home, 1 Oct", confirmLabel: "Approve" })))}>Confirm</button>
            <button className="btn btn--danger" type="button" onClick={async () => setAnswer(String(await confirm({ message: "Remove Diwali on 8 Nov 2026?", confirmLabel: "Remove", danger: true })))}>Danger confirm</button>
            <button className="btn btn--primary" type="button" data-open-modal onClick={() => setModal(true)}>Open a form</button>
            <NotBuilt what="Bulk upload" />
          </div>
          <p className="text-sm text-muted" id="gallery-answer">{answer && `Answered: ${answer === "true" ? "yes" : "no"}`}</p>
        </Card>
        <div className="grid grid-main-aside">
          <Card title="Attendance rate, last 14 days">
            <ColumnChart days={DAYS} label="Attendance rate for the last 14 days" />
          </Card>
          <Card title="Leave by type">
            <BarRows rows={[{ label: "Casual", value: "12", percent: 60 }, { label: "Sick", value: "5", percent: 25 }, { label: "Work from home", value: "3", percent: 15 }]} />
          </Card>
        </div>
        <Table title="Employees" columns={columns} rows={users} filter="Search employees" exportName="gallery-employees" pageSize={5} initialSort={{ key: "name", dir: "ascending" }}
          tools={<Badge tone="info" square>{`${users.length} people`}</Badge>} />
        <div className="grid grid-main-aside">
          <Card title="Tabs">
            <Tabs pill tabs={[{ label: "Pending", count: 4, content: <p>Four waiting.</p> }, { label: "Approved", count: 1, content: <p>One approved.</p> }, { label: "Paid", count: 1, content: <p>One paid.</p> }]} />
          </Card>
          <Card title="Badges, a person, steps">
            <div className="gallery__row">
              <Badge tone="warning" dot>Pending</Badge><Badge tone="success" dot>Approved</Badge><Badge tone="danger" dot>Rejected</Badge><Badge tone="info">Info</Badge><Badge square>12 a year</Badge>
            </div>
            <PersonCell userId="EMP-1105" sub="Software Engineer" />
            <Stepper steps={[{ state: "done", title: "Sent", detail: "18 Sep by you" }, { state: "current", title: "First approval", detail: "Waiting for Sneha Rao" }, { state: "", title: "Final approval", detail: "HR or an Admin" }]} />
          </Card>
        </div>
        <Card title="Empty states">
          <EmptyState text="Pick another period to see its numbers." />
          <EmptyState title="No leave requests yet" text="Requests you send show here." to="/pages/leave/apply-leave.html" linkText="Apply for leave" icon={ICON} />
        </Card>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add department" desc="A department groups people for reports and approvals."
        footer={<><button className="btn" type="button" onClick={() => setModal(false)}>Cancel</button><button className="btn btn--primary" type="button" onClick={() => { setModal(false); showToast("Nothing was saved: this is the gallery.", "info"); }}>Save</button></>}>
        <div className="form-field"><label className="form-label" htmlFor="g-name">Name</label><input className="input" id="g-name" /></div>
        <div className="form-field"><label className="form-label" htmlFor="g-code">Code</label><input className="input" id="g-code" /></div>
      </Modal>
    </>
  );
}

export default function Gallery() {
  const { user, role } = useSession();
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; document.title = "Component gallery | OfficeOS"; }, [role]);
  if (user) return <Shell page="gallery" title="Component gallery"><Content /></Shell>;
  return <div className="app"><div className="main"><main className="content" id="main" data-page="gallery"><Content /></main></div></div>;
}
