import type { Metadata } from "next";
import { OrderSuccess } from "@/features/checkout/components/order-success";

/** `/checkout/success/[public_uuid]` (M12 US-12.6.3) — personal, never indexed. */
export const metadata: Metadata = { title: "تم استلام طلبك", robots: { index: false, follow: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function CheckoutSuccessPage({ params }: { params: Promise<{ public_uuid: string }> }) {
  const { public_uuid } = await params;
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6 md:py-12">
      <OrderSuccess uuid={public_uuid} mode="success" />
    </main>
  );
}
