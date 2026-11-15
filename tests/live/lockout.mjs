// usage: node lockout.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// F2: lockout visibility (data/unlock-requests.js, data/lockouts.js, the lock in data/credentials.js). ./js is the build.
//   K  5 failed sign-ins lock; the message says until when (office time); one unlock request per lock, never per attempt
//   W  who: the Admin (accounts:unlock) sees and resolves it; HR can't; nobody their own
//   R  Unlock now unlocks, clears the count and is audited; Dismiss doesn't unlock; a request closes by itself when the lock expires or
//      the person is unlocked another way
//   U  an email nobody has locks the same way (same words) and opens no request
//   S  the Admin's own lock: it waits for another Admin, never for themself
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const C = await import("./js/data/credentials.js");
const LK = await import("./js/data/lockouts.js");
const UR = await import("./js/data/unlock-requests.js");
const AT = await import("./js/data/audit-trail.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", ARJUN = "EMP-1105";
const EMAIL = "arjun.kapoor@northwind.com";
const T0 = Date.UTC(2026, 10, 16, 4, 30);   // 16 Nov 2026 10:00 IST
const min = (n) => n * 60000;
const istTime = (ms) => { const d = new Date(ms + 330 * 60000); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const fails = async (email, n, at) => { const out = []; for (let i = 0; i < n; i++) out.push(await C.signInWithPassword(email, `wrong-${i}`, at + i * 1000)); return out; };

// ---------- K ----------
section("K. The lock and its request");
const tries = await fails(EMAIL, 5, T0);
const until = C.accountOf(ARJUN, T0 + 10000).lockedUntil;
check("K1", "4 failures say the usual words; the 5th locks for 15 minutes", tries.slice(0, 4).every((t) => t.code === "invalid") && tries[4].code === "locked" && until === T0 + 4000 + min(15), j(tries.map((t) => t.code)));
check("K2", "the message: \"Too many attempts. Try again after HH:MM, or ask your administrator to unlock your account.\" (office time)", tries[4].error === `Too many attempts. Try again after ${istTime(until)}, or ask your administrator to unlock your account.` && istTime(until) === "10:15", tries[4].error);
const more = await fails(EMAIL, 3, T0 + min(2));
check("K3", "while locked, more attempts say the same (with the time) and open no second request", more.every((t) => t.code === "locked" && t.error === tries[4].error) && UR.allUnlockRequests().length === 1, String(UR.allUnlockRequests().length));
const req = UR.allUnlockRequests()[0];
check("K4", "one request: who, when, 5 attempts, the lock's end, open", req.userId === ARJUN && req.attempts === 5 && req.lockedUntil === until && req.lockedAt === T0 + 4000 && req.status === "open", j(req));

// ---------- W ----------
section("W. Who sees and resolves it");
check("W1", "the Admin's waiting list has it (the inbox, the bell, the sidebar count read this)", j(LK.pendingUnlockRequests(AARAV, T0 + min(3)).map((r) => r.id)) === j([req.id]));
check("W2", "HR (accounts:reset, not accounts:unlock) has nothing waiting and can't unlock or dismiss", LK.pendingUnlockRequests(PRIYA, T0 + min(3)).length === 0 && LK.resolveUnlockRequest(PRIYA, req.id, "unlock", T0 + min(3)).code === "not-allowed" && LK.resolveUnlockRequest(PRIYA, req.id, "dismiss", T0 + min(3)).code === "not-allowed" && C.accountOf(ARJUN, T0 + min(3)).status === "locked");
check("W3", "the employee themself can't resolve it", LK.resolveUnlockRequest(ARJUN, req.id, "unlock", T0 + min(3)).code === "not-allowed");

// ---------- R ----------
section("R. Resolving");
const dis = LK.resolveUnlockRequest(AARAV, req.id, "dismiss", T0 + min(4));
check("R1", "Dismiss: the request closes, the account stays locked until the lock expires", dis.ok && UR.unlockRequest(req.id).status === "dismissed" && C.accountOf(ARJUN, T0 + min(4)).status === "locked" && LK.pendingUnlockRequests(AARAV, T0 + min(4)).length === 0);
check("R2", "a dismissed request can't be resolved again", LK.resolveUnlockRequest(AARAV, req.id, "unlock", T0 + min(5)).code === "decided");
check("R3", "after the lock's end the account is open again and nothing waits (expired)", C.accountOf(ARJUN, until + 1000).status !== "locked" && LK.pendingUnlockRequests(AARAV, until + 1000).length === 0);
// a second lock after the first expired: a second request
const T1 = until + min(1);
await fails(EMAIL, 5, T1);
const reqs = UR.allUnlockRequests();
check("R4", "a new lock opens a new request (one per lock)", reqs.length === 2 && reqs[1].status === "open" && reqs[1].lockedUntil > until, String(reqs.length));
const un = LK.resolveUnlockRequest(AARAV, reqs[1].id, "unlock", T1 + min(1));
const acc = C.accountOf(ARJUN, T1 + min(1));
check("R5", "Unlock now: the lock and the count are cleared, the request says unlocked, by whom", un.ok && acc.status !== "locked" && acc.failedCount === 0 && UR.unlockRequest(reqs[1].id).status === "unlocked" && UR.unlockRequest(reqs[1].id).by === AARAV);
check("R6", "it is in the audit trail (unlocked by an Admin), with no secret", AT.allEvents?.().some?.((e) => e.kind === "unlocked" && e.userId === ARJUN) ?? JSON.stringify(mem.get("officeos:audit-trail") ?? "").includes("unlocked"));
check("R7", "after Unlock now, signing in with a wrong password counts from 1 again (not straight back to locked)", (await C.signInWithPassword(EMAIL, "wrong-again", T1 + min(2))).code === "invalid");
// a third lock, lifted another way (the profile's Unlock): the request closes by itself
const T2 = T1 + min(5);
await fails(EMAIL, 4, T2);
const r3 = UR.allUnlockRequests().at(-1);
check("R8", "a third lock (the 4 tries after one counted already): its own request", UR.allUnlockRequests().length === 3 && r3.status === "open");
C.unlockAccount(AARAV, ARJUN, T2 + min(1));
const item = LK.unlockRequestItem(r3.id, T2 + min(1));
check("R9", "unlocked from the profile instead: the request isn't waiting any more (expired), with nothing rewritten", LK.pendingUnlockRequests(AARAV, T2 + min(1)).length === 0 && item.status === "expired" && UR.unlockRequest(r3.id).status === "open");
check("R10", "...and resolving it now says it isn't locked", LK.resolveUnlockRequest(AARAV, r3.id, "unlock", T2 + min(1)).code === "not-locked");

// ---------- U ----------
section("U. An email nobody has");
const ghost = await fails("nobody@northwind.com", 5, T0);
check("U1", "locks the same way, with the same words (who has an account isn't told), and opens no request", ghost[4].code === "locked" && /^Too many attempts\. Try again after \d\d:\d\d, or ask your administrator to unlock your account\.$/.test(ghost[4].error) && UR.allUnlockRequests().every((r) => r.userId === ARJUN), ghost[4].error);

// ---------- S ----------
section("S. The Admin's own lock");
const TS = T0 + min(300);
await fails("aarav.mehta@northwind.com", 5, TS);
const own = UR.allUnlockRequests().find((r) => r.userId === AARAV);
check("S1", "Aarav's own lock opens a request, but it isn't in his waiting list and he can't unlock it himself", own && LK.pendingUnlockRequests(AARAV, TS + min(1)).every((r) => r.userId !== AARAV)
  && LK.resolveUnlockRequest(AARAV, own.id, "unlock", TS + min(1)).code === "not-allowed" && LK.resolveUnlockRequest(AARAV, own.id, "dismiss", TS + min(1)).code === "not-allowed"
  && UR.unlockRequest(own.id).status === "open" && C.accountOf(AARAV, TS + min(1)).status === "locked", j(own));

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;