import type { Metadata } from "next";
import { SharwaAiScreen } from "@/features/apps/components/sharwa-ai-screen";

export const metadata: Metadata = { title: "شروة AI", robots: { index: false, follow: false } };

/** `/dashboard/apps/sharwa-ai` — M31 US-31.1/31.5 (T164). */
export default function SharwaAiPage() {
  return <SharwaAiScreen />;
}
