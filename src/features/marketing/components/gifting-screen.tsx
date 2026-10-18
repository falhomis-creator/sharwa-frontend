"use client";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { useGifting, useSaveGifting } from "@/features/marketing/api";
import { BackToHub, errorMessage, OwnerGate } from "@/features/marketing/components/shared";

/** US-13.7.1 — the gifting switch (`GiftSettings.is_enabled`); the switch saves at once. */
export function GiftingScreen() {
  return (
    <AccessGate feature="gift_settings">
      <OwnerGate description="إعدادات الإهداء مقصورة على مالك المتجر.">
        <Inner />
      </OwnerGate>
    </AccessGate>
  );
}

function Inner() {
  const q = useGifting();
  const save = useSaveGifting();
  return (
    <div className="flex flex-col gap-5" data-testid="gifting-screen">
      <BackToHub />
      <PageHeader title="الإهداء" description="يسمح للعميل عند الدفع بإرسال الطلب كهدية مع رسالة، وتُخفى الأسعار من الفاتورة المطبوعة." />
      {q.isLoading ? <Skeleton className="h-14 w-full max-w-xl" /> : null}
      {q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : null}
      {q.data ? (
        <div className="max-w-xl rounded-lg border border-border px-4">
          <ToggleRow
            id="gift_is_enabled"
            label="تفعيل خيار الإهداء في الدفع"
            description={save.isPending ? "جارٍ الحفظ…" : q.data.is_enabled ? "يظهر للعميل خيار «أرسله كهدية» مع حقل رسالة." : "لا يظهر خيار الإهداء في الدفع."}
            checked={q.data.is_enabled}
            disabled={save.isPending}
            onCheckedChange={(next) => save.mutate({ is_enabled: next }, { onSuccess: () => toast.success(next ? "فُعّل الإهداء" : "أُوقف الإهداء"), onError: (e) => toast.error(errorMessage(e)) })}
            testId="gift_is_enabled"
          />
        </div>
      ) : null}
    </div>
  );
}
