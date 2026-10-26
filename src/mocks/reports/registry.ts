import { reportPermission } from "@/features/reports/permissions";

/**
 * `REPORT_REGISTRY` (M25 §5, discovery 02 §12) — 42 reports in 10 categories, in registry
 * order. Arabic titles are the spec's display labels. Statuses follow Django's registry
 * (`products/services/reports_registry.py`, INT-027): 5 `not_yet_available` rows and
 * `ai_forecasting` as the one `coming_soon` row (`whatsapp_costs` has a real builder there), so
 * the index shows 6 disabled rows and all three statuses.
 *
 * Each entry also describes how the mock generates its data: `shape: "time"` reports are a
 * daily series (line chart, one table row per day); `shape: "breakdown"` reports rank a
 * dimension (bar chart of the top items, one table row per item).
 */
export const REPORT_STATUSES = ["available", "not_yet_available", "coming_soon"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type MetricType = "money" | "count" | "percent";
export interface MetricDef {
  key: string;
  label: string;
  type: MetricType;
  /** Typical value per day (time) or per item over 30 days (breakdown). */
  base: number;
}

export interface ReportDef {
  code: string;
  category: string;
  title: string;
  description: string;
  status: ReportStatus;
  shape: "time" | "breakdown";
  /** Breakdown dimension: column label + item names. */
  dimension?: { label: string; items: readonly string[] };
  metrics: readonly MetricDef[];
}

export const REPORT_CATEGORIES = [
  { key: "core", title: "الأساسية" },
  { key: "customers", title: "العملاء" },
  { key: "finance", title: "المالية" },
  { key: "shipping", title: "الشحن" },
  { key: "inventory", title: "المخزون" },
  { key: "operations", title: "العمليات" },
  { key: "local_market", title: "السوق المحلي" },
  { key: "advanced_behavior", title: "السلوك المتقدم" },
  { key: "marketing", title: "التسويق" },
  { key: "infrastructure", title: "البنية" },
] as const;

const m = (key: string, label: string, type: MetricType, base: number): MetricDef => ({ key, label, type, base });
const REVENUE = m("revenue", "الإيرادات", "money", 4200);
const ORDERS = m("orders_count", "الطلبات", "count", 14);
const t = (code: string, category: string, title: string, description: string, metrics: MetricDef[], status: ReportStatus = "available"): ReportDef => ({
  code,
  category,
  title,
  description,
  status,
  shape: "time",
  metrics,
});
const b = (
  code: string,
  category: string,
  title: string,
  description: string,
  dimension: { label: string; items: readonly string[] },
  metrics: MetricDef[],
  status: ReportStatus = "available",
): ReportDef => ({ code, category, title, description, status, shape: "breakdown", dimension, metrics });

const CITIES = ["صنعاء", "عدن", "تعز", "حضرموت", "الحديدة", "إب", "الرياض", "جدة"] as const;
const STAFF = ["سارة الحربي", "خالد العمري", "نورة القحطاني", "محمد باوزير", "فاطمة الأهدل"] as const;

export const REPORT_REGISTRY: readonly ReportDef[] = [
  // ── core ──
  t("sales_overview", "core", "نظرة عامة على المبيعات", "الإيرادات والطلبات يومياً مع متوسط السلة", [REVENUE, ORDERS, m("aov", "متوسط السلة", "money", 300)]),
  b("best_sellers", "core", "الأكثر مبيعاً", "المنتجات مرتبة بالكمية المباعة والإيراد", { label: "المنتج", items: [] }, [m("quantity", "الكمية", "count", 40), REVENUE]),
  t("orders", "core", "الطلبات", "الطلبات المكتملة والملغاة والمسترجعة يومياً", [ORDERS, m("completed", "المكتملة", "count", 9), m("cancelled", "الملغاة", "count", 2)]),
  t("store_overview", "core", "نظرة عامة على المتجر", "صافي الإيراد بعد الخصم والاسترجاع والعمولات", [m("gross", "إجمالي الإيراد", "money", 4600), m("net", "صافي الإيراد", "money", 3900), ORDERS]),
  b("inventory_overview", "core", "نظرة عامة على المخزون", "قيمة المخزون والكميات حسب التصنيف", { label: "التصنيف", items: ["عطور", "بخور", "عود", "مستحضرات", "هدايا"] }, [m("on_hand", "الكمية المتاحة", "count", 320), m("stock_value", "قيمة المخزون", "money", 26000)]),
  // ── customers ──
  b("customers_vip", "customers", "العملاء المميزون", "أعلى العملاء إنفاقاً وعدد طلباتهم", { label: "العميل", items: ["عبدالله الشامي", "أمل الحضرمي", "يوسف المقطري", "هدى العبسي", "سالم بن بريك", "ريم الصبري", "علي الأغبري"] }, [m("orders_count", "الطلبات", "count", 6), m("spent", "الإنفاق", "money", 2400)]),
  t("abandoned_carts", "customers", "السلات المتروكة", "السلات غير المكتملة وقيمتها ونسبة الاسترداد", [m("carts", "السلات", "count", 9), m("value", "قيمة السلات", "money", 1900), m("recovered", "المستردة", "count", 2)]),
  t("visits", "customers", "الزيارات", "زيارات المتجر ومعدل التحويل", [m("visits", "الزيارات", "count", 420)], "not_yet_available"),
  b("ratings", "customers", "التقييمات", "متوسط التقييم وعدد المراجعات لكل منتج", { label: "المنتج", items: ["عود كمبودي", "دهن عود ملكي", "بخور مبخرة", "عطر ليالي", "مسك أبيض"] }, [m("reviews", "المراجعات", "count", 12), m("avg_rating", "متوسط التقييم", "count", 4)]),
  // ── finance ──
  b("payment_gateways", "finance", "بوابات الدفع", "المدفوعات حسب البوابة ونسب النجاح", { label: "البوابة", items: ["الدفع عند الاستلام", "شروة باي", "جيب", "الكريمي", "تحويل بنكي"] }, [m("payments", "العمليات", "count", 60), m("amount", "المبلغ", "money", 18000)]),
  t("taxes", "finance", "الضرائب", "الضريبة المحصلة على الطلبات يومياً", [m("taxable", "المبلغ الخاضع", "money", 3600), m("tax", "الضريبة", "money", 540)]),
  b("coupons", "finance", "الكوبونات", "استخدام الكوبونات وقيمة الخصم", { label: "الكوبون", items: ["RAMADAN25", "WELCOME10", "EID50", "VIP15"] }, [m("uses", "الاستخدامات", "count", 18), m("discount", "الخصم", "money", 900)]),
  t("refunds", "finance", "الاسترجاعات", "المبالغ المسترجعة وعدد الطلبات", [m("refunds", "الاسترجاعات", "count", 1), m("amount", "المبلغ", "money", 240)]),
  t("wallet_custody", "finance", "عهدة المحافظ", "أرصدة محافظ العملاء المحتجزة لدى المتجر", [m("credited", "الإيداع", "money", 800), m("debited", "السحب", "money", 650)]),
  t("invoices_settlements", "finance", "الفواتير والتسويات", "فواتير المنصة وتسويات البوابات", [m("amount", "المبلغ", "money", 1000)], "not_yet_available"),
  t("platform_commissions", "finance", "عمولات المنصة", "عمولة شروة المستحقة على المبيعات", [m("commission", "العمولة", "money", 120), REVENUE]),
  // ── shipping ──
  b("third_party_logistics", "shipping", "شركات الشحن الخارجية", "الشحنات وتكلفتها ومتوسط زمن التسليم لكل شركة", { label: "الشركة", items: ["سمسا", "أرامكس", "البريد اليمني", "شروة شيب"] }, [m("shipments", "الشحنات", "count", 45), m("cost", "التكلفة", "money", 2200)]),
  b("couriers", "shipping", "المندوبون", "التسليمات والتحصيل لكل مندوب", { label: "المندوب", items: ["أحمد الزبيري", "مراد الحكيمي", "وليد الشرعبي", "صالح الكثيري"] }, [m("deliveries", "التسليمات", "count", 38), m("collected", "التحصيل", "money", 9000)]),
  t("returns", "shipping", "المرتجعات", "الشحنات المرتجعة وأسبابها", [m("returns", "المرتجعات", "count", 1), m("value", "القيمة", "money", 180)]),
  b("zones", "shipping", "المناطق", "الطلبات ورسوم الشحن حسب المدينة", { label: "المدينة", items: CITIES }, [ORDERS_BY_ZONE(), m("fees", "رسوم الشحن", "money", 600)]),
  // ── inventory ──
  b("categories", "inventory", "التصنيفات", "المبيعات والمخزون لكل تصنيف", { label: "التصنيف", items: ["عطور", "بخور", "عود", "مستحضرات", "هدايا"] }, [m("sold", "المباع", "count", 70), REVENUE_BREAKDOWN()]),
  b("variants", "inventory", "المتغيرات", "أداء متغيرات المنتجات (الحجم واللون)", { label: "المتغير", items: ["50 مل", "100 مل", "200 مل", "علبة هدية", "عبوة سفر"] }, [m("sold", "المباع", "count", 30), m("on_hand", "المتاح", "count", 80)]),
  t("stock_movements", "inventory", "حركات المخزون", "الوارد والصادر والتسويات يومياً", [m("in", "الوارد", "count", 25), m("out", "الصادر", "count", 22), m("adjustments", "التسويات", "count", 2)]),
  b("suppliers", "inventory", "الموردون", "المشتريات ومدة التوريد لكل مورد", { label: "المورد", items: ["مؤسسة العطار", "دار العود", "مصنع الريحان", "مستودعات الخليج"] }, [m("purchase_orders", "أوامر الشراء", "count", 5), m("amount", "المبلغ", "money", 14000)]),
  // ── operations ──
  b("staff_performance", "operations", "أداء الموظفين", "الطلبات المعالجة ومتوسط زمن التجهيز لكل موظف", { label: "الموظف", items: STAFF }, [m("handled", "الطلبات المعالجة", "count", 80), m("sales", "المبيعات", "money", 12000)]),
  t("audit_log", "operations", "سجل التدقيق", "عدد العمليات الحساسة المسجلة يومياً", [m("events", "العمليات", "count", 35), m("sensitive", "الحساسة", "count", 3)]),
  t("customer_service", "operations", "خدمة العملاء", "المحادثات وزمن الرد الأول", [m("conversations", "المحادثات", "count", 22), m("resolved", "المحلولة", "count", 19)]),
  t("system_performance", "operations", "أداء النظام", "زمن تحميل المتجر وتوفره", [m("uptime", "التوفر", "percent", 99)], "not_yet_available"),
  b("marketing_utm", "operations", "مصادر التسويق (UTM)", "الطلبات والإيراد حسب مصدر الزيارة", { label: "المصدر", items: ["tiktok", "whatsapp", "instagram", "snapchat", "direct", "google"] }, [m("orders_count", "الطلبات", "count", 50), REVENUE_BREAKDOWN()]),
  t("ai_forecasting", "operations", "التنبؤ الذكي", "توقع المبيعات والطلب على المخزون", [REVENUE], "coming_soon"),
  // ── local_market ──
  b("currencies", "local_market", "العملات", "المبيعات حسب عملة الدفع", { label: "العملة", items: ["ريال سعودي", "ريال يمني جديد", "ريال يمني قديم", "دولار أمريكي"] }, [m("orders_count", "الطلبات", "count", 40), REVENUE_BREAKDOWN()]),
  t("pos", "local_market", "نقاط البيع", "مبيعات نقاط البيع في الفروع يومياً", [m("sales", "المبيعات", "money", 1300), m("tickets", "الفواتير", "count", 6)]),
  t("operating_expenses", "local_market", "المصروفات التشغيلية", "الإيجار والرواتب والمصروفات اليومية", [m("expenses", "المصروفات", "money", 700)]),
  // ── advanced_behavior ──
  b("failed_searches", "advanced_behavior", "عمليات البحث بلا نتائج", "كلمات بحث العملاء التي لم تجد منتجاً", { label: "الكلمة", items: ["عود هندي", "مسك الطهارة", "بخور عدني", "عطر فرنسي", "زعفران"] }, [m("searches", "مرات البحث", "count", 25)]),
  b("wishlists", "advanced_behavior", "قوائم الأمنيات", "أكثر المنتجات إضافة لقوائم الأمنيات", { label: "المنتج", items: ["دهن عود ملكي", "عطر ليالي", "مبخرة نحاسية", "مسك أبيض"] }, [m("adds", "الإضافات", "count", 30)]),
  t("loyalty", "advanced_behavior", "الولاء", "النقاط الممنوحة والمستبدلة يومياً", [m("earned", "النقاط الممنوحة", "count", 900), m("redeemed", "النقاط المستبدلة", "count", 300)]),
  // ── marketing ──
  b("affiliates", "marketing", "التسويق بالعمولة", "مبيعات المسوقين وعمولاتهم", { label: "المسوق", items: ["حساب أم ريان", "قناة عطور اليمن", "مدونة الأناقة"] }, [m("orders_count", "الطلبات", "count", 12), m("commission", "العمولة", "money", 450)]),
  t("bundles", "marketing", "الحزم", "مبيعات الحزم والعروض المجمعة", [REVENUE], "not_yet_available"),
  t("subscriptions", "marketing", "الاشتراكات", "الاشتراكات المتكررة وتجديدها", [m("active", "النشطة", "count", 10)], "not_yet_available"),
  // ── infrastructure ──
  t("export_engine", "infrastructure", "محرك التصدير", "مهام التصدير المكتملة والفاشلة يومياً", [m("jobs", "المهام", "count", 4), m("failed", "الفاشلة", "count", 0)]),
  t("scheduled_reports", "infrastructure", "التقارير المجدولة", "التقارير المرسلة بالبريد يومياً", [m("sent", "المرسلة", "count", 3)]),
  t("whatsapp_costs", "infrastructure", "تكاليف واتساب", "رسائل واتساب المرسلة وتكلفتها", [m("messages", "الرسائل", "count", 140), m("cost", "التكلفة", "money", 60)]),
];

function ORDERS_BY_ZONE(): MetricDef {
  return m("orders_count", "الطلبات", "count", 30);
}
function REVENUE_BREAKDOWN(): MetricDef {
  return m("revenue", "الإيرادات", "money", 9000);
}

/** Reports whose data comes from the nightly `DailyStoreMetrics` (refresh-today applies). */
export function isCoreReport(def: ReportDef): boolean {
  return def.category === "core";
}

export function getReportDef(code: string): ReportDef | undefined {
  return REPORT_REGISTRY.find((r) => r.code === code);
}

export function permissionOf(def: ReportDef) {
  return reportPermission(def.code, def.category);
}
