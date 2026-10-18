import type { Metadata } from "next";
import { Suspense } from "react";
import { CartPage } from "@/features/cart/components/cart-page";

/** `/cart` — the same cart as the slide-over, full page (direct links, recovery links — M11 §6). */
export const metadata: Metadata = { title: "السلة", robots: { index: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default function CartRoute() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">السلة</h1>
      <Suspense>
        <CartPage />
      </Suspense>
    </main>
  );
}
