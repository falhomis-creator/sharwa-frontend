import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront } from "@/features/storefront/api/context";
import { getTracking } from "@/features/tracking/api";
import { TrackingView } from "@/features/tracking/components/tracking-view";

/**
 * `/track/[uuid]` (M41, T093 — the task's path; M06 already links `tracking_url` here). No
 * login: the public UUID is the only key. Unknown UUIDs — or another store's — get the same
 * «لم نجد هذا الطلب» (US-41.5), never a hint that it exists elsewhere. `noindex` (FR-41.10).
 */
export const metadata: Metadata = { title: "تتبّع الطلب", robots: { index: false, follow: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default async function TrackingPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const ctx = await getStorefront();
  const data = await getTracking(ctx.store, ctx.storeHost, decodeURIComponent(uuid));
  if (!data) notFound();
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6 md:py-10">
      <TrackingView initial={data} timezone={ctx.config.timezone ?? "Asia/Aden"} />
    </main>
  );
}
