"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useCurrentShift } from "@/features/pos/api";
import type { Shift } from "@/features/pos/schemas";

/**
 * FR-16.02: nothing sells without an open shift of THIS cashier. No shift → `/pos`
 * (open one); a shift waiting for the manager locks selling and says why (§6).
 */
export function ShiftGuard({ children, allowPending = false }: { children: (shift: Shift) => ReactNode; allowPending?: boolean }) {
  const shift = useCurrentShift();
  const router = useRouter();
  const missing = shift.isSuccess && !shift.data;

  useEffect(() => {
    if (missing) router.replace("/pos");
  }, [missing, router]);

  if (shift.isError) return <ErrorState error={shift.error} onRetry={() => void shift.refetch()} className="m-4" />;
  if (!shift.data) {
    return (
      <div className="grid gap-3 p-4" aria-busy data-testid="pos-skeleton">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (shift.data.status === "pending_manager_approval" && !allowPending) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-6" data-testid="pos-locked">
        <p className="text-lg font-medium">البيع موقوف: الوردية بانتظار اعتماد المدير</p>
        <p className="text-sm text-muted-foreground">
          أُغلقت الوردية بعجز <span className="font-mono tabular-nums" dir="ltr">{shift.data.display_variance}</span>. حين يحسم المدير الفرق تُغلق نهائياً ويمكن فتح وردية جديدة.
        </p>
        <Link href="/pos/shift/close" className={buttonVariants({ variant: "outline", className: "h-12 self-start px-4" })}>
          عرض ملخص الإغلاق
        </Link>
      </div>
    );
  }
  return <>{children(shift.data)}</>;
}
