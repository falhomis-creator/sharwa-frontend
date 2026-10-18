import "server-only";
import { revalidateTag } from "next/cache";
import { storeTag } from "@/lib/cache";
import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  jsonResponse,
  upstreamFetch,
  type UpstreamContext,
} from "@/lib/bff/upstream";
import { isMocksOn, mockJson, notAvailable } from "@/mocks/runtime";
import { cartSession } from "@/mocks/storefront/passthrough";

/**
 * `target → mock` adapter for the storefront's `[NEEDS BACKEND]` rows (M09–M12, M41).
 *
 * The documented target `/api/v1/...` route is tried first, WITH the store header and the
 * buyer's cookies (the Django session is the buyer's identity — no accounts). While Django
 * answers 404/405/501 (not shipped) or is unreachable, the fixture answers (`x-sharwa-mock: 1`);
 * with `SHARWA_MOCKS=off` the row is 501. The day the route ships, its answer wins.
 */
export interface StorefrontMockContext {
  store: string;
  storeHost: string;
  upstream: UpstreamContext;
  url: URL;
  /** The mock session cart id (stand-in for Django's `sessionid`). */
  cartId: string;
  /** Read the request body once: JSON, or the fields + files of a multipart form. */
  body: () => Promise<{ fields: Record<string, unknown>; files: Record<string, File> }>;
}

function notShipped(status: number) {
  return status === 404 || status === 405 || status === 501;
}

async function readBody(request: Request): Promise<{ fields: Record<string, unknown>; files: Record<string, File> }> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const fields: Record<string, unknown> = {};
    const files: Record<string, File> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") fields[k] = v;
      else if (v.size > 0) files[k] = v;
    }
    return { fields, files };
  }
  try {
    const data: unknown = await request.json();
    return { fields: data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {}, files: {} };
  } catch {
    return { fields: {}, files: {} };
  }
}

export async function storefrontAdapter(
  request: Request,
  targetPath: string,
  mock: (ctx: StorefrontMockContext) => Promise<Response> | Response,
  opts: { invalidatesStore?: boolean } = {},
): Promise<Response> {
  const upstream = contextFromRequest(request);
  if (!upstream.store || !upstream.storeHost) {
    return jsonResponse({ detail: "استخدم النطاق الفرعي للمتجر." }, { status: 404 });
  }
  const url = new URL(request.url);
  const forMock = request.body ? request.clone() : request;
  try {
    const res = await upstreamFetch(request, `${targetPath}${url.search}`, upstream);
    if (!notShipped(res.status)) return forwardResponse(res);
  } catch (err) {
    if (!(err instanceof UpstreamUnavailableError)) throw err;
  }
  if (!isMocksOn()) return notAvailable();

  const session = cartSession(forMock);
  let cached: Awaited<ReturnType<typeof readBody>> | null = null;
  const res = await mock({
    store: upstream.store,
    storeHost: upstream.storeHost,
    upstream,
    url,
    cartId: session.id,
    body: async () => (cached ??= await readBody(forMock)),
  });
  if (opts.invalidatesStore && res.ok) {
    // Stock moved: the cached catalogue of THIS store is stale now (R-02, SC-09.2).
    revalidateTag(storeTag(upstream.store), { expire: 0 });
  }
  if (session.setCookie) res.headers.append("set-cookie", session.setCookie);
  return res;
}

/** A fixture result as the DRF-shaped response the real route would send. */
export function respondMock<T>(
  result: { ok: true; data: T; status?: number } | { ok: false; status: number; body: Record<string, unknown>; retryAfter?: number },
  delay = 160,
): Promise<Response> {
  if (result.ok) return mockJson(result.status === 204 ? null : result.data, { delay, status: result.status });
  return mockJson(result.body, {
    status: result.status,
    delay: Math.min(delay, 120),
    headers: result.retryAfter ? { "retry-after": String(result.retryAfter) } : {},
  });
}
