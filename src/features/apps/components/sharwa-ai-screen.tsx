"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { fetchConsoleToken, useAiSettings, useAiStatus, useApp, useSaveAiSettings } from "@/features/apps/api";
import { AI_APP, aiSettingsFormSchema, type AiSettings } from "@/features/apps/schemas";
import { installationState } from "@/features/apps/components/apps-screens";
import { Notice, StatusDot } from "@/features/inbox/components/bits";

/** The external console's origin — the only origin whose `postMessage` is trusted (FR-31.08). */
const CONSOLE_ORIGIN = "https://ai.sharwa.app";

/**
 * `/dashboard/apps/sharwa-ai` (M31 US-31.1, US-31.5): connection status (polled), the two
 * real settings, and the external console opened with a one-time token. The live sessions
 * list is `/dashboard/support/sessions` (the sidebar's path; M31 §6 named
 * `/dashboard/apps/sharwa-ai/sessions`, which redirects there).
 */
export function SharwaAiScreen() {
  return (
    <AccessGate feature="app_marketplace">
      <AiInner />
    </AccessGate>
  );
}

function AiInner() {
  const app = useApp(AI_APP);
  const state = app.data ? installationState(app.data.installation).value : null;
  const usable = state === "active";
  const status = useAiStatus(usable);
  const settings = useAiSettings(usable);
  const { session } = useAccess();
  const owner = session.kind === "merchant";

  // US-31.5 acceptance 2: refresh on a message from the console's own origin only.
  const refetchStatus = status.refetch;
  const refetchSettings = settings.refetch;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== CONSOLE_ORIGIN) return;
      void refetchStatus();
      void refetchSettings();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refetchStatus, refetchSettings]);

  if (app.isLoading) return <Skeleton className="h-72" />;
  if (!app.data) {
    if (isApiError(app.error) && app.error.status === 404) return <EmptyState title="شروة AI غير متاح في الكتالوج حالياً" />;
    return <ErrorState error={app.error} onRetry={() => void app.refetch()} />;
  }
  return (
    <div className="flex flex-col gap-8" data-testid="sharwa-ai">
      <PageHeader
        title="شروة AI"
        description="مساعد يردّ على عملائك ومسوّقيك ويصعّد للموظفين ما يحتاج تدخلاً بشرياً."
        actions={
          usable ? (
            <Link href="/dashboard/support/sessions" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
              الجلسات الحية
            </Link>
          ) : null
        }
      />
      {!usable ? (
        <EmptyState
          title={state === "not_installed" ? "ثبّت شروة AI من متجر التطبيقات" : "شروة AI غير مفعّل"}
          action={
            <Link href={`/dashboard/apps/${AI_APP}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} data-testid="ai-install-link">
              صفحة التطبيق
            </Link>
          }
        />
      ) : (
        <>
          {settings.data && !settings.data.ai_enabled ? <Notice tone="warning" testId="ai-disabled">المساعد معطّل — الجلسات الجديدة تذهب للموظفين مباشرة.</Notice> : null}
          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">حالة الربط</h2>
            {status.data ? (
              status.data.connected ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusDot tone="success" label="مربوط" testId="ai-status" value="connected" />
                  {status.data.connected_at ? (
                    <span className="text-xs text-muted-foreground">
                      منذ <Mono>{formatDateTime(status.data.connected_at)}</Mono>
                    </span>
                  ) : null}
                </span>
              ) : status.data.connecting ? (
                <span className="inline-flex items-center gap-1.5 text-sm" data-testid="ai-status" data-status="connecting">
                  <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-warning motion-reduce:animate-none" />
                  جارٍ الربط…
                </span>
              ) : (
                <span className="flex flex-col gap-1">
                  <StatusDot tone="destructive" label="تعذّر الربط" testId="ai-status" value="error" />
                  {status.data.error ? <span className="text-xs text-destructive">{status.data.error}</span> : null}
                </span>
              )
            ) : (
              <Skeleton className="h-6 w-40" />
            )}
          </section>
          {settings.data ? <SettingsForm key={`${settings.data.ai_enabled}:${settings.data.max_consecutive_bot_replies_override ?? ""}`} data={settings.data} owner={owner} /> : settings.isLoading ? <Skeleton className="h-40" /> : <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />}
          {owner ? <ConsoleButton /> : null}
        </>
      )}
    </div>
  );
}

function SettingsForm({ data, owner }: { data: AiSettings; owner: boolean }) {
  const save = useSaveAiSettings();
  const [enabled, setEnabled] = useState(data.ai_enabled);
  const [max, setMax] = useState(data.max_consecutive_bot_replies_override?.toString() ?? "");
  const [error, setError] = useState<string | undefined>();
  const dirty = enabled !== data.ai_enabled || max !== (data.max_consecutive_bot_replies_override?.toString() ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = aiSettingsFormSchema.safeParse({ ai_enabled: enabled, max_consecutive_bot_replies_override: max });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    try {
      await save.mutateAsync({ ai_enabled: parsed.data.ai_enabled, max_consecutive_bot_replies_override: parsed.data.max_consecutive_bot_replies_override ? Number(parsed.data.max_consecutive_bot_replies_override) : null });
      setError(undefined);
      toast.success("حُفظت إعدادات المساعد.");
    } catch (err) {
      setError(isApiError(err) ? (err.fields?.max_consecutive_bot_replies_override?.[0] ?? err.userMessage) : "تعذّر الحفظ.");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex max-w-xl flex-col gap-2" data-testid="ai-settings">
      <h2 className="text-base font-semibold">الإعدادات</h2>
      <ToggleRow id="ai-enabled" label="تفعيل المساعد" description="حين يتوقف، تصل الجلسات الجديدة إلى الموظفين مباشرة." checked={enabled} onCheckedChange={setEnabled} disabled={!owner} testId="ai-enabled" />
      <Field label="أقصى ردود متتابعة للبوت قبل التصعيد" htmlFor="ai-max" error={error} hint={max ? undefined : "يستخدم افتراضي المنصة"}>
        <input id="ai-max" dir="ltr" inputMode="numeric" className={`${numericInputClass} w-32`} value={max} placeholder={String(data.platform_default_max_replies)} onChange={(e) => setMax(e.target.value)} readOnly={!owner} aria-invalid={Boolean(error)} data-testid="ai-max" />
      </Field>
      {owner ? (
        <Button type="submit" className="h-11 self-start lg:h-9" disabled={!dirty || save.isPending} data-testid="ai-save">
          {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">تعديل الإعدادات لمالك المتجر.</p>
      )}
    </form>
  );
}

function ConsoleButton() {
  const [pending, setPending] = useState(false);
  async function open() {
    const win = window.open("about:blank", "_blank");
    setPending(true);
    try {
      // FR-31.08: the token lives in this closure only — never stored, never rendered.
      const { console_url, token } = await fetchConsoleToken();
      const url = `${console_url}?token=${encodeURIComponent(token)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (e) {
      win?.close();
      toast.error(isApiError(e) ? e.userMessage : "تعذّر فتح وحدة التحكم.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="flex flex-col items-start gap-2">
      <h2 className="text-base font-semibold">وحدة التحكم</h2>
      <p className="max-w-prose text-sm text-muted-foreground">المعرفة والنبرة والأدوات تُدار في وحدة تحكم شروة AI؛ تُفتح في نافذة جديدة برمز دخول قصير العمر.</p>
      <Button variant="outline" className="h-11 lg:h-9" onClick={() => void open()} disabled={pending} data-testid="ai-console">
        <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
        {pending ? "جارٍ الفتح…" : "افتح وحدة تحكم شروة AI"}
      </Button>
    </section>
  );
}
