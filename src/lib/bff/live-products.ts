import "server-only";
import { revalidateTag } from "next/cache";
import { storeTag } from "@/lib/cache";
import { forwardLive } from "@/lib/bff/live-route";
import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  jsonResponse,
  unavailableResponse,
  upstreamFetch,
} from "@/lib/bff/upstream";
import { isModuleLive } from "@/mocks/runtime";
import { productTemplateSchema } from "@/features/products/schemas/templates";

/**
 * The isolated live toggle of M04 Products (integration Step 2, 2026-10-22).
 *
 * `SHARWA_LIVE_MODULES=…,products` (or `SHARWA_MOCKS=off`) sends every Phase A products route
 * to Django; anything else keeps the fixture. It is separate from `catalog` (M05), so the
 * organization module can stay live while products is switched on or off on its own.
 *
 * Why one table instead of `liveOrMock` in each route file: the products routes are up to
 * eight folders deep and all of them already pass through `mockRoute()`, which consults this
 * table first. The table is therefore the single, reviewable map of the BFF → Django contract.
 * The browser hooks, their Zod schemas and every screen stay exactly the same.
 *
 * Phase B (decision D6) is NOT in this table: it has its own switches (below), independent of `products`:
 * `<id>/extras/tier-prices/**` (M36 quantity prices) → `b2b` (INT-044, `B2B_LIVE_RULES`);
 * `import`, `import/<job>`, `import/<job>/run`, `export.csv` and the M37 `<id>/extras/**` (bundle components,
 * compatibility rules, personalization fields, auction + bids, serials) → `advanced_products` (INT-045,
 * `ADVANCED_LIVE_RULES`).
 */
type Rule =
  | { pattern: RegExp; upstream: (m: RegExpMatchArray) => string }
  | { pattern: RegExp; handle: (request: Request, m: RegExpMatchArray) => Promise<Response> };

const ID = "(\\d+)";
const rx = (path: string) => new RegExp(`^/api/bff/products${path}/?$`);

export const PRODUCTS_LIVE_RULES: readonly Rule[] = [
  // Products
  { pattern: rx(""), upstream: () => "/api/v1/products/" },
  { pattern: rx("/quick"), upstream: () => "/api/v1/products/quick/" },
  { pattern: rx("/bulk"), upstream: () => "/api/v1/products/bulk/" },
  { pattern: rx("/formula-preview"), upstream: () => "/api/v1/products/formula-preview/" },
  { pattern: rx(`/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/` },
  { pattern: rx(`/${ID}/changes`), upstream: (m) => `/api/v1/products/${m[1]}/changes/` },
  { pattern: rx(`/${ID}/stock`), upstream: (m) => `/api/v1/products/${m[1]}/stock/` },
  // Images — ONE file per request (the editor uploads sequentially; Nginx caps a request at 8 MB)
  { pattern: rx(`/${ID}/images`), upstream: (m) => `/api/v1/products/${m[1]}/images/` },
  { pattern: rx(`/${ID}/images/reorder`), upstream: (m) => `/api/v1/products/${m[1]}/images/reorder/` },
  { pattern: rx(`/${ID}/images/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/images/${m[2]}/` },
  // Variants
  { pattern: rx(`/${ID}/variants/generate`), upstream: (m) => `/api/v1/products/${m[1]}/variants/generate/` },
  { pattern: rx(`/${ID}/variants/bulk`), upstream: (m) => `/api/v1/products/${m[1]}/variants/bulk/` },
  // Variant dictionary
  { pattern: rx("/variant-attributes"), upstream: () => "/api/v1/variant-attributes/" },
  { pattern: rx(`/variant-attributes/${ID}`), upstream: (m) => `/api/v1/variant-attributes/${m[1]}/` },
  { pattern: rx(`/variant-attributes/${ID}/options`), upstream: (m) => `/api/v1/variant-attributes/${m[1]}/options/` },
  { pattern: rx(`/variant-attributes/options/${ID}`), upstream: (m) => `/api/v1/variant-attributes/options/${m[1]}/` },
  // Templates + central sectors
  { pattern: rx("/templates"), upstream: () => "/api/v1/product-templates/" },
  { pattern: rx(`/templates/${ID}`), upstream: (m) => `/api/v1/product-templates/${m[1]}/` },
  { pattern: rx(`/templates/${ID}/apply-global`), upstream: (m) => `/api/v1/product-templates/${m[1]}/apply-global/` },
  { pattern: rx(`/templates/${ID}/apply`), handle: (request, m) => applyTemplateLive(request, Number(m[1])) },
  { pattern: rx("/global-templates"), upstream: () => "/api/v1/global-variant-templates/" },
];

/**
 * M36 quantity prices from the product editor (INT-044, `api/views_b2b.py`): the extras sub-resource
 * `tier-prices` maps 1:1 to `/api/v1/products/<id>/tier-prices/[<tier_id>/]`. Switched by the `b2b`
 * module, so it can go live without the rest of the M37 extras (INT-045).
 */
export const B2B_LIVE_RULES: readonly Rule[] = [
  { pattern: rx(`/${ID}/extras/tier-prices`), upstream: (m) => `/api/v1/products/${m[1]}/tier-prices/` },
  { pattern: rx(`/${ID}/extras/tier-prices/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/tier-prices/${m[2]}/` },
];

/**
 * M37 advanced products + CSV import/export (INT-045, `api/views_product_extras.py`). Each extras sub-resource maps
 * 1:1 to `/api/v1/products/<id>/<resource>/…`; the export keeps the list filters in the query string.
 */
const JOB = "([\\w-]+)";
export const ADVANCED_LIVE_RULES: readonly Rule[] = [
  { pattern: rx(`/${ID}/extras/bundle-components`), upstream: (m) => `/api/v1/products/${m[1]}/bundle-components/` },
  { pattern: rx(`/${ID}/extras/bundle-components/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/bundle-components/${m[2]}/` },
  { pattern: rx(`/${ID}/extras/compatibility-rules`), upstream: (m) => `/api/v1/products/${m[1]}/compatibility-rules/` },
  { pattern: rx(`/${ID}/extras/compatibility-rules/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/compatibility-rules/${m[2]}/` },
  { pattern: rx(`/${ID}/extras/personalization-fields`), upstream: (m) => `/api/v1/products/${m[1]}/personalization-fields/` },
  { pattern: rx(`/${ID}/extras/personalization-fields/reorder`), upstream: (m) => `/api/v1/products/${m[1]}/personalization-fields/reorder/` },
  { pattern: rx(`/${ID}/extras/personalization-fields/${ID}`), upstream: (m) => `/api/v1/products/${m[1]}/personalization-fields/${m[2]}/` },
  { pattern: rx(`/${ID}/extras/auction`), upstream: (m) => `/api/v1/products/${m[1]}/auction/` },
  { pattern: rx(`/${ID}/extras/auction/bids`), upstream: (m) => `/api/v1/products/${m[1]}/auction/bids/` },
  { pattern: rx(`/${ID}/extras/serials`), upstream: (m) => `/api/v1/products/${m[1]}/serials/` },
  // CSV import (three stages) + export with the list filters
  { pattern: rx("/import"), upstream: () => "/api/v1/products/import/" },
  { pattern: rx(`/import/${JOB}`), upstream: (m) => `/api/v1/products/import/${m[1]}/` },
  { pattern: rx(`/import/${JOB}/run`), upstream: (m) => `/api/v1/products/import/${m[1]}/run/` },
  { pattern: rx("/export\\.csv"), upstream: () => "/api/v1/products/export/" },
];

/** The Django answer for a live products route, or `null` (module off / Phase B → fixture). */
export async function dispatchLiveProducts(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/bff/products")) return null;
  for (const [module, rules] of [["b2b", B2B_LIVE_RULES], ["advanced_products", ADVANCED_LIVE_RULES]] as const) {
    if (!isModuleLive(module)) continue;
    for (const rule of rules) {
      const m = pathname.match(rule.pattern);
      if (m) return "upstream" in rule ? forwardLive(request, rule.upstream(m)) : rule.handle(request, m);
    }
  }
  if (!isModuleLive("products")) return null;
  for (const rule of PRODUCTS_LIVE_RULES) {
    const m = pathname.match(rule.pattern);
    if (!m) continue;
    return "upstream" in rule ? forwardLive(request, rule.upstream(m)) : rule.handle(request, m);
  }
  return null;
}

/**
 * «تطبيق على منتجات» (decision D7 — a frontend-only UX feature, no Django endpoint): read the
 * template from Django, then PATCH each product with exactly the template's `fields` plus the
 * `blueprint_id` link. Sequential on purpose: each PATCH is atomic in Django and keeps its own
 * validation (an active auction refuses the change, with its Arabic reason in the report).
 * The response is the same `ApplyTemplateResult` the mock returns.
 */
async function applyTemplateLive(request: Request, templateId: number): Promise<Response> {
  const ctx = contextFromRequest(request);
  const body = (await request.json().catch(() => ({}))) as { product_ids?: unknown };
  const ids = Array.isArray(body.product_ids)
    ? [...new Set(body.product_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  if (ids.length === 0) return jsonResponse({ product_ids: ["اختر منتجاً واحداً على الأقل."] }, { status: 400 });

  try {
    const tRes = await upstreamFetch(request, `/api/v1/product-templates/${templateId}/`, ctx, { method: "GET" });
    if (!tRes.ok) return forwardResponse(tRes);
    const parsed = productTemplateSchema.safeParse(await tRes.json().catch(() => null));
    if (!parsed.success) return jsonResponse({ detail: "تعذّرت قراءة القالب من الخادم." }, { status: 502 });
    const fields = parsed.data.fields;
    const payload = JSON.stringify({ ...fields, blueprint_id: templateId });

    let applied = 0;
    const skipped: Array<{ id: number; reason: string }> = [];
    for (const id of ids) {
      const res = await upstreamFetch(request, `/api/v1/products/${id}/`, ctx, {
        method: "PATCH",
        body: payload,
        headers: { "content-type": "application/json" },
      });
      if (res.ok) {
        applied += 1;
        continue;
      }
      skipped.push({ id, reason: reasonOf(await res.json().catch(() => null), res.status) });
    }
    if (ctx.store && applied > 0) revalidateTag(storeTag(ctx.store), { expire: 0 });
    return jsonResponse({ applied, skipped, fields: Object.keys(fields) });
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) return unavailableResponse();
    throw err;
  }
}

/** A DRF error body → one Arabic line for the bulk report. */
function reasonOf(body: unknown, status: number): string {
  if (status === 404) return "غير موجود";
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string" && b.detail) return b.detail;
    for (const v of Object.values(b)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      if (typeof v === "string" && v) return v;
    }
  }
  return status === 403 ? "ليست لديك صلاحية" : "تعذّر التطبيق";
}
