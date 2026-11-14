// config/employee-fields.js (E1): the employee record's sections and fields, defined once. The Add / Edit employee form
// (its sections), the profile (every section, view and edit) and data/employee-record.js (who may see, edit or reveal each
// field) all read these.
//
// A field: { key, label, section, from: "user" (the user record) | "record" (data/employee-record.js) | "derived" (worked
// out, read-only), kind, see, edit, sensitive?, counts?, rule?, columns? (a repeatable list's columns), hint? }
//   see   who may see it at all (anyone else's page doesn't have it in the DOM):
//         "team"   everyone who may open the profile: the person, HR / Admin (users:view), their manager, Finance
//         "pay"    the person, HR / Admin, Finance (salary:edit)
//         "people" the person and HR / Admin only
//   edit  who changes it on the profile:
//         "own"     the person themself (profile:edit-own) and HR / Admin (users:edit)
//         "finance" Finance (salary:edit) and HR / Admin; the person asks for the change (a change request, decided by
//                   Finance or HR, never by themself)
//         "hr"      HR / Admin only
//         "form"    in the Add / Edit employee form (role, department, manager: their rules live there)
//         "none"    worked out elsewhere (salary: the salary structure page)
//   sensitive  "pii" (shown masked, last 4; the person and pii:view may Show it) or "salary" (masked; the person and
//              salary:view may Show it). Every Show is written to the audit trail.
//   counts     part of the profile's completeness (HR sees what's missing; nothing is blocked by it).

// The form's sections (E0), in order; the profile shows the first five (Review is the form's own last step).
export const SECTIONS = [
  { key: "personal", title: "Personal details", desc: "Basic information about the employee." },
  { key: "contact", title: "Contact details", desc: "How to reach them at work." },
  { key: "employment", title: "Employment", desc: "Where this person sits in the company, and where they check in from." },
  { key: "pay", title: "Pay and tax", desc: "Used when payroll is run." },
  { key: "access", title: "Role and access", desc: "What this person can do in OfficeOS." },
  { key: "review", title: "Review", desc: "Check everything, then save." },
];
export const PROFILE_SECTIONS = SECTIONS.filter((s) => s.key !== "review");

export const FIELDS = [
  // Personal details
  { key: "name", label: "Full name", section: "personal", from: "user", kind: "text", see: "team", edit: "form", counts: true },
  { key: "photo", label: "Photo", section: "personal", from: "record", kind: "photo", see: "team", edit: "own", hint: "Photo upload arrives with file storage (a later round); your initials show until then." },
  { key: "dob", label: "Date of birth", section: "personal", from: "user", kind: "date", see: "people", edit: "hr", counts: true },
  { key: "aadhaar", label: "Aadhaar", section: "personal", from: "record", kind: "text", see: "people", edit: "hr", sensitive: "pii", rule: "aadhaar", counts: true },
  { key: "dependants", label: "Dependants and nominee", section: "personal", from: "record", kind: "list", see: "people", edit: "own",
    columns: [{ key: "name", label: "Name", required: true }, { key: "relation", label: "Relation", required: true }, { key: "dob", label: "Date of birth", kind: "date" }, { key: "nominee", label: "Nominee", kind: "yesno" }] },
  { key: "documents", label: "Documents", section: "personal", from: "record", kind: "list", see: "people", edit: "hr",
    hint: "The details only. Uploading the file arrives with file storage (a later round).",
    columns: [{ key: "type", label: "Document", required: true }, { key: "number", label: "Number", required: true, sensitive: true }, { key: "expiry", label: "Expires", kind: "date" }] },
  // Contact details
  { key: "email", label: "Work email", section: "contact", from: "user", kind: "email", see: "team", edit: "form", counts: true },
  { key: "phone", label: "Phone", section: "contact", from: "user", kind: "tel", see: "team", edit: "own", rule: "phone", counts: true },
  { key: "personalEmail", label: "Personal email", section: "contact", from: "user", kind: "email", see: "people", edit: "own", rule: "email" },
  { key: "address", label: "Current address", section: "contact", from: "user", kind: "textarea", see: "people", edit: "own", counts: true },
  { key: "permanentAddress", label: "Permanent address", section: "contact", from: "record", kind: "textarea", see: "people", edit: "own" },
  { key: "emergencyContacts", label: "Emergency contacts", section: "contact", from: "record", kind: "list", see: "people", edit: "own", counts: true,
    columns: [{ key: "name", label: "Name", required: true }, { key: "relation", label: "Relation", required: true }, { key: "phone", label: "Phone", required: true, rule: "phone" }] },
  // Employment
  { key: "designation", label: "Designation", section: "employment", from: "user", kind: "text", see: "team", edit: "form", counts: true },
  { key: "department", label: "Department", section: "employment", from: "derived", kind: "text", see: "team", edit: "form", counts: true },
  { key: "manager", label: "Reporting manager", section: "employment", from: "derived", kind: "text", see: "team", edit: "form" },
  { key: "dateOfJoining", label: "Date of joining", section: "employment", from: "user", kind: "text", see: "team", edit: "form", counts: true },
  { key: "employmentType", label: "Employment type", section: "employment", from: "user", kind: "text", see: "team", edit: "form" },
  { key: "location", label: "Work location", section: "employment", from: "user", kind: "text", see: "team", edit: "form" },
  { key: "previousEmployment", label: "Previous employment", section: "employment", from: "record", kind: "list", see: "people", edit: "hr",
    columns: [{ key: "company", label: "Company", required: true }, { key: "role", label: "Role", required: true }, { key: "from", label: "From", kind: "month" }, { key: "to", label: "To", kind: "month" }] },
  { key: "education", label: "Education", section: "employment", from: "record", kind: "list", see: "people", edit: "hr",
    columns: [{ key: "qualification", label: "Qualification", required: true }, { key: "institution", label: "Institution", required: true }, { key: "year", label: "Year", rule: "year" }] },
  { key: "skills", label: "Skills", section: "employment", from: "record", kind: "list", see: "team", edit: "hr", columns: [{ key: "skill", label: "Skill", required: true }] },
  // Pay and tax
  { key: "bankAccount", label: "Bank account", section: "pay", from: "user", kind: "text", see: "pay", edit: "finance", sensitive: "pii", rule: "account", counts: true },
  { key: "ifsc", label: "IFSC", section: "pay", from: "record", kind: "text", see: "pay", edit: "finance", rule: "ifsc", counts: true },
  { key: "bankName", label: "Bank name", section: "pay", from: "record", kind: "text", see: "pay", edit: "finance" },
  { key: "accountHolder", label: "Account holder's name", section: "pay", from: "record", kind: "text", see: "pay", edit: "finance" },
  { key: "pan", label: "PAN", section: "pay", from: "user", kind: "text", see: "pay", edit: "finance", sensitive: "pii", rule: "pan", counts: true },
  { key: "uan", label: "UAN (PF)", section: "pay", from: "record", kind: "text", see: "pay", edit: "finance", rule: "uan" },
  { key: "esi", label: "ESI number", section: "pay", from: "record", kind: "text", see: "pay", edit: "finance", rule: "esi" },
  { key: "salary", label: "Salary", section: "pay", from: "derived", kind: "text", see: "pay", edit: "none", sensitive: "salary" },
  // Role and access
  { key: "role", label: "Default role", section: "access", from: "derived", kind: "text", see: "people", edit: "form" },
  { key: "scope", label: "Data scope", section: "access", from: "derived", kind: "text", see: "people", edit: "form" },
  { key: "chain", label: "Approval chain", section: "access", from: "derived", kind: "text", see: "people", edit: "none" },
];
export const FIELD = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

// The checks behind each rule: [test, words when it fails].
export const RULES = {
  phone: [(v) => /^\+?[0-9 ()-]{7,20}$/.test(v) && v.replace(/\D/g, "").length >= 10, "Enter a phone number with at least 10 digits, like +91 98765 43210."],
  email: [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address, like name@example.com."],
  aadhaar: [(v) => /^[2-9]\d{11}$/.test(v.replace(/\s/g, "")), "An Aadhaar number has 12 digits and doesn't start with 0 or 1."],
  pan: [(v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v), "A PAN is 5 letters, 4 digits and a letter, like ABCDE1234F."],
  ifsc: [(v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), "An IFSC is 4 letters, a 0, then 6 letters or digits, like HDFC0001234."],
  account: [(v) => /^\d{9,18}$/.test(v), "A bank account number has 9 to 18 digits."],
  uan: [(v) => /^\d{12}$/.test(v), "A UAN has 12 digits."],
  esi: [(v) => /^\d{17}$/.test(v), "An ESI number has 17 digits."],
  year: [(v) => /^(19|20)\d{2}$/.test(v), "Enter a year, like 2018."],
};