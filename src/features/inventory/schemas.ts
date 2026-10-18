import { z } from "zod";
import { UNITS } from "@/features/products/schemas/enums";

/**
 * M21 read models (T117) — the shape of the proposed `/api/v1/inventory/*` rows.
 * Quantities are decimal STRINGS (3 places) shown verbatim (FR-21.02); enums verbatim.
 */
export const STOCK_STATUSES = ["in_stock", "low", "out", "backorder"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "متوفر",
  low: "منخفض",
  out: "نفد",
  backorder: "نفد — يقبل الحجز",
};

export const MOVEMENT_REASONS = ["sale", "cancel_restock", "refund_restock", "manual_adjust", "restock", "po_received"] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];
export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  sale: "بيع",
  cancel_restock: "إعادة بعد إلغاء",
  refund_restock: "إعادة بعد استرجاع",
  manual_adjust: "تعديل يدوي",
  restock: "إعادة تعبئة",
  po_received: "استلام أمر شراء",
};
export const MANUAL_REASONS = ["manual_adjust", "restock"] as const;

export const ITEM_STATUSES = ["available", "reserved", "sold"] as const;
export const ITEM_STATUS_LABELS: Record<(typeof ITEM_STATUSES)[number], string> = { available: "متاح", reserved: "محجوز", sold: "مُباع" };
export const RESERVATION_STATUSES = ["active", "consumed", "released"] as const;
export const RESERVATION_STATUS_LABELS: Record<(typeof RESERVATION_STATUSES)[number], string> = { active: "نشط", consumed: "مُستهلك", released: "مُفرَج" };

const decimal = z.string().regex(/^-?\d+(\.\d{1,3})?$/);

export const locationCellSchema = z.object({ on_hand: decimal, reserved: decimal, quarantine: decimal, available: decimal });
export type LocationCell = z.infer<typeof locationCellSchema>;

export const inventoryUnitSchema = z.object({
  product_id: z.number().int(),
  variant_id: z.number().int().nullable(),
  name: z.string(),
  variant_label: z.string().nullable(),
  sku: z.string(),
  barcode: z.string().nullable(),
  unit: z.enum(UNITS).catch("piece"),
  stock: decimal,
  low_stock_threshold: z.number().int(),
  allow_backorder: z.boolean(),
  is_serialized: z.boolean(),
  is_bundle: z.boolean(),
  is_auction: z.boolean(),
  category_id: z.number().int().nullable(),
  cost_price: z.string().nullable(),
  price: z.string(),
  status: z.enum(STOCK_STATUSES),
  location: locationCellSchema.nullable(),
  reserved_total: decimal,
});
export type InventoryUnit = z.infer<typeof inventoryUnitSchema>;
export const inventoryProductSchema = inventoryUnitSchema.extend({ variants: z.array(inventoryUnitSchema) });
export type InventoryProduct = z.infer<typeof inventoryProductSchema>;
export const inventoryListSchema = z.object({
  count: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
  multi_location: z.boolean(),
  source: z.enum(["location", "catalog"]),
  results: z.array(inventoryProductSchema),
});
export type InventoryList = z.infer<typeof inventoryListSchema>;

export const countersSchema = z.object({ low: z.number().int(), out: z.number().int(), backorder: z.number().int(), in_stock: z.number().int(), pending_writeoffs: z.number().int() });
export type InventoryCounters = z.infer<typeof countersSchema>;

export const adjustmentResultSchema = z.object({ stock: decimal, location_stock: decimal.nullable(), movement_id: z.number().int(), quantity_available: decimal.nullable() });

export const referenceSchema = z.object({ type: z.string(), id: z.union([z.number(), z.string()]), label: z.string() }).nullable();
export const movementSchema = z.object({
  id: z.number().int(),
  product_id: z.number().int(),
  product_name: z.string(),
  variant_id: z.number().int().nullable(),
  variant_label: z.string().nullable(),
  location_id: z.number().int().nullable(),
  location_name: z.string().nullable(),
  delta: decimal,
  quantity_after: decimal,
  reason: z.enum(MOVEMENT_REASONS),
  note: z.string().nullable(),
  reference: referenceSchema,
  actor: z.string(),
  created_at: z.string(),
});
export type Movement = z.infer<typeof movementSchema>;
export const movementListSchema = z.object({ count: z.number().int(), net_delta: decimal, results: z.array(movementSchema) });

export const itemSchema = z.object({
  id: z.number().int(),
  product_id: z.number().int(),
  product_name: z.string(),
  serial_number: z.string(),
  status: z.enum(ITEM_STATUSES),
  location_id: z.number().int().nullable(),
  location_name: z.string().nullable(),
  order_id: z.number().int().nullable(),
});
export type InventoryItem = z.infer<typeof itemSchema>;
export const itemListSchema = z.object({ count: z.number().int(), results: z.array(itemSchema) });

export const reservationSchema = z.object({
  id: z.number().int(),
  product_id: z.number().int(),
  product_name: z.string(),
  variant_id: z.number().int().nullable(),
  variant_label: z.string().nullable(),
  location_id: z.number().int().nullable(),
  location_name: z.string().nullable(),
  quantity: decimal,
  status: z.enum(RESERVATION_STATUSES),
  reference: z.object({ type: z.string(), id: z.union([z.number(), z.string()]), label: z.string() }),
  created_at: z.string(),
});
export type Reservation = z.infer<typeof reservationSchema>;
export const reservationListSchema = z.object({ count: z.number().int(), results: z.array(reservationSchema) });

export const writeoffSchema = z.object({
  id: z.number().int(),
  status: z.enum(["pending", "approved", "rejected"]),
  product_id: z.number().int(),
  product_name: z.string(),
  variant_id: z.number().int().nullable(),
  variant_label: z.string().nullable(),
  location_id: z.number().int().nullable(),
  location_name: z.string().nullable(),
  quantity: decimal,
  note: z.string(),
  requester_name: z.string(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
});
export type Writeoff = z.infer<typeof writeoffSchema>;
export const writeoffListSchema = z.object({ count: z.number().int(), results: z.array(writeoffSchema) });
export const WRITEOFF_STATUS_LABELS = { pending: "بانتظار الموافقة", approved: "مُعتمد", rejected: "مرفوض" } as const;

/** The adjust panel (US-21.2) — validated locally before the POST. */
export const adjustFormSchema = z
  .object({
    mode: z.enum(["delta", "new_quantity"]),
    value: z.string().trim().regex(/^[+-]?\d+(\.\d{1,3})?$/, "رقم حتى 3 خانات عشرية."),
    reason: z.enum(MANUAL_REASONS),
    note: z.string().trim().max(300, "300 حرف على الأكثر."),
    location_id: z.string(),
  })
  .refine((v) => Number(v.value) !== 0 || v.mode === "new_quantity", { path: ["value"], message: "لا تغيير في الكمية." });
export type AdjustForm = z.infer<typeof adjustFormSchema>;

/** Quantities: 3 decimals only for non-piece units (US-21.1.1). */
export function formatQty(value: string, unit?: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (unit === "piece") return String(Math.trunc(n));
  if (unit) return n.toFixed(3);
  // Unit unknown (ledger rows): keep the decimals that carry information only.
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

/** Signed delta with ASCII signs in Mono so RTL never flips it (§11 II). */
export function formatDelta(value: string, unit?: string): string {
  const n = Number(value);
  const body = formatQty(String(Math.abs(n)), unit);
  return n < 0 ? `-${body}` : `+${body}`;
}
