import { Banknote, Boxes, Gauge, LayoutGrid, Store, type LucideIcon } from "lucide-react";

/**
 * Console navigation (M20 §6 «الشاشات», M45 §6, M46 §6). Visible paths are on
 * `console.<base>`; the proxy rewrites them to `/_a/*` (never reachable from the network).
 *
 * Two deliberate path choices (tasks.md Phase 6 deviations):
 * - M45/M46 named `/master-dashboard/*`; the console keeps ONE root, so dues are `/dues`
 *   and plans `/plans` like the rest of M20's `/admin/*` list (minus the `admin` prefix,
 *   which the `console.` host already says).
 * - A customer wallet is `/wallets/<phone>`, not `/sharwa-pay/wallets/<phone>`.
 */
export type AdminCounter = "failed_stores" | "pending_topups" | "pending_withdrawals" | "pending_webhook_events";

export interface AdminNavItem {
  key: string;
  title: string;
  path: string;
  keywords: string[];
  counter?: AdminCounter;
  shortcut?: string;
}

export interface AdminNavGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

export const ADMIN_OVERVIEW: AdminNavItem = { key: "overview", title: "النظرة العامة", path: "/", keywords: ["الرئيسية", "إحصاءات", "platform_master_dashboard"] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: "stores",
    title: "المتاجر",
    icon: Store,
    items: [
      { key: "stores.all", title: "كل المتاجر", path: "/stores", keywords: ["متجر", "عميل", "Client", "إعادة التجهيز"], counter: "failed_stores", shortcut: "G S" },
      { key: "stores.webhooks", title: "أحداث Webhook المعلّقة", path: "/webhook-events", keywords: ["webhook", "حدث", "PendingWebhookEvent"], counter: "pending_webhook_events" },
    ],
  },
  {
    key: "billing",
    title: "الباقات والميزات",
    icon: Gauge,
    items: [
      { key: "billing.plans", title: "الباقات", path: "/plans", keywords: ["باقة", "خطة", "Plan", "سعر"] },
      { key: "billing.matrix", title: "مصفوفة الميزات", path: "/plans/matrix", keywords: ["PlanFeature", "مصفوفة"] },
      { key: "billing.features", title: "الميزات والإيقاف الطارئ", path: "/features", keywords: ["ميزة", "Feature", "kill switch", "إيقاف"] },
      { key: "billing.overrides", title: "استثناءات المتاجر", path: "/features/overrides", keywords: ["استثناء", "TenantFeatureOverride", "تجاوز"] },
      { key: "billing.subscriptions", title: "الاشتراكات", path: "/subscriptions", keywords: ["اشتراك", "Subscription", "assign_plan"] },
      { key: "billing.settings", title: "المفاتيح الرئيسية والحسم", path: "/billing-settings", keywords: ["subscriptions_enabled", "commission_enabled", "افحص متجراً", "الحسم"] },
    ],
  },
  {
    key: "money",
    title: "المال",
    icon: Banknote,
    items: [
      { key: "money.dues", title: "المستحقات", path: "/dues", keywords: ["عمولة", "رسوم", "تحصيل", "إعفاء", "platform_dues"], shortcut: "G D" },
      { key: "money.topups", title: "طلبات شحن شروة باي", path: "/sharwa-pay/topups", keywords: ["شحن", "إيصال", "SharwaPayTopupRequest"], counter: "pending_topups" },
      { key: "money.withdrawals", title: "طلبات السحب", path: "/sharwa-pay/withdrawals", keywords: ["سحب", "SharwaPayWithdrawalRequest"], counter: "pending_withdrawals" },
    ],
  },
  {
    key: "catalog",
    title: "الكتالوج",
    icon: LayoutGrid,
    items: [
      { key: "catalog.apps", title: "التطبيقات", path: "/apps", keywords: ["تطبيق", "App", "AppBillingOverride"] },
      { key: "catalog.categories", title: "فئات السوق", path: "/market-categories", keywords: ["فئة", "MarketCategory", "قطاع"] },
      { key: "catalog.zones", title: "مناطق شروة شيب", path: "/sharwa-ship/zones", keywords: ["منطقة", "SharwaShipZone", "شحن"] },
    ],
  },
];

export const ADMIN_GROUP_ICON_FALLBACK = Boxes;

export function flatAdminNav(): Array<AdminNavItem & { group: string }> {
  return [{ ...ADMIN_OVERVIEW, group: "اللوحة" }, ...ADMIN_NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })))];
}

/** The most specific nav path for a pathname (`/plans/matrix` must not light up `/plans`). */
export function activePath(pathname: string): string | null {
  const all = flatAdminNav().map((i) => i.path);
  const hits = all.filter((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
  return hits.sort((a, b) => b.length - a.length)[0] ?? null;
}
