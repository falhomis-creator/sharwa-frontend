/**
 * The headline's emphasis. Deliberately NOT gradient text (constitution I
 * forbids it): a 1px rule draws itself under the words instead.
 *
 * Pure CSS and server-rendered — the hero never waits on hydration to be
 * legible, and `prefers-reduced-motion` collapses the draw to its end state.
 */
export function AccentWord({ children }: { children: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <span aria-hidden className="draw-rule absolute start-0 -bottom-1 h-px w-full bg-foreground" />
    </span>
  );
}
