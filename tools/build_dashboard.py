"""Baut das Compresio-Dashboard (Web Component) und spielt es in Home Assistant ein.

  python tools/build_dashboard.py           # bauen + hochladen (+ einmalig Panel/Ressource registrieren)
  python tools/build_dashboard.py --build   # nur bauen (dashboard/dist/)

Ablauf:
 1. esbuild bündelt dashboard/cards/src/main.js (+ ApexCharts 4.7, MIT) → dashboard/dist/kompressorraum.js
 2. Upload nach /homeassistant/www/kompressorraum/ über die File-Editor-App (Ingress-API)
 3. version.json (Inhalts-Hash) → Loader lädt immer die aktuelle Version
 4. Lovelace-Ressource, Dashboard „Kompressorraum“ (/vereinsheim-kompressorraum), Theme
"""
import asyncio
import hashlib
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "dashboard")
WWW = "/homeassistant/www/kompressorraum"
LOADER_URL = "/local/kompressorraum/kompressorraum-loader.js"

DASH_URL = "vereinsheim-kompressorraum"   # HA verlangt einen Bindestrich; Schema: <ort>-<bereich>
LOVELACE = {"title": "Kompressorraum", "views": [{"title": "Kompressorraum", "path": "kompressor", "type": "panel", "icon": "mdi:air-filter",
                                                   "theme": "Kompressorraum", "cards": [{"type": "custom:kompressorraum-card"}]}]}


def build():
    os.makedirs(os.path.join(D, "dist"), exist_ok=True)
    out = os.path.join(D, "dist", "kompressorraum.js")
    cmd = ["npx", "--yes", "esbuild@0.25.10", os.path.join(D, "cards/src/main.js"), "--bundle", "--format=esm", "--minify",
           "--target=es2022", "--legal-comments=eof", f"--outfile={out}"]
    subprocess.run(cmd, check=True, cwd=ROOT)
    data = open(out, "rb").read()
    version = hashlib.sha1(data).hexdigest()[:12]
    print(f"gebaut: {out} ({len(data) / 1024:.0f} KB), Version {version}")
    return out, version


def upload(path, version):
    import ha
    ig = ha.Ingress("core_configurator")
    ig.s.post(ig.prefix + "/api/newfolder", data={"path": os.path.dirname(WWW), "name": os.path.basename(WWW)}, timeout=30)

    def save(name, text):
        r = ig.s.post(ig.prefix + "/api/save", data={"filename": f"{WWW}/{name}", "text": text}, timeout=120)
        res = r.json()
        if res.get("error"):
            raise RuntimeError(f"{name}: {res.get('message')}")
        print("hochgeladen:", name)

    save("kompressorraum.js", open(path, encoding="utf-8").read())
    save("kompressorraum-loader.js", open(os.path.join(D, "cards/loader.js"), encoding="utf-8").read())
    save("version.json", json.dumps({"version": version}))
    r = ig.s.post(ig.prefix + "/api/save", data={"filename": "/homeassistant/themes/kompressorraum.yaml",
                  "text": open(os.path.join(D, "styles/kompressorraum-theme.yaml"), encoding="utf-8").read()}, timeout=60)
    print("Theme:", r.json().get("message"))
    return ig


async def register(ig):
    """Lovelace-Ressource + Dashboard „Kompressorraum“ + Theme (idempotent)."""
    import ha
    async with ha.WS() as w:
        res = await w.cmd("lovelace/resources")
        if not any(r["url"].split("?")[0] == LOADER_URL for r in res):
            await w.cmd("lovelace/resources/create", res_type="module", url=LOADER_URL)
            print("Lovelace-Ressource registriert")
        boards = await w.cmd("lovelace/dashboards/list")
        if not any(b["url_path"] == DASH_URL for b in boards):
            await w.cmd("lovelace/dashboards/create", url_path=DASH_URL, title="Kompressorraum", icon="mdi:air-filter",
                        show_in_sidebar=True, require_admin=False)
            print("Dashboard „Kompressorraum“ angelegt")
        await w.cmd("lovelace/config/save", url_path=DASH_URL, config=LOVELACE)
        await w.cmd("call_service", domain="frontend", service="reload_themes", service_data={})
        for mode in ("light", "dark"):
            await w.cmd("call_service", domain="frontend", service="set_theme", service_data={"name": "Kompressorraum", "mode": mode})
        print(f"Dashboard /{DASH_URL} gespeichert, Theme gesetzt")


if __name__ == "__main__":
    path, version = build()
    if "--build" in sys.argv:
        sys.exit(0)
    ig = upload(path, version)
    asyncio.run(register(ig))
