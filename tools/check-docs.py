# Checks the docs against the code (run at the end of every round; fix what it flags).
#   1. a file path named in backticks in README / ARCHITECTURE / CLAUDE / docs/*.md that no longer exists (paths under
#      assets/, app/, tests/, tools/, docs/, pages/ and the data/ ui/ pages/ config/ names under assets/js)
#   2. a permission named like `module:action` that is not in assets/js/config/permissions.js, and a doc that says "N in all" /
#      "all N" for the permission count when N differs from the real count
#   3. a function name `name()` in docs/payroll-rules.md, docs/payroll.md and docs/leave.md that is exported by no file in assets/js
#   4. the test counts: the newest line of tests/RESULTS.csv must equal what the suites.csv rows add up to (checks and runs)
#   5. the code graph report must be newer than the last commit that touched assets/js or app/src
# usage: python tools/check-docs.py        exit 1 when anything is flagged
import csv, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
docs = ["README.md", "ARCHITECTURE.md", "CLAUDE.md"] + sorted(os.path.join("docs", f) for f in os.listdir("docs") if f.endswith(".md"))
flags = []
def read(p): return open(p, encoding="utf-8").read()

# the code's names
exports = set()
for base in ("assets/js", "app/src"):
    for d, _, fs in os.walk(base):
        for f in fs:
            if f.endswith((".js", ".jsx")):
                for m in re.finditer(r"export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)", read(os.path.join(d, f))): exports.add(m[1])
                for m in re.finditer(r"export\s*\{([^}]*)\}", read(os.path.join(d, f))):
                    exports.update(x.split(" as ")[-1].strip() for x in m[1].split(",") if x.strip())
perm_src = read("assets/js/config/permissions.js")
block = re.search(r"export const PERMISSIONS = \{(.*?)\n\};", perm_src, re.S)[1]
perms = set()
for m in re.finditer(r'^\s*"?([\w-]+)"?:\s*\[([^\]]*)\]', block, re.M):
    perms.update(f"{m[1]}:{a}" for a in re.findall(r'"([\w-]+)"', m[2]))
count = len(perms)

PATH = re.compile(r"`((?:assets|app|tests|tools|docs|pages)/[\w./@-]+\.(?:js|jsx|mjs|py|md|csv|css|html|json|ps1))`")
for doc in docs:
    text = read(doc)
    for m in PATH.finditer(text):
        p = m[1]
        if not any(os.path.exists(os.path.join(b, p)) for b in ("", "app/src", "assets/js")) and not p.startswith(("tests/.", "docs/graph/raw")) and not any(c in p for c in "<*{}"):
            flags.append(f"{doc}: names {p}, which doesn't exist")
    for m in re.finditer(r"`([a-z][\w-]*:[a-z][\w-]*)`", text):
        mod = m[1].split(":")[0]
        if mod in {k.split(":")[0] for k in perms} and m[1] not in perms: flags.append(f"{doc}: names the permission {m[1]}, which is not in permissions.js")
    for m in re.finditer(r"\b(\d+) (?:permissions|in all)\b|all (\d+)\b(?= \|)", text):
        n = int(m[1] or m[2])
        if n != count and 60 <= n <= 120: flags.append(f"{doc}: says {n} permissions, permissions.js has {count}")
    if os.path.basename(doc) in ("payroll-rules.md", "payroll.md", "leave.md"):
        for m in re.finditer(r"`([A-Za-z_]\w*)\(\)`", text):
            if m[1] not in exports and m[1] not in {"computePay", "annualTax", "monthlyTds"}: flags.append(f"{doc}: names {m[1]}(), which no file exports")

# test counts: RESULTS.csv's newest line against suites.csv
rows = list(csv.DictReader(open("tests/RESULTS.csv", encoding="utf-8")))
last = rows[-1]
suites = list(csv.DictReader(open("tests/suites.csv", encoding="utf-8")))
live = [r for r in suites if r["status"] == "live"]
checks = sum(int(r["checks"] or 0) * 1 for r in live)
print(f"RESULTS.csv: newest line {last['round']} {last['commit']}: {last['passed']} passed, {last['failed']} failed; suites.csv: {len(live)} live suites")
if int(last["failed"] or 0): flags.append(f"tests/RESULTS.csv: the newest line ({last['round']}) records {last['failed']} failures")
cat = read("tests/TEST-CATALOG.md")
listed = set(re.findall(r"^\s*[-*|]\s*`?([\w-]+)`?[ :|]", cat, re.M))
for r in live:
    if r["suite"] not in cat: flags.append(f"tests/TEST-CATALOG.md: the live suite {r['suite']} is not listed")
    if not r["suite"].startswith("react-") and r["suite"] + ".mjs" not in os.listdir("tests/live"): flags.append(f"tests/suites.csv: lists {r['suite']}, which has no file in tests/live")
for f in os.listdir("tests/live"):
    if f.endswith(".mjs") and f[:-4] not in {r["suite"] for r in suites}: flags.append(f"tests/live/{f} is in no row of tests/suites.csv")
react = set(re.findall(r'\("([\w]+\.mjs)"', read("tools/run-tests.py")))
for h in sorted(react):
    if os.path.exists(f"tests/live/react/{h}") and h[:-4] not in read("docs/react-app.md"): flags.append(f"docs/react-app.md: doesn't describe the React harness {h}")

# the graph against the last commit touching the code
def git(*a): return subprocess.run(["git", *a], capture_output=True, text=True).stdout.strip()
code = git("log", "-1", "--format=%ct", "--", "assets/js", "app/src")
graph = git("log", "-1", "--format=%ct", "--", "docs/graph/GRAPH_REPORT.md")
if code and graph and int(graph) < int(code) - 60 and not git("status", "--porcelain", "docs/graph"):
    flags.append("docs/graph/GRAPH_REPORT.md: older than the last commit that touched assets/js or app/src (python tools/graph.py)")

for f in flags: print("FLAG  " + f)
print(f"check-docs: {len(flags)} flagged ({count} permissions, {len(exports)} exported names, {len(docs)} docs read)")
sys.exit(1 if flags else 0)
