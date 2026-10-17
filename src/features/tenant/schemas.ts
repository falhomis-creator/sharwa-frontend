import { z } from "zod";
import {
  provisioningStatusSchema,
  resolutionOutcomes,
  type ProvisioningStatus,
  type ResolutionOutcome,
} from "@/lib/schemas/provisioning";
import { storeConfigSchema, type StoreConfig } from "@/lib/schemas/store-config";

/**
 * M47 contracts. The shapes themselves are cross-cutting (`src/lib/schemas/`) because
 * the storefront, the dashboard and the onboarding wait page all read them; this file
 * is the module's single import surface.
 */
export { provisioningStatusSchema, resolutionOutcomes, storeConfigSchema };
export type { ProvisioningStatus, ResolutionOutcome, StoreConfig };

export const resolutionOutcomeSchema = z.enum(resolutionOutcomes);

/** The one probe a store-origin layout performs before it renders anything. */
export interface StoreProbe {
  outcome: ResolutionOutcome;
  /** Present on `ok`, and on `session_bound_elsewhere` (the cookie-less retry succeeded). */
  config?: StoreConfig;
  /** Seconds from the upstream `Retry-After` header on 503. */
  retryAfter?: number;
  /** Short-lived provisioning token to poll with, when the fixture/upstream offered one. */
  token?: string;
  isMock: boolean;
}

/** Maps an outcome to the error route the store origin redirects to (see `src/proxy.ts`). */
export const TENANT_ERROR_PATH = {
  not_found: "/_tenant/not-found",
  inactive: "/_tenant/inactive",
  provisioning: "/_tenant/provisioning",
} as const;
