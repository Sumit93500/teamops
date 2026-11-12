// usage: node punch14.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: check-in / check-out with a place and a device (data/locations-store.js checkInAt / checkOutAt over
// data/attendance-store.js's optional stamp), the flagged rule, and old data. ./js is the build. Clock Tue 6 Oct 2026,
// 10:00 for check-ins and 17:00 for check-outs, local.
//   A  without the new input nothing changes: the same record fields as before, the same refusals
//   B  refused before anything is written: outside, inaccurate, no location, a third device, attendance's own refusals
//   C  a stamped check-in and check-out: place, distance, device; not flagged when both match
//   D  flagged: the check-out's place differs, or its device; a device registered to someone else (shared-device)
//   E  old data (storage migration): records and users without the new fields load and behave as before
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
const AARAV = "EMP-1001", PRIYA = "EMP-1003";
const TODAY = "2026-10-06";
const M_PER_DEG = (6371008.8 * Math.PI) / 180;
const HQ = O.headOffice();
const north = (p, m) => ({ lat: p.lat + m / M_PER_DEG, lng: p.lng });
const here = (p, accuracyM = 15) => ({ lat: p.lat, lng: p.lng, accuracyM });
const T = (c) => c.repeat(32);
const OLD_KEYS = ["userId", "date", "checkIn", "checkOut", "mode", "source", "originalCheckIn", "originalCheckOut", "history", "id"];
const recordOf = (id) => JSON.parse(mem.get("officeos:attendance")).records.find((r) => r.userId === id && r.date === TODAY);
const deviceBox = () => mem.get("officeos:devices") ?? null;

// Who can check in at 10:00 today (active, not on leave, nothing recorded yet), in id order.
const free = S.getAllUsers().filter((u) => u.status !== "inactive" && A.checkInRefusal(u.id) === null).map((u) => u.id);
check("S0", "at least six people can check in now (the fixtures below need them)", free.length >= 6, j(free));
const [U1, U2, U3, U4, U5, U6] = free;

section("A. Without the new input, as before");
const plain = A.checkIn(U6);
check("A1", "checkIn(userId) writes exactly the fields it wrote before", plain.ok && j(Object.keys(recordOf(U6)).sort()) === j([...OLD_KEYS].sort()), j(Object.keys(recordOf(U6))));
at(17);
const plainOut = A.checkOut(U6);
check("A2", "checkOut(userId) too: no place, device or flag fields", plainOut.ok && j(Object.keys(recordOf(U6)).sort()) === j([...OLD_KEYS].sort()), j(Object.keys(recordOf(U6))));
at(10);
check("A3", "the same refusal words: checking in twice", A.checkIn(U6).error === `You already checked in today at 10:00.` && A.checkInRefusal(U6).error === "You already checked in today at 10:00.");
check("A4", "checkOutRefusal before a check-in: \"Check in first.\"", A.checkOutRefusal(U4).error === "Check in first.");
check("A5", "no device or location storage was touched by the plain calls", !mem.has("officeos:devices") && !mem.has("officeos:device-token") && !mem.has("officeos:offices"));

section("B. Refused before anything is written");
const snap = () => j([recordOf(U1) ?? null, deviceBox()]);
const s0 = snap();
const out = L.checkInAt(U1, "office", here(north(HQ, 400)), T("1"));
check("B1", "400 m away: refused, code outside, \"400 m from Head office\"; nothing written", !out.ok && out.code === "outside" && out.error === "400 m from Head office" && snap() === s0, j(out));
const inacc = L.checkInAt(U1, "office", here(HQ, 250), T("1"));
check("B2", "accuracy 250 m: code inaccurate, \"location not accurate enough, try again\"", inacc.code === "inaccurate" && inacc.error === "location not accurate enough, try again" && snap() === s0);
check("B3", "no reading: code no-location", L.checkInAt(U1, "office", null, T("1")).code === "no-location" && snap() === s0);
check("B4", "a bad token: code no-token", L.checkInAt(U1, "office", here(HQ), "nope").code === "no-token" && snap() === s0);
check("B5", "attendance's own refusal wins and nothing is written (U6 already in)", (() => { const b = j([recordOf(U6), deviceBox()]); const r = L.checkInAt(U6, "office", here(HQ), T("6")); return r.error === "You already checked in today at 10:00." && j([recordOf(U6), deviceBox()]) === b; })());
check("B6", "a mode that isn't one: attendance's words", L.checkInAt(U1, "boat", here(HQ), T("1")).error === "Choose Office or Work from home." && snap() === s0);
D.useDevice(U4, T("a")); D.useDevice(U4, T("b"));
const lim = L.checkInAt(U4, "office", here(HQ), T("c"));
check("B7", "a third device: code device-limit, no check-in", !lim.ok && lim.code === "device-limit" && !recordOf(U4), j(lim));
check("B8", "check-out with a place before checking in: \"Check in first.\"", L.checkOutAt(U1, here(HQ), T("1")).error === "Check in first.");

section("C. A stamped check-in and check-out");
const in1 = L.checkInAt(U1, "office", here(north(HQ, 40)), T("1"));
const r1 = recordOf(U1);
check("C1", "checked in: place head, 40 m, device DEV-3 (first use registers it), not flagged", in1.ok && r1.checkInPlace === "head" && r1.checkInDistanceM === 40 && r1.checkInDeviceId === "DEV-3" && r1.flagged === false && j(r1.flagReasons) === j([]), j(r1));
check("C2", "the old fields are as a plain check-in writes them", r1.checkIn === "10:00" && r1.mode === "office" && r1.source === "punch" && r1.history[0].action === "checked-in");
check("C3", "the day reads as before (present, 10:00)", in1.day.checkIn === "10:00");
at(17);
const o1 = L.checkOutAt(U1, here(north(HQ, 10)), T("1"));
const r1b = recordOf(U1);
check("C4", "checked out at the same place and device: not flagged, place / distance / device kept", o1.ok && r1b.checkOut === "17:00" && r1b.checkOutPlace === "head" && r1b.checkOutDistanceM === 10 && r1b.checkOutDeviceId === "DEV-3" && r1b.flagged === false, j(r1b));
check("C5", "the device was used, not registered again", D.devicesFor(U1, U1).records.length === 1);
at(10);

section("D. Flagged");
L.setHomeEligible(PRIYA, U2, true);
const HOME = { address: "12 MG Road, Gurugram", lat: 28.48, lng: 77.08 };
L.setOwnHome(U2, "permanent", HOME);
L.checkInAt(U2, "office", here(HQ), T("2"));
at(17);
const o2 = L.checkOutAt(U2, here(HOME), T("2"));
const r2 = recordOf(U2);
check("D1", "in at the office, out at home: flagged, place-changed", o2.ok && r2.checkInPlace === "head" && r2.checkOutPlace === "homePermanent" && r2.flagged === true && j(r2.flagReasons) === j(["place-changed"]), j(r2));
at(10);
L.checkInAt(U3, "office", here(HQ), T("3"));
at(17);
const o3 = L.checkOutAt(U3, here(HQ), T("4"));
const r3 = recordOf(U3);
check("D2", "in on one device, out on another: flagged, device-changed (the second device registered)", o3.ok && r3.flagged === true && j(r3.flagReasons) === j(["device-changed"]) && r3.checkInDeviceId !== r3.checkOutDeviceId && D.devicesFor(U3, U3).records.length === 2, j(r3));
at(10);
const in5 = L.checkInAt(U5, "office", here(HQ), T("1"));
const r5 = recordOf(U5);
check("D3", "a device registered to someone else (U1's): checked in, flagged shared-device", in5.ok && r5.flagged === true && j(r5.flagReasons) === j(["shared-device"]), j(r5));
at(17);
L.checkOutAt(U5, here(HQ), T("1"));
check("D4", "the check-out keeps the earlier reason without repeating it", j(recordOf(U5).flagReasons) === j(["shared-device"]) && recordOf(U5).flagged === true);
at(10);
L.checkInAt(U4, "office", here(HQ), T("a"));
at(17);
A.checkOut(U4);
const r7 = recordOf(U4);
check("D5", "a plain check-out after a stamped check-in: no check-out place, nothing compared, not flagged", r7.checkOut === "17:00" && !("checkOutPlace" in r7) && r7.flagged === false, j(r7));
at(10);

section("E. Old data");
const old = JSON.parse(mem.get("officeos:attendance"));
const seeded = old.records.filter((r) => r.date !== TODAY);
check("E1", "the seeded records carry none of the new fields", seeded.length > 0 && seeded.every((r) => !("flagged" in r) && !("checkInPlace" in r)), seeded.length);
const month1 = j(A.monthFor(free[0], 2026, 9));
mem.set("officeos:offices", JSON.stringify({ version: 1, nextNum: 3, records: [HQ, { ...HQ, id: "OFF-2", name: "Elsewhere", type: "branch", sample: false }], assignments: { [free[0]]: "OFF-2" } }));
mem.set("officeos:home-locations", JSON.stringify({ version: 1, people: { [free[0]]: { homeEligible: true, permanent: { ...HOME, setAt: null, setBy: null }, temporary: null, history: [] } } }));
check("E2", "the new stores don't change what attendance reports (a past month, before and after they're filled)", j(A.monthFor(free[0], 2026, 9)) === month1);
const users = JSON.parse(mem.get("officeos:users"));
check("E3", "user records have no officeId or homeEligible field (old shape), and still everyone has an office", users.records.every((u) => !("officeId" in u) && !("homeEligible" in u)) && users.records.every((u) => O.officeIdOf(u.id)));
mem.set("officeos:offices", JSON.stringify({ version: 0, records: [] }));
check("E4", "an offices box of an older version reads as the seed and stays as saved (no rewrite on read)", O.headOffice().id === "OFF-1" && JSON.parse(mem.get("officeos:offices")).version === 0);
mem.delete("officeos:home-locations"); mem.delete("officeos:offices");
check("E5", "with the new keys gone, the stamped records still read: the day of U2 shows its times", A.dayFor(U2, TODAY).checkIn === "10:00" && A.dayFor(U2, TODAY).checkOut === "17:00");
check("E6", "the stamp fields don't reach the day objects pages read (dayFor is as before)", !("flagged" in A.dayFor(U2, TODAY)) && !("checkInPlace" in A.dayFor(U2, TODAY)));
check("E7", "an Admin's id passes no special path: the plain functions still take the old arguments", A.checkIn.length === 3 && A.checkOut.length === 2 && typeof A.checkInRefusal === "function");
void AARAV;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
