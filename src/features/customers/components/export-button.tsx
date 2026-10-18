"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mono } from "@/components/shared/mono";
import { apiFetchRaw } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatNumber } from "@/lib/format";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";

const CRITICAL_MESSAGE = "تجاوزت حدّ التصدير اليومي، راجع مدير المتجر.";

/**
 * Monitored export (US-07.4, FR-07.07): rendered only with `customers.export`; a confirm
 * dialog names the audit; the CSV carries the current filters. A `critical`
 * `export_volume` alert (from `/auth/me/` or a 429 answer) disables it with the reason;
 * `warning` still allows it with a reminder.
 */
export function ExportButton({ query, count }: { query: Record<string, string | number | undefined>; count: number | undefined }) {
  const { canPermission } = useAccess();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  if (!canPermission("customers.export")) return null;
  const level = blocked ? "critical" : (session.behavior?.export ?? "none");
  const critical = level === "critical";

  async function run() {
    setPending(true);
    try {
      const res = await apiFetchRaw("/api/bff/customers/export.csv", { query, headers: { accept: "text/csv" } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`صُدِّر ${formatNumber(Number(res.headers.get("x-export-rows") ?? count ?? 0))} عميلاً — سُجِّل في سجل التدقيق`);
      setOpen(false);
    } catch (err) {
      if (isApiError(err) && err.status === 429) {
        setBlocked(true);
        setOpen(false);
        toast.error(err.detail ?? CRITICAL_MESSAGE);
      } else {
        toast.error(isApiError(err) ? err.userMessage : "تعذّر الاتصال");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <span className="flex flex-col items-start gap-1">
        <Button variant="outline" className="h-11 gap-1.5 lg:h-9" disabled={critical} title={critical ? CRITICAL_MESSAGE : undefined} onClick={() => setOpen(true)} data-testid="export-open">
          <Download className="size-4" aria-hidden /> تصدير CSV
        </Button>
        {critical ? (
          <span className="flex items-center gap-1.5 text-xs text-destructive" role="status" data-testid="export-critical">
            <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
            {CRITICAL_MESSAGE}
          </span>
        ) : null}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" data-testid="export-dialog">
          <DialogHeader>
            <DialogTitle>تصدير العملاء</DialogTitle>
            <DialogDescription>يُسجَّل هذا التصدير في سجل التدقيق ويخضع لتنبيهات الحجم.</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            سيُصدَّر <Mono>{count === undefined ? "–" : formatNumber(count)}</Mono> عميلاً بالفلاتر الحالية.
          </p>
          {level === "warning" ? (
            <p className="flex items-center gap-2 text-sm text-warning" data-testid="export-warning">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" />
              اقتربت من حدّ التصدير اليومي.
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button className="h-11 lg:h-9" onClick={() => void run()} disabled={pending} data-testid="export-confirm">
              {pending ? "جارٍ التصدير…" : "تصدير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
