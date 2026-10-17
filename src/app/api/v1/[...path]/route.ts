import {
  UpstreamUnavailableError,
  contextFromRequest,
  forwardResponse,
  unavailableResponse,
  upstreamFetch,
} from "@/lib/bff/upstream";
import { isMocksOn } from "@/mocks/runtime";
import { passthroughMock } from "@/mocks/passthrough";

/**
 * Same-origin passthrough for the real `/api/v1/*` contract (contracts/bff-cross-cutting.md §2.1).
 * Transparent: no caching, no body transformation, cookies and Retry-After forwarded verbatim.
 * When Django is unreachable and SHARWA_MOCKS=on, a registered mock for the path answers instead.
 */
async function handle(request: Request, { params }: RouteContext<"/api/v1/[...path]">) {
  const { path } = await params;
  const segments = path.join("/");
  const url = new URL(request.url);
  const targetPath = `/api/v1/${segments}${segments.endsWith("/") ? "" : "/"}${url.search}`;
  const ctx = contextFromRequest(request);

  try {
    const res = await upstreamFetch(request, targetPath, ctx);
    return forwardResponse(res);
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && isMocksOn()) {
      const mocked = await passthroughMock(request, `${segments.replace(/\/$/, "")}/`, ctx);
      if (mocked) return mocked;
    }
    return unavailableResponse();
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as HEAD };
