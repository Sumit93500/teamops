// usage: node places.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: the place check, data/locations-store.js checkPlace / judgePlace / placesFor, and data/places.js distanceM.
// ./js is the build. Clock Tue 6 Oct 2026 10:00 local.
//   A  distance: haversine on the mean sphere, against known values
//   B  inside, outside, and the edge: exactly the radius is inside, one metre more is out ("N m from <place>")
//   C  the reading: accuracy over 100 m (or none) isn't judged; no location; the limit itself is fine
//   D  homes: only when home-eligible AND set; permanent / temporary; the nearest place inside wins
//   E  a branch employee vs a head-office employee; the nearest place named when outside
//   F  no place at all; checkPlace is read-only and stamps `at`
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const P = await import("./js/data/places.js");
const L = await import("./js/data/locations-store.js");
const O = await import("./js/data/offices-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", ARJUN = "EMP-1105", ROHAN = "EMP-1042", SNEHA = "EMP-1029";
const R = 6371008.8, M_PER_DEG = (R * Math.PI) / 180;   // metres per degree along a meridian
const HQ = O.headOffice();
const north = (p, m) => ({ lat: p.lat + m / M_PER_DEG, lng: p.lng });   // m metres due north (exact on the sphere)
const reading = (p, accuracyM = 10) => ({ lat: p.lat, lng: p.lng, accuracyM });
const pick = (r) => [r.ok, r.code, r.place, r.placeName, r.distanceM, r.reason];

section("A. Distance");
check("A1", "the same point: 0", P.distanceM(HQ, HQ) === 0);
check("A2", "one degree of longitude on the equator: 111,195.08 m", Math.abs(P.distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195.08) < 0.01, P.distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }));
check("A3", "150 m due north measures 150 m", Math.abs(P.distanceM(HQ, north(HQ, 150)) - 150) < 1e-6);
const dm = P.distanceM({ lat: 28.6139, lng: 77.209 }, { lat: 19.076, lng: 72.8777 });
check("A4", "New Delhi to Mumbai: about 1,148 km (the published great-circle distance)", Math.abs(dm - 1148000) < 2000, Math.round(dm));
check("A5", "symmetric", P.distanceM(HQ, { lat: 18.52, lng: 73.85 }) === P.distanceM({ lat: 18.52, lng: 73.85 }, HQ));
check("A6", "antipodes: half the circumference", Math.abs(P.distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }) - Math.PI * R) < 0.01);

section("B. Inside, outside, the edge (head office, radius 150)");
check("B1", "at the office: ok, head, 0 m, no reason", j(pick(L.checkPlace(reading(HQ), ARJUN))) === j([true, "ok", "head", "Head office", 0, ""]));
check("B2", "100 m north: ok, 100 m", j(pick(L.checkPlace(reading(north(HQ, 100)), ARJUN))) === j([true, "ok", "head", "Head office", 100, ""]));
check("B3", "exactly the radius (150 m): inside", j(pick(L.checkPlace(reading(north(HQ, 150)), ARJUN))) === j([true, "ok", "head", "Head office", 150, ""]));
check("B4", "150.4 m rounds to 150: inside (whole metres)", L.checkPlace(reading(north(HQ, 150.4)), ARJUN).ok === true);
check("B5", "151 m: outside, \"151 m from Head office\"", j(pick(L.checkPlace(reading(north(HQ, 151)), ARJUN))) === j([false, "outside", "head", "Head office", 151, "151 m from Head office"]));
check("B6", "2 km away: the distance said", L.checkPlace(reading(north(HQ, 2000)), ARJUN).reason === "2000 m from Head office");
O.updateOffice(AARAV, "OFF-1", { radiusM: 20 });
check("B7", "a radius of 20: 20 m in, 21 m out", L.checkPlace(reading(north(HQ, 20)), ARJUN).ok && !L.checkPlace(reading(north(HQ, 21)), ARJUN).ok);
O.updateOffice(AARAV, "OFF-1", { radiusM: 1000 });
check("B8", "a radius of 1000: 1000 m in, 1001 m out", L.checkPlace(reading(north(HQ, 1000)), ARJUN).ok && L.checkPlace(reading(north(HQ, 1001)), ARJUN).reason === "1001 m from Head office");
O.updateOffice(AARAV, "OFF-1", { radiusM: 150 });

section("C. The reading");
const INACC = "location not accurate enough, try again";
check("C1", "accuracy 100 m (the limit) is judged", L.checkPlace(reading(HQ, 100), ARJUN).ok === true);
check("C2", "accuracy 100.5 m isn't: \"location not accurate enough, try again\"", j(pick(L.checkPlace(reading(HQ, 100.5), ARJUN))) === j([false, "inaccurate", null, null, null, INACC]));
check("C3", "accuracy 2,000 m, even at the office", L.checkPlace(reading(HQ, 2000), ARJUN).code === "inaccurate");
check("C4", "no accuracy given", L.checkPlace({ lat: HQ.lat, lng: HQ.lng }, ARJUN).reason === INACC);
check("C5", "a negative accuracy", L.checkPlace(reading(HQ, -1), ARJUN).code === "inaccurate");
check("C6", "accuracy as text", L.checkPlace({ lat: HQ.lat, lng: HQ.lng, accuracyM: "10" }, ARJUN).code === "inaccurate");
for (const [n, r] of [["C7", null], ["C8", {}], ["C9", { lat: NaN, lng: 77, accuracyM: 5 }], ["C10", { lat: 91, lng: 77, accuracyM: 5 }], ["C11", { lat: 28, lng: -181, accuracyM: 5 }], ["C12", { lat: "28.45", lng: 77.07, accuracyM: 5 }]]) {
  check(n, `no usable location (${j(r)}): no-location`, j(pick(L.checkPlace(r, ARJUN))) === j([false, "no-location", null, null, null, "No location from this browser. Allow location and try again."]));
}
check("C13", "the accuracy limit is exported", L.ACCURACY_LIMIT_M === 100 && L.HOME_RADIUS_M === 150);

section("D. Homes");
const HOME = { address: "12 MG Road, Gurugram", lat: 28.48, lng: 77.08 };
const TEMP = { address: "4 Lake View, Pune", lat: 18.52, lng: 73.85 };
check("D1", "eligible but no home set: only the office counts", (L.setHomeEligible(PRIYA, ARJUN, true), j(L.placesFor(ARJUN).map((p) => p.place)) === j(["head"])) && !L.checkPlace(reading(HOME), ARJUN).ok);
L.setOwnHome(ARJUN, "permanent", HOME);
check("D2", "at his permanent home: ok, homePermanent, \"your permanent home\"", j(pick(L.checkPlace(reading(HOME), ARJUN))) === j([true, "ok", "homePermanent", "your permanent home", 0, ""]));
check("D3", "149 m from home: ok; 151 m: outside, the nearest is home", L.checkPlace(reading(north(HOME, 149)), ARJUN).ok && L.checkPlace(reading(north(HOME, 151)), ARJUN).reason === "151 m from your permanent home");
L.setOwnHome(ARJUN, "temporary", TEMP);
check("D4", "at the temporary home: homeTemporary", L.checkPlace(reading(TEMP), ARJUN).place === "homeTemporary");
check("D5", "his places: office, permanent, temporary", j(L.placesFor(ARJUN).map((p) => p.place)) === j(["head", "homePermanent", "homeTemporary"]));
L.setHomeEligible(PRIYA, ARJUN, false);
check("D6", "not eligible any more: the homes are set but don't count", !L.checkPlace(reading(HOME), ARJUN).ok && L.checkPlace(reading(HOME), ARJUN).placeName === "Head office" && j(L.placesFor(ARJUN).map((p) => p.place)) === j(["head"]));
check("D7", "never eligible (Rohan): only the office", j(L.placesFor(ROHAN).map((p) => p.place)) === j(["head"]));
L.setHomeEligible(PRIYA, ARJUN, true);
const near = [{ place: "head", name: "Head office", lat: 0, lng: 0, radiusM: 500 }, { place: "homePermanent", name: "your permanent home", lat: 0, lng: 300 / M_PER_DEG, radiusM: 150 }];
const mid = { lat: 0, lng: 250 / M_PER_DEG, accuracyM: 5 };
check("D8", "inside two places: the nearest inside wins (home at 50 m over the office at 250 m)", j(pick(L.judgePlace(mid, near))) === j([true, "ok", "homePermanent", "your permanent home", 50, ""]));
const out = { lat: 0, lng: 700 / M_PER_DEG, accuracyM: 5 };
check("D9", "outside both: the nearest is named (home, 400 m)", L.judgePlace(out, near).reason === "400 m from your permanent home");

section("E. Branch vs head office");
const pune = O.createOffice(AARAV, { name: "Pune branch", address: "Hinjewadi, Pune", lat: 18.5913, lng: 73.7389, radiusM: 300 }).record;
O.setEmployeeOffice(AARAV, SNEHA, pune.id);
check("E1", "Sneha (Pune branch) at Pune: ok, branch", j(pick(L.checkPlace(reading(pune), SNEHA))) === j([true, "ok", "branch", "Pune branch", 0, ""]));
check("E2", "Sneha at the head office: outside, measured from Pune", (() => { const r = L.checkPlace(reading(HQ), SNEHA); return !r.ok && r.code === "outside" && r.placeName === "Pune branch" && r.reason.endsWith(" m from Pune branch") && r.distanceM > 1000000; })());
check("E3", "Rohan (head office) at Pune: outside, measured from the head office", (() => { const r = L.checkPlace(reading(pune), ROHAN); return !r.ok && r.placeName === "Head office"; })());
check("E4", "Pune's radius is its own: 300 m in, 301 m out", L.checkPlace(reading(north(pune, 300)), SNEHA).ok && !L.checkPlace(reading(north(pune, 301)), SNEHA).ok);
O.deactivateOffice(AARAV, pune.id);
check("E5", "Pune deactivated: Sneha checks in at the head office", L.checkPlace(reading(HQ), SNEHA).place === "head");

section("F. No place; read-only; the answer's shape");
check("F1", "no places at all: no-place", j(pick(L.judgePlace(reading(HQ), []))) === j([false, "no-place", null, null, null, "No office is set for you. Ask an Admin."]));
check("F2", "an unknown employee has the head office (the default)", L.checkPlace(reading(HQ), "EMP-9999").ok);
check("F3", "no employee: no-place", L.checkPlace(reading(HQ), null).code === "no-place");
const snap = j([...mem.entries()]);
const r1 = L.checkPlace(reading(HQ), ARJUN, new RealDate(2026, 9, 6, 9, 30));
check("F4", "checkPlace wrote nothing", j([...mem.entries()]) === snap);
check("F5", "it stamps `at` from the time given", r1.at === new RealDate(2026, 9, 6, 9, 30).toISOString(), r1.at);
check("F6", "the answer's fields", j(Object.keys(r1)) === j(["ok", "place", "placeName", "distanceM", "reason", "code", "at"]));
check("F7", "a user record works as well as an id", L.checkPlace(reading(HQ), { id: ARJUN }).ok);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
