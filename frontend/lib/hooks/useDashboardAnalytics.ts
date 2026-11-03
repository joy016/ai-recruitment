"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardAnalytics } from "@/lib/api/dashboard";
import type { DashboardAnalyticsParams } from "@/lib/types/dashboard";

export const dashboardAnalyticsKey = (params?: DashboardAnalyticsParams) =>
  ["dashboard", "analytics", params ?? {}] as const;

export function useDashboardAnalytics(params?: DashboardAnalyticsParams) {
  return useQuery({
    queryKey: dashboardAnalyticsKey(params),
    queryFn: () => getDashboardAnalytics(params),
    staleTime: 30_000,
  });
}
