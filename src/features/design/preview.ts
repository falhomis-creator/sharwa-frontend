import { mix } from "@/lib/color";
import type { SectionType } from "@/lib/schemas/store-config";

/**
 * The editor → storefront preview protocol (M08 FR-08.02). The dashboard posts the whole
 * draft on every change; the storefront bridge (`storefront/theme/preview-bridge.tsx`)
 * applies it to the live M09 page inside the iframe — no reload, no network.
 *
 * Kept free of React so both the dashboard and the storefront bundle can import it.
 */
export const PREVIEW_MESSAGE = "sharwa:theme";
export const PREVIEW_READY = "sharwa:preview-ready";
/** Sent by the editor when it starts listening (the frame may have loaded before hydration). */
export const PREVIEW_PING = "sharwa:preview-ping";
export const PREVIEW_QUERY = "preview";

export interface PreviewSection {
  id: number;
  section_type: SectionType;
  label: string;
  is_active: boolean;
  show_on_mobile: boolean;
  /** The heading the section shows, when the draft changed it. */
  title: string | null;
}

export interface PreviewAnnouncement {
  enabled: boolean;
  text: string;
  background: string;
  color: string;
  speed: "slow" | "medium" | "fast";
  onHome: boolean;
  onProducts: boolean;
  onProductDetail: boolean;
  onCheckout: boolean;
}

export interface PreviewMessage {
  type: typeof PREVIEW_MESSAGE;
  theme_preset: string;
  tokens: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    card_border_color: string;
    brand_shades: Record<string, string>;
  };
  fonts: { heading: string; body: string };
  design_style: string;
  sections: PreviewSection[];
  announcement: PreviewAnnouncement;
}

export function isPreviewMessage(data: unknown): data is PreviewMessage {
  return Boolean(data) && typeof data === "object" && (data as { type?: unknown }).type === PREVIEW_MESSAGE;
}

/**
 * The 50..900 ramp Django derives from `primary_color` on save (same weights as the
 * `/config/` fixture), so the preview shows the ramp the store will get after «نشر».
 */
export function previewShades(primary: string): Record<string, string> {
  const out: Record<string, string> = {};
  const tints: Array<[string, number]> = [["50", 0.92], ["100", 0.82], ["200", 0.66], ["300", 0.48], ["400", 0.26]];
  const shades: Array<[string, number]> = [["600", 0.16], ["700", 0.32], ["800", 0.48], ["900", 0.62]];
  for (const [k, w] of tints) out[k] = mix("#FFFFFF", primary, w);
  out["500"] = primary;
  for (const [k, w] of shades) out[k] = mix("#000000", primary, w);
  return out;
}
