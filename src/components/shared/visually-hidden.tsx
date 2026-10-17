import type { ComponentProps } from "react";

export function VisuallyHidden(props: ComponentProps<"span">) {
  return <span className="sr-only" {...props} />;
}

/** Keyboard users jump straight to the main content (constitution IX). */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[70] focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
    >
      تخطَّ إلى المحتوى
    </a>
  );
}
