"use client";

import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureOffState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useGateways, usePatchStorePayments, useStorePayments } from "@/features/payments/api";
import type { Gateway, StorePayments } from "@/features/payments/schemas";
import { GatewayFormView, GatewayStatus, GatewayToggle } from "@/features/payments/components/gateway-form";
import { PaymentsGate, Section, useIsDesktop } from "@/features/payments/components/shared";

/**
 * `/dashboard/payments` (M14 US-14.1/14.2): the gateways as dense text rows (name, state as
 * text + dot, `is_enabled` switch), the credential form in a `?gateway=` side sheet on
 * desktop and a full page on phones; then the two store switches, saved on toggle with a
 * 5-second «تراجع» (FR-14.05).
 */
const parsers = { gateway: parseAsString };

export function PaymentsOverviewScreen() {
  return (
    <PaymentsGate anyOf={["payment_gateways", "bank_transfers", "local_wallets"]}>
      <Overview />
    </PaymentsGate>
  );
}

function Overview() {
  const { canFeature } = useAccess();
  const [{ gateway }, setParams] = useQueryStates(parsers, { history: "replace" });
  const showAccounts = canFeature("bank_transfers") || canFeature("local_wallets");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="المدفوعات"
        description="البوابات التي يدفع بها عملاؤك، وشروة باي، والتحويل اليدوي إلى حساباتك."
        actions={
          showAccounts ? (
            <Link href="/dashboard/payments/payout-accounts" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              حسابات الاستلام
            </Link>
          ) : null
        }
      />
      {canFeature("payment_gateways") ? <GatewaysSection onOpen={(code) => void setParams({ gateway: code })} /> : <FeatureOffState title="ربط بوابات الدفع غير متاح في خطتك" />}
      <StoreSwitches />
      <Sheet open={gateway !== null} onOpenChange={(o) => !o && void setParams({ gateway: null })}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-lg" data-testid="gateway-sheet">
          <SheetTitle className="sr-only">بيانات اعتماد البوابة</SheetTitle>
          <SheetDescription className="sr-only">نموذج يُبنى من حقول البوابة كما يرسلها الخادم</SheetDescription>
          {gateway ? <GatewayFormView code={gateway} variant="sheet" onDone={() => void setParams({ gateway: null })} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GatewaysSection({ onOpen }: { onOpen: (code: string) => void }) {
  const query = useGateways();
  return (
    <Section title="ربط بوابات الدفع" description="تظهر البوابة المفعّلة للعميل في صفحة الدفع فوراً." testId="gateways">
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState title="لا بوابات متاحة" description="لم تُعرَّف بوابات دفع لمتجرك بعد. تواصل مع دعم شروة." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {query.data.map((g) => (
            <GatewayRow key={g.gateway_code} gateway={g} onOpen={() => onOpen(g.gateway_code)} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function GatewayRow({ gateway, onOpen }: { gateway: Gateway; onOpen: () => void }) {
  const desktop = useIsDesktop();
  const action = gateway.has_credentials ? "تعديل الاعتمادات" : "ربط";
  return (
    <li className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4" data-testid="gateway-row" data-code={gateway.gateway_code}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">{gateway.name}</span>
          <GatewayStatus gateway={gateway} />
        </span>
        {gateway.description ? <span className="text-xs text-muted-foreground">{gateway.description}</span> : null}
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <GatewayToggle gateway={gateway} />
        {desktop ? (
          <Button variant="outline" className="h-11 lg:h-9" onClick={onOpen} data-testid={`gateway-open-${gateway.gateway_code}`}>
            {action}
          </Button>
        ) : (
          <Link
            href={`/dashboard/payments/gateways/${gateway.gateway_code}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1")}
            data-testid={`gateway-open-${gateway.gateway_code}`}
          >
            {action}
            <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
          </Link>
        )}
      </div>
    </li>
  );
}

type SwitchKey = "enable_sharwa_pay" | "enable_manual_payment";
const SWITCH_LABEL: Record<SwitchKey, string> = { enable_sharwa_pay: "شروة باي", enable_manual_payment: "التحويل اليدوي" };

function StoreSwitches() {
  const query = useStorePayments();
  const patch = usePatchStorePayments();
  const { canFeature } = useAccess();

  function toggle(key: SwitchKey, next: boolean, undoable = true) {
    patch.mutate(
      { [key]: next },
      {
        onSuccess: () => {
          if (!undoable) return;
          toast.success(`${next ? "فُعّل" : "أُوقف"} «${SWITCH_LABEL[key]}»`, {
            duration: 5000,
            action: { label: "تراجع", onClick: () => toggle(key, !next, false) },
          });
        },
        onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ."),
      },
    );
  }

  return (
    <Section title="طرق الدفع الأخرى" description="تُحفظ عند التبديل مباشرة، ويمكنك التراجع خلال 5 ثوانٍ." testId="store-switches">
      {query.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : query.error || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SwitchRows data={query.data} busy={patch.isPending} onToggle={toggle} accountsLink={canFeature("bank_transfers") || canFeature("local_wallets")} />
      )}
    </Section>
  );
}

function SwitchRows({ data, busy, onToggle, accountsLink }: { data: StorePayments; busy: boolean; onToggle: (k: SwitchKey, next: boolean) => void; accountsLink: boolean }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border px-3">
      <ToggleRow
        id="enable-sharwa-pay"
        label="قبول شروة باي"
        description="يدفع العميل من رصيد Sharwa Pay برمز OTP؛ يُقيَّد المبلغ في محفظة متجرك."
        checked={data.enable_sharwa_pay}
        onCheckedChange={(v) => onToggle("enable_sharwa_pay", v)}
        disabled={busy}
        testId="switch-sharwa-pay"
      />
      <ToggleRow
        id="enable-manual-payment"
        label="قبول التحويل اليدوي"
        description="يحوّل العميل إلى أحد حساباتك ويرفع الإيصال، ثم تؤكّد الدفع من صفحة الطلب."
        checked={data.enable_manual_payment}
        onCheckedChange={(v) => onToggle("enable_manual_payment", v)}
        disabled={busy}
        testId="switch-manual-payment"
      >
        {data.active_payout_accounts === 0 ? (
          <p role="alert" className="text-sm text-warning" data-testid="manual-no-accounts">
            أضف حساباً بنكياً أو محفظة ليراها العميل — لا يوجد حساب استلام نشط الآن.
            {accountsLink ? (
              <>
                {" "}
                <Link href="/dashboard/payments/payout-accounts" className="text-foreground underline underline-offset-4">
                  إضافة حساب
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            يرى العميل {data.active_payout_accounts} {data.active_payout_accounts === 1 ? "حساباً نشطاً" : "حسابات نشطة"} في صفحة الدفع.{" "}
            {accountsLink ? (
              <Link href="/dashboard/payments/payout-accounts" className="text-foreground underline underline-offset-4">
                إدارة الحسابات
              </Link>
            ) : null}
          </p>
        )}
      </ToggleRow>
    </div>
  );
}
