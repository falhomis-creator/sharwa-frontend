"use client";

import { useAccess } from "@/features/dashboard-shell/components/session-context";

/**
 * M04/M05 permission gates (FR-04.16). Editing products and the catalogue organization needs
 * `catalog.manage` (Django migration 0210): the owner has it implicitly, the system roles
 * «مدير المتجر» / «مدير الفرع» get it at seed time, and the merchant can grant it to any role.
 * The same key the BFF and Django enforce server-side.
 */
export function useCatalogAccess() {
  const { session, canPermission } = useAccess();
  return {
    canView: canPermission("inventory.view"),
    canAdjustStock: canPermission("inventory.adjust"),
    canManageDiscounts: canPermission("discounts.manage"),
    canManage: canPermission("catalog.manage"),
    isOwner: session.kind === "merchant",
  };
}
