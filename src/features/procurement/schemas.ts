import { z } from "zod";

/**
 * M23 — الموردون وأوامر الشراء (T148). Enum values verbatim from discovery 02 §14.D;
 * labels Arabic. Every `/api/bff/{suppliers,purchase-orders}/*` response is parsed here.
 */
export const PO_STATUSES = ["draft", "pending_approval", "approved", "partially_received", "received", "cancelled"] as const;
export type PoStatus = (typeof PO_STATUSES)[number];
export const PO_STATUS_LABELS: Record<PoStatus, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الموافقة",
  approved: "معتمد",
  partially_received: "مستلَم جزئياً",
  received: "مستلَم",
  cancelled: "ملغى",
};
export type Tone = "warning" | "info" | "destructive" | "success" | "muted";
export const PO_STATUS_TONE: Record<PoStatus, Tone> = {
  draft: "muted",
  pending_approval: "warning",
  approved: "info",
  partially_received: "info",
  received: "success",
  cancelled: "muted",
};

/** FR-23.04: what each status allows. */
export const PO_ACTIONS: Record<PoStatus, ReadonlyArray<"edit" | "submit" | "resolve" | "receive" | "cancel">> = {
  draft: ["edit", "submit", "cancel"],
  pending_approval: ["resolve", "cancel"],
  approved: ["receive", "cancel"],
  partially_received: ["receive", "cancel"],
  received: [],
  cancelled: [],
};

const page = <T extends z.ZodTypeAny>(item: T) => z.object({ count: z.number(), next: z.number().nullable().optional(), previous: z.number().nullable().optional(), results: z.array(item) });

export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  tax_number: z.string(),
  notes: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  orders_count: z.number(),
  open_orders_count: z.number(),
});
export type Supplier = z.infer<typeof supplierSchema>;
export const supplierListSchema = page(supplierSchema);

/** The `SupplierForm` fields (assumption §10: no extra fields beyond what the server defines). */
export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "اسم المورد مطلوب.").max(150, "الاسم أطول من 150 حرفاً."),
  contact_name: z.string().trim().max(150),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{9,15}$/.test(v), "رقم الهاتف أرقام فقط بالصيغة الدولية."),
  email: z
    .string()
    .trim()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "بريد إلكتروني غير صالح."),
  address: z.string().trim().max(300),
  tax_number: z.string().trim().max(30),
  notes: z.string().trim().max(1000),
  is_active: z.boolean(),
});
export type SupplierForm = z.infer<typeof supplierFormSchema>;
export const emptySupplierForm = (): SupplierForm => ({ name: "", contact_name: "", phone: "", email: "", address: "", tax_number: "", notes: "", is_active: true });

const ref = z.object({ id: z.number(), name: z.string() });

export const poListItemSchema = z.object({
  id: z.number(),
  number: z.string(),
  supplier: ref,
  location: ref,
  status: z.enum(PO_STATUSES),
  display_total: z.string(),
  lines_count: z.number(),
  created_at: z.string(),
});
export type PoListItem = z.infer<typeof poListItemSchema>;
export const poListSchema = page(poListItemSchema);

export const poLineSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  variant_id: z.number().nullable(),
  product_name: z.string(),
  sku: z.string(),
  quantity_ordered: z.number(),
  quantity_received: z.number(),
  unit_cost: z.string(),
  display_unit_cost: z.string(),
  display_line_total: z.string(),
  product_deleted: z.boolean().default(false),
});
export type PoLine = z.infer<typeof poLineSchema>;

export const poEventSchema = z.object({
  id: z.number(),
  kind: z.enum(["created", "updated", "submitted", "approved", "rejected", "received", "cancelled"]),
  text: z.string(),
  actor: z.string(),
  at: z.string(),
  quantities: z.array(z.object({ sku: z.string(), quantity: z.number() })).optional(),
});
export type PoEvent = z.infer<typeof poEventSchema>;

export const poDetailSchema = poListItemSchema.extend({
  notes: z.string(),
  version: z.number(),
  updated_at: z.string(),
  multi_location: z.boolean(),
  lines: z.array(poLineSchema),
  approval: z.object({ id: z.number(), status: z.enum(["pending", "approved", "rejected"]), approver: z.string().nullable(), approver_role: z.string() }).nullable(),
  approver: z.string().nullable(),
  timeline: z.array(poEventSchema),
});
export type PoDetail = z.infer<typeof poDetailSchema>;

export const submitResultSchema = z.object({ status: z.enum(PO_STATUSES), approval_id: z.number(), version: z.number() });

export const formOptionsSchema = z.object({
  multi_location: z.boolean(),
  locations: z.array(ref),
  suppliers: z.array(ref),
});
export type PoFormOptions = z.infer<typeof formOptionsSchema>;

export const lineProductSchema = z.object({
  product_id: z.number(),
  variant_id: z.number().nullable(),
  name: z.string(),
  sku: z.string(),
  cost: z.string(),
  display_cost: z.string(),
});
export type LineProduct = z.infer<typeof lineProductSchema>;

/** The draft form (FR-23.03). Quantities whole numbers, unit cost up to 2 decimals. */
export const poFormSchema = z.object({
  supplier_id: z.string().min(1, "اختر المورد."),
  location_id: z.string(),
  notes: z.string().max(1000),
  lines: z.array(
    z.object({
      product_id: z.number(),
      variant_id: z.number().nullable(),
      name: z.string(),
      sku: z.string(),
      quantity_ordered: z.string().regex(/^[1-9]\d*$/, "الكمية عدد صحيح موجب."),
      unit_cost: z.string().regex(/^\d+(\.\d{1,2})?$/, "تكلفة الوحدة رقم حتى خانتين عشريتين."),
    }),
  ),
});
export type PoForm = z.infer<typeof poFormSchema>;

export function poPayload(v: PoForm) {
  return {
    supplier_id: Number(v.supplier_id),
    location_id: v.location_id ? Number(v.location_id) : undefined,
    notes: v.notes,
    lines: v.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, quantity_ordered: Number(l.quantity_ordered), unit_cost: l.unit_cost })),
  };
}

export const PO_VIEWS = ["board", "table"] as const;
export type PoView = (typeof PO_VIEWS)[number];
