import "server-only";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { storeConfigSchema } from "@/lib/schemas/store-config";
import { tenantFixture } from "@/mocks/tenant/config";
import { isMocksOn } from "@/mocks/runtime";
import type { StoreProbe } from "@/features/tenant/schemas";

/**
 * Tenant probe — `GET /api/v1/config/` (M47 FR-47.02, contract bff-cross-cutting §1).
 *
 * Django stays the authority: the fixtures in `src/mocks/tenant/config.ts` only answer
 * when the real upstream has no row for the host (404) or is unreachable, and only while
 * `SHARWA_MOCKS=on`. A real tenant with the same slug always wins.
 *
 * 403 is ambiguous upstream (suspended store vs. a session bound to another store), so it
 * is disambiguated by behaviour rather than by message text: the probe is repeated once
 * without the browser's cookies. If that succeeds the 403 was the session (US-47.2.3).
 */
export interface ProbeInput {
  /** Store slug (subdomain) or full custom host — used to pick a fixture. */
  store: string;
  /** Host sent upstream as `X-Store-Domain`. */
  storeHost: string;
  /** The browser's `Cookie` header, forwarded so Django sees the real session. */
  cookie?: string | null;
}

async function callConfig(storeHost: string, cookie?: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-store-domain": storeHost,
    "x-forwarded-host": storeHost,
  };
  if (cookie) headers.cookie = cookie;
  return fetch(`${UPSTREAM_ORIGIN}/api/v1/config/`, { headers, cache: "no-store", redirect: "manual" });
}

function retryAfterOf(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  return raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
}

/** Fixture answer, or `undefined` when mocks are off / the slug is not a fixture. */
function fixtureProbe(store: string): StoreProbe | undefined {
  if (!isMocksOn()) return undefined;
  const fixture = tenantFixture(store);
  if (!fixture) return undefined;
  switch (fixture.outcome) {
    case "ok":
      return { outcome: "ok", config: fixture.config, isMock: true };
    case "provisioning":
      return { outcome: "provisioning", retryAfter: 10, token: fixture.token, isMock: true };
    case "inactive":
      return { outcome: "inactive", isMock: true };
    case "not_found":
      return { outcome: "not_found", isMock: true };
  }
}

export async function probeStore({ store, storeHost, cookie }: ProbeInput): Promise<StoreProbe> {
  let res: Response;
  try {
    res = await callConfig(storeHost, cookie);
  } catch {
    const fixture = fixtureProbe(store);
    if (fixture) return fixture;
    // A dead backend is a platform outage, not a tenant state: show the wait page
    // («المتجر قيد الصيانة») rather than claiming the store does not exist.
    console.warn(`[tenant] upstream unreachable while probing ${storeHost}`);
    return { outcome: "provisioning", retryAfter: 10, isMock: false };
  }

  if (res.ok) {
    const parsed = storeConfigSchema.safeParse(await res.json());
    if (parsed.success) return { outcome: "ok", config: parsed.data, isMock: false };
    console.error(`[tenant] /config/ payload did not match the contract for ${storeHost}`);
    return { outcome: "not_found", isMock: false };
  }

  if (res.status === 404) {
    const fixture = fixtureProbe(store);
    if (fixture) return fixture;
    console.warn(`[tenant] no store resolved for host ${storeHost}`);
    return { outcome: "not_found", isMock: false };
  }

  if (res.status === 403) {
    if (cookie) {
      try {
        const retry = await callConfig(storeHost);
        if (retry.ok) {
          const parsed = storeConfigSchema.safeParse(await retry.json());
          return {
            outcome: "session_bound_elsewhere",
            config: parsed.success ? parsed.data : undefined,
            isMock: false,
          };
        }
      } catch {
        // fall through to `inactive`
      }
    }
    const fixture = fixtureProbe(store);
    if (fixture) return fixture;
    return { outcome: "inactive", isMock: false };
  }

  if (res.status === 503) {
    return { outcome: "provisioning", retryAfter: retryAfterOf(res) ?? 10, isMock: false };
  }

  console.error(`[tenant] unexpected ${res.status} while probing ${storeHost}`);
  return { outcome: "provisioning", retryAfter: 10, isMock: false };
}
