import api from './client';

export interface DailyCount {
  date: string;
  count: number;
  size_mb: number;
}

export interface StatsResponse {
  total_uploads: number;
  total_printed: number;
  total_queued: number;
  storage_mb: number;
  bw_quota_total: number;
  bw_quota_used: number;
  bw_quota_remaining: number;
  color_quota_total: number;
  color_quota_used: number;
  color_quota_remaining: number;
  uploads_per_day: DailyCount[];
  prints_per_day: DailyCount[];
  size_per_day: DailyCount[];
  bw_pages_per_day: DailyCount[];
  color_pages_per_day: DailyCount[];
}

export const statsApi = {
  get: async (): Promise<StatsResponse> => {
    const res = await api.get('/api/stats');
    return res.data;
  },
};
