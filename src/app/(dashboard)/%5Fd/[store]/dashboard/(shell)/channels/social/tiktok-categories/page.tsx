import type { Metadata } from "next";
import { TiktokCategoriesScreen } from "@/features/channels/components/mapping-access";

export const metadata: Metadata = { title: "ربط فئات تيك توك", robots: { index: false, follow: false } };

/** `/dashboard/channels/social/tiktok-categories` — M27 US-27.5 (T155). */
export default function TiktokCategoriesPage() {
  return <TiktokCategoriesScreen />;
}
