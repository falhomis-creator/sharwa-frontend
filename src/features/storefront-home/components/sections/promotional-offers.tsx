import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getOffers } from "@/features/storefront/api/catalog";
import type { SectionView } from "@/features/storefront/schemas/config";
import { SectionShell } from "@/features/storefront-home/components/section-shell";

/**
 * `promotional_offers` (M09 §7 `[NEEDS BACKEND]` `GET /api/v1/catalog/offers/`): the store's
 * active `PromotionalOffer`s as text cards — type, name, one line, validity, one link. Hidden
 * when there is none.
 */
const OFFER_LABEL = { discount: "خصم", free_shipping: "شحن مجاني", buy_x_get_y: "اشترِ واحصل" } as const;

export async function PromotionalOffersSection({ view, store, storeHost, timezone }: { view: SectionView; store: string; storeHost: string; timezone: string }) {
  const offers = await getOffers(store, storeHost);
  if (offers.length === 0) return null;
  return (
    <SectionShell id={view.id} title={view.title ?? "العروض"} showOnMobile={view.showOnMobile} testId="section-promotional_offers">
      <ul className="grid gap-[var(--store-grid-gap)] md:grid-cols-3">
        {offers.map((o) => (
          <li key={o.id} className="store-frame flex flex-col gap-2 rounded-lg border-border p-5">
            <span className="text-xs font-medium text-muted-foreground">{OFFER_LABEL[o.offer_type]}</span>
            <p className="store-heading text-lg font-bold leading-snug">{o.name}</p>
            {o.description ? <p className="text-sm leading-7 text-muted-foreground">{o.description}</p> : null}
            <div className="mt-auto flex items-end justify-between gap-3 pt-2 text-sm">
              {o.valid_until ? (
                <span className="text-xs text-muted-foreground">
                  حتى {formatDate(o.valid_until, { timeZone: timezone, dateStyle: "long" })}
                </span>
              ) : (
                <span />
              )}
              {o.link ? (
                <Link href={o.link} className="store-link inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline">
                  {o.cta_text ?? "تسوّق"}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
