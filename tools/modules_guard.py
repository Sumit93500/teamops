# Keeps a folder's node_modules from being emptied (CV1c, 2026-11-22).
#
# Why: `npm ci` deletes node_modules first and installs second. tools/run-tests.py used to run it in place in app/ (and in tests/) on every
# --react run, so a run that was stopped, timed out, hit a locked file on Windows (EBUSY / EPERM on a native .node file another process
# held) or lost the network between the delete and the end of the install left the folder empty or half-written. app/node_modules was
# found empty at the start of CV1b that way (cause shown in DECISIONS.md, CV1c).
#
# What this does instead:
#   complete(folder)  every dependency in folder/package.json is on disk with the pinned version (a package.json is there to read);
#   ensure(folder)    a complete node_modules is left exactly as it is (nothing runs); otherwise the install happens in a temporary folder
#                     beside copies of package.json and package-lock.json, is checked there, and only then moved into place. If anything
#                     fails the folder's own node_modules is not touched: whatever was there stays, and the error says what happened.
# usage: python tools/modules_guard.py ensure <folder>      installs only when needed; exit 1 and a reason on failure
#        python tools/modules_guard.py check <folder>       exit 0 when complete, 1 (with the reason) when not; installs nothing
# OFFICEOS_NPM overrides the npm command (the guard's own suite uses a stand-in).
import json, os, shutil, subprocess, sys, tempfile

def wanted(folder):
    pkg = json.load(open(os.path.join(folder, "package.json"), encoding="utf-8"))
    return {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

def problems(folder):
    """Why node_modules in `folder` isn't usable: a list of short reasons, empty when it is complete."""
    nm = os.path.join(folder, "node_modules")
    if not os.path.isdir(nm):
        return ["node_modules is missing"]
    out = []
    for name, ver in sorted(wanted(folder).items()):
        p = os.path.join(nm, *name.split("/"), "package.json")
        try:
            have = json.load(open(p, encoding="utf-8")).get("version")
        except (OSError, ValueError):
            out.append(f"{name} is missing"); continue
        if ver[:1].isdigit() and have != ver:
            out.append(f"{name} is {have}, package.json pins {ver}")
    return out

def complete(folder):
    return not problems(folder)

def ensure(folder, npm=None):
    """Returns "ok" (nothing to do) or "installed". Raises RuntimeError when it can't, leaving folder/node_modules as it was."""
    folder = os.path.abspath(folder)
    bad = problems(folder)
    if not bad:
        return "ok"
    npm = npm or os.environ.get("OFFICEOS_NPM") or "npm"
    tmp = tempfile.mkdtemp(prefix="modules-guard-")
    try:
        for f in ("package.json", "package-lock.json"):
            if os.path.exists(os.path.join(folder, f)):
                shutil.copy2(os.path.join(folder, f), os.path.join(tmp, f))
        r = subprocess.run(f"{npm} ci --no-audit --no-fund", cwd=tmp, shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            raise RuntimeError(f"npm ci failed in a temporary folder (exit {r.returncode}); {folder}\\node_modules was not touched. {(r.stdout + r.stderr).strip()[-400:]}")
        after = problems(tmp)
        if after:
            raise RuntimeError(f"the install finished but is not complete ({'; '.join(after[:3])}); {folder}\\node_modules was not touched")
        mine, fresh, old = os.path.join(folder, "node_modules"), os.path.join(tmp, "node_modules"), os.path.join(tmp, "previous-node_modules")
        had = os.path.exists(mine)
        if had:
            shutil.move(mine, old)
        try:
            shutil.move(fresh, mine)
        except Exception:
            if had and not os.path.exists(mine):
                shutil.move(old, mine)   # put back what was there
            raise
        return "installed"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def main(argv):
    if len(argv) != 3 or argv[1] not in ("ensure", "check"):
        print("usage: modules_guard.py ensure|check <folder>"); return 2
    folder = argv[2]
    if argv[1] == "check":
        bad = problems(folder)
        print("complete" if not bad else "; ".join(bad))
        return 1 if bad else 0
    try:
        print(ensure(folder))
        return 0
    except RuntimeError as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main(sys.argv))
