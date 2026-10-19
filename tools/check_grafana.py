"""Führt alle Abfragen des Grafana-Dashboards über die Grafana-API aus und meldet Fehler/leere Panels."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import ha  # noqa: E402

ig = ha.Ingress("a0d7b954_grafana")
dash = ig.req("GET", "/api/dashboards/uid/kompressorraum")["dashboard"]
source = sys.argv[1] if len(sys.argv) > 1 else "sim"
now = int(time.time() * 1000)
bad = 0
for p in dash["panels"]:
    if p["type"] == "row":
        continue
    tf = p.get("timeFrom") or "3h"
    mult = {"m": 60, "h": 3600, "d": 86400, "y": 31536000}[tf[-1]]
    frm = now - int(tf[:-1]) * mult * 1000
    queries = []
    for t in p["targets"]:
        qq = t["query"].replace("$source", source).replace("$__interval", "1m")
        queries.append(dict(t, query=qq, intervalMs=60000, maxDataPoints=500))
    res = ig.req("POST", "/api/ds/query", json={"queries": queries, "from": str(frm), "to": str(now)})
    out = []
    for ref, r in res["results"].items():
        if r.get("error"):
            out.append(f"{ref}: FEHLER {r['error'][:120]}")
            bad += 1
            continue
        n = sum(len(f["data"]["values"][0]) if f.get("data", {}).get("values") else 0 for f in r.get("frames", []))
        out.append(f"{ref}: {n} Werte")
    print(f"{p['title'][:48]:<48} {'; '.join(out)}")
print("FEHLER:", bad)
