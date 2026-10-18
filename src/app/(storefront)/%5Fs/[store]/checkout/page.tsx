import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutScreen } from "@/features/checkout/components/checkout-screen";

/** `/checkout` (M12 FR-12.01, FR-12.11): one page, never indexed. */
export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false, follow: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default function CheckoutPage() {
  return (
    <main id="main" className="flex-1">
      <Suspense>
        <CheckoutScreen />
      </Suspense>
    </main>
  );
}
