import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { env } from "@/env";
import { normalizeHost } from "@/lib/tenant";
import { Mono } from "@/components/shared/mono";
import { TenantNotice } from "@/features/tenant/components/tenant-notice";
import { ProvisioningPoller } from "@/features/tenant/components/provisioning-poller";

export const metadata: Metadata = { title: "جارٍ تجهيز متجرك" };

/**
 * 503 — the tenant guard is still provisioning the schema (M47 US-47.3). The status and
 * `Retry-After: 10` are set by the proxy on the `/_tenant/provisioning` rewrite, because a
 * Server Component cannot set them itself.
 *
 * The dynamic parts (the `?t=` token, the resolved host) live under `<Suspense>` so the
 * page shell stays prerenderable with `cacheComponents` on.
 */
/**
 * Dynamic and blocking on purpose. The HTTP status of this page is set by the proxy on the
 * `/_tenant/*` rewrite (`src/proxy.ts`), and a prerendered static page is served from the
 * cache with its own 200 — the override only survives if the page renders per request.
 * Reading `headers()` in the body (no `<Suspense>`) plus `instant = false` is what keeps it
 * out of the prerender, so 404 / 403 / 503 + `Retry-After: 10` reach the client (FR-47.07/08).
 */
export const instant = false;

export default function StoreProvisioningPage(props: PageProps<"/_errors/store-provisioning">) {
  return (
    <TenantNotice
      status={503}
      title="جارٍ تجهيز متجرك"
      body="نُجهّز قاعدة بيانات متجرك الآن. تستغرق العملية دقيقة أو دقيقتين، وتُفتح لوحة التحكم تلقائياً."
    >
      <Suspense fallback={<ProvisioningFallback />}>
        <ProvisioningGate searchParams={props.searchParams} />
      </Suspense>
    </TenantNotice>
  );
}

function ProvisioningFallback() {
  return (
    <div className="hairline-track rounded-full" role="progressbar" aria-label="جارٍ التجهيز">
      <span className="hairline-progress" />
    </div>
  );
}

async function ProvisioningGate({
  searchParams,
}: {
  searchParams: PageProps<"/_errors/store-provisioning">["searchParams"];
}) {
  const [params, headerList] = await Promise.all([searchParams, headers()]);
  const raw = params.t;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() || undefined;
  const store = headerList.get("x-sharwa-store") || null;
  const storeHost = store ? normalizeHost(headerList.get("x-forwarded-host") ?? `${store}.${env.NEXT_PUBLIC_TENANT_BASE_DOMAIN}`) : null;

  return (
    <>
      <ProvisioningPoller store={store} token={token} whatsapp={env.NEXT_PUBLIC_PLATFORM_WHATSAPP} />
      {storeHost ? (
        <p className="text-sm text-muted-foreground">
          العنوان <Mono>{storeHost}</Mono>
        </p>
      ) : null}
    </>
  );
}
