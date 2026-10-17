import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { PLATFORM_TAG } from "@/lib/cache";
import { PublicStatsSchema } from "@/features/landing/schemas/stats";
import { formatNumber } from "@/lib/format";
import { proofStats, type ProofStat } from "@/features/landing/landing.content";

/**
 * Proof bar figures. On any failure the visitor sees the static content values
 * with no error surfaced (FR-01.04) — only a server-side `console.info`.
 */
export async function getProofStats(): Promise<ProofStat[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PLATFORM_TAG);

  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/public/stats/`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const parsed = PublicStatsSchema.safeParse(await res.json());
      if (parsed.success) {
        const [stores, orders, duration] = proofStats;
        return [
          { ...stores!, value: formatNumber(parsed.data.stores), unit: "+" },
          { ...orders!, value: formatNumber(parsed.data.orders_30d), unit: "+" },
          duration!,
        ];
      }
    }
  } catch {
    // fall through to the static values
  }
  console.info("[landing] public stats unavailable — serving static proof figures");
  return proofStats;
}
