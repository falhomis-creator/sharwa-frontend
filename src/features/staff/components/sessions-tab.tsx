"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ForbiddenState } from "@/components/shared/access-gate";
import { Field, inputClass } from "@/components/shared/field";
import { Ltr, Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import type { StaffMember } from "@/features/staff/schemas";
import { useDevices, useStaffSessions, useStaffWrites, useTokens } from "@/features/staff/api";
import { dangerButton, outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * «الجلسات والأجهزة» (FR-18.08, US-18.4): active sessions with end / end-all, personal
 * tokens (the value is shown ONCE, in the create dialog, and never again), trusted devices.
 */
export function SessionsTab({ staff }: { staff: StaffMember }) {
  const { canPermission } = useAccess();
  const canView = canPermission("staff.view_sessions");
  const canManage = canPermission("staff.manage") && staff.status !== "terminated";
  const sessions = useStaffSessions(staff.id, canView);
  const tokens = useTokens(staff.id, canView);
  const devices = useDevices(staff.id, canView);
  const writes = useStaffWrites();
  const [now] = useState(() => new Date());
  const [tokenName, setTokenName] = useState("");
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);

  if (!canView) return <ForbiddenState title="عرض الجلسات يحتاج صلاحية «عرض الجلسات»" />;

  const fail = (e: unknown) => toast.error(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء.");

  const createToken = async () => {
    try {
      const t = await writes.createToken.mutateAsync({ id: staff.id, name: tokenName.trim() || "رمز شخصي" });
      setCreated({ name: t.name, token: t.token });
      setTokenName("");
    } catch (e) {
      fail(e);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      toast.success("نُسخ الرمز.");
    } catch {
      toast.error("تعذّر النسخ — حدّد النص وانسخه يدوياً.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="sess-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="sess-heading" className="text-base font-medium">
            الجلسات النشطة <Mono className="text-sm text-muted-foreground">{sessions.data?.length ?? ""}</Mono>
          </h2>
          <button type="button" className={dangerButton} disabled={!canManage || !sessions.data?.length || writes.endSession.isPending} onClick={() => void writes.endSession.mutateAsync({ id: staff.id, sid: null }).then(() => toast.success("أُنهيت كل الجلسات."), fail)} data-testid="end-all-sessions">
            إنهاء كل الجلسات
          </button>
        </div>
        {sessions.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : sessions.error ? (
          <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
        ) : sessions.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا جلسات نشطة.</p>
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="sessions-list">
            {sessions.data.map((s) => (
              <li key={s.id} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {s.device}
                    {s.is_current ? <span className="ms-2 text-xs text-success">الجلسة الحالية</span> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Ltr className="font-mono">{s.ip}</Ltr> · آخر نشاط {formatRelative(s.last_activity_at, now)}
                  </span>
                </div>
                <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 lg:h-8" disabled={!canManage} onClick={() => void writes.endSession.mutateAsync({ id: staff.id, sid: s.id }).then(() => toast.success("أُنهيت الجلسة."), fail)}>
                  إنهاء
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tok-heading" className="flex flex-col gap-3">
        <h2 id="tok-heading" className="text-base font-medium">
          الرموز الشخصية
        </h2>
        <p className="text-sm text-muted-foreground">للتكاملات وتطبيقات نقاط البيع. تظهر قيمة الرمز مرة واحدة عند إنشائه فقط.</p>
        {tokens.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : tokens.error ? (
          <ErrorState error={tokens.error} onRetry={() => void tokens.refetch()} />
        ) : tokens.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا رموز.</p>
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="tokens-list">
            {tokens.data.map((t) => (
              <li key={t.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    أُنشئ {formatDateTime(t.created_at)} · {t.last_used_at ? `آخر استخدام ${formatRelative(t.last_used_at, now)}` : "لم يُستخدم"}
                  </span>
                </div>
                <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 lg:h-8" disabled={!canManage} onClick={() => void writes.revokeToken.mutateAsync({ id: staff.id, tid: t.id }).then(() => toast.success("أُبطل الرمز."), fail)}>
                  إبطال
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void createToken();
          }}
        >
          <Field label="اسم الرمز" htmlFor="token-name" className="flex-1">
            <input id="token-name" className={inputClass} value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="مثال: جهاز الكاشير 2" disabled={!canManage} />
          </Field>
          <button type="submit" className={primaryButton} disabled={!canManage || writes.createToken.isPending} title={canManage ? undefined : "تحتاج صلاحية إدارة الموظفين"} data-testid="create-token">
            إنشاء رمز
          </button>
        </form>
      </section>

      <section aria-labelledby="dev-heading" className="flex flex-col gap-3">
        <h2 id="dev-heading" className="text-base font-medium">
          الأجهزة الموثوقة
        </h2>
        {devices.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : devices.error ? (
          <ErrorState error={devices.error} onRetry={() => void devices.refetch()} />
        ) : devices.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا أجهزة موثوقة — سيُطلب رمز التحقق في كل دخول.</p>
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="devices-list">
            {devices.data.map((d) => (
              <li key={d.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{d.label}</span>
                  <span className="text-xs text-muted-foreground">
                    وُثّق {formatDateTime(d.trusted_at)} · آخر ظهور {formatRelative(d.last_seen_at, now)}
                  </span>
                </div>
                <button type="button" className="h-11 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 lg:h-8" disabled={!canManage} onClick={() => void writes.removeDevice.mutateAsync({ id: staff.id, did: d.id }).then(() => toast.success("أُزيل الجهاز."), fail)}>
                  إزالة
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={created !== null} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent className="sm:max-w-md" data-testid="token-dialog">
          <DialogTitle>الرمز «{created?.name}»</DialogTitle>
          <DialogDescription>انسخه الآن — لن يُعرض مرة أخرى بعد إغلاق هذه النافذة.</DialogDescription>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <Ltr className="min-w-0 flex-1 break-all font-mono text-sm" data-testid="token-value">
              {created?.token}
            </Ltr>
            <button type="button" className={outlineButton} onClick={() => void copy()} aria-label="نسخ الرمز">
              <Copy className="size-4" aria-hidden /> نسخ
            </button>
          </div>
          <DialogFooter>
            <button type="button" className={primaryButton} onClick={() => setCreated(null)}>
              تم
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
