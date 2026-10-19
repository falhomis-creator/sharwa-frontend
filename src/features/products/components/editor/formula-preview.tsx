"use client";

import { useEffect, useState } from "react";
import { Mono } from "@/components/shared/mono";
import { Money } from "@/components/shared/money";
import { useFormulaPreview } from "@/features/products/api/extras";

/**
 * M37 US-37.4.1 — the formula's result, ASKED from the server
 * (`POST /products/formula-preview/`, debounced) and shown with the expression in Mono,
 * LTR inside `<bdi>`. No local multiplication (FR-37.02).
 */
const DEC4 = /^\d+(\.\d{1,4})?$/;

export function FormulaPreview({ unitPrice, coefficient, fixedExtra, currency }: { unitPrice: string; coefficient: string; fixedExtra: string; currency: string }) {
  const [terms, setTerms] = useState<{ formula_unit_price: string; formula_coefficient: string; formula_fixed_extra: string; currency: string } | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const ok = DEC4.test(unitPrice) && DEC4.test(coefficient) && (!fixedExtra || /^\d+(\.\d{1,2})?$/.test(fixedExtra));
      setTerms(ok ? { formula_unit_price: unitPrice, formula_coefficient: coefficient, formula_fixed_extra: fixedExtra || "0", currency } : null);
    }, 350);
    return () => window.clearTimeout(t);
  }, [unitPrice, coefficient, fixedExtra, currency]);
  const q = useFormulaPreview(terms);

  return (
    <p className="text-sm text-muted-foreground" data-testid="formula-preview" aria-live="polite">
      السعر الناتج:{" "}
      {!terms ? (
        "—"
      ) : q.isPending ? (
        "…"
      ) : q.data ? (
        <>
          <Money value={q.data.display_price} className="text-foreground" />{" "}
          <bdi>
            <Mono className="text-xs">({q.data.expression})</Mono>
          </bdi>
        </>
      ) : (
        "تعذّر الحساب"
      )}
    </p>
  );
}
