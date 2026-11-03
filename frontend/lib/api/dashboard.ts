import { api } from "@/lib/api-client";
import BackendServer from "@/constant/server-address";
import {
  DashboardAnalyticsParams,
  DashboardAnalyticsResponse,
} from "@/lib/types/dashboard";

const DASHBOARD_ENDPOINT = `${BackendServer}/api/Dashboard`;

export const getDashboardAnalytics = async (
  params?: DashboardAnalyticsParams,
): Promise<DashboardAnalyticsResponse> => {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const queryString = query.toString();

  return api.get<DashboardAnalyticsResponse>(
    `${DASHBOARD_ENDPOINT}/analytics${queryString ? `?${queryString}` : ""}`,
  );
};
