import { z } from "zod";
import { CURRENCIES } from "@/lib/schemas/money";

/**
 * M20/M45/M46 shared contracts — every row is `[NEEDS BACKEND]` (M20 §7, M45 §7, M46 §7).
 * Enum VALUES are verbatim from data-model §5 and the module specs; labels are Arabic.
 *
 * One namespace for the platform console: `/api/v1/platform/*` (M20's naming). M45/M46
 * proposed `/api/v1/admin/*` for some of the same rows; the frontend unifies them under
 * `platform/` because `/api/bff/admin/*` already belongs to the merchant's storefront
 * sections (M08) and the console is one product (deviation logged in tasks.md, Phase 6).
 */
export const currencyEnum = z.enum(CURRENCIES);

export const PROVISIONING_STATUSES = ["pending", "provisioning", "ready", "failed"] as const;
export type ProvisioningState = (typeof PROVISIONING_STATUSES)[number];
export const PROVISIONING_LABELS: Record<ProvisioningState, string> = {
  pending: "بالانتظار",
  provisioning: "قيد التجهيز",
  ready: "جاهز",
  failed: "فشل التجهيز",
};
export const PROVISIONING_TONE: Record<ProvisioningState, Tone> = {
  pending: "muted",
  provisioning: "info",
  ready: "success",
  failed: "destructive",
};

export type Tone = "success" | "warning" | "info" | "destructive" | "muted";

/** The pseudo-store every console query key is prefixed with (constitution VIII). */
export const PLATFORM_SCOPE = "platform" as const;

/** «من نفّذ» on every write (FR-20.07). */
export const actorSchema = z.object({ username: z.string(), role: z.enum(["superuser", "operator"]) });
export type Actor = z.infer<typeof actorSchema>;

/** `{detail, level}` — the server's own sentence, shown verbatim (FR-45.04). */
export const actionResultSchema = z.object({
  detail: z.string(),
  level: z.enum(["success", "warning", "error"]).default("success"),
});
export type ActionResult = z.infer<typeof actionResultSchema>;

export const listOf = <T extends z.ZodType>(item: T) =>
  z.object({ count: z.number().int().nonnegative(), results: z.array(item) });
