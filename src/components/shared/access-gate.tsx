"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { FeatureKey, PermissionKey } from "@/lib/access";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";

/**
 * The two gate states of FR-011 that every dashboard screen must render in full, not as a
 * blank page: the feature is off for this plan, or the member lacks the permission. Text
 * only (constitution I). Used by the Phase 5 modules; the sidebar hides the same screens.
 */
export function FeatureOffState({ title = "هذه الميزة غير متاحة في خطتك", description, className }: { title?: string; description?: string; className?: string }) {
  return (
    <div role="status" data-testid="feature-off" className={cn("flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6 md:p-8", className)}>
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-prose text-sm text-muted-foreground">{description ?? "فعّلها من خطة الاشتراك، أو تواصل مع دعم شروة لترقية خطتك."}</p>
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
        العودة إلى النظرة العامة
      </Link>
    </div>
  );
}

export function ForbiddenState({ title = "ليست لديك صلاحية لعرض هذه الصفحة", description, className }: { title?: string; description?: string; className?: string }) {
  return (
    <div role="status" data-testid="forbidden" className={cn("flex flex-col items-start gap-3 rounded-lg border border-border p-6 md:p-8", className)}>
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-prose text-sm text-muted-foreground">{description ?? "اطلب الصلاحية من مالك المتجر أو مدير المتجر."}</p>
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
        العودة إلى النظرة العامة
      </Link>
    </div>
  );
}

/**
 * Wrap a screen: the feature gate first (the plan), then the permission gate (the member).
 * `readOnly` screens pass no permission and gate the writes themselves.
 */
export function AccessGate({ feature, permission, children }: { feature?: FeatureKey; permission?: PermissionKey; children: ReactNode }) {
  const { canFeature, canPermission } = useAccess();
  if (feature && !canFeature(feature)) return <FeatureOffState />;
  if (permission && !canPermission(permission)) return <ForbiddenState />;
  return <>{children}</>;
}
