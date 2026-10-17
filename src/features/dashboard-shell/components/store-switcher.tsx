"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { accountStoresSchema } from "@/features/dashboard-shell/schemas";
import { useSession } from "@/features/dashboard-shell/components/session-context";

/**
 * Store switcher (M03 US-03.3.1). Only for an owner with more than one store; staff never
 * see it (US-03.3.2). A store that is still provisioning is listed and disabled (M03 §8).
 * Hosts are Mono and `dir="ltr"` so a latin domain cannot flip inside the Arabic row.
 *
 * `<details>` rather than a popover primitive: it is a native disclosure — keyboard and
 * Escape work with no JS, and the project has no dropdown primitive yet (M48 brings cmdk).
 */
export function StoreSwitcher({
  store,
  storeName,
  protocol,
  port,
}: {
  store: string;
  storeName: string;
  /** Passed from the shell layout, which reads the real request: `window` is not touched
   *  during render, so the component is safe to server-render. */
  protocol: "http" | "https";
  port: string | null;
}) {
  const session = useSession();
  const { data } = useQuery({
    queryKey: storeKey(store, "account", "stores"),
    queryFn: () => apiFetch("/api/bff/account/stores", accountStoresSchema),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: session.kind === "merchant",
  });

  const stores = data ?? [];
  if (session.kind !== "merchant" || stores.length < 2) {
    return <span className="truncate text-sm font-medium">{storeName}</span>;
  }

  return (
    <details className="group/switcher relative">
      <summary className="flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors marker:content-none hover:bg-muted lg:h-8">
        <span className="truncate">{storeName}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/switcher:rotate-180" strokeWidth={1.75} aria-hidden />
      </summary>
      <ul className="absolute top-full z-50 mt-1 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground">
        {stores.map((row) => {
          const ready = row.provisioning_status === "ready";
          const href = `${protocol}://${row.host}${port ? `:${port}` : ""}/dashboard`;
          const content = (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{row.name}</span>
                <Mono className="truncate text-xs text-muted-foreground">{row.host}</Mono>
              </span>
              {row.is_current ? <Check className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
              {!ready ? <span className="shrink-0 text-xs text-muted-foreground">قيد التجهيز</span> : null}
            </>
          );
          return (
            <li key={row.host}>
              {ready && !row.is_current ? (
                <a
                  href={href}
                  className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {content}
                </a>
              ) : (
                <span
                  aria-disabled={!ready}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm",
                    row.is_current ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
