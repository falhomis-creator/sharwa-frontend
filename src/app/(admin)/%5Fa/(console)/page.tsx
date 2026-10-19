import type { Metadata } from "next";
import { OverviewScreen } from "@/features/platform-admin/components/overview-screen";

export const metadata: Metadata = { title: "النظرة العامة" };

/** `console.<base>/` — M20 US-20.1. */
export default function AdminOverviewPage() {
  return <OverviewScreen />;
}
