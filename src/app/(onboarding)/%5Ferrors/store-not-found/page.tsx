import type { Metadata } from "next";
import { headers } from "next/headers";
import { Mono } from "@/components/shared/mono";
import { TenantNotice } from "@/features/tenant/components/tenant-notice";
import { platformOrigin } from "@/features/tenant/origin";

export const metadata: Metadata = { title: "لم نجد متجراً بهذا العنوان" };

/**
 * 404 — the host resolves to no store (M47 US-47.2.1). Served with a real 404 status:
 * on a store origin via the proxy's `/_tenant/not-found` rewrite, on the storefront
 * group via `notFound()`.
 */
/**
 * Dynamic and blocking on purpose. The HTTP status of this page is set by the proxy on the
 * `/_tenant/*` rewrite (`src/proxy.ts`), and a prerendered static page is served from the
 * cache with its own 200 — the override only survives if the page renders per request.
 * Reading `headers()` in the body (no `<Suspense>`) plus `instant = false` is what keeps it
 * out of the prerender, so 404 / 403 / 503 + `Retry-After: 10` reach the client (FR-47.07/08).
 */
export const instant = false;

export default async function StoreNotFoundPage() {
  const host = (await headers()).get("x-forwarded-host") ?? null;
  return (
    <TenantNotice
      status={404}
      title="لم نجد متجراً بهذا العنوان"
      body="تحقّق من العنوان الذي كتبته، أو أنشئ متجرك الآن."
    >
      <a
        href={`${platformOrigin()}/register`}
        className="inline-flex h-11 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        أنشئ متجرك على شروة
      </a>
      {host ? (
        <p className="text-sm text-muted-foreground">
          العنوان المطلوب <Mono>{host}</Mono>
        </p>
      ) : null}
    </TenantNotice>
  );
}
