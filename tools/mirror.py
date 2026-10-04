#!/usr/bin/env python3
"""Mirror volam.vinarpg.com into ./site so the game runs fully offline.

Collects every asset the game code can reference (static paths in JS/CSS/HTML,
bare sprite names resolved against img/a/, JXLOOK sheets under img/jx/, and a
few template-built UI paths), then downloads anything missing.

Usage: python3 tools/mirror.py [--refresh-code]
"""
import concurrent.futures as cf
import json
import os
import re
import subprocess
import sys
import urllib.parse

BASE = "https://volam.vinarpg.com/"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
ROOT = os.path.normpath(ROOT)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) offline-mirror"}
EXT = r"png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|woff2?|ttf|otf"
BARE_PREFIXES = ["img/a/", "", "fx/", "img/"]
SHELL = ["index.html", "manifest.json", "sw.js", "robots.txt",
         "edit_map.html", "edit_map.js", "edit_map.css"]
# Cloudflare bot-beacon injected into index.html; useless (and 404s) offline.
CF_BEACON = re.compile(r"<script>\(function\(\)\{function c\(\).*?</script>", re.S)


def get(path):
    # curl (not urllib) so the system trust store is used — works behind TLS-inspecting proxies.
    url = BASE + urllib.parse.quote(path)
    r = subprocess.run(["curl", "-sS", "--retry", "3", "-A", UA["User-Agent"], "-w", "\n%{http_code}", url],
                       capture_output=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"curl failed for {path}: {r.stderr.decode(errors='ignore')}")
    body, _, code = r.stdout.rpartition(b"\n")
    if code == b"404":
        return None
    if code != b"200":
        raise RuntimeError(f"HTTP {code.decode()} for {path}")
    return body


def save(path, data):
    dst = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)


def exists(path):
    p = os.path.join(ROOT, path)
    return os.path.isfile(p) and os.path.getsize(p) > 0


def fetch_code(refresh):
    for p in SHELL:
        if refresh or not exists(p):
            d = get(p)
            if d is not None:
                save(p, d)
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    if CF_BEACON.search(html):
        html = CF_BEACON.sub("", html)
        save("index.html", html.encode("utf-8"))
    code = re.findall(r'(?:src|href)="([^"?#]+\.(?:js|css))["?#]', html)
    for p in code:
        p = p.lstrip("./")
        if refresh or not exists(p):
            d = get(p)
            if d is None:
                print("MISSING code", p)
            else:
                save(p, d)
    return code


def text_files():
    for dp, _, fs in os.walk(ROOT):
        for f in fs:
            if f.endswith((".js", ".css", ".html", ".json")):
                yield os.path.join(dp, f)


def collect():
    full, bare = set(), set()
    for fp in text_files():
        txt = open(fp, encoding="utf-8", errors="ignore").read()
        rel_dir = os.path.relpath(os.path.dirname(fp), ROOT)
        for m in re.finditer(r"[A-Za-z0-9_./-]+\.(?:%s)\b" % EXT, txt):
            s = m.group(0)
            if s.startswith(("http", "//")) or "://" in txt[max(0, m.start() - 8):m.start()]:
                continue
            s = s.lstrip("./") if s.startswith("./") else s
            if "/" in s:
                full.add(s)
            elif fp.endswith(".css") and rel_dir != ".":
                full.add(f"{rel_dir}/{s}")  # url() relative to the stylesheet
            else:
                bare.add(s)
    # JXLOOK sheets -> img/jx/<key>.webp
    out = subprocess.run(
        ["node", "-e", 'global.window={};require(process.argv[1]);'
         'process.stdout.write(JSON.stringify(Object.keys(window.JXLOOK.sheets)))',
         os.path.join(ROOT, "jxlook.js")], capture_output=True, text=True, check=True)
    for k in json.loads(out.stdout):
        full.add(f"img/jx/{k}.webp")
    # Template-built paths found in ui.js / control.js
    full.update(f"ui/s{i}.png" for i in range(5))
    full.update(["ui/input-mouse.svg", "ui/input-joystick.svg",
                 "ui/icons/item-locked.png", "ui/icons/item-unlocked.png"])
    return full, bare


def dl_full(path):
    if exists(path):
        return path, "have"
    d = get(path)
    if d is None:
        return path, "404"
    save(path, d)
    return path, "ok"


def dl_bare(name):
    for pre in BARE_PREFIXES:
        if exists(pre + name):
            return name, "have"
    for pre in BARE_PREFIXES:
        d = get(pre + name)
        if d is not None:
            save(pre + name, d)
            return name, "ok:" + pre
    return name, "404"


def run(fn, items, label):
    stats, missing = {}, []
    with cf.ThreadPoolExecutor(int(os.environ.get("JOBS", 32))) as ex:
        for i, (p, st) in enumerate(ex.map(fn, sorted(items)), 1):
            k = st.split(":")[0]
            stats[k] = stats.get(k, 0) + 1
            if st == "404":
                missing.append(p)
            if i % 500 == 0:
                print(f"  {label}: {i}/{len(items)} {stats}", flush=True)
    print(f"{label}: {stats}")
    return missing


def main():
    fetch_code("--refresh-code" in sys.argv)
    full, bare = collect()
    print(f"refs: {len(full)} full paths, {len(bare)} bare names")
    miss = run(dl_full, full, "full") + run(dl_bare, bare, "bare")
    with open(os.path.join(ROOT, "..", "tools", "missing.txt"), "w") as f:
        f.write("\n".join(sorted(miss)) + "\n")
    print(f"missing (404): {len(miss)} -> tools/missing.txt")


if __name__ == "__main__":
    main()
