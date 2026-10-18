import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderSuccess } from "@/features/checkout/components/order-success";

/** `/checkout/result?order=` — the gateway's return URL; the status is read from the server (FR-12.10). */
export const metadata: Metadata = { title: "نتيجة الدفع", robots: { index: false, follow: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function CheckoutResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const uuid = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  if (!uuid) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6 md:py-12">
      <OrderSuccess uuid={uuid} mode="gateway" />
    </main>
  );
}
