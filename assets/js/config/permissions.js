// config/permissions.js
// The master list of every permission in OfficeOS.
// A permission is just a string in the form "module:action", like "payroll:create".
// The HTML pages use these same strings in their data-permission attributes.

export const PERMISSIONS = {
  dashboard:     ["view"],
  approvals:     ["view", "decide"],
  users:         ["view", "create", "edit", "reset-password", "deactivate"],
  pii:           ["view"],                       // bank account, PAN (personal identity data)
  departments:   ["create", "edit"],
  roles:         ["manage"],
  designations:  ["manage", "create", "edit"],
  attendance:    ["view-all", "view-own", "mark", "regularize", "approve"],
  leave:         ["view-own", "create", "cancel", "approve"],
  holidays:      ["manage"],
  payroll:       ["view", "create", "approve", "export"],   // create: prepare a run; reserved, nothing checks it until runs are stored
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