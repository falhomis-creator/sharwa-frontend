"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { provisioningStatusSchema, type ProvisioningStatus } from "@/features/tenant/schemas";
import { WhatsAppSupport } from "@/features/tenant/components/tenant-notice";

/**
 * Provisioning poll loop (M47 US-47.3).
 *
 * - With a signed token (handed over from `<base>/register` as `?t=` once, then kept in
 *   sessionStorage): `GET /api/bff/public/provisioning/<token>` → pending · provisioning ·
 *   ready · failed.
 * - Without one (a visitor who landed on a store mid-provisioning): `HEAD /api/v1/config/`
 *   every 10s until it answers 200.
 * - 3s for the first ~30s with a token, then 10s. `ready` shows a two-second confirmation
 *   and then leaves for `dashboard_url` (or `store_url` for a visitor). `failed` stops.
 * - Polling pauses while the tab is hidden and resumes on focus
 *   (`refetchIntervalInBackground: false` + `refetchOnWindowFocus`).
 *
 * Deliberately ref- and query-state-driven rather than `useState` in effects: the React
 * Compiler lint (`react-hooks/set-state-in-effect`) rejects cascading renders, and none of
 * these values (poll count, consecutive failures, resolved token) need to re-render alone.
 */
const FAST_INTERVAL = 3_000;
const SLOW_INTERVAL = 10_000;
const FAST_POLLS = 10;
const LONG_WAIT_SECONDS = 300;
const SILENT_FAILURES = 3;
const TOKEN_STORAGE_KEY = "sharwa.provisioning.token";

const STEPS = ["إنشاء قاعدة البيانات", "الإعدادات الأولية", "التفعيل"] as const;

/** Which step the status maps to — text only, no fabricated percentage. */
const STEP_INDEX: Record<ProvisioningStatus["status"], number> = {
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

export function ProvisioningPoller({
  store,
  token: initialToken,
  whatsapp,
  storeName,
}: {
  store: string | null;
  token?: string;
  whatsapp: string;
  storeName?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const polls = useRef(0);
  const hasToken = useRef(Boolean(initialToken));
  const leaving = useRef(false);

  // The token travels in the URL exactly once; sessionStorage keeps it across the reloads
  // the wait page may go through (M47 US-47.3.2). Writing to storage is an external effect.
  useEffect(() => {
    if (!initialToken) return;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, initialToken);
    } catch {
      // nothing to do: the query falls back to the visitor path
    }
  }, [initialToken]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setElapsed((s) => s + 1);
    }, 1_000);
    return () => window.clearInterval(id);
  }, []);

  const query = useQuery({
    queryKey: storeKey(store, "provisioning", initialToken ?? "session"),
    queryFn: async (): Promise<ProvisioningStatus> => {
      polls.current += 1;
      const token = initialToken ?? readStoredToken();
      hasToken.current = Boolean(token);
      if (token) {
        return apiFetch(`/api/bff/public/provisioning/${encodeURIComponent(token)}`, provisioningStatusSchema);
      }
      const res = await fetch("/api/v1/config/", { method: "HEAD", cache: "no-store", credentials: "include" });
      return res.ok ? { status: "ready" } : { status: "provisioning" };
    },
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "ready" || status === "failed") return false;
      if (!hasToken.current) return SLOW_INTERVAL;
      return polls.current < FAST_POLLS ? FAST_INTERVAL : SLOW_INTERVAL;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 0,
  });

  const status = query.data?.status;
  const target = query.data?.dashboard_url ?? query.data?.store_url ?? "/";

  // `ready` → confirm for two seconds, then leave (SC-47.4: ≤ 5s after the state changes).
  useEffect(() => {
    if (status !== "ready" || leaving.current) return;
    leaving.current = true;
    const id = window.setTimeout(() => window.location.assign(target), 2_000);
    return () => window.clearTimeout(id);
  }, [status, target]);

  if (status === "ready") {
    return (
      <section className="flex flex-col gap-3" aria-live="polite">
        <p className="text-base font-medium">تم إنشاء متجرك بنجاح</p>
        <p className="text-sm text-muted-foreground">نحوّلك إلى لوحة التحكم الآن…</p>
      </section>
    );
  }

  if (status === "failed") {
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

  const stepIndex = STEP_INDEX[status ?? "pending"];

  return (
    <section className="flex flex-col gap-6" aria-live="polite" aria-busy="true">
      <div className="hairline-track rounded-full" role="progressbar" aria-label="جارٍ التجهيز">
        <span className="hairline-progress" />
      </div>

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

      <p className="text-sm text-muted-foreground">
        الزمن المنقضي <Mono>{formatElapsed(elapsed)}</Mono>
      </p>

      {elapsed >= LONG_WAIT_SECONDS ? (
        <p className="text-sm text-warning">يستغرق التجهيز وقتاً أطول من المعتاد — الصفحة تتابع وحدها.</p>
      ) : null}

      {query.failureCount >= SILENT_FAILURES ? (
        <p className="text-sm text-destructive">تحقق من اتصالك بالإنترنت.</p>
      ) : null}
    </section>
  );
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
