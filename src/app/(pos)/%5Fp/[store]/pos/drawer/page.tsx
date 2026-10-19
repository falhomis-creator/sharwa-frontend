import type { Metadata } from "next";
import { DrawerScreen } from "@/features/pos/components/drawer-screen";

export const metadata: Metadata = { title: "درج الكاش" };

/** `/pos/drawer` — M16 US-16.4.1: the shift's cash movements + add a movement. */
export default function PosDrawerPage() {
  return <DrawerScreen />;
}
