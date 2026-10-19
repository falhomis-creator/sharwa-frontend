import type { Metadata } from "next";
import { CustodyScreen } from "@/features/courier/components/custody-screen";

/** Blocks on the session like its layout (Cache Components). */
export const instant = false;
export const metadata: Metadata = { title: "دفتر العهدة" };

/** `/agent/custody` — M38 (T176). */
export default function Page() {
  return <CustodyScreen />;
}
