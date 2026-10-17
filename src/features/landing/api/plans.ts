import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { UPSTREAM_ORIGIN } from "@/lib/bff/upstream";
import { PLATFORM_TAG } from "@/lib/cache";
import { PublicPlansResponseSchema, type PublicPlansResponse } from "@/features/landing/schemas/plans";
import { plansMock } from "@/mocks/public/plans";
import { isMocksOn } from "@/mocks/runtime";

/**
 * Public plan list for the pricing section. Platform-scoped (no store), so it
 * is tagged `platform` and cached in hours — the landing page must never wait
 * on Django on a cold request.
 */
export async function getPublicPlans(): Promise<PublicPlansResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(PLATFORM_TAG);

  try {
    const res = await fetch(`${UPSTREAM_ORIGIN}/api/v1/public/plans/`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const parsed = PublicPlansResponseSchema.safeParse(await res.json());
      if (parsed.success) return parsed.data;
      console.info("[landing] public plans payload did not match the contract — using local state");
    }
  } catch {
    console.info("[landing] public plans endpoint unreachable — using local state");
  }

  // [NEEDS BACKEND] `GET /api/v1/public/plans/`. Until then: subscriptions off.
  return isMocksOn() ? plansMock() : { subscriptions_enabled: false, plans: [] };
}
