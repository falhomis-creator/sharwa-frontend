import type { Metadata } from "next";
import { SubscriptionsScreen } from "@/features/platform-admin/components/billing/subscriptions-screen";

export const metadata: Metadata = { title: "الاشتراكات" };

/** `console.<base>/subscriptions` — M46 US-46.4. */
export default function SubscriptionsPage() {
  return <SubscriptionsScreen />;
}
