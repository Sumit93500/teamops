// usage: node chosen.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// L4: the chosen place. data/locations-store.js judgePlace / checkPlace / checkInAt / checkOutAt take an optional placeId:
// given, the reading is judged against that place only and the record names it; left out, everything is as before (the
// nearest place inside wins). ./js is the build. Clock Tue 6 Oct 2026, 10:00 for check-ins and 17:00 for check-outs, local.
//   A  the pure judge: two overlapping places, chosen vs nearest; outside the chosen one names it; a place that isn't
//      yours; the reading's own checks come first; no placeId (undefined or null) is the old answer
//   B  checkPlace for an employee: office, homes only when eligible and set
//   C  check-in / check-out: the record names the chosen place; refused outside it or for a place that isn't yours, with
//      nothing written; a check-out at the check-in's place in the overlap isn't flagged; without a placeId as before
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (h, mi = 0) => { NOW = new RealDate(2026, 9, 6, h, mi, 0).getTime(); };
at(10);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const A = await import("./js/data/attendance-store.js");
const L = await import("./js/data/locations-store.js");
const O = await import("./js/data/offices-store.js");
const D = await import("./js/data/devices-store.js");
const S = await import("./js/data/store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PRIYA = "EMP-1003", ARJUN = "EMP-1105";
const TODAY = "2026-10-06";
const M_PER_DEG = (6371008.8 * Math.PI) / 180;
const HQ = O.headOffice();
const north = (p, m) => ({ lat: p.lat + m / M_PER_DEG, lng: p.lng });
const here = (p, accuracyM = 15) => ({ lat: p.lat, lng: p.lng, accuracyM });
const pick = (r) => [r.ok, r.code, r.place, r.placeName, r.distanceM, r.reason];
const T = (c) => c.repeat(32);
const recordOf = (id) => JSON.parse(mem.get("officeos:attendance") ?? "{\"records\":[]}").records.find((r) => r.userId === id && r.date === TODAY);
const NOT_ALLOWED = "That place isn't one you may check in from. Choose one of your places.";

section("A. The pure judge");
// The office (radius 500) and a home 300 m east (radius 150) overlap; a reading 250 m east is inside both.
const near = [{ place: "head", name: "Head office", lat: 0, lng: 0, radiusM: 500 }, { place: "homePermanent", name: "your permanent home", lat: 0, lng: 300 / M_PER_DEG, radiusM: 150 }];
const east = (m, accuracyM = 5) => ({ lat: 0, lng: m / M_PER_DEG, accuracyM });
check("A1", "inside both, the office chosen: ok, head, 250 m (the nearest would be home)", j(pick(L.judgePlace(east(250), near, "head"))) === j([true, "ok", "head", "Head office", 250, ""]));
check("A2", "inside both, home chosen: ok, homePermanent, 50 m", j(pick(L.judgePlace(east(250), near, "homePermanent"))) === j([true, "ok", "homePermanent", "your permanent home", 50, ""]));
check("A3", "no placeId: the nearest inside, as before (home, 50 m)", j(pick(L.judgePlace(east(250), near))) === j([true, "ok", "homePermanent", "your permanent home", 50, ""]));
check("A4", "a null placeId is no placeId", j(L.judgePlace(east(250), near, null)) === j(L.judgePlace(east(250), near)));
check("A5", "outside the chosen place: it is named, not the nearest (office chosen at 700 m; home is 400 m)", j(pick(L.judgePlace(east(700), near, "head"))) === j([false, "outside", "head", "Head office", 700, "700 m from Head office"]));
check("A6", "the same reading without a placeId names the nearest, as before", L.judgePlace(east(700), near).reason === "400 m from your permanent home");
check("A7", "inside the office only (100 m), home chosen: outside, measured to home (200 m)", j(pick(L.judgePlace(east(100), near, "homePermanent"))) === j([false, "outside", "homePermanent", "your permanent home", 200, "200 m from your permanent home"]));
check("A8", "a place that isn't one of yours: not-allowed, nothing named", j(pick(L.judgePlace(east(250), near, "branch"))) === j([false, "not-allowed", null, null, null, NOT_ALLOWED]));
check("A9", "an empty or odd placeId is not allowed either", L.judgePlace(east(250), near, "").code === "not-allowed" && L.judgePlace(east(250), near, 7).code === "not-allowed");
check("A10", "the reading's own checks still come first: inaccurate, no location", L.judgePlace(east(250, 300), near, "branch").code === "inaccurate" && L.judgePlace(null, near, "head").code === "no-location");
check("A11", "no places at all: no-place, with or without a placeId", L.judgePlace(east(0), [], "head").code === "no-place" && L.judgePlace(east(0), []).code === "no-place");
check("A12", "the chosen place's edge: exactly its radius is inside, one metre more is out", L.judgePlace(east(150), near, "head").ok && L.judgePlace(east(450), near, "homePermanent").ok && !L.judgePlace(east(451), near, "homePermanent").ok && !L.judgePlace(east(501), near, "head").ok);

section("B. checkPlace for an employee");
const HOME = { address: "Near the office, Gurugram", ...north(HQ, 100) };   // 100 m north of the head office: the two overlap
L.setHomeEligible(PRIYA, ARJUN, true);
L.setOwnHome(ARJUN, "permanent", HOME);
const mid = here(north(HQ, 60));   // office 60 m, home 40 m
check("B1", "Arjun 60 m from the office, 40 m from home: office chosen -> head 60 m", j(pick(L.checkPlace(mid, ARJUN, new Date(), "head"))) === j([true, "ok", "head", "Head office", 60, ""]));
check("B2", "home chosen -> homePermanent 40 m", j(pick(L.checkPlace(mid, ARJUN, new Date(), "homePermanent"))) === j([true, "ok", "homePermanent", "your permanent home", 40, ""]));
check("B3", "no placeId -> the nearest (home), as before", L.checkPlace(mid, ARJUN).place === "homePermanent" && L.checkPlace(mid, ARJUN, new Date(), undefined).place === "homePermanent");
check("B4", "his temporary home isn't set: not-allowed", L.checkPlace(mid, ARJUN, new Date(), "homeTemporary").code === "not-allowed");
check("B5", "a branch he doesn't work at: not-allowed", L.checkPlace(mid, ARJUN, new Date(), "branch").code === "not-allowed");
L.setHomeEligible(PRIYA, ARJUN, false);
check("B6", "not home-eligible any more: his home is not-allowed, the office still fine", L.checkPlace(mid, ARJUN, new Date(), "homePermanent").code === "not-allowed" && L.checkPlace(mid, ARJUN, new Date(), "head").ok);
check("B7", "checkPlace with a placeId wrote nothing and stamps `at`", (() => { const s = j([...mem.entries()]); const r = L.checkPlace(mid, ARJUN, new RealDate(2026, 9, 6, 9, 30), "head"); return j([...mem.entries()]) === s && r.at === new RealDate(2026, 9, 6, 9, 30).toISOString(); })());

section("C. Check-in and check-out with the chosen place");
// Who can check in at 10:00 today (active, not on leave, nothing recorded yet), in id order; each gets the overlapping home.
const free = S.getAllUsers().filter((u) => u.status !== "inactive" && u.id !== ARJUN && A.checkInRefusal(u.id) === null).map((u) => u.id);
check("C0", "at least five people can check in now (the fixtures below need them)", free.length >= 5, j(free));
const [U1, U2, U3, U4, U5] = free;
for (const u of [U1, U2, U3, U4]) { L.setHomeEligible(PRIYA, u, true); L.setOwnHome(u, "permanent", HOME); }
const snap = (u) => j([recordOf(u) ?? null, mem.get("officeos:devices") ?? null]);
const in1 = L.checkInAt(U1, "office", mid, T("1"), "head");
check("C1", "office chosen in the overlap: checked in, the record names head, 60 m (not the nearer home)", in1.ok && recordOf(U1).checkInPlace === "head" && recordOf(U1).checkInDistanceM === 60, j(recordOf(U1)));
const in2 = L.checkInAt(U2, "wfh", mid, T("2"));
check("C2", "no placeId in the overlap: the nearest (home, 40 m), as before", in2.ok && recordOf(U2).checkInPlace === "homePermanent" && recordOf(U2).checkInDistanceM === 40, j(recordOf(U2)));
const s3 = snap(U3);
const far = here(north(HQ, -100));   // 100 m south: inside the office, 200 m from home
const r3 = L.checkInAt(U3, "wfh", far, T("3"), "homePermanent");
check("C3", "home chosen but only the office is in reach: refused, \"200 m from your permanent home\"; nothing written", !r3.ok && r3.code === "outside" && r3.error === "200 m from your permanent home" && snap(U3) === s3, j(r3));
const r3b = L.checkInAt(U3, "office", far, T("3"));
check("C4", "the same reading without a placeId checks in at the office, as before", r3b.ok && recordOf(U3).checkInPlace === "head");
const s5 = snap(U5);
const r5 = L.checkInAt(U5, "office", mid, T("5"), "homePermanent");
check("C5", "a place that isn't theirs (not home-eligible): refused not-allowed with the words; nothing written, no device", !r5.ok && r5.code === "not-allowed" && r5.error === NOT_ALLOWED && snap(U5) === s5 && D.devicesFor(U5, U5).records.length === 0, j(r5));
check("C6", "a branch nobody here works at: not-allowed", L.checkInAt(U5, "office", here(HQ), T("5"), "branch").code === "not-allowed" && !recordOf(U5));
at(17);
const o1 = L.checkOutAt(U1, mid, T("1"), "head");
check("C7", "out in the overlap at the check-in's place (chosen): head, 60 m, not flagged", o1.ok && recordOf(U1).checkOutPlace === "head" && recordOf(U1).flagged === false && j(recordOf(U1).flagReasons) === j([]), j(recordOf(U1)));
at(10);
L.checkInAt(U4, "office", mid, T("4"), "head");
at(17);
const o4 = L.checkOutAt(U4, mid, T("4"));
check("C8", "without a placeId the check-out is judged as before: the nearer home, flagged place-changed", o4.ok && recordOf(U4).checkOutPlace === "homePermanent" && recordOf(U4).flagged === true && j(recordOf(U4).flagReasons) === j(["place-changed"]), j(recordOf(U4)));
const o2 = L.checkOutAt(U2, here(north(HQ, -100)), T("2"), "homePermanent");
check("C9", "check-out outside the chosen place: refused \"outside\", still checked in", !o2.ok && o2.code === "outside" && !recordOf(U2).checkOut, j(o2));
const o2b = L.checkOutAt(U2, here(north(HQ, -100)), T("2"), "head");
check("C10", "out at another place than the check-in's, chosen: names it, flagged place-changed (the rule is unchanged)", o2b.ok && recordOf(U2).checkOutPlace === "head" && j(recordOf(U2).flagReasons) === j(["place-changed"]));
check("C11", "the functions' declared arity is unchanged (the new argument is optional)", L.checkInAt.length === 3 && L.checkOutAt.length === 2 && L.checkPlace.length === 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);