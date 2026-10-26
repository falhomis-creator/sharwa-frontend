"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChannels, useConnectTelegram, useDisconnect } from "@/features/channels/api";
import { CONNECTION_LABELS, telegramConnectSchema, type Channel, type ConnectionCode } from "@/features/channels/schemas";
import { ChannelsShell } from "@/features/channels/components/channels-shell";
import { StatusDot } from "@/features/inbox/components/bits";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";

/**
 * `/dashboard/channels/social` (US-27.1): three rows — Meta, TikTok Shop, Telegram — each
 * with its state (غير مربوط / مربوط باسم الحساب / خطأ) and the matching action. OAuth is a
 * full-page redirect to the server route, which returns here with `?connected=<code>` — or `?oauth_error=<reason>`
 * (INT-037: Django's callback sends the provider's / its own refusal back, shown as a toast).
 * Secrets never come back (FR-27.08): the token field is write-only.
 */
export function ChannelsScreen() {
  return (
    <ChannelsShell title="قنوات التواصل" description="اربط حساباتك لتصل رسائلها إلى صندوق المحادثات وتُزامَن منتجاتك معها.">
      <ChannelsInner />
    </ChannelsShell>
  );
}

function ChannelsInner() {
  const channels = useChannels();
  const search = useSearchParams();
  const router = useRouter();
  const [confirm, setConfirm] = useState<Channel | null>(null);
  const disconnect = useDisconnect();

  useEffect(() => {
    const code = search.get("connected") as ConnectionCode | null;
    const failure = search.get("oauth_error");
    if (code && code in CONNECTION_LABELS) {
      toast.success(`رُبطت ${CONNECTION_LABELS[code]}.`);
      router.replace("/dashboard/channels/social");
    } else if (failure) {
      toast.error(failure);
      router.replace("/dashboard/channels/social");
    }
  }, [search, router]);

  if (channels.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }
  if (!channels.data) return <ErrorState error={channels.error} onRetry={() => void channels.refetch()} />;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="channel-rows">
        {channels.data.map((c) => (
          <li key={c.channel_code} className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:gap-6" data-testid="channel-row" data-code={c.channel_code}>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm font-medium">{CONNECTION_LABELS[c.channel_code]}</span>
              <ChannelState c={c} />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {c.channel_code === "telegram" && (!c.connected || c.error) ? null : c.connected && !c.error ? (
                <Button variant="outline" className="h-11 lg:h-9" onClick={() => setConfirm(c)} data-testid="channel-disconnect">
                  فصل
                </Button>
              ) : (
                <a
                  href={`/api/bff/channels/${c.channel_code}/oauth/start`}
                  // The server needs where to come back to (this store host + port): Django validates it.
                  onClick={(e) => {
                    e.preventDefault();
                    // An API route answering with an external 302 (not a Next page, so no router.push): absolute URL object.
                    const target = new URL(`/api/bff/channels/${c.channel_code}/oauth/start`, window.location.origin);
                    target.searchParams.set("return", new URL("/dashboard/channels/social", window.location.origin).href);
                    window.location.assign(target);
                  }}
                  className={cn(buttonVariants({ variant: c.error ? "default" : "outline" }), "h-11 lg:h-9")}
                  data-testid="channel-connect"
                >
                  {c.error ? "إعادة الربط" : "ربط"}
                </a>
              )}
              {c.connected && c.error ? (
                <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setConfirm(c)}>
                  فصل
                </Button>
              ) : null}
            </div>
            {c.channel_code === "telegram" && (!c.connected || c.error) ? <TelegramForm /> : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `فصل ${CONNECTION_LABELS[confirm.channel_code]}؟` : ""}
        description={
          confirm ? (
            <>
              تبقى المحادثات المفتوحة على هذه القناة (<Mono>{confirm.open_conversations}</Mono>) للقراءة فقط، ولن تصل رسائل جديدة ولا يمكن الردّ حتى تعيد الربط.
            </>
          ) : null
        }
        confirmLabel="فصل القناة"
        destructive
        pending={disconnect.isPending}
        onConfirm={() =>
          confirm &&
          disconnect.mutate(confirm.channel_code, {
            onSuccess: () => {
              toast.success("فُصلت القناة.");
              setConfirm(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الفصل."),
          })
        }
      />
    </>
  );
}

function ChannelState({ c }: { c: Channel }) {
  if (c.error)
    return (
      <span className="flex flex-col gap-1">
        <StatusDot tone="destructive" label="خطأ في الربط" testId="channel-state" value="error" />
        <span className="text-xs text-destructive" data-testid="channel-error">
          {c.error}
        </span>
      </span>
    );
  if (!c.connected) return <StatusDot tone="muted" label="غير مربوط" testId="channel-state" value="disconnected" />;
  return (
    <span className="flex flex-col gap-1">
      <StatusDot tone="success" label="مربوط" testId="channel-state" value="connected" />
      <span className="text-xs text-muted-foreground">
        {c.channel_code === "telegram" && c.bot_username ? (
          <a href={`https://t.me/${c.bot_username}`} target="_blank" rel="noreferrer" className="underline underline-offset-4" data-testid="telegram-bot">
            <Mono>@{c.bot_username}</Mono>
          </a>
        ) : (
          <span>{c.account_name}</span>
        )}
        {c.connected_at ? (
          <>
            {" · منذ "}
            <Mono>{formatDate(c.connected_at)}</Mono>
          </>
        ) : null}
      </span>
    </span>
  );
}

function TelegramForm() {
  const connect = useConnectTelegram();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | undefined>();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = telegramConnectSchema.safeParse({ bot_token: token });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    try {
      const res = await connect.mutateAsync(parsed.data.bot_token);
      setToken("");
      toast.success(`رُبط البوت @${res.bot_username}.`);
    } catch (err) {
      setError(isApiError(err) ? (err.fields?.bot_token?.[0] ?? err.userMessage) : "تعذّر الربط.");
    }
  }
  return (
    <form onSubmit={(e) => void save(e)} className="flex w-full flex-col gap-2 md:w-96" data-testid="telegram-form">
      <Field label="رمز البوت (Bot token)" htmlFor="tg-token" error={error} hint="من ‎@BotFather — لا يُعرض مجدداً بعد الحفظ.">
        <input id="tg-token" type="password" autoComplete="off" dir="ltr" className={`${inputClass} font-mono`} value={token} onChange={(e) => setToken(e.target.value)} aria-invalid={Boolean(error)} />
      </Field>
      <Button type="submit" className="h-11 self-start lg:h-9" disabled={connect.isPending}>
        {connect.isPending ? "جارٍ الربط…" : "ربط تيليجرام"}
      </Button>
    </form>
  );
}
