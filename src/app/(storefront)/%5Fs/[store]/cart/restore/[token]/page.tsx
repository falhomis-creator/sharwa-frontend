import { redirect } from "next/navigation";

/** Redirect-only segment: nothing to prerender, so opt out of `instant` validation (Next 16). */
export const instant = false;

/**
 * `/cart/restore/<token>/` — the path Django puts in the abandoned-cart reminder
 * (`reverse('restore_abandoned_cart')`, M11 US-11.5.2). The storefront restores through
 * `/cart?restore=<token>` (`POST /api/v1/cart/restore/`), so the old link keeps working.
 */
export default async function CartRestoreRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/cart?restore=${encodeURIComponent(token)}`);
}
