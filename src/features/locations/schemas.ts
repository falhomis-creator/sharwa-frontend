import { z } from "zod";

/**
 * M22 — Locations (T120). Enum VALUES verbatim from the spec §5; Arabic labels are UI text.
 * `display_type` is server-computed and never derived here (FR-22.02).
 */
export const LOCATION_FLAGS = [
  "stores_inventory",
  "ships_to_customer",
  "is_transient",
  "is_mobile",
  "is_virtual",
  "serves_walk_in_customers",
  "has_pos_terminal",
  "is_pickup_point",
] as const;
export type LocationFlag = (typeof LOCATION_FLAGS)[number];
export const LOCATION_FLAG_LABELS: Record<LocationFlag, { label: string; hint: string }> = {
  stores_inventory: { label: "يخزّن", hint: "يحمل كميات مخزون ويظهر في جدول المخزون" },
  ships_to_customer: { label: "يشحن للعميل", hint: "يمكن أن يكون مصدر طلبات التوصيل" },
  is_transient: { label: "عبور", hint: "تمرّ البضاعة منه ولا تُخزَّن طويلاً" },
  is_mobile: { label: "متنقّل", hint: "مركبة أو كشك متحرك" },
  is_virtual: { label: "افتراضي", hint: "بلا عنوان فعلي (مورد خارجي مثلاً)" },
  serves_walk_in_customers: { label: "يخدم زوّاراً", hint: "عملاء يأتون إليه بأنفسهم" },
  has_pos_terminal: { label: "نقطة بيع", hint: "فيه جهاز POS للبيع المباشر" },
  is_pickup_point: { label: "نقطة استلام", hint: "العميل يستلم طلبه منه" },
};

export const OWNERSHIPS = ["owned", "franchise", "third_party_3pl", "dropship_supplier"] as const;
export type Ownership = (typeof OWNERSHIPS)[number];
export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "مملوك",
  franchise: "امتياز",
  third_party_3pl: "مستودع طرف ثالث",
  dropship_supplier: "مورد دروبشيبينج",
};

export const LOCATION_ROLES = ["manager", "cashier", "warehouse_operator", "driver", "pickup_agent"] as const;
export type LocationRole = (typeof LOCATION_ROLES)[number];
export const LOCATION_ROLE_LABELS: Record<LocationRole, string> = {
  manager: "مدير",
  cashier: "كاشير",
  warehouse_operator: "عامل مستودع",
  driver: "سائق",
  pickup_agent: "موظف استلام",
};

export const SUPPLIER_CHANNELS = ["whatsapp", "email", "api_webhook"] as const;
export const SUPPLIER_CHANNEL_LABELS: Record<(typeof SUPPLIER_CHANNELS)[number], string> = {
  whatsapp: "واتساب",
  email: "بريد إلكتروني",
  api_webhook: "API / Webhook",
};

/** weekday 0 = الأحد … 6 = السبت (discovery 02 §16 Gotcha 4). */
export const WEEKDAY_LABELS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

const flagsSchema = z.object(Object.fromEntries(LOCATION_FLAGS.map((f) => [f, z.boolean()])) as Record<LocationFlag, z.ZodBoolean>);

export const operatingHoursSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  is_closed: z.boolean(),
});
export type OperatingHours = z.infer<typeof operatingHoursSchema>;

export const locationListItemSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  city: z.string(),
  display_type: z.string(),
  ownership: z.enum(OWNERSHIPS),
  is_active: z.boolean(),
  parent_location: z.number().nullable(),
  flags: flagsSchema,
  products_count: z.number(),
});
export type LocationListItem = z.infer<typeof locationListItemSchema>;

export const locationListSchema = z.object({
  count: z.number(),
  results: z.array(locationListItemSchema),
  multi_location_enabled: z.boolean(),
});

export const locationDetailSchema = locationListItemSchema.extend({
  address_text: z.string(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  phone: z.string(),
  operating_hours: z.array(operatingHoursSchema),
  locker: z.object({ provider: z.string(), locker_code: z.string(), capacity: z.number() }).nullable(),
  franchise: z.object({ franchisee_name: z.string(), contract_ends_at: z.string().nullable() }).nullable(),
  dropship_supplier: z.object({ channel: z.enum(SUPPLIER_CHANNELS), contact: z.string() }).nullable(),
  vehicle: z.object({ plate_number: z.string(), driver_phone: z.string() }).nullable(),
  external_refs: z.array(z.object({ system: z.string(), ref: z.string() })),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LocationDetail = z.infer<typeof locationDetailSchema>;

export const modeSchema = z.object({ multi_location_enabled: z.boolean() });

export const deactivationImpactSchema = z.object({ on_hand_total: z.string(), open_fulfillments: z.number() });

export const locationInventoryRowSchema = z.object({
  product_id: z.number(),
  variant_id: z.number().nullable(),
  name: z.string(),
  variant_label: z.string().nullable(),
  sku: z.string(),
  unit: z.string(),
  on_hand: z.string(),
  reserved: z.string(),
  quarantine: z.string(),
  available: z.string(),
  reorder_point: z.string(),
  below_reorder: z.boolean(),
});
export type LocationInventoryRow = z.infer<typeof locationInventoryRowSchema>;
export const locationInventorySchema = z.object({ count: z.number(), results: z.array(locationInventoryRowSchema) });

export const adjustResultSchema = z.object({
  stock: z.string(),
  location_stock: z.string().nullable(),
  movement_id: z.number(),
  quantity_available: z.string().nullable(),
});

export const staffOptionSchema = z.object({ id: z.number(), full_name: z.string(), phone: z.string() });
export const assignmentSchema = z.object({
  id: z.number(),
  location_id: z.number(),
  staff_id: z.number(),
  role: z.enum(LOCATION_ROLES),
  staff: staffOptionSchema,
});
export type Assignment = z.infer<typeof assignmentSchema>;

export const routingRuleSchema = z.object({
  id: z.number(),
  priority: z.number(),
  applies_to_category: z.number().nullable(),
  applies_to_city: z.string().nullable(),
  preferred_location: z.number(),
  category_name: z.string().nullable(),
  location: z.object({ id: z.number(), code: z.string(), name: z.string(), is_active: z.boolean() }).nullable(),
});
export type RoutingRule = z.infer<typeof routingRuleSchema>;

export const routingPreviewSchema = z.object({
  rule_id: z.number().nullable(),
  location: z.object({ id: z.number(), code: z.string(), name: z.string(), is_active: z.boolean() }).nullable(),
  city: z.string(),
  category_name: z.string().nullable(),
  single_location: z.boolean(),
});

export const reorderResultSchema = z.object({ ok: z.literal(true), reordered: z.number(), results: z.array(routingRuleSchema) });

/** The location form (RHF + zod). Strings for numbers so the server validates ranges. */
const coord = (limit: number, msg: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= limit), msg);

export const locationFormSchema = z.object({
  name: z.string().trim().min(1, "اسم الموقع مطلوب."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,19}$/, "الكود أحرف لاتينية وأرقام وشرطات (2–20)."),
  is_active: z.boolean(),
  parent_location: z.string(),
  address_text: z.string().trim(),
  city: z.string().trim(),
  latitude: coord(90, "خط العرض بين -90 و90."),
  longitude: coord(180, "خط الطول بين -180 و180."),
  phone: z.string().trim(),
  flags: flagsSchema,
  ownership: z.enum(OWNERSHIPS),
  operating_hours: z.array(operatingHoursSchema),
  locker: z.object({ provider: z.string(), locker_code: z.string(), capacity: z.string() }),
  franchise: z.object({ franchisee_name: z.string(), contract_ends_at: z.string() }),
  dropship_supplier: z.object({ channel: z.enum(SUPPLIER_CHANNELS), contact: z.string() }),
  vehicle: z.object({ plate_number: z.string(), driver_phone: z.string() }),
  external_refs: z.array(z.object({ system: z.string(), ref: z.string() })),
});
export type LocationForm = z.infer<typeof locationFormSchema>;

export const DEFAULT_HOURS: OperatingHours[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  opens_at: weekday === 5 ? null : "09:00",
  closes_at: weekday === 5 ? null : "22:00",
  is_closed: weekday === 5,
}));

export function emptyLocationForm(): LocationForm {
  return {
    name: "",
    code: "",
    is_active: true,
    parent_location: "",
    address_text: "",
    city: "",
    latitude: "",
    longitude: "",
    phone: "",
    flags: Object.fromEntries(LOCATION_FLAGS.map((f) => [f, false])) as Record<LocationFlag, boolean>,
    ownership: "owned",
    operating_hours: DEFAULT_HOURS,
    locker: { provider: "", locker_code: "", capacity: "" },
    franchise: { franchisee_name: "", contract_ends_at: "" },
    dropship_supplier: { channel: "whatsapp", contact: "" },
    vehicle: { plate_number: "", driver_phone: "" },
    external_refs: [],
  };
}

export function formFromDetail(d: LocationDetail): LocationForm {
  return {
    name: d.name,
    code: d.code,
    is_active: d.is_active,
    parent_location: d.parent_location ? String(d.parent_location) : "",
    address_text: d.address_text,
    city: d.city,
    latitude: d.latitude ?? "",
    longitude: d.longitude ?? "",
    phone: d.phone,
    flags: d.flags,
    ownership: d.ownership,
    operating_hours: d.operating_hours.length ? d.operating_hours : DEFAULT_HOURS,
    locker: d.locker ? { ...d.locker, capacity: String(d.locker.capacity) } : { provider: "", locker_code: "", capacity: "" },
    franchise: d.franchise ? { franchisee_name: d.franchise.franchisee_name, contract_ends_at: d.franchise.contract_ends_at ?? "" } : { franchisee_name: "", contract_ends_at: "" },
    dropship_supplier: d.dropship_supplier ?? { channel: "whatsapp", contact: "" },
    vehicle: d.vehicle ?? { plate_number: "", driver_phone: "" },
    external_refs: d.external_refs,
  };
}

/** The payload the server expects: hidden sections are not sent (FR-22.03). */
export function payloadFromForm(f: LocationForm): Record<string, unknown> {
  const showsHours = f.flags.is_pickup_point || f.flags.serves_walk_in_customers;
  return {
    name: f.name,
    code: f.code,
    is_active: f.is_active,
    parent_location: f.parent_location ? Number(f.parent_location) : null,
    address_text: f.address_text,
    city: f.city,
    latitude: f.flags.is_virtual ? "" : f.latitude,
    longitude: f.flags.is_virtual ? "" : f.longitude,
    phone: f.phone,
    flags: f.flags,
    ownership: f.ownership,
    operating_hours: showsHours ? f.operating_hours : [],
    locker: f.flags.is_pickup_point ? { ...f.locker, capacity: Number(f.locker.capacity) || 0 } : null,
    franchise: f.ownership === "franchise" ? f.franchise : null,
    dropship_supplier: f.ownership === "dropship_supplier" ? f.dropship_supplier : null,
    vehicle: f.flags.is_mobile ? f.vehicle : null,
    external_refs: f.external_refs.filter((r) => r.system.trim() && r.ref.trim()),
  };
}
