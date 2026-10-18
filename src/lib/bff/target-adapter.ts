import "server-only";
import { UpstreamUnavailableError, upstreamFetch, type UpstreamContext } from "@/lib/bff/upstream";
import { mockJson } from "@/mocks/runtime";

/**
 * `target → mock` adapters for public `[NEEDS BACKEND]` rows (M02 §7, bff README).
 *
 * The documented target route is always tried first; while Django answers 404/405/501 (not
 * shipped) or is unreachable the caller answers from its fixture. The day the route ships,
 * its answer wins and nothing else changes. Public URLConf, so no `X-Store-Domain`.
 */
function notShipped(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

/** The upstream response, or `null` when the target route does not exist yet. */
export async function tryTarget(
  request: Request,
  path: string,
  ctx: UpstreamContext,
  init: { method: "GET" } | { method: "POST"; json: unknown },
): Promise<Response | null> {
  try {
    const res = await upstreamFetch(request, path, ctx, {
      method: init.method,
      omitStoreHeader: true,
      ...(init.method === "POST"
        ? { body: JSON.stringify(init.json ?? {}), headers: { "content-type": "application/json" } }
        : {}),
    });
    return notShipped(res.status) ? null : res;
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) return null;
    throw err;
  }
}

/** Read a JSON body without throwing on an empty or malformed one. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

type FixtureResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; body: Record<string, unknown>; retryAfter?: number };

/** A fixture result as the DRF-shaped response the real route would send. */
export function fixtureResponse<T>(result: FixtureResult<T>, extraHeaders: Record<string, string> = {}) {
  if (result.ok) return mockJson(result.data, { delay: 250, headers: extraHeaders });
  return mockJson(result.body, {
    status: result.status,
    delay: 250,
    headers: result.retryAfter ? { "retry-after": String(result.retryAfter) } : {},
  });
}
