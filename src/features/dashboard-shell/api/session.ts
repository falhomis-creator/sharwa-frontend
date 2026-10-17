import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { normalizeHost } from "@/lib/tenant";
import { getCsrfToken } from "@/lib/csrf";
import { MOCK_SESSION_COOKIE, parseMockSessionKind } from "@/mocks/dashboard/auth";
import { sessionMock } from "@/mocks/dashboard/me";
import { isMocksOn } from "@/mocks/runtime";
import { sessionSchema, type Session } from "@/features/dashboard-shell/schemas";

/**
 * The merchant/staff session (M03 §7 `GET /api/v1/auth/me/` — `[NEEDS BACKEND]`).
 *
 * Resolution order, so the day the endpoint ships nothing else has to change:
 *   1. the documented target `/api/v1/auth/me/`, with the browser cookies forwarded;
 *   2. while `SHARWA_MOCKS=on`, the dev session marker set by the login adapters;
 *   3. otherwise `null` → the shell sends the visitor to `/dashboard/login`.
 *
 * There is no JWT anywhere: identity is Django's cookie, read server-side only.
 */
export interface StoreContext {
  store: string | null;
  storeHost: string;
}

/** Host for `X-Store-Domain`: normalized (no port), which is what Django matches on. */
export function storeHostFor(store: string | null, host?: string | null): string {
  const normalized = host ? normalizeHost(host) : "";
  if (normalized) return normalized;
  return store ? `${store}.${env.TENANT_BASE_DOMAIN}` : env.TENANT_BASE_DOMAIN;
}

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

/** Ask the target endpoint. `null` means "not shipped yet" or "no session". */
async function upstreamSession(ctx: StoreContext, cookie: string | null): Promise<Session | null> {
  const requestHeaders: Record<string, string> = {
    accept: "application/json",
    "x-store-domain": ctx.storeHost,
    "x-forwarded-host": ctx.storeHost,
  };
  if (cookie) requestHeaders.cookie = cookie;
  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/auth/me/`, {
      headers: requestHeaders,
      cache: "no-store",
      redirect: "manual",
    });
    if (!res.ok) return null;
    const parsed = sessionSchema.safeParse(await res.json());
    if (!parsed.success) {
      console.error("[dashboard] /auth/me/ payload did not match the contract");
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

async function mockSession(ctx: StoreContext, cookie: string | null): Promise<Session | null> {
  if (!isMocksOn()) return null;
  const kind = parseMockSessionKind(cookieValue(cookie, MOCK_SESSION_COOKIE));
  if (!kind) return null;
  const session = sessionMock(kind, { store: ctx.store, storeHost: ctx.storeHost });
  const csrf = await getCsrfToken(ctx.storeHost, cookie);
  return csrf ? { ...session, csrf_token: csrf } : session;
}

export async function resolveSession(ctx: StoreContext, cookie: string | null): Promise<Session | null> {
  return (await upstreamSession(ctx, cookie)) ?? (await mockSession(ctx, cookie));
}

/** RSC entry point: resolves the store from the proxy headers and reads the session. */
export async function getSession(): Promise<Session | null> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const store = headerList.get("x-sharwa-store") || null;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const ctx: StoreContext = { store, storeHost: storeHostFor(store, host) };
  return resolveSession(ctx, cookieStore.toString() || null);
}

/** Shell gate: no session → the login screen, keeping the attempted path (M03 FR-03.08). */
export async function requireSession(nextPath?: string): Promise<Session> {
  const session = await getSession();
  if (session) return session;
  const target = nextPath ? `/dashboard/login?next=${encodeURIComponent(nextPath)}` : "/dashboard/login";
  redirect(target);
}

/** Route-handler entry point: the store comes from the BFF upstream context. */
export async function sessionFromRequest(request: Request, ctx: StoreContext): Promise<Session | null> {
  return resolveSession(ctx, request.headers.get("cookie"));
}
