import { z } from "zod";

/**
 * M13 — مركز التسويق: the seven tools' read models and inputs (discovery 02 §5, §4, §15).
 * Enum VALUES are the Django models' verbatim; the Arabic labels are UI text only (M13 §10).
 * Money is a server string (`display_*`) — never formatted here (FR-13.09).
 */
export const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = { percent: "نسبة مئوية", fixed: "مبلغ ثابت" };

export const APPLY_TO = ["all", "category", "product"] as const;
export type ApplyTo = (typeof APPLY_TO)[number];
export const APPLY_TO_LABELS: Record<ApplyTo, string> = { all: "كل المنتجات", category: "تصنيف", product: "منتج" };

/** The temporal state the UI computes from the dates and the counters (FR-13.04). */
export const TEMPORAL_STATES = ["not_started", "active", "expired", "exhausted", "inactive"] as const;
export type TemporalState = (typeof TEMPORAL_STATES)[number];
export const TEMPORAL_STATE_LABELS: Record<TemporalState, string> = {
  not_started: "لم يبدأ",
  active: "نشط",
  expired: "منتهٍ",
  exhausted: "استُهلك",
  inactive: "غير مفعّل",
};

const ref = z.object({ id: z.number().int(), name: z.string() });

export const couponSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  discount_type: z.enum(DISCOUNT_TYPES),
  /** Percent as an integer text, fixed as a decimal text. */
  discount_value: z.string(),
  display_discount: z.string(),
  apply_to: z.enum(APPLY_TO),
  category: ref.nullable(),
  product: ref.nullable(),
  min_order_amount: z.string().nullable(),
  display_min_order_amount: z.string().nullable(),
  influencer: z.object({ id: z.number().int(), name: z.string() }).nullable(),
  start_date: z.string().nullable(),
  expires_at: z.string().nullable(),
  is_active: z.boolean(),
  max_uses: z.number().int().nullable(),
  used_count: z.number().int(),
  created_at: z.string(),
});
export type Coupon = z.infer<typeof couponSchema>;
export const couponListSchema = z.object({ count: z.number().int(), results: z.array(couponSchema) });

export function couponState(c: Pick<Coupon, "is_active" | "start_date" | "expires_at" | "max_uses" | "used_count">, now = Date.now()): TemporalState {
  if (!c.is_active) return "inactive";
  if (c.max_uses !== null && c.used_count >= c.max_uses) return "exhausted";
  if (c.start_date && new Date(c.start_date).getTime() > now) return "not_started";
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return "expired";
  return "active";
}

export const couponInputSchema = z
  .object({
    code: z.string().trim().min(3, "الكود 3 أحرف على الأقل.").max(32, "الكود حتى 32 حرفاً.").regex(/^[A-Za-z0-9_-]+$/, "أحرف لاتينية وأرقام فقط."),
    discount_type: z.enum(DISCOUNT_TYPES),
    discount_value: z.string().trim().min(1, "أدخل قيمة الخصم."),
    apply_to: z.enum(APPLY_TO),
    category_id: z.string().optional(),
    product_id: z.string().optional(),
    min_order_amount: z.string().trim().optional(),
    max_uses: z.string().trim().optional(),
    start_date: z.string().optional(),
    expires_at: z.string().optional(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.discount_value);
    if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ code: "custom", path: ["discount_value"], message: "القيمة يجب أن تكون أكبر من صفر." });
    else if (v.discount_type === "percent" && (n < 1 || n > 100 || !Number.isInteger(n))) ctx.addIssue({ code: "custom", path: ["discount_value"], message: "النسبة بين 1 و100." });
    if (v.apply_to === "category" && !v.category_id) ctx.addIssue({ code: "custom", path: ["category_id"], message: "اختر التصنيف." });
    if (v.apply_to === "product" && !v.product_id) ctx.addIssue({ code: "custom", path: ["product_id"], message: "اختر المنتج." });
    if (v.min_order_amount && !(Number(v.min_order_amount) > 0)) ctx.addIssue({ code: "custom", path: ["min_order_amount"], message: "القيمة يجب أن تكون أكبر من صفر." });
    if (v.max_uses && !(Number.isInteger(Number(v.max_uses)) && Number(v.max_uses) > 0)) ctx.addIssue({ code: "custom", path: ["max_uses"], message: "عدد صحيح أكبر من صفر." });
    if (v.start_date && v.expires_at && v.expires_at <= v.start_date) ctx.addIssue({ code: "custom", path: ["expires_at"], message: "تاريخ النهاية يجب أن يكون بعد البداية." });
  });
export type CouponInput = z.infer<typeof couponInputSchema>;

// ── Promotional offers ────────────────────────────────────────────────────────────────
export const OFFER_TYPES = ["discount", "free_shipping", "buy_x_get_y"] as const;
export type OfferType = (typeof OFFER_TYPES)[number];
export const OFFER_TYPE_LABELS: Record<OfferType, string> = { discount: "خصم", free_shipping: "شحن مجاني", buy_x_get_y: "اشترِ X واحصل على Y" };
export const BUY_CONDITIONS = ["all", "category", "product", "min_items"] as const;
export type BuyCondition = (typeof BUY_CONDITIONS)[number];
export const BUY_CONDITION_LABELS: Record<BuyCondition, string> = { all: "أي منتج", category: "من تصنيف", product: "منتج محدد", min_items: "حد أدنى من القطع" };

export const offerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  offer_type: z.enum(OFFER_TYPES),
  discount_type: z.enum(DISCOUNT_TYPES).nullable(),
  discount_value: z.string().nullable(),
  display_discount: z.string().nullable(),
  min_order_amount: z.string().nullable(),
  display_min_order_amount: z.string().nullable(),
  description: z.string(),
  image: z.string().nullable(),
  cta_text: z.string(),
  buy_quantity: z.number().int().nullable(),
  buy_condition_type: z.enum(BUY_CONDITIONS).nullable(),
  buy_category: ref.nullable(),
  buy_product: ref.nullable(),
  get_product: ref.nullable(),
  get_quantity: z.number().int().nullable(),
  get_discount_percent: z.number().int().nullable(),
  min_total_items: z.number().int().nullable(),
  priority: z.number().int(),
  valid_from: z.string().nullable(),
  valid_until: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type Offer = z.infer<typeof offerSchema>;
export const offerListSchema = z.object({ count: z.number().int(), results: z.array(offerSchema) });

export function offerState(o: Pick<Offer, "is_active" | "valid_from" | "valid_until">, now = Date.now()): TemporalState {
  return couponState({ is_active: o.is_active, start_date: o.valid_from, expires_at: o.valid_until, max_uses: null, used_count: 0 }, now);
}

export const offerInputSchema = z
  .object({
    name: z.string().trim().min(2, "أدخل اسم العرض."),
    offer_type: z.enum(OFFER_TYPES),
    discount_type: z.enum(DISCOUNT_TYPES),
    discount_value: z.string().trim().optional(),
    min_order_amount: z.string().trim().optional(),
    description: z.string().trim().max(300, "حتى 300 حرف."),
    cta_text: z.string().trim().max(40, "حتى 40 حرفاً."),
    buy_quantity: z.string().optional(),
    buy_condition_type: z.enum(BUY_CONDITIONS),
    buy_category_id: z.string().optional(),
    buy_product_id: z.string().optional(),
    get_product_id: z.string().optional(),
    get_quantity: z.string().optional(),
    get_discount_percent: z.string().optional(),
    min_total_items: z.string().optional(),
    priority: z.string().trim(),
    valid_from: z.string().optional(),
    valid_until: z.string().optional(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const positiveInt = (s: string | undefined) => s !== undefined && s !== "" && Number.isInteger(Number(s)) && Number(s) > 0;
    if (!Number.isInteger(Number(v.priority)) || Number(v.priority) < 0) ctx.addIssue({ code: "custom", path: ["priority"], message: "الأولوية عدد صحيح." });
    if (v.offer_type === "discount") {
      const n = Number(v.discount_value);
      if (!v.discount_value || !(n > 0)) ctx.addIssue({ code: "custom", path: ["discount_value"], message: "القيمة يجب أن تكون أكبر من صفر." });
      else if (v.discount_type === "percent" && (n > 100 || !Number.isInteger(n))) ctx.addIssue({ code: "custom", path: ["discount_value"], message: "النسبة بين 1 و100." });
    }
    if (v.offer_type === "buy_x_get_y") {
      if (!positiveInt(v.buy_quantity)) ctx.addIssue({ code: "custom", path: ["buy_quantity"], message: "عدد صحيح أكبر من صفر." });
      if (v.buy_condition_type === "category" && !v.buy_category_id) ctx.addIssue({ code: "custom", path: ["buy_category_id"], message: "اختر التصنيف." });
      if (v.buy_condition_type === "product" && !v.buy_product_id) ctx.addIssue({ code: "custom", path: ["buy_product_id"], message: "اختر المنتج." });
      if (v.buy_condition_type === "min_items" && !positiveInt(v.min_total_items)) ctx.addIssue({ code: "custom", path: ["min_total_items"], message: "عدد صحيح أكبر من صفر." });
      if (!v.get_product_id) ctx.addIssue({ code: "custom", path: ["get_product_id"], message: "اختر المنتج الممنوح." });
      if (!positiveInt(v.get_quantity)) ctx.addIssue({ code: "custom", path: ["get_quantity"], message: "عدد صحيح أكبر من صفر." });
      const pct = Number(v.get_discount_percent);
      if (!v.get_discount_percent || !(pct >= 1 && pct <= 100 && Number.isInteger(pct))) ctx.addIssue({ code: "custom", path: ["get_discount_percent"], message: "النسبة بين 1 و100." });
    }
    if (v.min_order_amount && !(Number(v.min_order_amount) > 0)) ctx.addIssue({ code: "custom", path: ["min_order_amount"], message: "القيمة يجب أن تكون أكبر من صفر." });
    if (v.valid_from && v.valid_until && v.valid_until <= v.valid_from) ctx.addIssue({ code: "custom", path: ["valid_until"], message: "تاريخ النهاية يجب أن يكون بعد البداية." });
  });
export type OfferInput = z.infer<typeof offerInputSchema>;

// ── Abandoned carts ───────────────────────────────────────────────────────────────────
export const CART_STATUSES = ["active", "abandoned", "recovered"] as const;
export type CartStatus = (typeof CART_STATUSES)[number];
export const CART_STATUS_LABELS: Record<CartStatus, string> = { active: "نشطة", abandoned: "متروكة", recovered: "مستردَّة" };

export const abandonedCartSchema = z.object({
  id: z.number().int(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  display_total: z.string(),
  currency: z.string(),
  items_count: z.number().int(),
  status: z.enum(CART_STATUSES),
  reminder_step: z.number().int(),
  last_interaction_at: z.string(),
  last_reminder_sent_at: z.string().nullable(),
  recovered_order_id: z.number().int().nullable(),
  reminder_discount_coupon: z.string().nullable(),
  items: z.array(z.object({ product_id: z.number().int().nullable(), name: z.string(), quantity: z.number().int(), display_price: z.string(), image: z.string().nullable() })),
});
export type AbandonedCart = z.infer<typeof abandonedCartSchema>;
export const abandonedCartListSchema = z.object({
  count: z.number().int(),
  counters: z.object({ active: z.number().int(), abandoned: z.number().int(), recovered: z.number().int() }),
  results: z.array(abandonedCartSchema),
});

export const abandonedSettingsSchema = z.object({
  is_enabled: z.boolean(),
  min_cart_value: z.string(),
  channel_whatsapp: z.boolean(),
  channel_email: z.boolean(),
  channel_sms: z.boolean(),
  channel_conversational_enabled: z.boolean(),
  reminder_1_delay_hours: z.number().int(),
  reminder_1_message: z.string(),
  reminder_2_delay_hours: z.number().int(),
  reminder_2_message: z.string(),
  discount_percent: z.number().int(),
  discount_validity_hours: z.number().int(),
});
export type AbandonedSettings = z.infer<typeof abandonedSettingsSchema>;
/** The variables each reminder may use (US-13.3.2/3). */
export const REMINDER_1_VARS = ["customer_name", "cart_url"] as const;
export const REMINDER_2_VARS = ["customer_name", "cart_url", "discount_percent", "discount_code"] as const;
export function unknownVariables(message: string, allowed: readonly string[]): string[] {
  const found = [...message.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!);
  return [...new Set(found.filter((v) => !allowed.includes(v)))];
}

export const abandonedSettingsInputSchema = z
  .object({
    is_enabled: z.boolean(),
    min_cart_value: z.string().trim(),
    channel_whatsapp: z.boolean(),
    channel_conversational_enabled: z.boolean(),
    reminder_1_delay_hours: z.string().trim(),
    reminder_1_message: z.string().trim().min(1, "أدخل نص التذكير."),
    reminder_2_delay_hours: z.string().trim(),
    reminder_2_message: z.string().trim().min(1, "أدخل نص التذكير."),
    discount_percent: z.string().trim(),
    discount_validity_hours: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    const int = (key: "reminder_1_delay_hours" | "reminder_2_delay_hours" | "discount_validity_hours", min: number) => {
      const n = Number(v[key]);
      if (!Number.isInteger(n) || n < min) ctx.addIssue({ code: "custom", path: [key], message: `عدد صحيح ${min} أو أكثر.` });
    };
    int("reminder_1_delay_hours", 1);
    int("reminder_2_delay_hours", 1);
    int("discount_validity_hours", 1);
    const pct = Number(v.discount_percent);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) ctx.addIssue({ code: "custom", path: ["discount_percent"], message: "النسبة بين 0 و100." });
    if (!(Number(v.min_cart_value) >= 0)) ctx.addIssue({ code: "custom", path: ["min_cart_value"], message: "قيمة غير صالحة." });
    for (const u of unknownVariables(v.reminder_1_message, REMINDER_1_VARS)) ctx.addIssue({ code: "custom", path: ["reminder_1_message"], message: `متغير غير معروف: {${u}}` });
    for (const u of unknownVariables(v.reminder_2_message, REMINDER_2_VARS)) ctx.addIssue({ code: "custom", path: ["reminder_2_message"], message: `متغير غير معروف: {${u}}` });
  });
export type AbandonedSettingsInput = z.infer<typeof abandonedSettingsInputSchema>;

// ── Campaigns ─────────────────────────────────────────────────────────────────────────
export const CHANNELS = ["sms", "email", "whatsapp", "meta_social_commerce", "tiktok_shop", "telegram_bot"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  sms: "رسائل SMS",
  email: "البريد الإلكتروني",
  whatsapp: "واتساب",
  meta_social_commerce: "Meta (فيسبوك وإنستغرام)",
  tiktok_shop: "TikTok Shop",
  telegram_bot: "بوت تيليغرام",
};
export const AUDIENCES = ["all", "abandoned_carts", "dormant", "bought_product"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = { all: "كل العملاء", abandoned_carts: "أصحاب السلات المتروكة", dormant: "العملاء الخاملون", bought_product: "من اشترى منتجاً" };
export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sent"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = { draft: "مسودة", scheduled: "مجدولة", sent: "أُرسلت" };

export const campaignSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  channel: z.enum(CHANNELS),
  channel_connected: z.boolean(),
  audience_type: z.enum(AUDIENCES),
  product: ref.nullable(),
  message: z.string(),
  status: z.enum(CAMPAIGN_STATUSES),
  scheduled_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  recipients: z.object({ pending: z.number().int(), sent: z.number().int(), failed: z.number().int() }),
  created_at: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;
export const campaignListSchema = z.object({ count: z.number().int(), results: z.array(campaignSchema) });
export const campaignPreviewSchema = z.object({ recipients_count: z.number().int(), rendered_message: z.string() });
export const channelStatusListSchema = z.array(z.object({ channel: z.enum(CHANNELS), connected: z.boolean(), manage_href: z.string().nullable() }));

export const campaignInputSchema = z
  .object({
    name: z.string().trim().min(2, "أدخل اسم الحملة."),
    channel: z.enum(CHANNELS),
    audience_type: z.enum(AUDIENCES),
    product_id: z.string().optional(),
    message: z.string().trim().min(5, "أدخل نص الرسالة.").max(1000, "حتى 1000 حرف."),
  })
  .superRefine((v, ctx) => {
    if (v.audience_type === "bought_product" && !v.product_id) ctx.addIssue({ code: "custom", path: ["product_id"], message: "اختر المنتج." });
  });
export type CampaignInput = z.infer<typeof campaignInputSchema>;

// ── Timeline ──────────────────────────────────────────────────────────────────────────
export const EVENT_TYPES = ["seasonal", "holiday", "campaign_plan", "custom"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = { seasonal: "موسمي", holiday: "عطلة", campaign_plan: "خطة حملة", custom: "مخصص" };
export const EVENT_COLORS = ["indigo", "emerald", "amber", "rose", "sky"] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export const EVENT_COLOR_LABELS: Record<EventColor, string> = { indigo: "نيلي", emerald: "زمردي", amber: "كهرماني", rose: "وردي", sky: "سماوي" };
/** The merchant's colour as DATA — a 2px start border only, never a fill (M13 §11 I). */
export const EVENT_COLOR_HEX: Record<EventColor, string> = { indigo: "#4F46E5", emerald: "#059669", amber: "#D97706", rose: "#E11D48", sky: "#0284C7" };

export const eventSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  event_type: z.enum(EVENT_TYPES),
  color: z.enum(EVENT_COLORS),
  start_date: z.string(),
  end_date: z.string(),
  linked_campaign: z.object({ id: z.number().int(), name: z.string(), status: z.enum(CAMPAIGN_STATUSES) }).nullable(),
  linked_offer: z.object({ id: z.number().int(), name: z.string(), is_active: z.boolean() }).nullable(),
  notes: z.string(),
});
export type MarketingEvent = z.infer<typeof eventSchema>;
export const eventListSchema = z.array(eventSchema);
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(2, "أدخل عنوان الحدث."),
    event_type: z.enum(EVENT_TYPES),
    color: z.enum(EVENT_COLORS),
    start_date: z.string().min(1, "أدخل تاريخ البداية."),
    end_date: z.string().min(1, "أدخل تاريخ النهاية."),
    linked_campaign_id: z.string().optional(),
    linked_offer_id: z.string().optional(),
    notes: z.string().trim().max(300, "حتى 300 حرف."),
  })
  .superRefine((v, ctx) => {
    if (v.end_date < v.start_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "تاريخ النهاية يجب أن يكون بعد البداية." });
  });
export type EventInput = z.infer<typeof eventInputSchema>;

// ── Loyalty · gifting · summary ───────────────────────────────────────────────────────
export const loyaltySchema = z.object({
  is_enabled: z.boolean(),
  riyals_per_point: z.number().int(),
  points_per_riyal_redemption: z.number().int(),
  min_points_to_redeem: z.number().int(),
});
export type LoyaltySettings = z.infer<typeof loyaltySchema>;
export const giftSchema = z.object({ is_enabled: z.boolean() });

export const summarySchema = z.object({
  active_coupons: z.number().int(),
  active_offers: z.number().int(),
  abandoned_today: z.number().int(),
  last_campaign: z.object({ id: z.number().int(), name: z.string(), status: z.enum(CAMPAIGN_STATUSES), sent_at: z.string().nullable() }).nullable(),
});
export type MarketingSummary = z.infer<typeof summarySchema>;
