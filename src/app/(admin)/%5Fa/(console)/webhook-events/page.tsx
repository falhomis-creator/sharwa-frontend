import type { Metadata } from "next";
import { WebhookEventsScreen } from "@/features/platform-admin/components/stores/webhook-events-screen";

export const metadata: Metadata = { title: "أحداث Webhook المعلّقة" };

/** `console.<base>/webhook-events` — M20 US-20.7 a1. */
export default function AdminWebhookEventsPage() {
  return <WebhookEventsScreen />;
}
