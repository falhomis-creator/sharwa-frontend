/**
 * Feature keys (39) and permission keys (35) — verbatim from discovery 01 §7 and 02 §10.
 * The frontend never resolves feature gating itself; it reads the effective lists from the session.
 */
export const FEATURE_KEYS = [
  "refunds",
  "inventory",
  "bulk_upload",
  "marketing",
  "campaigns",
  "promotions",
  "coupon",
  "tracking_tools",
  "timeline",
  "abandoned_carts",
  "influencers",
  "affiliates",
  "bookings",
  "storefront_design",
  "contact_info",
  "store_policies",
  "customer_wallets",
  "reports",
  "shipping_settings",
  "shipping_companies",
  "shipping_providers",
  "payment_gateways",
  "local_wallets",
  "bank_transfers",
  "currency_settings",
  "seo_settings",
  "gift_settings",
  "loyalty_settings",
  "merchantwallet",
  "app_marketplace",
  "pickuplocation",
  "sharwa_ship",
  "customer_report",
  "product_report",
  "multi_location",
  "staff_rbac",
  "social_channels",
  "marketplaces",
  "dropshipping",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const PERMISSION_KEYS = [
  "orders.view",
  "orders.update_status",
  "orders.refund",
  "orders.delete",
  "orders.process_returns",
  "orders.create_b2b",
  "orders.approve_b2b",
  "staff.view",
  "staff.manage",
  "staff.manage_roles",
  "staff.manage_assignments",
  "staff.view_sessions",
  "customers.view",
  "customers.edit_profile",
  "customers.manage_tier",
  "customers.export",
  "inventory.view",
  "inventory.adjust",
  "inventory.writeoff",
  "reports.view",
  "reports.export",
  "reports.sales.view",
  "reports.profit.view",
  "reports.inventory.view",
  "reports.customers.view",
  "reports.staff_performance.view",
  "discounts.apply",
  "discounts.manage",
  "suppliers.manage",
  "suppliers.approve",
  "support.takeover_session",
  "channels.inbox.access",
  "channels.marketplaces.manage",
  "channels.dropshipping.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface AccessSubject {
  /** `merchant` (owner) has every permission; `staff` has an explicit list. */
  kind: "merchant" | "staff";
  features: readonly string[];
  permissions?: readonly string[];
}

export function hasFeature(subject: Pick<AccessSubject, "features">, key: FeatureKey): boolean {
  return subject.features.includes(key);
}

export function hasPermission(subject: AccessSubject, key: PermissionKey): boolean {
  if (subject.kind === "merchant") return true;
  return (subject.permissions ?? []).includes(key);
}

/**
 * Owner-only areas (decision 2026-10-19, Phase 5 open item 1).
 *
 * Store structure and money — locations & routing, theme & sections, domains, webhooks,
 * tracking pixels, payment gateways & payout accounts, the merchant wallet, shipping
 * configuration and the owner-only marketing tools — have NO key among the backend's
 * permissions, so they are the owner's alone. The frontend does not invent keys for them:
 * a key Django never grants would be a gate that can only ever say no.
 *
 * Consequences, applied everywhere through this one helper:
 * - the BFF answers 403 to staff (the server stays the final word);
 * - the sidebar and ⌘K HIDE these entries for staff instead of showing them disabled —
 *   unlike a missing permission, there is nothing a manager could grant;
 * - when Django adds e.g. `settings.manage`, only `ownerOnly` flags flip to a permission.
 */
export function isStoreOwner(subject: Pick<AccessSubject, "kind">): boolean {
  return subject.kind === "merchant";
}
