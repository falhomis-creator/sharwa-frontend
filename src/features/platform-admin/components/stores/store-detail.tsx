"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isApiError } from "@/lib/api-error";
import { useReprovision, useSharwaShip, useStore } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError, toastResult } from "@/features/platform-admin/components/bits";
import { ActiveCell, ProvisioningCell } from "@/features/platform-admin/components/store-cells";
import { SharwaShipCell } from "@/features/platform-admin/components/stores/store-bits";
import { ActionsTab, AppsTab, DomainsTab, SubscriptionTab } from "@/features/platform-admin/components/stores/detail-tabs";
import { FeaturesTab } from "@/features/platform-admin/components/stores/features-tab";
import { DeactivationTab } from "@/features/platform-admin/components/stores/deactivation-tab";

/**
 * `console.<base>/stores/<schema>` (M20 US-20.2 a3/a5, US-20.7 a2). Header actions:
 * re-provision (failed/stalled only) and Sharwa Ship on/off — both confirmed, both polled
 * every 3s while the Celery job runs. Tabs live in `?tab=`.
 */
const TABS = [
  ["subscription", "الاشتراك"],
  ["domains", "النطاقات"],
  ["features", "الميزات"],
  ["apps", "التطبيقات"],
  ["deactivation", "التعطيل"],
  ["actions", "الإجراءات"],
] as const;
type Tab = (typeof TABS)[number][0];

export function StoreDetailScreen({ schema }: { schema: string }) {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS.map((t) => t[0])).withDefault("subscription").withOptions({ history: "replace" }));
  const [polling, setPolling] = useState(false);
  const q = useStore(schema, { refetchInterval: polling ? 3000 : false });
  const s = q.data;
  const busy = Boolean(s && (s.provisioning_status === "provisioning" || s.sharwa_ship === "activating" || s.sharwa_ship === "deactivating"));
  if (busy !== polling) setPolling(busy);
  const canStores = useCanWrite("stores");
  const [confirm, setConfirm] = useState<null | "reprovision" | "ship">(null);
  const reprovision = useReprovision();
  const ship = useSharwaShip(schema);

  if (q.error) {
    const notFound = isApiError(q.error) && q.error.status === 404;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorState error={q.error} title={notFound ? "متجر غير معروف" : undefined} onRetry={notFound ? undefined : () => void q.refetch()} />
      </div>
    );
  }
  if (!s) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <BackLink />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const reprovisionable = s.provisioning_status === "failed" || s.is_stalled;
  const shipPending = s.sharwa_ship === "activating" || s.sharwa_ship === "deactivating";
  const shipTarget = s.sharwa_ship !== "active";

  async function runReprovision() {
    try {
      const res = await reprovision.mutateAsync([schema]);
      const r = res.results[0];
      if (r && !r.queued) toastError(null, r.reason ?? res.detail);
      else toastResult({ detail: res.detail });
      setConfirm(null);
      void q.refetch();
    } catch (err) {
      toastError(err);
    }
  }

  async function runShip() {
    try {
      const res = await ship.mutateAsync(shipTarget);
      toastResult({ detail: res.detail });
      setConfirm(null);
    } catch (err) {
      toastError(err);
      setConfirm(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Code className="self-start text-muted-foreground">{s.schema_name}</Code>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" data-testid="store-name">
            {s.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <ProvisioningCell row={s} />
            <ActiveCell row={s} />
            <SharwaShipCell state={s.sharwa_ship} />
            <span className="text-xs text-muted-foreground">
              أُنشئ <time dateTime={s.created_on}>{formatDateTime(s.created_on)}</time>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              النطاق الأساسي:{" "}
              <a href={`//${s.primary_domain}`} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                <Code>{s.primary_domain}</Code>
              </a>
            </span>
            {s.merchant_phone ? (
              <span>
                هاتف التاجر: <Code>{s.merchant_phone}</Code>
              </span>
            ) : (
              <span>بلا هاتف تاجر</span>
            )}
            <span>الباقة: {s.current_plan?.name ?? "بلا باقة"}</span>
          </div>
          {s.provisioning_error ? (
            <p className="text-sm text-destructive" data-testid="provisioning-error">
              {s.provisioning_error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11 lg:h-8"
              disabled={!canStores || !reprovisionable}
              title={!reprovisionable ? "المتجر ليس فاشلاً ولا متعثّراً." : undefined}
              onClick={() => setConfirm("reprovision")}
              data-testid="action-reprovision"
            >
              إعادة التجهيز
            </Button>
            <Button
              variant="outline"
              className="h-11 lg:h-8"
              disabled={!canStores || shipPending || s.provisioning_status !== "ready"}
              onClick={() => setConfirm("ship")}
              data-testid="action-sharwa-ship"
            >
              {shipPending ? (s.sharwa_ship === "activating" ? "قيد التفعيل…" : "قيد الإلغاء…") : shipTarget ? "تفعيل شروة شيب" : "إلغاء شروة شيب"}
            </Button>
          </div>
          {!reprovisionable && canStores ? <p className="text-xs text-muted-foreground">إعادة التجهيز للمتاجر الفاشلة أو المتعثّرة فقط.</p> : null}
          {!canStores ? <ReadOnlyNote /> : null}
          {polling ? (
            <span role="status">
              <StatusText tone="info">قيد المعالجة — يتحدّث كل 3 ثوانٍ</StatusText>
            </span>
          ) : null}
        </div>
      </header>

      <nav aria-label="أقسام المتجر" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-testid={`tab-${key}`}
            onClick={() => void setTab(key)}
            className={cn(
              "-mb-px flex h-11 shrink-0 items-center border-b-2 px-3 text-sm transition-colors lg:h-9",
              tab === key ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {key === "features" && s.override_count > 0 ? <span className="ms-1.5 font-mono text-xs text-muted-foreground">{s.override_count}</span> : null}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        <TabBody tab={tab} detail={s} />
      </div>

      <ConfirmDialog
        open={confirm === "reprovision"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`إعادة تجهيز «${s.name}»`}
        impact={
          <>
            تُرسَل مهمة <Code>provision_tenant_schema</Code> للمخطط <Code>{s.schema_name}</Code> من جديد؛ يبقى المتجر «قيد التجهيز» حتى تنتهي.
          </>
        }
        confirmLabel="أرسل المهمة"
        pending={reprovision.isPending}
        onConfirm={() => void runReprovision()}
      />
      <ConfirmDialog
        open={confirm === "ship"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={shipTarget ? `تفعيل شروة شيب لـ«${s.name}»` : `إلغاء شروة شيب لـ«${s.name}»`}
        impact={
          shipTarget
            ? "تُستدعى activate_sharwa_ship_task: يظهر شحن شروة شيب في دفع المتجر بأسعار المناطق النشطة."
            : "يختفي شحن شروة شيب من دفع المتجر؛ الشحنات القائمة تُكمل مسارها."
        }
        destructive={!shipTarget}
        confirmLabel={shipTarget ? "فعّل" : "ألغِ التفعيل"}
        pending={ship.isPending}
        onConfirm={() => void runShip()}
      />
    </div>
  );
}

function TabBody({ tab, detail }: { tab: Tab; detail: NonNullable<ReturnType<typeof useStore>["data"]> }) {
  switch (tab) {
    case "subscription":
      return <SubscriptionTab detail={detail} />;
    case "domains":
      return <DomainsTab detail={detail} />;
    case "features":
      return <FeaturesTab schema={detail.schema_name} storeName={detail.name} />;
    case "apps":
      return <AppsTab detail={detail} />;
    case "deactivation":
      return <DeactivationTab schema={detail.schema_name} storeName={detail.name} />;
    case "actions":
      return <ActionsTab detail={detail} />;
  }
}

function BackLink() {
  return (
    <Link href="/stores" className="inline-flex h-11 items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
      <ArrowLeft className="size-4 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
      كل المتاجر
    </Link>
  );
}
