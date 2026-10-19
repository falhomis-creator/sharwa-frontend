import type { Metadata } from "next";
import { StoreDetailScreen } from "@/features/platform-admin/components/stores/store-detail";

export const metadata: Metadata = { title: "تفاصيل المتجر" };

/** Blocks on `params` like the console layout it renders in. */
export const instant = false;

/** `console.<base>/stores/<schema>` — M20 US-20.2 a5. */
export default async function AdminStorePage({ params }: { params: Promise<{ schema: string }> }) {
  const { schema } = await params;
  return <StoreDetailScreen schema={decodeURIComponent(schema)} />;
}
