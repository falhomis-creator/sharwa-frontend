"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { isApiError, type ApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormError } from "@/features/dashboard-shell/components/auth/form-error";
import { writeStoredStatus } from "@/features/onboarding/handoff";
import { OTP_LENGTH, resendResponseSchema, verifyResponseSchema } from "@/features/onboarding/schemas";
import { messages, verify as copy } from "@/features/onboarding/onboarding.content";
import { useOnboardingHydrated, useOnboardingStore, type DraftErrors, type OtpSession } from "@/stores/onboarding";

const DRAFT_FIELDS = ["store_name", "merchant_phone", "subdomain", "interested_categories", "agree_terms"] as const;
const EMPTY = Array.from({ length: OTP_LENGTH }, () => "");

/** Wall clock that ticks once a second; `null` until mounted (server and first render agree). */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

/** Epoch ms `seconds` from now. Only ever called from event handlers. */
function deadline(seconds: number): number {
  return Date.now() + seconds * 1000;
}

function secondsUntil(epochMs: number, now: number | null): number {
  return now === null ? 0 : Math.max(0, Math.ceil((epochMs - now) / 1000));
}

function clock(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

/**
 * Panel 02 (US-02.3, FR-02.06): six numeric cells in an LTR row, a Mono TTL countdown
 * derived from the server's `ttl_seconds`, resend gated by `Retry-After`.
 *
 * - The sixth digit submits by itself; a pasted six-digit code is spread across the cells.
 * - 400 → «الرمز غير صحيح» and the cells clear · 410 → expired state · 429 → locked for
 *   `Retry-After` · a uniqueness rejection sends the merchant back to panel 01 with the
 *   message on its field and every other value kept (US-02.3.4).
 * - Success: the status token goes to localStorage (FR-02.09), the personal draft is
 *   dropped, and the only thing in the next URL is the token (FR-02.10).
 */
export function OtpForm() {
  const router = useRouter();
  const hydrated = useOnboardingHydrated();
  const otp = useOnboardingStore((s) => s.otp);
  const verifiedToken = useOnboardingStore((s) => s.verifiedToken);

  // No OTP session: after a successful verify the status page is the way forward (also on
  // a later revisit of this URL); otherwise (direct visit, tab session ended) panel 01.
  // Deferred one task: child effects run before the App Router's own mount effect, so a
  // replace in the very first commit hits «Router action dispatched before initialization».
  useEffect(() => {
    if (!hydrated || otp) return;
    const timer = window.setTimeout(() => {
      router.replace(verifiedToken ? `/register/status/${encodeURIComponent(verifiedToken)}` : "/register");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, otp, verifiedToken, router]);

  if (!hydrated || !otp) {
    return (
      <div className="flex flex-col gap-1.5" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
      </div>
    );
  }

  // Keyed by session: Next keeps this route mounted-but-hidden between navigations
  // (Activity), which is right for back/forward but must not carry a lockout, an expired
  // flag or typed digits into a NEW registration.
  return <OtpPanel key={otp.otp_token} otp={otp} />;
}

function OtpPanel({ otp }: { otp: OtpSession }) {
  const draft = useOnboardingStore((s) => s.draft);
  const renewOtp = useOnboardingStore((s) => s.renewOtp);
  const returnToDetails = useOnboardingStore((s) => s.returnToDetails);
  const finish = useOnboardingStore((s) => s.finish);
  const router = useRouter();

  const now = useNow();
  const cells = useRef<Array<HTMLInputElement | null>>([]);
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [codeError, setCodeError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [networkFailed, setNetworkFailed] = useState(false);
  const [serverExpired, setServerExpired] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [resendLockedUntil, setResendLockedUntil] = useState(0);

  const remaining = secondsUntil(otp.expires_at, now);
  const expired = serverExpired || (now !== null && remaining === 0);
  const locked = secondsUntil(lockedUntil, now);
  const resendLocked = secondsUntil(resendLockedUntil, now);
  const code = digits.join("");

  function focusCell(index: number) {
    cells.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  }

  function clearCells() {
    setDigits(EMPTY);
    window.setTimeout(() => focusCell(0), 0);
  }

  async function submit(value: string) {
    if (busy || value.length !== OTP_LENGTH) return;
    setBusy("verify");
    setCodeError("");
    setFormError("");
    setNotice("");
    setNetworkFailed(false);
    try {
      const result = await apiFetch("/api/bff/public/register/verify-otp", verifyResponseSchema, {
        json: { otp_token: otp.otp_token, code: value },
      });
      writeStoredStatus({ token: result.status_token, store_name: draft?.store_name, masked_phone: otp.masked_phone });
      // Drops the personal draft; `OtpForm` then moves on to the status page.
      finish(result.status_token);
    } catch (error) {
      setBusy(null);
      if (!isApiError(error)) {
        setNetworkFailed(true);
        return;
      }
      handleVerifyError(error);
    }
  }

  function handleVerifyError(error: ApiError) {
    if (error.status === 429) {
      setLockedUntil(deadline(error.retryAfter ?? 60));
      clearCells();
      return;
    }
    if (error.status === 410) {
      setServerExpired(true);
      return;
    }
    const draftErrors: DraftErrors = {};
    for (const field of DRAFT_FIELDS) {
      const message = error.fields?.[field]?.[0];
      if (message) draftErrors[field] = message;
    }
    if (Object.keys(draftErrors).length > 0) {
      returnToDetails(draftErrors);
      router.replace("/register");
      return;
    }
    if (error.fields?.code?.[0]) {
      setCodeError(error.fields.code[0]);
      clearCells();
      return;
    }
    setFormError(error.userMessage);
  }

  async function resend() {
    if (busy) return;
    setBusy("resend");
    setFormError("");
    setCodeError("");
    setNotice("");
    setNetworkFailed(false);
    try {
      const result = await apiFetch("/api/bff/public/register/resend-otp", resendResponseSchema, {
        json: { otp_token: otp.otp_token },
      });
      renewOtp(result.ttl_seconds);
      setServerExpired(false);
      setNotice(copy.resent);
      clearCells();
    } catch (error) {
      if (!isApiError(error)) setNetworkFailed(true);
      else if (error.status === 429) setResendLockedUntil(deadline(error.retryAfter ?? 30));
      else if (error.status === 410) {
        // INT-004: Django keeps the pending registration 30 minutes; past that the token is
        // gone and no resend can revive it. Panel 01 keeps every value, so one press of
        // «متابعة» issues a fresh code — the expired panel has no other way forward.
        returnToDetails({});
        router.replace("/register");
      } else setFormError(error.userMessage);
    } finally {
      setBusy(null);
    }
  }

  function update(index: number, raw: string) {
    const typed = toWesternDigits(raw).replace(/\D/g, "");
    const next = [...digits];
    if (typed.length === 0) {
      next[index] = "";
      setDigits(next);
      return;
    }
    // One digit, or several at once (OS one-time-code autofill into the first cell).
    for (let i = 0; i < typed.length && index + i < OTP_LENGTH; i++) next[index + i] = typed[i]!;
    setDigits(next);
    setCodeError("");
    const filled = next.join("");
    if (filled.length === OTP_LENGTH) void submit(filled);
    else focusCell(index + typed.length);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      focusCell(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = toWesternDigits(event.clipboardData.getData("text")).replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    update(0, pasted);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(code);
  }

  const cellsDisabled = expired || locked > 0 || busy !== null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">
          {copy.sentTo} <Mono className="text-foreground">{otp.masked_phone}</Mono>
        </p>
      </div>

      <FormError message={formError} />

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{copy.codeLabel}</legend>
        <div dir="ltr" className="grid grid-cols-6 gap-2 sm:gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                cells.current[i] = el;
              }}
              value={digit}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              onFocus={(e) => e.target.select()}
              dir="ltr"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={i === 0}
              disabled={cellsDisabled}
              aria-label={copy.digitLabel(i + 1)}
              aria-invalid={Boolean(codeError)}
              data-mono
              className={cn(
                "h-12 w-full min-w-0 rounded-lg border border-input bg-transparent text-center font-mono text-xl tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 sm:h-14 dark:bg-input/30",
                codeError && "border-destructive ring-3 ring-destructive/20",
              )}
            />
          ))}
        </div>

        <div aria-live="polite" className="flex min-h-5 flex-col gap-1 text-sm">
          {codeError ? <p className="text-destructive">{codeError}</p> : null}
          {locked > 0 ? <TooMany seconds={locked} /> : null}
          {expired ? (
            <p className="font-medium text-destructive">{copy.expired}</p>
          ) : (
            <p className="text-muted-foreground">
              {copy.expiresIn} <Mono className="text-foreground">{clock(remaining)}</Mono>
            </p>
          )}
          {notice && !expired ? <p className="text-muted-foreground">{notice}</p> : null}
        </div>
      </fieldset>

      {networkFailed ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-1 text-sm">
          <span className="py-2 text-muted-foreground">{messages.network}</span>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => void (code.length === OTP_LENGTH && !expired ? submit(code) : resend())}
          >
            {copy.retry}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {expired ? null : (
          <Button type="submit" size="lg" className="h-11 w-full" disabled={code.length !== OTP_LENGTH || cellsDisabled}>
            {busy === "verify" ? copy.submitting : copy.submit}
          </Button>
        )}
        <Button
          type="button"
          variant={expired ? "default" : "outline"}
          size="lg"
          className="h-11 w-full"
          disabled={busy !== null || resendLocked > 0}
          onClick={() => void resend()}
        >
          {busy === "resend" ? (
            copy.resending
          ) : resendLocked > 0 ? (
            <>
              {copy.resend} <Mono>{clock(resendLocked)}</Mono>
            </>
          ) : (
            copy.resend
          )}
        </Button>
        {resendLocked > 0 ? <TooMany seconds={resendLocked} className="text-sm" /> : null}
      </div>

      {expired ? null : (
        <Link href="/register" className="inline-flex h-11 w-fit items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {copy.edit}
        </Link>
      )}
    </form>
  );
}

/** US-02.3.3 with the live `Retry-After` countdown in Mono. */
function TooMany({ seconds, className }: { seconds: number; className?: string }) {
  return (
    <p className={cn("text-destructive", className)}>
      {messages.tooManyParts.before} <Mono>{seconds}</Mono> {messages.tooManyParts.after}
    </p>
  );
}
