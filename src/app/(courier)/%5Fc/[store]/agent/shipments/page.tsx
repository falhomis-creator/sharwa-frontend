import type { Metadata } from "next";
import { Suspense } from "react";
import { ShellSkeleton } from "@/features/courier/components/shell";
import { ShipmentsScreen } from "@/features/courier/components/shipments-screen";

/** Blocks on the session like its layout (Cache Components). */
export const instant = false;
export const metadata: Metadata = { title: "شحناتي" };

/** `/agent/shipments?status=` — M38 (T176). */
export default function Page() {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <ShipmentsScreen />
    </Suspense>
  );
}
