import type { Metadata } from "next";
import { CatalogSyncScreen } from "@/features/channels/components/catalog-sync-screen";

export const metadata: Metadata = { title: "مزامنة الكتالوج", robots: { index: false, follow: false } };

/** `/dashboard/channels/social/catalog` — M27 US-27.5 (T155). */
export default function CatalogSyncPage() {
  return <CatalogSyncScreen />;
}
