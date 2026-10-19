import { z } from "zod";
import { WEEK_STARTS } from "@/features/bookings/weekdays";

/**
 * M26 merchant contract (§7, `[NEEDS BACKEND]`). Weekdays are the BACKEND encoding
 * (0 = Monday); conversion lives in `weekdays.ts` only.
 */
export const SLOT_STATUSES = ["held", "booked", "cancelled"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];
export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = { held: "محتجز", booked: "محجوز", cancelled: "ملغى" };

const context = { timezone: z.string(), week_start_day: z.enum(WEEK_STARTS) };

export const serviceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  booking_duration_minutes: z.number().int().nullable(),
  availability_count: z.number().int(),
  image: z.string().nullable().optional(),
});
export type Service = z.infer<typeof serviceSchema>;
export const servicesSchema = z.array(serviceSchema);

const TIME = /^([01]\d|2[0-3]):[0-5]\d(:\d{2})?$/;
export const windowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(TIME).transform((t) => t.slice(0, 5)),
  end_time: z.string().regex(TIME).transform((t) => t.slice(0, 5)),
});
export type AvailabilityWindow = z.infer<typeof windowSchema>;

export const availabilitySchema = z.object({
  ...context,
  product: z.object({ id: z.number().int(), name: z.string(), booking_duration_minutes: z.number().int().nullable() }),
  results: z.array(windowSchema),
});
export type Availability = z.infer<typeof availabilitySchema>;

export const slotSchema = z.object({
  id: z.number().int(),
  product: z.object({ id: z.number().int(), name: z.string() }),
  start_datetime: z.string(),
  end_datetime: z.string(),
  status: z.enum(SLOT_STATUSES),
  held_until: z.string().nullable(),
  is_expired: z.boolean().optional().default(false),
  customer_name: z.string(),
  customer_phone: z.string(),
  order_id: z.number().int().nullable(),
});
export type Slot = z.infer<typeof slotSchema>;

export const slotListSchema = z.object({ ...context, results: z.array(slotSchema) });
export type SlotList = z.infer<typeof slotListSchema>;

export const cancelResultSchema = z.object({ detail: z.string(), order_effect: z.string().nullable().optional() });

// ── Local validation of the availability editor (FR-26.03, US-26.1.2) ─────────────────
export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export interface DraftWindow {
  key: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

/** Per-row error (keyed by `DraftWindow.key`): end ≤ start, or overlap with another window the same day. */
export function validateWindows(rows: DraftWindow[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const r of rows) {
    if (!TIME.test(r.start_time) || !TIME.test(r.end_time)) errors[r.key] = "أدخل وقتَي البداية والنهاية.";
    else if (toMinutes(r.end_time) <= toMinutes(r.start_time)) errors[r.key] = "يجب أن ينتهي الوقت بعد بدايته.";
  }
  for (const a of rows) {
    if (errors[a.key]) continue;
    const clash = rows.some(
      (b) => b !== a && b.weekday === a.weekday && !errors[b.key] && toMinutes(a.start_time) < toMinutes(b.end_time) && toMinutes(b.start_time) < toMinutes(a.end_time),
    );
    if (clash) errors[a.key] = "تتداخل مع نافذة أخرى في اليوم نفسه.";
  }
  return errors;
}
