"""Kleiner Admin-Client für Home Assistant (Compresio-Werkzeuge).

URL und Token stehen in der lokalen Datei .env (HA_URL, HA_TOKEN; Vorlage: .env.example)
oder in gleichnamigen Umgebungsvariablen – nie im Repository.

Nutzt ausschließlich dokumentierte bzw. vom HA-Frontend verwendete Schnittstellen:
- REST API            (https://developers.home-assistant.io/docs/api/rest)
- WebSocket API       (https://developers.home-assistant.io/docs/api/websocket)
- Supervisor-API über den WebSocket-Befehl "supervisor/api" (wie das Frontend)
- Ingress-Sessions    (wie das Frontend, für Node-RED/Grafana-Weboberflächen)
"""
import asyncio
import itertools
import json
import os
import sys

import requests
import websockets

def _load_env():
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    env = dict(l.strip().split("=", 1) for l in open(path) if "=" in l and not l.lstrip().startswith("#")) if os.path.exists(path) else {}
    env.update({k: v for k, v in os.environ.items() if k in ("HA_URL", "HA_TOKEN")})
    if not env.get("HA_URL") or not env.get("HA_TOKEN"):
        raise SystemExit("HA_URL und HA_TOKEN fehlen (.env anlegen, Vorlage: .env.example)")
    return env


_env = _load_env()
BASE = _env["HA_URL"].rstrip("/")
TOKEN = _env["HA_TOKEN"]
AUTH = f"Bearer {TOKEN}"
WS_URL = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/api/websocket"


def rest(method, path, data=None, timeout=60):
    r = requests.request(method, BASE + path, headers={"Authorization": AUTH}, json=data, timeout=timeout)
    if r.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:500]}")
    try:
        return r.json()
    except ValueError:
        return r.text


class WS:
    """Persistente WebSocket-Verbindung; mehrere Befehle in einer Sitzung."""

    def __init__(self):
        self._ids = itertools.count(1)

    async def __aenter__(self):
        self.ws = await websockets.connect(WS_URL, max_size=64 * 1024 * 1024, open_timeout=30)
        await self.ws.recv()
        await self.ws.send(json.dumps({"type": "auth", "access_token": TOKEN}))
        msg = json.loads(await self.ws.recv())
        if msg.get("type") != "auth_ok":
            raise RuntimeError(f"WS-Auth fehlgeschlagen: {msg}")
        return self

    async def __aexit__(self, *a):
        await self.ws.close()

    async def cmd(self, type_, _timeout=300, **kw):
        i = next(self._ids)
        await self.ws.send(json.dumps({"id": i, "type": type_, **kw}))
        while True:
            msg = json.loads(await asyncio.wait_for(self.ws.recv(), _timeout))
            if msg.get("id") == i and msg.get("type") == "result":
                if not msg.get("success"):
                    raise RuntimeError(f"{type_} fehlgeschlagen: {msg.get('error')}")
                return msg.get("result")

    async def sv(self, endpoint, method="get", data=None, timeout=600):
        """Supervisor-API (z. B. '/addons', '/store/addons/core_mosquitto/install')."""
        kw = {"endpoint": endpoint, "method": method, "timeout": None}
        if data is not None:
            kw["data"] = data
        return await self.cmd("supervisor/api", _timeout=timeout, **kw)


async def _run_many(calls):
    async with WS() as ws:
        out = []
        for c in calls:
            if "type" in c:
                c = dict(c)
                out.append(await ws.cmd(c.pop("type"), **c))
            else:
                out.append(await ws.sv(**c))
        return out


def ws(type_, **kw):
    return asyncio.run(_run_many([{"type": type_, **kw}]))[0]


def sv(endpoint, method="get", data=None):
    return asyncio.run(_run_many([{"endpoint": endpoint, "method": method, "data": data}]))[0]


class Ingress:
    """HTTP-Zugriff auf die Weboberfläche einer App über HA-Ingress."""

    def __init__(self, slug):
        info = sv(f"/addons/{slug}/info")
        self.prefix = BASE + info["ingress_url"].rstrip("/")
        session = sv("/ingress/session", "post")["session"]
        self.s = requests.Session()
        self.s.cookies.set("ingress_session", session)

    def req(self, method, path, **kw):
        r = self.s.request(method, self.prefix + path, timeout=kw.pop("timeout", 60), **kw)
        r.encoding = "utf-8"   # Apps senden oft keinen Zeichensatz → sonst Latin-1 und kaputte Umlaute
        if r.status_code >= 400:
            raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:500]}")
        try:
            return r.json()
        except ValueError:
            return r.text


if __name__ == "__main__":
    # Kurztest / Ad-hoc-Abfrage:  python tools/ha.py sv /addons   |   python tools/ha.py ws get_config
    kind, arg = sys.argv[1], sys.argv[2]
    extra = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    res = sv(arg, **extra) if kind == "sv" else ws(arg, **extra) if kind == "ws" else rest("GET", arg)
    print(json.dumps(res, ensure_ascii=False, indent=1))
