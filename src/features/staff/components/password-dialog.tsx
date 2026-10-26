"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Ltr } from "@/components/shared/mono";
import { outlineButton, primaryButton } from "@/features/staff/components/bits";

/**
 * The temporary password Django issues on «إضافة موظف» and «كلمة مرور مؤقتة جديدة» (INT-022).
 * Staff sign in with phone + password (`auth/staff/login/`); the value is shown ONCE, exactly
 * like a personal access token (FR-18.07) — closing the dialog drops it from memory.
 */
export function PasswordOnceDialog({ issued, onClose }: { issued: { name: string; password: string } | null; onClose: () => void }) {
  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      toast.success("نُسخت كلمة المرور.");
    } catch {
      toast.error("تعذّر النسخ — حدّد النص وانسخه يدوياً.");
    }
  };

  return (
    <Dialog open={issued !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="password-dialog">
        <DialogTitle>كلمة مرور {issued?.name} المؤقتة</DialogTitle>
        <DialogDescription>أرسلها للموظف الآن — لن تُعرض مرة أخرى بعد إغلاق هذه النافذة. يدخل بها برقم هاتفه من صفحة دخول الموظفين.</DialogDescription>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <Ltr className="min-w-0 flex-1 break-all font-mono text-base tracking-wide" data-testid="password-value">
            {issued?.password}
          </Ltr>
          <button type="button" className={outlineButton} onClick={() => void copy()} aria-label="نسخ كلمة المرور">
            <Copy className="size-4" aria-hidden /> نسخ
          </button>
        </div>
        <DialogFooter>
          <button type="button" className={primaryButton} onClick={onClose} data-testid="password-dialog-done">
            تم
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
