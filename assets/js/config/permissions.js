// config/permissions.js
// The master list of every permission in OfficeOS.
// A permission is just a string in the form "module:action", like "payroll:create".
// The HTML pages use these same strings in their data-permission attributes.

export const PERMISSIONS = {
  dashboard:     ["view", "finance"],   // finance: open the finance dashboard (dashboard/finance.html), Finance's landing (Manager scoping part 1)
  approvals:     ["view", "decide"],
  users:         ["view", "create", "edit", "reset-password", "deactivate", "delete"],   // delete: Admin only (round 11N)
  pii:           ["view"],                       // bank account, PAN (personal identity data)
  departments:   ["create", "edit"],
  roles:         ["manage"],
  designations:  ["manage", "create", "edit"],
  attendance:    ["view-all", "view-own", "mark", "regularize", "approve"],
  leave:         ["view-own", "create", "cancel", "approve"],
  holidays:      ["manage"],
  payroll:       ["view", "create", "approve", "export"],   // create: prepare a run (payroll-store.js prepareRun checks it on record)
  payslips:      ["view"],                       // all employees' payslips
  payslip:       ["view-own", "download"],       // my own payslip
  salary:        ["view", "edit"],
  expenses:      ["view", "approve", "pay", "create"],   // create: send your own claim (every role, SELF_SERVICE)
  tax:           ["view", "manage"],
  inventory:     ["view", "create", "edit"],
  assets:        ["view-own", "assign", "approve", "report", "request", "view"],   // view: see who holds what (asset-assignment.html); Admin only for now
  vendors:       ["create", "edit", "view"],   // view: the vendor list (vendors.html); Admin only for now
  recruitment:   ["view", "create", "edit"],
  announcements: ["view", "create"],
  requests:      ["view-own", "cancel"],
  workflows:     ["view", "manage"],
  delegation:    ["create"],
  shifts:        ["manage"],   // manage: define and assign shifts and their rules; reserved, shifts.html is a sample and its buttons are placeholders
  reports:       ["view", "create", "export"],
  audit:         ["view", "export"],
  settings:      ["edit"],
  backup:        ["manage", "create", "download", "restore"],
  profile:       ["edit-own"],
  password:      ["change-own"],
  sessions:      ["end-own"],
  notifications: ["edit-own"],
  // Round 14's, moved here in L0 (2026-11-12): the role editor and roles list now show and count them
  offices:       ["view", "manage"],          // view: everyone; manage: create, edit, deactivate offices, assign people (Admin)
  company:       ["edit"],                    // the company profile: name, overview, mission (Admin)
  locations:     ["set-own", "review"],       // set-own: everyone holds it, the HR home-eligible flag decides; review: decide changes (Admin)
  devices:       ["view-own", "reset"],       // view-own: everyone; reset: list and reset anyone's devices (Admin)
};

// Flatten it into one list like dashboard:view, approvals:view, and so on.
export const ALL_PERMISSIONS = Object.entries(PERMISSIONS).flatMap(
  ([module, actions]) => actions.map((action) => `${module}:${action}`)
);

// ---------- offices, locations, devices and the company profile ----------
// Round 14 kept these seven apart; L0 (2026-11-12) moved them into PERMISSIONS above, so ALL_PERMISSIONS has them and
// the role pages count them (79 -> 86). This list stays as the round-14 subset, for the data layer's own references.
//   offices:view       see the offices                               every role (self-service)
//   offices:manage     create, edit, deactivate offices; assign      Admin
//   company:edit       the company profile (name, overview, mission) Admin
//   locations:set-own  set your own home places once                 every role holds it; HR's home-eligible flag decides
//   locations:review   approve / reject home location changes        Admin
//   devices:view-own   see your own registered devices               every role (self-service)
//   devices:reset      list and reset anyone's devices               Admin
export const LOCATION_PERMISSIONS = Object.fromEntries(["offices", "company", "locations", "devices"].map((m) => [m, PERMISSIONS[m]]));
export const ALL_LOCATION_PERMISSIONS = Object.entries(LOCATION_PERMISSIONS).flatMap(
  ([module, actions]) => actions.map((action) => `${module}:${action}`)
);