import type { ReactNode } from "react";
import { Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";

/**
 * The one layout the three tenant-guard pages share (M47 §6, FR-47.08):
 * single column, zinc, Arabic RTL, no illustration, no "sad robot", no brand hue.
 * The HTTP status is printed as a Mono label rather than drawn as a giant numeral.
 */
export function TenantNotice({
  status,
  title,
  body,
  children,
  className,
}: {
  /** HTTP status, shown verbatim so support can read it off a screenshot. */
  status: number;
  title: string;
  body?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main"
      className={cn("mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-20", className)}
    >
      <Mono className="text-sm text-muted-foreground">{status}</Mono>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {body ? <p className="max-w-prose text-muted-foreground">{body}</p> : null}
      {children}
    </main>
  );
}

/** 44px support action (M47 §6 mobile rule). No emoji, no brand colour (I-ب). */
export function WhatsAppSupport({
  phone,
  message,
  label = "تواصل مع دعم شروة",
}: {
  phone: string;
  message: string;
  label?: string;
}) {
  return (
    <a
      href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-11 w-fit items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
    >
      {label}
    </a>
  );
}
