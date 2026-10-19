"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { normalizePhone, prettyPhone } from "@/lib/format";
import { useSendOtp, useVerifyOtp } from "@/features/sharwa-pay/api";
import { payPrimary, paySecondary } from "@/features/sharwa-pay/components/pay-shell";

/**
 * Phone → WhatsApp OTP (US-40.1, FR-40.02): the number is shown in the international form
 * it will be sent to; the code's 10-minute life counts down; a send limit or a verify lock
 * shows the server's sentence with a countdown and disables the control — the limit itself
 * is never revealed. Six digit boxes, `autocomplete="one-time-code"`, auto-advance.
 */
function useCountdown(seconds: number | null) {
  const [left, setLeft] = useState<number | null>(seconds);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the countdown when the server sets a new one
    setLeft(seconds);
    if (seconds === null) return;
    const started = Date.now();
    const t = window.setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setLeft(l);
      if (l === 0) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [seconds]);
  return left;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function PayLogin() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number | null>(null);
  const [sendLock, setSendLock] = useState<number | null>(null);
  const [verifyLock, setVerifyLock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const send = useSendOtp();
  const verify = useVerifyOtp();
  const ttlLeft = useCountdown(ttl);
  const sendLeft = useCountdown(sendLock);
  const verifyLeft = useCountdown(verifyLock);
  const preview = phone.trim().length >= 8 ? normalizePhone(phone) : null;

  async function sendCode(target = phone) {
    setError(null);
    setExpired(false);
    try {
      const r = await send.mutateAsync(target);
      setSentTo(r.phone);
      setTtl(r.expires_in);
      setStep("code");
      setDigits(["", "", "", "", "", ""]);
      window.setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (err) {
      if (isApiError(err) && err.status === 429) setSendLock(err.retryAfter ?? 60);
      setError(isApiError(err) ? (err.fields?.phone?.[0] ?? err.userMessage) : "تعذّر الإرسال.");
    }
  }

  async function submitCode(code: string) {
    if (!sentTo || code.length !== 6) return;
    setError(null);
    try {
      await verify.mutateAsync({ phone: sentTo, code });
    } catch (err) {
      if (!isApiError(err)) return setError("تعذّر التحقق.");
      const body = err.body as { reason?: string } | undefined;
      if (err.status === 429) setVerifyLock(err.retryAfter ?? 300);
      if (body?.reason === "expired") setExpired(true);
      setError(err.detail ?? err.fields?.code?.[0] ?? err.userMessage);
      setDigits(["", "", "", "", "", ""]);
      boxes.current[0]?.focus();
    }
  }

  function onDigit(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (v.length > 1) {
      // Paste or autofill of the whole code.
      const all = v.slice(0, 6).split("");
      const next = ["", "", "", "", "", ""].map((_, k) => all[k] ?? "");
      setDigits(next);
      if (all.length === 6) void submitCode(next.join(""));
      else boxes.current[all.length]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) boxes.current[i + 1]?.focus();
    if (next.every(Boolean)) void submitCode(next.join(""));
  }

  const locked = (verifyLeft ?? 0) > 0;

  if (step === "phone") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        data-testid="pay-login-phone"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">محفظتك في كل متاجر شروة</h1>
          <p className="text-sm text-muted-foreground">ادخل برقم جوالك، وسيصلك رمز التحقق على واتساب.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          رقم الجوال
          <input type="tel" inputMode="tel" dir="ltr" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} h-12 text-start font-mono text-base`} placeholder="07XXXXXXXX" data-testid="pay-phone" />
        </label>
        {preview ? (
          <p className="text-xs text-muted-foreground" data-testid="pay-phone-preview">
            سيُرسل الرمز إلى <bdi className="font-mono text-foreground">{prettyPhone(preview)}</bdi>
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive" data-testid="pay-error">
            {error}
            {(sendLeft ?? 0) > 0 ? <> — حاول بعد <Mono>{mmss(sendLeft!)}</Mono></> : null}
          </p>
        ) : null}
        <button type="submit" className={payPrimary} disabled={send.isPending || (sendLeft ?? 0) > 0 || !phone.trim()} data-testid="pay-send">
          إرسال الرمز
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pay-login-code">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">أدخل الرمز</h1>
        <p className="text-sm text-muted-foreground">
          أُرسل إلى <bdi className="font-mono text-foreground" data-testid="pay-sent-to">{sentTo ? prettyPhone(sentTo) : ""}</bdi> عبر واتساب.
        </p>
      </div>
      <fieldset className="flex flex-col gap-2" disabled={locked || verify.isPending}>
        <legend className="sr-only">رمز التحقق من 6 أرقام</legend>
        {/* Logical order is left→right digits of the code; boxes render LTR so the code reads as typed. */}
        <div dir="ltr" className="grid grid-cols-6 gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={d}
              onChange={(e) => onDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              aria-label={`الرقم ${i + 1}`}
              className={`${inputClass} h-14 text-center font-mono text-xl tabular-nums`}
              data-testid="otp-digit"
            />
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        {ttlLeft && ttlLeft > 0 ? (
          <>
            صلاحية الرمز <Mono className="text-foreground" data-testid="otp-ttl">{mmss(ttlLeft)}</Mono>
          </>
        ) : (
          "انتهت صلاحية الرمز."
        )}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive" data-testid="pay-error">
          {error}
          {locked ? <> — <Mono>{mmss(verifyLeft!)}</Mono></> : null}
        </p>
      ) : null}
      {expired || (ttlLeft !== null && ttlLeft <= 0) ? (
        <button type="button" className={payPrimary} disabled={send.isPending || (sendLeft ?? 0) > 0} onClick={() => sentTo && void sendCode(sentTo)} data-testid="pay-resend">
          إرسال رمز جديد
        </button>
      ) : null}
      <button type="button" className={paySecondary} onClick={() => setStep("phone")}>
        تغيير الرقم
      </button>
    </div>
  );
}
