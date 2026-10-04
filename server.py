#!/usr/bin/env python3
"""Offline server for Võ Lâm Idle.

Serves ./site on http://localhost:8080 (localhost also unlocks the in-game
"Thử nghiệm" admin panel and "Biên tập map" link) and implements the map
editor's save endpoint: POST /__admin/maps/save {mapId, obs}.

Usage: python3 server.py [port]
"""
import http.server
import json
import os
import re
import shutil
import sys
import time

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "site")
JMO = os.path.join(SITE, "jmo.js")
BACKUPS = os.path.join(HERE, "backups")
MARKER = re.compile(r"window\.JMO\s*=\s*")


def save_map(map_id, obs):
    src = open(JMO, encoding="utf-8").read()
    m = MARKER.search(src)
    if not m:
        raise ValueError("Định dạng jmo.js không đúng.")
    data = json.loads(src[m.end():].strip().rstrip(";"))
    if map_id not in data:
        raise ValueError(f"Không có map {map_id} trong jmo.js.")
    os.makedirs(BACKUPS, exist_ok=True)
    backup = os.path.join(BACKUPS, f"jmo-{time.strftime('%Y%m%d-%H%M%S')}.js")
    shutil.copy2(JMO, backup)
    data[map_id]["obs"] = obs
    with open(JMO, "w", encoding="utf-8") as f:
        f.write(src[:m.end()] + json.dumps(data, ensure_ascii=False) + ";\n")
    return os.path.relpath(backup, HERE)


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".webp": "image/webp", ".js": "text/javascript",
                      ".woff2": "font/woff2", ".json": "application/json"}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SITE, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_POST(self):
        if self.path.split("?")[0].rstrip("/") != "/__admin/maps/save":
            self.send_error(404)
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            map_id, obs = str(body["mapId"]), body["obs"]
            if not isinstance(obs, str):
                raise ValueError("obs phải là chuỗi.")
            res, code = {"ok": True, "backup": save_map(map_id, obs)}, 200
        except Exception as e:  # report any failure back to the editor UI
            res, code = {"ok": False, "error": str(e)}, 400
        out = json.dumps(res, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Võ Lâm Idle: http://localhost:{port}/  (Ctrl+C để dừng)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
