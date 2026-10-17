import "server-only";
import { env } from "@/env";
import { normalizeHost, resolveTenant } from "@/lib/tenant";

/**
 * Server-side bridge to Django (contracts/bff-cross-cutting.md §2, §9).
 * Never imported from client code (`server-only`).
 */

export const UPSTREAM_ORIGIN = (env.API_PROXY_URL ?? env.API_INTERNAL_URL).replace(/\/$/, "");

const FORWARD_REQUEST_HEADERS = [
  "cookie",
  "content-type",
  "accept",
  "accept-language",
  "x-csrftoken",
  "idempotency-key",
  "if-none-match",
] as const;

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-language",
  "retry-after",
  "etag",
  "location",
  "x-sharwa-mock",
] as const;

export interface UpstreamContext {
  /** Original browser host (already normalized). */
  host: string;
  /** Store host for `X-Store-Domain`, or `null` on the platform origin. */
  storeHost: string | null;
  /** Store slug (subdomain or custom host) or `null`. */
  store: string | null;
  protocol: "http" | "https";
  ip: string | null;
}

/** Derive the tenant context of an incoming BFF request from its headers. */
export function contextFromRequest(request: Request): UpstreamContext {
  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");
  const tenant = resolveTenant(host, env.TENANT_BASE_DOMAIN);
  const proto = request.headers.get("x-forwarded-proto");
  const forwardedFor = request.headers.get("x-forwarded-for");
  return {
    host,
    storeHost: tenant.storeHost,
    store: tenant.store,
    protocol: proto === "https" ? "https" : "http",
    ip: forwardedFor ? forwardedFor.split(",")[0]!.trim() : null,
  };
}

export class UpstreamUnavailableError extends Error {
  constructor(cause: unknown) {
    super("upstream unavailable");
    this.name = "UpstreamUnavailableError";
    this.cause = cause;
  }
}

export interface UpstreamInit {
  method?: string;
  body?: BodyInit | null;
  /** Extra headers (e.g. injected `X-CSRFToken`). */
  headers?: Record<string, string>;
  /** Pass `true` to NOT add `X-Store-Domain` even on a store host (legacy HTML paths). */
  omitStoreHeader?: boolean;
}

/**
 * Forward a request to Django at `${UPSTREAM_ORIGIN}${path}` with the headers Django expects.
 * Throws `UpstreamUnavailableError` on network failure so callers can fall back to mocks.
 */
export async function upstreamFetch(
  request: Request,
  path: string,
  ctx: UpstreamContext,
  init: UpstreamInit = {},
): Promise<Response> {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set("x-forwarded-host", ctx.host);
  headers.set("x-forwarded-proto", ctx.protocol);
  if (ctx.ip) headers.set("x-real-ip", ctx.ip);
  if (ctx.storeHost && !init.omitStoreHeader) headers.set("x-store-domain", ctx.storeHost);
  // Django's CSRF referer check wants a same-site origin
  headers.set("origin", `${ctx.protocol}://${ctx.host}`);
  headers.set("referer", `${ctx.protocol}://${ctx.host}/`);
  if (init.headers) for (const [k, v] of Object.entries(init.headers)) headers.set(k, v);

  const method = init.method ?? request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? (init.body === undefined ? request.body : init.body) : undefined;

  try {
    return await fetch(`${UPSTREAM_ORIGIN}${path}`, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      // Required by undici when streaming a request body
      ...(body && typeof body !== "string" ? { duplex: "half" as const } : {}),
    });
  } catch (err) {
    throw new UpstreamUnavailableError(err);
  }
}

/** Stream an upstream response back to the browser, keeping cookies and cache-relevant headers verbatim. */
export function forwardResponse(res: Response, extra: Record<string, string> = {}): Response {
  const headers = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const v = res.headers.get(name);
    if (v) headers.set(name, v);
  }
  for (const cookie of res.headers.getSetCookie()) headers.append("set-cookie", cookie);
  headers.set("cache-control", "no-store");
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.status === 204 || res.status === 304 ? null : res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function jsonResponse(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...init.headers },
  });
}

export function unavailableResponse() {
  return jsonResponse({ detail: "الخادم غير متاح حالياً." }, { status: 502 });
}
