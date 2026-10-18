import {
  CalendarDays,
  ChartColumn,
  CreditCard,
  LayoutGrid,
  LifeBuoy,
  Megaphone,
  MessagesSquare,
  Package,
  Settings,
  Share2,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey, PermissionKey } from "@/lib/access";

/**
 * The merchant sidebar — the 15 groups of discovery 01 §4, in that order with those titles.
 * ONE source of truth, shared by M03 (sidebar) and M48 (command palette), which is why
 * every entry carries `keywords`.
 *
 * Deliberate differences from the Django template, each traceable to a requirement:
 * - Group 13 «السجلات» is absent: it is a disabled placeholder upstream, and FR-03.04 says
 *   it MUST NOT be rendered (not even greyed out).
 * - Group «التقارير» lists its three real entries here; the 10-category × 42-report
 *   accordion is built from `REPORT_REGISTRY` in M25 (FR-03.04).
 * - Paths are the FRONTEND routes (`/dashboard/...`), not the Django view names. Screens
 *   land in later phases; until then the group's `not-found` boundary answers.
 */
export type CounterKey = "new_orders" | "unread_conversations" | "pending_approvals" | "unread_behavior_alerts";

export interface NavItem {
  key: string;
  title: string;
  path: string;
  /** Search terms for ⌘K (M48). Arabic first, then the Django view name where useful. */
  keywords: string[];
  feature?: FeatureKey;
  permission?: PermissionKey;
  counter?: CounterKey;
  /** `G O` style sequence shortcut (M03 §6). */
  shortcut?: string;
  /** Rendered disabled with a «قريباً» tag instead of hidden. */
  comingSoon?: boolean;
}

export interface NavGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  /** Group landing page, when the group itself is a destination. */
  path?: string;
  feature?: FeatureKey;
  permission?: PermissionKey;
  counter?: CounterKey;
  items: NavItem[];
}

export const OVERVIEW_ITEM: NavItem = {
  key: "overview",
  title: "النظرة العامة",
  path: "/dashboard",
  keywords: ["الرئيسية", "لوحة التحكم", "أرقام اليوم", "merchant_dashboard"],
};

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  title: "الإعدادات",
  path: "/dashboard/settings",
  keywords: ["إعدادات المتجر", "store_settings", "العملة", "الدومين"],
};

export const NAVIGATION: NavGroup[] = [
  {
    key: "orders",
    title: "الطلبات",
    icon: ShoppingCart,
    permission: "orders.view",
    counter: "new_orders",
    items: [
      {
        key: "orders.all",
        title: "كل الطلبات",
        path: "/dashboard/orders",
        keywords: ["طلب", "order_list", "رقم الطلب", "العميل"],
        permission: "orders.view",
        counter: "new_orders",
        shortcut: "G O",
      },
      {
        key: "orders.create",
        title: "إنشاء طلب جديد",
        path: "/dashboard/orders/new",
        keywords: ["طلب يدوي", "create_order", "هاتفي"],
        permission: "orders.view",
      },
      {
        key: "orders.statuses",
        title: "حالات الطلب",
        path: "/dashboard/orders/statuses",
        keywords: ["حالة التنفيذ", "order_statuses", "قيد التجهيز"],
        permission: "orders.update_status",
      },
      {
        key: "orders.refunds",
        title: "سجل الاسترجاعات",
        path: "/dashboard/orders/refunds",
        keywords: ["استرجاع", "order_refunds_list", "مبالغ مستردة"],
        feature: "refunds",
        permission: "orders.refund",
      },
      {
        key: "orders.returns",
        title: "الاسترجاعات (الفروع)",
        path: "/dashboard/orders/returns",
        keywords: ["مرتجعات", "return_requests_list", "الفروع"],
        feature: "refunds",
        permission: "orders.process_returns",
      },
    ],
  },
  {
    key: "inbox",
    title: "المحادثات",
    icon: MessagesSquare,
    path: "/dashboard/inbox",
    feature: "social_channels",
    permission: "channels.inbox.access",
    counter: "unread_conversations",
    items: [],
  },
  {
    key: "products",
    title: "المنتجات",
    icon: Package,
    items: [
      {
        key: "products.all",
        title: "جميع المنتجات",
        path: "/dashboard/products",
        keywords: ["منتج", "product_list_hub", "SKU", "سعر"],
        shortcut: "G P",
      },
      {
        key: "products.templates",
        title: "نماذج المنتجات",
        path: "/dashboard/products/templates",
        keywords: ["قالب منتج", "product_template_list"],
      },
      {
        key: "products.variants",
        title: "نماذج المتغيرات",
        path: "/dashboard/products/variants",
        keywords: ["متغير", "مقاس", "لون", "variant_hub"],
      },
      {
        key: "products.categories",
        title: "التصنيفات",
        path: "/dashboard/products/categories",
        keywords: ["تصنيف", "فئة", "add_category"],
      },
      {
        key: "products.organization",
        title: "التنظيم والاكتشاف",
        path: "/dashboard/products/organization",
        keywords: ["وسم", "مجموعة", "شارة", "organization"],
      },
      {
        key: "products.import",
        title: "استيراد CSV",
        path: "/dashboard/products/import",
        keywords: ["استيراد", "CSV", "import_products_csv"],
      },
      {
        key: "products.inventory",
        title: "المخزون",
        path: "/dashboard/inventory",
        keywords: ["كمية", "جرد", "inventory_hub"],
        feature: "inventory",
        permission: "inventory.view",
      },
      {
        key: "products.suppliers",
        title: "الموردون وأوامر الشراء",
        path: "/dashboard/suppliers",
        keywords: ["مورد", "أمر شراء", "supplier_list"],
        permission: "suppliers.manage",
      },
      {
        key: "products.locations",
        title: "المواقع",
        path: "/dashboard/locations",
        keywords: ["فرع", "مستودع", "location_list"],
        feature: "multi_location",
      },
      {
        key: "products.report",
        title: "تقرير المنتج",
        path: "/dashboard/reports/products",
        keywords: ["تقرير منتج", "product_report"],
        feature: "product_report",
        permission: "reports.view",
      },
      {
        key: "products.bulk",
        title: "الرفع السريع",
        path: "/dashboard/products/bulk-upload",
        keywords: ["رفع جماعي", "bulk_upload_products"],
        feature: "bulk_upload",
      },
    ],
  },
  {
    key: "marketing",
    title: "التسويق",
    icon: Megaphone,
    path: "/dashboard/marketing",
    feature: "marketing",
    items: [
      {
        key: "marketing.offers",
        title: "العروض والكوبونات وشريط الإعلانات",
        path: "/dashboard/marketing/offers",
        keywords: ["كوبون", "خصم", "شريط إعلانات", "merchant_offers"],
        feature: "coupon",
        permission: "discounts.manage",
      },
      {
        key: "marketing.abandoned",
        title: "السلات المتروكة والاسترداد الآلي",
        path: "/dashboard/marketing/abandoned-carts",
        keywords: ["سلة متروكة", "abandoned_carts", "تذكير"],
        feature: "abandoned_carts",
      },
      {
        key: "marketing.tracking",
        title: "أدوات التتبع",
        path: "/dashboard/marketing/tracking",
        keywords: ["بكسل", "ميتا", "تيك توك", "tracking_tools"],
        feature: "tracking_tools",
      },
      {
        key: "marketing.influencers",
        title: "المؤثرين",
        path: "/dashboard/marketing/influencers",
        keywords: ["مؤثر", "influencers"],
        feature: "influencers",
      },
      {
        key: "marketing.promotions",
        title: "العروض الترويجية",
        path: "/dashboard/marketing/promotions",
        keywords: ["عرض ترويجي", "promotions_list"],
        feature: "promotions",
      },
      {
        key: "marketing.campaigns",
        title: "الحملات التسويقية",
        path: "/dashboard/marketing/campaigns",
        keywords: ["حملة", "رسائل", "campaigns_list"],
        feature: "campaigns",
      },
      {
        key: "marketing.timeline",
        title: "الجدول الزمني",
        path: "/dashboard/marketing/timeline",
        keywords: ["مناسبات", "timeline_list"],
        feature: "timeline",
      },
      {
        key: "marketing.affiliates",
        title: "التسويق بالعمولة",
        path: "/dashboard/marketing/affiliates",
        keywords: ["عمولة", "affiliates_list"],
        feature: "affiliates",
      },
      {
        key: "marketing.loyalty",
        title: "برنامج الولاء",
        path: "/dashboard/marketing/loyalty",
        keywords: ["نقاط", "ولاء", "loyalty_settings"],
        feature: "loyalty_settings",
      },
      {
        key: "marketing.gifting",
        title: "الإهداء",
        path: "/dashboard/marketing/gifting",
        keywords: ["هدية", "gift_settings"],
        feature: "gift_settings",
      },
    ],
  },
  {
    key: "bookings",
    title: "الحجوزات",
    icon: CalendarDays,
    path: "/dashboard/bookings",
    feature: "bookings",
    items: [
      {
        key: "bookings.calendar",
        title: "تقويم الحجوزات",
        path: "/dashboard/bookings",
        keywords: ["موعد", "تقويم", "bookings_calendar"],
        feature: "bookings",
      },
      {
        key: "bookings.services",
        title: "الخدمات القابلة للحجز وساعات توفرها",
        path: "/dashboard/bookings/services",
        keywords: ["خدمة", "ساعات العمل", "booking_services_list"],
        feature: "bookings",
      },
    ],
  },
  {
    key: "storefront",
    title: "المتجر الإلكتروني",
    icon: Store,
    items: [
      {
        key: "storefront.design",
        title: "تصميم المتجر",
        path: "/dashboard/storefront/design",
        keywords: ["ثيم", "ألوان", "storefront_design"],
        feature: "storefront_design",
      },
      {
        key: "storefront.sections",
        title: "ترتيب الأقسام",
        path: "/dashboard/storefront/design#sections-builder",
        keywords: ["أقسام", "بانر", "سلايدر", "save_store_sections"],
        feature: "storefront_design",
      },
      {
        key: "storefront.contact",
        title: "معلومات التواصل",
        path: "/dashboard/settings/contact",
        keywords: ["واتساب", "عنوان", "contact_info"],
        feature: "contact_info",
      },
      {
        key: "storefront.policies",
        title: "الصفحات الإضافية (سياسة الاسترجاع)",
        path: "/dashboard/settings/policies",
        keywords: ["سياسة", "شروط", "store_policies"],
        feature: "store_policies",
      },
    ],
  },
  {
    key: "channels",
    title: "قنوات البيع",
    icon: Share2,
    items: [
      {
        key: "channels.social",
        title: "التواصل الاجتماعي والمحادثات",
        path: "/dashboard/channels/social",
        keywords: ["انستغرام", "تيك توك", "تلغرام", "social_channels_hub"],
        feature: "social_channels",
      },
      {
        key: "channels.marketplaces",
        title: "الأسواق الإلكترونية (أمازون، نون)",
        path: "/dashboard/channels/marketplaces",
        keywords: ["أمازون", "نون", "marketplaces_hub"],
        feature: "marketplaces",
        permission: "channels.marketplaces.manage",
      },
      {
        key: "channels.dropshipping",
        title: "استيراد المنتجات والدروبشيبينغ",
        path: "/dashboard/channels/dropshipping",
        keywords: ["دروبشيبينغ", "موجز", "dropshipping_hub"],
        feature: "dropshipping",
        permission: "channels.dropshipping.manage",
      },
    ],
  },
  {
    key: "customers",
    title: "العملاء",
    icon: Users,
    permission: "customers.view",
    items: [
      {
        key: "customers.report",
        title: "تقرير العميل",
        path: "/dashboard/customers",
        keywords: ["عميل", "هاتف", "customer_report"],
        feature: "customer_report",
        permission: "customers.view",
        shortcut: "G C",
      },
      {
        key: "customers.wallets",
        title: "محافظ العملاء",
        path: "/dashboard/customers/wallets",
        keywords: ["محفظة", "رصيد", "customer_wallets_list"],
        feature: "customer_wallets",
        permission: "customers.view",
      },
    ],
  },
  {
    key: "staff",
    title: "الموظفون والصلاحيات",
    icon: UserCog,
    feature: "staff_rbac",
    permission: "staff.view",
    counter: "pending_approvals",
    items: [
      {
        key: "staff.list",
        title: "الموظفون",
        path: "/dashboard/staff",
        keywords: ["موظف", "staff_list"],
        feature: "staff_rbac",
        permission: "staff.view",
      },
      {
        key: "staff.roles",
        title: "الأدوار والصلاحيات",
        path: "/dashboard/staff/roles",
        keywords: ["دور", "صلاحية", "staff_roles"],
        feature: "staff_rbac",
        permission: "staff.manage_roles",
      },
      {
        key: "staff.shifts",
        title: "الورديات ودرج الكاش",
        path: "/dashboard/staff/shifts",
        keywords: ["وردية", "كاش", "shift_hub"],
        feature: "staff_rbac",
        permission: "staff.view",
      },
      {
        key: "staff.approvals",
        title: "طلبات الموافقة المعلّقة",
        path: "/dashboard/staff/approvals",
        keywords: ["موافقة", "approval_requests"],
        feature: "staff_rbac",
        permission: "staff.view",
        counter: "pending_approvals",
      },
      {
        key: "staff.audit",
        title: "سجل التدقيق",
        path: "/dashboard/staff/audit-log",
        keywords: ["تدقيق", "audit_log"],
        feature: "staff_rbac",
        permission: "staff.view_sessions",
      },
      {
        key: "staff.behavior",
        title: "التنبيهات السلوكية",
        path: "/dashboard/staff/behavior-alerts",
        keywords: ["تنبيه", "سلوك", "behavior_alerts"],
        feature: "staff_rbac",
        permission: "staff.view",
        counter: "unread_behavior_alerts",
      },
    ],
  },
  {
    key: "reports",
    title: "التقارير",
    icon: ChartColumn,
    path: "/dashboard/reports",
    feature: "reports",
    permission: "reports.view",
    items: [
      {
        key: "reports.hub",
        title: "مركز التقارير",
        path: "/dashboard/reports",
        keywords: ["تقرير", "merchant_reports", "مبيعات", "أرباح"],
        feature: "reports",
        permission: "reports.view",
      },
      {
        key: "reports.exports",
        title: "تصديراتي",
        path: "/dashboard/reports/exports",
        keywords: ["تصدير", "my_exports", "CSV"],
        feature: "reports",
        permission: "reports.export",
      },
      {
        key: "reports.scheduled",
        title: "التقارير المجدولة",
        path: "/dashboard/reports/scheduled",
        keywords: ["جدولة", "scheduled_reports"],
        feature: "reports",
        permission: "reports.view",
      },
    ],
  },
  {
    key: "support",
    title: "مركز الدعم",
    icon: LifeBuoy,
    items: [
      {
        key: "support.sessions",
        title: "جلسات الدعم الفني",
        path: "/dashboard/support/sessions",
        keywords: ["دعم", "جلسة", "support_sessions_list"],
        permission: "support.takeover_session",
      },
    ],
  },
  {
    key: "shipping",
    title: "الشحن والتوصيل",
    icon: Truck,
    items: [
      {
        key: "shipping.fees",
        title: "رسوم التوصيل",
        path: "/dashboard/shipping/fees",
        keywords: ["رسوم", "مناطق", "shipping_settings"],
        feature: "shipping_settings",
      },
      {
        key: "shipping.pickup",
        title: "نقاط الاستلام",
        path: "/dashboard/shipping/pickup-locations",
        keywords: ["استلام", "pickup_locations"],
        feature: "pickuplocation",
      },
      {
        key: "shipping.companies",
        title: "شركات الشحن",
        path: "/dashboard/shipping/companies",
        keywords: ["شركة شحن", "shipping_companies"],
        feature: "shipping_companies",
      },
      {
        key: "shipping.providers",
        title: "مندوبو الشحن",
        path: "/dashboard/shipping/providers",
        keywords: ["مندوب", "shipping_providers"],
        feature: "shipping_providers",
      },
      {
        key: "shipping.sharwa",
        title: "شروة شيب",
        path: "/dashboard/shipping/sharwa-ship",
        keywords: ["بوليصة", "sharwa_ship_waybills"],
        feature: "sharwa_ship",
      },
      {
        key: "shipping.packaging",
        title: "ملفات التغليف",
        path: "/dashboard/shipping/packaging",
        keywords: ["تغليف", "packaging_profiles"],
      },
      {
        key: "shipping.zones",
        title: "مراجعة المناطق",
        path: "/dashboard/shipping/zones",
        keywords: ["منطقة", "خريطة", "zone_review"],
      },
      {
        key: "shipping.supervisor",
        title: "مندوبو الشحن (إشراف)",
        path: "/dashboard/shipping/supervisor",
        keywords: ["إشراف", "courier_supervisor"],
      },
      {
        key: "shipping.carriers",
        title: "شركات الشحن الخارجية",
        path: "/dashboard/shipping/carriers",
        keywords: ["أرامكس", "سمسا", "carrier_settings"],
      },
      {
        key: "shipping.reverse",
        title: "المرتجعات",
        path: "/dashboard/shipping/reverse-logistics",
        keywords: ["مرتجع", "reverse_logistics"],
      },
      {
        key: "shipping.edge",
        title: "الحالات الحدّية",
        path: "/dashboard/shipping/edge-cases",
        keywords: ["حالة حدية", "edge_cases"],
      },
      {
        key: "shipping.shifts",
        title: "مناوبات المندوبين",
        path: "/dashboard/shipping/agent-shifts",
        keywords: ["مناوبة", "agent_shift"],
      },
    ],
  },
  {
    key: "payments",
    title: "الدفع",
    icon: CreditCard,
    items: [
      {
        key: "payments.gateways",
        title: "ربط بوابات الدفع",
        path: "/dashboard/payments/gateways",
        keywords: ["بوابة", "دفع", "payment_gateways"],
        feature: "payment_gateways",
      },
      {
        key: "payments.wallets",
        title: "المحافظ المحلية",
        path: "/dashboard/payments/local-wallets",
        keywords: ["محفظة محلية", "local_wallets"],
        feature: "local_wallets",
      },
      {
        key: "payments.bank",
        title: "التحويل البنكي",
        path: "/dashboard/payments/bank-transfers",
        keywords: ["تحويل بنكي", "bank_transfers"],
        feature: "bank_transfers",
      },
    ],
  },
  {
    key: "tools",
    title: "الأدوات المساعدة",
    icon: Wrench,
    items: [
      {
        key: "tools.currency",
        title: "أسعار الصرف",
        path: "/dashboard/settings/currency",
        keywords: ["عملة", "صرف", "currency_settings"],
        feature: "currency_settings",
      },
      {
        key: "tools.seo",
        title: "إعدادات SEO",
        path: "/dashboard/settings/seo",
        keywords: ["SEO", "وصف", "seo_settings"],
        feature: "seo_settings",
      },
    ],
  },
  {
    key: "wallet",
    title: "محفظة المتجر",
    icon: Wallet,
    path: "/dashboard/wallet",
    feature: "merchantwallet",
    items: [
      {
        key: "wallet.merchant",
        title: "محفظة المتجر",
        path: "/dashboard/wallet",
        keywords: ["رصيد", "سحب", "merchant_wallet"],
        feature: "merchantwallet",
      },
      {
        key: "wallet.expenses",
        title: "المصروفات التشغيلية",
        path: "/dashboard/wallet/expenses",
        keywords: ["مصروف", "operating_expenses"],
      },
      {
        key: "wallet.tickets",
        title: "تذاكر الدعم",
        path: "/dashboard/wallet/tickets",
        keywords: ["تذكرة", "support_tickets"],
      },
    ],
  },
  {
    key: "apps",
    title: "متجر التطبيقات",
    icon: LayoutGrid,
    path: "/dashboard/apps",
    feature: "app_marketplace",
    items: [],
  },
];

/**
 * Mobile bottom bar (FR-03.13): these three destinations plus a «القائمة» button that
 * opens the start-side drawer — the fourth entry is an affordance, not a route.
 */
export const MOBILE_NAV: NavItem[] = [
  OVERVIEW_ITEM,
  { ...NAVIGATION[0]!.items[0]! },
  { ...NAVIGATION[2]!.items[0]! },
];

export const SETTINGS_ICON = Settings;

/** Flat index for ⌘K (M48) and for resolving the active item from a pathname. */
export function flatNavItems(): Array<NavItem & { groupKey: string; groupTitle: string }> {
  const flat: Array<NavItem & { groupKey: string; groupTitle: string }> = [];
  for (const group of NAVIGATION) {
    if (group.items.length === 0 && group.path) {
      flat.push({
        key: group.key,
        title: group.title,
        path: group.path,
        keywords: [group.title],
        feature: group.feature,
        permission: group.permission,
        counter: group.counter,
        groupKey: group.key,
        groupTitle: group.title,
      });
      continue;
    }
    for (const item of group.items) flat.push({ ...item, groupKey: group.key, groupTitle: group.title });
  }
  return flat;
}
