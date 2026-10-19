import type { Metadata } from "next";
import { InboxScreen } from "@/features/inbox/components/inbox-screen";

export const metadata: Metadata = { title: "المحادثات", robots: { index: false, follow: false } };

/** `/dashboard/inbox` — M27 US-27.2/27.3 (T155). Client-fetched and polled through the BFF. */
export default function InboxPage() {
  return <InboxScreen />;
}
