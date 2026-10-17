import { cn } from "@/lib/utils";

/**
 * One section intro pattern, reused everywhere: a mono-cased label over a
 * tight heading. Keeps rhythm without repeating a card row.
 */
export function SectionHeading({
  label,
  title,
  body,
  className,
}: {
  label: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-3", className)}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="h-px w-6 bg-border" />
        {label}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h2>
      {body ? <p className="text-base leading-relaxed text-muted-foreground">{body}</p> : null}
    </div>
  );
}
