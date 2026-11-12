// usage: node devices.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// Round 14: data/devices-store.js. ./js is the build. Clock Tue 6 Oct 2026 10:00 local.
//   A  the browser's token: random, 32 hex characters, kept, nothing personal in it; the label names browser and system only
//   B  register on first use, at most 2 per employee; a third is refused (device-limit); peek writes nothing
//   C  who sees devices: your own (devices:view-own, everyone), anyone's (devices:reset, Admin)
//   D  reset (Admin only), then a new device works; a token shared by two people
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const at = (h, mi = 0) => { NOW = new RealDate(2026, 9, 6, h, mi, 0).getTime(); return new RealDate(NOW).toISOString(); };
at(10);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const D = await import("./js/data/devices-store.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ARJUN = "EMP-1105", ROHAN = "EMP-1042";
const T1 = "a".repeat(32), T2 = "b".repeat(32), T3 = "c".repeat(32);

section("A. The token and the label");
const tok = D.deviceToken();
check("A1", "32 hex characters, kept in officeos:device-token with when it was made", /^[0-9a-f]{32}$/.test(tok) && JSON.parse(mem.get("officeos:device-token")).token === tok && JSON.parse(mem.get("officeos:device-token")).createdAt === new RealDate(NOW).toISOString(), tok);
check("A2", "the same token next time", D.deviceToken() === tok);
check("A3", "random: a cleared browser gets another", (mem.delete("officeos:device-token"), D.deviceToken()) !== tok);
check("A4", "the token box holds only the token and its date (nothing about the person or machine)", j(Object.keys(JSON.parse(mem.get("officeos:device-token")))) === j(["token", "createdAt"]));
const UA = {
  "Edge on Windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  "Chrome on Android": "Mozilla/5.0 (Linux; Android 14; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  "Safari on iOS": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Firefox on Linux": "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  "Safari on macOS": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "A browser on another system": "curl/8.0",
};
const labels = Object.entries(UA).map(([want, ua]) => [want, D.deviceLabel(ua)]);
check("A5", "labels name only the browser family and the system", labels.every(([w, got]) => w === got), j(labels));

section("B. Register, at most two");
check("B1", "a bad token is refused (no-token)", D.useDevice(ARJUN, "short", "x").code === "no-token" && D.peekDevice(ARJUN, null).code === "no-token");
check("B2", "an unknown employee", D.useDevice("EMP-9999", T1).code === "no-employee");
check("B3", "peeking at a new device: allowed, writes nothing", j(D.peekDevice(ARJUN, T1)) === j({ ok: true, known: false, device: null }) && !mem.has("officeos:devices"));
const t1 = at(10, 1);
const u1 = D.useDevice(ARJUN, T1, "Edge on Windows");
check("B4", "first use registers DEV-1 with its label and times", u1.ok && u1.registered && j(u1.device) === j({ id: "DEV-1", userId: ARJUN, token: T1, label: "Edge on Windows", registeredAt: t1, lastUsedAt: t1 }), j(u1));
const t2 = at(11);
const u2 = D.useDevice(ARJUN, T1, "Edge on Windows");
check("B5", "the same device again: known, last used updated, not registered twice", u2.ok && !u2.registered && u2.device.id === "DEV-1" && u2.device.lastUsedAt === t2 && u2.device.registeredAt === t1);
const u3 = D.useDevice(ARJUN, T2, "Chrome on Android");
check("B6", "a second device: DEV-2", u3.ok && u3.registered && u3.device.id === "DEV-2");
const store = mem.get("officeos:devices");
const p3 = D.peekDevice(ARJUN, T3);
check("B7", "peeking at a third: refused (device-limit), storage unchanged", !p3.ok && p3.code === "device-limit" && mem.get("officeos:devices") === store, j(p3));
const u4 = D.useDevice(ARJUN, T3, "Firefox on Linux");
check("B8", "a third device is refused: code device-limit, with what to do", !u4.ok && u4.code === "device-limit" && u4.error === "You already use 2 devices. Ask an Admin to reset your devices to use this one." && mem.get("officeos:devices") === store, j(u4));
check("B9", "his two known devices still work", D.useDevice(ARJUN, T2).ok && D.peekDevice(ARJUN, T1).known === true);
check("B10", "the limit is per person: Rohan registers T3", D.useDevice(ROHAN, T3, "Firefox on Linux").ok);
check("B11", "a long label is cut to 40 characters", D.useDevice(SNEHA, T1, "L".repeat(60)).device.label.length === 40);

section("C. Who sees devices");
const own = D.devicesFor(ARJUN, ARJUN);
check("C1", "Arjun sees his own two", own.ok && j(own.records.map((d) => d.id)) === j(["DEV-1", "DEV-2"]), j(own));
check("C2", "Rohan, Sneha (a manager), HR and Finance can't see Arjun's", [ROHAN, SNEHA, PRIYA, KABIR].every((id) => D.devicesFor(id, ARJUN).error === "Only an Admin can see someone else's devices."));
check("C3", "an Admin sees anyone's", D.devicesFor(AARAV, ARJUN).records?.length === 2 && D.devicesFor(AARAV, ROHAN).records?.length === 1);
check("C4", "nobody signed in sees nothing", !D.devicesFor(null, ARJUN).ok);

section("D. Reset and sharing");
check("D1", "HR can't reset", D.resetDevices(PRIYA, ARJUN).error === "Only an Admin can reset devices.");
check("D2", "an Admin reset: both removed", j(D.resetDevices(AARAV, ARJUN)) === j({ ok: true, removed: 2 }) && D.devicesFor(ARJUN, ARJUN).records.length === 0);
check("D3", "others' devices stay", D.devicesFor(AARAV, ROHAN).records.length === 1);
check("D4", "after the reset his third device works (DEV-5: ids never reused)", D.useDevice(ARJUN, T3).device?.id === "DEV-5");
check("D5", "T3 is now used by Rohan and Arjun: shared", j(D.sharedWith(T3, ARJUN)) === j([ROHAN]) && j(D.sharedWith(T3, ROHAN)) === j([ARJUN]) && D.sharedWith(T2, ARJUN).length === 0);
check("D6", "reset of an unknown employee", D.resetDevices(AARAV, "EMP-9999").error === "No employee with id EMP-9999.");
check("D7", "MAX_DEVICES is 2", D.MAX_DEVICES === 2);
D.resetAllDevices();
check("D8", "reset all: the key is gone", !mem.has("officeos:devices"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
