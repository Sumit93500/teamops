// usage: node modguard.mjs   (run through PowerShell with $env:TZ set for the time-zone runs; the time zone doesn't matter here)
// CV1c: tools/modules_guard.py and its use in tools/run-tests.py: a run can no longer empty app/node_modules (CV1b found it empty: `npm ci` deletes the
// folder first and a run stopped, or failing, between the delete and the end of the install left it empty or half-written).
// A stand-in npm (a script that makes the packages, fails half-way, or does nothing) is named in OFFICEOS_NPM; nothing here touches the network or a real node_modules.
//   G  a complete node_modules is never touched and npm is not even run; a missing, empty, half-written or wrongly-versioned one is installed in a temporary
//      folder and moved in only when complete; a failing or empty install leaves what was there exactly as it was; the read-only `check`
//   R  tools/run-tests.py: no `npm ci` of its own, and both installs go through the guard
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const REPO = "__REPO__";
const GUARD = path.join(REPO, "tools", "modules_guard.py");
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "modguard-suite-"));
const FAKE = path.join(ROOT, "fake-npm.py");
fs.writeFileSync(FAKE, `import json, os, sys
mode = os.environ.get("FAKE_MODE", "ok")
open(os.environ["FAKE_LOG"], "a").write(os.getcwd() + "\\n")
pkg = json.load(open("package.json"))
deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
def make(name, ver):
    d = os.path.join("node_modules", *name.split("/")); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "package.json"), "w").write(json.dumps({"name": name, "version": ver}))
if mode == "ok":
    for n, v in deps.items(): make(n, v)
elif mode == "wrong":
    for n, v in deps.items(): make(n, "0.0.1")
elif mode == "fail":
    n = sorted(deps)[0]; make(n, deps[n]); sys.stderr.write("npm ERR! EBUSY: resource busy or locked"); sys.exit(1)
sys.exit(0)
`);
const DEPS = { "left-pad": "1.3.0", "@scope/pkg": "2.0.1", vite: "8.3.8" };
let n = 0;
function folder() {
  const d = path.join(ROOT, "f" + ++n); fs.mkdirSync(d);
  fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({ name: "x", dependencies: { "left-pad": "1.3.0", "@scope/pkg": "2.0.1" }, devDependencies: { vite: "8.3.8" } }));
  fs.writeFileSync(path.join(d, "package-lock.json"), "{}");
  return d;
}
const put = (d, name, ver, extra = {}) => { const p = path.join(d, "node_modules", ...name.split("/")); fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(path.join(p, "package.json"), JSON.stringify({ name, version: ver })); for (const [f, c] of Object.entries(extra)) fs.writeFileSync(path.join(p, f), c); };
const full = (d) => { for (const [k, v] of Object.entries(DEPS)) put(d, k, v); };
function hashTree(d) {
  const h = createHash("sha256");
  const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const q = path.join(p, e.name); h.update(path.relative(d, q) + "\n"); e.isDirectory() ? walk(q) : h.update(fs.readFileSync(q)); } };
  if (fs.existsSync(d)) walk(d);
  return h.digest("hex");
}
function guard(cmd, d, mode = "ok") {
  const log = path.join(ROOT, `log${++n}.txt`);
  const r = spawnSync("python", [GUARD, cmd, d], { encoding: "utf8", env: { ...process.env, OFFICEOS_NPM: `python "${FAKE}"`, FAKE_MODE: mode, FAKE_LOG: log } });
  return { code: r.status, out: (r.stdout + r.stderr).trim(), calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [] };
}
const nm = (d) => path.join(d, "node_modules");
const complete = (d) => Object.entries(DEPS).every(([k, v]) => { try { return JSON.parse(fs.readFileSync(path.join(nm(d), ...k.split("/"), "package.json"), "utf8")).version === v; } catch { return false; } });

section("G. The guard");
{ const d = folder(); full(d); fs.writeFileSync(path.join(nm(d), "keep.txt"), "mine"); const h0 = hashTree(d); const r = guard("ensure", d);
  check("G1", "a complete node_modules: 'ok', npm is not run at all, nothing in the folder changes", r.code === 0 && r.out === "ok" && r.calls.length === 0 && hashTree(d) === h0, j(r)); }
{ const d = folder(); const r = guard("ensure", d);
  check("G2", "no node_modules: installed, complete, and npm ran in a temporary folder, never in the project's own", r.code === 0 && r.out === "installed" && complete(d) && r.calls.length === 1 && path.resolve(r.calls[0]) !== path.resolve(d) && !path.resolve(r.calls[0]).startsWith(path.resolve(d)), j(r)); }
{ const d = folder(); fs.mkdirSync(nm(d)); const r = guard("ensure", d);
  check("G3", "an EMPTY node_modules (what CV1b found) is replaced by a complete one", r.code === 0 && r.out === "installed" && complete(d), j(r)); }
{ const d = folder(); put(d, "left-pad", "1.3.0"); const r = guard("ensure", d);
  check("G4", "a half-written node_modules (one package of three) is replaced by a complete one", r.code === 0 && complete(d) && r.calls.length === 1, j(r)); }
{ const d = folder(); put(d, "left-pad", "1.3.0"); put(d, "@scope/pkg", "2.0.1"); put(d, "vite", "7.0.0"); const c = guard("check", d); const r = guard("ensure", d);
  check("G5", "a package at the wrong version is not complete: check says so, ensure reinstalls", c.code === 1 && /vite is 7\.0\.0, package\.json pins 8\.3\.8/.test(c.out) && r.out === "installed" && complete(d), j([c, r.out])); }
{ const d = folder(); put(d, "left-pad", "1.3.0", { "keep.txt": "half" }); const h0 = hashTree(d); const r = guard("ensure", d, "fail");
  check("G6", "npm fails (a locked file, no network): exit 1, the message says nothing was touched, and the half-written folder is byte for byte as it was", r.code === 1 && /ERROR/.test(r.out) && /was not touched/.test(r.out) && /EBUSY/.test(r.out) && hashTree(d) === h0, j(r)); }
{ const d = folder(); fs.mkdirSync(nm(d)); const h0 = hashTree(d); const r = guard("ensure", d, "empty");
  check("G7", "npm 'succeeds' but installs nothing: refused, exit 1, the folder as it was", r.code === 1 && /not complete/.test(r.out) && /was not touched/.test(r.out) && hashTree(d) === h0 && fs.existsSync(nm(d)), j(r)); }
{ const d = folder(); const h0 = hashTree(d); const r = guard("ensure", d, "wrong");
  check("G8", "an install with the wrong versions is refused, and no node_modules appears", r.code === 1 && !fs.existsSync(nm(d)) && hashTree(d) === h0, j(r)); }
{ const d = folder(); put(d, "left-pad", "1.3.0", { "keep.txt": "half" }); guard("ensure", d, "fail"); const r = guard("ensure", d, "ok");
  check("G9", "after a failed run the next one recovers: installed, complete", r.code === 0 && r.out === "installed" && complete(d), j(r)); }
{ const d = folder(); const a = fs.readFileSync(path.join(d, "package.json"), "utf8"), b = fs.readFileSync(path.join(d, "package-lock.json"), "utf8"); guard("ensure", d); guard("ensure", folder(), "fail");
  check("G10", "package.json and package-lock.json are never rewritten", fs.readFileSync(path.join(d, "package.json"), "utf8") === a && fs.readFileSync(path.join(d, "package-lock.json"), "utf8") === b); }
{ const d = folder(); const r = guard("check", d); full(d); const r2 = guard("check", d);
  check("G11", "check installs nothing: 1 and the reason for none, 0 and 'complete' for a full one, npm never run", r.code === 1 && /node_modules is missing/.test(r.out) && r2.code === 0 && r2.out === "complete" && r.calls.length === 0 && r2.calls.length === 0, j([r, r2])); }
{ const d = folder(); full(d); fs.rmSync(path.join(nm(d), "left-pad"), { recursive: true }); const r = guard("check", d);
  check("G12", "one missing package makes it incomplete", r.code === 1 && /left-pad is missing/.test(r.out), r.out); }
{ const r = spawnSync("python", [GUARD], { encoding: "utf8" }); const r2 = spawnSync("python", [GUARD, "remove", ROOT], { encoding: "utf8" });
  check("G13", "no command, or an unknown one (remove), does nothing and says how to use it", r.status === 2 && r2.status === 2 && /usage/.test(r.stdout + r2.stdout) && fs.existsSync(ROOT)); }

section("R. tools/run-tests.py");
const rt = fs.readFileSync(path.join(REPO, "tools", "run-tests.py"), "utf8").replace(/\r\n/g, "\n");
const code = rt.split("\n").map((l) => l.replace(/\s*#.*$/, "")).join("\n");   // comments are not code
check("R1", "run-tests.py has no `npm ci` of its own in its code (only the guard installs)", !/npm ci/.test(code));
check("R2", "it imports the guard and both installs (tests/, app/) go through it", /^import modules_guard/m.test(rt) && /need_modules\(TESTS\)/.test(code) && /need_modules\(os\.path\.join\(ROOT, "app"\)\)/.test(code) && /modules_guard\.ensure\(folder\)/.test(code));
check("R3", "the React build runs `npm run build` only after the guard, and checks app/node_modules is still complete afterwards", (() => { const i = code.indexOf("need_modules(os.path.join(ROOT, \"app\"))"); const k = code.indexOf("npm run build"); const c = code.indexOf("modules_guard.complete(os.path.join(ROOT, \"app\"))"); return i > 0 && k > i && c > k; })());
check("R4", "a failed guard stops the run with exit 1 (no suite runs on a half install)", /def need_modules\(folder\):\n\s+try:\n\s+modules_guard\.ensure\(folder\)\n\s+except RuntimeError as e:\n[^\n]*\n\s+sys\.exit\(1\)/.test(code));
check("R5", "no other script in tools/ runs npm ci or deletes node_modules", fs.readdirSync(path.join(REPO, "tools")).filter((f) => f.endsWith(".py") && f !== "modules_guard.py" && f !== "run-tests.py").every((f) => { const t = fs.readFileSync(path.join(REPO, "tools", f), "utf8"); return !/npm ci/.test(t) && !/rmtree\([^)]*node_modules/.test(t); }));

fs.rmSync(ROOT, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
function j(x) { return JSON.stringify(x); }