import { z } from "zod";

/** `GET /register/status/<token>/` (Ready) — data-model §1 ProvisioningStatus. */
export const provisioningStatusSchema = z.object({
  status: z.enum(["pending", "provisioning", "ready", "failed"]),
  store_url: z.string().optional(),
  dashboard_url: z.string().optional(),
});
export type ProvisioningStatus = z.infer<typeof provisioningStatusSchema>;

export const resolutionOutcomes = ["ok", "not_found", "inactive", "session_bound_elsewhere", "provisioning"] as const;
export type ResolutionOutcome = (typeof resolutionOutcomes)[number];
