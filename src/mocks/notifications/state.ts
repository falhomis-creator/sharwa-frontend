import { hasPermission, type PermissionKey } from "@/lib/access";
import type { Session } from "@/features/dashboard-shell/schemas";
import type { Notification, NotificationSummary } from "@/features/notifications/schemas";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { ordersState } from "@/mocks/orders/state";

/**
 * M49 fixture (`[NEEDS BACKEND]`): what Django would generate from its events — new orders
 * (grouped by `group_key`), transfers to review, pending approvals, a critical behaviour
 * alert, low stock, a failed marketplace sync, an export, a billing notice.
 *
 * Permission trimming happens HERE (server side, FR-49.02): a cashier never receives an
 * approval or a sync failure. The UI does no permission filtering of its own.
 */
type Row = Notification & { permission?: PermissionKey; merchantOnly?: boolean };

const minutesAgo = (m: number) => new Date(FIXTURE_NOW - m * 60_000).toISOString();

function seed(store: string | null): Row[] {
  if (isEmptyStore(store)) {
    return [
      {
        id: 1,
        kind: "provisioning_notice",
        severity: "info",
        title: "متجرك جاهز",
        body: "اكتمل تجهيز المتجر. أضف أول منتج وشارك رابط متجرك.",
        link: "/dashboard/products",
        group_key: "provisioning",
        count: 1,
        created_at: minutesAgo(30),
        read_at: null,
        source_ref: null,
        merchantOnly: true,
      },
    ];
  }
  const orders = ordersState(store).orders;
  const newest = orders.filter((o) => o.status === "new").slice(0, 4);
  const review = orders.filter((o) => o.status === "payment_review" || o.status === "awaiting_payment").slice(0, 2);
  const low = catalog(store).products.filter((p) => !p.archived_at && Number(p.stock) > 0 && Number(p.stock) <= 3).slice(0, 2);
  let id = 0;
  const rows: Row[] = [];
  newest.forEach((o, i) =>
    rows.push({
      id: ++id,
      kind: "order_new",
      severity: "info",
      title: `طلب جديد #${o.id}`,
      body: `${o.customer_name}`,
      link: `/dashboard/orders/${o.id}`,
      group_key: "order_new:recent",
      count: 1,
      created_at: minutesAgo(4 + i * 2),
      read_at: null,
      source_ref: { type: "order", id: o.id },
      permission: "orders.view",
    }),
  );
  review.forEach((o, i) =>
    rows.push({
      id: ++id,
      kind: "payment_review",
      severity: "warning",
      title: `إيصال تحويل للطلب #${o.id}`,
      body: "العميل رفع إيصال التحويل؛ راجع المبلغ ثم أكّد الاستلام.",
      link: `/dashboard/orders/${o.id}`,
      group_key: `payment_review:${o.id}`,
      count: 1,
      created_at: minutesAgo(25 + i * 40),
      read_at: null,
      source_ref: { type: "order", id: o.id },
      permission: "orders.view",
    }),
  );
  rows.push({
    id: ++id,
    kind: "behavior_alert",
    severity: "critical",
    title: "تصدير بيانات غير معتاد",
    body: "موظف صدّر 1,200 سجل عميل خلال ساعة.",
    link: "/dashboard/staff/alerts",
    group_key: "behavior_alert:export",
    count: 1,
    created_at: minutesAgo(48),
    read_at: null,
    source_ref: { type: "behavior_alert", id: 31 },
    permission: "staff.view",
  });
  rows.push({
    id: ++id,
    kind: "approval_pending",
    severity: "warning",
    title: "3 طلبات موافقة معلّقة",
    body: "استرجاع مبلغ، عجز وردية، خصم استثنائي.",
    link: "/dashboard/staff/approvals",
    group_key: "approval_pending",
    count: 3,
    created_at: minutesAgo(70),
    read_at: null,
    source_ref: null,
    merchantOnly: true,
  });
  low.forEach((p, i) =>
    rows.push({
      id: ++id,
      kind: "low_stock",
      severity: "warning",
      title: `مخزون منخفض: ${p.name}`,
      body: `المتبقي ${Number(p.stock)} فقط.`,
      link: `/dashboard/inventory?status=low&q=${encodeURIComponent(p.sku)}`,
      group_key: `low_stock:${p.id}`,
      count: 1,
      created_at: minutesAgo(120 + i * 30),
      read_at: i === 1 ? minutesAgo(60) : null,
      source_ref: { type: "product", id: p.id },
      permission: "inventory.view",
    }),
  );
  rows.push({
    id: ++id,
    kind: "sync_failed",
    severity: "warning",
    title: "فشل مزامنة أمازون",
    body: "تعذّر تحديث مخزون 4 منتجات؛ اكتملت المهمة مع أخطاء.",
    link: "/dashboard/channels/marketplaces/jobs",
    group_key: "sync_failed:amazon",
    count: 1,
    created_at: minutesAgo(300),
    read_at: minutesAgo(200),
    source_ref: { type: "marketplace_sync_job", id: 88 },
    permission: "channels.marketplaces.manage",
  });
  rows.push({
    id: ++id,
    kind: "export_ready",
    severity: "info",
    title: "تقرير المبيعات جاهز للتحميل",
    body: "تقرير أكتوبر بصيغة CSV.",
    link: "/dashboard/reports/exports",
    group_key: "export_ready:412",
    count: 1,
    created_at: minutesAgo(600),
    read_at: minutesAgo(500),
    source_ref: { type: "report_export_job", id: 412 },
    permission: "reports.export",
  });
  rows.push({
    id: ++id,
    kind: "billing_notice",
    severity: "info",
    title: "ينتهي اشتراك تطبيق «المحاسبة» خلال 5 أيام",
    body: "جدّد الاشتراك لتجنب تعليق التطبيق.",
    link: "/dashboard/apps",
    group_key: "billing_notice:accounting",
    count: 1,
    created_at: minutesAgo(1440),
    read_at: null,
    source_ref: null,
    merchantOnly: true,
  });
  return rows;
}

function all(store: string | null): Row[] {
  return storeState(store, "notifications", () => seed(store));
}

function visibleTo(session: Session, row: Row): boolean {
  if (row.merchantOnly) return session.kind === "merchant";
  if (!row.permission) return true;
  return hasPermission({ kind: session.kind, features: session.features, permissions: session.staff?.permissions }, row.permission);
}

function strip(row: Row): Notification {
  const { permission, merchantOnly, ...rest } = row;
  void permission;
  void merchantOnly;
  return rest;
}

export function notificationSummary(store: string | null, session: Session): NotificationSummary {
  const rows = all(store).filter((r) => visibleTo(session, r) && r.read_at === null);
  const by_kind: Record<string, number> = {};
  for (const r of rows) by_kind[r.kind] = (by_kind[r.kind] ?? 0) + r.count;
  return {
    unread_total: rows.reduce((n, r) => n + r.count, 0),
    by_kind,
    has_critical: rows.some((r) => r.severity === "critical"),
  };
}

export function listNotifications(store: string | null, session: Session, params: URLSearchParams) {
  const kinds = (params.get("kind") ?? "").split(",").filter(Boolean);
  const unread = params.get("unread") === "1";
  const rows = all(store)
    .filter((r) => visibleTo(session, r))
    .filter((r) => (kinds.length ? kinds.includes(r.kind) : true))
    .filter((r) => (unread ? r.read_at === null : true))
    // FR-49.10: the panel shows 30 days; older ones belong to the full page.
    .filter((r) => FIXTURE_NOW - new Date(r.created_at).getTime() <= 30 * 86_400_000)
    // System notices stay on top until read (US-49.6).
    .sort((a, b) => {
      const sa = (a.kind === "billing_notice" || a.kind === "provisioning_notice") && !a.read_at ? 1 : 0;
      const sb = (b.kind === "billing_notice" || b.kind === "provisioning_notice") && !b.read_at ? 1 : 0;
      return sb - sa || b.created_at.localeCompare(a.created_at);
    });
  const pageSize = Math.min(50, Number(params.get("page_size") ?? 30) || 30);
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map(strip),
  };
}

export function markRead(store: string | null, session: Session, id: number): { read_at: string } | null {
  const row = all(store).find((r) => r.id === id && visibleTo(session, r));
  if (!row) return null;
  row.read_at = row.read_at ?? new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();
  return { read_at: row.read_at };
}

export function markAllRead(store: string | null, session: Session, kinds: string[]): { updated: number } {
  let updated = 0;
  const at = new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();
  for (const r of all(store)) {
    if (!visibleTo(session, r) || r.read_at) continue;
    if (kinds.length && !kinds.includes(r.kind)) continue;
    r.read_at = at;
    updated++;
  }
  return { updated };
}
