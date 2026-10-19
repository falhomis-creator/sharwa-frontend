"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  availabilitySchema,
  cancelResultSchema,
  servicesSchema,
  slotListSchema,
  type AvailabilityWindow,
} from "@/features/bookings/schemas";

/** M26 hooks — keys `[tenant, 'bookings', …]`, Zod on every response, all through `/api/bff/bookings/*`. */
export function bookingKeys(store: string) {
  return {
    all: storeKey(store, "bookings"),
    services: storeKey(store, "bookings", "services"),
    availability: (id: number) => storeKey(store, "bookings", "availability", id),
    slots: (params: Record<string, string | number | undefined>) => storeKey(store, "bookings", "slots", params),
  };
}

export function useServices() {
  const store = useStore();
  return useQuery({ queryKey: bookingKeys(store).services, queryFn: ({ signal }) => apiFetch("/api/bff/bookings/services/", servicesSchema, { signal }) });
}

export function useAvailability(id: number) {
  const store = useStore();
  return useQuery({ queryKey: bookingKeys(store).availability(id), queryFn: ({ signal }) => apiFetch(`/api/bff/bookings/services/${id}/availability/`, availabilitySchema, { signal }) });
}

export function useSaveAvailability(id: number) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (rows: AvailabilityWindow[]) => apiFetch(`/api/bff/bookings/services/${id}/availability/`, availabilitySchema, { method: "PUT", json: rows }),
    onSuccess: (data) => {
      client.setQueryData(bookingKeys(store).availability(id), data);
      void client.invalidateQueries({ queryKey: bookingKeys(store).services });
    },
  });
}

export function useSlots(params: { from: string; to: string; product?: number; status?: string }) {
  const store = useStore();
  return useQuery({
    queryKey: bookingKeys(store).slots(params),
    queryFn: ({ signal }) => apiFetch("/api/bff/bookings/slots/", slotListSchema, { query: params, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCancelSlot() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/bookings/slots/${id}/cancel/`, cancelResultSchema, { method: "POST" }),
    onSuccess: () => void client.invalidateQueries({ queryKey: storeKey(store, "bookings", "slots") }),
  });
}
