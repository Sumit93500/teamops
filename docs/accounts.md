# Sign-in accounts (E1)

Built in E1 (2026-11-14), in the React app. The old static site's sign-in is unchanged (it stays frozen until cutover).

**Files:** `assets/js/data/credentials.js` (accounts, passwords, links, lockout), `assets/js/data/mail-outbox.js` (what would be emailed), `assets/js/data/audit-trail.js` (account and record events), `app/src/pages/AuthPages.jsx` (Sign in, Forgot password, Reset password, Set password), `app/src/pages/MailOutbox.jsx`, `app/src/ui/profile.jsx` (`AccountCard`, `ShareDetails`), `app/src/router.jsx` (`AccountGate`).

## What is stored

`officeos:credentials` holds one account per person. It never holds a password or a link token in plain text:

- **Passwords:** PBKDF2-SHA256 through WebCrypto, 210,000 iterations, a random 16-byte salt per account. The parameters are stored with the hash.
- **Links:** 32 random bytes, stored only as their SHA-256. A used link's hash is remembered, so it says "already used" rather than "not valid".
- **Status:** `invited`, `active` or `disabled`; locked while `lockedUntil` is in the future. `mustChange` sends the person to Set password.

## Demo mode (E1b)

`config/demo.js` holds one setting, `DEMO = { mode: true, password: "Northwind@2026" }`. While `mode` is true the seeded people sign in with the demo password and the sign-in page shows the hint and the four role buttons. **Turn it off at cutover / the backend stage** (`mode: false`, the one change): no demo password works, the sign-in page says nothing about one and has no role buttons, and seeded people have no sign-in until an Admin makes their sign-in details (the normal temporary-password flow) or they ask for a reset. Someone who already changed their password keeps it. A test build with it off: `OFFICEOS_DEMO_OFF=1 npm run build` (tests only).

## The flows

| flow | what happens |
|---|---|
| seeded people | in demo mode (below), sign in with the demo password (`Northwind@2026`, on the sign-in page) until their first sign-in, which stores a salted hash of it for them; the demo password is a setting in `config/demo.js` |
| a new employee | Create employee (users:create) makes a temporary password (14 characters, no look-alikes) and a 48-hour set-password link, shown once in "Share these sign-in details" with Copy buttons; a copy of the message, without them, goes to the Mail outbox; status invited |
| first sign-in | the temporary password or the link; the person must choose a new password before anything else (every URL, and every page change, comes back to Set password) |
| the rules | at least 10 characters; not their name, email or employee ID; not one of 30 common passwords; a strength meter (four steps and a word) and the rules ticked off |
| forgot password | the same answer whether or not the email is someone's; a real one gets a 60-minute reset link in the Mail outbox; an expired, used or wrong link says so, with "Ask for a new link" |
| help from others | accounts:reset (Admin, HR): a reset link or a new temporary password, shown once; HR can't for an Admin, nobody for themself. accounts:unlock (Admin): unlock a locked account; accounts:disable (Admin, E1b): disable or enable a sign-in (the employee record is untouched) |
| lockout | 5 failed sign-ins lock for 15 minutes, even with the right password; an unknown email is counted the same way, so the answers never tell who has an account; a good sign-in resets the count |
| a disabled person | can't sign in; a session already open ends at its next check (any page change or store change) with the reason on the sign-in page |
| change password | My account > Password: the current password, the rules, then a new hash |

Every event (made, link used, password set or changed, reset asked for or issued, failed sign-ins, locked, unlocked, disabled, enabled) goes to the audit trail with who and when, never the secret. An Admin sees an account's events on the person's profile.

## What the demo can't do without a server

- **Email:** nothing is sent. The Mail outbox lists the messages, and a link is kept only in the browser tab that made it (until a reload), because storing it would put a secret in the browser.
- **Real security:** the hashes and checks run in the browser, so anyone with the device can read or change its storage. A server must own the accounts, sessions, rate limits and lockout.
- **Sessions on other devices:** there are no server sessions, so "sign out everywhere" and "sessions" stay samples; disabling ends a session only in this browser.
- **Two-factor sign-in** and new-device emails.

## Checks

- `tests/live/accounts.mjs` (3 zones): permissions, the seeded upgrade, a new employee, links, forgot password, lockout, help from others, and a scan of every stored value, the audit trail, the outbox and the console for any password or token.
- `tests/live/react/e1.mjs`: L (sign in), N (a new employee end to end), F (forgot and reset), R (an Admin's help), T (storage scans), K, E, W, X.
- The security mutants (the round's scratch folder): 17 on the data layer and 3 on the page guards, each caught.