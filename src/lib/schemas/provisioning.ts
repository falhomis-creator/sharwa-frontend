import { z } from "zod";

/** `GET /register/status/<token>/` (Ready) — data-model §1 ProvisioningStatus. */
export const provisioningStatusSchema = z.object({
  status: z.enum(["pending", "provisioning", "ready", "failed"]),
  store_url: z.string().optional(),
  dashboard_url: z.string().optional(),
  /**
   * With `ready` only: the signed, one-hour proof the first-password screen requires
   * (decision 2026-10-21 — a new store has no password, so it must not open for whoever
   * reaches it first). Travels to the store origin once, as `?setup=` on the redirect.
   */
  setup_token: z.string().optional(),
});
export type ProvisioningStatus = z.infer<typeof provisioningStatusSchema>;

export const resolutionOutcomes = ["ok", "not_found", "inactive", "session_bound_elsewhere", "provisioning"] as const;
export type ResolutionOutcome = (typeof resolutionOutcomes)[number];
