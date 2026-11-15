// config/demo.js (E1b): demo mode, the one setting. While it is on:
//   - the seeded people (data/users.js) sign in with DEMO.password, which is stored as a salted hash at their first sign-in;
//   - the sign-in page shows the demo password hint and the four one-click role buttons.
// Turn it off at cutover / the backend stage ("mode: false" below, the one change): no demo password works, nothing on the
// sign-in page hints at one, the role buttons are gone, and seeded people have no sign-in until an Admin makes their sign-in
// details (the normal temporary-password flow, data/credentials.js createAccount) or they ask for a reset. A person who
// already changed their password keeps the password they chose.
// An object, not a bare constant, so a test can turn it off and on for one run.
export const DEMO = { mode: true, password: "Northwind@2026" };