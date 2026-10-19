import { z } from "zod";

/**
 * M27 inbox contract (§7, `[NEEDS BACKEND]`): conversations, messages, the context column.
 * Labels are fixed Arabic strings (constitution: status is text, never a coloured pill).
 */
export const CONVERSATION_STATUSES = ["open", "pending", "resolved"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = { open: "مفتوحة", pending: "معلّقة", resolved: "محلولة" };
export const CONVERSATION_STATUS_TONE: Record<ConversationStatus, "info" | "warning" | "muted"> = { open: "info", pending: "warning", resolved: "muted" };

export const CONVERSATION_CHANNELS = ["facebook", "instagram", "tiktok", "telegram"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
/** Short text names (§11 I: the channel is small text, never a big coloured logo). */
export const CHANNEL_SHORT: Record<ConversationChannel, string> = { facebook: "فيسبوك", instagram: "إنستغرام", tiktok: "تيك توك", telegram: "تيليجرام" };

export const MESSAGE_STATUS_LABELS = { sent: "مُرسَلة", delivered: "تم التوصيل", read: "مقروءة", failed: "فشلت" } as const;

const staffRef = z.object({ id: z.number().int(), name: z.string() });

export const conversationSchema = z.object({
  id: z.number().int(),
  channel_code: z.enum(CONVERSATION_CHANNELS),
  contact_name: z.string(),
  external_contact_id: z.string(),
  last_message_preview: z.string(),
  last_message_at: z.string(),
  unread_count: z.number().int(),
  status: z.enum(CONVERSATION_STATUSES),
  assigned_staff: staffRef.nullable(),
  order_id: z.number().int().nullable(),
  /** Extension of the §7 row: the connection behind it (edge case «القناة غير مربوطة»). */
  channel_connected: z.boolean().default(true),
  /** Extension: `StaffChannelAccess.can_reply` for the requester (US-27.2 acceptance 3). */
  can_reply: z.boolean().default(true),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const conversationListSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
  results: z.array(conversationSchema),
});
export type ConversationList = z.infer<typeof conversationListSchema>;

export const conversationDetailSchema = conversationSchema.extend({
  contact: z.object({ name: z.string(), phone: z.string().nullable(), city: z.string().nullable(), external_contact_id: z.string() }),
  order: z
    .object({ id: z.number().int(), status: z.string(), status_label: z.string().nullable(), display_total: z.string().nullable(), created_at: z.string().nullable() })
    .nullable(),
  staff: z.array(staffRef),
});
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const messageSchema = z.object({
  id: z.number().int(),
  direction: z.enum(["inbound", "outbound"]),
  sender_type: z.enum(["customer", "staff", "bot"]),
  sender_name: z.string().nullable(),
  text: z.string(),
  media: z.array(z.object({ url: z.string(), type: z.enum(["image", "file"]) })).default([]),
  status: z.enum(["sent", "delivered", "read", "failed"]).nullable(),
  error: z.string().nullable().optional(),
  product: z.object({ id: z.number().int(), name: z.string(), display_price: z.string() }).nullable().optional(),
  client_id: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Message = z.infer<typeof messageSchema>;
export const messageListSchema = z.array(messageSchema);

export const inboxCountersSchema = z.object({ unread: z.number().int() });

export const pickProductSchema = z.object({ id: z.number().int(), name: z.string(), sku: z.string(), display_price: z.string() });
export type PickProduct = z.infer<typeof pickProductSchema>;
export const pickProductListSchema = z.array(pickProductSchema);

export const convertResultSchema = z.object({ order_id: z.number().int() });

/** The convert-to-order form (M06 manual order, prefilled from the context). */
export const convertFormSchema = z.object({
  customer_name: z.string().trim().min(1, "أدخل اسم العميل."),
  customer_phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^(967|966)\d{9}$/.test(v), "رقم هاتف بصيغة دولية: 967 أو 966 ثم 9 أرقام."),
  address: z.string().trim().min(3, "أدخل عنوان التوصيل."),
  items: z.array(z.object({ product_id: z.number().int(), name: z.string(), quantity: z.number().int().min(1) })).min(1, "أضف منتجاً واحداً على الأقل."),
});
export type ConvertForm = z.input<typeof convertFormSchema>;
