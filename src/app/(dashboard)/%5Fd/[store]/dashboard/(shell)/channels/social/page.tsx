import type { Metadata } from "next";
import { ChannelsScreen } from "@/features/channels/components/channels-screen";

export const metadata: Metadata = { title: "قنوات التواصل", robots: { index: false, follow: false } };

/** `/dashboard/channels/social` — M27 US-27.1 (T155). OAuth returns here with `?connected=`. */
export default function ChannelsPage() {
  return <ChannelsScreen />;
}
