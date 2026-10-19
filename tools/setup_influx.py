"""Legt das InfluxDB-Schema an (über den Chronograf-Proxy der InfluxDB-App).

Idempotent: bestehende Objekte werden übersprungen bzw. die Passwörter neu gesetzt.
Passwörter kommen aus .env (werden bei Bedarf erzeugt).
"""
import os
import re
import secrets
import sys

sys.path.insert(0, os.path.dirname(__file__))
import ha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, ".env")


def load_env():
    env = dict(l.strip().split("=", 1) for l in open(ENV) if "=" in l) if os.path.exists(ENV) else {}
    for k in ("INFLUX_NODERED_PASSWORD", "INFLUX_GRAFANA_PASSWORD"):
        env.setdefault(k, secrets.token_urlsafe(24))
    open(ENV, "w").write("".join(f"{k}={v}\n" for k, v in env.items()))
    os.chmod(ENV, 0o600)
    return env


def influx():
    ig = ha.Ingress("a0d7b954_influxdb")
    ig.s.headers["X-Requested-With"] = "XMLHttpRequest"

    def q(query, db=""):
        res = ig.req("POST", "/chronograf/v1/sources/0/proxy", json={"query": query, "db": db})
        errs = [r["error"] for r in res.get("results", []) if "error" in r]
        if errs:
            raise RuntimeError(f"{query[:80]}… -> {errs}")
        return res

    return q


def main():
    env = load_env()
    q = influx()
    text = open(os.path.join(ROOT, "config/influxdb/schema.influxql")).read()
    text = re.sub(r"\$\{(\w+)\}", lambda m: env[m.group(1)], text)
    text = "\n".join(l for l in text.splitlines() if not l.strip().startswith("--"))
    stmts = re.split(r"\n(?=CREATE|GRANT|DROP)", text.strip())
    for s in (" ".join(x.split()) for x in stmts if x.strip()):
        label = re.sub(r"PASSWORD '[^']*'", "PASSWORD '***'", s)[:90]
        try:
            q(s)
            print("ok   ", label)
        except RuntimeError as e:
            if s.startswith("DROP") and "not found" in str(e):
                print("skip ", label)
            elif "already exists" in str(e):
                if s.startswith("CREATE USER"):
                    user = re.search(r'USER "([^"]+)"', s).group(1)
                    pw = re.search(r"PASSWORD '([^']*)'", s).group(1)
                    q(f"SET PASSWORD FOR \"{user}\" = '{pw}'")
                    print("pw   ", label)
                elif s.startswith("CREATE RETENTION POLICY"):
                    q(s.replace("CREATE RETENTION POLICY", "ALTER RETENTION POLICY", 1).replace(" REPLICATION 1", " REPLICATION 1"))
                    print("alter", label)
                else:
                    print("skip ", label)
            else:
                raise
    for s in ("SHOW RETENTION POLICIES", "SHOW CONTINUOUS QUERIES", "SHOW USERS"):
        res = q(s, "kompressor")
        for ser in res["results"][0].get("series", []):
            if s == "SHOW CONTINUOUS QUERIES" and ser["name"] != "kompressor":
                continue
            print(s, "->", [v[0] for v in ser.get("values", [])])


if __name__ == "__main__":
    main()
