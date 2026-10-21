import "server-only";
import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  upstreamFetch,
  type UpstreamContext,
} from "@/lib/bff/upstream";
import { getCsrfToken } from "@/lib/csrf";

/**
 * Auth adapters (M03 §7, M47 US-47.4).
 *
 * All seven dashboard auth rows are `[NEEDS BACKEND]`: the only thing Django exposes today
 * is HTML form POSTs (`/dashboard/login/` and friends). Those form field names are NOT in
 * `specs/discovery/`, and scraping the templates to learn them is out of bounds
 * (constitution V: no backend logic copied into the frontend), so these adapters do not
 * guess at them. Each one calls the DOCUMENTED TARGET contract — `/api/v1/auth/<path>/`
 * from the inventory — and falls back to the fixture while that route does not exist. The
 * day Django ships it the passthrough answers and nothing else changes.
 *
 * CSRF is the exception and IS implemented against the legacy page, because that needs no
 * field names: the token is read from `Set-Cookie: csrftoken` of `GET /dashboard/login/`
 * (see `src/lib/csrf.ts`).
 */
export { contextFromRequest };

/** Upstream statuses that mean: this endpoint does not exist yet. */
function notShipped(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

export async function tryTargetAuth(
  request: Request,
  path: string,
  ctx: UpstreamContext,
  body: unknown,
): Promise<Response | null> {
  const csrf = request.headers.get("x-csrftoken") ?? (await getCsrfToken(ctx.storeHost, request.headers.get("cookie")));
  try {
    const res = await upstreamFetch(request, `/api/v1/auth/${path}/`, ctx, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
      headers: {
        "content-type": "application/json",
        ...(csrf ? { "x-csrftoken": csrf } : {}),
      },
    });
    if (notShipped(res.status)) return null;
    return forwardResponse(res);
  } catch (err) {
    if (err instanceof UpstreamUnavailableError) return null;
    throw err;
  }
}

/** Read a JSON body without throwing on an empty or malformed one. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
