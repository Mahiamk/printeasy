import api from './client';

export interface SuperadminStats {
  total_users: number;
  total_printed_jobs: number;
  total_queued_jobs: number;
  total_bw_pages_printed: number;
  total_color_pages_printed: number;
  total_storage_mb: number;
}

export interface PrintTrendPoint {
  date_label: string;
  raw_date: string;
  bw_pages: number;
  color_pages: number;
  total_jobs: number;
  bw_jobs: number;
  color_jobs: number;
}

export interface SuperadminTrendsResponse {
  period: 'daily' | 'weekly' | 'monthly';
  data: PrintTrendPoint[];
}

export interface AdminUserItem {
  id: string;
  email: string;
  created_at: string;
  is_superadmin: boolean;
  total_jobs: number;
  printed_jobs: number;
  bw_pages_used: number;
  color_pages_used: number;
}

export const superadminApi = {
  getStats: async (): Promise<SuperadminStats> => {
    const res = await api.get('/api/admin/stats');
    return res.data;
  },

  getTrends: async (period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<SuperadminTrendsResponse> => {
    const res = await api.get(`/api/admin/trends?period=${period}`);
    return res.data;
  },

  getUsers: async (): Promise<AdminUserItem[]> => {
    const res = await api.get('/api/admin/users');
    return res.data;
  },
};
