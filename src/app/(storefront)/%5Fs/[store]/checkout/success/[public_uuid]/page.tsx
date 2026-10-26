import type { Metadata } from "next";
import { OrderSuccess } from "@/features/checkout/components/order-success";
import { getStoreConfig } from "@/features/storefront/api/config";
import { AdsConversion } from "@/features/storefront/components/tracking-scripts";
import { requestIdentity } from "@/features/tenant/request";

/** `/checkout/success/[public_uuid]` (M12 US-12.6.3) — personal, never indexed. */
export const metadata: Metadata = { title: "تم استلام طلبك", robots: { index: false, follow: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function CheckoutSuccessPage({ params }: { params: Promise<{ public_uuid: string }> }) {
  const { public_uuid } = await params;
  const identity = await requestIdentity();
  // Same cached read as the layout; a failure only skips the Ads conversion (M19, INT-023).
  const config = await getStoreConfig(identity.store, identity.storeHost).catch(() => null);
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6 md:py-12">
      <AdsConversion tracking={config?.tracking ?? null} orderId={public_uuid} />
      <OrderSuccess uuid={public_uuid} mode="success" />
    </main>
  );
}
