import type { Metadata } from "next";
import { AppsScreen } from "@/features/platform-admin/components/catalog/apps-screen";

export const metadata: Metadata = { title: "التطبيقات" };

/** `console.<base>/apps` — M46 US-46.5. */
export default function AppsPage() {
  return <AppsScreen />;
}
