import type { Metadata } from "next";
import { FeaturesScreen } from "@/features/platform-admin/components/billing/features-screen";

export const metadata: Metadata = { title: "الميزات والإيقاف الطارئ" };

/** `console.<base>/features` — M46 US-46.2. */
export default function FeaturesPage() {
  return <FeaturesScreen />;
}
