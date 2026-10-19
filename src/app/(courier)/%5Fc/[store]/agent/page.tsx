import type { Metadata } from "next";
import { ShiftScreen } from "@/features/courier/components/shift-screen";

/** Blocks on the session like its layout (Cache Components). */
export const instant = false;
export const metadata: Metadata = { title: "المناوبة" };

/** `/agent` — M38 (T176). */
export default function Page() {
  return <ShiftScreen />;
}
