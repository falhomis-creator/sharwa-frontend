import type { Metadata } from "next";
import { TemplatesScreen } from "@/features/channels/components/keywords-templates";

export const metadata: Metadata = { title: "قوالب الردود", robots: { index: false, follow: false } };

/** `/dashboard/channels/social/templates` — M27 US-27.4 (T155). */
export default function TemplatesPage() {
  return <TemplatesScreen />;
}
