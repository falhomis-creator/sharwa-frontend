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
  // M07 export (INT-017): the row count the export toast reports.
  "x-export-rows",
] as const;

export interface UpstreamContext {
  /** Original browser host (already normalized). */
  host: string;
  /** Store host for `X-Store-Domain`, or `null` on the platform origin. */
  storeHost: string | null;
  /** Store slug (subdomain or custom host) or `null`. */
  store: string | null;
  protocol: "http" | "https";
  /** The visitor's IP as our own reverse proxy reported it, or `null` (see `clientIp`). */
  ip: string | null;
}

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_RE = /^[0-9a-f:]+(\.\d{1,3}){0,4}$/i;

/** A bare IPv4/IPv6 address, or `null` — never a header value we would forward unchecked. */
export function validIp(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v || v.length > 45) return null;
  if (IPV4_RE.test(v)) return v;
  if (v.includes(":") && IPV6_RE.test(v)) return v.toLowerCase();
  return null;
}

/**
 * The visitor's IP for Django's per-IP limits (decision 2026-10-21 — the BFF proxy trap:
 * without it Django sees EVERY visitor as this Next server, so one IP limit locks out the
 * whole platform).
 *
 * Trust order, mirroring Django's `RealIpMiddleware`: `X-Real-IP` (our Nginx sets it from
 * `$remote_addr`, overwriting anything the client sent), else the RIGHTMOST
 * `X-Forwarded-For` entry — the one our own proxy appended. The leftmost entry is whatever
 * the client typed, so it is never used. Requires Nginx in front of Next in production;
 * a Next server exposed directly would let a visitor choose this value.
 */
export function clientIp(headers: Headers): string | null {
  const real = validIp(headers.get("x-real-ip"));
  if (real) return real;
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  return validIp(chain.at(-1));
}

/** Derive the tenant context of an incoming BFF request from its headers. */
export function contextFromRequest(request: Request): UpstreamContext {
  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");
  const tenant = resolveTenant(host, env.TENANT_BASE_DOMAIN);
  const proto = request.headers.get("x-forwarded-proto");
  return {
    host,
    storeHost: tenant.storeHost,
    store: tenant.store,
    protocol: proto === "https" ? "https" : "http",
    ip: clientIp(request.headers),
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
  if (ctx.ip) {
    // ONE entry, overwriting anything inbound: Django's RealIpMiddleware trusts it only
    // because this Next server is in REAL_IP_TRUSTED_PROXIES (127.0.0.1/::1 by default),
    // and with REAL_IP_PROXY_COUNT=1 it reads exactly this entry.
    headers.set("x-forwarded-for", ctx.ip);
    headers.set("x-real-ip", ctx.ip);
  }
  if (ctx.storeHost && !init.omitStoreHeader) headers.set("x-store-domain", ctx.storeHost);
  // Django's CSRF referer check wants a same-site origin
  headers.set("origin", `${ctx.protocol}://${ctx.host}`);
  headers.set("referer", `${ctx.protocol}://${ctx.host}/`);
  if (init.headers) for (const [k, v] of Object.entries(init.headers)) headers.set(k, v);

  const method = init.method ?? request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  // The incoming body is BUFFERED, never streamed: a streamed body goes out chunked with no
  // Content-Length, and Django (runserver and gunicorn alike) reads CONTENT_LENGTH — it saw an
  // EMPTY body, so every write through the `/api/v1/*` passthrough (PWA install events, push
  // subscribe, storefront writes…) answered 400 «required field». Same rule as `forwardLive`.
  // 8MB max (DATA_UPLOAD_MAX_MEMORY_SIZE), so buffering is safe.
  const body = hasBody ? (init.body === undefined ? await bufferedBody(request) : init.body) : undefined;

  try {
    return await fetch(`${UPSTREAM_ORIGIN}${path}`, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      // Required by undici only when a caller passes an explicit stream
      ...(body instanceof ReadableStream ? { duplex: "half" as const } : {}),
    });
  } catch (err) {
    throw new UpstreamUnavailableError(err);
  }
}

/** The request body as bytes (`null` when empty or already read), so fetch sends a Content-Length. */
async function bufferedBody(request: Request): Promise<ArrayBuffer | null> {
  if (!request.body || request.bodyUsed) return null;
  const raw = await request.arrayBuffer();
  return raw.byteLength > 0 ? raw : null;
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
