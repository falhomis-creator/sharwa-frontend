import { z } from "zod";
import { normalizePhone } from "@/lib/format";
import { validateSubdomain } from "@/lib/tenant";
import { provisioningStatusSchema, type ProvisioningStatus } from "@/lib/schemas/provisioning";
import { messages } from "@/features/onboarding/onboarding.content";

/**
 * M02 contracts (data-model §2 RegistrationDraft + MarketCategory, M02 §7).
 *
 * The local rules mirror `TenantRegistrationForm` field for field and add nothing
 * (FR-02.02, SC-02.5); the server stays the judge and its `{field: [msg]}` answers land
 * on the same fields (FR-02.12).
 */

export const STORE_NAME_MIN = 3;
export const STORE_NAME_MAX = 100;

/** International form without `+` after normalization (`0770841802` → `967770841802`). */
export const NORMALIZED_PHONE_RE = /^(967|966)\d{9}$/;

export const storeNameSchema = z
  .string()
  .trim()
  .min(STORE_NAME_MIN, messages.storeNameLength)
  .max(STORE_NAME_MAX, messages.storeNameLength);

export const merchantPhoneSchema = z
  .string()
  .trim()
  .min(1, messages.phoneRequired)
  .refine((v) => NORMALIZED_PHONE_RE.test(normalizePhone(v)), messages.phoneInvalid);

/** The four server reasons verbatim, plus the shared length rule (`src/lib/tenant.ts`). */
export const subdomainSchema = z.string().superRefine((value, ctx) => {
  const result = validateSubdomain(value);
  if (!result.ok) ctx.addIssue({ code: "custom", message: result.reason });
});

export const registrationDraftSchema = z.object({
  store_name: storeNameSchema,
  merchant_phone: merchantPhoneSchema,
  subdomain: subdomainSchema,
  interested_categories: z.array(z.number().int().positive()),
  agree_terms: z.boolean().refine((v) => v, messages.agreeTerms),
});

/** What the form holds. `merchant_phone` is as typed; it is normalized on submit. */
export type RegistrationDraft = z.input<typeof registrationDraftSchema>;
export type RegistrationValues = z.output<typeof registrationDraftSchema>;

/** `GET /api/v1/public/market-categories/` — `[NEEDS BACKEND]`. Active only, ordered. */
export const marketCategorySchema = z.object({ id: z.number().int(), name: z.string() });
export const marketCategoriesSchema = z.array(marketCategorySchema);
export type MarketCategory = z.infer<typeof marketCategorySchema>;

/** `GET /register/check-subdomain/` — Ready. Django omits `reason` when available. */
export const checkSubdomainSchema = z.object({
  available: z.boolean(),
  reason: z.string().default(""),
});
export type CheckSubdomain = z.infer<typeof checkSubdomainSchema>;

/** `POST /api/v1/public/register/` — `[NEEDS BACKEND]`. */
export const registerResponseSchema = z.object({
  otp_token: z.string().min(1),
  ttl_seconds: z.number().int().positive(),
  masked_phone: z.string(),
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/** `POST /api/v1/public/register/verify-otp/` — `[NEEDS BACKEND]`. */
export const verifyResponseSchema = z.object({
  status_token: z.string().min(1),
  status_url: z.string(),
});
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;

/** `POST /api/v1/public/register/resend-otp/` — `[NEEDS BACKEND]`. */
export const resendResponseSchema = z.object({
  ttl_seconds: z.number().int().positive(),
});
export type ResendResponse = z.infer<typeof resendResponseSchema>;

/** `GET /register/status/<token>/` — Ready; shared with M47. */
export { provisioningStatusSchema };
export type { ProvisioningStatus };

/** Fallback when the server does not say (M02 §10). */
export const DEFAULT_OTP_TTL_SECONDS = 300;
export const OTP_LENGTH = 6;
