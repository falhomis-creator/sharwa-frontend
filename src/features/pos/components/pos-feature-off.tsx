"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Full-screen plan gate of the POS (Phase 7 decision 1: POS is subscription-gated by the
 * `pos` feature key). Rendered by the `(pos)` layout BEFORE the till chrome, so a store
 * without the feature never opens a shift. Text only (constitution I); 44px tap targets.
 * The owner is pointed at the plan; a staff member at the owner — they cannot upgrade.
 */
export function PosPlanGate({ enabled, isOwner, children }: { enabled: boolean; isOwner: boolean; children: ReactNode }) {
  return enabled ? <>{children}</> : <PosFeatureOff isOwner={isOwner} />;
}

export function PosFeatureOff({ isOwner }: { isOwner: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
      <div role="status" data-testid="feature-off" className="flex w-full max-w-md flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6">
        <p className="text-base font-medium">نقطة البيع غير متاحة في خطتك</p>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "نقطة البيع ميزة ضمن باقات الاشتراك. رقِّ خطتك أو تواصل مع دعم شروة لتفعيلها."
            : "نقطة البيع غير مفعّلة لهذا المتجر. اطلب من مالك المتجر تفعيلها في خطة الاشتراك."}
        </p>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
          العودة إلى اللوحة
        </Link>
      </div>
    </main>
  );
}
