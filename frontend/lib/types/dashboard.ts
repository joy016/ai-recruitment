export interface ApplicantsBySourceItem {
  label: string;
  count: number;
}

export interface ApplicantsByJobItem {
  jobId: number;
  jobTitle: string;
  count: number;
}

export interface ApplicantsByStatusItem {
  status: string;
  count: number;
}

export interface WeeklyApplicationVolumeItem {
  day: string;
  date: string;
  count: number;
}

export interface DashboardAnalyticsResponse {
  applicantsBySource: ApplicantsBySourceItem[];
  applicantsByJob: ApplicantsByJobItem[];
  applicantsByStatus: ApplicantsByStatusItem[];
  weeklyApplicationVolume: WeeklyApplicationVolumeItem[];
}

export interface DashboardAnalyticsParams {
  from?: string;
  to?: string;
}
