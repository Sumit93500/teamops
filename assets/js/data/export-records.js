// data/export-records.js (I2, 2026-11-28): the record exports, beside I1's people exports (data/export.js, which writes, logs and names
// every file the same way: exportFile dispatches here for these modules). Each module is a list over a date range, one row per record,
// with only what its exporter may read: the stores' own reads, people's names and departments through data/employee-record.js
// exportReader (as the profile shows them), bank account and PAN masked (the last 4) unless the exporter may Show them and asks.
//   leave       export:leave (HR, Admin)        the leave requests whose days touch the range
//   attendance  export:attendance (HR, Admin)   one row per person and day in the range (at most 92 days), by the day's rules (the
//                                               person's shift from the shift rules' start: data/shift-days.js shiftRangeFor)
//   expenses    export:expenses (Finance ONLY)  the claims spent in the range; whether a receipt is attached, never the file or its name
//   visits      export:visits (HR, Admin)       the visits whose days touch the range; the site's name, never a location reading
//   tasks       export:tasks (HR, Admin)        WORK tasks due in the range (data/tasks-store.js workTasksFor scope "all"); a personal
//                                               task is never read: the store gives none to anyone but its owner, and any row not a
//                                               work task is dropped all the same
//   payroll     export:payroll (Finance, HR; Admin)  the payroll register: every person's row of each month in the range (at most 12),
//                                               the stored run where there is one (prepared or approved), else the draft
// Dates in a file are YYYY-MM-DD and money is whole rupees, as the column names say.
import { getAllUsers, getAllDepartments } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { exportReader } from "./employee-record.js";
import { allRequests, LEAVE_POLICY } from "./leave-store.js";
import { shiftRangeFor } from "./shift-days.js";
import { allExpenses } from "./expenses-store.js";
import { CATEGORIES as EXPENSE_CATEGORIES } from "./expenses.js";
import { visitsVisibleTo } from "./visits.js";
import { KIND_LABEL, STATUS_LABEL as VISIT_STATUS } from "./visits-store.js";
import { workTasksFor } from "./tasks-store.js";
import { payrollRun, storedRun } from "./payroll-store.js";

const DURATION = { full: "Full day", "first-half": "First half", "second-half": "Second half" };
const CAP = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : "");
const DAY_STATUS = { present: "Present", late: "Late", "half-day": "Half day", absent: "Absent", "on-leave": "On leave", holiday: "Holiday", weekend: "Weekend",
  "weekly-off": "Weekly off", "short-leave": "Short leave", "not-yet": "Not yet", "no-data": "No data", "on-site": "On site", "visit-planned": "Visit planned" };
const yesNo = (b) => (b ? "Yes" : "No");
const pad = (n) => String(n).padStart(2, "0");
const iso = (at) => (at ? String(at).slice(0, 10) : "");
const PERSON = [{ key: "personId", header: "Employee ID" }, { key: "person", header: "Employee" }, { key: "department", header: "Department" }];

// The person cells, as the exporter sees them on a profile (null: not someone they may see).
function people(viewerId) {
  const read = exportReader(viewerId);
  const deps = getAllDepartments();
  const byId = new Map(getAllUsers().map((u) => [u.id, u]));
  const cache = new Map();
  return (id) => {
    if (!cache.has(id)) {
      const u = byId.get(id);
      const v = u ? read(u, ["name", "department", "bankAccount", "pan"], false) : null;
      const vFull = u && v ? read(u, ["bankAccount", "pan"], true) : null;
      cache.set(id, v ? { personId: u.id, person: v.name ?? u.name, department: deps.find((d) => d.code === u.department)?.name ?? v.department ?? "", masked: v, full: vFull ?? v } : null);
    }
    return cache.get(id);
  };
}
const overlaps = (a1, a2, from, to) => a1 <= to && a2 >= from;
const monthsIn = (from, to) => {
  const out = [];
  for (let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)); `${y}-${pad(m)}` <= to.slice(0, 7); m === 12 ? (y += 1, m = 1) : (m += 1)) out.push([y, m]);
  return out;
};

export const RECORD_MODULES = Object.freeze({
  leave: {
    label: "Leave", permission: "export:leave", maxDays: 366, noun: ["leave request", "leave requests"],
    columns: () => [{ key: "id", header: "Request ID" }, ...PERSON, { key: "type", header: "Leave type" }, { key: "from", header: "From (YYYY-MM-DD)" }, { key: "to", header: "To (YYYY-MM-DD)" },
      { key: "duration", header: "Duration" }, { key: "days", header: "Days" }, { key: "status", header: "Status" }, { key: "appliedOn", header: "Applied on (YYYY-MM-DD)" }, { key: "reason", header: "Reason" }],
    rows: (viewerId, { from, to }) => {
      const who = people(viewerId);
      return allRequests().filter((r) => overlaps(r.from, r.to, from, to)).sort((a, b) => a.from.localeCompare(b.from) || a.id.localeCompare(b.id, "en", { numeric: true }))
        .map((r) => ({ r, p: who(r.userId) })).filter((x) => x.p)
        .map(({ r, p }) => ({ id: r.id, ...p, type: LEAVE_POLICY[r.type]?.label ?? r.type, from: r.from, to: r.to, duration: DURATION[r.duration] ?? r.duration, days: String(r.days ?? ""), status: CAP(r.status), appliedOn: r.appliedOn ?? "", reason: r.reason ?? "" }));
    },
  },
  attendance: {
    label: "Attendance", permission: "export:attendance", maxDays: 92, noun: ["day", "days"],
    columns: () => [...PERSON, { key: "date", header: "Date (YYYY-MM-DD)" }, { key: "status", header: "Status" }, { key: "shift", header: "Shift" }, { key: "checkIn", header: "Check-in" },
      { key: "checkOut", header: "Check-out" }, { key: "hours", header: "Hours" }, { key: "late", header: "Minutes late" }, { key: "mode", header: "Mode" }, { key: "corrected", header: "Corrected" }],
    rows: (viewerId, { from, to }) => {
      const who = people(viewerId);
      const out = [];
      for (const u of getAllUsers().sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))) {
        const p = who(u.id);
        if (!p) continue;
        for (const d of shiftRangeFor(u.id, from, to) ?? []) {
          if (!d || d.status === "not-joined" || d.status === "left") continue;
          out.push({ ...p, date: d.date, status: DAY_STATUS[d.status] ?? CAP(d.status), shift: d.shiftName ?? "", checkIn: d.checkIn ?? "", checkOut: d.checkOut ?? "", hours: d.hours == null ? "" : String(d.hours),
            late: d.minutesLate ? String(d.minutesLate) : "", mode: d.checkIn ? (d.mode === "wfh" ? "Work from home" : d.onSite ? "On site" : "Office") : "", corrected: yesNo(d.regularized) });
        }
      }
      return out;
    },
  },
  expenses: {
    label: "Expenses", permission: "export:expenses", maxDays: 366, noun: ["claim", "claims"],
    columns: () => [{ key: "id", header: "Claim ID" }, ...PERSON, { key: "category", header: "Category" }, { key: "amount", header: "Amount (₹)" }, { key: "date", header: "Spent on (YYYY-MM-DD)" },
      { key: "reason", header: "Reason" }, { key: "receipt", header: "Receipt attached" }, { key: "status", header: "Status" }, { key: "appliedOn", header: "Claimed on (YYYY-MM-DD)" }, { key: "paidOn", header: "Paid on (YYYY-MM-DD)" }],
    rows: (viewerId, { from, to }) => {
      const who = people(viewerId);
      return allExpenses().filter((c) => c.date >= from && c.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id, "en", { numeric: true }))
        .map((c) => ({ c, p: who(c.userId) })).filter((x) => x.p)
        .map(({ c, p }) => ({ id: c.id, ...p, category: EXPENSE_CATEGORIES[c.category]?.label ?? c.category, amount: String(c.amount), date: c.date, reason: c.reason ?? "", receipt: yesNo(c.receipt || c.receiptFileId),
          status: CAP(c.status), appliedOn: c.appliedOn ?? "", paidOn: iso(c.history?.find((h) => h.decision === "paid")?.at) }));
    },
  },
  visits: {
    label: "Visits", permission: "export:visits", maxDays: 366, noun: ["visit", "visits"],
    columns: () => [{ key: "id", header: "Visit ID" }, ...PERSON, { key: "kind", header: "Kind" }, { key: "site", header: "Site" }, { key: "purpose", header: "Purpose" },
      { key: "from", header: "From (YYYY-MM-DD)" }, { key: "to", header: "To (YYYY-MM-DD)" }, { key: "days", header: "Days" }, { key: "status", header: "Status" }],
    rows: (viewerId, { from, to }) => {
      const who = people(viewerId);
      return visitsVisibleTo(viewerId).filter((x) => overlaps(x.fromDate, x.toDate, from, to)).sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.id.localeCompare(b.id, "en", { numeric: true }))
        .map((x) => ({ x, p: who(x.personId) })).filter((y) => y.p)
        .map(({ x, p }) => ({ id: x.id, ...p, kind: KIND_LABEL[x.kind] ?? x.kind, site: x.siteName ?? "", purpose: x.purpose ?? "", from: x.fromDate, to: x.toDate, days: String(x.dates?.length ?? ""), status: VISIT_STATUS[x.status] ?? CAP(x.status) }));
    },
  },
  tasks: {
    label: "Work tasks", permission: "export:tasks", maxDays: 366, noun: ["task", "tasks"],
    columns: () => [{ key: "id", header: "Task ID" }, { key: "title", header: "Title" }, { key: "personId", header: "Assigned to (employee ID)" }, { key: "person", header: "Assigned to" },
      { key: "assigner", header: "Assigned by" }, { key: "due", header: "Due (YYYY-MM-DD)" }, { key: "priority", header: "Priority" }, { key: "status", header: "Status" }, { key: "overdue", header: "Overdue" },
      { key: "created", header: "Created on (YYYY-MM-DD)" }, { key: "done", header: "Done on (YYYY-MM-DD)" }],
    rows: (viewerId, { from, to }, now) => {
      const who = people(viewerId);
      return workTasksFor(viewerId, { scope: "all" }, now).filter((t) => /^WT-/.test(t.id) && t.assigneeId && t.dueDate >= from && t.dueDate <= to)
        .map((t) => ({ t, p: who(t.assigneeId) })).filter((x) => x.p)
        .map(({ t, p }) => ({ id: t.id, title: t.title, personId: p.personId, person: p.person, assigner: who(t.assignerId)?.person ?? "", due: t.dueDate, priority: CAP(t.priority), status: CAP(t.status),
          overdue: yesNo(t.overdue), created: iso(t.createdAt), done: iso(t.doneAt) }));
    },
  },
  payroll: {
    label: "Payroll register", permission: "export:payroll", maxDays: 366, maxMonths: 12, sensitive: true, noun: ["row", "rows"],
    columns: () => [{ key: "month", header: "Month (YYYY-MM)" }, ...PERSON, { key: "monthlyGross", header: "Monthly gross (₹)" }, { key: "lopDays", header: "Loss of pay days" },
      { key: "lopAmount", header: "Loss of pay (₹)" }, { key: "gross", header: "Gross paid (₹)" }, { key: "pf", header: "PF (₹)" }, { key: "pt", header: "Professional tax (₹)" }, { key: "tds", header: "TDS (₹)" },
      { key: "deductions", header: "Deductions (₹)" }, { key: "net", header: "Net pay (₹)" }, { key: "run", header: "Run" }, { key: "hold", header: "On hold" },
      { key: "bankAccount", header: "Bank account", sensitive: true }, { key: "pan", header: "PAN", sensitive: true }],
    rows: (viewerId, { from, to, full = false }) => {
      const who = people(viewerId);
      const out = [];
      for (const [y, m] of monthsIn(from, to)) {
        const run = storedRun(y, m) ?? payrollRun(y, m);
        for (const r of run?.rows ?? []) {
          const p = who(r.userId);
          if (!p) continue;
          const bank = full ? p.full : p.masked;
          out.push({ month: `${y}-${pad(m)}`, ...p, monthlyGross: String(r.monthlyGross ?? ""), lopDays: String(r.lop?.days ?? 0), lopAmount: String(r.lop?.amount ?? 0), gross: String(r.gross ?? ""),
            pf: String(r.deductionLines?.pf ?? ""), pt: String(r.deductionLines?.pt ?? ""), tds: String(r.deductionLines?.tds ?? ""), deductions: String(r.deductions ?? ""), net: String(r.net ?? ""),
            run: CAP(run.status), hold: r.holdReason ?? "", bankAccount: bank?.bankAccount ?? "", pan: bank?.pan ?? "" });
        }
      }
      return out;
    },
  },
});

export const isRecordModule = (module) => Object.hasOwn(RECORD_MODULES, module);
// the record modules a viewer may export (the Export data page's cards)
export const recordModulesFor = (viewer) => Object.keys(RECORD_MODULES).filter((k) => viewer && hasPermission(viewer, RECORD_MODULES[k].permission));