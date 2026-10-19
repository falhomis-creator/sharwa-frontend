import { Suspense } from "react";
import type { Metadata } from "next";
import { StoresScreen } from "@/features/stores-rollup/components/stores-screen";

export const metadata: Metadata = { title: "كل متاجري", robots: { index: false, follow: false } };

/** `/dashboard/stores` — M43 US-43.1: the owner's linked stores + the server's totals. */
export default function StoresRollupPage() {
  return (
    <Suspense fallback={null}>
      <StoresScreen />
    </Suspense>
  );
}
