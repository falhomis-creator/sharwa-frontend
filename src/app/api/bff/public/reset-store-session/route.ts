/**
 * Clears a Django `sessionid` that belongs to ANOTHER store but was sent to this origin
 * (M47 US-47.2.3). The storefront layout cannot delete a cookie from a Server Component,
 * so it redirects here; this handler expires the cookie for this origin, drops a
 * short-lived breadcrumb so the layout does not bounce a second time, and goes back.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("next") ?? "/";
  // Relative paths only — never a redirect to another origin.
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const headers = new Headers({ location: next, "cache-control": "no-store" });
  headers.append("set-cookie", "sessionid=; Path=/; Max-Age=0; SameSite=Lax");
  headers.append("set-cookie", "sharwa_session_reset=1; Path=/; Max-Age=60; SameSite=Lax");
  return new Response(null, { status: 302, headers });
}
