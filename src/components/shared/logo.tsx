import { cn } from "@/lib/utils";

/**
 * Sharwa brand lockup — the mark plus the Arabic wordmark.
 *
 * TODO(brand): there is no Sharwa logo asset anywhere in this repository. The
 * working tree and the full git history were searched: the only images ever
 * committed are the Next.js starter SVGs (since deleted) and the Playwright
 * visual-check captures. The mark below therefore stands in. «شروه» opens on
 * ش, so the glyph is that letter reduced to its two primitives — the three
 * dots and the bowl — set in the platform tile. When the official file lands,
 * THIS component is the only thing that changes; every surface draws from it.
 *
 * The tile's gradient is a CSS class (`.brand-tile`, globals.css) rather than
 * an SVG `<linearGradient>`: the lockup renders three times per page (header,
 * drawer, footer), and three `<defs>` sharing one id is invalid markup that
 * breaks the remaining two the moment the first instance unmounts. Raw color
 * also belongs in the token sheet, never in a component (constitution VII).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "brand-tile grid size-9 shrink-0 place-items-center rounded-[0.72rem]",
        className,
      )}
    >
      <svg
        viewBox="0 0 40 28"
        aria-hidden
        focusable="false"
        className="w-[58%] fill-white stroke-white"
      >
        <circle cx="11" cy="4.6" r="2.6" />
        <circle cx="20" cy="4.6" r="2.6" />
        <circle cx="29" cy="4.6" r="2.6" />
        <path
          d="M9 12.6v3.6a11 11 0 0 0 22 0v-3.6"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Mark + wordmark. `mark` sizes the tile from the call site; the wordmark is
 * plain text in IBM Plex Sans Arabic so it always matches the page's type.
 */
export function Logo({ className, mark }: { className?: string; mark?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={mark} />
      <span className="text-[1.05rem] font-semibold tracking-tight text-foreground">شروه</span>
    </span>
  );
}
