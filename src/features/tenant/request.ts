import "server-only";
import { headers } from "next/headers";
import { env } from "@/env";
import { normalizeHost } from "@/lib/tenant";

/**
 * The resolved request identity for RSCs inside a store group: the store slug the proxy
 * put on `x-sharwa-store`, the host WITHOUT its port (what Django matches `X-Store-Domain`
 * against) and the port kept separately for user-visible links.
 */
export interface RequestIdentity {
  store: string;
  /** Normalized: lowercase, no port — safe to send upstream. */
  storeHost: string;
  protocol: "http" | "https";
  port: string | null;
  /** Browsable origin of the storefront, e.g. `http://noor.localhost:3000`. */
  storeOrigin: string;
}

export async function requestIdentity(fallbackStore?: string): Promise<RequestIdentity> {
  const headerList = await headers();
  const store = headerList.get("x-sharwa-store") || fallbackStore || "";
  const rawHost = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const withPort = rawHost || `${store}.${env.TENANT_BASE_DOMAIN}`;
  const storeHost = normalizeHost(withPort) || `${store}.${env.TENANT_BASE_DOMAIN}`;
  const portMatch = /:(\d+)$/.exec(withPort);
  const port = portMatch?.[1] ?? null;
  const protocol = headerList.get("x-forwarded-proto") === "https" ? "https" : "http";
  return {
    store,
    storeHost,
    protocol,
    port,
    storeOrigin: `${protocol}://${storeHost}${port ? `:${port}` : ""}`,
  };
}
