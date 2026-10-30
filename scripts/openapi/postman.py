"""Build docs/api/postman/sharwa.postman_collection.json from sharwa-v1.yaml — Phase 003, DOC-010/012.

    python scripts/openapi/postman.py           # write the collection
    python scripts/openapi/postman.py --check   # fail if the committed collection is stale

Layout (docs/api/postman/README.md): three origin folders so cookies never mix (inventory A.4) →
domain folders (16 in total) → module folders (M01–M49) → one request per operation of the OpenAPI file.
Documented operations carry their fixture examples (docs/api/openapi/examples/) and their verbatim Arabic
error answers as saved responses; stubs carry the route, gates-so-far and live key in their description.
The collection pre-request script is docs/api/postman/csrf-pre-request.js (CSRF + Idempotency-Key).
"""
import json, pathlib, re, sys, uuid
import yaml

HERE = pathlib.Path(__file__).resolve().parent
FRONT = HERE.parents[1]
OAS = FRONT / "docs/api/openapi"
OUT = FRONT / "docs/api/postman/sharwa.postman_collection.json"
PRE = FRONT / "docs/api/postman/csrf-pre-request.js"
CHECK = "--check" in sys.argv

spec = yaml.safe_load((OAS / "sharwa-v1.yaml").read_text(encoding="utf-8"))
tag_desc = {t["name"]: t for t in spec["tags"]}

CONSOLE = {"M20", "M45", "M46"}
PLATFORM = {"M01", "M02", "M40"}
ORIGINS = [
    ("store", "1 · Store host — <store>.<base>",
     "Every store-schema route: storefront (visitor session), dashboard (owner / staff session), courier app. "
     "Environment: local-store / staging-store. `base_url` = the store host, or a public host + `x_store_domain`."),
    ("platform", "2 · Platform origin — <base> (public schema)",
     "Landing, onboarding and the Sharwa Pay customer wallet. Environment: local-platform / staging-platform. "
     "`x_store_domain` must stay empty (Sharwa Pay answers 404 on a store host or with X-Store-Domain)."),
    ("console", "3 · Platform console API — public schema",
     "M20/M45/M46 console routes (Django admin session: superuser = «مالك المنصة», is_staff = «مشرف تشغيلي»). "
     "Environment: local-console / staging-console. `x_store_domain` must stay empty (404 otherwise)."),
]
STABLE_NS = uuid.UUID("6f1d6c1e-8a39-4b2a-9d47-5a3b0c1d2e4f")


def sid(*parts):
    """Deterministic ids so regenerating does not churn the file."""
    return str(uuid.uuid5(STABLE_NS, "/".join(parts)))


def origin_of(module):
    return "console" if module in CONSOLE else "platform" if module in PLATFORM else "store"


def url_for(path, origin):
    pm_path = re.sub(r"\{(\w+)\}", r":\1", path)
    segs = [s for s in pm_path.strip("/").split("/")]
    variables = [{"key": s[1:], "value": "", "description": "path parameter"} for s in segs if s.startswith(":")]
    return {"raw": "{{base_url}}" + pm_path, "host": ["{{base_url}}"], "path": segs + [""], "variable": variables}


def first_msg(text):
    m = re.search(r"«([^»]+)»", text or "")
    return m.group(1) if m else None


def request_for(path, method, op, origin):
    unsafe = method in ("POST", "PUT", "PATCH", "DELETE")
    headers = [{"key": "Accept", "value": "application/json"}]
    if origin == "store":
        headers.append({"key": "X-Store-Domain", "value": "{{x_store_domain}}", "description": "Empty = resolve the store from the host. Set it when base_url is a public host."})
    if unsafe:
        headers.append({"key": "X-CSRFToken", "value": "{{csrf_token}}", "description": "Filled by the collection pre-request script (fresh token from /api/v1/auth/csrf/)."})
        headers.append({"key": "Idempotency-Key", "value": "{{idempotency_key}}", "description": "New UUID per send; only routes that support idempotency read it (docs/api/overview/idempotency.md)."})
    req = {"method": method, "header": headers, "url": url_for(path, origin)}
    if unsafe:
        rb = (op.get("requestBody") or {}).get("content") or {}
        if "application/json" in rb:
            example = rb["application/json"].get("example", {})
            req["body"] = {"mode": "raw", "raw": json.dumps(example, ensure_ascii=False, indent=2), "options": {"raw": {"language": "json"}}}
            headers.append({"key": "Content-Type", "value": "application/json"})
        elif "multipart/form-data" in rb:
            req["body"] = {"mode": "formdata", "formdata": []}
        elif op.get("x-sharwa-status") == "stub":
            req["body"] = {"mode": "raw", "raw": "{}", "options": {"raw": {"language": "json"}}}
            headers.append({"key": "Content-Type", "value": "application/json"})
    status = op.get("x-sharwa-status")
    sec = op.get("security") or []
    sec_txt = ", ".join(" + ".join(s.keys()) for s in sec) or "none (public)"
    desc = [op.get("description") or "",
            "",
            f"- **Status**: `{status}` · **Live key**: `{op.get('x-live-key')}` · **Module**: {op.get('x-module')} ({op.get('x-int')})",
            f"- **Security**: {sec_txt}",
            f"- **Django view**: `{op.get('x-view')}`",
            f"- **Docs**: `{op.get('x-doc-page')}`"]
    if status == "stub":
        desc.append("- Body, query parameters and responses are documented by the domain step; the derived security is verified there.")
    req["description"] = "\n".join(desc).strip()
    return req


def saved_responses(op, req, opid):
    out = []
    for code, resp in (op.get("responses") or {}).items():
        if not re.fullmatch(r"\d{3}", str(code)) or "$ref" in resp:
            continue
        body, lang, headers = None, "json", [{"key": "Content-Type", "value": "application/json"}]
        for media_type, media in (resp.get("content") or {}).items():
            ext = (media.get("examples") or {}).get("fixture", {}).get("externalValue")
            if ext:
                body = (OAS / ext).read_text(encoding="utf-8").rstrip("\n")
                if media_type == "text/csv":
                    lang, headers = "text", [{"key": "Content-Type", "value": "text/csv; charset=utf-8"}]
                break
        if body is None:
            msg = first_msg(resp.get("description"))
            if not msg:
                continue
            body = json.dumps({"detail": msg}, ensure_ascii=False, indent=2)
        hdr = resp.get("headers") or {}
        if "Retry-After" in hdr:
            headers.append({"key": "Retry-After", "value": "300"})
        out.append({"id": sid(opid, str(code)), "name": f"{code} · {resp.get('description', '')[:80]}", "originalRequest": req,
                    "status": str(code), "code": int(code), "_postman_previewlanguage": lang, "header": headers, "body": body})
    return out


tree = {o[0]: {} for o in ORIGINS}  # origin → domain tag → module tag → [items]
for path, item in spec["paths"].items():
    for method, op in item.items():
        if not isinstance(op, dict) or "operationId" not in op:
            continue
        m, d = op["x-module"], op["x-domain"]
        dt = next(t for t in spec["x-tagGroups"] if t["tags"][1:] and op["tags"][0] in t["tags"])["name"]
        origin = origin_of(m)
        req = request_for(path, method.upper(), op, origin)
        name = f"{method.upper()} {path.replace('/api/v1', '')} — {op.get('summary', '')}"[:160]
        entry = {"id": sid(op["operationId"]), "name": name, "request": req, "response": saved_responses(op, req, op["operationId"])}
        if op["operationId"] == "platform-auth-login.post":
            entry["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": [
                "// Console login answers the rotated csrf_token (INT-030): keep it for the next unsafe request.",
                "if (pm.response.code === 200 && pm.response.json().csrf_token) pm.environment.set('csrf_token', pm.response.json().csrf_token);"]}}]
        tree[origin].setdefault(dt, {}).setdefault(op["tags"][0], []).append(entry)


def domain_sort(name):
    return int(name[1:3])


def smoke_request(origin, method, path, body=None, expect=(200,)):
    req = {"method": method, "header": [{"key": "Accept", "value": "application/json"}], "url": url_for(path, origin)}
    if origin == "store":
        req["header"].append({"key": "X-Store-Domain", "value": "{{x_store_domain}}"})
    if method != "GET":
        req["header"] += [{"key": "X-CSRFToken", "value": "{{csrf_token}}"}, {"key": "Content-Type", "value": "application/json"}]
        req["body"] = {"mode": "raw", "raw": json.dumps(body or {}, ensure_ascii=False, indent=2), "options": {"raw": {"language": "json"}}}
    codes = ", ".join(str(c) for c in expect)
    test = [f"pm.test('{method} {path} answers {codes}', () => pm.expect([{codes}]).to.include(pm.response.code));"]
    if path == "/api/v1/platform/auth/login/":
        test.append("if (pm.response.code === 200 && pm.response.json().csrf_token) pm.environment.set('csrf_token', pm.response.json().csrf_token);")
    return {"id": sid("smoke", origin, method, path), "name": f"{method} {path.replace('/api/v1', '')}", "request": req,
            "event": [{"listen": "test", "script": {"type": "text/javascript", "exec": test}}]}


SMOKE = {
    "store": ("0 · Smoke — store (login + authenticated GET)", [
        ("GET", "/api/v1/auth/csrf/", None, (200,)),
        ("POST", "/api/v1/auth/merchant/login/", {"phone": "{{merchant_phone}}", "password": "{{merchant_password}}"}, (204,)),
        ("GET", "/api/v1/auth/me/", None, (200,)),
        ("GET", "/api/v1/reports/", None, (200, 403)),
    ]),
    "platform": ("0 · Smoke — platform origin (public rows)", [
        ("GET", "/api/v1/auth/csrf/", None, (200,)),
        ("GET", "/api/v1/public/plans/", None, (200,)),
    ]),
    "console": ("0 · Smoke — console (login + authenticated GET)", [
        ("POST", "/api/v1/platform/auth/login/", {"username": "{{console_username}}", "password": "{{console_password}}"}, (200,)),
        ("GET", "/api/v1/platform/auth/me/", None, (200,)),
        ("GET", "/api/v1/platform/overview/", None, (200,)),
    ]),
}

items = []
for key, title, desc in ORIGINS:
    smoke_title, smoke_reqs = SMOKE[key]
    domains = [{"id": sid(key, "smoke"), "name": smoke_title,
                "description": "Acceptance run of DOC-011: `npx newman run docs/api/postman/sharwa.postman_collection.json -e <env> --folder \"" + smoke_title + "\"` (fill the secret variables first). Sharwa Pay login needs the WhatsApp code: run otp/send + otp/verify by hand.",
                "item": [smoke_request(key, *r[:2], body=r[2], expect=r[3]) for r in smoke_reqs]}]
    for dt in sorted(tree[key], key=domain_sort):
        mods = []
        for mt in sorted(tree[key][dt]):
            t = tag_desc[mt]
            mods.append({"id": sid(key, dt, mt), "name": mt, "description": t.get("description", ""), "item": tree[key][dt][mt]})
        domains.append({"id": sid(key, dt), "name": dt, "description": tag_desc[dt]["description"], "item": mods})
    items.append({"id": sid(key), "name": title, "description": desc, "item": domains})

collection = {
    "info": {
        "_postman_id": sid("collection"),
        "name": "Sharwa API — /api/v1",
        "description": ("Generated by scripts/openapi/postman.py from docs/api/openapi/sharwa-v1.yaml — do not edit by hand. "
                        "Pick an environment from docs/api/postman/environments/, then sign in with the auth request of the "
                        "origin folder before calling authenticated routes. Guide: docs/api/postman/README.md."),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "event": [{"listen": "prerequest", "script": {"type": "text/javascript", "exec": PRE.read_text(encoding="utf-8").splitlines()}}],
    "variable": [
        {"key": "base_url", "value": "http://noor.localhost:8000", "description": "Overridden by the environment."},
        {"key": "x_store_domain", "value": "", "description": "Optional X-Store-Domain (store folder only)."},
        {"key": "csrf_token", "value": "", "description": "Written by the pre-request script."},
        {"key": "idempotency_key", "value": "", "description": "Written by the pre-request script (new UUID per send)."},
    ],
    "item": items,
}
text = json.dumps(collection, ensure_ascii=False, indent=2) + "\n"
if CHECK:
    if (OUT.read_text(encoding="utf-8") if OUT.exists() else "") != text:
        sys.exit("sharwa.postman_collection.json is stale — run: python scripts/openapi/postman.py")
    print("collection up to date")
else:
    OUT.write_text(text, encoding="utf-8")
    n = sum(len(m["item"]) for o in items for d in o["item"] if not d["name"].startswith("0 ·") for m in d["item"])
    smoke = sum(len(d["item"]) for o in items for d in o["item"] if d["name"].startswith("0 ·"))
    doms = sum(1 for o in items for d in o["item"] if not d["name"].startswith("0 ·"))
    print(f"{n} operation requests + {smoke} smoke requests · {doms} domain folders across {len(items)} origins")
