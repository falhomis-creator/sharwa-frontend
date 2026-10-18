import { cn } from "@/lib/utils";

/**
 * The storefront announcement bar (StoreSetting «شريط الإعلانات»), shared by the storefront
 * (M09) and the live preview in the settings hub (M34 FR-34.10) so both scroll alike.
 * Colours are the merchant's DATA (inline), speed is seconds per pass, and the marquee
 * stops under `prefers-reduced-motion` (the text then sits centred and static).
 * In RTL it scrolls towards the right — the reading direction's natural "in".
 */
export function AnnouncementBar({
  text,
  background,
  color,
  seconds,
  className,
}: {
  text: string;
  background: string;
  color: string;
  seconds: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex h-9 items-center overflow-hidden text-[13px] font-medium", className)}
      style={{ backgroundColor: background, color }}
      role="marquee"
      aria-label={text}
    >
      <div
        aria-hidden
        className="flex w-max shrink-0 whitespace-nowrap [--marquee-dir:-1] rtl:[--marquee-dir:1] motion-safe:animate-[sharwa-marquee_var(--marquee-seconds)_linear_infinite] motion-reduce:w-full motion-reduce:justify-center"
        style={{ ["--marquee-seconds" as string]: `${seconds}s` }}
      >
        <span className="px-8">{text}</span>
        <span className="px-8 motion-reduce:hidden">{text}</span>
      </div>
    </div>
  );
}
