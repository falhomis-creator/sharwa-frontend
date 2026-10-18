/**
 * Decimal-as-text helpers for INPUTS and ESTIMATES only (data-model §6: amounts are
 * decimal strings, never floats). Display money still comes from the server (`display_*`);
 * anything computed here is labelled «تقديرية» where it is shown (M04 FR-04.14).
 *
 * Fixed-point on BigInt with 6 fractional digits — enough for prices, coefficients and
 * Decimal(12,3) stock without float drift.
 */
const SCALE = 6;
const FACTOR = BigInt(10 ** SCALE);
const ZERO = BigInt(0);
const TWO = BigInt(2);
const HUNDRED = BigInt(100);
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

export function isDecimal(value: string | null | undefined): value is string {
  return typeof value === "string" && DECIMAL_RE.test(value.trim());
}

function toUnits(value: string): bigint {
  const v = value.trim();
  const negative = v.startsWith("-");
  const [int = "0", frac = ""] = (negative ? v.slice(1) : v).split(".");
  const units = BigInt(int) * FACTOR + BigInt((frac + "0".repeat(SCALE)).slice(0, SCALE));
  return negative ? -units : units;
}

function fromUnits(units: bigint, places: number): string {
  const negative = units < ZERO;
  let abs = negative ? -units : units;
  // round half up to `places`
  const drop = BigInt(10 ** (SCALE - places));
  abs = ((abs + drop / TWO) / drop) * drop;
  const int = abs / FACTOR;
  const frac = (abs % FACTOR).toString().padStart(SCALE, "0").slice(0, places);
  return `${negative ? "-" : ""}${int}${places > 0 ? `.${frac}` : ""}`;
}

export function addDecimal(a: string, b: string, places = 2): string {
  return fromUnits(toUnits(a) + toUnits(b), places);
}

export function subDecimal(a: string, b: string, places = 2): string {
  return fromUnits(toUnits(a) - toUnits(b), places);
}

export function mulDecimal(a: string, b: string, places = 2): string {
  return fromUnits((toUnits(a) * toUnits(b)) / FACTOR, places);
}

/** -1 / 0 / 1 */
export function compareDecimal(a: string, b: string): number {
  const d = toUnits(a) - toUnits(b);
  return d === ZERO ? 0 : d < ZERO ? -1 : 1;
}

/** `amount * percent / 100` */
export function percentOf(amount: string, percent: string, places = 2): string {
  return fromUnits((toUnits(amount) * toUnits(percent)) / (FACTOR * HUNDRED), places);
}

/** Thousands separators for an estimate (western digits); never used for server money. */
export function groupDecimal(value: string): string {
  const [int = "0", frac] = value.split(".");
  const sign = int.startsWith("-") ? "-" : "";
  const digits = sign ? int.slice(1) : int;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${frac !== undefined ? `.${frac}` : ""}`;
}
