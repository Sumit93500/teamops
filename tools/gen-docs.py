# Regenerates the test records from the suites and, optionally, a run's outputs. Idempotent: the same inputs write the same
# bytes, and with no new run it only redraws the catalog and the index from the stored tables.
#
#   tests/suites.csv          one row per suite: suite, area, status (live | archived), purpose, runs, checks, failed, run
#   tests/cases/<area>.csv    id, suite, case, x: each check as its suite's own PASS/FAIL line says it, repeats folded into one
#                             case (checks that differ only by role, time zone, person, date or number); x says how many
#   tests/TEST-CATALOG.md     one line per suite, by area
#   tests/index.html          one self-contained page: search, filter by area / suite / live or archived
#   tests/RESULTS.csv         one line per round; --result appends one (a line already there isn't added again)
#
# usage: python tools/gen-docs.py                                  redraw TEST-CATALOG.md and index.html from the stored tables
#        python tools/gen-docs.py --run DIR [--run DIR2] --label L  refresh suites.csv and the cases from run outputs (later DIRs
#                                                                   win for a job they share); L names the run in suites.csv
#        python tools/gen-docs.py --result "round,date,commit,passed,failed,total,note"
# A run DIR holds <job>.txt files: the live runner's tests/.out, or a round folder's out-final. React harness outputs are
# react-<harness>.txt.
import argparse, csv, html, io, json, os, re, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS = os.path.join(ROOT, "tests")
ZONES = {"Asia-Kolkata": "Asia/Kolkata", "UTC": "UTC", "America-Los_Angeles": "America/Los_Angeles"}
ROLES = r"(admin|hr|fin|emp|mgr|out)"
PEOPLE = ["Aarav Mehta", "Priya Nair", "Kabir Shah", "Ananya Iyer", "Meera Joshi", "Sneha Rao", "Rohan Gupta", "Divya Menon",
          "Vikram Singh", "Arjun Kapoor", "Aarav", "Priya", "Kabir", "Ananya", "Meera", "Sneha", "Rohan", "Divya", "Vikram", "Arjun"]
MONTHS = r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b"
LINE = re.compile(r"^(PASS|FAIL)\s+(\S+)\s+(.*?)(?:\s+->\s.*)?$")

# The areas, in the order the catalog lists them, and how a suite is placed: its name first, then words in its own description.
AREAS = ["rbac", "attendance", "leave", "payroll", "expenses", "assets", "requests", "charts", "pages", "guards", "react"]
NAMED = {
    "rbac": "adminguard deactguard demoteguard deptguard departments userguard users-list user-profile my-profile managerid mgrscope mgrfall "
            "overrides recordrole roleview sessrole financeperm holders nottheirs reactivate rejoin joiners joindate joinguard newhire "
            "newstarts notjoined leavers firstleft tenure comeback delnames store authpages authnotes acctpages signnotes",
    "attendance": "attendance mark myatt reg team workedday bothdates cells view decidegap absence latepause relief",
    "locations": "company offices homes devices places punch14 perms14",
    "leave": "leave leavebal holiguard holileave holipast",
    "payroll": "payroll payrun payruns payslip payclock paygate salary salchain saledit salinbox salpage salwrite wfsalary tdsyear "
               "taxlabel taxnote unpaid periods adjacent gap",
    "expenses": "expenses exppage expinbox expclaim claims",
    "assets": "inventory invpages assetpages assetreq vendorpages heldassets handover delheld stranded",
    "requests": "approvals chain decision forward closing deferred delask delopen cardbell bellphone accesscard resetcard",
    "charts": "admdash hrdash findash dash boards chartdata emptyrange legend dots findsort",
    "guards": "cssguard jsguard pagefreeze noflash contrast phone shell rail",
    "react": "smoke gallery parity att leave-react pay fin req access rest c13 design charts users locs att3",
}
AREA_OF = {s: a for a, names in NAMED.items() for s in names.split()}

def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")

def purpose_of(text):
    """The suite's own first description, shortened to a phrase."""
    t = re.sub(r"^usage:.*?(time-zone runs\)|\]\s)", "", text).strip()
    t = re.sub(r"^(React )?[Rr]ound [\w.-]+( \([^)]*\))?:\s*", "", t)
    t = re.split(r"(?<=[.;])\s", t)[0].rstrip(".;:")
    return (t[:117] + "…") if len(t) > 118 else t

def header(text):
    out = []
    for l in text.splitlines()[:14]:
        s = l.strip()
        if s.startswith("//"):
            out.append(s.lstrip("/ ").strip())
        elif s and out:
            break
    return " ".join(out)

def suites_on_disk():
    """{suite: (status, purpose)}: tests/live/*.mjs (live), tests/live/react/*.mjs (live, react), the archive's suites (archived)."""
    found = {}
    live = os.path.join(TESTS, "live")
    for f in sorted(os.listdir(live)):
        if f.endswith(".mjs"):
            found[f[:-4]] = ("live", purpose_of(header(open(os.path.join(live, f), encoding="utf-8").read())))
    for f in sorted(os.listdir(os.path.join(live, "react"))):
        if f.endswith(".mjs"):
            found["react-" + f[:-4]] = ("live", purpose_of(header(open(os.path.join(live, "react", f), encoding="utf-8").read())))
    arch = os.path.join(TESTS, "archive", "old-suites.tar.gz")
    if os.path.exists(arch):
        with tarfile.open(arch) as t:
            for m in t.getmembers():
                if m.isfile() and "/" not in m.name and m.name.endswith(".mjs"):
                    found[m.name[:-4]] = ("archived", purpose_of(header(t.extractfile(m).read().decode("utf-8"))))
    return found

def area_for(suite, purpose):
    if suite.startswith("react-"):
        return "react"
    if suite in AREA_OF:
        return AREA_OF[suite]
    words = purpose.lower()
    for a, keys in (("payroll", "payroll salary payslip tds tax"), ("attendance", "attendance check-in regulariz"), ("leave", "leave holiday"),
                    ("expenses", "expense claim"), ("assets", "asset inventory vendor stock"), ("rbac", "role permission user admin"),
                    ("requests", "approval request inbox"), ("charts", "chart dashboard")):
        if any(k in words for k in keys.split()):
            return a
    return "pages"

def job_suite(job, known):
    """A job's output name -> its suite: myatt-Asia-Kolkata -> myatt, user-profile-admin -> user-profile, react-smoke -> react-smoke."""
    if job in known:
        return job
    for z in ZONES:
        if job.endswith("-" + z):
            return job_suite(job[: -len(z) - 1], known)
    base = job.rsplit("-", 1)[0]
    return base if base in known else None

def norm_id(i):
    parts = [p for p in i.split(".") if not re.fullmatch(ROLES, p)]
    return ".".join(parts) or i

def norm_text(t):
    t = re.sub(r"\b" + ROLES + r"\b", "{role}", t)
    for p in PEOPLE:
        t = t.replace(p, "{person}")
    t = re.sub(MONTHS, "{month}", t)
    t = re.sub(r"Asia/Kolkata|America/Los_Angeles|UTC|IST", "{zone}", t)
    t = re.sub(r"[₹$]?\d[\d,.:/-]*", "#", t)
    return re.sub(r"\s+", " ", t).strip()

def read_runs(dirs, known):
    """{suite: {"runs": n, "checks": n, "failed": n, "cases": [(id, text, x-label, n)]}} from the run outputs."""
    jobs = {}
    for d in dirs:
        for f in sorted(os.listdir(d)):
            if f.endswith(".txt") and job_suite(f[:-4], known):
                jobs[f[:-4]] = os.path.join(d, f)
    per = {}
    for job, path in sorted(jobs.items()):
        s = job_suite(job, known)
        zone = next((v for k, v in ZONES.items() if job.endswith("-" + k)), None)
        variant = job[len(s):].strip("-") if job != s and not zone else ""
        rec = per.setdefault(s, {"runs": 0, "checks": 0, "failed": 0, "groups": {}})
        rec["runs"] += 1
        text = open(path, encoding="utf-8", errors="replace").read()
        counts = re.findall(r"(\d+) passed, (\d+) failed|passed (\d+), failed (\d+)", text)
        if counts:
            c = counts[-1]
            p, fl = (int(c[0]), int(c[1])) if c[0] else (int(c[2]), int(c[3]))
        else:
            p, fl = 0, 1   # a crash: no total
        rec["checks"] += p + fl
        rec["failed"] += fl
        for line in text.splitlines():
            m = LINE.match(line.strip())
            if not m:
                continue
            key = (norm_id(m[2]), norm_text(m[3]))
            g = rec["groups"].setdefault(key, {"text": m[3].strip(), "n": 0, "fail": 0, "zones": set(), "roles": set(), "variants": set()})
            g["n"] += 1
            g["fail"] += m[1] == "FAIL"
            if zone: g["zones"].add(zone)
            if variant: g["variants"].add(variant)
            for r in re.findall(r"\b" + ROLES + r"\b", m[2] + " " + m[3]):
                g["roles"].add(r)
    for s, rec in per.items():
        cases, seen = [], {}
        for (nid, _), g in rec["groups"].items():
            k = seen[nid] = seen.get(nid, 0) + 1
            why = [f"{len(g['zones'])} zones"] if len(g["zones"]) > 1 else []
            if len(g["roles"]) > 1: why.append(f"{len(g['roles'])} roles")
            if len(g["variants"]) > 1: why.append(f"{len(g['variants'])} variants")
            if g["n"] > 1 and not why: why.append("values")
            x = f"x{g['n']}" + (f" ({', '.join(why)})" if g["n"] > 1 else "") + (f"; {g['fail']} failed" if g["fail"] else "")
            cases.append((f"{s}.{nid}" + (f"#{k}" if k > 1 else ""), g["text"], x))
        rec["cases"] = cases
    return per

def write_csv(path, header_row, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header_row)
    w.writerows(rows)
    open(path, "w", encoding="utf-8", newline="").write(buf.getvalue())

def load_suites():
    p = os.path.join(TESTS, "suites.csv")
    return {r["suite"]: r for r in csv.DictReader(open(p, encoding="utf-8"))} if os.path.exists(p) else {}

def catalog(suites):
    by = {a: [] for a in AREAS}
    for s, r in suites.items():
        by.setdefault(r["area"], []).append(r)
    live = sum(r["status"] == "live" for r in suites.values())
    checks = sum(int(r["checks"] or 0) for r in suites.values())
    out = ["# Test catalog", "",
           f"{len(suites)} suites: {live} live (run by `tests/run.cmd` / `tests/run.sh`), {len(suites) - live} archived "
           f"(`tests/archive/old-suites.tar.gz`). {checks:,} checks in their last runs. Each line: suite, status, purpose (the suite's own "
           "description), checks in its last run (all its runs: every time zone and variant), result, and which run. The cases are in "
           "`tests/cases/<area>.csv`; `tests/index.html` searches them. Generated by `tools/gen-docs.py`: don't edit by hand.", ""]
    for a in [a for a in by if by[a]]:
        rows = sorted(by[a], key=lambda r: r["suite"])
        out += [f"## {a} ({len(rows)})", ""]
        for r in rows:
            res = "pass" if r["checks"] and int(r["failed"]) == 0 else (f"{r['failed']} failed" if r["checks"] else "not run")
            out.append(f"- **{r['suite']}** ({r['status']}): {r['purpose']}. {int(r['checks'] or 0):,} checks, {res} ({r['run']})")
        out.append("")
    return "\n".join(out)

PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test cases</title>
<style>
:root{--bg:#f6f7f9;--fg:#1d2433;--muted:#5d6779;--card:#fff;--line:#dde1e8;--accent:#3b5bdb;--bad:#c92a2a}
@media (prefers-color-scheme:dark){:root{--bg:#12151c;--fg:#e6e9ef;--muted:#9aa3b5;--card:#1b2029;--line:#2c3340;--accent:#8ea4ff;--bad:#ff8787}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:20px 16px 8px;max-width:1200px;margin:auto}h1{margin:0 0 4px;font-size:20px}p{margin:0;color:var(--muted)}
.bar{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;max-width:1200px;margin:auto;position:sticky;top:0;background:var(--bg)}
input,select{font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:6px 8px}
input{flex:1 1 240px}main{max-width:1200px;margin:auto;padding:0 16px 32px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{font-weight:600;color:var(--muted)}
td.x{white-space:nowrap;color:var(--muted)}td.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--muted)}
.bad{color:var(--bad)}.count{margin:8px 0;color:var(--muted)}button{font:inherit;margin-top:12px;padding:6px 12px;border-radius:6px;
border:1px solid var(--line);background:var(--card);color:var(--accent);cursor:pointer}
@media (max-width:640px){td.id{display:none}th:first-child{display:none}}
</style></head><body>
<header><h1>Test cases</h1><p>__SUMMARY__</p></header>
<div class="bar"><input id="q" type="search" placeholder="Search cases" aria-label="Search cases">
<select id="area" aria-label="Area"><option value="">All areas</option></select>
<select id="suite" aria-label="Suite"><option value="">All suites</option></select>
<select id="status" aria-label="Live or archived"><option value="">Live and archived</option><option>live</option><option>archived</option></select></div>
<main><div class="count" id="count" aria-live="polite"></div>
<table><thead><tr><th>id</th><th>case</th><th>x</th></tr></thead><tbody id="rows"></tbody></table>
<button id="more" hidden>Show more</button></main>
<script>
const D = __DATA__;
const S = Object.fromEntries(D.suites.map((s) => [s[0], s]));
const $ = (id) => document.getElementById(id);
for (const a of D.areas) $("area").add(new Option(a, a));
for (const s of D.suites) $("suite").add(new Option(s[0], s[0]));
let shown = 300;
function list() {
  const q = $("q").value.trim().toLowerCase(), a = $("area").value, su = $("suite").value, st = $("status").value;
  return D.cases.filter((c) => (!a || S[c[1]][1] === a) && (!su || c[1] === su) && (!st || S[c[1]][2] === st) &&
    (!q || (c[0] + " " + c[2]).toLowerCase().includes(q)));
}
function draw() {
  const l = list(), body = $("rows");
  body.replaceChildren(...l.slice(0, shown).map((c) => {
    const tr = document.createElement("tr");
    for (const [v, cls] of [[c[0], "id"], [c[2], ""], [c[3], "x" + (c[3].includes("failed") ? " bad" : "")]]) {
      const td = document.createElement("td"); td.textContent = v; if (cls) td.className = cls; tr.append(td);
    }
    return tr;
  }));
  $("count").textContent = l.length.toLocaleString() + " cases" + (l.length > shown ? ", the first " + shown.toLocaleString() + " shown" : "");
  $("more").hidden = l.length <= shown;
}
for (const id of ["q", "area", "suite", "status"]) $(id).addEventListener("input", () => { shown = 300; draw(); });
$("more").addEventListener("click", () => { shown += 1000; draw(); });
draw();
</script></body></html>
"""

def index_page(suites, cases):
    data = {"areas": [a for a in AREAS if any(r["area"] == a for r in suites.values())],
            "suites": [[s, r["area"], r["status"]] for s, r in sorted(suites.items())],
            "cases": [[c["id"], c["suite"], c["case"], c["x"]] for c in cases if c["suite"] in suites]}
    raw = sum(int(r["checks"] or 0) for r in suites.values())
    summary = f"{len(data['cases']):,} cases from {raw:,} checks in {len(suites)} suites. Generated by tools/gen-docs.py."
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return PAGE.replace("__SUMMARY__", html.escape(summary)).replace("__DATA__", js)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="append", default=[])
    ap.add_argument("--label", default="")
    ap.add_argument("--result", default="")
    a = ap.parse_args()
    found = suites_on_disk()
    suites = load_suites()
    for s in list(suites):
        if s not in found:
            del suites[s]
    for s, (status, purpose) in found.items():
        r = suites.setdefault(s, {"suite": s, "runs": "", "checks": "", "failed": "", "run": ""})
        r.update(status=status, purpose=purpose, area=area_for(s, purpose))
    cases_dir = os.path.join(TESTS, "cases")
    if a.run:
        per = read_runs(a.run, set(found))
        for s, rec in per.items():
            suites[s].update(runs=str(rec["runs"]), checks=str(rec["checks"]), failed=str(rec["failed"]), run=a.label or "run")
        old = {}
        if os.path.isdir(cases_dir):
            for f in os.listdir(cases_dir):
                for row in csv.DictReader(open(os.path.join(cases_dir, f), encoding="utf-8")):
                    old.setdefault(row["suite"], []).append(row)
        rows = {a2: [] for a2 in AREAS}
        for s in sorted(suites):
            if s in per:
                rows.setdefault(suites[s]["area"], []).extend([[i, s, t, x] for i, t, x in per[s]["cases"]])
            else:
                rows.setdefault(suites[s]["area"], []).extend([[r["id"], s, r["case"], r["x"]] for r in old.get(s, [])])
        if os.path.isdir(cases_dir):
            for f in os.listdir(cases_dir):
                os.remove(os.path.join(cases_dir, f))
        for a2, rr in rows.items():
            if rr:
                write_csv(os.path.join(cases_dir, f"{a2}.csv"), ["id", "suite", "case", "x"], rr)
    cols = ["suite", "area", "status", "purpose", "runs", "checks", "failed", "run"]
    write_csv(os.path.join(TESTS, "suites.csv"), cols, [[suites[s][c] for c in cols] for s in sorted(suites)])
    cases = []
    if os.path.isdir(cases_dir):
        for f in sorted(os.listdir(cases_dir)):
            cases += list(csv.DictReader(open(os.path.join(cases_dir, f), encoding="utf-8")))
    open(os.path.join(TESTS, "TEST-CATALOG.md"), "w", encoding="utf-8", newline="\n").write(catalog(suites) + "\n")
    open(os.path.join(TESTS, "index.html"), "w", encoding="utf-8", newline="\n").write(index_page(suites, cases))
    if a.result:
        p = os.path.join(TESTS, "RESULTS.csv")
        lines = open(p, encoding="utf-8").read().splitlines() if os.path.exists(p) else ["round,date,commit,passed,failed,total,note"]
        row = next(csv.reader([a.result]))
        line = io.StringIO()
        csv.writer(line, lineterminator="").writerow(row)
        if line.getvalue() not in lines:
            lines.append(line.getvalue())
        open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    size = sum(os.path.getsize(os.path.join(cases_dir, f)) for f in os.listdir(cases_dir)) if os.path.isdir(cases_dir) else 0
    print(f"{len(suites)} suites; {len(cases):,} cases, {size / 1e6:.2f} MB in tests/cases; index.html "
          f"{os.path.getsize(os.path.join(TESTS, 'index.html')) / 1e6:.2f} MB")

if __name__ == "__main__":
    main()
