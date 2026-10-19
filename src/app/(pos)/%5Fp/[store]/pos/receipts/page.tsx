import type { Metadata } from "next";
import { ReceiptsScreen } from "@/features/pos/components/receipts-screen";

/** The `(pos)` layout may show the plan gate instead of this page (`pos` off) — opted out of instant validation like the layout. */
export const instant = false;

export const metadata: Metadata = { title: "الإيصالات" };

/** `/pos/receipts` — the current shift's receipts, searchable by number. */
export default function PosReceiptsPage() {
  return <ReceiptsScreen />;
}
