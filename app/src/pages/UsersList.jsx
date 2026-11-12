// users/users-list.html (L1), built in the design system. What the old page (pages/users-list.js) does, in its words:
// every employee from the live store; status tabs All / Active / On leave / Inactive with their counts; search by name,
// email or ID; department and role filters (all combine); 10 a page; ?dept=<code> from Departments' "View people";
// Export (the filtered rows, ui/csv-export.js, "users-<date>.csv"); Edit with users:edit; Add employee with users:create;
// Reset demo data for Admin and HR only, after the same question, then a reload. New with the design: Clear All.
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAllUsers, getAllDepartments, resetDemoData } from "../../../assets/js/data/store.js";
import { DEPARTMENTS } from "../../../assets/js/data/users.js";
import { ROLES } from "../../../assets/js/config/roles.js";
import { downloadCsv } from "../../../assets/js/ui/csv-export.js";
import { resetLeaveData } from "../../../assets/js/data/leave-store.js";
import { resetAttendanceData } from "../../../assets/js/data/attendance-store.js";
import { resetPayrollData } from "../../../assets/js/data/payroll-store.js";
import { resetExpenseData } from "../../../assets/js/data/expenses-store.js";
import { resetInventoryData } from "../../../assets/js/data/inventory-store.js";
import { resetAssetRequestData } from "../../../assets/js/data/asset-requests-store.js";
import { resetLocationData } from "../../../assets/js/data/locations-store.js";
import { useData, useSession, useCan } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { FilterBar, FilterSearch, FilterSelect } from "../components/Controls.jsx";
import { Person } from "../components/Form.jsx";
import { Icon } from "../components/icons.jsx";

const PAGE = "users/users-list.html";
export const STATUS = { "active": { label: "Active", tone: "success" }, "on-leave": { label: "On leave", tone: "info" }, "inactive": { label: "Inactive", tone: "" } };
const TABS = [["all", "All"], ["active", "Active"], ["on-leave", "On leave"], ["inactive", "Inactive"]];
export const RESET_CONFIRM = "This discards every change made to users, departments, leave, holidays, attendance, salaries, salary changes, payroll runs, expense claims, inventory, asset requests, deleted people's names, the company profile, offices, home locations and registered devices in this browser. Continue?";
const PLUS = "M12 5v14M5 12h14";

// Live departments first, so ones added later have names too; the built-in list covers any other code.
export const departmentName = (code) => getAllDepartments().find((d) => d.code === code)?.name ?? DEPARTMENTS.find((d) => d.code === code)?.name ?? code ?? "";
export const roleLabel = (key) => ROLES[key]?.label ?? key ?? "";
export const statusLabel = (status) => STATUS[status]?.label ?? status ?? "";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Content() {
  const { role } = useSession();
  const canEdit = useCan("users:edit"), canCreate = useCan("users:create");
  const confirm = useConfirm();
  const [params] = useSearchParams();
  const users = useData(() => getAllUsers());
  const departments = useData(() => getAllDepartments());
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState(() => { const p = params.get("dept"); return p && getAllDepartments().some((d) => d.code === p) ? p : ""; });
  const [roleKey, setRoleKey] = useState("");
  const [page, setPage] = useState(1);
  const reset = (f) => (v) => { f(v); setPage(1); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => (status === "all" || u.status === status) && (!dept || u.department === dept) && (!roleKey || u.role === roleKey)
      && (!q || [u.name, u.email, u.id].some((v) => String(v ?? "").toLowerCase().includes(q))));
  }, [users, status, query, dept, roleKey]);
  const counts = { all: users.length, active: 0, "on-leave": 0, inactive: 0 };
  users.forEach((u) => { if (u.status in counts) counts[u.status] += 1; });

  const exportCsv = () => downloadCsv([["ID", "Name", "Email", "Designation", "Department", "Role", "Status"],
    ...filtered.map((u) => [u.id, u.name, u.email, u.designation, departmentName(u.department), roleLabel(u.role), statusLabel(u.status)])], "users");
  const resetAll = async () => {
    if (!(await confirm({ message: RESET_CONFIRM, confirmLabel: "Reset demo data", danger: true }))) return;
    resetDemoData(); resetLeaveData(); resetAttendanceData(); resetPayrollData(); resetExpenseData(); resetInventoryData(); resetAssetRequestData(); resetLocationData();
    window.location.reload();
  };

  const columns = [
    { key: "name", label: "Employee", render: (u) => <Person name={u.name} sub={u.email} to={pageUrl(`users/user-profile.html?id=${encodeURIComponent(u.id)}`)} /> },
    { key: "id", label: "ID" },
    { key: "designation", label: "Designation", render: (u) => u.designation ?? "" },
    { key: "department", label: "Department", render: (u) => departmentName(u.department) },
    { key: "role", label: "Role", render: (u) => <Pill tone="info">{roleLabel(u.role)}</Pill> },
    { key: "status", label: "Status", render: (u) => <Pill tone={STATUS[u.status]?.tone ?? ""}>{statusLabel(u.status)}</Pill> },
    { key: "actions", label: "Actions", actions: true, render: (u) => (canEdit ? <Link className="ds-btn ds-btn--sm" to={pageUrl(`users/user-form.html?id=${encodeURIComponent(u.id)}`)}>Edit</Link> : null) },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle={`${plural(users.length, "employee", "employees")} across ${plural(departments.length, "department", "departments")}`}
        actions={<>
          {["admin", "hr"].includes(role?.key) && <button type="button" className="ds-btn ds-btn--ghost" onClick={resetAll}>Reset demo data</button>}
          <button type="button" className="ds-btn" onClick={exportCsv}>Export</button>
          {canCreate && <Link className="ds-btn ds-btn--primary" to={pageUrl("users/user-form.html")}><Icon d={PLUS} />Add employee</Link>}
        </>} />
      <Card id="users-card">
        <div className="ds-stack">
          <div className="ds-tabs" role="tablist" aria-label="Status">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" className="ds-tabs__tab" aria-selected={String(status === key)} data-status={key} onClick={() => reset(setStatus)(key)}>
                {label}<span className="ds-tabs__count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <FilterBar label="Filter users" active={Boolean(query || dept || roleKey)} onClearAll={() => { setQuery(""); setDept(""); setRoleKey(""); setPage(1); }}>
            <FilterSearch label="Search users" value={query} onChange={reset(setQuery)} placeholder="Search by name or ID" />
            <FilterSelect label="Department" value={dept} onChange={reset(setDept)} allLabel="All departments" options={departments.map((d) => ({ value: d.code, label: d.name }))} />
            <FilterSelect label="Role" value={roleKey} onChange={reset(setRoleKey)} allLabel="All roles" options={Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }))} />
          </FilterBar>
          <Table bare columns={columns} rows={filtered} page={page} onPageChange={setPage} empty="No employees match these filters." tableId="users-table" />
        </div>
      </Card>
    </>
  );
}

export default function UsersList() {
  return <Frame page={PAGE}><Content /></Frame>;
}