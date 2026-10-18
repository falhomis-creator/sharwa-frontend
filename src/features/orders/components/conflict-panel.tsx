"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingConflict } from "@/features/orders/hooks/use-order-write";

/** The 409 panel (FR-06.06, US-06.3.5) — inline, never a toast, so it cannot be missed. */
export function ConflictPanel({
  conflict,
  onRetry,
  onDismiss,
  pending = false,
}: {
  conflict: PendingConflict | null;
  onRetry: () => void;
  onDismiss: () => void;
  pending?: boolean;
}) {
  if (!conflict) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-warning/60 p-3 text-sm" data-testid="conflict-panel">
      <p className="font-medium">حُدِّث الطلب #{conflict.orderId} من مستخدم آخر</p>
      <p className="text-muted-foreground">
        لم يُحفظ «{conflict.label}». تظهر الآن آخر نسخة من الطلب؛ أعِد تطبيق تغييرك عليها أو تجاهله.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-11 gap-1.5 lg:h-8" onClick={onRetry} disabled={pending} data-testid="conflict-retry">
          <RefreshCw className="size-3.5" aria-hidden /> تحديث ثم إعادة المحاولة
        </Button>
        <Button size="sm" variant="ghost" className="h-11 lg:h-8" onClick={onDismiss}>
          تجاهل تغييري
        </Button>
      </div>
    </div>
  );
}
