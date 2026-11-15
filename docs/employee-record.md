# The employee record (E1)

Built in E1 (2026-11-14), in the React app.

**Files:** `assets/js/config/employee-fields.js` (the sections and fields, defined once), `assets/js/data/employee-record.js` (who sees, edits and reveals what; history; change requests; completeness), `assets/js/data/store.js` `setPayDetails` (bank account and PAN, for Finance and approved requests), `app/src/ui/profile.jsx` (the sections on a profile), `app/src/pages/UserProfile.jsx`, `app/src/pages/MyProfile.jsx`.

## One list of fields

`config/employee-fields.js` lists the form's six sections (E0) and every field. The Add / Edit employee form reads its sections from there, and the profile shows the first five (Review is the form's own last step), each a card with a view and an edit mode.

| section | fields |
|---|---|
| Personal details | full name, photo (initials until file storage), date of birth, Aadhaar, dependants and nominee, documents (details only: type, number masked, expiry) |
| Contact details | work email, phone, personal email, current and permanent address, emergency contacts (several) |
| Employment | designation, department, reporting manager, date of joining, employment type, work location, previous employment, education, skills |
| Pay and tax | bank account, IFSC, bank name, account holder, PAN, UAN, ESI number, salary |
| Role and access | default role, data scope, approval chain |

The user record keeps what it held before; the new fields are in `officeos:employee-records`.

## Who sees and changes what

| who | sees | changes |
|---|---|---|
| the person (My profile) | everything of their own; sensitive values masked, with Show | phone, personal email, addresses, emergency contacts, dependants; their bank or tax details only by "Ask for a change" |
| HR, Admin (users:view, users:edit) | everything | everything on the profile; role, department, manager and joining date in the employee form |
| Finance (salary:edit) | team and pay fields | bank and tax fields, directly |
| the manager (also from a name on Team attendance and Team leave, E1b) | their direct reports' team fields (name, photo, work email, phone, employment, skills) and leave balance | nothing |
| anyone else | nothing (the 403 page, or "You can't see this profile") | nothing |

- **Not in the page at all:** a field someone may not see isn't returned by `profileView()`, so it is never drawn.
- **Masked:** bank account, PAN, Aadhaar and document numbers show their last 4 digits. Salary shows "₹ ••,•••".
- **Show:** the person, pii:view (HR, Admin) for bank, PAN, Aadhaar and documents, and salary:view (Finance too) for salary. Every Show is in the audit trail.
- **Checked:** phone, email, Aadhaar (12 digits), PAN (ABCDE1234F), IFSC (HDFC0001234), bank account (9 to 18 digits), UAN (12), ESI (17), a year; list rows need their required columns, at most 20 rows and one nominee.
- **Escalation refused:** a save naming anything that isn't a profile field the actor may change (a role, a permission, a status, someone else's field) is refused whole.

## History, requests, completeness

- **Change history** (HR, Admin): who changed which field, old to new (sensitive values masked), when, and whether it came from a request.
- **Change requests:** a person's own bank or tax change waits for Finance or HR, never for themself. Only the fields that change are part of the request. It is a seventh kind in what waits (`app/src/data/waiting.js` `profile`), so the bell, the sidebar count, the approvals inbox (type Profile) and the Admin dashboard count it, and the approval card shows it, masked, with Approve and Reject (a reason is required).
- **Completeness** (HR, Admin): a percentage over the fields that count and what's missing. Nothing is blocked by it.

## Checks

- `tests/live/emprecord.mjs` (3 zones): the field list, who is who, what each sees, Show, edits and escalation, values, history, requests, completeness.
- `tests/live/react/e1.mjs`: D (what each role's page holds in its HTML), P (own edits, a request through the approval card, history, completeness), M (the account tabs, change password), A (no "not available in this demo").

## Bank and statutory details (F2, 2026-11-15)

**Files:** `assets/js/config/ifsc-banks.js` (the bundled table of 51 main banks by IFSC code, `bankFromIfsc`), the rules in `assets/js/config/employee-fields.js`, `bankTogether` in `assets/js/data/employee-record.js`.

- Everything is entered by hand: OfficeOS doesn't fetch or verify bank, PAN or Aadhaar details (the form and the profile say so). Branch is typed (branch lookup arrives with the backend).
- IFSC: `^[A-Z]{4}0[A-Z0-9]{6}$`, saved in capitals; needed whenever bank details (account, bank name, branch, holder) are entered or changed, for a direct save and for the person's own change request. The bank name fills in from the IFSC's first four letters when it is empty or still names the old IFSC's bank; a name someone typed is never overwritten; an unknown code leaves it to type.
- Account number 9 to 18 digits, typed twice (the confirm field, in the profile's edit and the employee form). PAN `^[A-Z]{5}[0-9]{4}[A-Z]$` with P (a person) as the 4th letter. Aadhaar 12 digits, not starting 0 or 1, with the Verhoeff check digit. PAN, account and Aadhaar are masked to the last 4 after saving (as in E1).
- Unchanged values are never re-judged, so someone with details on file from before still saves other fields.
- The employee form's Pay and tax section has the account (and confirm), IFSC, bank name, branch, holder's name, PAN and Aadhaar; the record's fields are saved after the employee, each through `saveFields`.
- The profile shows a section's filled fields first; the empty ones are under "Not added (N)", collapsed, each with Add for whoever may fill it (Edit at that field, Ask for a change for the person's own bank fields, or the employee form). Completeness counts the same fields (its Missing list is the counted part of Not added).
- Checks: `tests/live/bank.mjs` (3 zones) and `tests/live/react/f2.mjs` B and F.
