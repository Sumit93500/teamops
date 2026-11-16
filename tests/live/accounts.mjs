// usage: node accounts.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// E1's sign-in accounts (data/credentials.js, data/mail-outbox.js, data/audit-trail.js; config/permissions.js). ./js is the
// build. The clock is passed to every call (now, in ms); the stores' own dates come from a fixed Date.
//   P  the permissions: accounts:reset (Admin, HR) and accounts:unlock (Admin); 93 in all; not overridable
//   S  a seeded person signs in with the demo password, which is then stored only as a salted PBKDF2 hash (210,000
//      iterations, parameters kept); a wrong password, an unknown email, an inactive employee
//   N  a new employee: the temporary password (14 characters, no look-alikes) and a 48-hour link, given once; invited;
//      must set a new password first (mustChange); the rules (length, name / email, common list); afterwards active, the
//      temporary password and the link dead
//   T  the links: single use ("already used"), expiry ("expired"), a tampered or unknown token ("not valid"), a newer link
//      killing the older
//   F  forgot password: the same answer for a real and an unknown email; a 60-minute reset link in the Mail outbox (no
//      token or password stored in it); a disabled account gets none
//   L  lockout: 5 failures lock for 15 minutes even with the right password; an unknown email locks the same way (no
//      enumeration); the lock ends by time or an Admin's unlock; a good sign-in resets the count
//   A  help from others: HR issues a reset link or a temporary password (not for an Admin, not themself); Finance and an
//      employee can't; only an Admin unlocks, disables and enables; a disabled person can't sign in and their session ends
//   X  no plain password or token anywhere: every stored value, the audit trail, the outbox and the console are scanned
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const T0 = new RealDate(2026, 10, 16, 10, 0, 0).getTime();
NOW = T0;
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const logged = [];
for (const k of ["log", "error", "warn", "info"]) { const orig = console[k].bind(console); console[k] = (...a) => { logged.push(a.map(String).join(" ")); if (!String(a[0]).startsWith("PASS") && !String(a[0]).startsWith("FAIL") && !String(a[0]).startsWith("\n---") && !String(a[0]).startsWith("TZ=") && !/passed, \d+ failed/.test(String(a[0]))) return; orig(...a); }; }

const P = await import("./js/config/permissions.js");
const R = await import("./js/config/roles.js");
const C = await import("./js/data/credentials.js");
const M = await import("./js/data/mail-outbox.js");
const AU = await import("./js/data/audit-trail.js");
const S = await import("./js/data/store.js");
const AUTH = await import("./js/core/auth.js");
const { DEMO: DEMODEF } = await import("./js/config/demo.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ARJUN = "EMP-1105", SNEHA = "EMP-1029";
const DEMO_PW = "Northwind@2026";
const box = () => JSON.parse(mem.get("officeos:credentials") ?? "{}");
const min = (n) => n * 60000;
const secrets = [];   // every plain password and token this run handles, for X
const tokenOf = (link) => decodeURIComponent(link.split("token=")[1]);
const events = (id) => AU.eventsFor(id).map((e) => e.kind);

section("P. Permissions");
check("P1", "accounts:reset, accounts:unlock and accounts:disable (E1b) are in the list; 102 in all (SH1: was 94)", j(P.PERMISSIONS.accounts) === j(["reset", "unlock", "disable"]) && P.ALL_PERMISSIONS.length === 102, P.ALL_PERMISSIONS.length);
const counts = Object.fromEntries(Object.entries(R.ROLES).map(([k, r]) => [k, r.permissions.length]));
check("P2", "roles: Admin 102 (all three), HR 58 (reset only), Finance 48, Employee 30 (SH1: were 94, 50, 42, 24)", j(counts) === j({ admin: 102, hr: 58, fin: 48, emp: 30 })
  && R.ROLES.hr.permissions.includes("accounts:reset") && !R.ROLES.hr.permissions.includes("accounts:unlock") && !R.ROLES.fin.permissions.includes("accounts:reset"), j(counts));
check("P3", "neither is overridable: a stored grant gives an employee nothing", !R.OVERRIDABLE.some((p) => p.startsWith("accounts:")) && !["accounts:reset", "accounts:unlock", "accounts:disable"].some((p) => R.hasPermission({ ...S.getUser(ARJUN), grantPermissions: [p] }, p)));
check("P4", "only the Admin holds accounts:disable (E1b): HR, Finance, an employee and a manager don't", R.hasPermission(S.getUser(AARAV), "accounts:disable") && [PRIYA, KABIR, ARJUN, SNEHA].every((id) => !R.hasPermission(S.getUser(id), "accounts:disable")));

section("S. Seeded people and the demo password");
check("S1", "a seeded person's account before any sign-in: active, has the demo password, nothing stored", C.accountOf(ARJUN, T0).status === "active" && C.accountOf(ARJUN, T0).hasPassword && !mem.has("officeos:credentials"));
const s2 = await C.signInWithPassword("arjun.kapoor@northwind.com", DEMO_PW, T0);
check("S2", "the demo password signs Arjun in (any case, spaces round the email)", s2.ok && s2.userId === ARJUN && !s2.mustChange && (await C.signInWithPassword("  ARJUN.KAPOOR@northwind.com ", DEMO_PW, T0)).ok, j(s2));
const a2 = box().accounts[ARJUN];
check("S3", "afterwards a salted PBKDF2-SHA256 hash, 210,000 iterations, 16-byte salt, no longer the legacy check", a2.algo === "PBKDF2-SHA256" && a2.iterations === 210000 && atob(a2.salt).length === 16 && atob(a2.hash).length === 32 && a2.legacy === false, j({ algo: a2.algo, it: a2.iterations, legacy: a2.legacy }));
const b2 = await C.signInWithPassword("arjun.kapoor@northwind.com", DEMO_PW, T0);
check("S4", "the demo password still works through the stored hash", b2.ok);
const other = await C.signInWithPassword("priya.nair@northwind.com", DEMO_PW, T0);
const pr = box().accounts[PRIYA];
check("S5", "each person gets their own salt (the same password, different hashes)", other.ok && pr.salt !== a2.salt && pr.hash !== a2.hash);
const w = await C.signInWithPassword("arjun.kapoor@northwind.com", "Northwind@2027", T0);
const u = await C.signInWithPassword("nobody@northwind.com", DEMO_PW, T0);
check("S6", "a wrong password and an unknown email get the same words and code", !w.ok && !u.ok && w.code === "invalid" && u.code === "invalid" && w.error === u.error && w.error === C.MESSAGES.invalid, j([w, u]));
await C.signInWithPassword("arjun.kapoor@northwind.com", DEMO_PW, T0);   // clears the failure count again
check("S7", "a good sign-in resets the failure count", box().accounts[ARJUN].failedCount === 0);

section("N. A new employee");
const add = S.addUser(PRIYA, { name: "Meghna Rao", email: "meghna.rao@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "1 Dec 2026" });
const MEGHNA = add.record.id;
check("N1", "before an account: status none, and no password signs them in (the demo one neither)", C.accountOf(MEGHNA, T0).status === "none" && (await C.signInWithPassword("meghna.rao@northwind.com", DEMO_PW, T0)).code === "invalid");
const deny = await C.createAccount(KABIR, MEGHNA, T0);
check("N2", "Finance can't make sign-in details (no users:create or accounts:reset)", !deny.ok && deny.code === "not-allowed");
const made = await C.createAccount(PRIYA, MEGHNA, T0);
secrets.push(made.tempPassword, tokenOf(made.link));
check("N3", "HR makes them: a 14-character temporary password with no look-alike characters, and a set-password link", made.ok && made.tempPassword.length === 14 && !/[0O1lI]/.test(made.tempPassword) && /[A-Z]/.test(made.tempPassword) && /[a-z]/.test(made.tempPassword) && /\d/.test(made.tempPassword)
  && /^\/pages\/auth\/set-password\.html\?token=[A-Za-z0-9_-]{43}$/.test(made.link), made.link.length);
const acc = C.accountOf(MEGHNA, T0);
check("N4", "invited, must change, the link 48 hours", acc.status === "invited" && acc.mustChange && acc.linkKind === "invite" && acc.linkExpires === T0 + 48 * 60 * min(1), j(acc));
check("N5", "only hashes stored: the token as SHA-256 hex, the password as PBKDF2", /^[0-9a-f]{64}$/.test(box().accounts[MEGHNA].tokenHash) && !JSON.stringify(box()).includes(made.tempPassword) && !JSON.stringify(box()).includes(tokenOf(made.link)));
check("N6", "making them twice is refused (they have an account)", (await C.createAccount(PRIYA, MEGHNA, T0)).code === "exists" && (await C.createAccount(PRIYA, ARJUN, T0)).code === "exists");
const mail = M.allMail()[0];
check("N7", "the Mail outbox has the invitation, to their work email, with no secret in it; this tab holds the link", mail.kind === "invite" && mail.to === "meghna.rao@northwind.com" && !JSON.stringify(mail).includes(made.tempPassword) && !JSON.stringify(mail).includes(tokenOf(made.link)) && M.linkOf(mail.id) === made.link);
const first = await C.signInWithPassword("meghna.rao@northwind.com", made.tempPassword, T0 + min(5));
check("N8", "the temporary password signs in, with mustChange", first.ok && first.mustChange && C.mustChangePassword(MEGHNA));
const p1 = await C.setFirstPassword(MEGHNA, "short", T0 + min(6));
const p2 = await C.setFirstPassword(MEGHNA, "meghna.rao@northwind.com", T0 + min(6));
const p3 = await C.setFirstPassword(MEGHNA, "Meghna Rao", T0 + min(6));
const p4 = await C.setFirstPassword(MEGHNA, "password123", T0 + min(6));
check("N9", "the rules: 10 characters, not the name, email or id, not a common password", !p1.ok && /at least 10/.test(p1.error) && !p2.ok && /name, email/.test(p2.error) && !p4.ok && /common/.test(p4.error) && C.passwordProblems("Meghna-Plans-9", S.getUser(MEGHNA)).length === 0 && C.passwordProblems("MeghnaRao!!", S.getUser(MEGHNA)).length === 1 && C.passwordProblems("meghnarao", { name: "Meghna Rao" }).length > 0, j([p1.error, p2.error, p3.error, p4.error]));
check("N10", "the strength meter: weak, fair, good, strong; a common one 'too easy to guess'", C.passwordStrength("abcdefghij").label === "Weak" && C.passwordStrength("abcdefghi1").label === "Fair" && C.passwordStrength("Abcdefghij1!").label === "Good" && C.passwordStrength("Abcdefghij1!xyz9").label === "Strong" && C.passwordStrength("password123").label === "Too easy to guess");
const NEW = "Lantern-Orbit-42";
secrets.push(NEW);
const set = await C.setFirstPassword(MEGHNA, NEW, T0 + min(7));
const acc2 = C.accountOf(MEGHNA, T0 + min(7));
check("N11", "the new password is set: active, mustChange off, the link gone", set.ok && acc2.status === "active" && !acc2.mustChange && acc2.linkKind === null);
check("N12", "the temporary password no longer works; the new one does", (await C.signInWithPassword("meghna.rao@northwind.com", made.tempPassword, T0 + min(8))).code === "invalid" && (await C.signInWithPassword("meghna.rao@northwind.com", NEW, T0 + min(8))).ok);
check("N13", "the invite link is dead too: 'already used'", (await C.checkToken(tokenOf(made.link), T0 + min(8))).code === "used");
check("N14", "setting a first password twice is refused (nothing to set)", (await C.setFirstPassword(MEGHNA, "Another-Lantern-9", T0 + min(9))).code === "not-needed");

section("T. Links");
const add2 = S.addUser(PRIYA, { name: "Tara Sen", email: "tara.sen@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "2 Nov 2026" });
const TARA = add2.record.id;
const inv = await C.createAccount(AARAV, TARA, T0);
const tok = tokenOf(inv.link);
secrets.push(inv.tempPassword, tok);
const c1 = await C.checkToken(tok, T0 + min(60));
check("T1", "a fresh link: valid, an invite, Tara's", c1.ok && c1.kind === "invite" && c1.userId === TARA);
const tampered = tok.slice(0, -1) + (tok.at(-1) === "A" ? "B" : "A");
check("T2", "a tampered token, an empty one, garbage: 'not valid'", (await C.checkToken(tampered, T0)).code === "invalid" && (await C.checkToken("", T0)).code === "invalid" && (await C.checkToken("x".repeat(43), T0)).code === "invalid");
check("T3", "after 48 hours: 'expired', and it can't set a password", (await C.checkToken(tok, T0 + 48 * min(60))).code === "expired" && (await C.redeemToken(tok, "Quiet-River-77", T0 + 48 * min(60))).code === "expired");
const red = await C.redeemToken(tok, "Quiet-River-77", T0 + min(90));
secrets.push("Quiet-River-77");
check("T4", "within 48 hours the link sets the password: active, can sign in", red.ok && C.accountOf(TARA, T0 + min(90)).status === "active" && (await C.signInWithPassword("tara.sen@northwind.com", "Quiet-River-77", T0 + min(91))).ok);
check("T5", "used once, then 'already used' (and can't set another)", (await C.checkToken(tok, T0 + min(92))).code === "used" && (await C.redeemToken(tok, "Quiet-River-88", T0 + min(92))).code === "used");
check("T6", "the temporary password died with the link", (await C.signInWithPassword("tara.sen@northwind.com", inv.tempPassword, T0 + min(93))).code === "invalid");
check("T7", "the link's password follows the rules too", (await C.requestReset("tara.sen@northwind.com", T0 + min(94))).ok && (await C.redeemToken(tokenOf(M.linkOf(M.allMail()[0].id)), "tara.sen@northwind.com", T0 + min(95))).code === "weak");
const r1 = M.linkOf(M.allMail()[0].id);
await C.requestReset("tara.sen@northwind.com", T0 + min(96));
const r2 = M.linkOf(M.allMail()[0].id);
secrets.push(tokenOf(r1), tokenOf(r2));
check("T8", "a newer reset link kills the older one ('already used'); the newer works", (await C.checkToken(tokenOf(r1), T0 + min(97))).code === "used" && (await C.checkToken(tokenOf(r2), T0 + min(97))).ok);

section("F. Forgot password");
const f1 = await C.requestReset("kabir.shah@northwind.com", T0 + min(100));
const n0 = M.allMail().length;
const f2 = await C.requestReset("ghost@northwind.com", T0 + min(100));
check("F1", "a real and an unknown email: the identical answer", j(f1) === j(f2) && f1.message === C.MESSAGES.resetSent && /If an account uses that email/.test(f1.message));
check("F2", "only the real one got a mail: a reset for Kabir, 60 minutes", M.allMail().length === n0 && M.allMail()[0].to === "kabir.shah@northwind.com" && M.allMail()[0].kind === "reset" && C.accountOf(KABIR, T0 + min(100)).linkExpires === T0 + min(160));
const kl = tokenOf(M.linkOf(M.allMail()[0].id));
secrets.push(kl);
check("F3", "the reset link expires after 60 minutes", (await C.checkToken(kl, T0 + min(159))).ok && (await C.checkToken(kl, T0 + min(160))).code === "expired");
const nMail = M.allMail().length;
await C.requestReset("tara.sen@northwind.com".toUpperCase(), T0 + min(161));
check("F4", "the email is matched whatever its case", M.allMail().length === nMail + 1);
check("F5", "the reset request is in the audit trail (no secret)", events(KABIR).includes("reset-requested"));

section("L. Lockout");
let last = null;
for (let i = 0; i < 4; i++) last = await C.signInWithPassword("arjun.kapoor@northwind.com", "wrong-guess-" + i, T0 + min(200));
check("L1", "4 failures: still 'invalid', count 4", last.code === "invalid" && box().accounts[ARJUN].failedCount === 4);
last = await C.signInWithPassword("arjun.kapoor@northwind.com", "wrong-guess-5", T0 + min(200));
check("L2", "the 5th: locked, for 15 minutes", last.code === "locked" && last.error === C.lockedMessage(T0 + min(215)) && /^Too many attempts\. Try again after \d\d:\d\d, or ask your administrator to unlock your account\.$/.test(last.error) && C.accountOf(ARJUN, T0 + min(200)).status === "locked" && C.accountOf(ARJUN, T0 + min(200)).lockedUntil === T0 + min(215));
check("L3", "locked, even the right password is refused", (await C.signInWithPassword("arjun.kapoor@northwind.com", DEMO_PW, T0 + min(214))).code === "locked");
check("L4", "the lock and the burst are in the audit trail", events(ARJUN).includes("locked") && events(ARJUN).includes("signin-failed"));
check("L5", "after 15 minutes the right password works again, and the count starts over", (await C.signInWithPassword("arjun.kapoor@northwind.com", DEMO_PW, T0 + min(215))).ok && box().accounts[ARJUN].failedCount === 0);
const ghost = [];
for (let i = 0; i < 5; i++) ghost.push(await C.signInWithPassword("nobody.here@northwind.com", "x" + i, T0 + min(220)));
check("L6", "an unknown email locks the same way after 5 (no telling who has an account)", ghost.slice(0, 4).every((g) => g.code === "invalid") && ghost[4].code === "locked" && /^Too many attempts\. Try again after \d\d:\d\d, or ask your administrator to unlock your account\.$/.test(ghost[4].error));   // F2: the words carry the time
for (let i = 0; i < 5; i++) await C.signInWithPassword("kabir.shah@northwind.com", "nope" + i, T0 + min(230));
check("L7", "an Admin unlocks: Kabir signs in at once", C.unlockAccount(AARAV, KABIR, T0 + min(231)).ok && (await C.signInWithPassword("kabir.shah@northwind.com", DEMO_PW, T0 + min(231))).ok && events(KABIR).includes("unlocked"));
for (let i = 0; i < 5; i++) await C.signInWithPassword("kabir.shah@northwind.com", "nope" + i, T0 + min(240));
check("L8", "HR can't unlock (accounts:unlock is the Admin's); not locked any more is refused", C.unlockAccount(PRIYA, KABIR, T0 + min(241)).code === "not-allowed" && C.unlockAccount(AARAV, ARJUN, T0 + min(241)).code === "not-locked");
check("L9", "a failure after the lock ran out starts a new count of 1", (await C.signInWithPassword("kabir.shah@northwind.com", "again", T0 + min(256))).code === "invalid" && box().accounts[KABIR].failedCount === 1);

section("A. Help from others");
const hrLink = await C.issueReset(PRIYA, ARJUN, "link", T0 + min(300));
secrets.push(tokenOf(hrLink.link));
check("A1", "HR issues Arjun a reset link (60 minutes), shown once and in the outbox", hrLink.ok && /reset-password\.html\?token=/.test(hrLink.link) && hrLink.expiresAt === T0 + min(360) && M.allMail()[0].to === "arjun.kapoor@northwind.com" && events(ARJUN).includes("reset-issued"));
const hrTemp = await C.issueReset(PRIYA, ARJUN, "temp", T0 + min(301));
secrets.push(hrTemp.tempPassword);
check("A2", "...or a temporary password: Arjun must change it at the next sign-in; the earlier link is dead", hrTemp.ok && hrTemp.tempPassword.length === 14 && (await C.signInWithPassword("arjun.kapoor@northwind.com", hrTemp.tempPassword, T0 + min(302))).mustChange && (await C.checkToken(tokenOf(hrLink.link), T0 + min(302))).code === "used");
check("A3", "HR can't reset an Admin's sign-in, nor their own here", (await C.issueReset(PRIYA, AARAV, "link", T0)).error === "Only an Admin can change an Admin's sign-in." && (await C.issueReset(PRIYA, PRIYA, "link", T0)).code === "not-allowed");
check("A4", "Finance and an employee can't issue resets", (await C.issueReset(KABIR, ARJUN, "link", T0)).code === "not-allowed" && (await C.issueReset(ARJUN, KABIR, "temp", T0)).code === "not-allowed");
check("A5", "only an Admin disables (accounts:disable): HR, Finance, an employee and a manager are refused, the Admin's own is refused", [PRIYA, KABIR, ARJUN, SNEHA].every((id) => C.setSignInEnabled(id, MEGHNA, false, T0).code === "not-allowed") && C.setSignInEnabled(PRIYA, ARJUN, false, T0).code === "not-allowed" && C.setSignInEnabled(AARAV, AARAV, false, T0).code === "not-allowed");
const dis = C.setSignInEnabled(AARAV, MEGHNA, false, T0 + min(310));
check("A6", "the Admin disables Meghna: disabled, the employee record unchanged, audited", dis.ok && C.accountOf(MEGHNA, T0 + min(310)).status === "disabled" && S.getUser(MEGHNA).status === "active" && events(MEGHNA).includes("disabled"));
const d1 = await C.signInWithPassword("meghna.rao@northwind.com", NEW, T0 + min(311));
check("A7", "disabled: the right password is refused ('can't sign in'); a wrong one gets the usual words", d1.code === "disabled" && (await C.signInWithPassword("meghna.rao@northwind.com", "bad-guess-1", T0 + min(311))).code === "invalid");
AUTH.signIn("emp", "Meghna Rao", MEGHNA);
check("A8", "a disabled person's session isn't allowed any more (the app signs them out at its next check)", !C.sessionAllowed(MEGHNA) && C.sessionAllowed(ARJUN));
check("A9", "a disabled person gets no reset link, and their old links stop", (await C.requestReset("meghna.rao@northwind.com", T0 + min(312))).ok && M.allMail()[0].to !== "meghna.rao@northwind.com");
check("A10", "enabled again: signs in, audited", C.setSignInEnabled(AARAV, MEGHNA, true, T0 + min(313)).ok && (await C.signInWithPassword("meghna.rao@northwind.com", NEW, T0 + min(314))).ok && events(MEGHNA).includes("enabled"));
const leaver = S.deactivateUser(AARAV, TARA, "2026-11-16");
check("A11", "an employee who has left can't sign in, even with the right password", leaver.ok && (await C.signInWithPassword("tara.sen@northwind.com", "Quiet-River-77", T0 + min(320))).code === "inactive");
const ch = await C.changeOwnPassword(MEGHNA, "not-it", "Brighter-Lantern-5", T0 + min(330));
const ch2 = await C.changeOwnPassword(MEGHNA, NEW, "Brighter-Lantern-5", T0 + min(330));
secrets.push("Brighter-Lantern-5");
check("A12", "changing your own password needs the current one", !ch.ok && ch.code === "current" && ch2.ok && (await C.signInWithPassword("meghna.rao@northwind.com", "Brighter-Lantern-5", T0 + min(331))).ok);

section("O. Demo mode off (config/demo.js)");
const ANANYA = "EMP-1017";
check("O1", "demo mode is on by default, with the demo password Northwind@2026 in one config object", DEMODEF.mode === true && DEMODEF.password === DEMO_PW);
DEMODEF.mode = false;
const o2 = await C.signInWithPassword("ananya.iyer@northwind.com", DEMO_PW, T0 + min(400));
check("O2", "off: the demo password signs nobody in (the same words as any wrong password)", !o2.ok && o2.code === "invalid" && o2.error === C.MESSAGES.invalid, j(o2));
check("O3", "off: a seeded person with no password has no sign-in yet; making one is the normal temporary-password flow", C.accountOf(ANANYA, T0 + min(400)).status === "none" && !C.accountOf(ANANYA, T0 + min(400)).hasPassword);
const o4 = await C.createAccount(AARAV, ANANYA, T0 + min(401));
secrets.push(o4.tempPassword, tokenOf(o4.link));
check("O4", "off: an Admin makes Ananya's sign-in details (a seeded person: no longer 'already has an account')", o4.ok && o4.tempPassword.length === 14 && C.accountOf(ANANYA, T0 + min(401)).status === "invited", o4.ok);
const o5 = await C.signInWithPassword("ananya.iyer@northwind.com", o4.tempPassword, T0 + min(402));
check("O5", "off: the temporary password signs her in and she must set her own", o5.ok && o5.mustChange && (await C.setFirstPassword(ANANYA, "Maple-Harbour-81", T0 + min(403))).ok);
secrets.push("Maple-Harbour-81");
check("O6", "off: her own password works; the demo password still doesn't", (await C.signInWithPassword("ananya.iyer@northwind.com", "Maple-Harbour-81", T0 + min(404))).ok && (await C.signInWithPassword("ananya.iyer@northwind.com", DEMO_PW, T0 + min(404))).code === "invalid");
check("O7", "off: someone who already changed their password (Arjun, a hash on record) keeps it", (await C.signInWithPassword("arjun.kapoor@northwind.com", hrTemp.tempPassword, T0 + min(405))).ok);
check("O8", "off: a seeded person's forgot-password asks for nothing special (same answer; a link only once they have an account)", (await C.requestReset("kabir.shah@northwind.com", T0 + min(406))).message === C.MESSAGES.resetSent);
DEMODEF.mode = true;
check("O9", "back on: the demo password works for a seeded person again (Priya, whose hash came from it)", (await C.signInWithPassword("priya.nair@northwind.com", DEMO_PW, T0 + min(407))).ok);

section("X. No plain secrets anywhere");
const stored = [...mem.entries()].map(([k, v]) => `${k}=${v}`).join("\n");
const leaks = secrets.filter((s) => s && (stored.includes(s) || stored.includes(encodeURIComponent(s))));
check("X1", `none of the ${secrets.length} passwords and tokens is in any stored value (${mem.size} keys)`, secrets.length >= 12 && leaks.length === 0, leaks.length);
check("X2", "nor the demo password", !stored.includes(DEMO_PW));
const trail = JSON.stringify(AU.allEvents());
check("X3", "the audit trail has the events and no secret", AU.allEvents().length >= 15 && !secrets.some((s) => trail.includes(s)));
const outbox = JSON.stringify(M.allMail());
check("X4", "the outbox has no secret (its links are only in this tab's memory)", !secrets.some((s) => outbox.includes(s)));
check("X5", "nothing was written to the console with a secret", !secrets.some((s) => logged.some((l) => l.includes(s))));
check("X6", "every account record holds only hashes and settings (no field named password)", Object.values(box().accounts).every((a) => !Object.keys(a).some((k) => /password|token$/i.test(k)) && (!a.hash || /^[A-Za-z0-9+/=]{44}$/.test(a.hash))));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);