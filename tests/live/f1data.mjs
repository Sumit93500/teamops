// usage: node f1data.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// F1's data: attendance:any-office and the Admin's offices, and the HR and Finance month charts. ./js is the build. Clock Sat
// 14 Nov 2026, 10:00 local, unless a check moves it.
//   P  attendance:any-office: in the master list (91 in all), held by the Admin only (through ALL_PERMISSIONS), not
//      overridable (a stored grant gives it to nobody), role counts Admin 91 / HR 49 / Finance 42 / Employee 24
//   L  placesFor: everyone but the Admin exactly as before (the office by its type, then the homes); the Admin's own office
//      first, then every other ACTIVE office as "office:<id>" with its own name, position and radius; an inactive branch
//      isn't listed, and comes back when reactivated; with no branch the Admin's list is as before
//   C  checking in at a chosen office: the Admin inside a branch with its place id is ok and the record names it; outside it
//      the branch is named with the distance; HR choosing that id is refused (not-allowed) with nothing written; the
//      nearest-place rule (no place id) also sees the branches for the Admin only
//   M  leaveRequestsByMonthChart: the 6 months ending with today's, every request counted in the month it was sent, the
//      current month marked, a new request counted at once, across a year boundary, empty (no-records) when none was sent
//   N  payrollByMonthChart: gross summed per run, null for a run with no rows, final for an approved run, empty when no month
//      has a gross above 0, labels the runs' months
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (y, mo, d, h = 10, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
at(2026, 11, 14);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const P = await import("./js/config/permissions.js");
const R = await import("./js/config/roles.js");
const L = await import("./js/data/locations-store.js");
const O = await import("./js/data/offices-store.js");
const S = await import("./js/data/store.js");
const LV = await import("./js/data/leave-store.js");
const C = await import("./js/data/chart-data.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ARJUN = "EMP-1105", SNEHA = "EMP-1029";
const ANY = "attendance:any-office";
const M_PER_DEG = (6371008.8 * Math.PI) / 180;
const north = (p, m) => ({ lat: p.lat + m / M_PER_DEG, lng: p.lng });
const here = (p, accuracyM = 15) => ({ lat: p.lat, lng: p.lng, accuracyM });
const T = (c) => c.repeat(32);

section("P. attendance:any-office");
check("P1", "in the master list, once", P.ALL_PERMISSIONS.filter((p) => p === ANY).length === 1, P.ALL_PERMISSIONS.length);
check("P2", "91 permissions in all (90 before F1)", P.ALL_PERMISSIONS.length === 91, P.ALL_PERMISSIONS.length);
check("P3", "the Admin holds it", R.hasPermission(S.getUser(AARAV), ANY));
check("P4", "HR, Finance, an employee and a manager don't", [PRIYA, KABIR, ARJUN, SNEHA].every((id) => !R.hasPermission(S.getUser(id), ANY)));
check("P5", "not overridable: a stored grant gives it to nobody", !R.OVERRIDABLE.includes(ANY) && !R.hasPermission({ ...S.getUser(PRIYA), grantPermissions: [ANY] }, ANY));
const counts = Object.fromEntries(Object.entries(R.ROLES).map(([k, r]) => [k, r.permissions.length]));
check("P6", "role counts: Admin 91, HR 49, Finance 42, Employee 24", j(counts) === j({ admin: 91, hr: 49, fin: 42, emp: 24 }), j(counts));
check("P7", "a denied grant can't take it from the Admin either (no overrides for an Admin)", R.hasPermission({ ...S.getUser(AARAV), denyPermissions: [ANY] }, ANY));

section("L. placesFor");
const HQ = O.headOffice();
// the shape before F1, worked out on its own: the office by its type, then the homes that are set (home-eligible only)
const before = (id) => {
  const o = O.officeOf(id);
  return o ? [{ place: o.type, name: o.name, lat: o.lat, lng: o.lng, radiusM: o.radiusM }] : [];
};
const PEOPLE = S.getAllUsers().map((u) => u.id);
check("L1", "seed (no branch): everyone's list, the Admin's too, is exactly as before", PEOPLE.every((id) => j(L.placesFor(id)) === j(before(id))), PEOPLE.length);
check("L2", "the Admin's seed list is the head office alone", j(L.placesFor(AARAV).map((p) => p.place)) === j(["head"]));
const b1 = O.createOffice(AARAV, { name: "Pune branch", type: "branch", address: "Baner Road, Pune", state: "Maharashtra", ...north(HQ, 20000), radiusM: 200 });
const b2 = O.createOffice(AARAV, { name: "Mumbai branch", type: "branch", address: "Bandra Kurla Complex, Mumbai", state: "Maharashtra", ...north(HQ, 40000), radiusM: 300 });
const b3 = O.createOffice(AARAV, { name: "Kochi branch", type: "branch", address: "Kakkanad, Kochi", state: "Kerala", ...north(HQ, 60000), radiusM: 150 });
check("L3", "three branches added", b1.ok && b2.ok && b3.ok, j([b1.error, b2.error, b3.error]));
O.deactivateOffice(AARAV, b3.record.id);
const adminPlaces = L.placesFor(AARAV);
check("L4", "the Admin: head office, then every active branch by its own id, in the store's order",
  j(adminPlaces.map((p) => p.place)) === j(["head", `office:${b1.record.id}`, `office:${b2.record.id}`]), j(adminPlaces.map((p) => p.place)));
check("L5", "each branch with its own name, position and radius", j(adminPlaces.slice(1).map((p) => [p.name, p.radiusM, p.lat === O.getOffice(p.place.slice(7)).lat])) === j([["Pune branch", 200, true], ["Mumbai branch", 300, true]]));
check("L6", "an inactive branch isn't listed", !adminPlaces.some((p) => p.name === "Kochi branch"));
check("L7", "everyone else's list is still exactly as before", PEOPLE.filter((id) => id !== AARAV).every((id) => j(L.placesFor(id)) === j(before(id))));
O.setEmployeeOffice(AARAV, ARJUN, b1.record.id);
check("L8", "someone moved to a branch: only that branch, as \"branch\" (as before)", j(L.placesFor(ARJUN)) === j([{ place: "branch", name: "Pune branch", lat: b1.record.lat, lng: b1.record.lng, radiusM: 200 }]));
O.setEmployeeOffice(AARAV, AARAV, b2.record.id);
check("L9", "the Admin moved to a branch: that branch first (\"branch\"), then the head office and the other active branch",
  j(L.placesFor(AARAV).map((p) => p.place)) === j(["branch", `office:${HQ.id}`, `office:${b1.record.id}`]), j(L.placesFor(AARAV).map((p) => p.place)));
O.setEmployeeOffice(AARAV, AARAV, HQ.id);
O.reactivateOffice(AARAV, b3.record.id);
check("L10", "a reactivated branch is listed again", L.placesFor(AARAV).some((p) => p.place === `office:${b3.record.id}`));
L.setHomeEligible(PRIYA, AARAV, true);
L.setOwnHome(AARAV, "permanent", { address: "Sector 50, Gurugram", ...north(HQ, 3000) });
check("L11", "the Admin's own home comes after the offices", L.placesFor(AARAV).at(-1).place === "homePermanent" && L.placesFor(AARAV).length === 5);
O.deactivateOffice(AARAV, b3.record.id);

section("C. Checking in at a chosen office");
const PUNE = `office:${b1.record.id}`;
const inPune = here(north(b1.record, 50));
const r1 = L.checkPlace(inPune, AARAV, new Date(), PUNE);
check("C1", "the Admin inside the Pune branch, chosen: ok, 50 m, named", r1.ok && r1.place === PUNE && r1.placeName === "Pune branch" && r1.distanceM === 50, j([r1.ok, r1.place, r1.placeName, r1.distanceM]));
const r2 = L.checkPlace(here(north(HQ, 10)), AARAV, new Date(), PUNE);
check("C2", "the Admin at the head office with Pune chosen: outside, Pune named with the real distance", !r2.ok && r2.code === "outside" && r2.reason === `${r2.distanceM} m from Pune branch` && r2.distanceM > 19000, r2.reason);
const r3 = L.checkPlace(inPune, PRIYA, new Date(), PUNE);
check("C3", "HR choosing the Pune branch: not-allowed", !r3.ok && r3.code === "not-allowed", r3.code);
const r4 = L.checkPlace(inPune, AARAV);
check("C4", "no place id: the nearest place inside, the branch, for the Admin", r4.ok && r4.place === PUNE);
const r5 = L.checkPlace(inPune, PRIYA);
check("C5", "no place id for HR inside Pune: outside (the head office is HR's only place)", !r5.ok && r5.code === "outside" && r5.reason.endsWith("from Head office"), r5.reason);
const stored = () => JSON.parse(mem.get("officeos:attendance") ?? "{\"records\":[]}").records;
const beforeHr = j(stored().filter((r) => r.userId === PRIYA && r.date === "2026-11-16"));
at(2026, 11, 16, 10);
const c6 = L.checkInAt(PRIYA, "office", inPune, T("b"), PUNE);
check("C6", "HR's check-in at Pune is refused and writes nothing", !c6.ok && c6.code === "not-allowed" && j(stored().filter((r) => r.userId === PRIYA && r.date === "2026-11-16")) === beforeHr, j([c6.ok, c6.code]));
const c7 = L.checkInAt(AARAV, "office", inPune, T("a"), PUNE);
const rec = stored().find((r) => r.userId === AARAV && r.date === "2026-11-16");
check("C7", "the Admin checks in at Pune: ok, the record names it with the distance", c7.ok && rec?.checkInPlace === PUNE && rec?.checkInDistanceM === 50, j([c7.ok, c7.error, rec?.checkInPlace, rec?.checkInDistanceM]));
at(2026, 11, 16, 18);
const c8 = L.checkOutAt(AARAV, here(north(HQ, 5)), T("a"), `office:${HQ.id}`);
const rec2 = stored().find((r) => r.userId === AARAV && r.date === "2026-11-16");
// the Admin's own office is "head"; "office:<head id>" isn't one of their ids while the head office is their own
check("C8", "the head office is the Admin's own: by \"head\", not by its office id", !c8.ok && c8.code === "not-allowed", j([c8.ok, c8.code]));
const c9 = L.checkOutAt(AARAV, here(north(HQ, 5)), T("a"), "head");
const rec3 = stored().find((r) => r.userId === AARAV && r.date === "2026-11-16");
check("C9", "checking out at the head office after Pune: ok, flagged place-changed", c9.ok && rec3?.checkOutPlace === "head" && rec3?.flagged && rec3.flagReasons.includes("place-changed"), j([c9.ok, rec3?.checkOutPlace, rec3?.flagReasons]));
void rec2;

section("M. Leave requests per month");
at(2026, 11, 14);
const m1 = C.leaveRequestsByMonthChart("2026-11-14", 6);
check("M1", "labels: the 6 months ending with November 2026", j(m1.labels) === j(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]), j(m1.labels));
const sent = (from, to) => LV.allRequests().filter((r) => r.appliedOn.slice(0, 7) >= from && r.appliedOn.slice(0, 7) <= to).length;
check("M2", "each month counts the requests sent in it (the seed: Jul 1, Aug 1, Sep 7)", j(m1.series[0].values) === j(m1.labels.map((l) => sent(l, l))) && j(m1.series[0].values) === j([0, 1, 1, 7, 0, 0]), j(m1.series[0].values));
check("M3", "not empty; the period runs from the first month's 1st to today; November is the current month", !m1.empty && m1.emptyReason === null && j(m1.period) === j({ from: "2026-06-01", to: "2026-11-14" }) && j(m1.marks.map((x) => x.current)) === j([false, false, false, false, false, true]));
check("M4", "the contract's shape: one series named Requests, unit requests", m1.series.length === 1 && m1.series[0].name === "Requests" && m1.unit === "requests");
const m5 = C.leaveRequestsByMonthChart("2027-02-10", 6);
check("M5", "across the year: Sep 2026 to Feb 2027", j(m5.labels) === j(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]) && m5.series[0].values[0] === 7, j(m5.labels));
const m6 = C.leaveRequestsByMonthChart("2026-01-31", 3);
check("M6", "January's 3 months: Nov 2025, Dec 2025, Jan 2026 (one sent in Jan)", j(m6.labels) === j(["2025-11", "2025-12", "2026-01"]) && j(m6.series[0].values) === j([0, 0, 1]), j([m6.labels, m6.series[0].values]));
const m7 = C.leaveRequestsByMonthChart("2028-03-01", 6);
check("M7", "no request in the months: empty, no-records, zeros kept for the axis", m7.empty && m7.emptyReason === "no-records" && m7.series[0].values.every((v) => v === 0) && m7.labels.length === 6);
const one = C.leaveRequestsByMonthChart("2026-12-31", 1);
check("M8", "one month: December 2026 alone", j(one.labels) === j(["2026-12"]) && one.empty);
const sentNow = LV.applyLeave(ARJUN, { type: "casual", from: "2026-11-24", to: "2026-11-24", reason: "A family function" });
const m9 = C.leaveRequestsByMonthChart("2026-11-14", 6);
check("M9", "a request sent today counts in November at once", sentNow.ok !== false && m9.series[0].values.at(-1) === 1, j([sentNow.ok, sentNow.error, m9.series[0].values]));

section("N. Payroll cost per month");
const row = (gross) => ({ userId: "X", gross, deductions: 0, net: gross });
const runs = [{ month: "2026-06", status: "draft", rows: [row(100), row(250)] }, { month: "2026-07", status: "approved", rows: [row(400)] }, { month: "2026-08", status: "draft", rows: [] }];
const n1 = C.payrollByMonthChart(runs);
check("N1", "gross summed per run; a run with no rows has no value", j(n1.series[0].values) === j([350, 400, null]) && n1.series[0].name === "Gross pay", j(n1.series[0].values));
check("N2", "labels are the runs' months; final marks the approved one", j(n1.labels) === j(["2026-06", "2026-07", "2026-08"]) && j(n1.marks.map((x) => x.final)) === j([false, true, false]));
check("N3", "not empty, unit rupees, the period from first to last", !n1.empty && n1.unit === "₹" && j(n1.period) === j({ from: "2026-06", to: "2026-08" }));
const n4 = C.payrollByMonthChart([{ month: "2026-08", status: "draft", rows: [] }, null]);
check("N4", "no run with a row (or none at all): empty, no-records", n4.empty && n4.emptyReason === "no-records" && j(n4.series[0].values) === j([null, null]));
const n5 = C.payrollByMonthChart([{ month: "2026-09", status: "draft", rows: [row(0)] }]);
check("N5", "a run whose rows are all zero (no salary on file) is 0, and nothing but zeros is empty", n5.empty && n5.series[0].values[0] === 0);
const n6 = C.payrollByMonthChart([{ month: "2026-09", status: "draft", rows: [row(0)] }, { month: "2026-10", status: "draft", rows: [row(5)] }]);
check("N6", "one month above 0 is enough to draw: the zero month stays a real 0", !n6.empty && j(n6.series[0].values) === j([0, 5]));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);