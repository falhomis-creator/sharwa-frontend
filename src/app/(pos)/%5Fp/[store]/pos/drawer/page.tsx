import type { Metadata } from "next";
import { DrawerScreen } from "@/features/pos/components/drawer-screen";

/** The `(pos)` layout may show the plan gate instead of this page (`pos` off) — opted out of instant validation like the layout. */
export const instant = false;

export const metadata: Metadata = { title: "درج الكاش" };

/** `/pos/drawer` — M16 US-16.4.1: the shift's cash movements + add a movement. */
export default function PosDrawerPage() {
  return <DrawerScreen />;
}
