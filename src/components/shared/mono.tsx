import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Numbers, SKUs, order numbers, dates, codes: Geist Mono with tabular digits. */
export function Mono({ className, dir = "ltr", ...props }: ComponentProps<"span">) {
  return <span data-mono dir={dir} className={cn("font-mono tabular-nums", className)} {...props} />;
}

/** Isolated LTR run (phone numbers, domains, English identifiers) inside RTL text. */
export function Ltr({ className, ...props }: ComponentProps<"span">) {
  return <span dir="ltr" className={cn("inline-block", className)} {...props} />;
}
