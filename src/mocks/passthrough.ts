import type { UpstreamContext } from "@/lib/bff/upstream";
import { mockJson } from "@/mocks/runtime";

/**
 * Mocks for the REAL `/api/v1/*` contract, used only when Django is unreachable in dev.
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

// Tenant probe: unknown store → 404 like Django's TenantMainMiddleware.
registerPassthroughMock("config/", (_req, ctx) => {
  if (!ctx.store) return mockJson({ detail: "استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain" }, { status: 403 });
  return mockJson({ detail: "المتجر غير موجود." }, { status: 404 });
});
