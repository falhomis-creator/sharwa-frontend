"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import { provisioningStatusSchema, type ProvisioningStatus } from "@/features/tenant/schemas";
import { WhatsAppSupport } from "@/features/tenant/components/tenant-notice";

/**
 * Provisioning poll loop — one engine, two surfaces.
 *
 * `policy: "store"` — the store-origin wait page (M47 US-47.3):
 * - With a signed token (handed over from `<base>/register` as `?t=` once, then kept in
 *   sessionStorage): `GET /api/bff/public/provisioning/<token>` → pending · provisioning ·
 *   ready · failed. A token the server no longer knows (404) drops to the visitor path.
 * - Without one (a visitor who landed on a store mid-provisioning): `HEAD /api/v1/config/`
 *   every 10s until it answers 200.
 * - 3s for the first ~30s with a token, then 10s. `failed` stops.
 *
 * `policy: "platform"` — the onboarding wait panel on `<base>/register/status/<token>`
 * (M02 FR-02.07): 3s, 15s while `failed` (the platform retries by itself), exponential
 * backoff on network errors up to 30s, and a 404 is final («لم نجد طلب التأسيس هذا»).
 *
 * Both stop at `ready`, pause while the tab is hidden and resume on focus
 * (`refetchIntervalInBackground: false` + `refetchOnWindowFocus`).
 *
 * Ref-driven where a value only steers the interval, so the React Compiler lint
 * (`react-hooks/set-state-in-effect`) has no cascading renders to reject. Consecutive
 * failures are counted here rather than read from `query.failureCount`: with
 * `retry: false` TanStack resets that counter at every fetch, so it never passes 1.
 */
const FAST_INTERVAL = 3_000;
const SLOW_INTERVAL = 10_000;
const FAILED_INTERVAL = 15_000;
const MAX_BACKOFF = 30_000;
const FAST_POLLS = 10;
const LONG_WAIT_SECONDS = 300;
const SILENT_FAILURES = 3;
const TOKEN_STORAGE_KEY = "sharwa.provisioning.token";

export type PollPolicy = "store" | "platform";

const STEPS = ["إنشاء قاعدة البيانات", "الإعدادات الأولية", "التفعيل"] as const;

/** Which step the status maps to — text only, no fabricated percentage. */
export const STEP_INDEX: Record<ProvisioningStatus["status"], number> = {
  pending: 0,
  provisioning: 1,
  ready: 2,
  failed: 1,
};

function readStoredToken(): string | undefined {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined; // private mode / storage disabled: the visitor path still works
  }
}

export interface ProvisioningPoll {
  data: ProvisioningStatus | undefined;
  status: ProvisioningStatus["status"] | undefined;
  /** Seconds the tab has been visible since mount. */
  elapsed: number;
  /** Consecutive failed polls (network or server), reset by any success. */
  failures: number;
  /** The latest poll failed while an earlier one succeeded or is being retried. */
  reconnecting: boolean;
  /** Seconds since the last successful poll, once there has been one. */
  sinceLastSuccess: number | null;
  /** `platform` only: the server does not know this token. */
  notFound: boolean;
}

export function useProvisioningPoll({
  store,
  token: initialToken,
  policy,
}: {
  store: string | null;
  token?: string;
  policy: PollPolicy;
}): ProvisioningPoll {
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const [failures, setFailures] = useState(0);
  const polls = useRef(0);
  const failureStreak = useRef(0);
  const hasToken = useRef(Boolean(initialToken));
  const tokenRejected = useRef(false);

  // Store origin: the token travels in the URL exactly once; sessionStorage keeps it
  // across the reloads the wait page may go through (M47 US-47.3.2).
  useEffect(() => {
    if (policy !== "store" || !initialToken) return;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, initialToken);
    } catch {
      // nothing to do: the query falls back to the visitor path
    }
  }, [initialToken, policy]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed((s) => s + 1);
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  async function fetchStatus(): Promise<ProvisioningStatus> {
    const token = initialToken ?? (policy === "store" ? readStoredToken() : undefined);
    if (token && !tokenRejected.current) {
      hasToken.current = true;
      try {
        return await apiFetch(`/api/bff/public/provisioning/${encodeURIComponent(token)}`, provisioningStatusSchema);
      } catch (error) {
        if (policy === "platform" || !isApiError(error) || error.status !== 404) throw error;
        tokenRejected.current = true; // expired/forged on a store origin: visitor path (M47 §8)
      }
    }
    hasToken.current = false;
    const res = await fetch("/api/v1/config/", { method: "HEAD", cache: "no-store", credentials: "include" });
    return res.ok ? { status: "ready" } : { status: "provisioning" };
  }

  const query = useQuery({
    queryKey: storeKey(store, "provisioning", policy, initialToken ?? "session"),
    queryFn: async (): Promise<ProvisioningStatus> => {
      polls.current += 1;
      try {
        const result = await fetchStatus();
        failureStreak.current = 0;
        setFailures(0);
        return result;
      } catch (error) {
        if (!(isApiError(error) && error.status === 404)) {
          failureStreak.current += 1;
          setFailures(failureStreak.current);
        }
        throw error;
      }
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "ready") return false;
      if (policy === "store") {
        if (status === "failed") return false;
        if (!hasToken.current) return SLOW_INTERVAL;
        return polls.current < FAST_POLLS ? FAST_INTERVAL : SLOW_INTERVAL;
      }
      if (isApiError(q.state.error) && q.state.error.status === 404) return false;
      if (failureStreak.current > 0) return Math.min(MAX_BACKOFF, FAST_INTERVAL * 2 ** failureStreak.current);
      return status === "failed" ? FAILED_INTERVAL : FAST_INTERVAL;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 0,
  });

  const notFound = policy === "platform" && isApiError(query.error) && query.error.status === 404;
  return {
    data: query.data,
    status: query.data?.status,
    elapsed,
    failures,
    reconnecting: query.isError && !notFound,
    sinceLastSuccess:
      now !== null && query.dataUpdatedAt > 0 ? Math.max(0, Math.round((now - query.dataUpdatedAt) / 1000)) : null,
    notFound,
  };
}

export function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** The three provisioning steps as text, the current one in foreground (no percentage). */
export function ProvisioningSteps({ status }: { status: ProvisioningStatus["status"] | undefined }) {
  const stepIndex = STEP_INDEX[status ?? "pending"];
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {STEPS.map((step, i) => (
        <li
          key={step}
          className={`flex items-center gap-2 ${i <= stepIndex ? "text-foreground" : "text-muted-foreground"}`}
          aria-current={i === stepIndex ? "step" : undefined}
        >
          {/* flex + gap rather than a margin: the numeral is an LTR island inside an RTL
              line, so a logical margin on it resolves against ITS direction and lands on
              the outside of the row instead of between the two runs. */}
          <Mono className="text-xs text-muted-foreground">{i + 1}</Mono>
          {step}
        </li>
      ))}
    </ol>
  );
}

/** Store-origin wait page body (M47 US-47.3). */
export function ProvisioningPoller({
  store,
  token,
  whatsapp,
  storeName,
}: {
  store: string | null;
  token?: string;
  whatsapp: string;
  storeName?: string;
}) {
  const poll = useProvisioningPoll({ store, token, policy: "store" });
  const leaving = useRef(false);
  const target = poll.data?.dashboard_url ?? poll.data?.store_url ?? "/";

  // `ready` → confirm for two seconds, then leave (SC-47.4: ≤ 5s after the state changes).
  useEffect(() => {
    if (poll.status !== "ready" || leaving.current) return;
    leaving.current = true;
    const id = window.setTimeout(() => window.location.assign(target), 2_000);
    return () => window.clearTimeout(id);
  }, [poll.status, target]);

  if (poll.status === "ready") {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        <p className="text-base font-medium">تم إنشاء متجرك بنجاح</p>
        <p className="text-sm text-muted-foreground">نحوّلك إلى لوحة التحكم الآن…</p>
      </section>
    );
  }

  if (poll.status === "failed") {
    return (
      <section className="flex flex-col gap-4" aria-live="polite">
        <p className="text-base font-medium">تعذّر تجهيز متجرك تلقائياً — سنتواصل معك</p>
        <p className="text-sm text-muted-foreground">
          لا حاجة لإعادة المحاولة؛ فريق الدعم يرى الطلب ويُكمله يدوياً.
        </p>
        <WhatsAppSupport
          phone={whatsapp}
          message={`تعذّر تجهيز متجري${storeName ? ` «${storeName}»` : ""} على شروة.`}
        />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6" aria-live="polite" aria-busy="true">
      <div className="hairline-track rounded-full" role="progressbar" aria-label="جارٍ التجهيز">
        <span className="hairline-progress" />
      </div>

      <ProvisioningSteps status={poll.status} />

      <p className="text-sm text-muted-foreground">
        الزمن المنقضي <Mono>{formatElapsed(poll.elapsed)}</Mono>
      </p>

      {poll.elapsed >= LONG_WAIT_SECONDS ? (
        <p className="text-sm text-warning">يستغرق التجهيز وقتاً أطول من المعتاد — الصفحة تتابع وحدها.</p>
      ) : null}

      {poll.failures >= SILENT_FAILURES ? (
        <p className="text-sm text-destructive">تحقق من اتصالك بالإنترنت.</p>
      ) : null}
    </section>
  );
}
