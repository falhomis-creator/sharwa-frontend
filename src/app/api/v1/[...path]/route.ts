import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  unavailableResponse,
  upstreamFetch,
} from "@/lib/bff/upstream";
import { isMocksOn } from "@/mocks/runtime";
import { passthroughMock } from "@/mocks/passthrough";
// Registers the storefront fixtures (catalog, cart, PWA/push) on the passthrough registry.
import "@/mocks/storefront/passthrough";
import "@/mocks/returns/passthrough";
import "@/mocks/b2b/passthrough";
import "@/mocks/courier/passthrough";

/**
 * Same-origin passthrough for the real `/api/v1/*` contract (contracts/bff-cross-cutting.md §2.1).
 * Transparent: no caching, no body transformation, cookies and Retry-After forwarded verbatim.
 *
 * Two dev-only exceptions, both gated on `SHARWA_MOCKS=on` and both marked `x-sharwa-mock: 1`:
 * Django unreachable, and Django answering 404 for a path that has a registered fixture (an
 * unseeded tenant). Anything Django actually serves wins — the backend stays the authority (V).
 */
async function handle(request: Request, { params }: RouteContext<"/api/v1/[...path]">) {
  const { path } = await params;
  const segments = path.join("/");
  const url = new URL(request.url);
  const targetPath = `/api/v1/${segments}${segments.endsWith("/") ? "" : "/"}${url.search}`;
  const mockPath = `${segments.replace(/\/$/, "")}/`;
  const ctx = contextFromRequest(request);
  // The upstream call consumes the body stream; a fixture that must read it gets a copy.
  const forMock = isMocksOn() && request.body ? request.clone() : request;

  try {
    const res = await upstreamFetch(request, targetPath, ctx);
    if (res.status === 404 && isMocksOn()) {
      const mocked = await passthroughMock(forMock, mockPath, ctx);
      if (mocked) return stripBodyForHead(request, mocked);
    }
    return stripBodyForHead(request, forwardResponse(res));
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && isMocksOn()) {
      const mocked = await passthroughMock(forMock, mockPath, ctx);
      if (mocked) return stripBodyForHead(request, mocked);
    }
    return stripBodyForHead(request, unavailableResponse());
  }
}

/** A HEAD response carries no body (the poller probes `/config/` with HEAD — M47 US-47.3.5). */
function stripBodyForHead(request: Request, res: Response): Response {
  if (request.method !== "HEAD") return res;
  return new Response(null, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD };
