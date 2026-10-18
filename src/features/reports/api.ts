"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { useStore } from "@/features/dashboard-shell/components/store-context";
import {
  FINAL_EXPORT_STATUSES,
  exportJobSchema,
  exportListSchema,
  refreshSchema,
  reportDataSchema,
  reportIndexSchema,
  scheduleListSchema,
  scheduleSchema,
  type ExportFormat,
  type ExportJob,
  type ScheduleForm,
} from "@/features/reports/schemas";

/** M25 data hooks — keys `[tenant, 'reports', …]` with a 5-minute `staleTime` (§11 IX). */
const STALE = 5 * 60_000;
export const EXPORT_POLL_MS = 5_000;

export type ReportParams = Record<string, string | number | undefined>;

export function reportKeys(store: string) {
  return {
    all: storeKey(store, "reports"),
    index: storeKey(store, "reports", "index"),
    report: (code: string, params: ReportParams) => storeKey(store, "reports", code, params),
    reportAll: (code: string) => storeKey(store, "reports", code),
    exports: storeKey(store, "reports", "exports"),
    job: (id: number) => storeKey(store, "reports", "exports", "job", id),
    schedules: storeKey(store, "reports", "schedules"),
  };
}

export function useReportIndex() {
  const store = useStore();
  return useQuery({
    queryKey: reportKeys(store).index,
    queryFn: ({ signal }) => apiFetch("/api/bff/reports", reportIndexSchema, { signal }),
    staleTime: STALE,
  });
}

export function useReport(code: string, params: ReportParams, opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: reportKeys(store).report(code, params),
    queryFn: ({ signal }) => apiFetch(`/api/bff/reports/${encodeURIComponent(code)}`, reportDataSchema, { query: params, signal }),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
    retry: (count, err) => !(err && typeof err === "object" && "status" in err && [400, 403, 404].includes(Number(err.status))) && count < 2,
  });
}

export function useRefreshToday(code: string) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/api/bff/reports/refresh-today", refreshSchema, { method: "POST", json: {} }),
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys(store).reportAll(code) }),
  });
}

export function useCreateExport(code: string) {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { format: ExportFormat; params: Record<string, string | boolean | null> }) =>
      apiFetch(`/api/bff/reports/${encodeURIComponent(code)}/exports`, exportJobSchema, { method: "POST", json: body }),
    onSuccess: (job) => {
      client.setQueryData(reportKeys(store).job(job.job_id), job);
      void client.invalidateQueries({ queryKey: reportKeys(store).exports, exact: true });
    },
  });
}

export function useExports(opts: { enabled?: boolean } = {}) {
  const store = useStore();
  return useQuery({
    queryKey: reportKeys(store).exports,
    queryFn: ({ signal }) => apiFetch("/api/bff/reports/exports", exportListSchema, { signal }),
    enabled: opts.enabled ?? true,
  });
}

/**
 * One job's status, polled every 5 s while it is not final (FR-25.06); polling stops at
 * `ready|failed|expired`. Seeded from the list row so the first paint needs no request.
 */
export function useExportJob(job: ExportJob) {
  const store = useStore();
  const final = FINAL_EXPORT_STATUSES.includes(job.status);
  return useQuery({
    queryKey: reportKeys(store).job(job.job_id),
    queryFn: ({ signal }) => apiFetch(`/api/bff/reports/exports/${job.job_id}`, exportJobSchema, { signal }),
    initialData: job,
    // The list row is fresh: the first status read happens one poll interval later.
    initialDataUpdatedAt: () => Date.now(),
    staleTime: final ? Infinity : EXPORT_POLL_MS,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => {
      const status = q.state.data?.status ?? job.status;
      return FINAL_EXPORT_STATUSES.includes(status) ? false : EXPORT_POLL_MS;
    },
  });
}

export function useSchedules() {
  const store = useStore();
  return useQuery({
    queryKey: reportKeys(store).schedules,
    queryFn: ({ signal }) => apiFetch("/api/bff/reports/schedules", scheduleListSchema, { signal }),
  });
}

export function useCreateSchedule() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ScheduleForm) => apiFetch("/api/bff/reports/schedules", scheduleSchema, { method: "POST", json: body }),
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys(store).schedules }),
  });
}

export function usePatchSchedule() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; is_active?: boolean }) =>
      apiFetch(`/api/bff/reports/schedules/${id}`, scheduleSchema, { method: "PATCH", json: body }),
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys(store).schedules }),
  });
}

export function useDeleteSchedule() {
  const store = useStore();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/bff/reports/schedules/${id}`, z.unknown(), { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys(store).schedules }),
  });
}

export function downloadHref(job: Pick<ExportJob, "job_id" | "download_token">): string | null {
  return job.download_token ? `/api/bff/reports/exports/${job.job_id}/download?token=${encodeURIComponent(job.download_token)}` : null;
}
