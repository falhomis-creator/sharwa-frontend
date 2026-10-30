"""Build docs/api/openapi/sharwa-v1.yaml — Phase 003, DOC-007/008/013 (hybrid strategy, docs/api/openapi/README.md).

    python scripts/openapi/build.py [path-to-sharwa_saas]        # write sharwa-v1.yaml
    python scripts/openapi/build.py [path-to-sharwa_saas] --check # fail if the committed file is stale

1. Route inventory: every path() of sharwa_saas/api/urls.py (route_inventory.py) → one operation per HTTP
   method, as a `stub` (route, methods, module, domain, live key, derived security, Django view).
2. Hand-written fragments: docs/api/openapi/src/00-base.yaml (info, servers, security, shared components) and
   one src/NN-<domain>.yaml per documented domain (`components` + `operations` keyed "METHOD /api/v1/path/").
   A fragment operation is merged onto its stub and marked `documented`; a fragment operation whose route is
   no longer in urls.py FAILS the build (Django removed or renamed it — the doc must follow).
3. Fixture examples: docs/api/openapi/examples/<operationId>.<status>.<ext> (scripts/openapi-examples.ts) are
   attached as `externalValue` examples.
Requires PyYAML (installed with the Django requirements' toolchain: `pip install pyyaml` if missing).
"""
import collections, json, os, pathlib, re, sys
import yaml

HERE = pathlib.Path(__file__).resolve().parent
FRONT = HERE.parents[1]                      # sharwa-frontend
OAS_DIR = FRONT / "docs/api/openapi"
OUT = OAS_DIR / "sharwa-v1.yaml"
sys.path.insert(0, str(HERE))
from route_inventory import inventory, DEFAULT_SAAS  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith("--")]
CHECK = "--check" in sys.argv
routes = inventory(args[0] if args else DEFAULT_SAAS)

DOMAINS = {
 1: ("01-public-onboarding", "Public site, onboarding & tenant resolution", "الصفحة الترويجية والتسجيل وحلّ المستأجر"),
 2: ("02-dashboard-shell", "Dashboard shell, auth, overview, search, notifications & multi-store", "هيكل اللوحة والمصادقة والإشعارات"),
 3: ("03-catalog", "Core catalog & advanced products", "الكتالوج الأساسي والمنتجات المتقدمة"),
 4: ("04-orders-returns", "Order management & returns", "إدارة الطلبات والمرتجعات"),
 5: ("05-storefront", "Storefront, purchase journey & PWA", "واجهة المتجر ورحلة الشراء وتطبيق PWA"),
 6: ("06-customers-wallets", "Customers, customer wallets & loyalty", "العملاء ومحافظ العملاء والولاء"),
 7: ("07-marketing-design-partners", "Marketing, storefront design & partners", "التسويق والتصميم والمسوّقون والمؤثرون"),
 8: ("08-finance", "Finance: payments, merchant wallet, expenses & Sharwa Pay", "المالية والمحفظة"),
 9: ("09-b2b", "B2B wholesale", "البيع بالجملة B2B"),
 10: ("10-inventory-locations-procurement", "Inventory, locations & procurement", "المخزون والمواقع والمشتريات"),
 11: ("11-shipping", "Shipping, couriers & Sharwa Ship", "الشحن والمندوبون وشروة شيب"),
 12: ("12-settings-staff-integrations", "Store settings, staff & permissions, domains & integrations", "الإعدادات والفريق والصلاحيات والتكاملات"),
 13: ("13-channels-operations", "Sales channels & operations: inbox, marketplaces, dropshipping, POS, bookings", "القنوات والأسواق والدروبشيبينغ ونقطة البيع والحجوزات"),
 14: ("14-apps-ai-support", "Apps, AI & automation, support", "التطبيقات والذكاء الاصطناعي والدعم"),
 15: ("15-reports", "Reports & analytics", "التقارير والتحليلات"),
 16: ("16-platform-console", "Platform owner console", "لوحة مالك المنصة"),
}
MODULES = {
 "M01": ("INT-001", "Marketing Landing Page", 1), "M02": ("INT-004", "Onboarding Wizard", 1), "M47": ("INT-002", "Tenant Resolution & Guard", 1),
 "M03": ("INT-003", "Dashboard Shell, Auth & Overview", 2), "M43": ("INT-049", "Multi-Store Rollup", 2), "M48": ("INT-008", "Command Palette", 2), "M49": ("INT-009", "Notification Center", 2),
 "M04": ("INT-005", "Products", 3), "M05": ("INT-006", "Catalog Organization", 3), "M37": ("INT-045", "Advanced Products", 3),
 "M06": ("INT-007", "Orders", 4), "M24": ("INT-026", "Returns & RMA", 4),
 "M09": ("INT-011", "Storefront Home & Catalog Listing", 5), "M10": ("INT-012", "Product Detail Page", 5), "M11": ("INT-013", "Cart", 5), "M12": ("INT-014", "Checkout", 5), "M41": ("INT-015", "Order Tracking", 5), "M42": ("INT-029", "Wishlist & Reviews", 5), "M44": ("INT-016", "PWA & Web Push", 5),
 "M07": ("INT-017", "Customers", 6), "M35": ("INT-028", "Customer Wallets & Loyalty Points", 6),
 "M08": ("INT-018", "Theme Customizer", 7), "M13": ("INT-019", "Marketing", 7), "M17": ("INT-034", "Affiliates & Influencers", 7),
 "M14": ("INT-020", "Payments & Merchant Wallet", 8), "M33": ("INT-043", "Expenses", 8), "M40": ("INT-048", "Sharwa Pay", 8),
 "M36": ("INT-044", "B2B Wholesale", 9),
 "M21": ("INT-024", "Inventory", 10), "M22": ("INT-025", "Locations", 10), "M23": ("INT-035", "Suppliers & Purchase Orders", 10),
 "M15": ("INT-021", "Shipping", 11), "M38": ("INT-046", "Courier App", 11), "M39": ("INT-047", "Sharwa Ship", 11),
 "M18": ("INT-022", "Staff & Permissions", 12), "M19": ("INT-023", "Domains & Integrations", 12), "M34": ("INT-010", "Store Settings", 12),
 "M16": ("INT-033", "Point of Sale", 13), "M26": ("INT-036", "Bookings", 13), "M27": ("INT-037", "Unified Inbox & Social Channels", 13), "M28": ("INT-038", "Marketplaces", 13), "M29": ("INT-039", "Dropshipping", 13),
 "M30": ("INT-040", "App Store", 14), "M31": ("INT-041", "Sharwa AI", 14), "M32": ("INT-042", "Support", 14),
 "M25": ("INT-027", "Reports", 15),
 "M20": ("INT-030", "Platform Admin Console", 16), "M45": ("INT-031", "Platform Dues & Sharwa Pay Administration", 16), "M46": ("INT-032", "Plans, Features & Subscriptions", 16),
}
LIVE_KEY = {
 "M04": "products", "M05": "catalog", "M06": "orders", "M48": "search", "M49": "notifications", "M34": "settings", "M07": "customers",
 "M08": "design", "M13": "marketing", "M14": "payments", "M15": "shipping", "M18": "staff", "M19": "integrations", "M21": "inventory",
 "M22": "locations", "M24": "returns", "M25": "reports", "M35": "wallets", "M20": "platform", "M45": "platform_money",
 "M46": "platform_billing", "M16": "pos", "M17": "affiliates", "M23": "procurement", "M26": "bookings", "M27": "channels",
 "M28": "marketplaces", "M29": "dropshipping", "M30": "apps", "M31": "sharwa_ai", "M32": "support", "M33": "expenses", "M36": "b2b",
 "M37": "advanced_products", "M38": "courier", "M39": "sharwa_ship", "M40": "sharwa_pay", "M43": "rollup", "M44": "pwa",
}
DJANGO_FIRST_MODULES = {"M01", "M02", "M03", "M47", "M09", "M10", "M11", "M12", "M41", "M42"}
LIVE_OVERRIDES = [  # (route prefix after /api/v1/, value) — first match wins
 ("webhooks/", "none"),
 ("cart/coupon/", "django-first"), ("cart/contact/", "django-first"), ("cart/restore/", "django-first"), ("cart/", "passthrough"),
 ("pwa/", "passthrough"), ("push/vapid-public-key/", "passthrough"), ("push/subscribe/", "passthrough"), ("push/unsubscribe/", "passthrough"),
 ("wallet/", "django-first"), ("loyalty/balance/", "django-first"), ("loyalty/otp/send/", "django-first"), ("loyalty/redeem/", "django-first"),
 ("catalog/", "django-first"), ("storefront/referral/", "django-first"),
 ("orders/b2b-draft", "passthrough"),
 ("agent/shifts/start/", "passthrough"), ("agent/shifts/end-and-handover/", "passthrough"), ("agent/fulfillments/", "passthrough"),
 ("agent/shipments/<int:shipment_id>/status/", "passthrough"),
]
PUBLIC_PREFIXES = (
 "config/", "catalog/", "cart/", "checkout/", "orders/public/", "orders/track/", "pwa/", "push/vapid-public-key/", "push/subscribe/",
 "push/unsubscribe/", "shopper/", "wishlist/", "store-reviews/", "customers/otp/send/", "wallet/", "loyalty/balance/", "loyalty/otp/send/",
 "loyalty/redeem/", "storefront/referral/", "webhooks/", "public/", "market-categories/", "register", "auth/csrf/", "auth/merchant/login/",
 "auth/staff/login/", "auth/merchant/forgot-password/", "auth/merchant/reset-password/", "auth/merchant/setup-password/",
 "sharwa-pay/otp/", "platform/auth/login/", "onboarding/", "orders/<uuid:public_uuid>/receipt/",
)

def live_key(rel, module):
    for p, v in LIVE_OVERRIDES:
        if rel.startswith(p):
            return v
    if module in DJANGO_FIRST_MODULES:
        return "django-first"
    return LIVE_KEY.get(module, "django-first")

def security_for(rel, module, method):
    unsafe = method in ("POST", "PUT", "PATCH", "DELETE")
    if rel.startswith(PUBLIC_PREFIXES):
        return [{"csrfHeader": []}] if unsafe and (rel.startswith(("auth/", "platform/auth/", "sharwa-pay/otp/"))) else []
    if module in ("M20", "M45", "M46"):
        s = "consoleSession"
    elif module == "M40":
        s = "sharwaPaySession"
    else:
        s = "storeSession"
    return [{s: [], "csrfHeader": []}] if unsafe else [{s: []}]

CONVERTERS = {"int": {"type": "integer"}, "str": {"type": "string"}, "slug": {"type": "string", "pattern": "^[-a-zA-Z0-9_]+$"},
              "uuid": {"type": "string", "format": "uuid"}, "path": {"type": "string"}}

def oa_path(p):
    params = []
    def rep(m):
        conv, name = (m.group(1) or "str"), m.group(2)
        params.append({"name": name, "in": "path", "required": True, "schema": dict(CONVERTERS.get(conv, {"type": "string"}))})
        return "{" + name + "}"
    return re.sub(r"<(?:(\w+):)?(\w+)>", rep, p), params

def mtag(m):
    return f"{m} {MODULES[m][1]}"

def dtag(d):
    return f"D{d:02d} {DOMAINS[d][1]}"

# ---------------------------------------------------------------- base + fragments
def load(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}

doc = load(OAS_DIR / "src/00-base.yaml")
doc.setdefault("tags", []); doc["x-tagGroups"] = []; doc["paths"] = {}
C = doc.setdefault("components", {})
for key in ("securitySchemes", "parameters", "headers", "responses", "schemas"):
    C.setdefault(key, {})
fragments = sorted(p for p in (OAS_DIR / "src").glob("*.yaml") if p.name != "00-base.yaml")

# tags
by_domain = collections.defaultdict(list)
for m, (intid, name, d) in MODULES.items():
    by_domain[d].append(m)
for d in sorted(DOMAINS):
    slug, en, ar = DOMAINS[d]
    doc["tags"].append({"name": dtag(d), "description": f"{en} — {ar}. Domain page: docs/api/domains/{slug}/", "x-domain": d})
    for m in sorted(by_domain[d]):
        intid, name, _ = MODULES[m]
        doc["tags"].append({"name": mtag(m), "description": f"{name} ({intid}). Live key: `{LIVE_KEY.get(m, 'django-first')}`.", "x-domain": d, "x-module": m, "x-int": intid})
    doc["x-tagGroups"].append({"name": dtag(d), "tags": [dtag(d)] + [mtag(m) for m in sorted(by_domain[d])]})

# ---------------------------------------------------------------- stubs from the inventory
seen_ids = set()
for r in routes:
    rel = r["path"][len("/api/v1/"):]
    path, params = oa_path(r["path"])
    m = r["module"]; d = r["domain"]
    slug = DOMAINS[d][0]
    item = doc["paths"].setdefault(path, {})
    if params and "parameters" not in item:
        item["parameters"] = params
    methods = r["methods"] or []
    if not methods:  # ExpenseDetailView: every method answers 405 (FR-33.06)
        item["x-sharwa-note"] = "Expenses are never edited or deleted (FR-33.06): every method answers 405."
        continue
    for meth in methods:
        opid = f"{r['name']}.{meth.lower()}"
        assert opid not in seen_ids, opid
        seen_ids.add(opid)
        op = {
         "operationId": opid,
         "summary": r["summary"] or r["name"],
         "tags": [mtag(m)],
         "x-sharwa-status": "stub",
         "x-domain": d, "x-module": m, "x-int": MODULES[m][0],
         "x-live-key": live_key(rel, m),
         "x-view": "sharwa_saas/" + r["view"],
         "x-doc-page": f"docs/api/domains/{slug}/",
         "security": security_for(rel, m, meth),
         "responses": {"default": {"description": f"Not specified yet — documented by the domain step for {m} (docs/api/domains/{slug}/)."}},
        }
        item[meth.lower()] = op

# ---------------------------------------------------------------- merge the domain fragments
problems = []
for frag_path in fragments:
    frag = load(frag_path)
    for name, schema in ((frag.get("components") or {}).get("schemas") or {}).items():
        if name in C["schemas"]:
            problems.append(f"{frag_path.name}: component {name} defined twice")
        C["schemas"][name] = schema
    for key, fields in (frag.get("operations") or {}).items():
        method, _, path = key.partition(" ")
        op = doc["paths"].get(path, {}).get(method.lower())
        if not isinstance(op, dict) or "operationId" not in op:
            problems.append(f"{frag_path.name}: {key} is not in sharwa_saas/api/urls.py (removed or renamed?)")
            continue
        op.update(fields)
        op["x-sharwa-status"] = "documented"
        op["x-doc-page"] = fields.get("x-doc-page") or frag.get("x-doc-page") or op["x-doc-page"]
        op["x-source-fragment"] = f"docs/api/openapi/src/{frag_path.name}"
if problems:
    sys.exit("openapi build failed:\n  " + "\n  ".join(problems))

# ---------------------------------------------------------------- attach fixture examples (DOC-013)
import os
EX_DIR = str(OAS_DIR / "examples")
MIME = {"json": "application/json", "csv": "text/csv"}
attached = 0
if os.path.isdir(EX_DIR):
    ops_by_id = {op["operationId"]: op for it in doc["paths"].values() for op in it.values() if isinstance(op, dict) and "operationId" in op}
    for fname in sorted(os.listdir(EX_DIR)):
        m = re.match(r"^(.+)\.(\d{3})\.(json|csv)$", fname)
        if not m or m.group(1) not in ops_by_id:
            continue
        op = ops_by_id[m.group(1)]
        resp = op["responses"].get(m.group(2))
        if not resp or "$ref" in resp:
            continue
        content = resp.setdefault("content", {})
        media = content.get(MIME[m.group(3)]) or next(iter(content.values()), None)
        if media is None:
            continue
        media.setdefault("examples", {})["fixture"] = {"summary": "From the mock fixture (src/mocks), parsed with the Zod contract", "externalValue": f"examples/{fname}"}
        attached += 1
doc["info"]["x-examples-attached"] = attached

stats = collections.Counter(op.get("x-sharwa-status") for p in doc["paths"].values() for k, op in p.items() if isinstance(op, dict) and "operationId" in op)
doc["info"]["x-coverage"] = {"routes": len(routes), "operations": sum(stats.values()), "documented": stats["documented"], "stub": stats["stub"]}

class Dumper(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True

text = ("# Sharwa API — OpenAPI 3.1. GENERATED by scripts/openapi/build.py — do not edit by hand:\n"
        "# edit docs/api/openapi/src/*.yaml (or Django, then rebuild). See docs/api/openapi/README.md.\n"
        + yaml.dump(doc, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=160))
# ---------------------------------------------------------------- human-readable route index
INV = OAS_DIR / "route-inventory.md"
lines = ["# Django route inventory — `/api/v1/` (generated)", "",
         "> GENERATED by `scripts/openapi/build.py` from `sharwa_saas/api/urls.py` — do not edit. "
         f"{doc['info']['x-coverage']['routes']} routes · {doc['info']['x-coverage']['operations']} operations · "
         f"{doc['info']['x-coverage']['documented']} documented. Live key legend: a `SHARWA_LIVE_MODULES` key · "
         "`django-first` (no switch; Django answers first, fixture only as fallback) · `passthrough` (Next `/api/v1/*` "
         "transparent passthrough, «Ready» rows) · `none` (not called by Next, e.g. inbound webhooks). "
         "Live keys and security are derived per module in step 02 and verified by each domain step.", ""]
by_mod = collections.defaultdict(list)
for path, item in doc["paths"].items():
    for meth, op in item.items():
        if isinstance(op, dict) and "operationId" in op:
            by_mod[(op["x-domain"], op["x-module"])].append((path, meth.upper(), op))
for d in sorted(DOMAINS):
    slug, en, ar = DOMAINS[d]
    mods = sorted(m for (dd, m) in by_mod if dd == d)
    if not mods:
        continue
    lines += [f"## {d:02d} · {en} — {ar}", ""]
    for m in mods:
        lines += [f"### {m} · {MODULES[m][1]} ({MODULES[m][0]})", "", "| Method | Path | Live key | Status | View | Summary |", "|---|---|---|---|---|---|"]
        for path, meth, op in by_mod[(d, m)]:
            lines.append(f"| {meth} | `{path}` | `{op['x-live-key']}` | {op['x-sharwa-status']} | `{op['x-view'].split('/', 1)[1]}` | {(op.get('summary') or '').replace('|', '¦')} |")
        lines.append("")
inv_text = "\n".join(lines) + "\n"

if CHECK:
    stale = [f.name for f, body in ((OUT, text), (INV, inv_text)) if (f.read_text(encoding="utf-8") if f.exists() else "") != body]
    if stale:
        sys.exit(f"{', '.join(stale)} stale — run: python scripts/openapi/build.py")
    print("sharwa-v1.yaml and route-inventory.md are up to date", json.dumps(doc["info"]["x-coverage"]))
else:
    OUT.write_text(text, encoding="utf-8")
    INV.write_text(inv_text, encoding="utf-8")
    print(json.dumps(doc["info"]["x-coverage"]), "examples attached:", doc["info"].get("x-examples-attached", 0))
