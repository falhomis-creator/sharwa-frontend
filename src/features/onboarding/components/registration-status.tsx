"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { WhatsAppSupport } from "@/features/tenant/components/tenant-notice";
import {
  ProvisioningSteps,
  formatElapsed,
  useProvisioningPoll,
} from "@/features/tenant/components/provisioning-poller";
import {
  STATUS_STORAGE_KEY,
  clearStoredStatus,
  firstEntryUrl,
  type StoredStatus,
} from "@/features/onboarding/handoff";
import { status as copy } from "@/features/onboarding/onboarding.content";

const SLOW_SECONDS = 90;
const REDIRECT_SECONDS = 5;

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function storedRaw(): string | null {
  try {
    return localStorage.getItem(STATUS_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The FR-02.09 entry for THIS token (store name, masked number), read after mount. */
function useStoredStatus(token: string): StoredStatus | null {
  const raw = useSyncExternalStore(subscribeStorage, storedRaw, () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as StoredStatus;
      return value.token === token ? value : null;
    } catch {
      return null;
    }
  }, [raw, token]);
}

/**
 * Panel 03 (US-02.4, US-02.5, FR-02.07/08). Reuses the M47 poll engine with the
 * `platform` policy; the three headings are verbatim from FR-02.08.
 *
 * Reopening the link resumes from the real state (US-02.4.3): the token is the path, the
 * poll asks the server, and localStorage only adds the name and masked number.
 */
export function RegistrationStatus({ token, whatsapp }: { token: string; whatsapp: string }) {
  const stored = useStoredStatus(token);
  const poll = useProvisioningPoll({ store: null, token, policy: "platform" });

  if (poll.notFound) {
    return (
      <section className="flex flex-col gap-6" aria-live="polite">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.notFoundTitle}</h1>
          <p className="text-sm text-muted-foreground">{copy.notFoundBody}</p>
        </div>
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}>
          {copy.startOver}
        </Link>
      </section>
    );
  }

  if (poll.status === "ready" && poll.data?.dashboard_url) {
    return (
      <ReadyPanel
        token={token}
        dashboardUrl={poll.data.dashboard_url}
        storeUrl={poll.data.store_url ?? poll.data.dashboard_url.replace(/\/dashboard\/?$/, "")}
      />
    );
  }

  const failed = poll.status === "failed";

  return (
    <section className="flex flex-col gap-8" aria-live="polite" aria-busy={!failed}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {failed ? copy.failed : copy.waiting(stored?.store_name)}
        </h1>
        {failed ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {/* The number is an LTR island inside the sentence. */}
            {copy.failedBody}{" "}
            {stored?.masked_phone ? <Mono className="text-foreground">{stored.masked_phone}</Mono> : null}
          </p>
        ) : null}
      </div>

      {failed ? null : <ProvisioningSteps status={poll.status} />}

      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <StatusDot tone={failed ? "failed" : poll.reconnecting ? "offline" : "live"} />
        <span>
          {copy.elapsed} <Mono className="text-foreground">{formatElapsed(poll.elapsed)}</Mono>
        </span>
      </p>

      {poll.reconnecting ? (
        <p className="text-sm text-muted-foreground" role="status">
          {copy.reconnecting}
          {poll.sinceLastSuccess !== null ? (
            <>
              {" "}
              <span className="text-xs">
                ({copy.lastCheck.before} <Mono>{poll.sinceLastSuccess}</Mono> {copy.lastCheck.after})
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {!failed && poll.elapsed >= SLOW_SECONDS ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.slow}</p>
      ) : null}

      {failed ? (
        <WhatsAppSupport
          phone={whatsapp}
          message={`تعذّر تجهيز متجري${stored?.store_name ? ` «${stored.store_name}»` : ""} على شروة.`}
        />
      ) : null}
    </section>
  );
}

/** One status dot — no circular spinner, no gradient (M02 §11 I). */
function StatusDot({ tone }: { tone: "live" | "offline" | "failed" }) {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      {tone === "live" ? (
        <span className="absolute inline-flex size-full rounded-full bg-foreground opacity-40 motion-safe:animate-ping" />
      ) : null}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          tone === "live" && "bg-foreground",
          tone === "offline" && "bg-muted-foreground",
          tone === "failed" && "bg-destructive",
        )}
      />
    </span>
  );
}

/**
 * US-02.4.1 + T066: the congratulation, both actions and the copyable store link, then
 * a visible five-second hand-over to the store's first-entry screen with `?t=` once.
 * Copying the link holds the redirect so the merchant is not pulled away mid-action.
 */
function ReadyPanel({ token, dashboardUrl, storeUrl }: { token: string; dashboardUrl: string; storeUrl: string }) {
  const target = firstEntryUrl(dashboardUrl, token);
  const [left, setLeft] = useState(REDIRECT_SECONDS);
  const [held, setHeld] = useState(false);
  const [copied, setCopied] = useState(false);
  const leaving = useRef(false);

  // `ready` retires the resume entry (FR-02.09); the cookie is cleared by the adapter.
  useEffect(() => clearStoredStatus(), []);

  useEffect(() => {
    if (held) return;
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1_000);
    return () => window.clearInterval(id);
  }, [held]);

  useEffect(() => {
    if (held || left > 0 || leaving.current) return;
    leaving.current = true;
    window.location.assign(target);
  }, [held, left, target]);

  async function copyLink() {
    setHeld(true);
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
    } catch {
      // clipboard blocked: the link stays selectable on screen
    }
  }

  const host = storeUrl.replace(/^https?:\/\//, "");

  return (
    <section className="flex flex-col gap-8" aria-live="polite">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.ready}</h1>
        {held ? null : (
          <p className="text-sm text-muted-foreground">
            {copy.redirectIn.before} <Mono className="text-foreground">{left}</Mono> {copy.redirectIn.after}
          </p>
        )}
      </div>

      <div className="flex h-11 min-w-0 items-center rounded-lg border border-border" dir="ltr">
        <Mono className="min-w-0 flex-1 truncate ps-3 text-sm select-all">{host}</Mono>
        <Button type="button" variant="ghost" className="-my-px h-11 rounded-none border-s border-border px-4" onClick={() => void copyLink()}>
          {copied ? copy.copied : copy.copy}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={target} className={cn(buttonVariants({ size: "lg" }), "h-11 sm:flex-1")}>
          {copy.enterDashboard}
        </a>
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => setHeld(true)}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 sm:flex-1")}
        >
          {copy.viewStore}
        </a>
      </div>
    </section>
  );
}
