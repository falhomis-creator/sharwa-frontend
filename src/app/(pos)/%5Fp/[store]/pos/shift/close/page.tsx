import type { Metadata } from "next";
import { CloseShiftScreen } from "@/features/pos/components/close-shift-screen";

export const metadata: Metadata = { title: "إغلاق الوردية" };

/** `/pos/shift/close` — M16 US-16.4.2/3: preview, then the physical count. */
export default function PosCloseShiftPage() {
  return <CloseShiftScreen />;
}
