"""Static route inventory of sharwa_saas/api/urls.py (no Django import, no DB) — Phase 003, DOC-007.

Usage: python scripts/openapi/route_inventory.py [path-to-sharwa_saas] > routes.json
       (default: $SHARWA_SAAS, else the sharwa_saas folder next to sharwa_front, i.e. C:/sharwa_saas)
Parses every `path('…', <module>.<View>.as_view(), name='…')` entry, resolves the HTTP
methods each view class implements (own methods + base classes defined in the same module
or in a known mixin), and the `@extend_schema(summary=…)` text. Module ids come from the
view module (VIEW_MODULE) with class-level overrides for mixed modules.
"""
import ast, json, re, sys, pathlib

API = None
URLS = None

ALIASES = {"views_extras": "views_product_extras"}
VIEW_MODULE = {
    "views_auth": "M03", "views_dashboard": "M03", "views_catalog": "M05", "views_products": "M04",
    "views_onboarding": "M02", "views_orders": "M06", "views_search": "M48", "views_notifications": "M49",
    "views_settings": "M34", "views_checkout": "M12", "views_reports": "M25", "views_public": "M01",
    "views_tracking": "M41", "views_push": "M44", "views_customers": "M07", "views_design": "M08",
    "views_marketing": "M13", "views_payments": "M14", "views_shipping": "M15", "views_staff": "M18",
    "views_integrations": "M19", "views_inventory": "M21", "views_locations": "M22", "views_returns": "M24",
    "views_wallets": "M35", "views_engagement": "M42", "views_platform": "M20", "views_pos": "M16",
    "views_partners": "M17", "views_procurement": "M23", "views_bookings": "M26", "views_channels": "M27",
    "views_marketplaces": "M28", "views_dropshipping": "M29", "views_apps": "M30", "views_sharwa_ai": "M31",
    "views_support": "M32", "views_expenses": "M33", "views_b2b": "M36", "views_product_extras": "M37",
    "views_courier": "M38", "views_sharwa_ship": "M39", "views_sharwa_pay": "M40", "views_rollup": "M43",
    "views_storefront": "M09",
}
# route-prefix overrides for mixed modules (first match wins)
PREFIX_MODULE = [
    ("config/", "M47"), ("webhooks/carrier/", "M15"), ("catalog/products/<int:product_id>/reviews/", "M10"),
    ("catalog/products/<int:product_id>/quote/", "M10"), ("catalog/products/<int:product_id>/auction", "M37"),
    ("catalog/products/<int:product_id>/bids/", "M37"), ("catalog/products/<int:product_id>/slots", "M26"),
    ("catalog/products/<int:product_id>/back-in-stock/", "M42"), ("catalog/products/<int:product_id>/", "M10"),
    ("catalog/", "M09"), ("cart/", "M11"), ("pwa/", "M44"), ("push/", "M44"), ("orders/b2b", "M36"),
    ("returns/", "M24"), ("warehouse/returns", "M24"), ("orders/refunds/", "M24"), ("agent/", "M38"),
    ("customers/otp/send/", "M42"), ("shipping/sharwa-ship/zones/", "M15"), ("orders/<int:pk>/convert-to-pickup/", "M15"),
    ("shipments/<int:pk>/address/", "M15"),
    ("platform/dues", "M45"), ("platform/sharwa-pay", "M45"), ("platform/sharwa-ship", "M45"),
    ("platform/plans", "M46"), ("platform/plan-features", "M46"), ("platform/subscriptions", "M46"),
    ("platform/billing-settings", "M46"), ("platform/apps", "M46"), ("platform/app-billing-overrides", "M46"),
    ("platform/market-categories", "M46"), ("apps/sharwa-ai/", "M31"), ("storefront/referral/", "M17"),
    ("products/<int:product_id>/tier-prices", "M36"), ("products/import", "M37"), ("products/export", "M37"),
    ("merchant/stores/", "M43"),
]
DOMAIN = {
    "M01": 1, "M02": 1, "M47": 1, "M03": 2, "M43": 2, "M48": 2, "M49": 2, "M04": 3, "M05": 3, "M37": 3,
    "M06": 4, "M24": 4, "M09": 5, "M10": 5, "M11": 5, "M12": 5, "M41": 5, "M42": 5, "M44": 5,
    "M07": 6, "M35": 6, "M08": 7, "M13": 7, "M17": 7, "M14": 8, "M33": 8, "M40": 8, "M36": 9,
    "M21": 10, "M22": 10, "M23": 10, "M15": 11, "M38": 11, "M39": 11, "M18": 12, "M19": 12, "M34": 12,
    "M16": 13, "M26": 13, "M27": 13, "M28": 13, "M29": 13, "M30": 14, "M31": 14, "M32": 14, "M25": 15,
    "M20": 16, "M45": 16, "M46": 16,
}
HTTP = ["get", "post", "put", "patch", "delete"]

GENERIC = {
    "ListAPIView": ["get"], "RetrieveAPIView": ["get"], "CreateAPIView": ["post"], "DestroyAPIView": ["delete"],
    "UpdateAPIView": ["put", "patch"], "ListCreateAPIView": ["get", "post"],
    "RetrieveUpdateAPIView": ["get", "put", "patch"], "RetrieveDestroyAPIView": ["get", "delete"],
    "RetrieveUpdateDestroyAPIView": ["get", "put", "patch", "delete"],
}
modules = {}
def load(mod):
    mod = ALIASES.get(mod, mod)
    if mod not in modules:
        src = (API / f"{mod}.py").read_text(encoding="utf-8")
        tree = ast.parse(src)
        classes, funcs, imports = {}, {}, {}
        factories = {}
        for node in tree.body:
            if isinstance(node, ast.ImportFrom) and node.module and node.level == 1:
                for a in node.names:
                    imports[a.asname or a.name] = node.module
            if isinstance(node, ast.FunctionDef):
                inner = [n for n in node.body if isinstance(n, ast.ClassDef)]
                if inner:
                    factories[node.name] = [[n2.name for n2 in c.body if isinstance(n2, ast.FunctionDef) and n2.name in HTTP] for c in inner]
        for node in tree.body:
            if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) and isinstance(node.targets[0], ast.Tuple):
                fn = ast.unparse(node.value.func)
                if fn in factories:
                    summ = None
                    for kw in node.value.keywords:
                        if kw.arg == "summary" and isinstance(kw.value, ast.Constant):
                            summ = kw.value.value
                    for tgt, meths in zip(node.targets[0].elts, factories[fn]):
                        classes[tgt.id] = {"methods": meths, "bases": [], "summary": summ}
            if isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef) and n.name in HTTP]
                bases = [ast.unparse(b) for b in node.bases]
                summary = None
                for d in node.decorator_list:
                    s = ast.unparse(d)
                    m = re.search(r"summary=(['\"])(.*?)\1", s)
                    if m: summary = m.group(2)
                classes[node.name] = {"methods": methods, "bases": bases, "summary": summary}
            elif isinstance(node, ast.FunctionDef):
                meths, summary = [], None
                for d in node.decorator_list:
                    s = ast.unparse(d)
                    if s.startswith("api_view"):
                        meths = [x.lower() for x in re.findall(r"'(\w+)'", s)]
                    m = re.search(r"summary=(['\"])(.*?)\1", s)
                    if m: summary = m.group(2)
                funcs[node.name] = {"methods": meths or ["get"], "summary": summary}
        modules[mod] = (classes, funcs, imports)
    return modules[mod]

def class_methods(mod, cls, seen=None):
    classes, _, imports = load(mod)
    seen = seen or set()
    if cls in GENERIC:
        return GENERIC[cls]
    if cls not in classes:
        if cls in imports and (API / f"{imports[cls]}.py").exists():
            return class_methods(imports[cls], cls, seen)
        return []
    if cls in seen:
        return []
    seen.add(cls)
    out = list(classes[cls]["methods"])
    for b in classes[cls]["bases"]:
        b = b.split(".")[-1]
        out += [m for m in class_methods(mod, b, seen) if m not in out]
    return out

def resolve(mod, view):
    classes, funcs, imports = load(mod)
    if view in classes:
        return mod, classes[view]["summary"], class_methods(mod, view), "class"
    if view in funcs:
        return mod, funcs[view]["summary"], funcs[view]["methods"], "func"
    if view in imports and (API / f"{imports[view]}.py").exists():
        return resolve(imports[view], view)
    return mod, None, [], "?"

def inventory(saas_root):
    """Every path() of api/urls.py → {path, methods, view, name, module, domain, summary}."""
    global API, URLS
    API = pathlib.Path(saas_root) / "api"
    URLS = (API / "urls.py").read_text(encoding="utf-8")
    modules.clear()
    return list(_routes())


def _routes():
    for m in re.finditer(r"path\(\s*'([^']*)'\s*,\s*([\w\.]+?)(?:\.as_view\(([^)]*)\))?\s*,\s*name='([^']+)'", URLS):
        route, ref, as_view_args, name = m.groups()
        parts = ref.split(".")
        if parts[0] == "include" or len(parts) < 2:
            continue
        mod, view = parts[0], parts[1]
        mod = ALIASES.get(mod, mod)
        defmod, summary, methods, _kind = resolve(mod, view)
        module = next((mid for p, mid in PREFIX_MODULE if route.startswith(p)), VIEW_MODULE.get(defmod, VIEW_MODULE.get(mod, "?")))
        yield ({
            "path": "/api/v1/" + route, "methods": [x.upper() for x in methods], "view": f"api/{defmod}.py::{view}",
            "name": name, "module": module, "domain": DOMAIN.get(module), "summary": summary,
        })



import os

# sharwa-frontend/scripts/openapi/route_inventory.py → parents[4] is the folder holding sharwa_front and sharwa_saas.
DEFAULT_SAAS = os.environ.get("SHARWA_SAAS") or str(pathlib.Path(__file__).resolve().parents[4] / "sharwa_saas")

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SAAS
    json.dump(inventory(root), sys.stdout, ensure_ascii=False, indent=1)
