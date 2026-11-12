// usage: node offices.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: data/offices-store.js, offices and who works from which. ./js is the build. Clock Tue 6 Oct 2026 10:00 local.
//   A  the seed: one head office with sample coordinates; no branch; everyone works from it; reads write nothing
//   B  create (Admin only): defaults, ids
//   C  checks: name, duplicates, one head office, type, latitude / longitude ranges, radius 20-1000, address, unknown fields
//   D  edit: duplicates, the head stays head, a moved office loses its sample mark
//   E  deactivate / reactivate: never the head office; people on an inactive branch work from the head office
//   F  assignments: Admin only; active offices only; back to the head office clears it; offices saved before L0 (no state)
//   G  L0: Reset demo data clears every round-14 store (resetLocationData), and the users page calls it
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 9, 6, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const O = await import("./js/data/offices-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105", ROHAN = "EMP-1042";
const KEY = "officeos:offices";
const BRANCH = { name: "Pune branch", address: "Hinjewadi Phase 1, Pune 411057", state: "Maharashtra", lat: 18.5913, lng: 73.7389 };

section("A. The seed");
const all0 = O.getOffices();
const head = O.headOffice();
check("A1", "one office, the head office, active, radius 150, at the company's address", all0.length === 1 && head.id === "OFF-1" && head.type === "head" && head.name === "Head office" && head.active && head.radiusM === 150 && head.address === "Sector 44, Gurugram, Haryana 122003", j(all0));
check("A2", "its coordinates are a sample, marked so: \"Sample coordinates: set the real location.\"", head.sample === true && head.note === "Sample coordinates: set the real location." && head.note === O.SAMPLE_NOTE && Number.isFinite(head.lat) && Number.isFinite(head.lng), j(head));
check("A3", "everyone works from the head office (officeId defaults to it), unknown ids too", [AARAV, ARJUN, SNEHA, "EMP-9999"].every((id) => O.officeIdOf(id) === "OFF-1" && O.officeOf(id).id === "OFF-1"));
check("A4", "reads wrote nothing to storage", !mem.has(KEY), j([...mem.keys()]));
check("A6", "L0: the head office's state is Haryana; 36 states and union territories to choose from", head.state === "Haryana" && O.OFFICE_STATES.length === 36 && O.OFFICE_STATES.includes("Delhi") && O.OFFICE_STATES.includes("Ladakh"), j([head.state, O.OFFICE_STATES.length]));
check("A5", "the radius limits", j(O.OFFICE_RADIUS) === j({ min: 20, max: 1000, default: 150 }) && j(O.OFFICE_TYPES) === j(["head", "branch"]));

section("B. Create (Admin only)");
for (const [who, id] of [["HR", PRIYA], ["Finance", KABIR], ["an employee", ARJUN], ["a manager", SNEHA], ["nobody", null]]) {
  const r = O.createOffice(id, BRANCH);
  check(`B-${who}`, `${who} can't create an office`, !r.ok && r.error === "Only an Admin can change offices." && !mem.has(KEY), j(r));
}
const b1 = O.createOffice(AARAV, { ...BRANCH, name: "  Pune branch  " });
check("B1", "an Admin creates a branch: OFF-2, type branch, radius 150 by default, trimmed, active, not a sample", b1.ok && b1.record.id === "OFF-2" && b1.record.type === "branch" && b1.record.radiusM === 150 && b1.record.name === "Pune branch" && b1.record.active && b1.record.sample === false, j(b1));
check("B2", "two offices now; storage has the key", O.getOffices().length === 2 && mem.has(KEY));

section("C. Checks");
const bad = [
  ["C1", { ...BRANCH, name: "" }, "Enter the office's name.", "name"],
  ["C2", { ...BRANCH, name: "PUNE BRANCH " }, "There's already an office called \"PUNE BRANCH\".", "name"],
  ["C3", { ...BRANCH, name: "n".repeat(81) }, "The name can be at most 80 characters.", "name"],
  ["C4", { ...BRANCH, name: "Second HQ", type: "head" }, "Head office is the head office; there can be only one.", "type"],
  ["C5", { ...BRANCH, name: "Kiosk", type: "kiosk" }, "The type must be head or branch.", "type"],
  ["C6", { ...BRANCH, name: "X1", lat: 90.0001 }, "Latitude must be between -90 and 90.", "lat"],
  ["C7", { ...BRANCH, name: "X2", lat: -91 }, "Latitude must be between -90 and 90.", "lat"],
  ["C8", { ...BRANCH, name: "X3", lng: 180.5 }, "Longitude must be between -180 and 180.", "lng"],
  ["C9", { ...BRANCH, name: "X4", lng: -181 }, "Longitude must be between -180 and 180.", "lng"],
  ["C10", { ...BRANCH, name: "X5", lat: "18.5" }, "Latitude and longitude must be numbers.", "lat"],
  ["C11", { ...BRANCH, name: "X6", lng: NaN }, "Latitude and longitude must be numbers.", "lng"],
  ["C12", { ...BRANCH, name: "X7", radiusM: 19 }, "The radius must be a whole number of metres from 20 to 1000.", "radiusM"],
  ["C13", { ...BRANCH, name: "X8", radiusM: 1001 }, "The radius must be a whole number of metres from 20 to 1000.", "radiusM"],
  ["C14", { ...BRANCH, name: "X9", radiusM: 150.5 }, "The radius must be a whole number of metres from 20 to 1000.", "radiusM"],
  ["C15", { ...BRANCH, name: "X10", address: "  " }, "Enter the address.", "address"],
  ["C16", { ...BRANCH, name: "X11", address: "a".repeat(201) }, "The address can be at most 200 characters.", "address"],
  ["C17", { ...BRANCH, name: "X12", active: false }, "\"active\" can't be set on an office.", "active"],
  ["C18", { ...BRANCH, name: "X13", id: "OFF-99" }, "\"id\" can't be set on an office.", "id"],
  ["C20", { ...BRANCH, name: "X14", state: undefined }, "Choose the office's state or union territory.", "state"],
  ["C21", { ...BRANCH, name: "X15", state: "Bombay" }, "Choose the office's state or union territory.", "state"],
  ["C22", { ...BRANCH, name: "X16", state: "haryana" }, "Choose the office's state or union territory.", "state"],
];
for (const [n, f, error, field] of bad) {
  const r = O.createOffice(AARAV, f);
  check(n, `refused: ${error}`, !r.ok && r.error === error && r.field === field && O.getOffices({ includeInactive: true }).length === 2, j(r));
}
const lo = O.createOffice(AARAV, { ...BRANCH, name: "Small", radiusM: 20, lat: -90, lng: -180 });
const hi = O.createOffice(AARAV, { ...BRANCH, name: "Large", radiusM: 1000, lat: 90, lng: 180 });
check("C19", "the limits themselves are fine: radius 20 and 1000, latitude -90 / 90, longitude -180 / 180", lo.ok && hi.ok && lo.record.id === "OFF-3" && hi.record.id === "OFF-4", j([lo, hi]));

section("D. Edit");
check("D1", "HR can't edit", !O.updateOffice(PRIYA, "OFF-2", { radiusM: 300 }).ok);
check("D2", "renaming to another office's name is refused", O.updateOffice(AARAV, "OFF-3", { name: "head OFFICE" }).error === "There's already an office called \"head OFFICE\".");
check("D3", "the head office can't become a branch", O.updateOffice(AARAV, "OFF-1", { type: "branch" }).error === "The head office stays the head office.");
check("D4", "a branch can't become a second head office", O.updateOffice(AARAV, "OFF-2", { type: "head" }).error === "Head office is the head office; there can be only one.");
check("D5", "an unknown office", O.updateOffice(AARAV, "OFF-77", { radiusM: 300 }).error === "No office with id OFF-77.");
check("D6", "a field that can't be changed", O.updateOffice(AARAV, "OFF-2", { active: false }).error === "\"active\" can't be changed here.");
const r1 = O.updateOffice(AARAV, "OFF-1", { radiusM: 200, name: " Head office " });
check("D7", "a change that doesn't move it keeps the sample mark (the coordinates are still the sample)", r1.ok && r1.record.radiusM === 200 && r1.record.sample === true && r1.record.name === "Head office", j(r1));
const r2 = O.updateOffice(AARAV, "OFF-1", { lat: 28.4595, lng: 77.0266 });
check("D8", "setting the real coordinates clears the sample mark", r2.ok && r2.record.sample === false && r2.record.note === "" && r2.record.lat === 28.4595, j(r2));
check("D9", "keeping its own name isn't a duplicate", O.updateOffice(AARAV, "OFF-2", { name: "Pune branch", radiusM: 250 }).ok);
check("D10", "an edit is checked like a new office (radius 5 refused, nothing changed)", O.updateOffice(AARAV, "OFF-2", { radiusM: 5 }).field === "radiusM" && O.getOffice("OFF-2").radiusM === 250);

section("E. Deactivate and reactivate");
check("E1", "the head office can't be deactivated", O.deactivateOffice(AARAV, "OFF-1").error === "The head office can't be deactivated.");
check("E2", "HR can't deactivate", O.deactivateOffice(PRIYA, "OFF-2").error === "Only an Admin can change offices.");
check("E3", "Arjun moved to Pune works from Pune", O.setEmployeeOffice(AARAV, ARJUN, "OFF-2").ok && O.officeIdOf(ARJUN) === "OFF-2" && O.officeOf(ARJUN).name === "Pune branch");
const d1 = O.deactivateOffice(AARAV, "OFF-2");
check("E4", "Pune deactivated: inactive, left out of the active list, kept with includeInactive", d1.ok && !d1.record.active && !O.getOffices().some((o) => o.id === "OFF-2") && O.getOffices({ includeInactive: true }).some((o) => o.id === "OFF-2"));
check("E5", "Arjun now works from the head office", O.officeIdOf(ARJUN) === "OFF-1");
check("E6", "deactivating it again is refused", O.deactivateOffice(AARAV, "OFF-2").error === "Pune branch is already inactive.");
check("E7", "a new office can't take an inactive office's name either", O.createOffice(AARAV, { ...BRANCH }).error === "There's already an office called \"Pune branch\".");
const re = O.reactivateOffice(AARAV, "OFF-2");
check("E8", "reactivated: Arjun is back on Pune", re.ok && re.record.active && O.officeIdOf(ARJUN) === "OFF-2");
check("E9", "reactivating an active office is refused", O.reactivateOffice(AARAV, "OFF-2").error === "Pune branch is already active.");

check("D11", "L0: the state can be changed to another valid one, not to one off the list", O.updateOffice(AARAV, "OFF-2", { state: "Karnataka" }).record?.state === "Karnataka" && O.updateOffice(AARAV, "OFF-2", { state: "" }).field === "state" && O.updateOffice(AARAV, "OFF-2", { state: "Maharashtra" }).ok);

section("F. Assignments");
check("F1", "HR can't move people", O.setEmployeeOffice(PRIYA, ROHAN, "OFF-2").error === "Only an Admin can change offices." && O.officeIdOf(ROHAN) === "OFF-1");
check("F2", "an unknown employee", O.setEmployeeOffice(AARAV, "EMP-9999", "OFF-2").error === "No employee with id EMP-9999.");
check("F3", "an unknown office", O.setEmployeeOffice(AARAV, ROHAN, "OFF-50").field === "officeId");
O.deactivateOffice(AARAV, "OFF-3");
check("F4", "an inactive office", O.setEmployeeOffice(AARAV, ROHAN, "OFF-3").error === "Small is inactive.");
const back = O.setEmployeeOffice(AARAV, ARJUN, "OFF-1");
const box = JSON.parse(mem.get(KEY));
check("F5", "moving back to the head office clears the assignment (it's the default)", back.ok && O.officeIdOf(ARJUN) === "OFF-1" && !(ARJUN in box.assignments), j(box.assignments));
check("F6", "the users box is untouched: no officeId on any user record", !(mem.get("officeos:users") ?? "").includes("officeId"));
{
  // L0: an office saved before L0 has no state: it reads as null, an edit of another field is fine, and setting one works
  const saved = JSON.parse(mem.get(KEY));
  saved.records.forEach((o) => delete o.state);
  mem.set(KEY, JSON.stringify(saved));
  check("F9", "an office saved before L0 reads state null", O.headOffice().state === null && O.getOffices().every((o) => o.state === null) && O.getOffice("OFF-2").state === null);
  check("F10", "editing its radius doesn't ask for a state; giving one sets it", O.updateOffice(AARAV, "OFF-1", { radiusM: 160 }).ok && O.updateOffice(AARAV, "OFF-1", { state: "Haryana" }).record.state === "Haryana");
}
mem.set(KEY, JSON.stringify({ version: 1, nextNum: 2, records: "broken", assignments: {} }));
check("F7", "a broken saved copy reads as the seed", O.getOffices().length === 1 && O.headOffice().sample === true);
O.resetOffices();
check("F8", "reset: the key is gone", !mem.has(KEY) && O.getOffices().length === 1);

section("G. Reset demo data (L0)");
{
  const L = await import("./js/data/locations-store.js");
  const C = await import("./js/data/company-store.js");
  const D = await import("./js/data/devices-store.js");
  O.createOffice(AARAV, BRANCH);
  C.updateCompanyProfile(AARAV, { mission: "Do good work." });
  L.setHomeEligible(PRIYA, ARJUN, true);
  L.setOwnHome(ARJUN, "permanent", { address: "12 MG Road", lat: 28.48, lng: 77.08 });
  L.requestLocationChange(ARJUN, "permanent", { address: "7 DLF", lat: 28.49, lng: 77.09 }, "Moved");
  D.useDevice(ARJUN, "a".repeat(32));
  const token = D.deviceToken();
  const keys = ["officeos:offices", "officeos:company-profile", "officeos:home-locations", "officeos:location-changes", "officeos:devices"];
  check("G1", "the five round-14 keys are filled", keys.every((k) => mem.has(k)), j(keys.filter((k) => !mem.has(k))));
  L.resetLocationData();
  check("G2", "resetLocationData() clears them all back to the seed", keys.every((k) => !mem.has(k)) && O.getOffices().length === 1 && C.getCompanyProfile().mission === "" && !L.isHomeEligible(ARJUN) && L.allLocationChanges().length === 0 && D.devicesFor(ARJUN, ARJUN).records.length === 0);
  check("G3", "this browser's own device token stays (it isn't demo data)", D.deviceToken() === token);
  const fs = await import("fs");
  const src = fs.readFileSync(new URL("./js/pages/users-list.js", import.meta.url), "utf8");
  check("G4", "the users page's Reset demo data calls it, and its confirm names what it clears", /resetAssetRequestData\(\);\s*resetLocationData\(\);/.test(src) && src.includes("the company profile, offices, home locations and registered devices"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
