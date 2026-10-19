import type { MockResult, MockRouteContext } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { sessionActor } from "@/mocks/staff/state";
import type { Viewer } from "@/mocks/inbox/state";

/**
 * A tiny method + path-pattern dispatcher for the catch-all mock routers of M27/M30/M31/M32
 * (`/api/bff/{inbox,channels,apps,support}/[...path]`), in the shape of
 * `src/mocks/platform/router.ts`. Patterns use `:name` segments.
 */
export interface KitCtx extends MockRouteContext {
  request: Request;
  params: Record<string, string>;
  viewer: Viewer;
  /** The JSON body (objects AND arrays), `{}` when absent. */
  body: () => Promise<unknown>;
  obj: () => Promise<Record<string, unknown>>;
}
type Handler = (ctx: KitCtx) => Promise<Response> | Response;

export function createRouter() {
  const routes: Array<{ method: string; pattern: string[]; handle: Handler }> = [];
  const on = (method: string, path: string, handle: Handler) => routes.push({ method, pattern: path.split("/").filter(Boolean), handle });

  async function dispatch(request: Request, segments: string[], base: MockRouteContext): Promise<Response> {
    const segs = segments.filter(Boolean);
    let methodMismatch = false;
    let cached: unknown;
    let read = false;
    const body = async () => {
      if (!read) {
        read = true;
        try {
          cached = await request.json();
        } catch {
          cached = {};
        }
      }
      return cached;
    };
    for (const r of routes) {
      const params = match(r.pattern, segs);
      if (!params) continue;
      if (r.method !== request.method) {
        methodMismatch = true;
        continue;
      }
      const actor = sessionActor(base.store, base.session);
      const viewer: Viewer = { owner: base.session.kind === "merchant", staffId: actor.id, name: actor.name };
      return r.handle({
        ...base,
        request,
        params,
        viewer,
        body,
        obj: async () => {
          const b = await body();
          return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
        },
      });
    }
    if (methodMismatch) return mockJson({ detail: `الطريقة «${request.method}» غير مسموحة.` }, { status: 405 });
    return mockJson({ detail: "غير موجود." }, { status: 404 });
  }

  return { on, dispatch };
}

function match(pattern: string[], segs: string[]): Record<string, string> | null {
  if (pattern.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segs[i]!);
    else if (p !== segs[i]) return null;
  }
  return params;
}

export function send<T>(result: MockResult<T>, delay = 160): Promise<Response> {
  return result.ok ? mockJson(result.data, { status: result.status ?? 200, delay }) : mockJson(result.body, { status: result.status, delay: 120 });
}

export const num = (s: string | undefined) => (s && /^\d+$/.test(s) ? Number(s) : NaN);
