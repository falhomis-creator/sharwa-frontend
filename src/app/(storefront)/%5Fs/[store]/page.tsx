import { Mono } from "@/components/shared/mono";
import { probeStore } from "@/features/tenant/api/probe";
import { requestIdentity } from "@/features/tenant/request";

/**
 * Temporary storefront home — replaced by M09 in Phase 4 (task T086+).
 * It exists now only to prove the tenant guard end to end: the name rendered here comes
 * from this store's own `/api/v1/config/` and from no shared cache (SC-47.1).
 */
export default async function StorefrontHomePage({ params }: { params: Promise<{ store: string }> }) {
  const [{ store }, identity] = await Promise.all([params, requestIdentity()]);
  const storeHost = identity.storeHost;
  const probe = await probeStore({ store, storeHost });

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 data-testid="store-name" className="text-2xl font-semibold tracking-tight md:text-3xl">
        متجر {probe.config?.store_name ?? store}
      </h1>
      <p className="text-sm text-muted-foreground">
        العنوان <Mono data-testid="store-host">{storeHost}</Mono>
      </p>
      <p className="max-w-prose text-sm text-muted-foreground">
        واجهة المتجر تُبنى في المرحلة الرابعة (M09–M12). هذه الصفحة مؤقتة وتتحقق من حلّ المستأجر فقط.
      </p>
    </main>
  );
}
