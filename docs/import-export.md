# Imports and exports (I1, I2)

Built in I1 (2026-11-23): one import engine and one export helper that every later form and module reuses, with the first of each: new employees in, the people list and Finance's pay details out. I2 (2026-11-28) added four imports and six record exports on the same engine: see [I2](#i2-the-next-imports-and-the-record-exports-2026-11-28) below.

**Files:**

- `assets/js/data/csv.js`: reading and writing CSV (pure).
- `data/xlsx.js`: reading the first sheet of an .xlsx file and writing one (on fflate). The app loads it only when an Excel file is read or written.
- `data/import-engine.js`: the engine. It reads a file, checks it, makes the confirm token, applies the rows in one go, and makes the templates and the error report.
- `data/import-employees.js`: the first form, "Employees" (its columns, checks and how one row is saved).
- `data/import-history.js`: the Import history (`officeos:import-history`).
- `data/export.js`: the export helper and its modules, `employees` and `employees-pay`.
- `data/employee-record.js` `exportReader`: an export's values, masked as the profile masks them.
- Screens:
  - `app/src/pages/ImportEmployees.jsx` (the wizard);
  - `ImportHistory.jsx`;
  - `ExportPay.jsx`;
  - the Users list's Import and Export buttons (`UsersList.jsx`);
  - `app/src/ui/impex.jsx` (the export dialog, saving a file);
  - `app/src/shell/importAccess.js` (who opens what; the sidebar items).

**Tests:**

- `tests/live/importexport.mjs` (3 zones);
- `tests/live/react/i1.mjs` (the screens, in Edge).

**Library:** fflate 0.8.3 (MIT licence, no dependencies), pinned exactly in `app/package.json` and `tests/package.json`. `npm audit` reported 0 vulnerabilities. Only its streaming `Inflate`, `zipSync` and `strToU8` are used; the zip directory and the sheet XML are read by our own code, so every limit below is ours. `app/vite.config.js` resolves `fflate` for `assets/js` (an alias to `app/node_modules/fflate`).

## Permissions

| permission | who | what |
|---|---|---|
| `import:employees` | HR, Admin | the Import employees page and its templates |
| `import:history-view` | HR, Admin | the Import history (every import and export) |
| `export:employees` | HR, Admin | the Users list's Export: only the people and fields the exporter may see, masked as on the profile |
| `export:employees-pay` | Finance (and the Admin, through every permission) | Export pay details: the pay and bank columns Finance already sees, masked |

- The pattern is `import:<form>` and `export:<module>`; a later form or module adds its own.
- IT, managers and employees hold none of them.
- None is overridable.
- Counts: 122 -> 126 permissions in 49 modules (Admin 123, HR 66, Finance 57, Employee 31, IT 42).
- Full Aadhaar, bank account and PAN numbers in a file need `pii:view` (the same as Show on a profile) **and** ticking "Include the full numbers". That choice is written to the audit trail with the export.

## The engine

A form definition is:

```
{ id, label, permission, mode: "good-rows" | "all-or-nothing", maxRows,
  columns: [{ key, header, required, sensitive?, help, validate(value, ctx, row) }],
  unique: [{ key, existing(ctx) }], maySensitive(actor),
  context(actor, now), checkRow(values), applyRow(actor, values, ctx, now),
  example(ctx), notes(ctx, actor, cols) }
```

- **Reading** (`readUpload`):
  - The type is judged by the file's first bytes, never by its name:
    - `PK` is .xlsx (a zip named anything else is refused);
    - an old .xls (OLE), a PDF or an image is refused with what to do;
    - anything else is read as CSV.
  - At most 2 MB.
  - CSV (`csv.js`):
    - RFC 4180: quotes, `""`, commas and line breaks inside quotes;
    - CRLF, LF or CR line ends;
    - a UTF-8 BOM is dropped;
    - rows whose cells are all empty are left out.
  - Only UTF-8 is read. UTF-16 and UTF-32 (by their BOM), invalid UTF-8 (Windows-1252) and binary (a NUL byte) are refused, saying "save as CSV UTF-8".
  - Excel (`xlsx.js`): only the first sheet is read. Cells come back as text. A formula cell is reported, never worked out, and its cached value isn't trusted.
- **Zip bombs:** the zip directory is read by hand, and only four parts are inflated, each through a streaming inflate that stops at the limit. It refuses:
  - more than 200 entries;
  - a part over 8 MB, or 20 MB in all;
  - a part that unpacks to more than 100 times its packed size (when over 1 MB);
  - a directory that lies about sizes (it is stopped while unpacking);
  - more than 60 columns.
- **Limits:** 1,000 rows (1,001 is refused whole), 1,000 characters a cell.
- **Headers:**
  - matched in any case and spacing;
  - each of these refuses the whole file, saying which column (by letter): a column twice, one the form doesn't have, a required one missing (all of them in one sentence), a sensitive one the person may not import.
- **The template's own rows** are never data: the example row (first cell `EXAMPLE`) and notes rows (a first cell starting `#`).
- **Cells are text.**
  - A cell starting `= + - @` is kept as text, never worked out.
  - The apostrophe our own exports put before such a cell is taken off on the way in.
- **The check** (`checkImport`, Upload -> Check) writes no record. Each row gets:
  - the column checks: required, the column's own check, too long, a formula;
  - duplicates: the same value twice in the file ("also in row 2") or already on record ("already belongs to Rohan Gupta");
  - the form's `checkRow`.

  The result:
  - counts (read, ready, errors, duplicates);
  - `summaryText`: "38 will be imported, 4 have errors, 2 duplicates";
  - the problems as "Row 5, Work email: not a valid email address". Row numbers are the spreadsheet's: the header is row 1;
  - a **confirm token**.

  The check writes only its own line in the history and the audit trail.
- **The token:**
  - `<issued, base 36>.<sha256 of actor | form | file sha256 | issued>` (no store needed);
  - valid for 30 minutes;
  - refused when it is someone else's, for another file, older than 30 minutes, or garbage.
- **Confirm** (`applyImport`), in this order:
  1. A second confirm while the first runs (a double click) is refused at once, before anything is awaited (`in-progress`).
  2. The permission is checked again.
  3. A token already used is refused (`already-imported`, naming the entry).
  4. The file is checked again, so an email taken since the check is skipped too.
  5. The ready rows are applied **inside one transaction**: every `officeos:*` key is snapshotted first. If any row fails, or anything throws, every key is put back exactly and the import is logged as failed (rolled back).
  6. `good-rows` skips rows with problems; `all-or-nothing` refuses while any row has one.
- **Templates** (`templateFor`, CSV or Excel) are made from the form and the live lists. They hold:
  - the headers;
  - one example row;
  - the notes: required columns, the departments, designations, offices and shifts, the formats.

  A column the person may not import isn't in their template.
- **The error report** (`errorReport`) is a CSV of Row, Column, Problem.

## The Employees form (create only)

- **Columns:**
  - Employee code (optional; unique against codes and employee IDs);
  - Full name;
  - Work email (unique);
  - Mobile;
  - Department (name or code);
  - Designation (one carrying the Admin role only for an Admin);
  - Manager's work email (an active employee);
  - Office (any active office);
  - Employment type;
  - Joining date: YYYY-MM-DD, DD-MM-YYYY (day first), 1 Dec 2026 or an Excel day number. At most a year ahead, and after the newest approved payroll month;
  - Shift (optional, an active shift).
- **Sensitive columns:** Bank account, IFSC, Bank name, PAN and Aadhaar, only for someone with `pii:view` and `users:edit` (HR, Admin).
  - They are checked by the employee form's own rules (`config/employee-fields.js`): the account's digits, the IFSC's shape, a person's PAN, the Aadhaar check digit.
  - A bank account or bank name needs the IFSC.
  - The IFSC fills the bank name.
- **Each good row is saved the way the employee form saves a person:**
  1. `addUser`, with the default role from the designation, Work location = the office's name and the joining date as "1 Dec 2026";
  2. the record's IFSC, bank name and Aadhaar (`saveFields`);
  3. the office assignment, only with `offices:manage` (the Admin), as on the form;
  4. the shift from the joining day, or from today when they joined before;
  5. **one new-account request to IT** (`openNewAccountRequest`).
- **No sign-in is made by an import, not even by an Admin:** IT prepares each one and an Admin approves it (IT1's flow).
- The employee code is kept on the user record (`employeeCode`).

## Exports

`exportFile(viewerId, module, { ids, includeSensitive, format, filters })` returns `{ name, mime, text | bytes, rows, columns }` or a refusal.

- **Rows:**
  - the people the module allows: `employees` everyone (`users:view`), `employees-pay` everyone (`salary:edit` or `users:view`), the exporter's own row too;
  - with `ids`, only those of them (the list's matching rows); an id outside the scope adds nothing;
  - at most 5,000, refused with the count beyond.
- **Columns:**
  - the module's columns the viewer can see (`config/employee-fields.js` `see`);
  - the values are what the profile shows (`exportReader`), sensitive ones masked (the last 4);
  - salaries are never in these files.
- **The file:**
  - every cell protected against formula injection (`= + - @`, a tab, a carriage return get a leading apostrophe; a phone `+91…` too);
  - CSV in UTF-8 with a BOM, CRLF;
  - dates YYYY-MM-DD, as the column names say;
  - named `<module>-<office date>.csv` or `.xlsx`, for example `employees-2026-11-23.csv`.

## The log

- **Audit trail:**
  - `import-checked`, `import-done`, `import-failed`, `import-refused` (a refused file, a refused confirm, and a person without the permission trying), `export-done` (with "sensitive values IN FULL" or "masked") and `export-refused`;
  - the form or module, the file's name and counts;
  - never a cell's value.
- **The Import history** (`historyFor`, `import:history-view`): one entry per check, import, refusal, failure and export, newest first, in office-time days for the date range. It holds:
  - who, when, the form or module, the file's name (no folder), size and sha256;
  - rows read, imported and skipped;
  - the token;
  - the created ids and their IT requests;
  - the problems as row, column and reason, with no value from the file (the first 200 kept, `problemsCut` counting the rest);
  - for an export: the filters, row count, format and whether sensitive values were in full.
- **Never in the history:** a file's contents, or personal data beyond ids.
- **An abandoned check** (never confirmed) stays as "Checked, not imported".

## Screens

- **Import employees** is a wizard: Upload -> Check -> Confirm -> Done.
  - The step heading takes the focus, and a live region reads the summary.
  - **Upload:** the columns and the CSV and Excel templates; a drop zone that is the file input's label (keyboard and screen reader use the input); refusals at once for a file over 2 MB or empty, without reading it.
  - **Check:** the counts, the first five rows, every problem with its row, and Download error report.
  - **Confirm:** in plain words, including "New sign-in requests will be sent to IT". A stale check offers "Check the file again".
  - **Done:** links to each person and their IT request.
- **Import history:** filters (what, result, the shared date range with "No data in this range.", a search) and a details dialog per entry.
- **Users list:** Import (`import:employees`), and Export (`export:employees`). Export is a dialog: CSV or Excel, the matching rows or everyone, and "Include the full numbers" only with `pii:view`. It replaces the old plain export.
- **Export pay details** (`export:employees-pay`) is Finance's page.
- **Sidebar:** Import employees and Import history (People), Export pay details (Payroll), each for its permission.

## Choices made where the brief was silent

- The check itself writes nothing but its own history and audit line. An abandoned check is that line.
- The token is stateless (a hash, not a stored list), valid 30 minutes. A used token is found in the history.
- The atomic apply snapshots every `officeos:*` key and restores it on failure. This reuses every store's own checks rather than a parallel write path.
- An HR import's office sets the Work location only (as the employee form does for HR); the check-in office assignment needs `offices:manage`.
- The joining date is required in a file (the form's "empty means today" isn't carried over); the employee code is stored as `employeeCode`.
- Finance's pay export is its own page (Payroll group), since Finance doesn't open the Users list.

## I2: the next imports and the record exports (2026-11-28)

I2 reuses the engine and the export helper for four more imports and six record exports. Nothing is forked: each import is a form definition, each export a module beside I1's.

**Files:**

- `assets/js/data/import-common.js`: what the I2 forms share (dates as people type them, a person by employee ID, code or work email, amounts, half days, `plain()`: a store's sentence with its ISO dates in words and no record id).
- `data/import-assets.js`: `ASSETS_FORM` (the asset register) and `STOCK_OPENING_FORM` (the stock ledger's opening counts).
- `data/import-licences.js`: `LICENCES_FORM`.
- `data/import-leave.js` with `data/leave-openings.js`: `LEAVE_BALANCES_FORM` and the store of imported balances (`officeos:leave-openings`).
- `data/import-attendance.js` with `data/attendance-store.js` `correctionProblem` / `importCorrection` (additive): `ATTENDANCE_CORRECTIONS_FORM`.
- `data/export-records.js`: the record modules (`RECORD_MODULES`); `data/export.js` `exportFile` writes, names and logs their files as it does I1's.
- Screens:
  - `app/src/ui/ImportWizard.jsx`: the wizard, shared (I1's Import employees now uses it too, with the same words);
  - `app/src/pages/ImportPages.jsx`: Import assets, Import stock counts, Import licences, Import leave balances, Import attendance corrections;
  - `app/src/pages/ExportData.jsx`: Export data;
  - `app/src/ui/impex.jsx`: the export dialog takes a date range (`range`) and leaves out the full-numbers choice for a file without those columns (`sensitiveColumns`).

**Tests:** `tests/live/i2.mjs` (3 zones), `tests/live/react/i2.mjs` (the screens, in Edge).

### The engine, changed additively

- **A generic file name** (`genericName` on a form, every I2 form): the history and the audit trail keep `<form>-file.csv` (or `.xlsx`), never the uploaded name, which may name a person. I1's employees form keeps the uploaded name.
- **Two-column keys:** a `unique` entry may give `value(values)` (the person and the date, say), an `id`, and `onRecord(owner)`, its own words for one already on record.
- **"Already imported"** no longer names the history entry's id: "This file was already imported: nothing was imported again."

### Permissions (130 -> 141, still 50 modules)

| permission | who | what |
|---|---|---|
| `import:assets` | IT, Admin | Import assets |
| `import:stock-opening` | IT, Admin | Import stock counts |
| `import:licences` | IT, Admin | Import licences |
| `import:leave-balances` | HR, Admin | Import leave balances |
| `import:attendance-corrections` | HR, Admin | Import attendance corrections |
| `export:leave`, `export:attendance`, `export:visits`, `export:tasks` | HR, Admin | those lists as files |
| `export:expenses` | Finance only | the expense claims (the Admin has no expense-file access: `ADMIN_HELD_BACK`) |
| `export:payroll` | Finance, HR, Admin | the payroll register |

None is overridable. Admin 137, HR 77, Finance 62, Employee 34, IT 48. The Import history stays HR's and the Admin's (`import:history-view`).

### The forms

Every form: the template (CSV or Excel), the check row by row with no record written (the dry run), Confirm in plain words, the good rows applied in one transaction (all or nothing; a failure puts every key back), a history entry with a generic file name, and no sign-in made. Problems name no ISO date and no record id. Mode: good rows.

- **Assets** (`import:assets`): Name, Category (an asset category; an access card is a stock item and is refused), Make and model, Serial number (unique on the register and in the file), Purchase date (not in the future), Purchase price, Vendor (an active one), Invoice reference, Warranty end (not before the purchase), Office (an active one). Saved by `addAsset`: the next free tag, the category's depreciation, in store.
- **Stock counts** (`import:stock-opening`): Item, Category, Unit and Reorder level (for a new item), Opening quantity, As of (not in the future), Reference. A new item is added (`addStockItem`), then ONE stock in (`recordStockMovement`, reason "Opening balance (imported)"). An item that already has movements is refused: its count is on record.
- **Licences** (`import:licences`): Software (not one with an active licence, nor twice in the file), Vendor, Seats (1 to 100,000), Cost per year (optional; Finance and the Admin read it back), Renewal date (today or later). Saved by `addLicence`; no seat is given from a file.
- **Leave balances** (`import:leave-balances`): Employee (ID, code or work email), Leave type (casual, sick or earned; one the person's band has), Days left (whole or half days), As of (this calendar year, not in the future, after the newest approved payroll month).
  - Balances are still worked out, never stored. The import stores the one difference that makes the worked-out balance on that date equal the file's (`leave-openings.js`: balance, as of, the adjustment, who); `leave-policy.js` `account()` adds it on that date and after, in that year only. Before the date, in any other year, and when nothing was imported, every balance is exactly as before.
  - Refused: your own balance, a person and type already imported for the year, an inactive person, a date before joining or after leaving.
  - The app shows these balances from the leave policy's start (`leaveFrom`, 1 Dec 2026), as it shows every policy balance.
- **Attendance corrections** (`import:attendance-corrections`): Employee, Date, What to correct (late arrival, missed check-in, missed check-out: `ui/attendance-view.js`'s words), Correct time (24-hour; "9:40" and "6:30 PM" are read), Reason.
  - Each is recorded as approved by the importer (`importCorrection`): a person's own request's checks in HR's words, then the same write as a finally approved request, and the request kept, approved, with `importedBy`.
  - From the shift rules' start (1 Dec 2026) the person's shift decides the day (`shiftDayFor`): its weekly off, whether they were late, when check-in closes. Before it, the old rules. Lateness, half days and late marks then follow the corrected times as on any day.
  - Refused: your own attendance, a visit day (its own punches count), a holiday, weekend, weekly off or leave day with no check-in, a day with a correction waiting, a day with sample times (generated, not stored), the future, an approved payroll month, a check-in at or after the day's end. Not the 7-day window: HR corrects older days.

### The record exports

`exportFile(viewerId, module, { from, to, format, includeSensitive, filters })`: a date range (real days, the start not after the end), one row per record, CSV (UTF-8, BOM, CRLF) or Excel, every cell protected against formula injection, named `<module>-<from>-to-<to>.csv`, logged in the history (module, from, to, rows, format, whether full numbers) and the audit trail. People's names and departments come through `exportReader`, as the profile shows them.

| module | rows | limit |
|---|---|---|
| `leave` | the leave requests touching the range, with the reason | a year |
| `attendance` | one row per person and day (not before joining or after leaving), by the person's shift from the shift rules' start; whether the day was corrected | 92 days |
| `expenses` | the claims spent in the range; whether a receipt is attached, never its name | a year |
| `visits` | the visits touching the range; the site's name, never a location reading | a year |
| `tasks` | WORK tasks due in the range (personal tasks are never read) | a year |
| `payroll` | each person's row for every month in the range, the stored run where there is one; bank account and PAN masked unless someone with `pii:view` asks (recorded) | 12 months |

### Screens

- The five import pages are the shared wizard with their own words; each is in its area's sidebar group (Assets & inventory, IT desk, Leave, Attendance).
- **Export data** (System group, for anyone holding one of the six): a card per module the person may export, each opening the export dialog with From and To (the 1st of the month to today by default) and CSV or Excel.
- The Import history labels the new entries; an I2 entry's details list no people.

### Choices made where the brief was silent

- One permission per form and module (11), in the existing `import` and `export` modules: stock opening counts are their own form beside the assets.
- The generic file name is `<form>-file.<ext>`, for the I2 forms only (I1's employees form unchanged: a ruling item).
- Leave balances: "days left on a date", stored as an adjustment (balances stay worked out); casual, sick and earned only; once per person, type and year; not your own.
- Attendance corrections: recorded as approved by the importer, as a correction request; no 7-day window, but never an approved payroll month; visit days and sample days refused.
- Licences: licences only, no seats from a file. Assets: no issue to a person from a file (Asset assignment does that).
- Export data is one page (System) rather than a button on each list; HR's payroll register may carry full numbers (HR holds `pii:view`), Finance's never.
