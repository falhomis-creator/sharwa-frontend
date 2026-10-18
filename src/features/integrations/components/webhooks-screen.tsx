"use client";

import { useRouter } from "next/navigation";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DataTable, headerLabel } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { useCreateEndpoint, useEndpoints, usePatchEndpoint } from "@/features/integrations/api";
import { errorMessage, OwnerGate, SectionHeading, StatusText } from "@/features/integrations/components/shared";
import { EndpointForm, EndpointState, SecretDialog } from "@/features/integrations/components/webhook-parts";
import { DELIVERY_STATUS_LABELS, DELIVERY_TONE, type WebhookEndpoint } from "@/features/integrations/schemas";
import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * `/dashboard/settings/webhooks` — M19 US-19.3. Endpoints (URL in Mono LTR, events, state, last
 * delivery, failure streak), «إعادة التفعيل» for auto-disabled ones, a create Sheet whose
 * success shows the secret once.
 */
export function WebhooksScreen() {
  return (
    <OwnerGate what="الـ Webhooks">
      <WebhooksInner />
    </OwnerGate>
  );
}

function ReEnable({ e }: { e: WebhookEndpoint }) {
  const patch = usePatchEndpoint(e.id);
  return (
    <Button
      variant="outline"
      className="h-11 lg:h-8"
      disabled={patch.isPending}
      onClick={async (ev) => {
        ev.stopPropagation();
        try {
          await patch.mutateAsync({ is_active: true });
          toast.success("أُعيد تفعيل نقطة النهاية");
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
      data-testid={`reenable-${e.id}`}
    >
      إعادة التفعيل
    </Button>
  );
}

function LastDelivery({ e }: { e: WebhookEndpoint }) {
  if (!e.last_delivery_at || !e.last_delivery_status) return <span className="text-xs text-muted-foreground">لا تسليم بعد</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <StatusText tone={DELIVERY_TONE[e.last_delivery_status]} className="text-xs">
        {DELIVERY_STATUS_LABELS[e.last_delivery_status]}
      </StatusText>
      <span className="text-xs text-muted-foreground" title={formatDateTime(e.last_delivery_at)}>
        {formatRelative(e.last_delivery_at)}
      </span>
    </span>
  );
}

function WebhooksInner() {
  const router = useRouter();
  const list = useEndpoints();
  const create = useCreateEndpoint();
  const [ui, setUi] = useQueryStates({ new: parseAsBoolean }, { history: "replace" });
  const [secret, setSecret] = useState<string | null>(null);
  const open = (e: WebhookEndpoint) => router.push(`/dashboard/settings/webhooks/${e.id}`);

  const columns = useMemo<ColumnDef<WebhookEndpoint, unknown>[]>(
    () => [
      {
        id: "url",
        header: headerLabel("العنوان"),
        cell: ({ row }) => (
          <span className="flex min-w-0 max-w-64 flex-col gap-0.5">
            <Mono className="truncate text-sm" title={row.original.url}>
              {row.original.url}
            </Mono>
            {row.original.description ? <span className="truncate text-xs text-muted-foreground">{row.original.description}</span> : null}
          </span>
        ),
      },
      { id: "events", meta: { numeric: true }, header: headerLabel("الأحداث"), cell: ({ row }) => <Mono>{row.original.events.length}</Mono> },
      { id: "state", header: headerLabel("الحالة"), cell: ({ row }) => <EndpointState e={row.original} /> },
      { id: "last", header: headerLabel("آخر تسليم"), cell: ({ row }) => <LastDelivery e={row.original} /> },
      { id: "failures", meta: { numeric: true }, header: headerLabel("إخفاقات متتالية"), cell: ({ row }) => <Mono className={row.original.failure_count ? "text-destructive" : "text-muted-foreground"}>{row.original.failure_count}</Mono> },
      { id: "actions", meta: { srOnlyHeader: true }, header: headerLabel("إجراءات"), cell: ({ row }) => (row.original.auto_disabled ? <ReEnable e={row.original} /> : null) },
    ],
    [],
  );

  const addButton = (
    <Button className="h-11 lg:h-9" onClick={() => void setUi({ new: true })} data-testid="new-endpoint">
      إضافة نقطة نهاية
    </Button>
  );

  return (
    <div className="flex flex-col gap-6" data-testid="webhooks-screen">
      <SectionHeading title="Webhooks" description="أرسل أحداث متجرك (الطلبات، الشحن، المخزون) إلى أنظمتك الخاصة فور حدوثها." actions={addButton} />
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(e) => String(e.id)}
        caption="نقاط النهاية"
        total={list.data?.count ?? 0}
        page={1}
        pageSize={50}
        onPageChange={() => undefined}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyState={<EmptyState title="لا نقاط نهاية بعد" description="أضف عنواناً يستقبل أحداث متجرك — مثل نظام المحاسبة أو أداة الأتمتة." action={addButton} />}
        onRowOpen={open}
        renderMobileCard={(e) => (
          <div className="flex flex-col gap-2 p-3" data-testid="endpoint-card">
            <button type="button" onClick={() => open(e)} className="flex min-h-11 flex-col items-start gap-1 text-start">
              <Mono className="max-w-full truncate text-sm">{e.url}</Mono>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <EndpointState e={e} />
                <span>
                  <Mono>{e.events.length}</Mono> أحداث
                </span>
                {e.failure_count ? (
                  <span className="text-destructive">
                    <Mono>{e.failure_count}</Mono> إخفاقات
                  </span>
                ) : null}
              </span>
              <LastDelivery e={e} />
            </button>
            {e.auto_disabled ? <ReEnable e={e} /> : null}
          </div>
        )}
        testId="endpoints-table"
      />
      <p className="text-xs text-muted-foreground">تُعطَّل نقطة النهاية تلقائياً بعد 10 إخفاقات متتالية، ونعيد المحاولة للفاشلة حتى 5 مرات.</p>

      <Sheet open={!!ui.new} onOpenChange={(o) => !o && void setUi({ new: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 shadow-none data-[side=left]:w-full data-[side=left]:sm:max-w-xl" data-testid="endpoint-sheet">
          <SheetTitle className="text-lg">نقطة نهاية جديدة</SheetTitle>
          <SheetDescription className="pb-4">اختر الأحداث التي تريد استقبالها. نعرض لك سرّ التوقيع مرة واحدة بعد الإنشاء.</SheetDescription>
          {ui.new ? (
            <EndpointForm
              submitLabel="إنشاء نقطة النهاية"
              pending={create.isPending}
              onSubmit={async (json) => {
                const res = await create.mutateAsync(json);
                void setUi({ new: null });
                setSecret(res.secret);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </div>
  );
}
