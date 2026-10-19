import type { Metadata } from "next";
import { OpenShiftScreen } from "@/features/pos/components/open-shift-screen";

/** The `(pos)` layout may show the plan gate instead of this page (`pos` off) — opted out of instant validation like the layout. */
export const instant = false;

export const metadata: Metadata = { title: "فتح وردية" };

/** `/pos` — M16 US-16.1: location → register → opening float (or resume the open shift). */
export default function PosHomePage() {
  return <OpenShiftScreen />;
}
