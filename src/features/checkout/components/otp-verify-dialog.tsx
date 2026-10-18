"use client";

import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatNumber, normalizePhone, prettyPhone } from "@/lib/format";
import { CodVerifySchema } from "@/features/checkout/schemas";
import { OtpInput } from "@/features/storefront/components/otp-input";
import { useCountdown } from "@/features/storefront/components/phone-otp-dialog";

/**
 * Checkout OTP dialog — COD, wallet, Sharwa Pay, loyalty (M12 FR-12.06): the shared 6-digit
 * Mono input, resend after 60 s, the server's message on error, 429 → «حاول بعد قليل». It
 * sends the code when it opens; COD is verified here (`cod-otp/verify` also says whether COD
 * is allowed for the number), the others hand the code to the caller, which sends it with the
 * order (`wallet_otp`, `sharwa_pay_otp`) and the server verifies it there.
 */
export type OtpPurpose = "cod" | "wallet" | "sharwa_pay" | "loyalty";

const SEND: Record<OtpPurpose, string> = {
  cod: "/api/bff/checkout/cod-otp/send",
  wallet: "/api/bff/wallet/otp/send",
  sharwa_pay: "/api/bff/checkout/sharwa-pay/otp/send",
  loyalty: "/api/bff/loyalty/otp/send",
};

const TITLES: Record<OtpPurpose, string> = {
  cod: "تأكيد الطلب برمز واتساب",
  wallet: "تأكيد استخدام المحفظة",
  sharwa_pay: "الدفع بشروة باي",
  loyalty: "استبدال نقاط الولاء",
};

export function OtpVerifyDialog({
  open,
  onOpenChange,
  purpose,
  phone,
  onVerified,
  onInfo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  purpose: OtpPurpose;
  phone: string;
  onVerified: (otp: string) => void;
  /** Extra data the send call returned (Sharwa Pay's balance). */
  onInfo?: (info: Record<string, unknown>) => void;
}) {
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const timer = useCountdown();
  const normalized = normalizePhone(phone);

  async function send() {
    setError(null);
    try {
      const info = await apiFetch(SEND[purpose], z.record(z.string(), z.unknown()), { method: "POST", json: { phone: normalized } });
      onInfo?.(info);
      setSent(true);
      timer.start(60);
    } catch (e) {
      setError(isApiError(e) ? (e.status === 429 ? "حاول بعد قليل." : e.userMessage) : "تعذّر إرسال الرمز.");
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void send(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once per opening
  }, [open]);

  async function verify(otp = code) {
    setBusy(true);
    setError(null);
    try {
      if (purpose === "cod") {
        const res = await apiFetch("/api/bff/checkout/cod-otp/verify", CodVerifySchema, { method: "POST", json: { phone: normalized, otp } });
        if (!res.cod_allowed) {
          setError(res.reason ?? "الدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى.");
          return;
        }
      } else if (purpose === "loyalty") {
        await apiFetch("/api/bff/loyalty/redeem", z.unknown(), { method: "POST", json: { phone: normalized, otp } });
      }
      onVerified(otp);
      onOpenChange(false);
      setCode("");
    } catch (e) {
      setError(isApiError(e) ? (e.status === 429 ? "حاول بعد قليل." : e.userMessage) : "تعذّر التحقق.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={`otp-dialog-${purpose}`}>
        <DialogHeader>
          <DialogTitle>{TITLES[purpose]}</DialogTitle>
          <DialogDescription>
            {sent ? (
              <>
                أرسلنا رمزاً من 6 أرقام عبر واتساب إلى <span dir="ltr" className="font-mono">{prettyPhone(normalized)}</span>
              </>
            ) : (
              "نرسل رمز التأكيد…"
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <OtpInput idPrefix={`${id}-otp`} value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={Boolean(error)} />
          {error ? (
            <p className="text-sm text-destructive" data-testid="otp-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full" disabled={code.length !== 6 || busy}>
            تأكيد
          </Button>
          <div className="text-sm">
            {timer.left > 0 ? (
              <span className="text-muted-foreground">
                إعادة الإرسال بعد <span className="font-mono tabular-nums">{formatNumber(timer.left)}</span> ث
              </span>
            ) : (
              <button type="button" className="min-h-11 store-link" onClick={() => void send()}>
                إعادة إرسال الرمز
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
