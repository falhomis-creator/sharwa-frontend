import "server-only";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";

/**
 * Server-side GET of a PUBLIC store-scoped `/api/v1/*` row, for the cached storefront reads.
 * No cookie travels: these rows are public (ready-api-v1 #1–#4), and a cookie would make
 * the result per-visitor — which a `'use cache'` entry must never be (R-02).
 *
 * Returns `null` when Django is unreachable so the caller can fall back to its fixture.
 */
export interface UpstreamJson {
  status: number;
  data: unknown;
  isMockable: boolean;
}

export async function getPublicJson(path: string, storeHost: string): Promise<UpstreamJson | null> {
  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}${path}`, {
      headers: { accept: "application/json", "x-store-domain": storeHost, "x-forwarded-host": storeHost },
      redirect: "manual",
    });
    const data: unknown = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null;
    // 404/405/501: the tenant is unknown to Django (a fixture store) or the row has not shipped yet.
    return { status: res.status, data, isMockable: res.status === 404 || res.status === 405 || res.status === 501 };
  } catch {
    return null;
  }
}

export class StorefrontUnavailableError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`storefront read ${path} failed with ${status}`);
    this.name = "StorefrontUnavailableError";
  }
}
