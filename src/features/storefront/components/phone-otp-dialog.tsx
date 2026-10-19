"use client";

import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatNumber, normalizePhone, prettyPhone } from "@/lib/format";
import { OtpInput } from "@/features/storefront/components/otp-input";

/**
 * Phone → WhatsApp OTP for buyer actions outside checkout (review, wishlist — M10 §10; bids use name + phone, M37: customers
 * have no accounts). Sends through `customers/otp/send` with a purpose, then hands the phone
 * and the code to `onVerified`, which performs the real action (the server verifies the code
 * there). Resend after 60 s with a Mono countdown; 429 → «حاول بعد قليل».
 */
export function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return { left, start: (s = 60) => setLeft(s) };
}

export function PhoneOtpDialog({
  open,
  onOpenChange,
  title,
  description,
  purpose,
  initialPhone,
  confirmLabel,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  purpose: "review" | "wishlist";
  initialPhone?: string | null;
  confirmLabel: string;
  /** Run the action; throw an `ApiError` to show its message (e.g. a wrong code). */
  onVerified: (phone: string, otp: string) => Promise<void>;
}) {
  const id = useId();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown();

  async function send() {
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/api/bff/customers/otp/send", z.unknown(), { method: "POST", json: { phone: normalizePhone(phone), purpose } });
      setStage("code");
      timer.start(60);
    } catch (e) {
      setError(isApiError(e) ? (e.status === 429 ? "حاول بعد قليل." : e.userMessage) : "تعذّر إرسال الرمز.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(otp = code) {
    setError(null);
    setBusy(true);
    try {
      await onVerified(normalizePhone(phone), otp);
      onOpenChange(false);
      setStage("phone");
      setCode("");
    } catch (e) {
      setError(isApiError(e) ? e.userMessage : "تعذّر الإكمال.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="phone-otp-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {stage === "phone" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor={`${id}-phone`} className="text-sm font-medium">
              رقم واتساب
            </label>
            <input
              id={`${id}-phone`}
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="store-frame h-11 w-full rounded-lg border-input bg-background px-3 font-mono text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {phone.trim() ? <p className="text-xs text-muted-foreground" dir="ltr">{prettyPhone(normalizePhone(phone))}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={!phone.trim() || busy}>
              إرسال الرمز عبر واتساب
            </Button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <p className="text-sm text-muted-foreground">
              أرسلنا رمزاً من 6 أرقام إلى <span dir="ltr" className="font-mono">{prettyPhone(normalizePhone(phone))}</span>
            </p>
            <OtpInput idPrefix={`${id}-otp`} value={code} onChange={setCode} onComplete={(v) => void confirm(v)} invalid={Boolean(error)} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={code.length !== 6 || busy}>
              {confirmLabel}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="min-h-11 text-muted-foreground hover:text-foreground" onClick={() => setStage("phone")}>
                تغيير الرقم
              </button>
              {timer.left > 0 ? (
                <span className="text-muted-foreground">
                  إعادة الإرسال بعد <span className="font-mono tabular-nums">{formatNumber(timer.left)}</span> ث
                </span>
              ) : (
                <button type="button" className="min-h-11 store-link" onClick={() => void send()} disabled={busy}>
                  إعادة إرسال الرمز
                </button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
