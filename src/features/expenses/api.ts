"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import { expenseListSchema, expenseRowSchema, type ExpenseInput } from "@/features/expenses/schemas";

/** M33 hooks — keys `[tenant, 'expenses', …]`, Zod on every response (§11 IX). */
export interface ExpenseParams {
  category?: string;
  currency?: string;
  from?: string;
  to?: string;
  page?: number;
  [key: string]: string | number | undefined;
}

export function expenseKeys(store: string) {
  return { all: storeKey(store, "expenses"), list: (p: ExpenseParams) => storeKey(store, "expenses", "list", p) };
}

export function useExpenses(params: ExpenseParams, enabled = true) {
  const store = useStore();
  return useQuery({
    queryKey: expenseKeys(store).list(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/expenses", expenseListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreateExpense() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseInput) => apiFetch("/api/bff/expenses/", expenseRowSchema, { method: "POST", json: body }),
    // No local insertion: the month header totals are the server's, so the list is refetched.
    onSuccess: () => void client.invalidateQueries({ queryKey: expenseKeys(store).all }),
  });
}
