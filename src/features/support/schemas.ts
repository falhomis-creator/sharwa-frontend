import { z } from "zod";

/** M31 sessions + M32 tickets contracts (§7) — served by Django since INT-042 (`api/views_support.py`). */
export const SESSION_STATUSES = ["bot_active", "human_locked", "escalated", "closed"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = { bot_active: "البوت يردّ", human_locked: "يتولّاها موظف", escalated: "مُصعَّدة", closed: "مغلقة" };
export const SESSION_STATUS_TONE: Record<SessionStatus, "info" | "success" | "warning" | "muted"> = { bot_active: "info", human_locked: "success", escalated: "warning", closed: "muted" };
export const SESSION_TYPES = ["customer", "affiliate", "staff_internal"] as const;
export const SESSION_TYPE_LABELS: Record<(typeof SESSION_TYPES)[number], string> = { customer: "عميل", affiliate: "مسوّق", staff_internal: "موظف داخلي" };

export const sessionSchema = z.object({
  id: z.number().int(),
  session_type: z.enum(SESSION_TYPES),
  status: z.enum(SESSION_STATUSES),
  party: z.object({ name: z.string(), phone: z.string().nullable() }),
  assigned_staff: z.object({ id: z.number().int().nullable(), name: z.string() }).nullable(),
  messages_count: z.number().int(),
  last_activity_at: z.string(),
  version: z.number().int(),
  /** Extension: the requester holds the lock (the server knows who is asking). */
  is_mine: z.boolean().default(false),
});
export type SupportSession = z.infer<typeof sessionSchema>;

const aiFlagsSchema = z.object({ installed: z.boolean(), enabled: z.boolean() });

export const sessionListSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
  results: z.array(sessionSchema),
  ai: aiFlagsSchema.optional(),
});
export type SessionList = z.infer<typeof sessionListSchema>;

/**
 * One timeline row. INT-042: Django merges messages and tool calls (ids `2×id` / `2×id+1`, ordered by time), logs
 * takeover/release/close as `system` rows, and links customer media (a short-lived signed URL).
 */
export const timelineItemSchema = z.object({
  id: z.number().int(),
  kind: z.enum(["message", "tool_call"]),
  sender_type: z.enum(["customer", "bot", "staff", "system"]).optional(),
  sender_name: z.string().nullable().optional(),
  text: z.string().optional(),
  tool_name: z.string().optional(),
  input_summary: z.string().optional(),
  output_summary: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  media_type: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  created_at: z.string(),
});
export type TimelineItem = z.infer<typeof timelineItemSchema>;

export const sessionDetailSchema = z.object({
  session: sessionSchema,
  timeline: z.array(timelineItemSchema),
  /** Opaque `?after=` cursor for the next poll (M31 §7); older responses fall back to the last item id. */
  cursor: z.string().nullable().optional(),
  can_takeover: z.boolean().default(false),
  ai: aiFlagsSchema.optional(),
});
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
export const sessionCountersSchema = z.object({ escalated: z.number().int(), human_locked_mine: z.number().int() });

// tickets ------------------------------------------------------------------------------
export const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };
export const TICKET_STATUS_TONE: Record<TicketStatus, "info" | "warning" | "muted"> = { open: "info", in_progress: "warning", closed: "muted" };

const ref = z.object({ id: z.number().int(), name: z.string() });
export const ticketRowSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  status: z.enum(TICKET_STATUSES),
  assigned_to: ref.nullable(),
  /** §8: an assignee who was deactivated keeps the ticket but shows «غير نشط». */
  assignee_active: z.boolean().optional(),
  /** INT-042: Django's `SupportTicket.customer_phone` (optional — internal tickets have none). */
  customer_phone: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type TicketRow = z.infer<typeof ticketRowSchema>;
export const ticketListSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
  results: z.array(ticketRowSchema),
  counters: z.object({ open: z.number().int(), in_progress: z.number().int(), closed: z.number().int() }),
});
export type TicketList = z.infer<typeof ticketListSchema>;
export const ticketSchema = ticketRowSchema.extend({ description: z.string(), created_by: z.string().nullable().optional(), closed_at: z.string().nullable().optional() });
export type Ticket = z.infer<typeof ticketSchema>;
export const assigneeListSchema = z.array(ref);

/** `SupportTicketForm` — its fields only (FR-32.03): no priority, no category. */
export const ticketFormSchema = z.object({
  title: z.string().trim().min(1, "أدخل عنوان التذكرة.").max(200, "200 حرف كحد أقصى."),
  description: z.string().trim().max(4000, "4000 حرف كحد أقصى."),
  assigned_to_id: z.number().int().nullable(),
  customer_phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+?\d{6,20}$/.test(v), "رقم هاتف بالأرقام فقط، أو اتركه فارغاً.")
    .optional(),
});
export type TicketForm = z.infer<typeof ticketFormSchema>;
