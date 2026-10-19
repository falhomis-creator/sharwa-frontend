import type { Metadata } from "next";
import { DuesOverviewScreen } from "@/features/platform-admin/components/money/dues-overview-screen";

export const metadata: Metadata = { title: "المستحقات" };

/** `console.<base>/dues` — M45 US-45.1. */
export default function DuesPage() {
  return <DuesOverviewScreen />;
}
