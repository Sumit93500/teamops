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
import { todayIso } from "../../../assets/js/ui/leave-view.js";
import { PageHeader, Card as DsCard, HeroCard, KpiCard, Pill } from "../components/Layout.jsx";
import { FilterBar, DateRange, FilterSelect, FilterSearch, SelectField, Segmented, Toggle, IconButton, DownloadMenu, rangeWords } from "../components/Controls.jsx";
import { ICON as DSICON } from "../components/icons.jsx";
import { tabTitle } from "../data/company.js";
import { AreaChart, BarChart, DonutChart, IndiaMap } from "../components/charts/Charts.jsx";
import { addDays } from "../../../assets/js/data/holidays.js";

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

// D2a: the design system's new components, with demo values (the gallery isn't a product page; nothing here is saved).
const TREND = [32, 30, 36, 36, 36, 41, 48, 45, 44, 55, 55, 57, 60];
const OTHER = [16, 20, 31, 32, 47, 44, 37, 39, 52, 43, 45, 56, 57];
function Foundation() {
  const showToast = useToast();
  const today = todayIso();
  const [range, setRange] = useState({ preset: "", from: "", to: "" });
  const [dept, setDept] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("volume");
  const [live, setLive] = useState(true);
  const [where, setWhere] = useState("head");
  const active = Boolean(range.preset || dept || query);
  const STATUS = { head: { tone: "success", text: "Online, 47 m from the office" }, home: { tone: "info", text: "Working from home" }, client: { tone: "warning", text: "At a client site: location not checked yet" } };
  return (
    <section className="ds-stack gallery__foundation" aria-labelledby="g-foundation">
      <PageHeader title="Design foundation" level={2} id="g-foundation" subtitle="The new components, light and dark, at every width"
        breadcrumb={[{ label: "Gallery", to: "/gallery" }, { label: "Design foundation" }]}
        actions={<><IconButton label="Refresh" icon={DSICON.progress} onClick={() => showToast("Refreshed (nothing changes in the gallery).", "info")} /><DownloadMenu items={[{ label: "Download as CSV", onSelect: () => showToast("Downloaded: CSV (gallery sample).", "success") }, { label: "Download as PDF", onSelect: () => showToast("Downloaded: PDF (gallery sample).", "success") }]} /></>} />
      <FilterBar label="Gallery filters" active={active} onClearAll={() => { setRange({ preset: "", from: "", to: "" }); setDept(""); setQuery(""); }}>
        <DateRange value={range} onChange={setRange} today={today} />
        <FilterSelect label="Department" value={dept} onChange={setDept} options={["Engineering", "Finance", "Human Resources"]} allLabel="All departments" />
        <FilterSearch label="Search people" value={query} onChange={setQuery} placeholder="Name or ID" />
      </FilterBar>
      <p className="text-sm text-muted" id="g-filter-state">{`Filters: ${range.preset ? rangeWords(range) : "all dates"}; ${dept || "all departments"}; ${query ? `"${query}"` : "no search"}`}</p>
      <div className="ds-grid">
        <KpiCard id="present" label="Present today" value="41" icon={DSICON.users} change={{ direction: "up", text: "3.4% vs last month" }} trend={TREND} trendLabel="Trend over 13 weeks: rising" />
        <KpiCard id="late" label="Late check-ins" value="6" icon={DSICON.clock} change={{ direction: "up", text: "2 more than last week", good: false }} trend={[3, 4, 2, 5, 4, 6]} trendLabel="Trend over 6 weeks: rising" />
        <KpiCard id="leave" label="On leave" value="3" icon={DSICON.calendar} change={{ direction: "down", text: "1 fewer than yesterday", good: true }} />
        <KpiCard id="open" label="Open requests" value="12" icon={DSICON.layers} change={{ direction: "flat", text: "Same as last week" }} />
      </div>
      <HeroCard icon={DSICON.pulse} title="Performance" pills={[{ label: "In progress", icon: DSICON.progress }, { label: "Due in 3 days", icon: DSICON.clock }]}
        value="67%" caption="Efficiency, from 8 key indicators (sample)" series={[{ name: "This quarter", values: TREND }, { name: "Last quarter", values: OTHER, dashed: true }]}
        band={{ from: 5, to: 7, label: "Holiday week" }} plotLabel="This quarter against last quarter, 13 weeks; a holiday week is marked" />
      <div className="grid grid-main-aside">
        <DsCard id="g-controls" title="Segmented, toggle, pills" meta="Controls">
          <div className="ds-stack">
            <Segmented label="Show by" value={view} onChange={setView} options={[{ value: "volume", label: "Volume" }, { value: "value", label: "Value" }, { value: "count", label: "Count" }]} />
            <p className="text-sm text-muted" id="g-seg-state">{`Showing by ${view}`}</p>
            <Toggle label="Live updates" checked={live} onChange={setLive} />
            <div className="gallery__row">
              <Pill tone="success">Live</Pill><Pill tone="warning">Pending</Pill><Pill tone="danger">Overdue</Pill><Pill tone="info">New</Pill><Pill icon={DSICON.calendar}>This month</Pill>
            </div>
          </div>
        </DsCard>
        <DsCard id="g-checkin" title="Check-in from" meta="SelectField">
          <SelectField label="Check-In From" icon={DSICON.home} value={where} onChange={setWhere}
            options={[{ value: "head", label: "Head Office" }, { value: "home", label: "Home" }, { value: "client", label: "Client site" }]}
            helper="Where you're working today (sample: the location rules come later)" status={STATUS[where]} />
        </DsCard>
      </div>
    </section>
  );
}

// D2b: the charts and the map, with sample data in the chart-data contract (nothing here is the store's), and the cases the chart
// checks use: empty, one point, many points, long labels, negative values.
const chartOf = (title, unit, labels, series, extra = {}) => ({ title, unit, labels, series: series.map(([name, values]) => ({ name, values })), empty: false, emptyReason: null, ...extra });
function sampleCharts(today) {
  const days = (n) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
  const d90 = days(90);
  const wave = (i, a, b, c) => Math.round(a + b * Math.sin(i / 7) + c * Math.cos(i / 3.1));
  const d365 = days(365);
  const LONG = ["Engineering and Platform Reliability", "Finance", "Human Resources and People Operations", "Sales", "Customer Success and Support (India and APAC)", "Operations"];
  return {
    area: chartOf("Requests opened and closed (sample)", "requests", d90, [["Opened", d90.map((_, i) => wave(i, 42, 12, 5))], ["Closed", d90.map((_, i) => wave(i + 4, 36, 10, 4))]]),
    donut: chartOf("Leave taken by type (sample)", "days", ["Casual", "Sick", "Earned", "Work from home", "Unpaid", "Comp off"], [["Days", [42, 26, 31, 18, 5, 2]]]),
    grouped: chartOf("Check-ins, planned and actual (sample)", "check-ins", days(7), [["Planned", [176, 170, 166, 12, 194, 172, 169]], ["Actual", [103, 109, 103, 0, 104, 107, 105]]]),
    stacked: chartOf("Requests by status, by month (sample)", "requests", ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], [["Approved", [38, 42, 35, 47, 51, 44]], ["Pending", [6, 4, 9, 5, 7, 12]], ["Rejected", [3, 5, 2, 4, 3, 6]]]),
    map: chartOf("Employees by state (sample)", "employees", ["Maharashtra", "Karnataka", "Haryana", "Delhi", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Gujarat", "West Bengal", "Kerala", "Rajasthan", "Punjab"],
      [["Employees", [42, 38, 31, 27, 22, 18, 15, 12, 9, 6, 4, 3]]]),
    empty: chartOf("Attendance rate (sample, empty)", "%", days(7), [["Rate", days(7).map(() => null)]], { empty: true, emptyReason: "nobody-expected" }),
    one: chartOf("Headcount, one department (sample)", "employees", ["Engineering"], [["Employees", [4]]]),
    many: chartOf("Daily sign-ins over a year (sample)", "sign-ins", d365, [["Sign-ins", d365.map((_, i) => wave(i, 160, 40, 18))]]),
    long: chartOf("Headcount by department, long names (sample)", "employees", LONG, [["Employees", [14, 3, 5, 9, 11, 4]]]),
    negative: chartOf("Net change in headcount, by month (sample)", "employees", ["Apr", "May", "Jun", "Jul", "Aug", "Sep"], [["Change", [-3, 5, -1, 2, 0, 4]]]),
  };
}
function ChartsGallery() {
  const today = todayIso();
  const c = sampleCharts(today);
  return (
    <section className="ds-stack gallery__charts-section" aria-labelledby="g-charts">
      <PageHeader title="Charts and map" level={2} id="g-charts" subtitle="Sample data in the chart-data contract; the drawing loads on first use"
        breadcrumb={[{ label: "Gallery", to: "/gallery" }, { label: "Charts and map" }]} />
      <div className="gallery__charts">
        <DsCard id="g-area" title={c.area.title} meta="AreaChart"><AreaChart id="g-area-chart" chart={c.area} dateFilter today={today} /></DsCard>
        <DsCard id="g-donut" title={c.donut.title} meta="DonutChart"><DonutChart id="g-donut-chart" chart={c.donut} labelHeader="Leave type" /></DsCard>
        <DsCard id="g-grouped" title={c.grouped.title} meta="BarChart, grouped"><BarChart id="g-grouped-chart" chart={c.grouped} labelHeader="Day" /></DsCard>
        <DsCard id="g-stacked" title={c.stacked.title} meta="BarChart, stacked"><BarChart id="g-stacked-chart" chart={c.stacked} stacked labelHeader="Month" /></DsCard>
      </div>
      <DsCard id="g-map" title={c.map.title} meta="IndiaMap"><IndiaMap id="g-map-chart" chart={c.map} /></DsCard>
      <h3 className="gallery__subhead">Chart cases</h3>
      <div className="gallery__charts">
        <DsCard id="g-empty" title={c.empty.title} meta="Empty"><AreaChart id="g-empty-chart" chart={c.empty} /></DsCard>
        <DsCard id="g-one" title={c.one.title} meta="One point"><BarChart id="g-one-chart" chart={c.one} labelHeader="Department" /></DsCard>
        <DsCard id="g-many" title={c.many.title} meta="Many points"><AreaChart id="g-many-chart" chart={c.many} dateFilter today={today} /></DsCard>
        <DsCard id="g-negative" title={c.negative.title} meta="Negative values"><BarChart id="g-negative-chart" chart={c.negative} labelHeader="Month" /></DsCard>
        <DsCard id="g-long" title={c.long.title} meta="Long labels, bars"><BarChart id="g-long-chart" chart={c.long} horizontal labelHeader="Department" /></DsCard>
        <DsCard id="g-long-cols" title={c.long.title} meta="Long labels, columns"><BarChart id="g-long-cols-chart" chart={c.long} labelHeader="Department" /></DsCard>
      </div>
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
        <Foundation />
        <ChartsGallery />
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
  useLayoutEffect(() => { document.documentElement.dataset.role = role?.key ?? "admin"; document.title = tabTitle("Component gallery"); }, [role]);
  if (user) return <Shell page="gallery" title="Component gallery"><Content /></Shell>;
  return <div className="app"><div className="main"><main className="content" id="main" data-page="gallery"><Content /></main></div></div>;
}
