import { cn } from "@/lib/utils";

/**
 * Renders a server-formatted amount (`display_price`, `display_total`, …) exactly as received.
 * Mono + tabular digits, isolated LTR so "1,250.00 ر.س" never flips inside RTL text.
 */
export function Money({
  value,
  className,
  muted = false,
}: {
  value: string | null | undefined;
  className?: string;
  muted?: boolean;
}) {
  if (!value) return <span className={cn("text-muted-foreground", className)}>—</span>;
  return (
    <span
      data-mono
      dir="ltr"
      className={cn("font-mono tabular-nums", muted && "text-muted-foreground", className)}
    >
      {value}
    </span>
  );
}
