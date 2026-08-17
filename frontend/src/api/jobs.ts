import api from './client';

export interface PrintJob {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  color_mode: 'bw' | 'color';
  page_count: number;
  blob_url: string;
  status: 'queued' | 'printed';
  created_at: string;
  expires_at: string;
  printed_at?: string;
}

export const jobsApi = {
  list: async (): Promise<PrintJob[]> => {
    const res = await api.get('/api/jobs');
    return res.data;
  },

  get: async (id: string): Promise<PrintJob> => {
    const res = await api.get(`/api/jobs/${id}`);
    return res.data;
  },

  upload: async (file: File, color_mode: 'bw' | 'color' = 'bw', page_count: number = 1): Promise<PrintJob> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('color_mode', color_mode);
    formData.append('page_count', page_count.toString());
    const res = await api.post('/api/jobs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  markPrinted: async (
    id: string,
    settings?: { color_mode?: 'bw' | 'color'; page_count?: number; copies?: number }
  ): Promise<PrintJob> => {
    const res = await api.patch(`/api/jobs/${id}/print`, settings || {});
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/jobs/${id}`);
  },
};
