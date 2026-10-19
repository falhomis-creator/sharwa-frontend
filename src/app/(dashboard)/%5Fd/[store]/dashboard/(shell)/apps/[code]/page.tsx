import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppPageScreen } from "@/features/apps/components/apps-screens";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تطبيق", robots: { index: false, follow: false } };

/** `/dashboard/apps/[code]` — M30 US-30.1/30.2/30.4 (T164). */
export default async function AppPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9_]{2,40}$/.test(code)) notFound();
  return <AppPageScreen code={code} />;
}
