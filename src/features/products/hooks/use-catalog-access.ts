"use client";

import { useAccess } from "@/features/dashboard-shell/components/session-context";

/**
 * M04 permission gates (FR-04.16, M04 §2). There is no `products.*` key among the 35, so
 * editing the product itself is reserved to the owner and the system roles «مدير المتجر» /
 * «مدير الفرع» (M04 §10 assumption) — the same rule the BFF enforces server-side.
 */
export function useCatalogAccess() {
  const { session, canPermission } = useAccess();
  const roles = session.staff?.roles ?? [];
  const canManage = session.kind === "merchant" || roles.some((r) => r === "مدير المتجر" || r === "مدير الفرع");
  return {
    canView: canPermission("inventory.view"),
    canAdjustStock: canPermission("inventory.adjust"),
    canManageDiscounts: canPermission("discounts.manage"),
    canManage,
    isOwner: session.kind === "merchant",
  };
}
