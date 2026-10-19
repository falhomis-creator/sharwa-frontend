import type { Metadata } from "next";
import { SellScreen } from "@/features/pos/components/sell-screen";

/** The `(pos)` layout may show the plan gate instead of this page (`pos` off) — opted out of instant validation like the layout. */
export const instant = false;

export const metadata: Metadata = { title: "البيع" };

/** `/pos/sell` — M16 US-16.2/16.3: search/barcode + grid, the cart at the start side. */
export default function PosSellPage() {
  return <SellScreen />;
}
