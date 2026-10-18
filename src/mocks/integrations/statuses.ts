import type { Session } from "@/features/dashboard-shell/schemas";
import type { IntegrationGroup, IntegrationStatus, IntegrationStatusValue } from "@/features/integrations/schemas";
import { hasFeature, hasPermission, type FeatureKey, type PermissionKey } from "@/lib/access";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW } from "@/mocks/store-state";

/**
 * M19 integrations overview `[NEEDS BACKEND]` (`GET /api/v1/integrations/status/`). Until the
 * aggregate exists this mock stands in for the M27–M31/M15 reads. Rows the member has no
 * permission for are removed server-side (US-19.4.2); a row whose plan feature is off stays
 * with `available:false` («غير متاح», FR-19.08).
 */
interface Def {
  code: string;
  name: string;
  group: IntegrationGroup;
  manage_href: string;
  /** Staff need this permission to see the row; `null` → owner only. */
  permission: PermissionKey | null;
  feature?: FeatureKey;
}

const DEFS: Def[] = [
  { code: "whatsapp", name: "واتساب (SharwaConnect)", group: "apps", manage_href: "/dashboard/apps", permission: "channels.inbox.access", feature: "app_marketplace" },
  { code: "sharwa_ai", name: "Sharwa AI", group: "apps", manage_href: "/dashboard/apps", permission: null, feature: "app_marketplace" },
  { code: "meta", name: "Meta (فيسبوك وإنستغرام)", group: "channels", manage_href: "/dashboard/channels/social", permission: "channels.inbox.access", feature: "social_channels" },
  { code: "tiktok", name: "TikTok", group: "channels", manage_href: "/dashboard/channels/social", permission: "channels.inbox.access", feature: "social_channels" },
  { code: "telegram", name: "Telegram", group: "channels", manage_href: "/dashboard/channels/social", permission: "channels.inbox.access", feature: "social_channels" },
  { code: "amazon", name: "Amazon", group: "marketplaces", manage_href: "/dashboard/channels/marketplaces", permission: "channels.marketplaces.manage", feature: "marketplaces" },
  { code: "noon", name: "noon", group: "marketplaces", manage_href: "/dashboard/channels/marketplaces", permission: "channels.marketplaces.manage", feature: "marketplaces" },
  { code: "cj", name: "CJ Dropshipping", group: "suppliers", manage_href: "/dashboard/channels/dropshipping", permission: "channels.dropshipping.manage", feature: "dropshipping" },
  { code: "makhazen", name: "مخازن", group: "suppliers", manage_href: "/dashboard/channels/dropshipping", permission: "channels.dropshipping.manage", feature: "dropshipping" },
  { code: "knawat", name: "Knawat", group: "suppliers", manage_href: "/dashboard/channels/dropshipping", permission: "channels.dropshipping.manage", feature: "dropshipping" },
  { code: "flat_feed", name: "موجز ملفات (CSV/XML)", group: "suppliers", manage_href: "/dashboard/channels/dropshipping", permission: "channels.dropshipping.manage", feature: "dropshipping" },
  { code: "aramex", name: "Aramex", group: "carriers", manage_href: "/dashboard/shipping/carriers", permission: null, feature: "shipping_companies" },
  { code: "smsa", name: "SMSA Express", group: "carriers", manage_href: "/dashboard/shipping/carriers", permission: null, feature: "shipping_companies" },
];

const MIN = 60_000;
/** The demo store's state: [status, minutes since the last inbound event, detail]. */
const DEMO: Record<string, [IntegrationStatusValue, number | null, string | null]> = {
  whatsapp: ["connected", 4, null],
  sharwa_ai: ["connected", 38, null],
  meta: ["connected", 12, null],
  tiktok: ["error", 3 * 24 * 60, "انتهت صلاحية الربط — أعد الربط من صفحة القنوات."],
  telegram: ["disconnected", null, null],
  amazon: ["connected", 95, null],
  noon: ["disconnected", null, null],
  cj: ["connected", 7 * 60, null],
  makhazen: ["disconnected", null, null],
  knawat: ["error", 26 * 60, "رفض المورد مفتاح الواجهة — حدّثه من إعدادات المورد."],
  flat_feed: ["connected", 22 * 60, null],
  aramex: ["connected", 55, null],
  smsa: ["disconnected", null, null],
};

export function listIntegrationStatuses(store: string | null, session: Session): IntegrationStatus[] {
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  const empty = isEmptyStore(store);
  return DEFS.filter((d) => session.kind === "merchant" || (d.permission !== null && hasPermission(subject, d.permission))).map((d) => {
    const [status, minutes, detail] = empty ? (["disconnected", null, null] as const) : (DEMO[d.code] ?? ["disconnected", null, null]);
    return {
      code: d.code,
      name: d.name,
      group: d.group,
      status,
      available: d.feature ? hasFeature(subject, d.feature) : true,
      last_event_at: minutes === null ? null : new Date(FIXTURE_NOW - minutes * MIN).toISOString(),
      detail,
      manage_href: d.manage_href,
    };
  });
}
