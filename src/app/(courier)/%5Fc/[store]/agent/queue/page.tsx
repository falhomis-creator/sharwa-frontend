import type { Metadata } from "next";
import { QueueScreen } from "@/features/courier/components/queue-screen";

/** Blocks on the session like its layout (Cache Components). */
export const instant = false;
export const metadata: Metadata = { title: "الإجراءات المعلّقة" };

/** `/agent/queue` — M38 (T176). */
export default function Page() {
  return <QueueScreen />;
}
