import { z } from "zod";

/**
 * M19 contracts — all `[NEEDS BACKEND]` (spec §7). Domain states, webhook entities and the
 * integration status rows are a contract proposed by the frontend; enum VALUES are verbatim
 * from the spec, labels are Arabic.
 */

// ── Domains ─────────────────────────────────────────────────────────────────
export const DOMAIN_STATUSES = ["pending_dns", "verifying", "active", "failed"] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];
export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  pending_dns: "بانتظار DNS",
  verifying: "جارٍ التحقق",
  active: "نشط",
  failed: "فشل",
};
export const DOMAIN_KINDS = ["subdomain", "custom"] as const;

export const dnsRecordSchema = z.object({ type: z.string(), name: z.string(), value: z.string() });
export type DnsRecord = z.infer<typeof dnsRecordSchema>;

export const domainSchema = z.object({
  id: z.number().int(),
  domain: z.string(),
  is_primary: z.boolean(),
  kind: z.enum(DOMAIN_KINDS),
  status: z.enum(DOMAIN_STATUSES),
  /** `verifying` with DNS already correct → the certificate is being issued (§8). */
  dns_ok: z.boolean().optional(),
  dns_records: z.array(dnsRecordSchema),
  failure_reason: z.string().nullable().optional(),
  next_step: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  last_checked_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Domain = z.infer<typeof domainSchema>;

export const domainListSchema = z.object({ base_domain: z.string(), results: z.array(domainSchema) });
export type DomainList = z.infer<typeof domainListSchema>;

export function domainStatusText(d: Pick<Domain, "status" | "dns_ok">): string {
  if (d.status === "verifying" && d.dns_ok) return "جارٍ إصدار الشهادة";
  return DOMAIN_STATUS_LABELS[d.status];
}

export const DOMAIN_TONE: Record<DomainStatus, "success" | "warning" | "info" | "destructive"> = {
  pending_dns: "warning",
  verifying: "info",
  active: "success",
  failed: "destructive",
};

/** Local format check (FR-19.01). Returns an Arabic message or null. The server re-checks. */
export function domainFormatError(raw: string, baseDomain: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return "أدخل النطاق.";
  if (/^[a-z]+:\/\//.test(v) || v.includes("/")) return "أدخل النطاق وحده بلا بروتوكول أو مسار (مثل shop.example.com).";
  if (!/^[a-z0-9.-]+$/.test(v)) return "النطاق أحرف لاتينية وأرقام ونقاط وشرطات فقط.";
  const labels = v.split(".");
  if (labels.length < 2 || labels.some((l) => !l || l.startsWith("-") || l.endsWith("-"))) return "صيغة النطاق غير صحيحة (مثل example.com).";
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1]!)) return "امتداد النطاق غير صحيح.";
  const base = baseDomain.toLowerCase();
  if (v === base || v.endsWith(`.${base}`)) return `لا يمكن ربط نطاق تحت ${base} — هذا نطاق المنصة.`;
  // Decision 2026-10-19 (Phase 5 open item 3): `www.` — and any other label — is allowed on
  // the merchant's OWN domain. The reserved labels of discovery 01 §1 (www/api/admin/app)
  // protect the platform's `*.<base>` namespace, which the check above already refuses
  // whole; `www.example.com` is the most common storefront address there is. A `www.`
  // host gets a CNAME, the apex an A record (`recordsFor` in the mock).
  return null;
}

export const domainInputSchema = z.object({ domain: z.string() });
export type DomainInput = z.infer<typeof domainInputSchema>;

// ── Tracking ────────────────────────────────────────────────────────────────
export const TRACKING_ID_FIELDS = [
  "meta_pixel_id",
  "tiktok_pixel_id",
  "snapchat_pixel_id",
  "gtm_container_id",
  "ga4_measurement_id",
  "google_ads_conversion_id",
  "google_ads_conversion_label",
] as const;
export type TrackingIdField = (typeof TRACKING_ID_FIELDS)[number];
export const TRACKING_TOKEN_FIELDS = ["meta_conversions_api_token", "tiktok_events_api_token"] as const;
export type TrackingTokenField = (typeof TRACKING_TOKEN_FIELDS)[number];

export const TRACKING_LABELS: Record<TrackingIdField | TrackingTokenField, string> = {
  meta_pixel_id: "معرّف Meta Pixel",
  tiktok_pixel_id: "معرّف TikTok Pixel",
  snapchat_pixel_id: "معرّف Snapchat Pixel",
  gtm_container_id: "حاوية Google Tag Manager",
  ga4_measurement_id: "معرّف قياس GA4",
  google_ads_conversion_id: "معرّف تحويل Google Ads",
  google_ads_conversion_label: "تسمية تحويل Google Ads",
  meta_conversions_api_token: "رمز Meta Conversions API",
  tiktok_events_api_token: "رمز TikTok Events API",
};

export const TRACKING_PLACEHOLDERS: Partial<Record<TrackingIdField, string>> = {
  meta_pixel_id: "1234567890123456",
  tiktok_pixel_id: "C4ABCDEF123456789",
  snapchat_pixel_id: "a1b2c3d4-…",
  gtm_container_id: "GTM-XXXXXXX",
  ga4_measurement_id: "G-XXXXXXXXXX",
  google_ads_conversion_id: "AW-123456789",
  google_ads_conversion_label: "AbC-D_efG",
};

/** Expected shapes — a mismatch is a non-blocking warning (US-19.2.3). */
const TRACKING_FORMATS: Partial<Record<TrackingIdField, RegExp>> = {
  meta_pixel_id: /^\d{10,20}$/,
  tiktok_pixel_id: /^[A-Z0-9]{10,30}$/i,
  gtm_container_id: /^GTM-[A-Z0-9]{4,10}$/,
  ga4_measurement_id: /^G-[A-Z0-9]{6,14}$/,
  google_ads_conversion_id: /^AW-\d{6,14}$/,
};

export function trackingFormatWarning(field: TrackingIdField, value: string): string | null {
  const v = value.trim();
  const re = TRACKING_FORMATS[field];
  if (!v || !re || re.test(v)) return null;
  return "الصيغة غير معتادة — تأكد من نسخ المعرّف كاملاً.";
}

export const trackingSchema = z.object({
  is_tracking_enabled: z.boolean(),
  meta_pixel_id: z.string(),
  tiktok_pixel_id: z.string(),
  snapchat_pixel_id: z.string(),
  gtm_container_id: z.string(),
  ga4_measurement_id: z.string(),
  google_ads_conversion_id: z.string(),
  google_ads_conversion_label: z.string(),
  has_meta_conversions_api_token: z.boolean(),
  has_tiktok_events_api_token: z.boolean(),
  updated_at: z.string().nullable().optional(),
});
export type Tracking = z.infer<typeof trackingSchema>;

export const trackingInputSchema = z.object({
  is_tracking_enabled: z.boolean(),
  // Limits = Django `TrackingSettings` columns (INT-023): ids 50, Ads label 100, tokens 255.
  meta_pixel_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  tiktok_pixel_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  snapchat_pixel_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  gtm_container_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  ga4_measurement_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  google_ads_conversion_id: z.string().max(50, "50 حرفاً كحد أقصى."),
  google_ads_conversion_label: z.string().max(100, "100 حرفاً كحد أقصى."),
  meta_conversions_api_token: z.string().max(255, "الرمز أطول من المسموح (255)."),
  tiktok_events_api_token: z.string().max(255, "الرمز أطول من المسموح (255)."),
});
export type TrackingInput = z.infer<typeof trackingInputSchema>;

// ── Webhooks ────────────────────────────────────────────────────────────────
/** The minimum proposed set (FR-19.06); the UI always reads the live list from the server. */
export const WEBHOOK_EVENT_CODES = [
  "order.created",
  "order.status_changed",
  "order.fulfillment_changed",
  "order.refunded",
  "shipment.event",
  "product.updated",
  "inventory.low_stock",
] as const;
/** Sent by «إرسال حدث تجريبي» only. */
export const WEBHOOK_TEST_EVENT = "webhook.test";

export const webhookEventSchema = z.object({ code: z.string(), name: z.string(), description: z.string() });
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export const webhookEventListSchema = z.array(webhookEventSchema);

export const DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = { pending: "قيد الإرسال", delivered: "سُلِّم", failed: "فشل" };
export const DELIVERY_TONE: Record<DeliveryStatus, "info" | "success" | "destructive"> = { pending: "info", delivered: "success", failed: "destructive" };

/** Endpoints are auto-disabled after this many consecutive failures (§8). */
export const AUTO_DISABLE_AFTER = 10;

export const webhookEndpointSchema = z.object({
  id: z.number().int(),
  url: z.string(),
  events: z.array(z.string()),
  is_active: z.boolean(),
  description: z.string(),
  has_secret: z.boolean(),
  created_at: z.string(),
  last_delivery_at: z.string().nullable(),
  last_delivery_status: z.enum(DELIVERY_STATUSES).nullable(),
  failure_count: z.number().int(),
  auto_disabled: z.boolean(),
});
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export const webhookEndpointListSchema = z.object({ count: z.number().int(), results: z.array(webhookEndpointSchema) });

/** POST create / rotate-secret: the only two responses that ever carry `secret` (FR-19.04). */
export const webhookSecretResponseSchema = z.object({ endpoint: webhookEndpointSchema, secret: z.string() });

export const webhookDeliverySchema = z.object({
  id: z.number().int(),
  endpoint_id: z.number().int(),
  event: z.string(),
  status: z.enum(DELIVERY_STATUSES),
  response_code: z.number().int().nullable(),
  duration_ms: z.number().int().nullable(),
  attempt: z.number().int(),
  created_at: z.string(),
  error: z.string().nullable().optional(),
});
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
export const webhookDeliveryListSchema = z.object({ count: z.number().int(), results: z.array(webhookDeliverySchema) });

export const webhookInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "أدخل عنوان نقطة النهاية.")
    .refine((v) => /^https:\/\//i.test(v), "العنوان يجب أن يبدأ بـ https://")
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "عنوان غير صالح."),
  events: z.array(z.string()).min(1, "اختر حدثاً واحداً على الأقل."),
  description: z.string().max(200, "200 حرف كحد أقصى."),
  is_active: z.boolean(),
});
export type WebhookInput = z.infer<typeof webhookInputSchema>;

// ── Integrations overview ───────────────────────────────────────────────────
export const INTEGRATION_STATUSES = ["connected", "disconnected", "error"] as const;
export type IntegrationStatusValue = (typeof INTEGRATION_STATUSES)[number];
export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatusValue, string> = { connected: "مربوط", disconnected: "غير مربوط", error: "خطأ" };
export const INTEGRATION_TONE: Record<IntegrationStatusValue, "success" | "muted" | "destructive"> = { connected: "success", disconnected: "muted", error: "destructive" };

export const INTEGRATION_GROUPS = ["apps", "channels", "marketplaces", "suppliers", "carriers"] as const;
export type IntegrationGroup = (typeof INTEGRATION_GROUPS)[number];
export const INTEGRATION_GROUP_LABELS: Record<IntegrationGroup, string> = {
  apps: "التطبيقات",
  channels: "قنوات التواصل",
  marketplaces: "الأسواق الإلكترونية",
  suppliers: "موردو الدروبشيبينغ",
  carriers: "ناقلو الشحن",
};

export const integrationStatusSchema = z.object({
  code: z.string(),
  name: z.string(),
  group: z.enum(INTEGRATION_GROUPS),
  status: z.enum(INTEGRATION_STATUSES),
  /** false when the owning module has no contract yet / the plan lacks the feature (FR-19.08). */
  available: z.boolean(),
  last_event_at: z.string().nullable(),
  detail: z.string().nullable(),
  manage_href: z.string(),
});
export type IntegrationStatus = z.infer<typeof integrationStatusSchema>;
export const integrationStatusListSchema = z.array(integrationStatusSchema);
