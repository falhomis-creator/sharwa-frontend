import { NextResponse, type NextRequest } from "next/server";
import {
  INTERNAL_PREFIX,
  groupForStorePath,
  isInternalPath,
  normalizeHost,
  resolveTenant,
} from "@/lib/tenant";

/**
 * Tenant-aware request proxy (Next 16 `proxy.ts`; constitution VIII, M47, research R-03).
 * Pure: no I/O, no cookies, no query strings. Rewrites by Host only and passes the
 * resolved store as the internal request header `x-sharwa-store`.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const base = process.env.TENANT_BASE_DOMAIN ?? "localhost";
  const host = normalizeHost(request.headers.get("host") ?? "");

  // Internal prefixes are never reachable from the network (SC-47.6).
  if (isInternalPath(pathname)) return blocked(request);

  const tenant = resolveTenant(host, base);
  const headers = new Headers(request.headers);
  headers.set("x-sharwa-store", tenant.store ?? "");
  headers.set("x-sharwa-tenant-kind", tenant.kind);

  switch (tenant.kind) {
    case "platform":
      return NextResponse.next({ request: { headers } });

    case "reserved": {
      if (tenant.reservedGroup === "admin") {
        return rewrite(request, `/${INTERNAL_PREFIX.admin}${pathname}`, search, headers);
      }
      if (tenant.reservedGroup === "redirect-console") {
        const url = request.nextUrl.clone();
        url.host = `console.${base}${request.nextUrl.port ? `:${request.nextUrl.port}` : ""}`;
        return NextResponse.redirect(url, 308);
      }
      return blocked(request);
    }

    case "invalid":
      return blocked(request);

    case "subdomain":
    case "custom_domain": {
      const store = tenant.store as string;
      const group = groupForStorePath(pathname);
      const prefix = INTERNAL_PREFIX[group];
      return rewrite(request, `/${prefix}/${store}${pathname}`, search, headers);
    }
  }
}

function rewrite(request: NextRequest, pathname: string, search: string, headers: Headers) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.rewrite(url, { request: { headers } });
}

/** Renders the root `not-found.tsx` with a 404 status without exposing any internal path. */
function blocked(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/_blocked";
  url.search = "";
  return NextResponse.rewrite(url, { status: 404 });
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, the BFF (`/api/*`), the favicon and vendored static assets.
     * `sw.js` / `manifest.webmanifest` are intentionally NOT skipped: on store origins they
     * are owned by the storefront group (research R-16).
     */
    "/((?!_next/|api/|favicon\\.ico|fonts/|images/|icons/).*)",
  ],
};
