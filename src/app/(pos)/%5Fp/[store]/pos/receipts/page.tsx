import type { Metadata } from "next";
import { ReceiptsScreen } from "@/features/pos/components/receipts-screen";

export const metadata: Metadata = { title: "الإيصالات" };

/** `/pos/receipts` — the current shift's receipts, searchable by number. */
export default function PosReceiptsPage() {
  return <ReceiptsScreen />;
}
