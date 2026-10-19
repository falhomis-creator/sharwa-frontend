"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { useLinkedStores } from "@/features/stores-rollup/api";
import { NO_DOMAIN } from "@/features/stores-rollup/schemas";

/**
 * Store switcher (M03 US-03.3.1, M43 US-43.2 / FR-43.01 / FR-43.05). Fed by the SAME
 * `GET /merchant/stores/` contract as «كل متاجري», so the two never disagree. Shown only
 * to an owner whose `MerchantAccount` links more than one store; staff and single-store
 * owners see the store name only (US-03.3.2, US-43.2.2). The current store is marked; a
 * store that is provisioning/inactive or has no primary domain is listed and disabled (§8).
 * Switching is a full navigation to the other store's own host — never a query string
 * (FR-43.06): sessions are per schema.
 *
 * `<details>`: a native disclosure — keyboard and Escape work with no JS.
 */
export function StoreSwitcher({
  storeName,
  protocol,
  port,
}: {
  store: string;
  storeName: string;
  /** From the shell layout (the real request): `window` is not read during render. */
  protocol: "http" | "https";
  port: string | null;
}) {
  const session = useSession();
  const { data } = useLinkedStores();

  const stores = data?.has_account ? data.stores : [];
  if (session.kind !== "merchant" || stores.length < 2) {
    return <span className="truncate text-sm font-medium">{storeName}</span>;
  }

  return (
    <details className="group/switcher relative" data-testid="store-switcher">
      <summary className="flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors marker:content-none hover:bg-muted lg:h-8">
        <span className="truncate">{storeName}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/switcher:rotate-180" strokeWidth={1.75} aria-hidden />
      </summary>
      <div className="absolute start-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-1 text-popover-foreground">
        <ul>
          {stores.map((row) => {
            const current = row.schema === data?.current_schema;
            const noDomain = row.domain === NO_DOMAIN;
            const reachable = row.is_available && !noDomain;
            const href = `${protocol}://${row.domain}${port ? `:${port}` : ""}/dashboard`;
            const content = (
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{row.name}</span>
                  <Mono className="truncate text-xs text-muted-foreground">
                    <bdi>{noDomain ? "بلا نطاق" : row.domain}</bdi>
                  </Mono>
                </span>
                {current ? <Check className="size-4 shrink-0" strokeWidth={1.75} aria-label="المتجر الحالي" /> : null}
                {!row.is_available ? <span className="shrink-0 text-xs text-muted-foreground">غير متاح</span> : null}
              </>
            );
            return (
              <li key={row.schema}>
                {reachable && !current ? (
                  <a href={href} className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted" data-testid="switcher-store">
                    {content}
                  </a>
                ) : (
                  <span
                    aria-disabled={!reachable || undefined}
                    aria-current={current || undefined}
                    className={cn("flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm", current ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                    data-testid="switcher-store"
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-1 border-t border-border pt-1">
          <Link
            href="/dashboard/stores"
            onClick={(e) => e.currentTarget.closest("details")?.removeAttribute("open")}
            className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:min-h-8" data-testid="switcher-all-stores">
            كل متاجري — الأداء والمجاميع
          </Link>
        </div>
      </div>
    </details>
  );
}
