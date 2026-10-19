import type { Metadata } from "next";
import { PlansScreen } from "@/features/platform-admin/components/billing/plans-screen";

export const metadata: Metadata = { title: "الباقات" };

/** `console.<base>/plans` — M46 US-46.1. */
export default function PlansPage() {
  return <PlansScreen />;
}
