import "server-only";
import { revalidateTag } from "next/cache";
import { storeTag } from "@/lib/cache";
import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  unavailableResponse,
  upstreamFetch,
} from "@/lib/bff/upstream";
import { isModuleLive } from "@/mocks/runtime";

/**
 * The integration adapter (full-stack integration protocol, step 2) for a BFF row whose
 * Django endpoint has shipped:
 *
 *   mock mode  → the existing fixture handler, unchanged (`x-sharwa-mock: 1`);
 *   live mode  → a transparent passthrough to `upstreamPath` on Django, query string,
 *                cookies, CSRF header, status and body forwarded verbatim.
 *
 * Live mode = `SHARWA_MOCKS=off`, or the module named in `SHARWA_LIVE_MODULES`. Django is
 * the authority in live mode: it answers 401/403 itself, so no Next-side session gate runs
 * (the browser hook, its Zod schema and every screen stay exactly the same).
 *
 * A successful live WRITE drops this store's cached storefront reads, exactly like
 * `mockRoute` does in mock mode (M09 SC-09.2) — otherwise a category renamed or reordered
 * in the dashboard would stay stale on the storefront until `cacheLife` expired.
 *
 * `upstreamPath` is the full Django path with its trailing slash (`/api/v1/reports/`).
 */
export async function liveOrMock(
  request: Request,
  module: string,
  upstreamPath: string,
  mock: () => Promise<Response>,
): Promise<Response> {
  if (!isModuleLive(module)) return mock();
  const ctx = contextFromRequest(request);
  const { search } = new URL(request.url);
  // Buffer the body: a streamed body goes out chunked with no Content-Length, and Django
  // (runserver and gunicorn alike) reads CONTENT_LENGTH — it would see an EMPTY body and
  // answer every write with «required field» errors. 8MB max (DATA_UPLOAD_MAX_MEMORY_SIZE).
  const write = isWrite(request.method);
  const raw = write ? await request.arrayBuffer() : null;
  const body = raw && raw.byteLength > 0 ? raw : null;
  try {
    const res = await upstreamFetch(request, `${upstreamPath}${search}`, ctx, write ? { body } : {});
    if (ctx.store && write && res.ok) {
      revalidateTag(storeTag(ctx.store), { expire: 0 });
    }
    return forwardResponse(res);
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) return unavailableResponse();
    throw err;
  }
}

function isWrite(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}
