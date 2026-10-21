/**
 * Tenant resolution — pure, no I/O (M47 FR-47.01/02/03, research R-03).
 * Used by `src/proxy.ts`, the BFF and the onboarding/landing forms.
 */

/** Verbatim from `tenants/validators.py` (discovery 01 §1). */
export const RESERVED_SUBDOMAINS = [
  "www",
  "admin",
  "administrator",
  "root",
  "api",
  "dashboard",
  "mail",
  "email",
  "support",
  "help",
  "app",
  "sharwa",
  "sharrwah",
  "static",
  "media",
  "test",
  "demo",
  "staging",
  "public",
  "localhost",
  "ai",
  "console",
] as const;

export type ReservedSubdomain = (typeof RESERVED_SUBDOMAINS)[number];

export const SUBDOMAIN_RE = /^[a-z0-9]+$/;
/**
 * Decision 2026-10-21: 3–50 characters on every path, the same rule as Django's shared
 * validator (`tenants/validators.py` SUBDOMAIN_MIN_LENGTH / SUBDOMAIN_MAX_LENGTH).
 */
export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 50;

export type TenantKind = "platform" | "reserved" | "subdomain" | "custom_domain" | "invalid";

export type RouteGroup =
  | "marketing"
  | "onboarding"
  | "storefront"
  | "dashboard"
  | "pos"
  | "courier"
  | "admin"
  | "pay";

export interface TenantContext {
  kind: TenantKind;
  /** Subdomain (e.g. `mystore`) or the full custom host; `null` on the platform origin. */
  store: string | null;
  /** Host sent upstream as `X-Store-Domain`; `null` on the platform origin. */
  storeHost: string | null;
  /** For reserved hosts: the group they serve, or `null` for "404". */
  reservedGroup: "admin" | "redirect-console" | null;
}

/** Internal rewrite prefixes (never reachable from the network). */
export const INTERNAL_PREFIX = {
  storefront: "_s",
  dashboard: "_d",
  pos: "_p",
  courier: "_c",
  admin: "_a",
} as const;

export const INTERNAL_PATH_RE = /^\/_(s|d|p|c|a)(\/|$)/;

export function isInternalPath(pathname: string): boolean {
  return INTERNAL_PATH_RE.test(pathname);
}

/** Lowercase + strip port + trailing dot. */
export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isReservedSubdomain(sub: string): sub is ReservedSubdomain {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(sub);
}

/** Local validation mirrored from Django; the server (`check-subdomain`) stays the judge. */
export function validateSubdomain(sub: string): { ok: true } | { ok: false; reason: string } {
  if (!sub) return { ok: false, reason: "فارغ" };
  if (!SUBDOMAIN_RE.test(sub)) return { ok: false, reason: "أحرف إنجليزية وأرقام فقط" };
  // Reserved before length, as Django orders it: a short reserved name (`ai`) always
  // reads «محجوز للنظام» on both sides.
  if (isReservedSubdomain(sub)) return { ok: false, reason: "محجوز للنظام" };
  if (sub.length < SUBDOMAIN_MIN || sub.length > SUBDOMAIN_MAX)
    return { ok: false, reason: `يجب أن يكون بين ${SUBDOMAIN_MIN} و${SUBDOMAIN_MAX} حرفاً` };
  return { ok: true };
}

export function resolveTenant(rawHost: string, base: string): TenantContext {
  const host = normalizeHost(rawHost);
  const baseHost = normalizeHost(base);
  const none: TenantContext = { kind: "platform", store: null, storeHost: null, reservedGroup: null };

  if (!host || host === baseHost || host === `www.${baseHost}`) return none;

  if (host.endsWith(`.${baseHost}`)) {
    const sub = host.slice(0, -(baseHost.length + 1));
    if (sub.includes(".") || !SUBDOMAIN_RE.test(sub)) {
      return { kind: "invalid", store: null, storeHost: null, reservedGroup: null };
    }
    if (isReservedSubdomain(sub)) {
      const reservedGroup = sub === "console" ? "admin" : sub === "admin" ? "redirect-console" : null;
      return { kind: "reserved", store: null, storeHost: null, reservedGroup };
    }
    return { kind: "subdomain", store: sub, storeHost: host, reservedGroup: null };
  }

  // Custom domain: Django resolves it from `tenants.Domain`; we pass the host verbatim.
  return { kind: "custom_domain", store: host, storeHost: host, reservedGroup: null };
}

/** Which store-origin route group a pathname belongs to. */
export function groupForStorePath(pathname: string): "dashboard" | "pos" | "courier" | "storefront" {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname === "/pos" || pathname.startsWith("/pos/")) return "pos";
  if (pathname === "/agent" || pathname.startsWith("/agent/")) return "courier";
  return "storefront";
}

export function buildStoreUrl(
  sub: string,
  base: string,
  opts: { protocol?: "http" | "https"; port?: string | number | null } = {},
): string {
  const baseHost = normalizeHost(base);
  const protocol = opts.protocol ?? (baseHost === "localhost" ? "http" : "https");
  const port = opts.port ?? (baseHost === "localhost" ? 3000 : null);
  return `${protocol}://${sub}.${baseHost}${port ? `:${port}` : ""}`;
}

/** Suggest a latin subdomain from a (possibly Arabic) store name — M02 edge case. */
export function suggestSubdomain(storeName: string): string {
  const latin = storeName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (latin.length >= SUBDOMAIN_MIN && !isReservedSubdomain(latin)) return latin.slice(0, SUBDOMAIN_MAX);
  return "";
}
