import { z } from "zod";

/**
 * M15 — الشحن والمناطق والمندوبون. Response schemas mirror the `[NEEDS BACKEND]` contract
 * of M15 §7; form schemas are the local half of the validation (the server's 400s still
 * land under the field). Enum VALUES are verbatim from the spec, labels in Arabic.
 */
const page = <T extends z.ZodType>(item: T) => z.object({ count: z.number(), results: z.array(item) });

export const CARRIER_CODES = ["aramex", "smsa"] as const;
export type CarrierCode = (typeof CARRIER_CODES)[number];
export const CARRIER_LABELS: Record<CarrierCode, string> = { aramex: "أرامكس", smsa: "سمسا" };

export const CONNECTIONS = ["not_connected", "connected", "error"] as const;
export type Connection = (typeof CONNECTIONS)[number];
export const CONNECTION_LABELS: Record<Connection, string> = { not_connected: "غير مربوط", connected: "مربوط", error: "خطأ اتصال" };

export const SHIPMENT_STATUSES = ["label_pending", "pending_pickup", "picked_up", "in_transit", "delivered", "returned", "cancelled", "compensated_lost"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  label_pending: "بانتظار تأكيد الملصق",
  pending_pickup: "بانتظار الاستلام من التاجر",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  returned: "مُعاد",
  cancelled: "ملغي",
  compensated_lost: "شحنة مُعوَّضة",
};

export const EVENT_SOURCES = ["webhook", "agent_app", "merchant_manual", "system"] as const;
export const EVENT_SOURCE_LABELS: Record<(typeof EVENT_SOURCES)[number], string> = { webhook: "webhook الناقل", agent_app: "تطبيق المندوب", merchant_manual: "يدوي من التاجر", system: "النظام" };

export const EDGE_KINDS = ["out_of_order", "flagged", "rejected", "sla_breach"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];
export const EDGE_KIND_LABELS: Record<EdgeKind, string> = { out_of_order: "خارج الترتيب", flagged: "معلَّمة للمراجعة", rejected: "مرفوضة", sla_breach: "تجاوز SLA" };

export const REVIEW_REASONS = ["outside_zone", "restricted_polygon"] as const;
export const REVIEW_REASON_LABELS: Record<(typeof REVIEW_REASONS)[number], string> = { outside_zone: "خارج أي منطقة", restricted_polygon: "داخل نطاق محظور" };
export const REVIEW_ACTIONS = ["confirm", "convert_pickup", "cancel"] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];
export const REVIEW_ACTION_LABELS: Record<ReviewAction, string> = { confirm: "تأكيد", convert_pickup: "تحويل إلى استلام", cancel: "إلغاء" };

export const PROVIDER_TABS = ["agents", "companies"] as const;
export type ProviderTab = (typeof PROVIDER_TABS)[number];
export const PROVIDER_TAB_LABELS: Record<ProviderTab, string> = { agents: "المندوبون", companies: "شركات الشحن" };

export const REVIEW_TABS = ["review", "restricted", "sla"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];
export const REVIEW_TAB_LABELS: Record<ReviewTab, string> = { review: "مراجعة المناطق", restricted: "النطاقات المحظورة", sla: "قواعد SLA" };

// ── responses ────────────────────────────────────────────────────────────────────────
export const shippingSettingsSchema = z.object({
  default_delivery_fee: z.string(),
  free_shipping_threshold: z.string(),
  display_default_delivery_fee: z.string(),
  display_free_shipping_threshold: z.string(),
  currency: z.literal("YER_NEW"),
  store_display_currency: z.string(),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export const deliveryMethodSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.string(),
  display_price: z.string(),
  currency: z.string(),
  estimated_time: z.string(),
  is_active: z.boolean(),
  is_sharwa_official: z.boolean(),
});
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;
export const deliveryMethodListSchema = page(deliveryMethodSchema);

export const pickupSchema = z.object({ id: z.number(), name: z.string(), address: z.string(), phone: z.string(), is_active: z.boolean(), sort_order: z.number() });
export type Pickup = z.infer<typeof pickupSchema>;
export const pickupListSchema = page(pickupSchema).extend({ pickup_point_locations: z.array(z.object({ id: z.number(), code: z.string(), name: z.string() })) });
export const pickupReorderSchema = z.object({ ok: z.literal(true), reordered: z.number(), results: z.array(pickupSchema) });

export const providerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone_number: z.string(),
  is_active: z.boolean(),
  max_weight_per_awb: z.string(),
  max_items_per_awb: z.number(),
  accepts_hazardous: z.boolean(),
  volumetric_divisor: z.number(),
  carrier_code: z.enum(["", ...CARRIER_CODES]),
  staff_account: z.number().nullable(),
  kind: z.enum(["agent", "company"]),
  staff_account_name: z.string().nullable(),
  staff_account_terminated: z.boolean(),
  carrier_connection: z.enum(CONNECTIONS).nullable(),
});
export type Provider = z.infer<typeof providerSchema>;
export const providerListSchema = page(providerSchema).extend({ counts: z.object({ agents: z.number(), companies: z.number() }) });
export const staffOptionSchema = z.object({ id: z.number(), full_name: z.string(), phone: z.string(), is_terminated: z.boolean() });
export type StaffOption = z.infer<typeof staffOptionSchema>;

export const carrierSchema = z.object({
  carrier_code: z.enum(CARRIER_CODES),
  name: z.string(),
  connection: z.enum(CONNECTIONS),
  is_connected: z.boolean(),
  last_error: z.string().nullable(),
  fields: z.array(z.object({ name: z.string(), label: z.string(), is_secret: z.boolean(), required: z.boolean(), value: z.string().nullable(), has_value: z.boolean() })),
  webhook_url: z.string(),
  signature_header: z.string(),
  last_event_at: z.string().nullable(),
  last_event_waybill: z.string().nullable(),
  no_events_warning: z.boolean(),
});
export type Carrier = z.infer<typeof carrierSchema>;
export const carrierTestSchema = z.object({ ok: z.boolean(), message: z.string() });

export const zoneSchema = z.object({
  code: z.string(),
  name: z.string(),
  price: z.string(),
  display_price: z.string(),
  currency: z.string(),
  volumetric_divisor: z.number(),
  center_latitude: z.string(),
  center_longitude: z.string(),
  radius_km: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
});
export type Zone = z.infer<typeof zoneSchema>;
export const zoneListSchema = page(zoneSchema);

export const packagingSchema = z.object({ id: z.number(), name: z.string(), length_cm: z.string(), width_cm: z.string(), height_cm: z.string(), empty_weight_g: z.number(), is_default: z.boolean() });
export type Packaging = z.infer<typeof packagingSchema>;
export const packagingListSchema = page(packagingSchema);

export const reviewItemSchema = z.object({
  order_id: z.number(),
  customer_name: z.string(),
  address: z.string(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  reason: z.enum(REVIEW_REASONS),
  restricted_zone_id: z.number().nullable(),
  restricted_zone_name: z.string().nullable(),
  created_at: z.string(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;
export const reviewListSchema = page(reviewItemSchema);
export const resolveResultSchema = z.object({ order_id: z.number(), action: z.string(), message: z.string() });

export const restrictedZoneSchema = z.object({ id: z.number(), name: z.string(), reason: z.string(), is_active: z.boolean(), polygon_points: z.array(z.tuple([z.number(), z.number()])) });
export type RestrictedZone = z.infer<typeof restrictedZoneSchema>;
export const restrictedListSchema = page(restrictedZoneSchema);

export const slaRuleSchema = z.object({ id: z.number(), zone_code: z.string().nullable(), delivery_method_id: z.number().nullable(), sla_hours: z.number(), zone_name: z.string().nullable(), delivery_method_name: z.string().nullable() });
export type SlaRule = z.infer<typeof slaRuleSchema>;
export const slaListSchema = page(slaRuleSchema);

export const edgeRowSchema = z.object({
  id: z.string(),
  shipment_id: z.number(),
  waybill: z.string(),
  order_id: z.number(),
  customer_name: z.string(),
  status: z.enum(SHIPMENT_STATUSES),
  address: z.string(),
  carrier: z.string(),
  version: z.number(),
  sla_deadline: z.string(),
  convert_block_reason: z.string().nullable(),
  address_block_reason: z.string().nullable(),
  event_label: z.string().nullable(),
  source: z.enum(EVENT_SOURCES).nullable(),
  occurred_at: z.string(),
  note: z.string(),
});
export type EdgeRow = z.infer<typeof edgeRowSchema>;
export const edgeListSchema = page(edgeRowSchema).extend({
  kind: z.enum(EDGE_KINDS),
  counts: z.record(z.enum(EDGE_KINDS), z.number()),
  pickup_options: z.array(z.object({ id: z.number(), name: z.string() })),
});
export type EdgeList = z.infer<typeof edgeListSchema>;
export const addressResultSchema = z.object({ shipment_id: z.number(), address: z.string(), status: z.enum(SHIPMENT_STATUSES), version: z.number(), event: z.object({ source: z.literal("merchant_manual"), label: z.string() }) });
export const convertResultSchema = z.object({ order_id: z.number(), pickup_location: z.object({ id: z.number(), name: z.string() }), version: z.number(), status: z.enum(SHIPMENT_STATUSES) });

// ── forms ────────────────────────────────────────────────────────────────────────────
const decimalText = (msg: string) => z.string().trim().regex(/^\d+(\.\d+)?$/, msg);
const intlPhone = z.string().trim().regex(/^(967|966)\d{8,9}$/, "رقم يمني أو سعودي بالصيغة الدولية (967… أو 966…).");

export const feesFormSchema = z.object({
  default_delivery_fee: decimalText("أدخل مبلغاً صحيحاً (مثال: 1500.00)"),
  free_shipping_threshold: decimalText("أدخل مبلغاً صحيحاً (مثال: 30000.00)"),
});
export type FeesForm = z.infer<typeof feesFormSchema>;

export const methodFormSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم الطريقة.").max(100, "100 حرف على الأكثر."),
  price: decimalText("أدخل سعراً صحيحاً (مثال: 1500.00)."),
  estimated_time: z.string().trim().max(50, "50 حرفاً على الأكثر."),
  is_active: z.boolean(),
});
export type MethodForm = z.infer<typeof methodFormSchema>;

export const pickupFormSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم نقطة الاستلام."),
  address: z.string().trim().min(1, "أدخل العنوان."),
  phone: z.union([z.literal(""), intlPhone]),
  is_active: z.boolean(),
});
export type PickupForm = z.infer<typeof pickupFormSchema>;

export const providerFormSchema = z.object({
  name: z.string().trim().min(1, "أدخل الاسم."),
  phone_number: intlPhone,
  is_active: z.boolean(),
  max_weight_per_awb: decimalText("أدخل وزناً بالكيلوغرام (مثال: 25)."),
  max_items_per_awb: z.string().trim().regex(/^[1-9]\d*$/, "عدد صحيح ≥ 1."),
  accepts_hazardous: z.boolean(),
  volumetric_divisor: z.string().trim().regex(/^\d+$/, "عدد صحيح.").refine((v) => Number(v) >= 1000 && Number(v) <= 10000, "بين 1000 و 10000 (عادة 5000)."),
  carrier_code: z.enum(["", ...CARRIER_CODES]),
  staff_account: z.string(),
});
export type ProviderForm = z.infer<typeof providerFormSchema>;

export const packagingFormSchema = z.object({
  name: z.string().trim().min(1, "أدخل اسم الملف."),
  length_cm: decimalText("بُعد بالسنتيمتر."),
  width_cm: decimalText("بُعد بالسنتيمتر."),
  height_cm: decimalText("بُعد بالسنتيمتر."),
  empty_weight_g: z.string().trim().regex(/^\d+$/, "وزن صحيح بالغرام."),
  is_default: z.boolean(),
});
export type PackagingForm = z.infer<typeof packagingFormSchema>;

/** «lat, lng» per line → points; the ≥ 3 rule is checked locally before the server (M15 §8). */
export function parsePolygonText(text: string): { points: Array<[number, number]>; error: string | null } {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const points: Array<[number, number]> = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.replace(/[،]/g, ",").split(/[,\s]+/).filter(Boolean);
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (parts.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { points, error: `السطر ${i + 1}: اكتب «خط العرض، خط الطول».` };
    points.push([lat, lng]);
  }
  if (points.length < 3) return { points, error: "النطاق يحتاج 3 نقاط على الأقل." };
  return { points, error: null };
}
