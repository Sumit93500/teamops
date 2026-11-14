# Brief for agent sessions

Read [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) first. The decisions so far are in [DECISIONS.md](DECISIONS.md).

## Standing rules

- **Never run `python -`** in any form, in either shell. Write the script to a file, or use `python -c` with a one-liner.
- **Processes:** never stop a process this session didn't start. Record the id of what you start, and never match on a generic name or flag.
- **New js files:** CRLF line endings, no final newline. The repo is LF in git and CRLF on disk, so compare with `git cat-file --filters`.
- **Commits:**
  - `git commit -F <file>`, ending with the two trailer lines the user gives, verbatim;
  - only the round's own files;
  - never amend, force-push or skip hooks.
- **Pushing:** push only a fully green round, as an ff-only merge to `main`. Then check origin == HEAD (0 0) and that the tree is clean.
- **Deploy:** never touch Render, DNS or any deploy setting. A push outside `app/` redeploys the live static site (see [docs/deploy.md](docs/deploy.md)).
- **Where each round may write:**
  - React page rounds change only `app/`, and prove `assets/` and `pages/` unchanged by hash.
  - Data rounds change `assets/js` additively only.
  - Docs rounds change only the docs, `tests/` and `tools/`.
- **Scope is frozen at the round's brief.** New ideas go to the parking lot. A real scope question stops the round.
- **Messages:** short. Logs go to files and only their summary lines are read. Read files by range.

## Workflow of a round

1. Fetch. Check the branch is clean and HEAD == origin.
2. Build in a scratch copy of the repo, not in the repo.
3. Verify (below).
4. Apply to the repo. Commit, push, verify.
5. Write the round into the notes.

**Every round ends by appending a line to DECISIONS.md, running tools/gen-docs.py, refreshing the graph (python tools/graph.py) and running python tools/check-docs.py, which must flag nothing (docs that name files, functions or permissions that no longer exist, test records that disagree, a graph older than the code).**

## Verification

- **React page rounds:**
  - the hash proof (`assets/`, `pages/` unchanged);
  - `npm run build`;
  - smoke for every route × role;
  - the round's parity harness as every role that sees its pages;
  - the traced gate (it should select no suite);
  - screenshots at 412 and 1280, light and dark, looked at by eye;
  - from D2a on, pixels against the app's own baseline, not the old site: `node Target/tools/react/xbase.mjs compare <dist> <repo> Target/baselines/<the newest round> <out>` (ALLOW = the round's pages). Text, behaviour and role access still match the old pages.

  No mutants.
- **Data rounds:** the lean order. That is the traced gate (only the suites whose inputs changed), the changed rules' mutants, then one full run in 3 time zones after apply.
  - The gate lives in the workspace: `python Target/tools/speed/gate/gate.py select <build tree>` names the live suites to run; `python Target/tools/speed/gate/gate.py rebuild` (a traced full run on the clean repo) refreshes its map after a data round.
- **The live suites in the repo:** `tests/run.cmd` or `sh tests/run.sh` (`python tools/run-tests.py`). It prints passed / failed (total) per area; add `--react` for the React harnesses.
- **After a run:** `python tools/gen-docs.py --run tests/.out --label "<round>" --result "<round>,<date>,<commit>,<passed>,<failed>,<total>,<note>"` refreshes the catalog, the cases and RESULTS.csv.

## Where things live

| what | where |
|---|---|
| live suites, React harnesses | `tests/live/`, `tests/live/react/` |
| static-page suites, frozen baselines | `tests/archive/old-suites.tar.gz` (unpacked into `tests/.suites` by the runner) |
| test records | `tests/TEST-CATALOG.md`, `tests/cases/*.csv`, `tests/index.html`, `tests/RESULTS.csv` |
| the code graph | `docs/graph.md` (how to regenerate), `docs/graph/` |
| the round tooling (outside the repo) | the workspace's `tools/speed` (select.py, mk-shards, parN), `tools/edge` (Edge checks, xmap), `tools/react` (harness builder, html2jsx.py), and `Target/tools/round-recipe.md` |
| round notes (outside the repo) | the workspace's `notes/` (`overnight-summary*.md`, `react-stage-scoping.md`, `react-parking-lot.md`); older rounds in `archive/js-stage/`; a folder map in the workspace's `README.md` |
