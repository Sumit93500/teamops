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
};

// Flatten it into one list like dashboard:view, approvals:view, and so on.
export const ALL_PERMISSIONS = Object.entries(PERMISSIONS).flatMap(
  ([module, actions]) => actions.map((action) => `${module}:${action}`)
);

// ---------- offices, locations, devices and the company profile (round 14, data only) ----------
// Kept apart from PERMISSIONS until the page round that gives them screens: the role editor and roles list draw their
// matrix and their "N of M" counts from PERMISSIONS / ALL_PERMISSIONS, and this round changes no screen. The data layer
// checks these through hasPermission() in config/roles.js (each role's grants: LOCATION_GRANTS there). The page round
// moves them into PERMISSIONS.
//   offices:view       see the offices                               every role
//   offices:manage     create, edit, deactivate offices; assign      Admin
//   company:edit       the company profile (name, overview, mission) Admin
//   locations:set-own  set your own home places once                 anyone HR marked home-eligible (a flag, not a role)
//   locations:review   approve / reject home location changes        Admin
//   devices:view-own   see your own registered devices               every role
//   devices:reset      list and reset anyone's devices               Admin
export const LOCATION_PERMISSIONS = {
  offices:   ["view", "manage"],
  company:   ["edit"],
  locations: ["set-own", "review"],
  devices:   ["view-own", "reset"],
};
export const ALL_LOCATION_PERMISSIONS = Object.entries(LOCATION_PERMISSIONS).flatMap(
  ([module, actions]) => actions.map((action) => `${module}:${action}`)
);