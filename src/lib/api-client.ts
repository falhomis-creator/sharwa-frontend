import type { ZodType } from "zod";
import { ApiError, parseApiError } from "@/lib/api-error";

/**
 * Browser-side API client (contracts/bff-cross-cutting.md §2–§4).
 * - Always same-origin (`/api/v1/*` passthrough or `/api/bff/*` adapters); cookies travel automatically.
 * - Every response is validated with the Zod schema the caller passes.
 * - Unsafe methods carry `X-CSRFToken` from the server-provided token (never from document.cookie).
 * - A 403 CSRF rejection triggers one token refresh + one retry.
 * Server components must NOT use this; they call `src/lib/bff/*` directly.
 */

let csrfToken: string | null = null;
let onMockResponse: ((isMock: boolean) => void) | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken() {
  return csrfToken;
}

export function setMockObserver(fn: ((isMock: boolean) => void) | null) {
  onMockResponse = fn;
}

export async function refreshCsrf(): Promise<string | null> {
  try {
    const res = await fetch("/api/bff/auth/csrf", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { csrfToken?: string };
    csrfToken = data.csrfToken ?? null;
    return csrfToken;
  } catch {
    return null;
  }
}

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  /** JSON body (serialized, sets content-type). Use `body` for FormData/multipart. */
  json?: unknown;
  body?: BodyInit | null;
  /** Query string params; `undefined`/`null`/`""` are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Idempotency key for retried writes (orders, POS, wallets). */
  idempotencyKey?: string;
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function buildUrl(path: string, query?: ApiFetchInit["query"]): string {
  if (!query) return path;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

async function rawFetch(path: string, init: ApiFetchInit, attempt: number): Promise<Response> {
  const method = (init.method ?? (init.json !== undefined || init.body ? "POST" : "GET")).toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  let body: BodyInit | null | undefined = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  if (UNSAFE.has(method) && csrfToken) headers.set("x-csrftoken", csrfToken);
  if (init.idempotencyKey) headers.set("idempotency-key", init.idempotencyKey);

  const res = await fetch(buildUrl(path, init.query), {
    ...init,
    method,
    headers,
    body,
    credentials: "include",
    cache: "no-store",
  });

  onMockResponse?.(res.headers.get("x-sharwa-mock") === "1");

  if (!res.ok) {
    const err = await parseApiError(res);
    if (err.isCsrf && attempt === 0 && UNSAFE.has(method)) {
      const fresh = await refreshCsrf();
      if (fresh) return rawFetch(path, init, attempt + 1);
    }
    throw err;
  }
  return res;
}

/** Fetch + validate. Returns `undefined` for 204. */
export async function apiFetch<T>(path: string, schema: ZodType<T>, init: ApiFetchInit = {}): Promise<T> {
  const res = await rawFetch(path, init, 0);
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[api-client] schema mismatch for ${path}`, parsed.error.issues);
    }
    throw new ApiError({ status: 500, detail: "استجابة غير متوقعة من الخادم." });
  }
  return parsed.data;
}

/** For downloads (CSV, PDF): returns the raw Response. */
export async function apiFetchRaw(path: string, init: ApiFetchInit = {}): Promise<Response> {
  return rawFetch(path, init, 0);
}
