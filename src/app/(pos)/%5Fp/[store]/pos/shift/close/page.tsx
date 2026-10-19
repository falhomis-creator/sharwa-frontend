import type { Metadata } from "next";
import { CloseShiftScreen } from "@/features/pos/components/close-shift-screen";

/** The `(pos)` layout may show the plan gate instead of this page (`pos` off) — opted out of instant validation like the layout. */
export const instant = false;

export const metadata: Metadata = { title: "إغلاق الوردية" };

/** `/pos/shift/close` — M16 US-16.4.2/3: preview, then the physical count. */
export default function PosCloseShiftPage() {
  return <CloseShiftScreen />;
}
