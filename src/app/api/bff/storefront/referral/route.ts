import { respondMock, storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { recordReferralClick } from "@/mocks/affiliates/state";

/**
 * `POST /api/v1/storefront/referral/` `{code}` → `{recorded}` (Django since INT-034): a visit through an
 * affiliate's `?aff_id=` link (M17 FR-17.03). Django records the `AffiliateClick` and sets the
 * HttpOnly `sharwa_aff` cookie (30 days, forwarded by `forwardResponse`) that the checkout reads to
 * attribute the order — the same rule as the legacy storefront (one click per new code).
 */
export function POST(request: Request) {
  return storefrontAdapter(request, "/api/v1/storefront/referral/", async ({ store, body }) => {
    const { fields } = await body();
    return respondMock({ ok: true, data: { recorded: recordReferralClick(store, fields.code) } }, 60);
  });
}
