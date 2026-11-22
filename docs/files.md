# Stored files (FS1)

Built in FS1 (2026-11-22), in the React app. The old static site is unchanged.

**Files:** `assets/js/data/file-rules.js` (what a file must be: pure), `assets/js/data/files.js` (the storage adapter and who may see what), `app/src/data/fileUrls.js` (object URLs made after the check, revoked when unused, on sign-out and on a change of person), `app/src/ui/files.jsx` (the picker, a stored file, the photo, a document row's file), `app/src/design/files.css`.

## The adapter

The app talks only to `data/files.js`, so the backend stage can replace the storage under it with a server.

| function | what |
|---|---|
| `putFile(actor, linkTo, file, { kind, docType? })` | checks who may add it and the file itself, then keeps the bytes and one metadata record |
| `getFileFor(viewer, id)` | the Blob, only after `canViewFile`; every call is in the audit trail |
| `listFilesFor(viewer, linkTo)`, `fileInfo(viewer, id)` | the records the viewer may see (no bytes) |
| `replaceFile(actor, id, file)` | a new file in the old one's place; the old one is removed (`replacedBy`), its bytes deleted |
| `removeFile(actor, id)` | soft delete: the record stays (`removed`, by whom, when), the bytes go |
| `purgeFor(linkTo, actor?)` | deletes a link's files for good |
| `canViewFile(viewer, meta)`, `mayAddFile(actor, kind, linkTo)` | the two checks |

- **Where things live (the demo):** the bytes in IndexedDB (database `officeos-files`); the records in `officeos:files` `{ version: 1, seq, files: [meta] }`.
- **A record:** `{ id "FL-n", ownerId, kind, linkTo { type, id, slot? }, name, mime, size, sha256, uploadedBy, uploadedAt, status, removedBy?, removedAt?, replacedBy?, docType? }`.
- **Kinds:** `expense-payslip` (on a claim: `{ type: "expense", id }`), `profile-photo` (`{ type: "user", id }`), `employee-document` (`{ type: "document", id: userId, slot: row }`).
- **When storage fails:** IndexedDB missing or blocked (private browsing) gives "Files can't be kept in this browser right now…"; a full quota gives "There isn't enough space in this browser…". Nothing is recorded in either case.

## The rules (`file-rules.js`)

- **Types:** PDF, JPG and PNG only; a photo is JPG or PNG only. The type comes from the file's first bytes, never the name or the browser's type, and the name's extension must agree with it.
- **Sizes:** 5 MB (a photo 2 MB). Exactly the limit is allowed; one byte more is refused. Zero bytes are refused.
- **Refused:**
  - SVG, HTML, XML, scripts, programs, archives.
  - Polyglots: markup, a script or a zip hidden inside an image or a PDF, or bytes after a PNG's end.
  - A PDF with JavaScript, a launch action or embedded files.
  - Double extensions (`bill.exe.pdf`).
- **Names:**
  - Only the last path part is kept (no traversal).
  - Control and direction characters are dropped and Windows' forbidden characters replaced.
  - Names are cut to 120 characters, keeping the extension; an empty name becomes `file.<type>`.
  - The name is for display only; nothing is stored under it.
- **Duplicates:** the same bytes (sha256) twice on one link are refused.
- **Messages:** each refusal is a plain sentence saying what to do.

## Who sees what (`canViewFile`)

| kind | who may see it |
|---|---|
| expense file | the claimant; the claimant's manager now (`managerOf`); HR and Finance (`files:view-expense`). Not other employees or other managers. **Not the Admin by default** (a ruling item) |
| profile photo | the person, and anyone who can open their profile (HR, the Admin, Finance, their manager). It is a face, not a secret: it shows wherever the viewer already sees the person |
| employee document | the person; HR (`files:view-documents`, every one); Finance only for bank or tax proof (the row's type names a bank, cheque, passbook, statement, PAN, Form 16, tax or ITR). **Not the Admin by default** (a ruling item) |

- **The owner is read from the link,** not the stored record: the claim's claimant, the person the photo or document belongs to. A record whose owner was changed in storage gives nobody anything.
- **Adding:**
  - An expense file is added by the claimant when sending the claim. It is locked from then on: no second file, no replace, no remove. Claims have no "returned to the claimant" step yet.
  - A photo is added by the person, or by `users:edit` (HR, the Admin).
  - A document file is added by the person for their own rows, or by `files:manage-documents` (HR).
- **Audit:** every add, view, replace, remove and purge goes to the audit trail as `file-added`, `file-viewed`, `file-replaced`, `file-removed` or `file-purged`. Each event records who did it, the file's id and name, and what happened, never the contents. A refused read is not logged as a view.
- **Object URLs** (`app/src/data/fileUrls.js`):
  - They are made only after the check.
  - Each URL is counted per viewer and file, and revoked when its last user goes.
  - All of them are revoked on sign-out, on a change of person, and when another tab changes the session.

## Permissions

`files:view-expense` (HR, Finance), `files:view-documents` (HR, Finance), `files:manage-documents` (HR). The Admin role holds none of them (`ADMIN_HELD_BACK` in `config/roles.js`, a ruling item). None is overridable. FS1 took the list from 102 to 105 (Admin 102, HR 61, Finance 50, Employee 30); since AS1 there are 114 permissions in 46 modules (Admin 111, HR 63, Finance 54, Employee 30; see [rbac.md](rbac.md)).

## The screens

- **Claim expense:**
  - The Receipt is a file picker: Choose a file, Take a photo on a phone (camera capture), and drop a file on a desktop.
  - It shows the name, type, size and a thumbnail (a PDF opens in a new tab), with Replace and Remove.
  - Errors appear under it and are announced.
  - If the file can't be kept, the claim is taken back (cancelled) and the reason is shown.
- **Expenses (Finance), the approval card (the manager and the stages after):** the file and View, through the checked path. "You don't have access to this file." for someone who may not see it. An old claim's receipt text is shown with "Entered as text".
- **Profiles:** the photo with "Add or change photo", using a square crop with zoom and position. The photo shows in the header avatar, My profile and the employee profile; initials show without one. The employee form's Upload photo works again (it was not drawn from F2 on).
- **Documents:** a File column on the rows, with View, Add file, Replace and Remove for whoever may.

## Checks

- `tests/live/files.mjs` (3 zones): R the rules, V who sees what, L the lifecycle, S storage failures, A the audit trail, E escalation, X older records.
- `tests/live/react/fs1.mjs`: U the form, R the rules in the page, V access, P the photo, D documents, S sign-out and a change of person, I no IndexedDB, N no demo words, K keyboard, W widths, C contrast, X.