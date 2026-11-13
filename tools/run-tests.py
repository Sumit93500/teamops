# Runs the live suites (tests/live) on this repo and prints passed / failed (total) per area. tests/run.cmd and tests/run.sh call it.
#
# What it does:
#   1. builds the run folder tests/.suites (git-ignored): the archive tests/archive/old-suites.tar.gz unpacked (the frozen baselines
#      the suites compare against; repeats are hard links), the live suites copied over it (__REPO__ in them becomes this checkout's
#      path), and assets/js copied to .suites/js (the suites read the code under test from there, as in the round folders);
#   2. installs tests/node_modules once (npm ci in tests/: jsdom for the suites, playwright-core for the React harnesses);
#   3. takes the jobs from tests/live/run-suites.ps1, the runner the rounds used (a suite name, its arguments, and the time zones:
#      the suites in its time-zone loop run in Asia/Kolkata, UTC and America/Los_Angeles); only the live suites' jobs run;
#   4. runs them N at a time (default 9, the rounds' 3 shards x 3 zones), longest first, each output to tests/.out/<job>.txt;
#   5. with --react (or REACT=1): builds app/ and runs the React harnesses in tests/live/react against it, the repo root being the
#      old site they compare with (needs Microsoft Edge; one harness at a time: they share ports 9983/9984);
#   6. prints passed / failed (total) per area (tests/suites.csv) and writes tests/.out/summary.csv; exits 1 on any failure.
# usage: python tools/run-tests.py [--zones Asia/Kolkata,UTC,America/Los_Angeles] [--workers 9] [--react | --react-only] [--only s1,s2]
import argparse, concurrent.futures as cf, csv, json, os, re, shutil, subprocess, sys, tarfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS = os.path.join(ROOT, "tests")
RUN, OUT = os.path.join(TESTS, ".suites"), os.path.join(TESTS, ".out")
ZONES = ["Asia/Kolkata", "UTC", "America/Los_Angeles"]
COUNT = re.compile(r"(\d+) passed, (\d+) failed")
REACT = [  # harness, ONLY letters (the harness's own default when empty)
    ("smoke.mjs", ""), ("gallery.mjs", ""), ("shell.mjs", "DRQTNFPBAS"), ("dash.mjs", "AEZHFYMS"), ("att.mjs", "SPX"), ("leave.mjs", ""),
    ("pay.mjs", "SQPX"), ("fin.mjs", ""), ("req.mjs", "IKMCPX"), ("access.mjs", ""), ("rest.mjs", ""), ("design.mjs", ""), ("charts.mjs", ""), ("users.mjs", ""), ("locs.mjs", ""), ("att3.mjs", ""), ("side.mjs", ""),
]
# Left out on purpose: att Y (my attendance's earlier months) and pay R, V (payroll run, payslip view). Rounds 9b, 11 and 13c gave
# those months "No data in this range.", which the old site doesn't have, so they match only a reference tree with the new wording
# (the round folders' rertree), not this repo's old pages. Against the old pages they fail by design (5 and 14 checks).

def jobs_from_runner(live):
    """(name, [args], tz or None) for each Run line of run-suites.ps1 whose suite is live."""
    lines = open(os.path.join(TESTS, "live", "run-suites.ps1"), encoding="utf-8-sig").read().splitlines()
    tokens = lambda s: [x[0] or ("$" + x[1]) for x in re.findall(r'"([^"]+)"|\$(\w+)', s)]
    out, loop = [], False
    for l in lines:
        if l.startswith("foreach ($tz in "):
            loop = True
            continue
        # foreach ($r in "admin", "fin") { Run "user-profile-$r" @("user-profile.mjs", $r) }: one job per value
        m = re.match(r'\s*foreach \(\$(\w+) in ([^)]+)\) \{ Run "([^"]+)" @\(([^)]*)\) \}', l)
        if m:
            var = "$" + m[1]
            for r in re.findall(r'"([^"]+)"', m[2]):
                out.append((m[3].replace(var, r), [r if a == var else a for a in tokens(m[4])], None))
            continue
        m = re.search(r'\bRun "([^"]+)" @\(([^)]*)\)', l)
        if not m:
            continue
        args = tokens(m[2])
        if loop:
            for tz in ZONES:
                out.append((m[1].replace("$t", tz.replace("/", "-")), args, tz))
        else:
            out.append((m[1], args, None))
    return [j for j in out if j[1][0] in live]

def prepare(fresh):
    stamp = os.path.join(RUN, ".archive-stamp")
    arch = os.path.join(TESTS, "archive", "old-suites.tar.gz")
    want = str(os.path.getmtime(arch)) + str(os.path.getsize(arch))
    if fresh or not os.path.exists(stamp) or open(stamp).read() != want:
        shutil.rmtree(RUN, ignore_errors=True)
        os.makedirs(RUN)
        with tarfile.open(arch) as t:
            t.extractall(RUN, filter="tar")
        open(stamp, "w").write(want)
    # The copies in tests/live say __REPO__ where the round folders' suites had this machine's repo path (five suites read
    # the real pages; a few name a default pages folder): it becomes this checkout's path, so they read the repo under test.
    repo = ROOT.replace("\\", "/").encode()
    for f in os.listdir(os.path.join(TESTS, "live")):
        p = os.path.join(TESTS, "live", f)
        if os.path.isfile(p):
            open(os.path.join(RUN, f), "wb").write(open(p, "rb").read().replace(b"__REPO__", repo))
    open(os.path.join(RUN, "package.json"), "w").write('{"type":"module"}')
    shutil.rmtree(os.path.join(RUN, "js"), ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, "assets", "js"), os.path.join(RUN, "js"))
    if not os.path.isdir(os.path.join(TESTS, "node_modules", "jsdom")):
        subprocess.run("npm ci --no-audit --no-fund", cwd=TESTS, shell=True, check=True)

def run_job(job):
    name, args, tz = job
    env = dict(os.environ)
    env.pop("TZ", None)
    if tz:
        env["TZ"] = tz
    cmd = ["node"] + [os.path.join(ROOT, "pages") if a == "$Pages" else a for a in args]
    t0 = time.time()
    r = subprocess.run(cmd, cwd=RUN, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
    text = r.stdout + r.stderr
    open(os.path.join(OUT, name + ".txt"), "w", encoding="utf-8").write(text)
    p = sum(int(m[0]) for m in COUNT.findall(text))
    f = sum(int(m[1]) for m in COUNT.findall(text))
    if r.returncode and not f:
        f = 1   # a crash: no total, so it counts as a failure (summ.py's lesson)
    return name, args[0], p, f, time.time() - t0, r.returncode

def run_react():
    """The React harnesses, one at a time, against app/dist and the repo root."""
    shutil.rmtree(os.path.join(ROOT, "app", "dist"), ignore_errors=True)
    subprocess.run("npm ci --no-audit --no-fund && npm run build", cwd=os.path.join(ROOT, "app"), shell=True, check=True, capture_output=True)
    dist, results = os.path.join(ROOT, "app", "dist"), []
    for h, only in REACT:
        env = dict(os.environ)
        env.pop("TZ", None)
        if only:
            env["ONLY"] = only
        shots = os.path.join(OUT, "react-shots", h[:-4])
        args = [dist, ROOT] if h == "smoke.mjs" else [dist, shots] if h in ("gallery.mjs", "design.mjs", "charts.mjs") else [dist, ROOT, shots]
        t0 = time.time()
        r = subprocess.run(["node", os.path.join(TESTS, "live", "react", h), *args], cwd=os.path.join(TESTS, "live", "react"), env=env,
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        text = r.stdout + r.stderr
        open(os.path.join(OUT, f"react-{h[:-4]}.txt"), "w", encoding="utf-8").write(text)
        m = re.findall(r"passed (\d+), failed (\d+)", text)
        p, f = (int(m[-1][0]), int(m[-1][1])) if m else (0, 1)
        results.append((f"react-{h[:-4]}", h, p, f, time.time() - t0, r.returncode))
        print(f"  react {h:12} {p} passed, {f} failed ({time.time() - t0:.0f} s)", flush=True)
    return results

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zones", default=",".join(ZONES))
    ap.add_argument("--workers", type=int, default=9)
    ap.add_argument("--react", action="store_true", default=os.environ.get("REACT") == "1")
    ap.add_argument("--only", default="")
    ap.add_argument("--fresh", action="store_true", help="unpack the archive again")
    ap.add_argument("--react-only", action="store_true", help="only the React harnesses")
    a = ap.parse_args()
    if a.react_only:
        a.react, a.only = True, "-"
    zones = a.zones.split(",")
    live = {f for f in os.listdir(os.path.join(TESTS, "live")) if f.endswith(".mjs")}
    if a.only:
        live &= {s if s.endswith(".mjs") else s + ".mjs" for s in a.only.split(",")}
    t0 = time.time()
    prepare(a.fresh)
    if not a.react_only:   # a React-only run keeps the suites' outputs beside its own
        shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)
    jobs = [j for j in jobs_from_runner(live) if j[2] is None or j[2] in zones]
    timing = {}
    tfile = os.path.join(TESTS, "live", "timings.json")
    if os.path.exists(tfile):
        timing = json.load(open(tfile))
    jobs.sort(key=lambda j: -timing.get(j[0], 8.0))
    print(f"{len(jobs)} suite runs ({len(live)} live suites; zones {', '.join(zones)}), {a.workers} at a time", flush=True)
    with cf.ThreadPoolExecutor(a.workers) as ex:
        results = list(ex.map(run_job, jobs))
    if a.react:
        results += run_react()
    area = {}
    sfile = os.path.join(TESTS, "suites.csv")
    if os.path.exists(sfile):
        area = {r["suite"]: r["area"] for r in csv.DictReader(open(sfile, encoding="utf-8"))}
    by = {}
    for name, suite, p, f, sec, rc in results:
        # the React harnesses are their own area (shell, dash and leave share a name with old suites)
        k = "react" if name.startswith("react-") else area.get(suite.replace(".mjs", ""), "other")
        b = by.setdefault(k, [0, 0, 0])
        b[0] += p; b[1] += f; b[2] += 1
    with open(os.path.join(OUT, "summary.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["job", "suite", "passed", "failed", "seconds", "exit"])
        for r in sorted(results):
            w.writerow([r[0], r[1], r[2], r[3], f"{r[4]:.1f}", r[5]])
    print(f"\n{'area':12} {'passed':>8} {'failed':>7} {'(total)':>9}  runs")
    tp = tf = 0
    for k in sorted(by):
        p, f, n = by[k]
        tp += p; tf += f
        print(f"{k:12} {p:8,} {f:7,} {'(' + format(p + f, ',') + ')':>9}  {n}")
    print(f"{'ALL':12} {tp:8,} {tf:7,} {'(' + format(tp + tf, ',') + ')':>9}  {len(results)}   {time.time() - t0:.0f} s")
    bad = [r for r in results if r[3]]
    for r in bad[:20]:
        print(f"FAILED: {r[0]} ({r[3]} failed) -> tests/.out/{r[0]}.txt")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
