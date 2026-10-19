import type { Metadata } from "next";
import { KeywordsScreen } from "@/features/channels/components/keywords-templates";

export const metadata: Metadata = { title: "المحفّزات", robots: { index: false, follow: false } };

/** `/dashboard/channels/social/keywords` — M27 US-27.4 (T155). */
export default function KeywordsPage() {
  return <KeywordsScreen />;
}
