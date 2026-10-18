import "server-only";
import { revalidateTag } from "next/cache";
import { contextFromRequest, jsonResponse } from "@/lib/bff/upstream";
import { storeTag } from "@/lib/cache";
import { sessionFromRequest, storeHostFor } from "@/features/dashboard-shell/api/session";
import type { Session } from "@/features/dashboard-shell/schemas";
import { hasPermission, type PermissionKey } from "@/lib/access";
import { isMocksOn, mockJson, notAvailable, type MockInit } from "@/mocks/runtime";

/**
 * Shared skeleton of the dashboard `[NEEDS BACKEND]` adapters (M04/M05/M06/M48/M49), in
 * the same `mock` mode the M03 adapters use (bff README): the session gate first (401),
 * then the optional permission gate (403, the server half of FR-04.16 / FR-06.11), then
 * the fixture. With `SHARWA_MOCKS=off` every row answers 501 «غير متاح بعد».
 *
 * The day Django ships the `/api/v1/<resource>` row, the handler body becomes a
 * passthrough and the UI does not change.
 */
export interface MockRouteContext {
  store: string | null;
  storeHost: string;
  session: Session;
  url: URL;
}

export async function mockRoute(
  request: Request,
  handler: (ctx: MockRouteContext) => Promise<Response> | Response,
  opts: { permission?: PermissionKey } = {},
): Promise<Response> {
  const upstream = contextFromRequest(request);
  const storeHost = storeHostFor(upstream.store, upstream.storeHost);
  const session = await sessionFromRequest(request, { store: upstream.store, storeHost });
  if (!session) return jsonResponse({ detail: "انتهت جلستك، سجّل الدخول مجدداً." }, { status: 401 });
  if (!isMocksOn()) return notAvailable();
  if (
    opts.permission &&
    !hasPermission({ kind: session.kind, features: session.features, permissions: session.staff?.permissions }, opts.permission)
  ) {
    return mockJson({ detail: "ليست لديك صلاحية لهذا الإجراء." }, { status: 403 });
  }
  const res = await handler({ store: upstream.store, storeHost, session, url: new URL(request.url) });
  // A successful dashboard write (product, category, settings…) may change what the store
  // shows: drop this store's cached storefront reads so the next visit is fresh (M09 SC-09.2).
  if (upstream.store && request.method !== "GET" && request.method !== "HEAD" && res.ok) {
    revalidateTag(storeTag(upstream.store), { expire: 0 });
  }
  return res;
}

/** A mock result → response: `{ok:true,data}` → 200 (or `status`), `{ok:false}` → DRF error body. */
export type MockResult<T> =
  | { ok: true; data: T; status?: number }
  | { ok: false; status: number; body: Record<string, unknown> };

export function respond<T>(result: MockResult<T>, init: MockInit = {}): Promise<Response> {
  if (result.ok) return mockJson(result.data, { delay: 180, status: result.status, ...init });
  return mockJson(result.body, { status: result.status, delay: 120 });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await request.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The system roles that may create/edit catalogue entities (M04 §2, M05 §2 assumption). */
export function canManageCatalog(session: Session): boolean {
  if (session.kind === "merchant") return true;
  const roles = session.staff?.roles ?? [];
  return roles.some((r) => r === "مدير المتجر" || r === "مدير الفرع");
}

export function forbidden(): Promise<Response> {
  return mockJson({ detail: "إنشاء المنتجات وتعديلها مقصور على المالك ومدير المتجر أو الفرع." }, { status: 403 });
}
