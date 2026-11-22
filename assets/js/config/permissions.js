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
  attendance:    ["view-all", "view-own", "mark", "regularize", "approve", "any-office"],   // any-office (F1): check in from any active office, not just your own (Admin)
  leave:         ["view-own", "create", "cancel", "approve"],
  holidays:      ["manage"],
  payroll:       ["view", "create", "approve", "export"],   // create: prepare a run (payroll-store.js prepareRun checks it on record)
  payslips:      ["view"],                       // all employees' payslips
  payslip:       ["view-own", "download"],       // my own payslip
  salary:        ["view", "edit"],
  expenses:      ["view", "approve", "pay", "create"],   // create: send your own claim (every role, SELF_SERVICE)
  tax:           ["view", "manage"],
  inventory:     ["view", "create", "edit"],
  assets:        ["view-own", "assign", "approve", "report", "request", "view", "view-all", "view-values", "manage", "issue", "maintain"],   // view: see who holds what (asset-assignment.html); Admin only for now. AS1: the fixed-asset register's (data/asset-register.js), below
  vendors:       ["create", "edit", "view", "manage"],   // view: the vendor list (vendors.html); Admin only for now. AS1: manage: the register's vendors
  recruitment:   ["view", "create", "edit"],
  announcements: ["view", "create"],
  requests:      ["view-own", "cancel"],
  workflows:     ["view", "manage"],
  delegation:    ["create"],
  shifts:        ["manage", "view", "assign", "swap-team"],   // SH1: manage: define shifts and their rules (Admin, HR); view: see your own shift (everyone; a manager also their team's); assign: put people and departments on shifts (Admin, HR); swap-team: swap one date for your own direct reports (everyone holds it; only a manager has reports)
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
  // P4 (2026-11-14), moved here from data/pay-rules.js and data/leave-policy.js: the role pages count them (86 -> 88)
  "payroll-rules": ["verify"],                // verify, add dated rows to the statutory rates and rules (Admin; the Rates and rules page)
  "leave-policy": ["edit"],                   // edit the tenure leave policy and close a leave year (Admin; the Leave policy page)
  // P5 (2026-11-14): tax declarations. submit-own: everyone records their own regime and old-regime declaration; manage:
  // edit anyone's, verify and lock, unlock, set the tax year's cutoff (Finance, Admin). The role pages count them (88 -> 90).
// E1b (2026-11-15): accounts:disable (Admin only, not overridable): 93 -> 94.
// F1 (2026-11-14): attendance:any-office, above (the Admin only, through ALL_PERMISSIONS; not overridable): 90 -> 91.
  declarations:  ["submit-own", "manage"],
  // E1 (2026-11-14): sign-in accounts. reset: issue someone a reset link or a new temporary password (Admin, HR; HR not for
  // an Admin); unlock: unlock a locked account, disable or enable someone's sign-in (Admin). The role pages count them (91 -> 93).
  accounts:      ["reset", "unlock", "disable"],   // E1b: disable: stop or allow someone's sign-in (Admin only); unlock only unlocks
  // SH1 (2026-11-15): shifts:view, shifts:assign, shifts:swap-team (above) and overtime:approve: decide overtime (everyone
  // holds it: a manager decides their direct reports'; HR and the Admin, who see everyone's attendance, decide for people
  // without a manager). Not overridable. 94 -> 98 in 42 modules; Admin 98, HR 54, Finance 45, Employee 27.
  overtime:      ["approve"],
  // CV1 (2026-11-16): client / official visits. request: ask for a visit (everyone); approve: decide a visit (everyone holds it: a manager decides their
  // direct reports', HR and Admin those of people without a manager); assign: put a visit on people (everyone holds it: a manager for direct reports,
  // HR and Admin for anyone); view-all: every visit (HR, Admin). Not overridable. 98 -> 102 in 43 modules.
  visits:        ["request", "approve", "assign", "view-all"],
  // FS1 (2026-11-22): stored files (data/files.js). view-expense: see the file on anyone's expense claim (HR, Finance; the claimant and their
  // manager see it by who they are, not by a permission); view-documents: see employee document files (HR every one, Finance bank and tax proof);
  // manage-documents: add or remove a file on anyone's document rows (HR). The Admin role holds none of the three by default (roles.js
  // ADMIN_HELD_BACK: a ruling item). Not overridable. 102 -> 105 in 44 modules; Admin 102, HR 61, Finance 50, Employee 30.
  files:         ["view-expense", "view-documents", "manage-documents"],
  // AS1 (2026-11-22): the stock ledger and the fixed-asset register (data/stock-ledger.js, data/asset-register.js; data only). assets:view-all
  // (HR, Finance, Admin) every asset; assets:view-values (Finance, Admin) prices, depreciation and disposal values, which no one else's reads
  // carry; assets:manage (add, edit, retire, dispose), assets:issue (issue, take back), assets:maintain, vendors:manage and stock:move are the
  // custodian's: the Admin's only until the IT round's role (a parking-lot item); stock:view (HR, Finance, Admin) the ledger; depreciation:
  // configure (Finance, Admin) the category defaults and an asset's own method and rate. assets:view-own (above, everyone) also opens the
  // register's own rows. Not overridable. 105 -> 114 in 46 modules; Admin 111, HR 63, Finance 54, Employee 30.
  stock:         ["view", "move"],
  depreciation:  ["configure"],
  // IT1 (2026-11-22): the IT desk (data/it-desk.js, data/licences.js). requests-handle: see and work every IT request (IT);
  // requests-create: raise IT tickets and requests for yourself (everyone, self-service); approve: approve sensitive IT requests
  // (the Admin only; IT never); activity-review: the Admin's review trail; licences-manage: licences and seats (IT); licences-view-
  // costs: licence costs, which no one else's reads carry (Finance, Admin); account-prepare: prepare new-account requests, never an
  // Admin account (IT); offboard: work offboarding checklists (IT). Not overridable. 114 -> 122 in 47 modules; Admin 119, HR 64,
  // Finance 56, Employee 31, IT 42.
  it:            ["requests-handle", "requests-create", "approve", "activity-review", "licences-manage", "licences-view-costs", "account-prepare", "offboard"],
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