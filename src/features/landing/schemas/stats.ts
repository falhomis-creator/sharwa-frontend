import { z } from "zod";

/** `GET /api/v1/public/stats/` — [NEEDS BACKEND], mocked until it ships. */
export const PublicStatsSchema = z.object({
  stores: z.number(),
  orders_30d: z.number(),
});

export type PublicStats = z.infer<typeof PublicStatsSchema>;
