/**
 * Colour maths on merchant-supplied hex DATA (WCAG 2.x relative luminance). Pure, isomorphic.
 * Used by the storefront theme layer to keep merchant colours readable (US-09.2.4,
 * M09 §8) — never to introduce colours of its own.
 */
export type Rgb = { r: number; g: number; b: number };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

export function parseHex(value: string): Rgb | null {
  const m = HEX.exec(value.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** `weight` of `a` mixed into `b` (sRGB, like `color-mix(in srgb, a w%, b)`). */
export function mix(a: string, b: string, weight: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  const w = Math.min(1, Math.max(0, weight));
  return toHex({ r: x.r * w + y.r * (1 - w), g: x.g * w + y.g * (1 - w), b: x.b * w + y.b * (1 - w) });
}

export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.18;
}

/**
 * Move `fg` toward `target` (usually the full foreground) in small steps until it reaches
 * `min` contrast on `bg`. Returns the first colour that passes, or `target` itself.
 */
export function ensureContrast(fg: string, bg: string, target: string, min = 4.5): string {
  if (contrast(fg, bg) >= min) return fg;
  for (let w = 0.1; w <= 1.0001; w += 0.1) {
    const candidate = mix(target, fg, w);
    if (contrast(candidate, bg) >= min) return candidate;
  }
  return target;
}
