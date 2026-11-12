// usage: TZ=<zone> node leave.mjs
// Data-layer tests for collection.js, holidays.js and leave-store.js (staged copies in ./js).
// "Today" is pinned to Mon 28 Sep 2026, 10:00 local time.

// ---- in-memory localStorage (core/storage.js reads the global) ----
class MemoryStorage {
  constructor() { this.map = new Map(); this.failWrites = false; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failWrites) throw new Error("QuotaExceededError"); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}
globalThis.localStorage = new MemoryStorage();
const quiet = console.error; console.error = () => {};   // storage.js logs expected parse/save failures

// ---- pinned clock ----
const RealDate = Date;
const NOW = new RealDate(2026, 8, 28, 10, 0, 0).getTime();   // local time
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
};

const C = await import("./js/data/collection.js");
const H = await import("./js/data/holidays.js");
const HOL_ACTOR = "EMP-1003";   // Round 10W (signature; was addHoliday(fields) / removeHoliday(id)): the holiday writes take the acting person's id first and check their record (holidays:manage); every call here passes HR's (Priya). The guard itself: holiguard.mjs
const L = await import("./js/data/leave-store.js");
const S = await import("./js/data/store.js");
const USER_ACTOR = (role, target = null) => { const on = S.getAllUsers().filter((u) => u.role === role && u.status !== "inactive"); return (on.find((u) => u.id !== target) ?? on[0])?.id ?? null; };   // Round 10Y (signature; was the optional { byRole }): the user writes take the acting person's id first and check their record; each call here passes someone active whose role on record is the one it claimed (an Admin where it claimed none). The guard itself: userguard.mjs

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const raw = (key) => JSON.parse(localStorage.getItem(`officeos:${key}`));
const freshLeave = () => { L.resetLeaveData(); S.resetDemoData(); };
const j = JSON.stringify;

console.log(`TZ=${process.env.TZ ?? "(system)"}  offset now=${-new Date().getTimezoneOffset()} min  "today"=${new Date().toString().slice(0, 24)}`);

// =====================================================================
section("collection.js");
const SEED = [{ name: "a" }, { id: "T-7", name: "b" }, { name: "c", nested: { deep: [1, 2] } }];
const t = C.createCollection({ key: "t1", version: 2, seed: () => SEED, idPrefix: "T-" });
const first = t.getAll();
check("C1", "seed: saved as { version, nextNum, records } under officeos:t1", j(Object.keys(raw("t1"))) === j(["version", "nextNum", "records"]) && raw("t1").version === 2,
  j(raw("t1")));
check("C1b", "seed ids: existing kept, missing ones numbered after the highest (T-7 -> T-8, T-9)", first.map((r) => r.id).join() === "T-8,T-7,T-9" && raw("t1").nextNum === 10, first.map((r) => r.id).join());
SEED[2].nested.deep.push(99);
check("C2", "seed deep-copied: changing the seed constant later changes nothing saved", j(t.get("T-9").nested.deep) === "[1,2]");
SEED[2].nested.deep.pop();
const r1 = t.getAll(); r1[0].name = "CHANGED"; const g = t.get("T-7"); g.name = "CHANGED";
check("C3", "reads are copies: editing getAll()/get() results changes nothing stored", t.get("T-8").name === "a" && t.get("T-7").name === "b");
const added = t.add({ id: "T-1", name: "d", list: [1] }); added.record.list.push(2);
check("C4", "add(): generated id (supplied id ignored), result is a copy", added.ok && added.record.id === "T-10" && j(t.get("T-10").list) === "[1]", j(added));
check("C5", "update(): merges; refuses an id change; unknown id fails", t.update("T-10", { name: "e" }).record.name === "e" && t.update("T-10", { id: "T-99" }).ok === false && j(t.update("T-404", {})) === j({ ok: false, error: "No record with id T-404." }));
t.remove("T-10");
const again = t.add({ name: "f" });
check("C6", "id never reused after remove (T-10 removed -> next is T-11)", again.record.id === "T-11" && !t.get("T-10") && raw("t1").nextNum === 12, `new id ${again.record.id}, nextNum ${raw("t1").nextNum}`);
["T-8", "T-7", "T-9", "T-11"].forEach((id) => t.remove(id));
check("C6b", "even with the list emptied, nextNum keeps climbing", t.getAll().length === 0 && t.add({ name: "g" }).record.id === "T-12");
check("C6c", "remove(): result carries the removed record; unknown id fails", t.remove("T-12").record.name === "g" && t.remove("T-12").ok === false);
localStorage.setItem("officeos:t1", j({ version: 1, nextNum: 500, records: [{ id: "T-400", name: "old" }] }));
check("C7", "old version -> re-seeded from seed()", t.getAll().map((r) => r.name).join() === "a,b,c" && raw("t1").version === 2 && raw("t1").nextNum === 10);
for (const [label, bad] of [["not JSON", "{oops"], ["records not an array", j({ version: 2, nextNum: 3, records: {} })], ["nextNum missing", j({ version: 2, records: [] })], ["null", "null"]]) {
  localStorage.setItem("officeos:t1", bad);
  check("C8", `corrupt saved data (${label}) -> re-seeded, no crash`, t.getAll().length === 3 && raw("t1").nextNum === 10);
}
localStorage.removeItem("officeos:t1");
check("C9", "missing -> seeded on first read", t.getAll().length === 3 && !!raw("t1"));
localStorage.failWrites = true;
const full = t.add({ name: "x" });
localStorage.failWrites = false;
check("C10", "storage full: {ok:false,error}; nothing half-saved, nextNum unchanged", j(full) === j({ ok: false, error: "Couldn't save. Browser storage may be full or disabled." }) && t.getAll().length === 3 && raw("t1").nextNum === 10);
t.add({ name: "y" }); t.reset();
check("C11", "reset(): next read is the seed again", t.getAll().map((r) => r.name).join() === "a,b,c");
check("C12", "fail(): same shape as store.js", j(C.fail("E")) === j({ ok: false, error: "E" }) && j(C.fail("E", "f")) === j({ ok: false, error: "E", field: "f" }));
check("C13", "store.js keys untouched by the new collections", localStorage.getItem("officeos:users") === null || raw("users").version === 3);

// =====================================================================
section("holidays.js");
H.resetHolidays();
const hs = H.getAllHolidays();
console.log("       " + hs.map((h) => `${h.id} ${h.date} ${h.name} (${h.kind})`).join("\n       "));
check("H1", "7 seeded holidays from holidays.html, date-sorted, 3 national / 3 company / 1 optional",
  hs.length === 7 && hs.map((h) => h.kind).filter((k) => k === "national").length === 3 && hs.filter((h) => h.kind === "company").length === 3 && hs.filter((h) => h.kind === "optional").length === 1 && hs.every((h, i) => i === 0 || hs[i - 1].date < h.date));
check("H2", "holidaysIn(2026) = 7, holidaysIn(2025) = 0", H.holidaysIn(2026).length === 7 && H.holidaysIn(2025).length === 0);
const dup = H.addHoliday(HOL_ACTOR, { date: "2026-10-02", name: "Another", kind: "company" });
check("H3", "duplicate date rejected (field: date)", !dup.ok && dup.field === "date", dup.error);
const badKind = H.addHoliday(HOL_ACTOR, { date: "2026-11-09", name: "X", kind: "regional" });
const noName = H.addHoliday(HOL_ACTOR, { date: "2026-11-09", name: "   ", kind: "company" });
const badDate = H.addHoliday(HOL_ACTOR, { date: "2026-02-30", name: "X", kind: "company" });
check("H4", "bad kind (kind), empty name (name), impossible date 30 Feb (date) rejected", badKind.field === "kind" && noName.field === "name" && badDate.field === "date", [badKind, noName, badDate].map((r) => `${r.field}: ${r.error}`).join(" | "));
const DAYS = { "2026-10-03": true, "2026-10-04": true, "2026-10-02": true, "2026-10-20": true, "2026-08-15": true, "2026-12-25": false, "2026-09-28": false, "2026-10-01": false, "not-a-date": false, "2026-02-30": false };
const got = Object.fromEntries(Object.keys(DAYS).map((d) => [d, H.isDayOff(d)]));
check("H5", "isDayOff: Sat/Sun yes; Gandhi Jayanti (national) & Dussehra (company) yes; Christmas (optional) NO; weekdays no; invalid no",
  Object.entries(DAYS).every(([d, v]) => got[d] === v), Object.entries(got).map(([d, v]) => `${d}=${v}`).join(" "));
const added2 = H.addHoliday(HOL_ACTOR, { date: "2026-11-09", name: "Bhai Dooj", kind: "company" });
check("H6", "added company holiday becomes a day off; removing it undoes that; its id isn't reused",
  // Round 10A (harness; was `ids ${added2.record.id} then HOL-9`, which threw on a refused added2 instead of printing a FAIL line)
  added2.ok && H.isDayOff("2026-11-09") && H.removeHoliday(HOL_ACTOR, added2.record.id).ok && !H.isDayOff("2026-11-09") && H.addHoliday(HOL_ACTOR, { date: "2026-11-10", name: "X", kind: "optional" }).record.id === "HOL-9" && !H.isDayOff("2026-11-10"), added2.ok ? `ids ${added2.record.id} then HOL-9` : added2.error);
check("H7", "calendar helpers: 2026-02-29 invalid, 2028-02-29 valid, weekday of 3 Oct 2026 is Saturday",
  !H.isValidDate("2026-02-29") && H.isValidDate("2028-02-29") && H.isWeekend("2026-10-03") && !H.isWeekend("2026-10-02"));
H.resetHolidays();

// =====================================================================
section("leave-store.js: workingDays");
const WD = [
  ["Fri 25 Sep -> Mon 28 Sep (weekend skipped)", "2026-09-25", "2026-09-28", "full", 2],
  ["Thu 1 Oct -> Mon 5 Oct (Gandhi Jayanti + weekend)", "2026-10-01", "2026-10-05", "full", 2],
  ["Mon 19 -> Wed 21 Oct (Dussehra Tue)", "2026-10-19", "2026-10-21", "full", 2],
  ["Thu 24 -> Fri 25 Dec (Christmas is optional, so it counts)", "2026-12-24", "2026-12-25", "full", 2],
  ["Mon 26 Oct -> Fri 6 Nov (crosses US DST end 1 Nov)", "2026-10-26", "2026-11-06", "full", 10],
  ["Mon 28 Dec 2026 -> Fri 8 Jan 2027 (year end)", "2026-12-28", "2027-01-08", "full", 10],
  ["Sat 3 Oct alone", "2026-10-03", "2026-10-03", "full", 0],
  ["to before from", "2026-10-06", "2026-10-05", "full", 0],
  ["invalid date", "2026-10-32", "2026-10-33", "full", 0],
  ["half day, first half, Fri 9 Oct", "2026-10-09", "2026-10-09", "first-half", 0.5],
  ["half day, second half, Fri 9 Oct", "2026-10-09", "2026-10-09", "second-half", 0.5],
  ["half day over two days -> not allowed (0)", "2026-10-08", "2026-10-09", "first-half", 0],
  ["half day on a Saturday -> 0", "2026-10-03", "2026-10-03", "first-half", 0],
  ["half day on a holiday -> 0", "2026-10-02", "2026-10-02", "second-half", 0],
  ["unknown duration -> 0", "2026-10-05", "2026-10-05", "quarter", 0],
];
WD.forEach(([label, f, to, d, want], i) => { const v = L.workingDays(f, to, d); check(`W${i + 1}`, label, v === want, `${v}`); });

// =====================================================================
section("leave-store.js: seed");
freshLeave();
const seed = L.allRequests();
const users = S.getAllUsers();
const nameOf = (id) => users.find((u) => u.id === id)?.name;
console.log(seed.map((r) => `       ${r.id} ${nameOf(r.userId).padEnd(12)} ${r.type.padEnd(6)} ${r.from}..${r.to} ${r.duration.padEnd(10)} ${String(r.days).padStart(3)}d  ${r.status.padEnd(9)} stage=${r.stage.padEnd(7)} approver=${L.currentApproverName(r) || "-"}`).join("\n"));
check("S1", `${seed.length} seeded requests, all for real users (Arjun, Rohan, Ananya, Meera, Sneha, Priya)`,
  seed.every((r) => nameOf(r.userId)) && [...new Set(seed.map((r) => nameOf(r.userId)))].sort().join() === "Ananya Iyer,Arjun Kapoor,Meera Joshi,Priya Nair,Rohan Gupta,Sneha Rao");
check("S2", "no fake people left (Karan Malhotra, Neha Kulkarni, Ishita Bose, Aditya Rao)", !j(seed).match(/Karan|Neha|Ishita|Aditya/));
check("S3", "every stored `days` equals workingDays(); start and end are working days", seed.every((r) => r.days === L.workingDays(r.from, r.to, r.duration) && !H.isDayOff(r.from) && !H.isDayOff(r.to)),
  seed.filter((r) => r.days !== L.workingDays(r.from, r.to, r.duration)).map((r) => r.id).join() || "all match");
check("S4", "LV-2201 moved off Saturday 3 Oct (now Mon 5 Oct); LV-2189 no longer in the past (13-15 Oct)", L.getRequest("LV-2201").from === "2026-10-05" && !H.isWeekend(L.getRequest("LV-2201").from) && L.getRequest("LV-2189").from > "2026-09-28");
check("S5", "no pending request starts in the past", seed.filter((r) => r.status === "pending").every((r) => r.from >= "2026-09-28"));
check("S6", "mixed statuses: approved, pending, rejected, cancelled all present; stage matches status",
  ["approved", "pending", "rejected", "cancelled"].every((s) => seed.some((r) => r.status === s)) && seed.every((r) => (r.status === "pending") === (r.stage !== "done")),
  j(Object.fromEntries(["approved", "pending", "rejected", "cancelled"].map((s) => [s, seed.filter((r) => r.status === s).length]))));
const resolved = (u) => { const m = users.filter((x) => x.status === "active" && x.name === u.reportingManager && x.id !== u.id); return m.length === 1 ? m[0].id : null; };
check("S7", "managerId = the rule's resolution of each requester's reportingManager; pending stage follows it",
  seed.every((r) => r.managerId === resolved(users.find((u) => u.id === r.userId))) && seed.filter((r) => r.status === "pending").every((r) => r.stage === (r.managerId ? "manager" : "hr")));
check("S8", "history: first entry 'applied' by the requester; decided/cancelled ones end with that decision; rejections have a note",
  seed.every((r) => r.history[0].decision === "applied" && r.history[0].byUserId === r.userId && (r.status === "pending" ? r.history.length === 1 : r.history.at(-1).decision === r.status) && (r.status !== "rejected" || r.history.at(-1).note)));
check("S9", "no user has overlapping pending/approved requests", seed.every((a) => !seed.some((b) => a.id !== b.id && a.userId === b.userId && ["pending", "approved"].includes(a.status) && ["pending", "approved"].includes(b.status) && a.from <= b.to && b.from <= a.to)));
const periods = [];
for (const u of users) for (const r of seed.filter((x) => x.userId === u.id)) periods.push([u.id, Number(r.from.slice(0, 4)), Number(r.from.slice(5, 7))]);
const within = periods.every(([id, y, m]) => Object.entries(L.balanceFor(id, y, m)).every(([, b]) => b.allowance === null || b.approved + b.pending <= b.allowance));
check("S10", "seed balances add up: every user/type/period within its allowance", within);
const arjunOct = L.balanceFor("EMP-1105", 2026, 10), arjunAug = L.balanceFor("EMP-1105", 2026, 8);
console.log(`       Arjun 2026 (Oct): ${Object.entries(arjunOct).map(([k, b]) => `${k} ${b.approved}+${b.pending}p/${b.allowance ?? "∞"} left ${b.left ?? "-"}`).join(" | ")}`);
check("S11", "Arjun: casual 2 approved + 1 pending (rejected LV-2101 not counted), left 10; sick 2/8 left 6; unpaid no limit",
  j(arjunOct.casual) === j({ allowance: 12, approved: 2, pending: 1, left: 10 }) && j(arjunOct.sick) === j({ allowance: 8, approved: 2, pending: 0, left: 6 }) && j(arjunOct.unpaid) === j({ allowance: null, approved: 0, pending: 0, left: null }));
check("S12", "WFH is per month: Arjun Aug 1 used (3 left), Oct 0 used (4 left)", arjunAug.wfh.approved === 1 && arjunAug.wfh.left === 3 && arjunOct.wfh.approved === 0 && arjunOct.wfh.left === 4);
check("S13", "Meera: earned 9 of 10 approved (her 'on leave' status matches LV-2172 covering today)", L.balanceFor("EMP-1023", 2026, 9).earned.approved === 9 && S.getUser("EMP-1023").status === "on-leave" && L.getRequest("LV-2172").from <= "2026-09-28" && L.getRequest("LV-2172").to >= "2026-09-28");
check("S14", "balanceFor() defaults to today's year and month", j(L.balanceFor("EMP-1105")) === j(L.balanceFor("EMP-1105", 2026, 9)));

// =====================================================================
section("leave-store.js: applyLeave");
freshLeave();
const errs = [
  ["unknown user", "EMP-9999", {}, undefined],
  ["inactive user (Divya)", "EMP-1061", { type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "x" }, undefined],
  ["bad type", "EMP-1105", { type: "vacation", from: "2026-11-02", to: "2026-11-02", reason: "x" }, "type"],
  ["bad from", "EMP-1105", { type: "casual", from: "2026-11-31", to: "2026-12-01", reason: "x" }, "from"],
  ["to before from", "EMP-1105", { type: "casual", from: "2026-11-03", to: "2026-11-02", reason: "x" }, "to"],
  ["only weekend days", "EMP-1105", { type: "casual", from: "2026-10-03", to: "2026-10-04", reason: "x" }, "to"],
  ["only a holiday", "EMP-1105", { type: "casual", from: "2026-10-02", to: "2026-10-02", reason: "x" }, "to"],
  ["half day over 2 days", "EMP-1105", { type: "casual", from: "2026-11-02", to: "2026-11-03", duration: "first-half", reason: "x" }, "duration"],
  ["empty reason", "EMP-1105", { type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "  " }, "reason"],
  ["a year or longer (2 Nov 2026 -> 2 Nov 2027)", "EMP-1105", { type: "unpaid", from: "2026-11-02", to: "2027-11-02", reason: "x" }, "to"],
];
errs.forEach(([label, id, f, field], i) => { const r = L.applyLeave(id, f); check(`A${i + 1}`, `rejected: ${label}${field ? ` (field: ${field})` : ""}`, r.ok === false && r.field === field && !("advisories" in r), r.error); });
check("A11", "nothing was stored by the rejected attempts", L.allRequests().length === 11);

const before = L.balanceFor("EMP-1105", 2026, 11).casual;
const ap = L.applyLeave("EMP-1105", { type: "casual", from: "2026-11-02", to: "2026-11-03", reason: "Trip", contactPhone: " +91 1 ", extra: "ignored", status: "approved", id: "LV-1" });
const after = L.balanceFor("EMP-1105", 2026, 11).casual;
check("B1", "apply: new id LV-2212, pending, 2 days, stray fields ignored, phone trimmed, appliedOn = today", ap.ok && ap.record.id === "LV-2212" && ap.record.status === "pending" && ap.record.days === 2 && !("extra" in ap.record) && ap.record.contactPhone === "+91 1" && ap.record.appliedOn === "2026-09-28" && j(ap.advisories) === "[]", j(ap.record));
check("B2", "balance counts approved and pending separately: pending +2, approved and left unchanged", after.pending === before.pending + 2 && after.approved === before.approved && after.left === before.left, `${j(before)} -> ${j(after)}`);
L.decideLeave("LV-2212", "EMP-1029", "emp", "approve");   // Round 8C (setup): Sneha, Arjun's manager, approves first
L.decideLeave("LV-2212", "EMP-1003", "hr", "approve");
const afterApprove = L.balanceFor("EMP-1105", 2026, 11).casual;
check("B3", "after approval: moves from pending to approved, left drops by 2", afterApprove.approved === after.approved + 2 && afterApprove.pending === after.pending - 2 && afterApprove.left === after.left - 2, j(afterApprove));

// over-balance
const meeraBig = L.applyLeave("EMP-1023", { type: "earned", from: "2026-11-02", to: "2026-11-03", reason: "x" });
check("O1", "over balance blocked: Meera earned 9 used + 2 > 10", !meeraBig.ok && meeraBig.field === "type", meeraBig.error);
const meeraOne = L.applyLeave("EMP-1023", { type: "earned", from: "2026-11-02", to: "2026-11-02", reason: "x" });
const meeraAgain = L.applyLeave("EMP-1023", { type: "earned", from: "2026-11-04", to: "2026-11-04", reason: "x" });
check("O2", "exactly reaching the allowance is fine (9+1); then pending counts, so one more is blocked", meeraOne.ok && !meeraAgain.ok, meeraAgain.error);
const arjunBig = L.applyLeave("EMP-1105", { type: "casual", from: "2026-11-09", to: "2026-11-20", reason: "x" });
check("O3", "casual: Arjun 2+2 approved, 1 pending = 5 used; 10 more days blocked", !arjunBig.ok && /7 of 12 days free in 2026 \(4 approved, 1 pending\), and this request is 10/.test(arjunBig.error), arjunBig.error);
const unpaid = L.applyLeave("EMP-1105", { type: "unpaid", from: "2026-11-09", to: "2026-12-18", reason: "x" });
check("O4", "unpaid has no limit: 30 working days accepted", unpaid.ok && unpaid.record.days === 30, `${unpaid.record?.days} days`);
const nextYear = L.applyLeave("EMP-1023", { type: "earned", from: "2027-01-04", to: "2027-01-08", reason: "x" });
const almostYear = L.applyLeave("EMP-1017", { type: "unpaid", from: "2027-02-01", to: "2028-01-31", reason: "x" });
check("O6", "just under a year (1 Feb 2027 -> 31 Jan 2028) is accepted", almostYear.ok, almostYear.error ?? `${almostYear.record.days} days`);
check("O5", "allowance is per year: Meera's 2027 earned leave is separate", nextYear.ok && L.balanceFor("EMP-1023", 2027, 1).earned.pending === 5);

// overlap
const ov1 = L.applyLeave("EMP-1105", { type: "sick", from: "2026-10-05", to: "2026-10-05", reason: "x" });
check("V1", "overlap with own pending LV-2201 blocked (any type)", !ov1.ok && ov1.field === "from" && /LV-2201/.test(ov1.error), ov1.error);
const ov2 = L.applyLeave("EMP-1105", { type: "casual", from: "2026-10-30", to: "2026-11-02", reason: "x" });
check("V2", "overlap with own approved LV-2212 (2-3 Nov) blocked", !ov2.ok && /LV-2212/.test(ov2.error), ov2.error);
const ov3 = L.applyLeave("EMP-1105", { type: "casual", from: "2027-01-20", to: "2027-01-20", reason: "x" });
const ov4 = L.applyLeave("EMP-1042", { type: "wfh", from: "2026-09-30", to: "2026-09-30", reason: "x" });
check("V3", "no clash with rejected/cancelled requests (Rohan re-applies after his cancelled LV-2180)", ov3.ok && ov4.ok);
const h1 = L.applyLeave("EMP-1017", { type: "casual", from: "2026-10-09", to: "2026-10-09", duration: "second-half", reason: "x" });
const h2 = L.applyLeave("EMP-1017", { type: "casual", from: "2026-10-09", to: "2026-10-09", duration: "first-half", reason: "x" });
check("V4", "half days: second half allowed next to Ananya's first half (LV-2208); a second first half is blocked", h1.ok && h1.record.days === 0.5 && !h2.ok, h2.error);
check("V5", "someone else's dates don't block you (Arjun and Rohan both off 13 Oct is fine)", L.applyLeave("EMP-1105", { type: "wfh", from: "2026-10-13", to: "2026-10-13", reason: "x" }).ok);

// manager resolution
freshLeave();
const arj = L.applyLeave("EMP-1105", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" }).record;
const kab = L.applyLeave("EMP-1008", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" }).record;
const ana = L.applyLeave("EMP-1017", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" }).record;
check("M1", "manager resolved: Arjun -> Sneha (EMP-1029), stage manager, approver shows 'Sneha Rao'", arj.managerId === "EMP-1029" && arj.stage === "manager" && L.currentApproverName(arj) === "Sneha Rao");
check("M2", "Kabir (Finance) -> Aarav (EMP-1001)", kab.managerId === "EMP-1001" && kab.stage === "manager" && L.currentApproverName(kab) === "Aarav Mehta");
check("M3", "no manager (Ananya) -> managerId null, stage hr, approver 'HR'", ana.managerId === null && ana.stage === "hr" && L.currentApproverName(ana) === "HR");
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { reportingManager: "Divya Menon" });   // inactive
const rohanInactiveMgr = L.applyLeave("EMP-1042", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" }).record;
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { reportingManager: "sneha rao" });     // wrong case
const rohanCase = L.applyLeave("EMP-1042", { type: "wfh", from: "2026-11-03", to: "2026-11-03", reason: "x" }).record;
S.addUser(USER_ACTOR("admin", null), { name: "Sneha Rao", email: "sneha.rao2@northwind.com", department: "SAL" });   // a second Sneha Rao
S.updateUser(USER_ACTOR("admin", "EMP-1042"), "EMP-1042", { reportingManager: "Sneha Rao" });
const rohanDup = L.applyLeave("EMP-1042", { type: "wfh", from: "2026-11-04", to: "2026-11-04", reason: "x" }).record;
check("M4", "manager inactive, name not an exact match, or two people with that name -> hr", [rohanInactiveMgr, rohanCase, rohanDup].every((r) => r.managerId === null && r.stage === "hr"));
S.resetDemoData();
S.updateUser(USER_ACTOR("admin", "EMP-1029"), "EMP-1029", { name: "Sneha Rao-Iyer" });
check("M5", "approver name follows a rename of the manager (stored as id)", L.currentApproverName(L.getRequest("LV-2201")) === "Sneha Rao-Iyer");
// Round 13H: deleteUser() refuses while the person has anything open (round-13g-scoping.md G3 (a)). The person's own
// requests are settled in storage first (pending -> cancelled; an approved claim -> paid, an approved asset request ->
// closed), so this keeps testing what it did; the refusal itself is delopen.mjs.
const SETTLED = [["leave-requests", { pending: "cancelled" }], ["regularizations", { pending: "cancelled" }],
  ["expense-claims", { pending: "cancelled", approved: "paid" }], ["asset-requests", { pending: "cancelled", approved: "closed" }]];
const settleOwn = (who) => {
  for (const [key, done] of SETTLED) {
    const box = JSON.parse(localStorage.getItem(`officeos:${key}`) ?? "null");
    if (!box) continue;
    box.records.filter((r) => (who === null || r.userId === who) && done[r.status]).forEach((r) => { r.status = done[r.status]; });
    localStorage.setItem(`officeos:${key}`, JSON.stringify(box));
  }
};
settleOwn("EMP-1029");   // Round 13H (behavior): Sneha's own LV-2202 / RG-103 settled before she's deleted
S.deleteUser(USER_ACTOR("admin", "EMP-1029"), "EMP-1029");
check("M6", "manager deleted -> approver shows 'HR'", L.currentApproverName(L.getRequest("LV-2201")) === "HR");

// admin auto-approve
freshLeave();
const aar = L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-02", to: "2026-11-02", reason: "x" });
// Round 10A (harness; was j(aar.record.history), which threw on a refused aar instead of printing a FAIL line)
check("AD1", "Admin's own request auto-approved: status approved, stage done, history applied + auto-approved at both steps (Round 8C: manager and hr; was one entry)", aar.ok && aar.record.status === "approved" && aar.record.stage === "done" && aar.record.history.map((h) => h.decision).join() === "applied,auto-approved,auto-approved" && aar.record.history.slice(1).map((h) => h.stage).join() === "manager,hr" && aar.record.history[1].note === "Auto-approved (Admin)" && aar.record.history[1].byUserId === "EMP-1001", aar.ok ? j(aar.record.history) : aar.error);
check("AD2", "Aarav's manager 'Rahul Deshmukh' isn't a user -> managerId null; balance counts it as approved", aar.record.managerId === null && L.balanceFor("EMP-1001", 2026, 11).casual.approved === 1);
const aarOver = L.applyLeave("EMP-1001", { type: "casual", from: "2026-11-09", to: "2026-11-24", reason: "x" });
check("AD3", "Admin still can't go over the allowance or overlap", !aarOver.ok && !L.applyLeave("EMP-1001", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" }).ok);

// advisories
freshLeave();
const sick3 = L.applyLeave("EMP-1042", { type: "sick", from: "2026-10-26", to: "2026-10-28", reason: "x" });
check("AV1", "sick 3 days, well ahead -> certificate only", sick3.ok && sick3.advisories.map((a) => a.code).join() === "certificate", j(sick3.advisories));
const soon = L.applyLeave("EMP-1017", { type: "casual", from: "2026-10-01", to: "2026-10-06", reason: "x" });
check("AV2", "casual 3 working days starting in 3 days -> short-notice (request still saved)", soon.ok && soon.record.days === 3 && soon.advisories.map((a) => a.code).join() === "short-notice", j(soon.advisories));
const sickSoon = L.applyLeave("EMP-1105", { type: "sick", from: "2026-09-28", to: "2026-09-30", reason: "x" });
check("AV3", "sick 3 days starting today -> both advisories", sickSoon.ok && sickSoon.advisories.map((a) => a.code).join() === "certificate,short-notice");
const far = L.applyLeave("EMP-1017", { type: "casual", from: "2026-11-16", to: "2026-11-18", reason: "x" });
const two = L.applyLeave("EMP-1017", { type: "sick", from: "2026-10-12", to: "2026-10-13", reason: "x" });
check("AV4", "3 days a month ahead -> none; sick exactly 2 days -> none", far.advisories.length === 0 && two.advisories.length === 0);
const w1 = L.applyLeave("EMP-1017", { type: "wfh", from: "2026-11-02", to: "2026-11-04", reason: "x" });
const w2 = L.applyLeave("EMP-1017", { type: "wfh", from: "2026-11-05", to: "2026-11-06", reason: "x" });
check("AV5", "WFH over 4 in a month: NOT blocked, returns a wfh-limit advisory", w1.ok && w1.advisories.length === 0 && w2.ok && w2.advisories.map((a) => a.code).join() === "wfh-limit", w2.advisories[0]?.message);

// =====================================================================
section("leave-store.js: decideLeave / cancelLeave / reads");
freshLeave();
const own = L.decideLeave("LV-2211", "EMP-1003", "hr", "approve");
check("D1", "HR (Priya) can't decide her own request LV-2211", !own.ok && L.getRequest("LV-2211").status === "pending", own.error);
check("D2", "pendingFor(Priya, hr) excludes her own; pendingFor(Aarav, admin) includes it as her manager (Round 8C: each sees only the stages they hold, Priya 2 at HR, Aarav those 2 + LV-2211; was 4 / 5)",
  !L.pendingFor("EMP-1003", "hr").some((r) => r.id === "LV-2211") && L.pendingFor("EMP-1001", "admin").some((r) => r.id === "LV-2211") && L.pendingFor("EMP-1003", "hr").length === 2 && L.pendingFor("EMP-1001", "admin").length === 3);
const empTry = L.decideLeave("LV-2189", "EMP-1105", "emp", "approve");
const finTry = L.decideLeave("LV-2189", "EMP-1008", "fin", "approve");
const hrEarly = L.decideLeave("LV-2189", "EMP-1003", "hr", "approve");
const spoof = L.decideLeave("LV-2189", "EMP-1105", "hr", "approve");
check("D3", "emp (Arjun), fin (Kabir), HR before the manager (Priya), and emp claiming 'hr' all refused (Round 8C: the manager herself is no longer refused, HR at her stage is)", [empTry, finTry, hrEarly, spoof].every((r) => !r.ok) && L.getRequest("LV-2189").status === "pending" && L.getRequest("LV-2189").stage === "manager", empTry.error);
const sneha = L.decideLeave("LV-2189", "EMP-1029", "emp", "approve");
check("D3b", "Round 8C: Sneha, Rohan's manager, approves: still pending, now at the HR stage", sneha.ok && sneha.record.status === "pending" && sneha.record.stage === "hr", j(sneha.record?.history.at(-1)));
check("D4", "pendingFor() is empty for emp and fin", L.pendingFor("EMP-1105", "emp").length === 0 && L.pendingFor("EMP-1008", "fin").length === 0);
const approve = L.decideLeave("LV-2189", "EMP-1003", "hr", "approve");
// Round 10A (harness; was j(approve.record.history.at(-1)), which threw on a refused approve instead of printing a FAIL line)
check("D5", "HR then gives the final approval: approved, stage done, history records stage 'hr' + decider (Round 8C; was HR deciding the manager stage directly)", approve.ok && approve.record.status === "approved" && approve.record.stage === "done" && j(approve.record.history.at(-1)) === j({ stage: "hr", byUserId: "EMP-1003", decision: "approved", at: new Date().toISOString(), note: "" }), approve.ok ? j(approve.record.history.at(-1)) : approve.error);
const twice = L.decideLeave("LV-2189", "EMP-1001", "admin", "reject", "late");
check("D6", "a decision is final: a second decision is refused", !twice.ok && L.getRequest("LV-2189").status === "approved", twice.error);
const noNote = L.decideLeave("LV-2201", "EMP-1029", "emp", "reject");   // Round 8C: LV-2201 is at Sneha's stage, so she decides it (was Priya)
const blankNote = L.decideLeave("LV-2201", "EMP-1029", "emp", "reject", "   ");
check("D7", "reject needs a note (field: note); blank note refused", !noNote.ok && noNote.field === "note" && !blankNote.ok && L.getRequest("LV-2201").status === "pending", noNote.error);
const rej = L.decideLeave("LV-2201", "EMP-1029", "emp", "reject", "  Release week  ");   // Round 8C: the manager rejects (was Aarav)
check("D8", "reject with a note: rejected, note trimmed and kept", rej.ok && rej.record.status === "rejected" && rej.record.history.at(-1).note === "Release week" && L.currentApproverName(rej.record) === "");
check("D9", "bad decision word and unknown request refused", !L.decideLeave("LV-2202", "EMP-1003", "hr", "maybe").ok && !L.decideLeave("LV-9999", "EMP-1003", "hr", "approve").ok);
const notOwner = L.cancelLeave("LV-2202", "EMP-1105");
check("C-1", "cancel by someone else refused", !notOwner.ok && L.getRequest("LV-2202").status === "pending", notOwner.error);
const cancelled = L.cancelLeave("LV-2202", "EMP-1029");
check("C-2", "owner cancels a pending request: cancelled, stage done, history entry, no longer counted", cancelled.ok && cancelled.record.status === "cancelled" && cancelled.record.stage === "done" && cancelled.record.history.at(-1).decision === "cancelled" && L.balanceFor("EMP-1029", 2026, 10).casual.pending === 0);
check("C-3", "cancel again, cancel a decided request, or decide a cancelled one: refused",
  !L.cancelLeave("LV-2202", "EMP-1029").ok && !L.cancelLeave("LV-2189", "EMP-1042").ok && !L.cancelLeave("LV-2172", "EMP-1023").ok && !L.decideLeave("LV-2202", "EMP-1003", "hr", "approve").ok);
freshLeave();
check("R1", "requestsFor(Arjun) = his 5; allRequests() = 11", L.requestsFor("EMP-1105").map((r) => r.id).join() === "LV-2101,LV-2124,LV-2147,LV-2160,LV-2201" && L.allRequests().length === 11);
check("R2", "overlaps(): Sneha's 14 Oct (LV-2202) overlaps Rohan's 13-15 Oct in Engineering, and vice versa; Arjun 5 Oct none",
  L.overlaps("LV-2202").map((r) => r.id).join() === "LV-2189" && L.overlaps("LV-2189").map((r) => r.id).join() === "LV-2202" && L.overlaps("LV-2201").length === 0);
L.applyLeave("EMP-1017", { type: "casual", from: "2026-10-14", to: "2026-10-14", reason: "x" });   // Sales, same day
check("R3", "overlaps() is same-department only (Ananya in Sales on 14 Oct not listed)", L.overlaps("LV-2202").map((r) => r.id).join() === "LV-2189");
const copyTest = L.getRequest("LV-2201"); copyTest.status = "approved"; copyTest.history.push({});
check("R4", "reads are copies", L.getRequest("LV-2201").status === "pending" && L.getRequest("LV-2201").history.length === 1);

// =====================================================================
section("resetLeaveData()");
L.applyLeave("EMP-1105", { type: "wfh", from: "2026-11-02", to: "2026-11-02", reason: "x" });
H.addHoliday(HOL_ACTOR, { date: "2026-11-09", name: "X", kind: "company" });
L.resetLeaveData();
check("Z1", "leave and holidays both back to the seed", L.allRequests().length === 11 && H.getAllHolidays().length === 7 && raw("leave-requests").nextNum === 2212);
check("Z2", "users/departments untouched by resetLeaveData()", (() => { S.updateUser(USER_ACTOR("admin", "EMP-1017"), "EMP-1017", { phone: "1" }); L.resetLeaveData(); return S.getUser("EMP-1017").phone === "1"; })());
L.allRequests(); H.getAllHolidays();
check("Z3", "storage keys: officeos:leave-requests, officeos:holidays (no clash with users/departments/session)",
  ["officeos:leave-requests", "officeos:holidays"].every((k) => localStorage.getItem(k)));

console.error = quiet;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
