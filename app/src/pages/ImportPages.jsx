// I2: the import pages after I1's Import employees, each the shared wizard (ui/ImportWizard.jsx) with its form and its words:
//   Import assets               import:assets (IT; Admin)                   data/import-assets.js ASSETS_FORM
//   Import stock counts         import:stock-opening (IT; Admin)            data/import-assets.js STOCK_OPENING_FORM
//   Import licences             import:licences (IT; Admin)                 data/import-licences.js
//   Import leave balances       import:leave-balances (HR; Admin)           data/import-leave.js
//   Import attendance corrections   import:attendance-corrections (HR; Admin)   data/import-attendance.js
// The pages are the app's own (shell/importAccess.js); each draws its own guard and the data layer checks the permission again.
import { Link } from "react-router-dom";
import { ASSETS_FORM, STOCK_OPENING_FORM } from "../../../assets/js/data/import-assets.js";
import { LICENCES_FORM } from "../../../assets/js/data/import-licences.js";
import { LEAVE_BALANCES_FORM } from "../../../assets/js/data/import-leave.js";
import { ATTENDANCE_CORRECTIONS_FORM } from "../../../assets/js/data/import-attendance.js";
import { leaveFrom } from "../../../assets/js/data/pay-settings.js";
import { formatDay, todayIso } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import ImportWizard, { doneWords, skippedWords } from "../ui/ImportWizard.jsx";
import { ICON } from "../components/icons.jsx";
import { useCan } from "../data/hooks.js";
import { pageUrl, IMPORT_ASSETS, IMPORT_STOCK, IMPORT_LICENCES, IMPORT_LEAVE, IMPORT_ATTENDANCE, IT_LICENCES } from "../routes.js";

const STEPS = (done) => ["The template, then your file", "What the file holds", "What will happen", done];
const LEAD = (lists) => `It has the columns below, one example row marked EXAMPLE and notes listing ${lists}. Those rows are never imported.`;
const raw = (key) => (r) => r.raw?.[key] || "—";
const rowCol = { key: "row", label: "Row", num: true, render: (c) => String(c.row) };
const skipped = (ready, s, tail = "") => { const w = skippedWords(ready, s); return w ? <li key="skip">{w}{tail}</li> : null; };
const together = <li key="all">All of it is saved together, or none of it. The import is recorded in the history and the audit trail.</li>;
const profile = (c) => <Link className="ix-link" to={`${pageUrl("users/user-profile.html")}?id=${encodeURIComponent(c.personId)}`}>{c.name}</Link>;
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

const ASSETS = {
  form: ASSETS_FORM, title: "Import assets", subtitle: "Add assets to the register from a CSV or Excel file. Nothing already on the register is changed.",
  steps: STEPS("The assets added"), templateLead: LEAD("the categories, offices and vendors you can use"), readyIcon: ICON.layers,
  previewCols: [{ key: "name", label: "Name", render: raw("name") }, { key: "category", label: "Category", render: raw("category") }, { key: "office", label: "Office", render: raw("office") }],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{n(ready, "new asset", "new assets")} will be added to the register</strong>, in store, from {file.name}.</li>,
    skipped(ready, s, " Nothing on the register is changed."),
    <li key="b">Each gets the next free tag and its category's depreciation. Issue them to people from Asset assignment afterwards.</li>,
    together,
  ],
  importLabel: (ready) => `Import ${n(ready, "asset", "assets")}`,
  doneText: (r) => doneWords(r, ["asset", "assets"]),
  doneLink: { to: pageUrl("inventory/items.html"), text: "Go to Inventory" },
  madeTitle: "Added", madeNoun: ["asset", "assets"],
  madeCols: [rowCol, { key: "name", label: "Asset", render: (c) => <Link className="ix-link" to={`${pageUrl("inventory/items.html")}?tag=${encodeURIComponent(c.tag)}`}>{c.name}</Link> }, { key: "tag", label: "Tag", render: (c) => <span className="ix-nowrap">{c.tag}</span> }],
  errorBase: "assets-import-errors",
};

const STOCK = {
  form: STOCK_OPENING_FORM, title: "Import stock counts", subtitle: "Bring in the opening count of each stock item from a CSV or Excel file.",
  steps: STEPS("The counts recorded"), templateLead: LEAD("the categories and the items with no movement yet"), readyIcon: ICON.layers,
  previewCols: [{ key: "item", label: "Item", render: raw("item") }, { key: "quantity", label: "Quantity", num: true, render: raw("quantity") }, { key: "asOf", label: "As of", render: raw("asOf") }],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{n(ready, "opening count", "opening counts")} will be recorded</strong>, from {file.name}: one stock in for each, with the reason "Opening balance (imported)".</li>,
    skipped(ready, s),
    <li key="b">An item that isn't on record yet is added first, with its category, unit and reorder level.</li>,
    together,
  ],
  importLabel: (ready) => `Record ${n(ready, "count", "counts")}`,
  doneText: (r) => doneWords(r, ["count", "counts"], "recorded"),
  doneLink: { to: pageUrl("inventory/stock-movements.html"), text: "Go to Stock movements" },
  madeTitle: "Recorded", madeNoun: ["count", "counts"],
  madeCols: [rowCol, { key: "name", label: "Item", render: (c) => c.name }, { key: "qty", label: "Opening count", num: true, render: (c) => <span className="ix-nowrap">{`${c.qty} ${c.unit}`}</span> }],
  errorBase: "stock-counts-import-errors",
};

const LICENCES = {
  form: LICENCES_FORM, title: "Import licences", subtitle: "Add software licences from a CSV or Excel file. Licences already on record are not changed.",
  steps: STEPS("The licences added"), templateLead: LEAD("the vendors you can use and the software that already has a licence"), readyIcon: ICON.table,
  previewCols: [{ key: "software", label: "Software", render: raw("software") }, { key: "seats", label: "Seats", num: true, render: raw("seats") }, { key: "renewal", label: "Renewal", render: raw("renewal") }],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{n(ready, "new licence", "new licences")} will be added</strong>, active, from {file.name}.</li>,
    skipped(ready, s, " Nothing on record is changed."),
    <li key="b">No seat is given to anyone by the import: give seats on the Licences page.</li>,
    together,
  ],
  importLabel: (ready) => `Import ${n(ready, "licence", "licences")}`,
  doneText: (r) => doneWords(r, ["licence", "licences"]),
  doneLink: { to: pageUrl(IT_LICENCES), text: "Go to Licences" },
  madeTitle: "Added", madeNoun: ["licence", "licences"],
  madeCols: [rowCol, { key: "name", label: "Software", render: (c) => c.name }, { key: "seats", label: "Seats", num: true, render: (c) => String(c.seats) }],
  errorBase: "licences-import-errors",
};

const LEAVE = {
  form: LEAVE_BALANCES_FORM, title: "Import leave balances", subtitle: "Bring in each person's casual, sick and earned leave left on a date, from a CSV or Excel file.",
  steps: STEPS("The balances set"), templateLead: LEAD("the leave types and how the dates are read"), readyIcon: ICON.calendar,
  previewCols: [{ key: "employee", label: "Employee", render: (r) => <span className="ix-cell ix-wrap">{r.raw?.employee || "—"}</span> }, { key: "type", label: "Leave type", render: raw("type") }, { key: "days", label: "Days left", num: true, render: raw("days") }],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{n(ready, "balance", "balances")} will be set</strong>, from {file.name}: on each row's date, the days left become the file's.</li>,
    skipped(ready, s),
    <li key="b">From that date the balance counts on by the leave policy: what is earned, taken and carried forward. Days before it, and pay already approved, don't change.</li>,
    todayIso() < leaveFrom() ? <li key="c">The app shows these balances from the leave policy's start, {formatDay(leaveFrom(), true)}.</li> : null,
    together,
  ],
  importLabel: (ready) => `Set ${n(ready, "balance", "balances")}`,
  doneText: (r) => doneWords(r, ["balance", "balances"], "set"),
  doneLink: { to: pageUrl("leave/team-leave.html"), text: "Go to Team leave" },
  madeTitle: "Set", madeNoun: ["balance", "balances"],
  madeCols: [rowCol, { key: "name", label: "Employee", render: profile }, { key: "type", label: "Leave type", render: (c) => c.type }, { key: "days", label: "Days left", num: true, render: (c) => String(c.days) }, { key: "asOf", label: "As of", render: (c) => c.asOf }],
  errorBase: "leave-balances-import-errors",
};

const ATTENDANCE = {
  form: ATTENDANCE_CORRECTIONS_FORM, title: "Import attendance corrections", subtitle: "Record corrections to people's past days from a CSV or Excel file, approved by you.",
  steps: STEPS("The corrections recorded"), templateLead: LEAD("what can be corrected and how the dates and times are read"), readyIcon: ICON.clock,
  previewCols: [{ key: "employee", label: "Employee", render: (r) => <span className="ix-cell ix-wrap">{r.raw?.employee || "—"}</span> }, { key: "date", label: "Date", render: raw("date") }, { key: "issue", label: "What to correct", render: raw("issue") }],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{n(ready, "correction", "corrections")} will be recorded</strong>, as approved by you, from {file.name}.</li>,
    skipped(ready, s),
    <li key="b">Each day is then read again by its rules: lateness, half days and late marks follow the corrected times (the person's shift, from the shift rules' start). Months whose pay is approved aren't touched.</li>,
    together,
  ],
  importLabel: (ready) => `Record ${n(ready, "correction", "corrections")}`,
  doneText: (r) => doneWords(r, ["correction", "corrections"], "recorded"),
  doneLink: { to: pageUrl("attendance/team-attendance.html"), text: "Go to Team attendance" },
  madeTitle: "Recorded", madeNoun: ["correction", "corrections"],
  madeCols: [rowCol, { key: "name", label: "Employee", render: profile }, { key: "date", label: "Date", render: (c) => c.date }, { key: "issue", label: "Corrected", render: (c) => `${c.issue}: ${c.time}` }],
  errorBase: "attendance-corrections-import-errors",
};

function page(key, spec, permission) {
  return function ImportPage() {
    const allowed = useCan(permission);
    return <OwnPage page={key} title={spec.title} allowed={allowed}><ImportWizard spec={spec} /></OwnPage>;
  };
}
export const ImportAssets = page(IMPORT_ASSETS, ASSETS, "import:assets");
export const ImportStock = page(IMPORT_STOCK, STOCK, "import:stock-opening");
export const ImportLicences = page(IMPORT_LICENCES, LICENCES, "import:licences");
export const ImportLeave = page(IMPORT_LEAVE, LEAVE, "import:leave-balances");
export const ImportAttendance = page(IMPORT_ATTENDANCE, ATTENDANCE, "import:attendance-corrections");