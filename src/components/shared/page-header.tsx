import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Small mono label above the title (section number, code, …). */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <span data-mono dir="ltr" className="self-start font-mono text-xs text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description ? <p className="max-w-prose text-sm text-muted-foreground md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
