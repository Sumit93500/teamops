# Regenerates the code graph (Graphify, https://github.com/safishamsi/graphify, PyPI package "graphifyy") for app/src,
# assets/js and tools, code only: Graphify's local AST extraction, no model call (API keys are removed from its environment,
# and communities keep their "Community N" names, so no LLM naming runs). See docs/graph.md.
#   docs/graph/GRAPH_REPORT.md   Graphify's report, paths made relative     (committed)
#   docs/graph/hubs.txt          the 25 most connected functions            (committed)
#   docs/graph/raw/              graph.json, graph.html, the analysis files (git-ignored: ~7 MB)
# usage: python tools/graph.py [path ...]     (default: app/src assets/js tools; a path is relative to the repo root)
#        GRAPHIFY=<graphify executable> if it isn't on PATH
import os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "graph")
scope = sys.argv[1:] or ["app/src", "assets/js", "tools"]
exe = os.environ.get("GRAPHIFY") or shutil.which("graphify") or "graphify"
env = {k: v for k, v in os.environ.items() if not re.search(r"API_KEY|_TOKEN$|ANTHROPIC|OPENAI|GEMINI", k)}
env["PYTHONHASHSEED"] = "0"   # graphify pins it for stable communities; set here so it needn't re-exec

with tempfile.TemporaryDirectory() as tmp:
    src = os.path.join(tmp, "officeos")
    for p in scope:
        shutil.copytree(os.path.join(ROOT, p), os.path.join(src, p), ignore=shutil.ignore_patterns("node_modules", "dist", ".*"))
    # run from the temp folder: a cwd holding a select.py would shadow the stdlib module graphify imports
    for args in (["extract", src, "--code-only"], ["cluster-only", src, "--no-label"]):
        subprocess.run([exe, *args], cwd=tmp, env=env, check=True)
    gout = os.path.join(src, "graphify-out")
    os.makedirs(os.path.join(OUT, "raw"), exist_ok=True)
    report = open(os.path.join(gout, "GRAPH_REPORT.md"), encoding="utf-8").read()
    for prefix in (src + os.sep, src.replace("\\", "/") + "/", src):
        report = report.replace(prefix, "")
    open(os.path.join(OUT, "GRAPH_REPORT.md"), "w", encoding="utf-8", newline="\n").write(report)
    hubs = subprocess.run([exe, "god-nodes", "--top", "25", "--graph", os.path.join(gout, "graph.json")], cwd=tmp, env=env,
                          capture_output=True, text=True, encoding="utf-8", check=True).stdout
    open(os.path.join(OUT, "hubs.txt"), "w", encoding="utf-8", newline="\n").write(hubs)
    for f in os.listdir(gout):
        p = os.path.join(gout, f)
        if os.path.isfile(p) and f != "GRAPH_REPORT.md":
            shutil.copyfile(p, os.path.join(OUT, "raw", f))
print(f"docs/graph: GRAPH_REPORT.md, hubs.txt; raw files in docs/graph/raw (git-ignored), scope: {', '.join(scope)}")
