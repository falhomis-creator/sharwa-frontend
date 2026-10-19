import { hasPermission, type PermissionKey } from "@/lib/access";
import type { MockRouteContext } from "@/lib/bff/mock-route";
import type { Session } from "@/features/dashboard-shell/schemas";
import { mockJson } from "@/mocks/runtime";

/**
 * A tiny path router for the Phase 7 catch-all BFF adapters of M23/M28/M29 (one per
 * module: `src/app/api/bff/<module>/[...path]`). Same shape as `src/mocks/platform/router.ts`:
 * `on(method, "purchase-orders/:id/receive", handler)`; the dispatcher answers 404 for an
 * unknown path and 405 for a known path with another method. The session gate (401) and
 * the module's feature/permission gates run before any handler.
 */
export type Body = Record<string, unknown>;

export interface RouteCtx {
  request: Request;
  url: URL;
  params: Record<string, string>;
  store: string | null;
  session: Session;
  actor: string;
  body: () => Promise<Body>;
  can: (p: PermissionKey) => boolean;
}

type Handler = (ctx: RouteCtx) => Promise<Response> | Response;

export function createRouter() {
  const routes: Array<{ method: string; pattern: string[]; handle: Handler }> = [];

  function on(method: string, path: string, handle: Handler) {
    routes.push({ method, pattern: path.split("/").filter(Boolean), handle });
  }

  async function dispatch(request: Request, segments: string[], mctx: MockRouteContext): Promise<Response> {
    const method = request.method.toUpperCase();
    const segs = segments.filter(Boolean);
    let parsed: Body | null = null;
    const body = async () => {
      if (parsed) return parsed;
      try {
        const data: unknown = await request.json();
        parsed = data && typeof data === "object" && !Array.isArray(data) ? (data as Body) : {};
      } catch {
        parsed = {};
      }
      return parsed;
    };
    const session = mctx.session;
    const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
    let methodMismatch = false;
    for (const r of routes) {
      const params = match(r.pattern, segs);
      if (!params) continue;
      if (r.method !== method) {
        methodMismatch = true;
        continue;
      }
      return r.handle({
        request,
        url: mctx.url,
        params,
        store: mctx.store,
        session,
        actor: actorOf(session),
        body,
        can: (p) => hasPermission(subject, p),
      });
    }
    return methodMismatch ? bad({ detail: "الطريقة غير مسموحة." }, 405) : notFound("المسار");
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

export const actorOf = (s: Session) => (s.kind === "merchant" ? "مالك المتجر" : (s.staff?.full_name ?? "موظف"));

export const ok = (data: unknown, status = 200, delay = 160) => mockJson(data, { delay, status });
export const bad = (body: Body, status = 400) => mockJson(body, { status, delay: 120 });
export const notFound = (what: string) => bad({ detail: `${what} غير موجود.` }, 404);
export const forbidden = (detail = "ليست لديك صلاحية لهذا الإجراء.") => bad({ detail }, 403);
export const str = (v: unknown) => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v).trim());
export const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
export const isDecimalStr = (v: unknown, places = 2) => new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(str(v));

/** DRF page of `pageSize` (default 20): `{count, next, previous, results}`. */
export function paginate<T>(items: T[], url: URL, pageSize = 20) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const size = Math.min(200, Math.max(1, Number(url.searchParams.get("page_size") ?? pageSize) || pageSize));
  const start = (page - 1) * size;
  return {
    count: items.length,
    next: start + size < items.length ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: items.slice(start, start + size),
  };
}

/** Deterministic PRNG for seeds (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStore(store: string | null): number {
  let h = 2166136261;
  for (const ch of store ?? "__") h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
