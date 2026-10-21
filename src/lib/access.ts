/**
 * Feature keys (39 + `pos`) and permission keys — verbatim from discovery 01 §7 and 02 §10, plus
 * `catalog.manage` (Django migration 0210, decision 2026-10-21).
 * The frontend never resolves feature gating itself; it reads the effective lists from the session.
 *
 * `pos` is the one key not in discovery 01 §7: the owner made M16 POS a subscription-gated
 * feature (decision 2026-10-19, Phase 7 item 1). `[NEEDS BACKEND]` — Django must add
 * `FeatureFlag(code="pos", requires_plan=True)` so `features[]` carries it.
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
  "pos",
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
  // M05/M04 — products & organization (Django migration 0210, decision 2026-10-21).
  "catalog.manage",
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

/** One feature key or a list of alternatives (any-of), like {@link PermissionGate}. */
export type FeatureGate = FeatureKey | readonly FeatureKey[];

export function passesFeatureGate(subject: Pick<AccessSubject, "features">, gate: FeatureGate): boolean {
  return typeof gate === "string" ? hasFeature(subject, gate) : gate.some((key) => hasFeature(subject, key));
}

/**
 * Courier supervision (M39 US-39.5 screen + agent shifts + emergency reassignment) is about
 * the store's OWN delivery agents, not Sharwa Ship alone: it opens with Sharwa Ship OR local
 * delivery (`shipping_providers`, M15 agents). Decision 2026-10-19, Phase 7 item 3.
 */
export const COURIER_SUPERVISION_FEATURES = ["sharwa_ship", "shipping_providers"] as const satisfies readonly FeatureKey[];

export function hasPermission(subject: AccessSubject, key: PermissionKey): boolean {
  if (subject.kind === "merchant") return true;
  return (subject.permissions ?? []).includes(key);
}

/**
 * A gate is one permission key or a list of alternatives (OR). Lists exist because some
 * screens are open to more than one role — e.g. «أوامر الشراء» is for whoever manages
 * suppliers OR approves purchases (M23 FR-23.01; decision 2026-10-19, Phase 7 item 2).
 */
export type PermissionGate = PermissionKey | readonly PermissionKey[];

/** True when the subject holds at least one of `keys`. An empty list allows nobody but the owner. */
export function hasAnyPermission(subject: AccessSubject, keys: readonly PermissionKey[]): boolean {
  if (subject.kind === "merchant") return true;
  return keys.some((key) => hasPermission(subject, key));
}

/** Resolves a {@link PermissionGate}: a single key or any-of a list. */
export function passesGate(subject: AccessSubject, gate: PermissionGate): boolean {
  return typeof gate === "string" ? hasPermission(subject, gate) : hasAnyPermission(subject, gate);
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
