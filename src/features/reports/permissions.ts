import type { FeatureKey, PermissionKey } from "@/lib/access";

/**
 * M25 §5 «خريطة الصلاحيات» — the UI's first layer (the server stays the final word: 403).
 * Pure module (no "use client"): the client index, the mock registry and the check script
 * all read the same map, so the hidden count the UI shows is the one the mock predicts.
 *
 * Every report needs the base `reports.view`; some add a category key on top. Exports add
 * `reports.export`. The `inventory` category also needs the `inventory` plan feature
 * (FR-25.11).
 */
const BY_CODE: Partial<Record<string, PermissionKey>> = {
  sales_overview: "reports.sales.view",
  best_sellers: "reports.sales.view",
  orders: "reports.sales.view",
  pos: "reports.sales.view",
  coupons: "reports.sales.view",
  payment_gateways: "reports.sales.view",
  store_overview: "reports.profit.view",
  taxes: "reports.profit.view",
  platform_commissions: "reports.profit.view",
  wallet_custody: "reports.profit.view",
  operating_expenses: "reports.profit.view",
  currencies: "reports.profit.view",
  inventory_overview: "reports.inventory.view",
  wishlists: "reports.customers.view",
  loyalty: "reports.customers.view",
  staff_performance: "reports.staff_performance.view",
  audit_log: "reports.staff_performance.view",
};

const BY_CATEGORY: Partial<Record<string, PermissionKey>> = {
  inventory: "reports.inventory.view",
  customers: "reports.customers.view",
};

/** The one key a report adds on top of `reports.view` (or `reports.view` itself). */
export function reportPermission(code: string, category: string): PermissionKey {
  return BY_CODE[code] ?? BY_CATEGORY[category] ?? "reports.view";
}

/** The plan features a report needs (FR-25.11). */
export function reportFeatures(category: string): FeatureKey[] {
  return category === "inventory" ? ["reports", "inventory"] : ["reports"];
}

export interface ReportSubject {
  kind: "merchant" | "staff";
  features: readonly string[];
  permissions?: readonly string[];
}

/** May this member open the report? Owner: every report whose plan features are on. */
export function canOpenReport(subject: ReportSubject, code: string, category: string): boolean {
  if (!reportFeatures(category).every((f) => subject.features.includes(f))) return false;
  if (subject.kind === "merchant") return true;
  const perms = subject.permissions ?? [];
  return perms.includes("reports.view") && perms.includes(reportPermission(code, category));
}

export function canExportReport(subject: ReportSubject, code: string, category: string): boolean {
  if (!canOpenReport(subject, code, category)) return false;
  return subject.kind === "merchant" || (subject.permissions ?? []).includes("reports.export");
}
