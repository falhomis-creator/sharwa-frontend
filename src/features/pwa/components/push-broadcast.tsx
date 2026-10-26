"use client";

import { BellRingIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { usePushStats, useSendTestPush } from "@/features/pwa/api";
import { PUSH_BODY_MAX, PUSH_TITLE_MAX } from "@/features/pwa/schemas";

/**
 * «إشعارات المتصفح» (M44 US-44.5, INT-016) on the reports index — the JSON successor of
 * Django's HTML «أرسل إشعار تجريبي». Everyone who opens reports sees the subscriber count;
 * only the OWNER can broadcast (it reaches every subscribed buyer). With 0 subscribers the
 * form is disabled with the server's own sentence. Field errors come back from the server.
 */
export function PushBroadcastCard() {
  const { session } = useAccess();
  const stats = usePushStats();
  const send = useSendTestPush();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const owner = session.kind === "merchant";
  const count = stats.data?.active_subscribers ?? 0;
  const empty = stats.isSuccess && count === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!title.trim()) local.title = "أدخل عنوان الإشعار.";
    if (!body.trim()) local.body = "أدخل نص الإشعار.";
    setErrors(local);
    if (Object.keys(local).length) return;
    send.mutate(
      { title: title.trim(), body: body.trim() },
      {
        onSuccess: (r) => {
          toast.success(`أُدرج الإشعار للإرسال إلى ${r.queued_for} مشترك.`);
          setTitle("");
          setBody("");
        },
        onError: (err) => {
          if (isApiError(err) && err.fields && !err.detail) {
            setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
            return;
          }
          toast.error(isApiError(err) ? err.userMessage : "تعذّر إرسال الإشعار.");
        },
      },
    );
  }

  return (
    <section aria-labelledby="push-card-title" className="grid gap-2 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6" data-testid="push-broadcast">
      <h2 id="push-card-title" className="pt-2 text-sm font-medium text-muted-foreground">
        إشعارات المتصفح
      </h2>
      <div className="surface-card flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <BellRingIcon aria-hidden className="size-5 text-muted-foreground" />
          {stats.isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : stats.isError ? (
            <p className="text-sm text-muted-foreground">تعذّر جلب عدد المشتركين.</p>
          ) : (
            <p className="text-sm">
              <span className="font-semibold tabular-nums" data-testid="push-subscribers">
                {count}
              </span>{" "}
              مشترك نشط في إشعارات المتصفح
            </p>
          )}
        </div>
        {empty ? <p className="text-sm text-muted-foreground">لا يوجد مشتركون نشطون لإشعارات المتصفح بعد.</p> : null}
        {owner ? (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="push-title">عنوان الإشعار</Label>
              <Input
                id="push-title"
                value={title}
                maxLength={PUSH_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? "push-title-error" : undefined}
                disabled={empty}
              />
              {errors.title ? (
                <p id="push-title-error" className="text-sm text-destructive">
                  {errors.title}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="push-body">نص الإشعار</Label>
              <Textarea
                id="push-body"
                rows={2}
                value={body}
                maxLength={PUSH_BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={errors.body ? "push-body-error" : undefined}
                disabled={empty}
              />
              {errors.body ? (
                <p id="push-body-error" className="text-sm text-destructive">
                  {errors.body}
                </p>
              ) : null}
            </div>
            <div>
              <Button type="submit" variant="outline" className="h-11 lg:h-9" disabled={empty || send.isPending || !stats.isSuccess} data-testid="push-send">
                {send.isPending ? "جارٍ الإرسال…" : "أرسل إشعاراً تجريبياً لكل المشتركين"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
