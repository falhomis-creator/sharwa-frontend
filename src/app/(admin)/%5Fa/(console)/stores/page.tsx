import type { Metadata } from "next";
import { StoresScreen } from "@/features/platform-admin/components/stores/stores-screen";

export const metadata: Metadata = { title: "المتاجر" };

/** `console.<base>/stores` — M20 US-20.2. */
export default function AdminStoresPage() {
  return <StoresScreen />;
}
