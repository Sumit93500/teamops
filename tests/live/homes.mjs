// usage: node homes.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: data/locations-store.js, home places. ./js is the build. Clock Tue 6 Oct 2026 10:00 local.
//   A  default: nobody is home-eligible, no home set; reads write nothing
//   B  HR sets the flag (users:edit): HR and Admin yes; Finance, employees, managers no; history
//   C  the employee sets each home once; checks; a second set is refused
//   D  a change is a request: checks, one pending per kind, nothing changes yet
//   E  the Admin's queue (pendingLocationChanges): who sees what
//   F  approve: the new place applies; history says who, when, from, to; reject: nothing changes
//   G  cancel; no deciding twice; not your own; eligibility removed before approval
//   H  an Admin's own request is approved at once
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (h, mi = 0) => { NOW = new RealDate(2026, 9, 6, h, mi, 0).getTime(); return new RealDate(NOW).toISOString(); };
at(10);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const L = await import("./js/data/locations-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105", ROHAN = "EMP-1042";
const HOME = { address: "12 MG Road, Gurugram", lat: 28.4800, lng: 77.0800 };
const AWAY = { address: "4 Lake View, Pune", lat: 18.52, lng: 73.85 };
const NEW_HOME = { address: "7 DLF Phase 3, Gurugram", lat: 28.4950, lng: 77.0950 };

section("A. Default");
const h0 = L.homeOf(ARJUN);
check("A1", "nobody is home-eligible and nobody has a home set", j(h0) === j({ homeEligible: false, permanent: null, temporary: null, history: [] }) && !L.isHomeEligible(ARJUN), j(h0));
check("A2", "setting a home without the flag is refused", L.setOwnHome(ARJUN, "permanent", HOME).error === "You can't check in from home: HR hasn't turned it on for you.");
check("A3", "nothing in storage yet", !mem.has("officeos:home-locations") && !mem.has("officeos:location-changes"), j([...mem.keys()]));

section("B. The flag (HR or an Admin)");
for (const [who, id] of [["Finance", KABIR], ["an employee", ROHAN], ["a manager", SNEHA], ["himself", ARJUN]]) {
  check(`B-${who}`, `${who} can't set it`, L.setHomeEligible(id, ARJUN, true).error === "Only HR or an Admin can change who may check in from home." && !L.isHomeEligible(ARJUN));
}
check("B1", "a non-boolean is refused", L.setHomeEligible(PRIYA, ARJUN, "yes").field === "homeEligible");
check("B2", "an unknown employee", L.setHomeEligible(PRIYA, "EMP-9999", true).error === "No employee with id EMP-9999.");
const t1 = at(10, 5);
const e1 = L.setHomeEligible(PRIYA, ARJUN, true);
check("B3", "HR turns it on for Arjun; history: eligible, by Priya, when", e1.ok && L.isHomeEligible(ARJUN) && j(e1.record.history) === j([{ at: t1, byUserId: PRIYA, action: "eligible", kind: null, from: null, to: null, requestId: null }]), j(e1.record.history));
check("B4", "setting it to what it is already adds no history", L.setHomeEligible(AARAV, ARJUN, true).ok && L.homeOf(ARJUN).history.length === 1);
check("B5", "an Admin can set it too (Rohan)", L.setHomeEligible(AARAV, ROHAN, true).ok && L.isHomeEligible(ROHAN));

section("C. Set once");
check("C1", "a kind that isn't permanent or temporary", L.setOwnHome(ARJUN, "office", HOME).field === "kind");
check("C2", "no address", L.setOwnHome(ARJUN, "permanent", { ...HOME, address: " " }).error === "Enter the address.");
check("C3", "latitude out of range", L.setOwnHome(ARJUN, "permanent", { ...HOME, lat: 95 }).error === "Latitude must be between -90 and 90.");
check("C4", "longitude not a number", L.setOwnHome(ARJUN, "permanent", { ...HOME, lng: "77" }).error === "Latitude and longitude must be numbers.");
check("C5", "no place at all", L.setOwnHome(ARJUN, "permanent", null).field === "place");
const t2 = at(10, 10);
const s1 = L.setOwnHome(ARJUN, "permanent", { ...HOME, address: "  12 MG Road, Gurugram  " });
check("C6", "Arjun sets his permanent home: trimmed, stamped, in his history", s1.ok && j(s1.record.permanent) === j({ ...HOME, setAt: t2, setBy: ARJUN }) && s1.record.history.at(-1).action === "set" && s1.record.history.at(-1).kind === "permanent" && j(s1.record.history.at(-1).to) === j(HOME), j(s1.record));
check("C7", "setting it again is refused: a change needs a request", L.setOwnHome(ARJUN, "permanent", NEW_HOME).error === "Your permanent home is already set. To change it, send a location change request." && L.homeOf(ARJUN).permanent.address === HOME.address);
const s2 = L.setOwnHome(ARJUN, "temporary", AWAY);
check("C8", "the temporary home is set once too", s2.ok && s2.record.temporary.address === AWAY.address && L.setOwnHome(ARJUN, "temporary", HOME).ok === false);
check("C9", "someone not signed in", L.setOwnHome(null, "permanent", HOME).error === "Sign in to set your home location.");

section("D. A change is a request");
check("D1", "a kind not set yet can't be changed (Rohan has none)", L.requestLocationChange(ROHAN, "permanent", HOME, "Moved").error === "Your permanent home isn't set yet. Set it first; that needs no approval.");
check("D2", "the same place isn't a change", L.requestLocationChange(ARJUN, "permanent", HOME, "Same").error === "That's already your permanent home.");
check("D3", "a reason is needed", L.requestLocationChange(ARJUN, "permanent", NEW_HOME, " a ").error === "Give a reason for the change.");
check("D4", "a reason of 301 characters is too long", L.requestLocationChange(ARJUN, "permanent", NEW_HOME, "r".repeat(301)).error === "The reason can be at most 300 characters.");
check("D5", "a bad new place", L.requestLocationChange(ARJUN, "permanent", { ...NEW_HOME, lng: 200 }, "Moved").error === "Longitude must be between -180 and 180.");
check("D6", "someone not eligible can't ask (Sneha)", L.requestLocationChange(SNEHA, "permanent", NEW_HOME, "Moved").error === "You can't check in from home: HR hasn't turned it on for you.");
const t3 = at(11);
const q1 = L.requestLocationChange(ARJUN, "permanent", NEW_HOME, "  Moved house  ");
check("D7", "Arjun asks: LC-1, pending, the new place and reason kept, nothing applied yet", q1.ok && q1.record.id === "LC-1" && q1.record.type === "location-change" && q1.record.status === "pending" && q1.record.reason === "Moved house" && q1.record.requestedAt === t3
  && j(q1.record.place) === j(NEW_HOME) && L.homeOf(ARJUN).permanent.address === HOME.address, j(q1.record));
check("D8", "a second pending request for the same kind is refused", L.requestLocationChange(ARJUN, "permanent", AWAY, "Again").error === "You already have a permanent home change waiting.");
const q2 = L.requestLocationChange(ARJUN, "temporary", { address: "9 Beach Rd, Goa", lat: 15.49, lng: 73.82 }, "Working from Goa");
check("D9", "another kind may wait at the same time (LC-2)", q2.ok && q2.record.id === "LC-2");
check("D10", "his requests, in order", j(L.locationChangesFor(ARJUN).map((r) => r.id)) === j(["LC-1", "LC-2"]));

section("E. Who sees them");
check("E1", "Aarav (Admin) sees both", j(L.pendingLocationChanges(AARAV, "admin").map((r) => r.id)) === j(["LC-1", "LC-2"]));
check("E2", "HR, Finance, a manager and Arjun himself see none", [[PRIYA, "hr"], [KABIR, "fin"], [SNEHA, "emp"], [ARJUN, "emp"]].every(([id, role]) => L.pendingLocationChanges(id, role).length === 0));
check("E3", "Aarav's list asked for under another role is empty", L.pendingLocationChanges(AARAV, "hr").length === 0);

section("F. Approve and reject");
check("F1", "HR can't decide", L.decideLocationChange("LC-1", PRIYA, "approved").error === "Only an Admin can decide location changes.");
check("F2", "a decision that isn't approve or reject", L.decideLocationChange("LC-1", AARAV, "maybe").field === "decision");
check("F3", "an unknown request", L.decideLocationChange("LC-99", AARAV, "approved").error === "No location change with id LC-99.");
const t4 = at(12);
const a1 = L.decideLocationChange("LC-1", AARAV, "approved", "  Fine  ");
const h1 = L.homeOf(ARJUN);
const last = h1.history.at(-1);
check("F4", "approved: the request records who and when", a1.ok && a1.record.status === "approved" && a1.record.decidedBy === AARAV && a1.record.decidedAt === t4 && a1.record.note === "Fine" && j(a1.record.history.map((x) => x.action)) === j(["requested", "approved"]), j(a1.record));
check("F5", "the new place applies", j(h1.permanent) === j({ ...NEW_HOME, setAt: t4, setBy: AARAV }), j(h1.permanent));
check("F6", "his history: changed, by Aarav, from the old place to the new, with the request id", j(last) === j({ at: t4, byUserId: AARAV, action: "changed", kind: "permanent", from: HOME, to: NEW_HOME, requestId: "LC-1" }), j(last));
check("F7", "deciding it again is refused", L.decideLocationChange("LC-1", AARAV, "rejected").error === "This request is already approved.");
const before = j(L.homeOf(ARJUN));
const r1 = L.decideLocationChange("LC-2", AARAV, "rejected", "Not now");
check("F8", "rejected: the request says so; his homes and history don't change", r1.ok && r1.record.status === "rejected" && r1.record.note === "Not now" && j(L.homeOf(ARJUN)) === before);
check("F9", "nothing waits any more", L.pendingLocationChanges(AARAV, "admin").length === 0);

section("G. Cancel, eligibility, not your own");
const q3 = L.requestLocationChange(ARJUN, "temporary", { address: "1 Hill Rd, Shimla", lat: 31.1, lng: 77.17 }, "Shimla for a month");
check("G1", "someone else can't cancel it", L.cancelLocationChange(q3.record.id, ROHAN).error === "You can cancel only your own request.");
const c1 = L.cancelLocationChange(q3.record.id, ARJUN);
check("G2", "he cancels his own: cancelled, and it can't be decided", c1.ok && c1.record.status === "cancelled" && L.decideLocationChange(q3.record.id, AARAV, "approved").error === "This request is already cancelled.");
check("G3", "cancelling twice is refused", L.cancelLocationChange(q3.record.id, ARJUN).error === "This request is already cancelled.");
const q4 = L.requestLocationChange(ARJUN, "temporary", { address: "2 Fort Rd, Jaipur", lat: 26.91, lng: 75.79 }, "Jaipur");
L.setHomeEligible(PRIYA, ARJUN, false);
check("G4", "eligibility removed meanwhile: approval refused, rejection still possible", L.decideLocationChange(q4.record.id, AARAV, "approved").error === "This employee can't check in from home any more, so the change can't be approved. Reject it instead."
  && L.decideLocationChange(q4.record.id, AARAV, "rejected").ok && L.homeOf(ARJUN).temporary.address === AWAY.address);
check("G5", "turning the flag off keeps the places (unused while off) and records it", L.homeOf(ARJUN).permanent !== null && L.homeOf(ARJUN).history.at(-1).action === "not-eligible");

section("H. An Admin's own request");
L.setHomeEligible(PRIYA, AARAV, true);
L.setOwnHome(AARAV, "permanent", HOME);
const q5 = L.requestLocationChange(AARAV, "permanent", NEW_HOME, "Moved");
check("H1", "approved at once, by himself, applied, in the history", q5.ok && q5.record.status === "approved" && q5.record.decidedBy === AARAV && L.homeOf(AARAV).permanent.address === NEW_HOME.address && L.homeOf(AARAV).history.at(-1).requestId === q5.record.id, j(q5.record));
check("H2", "it never waits in anyone's queue", L.pendingLocationChanges(AARAV, "admin").length === 0);
check("H3", "the users box is untouched (no homeEligible on user records)", !(mem.get("officeos:users") ?? "").includes("homeEligible"));
mem.set("officeos:home-locations", JSON.stringify({ version: 2, people: {} }));
check("H4", "a saved copy of another version reads as empty", !L.isHomeEligible(ARJUN) && L.homeOf(ARJUN).permanent === null);
L.resetLocations();
check("H5", "reset: both keys gone", !mem.has("officeos:home-locations") && !mem.has("officeos:location-changes"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
