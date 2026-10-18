import type { Metadata } from "next";
import { WishlistView } from "@/features/storefront/components/wishlist-view";

/** `/wishlist` — the local wishlist (M09 §10, M10 US-10.7.2; server sync waits for E-42). */
export const metadata: Metadata = { title: "المفضلة", robots: { index: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default function WishlistPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">المفضلة</h1>
      <WishlistView />
    </main>
  );
}
