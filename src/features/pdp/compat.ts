/**
 * M37 FR-37.03 — the bundle compatibility engine (pure, no React; asserted by
 * `scripts/bundles-check.ts`). A rule compares the VALUES chosen for variant attributes
 * across the bundle's components:
 *
 * - `equals` with `attribute_b`: every value chosen for A and B is the same one
 *   (A = B = اللون → «all components in one colour»); with `value`: every A equals it.
 * - `not_equals` with `attribute_b`: A and B share no value (A = B → no two components
 *   repeat one); with `value`: no A is in it.
 * - `in` with `value` (CSV): every A is one of the listed values.
 *
 * A rule whose attribute has nothing chosen yet is not violated (it cannot be judged).
 */
export type CompatOperator = "equals" | "not_equals" | "in";

export interface Rule {
  id: number;
  attribute_a_id: number;
  attribute_a_name: string;
  operator: CompatOperator;
  attribute_b_id: number | null;
  value: string | null;
}

/** One chosen value per component: `{componentId, attributeId, value}`. */
export interface Choice {
  component: number;
  attribute: number;
  value: string;
}

const csv = (v: string | null) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);

export function violates(rule: Rule, choices: Choice[]): boolean {
  const of = (attr: number) => choices.filter((c) => c.attribute === attr);
  const a = of(rule.attribute_a_id);
  if (a.length === 0) return false;
  if (rule.attribute_b_id !== null) {
    const b = of(rule.attribute_b_id);
    if (b.length === 0) return false;
    if (rule.operator === "equals") return new Set([...a, ...b].map((c) => c.value)).size > 1;
    if (rule.operator === "not_equals") {
      if (rule.attribute_b_id === rule.attribute_a_id) return new Set(a.map((c) => c.value)).size < a.length;
      const bs = new Set(b.map((c) => c.value));
      return a.some((c) => bs.has(c.value));
    }
    const bs = new Set(b.map((c) => c.value));
    return a.some((c) => !bs.has(c.value));
  }
  const values = csv(rule.value);
  if (rule.operator === "equals") return a.some((c) => c.value !== values[0]);
  if (rule.operator === "not_equals") return a.some((c) => values.includes(c.value));
  return a.some((c) => !values.includes(c.value));
}

/** The first rule the current choices break, if any. */
export function firstViolation(rules: Rule[], choices: Choice[]): Rule | null {
  return rules.find((r) => violates(r, choices)) ?? null;
}

/**
 * Would choosing `value` for `component` break a rule, given the OTHER components'
 * choices? Used to DISABLE (never hide) an option, with the rule as the reason.
 */
export function conflictFor(rules: Rule[], choices: Choice[], next: Choice): Rule | null {
  const others = choices.filter((c) => c.component !== next.component);
  return firstViolation(rules, [...others, next]);
}

export function reason(rule: Rule): string {
  return `هذا الخيار غير متوافق مع ${rule.attribute_a_name}`;
}

/** The buyer's current picks as engine `Choice`s (only components that are in the bundle: mandatory, or optional and ticked upstream). */
export function bundleChoicesOf(
  bundle: { components: Array<{ product_id: number; choice?: { attribute_id: number; options: Array<{ id: number; value: string }> } | null }> },
  picked: Record<number, number>,
): Choice[] {
  return bundle.components.flatMap((c) => {
    const optionId = picked[c.product_id];
    const option = c.choice?.options.find((o) => o.id === optionId);
    return c.choice && option ? [{ component: c.product_id, attribute: c.choice.attribute_id, value: option.value }] : [];
  });
}
