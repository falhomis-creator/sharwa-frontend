"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { orderDetailSchema, type OrderDetail } from "@/features/orders/schemas";
import { useApplyOrder } from "@/features/orders/api";

/**
 * Every order write goes through here (FR-06.06): it sends the `version` the screen holds;
 * a 409 does NOT retry silently — it parks the write and shows the conflict panel
 * «حُدِّث الطلب من مستخدم آخر» with «تحديث ثم إعادة المحاولة», which reloads the order and
 * re-sends the same write with the fresh `version` (US-06.3.5).
 */
export interface PendingConflict {
  orderId: number;
  label: string;
  write: (version: number) => Promise<OrderDetail>;
  success: string;
}

export function useOrderWrite() {
  const apply = useApplyOrder();
  const [conflict, setConflict] = useState<PendingConflict | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    orderId: number,
    version: number,
    write: (version: number) => Promise<OrderDetail>,
    opts: { success: string; label: string },
  ): Promise<OrderDetail | null> {
    setPending(true);
    try {
      const order = await write(version);
      apply(order);
      setConflict(null);
      toast.success(opts.success);
      return order;
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setConflict({ orderId, write, success: opts.success, label: opts.label });
        // Show the other user's change right away; the retry re-applies ours on top.
        void apiFetch(`/api/bff/orders/${orderId}`, orderDetailSchema).then(apply, () => undefined);
        return null;
      }
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function retryConflict() {
    if (!conflict) return null;
    setPending(true);
    try {
      const fresh = await apiFetch(`/api/bff/orders/${conflict.orderId}`, orderDetailSchema);
      apply(fresh);
      return await run(conflict.orderId, fresh.version, conflict.write, conflict);
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر تحديث الطلب.");
      setPending(false);
      return null;
    }
  }

  return { run, conflict, retryConflict, dismissConflict: () => setConflict(null), pending };
}
