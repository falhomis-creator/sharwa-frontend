import type { Metadata } from "next";
import { OverridesScreen } from "@/features/platform-admin/components/billing/overrides-screen";

export const metadata: Metadata = { title: "استثناءات المتاجر" };

/** `console.<base>/features/overrides` — M46 US-46.3. */
export default function FeaturesOverridesPage() {
  return <OverridesScreen />;
}
