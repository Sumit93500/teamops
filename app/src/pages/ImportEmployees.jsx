// Import employees (I1): new employees from a CSV or Excel file, in four steps: Upload (the template, then the file: dropped or chosen),
// Check (the counts, the first rows, every problem with its row number, the error report), Confirm (what will happen, in plain words), Done
// (links to the people made and their sign-in requests to IT). Nothing is written before Confirm, and nobody gets a sign-in from it: each new
// person gets one new-account request for IT. For import:employees (HR, Admin). Data: data/import-engine.js with data/import-employees.js.
// I2: the steps are the shared wizard's (ui/ImportWizard.jsx); this page gives its form and its words.
import { Link } from "react-router-dom";
import { EMPLOYEES_FORM } from "../../../assets/js/data/import-employees.js";
import OwnPage from "../ui/OwnPage.jsx";
import ImportWizard from "../ui/ImportWizard.jsx";
import { useCan } from "../data/hooks.js";
import { pageUrl, IMPORT_EMPLOYEES, IT_REQUEST } from "../routes.js";

const SPEC = {
  form: EMPLOYEES_FORM, title: "Import employees", subtitle: "Add new employees from a CSV or Excel file. Nobody already on record is changed.",
  steps: ["The template, then your file", "What the file holds", "What will happen", "The people added"],
  templateLead: "It has the columns below, one example row marked EXAMPLE and notes listing the departments, designations, offices and shifts you can use. Those rows are never imported.",
  previewCols: [
    { key: "name", label: "Full name", render: (r) => r.raw?.name || "—" },
    { key: "email", label: "Work email", render: (r) => <span className="ix-cell">{r.raw?.email || "—"}</span> },
    { key: "designation", label: "Designation", render: (r) => r.raw?.designation || "—" },
  ],
  confirm: (ready, s, file) => [
    <li key="a"><strong>{ready} new {ready === 1 ? "employee" : "employees"} will be added</strong>, as active, from {file.name}.</li>,
    s.read - ready > 0 && <li key="b">{s.read - ready} {s.read - ready === 1 ? "row has" : "rows have"} problems and will be skipped. Nothing on record is changed.</li>,
    <li key="c"><strong>New sign-in requests will be sent to IT</strong>, one for each person. Nobody gets a sign-in from the import: IT prepares each one and an Admin approves it.</li>,
    <li key="d">The file is checked again when you import: anything that changed since (an email taken meanwhile) is skipped too.</li>,
    <li key="e">All of it is saved together, or none of it. The import is recorded in the history and the audit trail.</li>,
  ],
  importLabel: (ready) => `Import ${ready} ${ready === 1 ? "employee" : "employees"}`,
  doneText: (result) => `${result.created.length} ${result.created.length === 1 ? "employee was" : "employees were"} added${result.skipped.length ? `; ${result.skipped.length} ${result.skipped.length === 1 ? "row was" : "rows were"} skipped` : ""}. ${result.created.length === 1 ? "A sign-in request is" : `${result.created.length} sign-in requests are`} with IT.`,
  doneLink: { to: pageUrl("users/users-list.html"), text: "Go to Users" },
  madeTitle: "Added", madeNoun: ["employee", "employees"],
  madeCols: [
    { key: "row", label: "Row", num: true, render: (c) => String(c.row) },
    { key: "name", label: "Employee", render: (c) => <span className="ix-cell"><Link className="ix-link" to={`${pageUrl("users/user-profile.html")}?id=${encodeURIComponent(c.id)}`}>{c.name}</Link><span className="ix-sub">{c.id}</span></span> },
    { key: "request", label: "Sign-in request", render: (c) => <Link className="ix-link" to={`${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(c.requestId)}`}>{c.requestId}</Link> },
  ],
  errorBase: "employees-import-errors",
};

export default function ImportEmployees() {
  const allowed = useCan("import:employees");
  return <OwnPage page={IMPORT_EMPLOYEES} title="Import employees" allowed={allowed}><ImportWizard spec={SPEC} /></OwnPage>;
}