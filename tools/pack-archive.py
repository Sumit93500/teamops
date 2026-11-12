# Packs a suite folder (the round folders' t-orig: the .mjs suites, run-suites.ps1 and the frozen baselines js-pre*, html-pre*,
# css-pre* ...) into tests/archive/old-suites.tar.gz, leaving out the live suites (tests/live/*.mjs), the live js copy (js/,
# which the runner copies from assets/js) and node_modules. Identical files are stored once: a repeat is a hard link to the
# first copy, so ~185 MB of baselines pack to a few MB. Members are sorted and their times fixed, so the same input gives
# the same file.
# usage: python tools/pack-archive.py <suite dir> [out.tar.gz]
import gzip, hashlib, io, os, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "tests", "archive", "old-suites.tar.gz")
live = {f for f in os.listdir(os.path.join(ROOT, "tests", "live")) if f.endswith(".mjs")}

files = []
for root, dirs, names in os.walk(src):
    rel_root = os.path.relpath(root, src).replace("\\", "/")
    if rel_root == ".":
        dirs[:] = [d for d in dirs if d not in ("js", "node_modules")]
    dirs.sort()
    for n in sorted(names):
        rel = n if rel_root == "." else f"{rel_root}/{n}"
        if rel_root == "." and n in live:
            continue
        files.append(rel)
files.sort()

first = {}   # sha256 -> member name
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w", format=tarfile.GNU_FORMAT) as tar:
    for rel in files:
        data = open(os.path.join(src, rel), "rb").read()
        h = hashlib.sha256(data).hexdigest()
        info = tarfile.TarInfo(rel)
        info.mtime, info.mode, info.uid, info.gid, info.uname, info.gname = 0, 0o644, 0, 0, "", ""
        if h in first:
            info.type, info.linkname = tarfile.LNKTYPE, first[h]
            tar.addfile(info)
        else:
            first[h] = rel
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "wb") as f:
    with gzip.GzipFile(filename="", mode="wb", fileobj=f, compresslevel=9, mtime=0) as gz:
        gz.write(buf.getvalue())
print(f"{len(files)} files, {len(first)} distinct; {os.path.getsize(out) / 1e6:.2f} MB -> {out}")
