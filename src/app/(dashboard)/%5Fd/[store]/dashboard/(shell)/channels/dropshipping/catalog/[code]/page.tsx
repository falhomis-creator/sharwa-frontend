import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupplierCatalogScreen } from "@/features/dropshipping/components/catalog-screen";

export const instant = false;
export const metadata: Metadata = { title: "كتالوج المورد", robots: { index: false, follow: false } };

const CODES = ["cj", "makhazen", "knawat", "flat_feed"] as const;

/** `/dashboard/channels/dropshipping/catalog/[code]` — M29 (T161). */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = CODES.find((x) => x === code);
  if (!c) notFound();
  return <SupplierCatalogScreen code={c} />;
}
