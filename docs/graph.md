# Code graph

A map of the code's functions and modules and who calls whom, made with [Graphify](https://github.com/safishamsi/graphify) (PyPI package `graphifyy`, version 0.9.106 when this was made).

## What it covers

- **Scope:** `app/src`, `assets/js` and `tools`. Not node_modules, dist, the test suites or the HTML pages.
- **Size:** 3,050 nodes, 13,546 edges, 96 communities (2026-11-14, refreshed after P4a and P4b together).
- **Code only:** Graphify's local AST extraction, with no model call (its report says "Token cost: 0 input · 0 output").
  - API keys are removed from its environment.
  - Communities are not named by a model, so they stay "Community N".
  - It runs in about 30 s.

## Files

| file | in git | what |
|---|---|---|
| `docs/graph/GRAPH_REPORT.md` | yes | Graphify's report: communities, hubs, surprising links, paths made relative |
| `docs/graph/hubs.txt` | yes | the 25 most connected functions (`el()`, `getUser()`, `formatDay()`, `nameOf()` ...) |
| `docs/graph/raw/graph.json`, `graph.html` | no (`.gitignore`) | the full graph (about 3.5 MB each) and its interactive view; regenerate them locally |

## Regenerate

```bash
python tools/graph.py              # app/src, assets/js and tools (paths as arguments replace that scope)
```

Graphify itself is installed for good in the workspace, outside the repo: `Target/tools/graph/venv` (O2, 2026-11-14; `graphifyy==0.9.106`, the full package set in `Target/tools/graph/requirements.txt`). `tools/graph.py` uses that venv when it is there, so nothing needs to be on PATH. To install it again:

```bash
C:\Python313\python.exe -m venv C:\Users\ASUS\Desktop\Target\tools\graph\venv
C:\Users\ASUS\Desktop\Target\tools\graph\venv\Scripts\python.exe -m pip install -r C:\Users\ASUS\Desktop\Target\tools\graph\requirements.txt
```

On another machine, `uv tool install graphifyy` (or `pipx install graphifyy`) and a `graphify` on PATH work too; `GRAPHIFY=<path to graphify>` overrides both. Then ask the graph, for example `graphify explain "payrollRunFor()" --graph docs/graph/raw/graph.json`, or `graphify affected "can()" --graph docs/graph/raw/graph.json`.

The per-round rule (CLAUDE.md) is to refresh the graph only for the area a round touched. In practice, rerun `python tools/graph.py` (about 30 s) when a round changed code in `app/src`, `assets/js` or `tools`, and skip it otherwise. A run on fewer paths would replace the whole report with a partial one.
