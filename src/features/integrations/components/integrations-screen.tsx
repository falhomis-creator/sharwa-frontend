"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { useIntegrationStatuses } from "@/features/integrations/api";
import { SectionHeading, StatusText } from "@/features/integrations/components/shared";
import { INTEGRATION_GROUP_LABELS, INTEGRATION_GROUPS, INTEGRATION_STATUS_LABELS, INTEGRATION_TONE, type IntegrationStatus } from "@/features/integrations/schemas";
import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * `/dashboard/settings/integrations` — M19 US-19.4. One dense list of every inbound integration
 * (no symmetric cards, no coloured logos — constitution I) with its state, last inbound event
 * and a link to the module that manages it. Any member; the server drops rows outside the
 * member's `channels.*` permissions (US-19.4.2). This page never loads a tracking script.
 */
export function IntegrationsScreen() {
  const q = useIntegrationStatuses();
  const session = useSession();
  const { canFeature } = useAccess();
  const owner = session.kind === "merchant";

  return (
    <div className="flex flex-col gap-6" data-testid="integrations-screen">
      <SectionHeading title="التكاملات" description="حالة كل ربط خارجي لمتجرك في مكان واحد. الإدارة تتم من صفحة كل تكامل." />

      {q.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : q.isError || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="لا تكاملات ضمن صلاحياتك" description="تظهر هنا التكاملات المرتبطة بصلاحياتك (المحادثات، الأسواق، الموردون). اطلبها من مالك المتجر." />
      ) : (
        <div className="flex flex-col gap-6" data-testid="integration-groups">
          {INTEGRATION_GROUPS.map((g) => {
            const rows = q.data.filter((r) => r.group === g);
            if (!rows.length) return null;
            return (
              <section key={g} aria-labelledby={`grp-${g}`} className="flex flex-col gap-2">
                <h3 id={`grp-${g}`} className="text-sm font-semibold">
                  {INTEGRATION_GROUP_LABELS[g]}
                </h3>
                <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
                  {rows.map((r) => (
                    <IntegrationRow key={r.code} r={r} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {owner ? (
        <section className="flex flex-col gap-2 border-t border-border pt-5" aria-labelledby="grp-out">
          <h3 id="grp-out" className="text-sm font-semibold">
            الربط الصادر والتتبع
          </h3>
          <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
            <ToolRow href="/dashboard/settings/domains" title="النطاقات" description="نطاقك الخاص وسجلات DNS." />
            <ToolRow href="/dashboard/settings/webhooks" title="Webhooks" description="أرسل أحداث متجرك إلى أنظمتك." />
            {canFeature("tracking_tools") ? <ToolRow href="/dashboard/marketing/tracking" title="أدوات التتبع" description="بكسلات Meta وTikTok وSnapchat وGoogle — تُحمَّل في المتجر فقط." /> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function IntegrationRow({ r }: { r: IntegrationStatus }) {
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4" data-testid={`integration-${r.code}`} data-status={r.available ? r.status : "unavailable"}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{r.name}</span>
          <Mono className="text-xs text-muted-foreground">{r.code}</Mono>
        </span>
        {r.detail && r.available ? <span className="text-xs text-destructive">{r.detail}</span> : null}
      </span>
      <span className="flex items-center justify-between gap-4 sm:justify-end">
        {r.available ? (
          <StatusText tone={INTEGRATION_TONE[r.status]}>{INTEGRATION_STATUS_LABELS[r.status]}</StatusText>
        ) : (
          <StatusText tone="muted">غير متاح في خطتك</StatusText>
        )}
        <span className="w-28 text-xs text-muted-foreground sm:text-end" title={r.last_event_at ? formatDateTime(r.last_event_at) : undefined}>
          {r.last_event_at ? <>آخر حدث {formatRelative(r.last_event_at)}</> : "لا أحداث"}
        </span>
        <Link href={r.manage_href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm underline-offset-4 hover:underline lg:min-h-0" aria-label={`إدارة ${r.name}`} data-testid={`manage-${r.code}`}>
          إدارة
          <ChevronLeft aria-hidden className="size-4 ltr:rotate-180" />
        </Link>
      </span>
    </li>
  );
}

function ToolRow({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center gap-3 p-3 transition-colors hover:bg-muted/50">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </span>
        <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />
      </Link>
    </li>
  );
}
