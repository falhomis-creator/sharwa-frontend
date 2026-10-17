import type { Metadata } from "next";
import { headers } from "next/headers";
import { Mono } from "@/components/shared/mono";
import { env } from "@/env";
import { TenantNotice, WhatsAppSupport } from "@/features/tenant/components/tenant-notice";

export const metadata: Metadata = { title: "هذا المتجر غير متاح حالياً" };

/**
 * 403 — the store exists but is not serving (M47 US-47.2.2). No internal detail is
 * shown: the visitor learns the state, the owner gets a support route.
 */
/**
 * Dynamic and blocking on purpose. The HTTP status of this page is set by the proxy on the
 * `/_tenant/*` rewrite (`src/proxy.ts`), and a prerendered static page is served from the
 * cache with its own 200 — the override only survives if the page renders per request.
 * Reading `headers()` in the body (no `<Suspense>`) plus `instant = false` is what keeps it
 * out of the prerender, so 404 / 403 / 503 + `Retry-After: 10` reach the client (FR-47.07/08).
 */
export const instant = false;

export default async function StoreInactivePage() {
  const host = (await headers()).get("x-forwarded-host") ?? null;
  return (
    <TenantNotice
      status={403}
      title="هذا المتجر غير متاح حالياً"
      body="إن كنت صاحب المتجر، تواصل مع دعم شروة لمعرفة السبب."
    >
      <WhatsAppSupport
        phone={env.NEXT_PUBLIC_PLATFORM_WHATSAPP}
        message="متجري غير متاح حالياً على شروة، أرجو المساعدة."
      />
      {host ? (
        <p className="text-sm text-muted-foreground">
          العنوان <Mono>{host}</Mono>
        </p>
      ) : null}
    </TenantNotice>
  );
}
