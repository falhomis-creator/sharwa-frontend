import type { UpstreamContext } from "@/lib/bff/upstream";
import { mockJson } from "@/mocks/runtime";
import { tenantFixture } from "@/mocks/tenant/config";

/**
 * Mocks for the REAL `/api/v1/*` contract, used in dev when Django is unreachable OR when
 * it answers 404 for a path that has a fixture (an unknown tenant, an endpoint whose data
 * has not been seeded). A row Django *does* have always wins.
 * Keys are the path after `/api/v1/` with a trailing slash. Entries are added per module
 * (T049 adds `config/`, Phase 4 adds `catalog/*` and `cart*`).
 */
type Handler = (request: Request, ctx: UpstreamContext, url: URL) => Promise<Response> | Response | undefined;

const registry: Array<{ test: (path: string) => boolean; handle: Handler }> = [];

export function registerPassthroughMock(test: string | RegExp, handle: Handler) {
  registry.push({
    test: typeof test === "string" ? (p) => p === test : (p) => test.test(p),
    handle,
  });
}

export async function passthroughMock(request: Request, path: string, ctx: UpstreamContext) {
  const url = new URL(request.url);
  for (const entry of registry) {
    if (entry.test(path)) {
      const res = await entry.handle(request, ctx, url);
      if (res) return res;
    }
  }
  return undefined;
}

// --- minimal built-ins -------------------------------------------------------------------

/**
 * Tenant probe. Mirrors `probeStore()` exactly so the server-side probe and the browser
 * (the provisioning poller's `HEAD /api/v1/config/`, later the storefront) never disagree.
 * Django wins whenever it has a row for the host; this only answers 404s and outages.
 */
registerPassthroughMock("config/", (_req, ctx) => {
  if (!ctx.store) {
    return mockJson(
      { detail: "استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain" },
      { status: 403 },
    );
  }
  const fixture = tenantFixture(ctx.store);
  if (!fixture) return mockJson({ detail: "المتجر غير موجود." }, { status: 404 });
  switch (fixture.outcome) {
    case "ok":
      return mockJson(fixture.config);
    case "provisioning":
      return mockJson({ detail: "المتجر قيد التجهيز." }, { status: 503, headers: { "retry-after": "10" } });
    case "inactive":
      return mockJson({ detail: "هذا المتجر غير متاح حالياً." }, { status: 403 });
    case "not_found":
      return mockJson({ detail: "المتجر غير موجود." }, { status: 404 });
  }
});
