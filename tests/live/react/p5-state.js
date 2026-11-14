// Makes the storage P5's harness starts from, with the app's own data modules (no page can settle a month by clicking):
// the seed made at the end of October 2026, its pending items settled, Vikram given a joining date, then on 9 Dec 2026
// October prepared and approved (before the new rules: no snapshot) and November prepared and approved (frozen snapshot).
// usage: node p5-state.js <js dir (the build's assets/js)> <out.json>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const [JS, OUT] = process.argv.slice(2);
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 11) => { NOW = new RealDate(y, mo - 1, d, h, 0, 0).getTime(); };
setNow(2026, 10, 30, 19);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const load = (f) => import(pathToFileURL(path.join(JS, f)).href);
const S = await load("data/store.js"), PS = await load("data/payroll-store.js"), RUNS = await load("data/pay-runs.js");
PS.payrollRun(2026, 10);
const edit = (key, pick, change) => { const box = JSON.parse(mem.get(`officeos:${key}`)); box.records.filter(pick).forEach(change); mem.set(`officeos:${key}`, JSON.stringify(box)); };
edit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
edit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
S.updateUser("EMP-1001", "EMP-1088", { dateOfJoining: "8 Jan 2024" });
setNow(2026, 12, 9);
const steps = [RUNS.prepareRunWithSnapshot("EMP-1008", 2026, 10), RUNS.approveRunWithSnapshot("EMP-1001", 2026, 10), RUNS.prepareRunWithSnapshot("EMP-1008", 2026, 11), RUNS.approveRunWithSnapshot("EMP-1001", 2026, 11)];
const bad = steps.filter((s) => !s.ok);
if (bad.length) { console.error("state:", bad.map((s) => s.error)); process.exit(1); }
const out = Object.fromEntries([...mem.entries()].filter(([k]) => k.startsWith("officeos:") && k !== "officeos:session").map(([k, v]) => [k, JSON.parse(v)]));
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`state: ${Object.keys(out).length} keys; November frozen for ${Object.keys(out["officeos:pay-snapshots"].months["2026-11"].rows).length} people`);